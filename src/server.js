const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const { buildConfig, publicConfig } = require("./lib/config");
const {
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
} = require("./lib/security");
const {
  applyMemoryToQueryProfiles,
  buildQueryProfiles,
  fetchTrendingRepositories,
  forkRepository,
  getAuthenticatedUser,
  githubRepositorySearchCount,
  githubRateLimitStatus,
  isGithubRateLimitError,
  listOwnRepositories,
  normalizeGithubOrGroups,
  repositoryOnlineTrends,
  sampleRepositorySearchResults,
  searchCandidateRepositories,
  starRepository,
  unstarRepository
} = require("./lib/github");
const { enrichRepository } = require("./lib/scoring");
const { createStorage } = require("./lib/storage");
const { focusedSpecificPlanKeywords, isNxObservationNeed } = require("./lib/domain-relevance");
const { enrichTopProjectsWithExa, searchTopicSignals: searchExaTopicSignals } = require("./lib/exa");
const { enrichTopProjectsWithTavily, searchTopicSignals: searchTavilyTopicSignals } = require("./lib/tavily");
const { startScheduler } = require("./lib/scheduler");
const { demoRepositories } = require("./lib/seed");
const {
  activeProvider,
  analyzeWithProvider,
  generateObservationPlanWithProvider,
  listProviderModels,
  testProviderConnection,
  tuneMemoryWithProvider
} = require("./lib/llm");

const config = buildConfig();
const storage = createStorage(config.storePath);
let scheduler = null;
let scanInProgress = false;
let scanProgress = {
  status: "idle",
  stage: "idle",
  label: "空闲",
  percent: 0,
  completed: 0,
  total: 0,
  startedAt: null,
  updatedAt: null
};
let scanEta = null;

// Per-IP limits for expensive endpoints (protects GitHub/Tavily/Exa/LLM budgets).
const apiRateLimiter = createRateLimiter({ windowMs: 60_000, max: 240 });
const staticRateLimiter = createRateLimiter({ windowMs: 60_000, max: 600 });
const crawlerRateLimiter = createRateLimiter({ windowMs: 60_000, max: 40 });
const sensitiveProbeRateLimiter = createRateLimiter({ windowMs: 10 * 60_000, max: 20 });
const mutationRateLimiter = createRateLimiter({ windowMs: 60_000, max: 120 });
const scanRateLimiter = createRateLimiter({ windowMs: 60_000, max: 6 });
const analyzeRateLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });
const authFailureRateLimiter = createRateLimiter({ windowMs: 10 * 60_000, max: 8 });

const LLM_HEAVY_POST_PATHS = new Set([
  "/api/analyze",
  "/api/observation-plans/generate",
  "/api/memory/context/compact",
  "/api/memory/harness/evaluate",
  "/api/memory/harness/tune"
]);

function enforceRateLimit(req, url) {
  const ip = clientIp(req);
  const apiLimit = apiRateLimiter(ip);
  if (!apiLimit.allowed) {
    return { ...apiLimit, scope: "api" };
  }
  if (!isSafeMethod(req.method)) {
    const mutationLimit = mutationRateLimiter(ip);
    if (!mutationLimit.allowed) {
      return { ...mutationLimit, scope: "mutation" };
    }
  }
  if (req.method === "POST" && url.pathname === "/api/scan") {
    const scanLimit = scanRateLimiter(ip);
    if (!scanLimit.allowed) {
      return { ...scanLimit, scope: "scan" };
    }
  }
  if (req.method === "POST" && LLM_HEAVY_POST_PATHS.has(url.pathname)) {
    const llmLimit = analyzeRateLimiter(ip);
    if (!llmLimit.allowed) {
      return { ...llmLimit, scope: "heavy" };
    }
  }
  return null;
}

function enforceStaticRateLimit(req) {
  const limit = staticRateLimiter(clientIp(req));
  return limit.allowed ? null : { ...limit, scope: "static" };
}

function enforceCrawlerRateLimit(req) {
  if (!crawlerLikeRequest(req)) return null;
  const limit = crawlerRateLimiter(`crawler:${clientIp(req)}`);
  return limit.allowed ? null : { ...limit, scope: "crawler" };
}

function enforceSensitiveProbeLimit(req) {
  const limit = sensitiveProbeRateLimiter(`probe:${clientIp(req)}`);
  return limit.allowed ? null : { ...limit, scope: "probe" };
}

function dateDaysAgo(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function startScanEta(totalUnits = 100) {
  scanEta = {
    startedAt: Date.now(),
    totalUnits: Math.max(1, Number(totalUnits || 100)),
    completedUnits: 0,
    lastEtaSeconds: null,
    lastEtaRange: null
  };
}

function scanEtaConfidence(elapsedSeconds, progressRatio) {
  if (elapsedSeconds < 20 || progressRatio < 0.12) return "low";
  if (elapsedSeconds < 45 || progressRatio < 0.35) return "medium";
  return "high";
}

function scanEtaMessage(stage, confidence) {
  if (confidence === "low") return "warming-up";
  if (["github", "tavily", "exa", "score"].includes(stage)) return "network-sensitive";
  return "steady";
}

function updateScanEta(completedUnits = 0) {
  if (!scanEta) return null;
  scanEta.completedUnits = Math.max(scanEta.completedUnits, Math.min(scanEta.totalUnits, Number(completedUnits || 0)));
  const elapsedSeconds = Math.max(0, (Date.now() - scanEta.startedAt) / 1000);
  const progressRatio = scanEta.completedUnits / scanEta.totalUnits;
  if (elapsedSeconds < 12 || progressRatio < 0.08) {
    return null;
  }
  const remainingUnits = Math.max(0, scanEta.totalUnits - scanEta.completedUnits);
  const rate = scanEta.completedUnits / Math.max(1, elapsedSeconds);
  if (!rate) return null;
  const rawEta = remainingUnits / rate;
  const confidence = scanEtaConfidence(elapsedSeconds, progressRatio);
  const nextEta =
    scanEta.lastEtaSeconds === null
      ? rawEta
      : Math.min(Math.max(rawEta, scanEta.lastEtaSeconds * 0.86), scanEta.lastEtaSeconds * (confidence === "high" ? 1.06 : 1.12));
  scanEta.lastEtaSeconds = nextEta;
  const spread = confidence === "low" ? 0.55 : confidence === "medium" ? 0.36 : 0.22;
  const minSeconds = Math.max(20, nextEta * (1 - spread * 0.45));
  const maxSeconds = Math.max(minSeconds + 20, nextEta * (1 + spread));
  const range =
    scanEta.lastEtaRange === null
      ? { min: minSeconds, max: maxSeconds }
      : {
          min: Math.min(Math.max(minSeconds, scanEta.lastEtaRange.min * 0.88), scanEta.lastEtaRange.min * 1.1),
          max: Math.min(Math.max(maxSeconds, scanEta.lastEtaRange.max * 0.92), scanEta.lastEtaRange.max * 1.12)
        };
  scanEta.lastEtaRange = range;
  return {
    seconds: Math.round(nextEta),
    minSeconds: Math.round(range.min),
    maxSeconds: Math.round(range.max),
    confidence,
    reason: scanEtaMessage(scanProgress.stage, confidence)
  };
}

function setScanProgress(next = {}) {
  const etaEstimate = next.etaSeconds === undefined ? updateScanEta(next.progressUnits) : null;
  const etaSeconds = next.etaSeconds === undefined ? etaEstimate?.seconds ?? null : next.etaSeconds;
  scanProgress = {
    ...scanProgress,
    ...next,
    etaSeconds,
    etaMinSeconds: next.etaMinSeconds ?? etaEstimate?.minSeconds ?? null,
    etaMaxSeconds: next.etaMaxSeconds ?? etaEstimate?.maxSeconds ?? null,
    etaConfidence: next.etaConfidence ?? etaEstimate?.confidence ?? "",
    etaReason: next.etaReason ?? etaEstimate?.reason ?? "",
    updatedAt: new Date().toISOString()
  };
  return scanProgress;
}

function stagePercent(start, end, completed = 0, total = 1) {
  const ratio = total > 0 ? Math.max(0, Math.min(1, completed / total)) : 0;
  return Math.round(start + (end - start) * ratio);
}

function effectiveGithubToken() {
  return storage.getSettings(true).githubToken || config.githubToken;
}

async function validateGithubScanToken(token) {
  if (!token) {
    throw new Error("GitHub Token is required. Please configure a valid token before scanning projects.");
  }
  try {
    await getAuthenticatedUser(token);
  } catch (error) {
    const message = String(error?.message || "");
    if (/401|bad credentials|requires authentication/i.test(message)) {
      throw new Error("GitHub Token is invalid or expired. Please replace it before scanning projects.");
    }
    throw error;
  }
}

function keyValidationResult(configured, valid, message = "") {
  return {
    configured: Boolean(configured),
    valid: configured ? Boolean(valid) : null,
    message
  };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function validateGithubKeyStatus(token) {
  if (!token) return keyValidationResult(false, null);
  try {
    await validateGithubScanToken(token);
    return keyValidationResult(true, true);
  } catch (error) {
    return keyValidationResult(true, false, "GitHub Token 无效或已过期");
  }
}

async function validateTavilyKeyStatus(key) {
  if (!key) return keyValidationResult(false, null);
  try {
    const response = await fetchWithTimeout("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({
        query: "GitHub open source",
        search_depth: "basic",
        max_results: 1,
        include_answer: false,
        include_raw_content: false
      })
    });
    if (!response.ok) {
      throw new Error(`Tavily validation failed with ${response.status}`);
    }
    return keyValidationResult(true, true);
  } catch (error) {
    return keyValidationResult(true, false, "Tavily Key 无效");
  }
}

async function validateExaKeyStatus(key) {
  if (!key) return keyValidationResult(false, null);
  try {
    const response = await fetchWithTimeout("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key
      },
      body: JSON.stringify({
        query: "GitHub open source",
        type: "auto",
        numResults: 1,
        text: false
      })
    });
    if (!response.ok) {
      throw new Error(`Exa validation failed with ${response.status}`);
    }
    return keyValidationResult(true, true);
  } catch (error) {
    return keyValidationResult(true, false, "Exa Key 无效");
  }
}

async function validateSavedServiceKeys() {
  const settings = storage.getSettings(true);
  const githubToken = settings.githubToken || config.githubToken || "";
  const tavilyKey = settings.tavilyKey || config.tavilyKey || "";
  const exaKey = settings.exaKey || config.exaKey || "";
  const [github, tavily, exa] = await Promise.all([
    validateGithubKeyStatus(githubToken),
    validateTavilyKeyStatus(tavilyKey),
    validateExaKeyStatus(exaKey)
  ]);
  return {
    checkedAt: new Date().toISOString(),
    github,
    tavily,
    exa
  };
}

function isGithubAuthError(error) {
  return /401|bad credentials|requires authentication|GitHub Token is invalid|GitHub Token is required/i.test(String(error?.message || ""));
}

function isGithubNetworkError(error) {
  return /GitHub network request failed|fetch failed|ENOTFOUND|ECONNRESET|ETIMEDOUT|EAI_AGAIN|network/i.test(String(error?.message || ""));
}

function assertNoGithubAuthErrors(errors = []) {
  const authError = errors.find((error) => isGithubAuthError(error));
  if (authError) {
    throw new Error("GitHub Token is invalid or expired. Please replace it before scanning projects.");
  }
}

function assertNoGithubBlockingErrors(errors = []) {
  assertNoGithubAuthErrors(errors);
  const rateLimitError = errors.find((error) => isGithubRateLimitError(error));
  if (rateLimitError) {
    throw new Error("GitHub API 调用已触发限流，请等待一段时间后再扫描，或降低检索条数后重试。");
  }
}

function assertGithubSearchUsable(result = {}) {
  const errors = Array.isArray(result.errors) ? result.errors : [];
  if ((result.repositories || []).length || !errors.length) return;
  const first = errors[0] || {};
  if (isGithubNetworkError(first)) {
    throw new Error(`GitHub 网络请求失败，未能完成项目检索：${first.message || "请检查网络后重试"}`);
  }
  throw new Error(`GitHub 项目检索失败，未能写入空结果：${first.message || "请稍后重试"}`);
}

function githubRateResource(rateStatus, resource) {
  const item = rateStatus?.resources?.[resource];
  if (!item) return null;
  const remaining = Number(item.remaining);
  const limit = Number(item.limit);
  const reset = Number(item.reset);
  return {
    limit: Number.isFinite(limit) ? limit : null,
    remaining: Number.isFinite(remaining) ? remaining : null,
    resetAt: Number.isFinite(reset) && reset > 0 ? new Date(reset * 1000).toISOString() : ""
  };
}

function finiteOrInfinity(value) {
  return Number.isFinite(value) ? value : Infinity;
}

function planGithubScanBudget(rateStatus, options = {}) {
  const core = githubRateResource(rateStatus, "core");
  const search = githubRateResource(rateStatus, "search");
  const graphql = githubRateResource(rateStatus, "graphql");
  const plannedTrendLimit = Math.max(0, Number(options.plannedTrendLimit || 0));
  const plannedTrendingMaxRepos = Math.max(0, Number(options.trendingMaxRepos || 0));
  let availableCore = finiteOrInfinity(core?.remaining);
  let availableGraphql = finiteOrInfinity(graphql?.remaining);
  if (Number.isFinite(availableCore)) availableCore = Math.max(0, availableCore - 40);
  if (Number.isFinite(availableGraphql)) availableGraphql = Math.max(0, availableGraphql - 100);

  let trendingMaxRepos = plannedTrendingMaxRepos;
  if (Number.isFinite(availableCore)) {
    const trendingCoreCap = Math.max(0, Math.floor(availableCore * 0.35));
    trendingMaxRepos = Math.min(trendingMaxRepos, trendingCoreCap);
    availableCore = Math.max(0, availableCore - trendingMaxRepos);
  }

  let trendLimit = plannedTrendLimit;
  if (Number.isFinite(availableCore)) {
    trendLimit = Math.min(trendLimit, Math.max(0, Math.floor(availableCore / 2)));
  }
  if (Number.isFinite(availableGraphql)) {
    trendLimit = Math.min(trendLimit, Math.max(0, Math.floor(availableGraphql / 8)));
  }

  return {
    trendingMaxRepos,
    trendLimit,
    constrained: trendingMaxRepos < plannedTrendingMaxRepos || trendLimit < plannedTrendLimit,
    resources: {
      core,
      search,
      graphql
    }
  };
}

function effectiveTavilyKey() {
  return storage.getSettings(true).tavilyKey || config.tavilyKey;
}

function effectiveExaKey() {
  return storage.getSettings(true).exaKey || config.exaKey;
}

function publicEffectiveConfig() {
  return {
    ...publicConfig(config),
    githubConfigured: Boolean(effectiveGithubToken()),
    tavilyConfigured: Boolean(effectiveTavilyKey()),
    exaConfigured: Boolean(effectiveExaKey())
  };
}

