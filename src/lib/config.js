const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_PORT = 4173;
const DEFAULT_HOST = "127.0.0.1";

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const values = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }

  return values;
}

function getEnv() {
  const localEnv = parseEnvFile(path.join(process.cwd(), ".env"));
  return { ...localEnv, ...process.env };
}

function asNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function resolveStorePath(rawPath, env = {}) {
  const requested = String(rawPath || "").trim();
  if (!requested) return path.join(process.cwd(), "data", "starvault.db");
  const isLegacyJson = path.extname(requested).toLowerCase() === ".json";
  if (isLegacyJson && !asBoolean(env.ALLOW_LEGACY_JSON_STORE, false)) {
    return `${requested.slice(0, -path.extname(requested).length)}.db`;
  }
  return requested;
}

function buildConfig() {
  const env = getEnv();
  const systemTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const host = env.HOST || DEFAULT_HOST;
  const authToken = env.AUTH_TOKEN || env.ACCESS_TOKEN || "";
  const loopback = ["127.0.0.1", "localhost", "::1", "[::1]"].includes(host.toLowerCase());
  if (!loopback && !authToken) {
    throw new Error("AUTH_TOKEN is required when HOST binds outside localhost");
  }
  const publicOrigin = String(env.PUBLIC_ORIGIN || "").replace(/\/$/, "");
  if (publicOrigin) {
    const parsedOrigin = new URL(publicOrigin);
    if (parsedOrigin.protocol !== "https:" && !["localhost", "127.0.0.1", "::1"].includes(parsedOrigin.hostname)) {
      throw new Error("PUBLIC_ORIGIN must use HTTPS outside localhost");
    }
  }
  return {
    port: asNumber(env.PORT, DEFAULT_PORT),
    host,
    githubToken: env.GITHUB_TOKEN || "",
    tavilyKey: env.TAVILY_API_KEY || "",
    exaKey: env.EXA_API_KEY || "",
    // Optional shared secret. When set, all /api/ requests must present it
    // (Authorization: Bearer <token>, X-Api-Key, or sv_token cookie).
    authToken,
    publicOrigin,
    trustProxy: asBoolean(env.TRUST_PROXY, false),
    allowPrivateProviderUrls: asBoolean(env.ALLOW_PRIVATE_PROVIDER_URLS, false),
    scanHour: Math.min(23, Math.max(0, asNumber(env.SCAN_HOUR, 8))),
    timeZone: env.APP_TIME_ZONE || env.TZ || systemTimeZone,
    scanMaxRepos: Math.max(50, asNumber(env.SCAN_MAX_REPOS, 800)),
    githubSearchPages: Math.max(1, Math.min(8, asNumber(env.GITHUB_SEARCH_PAGES, 2))),
    githubTrendLimit: Math.max(0, Math.min(300, asNumber(env.GITHUB_TREND_LIMIT, 80))),
    githubTrendingMaxRepos: Math.max(0, Math.min(120, asNumber(env.GITHUB_TRENDING_MAX_REPOS, 60))),
    githubTrendingPerPeriod: Math.max(5, Math.min(50, asNumber(env.GITHUB_TRENDING_PER_PERIOD, 25))),
    runScanOnBoot: asBoolean(env.RUN_SCAN_ON_BOOT, false),
    storePath: resolveStorePath(env.STORE_PATH || path.join(process.cwd(), "data", "starvault.db"), env),
    publicDir: path.join(process.cwd(), "public")
  };
}

function publicConfig(config) {
  return {
    port: config.port,
    host: config.host,
    scanHour: config.scanHour,
    scanMaxRepos: config.scanMaxRepos,
    githubSearchPages: config.githubSearchPages,
    githubTrendLimit: config.githubTrendLimit,
    githubTrendingMaxRepos: config.githubTrendingMaxRepos,
    githubTrendingPerPeriod: config.githubTrendingPerPeriod,
    githubConfigured: Boolean(config.githubToken),
    tavilyConfigured: Boolean(config.tavilyKey),
    exaConfigured: Boolean(config.exaKey),
    authRequired: Boolean(config.authToken),
    publicOrigin: config.publicOrigin || "",
    trustProxy: Boolean(config.trustProxy)
  };
}

module.exports = {
  buildConfig,
  publicConfig
};
