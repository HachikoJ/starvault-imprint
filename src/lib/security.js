// Auth, CSRF, request-hardening and rate-limiting helpers for the HTTP server.
const { timingSafeEqual } = require("node:crypto");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
const JSON_CONTENT_TYPE_RE = /^application\/(?:json|[\w.+-]+\+json)(?:\s*;|$)/i;
const DANGEROUS_JSON_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const CRAWLER_OR_SCANNER_UA_RE =
  /\b(?:bot|crawler|spider|scrapy|python-requests|wget|java|go-http-client|libwww|httpclient|nikto|sqlmap|acunetix|nessus|masscan|nmap|zgrab|dirbuster|gobuster|ffuf|wpscan|crawler4j|heritrix|archive\.org_bot)\b/i;
const SENSITIVE_PATH_RE =
  /(?:^|\/)(?:\.git|\.svn|\.hg|\.env|\.DS_Store|data|src|node_modules|coverage|canvas|output|\.agents|\.playwright-cli)(?:\/|$)|(?:^|\/)(?:package-lock\.json|package\.json|README\.md|SECURITY\.md|PRD\.md|VIBE_CODING_GUIDE\.md|ACCEPTANCE_CHECKLIST\.md|DESIGN\.md|RISK_MODEL\.md|TAXONOMY\.md|LICENSE_POLICY\.md)(?:$|[?#])|\.map(?:$|[?#])/i;

const DEFAULT_REQUEST_LIMITS = {
  maxUrlLength: 8192,
  maxPathLength: 2048,
  maxQueryParams: 80,
  maxQueryKeyLength: 120,
  maxQueryValueLength: 4096,
  maxBodyBytes: 1_000_000
};

function safeEqual(a, b) {
  const aBuf = Buffer.from(String(a ?? ""));
  const bBuf = Buffer.from(String(b ?? ""));
  if (aBuf.length !== bBuf.length) {
    // Compare against itself to keep timing roughly constant, then fail.
    try {
      timingSafeEqual(aBuf, aBuf);
    } catch {
      /* ignore */
    }
    return false;
  }
  try {
    return timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

// Extract a bearer/shared token from any of the supported locations.
function extractRequestToken(req, url) {
  const auth = req.headers.authorization || "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  const xKey = req.headers["x-api-key"];
  if (xKey) return String(xKey).trim();

  const cookie = req.headers.cookie || "";
  const match = cookie.match(/(?:^|;\s*)sv_token=([^;]+)/);
  if (match) return match[1].trim();

  if (url && url.searchParams) {
    const q = url.searchParams.get("token");
    if (q) return q.trim();
  }
  return "";
}

function isAuthorized(req, url, expectedToken) {
  if (!expectedToken) return true; // auth disabled
  return safeEqual(extractRequestToken(req, url), expectedToken);
}

// CSRF mitigation: state-changing methods must come from a same-origin/loopback context.
// Non-browser clients (no Origin) are allowed; cross-origin browsers are rejected.
function originAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  let hostname;
  try {
    hostname = new URL(origin).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (LOOPBACK_HOSTS.has(hostname)) return true;
  const reqHost = String(req.headers.host || "").split(":")[0].toLowerCase();
  return Boolean(reqHost) && hostname === reqHost;
}

function isSafeMethod(method) {
  return SAFE_METHODS.has(String(method || "").toUpperCase());
}

function methodAllowed(method) {
  return ["GET", "HEAD", "POST", "OPTIONS"].includes(String(method || "").toUpperCase());
}

// Simple in-memory sliding-window rate limiter. Good enough for a single-process
// personal server; not distributed.
function createRateLimiter({ windowMs = 60_000, max = 10 } = {}) {
  const hits = new Map();

  function prune(now) {
    if (hits.size < 512) return;
    for (const [key, entry] of hits) {
      if (now > entry.resetAt) hits.delete(key);
    }
  }

  return function hit(key) {
    const now = Date.now();
    prune(now);
    const entry = hits.get(key);
    if (!entry || now > entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: max - 1, retryAfter: 0 };
    }
    entry.count += 1;
    const allowed = entry.count <= max;
    return {
      allowed,
      remaining: Math.max(0, max - entry.count),
      retryAfter: allowed ? 0 : entry.resetAt - now
    };
  };
}

function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.trim()) {
    return fwd.split(",")[0].trim();
  }
  return (req.socket && req.socket.remoteAddress) || "unknown";
}

function normalizeHost(host = "") {
  const raw = String(host || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw.startsWith("[")) {
    return raw.slice(0, raw.indexOf("]") + 1);
  }
  return raw.split(":")[0];
}

function isWildcardHost(host = "") {
  return ["0.0.0.0", "::", "[::]", ""].includes(String(host || "").toLowerCase());
}

function hostAllowed(req, configuredHost = "127.0.0.1") {
  const expected = normalizeHost(configuredHost);
  if (isWildcardHost(expected)) return true;
  const actual = normalizeHost(req.headers.host || "");
  if (!actual) return false;
  if (actual === expected) return true;
  if (LOOPBACK_HOSTS.has(expected)) {
    return LOOPBACK_HOSTS.has(actual);
  }
  return false;
}

function requestTargetIssue(req, url, limits = {}) {
  const merged = { ...DEFAULT_REQUEST_LIMITS, ...limits };
  const rawUrl = String(req.url || "");
  if (!rawUrl || rawUrl.length > merged.maxUrlLength) {
    return { status: 414, message: "Request URI is too long" };
  }
  if (/%00/i.test(rawUrl) || rawUrl.includes("\0")) {
    return { status: 400, message: "Invalid request target" };
  }
  if (String(url.pathname || "").length > merged.maxPathLength) {
    return { status: 414, message: "Request path is too long" };
  }
  const params = Array.from(url.searchParams.entries());
  if (params.length > merged.maxQueryParams) {
    return { status: 400, message: "Too many query parameters" };
  }
  for (const [key, value] of params) {
    if (String(key).length > merged.maxQueryKeyLength || String(value).length > merged.maxQueryValueLength) {
      return { status: 400, message: "Query parameter is too large" };
    }
  }
  return null;
}

function bodyLimitIssue(req, maxBodyBytes = DEFAULT_REQUEST_LIMITS.maxBodyBytes) {
  const rawLength = req.headers["content-length"];
  if (rawLength === undefined) return null;
  const length = Number(rawLength);
  if (!Number.isFinite(length) || length < 0) {
    return { status: 400, message: "Invalid Content-Length" };
  }
  if (length > maxBodyBytes) {
    return { status: 413, message: "Request body is too large" };
  }
  return null;
}

function jsonContentTypeAllowed(req) {
  if (isSafeMethod(req.method)) return true;
  const contentType = String(req.headers["content-type"] || "").trim();
  const hasChunkedBody = /\bchunked\b/i.test(String(req.headers["transfer-encoding"] || ""));
  const contentLength = Number(req.headers["content-length"] || 0);
  const mayHaveBody = hasChunkedBody || contentLength > 0;
  if (!mayHaveBody && !contentType) return true;
  return JSON_CONTENT_TYPE_RE.test(contentType);
}

function fetchMetadataAllowed(req, url) {
  const site = String(req.headers["sec-fetch-site"] || "").toLowerCase();
  if (!site) return true;
  if (["same-origin", "same-site", "none"].includes(site)) return true;
  if (site === "cross-site" && (String(url.pathname || "").startsWith("/api/") || !isSafeMethod(req.method))) {
    return false;
  }
  return true;
}

function crawlerLikeRequest(req) {
  const ua = String(req.headers["user-agent"] || "").trim();
  if (!ua) return true;
  return CRAWLER_OR_SCANNER_UA_RE.test(ua);
}

function sensitivePathIssue(url) {
  const pathname = String(url.pathname || "");
  const raw = String(url.href || pathname);
  if (SENSITIVE_PATH_RE.test(pathname) || SENSITIVE_PATH_RE.test(raw)) {
    return { status: 404, message: "Not found" };
  }
  return null;
}

function sanitizeJsonBody(value, options = {}) {
  const maxDepth = Number(options.maxDepth || 32);
  const maxKeys = Number(options.maxKeys || 100_000);
  let keys = 0;

  function walk(item, depth) {
    if (depth > maxDepth) {
      throw new Error("JSON body is too deeply nested");
    }
    if (Array.isArray(item)) {
      return item.map((entry) => walk(entry, depth + 1));
    }
    if (!item || typeof item !== "object") {
      return item;
    }
    const clean = Object.create(null);
    for (const [key, nested] of Object.entries(item)) {
      if (DANGEROUS_JSON_KEYS.has(key)) {
        continue;
      }
      keys += 1;
      if (keys > maxKeys) {
        throw new Error("JSON body has too many keys");
      }
      clean[key] = walk(nested, depth + 1);
    }
    return clean;
  }

  return walk(value, 0);
}

// Minimal restrictive CORS headers: never advertise a cross-origin allow-list,
// so browsers block cross-origin reads of API responses. Same-origin is unaffected.
function corsHeaders() {
  return {
    "Vary": "Origin"
  };
}

function securityHeaders(extra = {}) {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "X-DNS-Prefetch-Control": "off",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "X-Permitted-Cross-Domain-Policies": "none",
    "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet, noimageindex",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()",
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'"
    ].join("; "),
    ...extra
  };
}

module.exports = {
  safeEqual,
  extractRequestToken,
  isAuthorized,
  originAllowed,
  isSafeMethod,
  methodAllowed,
  createRateLimiter,
  clientIp,
  hostAllowed,
  requestTargetIssue,
  bodyLimitIssue,
  jsonContentTypeAllowed,
  fetchMetadataAllowed,
  crawlerLikeRequest,
  sensitivePathIssue,
  sanitizeJsonBody,
  corsHeaders,
  securityHeaders,
  DEFAULT_REQUEST_LIMITS
};