function revealSetFromParam(value = "") {
  return new Set(
    String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function settingsResponse(reveal = new Set()) {
  const revealSet = reveal instanceof Set ? reveal : revealSetFromParam(reveal);
  const settings = storage.getSettings(false);
  const secretSettings = storage.getSettings(true);
  const githubToken = secretSettings.githubToken || config.githubToken || "";
  const tavilyKey = secretSettings.tavilyKey || config.tavilyKey || "";
  const exaKey = secretSettings.exaKey || config.exaKey || "";
  const providerSecrets = new Map((secretSettings.llmProviders || []).map((provider) => [provider.id, provider.apiKey || ""]));
  return {
    ...settings,
    githubToken: revealSet.has("github") ? githubToken : "",
    githubTokenSet: Boolean(githubToken),
    githubTokenPreview: githubToken ? `${githubToken.slice(0, 8)}...${githubToken.slice(-4)}` : "",
    tavilyKey: revealSet.has("tavily") ? tavilyKey : "",
    tavilyKeySet: Boolean(tavilyKey),
    tavilyKeyPreview: tavilyKey ? `${tavilyKey.slice(0, 8)}...${tavilyKey.slice(-4)}` : "",
    exaKey: revealSet.has("exa") ? exaKey : "",
    exaKeySet: Boolean(exaKey),
    exaKeyPreview: exaKey ? `${exaKey.slice(0, 8)}...${exaKey.slice(-4)}` : "",
    llmProviders: (settings.llmProviders || []).map((provider) => {
      const revealProvider = revealSet.has(`provider:${provider.id}`);
      return {
        ...provider,
        apiKey: revealProvider ? providerSecrets.get(provider.id) || "" : ""
      };
    })
  };
}

function deepSeekCatalog() {
  return {
    updatedAt: new Date().toISOString(),
    source: "built-in",
    endpoints: [
      {
        providerId: "deepseek",
        name: "DeepSeek OpenAI-compatible",
        baseUrl: "https://api.deepseek.com",
        protocol: "openai-compatible"
      }
    ]
  };
}

async function searchDeepSeekCatalogWithTavily(tavilyKey) {
  if (!tavilyKey) {
    return null;
  }

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tavilyKey}`
    },
    body: JSON.stringify({
      query: "DeepSeek API official docs OpenAI-compatible base URL models endpoint",
      search_depth: "basic",
      max_results: 5,
      include_answer: false,
      include_raw_content: false
    })
  });

  if (!response.ok) {
    throw new Error(`Tavily catalog refresh failed with ${response.status}`);
  }

  const json = await response.json();
  const results = (json.results || []).map((item) => ({
    title: item.title || "",
    url: item.url || "",
    content: item.content || ""
  }));
  const matched = results.find((item) => /api\.deepseek\.com/i.test(`${item.title} ${item.url} ${item.content}`));

  return {
    source: "tavily",
    checkedAt: new Date().toISOString(),
    evidence: results.slice(0, 3),
    endpoint: matched
      ? {
          providerId: "deepseek",
          name: "DeepSeek OpenAI-compatible",
          baseUrl: "https://api.deepseek.com",
          protocol: "openai-compatible",
          sourceUrl: matched.url
        }
      : null
  };
}

async function refreshProviderCatalogIfStale(force = false) {
  const settings = storage.getSettings(true);
  const lastChecked = settings.providerCatalog?.updatedAt ? new Date(settings.providerCatalog.updatedAt) : null;
  const isFresh =
    lastChecked &&
    lastChecked.toDateString() === new Date().toDateString() &&
    Array.isArray(settings.providerCatalog?.endpoints) &&
    settings.providerCatalog.endpoints.length > 0;

  if (!force && isFresh) {
    return settings.providerCatalog;
  }

  const catalog = deepSeekCatalog();
  const tavilyKey = effectiveTavilyKey();
  if (tavilyKey) {
    try {
      const search = await searchDeepSeekCatalogWithTavily(tavilyKey);
      if (search?.endpoint) {
        catalog.source = "tavily";
        catalog.endpoints = [search.endpoint];
        catalog.evidence = search.evidence;
      } else if (search) {
        catalog.source = "tavily-no-endpoint-match";
        catalog.evidence = search.evidence;
      }
    } catch (error) {
      catalog.source = "built-in-after-tavily-error";
      catalog.error = error.message;
    }
  }

  const endpoint = catalog.endpoints[0];
  const providers = (settings.llmProviders || []).map((provider) => {
    if (provider.id !== "deepseek" || !endpoint) return provider;
    return {
      ...provider,
      baseUrl: endpoint.baseUrl,
      protocol: endpoint.protocol || "openai-compatible"
    };
  });

  storage.updateSettings({
    ...settings,
    providerCatalog: catalog,
    activeProvider: "deepseek",
    llmProviders: providers
  });

  return settingsResponse().providerCatalog;
}

function getProviderOrThrow(settings, providerId) {
  const provider = (settings.llmProviders || []).find((item) => item.id === providerId);
  if (!provider) {
    throw new Error("Provider not found");
  }
  return provider;
}

function mergeProviderUpdate(settings, providerId, patch) {
  return {
    ...settings,
    llmProviders: (settings.llmProviders || []).map((provider) =>
      provider.id === providerId
        ? {
            ...provider,
            ...patch
          }
        : provider
    )
  };
}

function contentType(filePath) {
  const ext = path.extname(filePath);
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".js") return "text/javascript; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}

function sendJson(res, status, payload) {
  res.writeHead(status, securityHeaders({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...corsHeaders()
  }));
  res.end(JSON.stringify(payload));
}

function sendText(res, status, body, headers = {}) {
  res.writeHead(status, securityHeaders({
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    ...corsHeaders(),
    ...headers
  }));
  res.end(body);
}

function sendError(res, status, message, details = {}) {
  sendJson(res, status, {
    error: message,
    ...details
  });
}

function sendRateLimited(res, limit) {
  const retryAfter = Math.max(1, Math.ceil(Number(limit.retryAfter || 1000) / 1000));
  res.writeHead(429, securityHeaders({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Retry-After": String(retryAfter),
    ...corsHeaders()
  }));
  res.end(JSON.stringify({ error: "Too Many Requests", retryAfter: Number(limit.retryAfter || 0), scope: limit.scope || "request" }));
}

function robotsTxt() {
  return [
    "User-agent: *",
    "Disallow: /",
    "Noindex: /",
    "",
    "# StarVault Imprint is an app surface, not a crawl target."
  ].join("\n");
}

function staticDestinationIssue(req, pathname) {
  const destination = String(req.headers["sec-fetch-dest"] || "").toLowerCase();
  if (!destination) return null;
  const ext = path.extname(pathname).toLowerCase();
  const allowedByExt = {
    ".css": new Set(["style"]),
    ".js": new Set(["script"]),
    ".svg": new Set(["image"]),
    ".ico": new Set(["image"]),
    ".png": new Set(["image"]),
    ".jpg": new Set(["image"]),
    ".jpeg": new Set(["image"]),
    ".webp": new Set(["image"]),
    ".html": new Set(["document", "empty"]),
    ".txt": new Set(["document", "empty"])
  };
  const allowed = allowedByExt[ext];
  if (!allowed || allowed.has(destination)) {
    return null;
  }
  return { status: 404, message: "Not found" };
}

function parseBody(req, options = {}) {
  const maxBodyBytes = Number(options.maxBodyBytes || DEFAULT_REQUEST_LIMITS.maxBodyBytes);
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let aborted = false;
    req.on("data", (chunk) => {
      if (aborted) {
        return;
      }
      size += chunk.length;
      if (size > maxBodyBytes) {
        aborted = true;
        // Stop reading so a huge upload can't keep consuming memory/bandwidth.
        try {
          req.destroy();
        } catch {
          /* ignore */
        }
        reject(new Error("Request body is too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (aborted) {
        return;
      }
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(sanitizeJsonBody(JSON.parse(raw)));
      } catch (error) {
        reject(error.message === "JSON body is too deeply nested" || error.message === "JSON body has too many keys" ? error : new Error("Invalid JSON body"));
      }
    });
    req.on("error", () => {
      if (!aborted) {
        reject(new Error("Request read failed"));
      }
    });
  });
}

function previousProjectMap() {
  const store = storage.load();
  return new Map(Object.values(store.projects).map((project) => [project.fullName, project]));
}

function repositoryMapKey(fullName = "") {
  return String(fullName || "").trim().toLowerCase();
}

function mergeSignalMap(target, source) {
  for (const [fullName, signals] of source || []) {
    const key = repositoryMapKey(fullName);
    if (!key) continue;
    const existing = target.get(key) || [];
    target.set(key, [...existing, ...(signals || [])]);
  }
  return target;
}

function signalsForRepository(signalMap, fullName) {
  return signalMap.get(repositoryMapKey(fullName)) || [];
}

function mergeRepositoryCandidates(primary = [], auxiliary = [], maxRepos = 800) {
  const byName = new Map();
  for (const repo of primary) {
    const key = repositoryMapKey(repo.fullName);
    if (!key) continue;
    byName.set(key, repo);
  }
  let added = 0;
  for (const repo of auxiliary) {
    const key = repositoryMapKey(repo.fullName);
    if (!key) continue;
    const existing = byName.get(key);
    if (existing) {
      byName.set(key, {
        ...repo,
        ...existing,
        topics: existing.topics?.length ? existing.topics : repo.topics || [],
        license: existing.license || repo.license || null,
        source: existing.source === "github-trending" ? "github-trending" : "github+trending"
      });
      continue;
    }
    byName.set(key, repo);
    added += 1;
  }
  return {
    repositories: Array.from(byName.values()).slice(0, Math.max(1, Number(maxRepos || 800))),
    added
  };
}

function discoveryLogic() {
  const language = storage.getSettings(false).language || "zh";
  const activePlan = hydrateObservationPlanSearchLogic(storage.getObservationPlan(), language);
  const memory = storage.getMemory();
  return {
    primarySource: "GitHub REST Search API + GitHub Trending",
    secondarySource: "Tavily + Exa web signal enrichment",
    observationPlan: activePlan,
    flow: [
      "Read transparent learning memory to adjust profile order and keep exploration slots.",
      "Run a product-first matrix of GitHub repository search profiles: self-hosted apps, SaaS starters, browser extensions, desktop/mobile apps, editors, creator tools, commerce systems, vertical apps, data workbenches, and developer utilities.",
      "Read GitHub Trending daily, weekly, and monthly rankings as an official community-heat signal; Trending-only repositories still go through the same repository metadata, license, risk, and product-shape scoring.",
      "Prefer repositories with a clear user surface: dashboard, editor, studio, plugin, template, app, workflow, deployment path, or business process.",
      "Keep abstract Agent/RAG/MCP/framework/list/tutorial projects in the monitorable pool, but down-rank them unless they show a concrete product surface.",
      "Deduplicate repositories by full_name.",
      "Compare with previous local snapshots to compute deltas.",
      "Pre-score candidates locally, then query Tavily and Exa only for the strongest product-shaped shortlist, looking for demos, docs, users, deployment, use cases, and product evidence.",
      "Classify each repository into stable semantic keys for what problem it solves, who it serves, and what tool/service/plugin/template/workflow it can become.",
      "Rebuild visible filter tags from the current scan pool's semantic distribution; core tags remain stable while high-frequency and emerging tags float up dynamically.",
      "Apply memory-aware leaderboard scoring with diversity rotation, negative preference penalties, and anti-filter-bubble exploration.",
      "Persist all results locally and render filtered views from the local store."
    ],
    tavilyUsage: "Tavily is not the main discovery engine. It is used only when configured, and only to enrich a shortlist with external web mentions.",
    exaUsage: "Exa is an additional semantic web-search enrichment channel. It complements Tavily for external product/user/demo signals and never replaces GitHub as the primary repository source.",
    githubTrendingUsage: "GitHub Trending is used as a supporting heat and discovery signal. It can add candidates and slightly boost ranking confidence, but it does not bypass product, license, risk, memory, or diversity rules.",
    profiles: applyMemoryToQueryProfiles(buildQueryProfiles(activePlan.id === "default" ? null : activePlan), memory).map((profile) => ({
      key: profile.key,
      label: profile.label,
      query: profile.q,
      memoryWeight: Number(profile.memoryWeight || 0),
      explorationSlot: Boolean(profile.explorationSlot)
    }))
  };
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function normalizeExportLanguage(value) {
  return value === "en" ? "en" : "zh";
}

const OBSERVATION_DEFAULT_PROFILE_COUNT = 55;
const ABSTRACT_AI_NOISE = "-topic:agent -topic:agents -topic:ai-agent -topic:agentic -topic:multi-agent -topic:autonomous-agent -topic:swarm -topic:mcp";
const RESEARCH_NOISE = "-topic:awesome -topic:tutorial -topic:course -topic:paper -topic:benchmark";

function observationPlanExecutionCount(strategy = {}) {
  const customCount = Array.isArray(strategy.customQueries) ? strategy.customQueries.length : 0;
  const mode = strategy.baseMode || "focused";
  if (mode === "only") return customCount;
  if (mode === "blend") return customCount + OBSERVATION_DEFAULT_PROFILE_COUNT;
  return customCount + Math.min(10, OBSERVATION_DEFAULT_PROFILE_COUNT);
}

function normalizedObservationPlanTitle(value = "") {
  return String(value || "")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();
}

function observationPlanTitleMatches(planName = "", plan = {}) {
  const target = normalizedObservationPlanTitle(planName);
  if (!target) return false;
  return [plan.name, plan.nameEn].some((item) => normalizedObservationPlanTitle(item) === target);
}

function draftObservationRequirements(requirements = []) {
  const now = new Date().toISOString();
  const seen = new Set();
  return (Array.isArray(requirements) ? requirements : String(requirements || "").split(/\n+/))
    .map((item, index) => {
      const text = typeof item === "string" ? item : item?.text;
      const clean = String(text || "").replace(/\s+/g, " ").trim().slice(0, 600);
      if (!clean) return null;
      const key = clean.toLowerCase();
      if (seen.has(key)) return null;
      seen.add(key);
      return {
        id: String(item?.id || clean.slice(0, 40) || `req-${index}`).replace(/\s+/g, "-").toLowerCase(),
        text: clean,
        createdAt: item?.createdAt || now,
        updatedAt: item?.updatedAt || now
      };
    })
    .filter(Boolean)
    .slice(0, 30);
}

function compactResearchSignals(signals = []) {
  return signals
    .map((item) => ({
      source: item.source || "",
      title: String(item.title || "").slice(0, 140),
      url: item.url || "",
      content: String(item.content || "").replace(/\s+/g, " ").trim().slice(0, 480)
    }))
    .filter((item) => item.title || item.content)
    .slice(0, 24);
}

function compactObservationDomainModelForPrompt(model = {}) {
  const pick = (value, limit = 12) => (Array.isArray(value) ? value.map(String).filter(Boolean).slice(0, limit) : []);
  return {
    key: model.key || "custom",
    labelZh: model.labelZh || "",
    labelEn: model.labelEn || "",
    aliases: pick(model.aliases, 16),
    definitions: pick(model.definitions, 8),
    formats: pick(model.formats, 16),
    standards: pick(model.standards, 8),
    software: pick(model.software, 14),
    libraries: pick(model.libraries, 14),
    workflows: pick(model.workflows, 16),
    productSurfaces: pick(model.productSurfaces, 10),
    excludeTerms: pick(model.excludeTerms, 16),
    sampleTerms: pick(model.sampleTerms, 12),
    githubActivity: {
      activityLevel: model.githubActivity?.activityLevel || model.activityLevel || "unknown",
      maxTotalCount: Number(model.githubActivity?.maxTotalCount || model.githubActivityMaxTotalCount || 0)
    }
  };
}

function compactObservationResearchContextForPrompt(context = {}) {
  const signals = compactResearchSignals(context.signals || [])
    .slice(0, 8)
    .map((item) => ({
      source: item.source,
      title: item.title,
      content: item.content.slice(0, 260)
    }));
  const githubSamples = context.githubSamples || {};
  const githubActivity = context.githubActivity || {};
  const domainModel = compactObservationDomainModelForPrompt(context.domainModel || context.metacognition || {});
  return {
    queries: (context.queries || []).map(String).slice(0, 5),
    signals,
    errors: (context.errors || []).map(String).slice(0, 4),
    githubActivity: {
      terms: (githubActivity.terms || []).map(String).slice(0, 4),
      maxTotalCount: Number(githubActivity.maxTotalCount || 0),
      activityLevel: githubActivity.activityLevel || "unknown",
      probes: (githubActivity.probes || []).slice(0, 4).map((item) => ({
        term: item.term,
        totalCount: Number(item.totalCount || 0)
      }))
    },
    githubSamples: {
      terms: (githubSamples.terms || []).map(String).slice(0, 4),
      keywords: (githubSamples.keywords || []).map(String).slice(0, 16),
      repositories: (githubSamples.repositories || []).slice(0, 5).map((repo) => ({
        fullName: repo.fullName,
        description: String(repo.description || "").slice(0, 180),
        language: repo.language || "",
        topics: Array.isArray(repo.topics) ? repo.topics.slice(0, 8) : [],
        stars: Number(repo.stars || 0)
      }))
    },
    domainModel,
    metacognition: domainModel
  };
}

function researchNeedText(input = {}) {
  return [input.idea, input.domain, input.description, input.detailedNeed]
    .concat(Array.isArray(input.requirements) ? input.requirements.map((item) => (typeof item === "string" ? item : item?.text)) : [])
    .filter(Boolean)
    .join("\n");
}

function extractEnglishTerms(text = "", limit = 18) {
  const stop = new Set([
    "the",
    "and",
    "for",
    "with",
    "from",
    "that",
    "this",
    "tool",
    "tools",
    "open",
    "source",
    "github",
    "project",
    "projects",
    "repository",
    "repositories",
    "product",
    "products",
    "app",
    "apps",
    "awesome",
    "curated",
    "list",
    "lists",
    "license",
    "licenses",
    "mit",
    "apache",
    "gpl",
    "lgpl",
    "commercial",
    "opensource",
    "free",
    "best",
    "top",
    "guide",
    "tutorial",
    "example",
    "examples",
    "track",
    "tracking",
    "observe",
    "observed",
    "observer",
    "observation",
    "observations",
    "monitor",
    "monitoring",
    "starvault",
    "imprint",
    "useful",
    "around",
    "related",
    "relevant",
    "name",
    "description",
    "readme",
    "stars",
    "pushed",
    "archived",
    "mirror",
    "false",
    "true",
    "topic",
    "secondary",
    "development",
    "environment",
    "settings",
    "internal",
    "production",
    "programmer",
    "sought",
    "observe",
    "observed",
    "observer",
    "observation",
    "observations",
    "monitor",
    "monitoring",
    "starvault",
    "imprint"
  ]);
  return Array.from(
    new Set(
      String(text || "")
        .toLowerCase()
        .match(/[a-z][a-z0-9-]{2,}/g) || []
    )
  )
    .filter((term) => !stop.has(term))
    .slice(0, limit);
}

function extractChineseTerms(text = "", limit = 16) {
  const stop = new Set(["方案名称", "详细需求", "历史需求", "相关", "项目", "开源", "工具", "平台", "寻找", "关注", "观察"]);
  const normalized = String(text || "")
    .replace(/方案名称[:：]/g, "\n")
    .replace(/详细需求[:：]/g, "\n")
    .replace(/历史需求[:：]/g, "\n")
    .replace(/[，,、；;\n]/g, "|")
    .replace(/\s+/g, "|")
    .replace(/和|与|以及|及/g, "|");
  const matches = normalized.split("|");
  return uniqueStrings(
    matches
      .map((item) =>
        item
          .replace(/^(想要|希望|需要|寻找|关注|监控|发现|检索|收集|生成|观察|用于|有关|关于)/g, "")
          .replace(/(相关的?|开源项目|开源|项目|工具|平台|观察|检索|需求|领域|方向)+$/g, "")
          .replace(/[^A-Za-z0-9\u4e00-\u9fa5/+#.-]/g, "")
          .replace(/(相关的?|开源项目|开源|项目|工具|平台|观察|检索|需求|领域|方向)+$/g, "")
          .trim()
      )
      .filter((item) => Array.from(item).length >= 2 && Array.from(item).length <= 18 && !stop.has(item)),
    limit
  );
}

function uniqueStrings(values = [], limit = 80) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const clean = String(value || "")
      .replace(/\s+/g, " ")
      .trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
    if (limit && result.length >= limit) break;
  }
  return result;
}

function observationPlanWords(value = []) {
  return Array.isArray(value)
    ? value.map((item) => String(item || "").trim()).filter(Boolean)
    : String(value || "")
        .split(/[,，;\n]/)
        .map((item) => item.trim())
        .filter(Boolean);
}

const OBSERVATION_KEYWORD_STOP_WORDS = new Set([
  "api",
  "app",
  "apps",
  "application",
  "applications",
  "archived",
  "analyzer",
  "automation",
  "awesome",
  "c plus plus",
  "clean",
  "cleaner",
  "command line",
  "core",
  "description",
  "desktop",
  "extension",
  "extensions",
  "false",
  "hacktoberfest",
  "integration",
  "integrations",
  "list",
  "lists",
  "mirror",
  "name",
  "open",
  "plugin",
  "plugins",
  "pro",
  "project",
  "projects",
  "pushed",
  "readme",
  "repo",
  "repos",
  "repositories",
  "repository",
  "script",
  "scripts",
  "sdk",
  "shell",
  "source",
  "software",
  "stars",
  "template",
  "templates",
  "tool",
  "tools",
  "true",
  "workflow",
  "workflows"
]);

const SHALLOW_OBSERVATION_KEYWORD_SURFACES = [
  "app",
  "apps",
  "tool",
  "tools",
  "workflow",
  "workflows",
  "plugin",
  "plugins",
  "extension",
  "extensions",
  "automation",
  "script",
  "scripts",
  "template",
  "templates",
  "sdk",
  "api",
  "integration",
  "integrations",
  "core repositories"
];

function normalizeObservationKeyword(value = "") {
  return String(value || "")
    .replace(/^["“]|["”]$/g, "")
    .replace(/\bin:name,description,readme\b.*$/i, "")
    .replace(/\b(?:stars|pushed):[^\s]+/gi, "")
    .replace(/\b(?:archived|mirror):(?:true|false)\b/gi, "")
    .replace(/^[-+]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isShallowObservationKeywordVariant(value = "", explicitTerms = []) {
  const clean = normalizeObservationKeyword(value);
  const lower = clean.toLowerCase();
  if (!lower) return true;
  if (OBSERVATION_KEYWORD_STOP_WORDS.has(lower)) return true;
  const parts = lower.split(/\s+/).filter(Boolean);
  const originalParts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 2 && SHALLOW_OBSERVATION_KEYWORD_SURFACES.includes(parts[1])) {
    const first = originalParts[0] || "";
    const firstLower = parts[0];
    const explicitFirst = explicitTerms.some((term) => normalizeObservationKeyword(term).toLowerCase() === firstLower);
    const acronymFirst = /^[A-Z0-9.+#-]{2,}$/.test(first);
    const namedFirst = /^[A-Z][A-Za-z0-9.+#-]*[A-Z][A-Za-z0-9.+#-]*$/.test(first);
    if (!explicitFirst && !acronymFirst && !namedFirst) return true;
  }
  return explicitTerms.some((term) => {
    const cleanTerm = normalizeObservationKeyword(term).toLowerCase();
    if (!cleanTerm || lower === cleanTerm) return false;
    return SHALLOW_OBSERVATION_KEYWORD_SURFACES.some((surface) => lower === `${cleanTerm} ${surface}`);
  });
}

function isNoisyObservationKeyword(value = "") {
  const clean = normalizeObservationKeyword(value);
  const lower = clean.toLowerCase();
  if (!clean) return true;
  if (/^\d+$/.test(clean)) return true;
  if (/[\\/]/.test(clean)) return true;
  if (/^awesome(?:[-_\s]|$)|(?:[-_\s])awesome(?:[-_\s]|$)/i.test(clean)) return true;
  if (/\b(?:github|repository|repositories|repo|repos|curated list|awesome list)\b/i.test(clean)) return true;
  if (lower.split(/\s+/).every((word) => OBSERVATION_KEYWORD_STOP_WORDS.has(word))) return true;
  return false;
}

function cleanObservationKeywordList(values = [], need = "", limit = OBSERVATION_KEYWORD_LIMIT) {
  const explicitTerms = explicitNeedTerms(need).filter(isSpecificObservationTerm);
  const raw = [];
  for (const value of Array.isArray(values) ? values : [values]) {
    if (Array.isArray(value)) {
      raw.push(...value);
      continue;
    }
    raw.push(...observationPlanWords(value));
  }
  return uniqueStrings([...explicitTerms, ...raw].map(normalizeObservationKeyword), limit ? limit * 2 : 0)
    .filter((term) => {
      if (!term) return false;
      const lower = term.toLowerCase();
      if (OBSERVATION_KEYWORD_STOP_WORDS.has(lower)) return false;
      if (isNoisyObservationKeyword(term)) return false;
      if (/[:<>]|\bin:name\b|\barchived:false\b|\bmirror:false\b/i.test(term)) return false;
      if (isShallowObservationKeywordVariant(term, explicitTerms)) return false;
      return Array.from(term).length >= 2 && Array.from(term).length <= 48;
    })
    .slice(0, limit || undefined);
}

const NX_OBSERVATION_TERM_RE = /^(?:ugnx|ug\s*nx|siemens\s+nx|nx\s*open|nxopen|ugopen|unigraphics)$/i;

function pruneObservationTermsForNeed(values = [], need = "", limit = 80) {
  const allowNxTerms = isNxObservationNeed(need);
  const unique = uniqueStrings(values, limit ? limit * 2 : 0);
  const pruned = unique.filter((term) => allowNxTerms || !NX_OBSERVATION_TERM_RE.test(String(term || "").trim()));
  return limit ? pruned.slice(0, limit) : pruned;
}

const NX_CAD_OBSERVATION_PACK = {
  key: "nx-cad",
  labelZh: "Siemens NX / UGNX 自动化",
  labelEn: "Siemens NX and UGNX automation",
  aliases: ["UGNX", "UG NX", "Siemens NX", "NXOpen", "NX Open", "UGOpen", "Unigraphics"],
  definitions: ["Siemens NX 插件开发", "UGNX 插件", "NXOpen 自动化", "UGOpen 工程扩展", "Unigraphics NX"],
  formats: ["PRT", "JT", "Parasolid", "STEP", "STP", "IGES", "STL"],
  standards: ["Parasolid geometry kernel", "NXOpen API", "UGOpen API"],
  software: ["Siemens NX", "UGNX", "Unigraphics", "Teamcenter"],
  libraries: ["NXOpen", "UGOpen", "NX Journal", "MOM", "PostBuilder", "TCL"],
  workflows: [
    "NXOpen automation",
    "Siemens NX plugin",
    "UGNX extension",
    "NX journal",
    "CAM post processor",
    "CAD model export",
    "batch modeling",
    "engineering drawing automation"
  ],
  users: ["mechanical engineers", "CAM programmers", "manufacturing engineers", "CAD automation developers"],
  productSurfaces: ["plugin", "extension", "journal", "desktop tool", "automation script", "post processor", "workflow tool"],
  excludeTerms: ["awesome list", "paper list", "tutorial", "course", "benchmark", "toy example", "video player", "opengl", "networkoptix"],
  profiles: [
    ["UGNX 核心项目", "UGNX core repositories", "ugnx", 0],
    ["Siemens NX 项目", "Siemens NX repositories", "\"siemens nx\"", 0],
    ["NXOpen 项目", "NXOpen repositories", "nxopen", 0],
    ["NX Open 项目", "NX Open repositories", "\"nx open\"", 0],
    ["UGOpen 项目", "UGOpen repositories", "ugopen", 0],
    ["UGNX 插件", "UGNX plugins", "ugnx plugin", 0],
    ["Siemens NX 插件", "Siemens NX plugins", "\"siemens nx\" plugin", 0],
    ["NXOpen 自动化", "NXOpen automation", "nxopen automation", 0],
    ["NX Journal", "NX journal", "\"nx journal\"", 0],
    ["CAM 后处理", "CAM post processors", "\"siemens nx\" cam postprocessor", 0],
    ["PostBuilder", "PostBuilder", "postbuilder nx", 0],
    ["MOM/TCL", "MOM TCL", "mom tcl nx", 0]
  ],
  researchQueries: [
    "UGNX Siemens NX NXOpen UGOpen GitHub plugin automation",
    "Siemens NX NXOpen API journal plugin open source GitHub",
    "UGNX CAM post processor PostBuilder MOM TCL GitHub",
    "Siemens NX PRT JT Parasolid model export automation GitHub"
  ]
};

const CAD_OBSERVATION_PACK = {
  key: "cad",
  labelZh: "CAD 工程设计",
  labelEn: "CAD and engineering design",
  aliases: [
    "CAD",
    "computer aided design",
    "computer-aided design",
    "2D drafting",
    "3D CAD",
    "parametric CAD",
    "BIM",
    "CAM",
    "CAE",
    "mechanical design",
    "technical drawing"
  ],
  definitions: ["计算机辅助设计", "机械制图", "三维建模", "参数化建模", "工程图", "建筑信息模型", "数控制造", "仿真分析"],
  formats: ["DWG", "DXF", "STEP", "STP", "IGES", "IGS", "STL", "OBJ", "3MF", "IFC", "BREP", "SVG", "G-code", "PLY", "LAS", "LAZ"],
  standards: ["ISO 10303 STEP", "Industry Foundation Classes", "OpenCASCADE B-Rep", "NURBS", "geometric constraint solving"],
  software: [
    "AutoCAD",
    "FreeCAD",
    "LibreCAD",
    "QCAD",
    "OpenSCAD",
    "BRL-CAD",
    "SolveSpace",
    "CadQuery",
    "OpenCascade",
    "IfcOpenShell",
    "BlenderBIM",
    "JSCAD",
    "KiCad"
  ],
  libraries: ["OpenCascade", "OCCT", "IfcOpenShell", "CadQuery", "pythonOCC", "Maker.js", "JSCAD", "three.js", "xBIM", "verb-nurbs", "CGAL"],
  workflows: [
    "CAD viewer",
    "CAD editor",
    "CAD converter",
    "2D drafting",
    "3D modeling",
    "parametric modeling",
    "technical drawing",
    "BIM coordination",
    "CAM CNC toolpath",
    "CAE simulation",
    "model repair",
    "mesh processing",
    "point cloud measurement",
    "web CAD collaboration",
    "CAD version control"
  ],
  users: ["mechanical engineers", "architects", "BIM teams", "makers", "CNC operators", "industrial designers", "civil engineers", "hardware teams"],
  productSurfaces: ["viewer", "editor", "converter", "plugin", "extension", "workbench", "desktop app", "web app", "API server", "collaboration tool", "workflow tool"],
  excludeTerms: ["awesome list", "paper list", "tutorial", "course", "benchmark", "toy example", "only paper", "dataset"],
  profiles: [
    ["CAD 查看器", "CAD viewers", "cad viewer", 15],
    ["CAD 编辑器", "CAD editors", "cad editor", 15],
    ["2D 制图", "2D drafting", "2d drafting cad", 15],
    ["3D CAD 建模", "3D CAD modeling", "3d cad modeling", 15],
    ["参数化建模", "Parametric modeling", "parametric modeling cad", 15],
    ["工程图工具", "Technical drawing", "technical drawing cad", 15],
    ["DWG 查看编辑", "DWG viewer editor", "dwg viewer editor", 15],
    ["DWG 转换", "DWG converters", "dwg converter cad", 15],
    ["DXF 查看编辑", "DXF viewer editor", "dxf viewer editor", 15],
    ["DXF 解析库", "DXF parser libraries", "dxf parser library", 15],
    ["STEP 查看转换", "STEP viewer converter", "step file viewer converter", 15],
    ["IGES 查看转换", "IGES viewer converter", "iges file viewer converter", 15],
    ["STL 网格工具", "STL mesh tools", "stl viewer mesh repair", 15],
    ["OBJ/3MF 工具", "OBJ 3MF tools", "obj 3mf viewer converter", 15],
    ["IFC/BIM 查看器", "IFC BIM viewers", "ifc bim viewer", 15],
    ["BIM 协同", "BIM coordination", "bim coordination viewer", 15],
    ["几何内核", "Geometry kernels", "geometry kernel cad", 20],
    ["约束求解", "Constraint solvers", "geometric constraint solver cad", 15],
    ["NURBS/B-Rep", "NURBS B-Rep modeling", "nurbs brep cad", 15],
    ["OpenCascade 项目", "OpenCascade projects", "opencascade cad", 15],
    ["CadQuery 项目", "CadQuery projects", "cadquery cad", 10],
    ["FreeCAD 扩展", "FreeCAD extensions", "freecad addon workbench", 10],
    ["LibreCAD/QCAD", "LibreCAD QCAD", "librecad qcad dxf", 10],
    ["OpenSCAD/JSCAD", "OpenSCAD JSCAD", "openscad jscad tool", 10],
    ["BRL-CAD 相关", "BRL-CAD related", "brlcad cad", 10],
    ["Web CAD", "Web CAD", "web cad viewer", 15],
    ["Three.js CAD", "Three.js CAD", "three.js cad viewer", 15],
    ["CAD 协作平台", "CAD collaboration", "cad collaboration platform", 15],
    ["CAD 版本管理", "CAD version control", "cad version control", 15],
    ["CAD API 服务", "CAD API servers", "cad api server", 15],
    ["插件与工作台", "CAD plugins workbenches", "cad plugin workbench", 15],
    ["CAM/CNC", "CAM CNC tools", "cam cnc toolpath", 15],
    ["CAE/仿真", "CAE simulation", "cae simulation cad", 15],
    ["切片与制造", "Slicing manufacturing", "stl slicer manufacturing", 15],
    ["模型修复", "Model repair", "mesh repair cad", 15],
    ["点云测量", "Point cloud metrology", "point cloud metrology cad", 15],
    ["G-code 工具", "G-code tools", "g-code cnc cad", 15],
    ["KiCad/ECAD", "KiCad ECAD tools", "kicad ecad plugin", 15]
  ],
  researchQueries: [
    "CAD file formats DWG DXF STEP STL IGES IFC open source tools",
    "CAD software FreeCAD LibreCAD OpenSCAD BRL-CAD OpenCascade CadQuery open source",
    "CAD workflows viewer editor converter parametric modeling BIM CAM CAE",
    "web CAD viewer editor open source GitHub",
    "OpenCascade IfcOpenShell CadQuery geometry kernel GitHub"
  ]
};

const OBSERVATION_DOMAIN_PACKS = [
  NX_CAD_OBSERVATION_PACK,
  CAD_OBSERVATION_PACK,
  {
    key: "business-crm",
    labelZh: "CRM 与业务管理系统",
    labelEn: "CRM and business operations systems",
    aliases: [
      "crm",
      "CRM",
      "customer relationship management",
      "sales crm",
      "sales pipeline",
      "lead management",
      "contact management",
      "customer support",
      "helpdesk",
      "ticketing",
      "erp",
      "ERP",
      "business management",
      "admin dashboard",
      "backoffice",
      "SaaS CRM",
      "客户关系管理",
      "客户管理",
      "销售管理",
      "销售线索",
      "商机管理",
      "工单",
      "客服系统",
      "业务后台",
      "进销存"
    ],
    definitions: ["客户关系管理", "销售线索管理", "商机管道", "客户支持", "工单系统", "业务后台", "SaaS 管理系统", "开源 CRM"],
    formats: ["CSV", "vCard", "iCal", "webhook", "REST API"],
    standards: ["OAuth", "SAML", "SCIM", "OpenAPI"],
    software: ["CRM", "ERP", "Helpdesk", "Sales pipeline", "Contact management"],
    libraries: ["admin dashboard", "workflow engine", "form builder", "notification service"],
    workflows: [
      "crm dashboard",
      "crm system",
      "crm platform",
      "crm app",
      "crm self hosted",
      "open source crm",
      "customer relationship management",
      "sales pipeline",
      "lead management",
      "contact management",
      "deal tracking",
      "customer portal",
      "helpdesk ticketing",
      "support dashboard",
      "marketing automation",
      "business workflow",
      "admin dashboard crm",
      "saas crm starter"
    ],
    users: ["sales teams", "customer success teams", "support teams", "business operators", "SMB teams"],
    productSurfaces: ["dashboard", "web app", "self-hosted app", "workflow", "template", "portal", "ticketing system", "admin panel"],
    excludeTerms: ["awesome list", "paper list", "tutorial", "course", "benchmark", "toy example", "dataset", "demo"],
    profiles: [
      ["CRM 核心项目", "CRM core repositories", "crm", 0],
      ["开源 CRM", "Open source CRM", "open source crm", 0],
      ["自托管 CRM", "Self-hosted CRM", "self hosted crm", 0],
      ["CRM 系统", "CRM systems", "crm system", 0],
      ["CRM 平台", "CRM platforms", "crm platform", 0],
      ["CRM 仪表盘", "CRM dashboards", "crm dashboard", 0],
      ["CRM Web 应用", "CRM web apps", "crm web app", 0],
      ["销售管道", "Sales pipeline", "sales pipeline crm", 0],
      ["销售线索管理", "Lead management", "lead management crm", 0],
      ["联系人管理", "Contact management", "contact management crm", 0],
      ["商机跟进", "Deal tracking", "deal tracking crm", 0],
      ["客户门户", "Customer portals", "customer portal crm", 0],
      ["客服工单", "Helpdesk ticketing", "helpdesk ticketing", 0],
      ["客服后台", "Support dashboards", "support dashboard", 0],
      ["营销自动化", "Marketing automation", "marketing automation crm", 0],
      ["业务工作流", "Business workflows", "business workflow crm", 0],
      ["SaaS CRM 模板", "SaaS CRM starters", "saas crm starter", 0],
      ["CRM 管理后台", "CRM admin panels", "admin dashboard crm", 0]
    ],
    researchQueries: [
      "CRM customer relationship management open source GitHub sales pipeline helpdesk",
      "open source CRM self hosted sales pipeline contact management GitHub",
      "CRM SaaS starter admin dashboard customer portal helpdesk GitHub"
    ]
  },
  {
    key: "ai-hardware",
    labelZh: "AI 硬件与推理加速",
    labelEn: "AI hardware and inference acceleration",
    aliases: [
      "AI 硬件",
      "人工智能硬件",
      "AI 芯片",
      "AI 加速器",
      "AI accelerator",
      "ML accelerator",
      "AI hardware",
      "AI chip",
      "NPU",
      "TPU",
      "Edge TPU",
      "Coral TPU",
      "GPU delegate",
      "FPGA",
      "ASIC",
      "CUDA",
      "cuDNN",
      "ROCm",
      "OpenCL",
      "TensorRT",
      "OpenVINO",
      "Apache TVM",
      "Vitis AI",
      "TinyML",
      "Edge AI",
      "Jetson",
      "neuromorphic"
    ],
    definitions: ["边缘 AI 推理", "AI 加速器", "神经网络推理后端", "深度学习编译器", "异构计算", "量化推理", "端侧模型部署"],
    formats: ["ONNX", "TFLite", "INT8", "FP16", "CUDA kernel", "OpenCL kernel"],
    standards: ["ONNX Runtime Execution Provider", "TensorFlow Lite Delegate", "OpenCL", "SYCL", "oneAPI", "MLIR"],
    software: ["CUDA", "ROCm", "TensorRT", "OpenVINO", "Apache TVM", "ONNX Runtime", "TFLite", "CoreML", "Vitis AI", "Jetson", "RKNN", "SNPE", "NCNN", "MNN", "XNNPACK"],
    libraries: ["ONNX Runtime", "Apache TVM", "XNNPACK", "NCNN", "MNN", "TFLite Micro", "RKNN Toolkit", "SNPE", "TensorRT-LLM"],
    workflows: [
      "CUDA deep learning",
      "ROCm machine learning",
      "TensorRT inference",
      "OpenVINO inference",
      "TVM compiler",
      "ONNX Runtime accelerator",
      "TFLite delegate",
      "CoreML Neural Engine",
      "Edge TPU inference",
      "Jetson inference",
      "NPU SDK",
      "FPGA Vitis AI",
      "TinyML microcontroller",
      "int8 quantized inference",
      "GPU delegate",
      "hardware backend"
    ],
    users: ["edge AI developers", "embedded engineers", "ML systems engineers", "robotics teams", "AI infrastructure engineers"],
    productSurfaces: ["runtime", "compiler", "SDK", "driver", "benchmark tool", "deployment tool", "inference server", "edge device workflow", "hardware backend"],
    excludeTerms: ["awesome list", "paper list", "tutorial", "course", "benchmark only", "toy example", "do not use", "profile readme"],
    profiles: [
      ["CUDA 深度学习", "CUDA deep learning", "cuda deep learning", 0],
      ["ROCm 机器学习", "ROCm machine learning", "rocm machine learning", 0],
      ["TensorRT 推理", "TensorRT inference", "tensorrt inference", 0],
      ["OpenVINO 推理", "OpenVINO inference", "openvino inference", 0],
      ["TVM 编译器", "TVM compiler", "apache tvm compiler", 0],
      ["ONNX Runtime 加速", "ONNX Runtime acceleration", "onnxruntime accelerator", 0],
      ["TFLite Delegate", "TFLite delegate", "tflite delegate", 0],
      ["CoreML Neural Engine", "CoreML Neural Engine", "coreml neural engine", 0],
      ["Edge TPU", "Edge TPU inference", "edge tpu inference", 0],
      ["Jetson 推理", "Jetson inference", "jetson inference", 0],
      ["NPU SDK", "NPU SDK", "npu sdk", 0],
      ["FPGA Vitis AI", "FPGA Vitis AI", "fpga vitis ai", 0],
      ["TinyML", "TinyML microcontroller", "tinyml microcontroller", 0],
      ["INT8 推理", "INT8 quantized inference", "int8 inference", 0],
      ["GPU Delegate", "GPU delegate", "gpu delegate", 0]
    ],
    researchQueries: [
      "AI hardware accelerator CUDA ROCm TensorRT OpenVINO TVM ONNX Runtime GitHub",
      "edge AI inference NPU TPU Edge TPU Jetson TFLite delegate GitHub",
      "FPGA Vitis AI TinyML microcontroller neural network inference GitHub",
      "AI accelerator SDK hardware backend open source GitHub"
    ]
  },
  {
    key: "media",
    labelZh: "音视频与内容创作",
    labelEn: "media and creator tools",
    aliases: [
      "video",
      "video editor",
      "video editing",
      "video editing software",
      "nle",
      "timeline editor",
      "audio",
      "music",
      "podcast",
      "subtitle",
      "creator",
      "media",
      "streaming",
      "CapCut",
      "capcut",
      "Jianying",
      "JianYing",
      "剪映",
      "视频剪辑",
      "视频剪辑软件",
      "剪辑软件",
      "视频编辑器",
      "非线性编辑"
    ],
    definitions: ["视频编辑", "视频剪辑", "剪映/CapCut 剪辑生态", "非线性编辑", "时间线剪辑", "音频编辑", "音乐制作", "字幕", "配音", "录屏", "内容创作", "素材管理"],
    formats: ["MP4", "MOV", "WebM", "MP3", "WAV", "FLAC", "SRT", "VTT", "ASS", "MIDI"],
    software: ["CapCut", "Jianying", "剪映", "FFmpeg", "Whisper", "OBS", "Audacity", "Blender", "Kdenlive", "Shotcut", "OpenShot", "Olive", "Remotion", "GStreamer", "MLT"],
    workflows: [
      "CapCut template",
      "CapCut automation",
      "CapCut subtitle workflow",
      "Jianying template",
      "剪映 模板",
      "剪映 字幕",
      "video editor",
      "video timeline editor",
      "nonlinear video editor",
      "ffmpeg video workflow",
      "audio editor",
      "subtitle editor",
      "dubbing",
      "screen recorder",
      "podcast workflow",
      "asset manager",
      "publishing workflow"
    ],
    users: ["creators", "podcasters", "video editors", "marketers", "educators"],
    productSurfaces: ["studio", "editor", "recorder", "converter", "plugin", "workflow", "desktop app", "web app"],
    excludeTerms: ["movie list", "music list", "paper", "dataset", "tutorial"],
    profiles: [
      ["剪映/CapCut 核心项目", "CapCut Jianying projects", "capcut jianying", 0],
      ["剪映模板", "CapCut templates", "capcut template", 0],
      ["剪映自动化", "CapCut automation", "capcut automation", 0],
      ["剪映字幕工作流", "CapCut subtitle workflows", "capcut subtitle workflow", 0],
      ["视频剪辑软件", "Video editing software", "video editing software", 15],
      ["视频编辑器", "Video editors", "video editor", 15],
      ["时间线剪辑", "Timeline editors", "timeline video editor", 15],
      ["非线性编辑", "Nonlinear editors", "nonlinear video editor", 15],
      ["FFmpeg 剪辑工作流", "FFmpeg editing workflows", "ffmpeg video editor", 15],
      ["Kdenlive/Shotcut", "Kdenlive Shotcut", "kdenlive shotcut", 10],
      ["OpenShot/Olive", "OpenShot Olive", "openshot olive video editor", 10],
      ["Remotion 视频工具", "Remotion video tools", "remotion video", 10],
      ["字幕工具", "Subtitle tools", "subtitle editor", 15],
      ["配音工具", "Dubbing tools", "dubbing voice tool", 15],
      ["录屏演示", "Screen demos", "screen recorder demo", 15],
      ["音频编辑器", "Audio editors", "audio editor", 15],
      ["播客工具", "Podcast tools", "podcast workflow tool", 15],
      ["素材管理", "Media asset managers", "media asset manager", 15],
      ["FFmpeg 工作流", "FFmpeg workflows", "ffmpeg workflow app", 15],
      ["音乐制作", "Music production", "music production tool", 15],
      ["发布工作流", "Publishing workflows", "publishing workflow", 15]
    ],
    researchQueries: [
      "open source video editing software timeline editor FFmpeg MLT GitHub",
      "Kdenlive Shotcut OpenShot Olive Remotion video editor GitHub",
      "creator tools video audio subtitle podcast open source GitHub",
      "FFmpeg Whisper OBS creator workflow open source tools"
    ]
  },
  {
    key: "design",
    labelZh: "设计与可视化工具",
    labelEn: "design and visual tools",
    aliases: ["design", "image editing", "photo editing", "photoshop", "adobe photoshop", "figma", "canvas", "whiteboard", "diagram", "prototype", "ui builder"],
    definitions: ["设计工具", "图像编辑", "照片编辑", "修图", "画布编辑", "白板", "图表", "原型", "视觉素材", "演示文稿"],
    formats: ["PSD", "PSB", "SVG", "PNG", "PDF", "HTML", "CSS", "Figma", "Excalidraw"],
    software: ["Photoshop", "Adobe Photoshop", "Figma", "Excalidraw", "tldraw", "Penpot", "Framer", "Mermaid"],
    workflows: [
      "Photoshop plugin",
      "Photoshop extension",
      "Photoshop script",
      "Photoshop action",
      "Photoshop brush",
      "Photoshop preset",
      "PSD workflow",
      "UXP plugin",
      "CEP extension",
      "image editor",
      "canvas editor",
      "whiteboard",
      "diagram editor",
      "prototype tool",
      "ui builder",
      "presentation generator",
      "visual asset generator"
    ],
    users: ["designers", "product managers", "developers", "teachers", "teams"],
    productSurfaces: ["editor", "builder", "plugin", "extension", "script", "template", "preset", "web app", "collaboration tool"],
    excludeTerms: ["dribbble", "showcase", "gallery only", "tutorial"],
    profiles: [
      ["设计工具", "Design tools", "design tool", 20],
      ["画布编辑器", "Canvas editors", "canvas editor", 20],
      ["白板工具", "Whiteboard tools", "whiteboard app", 20],
      ["图表工具", "Diagram tools", "diagram editor", 20],
      ["原型工具", "Prototyping tools", "prototyping tool", 20],
      ["UI 构建器", "UI builders", "ui builder", 20],
      ["演示工具", "Presentation tools", "presentation generator", 20],
      ["视觉素材", "Visual assets", "visual asset generator", 20]
    ],
    researchQueries: ["design canvas whiteboard diagram prototype open source GitHub", "Figma Penpot Excalidraw tldraw open source alternatives"]
  }
];

const OBSERVATION_CUSTOM_QUERY_LIMIT = 30;
const OBSERVATION_KEYWORD_LIMIT = 48;
const OBSERVATION_EXCLUDE_LIMIT = 36;
function detectedObservationPacks(text = "") {
  const clean = String(text || "").toLowerCase();
  return OBSERVATION_DOMAIN_PACKS.filter((pack) => {
    const aliases = [pack.key, ...(pack.aliases || []), ...(pack.definitions || [])];
    return aliases.some((alias) => clean.includes(String(alias || "").toLowerCase()));
  });
}

function extractSignalTerms(text = "") {
  const upperTerms = String(text || "").match(/\b[A-Z][A-Z0-9.+#-]{1,12}\b/g) || [];
  const extensionTerms = String(text || "").match(/\b(?:[A-Za-z0-9-]+\.)?(?:[A-Z0-9]{2,6})\b/g) || [];
  const quotedTerms = String(text || "").match(/["“][^"”]{2,40}["”]/g) || [];
  const noisy = new Set(["GitHub", "Open", "Source", "Repository", "Repositories", "Project", "Projects"]);
  return uniqueStrings([...upperTerms, ...extensionTerms, ...quotedTerms.map((item) => item.replace(/^["“]|["”]$/g, ""))], 60)
    .filter((term) => !noisy.has(term))
    .filter((term) => !/[\\/]/.test(term))
    .filter((term) => !/^awesome[-_\s]/i.test(term))
    .slice(0, 40);
}

const GENERIC_CHINESE_EXPLICIT_TERMS = new Set(["视频", "音频", "剪辑", "软件", "工具", "平台", "视频剪辑", "视频剪辑软件", "剪辑软件", "视频编辑器", "音视频", "内容创作"]);

function namedMediaNeedTerms(text = "") {
  return /剪映|cap\s*cut|capcut|jian\s*ying|jianying/i.test(String(text || "")) ? ["剪映", "CapCut", "Jianying", "JianYing"] : [];
}

function explicitPlanNameFromNeed(need = "") {
  const match = String(need || "").match(/方案名称[:：]\s*([^\n\r]+)/);
  return String(match?.[1] || "")
    .replace(/\s+/g, " ")
    .trim();
}

function isLikelyChineseNamedProductTerm(term = "", need = "") {
  const clean = String(term || "").trim();
  if (!/[\u4e00-\u9fa5]/.test(clean)) return false;
  if (GENERIC_CHINESE_EXPLICIT_TERMS.has(clean)) return false;
  if (/(软件|工具|平台|系统|服务|项目|领域|方向|方案|应用|插件|模板|工作流|设计|开发|管理|分析|生成|编辑|剪辑)$/.test(clean)) return false;
  const size = Array.from(clean).length;
  if (size < 2 || size > 8) return false;
  const planName = explicitPlanNameFromNeed(need);
  if (planName && planName === clean) return true;
  return new RegExp(`${escapeRegExp(clean)}\\s*(相关|生态|插件|开发|项目|工具|方案)?`).test(String(need || ""));
}

function explicitNeedTerms(need = "") {
  const text = String(need || "");
  const generic = new Set([
    "api",
    "app",
    "apps",
    "ai",
    "bim",
    "cad",
    "cae",
    "cam",
    "dashboard",
    "github",
    "llm",
    "open",
    "opensource",
    "plugin",
    "plugins",
    "project",
    "projects",
    "rag",
    "repository",
    "repositories",
    "sdk",
    "source",
    "tool",
    "tools",
    "workflow",
    "track",
    "tracking",
    "useful",
    "around",
    "related",
    "relevant",
    "name",
    "description",
    "readme",
    "stars",
    "pushed",
    "archived",
    "mirror",
    "false",
    "true",
    "secondary",
    "development",
    "environment",
    "settings",
    "internal",
    "production",
    "programmer",
    "sought"
  ]);
  const rawTerms = uniqueStrings(
    [
      ...extractSignalTerms(text),
      ...namedMediaNeedTerms(text),
      ...extractChineseTerms(text, 8),
      ...(text.match(/\b[A-Za-z][A-Za-z0-9.+#-]{2,30}\b/g) || []),
      ...(/(?:\bugnx\b|ug\s*nx|siemens\s+nx|nx\s*open|nxopen|ugopen|unigraphics)/i.test(text)
        ? ["UGNX", "Siemens NX", "NXOpen", "NX Open", "UGOpen", "Unigraphics", "UG NX"]
        : [])
    ],
    20
  );
  return rawTerms
    .map((term) => term.replace(/^["“]|["”]$/g, "").trim())
    .filter((term) => {
      const lower = term.toLowerCase();
      return Array.from(term).length >= 2 && !generic.has(lower) && !GENERIC_CHINESE_EXPLICIT_TERMS.has(term) && !/^\d+$/.test(lower);
    })
    .slice(0, 8);
}

function observationProfileText(item = {}) {
  if (Array.isArray(item)) return [item[0], item[1], item[2]].filter(Boolean).join(" ");
  return [item.label, item.labelZh, item.labelEn, item.query, item.q].filter(Boolean).join(" ");
}

function compactObservationProfiles(items = [], _domainModel = {}, limit = OBSERVATION_CUSTOM_QUERY_LIMIT) {
  const seen = new Set();
  const unique = [];
  (items || []).forEach((item) => {
    const query = Array.isArray(item) ? item[2] : item?.query || item?.q || "";
    const key = String(query || observationProfileText(item)).replace(/\s+/g, " ").trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    unique.push(item);
  });
  return unique.slice(0, Math.max(1, Number(limit || OBSERVATION_CUSTOM_QUERY_LIMIT)));
}

function observationProfileFloor(domainModel = {}, keywordCount = 0) {
  const activity = domainModel.githubActivity || {};
  const maxTotalCount = Number(activity.maxTotalCount || domainModel.githubActivityMaxTotalCount || 0);
  const activityLevel = activity.activityLevel || domainModel.activityLevel || "unknown";
  const richness = [
    domainModel.aliases,
    domainModel.definitions,
    domainModel.formats,
    domainModel.standards,
    domainModel.software,
    domainModel.libraries,
    domainModel.workflows,
    domainModel.productSurfaces,
    domainModel.sampleTerms
  ].reduce((total, value) => total + (Array.isArray(value) ? value.filter(Boolean).length : 0), 0);
  if (activityLevel === "high" || maxTotalCount >= 5000 || richness >= 36 || keywordCount >= 24) return 12;
  if (activityLevel === "medium" || maxTotalCount >= 500 || richness >= 22 || keywordCount >= 16) return 10;
  if (activityLevel === "low" || maxTotalCount >= 50 || richness >= 12 || keywordCount >= 10) return 8;
  return 6;
}

function isUsefulObservationBackfillTerm(term = "", need = "", domainModel = {}) {
  const clean = normalizeObservationKeyword(term);
  const lower = clean.toLowerCase();
  if (!clean || isNoisyObservationKeyword(clean)) return false;
  if (/^(?:重点关注|详细需求|方案名称|历史需求)/.test(clean)) return false;
  if (/^(?:工程设计|文件格式|建模|查看转换|插件|自动化|业务流程|产品形态|开源生态)$/i.test(clean)) return false;
  if (OBSERVATION_KEYWORD_STOP_WORDS.has(lower)) return false;
  if (isUnrequestedObservationSurface({ label: clean, query: clean }, need)) return false;
  if (isWeakGenericCadQuery({ query: clean }, domainModel)) return false;
  return Array.from(clean).length >= 2 && Array.from(clean).length <= 48;
}

function observationKeywordBackfillProfiles(options = {}) {
  const {
    existing = [],
    terms = [],
    need = "",
    domainModel = {},
    floor = 0,
    minStars = 0
  } = options;
  if (!floor || existing.length >= floor) return [];
  const seen = new Set(existing.map((item) => observationQueryCore(item)).filter(Boolean));
  const profiles = [];
  for (const term of terms) {
    if (existing.length + profiles.length >= floor) break;
    const clean = normalizeObservationKeyword(term);
    if (!isUsefulObservationBackfillTerm(clean, need, domainModel)) continue;
    const query = completeObservationQuery(quoteObservationSearchTerm(clean), minStars, {
      need,
      includeAntiNoise: false
    });
    const item = {
      label: clean,
      labelZh: clean,
      labelEn: clean,
      query,
      stars: minStars
    };
    const core = observationQueryCore(item);
    if (!core || seen.has(core)) continue;
    if (
      isObservationPlatformNoise(item, need) ||
      isMechanicalObservationExpansion(item, need) ||
      isOverSpecificAcronymProjectQuery(item, need) ||
      isUnrequestedObservationSurface(item, need) ||
      isWeakGenericCadQuery(item, domainModel) ||
      !queryMatchesDomain(item, domainModel, need)
    ) {
      continue;
    }
    seen.add(core);
    profiles.push(item);
  }
  return profiles;
}

function executableObservationCustomQueries(plan = {}, searchLogic = {}) {
  const customQueries = Array.isArray(searchLogic.customQueries) ? searchLogic.customQueries : [];
  if (!customQueries.length) return [];
  const executableProfiles = buildQueryProfiles({
    ...plan,
    strategy: searchLogic,
    searchLogic
  });
  if (executableProfiles.length >= customQueries.length) return customQueries;
  const normalizeKey = (value = "") =>
    String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  const executableLabels = new Set(executableProfiles.map((profile) => normalizeKey(profile.labelZh || profile.labelEn || profile.label)));
  const executableCores = new Set(executableProfiles.map((profile) => observationQueryCore({ query: profile.q })).filter(Boolean));
  return customQueries.filter((item) => {
    const label = normalizeKey(item.labelZh || item.labelEn || item.label);
    const core = observationQueryCore(item);
    return (label && executableLabels.has(label)) || (core && executableCores.has(core));
  });
}

function buildObservationDomainModel(need = "", researchContext = {}) {
  const signals = compactResearchSignals(researchContext.signals || []);
  const researchText = signals.map((item) => `${item.title} ${item.content}`).join(" ");
  const text = `${need}\n${researchText}`;
  const needPacks = detectedObservationPacks(need);
  const hasSpecificNeedAnchor = explicitNeedTerms(need).some(isSpecificObservationTerm);
  const packs = needPacks.length ? needPacks : hasSpecificNeedAnchor ? [] : detectedObservationPacks(text);
  const primary = packs[0] || null;
  const useResearchWordTerms = Boolean(primary) || !hasSpecificNeedAnchor;
  const needEnglishTerms = extractEnglishTerms(need, 24);
  const needChineseTerms = extractChineseTerms(need, 24);
  const englishTerms = extractEnglishTerms(text, 60);
  const chineseTerms = extractChineseTerms(text, 24);
  const signalTerms = extractSignalTerms(text);
  const trustedSignalTerms = useResearchWordTerms ? signalTerms : [];
  const githubSampleTerms = cleanObservationKeywordList(researchContext.githubSamples?.keywords || [], need, 24);
  const githubActivity = researchContext.githubActivity || {};
  const model = {
    key: primary?.key || "custom",
    labelZh: primary?.labelZh || "自定义领域",
    labelEn: primary?.labelEn || "custom domain",
    githubActivity: {
      activityLevel: githubActivity.activityLevel || "unknown",
      maxTotalCount: Number(githubActivity.maxTotalCount || 0)
    },
    activityLevel: githubActivity.activityLevel || "unknown",
    githubActivityMaxTotalCount: Number(githubActivity.maxTotalCount || 0),
    aliases: pruneObservationTermsForNeed(
      [
        ...(primary?.aliases || []),
        ...(useResearchWordTerms ? chineseTerms.slice(0, 12) : needChineseTerms.slice(0, 12)),
        ...(useResearchWordTerms ? englishTerms.slice(0, 12) : needEnglishTerms.slice(0, 12)),
        ...trustedSignalTerms.filter((term) => /[A-Z]/.test(term)).slice(0, 12),
        ...githubSampleTerms
      ],
      need,
      40
    ),
    definitions: pruneObservationTermsForNeed([...(primary?.definitions || []), ...(useResearchWordTerms ? chineseTerms : needChineseTerms).slice(0, 8)], need, 40),
    formats: pruneObservationTermsForNeed([...(primary?.formats || []), ...trustedSignalTerms.filter((term) => /^[A-Z0-9.+#-]{2,8}$/.test(term))], need, 60),
    standards: uniqueStrings(primary?.standards || [], 40),
    software: pruneObservationTermsForNeed(
      [...(primary?.software || []), ...trustedSignalTerms.filter((term) => /[A-Z]/.test(term) && !/^[A-Z0-9.+#-]{2,8}$/.test(term))],
      need,
      60
    ),
    libraries: pruneObservationTermsForNeed(primary?.libraries || [], need, 50),
    workflows: pruneObservationTermsForNeed(primary?.workflows || [], need, 60),
    sampleTerms: githubSampleTerms,
    users: uniqueStrings(primary?.users || [], 40),
    productSurfaces: uniqueStrings(primary?.productSurfaces || ["app", "tool", "dashboard", "editor", "viewer", "plugin", "extension", "template", "workflow", "self-hosted"], 40),
    excludeTerms: uniqueStrings([...(primary?.excludeTerms || []), "awesome list", "paper list", "course", "tutorial", "benchmark", "toy example"], 40),
    researchSignals: signals.length,
    researchQueries: researchContext.queries || [],
    profiles: primary?.profiles || []
  };

  if (model.key === "custom") {
    const domainSeeds = uniqueStrings(
      [
        ...needChineseTerms,
        ...needEnglishTerms,
        ...(useResearchWordTerms ? chineseTerms : []),
        ...(useResearchWordTerms ? englishTerms : []),
        ...trustedSignalTerms.filter((term) => /[A-Z]/.test(term))
      ],
      16
    );
    model.workflows = uniqueStrings(
      [
        ...domainSeeds.map((term) => `${term} app`),
        ...domainSeeds.map((term) => `${term} tool`),
        ...domainSeeds.slice(0, 8).map((term) => `${term} workflow`)
      ],
      40
    );
    model.profiles = domainSeeds.flatMap((term) => [
      [`${term} 工具`, `${term} tools`, `${term} tool`, 15],
      [`${term} 应用`, `${term} apps`, `${term} app`, 15]
    ]);
  }

  return model;
}

function domainVocabulary(domainModel = {}, need = "") {
  const values = [
    need,
    domainModel.labelZh,
    domainModel.labelEn,
    ...(domainModel.aliases || []),
    ...(domainModel.definitions || []),
    ...(domainModel.formats || []),
    ...(domainModel.standards || []),
    ...(domainModel.software || []),
    ...(domainModel.libraries || []),
    ...(domainModel.workflows || []),
    ...(domainModel.sampleTerms || [])
  ];
  const phraseTerms = uniqueStrings(values, 160).filter((term) => Array.from(term).length >= 3);
  const wordTerms = extractEnglishTerms(values.join(" "), 80).filter((term) => !["viewer", "editor", "tool", "tools", "plugin", "app", "workflow", "dashboard"].includes(term));
  return uniqueStrings([...phraseTerms, ...wordTerms], 180).map((term) => term.toLowerCase());
}

function aiProfileKeywordCandidates(profiles = [], need = "", limit = 80) {
  const explicitTerms = explicitNeedTerms(need).filter(isSpecificObservationTerm);
  const candidates = [];
  const push = (value) => {
    const clean = normalizeObservationKeyword(value);
    if (clean) candidates.push(clean);
  };
  for (const profile of profiles || []) {
    const core = observationQueryCore(profile);
    const quoted = Array.from(String(core || "").matchAll(/"([^"]{2,60})"/g)).map((match) => match[1]);
    quoted.forEach(push);
    const normalized = String(core || "")
      .replace(/"([^"]+)"/g, "$1")
      .replace(/[()]/g, "|")
      .replace(/\b(?:OR|AND)\b/gi, "|")
      .split("|")
      .map((part) => {
        let clean = part.replace(/\s+/g, " ").trim();
        explicitTerms.forEach((term) => {
          clean = clean.replace(new RegExp(`(^|[^a-z0-9])${escapeRegExp(term)}($|[^a-z0-9])`, "gi"), " ");
        });
        return clean.replace(/\s+/g, " ").trim();
      })
      .filter(Boolean);
    normalized.forEach(push);
  }
  return cleanObservationKeywordList(candidates, need, limit);
}

function queryMatchesDomain(item = {}, domainModel = {}, need = "") {
  const vocab = domainVocabulary(domainModel, need);
  if (!vocab.length) return true;
  const text = `${item.label || ""} ${item.labelZh || ""} ${item.labelEn || ""} ${item.query || item.q || ""}`.toLowerCase();
  return vocab.some((term) => text.includes(term));
}

function observationNeedHasPack(need = "", keys = []) {
  const wanted = new Set(Array.isArray(keys) ? keys : [keys]);
  return detectedObservationPacks(need).some((pack) => wanted.has(pack.key));
}

function isMediaObservationNeed(need = "") {
  return (
    observationNeedHasPack(need, "media") ||
    /剪映|cap\s*cut|capcut|jian\s*ying|jianying|视频剪辑|视频编辑|非线性编辑|\b(?:video editing|video editor|timeline editor|subtitle|audio editor|podcast)\b/i.test(
      String(need || "")
    )
  );
}

function isDesignObservationNeed(need = "") {
  return (
    observationNeedHasPack(need, "design") ||
    /photoshop|adobe\s+photoshop|\bpsd\b|\bpsb\b|\bfigma\b|\buxp\b|\bcep\b|图像编辑|照片编辑|修图|白板|原型|设计工具/i.test(
      String(need || "")
    )
  );
}

function isCadObservationNeedText(need = "") {
  return (
    isNxObservationNeed(need) ||
    observationNeedHasPack(need, ["cad", "nx-cad"]) ||
    /\b(?:cad|dwg|dxf|step|stp|iges|igs|stl|ifc|freecad|opencascade|cadquery|librecad|qcad|openscad|brl-cad|brlcad|bim|cam|cae)\b|计算机辅助设计|机械制图|参数化建模|三维建模|工程图/i.test(
      String(need || "")
    )
  );
}

function isUnrequestedObservationSurface(item = {}, need = "") {
  const text = observationProfileText(item).toLowerCase();
  if (!isMediaObservationNeed(need)) {
    if (
      /\b(?:capcut|jianying|video editor|video editing|timeline editor|nonlinear video|nle|subtitle|audio editor|podcast|ffmpeg|kdenlive|shotcut|openshot|remotion|gstreamer|mlt|mp4|mov|srt|vtt)\b|剪映|视频剪辑|视频编辑|字幕|非线性编辑/.test(
        text
      )
    ) {
      return true;
    }
  }
  if (!isDesignObservationNeed(need)) {
    if (
      /\b(?:photoshop|figma|psd|psb|uxp|cep|whiteboard|diagram|prototype|canvas editor|image editor|photo editing)\b|图像编辑|照片编辑|修图|白板|原型/.test(
        text
      )
    ) {
      return true;
    }
  }
  if (!isCadObservationNeedText(need)) {
    if (
      /\b(?:cad|dwg|dxf|step|stp|iges|igs|stl|ifc|freecad|opencascade|cadquery|librecad|qcad|openscad|brl-cad|brlcad|bim|cam|cae|nurbs|brep|g-code|cnc)\b|计算机辅助设计|机械制图|参数化建模|三维建模|工程图/.test(
        text
      )
    ) {
      return true;
    }
  }
  return false;
}

function cleanObservationKeywordsForNeed(values = [], need = "", limit = OBSERVATION_KEYWORD_LIMIT) {
  return pruneObservationTermsForNeed(
    cleanObservationKeywordList(values, need, limit ? limit * 2 : 0).filter((keyword) => !isUnrequestedObservationSurface({ label: keyword, query: keyword }, need)),
    need,
    limit
  );
}

function isObservationPlatformNoise(item = {}, need = "") {
  const needText = String(need || "").toLowerCase();
  if (/\bobservation\b|天文观测|观测设备|观测数据/.test(needText)) return false;
  const text = observationProfileText(item).toLowerCase();
  return /\b(?:observation|observations|starvault|imprint)\b/.test(text);
}

function isMechanicalObservationExpansion(item = {}, need = "") {
  const explicitTerms = explicitNeedTerms(need)
    .filter(isSpecificObservationTerm)
    .map((term) => term.toLowerCase());
  if (!explicitTerms.length) return false;
  const core = observationQueryCore(item);
  return /\bapp\s+dashboard\b/.test(core) && explicitTerms.some((term) => queryContainsObservationTerm(core, term));
}

function observationQueryCore(item = {}) {
  return stripObservationAntiNoise(String(item.query || item.q || ""))
    .toLowerCase()
    .split(/\s+in:name,description,readme\b/)[0]
    .replace(/\bstars:[^\s]+/g, "")
    .replace(/\bpushed:>=\d{4}-\d{2}-\d{2}\b/g, "")
    .replace(/\barchived:false\b|\bmirror:false\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isWeakGenericCadQuery(item = {}, domainModel = {}) {
  const core = observationQueryCore(item);
  const cadContext = domainModel.key === "cad" || /\bcad\b/.test(core);
  if (!cadContext) return false;
  return /^(cad|cad tool|cad workflow|cad viewer|cad converter)$/.test(core);
}

function isOverSpecificAcronymProjectQuery(item = {}, need = "") {
  const acronyms = explicitNeedTerms(need).filter((term) => /^[A-Z0-9][A-Z0-9.+#-]{1,5}$/.test(String(term || "").trim()));
  if (!acronyms.length) return false;
  const core = observationQueryCore(item).replace(/["“”]/g, " ");
  const tokens = core.split(/\s+/).filter(Boolean);
  return acronyms.some((term) => {
    const lower = term.toLowerCase();
    return tokens.some((token) => token.includes(lower) && token !== lower && token.length > lower.length + 2);
  });
}

function quoteObservationSearchTerm(term = "") {
  const clean = String(term || "").replace(/^["“]|["”]$/g, "").trim();
  if (!clean) return "";
  return /\s/.test(clean) ? `"${clean.replaceAll('"', "")}"` : clean;
}

function observationResearchQueries(need = "") {
  const cleanNeed = String(need || "").replace(/\s+/g, " ").trim().slice(0, 300);
  if (!cleanNeed) return [];
  const packs = detectedObservationPacks(cleanNeed);
  const packQueries = packs.flatMap((pack) => pack.researchQueries || []);
  return uniqueStrings(
    [
      `${cleanNeed} key concepts definitions terminology taxonomy`,
      `${cleanNeed} file formats standards protocols extensions`,
      `${cleanNeed} software tools libraries frameworks open source`,
      `${cleanNeed} workflows users use cases product categories`,
      `${cleanNeed} GitHub open source repositories viewer editor dashboard plugin template workflow`,
      `${cleanNeed} open source alternatives products apps`,
      ...packQueries
    ],
    10
  );
}

function observationResearchSingleQuery(need = "", queries = []) {
  const cleanNeed = String(need || "").replace(/\s+/g, " ").trim().slice(0, 260);
  const packHints = detectedObservationPacks(cleanNeed)
    .flatMap((pack) => [pack.labelEn, ...(pack.aliases || []), ...(pack.formats || []), ...(pack.software || []), ...(pack.workflows || [])])
    .filter(Boolean)
    .slice(0, 22)
    .join(" ");
  const dimensions = [
    "key concepts definitions terminology taxonomy",
    "file formats standards protocols extensions",
    "software tools libraries frameworks",
    "workflows users use cases product categories",
    "open source GitHub repositories viewer editor dashboard plugin template workflow"
  ].join(" ");
  return uniqueStrings([cleanNeed, packHints, dimensions, ...queries.slice(0, 3)], 8)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 900);
}

