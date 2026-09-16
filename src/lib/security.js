// Auth, CSRF, request-hardening and rate-limiting helpers for the HTTP server.
const { timingSafeEqual } = require("node:crypto");
const dns = require("node:dns").promises;
const net = require("node:net");

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

// Extract a bearer/shared token from headers or a same-site cookie. Query-string
// tokens are deliberately rejected because URLs leak through logs and history.
function extractRequestToken(req) {
  const auth = req.headers.authorization || "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  const xKey = req.headers["x-api-key"];
  if (xKey) return String(xKey).trim();

  const cookie = req.headers.cookie || "";
  const match = cookie.match(/(?:^|;\s*)sv_token=([^;]+)/);
  if (match) return match[1].trim();

  return "";
}

function isAuthorized(req, url, expectedToken) {
  if (!expectedToken) return true; // auth disabled
  return safeEqual(extractRequestToken(req), expectedToken);
}

// CSRF mitigation: state-changing methods must come from a same-origin/loopback context.
// Non-browser clients (no Origin) are allowed; cross-origin browsers are rejected.
function requestOrigin(req, options = {}) {
  const trustProxy = options.trustProxy === true;
  const forwardedProto = trustProxy ? String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim() : "";
  const forwardedHost = trustProxy ? String(req.headers["x-forwarded-host"] || "").split(",")[0].trim() : "";
  const protocol = forwardedProto || (req.socket?.encrypted ? "https" : "http");
  const host = forwardedHost || String(req.headers.host || "").trim();
  if (!host || !["http", "https"].includes(protocol)) return "";
  try {
    return new URL(`${protocol}://${host}`).origin.toLowerCase();
  } catch {
    return "";
  }
}

function originAllowed(req, options = {}) {
  const origin = req.headers.origin;
  if (!origin) return true;
  let normalizedOrigin;
  try {
    normalizedOrigin = new URL(origin).origin.toLowerCase();
  } catch {
    return false;
  }
  const expected = options.publicOrigin ? String(options.publicOrigin).replace(/\/$/, "").toLowerCase() : requestOrigin(req, options);
  return Boolean(expected) && normalizedOrigin === expected;
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

function clientIp(req, trustProxy = false) {
  const fwd = req.headers["x-forwarded-for"];
  if (trustProxy && typeof fwd === "string" && fwd.trim()) {
    return fwd.split(",")[0].trim();
  }
  return (req.socket && req.socket.remoteAddress) || "unknown";
}

function parseIpv4Number(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return null;
  if (net.isIPv4(raw)) return raw.split(".").map(Number);
  const parsePart = (part, radix = 10) => {
    if (!part || !/^(?:0x[0-9a-f]+|\d+)$/.test(part)) return null;
    const base = /^0x/.test(part) ? 16 : (/^0[0-7]+$/.test(part) && part.length > 1 ? 8 : radix);
    const parsed = Number.parseInt(part.replace(/^0x/, ""), base);
    return Number.isFinite(parsed) ? parsed : null;
  };
  if (/^(?:0x[0-9a-f]+|\d+)$/.test(raw)) {
    const number = parsePart(raw);
    if (number !== null && number >= 0 && number <= 0xffffffff) {
      return [number >>> 24, (number >>> 16) & 255, (number >>> 8) & 255, number & 255];
    }
  }
  const parts = raw.split(".");
  if (parts.length < 1 || parts.length > 4) return null;
  const values = parts.map((part) => parsePart(part));
  if (values.some((part) => part === null)) return null;
  const limits = [0xffffffff, 0xffffff, 0xffff, 0xff];
  const lastLimit = limits[values.length - 1];
  if (values.at(-1) > lastLimit || values.slice(0, -1).some((part) => part > 255)) return null;
  let number = values.at(-1);
  for (let index = 0; index < values.length - 1; index += 1) {
    number += values[index] * 2 ** (8 * (3 - index));
  }
  return [number >>> 24, (number >>> 16) & 255, (number >>> 8) & 255, number & 255];
}

function expandIpv6(value) {
  let raw = String(value || "").toLowerCase().split("%")[0].replace(/^\[|\]$/g, "");
  if (!net.isIPv6(raw)) return null;
  if (raw.includes(".")) {
    const separator = raw.lastIndexOf(":");
    const ipv4 = parseIpv4Number(raw.slice(separator + 1));
    if (!ipv4) return null;
    const first = ((ipv4[0] << 8) | ipv4[1]).toString(16);
    const second = ((ipv4[2] << 8) | ipv4[3]).toString(16);
    raw = `${raw.slice(0, separator)}:${first}:${second}`;
  }
  const halves = raw.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":").filter(Boolean) : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":").filter(Boolean) : [];
  if ([...left, ...right].some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return null;
  const missing = halves.length === 2 ? 8 - left.length - right.length : 0;
  if (missing < 0 || (halves.length === 1 && left.length !== 8)) return null;
  return [...left, ...Array.from({ length: missing }, () => "0"), ...right].map((part) => Number.parseInt(part, 16));
}