const GITHUB_ACTIVITY_GENERIC_TERMS = new Set([
  "ai",
  "api",
  "app",
  "bim",
  "cad",
  "cae",
  "cam",
  "dashboard",
  "github",
  "llm",
  "plugin",
  "project",
  "rag",
  "sdk",
  "tool",
  "workflow"
]);

function githubActivityProbeTerms(need = "") {
  const text = String(need || "");
  const planNameMatch = text.match(/方案名称[:：]\s*([^\n\r]+)/);
  const planName = String(planNameMatch?.[1] || "")
    .replace(/\s+/g, " ")
    .trim();
  const primaryName =
    /^[A-Za-z][A-Za-z0-9.+#-]{2,40}$/.test(planName) && !GITHUB_ACTIVITY_GENERIC_TERMS.has(planName.toLowerCase()) ? planName : "";
  return uniqueStrings([primaryName, ...explicitNeedTerms(text)], 3);
}

function githubActivityLevel(totalCount = 0) {
  const count = Number(totalCount || 0);
  if (count >= 5000) return "high";
  if (count >= 500) return "medium";
  if (count >= 50) return "low";
  return "sparse";
}

async function probeGithubActivityForObservationNeed(need = "", token = "") {
  const terms = githubActivityProbeTerms(need);
  if (!token || !terms.length) {
    return {
      terms,
      probes: [],
      maxTotalCount: 0,
      activityLevel: "unknown",
      errors: []
    };
  }
  const settled = await Promise.allSettled(
    terms.map((term) =>
      githubRepositorySearchCount(token, `${quoteObservationSearchTerm(term)} in:name,description,readme archived:false mirror:false`).then((result) => ({
        term,
        ...result
      }))
    )
  );
  const probes = settled.filter((item) => item.status === "fulfilled").map((item) => item.value);
  const errors = settled.filter((item) => item.status === "rejected").map((item) => item.reason?.message || "GitHub count probe failed");
  const maxTotalCount = Math.max(0, ...probes.map((item) => Number(item.totalCount || 0)));
  return {
    checkedAt: new Date().toISOString(),
    terms,
    probes,
    maxTotalCount,
    activityLevel: probes.length ? githubActivityLevel(maxTotalCount) : "unknown",
    errors
  };
}

function githubSampleKeywordTerms(repositories = [], need = "") {
  const needText = String(need || "").toLowerCase();
  const explicitTerms = explicitNeedTerms(need)
    .filter(isSpecificObservationTerm)
    .map((term) => term.toLowerCase());
  const allowAiTopics = /\b(ai|llm|gpt|rag|agent|bert|nlp|ocr|asr)\b|人工智能|大模型|智能体|自然语言|语音识别|文字识别/.test(needText);
  const metadataNoise = new Set([
    "c",
    "c plus plus",
    "cpp",
    "css",
    "go",
    "golang",
    "hacktoberfest",
    "html",
    "java",
    "javascript",
    "php",
    "python",
    "ruby",
    "rust",
    "shell",
    "swift",
    "typescript",
    "wip"
  ]);
  const aiNoise = new Set(["ai", "asr", "bert", "ernie", "gpt", "gpu", "it", "lama", "nlu", "nlp", "ocr", "qa", "xl", "xlore"]);
  const topicCounts = new Map();
  repositories.forEach((repo) => {
    const repoTopics = new Set(
      (Array.isArray(repo.topics) ? repo.topics : [])
        .map((topic) =>
          String(topic || "")
            .replace(/[-_]+/g, " ")
            .trim()
        )
        .filter((topic) => {
          const lower = topic.toLowerCase();
          if (metadataNoise.has(lower)) return false;
          if (!allowAiTopics && aiNoise.has(lower)) return false;
          const relatedToExplicit = explicitTerms.some((term) => lower.includes(term) || term.includes(lower));
          if (/^\d+$/.test(lower)) return false;
          if (/\d/.test(lower) && !relatedToExplicit) return false;
          if (/^[a-z0-9]{2,4}$/i.test(lower) && !relatedToExplicit && !["macos", "osx"].includes(lower)) return false;
          return true;
        })
        .filter(Boolean)
    );
    repoTopics.forEach((topic) => topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1));
  });
  const topicTerms = Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .filter(([, count]) => count >= 2 || repositories.length <= 3)
    .map(([topic]) => topic);
  return cleanObservationKeywordList(topicTerms, need, 24);
}

async function sampleGithubObservationSignals(need = "", token = "", probeTerms = []) {
  const terms = uniqueStrings([...(probeTerms || []), ...explicitNeedTerms(need)], 3).filter(isSpecificObservationTerm);
  if (!token || !terms.length) {
    return {
      terms,
      query: "",
      repositories: [],
      keywords: [],
      errors: token ? [] : ["GitHub token is not configured"]
    };
  }
  const query = `${quoteObservationSearchTerm(terms[0])} in:name,description archived:false mirror:false`;
  try {
    const repositories = await sampleRepositorySearchResults(token, query, 8);
    const keywords = githubSampleKeywordTerms(repositories, need);
    return {
      checkedAt: new Date().toISOString(),
      terms,
      query,
      repositories: repositories.map((repo) => ({
        fullName: repo.fullName,
        name: repo.name,
        description: repo.description,
        language: repo.language,
        topics: repo.topics || [],
        stars: repo.stars || 0
      })),
      keywords,
      errors: []
    };
  } catch (error) {
    return {
      terms,
      query,
      repositories: [],
      keywords: [],
      errors: [error?.message || "GitHub sample lookup failed"]
    };
  }
}

function escapeRegExp(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isSpecificObservationTerm(term = "") {
  const clean = String(term || "").replace(/^["“]|["”]$/g, "").trim();
  const lower = clean.toLowerCase();
  if (!lower) return false;
  const generic = new Set(["cad", "bim", "cam", "cae", "ai", "llm", "rag", "api", "sdk"]);
  if (/[\u4e00-\u9fa5]/.test(lower)) {
    return Array.from(lower).length >= 2 && !GENERIC_CHINESE_EXPLICIT_TERMS.has(lower);
  }
  const specificAcronym = /^[A-Z0-9][A-Z0-9.+#-]{1,5}$/.test(clean) && !generic.has(lower);
  return !generic.has(lower) && (lower.length >= 4 || /\s/.test(lower) || specificAcronym);
}

function queryContainsObservationTerm(query = "", term = "") {
  const lowerQuery = String(query || "").toLowerCase();
  const lowerTerm = String(term || "").replace(/^["“]|["”]$/g, "").trim().toLowerCase();
  if (!lowerQuery || !lowerTerm) return false;
  if (/\s/.test(lowerTerm)) return lowerQuery.includes(lowerTerm) || lowerQuery.includes(`"${lowerTerm}"`);
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(lowerTerm)}($|[^a-z0-9])`).test(lowerQuery);
}

function normalizeObservationExcludeTerm(term = "") {
  return String(term || "")
    .replace(/^-+/, "")
    .replace(/^["“]|["”]$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isLowValueObservationExcludeTerm(term = "") {
  const clean = normalizeObservationExcludeTerm(term);
  if (!clean) return false;
  if (/^(?:awesome(?: list)?|paper(?: list)?|tutorial|course|benchmark|toy example|dataset|demo|sample|example|showcase|gallery(?: only)?|movie list|music list)$/i.test(clean)) {
    return true;
  }
  return /教程|课程|论文|数据集|示例|样例|演示|榜单|清单|列表/.test(clean);
}

function filterObservationExcludeTerms(values = [], options = {}) {
  const trustedTerms = new Set(
    uniqueStrings(options.trustedTerms || [], 80)
      .map((term) => normalizeObservationExcludeTerm(term).toLowerCase())
      .filter(Boolean)
  );
  return uniqueStrings(
    (values || [])
      .map(normalizeObservationExcludeTerm)
      .filter(Boolean),
    80
  ).filter((term) => trustedTerms.has(term.toLowerCase()) || isLowValueObservationExcludeTerm(term));
}

function isSpecificObservationQuery(query = "", options = {}) {
  const explicitTerms = explicitNeedTerms(options.need || "")
    .filter(isSpecificObservationTerm)
    .map((term) => term.toLowerCase());
  if (!explicitTerms.length) return false;
  return explicitTerms.some((term) => queryContainsObservationTerm(query, term));
}

function stripObservationAntiNoise(query = "") {
  return String(query || "")
    .replace(/\s+-topic:(?:agent|agents|ai-agent|agentic|multi-agent|autonomous-agent|swarm|mcp|awesome|tutorial|course|paper|benchmark)\b/gi, "")
    .replace(/\s+-"(?:awesome list|paper list|toy example)"/gi, "")
    .replace(/\s+-(?:benchmark|course|tutorial)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function queryMatchesExplicitNeed(item = {}, need = "") {
  const explicitTerms = explicitNeedTerms(need)
    .filter(isSpecificObservationTerm)
    .map((term) => term.toLowerCase());
  if (!explicitTerms.length) return true;
  const text = observationProfileText(item);
  return explicitTerms.some((term) => queryContainsObservationTerm(text, term));
}

function observationQueryFreshnessDays(query = "", options = {}) {
  const text = `${query || ""} ${options.need || ""}`.toLowerCase();
  if (/\b(ugnx|nxopen|unigraphics)\b|ug\s+nx|siemens\s+nx/.test(text)) {
    return 730;
  }
  if (
    /\b(cad|bim|dwg|dxf|step|iges|stl|ifc|freecad|opencascade|cadquery|librecad|qcad|openscad|brl-cad|brlcad|nurbs|brep|b-rep|cam|cae)\b/.test(text) ||
    /geometry kernel|parametric modeling|constraint solver/.test(text)
  ) {
    return 365;
  }
  if (/\b(parser|converter|viewer|sdk|library|kernel|plugin|extension|addon|workbench|file format)\b/.test(text)) {
    return 180;
  }
  return 90;
}

function normalizeObservationQueryFreshness(query = "", options = {}) {
  const clean = String(query || "").replace(/\s+/g, " ").trim();
  if (isSpecificObservationQuery(clean, options)) {
    return stripObservationAntiNoise(clean)
      .replace(/\bstars:[^\s]+/g, "")
      .replace(/\bpushed:>=\d{4}-\d{2}-\d{2}\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  const days = observationQueryFreshnessDays(clean, options);
  if (days <= 90 || !/\bpushed:>=\d{4}-\d{2}-\d{2}\b/.test(clean)) return clean;
  const relaxedDate = dateDaysAgo(days);
  return clean.replace(/\bpushed:>=(\d{4}-\d{2}-\d{2})\b/g, (match, date) => (date > relaxedDate ? `pushed:>=${relaxedDate}` : match));
}

function completeObservationQuery(query = "", stars = 20, options = {}) {
  const clean = normalizeGithubOrGroups(String(query || "").replace(/\s+/g, " ").trim(), options.plan || {});
  const cleanWithoutAntiNoise = stripObservationAntiNoise(clean);
  if (!cleanWithoutAntiNoise) return "";
  if (/in:name,description,readme/.test(cleanWithoutAntiNoise) && /archived:false/.test(cleanWithoutAntiNoise)) {
    return normalizeObservationQueryFreshness(cleanWithoutAntiNoise, options);
  }
  const pushedDate = dateDaysAgo(observationQueryFreshnessDays(cleanWithoutAntiNoise, options));
  const starValue = Math.max(0, Number(stars || 0));
  const hasStars = /\bstars:/.test(cleanWithoutAntiNoise);
  const looseExplicit = isSpecificObservationQuery(cleanWithoutAntiNoise, options);
  const includeAntiNoise = options.includeAntiNoise === true && !looseExplicit;
  const noise = includeAntiNoise ? [options.allowAbstractAi ? "" : ABSTRACT_AI_NOISE, options.allowResearch ? "" : RESEARCH_NOISE].filter(Boolean).join(" ") : "";
  return `${cleanWithoutAntiNoise} in:name,description,readme ${hasStars || starValue <= 0 || looseExplicit ? "" : `stars:>${starValue}`} ${
    looseExplicit ? "" : `pushed:>=${pushedDate}`
  } archived:false mirror:false ${noise}`
    .replace(/\s+/g, " ")
    .trim();
}

function completeObservationPlanQueries(plan = {}) {
  const strategy = plan.searchLogic || plan.strategy || {};
  const rawStrategyKeywords = observationPlanWords(strategy.keywords || strategy.focusTerms || []);
  const requirementText = []
    .concat(Array.isArray(plan.requirements) ? plan.requirements.map((item) => (typeof item === "string" ? item : item?.text)) : [])
    .concat(Array.isArray(plan.requirementHistory) ? plan.requirementHistory.map((item) => (typeof item === "string" ? item : item?.text)) : [])
    .filter(Boolean)
    .join(" ");
  const primaryNeedText = `${plan.name || ""} ${plan.nameEn || ""} ${requirementText}`.trim();
  const rawKeywordContext = [primaryNeedText, rawStrategyKeywords.join(" ")].filter(Boolean).join("\n") || `${plan.description || ""} ${plan.descriptionEn || ""}`;
  const strategyKeywordList = cleanObservationKeywordsForNeed(rawStrategyKeywords, primaryNeedText || rawKeywordContext, OBSERVATION_KEYWORD_LIMIT);
  const strategyKeywords = strategyKeywordList.join(" ");
  const needText = primaryNeedText || strategyKeywords || `${plan.description || ""} ${plan.descriptionEn || ""}`;
  const domainModel = buildObservationDomainModel(needText, {});
  const customQueries = Array.isArray(strategy.customQueries)
    ? strategy.customQueries.map((item) => ({
        ...item,
        query: completeObservationQuery(item.query || item.q || "", item.stars ?? strategy.minStars ?? 20, {
          plan,
          need: needText,
          allowAbstractAi: /agent/i.test(`${item.query || ""} ${item.labelEn || item.label || ""}`)
        })
      }))
    : [];
  const aiProfileKeywords = aiProfileKeywordCandidates(customQueries, needText, OBSERVATION_KEYWORD_LIMIT);
  const queryDomainModel = {
    ...domainModel,
    sampleTerms: uniqueStrings([...(domainModel.sampleTerms || []), ...strategyKeywordList, ...aiProfileKeywords], 120)
  };
  const expandedNeedText = [needText, strategyKeywords, ...aiProfileKeywords].filter(Boolean).join(" ");
  const relevantCustomQueries = customQueries.filter(
    (item) =>
      !isObservationPlatformNoise(item, needText) &&
      !isMechanicalObservationExpansion(item, needText) &&
      !isOverSpecificAcronymProjectQuery(item, needText) &&
      !isUnrequestedObservationSurface(item, needText) &&
      !isWeakGenericCadQuery(item, domainModel) &&
      queryMatchesDomain(item, queryDomainModel, needText) &&
      queryMatchesExplicitNeed(item, expandedNeedText)
  );
  const profileFloor = observationProfileFloor(queryDomainModel, strategyKeywordList.length);
  const backfillTerms = cleanObservationKeywordsForNeed(
    [
      ...aiProfileKeywords,
      ...(queryDomainModel.formats || []),
      ...(queryDomainModel.software || []),
      ...(queryDomainModel.libraries || []),
      ...(queryDomainModel.workflows || []),
      ...(queryDomainModel.aliases || []),
      ...(queryDomainModel.sampleTerms || []),
      ...strategyKeywordList
    ],
    needText,
    OBSERVATION_KEYWORD_LIMIT
  );
  const backfilledCustomQueries = observationKeywordBackfillProfiles({
    existing: relevantCustomQueries,
    terms: backfillTerms,
    need: expandedNeedText,
    domainModel: queryDomainModel,
    floor: Math.min(profileFloor, OBSERVATION_CUSTOM_QUERY_LIMIT),
    minStars: Math.max(0, Number(strategy.minStars || 0))
  });
  const combinedCustomQueries = compactObservationProfiles([...relevantCustomQueries, ...backfilledCustomQueries], queryDomainModel, OBSERVATION_CUSTOM_QUERY_LIMIT);
  const searchLogic = {
    ...strategy,
    excludeTerms: filterObservationExcludeTerms(strategy.excludeTerms || [], {
      trustedTerms: domainModel.excludeTerms || []
    }),
    keywords: cleanObservationKeywordsForNeed(
      [
        ...strategyKeywordList,
        ...aiProfileKeywords
      ],
      needText,
      OBSERVATION_KEYWORD_LIMIT
    ),
    customQueries: []
  };
  searchLogic.customQueries = executableObservationCustomQueries(
    {
      ...plan,
      requirements: Array.isArray(plan.requirements) ? plan.requirements : []
    },
    {
      ...searchLogic,
      customQueries: combinedCustomQueries
    }
  );
  return {
    ...plan,
    strategy: searchLogic,
    searchLogic,
    summary: {
      ...(plan.summary || {}),
      searchLogicItems: searchLogic.customQueries.length
    }
  };
}

async function researchObservationPlanContext(need = "") {
  const cleanNeed = String(need || "").replace(/\s+/g, " ").trim().slice(0, 300);
  if (!cleanNeed) return { queries: [], signals: [], errors: [] };
  const queries = observationResearchQueries(cleanNeed);
  const singleQuery = observationResearchSingleQuery(cleanNeed, queries);
  const tasks = [];
  const tavilyKey = effectiveTavilyKey();
  const exaKey = effectiveExaKey();
  if (tavilyKey) {
    tasks.push(searchTavilyTopicSignals(singleQuery, tavilyKey, 8));
  }
  if (exaKey) {
    tasks.push(searchExaTopicSignals(singleQuery, exaKey, 8));
  }
  if (!tasks.length) {
    const domainModel = buildObservationDomainModel(cleanNeed, { queries, signals: [] });
    return { queries, signals: [], errors: [], domainModel, metacognition: domainModel };
  }
  const settled = await Promise.allSettled(tasks);
  const signals = compactResearchSignals(settled.flatMap((item) => (item.status === "fulfilled" ? item.value : [])));
  const domainModel = buildObservationDomainModel(cleanNeed, { queries, signals });
  return {
    queries,
    signals,
    errors: settled.filter((item) => item.status === "rejected").map((item) => item.reason?.message || "Research request failed"),
    domainModel,
    metacognition: domainModel
  };
}

function searchLogicFromProfiles(profiles = [], language = "zh") {
  return {
    baseMode: "default",
    keywords: [],
    excludeTerms: [],
    customQueries: profiles.map((profile) => ({
      label: language === "en" ? profile.label || profile.key : profile.labelZh || profile.label || profile.key,
      labelEn: profile.label || profile.key,
      labelZh: profile.labelZh || profile.label || profile.key,
      query: profile.q,
      stars: 0
    })),
    preferredLanguages: [],
    preferredCategories: [],
    preferredShapes: [],
    minStars: 0,
    notes:
      language === "en"
        ? "Default observation uses the built-in discovery matrix. These are the GitHub query profiles actually executed."
        : "默认观察使用内置扫描矩阵；这里展示的是实际执行的 GitHub 查询 profiles。"
  };
}

function hydrateObservationPlanSearchLogic(plan = {}, language = "zh") {
  if (!plan) return plan;
  if (plan.id !== "default") return completeObservationPlanQueries(plan);
  const profiles = buildQueryProfiles();
  const searchLogic = searchLogicFromProfiles(profiles, language);
  return {
    ...plan,
    strategy: searchLogic,
    searchLogic,
    summary: {
      ...(plan.summary || {}),
      searchLogicItems: profiles.length
    }
  };
}

function hydratePortableData(payload = {}, language = "zh") {
  const plans = payload.observationPlans?.plans || [];
  return {
    ...payload,
    observationPlans: {
      ...(payload.observationPlans || {}),
      plans: plans.map((plan) => hydrateObservationPlanSearchLogic(plan, language))
    }
  };
}

function compactText(value = "", max = 220) {
  const text = String(value || "")
    .replace(/[\u0000-\u001f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!max || text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function normalizeEnglishDescription(description = "") {
  return compactText(description)
    .replace(/^[-–—\s]+/, "")
    .replace(/\s*[|｜]\s*GitHub.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sentenceCase(value = "") {
  const text = normalizeEnglishDescription(value);
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function polishChineseText(value = "") {
  return String(value || "")
    .replace(/\s+/g, "")
    .replace(/[，,。.!！]+$/g, "")
    .trim();
}

function ensureChineseSentence(value = "") {
  const text = polishChineseText(value);
  if (!text) return "";
  return /[。！？]$/.test(text) ? text : `${text}。`;
}

const EXPORT_CATEGORY_ZH = {
  "product-starters": "应用基础模板",
  "ai-native-products": "AI 应用与助手",
  "developer-productivity": "开发效率工具",
  "business-saas": "SaaS 与业务系统",
  "data-knowledge": "数据与知识系统",
  "infra-cloud": "云原生与平台工程",
  "security-compliance": "安全与合规",
  "frontend-creative": "前端设计与创意工具",
  "creative-media": "视频音频与内容创作",
  "consumer-productivity": "个人效率工具",
  "commerce-growth-content": "商业增长与内容",
  "vertical-domain-apps": "垂直行业应用",
  "systems-runtime-edge": "系统运行时与边缘能力",
  "learning-research-assets": "学习与研究资产",
  other: "其他"
};

const EXPORT_LICENSE_ZH = {
  "permissive-commercial": "MIT/Apache/BSD",
  "conditional-commercial": "需履约许可",
  "distribution-copyleft": "分发需开源",
  "network-copyleft": "网络服务高风险",
  "restricted-noncommercial": "受限用途",
  "unknown-no-license": "无许可：仅监控",
  "manual-review": "先人工复核"
};

const EXPORT_NAME_TERM_ZH = {
  ai: "AI",
  agent: "智能体",
  agents: "智能体",
  app: "应用",
  apps: "应用",
  assistant: "助手",
  browser: "浏览器",
  cli: "命令行",
  cloud: "云平台",
  code: "代码",
  coding: "编程",
  content: "内容",
  dashboard: "仪表盘",
  data: "数据",
  design: "设计",
  desktop: "桌面端",
  dev: "开发",
  editor: "编辑器",
  flow: "流程",
  graph: "图谱",
  graphify: "图谱化",
  hub: "中枢",
  knowledge: "知识",
  local: "本地",
  manager: "管理器",
  media: "媒体",
  memory: "记忆",
  mobile: "移动端",
  open: "开源",
  ops: "运维",
  platform: "平台",
  productivity: "效率",
  review: "审查",
  search: "搜索",
  studio: "工作室",
  switch: "切换器",
  tool: "工具",
  tools: "工具",
  ui: "界面",
  video: "视频",
  voice: "语音",
  web: "网页",
  workflow: "工作流"
};

function originalProjectName(project) {
  const fullName = String(project?.fullName || "").trim();
  const slug = fullName.includes("/") ? fullName.split("/").pop() : fullName;
  return String(project?.name || slug || fullName || "").trim();
}

function translatedSlugNameZh(rawName = "") {
  const tokens = String(rawName || "")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .split(/[-_\s.]+/)
    .filter(Boolean)
    .slice(0, 5);
  const translated = tokens.map((token) => EXPORT_NAME_TERM_ZH[token.toLowerCase()] || "");
  const translatedCount = translated.filter(Boolean).length;
  if (!translatedCount || (tokens.length > 1 && translatedCount < 2)) return "";
  return polishChineseText(
    tokens
      .map((token, index) => translated[index] || token)
      .join("")
  );
}

function exportHaystack(project) {
  return [
    project.fullName,
    project.name,
    project.description,
    project.homepage,
    project.language,
    project.category?.key,
    project.category?.label,
    project.useCase?.key,
    project.useCase?.label,
    project.useCase?.labelZh,
    project.useCase?.labelEn,
    project.useCase?.summaryZh,
    project.useCase?.summaryEn,
    ...(project.topics || []),
    ...(project.reasons || []),
    ...(project.actions || [])
  ]
    .filter(Boolean)
    .join(" ");
}

function exportDescriptorZh(project) {
  const haystack = exportHaystack(project);
  const rules = [
    [/knowledge graph|graphify|code graph|understand[-\s_]?anything/i, "知识图谱工具"],
    [/curated list|awesome|resources|tutorials?|guides?|examples?/i, "学习案例资料"],
    [/design|figma|prototype|whiteboard|diagram|canvas|ui generator/i, "设计原型工具"],
    [/video|audio|music|podcast|voice|subtitle|caption|creator/i, "内容创作工具"],
    [/browser[-\s_]?extension|chrome extension|firefox extension/i, "浏览器插件"],
    [/(?:^|[^a-z0-9])(?:plugin|plugins|extension|extensions|addon|addons|add-on|add-ons|workbench|connector|integration)(?:[^a-z0-9]|$)|插件|扩展/i, "插件/扩展工具"],
    [/browser[-\s_]?automation|browser agent|web automation/i, "浏览器自动化工具"],
    [/memory layer|ai memory|long[-\s]?term memory|persistent context/i, "AI 记忆服务"],
    [/rag|knowledge base|semantic search|vector search|document search/i, "知识检索系统"],
    [/dashboard|admin|crm|erp|saas|business/i, "业务管理系统"],
    [/cli|terminal|developer tool|code review|coding|ide/i, "开发者工具"],
    [/security|scanner|vulnerabil|privacy|compliance|audit/i, "安全检查工具"],
    [/workflow|automation|orchestrat|multi[-\s]?agent|agent/i, "自动化工作流"],
    [/kubernetes|cloud|observability|deploy|runtime|edge/i, "平台工程工具"],
    [/tutorial|course|awesome|learn|examples|guide/i, "学习案例资料"]
  ];
  return rules.find(([pattern]) => pattern.test(haystack))?.[1] || project.useCase?.labelZh || EXPORT_CATEGORY_ZH[project.category?.key] || "开源项目";
}

function exportProjectNameZh(project) {
  const rawName = originalProjectName(project);
  if (!rawName) return "";
  if (/[\u4e00-\u9fa5]/.test(rawName)) return rawName;
  const translated = translatedSlugNameZh(rawName);
  if (translated && translated !== rawName) return translated;
  return `${rawName}（${exportDescriptorZh(project)}）`;
}

function exportDescriptionZh(project) {
  const cleaned = normalizeEnglishDescription(project.description);
  if (cleaned && /[\u4e00-\u9fa5]/.test(cleaned)) return ensureChineseSentence(cleaned);
  const haystack = exportHaystack(project);
  const rules = [
    [/curated list|awesome|resources|tutorials?|guides?|examples?|course/i, "整理教程、示例、实践路径或可复现的学习资料"],
    [/local[-\s]?first.*design|claude design|open[-\s_]?design|prototype|design systems?/i, "用于界面原型、设计系统、多端页面或创意素材生成"],
    [/knowledge graph|queryable knowledge graph|graphify|code graph|understand[-\s_]?anything/i, "把代码、文档或知识结构转换成可探索、可搜索、可提问的知识图谱"],
    [/zsh configuration|oh[-\s]?my[-\s]?zsh|shell configuration/i, "社区驱动的终端配置管理框架，用插件、主题和自动更新提升命令行体验"],
    [/download manager|downloading, organizing and studying media/i, "用于下载、整理和学习媒体资料，适合本地资料管理与学习工作流"],
    [/travel|trip planner/i, "用于旅行规划、协作地图、预算和行程管理"],
    [/payment|payout|fraud|vault|billing/i, "用于支付、风控、对账、账单或商业交易流程"],
    [/browser.*(agent|automation|use|harness)/i, "让 AI 或脚本操作浏览器，完成网页点击、填写、抓取和任务执行"],
    [/memory.*ai|ai memory|long[-\s]?term memory|personalized ai/i, "为 AI 应用提供长期记忆、用户偏好和个性化上下文"],
    [/video|video[-\s_]?editor|subtitle|caption|timeline|shorts/i, "用于视频剪辑、字幕处理、时间线编辑或短视频内容生产"],
    [/audio|music|voice|tts|podcast/i, "用于音频、音乐、语音合成、配音或播客内容制作"],
    [/rag|knowledge base|semantic search|vector search/i, "用于资料索引、语义检索、知识库问答或 RAG 应用"],
    [/dashboard|admin|crm|erp|saas/i, "用于搭建后台、仪表盘、SaaS 模板或业务管理系统"],
    [/cli|terminal|developer tool|code review|coding|ide/i, "用于提升编码、命令行、代码审查或工程协作效率"],
    [/security|scanner|vulnerabil|privacy|compliance|audit/i, "用于安全检测、隐私检查、漏洞扫描或合规审计"],
    [/workflow|automation|orchestrat|agentic|multi[-\s]?agent/i, "用于把多步骤任务、工具调用和结果汇总串成自动流程"],
    [/kubernetes|cloud|observability|deploy|runtime|edge/i, "用于云原生部署、平台工程、可观测性或运行时能力建设"],
    [/finance|trading|stock|portfolio|invoice|accounting/i, "用于金融数据、交易分析、投资组合或财务流程处理"],
    [/tutorial|course|awesome|learn|examples|guide/i, "整理教程、示例、实践路径或可复现的学习资料"]
  ];
  const matched = rules.find(([pattern]) => pattern.test(haystack))?.[1];
  return ensureChineseSentence(matched || project.useCase?.summaryZh || EXPORT_CATEGORY_ZH[project.category?.key] || "需要进一步人工判断的开源项目");
}

function firstExportSemanticMatch(project, rules, fallback) {
  const haystack = exportHaystack(project);
  return rules.find((rule) => rule.pattern.test(haystack)) || fallback;
}

function exportSemanticProfile(project) {
  const category = project.category?.key || "other";
  const problemFallback = {
    "developer-productivity": { zh: "开发效率问题", en: "Developer workflow" },
    "frontend-creative": { zh: "界面与创意表达", en: "Frontend creativity" },
    "creative-media": { zh: "内容素材生产", en: "Creative media" },
    "business-saas": { zh: "业务管理问题", en: "Business workflow" },
    "data-knowledge": { zh: "数据知识处理", en: "Data and knowledge" },
    "infra-cloud": { zh: "平台工程能力", en: "Platform capability" },
    "security-compliance": { zh: "安全合规问题", en: "Security review" },
    "consumer-productivity": { zh: "个人效率管理", en: "Personal productivity" }
  }[category] || { zh: "具体工作流问题", en: "Specific workflow" };
  const audienceFallback = {
    "developer-productivity": { zh: "开发者", en: "Developers" },
    "frontend-creative": { zh: "设计与前端团队", en: "Design and frontend teams" },
    "creative-media": { zh: "内容创作者", en: "Creators" },
    "business-saas": { zh: "业务团队", en: "Business teams" },
    "data-knowledge": { zh: "知识工作者", en: "Knowledge workers" },
    "infra-cloud": { zh: "平台团队", en: "Platform teams" },
    "security-compliance": { zh: "安全团队", en: "Security teams" },
    "consumer-productivity": { zh: "个人用户", en: "Individual users" }
  }[category] || { zh: "需要该能力的人", en: "Relevant users" };
  const shapeFallback = {
    "product-starters": { zh: "模板工程", en: "Template project" },
    "ai-native-products": { zh: "AI 应用/工作流", en: "AI app/workflow" },
    "developer-productivity": { zh: "开发者工具", en: "Developer tool" },
    "business-saas": { zh: "Web 工作台", en: "Web workspace" },
    "data-knowledge": { zh: "知识/数据服务", en: "Knowledge service" },
    "infra-cloud": { zh: "平台服务", en: "Platform service" },
    "security-compliance": { zh: "检测工具", en: "Review tool" },
    "frontend-creative": { zh: "创意工具", en: "Creative tool" },
    "creative-media": { zh: "创作工具", en: "Creation tool" },
    "consumer-productivity": { zh: "效率应用", en: "Productivity app" }
  }[category] || { zh: "工具/服务", en: "Tool/service" };
  const sceneFallback = {
    "developer-productivity": { zh: "研发提效与工程协作", en: "Engineering workflow" },
    "frontend-creative": { zh: "设计协作与原型生成", en: "Design collaboration" },
    "creative-media": { zh: "内容生产与素材制作", en: "Content production" },
    "business-saas": { zh: "业务管理与数据分析", en: "Business operations" },
    "data-knowledge": { zh: "资料整理与知识沉淀", en: "Knowledge management" },
    "infra-cloud": { zh: "部署监控与运维治理", en: "Platform operations" },
    "security-compliance": { zh: "风险排查与合规审计", en: "Risk review" },
    "consumer-productivity": { zh: "个人效率与本地工作流", en: "Personal workflow" }
  }[category] || { zh: "实际工作流", en: "Practical workflow" };
  return {
    problem: firstExportSemanticMatch(
      project,
      [
        { pattern: /knowledge graph|graphify|code graph|understand[-\s_]?anything/i, zh: "代码与资料结构理解", en: "Code and knowledge mapping" },
        { pattern: /design|prototype|whiteboard|diagram|canvas/i, zh: "图表白板与原型表达", en: "Whiteboarding" },
        { pattern: /video|audio|music|podcast|voice|subtitle|caption/i, zh: "音视频内容生产", en: "Media production" },
        { pattern: /api client|api testing|graphql|rest client|http client/i, zh: "接口调试与测试", en: "API debugging" }
      ],
      problemFallback
    ),
    audience: firstExportSemanticMatch(
      project,
      [
        { pattern: /design|figma|whiteboard|diagram|canvas|prototype/i, zh: "设计与内容团队", en: "Design and content teams" },
        { pattern: /knowledge graph|code graph|developer|coding|cli|terminal|ide/i, zh: "开发者与知识工作者", en: "Developers and knowledge workers" },
        { pattern: /video|audio|music|podcast|voice|creator|content/i, zh: "内容创作者", en: "Creators" }
      ],
      audienceFallback
    ),
    shape: firstExportSemanticMatch(
      project,
      [
        { pattern: /browser extension|chrome extension|firefox extension|edge extension|safari extension|webextension/i, zh: "浏览器插件", en: "Browser plugin" },
        { pattern: /(?:^|[^a-z0-9])(?:plugin|plugins|extension|extensions|addon|addons|add-on|add-ons|workbench|connector|integration)(?:[^a-z0-9]|$)|插件|扩展/i, zh: "插件/扩展工具", en: "Plugin/extension tool" },
        { pattern: /knowledge graph|graphify|code graph|understand[-\s_]?anything/i, zh: "知识图谱工具", en: "Knowledge graph tool" },
        { pattern: /design studio|prototype|whiteboard|canvas|ui generator/i, zh: "创作编辑器", en: "Creative editor" },
        { pattern: /cli|terminal|command line/i, zh: "CLI 工具", en: "CLI tool" }
      ],
      shapeFallback
    ),
    scene: firstExportSemanticMatch(
      project,
      [
        { pattern: /knowledge graph|code graph|understand[-\s_]?anything/i, zh: "代码理解与知识沉淀", en: "Code understanding" },
        { pattern: /prototype|whiteboard|diagram|design/i, zh: "内容表达与原型制作", en: "Content prototyping" },
        { pattern: /api client|api testing|graphql|rest client|http client/i, zh: "接口开发调试", en: "API development" },
        { pattern: /video|audio|music|podcast|voice|subtitle|caption/i, zh: "内容生产与素材制作", en: "Content production" }
      ],
      sceneFallback
    )
  };
}

function localizedValue(language, zhValue, enValue) {
  return language === "zh" ? zhValue || enValue || "" : enValue || zhValue || "";
}

function exportLicenseLabel(project, language) {
  const policy = project.licensePolicy || {};
  if (language === "zh") return policy.labelZh || EXPORT_LICENSE_ZH[policy.bucket] || policy.label || "";
  return policy.labelEn || policy.label || "";
}

function exportTrendValue(project, key) {
  const trend = project.trend || {};
  if (trend.error || trend.unavailable || trend.cached === false || trend[key] === null || trend[key] === undefined) return "";
  return trend[key];
}

function exportTrendStatus(project, language) {
  const trend = project.trend || {};
  if (trend.error || trend.unavailable) return language === "zh" ? "趋势统计失败" : "trend failed";
  if (trend.cached === false) return language === "zh" ? "未纳入趋势缓存" : "not in trend cache";
  if (trend.pending || trend.stars === null || trend.stars === undefined || trend.forks === null || trend.forks === undefined) {
    return language === "zh" ? "等待扫描更新" : "awaiting scan";
  }
  if (trend.complete === false || trend.starsComplete === false || trend.forksComplete === false) {
    return language === "zh" ? "部分统计" : "partial";
  }
  return language === "zh" ? "已缓存" : "cached";
}

const EXPORT_FIELDS = [
  ["rank", "排名", "rank", (project, language, semantic, index) => index + 1],
  ["fullName", "仓库全名", "fullName", (project) => project.fullName],
  ["name", "项目名", "name", (project) => originalProjectName(project)],
  ["nameZh", "中文名", "nameZh", (project) => exportProjectNameZh(project)],
  ["owner", "作者", "owner", (project) => project.owner || String(project.fullName || "").split("/")[0]],
  ["url", "GitHub 地址", "githubUrl", (project) => project.url],
  ["homepage", "项目主页", "homepage", (project) => project.homepage],
  ["description", "原始简介", "description", (project) => sentenceCase(project.description)],
  ["descriptionZh", "中文简介", "descriptionZh", (project) => exportDescriptionZh(project)],
  ["problem", "解决什么", "problem", (project, language, semantic) => localizedValue(language, semantic.problem.zh, semantic.problem.en)],
  ["audience", "给谁用", "audience", (project, language, semantic) => localizedValue(language, semantic.audience.zh, semantic.audience.en)],
  ["shape", "可做成", "canBecome", (project, language, semantic) => localizedValue(language, semantic.shape.zh, semantic.shape.en)],
  ["scene", "使用场景", "scenario", (project, language, semantic) => localizedValue(language, semantic.scene.zh, semantic.scene.en)],
  ["category", "分类", "category", (project, language) => (language === "zh" ? EXPORT_CATEGORY_ZH[project.category?.key] || project.category?.label : project.category?.label)],
  [
    "useCase",
    "用途方向",
    "useCase",
    (project, language) => localizedValue(language, project.useCase?.labelZh, project.useCase?.labelEn || project.useCase?.label)
  ],
  [
    "useCaseSummary",
    "用途说明",
    "useCaseSummary",
    (project, language) => localizedValue(language, project.useCase?.summaryZh, project.useCase?.summaryEn || project.useCase?.summary)
  ],
  ["language", "语言", "language", (project) => project.language],
  ["topics", "主题", "topics", (project) => (project.topics || []).join(" / ")],
  ["stars", "Stars", "stars", (project) => project.stars],
  ["forks", "Forks", "forks", (project) => project.forks],
  ["openIssues", "Issues", "issues", (project) => project.openIssues],
  ["trendStars", "趋势 Stars", "trendStars", (project) => exportTrendValue(project, "stars")],
  ["trendForks", "趋势 Forks", "trendForks", (project) => exportTrendValue(project, "forks")],
  ["trendDate", "趋势日期", "trendDate", (project) => project.trend?.date || ""],
  ["trendStatus", "趋势状态", "trendStatus", (project, language) => exportTrendStatus(project, language)],
  ["opportunity", "推荐值", "opportunity", (project) => project.scores?.opportunity],
  ["actionability", "可落地性", "actionability", (project) => project.scores?.actionability],
  ["productization", "应用价值", "appliedValue", (project) => project.scores?.productization],
  ["quality", "工程质量", "quality", (project) => project.scores?.quality],
  ["projectRisk", "项目风险", "projectRisk", (project) => project.scores?.risk],
  ["licenseRisk", "许可风险", "licenseRisk", (project) => project.scores?.licenseRisk],
  ["license", "许可证", "license", (project) => project.licensePolicy?.name || project.license?.name || ""],
  ["licensePolicy", "许可标签", "licensePolicy", (project, language) => exportLicenseLabel(project, language)],
  ["pushedAt", "最近更新", "pushedAt", (project) => project.pushedAt || project.updatedAt],
  ["createdAt", "创建时间", "createdAt", (project) => project.createdAt],
  ["firstSeenAt", "首次入池", "firstSeenAt", (project) => project.firstSeenAt],
  ["lastSeenAt", "最近入池", "lastSeenAt", (project) => project.lastSeenAt],
  ["favorite", "已收藏", "favorite", (project) => Boolean(project.watched)],
  ["triageStatus", "研判状态", "triageStatus", (project) => project.triageStatus || ""],
  ["note", "研判记录", "note", (project) => project.note || ""]
];

function exportFieldName(field, language) {
  return language === "zh" ? field[1] : field[2];
}

function exportProjectRecord(project, language, index) {
  const semantic = exportSemanticProfile(project);
  return Object.fromEntries(
    EXPORT_FIELDS.map((field) => [exportFieldName(field, language), field[3](project, language, semantic, index) ?? ""])
  );
}

function exportProjects(format, filters) {
  const language = normalizeExportLanguage(filters.language);
  const { format: _format, language: _language, ...projectFilters } = filters;
  const result = storage.listProjects({ ...projectFilters, limit: "all", offset: 0 });
  const items = result.items.map((project, index) => exportProjectRecord(project, language, index));
  if (format === "csv") {
    const headers = EXPORT_FIELDS.map((field) => exportFieldName(field, language));
    const rows = items.map((item) => headers.map((header) => item[header]));
    return `\ufeff${[headers.join(","), ...rows.map((row) => row.map(csvEscape).join(","))].join("\n")}`;
  }
  const payload =
    language === "zh"
      ? { 导出时间: new Date().toISOString(), 观察方案: storage.getObservationPlan(), 总数: result.total, 项目: items }
      : { exportedAt: new Date().toISOString(), observationPlan: storage.getObservationPlan(), total: result.total, items };
  return JSON.stringify(payload, null, 2);
}

async function runScan(options = {}) {
  if (scanInProgress) {
    return {
      status: "already-running"
    };
  }

  scanInProgress = true;
  const startedAt = new Date().toISOString();
  const githubToken = effectiveGithubToken();

  try {
    await validateGithubScanToken(githubToken);
    const maxRepos = Math.max(50, Math.min(Number(options.maxRepos ?? config.scanMaxRepos), 3000));
    const pagesPerProfile = Math.max(1, Math.min(Number(options.pagesPerProfile ?? config.githubSearchPages), 8));
    const plannedTrendLimit = Math.max(0, Math.min(Number(options.trendCount ?? config.githubTrendLimit ?? 80), maxRepos));
    const language = storage.getSettings(false).language || "zh";
    const activePlan = hydrateObservationPlanSearchLogic(storage.getObservationPlan(), language);
    const isDefaultObservationPlan = activePlan.id === "default";
    let trendingMaxRepos = isDefaultObservationPlan ? Math.max(0, Math.min(Number(options.trendingCount ?? config.githubTrendingMaxRepos ?? 60), 120)) : 0;
    const trendingPerPeriod = Math.max(5, Math.min(Number(options.trendingPerPeriod ?? config.githubTrendingPerPeriod ?? 25), 50));
    setScanProgress({
      status: "running",
      stage: "prepare",
      label: "准备扫描",
      percent: 3,
    completed: 0,
    total: 0,
    progressUnits: 2,
    startedAt,
    finishedAt: null,
    error: ""
  });
    setScanProgress({
      stage: "catalog",
      label: "检查接口目录",
      percent: 5,
      progressUnits: 5
    });
    await refreshProviderCatalogIfStale(false);
    const activeMemory = storage.getMemory();
    const previous = previousProjectMap();
    const profiles = applyMemoryToQueryProfiles(buildQueryProfiles(isDefaultObservationPlan ? null : activePlan), activeMemory);
    setScanProgress({
      stage: "github",
      label: "检查 GitHub 速率预算",
      percent: 7,
      completed: 0,
      total: 0,
      progressUnits: 7
    });
    const githubRateStatus = await githubRateLimitStatus(githubToken);
    const githubScanBudget = planGithubScanBudget(githubRateStatus, {
      plannedTrendLimit,
      trendingMaxRepos
    });
    trendingMaxRepos = githubScanBudget.trendingMaxRepos;
    const budgetedTrendLimit = githubScanBudget.trendLimit;
    startScanEta(105 + budgetedTrendLimit * 1.6 + trendingMaxRepos * 0.5);
    setScanProgress({
      stage: "github",
      label: "检索 GitHub 候选项目",
      percent: 8,
      completed: 0,
      total: profiles.length * pagesPerProfile,
      progressUnits: 8
    });
    const result = await searchCandidateRepositories({
      token: githubToken,
      maxRepos,
      pagesPerProfile,
      profiles,
      onProgress: (progress) => {
        setScanProgress({
          stage: "github",
          label: `检索 GitHub：${progress.completed}/${progress.total}`,
          percent: stagePercent(8, 55, progress.completed, progress.total),
          completed: progress.completed,
          total: progress.total,
          found: progress.found,
          progressUnits: 8 + 47 * (progress.total > 0 ? progress.completed / progress.total : 0)
        });
      }
    });
    assertNoGithubBlockingErrors(result.errors);
    assertGithubSearchUsable(result);
    let trendingResult = {
      repositories: [],
      signals: new Map(),
      errors: [],
      profiles: [],
      found: 0
    };
    if (trendingMaxRepos) {
      setScanProgress({
        stage: "github",
        label: "读取 GitHub Trending",
        percent: 56,
        completed: 0,
        total: 3 + trendingMaxRepos,
        progressUnits: 56
      });
      trendingResult = await fetchTrendingRepositories({
        token: githubToken,
        maxRepos: trendingMaxRepos,
        perPeriod: trendingPerPeriod,
        periods: ["daily", "weekly", "monthly"],
        concurrency: 2,
        onProgress: (progress) => {
          setScanProgress({
            stage: "github",
            label: `读取 GitHub Trending：${progress.completed}/${progress.total}`,
            percent: stagePercent(56, 62, progress.completed, progress.total),
            completed: progress.completed,
            total: progress.total,
            found: progress.found,
            progressUnits: 56 + trendingMaxRepos * 0.5 * (progress.total > 0 ? progress.completed / progress.total : 0)
          });
        }
      });
      assertNoGithubBlockingErrors(trendingResult.errors || []);
    }
    const trendingSignals = mergeSignalMap(new Map(), trendingResult.signals);
    const combined = mergeRepositoryCandidates(result.repositories, trendingResult.repositories, maxRepos);
    const repositories = combined.repositories;
    const scanErrors = [...result.errors, ...(trendingResult.errors || [])];
    const preScoredRepositories = repositories.map((repo) => enrichRepository(repo, previous.get(repo.fullName), signalsForRepository(trendingSignals, repo.fullName)));
    const tavilyLimit = Math.max(0, Number(options.tavilyCount ?? 24));
    const exaLimit = Math.max(0, Number(options.exaCount ?? 24));

    setScanProgress({
      stage: "tavily",
      label: effectiveTavilyKey() ? "补充 Tavily 外部信号" : "跳过 Tavily",
      percent: 64,
      completed: 0,
      total: effectiveTavilyKey() ? Math.min(tavilyLimit, repositories.length) : 0,
      progressUnits: 64
    });
    const externalSignals = await enrichTopProjectsWithTavily(
      preScoredRepositories,
      effectiveTavilyKey(),
      tavilyLimit,
      (progress) => {
        setScanProgress({
          stage: "tavily",
          label: `补充 Tavily：${progress.completed}/${progress.total}`,
          percent: stagePercent(64, 76, progress.completed, progress.total),
          completed: progress.completed,
          total: progress.total,
          progressUnits: 64 + 12 * (progress.total > 0 ? progress.completed / progress.total : 0)
        });
      }
    );
    setScanProgress({
      stage: "exa",
      label: effectiveExaKey() ? "补充 Exa 语义信号" : "跳过 Exa",
      percent: 78,
      completed: 0,
      total: effectiveExaKey() ? Math.min(exaLimit, repositories.length) : 0,
      progressUnits: 78
    });
    const exaSignals = await enrichTopProjectsWithExa(
      preScoredRepositories,
      effectiveExaKey(),
      exaLimit,
      (progress) => {
        setScanProgress({
          stage: "exa",
          label: `补充 Exa：${progress.completed}/${progress.total}`,
          percent: stagePercent(78, 90, progress.completed, progress.total),
          completed: progress.completed,
          total: progress.total,
          progressUnits: 78 + 12 * (progress.total > 0 ? progress.completed / progress.total : 0)
        });
      }
    );

    setScanProgress({
      stage: "score",
      label: "评估候选项目",
      percent: 93,
      completed: 0,
      total: repositories.length,
      progressUnits: 92
    });
    const enriched = repositories.map((repo) => {
      const trending = signalsForRepository(trendingSignals, repo.fullName);
      const tavily = externalSignals.get(repo.fullName) || [];
      const exa = exaSignals.get(repo.fullName) || [];
      return enrichRepository(repo, previous.get(repo.fullName), [...trending, ...tavily, ...exa]);
    });

    const trendLimit = Math.max(0, Math.min(budgetedTrendLimit, enriched.length));
    let trendUpdated = 0;
    setScanProgress({
      stage: "score",
      label: "保存项目池与榜单",
      percent: 93,
      completed: enriched.length,
      total: enriched.length,
      progressUnits: 92
    });
    storage.upsertProjects(enriched, {
      id: `scan-${Date.now()}`,
      mode: options.mode || "manual",
      status: scanErrors.length ? "completed-with-errors" : "completed",
      observationPlanId: activePlan.id,
      observationPlanName: activePlan.name,
      profiles: [...result.profiles, ...(trendingResult.profiles || [])],
      received: repositories.length,
      githubSearchReceived: result.repositories.length,
      githubTrendingFound: trendingResult.found || 0,
      githubTrendingAdded: combined.added,
      trendUpdated: 0,
      trendLimit,
      githubRateBudget: githubScanBudget,
      errors: scanErrors,
      startedAt,
      replaceObservationPlanMatches: enriched.length > 0 || !scanErrors.length
    });

    if (trendLimit && githubToken) {
      setScanProgress({
        stage: "score",
        label: `更新 GitHub 趋势缓存：${trendLimit} 个候选`,
        percent: 94,
        completed: 0,
        total: trendLimit,
        progressUnits: 92
      });
      const trendCandidates = storage.trendRefreshCandidates(trendLimit);
      const trendResult = await repositoryOnlineTrends(
        githubToken,
        trendCandidates.map((project) => project.fullName),
        {
          limit: trendLimit,
          concurrency: 2,
          maxPages: 12,
          onProgress: (progress) => {
            setScanProgress({
              stage: "score",
              label: `更新 GitHub 趋势缓存：${progress.completed}/${progress.total}`,
              percent: stagePercent(94, 97, progress.completed, progress.total),
              completed: progress.completed,
              total: progress.total,
              progressUnits: 92 + trendLimit * 1.6 * (progress.total > 0 ? progress.completed / progress.total : 0)
            });
          }
        }
      );
      assertNoGithubBlockingErrors(trendResult.errors || []);
      trendUpdated = storage.updateProjectTrends(trendResult.items || {});
      storage.updateLatestScan({
        trendUpdated,
        trendLimit,
        status: scanErrors.length || trendResult.errors?.length ? "completed-with-errors" : "completed"
      });
      setScanProgress({
        stage: "score",
        label: `GitHub 趋势缓存已更新：${trendUpdated}/${trendLimit}`,
        percent: 97,
        completed: trendUpdated,
        total: trendLimit,
        progressUnits: 92 + trendLimit * 1.6
      });
      if (trendResult.errors?.length) {
        scanErrors.push(
          ...trendResult.errors.map((error) => ({
            profile: "github-trend-cache",
            message: error.message,
            fullName: error.fullName
          }))
        );
      }
    } else {
      setScanProgress({
        stage: "score",
        label: githubToken ? "跳过趋势缓存更新" : "未配置 GitHub，跳过趋势缓存",
        percent: 94,
        completed: 0,
        total: 0,
        progressUnits: 98
      });
    }

    setScanProgress({
      stage: "score",
      label: "刷新榜单与项目池",
      percent: 98,
      completed: enriched.length,
      total: enriched.length,
      progressUnits: 105 + budgetedTrendLimit * 1.6 + trendingMaxRepos * 0.5
    });

    setScanProgress({
      status: "completed",
      stage: "completed",
      label: "扫描完成",
      percent: 100,
      completed: enriched.length,
      total: enriched.length,
      etaSeconds: 0,
      etaMinSeconds: 0,
      etaMaxSeconds: 0,
      etaConfidence: "",
      etaReason: "",
      error: "",
      finishedAt: new Date().toISOString()
    });
    return {
      status: "completed",
      observationPlan: activePlan,
      insertedOrUpdated: enriched.length,
      trendUpdated,
      githubTrendingFound: trendingResult.found || 0,
      githubTrendingAdded: combined.added,
      errors: scanErrors,
      profiles: result.profiles.length + (trendingResult.profiles || []).length
    };
  } catch (error) {
    storage.addScan({
      status: "failed",
      mode: options.mode || "manual",
      errors: [{ message: error.message }]
    });
    setScanProgress({
      status: "failed",
      stage: "failed",
      label: "扫描失败",
      percent: 0,
      error: error.message,
      etaSeconds: 0,
      etaMinSeconds: 0,
      etaMaxSeconds: 0,
      etaConfidence: "",
      etaReason: "",
      finishedAt: new Date().toISOString()
    });
    throw error;
  } finally {
    scanInProgress = false;
    scanEta = null;
  }
}

function ensureDemoData() {
  const current = storage.summary();
  if (current.totalProjects === 0) {
    storage.upsertProjects(demoRepositories(), {
      id: `demo-${Date.now()}`,
      status: "demo",
      mode: "demo-seed",
      profiles: ["demo"],
      received: 6
    });
  }
}

async function routeStatic(req, res, url) {
  let pathname = "";
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    sendError(res, 400, "Invalid request path");
    return;
  }
  if (pathname.includes("\0")) {
    sendError(res, 400, "Invalid request path");
    return;
  }
  if (pathname === "/robots.txt") {
    sendText(res, 200, robotsTxt(), {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    });
    return;
  }
  const destinationIssue = staticDestinationIssue(req, pathname);
  if (destinationIssue) {
    sendError(res, destinationIssue.status, destinationIssue.message);
    return;
  }
  const sensitiveIssue = sensitivePathIssue(url);
  if (sensitiveIssue) {
    const probeLimit = enforceSensitiveProbeLimit(req);
    if (probeLimit) {
      sendRateLimited(res, probeLimit);
      return;
    }
    sendError(res, sensitiveIssue.status, sensitiveIssue.message);
    return;
  }
  if (pathname === "/") {
    pathname = "/index.html";
  }
  if (pathname === "/favicon.ico") {
    res.writeHead(204, securityHeaders({
      "Cache-Control": "public, max-age=86400"
    }));
    res.end();
    return;
  }

  // Resolve real paths so symlink/`..` traversal can't escape publicDir.
  let baseReal;
  try {
    baseReal = await fs.promises.realpath(config.publicDir);
  } catch {
    sendError(res, 404, "Not found");
    return;
  }

  const candidate = path.normalize(path.join(baseReal, pathname));
  let fileReal;
  try {
    fileReal = await fs.promises.realpath(candidate);
  } catch {
    sendError(res, 404, "Not found");
    return;
  }

  const inside = fileReal === baseReal || fileReal.startsWith(baseReal + path.sep);
  if (!inside) {
    sendError(res, 403, "Forbidden");
    return;
  }

  let stat;
  try {
    stat = await fs.promises.stat(fileReal);
  } catch {
    sendError(res, 404, "Not found");
    return;
  }
  if (stat.isDirectory()) {
    sendError(res, 404, "Not found");
    return;
  }

  const etag = `"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
  if (req.headers["if-none-match"] === etag) {
    res.writeHead(304, securityHeaders({
      "Cache-Control": "no-cache",
      "ETag": etag
    }));
    res.end();
    return;
  }

  res.writeHead(200, securityHeaders({
    "Content-Type": contentType(fileReal),
    "Cache-Control": "no-cache",
    "ETag": etag
  }));
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  fs.createReadStream(fileReal).pipe(res);
}

async function routeApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, {
      ok: true,
      config: publicEffectiveConfig(),
      scheduler: scheduler?.status() || null,
      scanInProgress
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/config") {
    sendJson(res, 200, publicEffectiveConfig());
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/discovery") {
    sendJson(res, 200, discoveryLogic());
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/settings") {
    sendJson(res, 200, settingsResponse(revealSetFromParam(url.searchParams.get("reveal"))));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/settings") {
    try {
      const body = await parseBody(req);
      storage.updateSettings(body);
      const keyValidation = await validateSavedServiceKeys();
      sendJson(res, 200, {
        ...settingsResponse(),
        keyValidation
      });
    } catch (error) {
      sendError(res, 400, error.message);
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/observation-plans") {
    const language = storage.getSettings(false).language || "zh";
    const active = hydrateObservationPlanSearchLogic(storage.getObservationPlan(), language);
    const plans = storage.listObservationPlans().map((plan) => hydrateObservationPlanSearchLogic(plan, language));
    sendJson(res, 200, {
      active,
      plans
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/observation-plans") {
    try {
      const body = await parseBody(req);
      const plan = storage.saveObservationPlan(completeObservationPlanQueries(body.plan || body));
      const language = storage.getSettings(false).language || "zh";
      sendJson(res, 200, {
        ok: true,
        plan: hydrateObservationPlanSearchLogic(plan, language),
        plans: storage.listObservationPlans().map((item) => hydrateObservationPlanSearchLogic(item, language))
      });
    } catch (error) {
      sendError(res, 400, error.message);
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/observation-plans/requirements") {
    try {
      const body = await parseBody(req);
      const language = storage.getSettings(false).language || "zh";
      const plan = storage.saveObservationPlanRequirements(body.id, body.requirements || []);
      sendJson(res, 200, {
        ok: true,
        plan: hydrateObservationPlanSearchLogic(plan, language),
        plans: storage.listObservationPlans().map((item) => hydrateObservationPlanSearchLogic(item, language))
      });
    } catch (error) {
      sendError(res, 400, error.message);
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/observation-plans/active") {
    try {
      const body = await parseBody(req);
      const result = storage.setActiveObservationPlan(body.id);
      const language = storage.getSettings(false).language || "zh";
      sendJson(res, 200, {
        ok: true,
        ...result,
        active: hydrateObservationPlanSearchLogic(result.active, language),
        plans: (result.plans || []).map((plan) => hydrateObservationPlanSearchLogic(plan, language))
      });
    } catch (error) {
      sendError(res, 400, error.message);
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/observation-plans/delete") {
    try {
      const body = await parseBody(req);
      const result = storage.deleteObservationPlan(body.id);
      const language = storage.getSettings(false).language || "zh";
      sendJson(res, 200, {
        ...result,
        plans: (result.plans || []).map((plan) => hydrateObservationPlanSearchLogic(plan, language)),
        active: hydrateObservationPlanSearchLogic(storage.getObservationPlan(), language)
      });
    } catch (error) {
      sendError(res, 400, error.message);
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/observation-plans/generate") {
    try {
      const body = await parseBody(req);
      const settings = storage.getSettings(true);
      const provider = activeProvider(settings);
      const language = settings.language || "zh";
      const planName = String(body.name || "").trim();
      const latestNeed = uniqueStrings([body.idea, body.detailedNeed], 2).join("\n").trim();
      const requirementRecords = draftObservationRequirements(latestNeed);
      const combinedNeed = requirementRecords.map((item) => item.text).filter(Boolean).join("\n") || latestNeed;
      const combinedPrompt = [
        planName ? `方案名称：${planName}` : "",
        latestNeed ? `详细需求：${latestNeed}` : ""
      ]
        .filter(Boolean)
        .join("\n");
      if (!planName || !latestNeed) {
        sendError(res, 400, "方案名称和详细需求不能为空");
        return;
      }
      if (!provider?.apiKey) {
        sendError(res, 400, "请先在设置里配置并保存可用的 AI 模型 API Key 后再生成观察方案");
        return;
      }
      const researchNeed = combinedPrompt || latestNeed || planName;
      const baseResearchContext = await researchObservationPlanContext(researchNeed);
      const githubActivity = await probeGithubActivityForObservationNeed(researchNeed, effectiveGithubToken()).catch((error) => ({
        terms: githubActivityProbeTerms(researchNeed),
        probes: [],
        maxTotalCount: 0,
        activityLevel: "unknown",
        errors: [error?.message || "GitHub activity probe failed"]
      }));
      const githubSamples = await sampleGithubObservationSignals(researchNeed, effectiveGithubToken(), githubActivity.terms || []);
      const researchContext = {
        ...baseResearchContext,
        githubActivity,
        githubSamples
      };
      researchContext.domainModel = buildObservationDomainModel(researchNeed, researchContext);
      researchContext.metacognition = researchContext.domainModel;
      const promptResearchContext = compactObservationResearchContextForPrompt(researchContext);
      const coreKeyword = planName || explicitNeedTerms(researchNeed)[0] || "";
      try {
        const result = await generateObservationPlanWithProvider({
          provider,
          language,
          payload: {
            coreKeyword,
            name: planName,
            idea: combinedPrompt || latestNeed || combinedNeed,
            detailedNeed: combinedNeed,
            latestNeed,
            requirementHistory: requirementRecords || [],
            researchContext: promptResearchContext
          }
        });
        const providerPlan = {
          ...result.plan,
          name: planName || result.plan.name,
          nameEn: planName || result.plan.nameEn || result.plan.name
        };
        const completedPlan = completeObservationPlanQueries({
          ...providerPlan,
          requirements: requirementRecords.length ? requirementRecords : providerPlan.requirements || []
        });
        if (!completedPlan.searchLogic?.customQueries?.length) {
          throw new Error("AI 生成方案未返回可执行 GitHub 检索逻辑，请补充需求后重试");
        }
        sendJson(res, 200, {
          ok: true,
          source: "ai",
          raw: result.raw,
          plan: completedPlan
        });
      } catch (aiError) {
        const message =
          aiError.message === "AI 生成方案未返回可执行 GitHub 检索逻辑，请补充需求后重试"
            ? aiError.message
            : "AI 生成方案失败，请稍后重试或检查模型配置";
        sendError(res, 502, message, { providerMessage: aiError.message });
      }
    } catch (error) {
      sendError(res, 400, error.message);
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/portable-data/export") {
    const language = storage.getSettings(false).language || "zh";
    sendJson(res, 200, hydratePortableData(storage.exportPortableData(), language));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/local-snapshot") {
    sendJson(res, 200, {
      ...storage.exportLocalSnapshot(),
      config: publicConfig(config)
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/portable-data/import") {
    try {
      const body = await parseBody(req);
      const result = storage.importPortableData(body, { activate: body.activate !== false });
      sendJson(res, 200, {
        ok: true,
        ...result
      });
    } catch (error) {
      sendError(res, 400, error.message);
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/observation-plans/export") {
    const language = storage.getSettings(false).language || "zh";
    sendJson(res, 200, hydratePortableData(storage.exportPortableData(), language));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/observation-plans/import") {
    try {
      const body = await parseBody(req);
      const result = storage.importPortableData(body, { activate: body.activate !== false });
      sendJson(res, 200, {
        ok: true,
        ...result
      });
    } catch (error) {
      sendError(res, 400, error.message);
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/github/me") {
    try {
      const user = await getAuthenticatedUser(effectiveGithubToken());
      sendJson(res, 200, {
        ok: true,
        user
      });
    } catch (error) {
      sendError(res, 400, "GitHub configuration failed", { message: error.message });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/github/repos") {
    try {
      const perPage = Number(url.searchParams.get("perPage") || 50);
      const repositories = await listOwnRepositories(effectiveGithubToken(), { perPage });
      sendJson(res, 200, {
        repositories
      });
    } catch (error) {
      sendError(res, 400, "GitHub repositories failed", { message: error.message });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/github/actions") {
    sendJson(res, 200, {
      actions: storage.getGithubActions()
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/github/star") {
    try {
      const body = await parseBody(req);
      if (!body.fullName) {
        sendError(res, 400, "fullName is required");
        return;
      }
      const result = await starRepository(effectiveGithubToken(), body.fullName);
      const action = storage.setGithubAction(body.fullName, {
        starred: true,
        starredAt: new Date().toISOString()
      });
      try {
        storage.recordMemoryEvent(body.fullName, "star", { source: "github" });
      } catch (_) {}
      sendJson(res, 200, {
        ...result,
        action
      });
    } catch (error) {
      sendError(res, 400, "GitHub Star failed", { message: error.message });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/github/unstar") {
    try {
      const body = await parseBody(req);
      if (!body.fullName) {
        sendError(res, 400, "fullName is required");
        return;
      }
      const result = await unstarRepository(effectiveGithubToken(), body.fullName);
      const action = storage.setGithubAction(body.fullName, {
        starred: false,
        unstarredAt: new Date().toISOString()
      });
      try {
        storage.recordMemoryEvent(body.fullName, "unstar", { source: "github" });
      } catch (_) {}
      sendJson(res, 200, {
        ...result,
        action
      });
    } catch (error) {
      sendError(res, 400, "GitHub Unstar failed", { message: error.message });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/github/fork") {
    try {
      const body = await parseBody(req);
      if (!body.fullName) {
        sendError(res, 400, "fullName is required");
        return;
      }
      const repository = await forkRepository(effectiveGithubToken(), body.fullName);
      const action = storage.setGithubAction(body.fullName, {
        forked: true,
        forkedAt: new Date().toISOString(),
        forkFullName: repository?.fullName || ""
      });
      try {
        storage.recordMemoryEvent(body.fullName, "fork", { source: "github" });
      } catch (_) {}
      sendJson(res, 200, {
        repository,
        action
      });
    } catch (error) {
      sendError(res, 400, "GitHub Fork failed", { message: error.message });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/memory-preference") {
    try {
      const body = await parseBody(req);
      const memory = storage.updateMemoryPreference(body.kind, body.key, {
        delta: body.delta,
        value: body.value,
        scope: body.scope
      });
      sendJson(res, 200, {
        ok: true,
        memory
      });
    } catch (error) {
      sendError(res, 400, error.message);
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/memory") {
    sendJson(res, 200, storage.getMemory());
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/memory-event") {
    try {
      const body = await parseBody(req);
      if (!body.fullName) {
        sendError(res, 400, "fullName is required");
        return;
      }
      const memory = storage.recordMemoryEvent(body.fullName, body.type || "select_project", {
        source: body.source || "ui",
        weight: body.weight,
        reason: body.reason
      });
      sendJson(res, 200, {
        ok: true,
        memory
      });
    } catch (error) {
      sendError(res, 400, error.message);
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/memory/events/clear") {
    try {
      const body = await parseBody(req);
      if (body.confirm !== true) {
        sendError(res, 400, "Confirmation is required");
        return;
      }
      const result = storage.clearMemoryEvents(body.range || "1d");
      sendJson(res, 200, {
        ok: true,
        ...result
      });
    } catch (error) {
      sendError(res, 400, error.message);
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/memory-settings") {
    try {
      const body = await parseBody(req);
      const memory = storage.updateMemorySettings(body);
      sendJson(res, 200, {
        ok: true,
        memory
      });
    } catch (error) {
      sendError(res, 400, error.message);
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/memory/context/compact") {
    try {
      const body = await parseBody(req);
      const result = storage.compactMemoryContext({
        force: body.force !== false,
        manual: body.manual === true,
        keepRecentEvents: body.keepRecentEvents
      });
      sendJson(res, 200, {
        ok: true,
        ...result
      });
    } catch (error) {
      sendError(res, 400, error.message);
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/memory/harness/evaluate") {
    try {
      const harness = storage.evaluateMemoryHarness();
      sendJson(res, 200, {
        ok: true,
        harness,
        memory: storage.getMemory()
      });
    } catch (error) {
      sendError(res, 400, error.message);
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/memory/harness/tune") {
    try {
      const harness = storage.evaluateMemoryHarness();
      const settings = storage.getSettings(true);
      const provider = activeProvider(settings);
      const memory = storage.getMemory();
      const payload = {
        harness,
        memory: {
          preferences: memory.preferences,
          negativePreferences: memory.negativePreferences,
          antiBubble: memory.antiBubble,
          compressedContext: memory.context,
          recentEvents: (memory.events || []).slice(0, 40)
        }
      };
      const result = await tuneMemoryWithProvider({
        provider,
        payload,
        language: settings.language || "zh"
      });
      const tunedMemory = storage.applyMemoryTuning(result.tuning, provider?.name || "llm");
      sendJson(res, 200, {
        ok: true,
        provider: provider?.name || "",
        model: provider?.model || "",
        tuning: result.tuning,
        memory: tunedMemory
      });
    } catch (error) {
      sendError(res, 400, error.message);
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/summary") {
    sendJson(res, 200, storage.summary(Object.fromEntries(url.searchParams.entries())));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/leaderboard") {
    const period = ["daily", "weekly", "monthly", "all"].includes(url.searchParams.get("period"))
      ? url.searchParams.get("period")
      : "daily";
    const limit = Number(url.searchParams.get("limit") || 20);
    const date = url.searchParams.get("date") || "";
    sendJson(
      res,
      200,
      storage.buildLeaderboard(period, {
        limit,
        date: period === "daily" ? date : "",
        persist: false
      })
    );
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/leaderboard-archives") {
    sendJson(res, 200, {
      dates: storage.leaderboardArchives()
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/projects") {
    sendJson(res, 200, storage.listProjects(Object.fromEntries(url.searchParams.entries())));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/projects/position") {
    const fullName = url.searchParams.get("fullName");
    if (!fullName) {
      sendError(res, 400, "fullName is required");
      return;
    }
    const filters = Object.fromEntries(url.searchParams.entries());
    delete filters.fullName;
    sendJson(res, 200, storage.projectPoolPosition(fullName, filters));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/project") {
    const fullName = url.searchParams.get("fullName");
    if (!fullName) {
      sendError(res, 400, "fullName is required");
      return;
    }
    const project = storage.getProject(fullName);
    if (!project) {
      sendError(res, 404, "Project not found");
      return;
    }
    sendJson(res, 200, project);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/scan") {
    try {
      const body = await parseBody(req);
      if (scanInProgress) {
        sendJson(res, 200, { status: "already-running" });
        return;
      }
      runScan(body).catch((error) => {
        console.error(`Background scan failed: ${error.message}`);
      });
      sendJson(res, 202, { status: "started" });
    } catch (error) {
      sendError(res, isGithubAuthError(error) ? 401 : isGithubRateLimitError(error) ? 429 : 502, "Scan failed", { message: error.message });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/scan/status") {
    sendJson(res, 200, {
      ...scanProgress,
      running: scanInProgress
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/watchlist") {
    try {
      const body = await parseBody(req);
      if (!body.fullName) {
        sendError(res, 400, "fullName is required");
        return;
      }
      const project = storage.setWatch(body.fullName, Boolean(body.watched));
      sendJson(res, 200, { project });
    } catch (error) {
      sendError(res, 400, error.message);
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/project-dismissal") {
    try {
      const body = await parseBody(req);
      if (!body.fullName) {
        sendError(res, 400, "fullName is required");
        return;
      }
      const project = storage.setProjectDismissed(body.fullName, body.dismissed !== false);
      sendJson(res, 200, {
        ok: true,
        project,
        memory: storage.getMemory()
      });
    } catch (error) {
      sendError(res, 400, error.message);
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/dismissed-projects") {
    sendJson(res, 200, { items: storage.listDismissedProjects() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/dismissed-project-feedback") {
    try {
      const body = await parseBody(req);
      if (!body.fullName) {
        sendError(res, 400, "fullName is required");
        return;
      }
      const project = storage.updateDismissedProjectFeedback(body.fullName, body.feedback || {});
      sendJson(res, 200, {
        ok: true,
        project,
        items: storage.listDismissedProjects()
      });
    } catch (error) {
      sendError(res, 400, error.message);
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/note") {
    try {
      const body = await parseBody(req);
      if (!body.fullName) {
        sendError(res, 400, "fullName is required");
        return;
      }
      const project = storage.setNote(body.fullName, body.text || "", body.status || "");
      sendJson(res, 200, { project });
    } catch (error) {
      sendError(res, 400, error.message);
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/leaderboard-feedback") {
    try {
      const body = await parseBody(req);
      if (!body.fullName) {
        sendError(res, 400, "fullName is required");
        return;
      }
      const result = storage.recordLeaderboardFeedback(body.fullName, body.feedback || "positive");
      sendJson(res, 200, {
        ok: true,
        memory: result.memory
      });
    } catch (error) {
      sendError(res, 400, error.message);
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/analyze") {
    try {
      const body = await parseBody(req);
      const project = storage.getProject(body.fullName);
      if (!project) {
        sendError(res, 404, "Project not found");
        return;
      }
      const settings = storage.getSettings(true);
      const provider = activeProvider(settings);
      const analysisContext = {
        method: String(body.method || "balanced").slice(0, 40),
        methodLabel: String(body.methodLabel || "").slice(0, 80),
        userNeed: String(body.userNeed || "").slice(0, 1000)
      };
      const analysis = await analyzeWithProvider({
        provider,
        project,
        language: settings.language || "zh",
        context: analysisContext
      });
      const savedProject = storage.setAnalysis(body.fullName, analysis.result, {
        raw: analysis.raw,
        provider: provider?.name || "",
        model: provider?.model || "",
        language: settings.language || "zh",
        context: analysisContext
      });
      sendJson(res, 200, {
        provider: provider?.name || "",
        model: provider?.model || "",
        analysis: savedProject.analysis,
        project: savedProject
      });
    } catch (error) {
      sendError(res, 400, error.message);
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/provider-catalog/refresh") {
    try {
      const catalog = await refreshProviderCatalogIfStale(true);
      sendJson(res, 200, {
        catalog,
        settings: settingsResponse()
      });
    } catch (error) {
      sendError(res, 400, error.message);
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/provider-models") {
    try {
      const body = await parseBody(req);
      const providerId = body.providerId || "deepseek";
      const settings = storage.getSettings(true);
      const provider = getProviderOrThrow(settings, providerId);
      const models = await listProviderModels(provider);
      const nextModel = models.includes(provider.model) ? provider.model : models[0] || provider.model || "";
      storage.updateSettings(
        mergeProviderUpdate(settings, providerId, {
          models,
          model: nextModel,
          lastModelSyncAt: new Date().toISOString(),
          testStatus: "models-loaded"
        })
      );
      sendJson(res, 200, {
        models,
        settings: settingsResponse()
      });
    } catch (error) {
      sendError(res, 400, error.message);
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/provider-test") {
    let body = {};
    try {
      body = await parseBody(req);
      const providerId = body.providerId || "deepseek";
      const settings = storage.getSettings(true);
      const provider = getProviderOrThrow(settings, providerId);
      const result = await testProviderConnection(provider);
      storage.updateSettings(
        mergeProviderUpdate(settings, providerId, {
          models: result.models,
          lastTestAt: result.checkedAt,
          testStatus: result.ok ? "ok" : "failed"
        })
      );
      sendJson(res, 200, {
        ...result,
        settings: settingsResponse()
      });
    } catch (error) {
      const providerId = body.providerId || "deepseek";
      const settings = storage.getSettings(true);
      storage.updateSettings(
        mergeProviderUpdate(settings, providerId, {
          lastTestAt: new Date().toISOString(),
          testStatus: `failed: ${error.message}`
        })
      );
      sendError(res, 400, error.message, {
        settings: settingsResponse()
      });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/export") {
    const format = url.searchParams.get("format") === "csv" ? "csv" : "json";
    const body = exportProjects(format, Object.fromEntries(url.searchParams.entries()));
    if (format === "csv") {
      sendText(res, 200, body, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="starvault-imprint-projects.csv"'
      });
      return;
    }
    sendText(res, 200, body, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="starvault-imprint-projects.json"'
    });
    return;
  }

  sendError(res, 404, "Unknown API route");
}

async function handle(req, res) {
  try {
    if (!methodAllowed(req.method)) {
      res.writeHead(405, securityHeaders({
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Allow": "GET, HEAD, POST, OPTIONS"
      }));
      res.end(JSON.stringify({ error: "Method Not Allowed" }));
      return;
    }

    if (!hostAllowed(req, config.host)) {
      sendJson(res, 421, { error: "Misdirected Request" });
      return;
    }

    let url;
    try {
      url = new URL(req.url || "/", `http://${req.headers.host || config.host}`);
    } catch {
      sendError(res, 400, "Invalid request target");
      return;
    }
    const targetIssue = requestTargetIssue(req, url);
    if (targetIssue) {
      sendError(res, targetIssue.status, targetIssue.message);
      return;
    }

    const bodyIssue = bodyLimitIssue(req, DEFAULT_REQUEST_LIMITS.maxBodyBytes);
    if (bodyIssue) {
      sendError(res, bodyIssue.status, bodyIssue.message);
      return;
    }

    if (!jsonContentTypeAllowed(req)) {
      sendError(res, 415, "Content-Type must be application/json");
      return;
    }

    const crawlerLimit = enforceCrawlerRateLimit(req);
    if (crawlerLimit) {
      sendRateLimited(res, crawlerLimit);
      return;
    }

    // Restrictive CORS preflight: no Access-Control-Allow-Origin is emitted, so
    // cross-origin browsers cannot read API responses. Same-origin UI is unaffected.
    if (req.method === "OPTIONS") {
      res.writeHead(204, securityHeaders(corsHeaders()));
      res.end();
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      if (!fetchMetadataAllowed(req, url)) {
        sendJson(res, 403, { error: "Forbidden", reason: "fetch-metadata" });
        return;
      }

      const limit = enforceRateLimit(req, url);
      if (limit) {
        sendRateLimited(res, limit);
        return;
      }

      if (config.authToken && !isAuthorized(req, url, config.authToken)) {
        const authLimit = authFailureRateLimiter(`auth:${clientIp(req)}`);
        if (!authLimit.allowed) {
          sendRateLimited(res, { ...authLimit, scope: "auth" });
          return;
        }
        sendJson(res, 401, { error: "Unauthorized", authRequired: true });
        return;
      }

      // CSRF: block cross-origin state-changing requests from browsers.
      if (!isSafeMethod(req.method) && !originAllowed(req)) {
        sendJson(res, 403, { error: "Forbidden", reason: "cross-origin" });
        return;
      }

      await routeApi(req, res, url);
      return;
    }

    const staticLimit = enforceStaticRateLimit(req);
    if (staticLimit) {
      sendRateLimited(res, staticLimit);
      return;
    }
    await routeStatic(req, res, url);
  } catch (error) {
    sendError(res, 500, "Internal error", { message: error.message });
  }
}

ensureDemoData();

const server = http.createServer(handle);
server.headersTimeout = 10_000;
server.requestTimeout = 30_000;
server.keepAliveTimeout = 5_000;
server.maxHeadersCount = 100;
server.on("clientError", (_error, socket) => {
  if (socket.writable) {
    socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
  }
});
server.listen(config.port, config.host, () => {
  console.log(`StarVault Imprint listening on http://${config.host}:${config.port}`);
  console.log(
    `GitHub token: ${effectiveGithubToken() ? "configured" : "not configured"}; Tavily: ${
      effectiveTavilyKey() ? "configured" : "not configured"
    }`
  );
  if (!config.authToken && !["127.0.0.1", "localhost", "::1"].includes(config.host)) {
    console.warn("Security warning: AUTH_TOKEN is recommended when binding outside localhost.");
  }
});

scheduler = startScheduler({
  scanFn: runScan,
  scanHour: config.scanHour,
  runOnBoot: config.runScanOnBoot
});

process.on("SIGTERM", () => {
  scheduler?.stop();
  server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  scheduler?.stop();
  server.close(() => process.exit(0));
});

module.exports = {
  runScan,
  server
};