function privateIpAddress(address = "") {
  const value = String(address || "").toLowerCase().split("%")[0].replace(/^\[|\]$/g, "");
  const ipv4 = parseIpv4Number(value);
  if (ipv4) {
    const [a, b] = ipv4;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 18 || b === 19)) ||
      a >= 224
    );
  }

  const words = expandIpv6(value);
  if (!words) return false;
  const isIpv4Mapped = words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff;
  const isIpv4Compatible = words.slice(0, 6).every((word) => word === 0);
  if (isIpv4Mapped || (isIpv4Compatible && (words[6] !== 0 || words[7] !== 0))) {
    const mapped = `${words[6] >>> 8}.${words[6] & 255}.${words[7] >>> 8}.${words[7] & 255}`;
    return privateIpAddress(mapped);
  }
  const first = words[0];
  const isUnspecified = words.every((word) => word === 0);
  const isLoopback = words.slice(0, 7).every((word) => word === 0) && words[7] === 1;
  const isUniqueLocal = (first & 0xfe00) === 0xfc00;
  const isLinkLocal = (first & 0xffc0) === 0xfe80;
  const isMulticast = (first & 0xff00) === 0xff00;
  return isUnspecified || isLoopback || isUniqueLocal || isLinkLocal || isMulticast;
}

function validateExternalUrl(value, options = {}) {
  let url;
  try {
    url = new URL(String(value || ""));
  } catch {
    throw new Error("Provider base URL is invalid");
  }
  if (url.protocol !== "https:") throw new Error("Provider base URL must use HTTPS");
  if (url.username || url.password) throw new Error("Provider base URL must not contain credentials");
  if (!options.allowPrivate) {
    const hostname = url.hostname.toLowerCase();
    if (LOOPBACK_HOSTS.has(hostname) || hostname.endsWith(".localhost") || hostname.endsWith(".local") || privateIpAddress(hostname)) {
      throw new Error("Provider base URL must not target localhost or a private network");
    }
  }
  return url;
}

const safeHostCache = new Map();

function safeHostCacheKey(url) {
  return `${url.hostname.toLowerCase()}:${url.port || 443}`;
}

async function resolveSafeExternalUrl(value, options = {}) {
  const url = validateExternalUrl(value, options);
  if (options.allowPrivate) return { url, addresses: [] };
  const cacheKey = safeHostCacheKey(url);
  const cached = safeHostCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { url, addresses: cached.addresses.map((entry) => ({ ...entry })) };
  }
  const addresses = await dns.lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((entry) => privateIpAddress(entry?.address || entry))) {
    throw new Error("Provider base URL resolves to a private or unavailable network address");
  }
  const normalizedAddresses = addresses.map((entry) => {
    const address = typeof entry === "string" ? entry : entry?.address;
    return { address: String(address || ""), family: Number(entry?.family || net.isIP(address || "")) };
  });
  if (normalizedAddresses.some((entry) => !entry.address || !entry.family)) {
    throw new Error("Provider base URL resolves to an invalid network address");
  }
  safeHostCache.set(cacheKey, { expiresAt: Date.now() + 5 * 60_000, addresses: normalizedAddresses });
  return { url, addresses: normalizedAddresses.map((entry) => ({ ...entry })) };
}

async function assertSafeExternalUrl(value, options = {}) {
  await resolveSafeExternalUrl(value, options);
  return validateExternalUrl(value, options);
}

function normalizeHost(host = "") {
  const raw = String(host || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw.startsWith("[")) {
    const closingBracket = raw.indexOf("]");
    return closingBracket > 0 ? raw.slice(1, closingBracket) : raw;
  }
  if (net.isIP(raw)) return raw;
  const separator = raw.lastIndexOf(":");
  const hasSingleSeparator = separator > 0 && raw.indexOf(":") === separator;
  if (hasSingleSeparator && /^\d+$/.test(raw.slice(separator + 1))) {
    return raw.slice(0, separator).replace(/\.$/, "");
  }
  return raw.replace(/\.$/, "");
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
  requestOrigin,
  validateExternalUrl,
  resolveSafeExternalUrl,
  assertSafeExternalUrl,
  privateIpAddress,
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
