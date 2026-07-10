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

function buildConfig() {
  const env = getEnv();
  return {
    port: asNumber(env.PORT, DEFAULT_PORT),
    host: env.HOST || DEFAULT_HOST,
    githubToken: env.GITHUB_TOKEN || "",
    tavilyKey: env.TAVILY_API_KEY || "",
    exaKey: env.EXA_API_KEY || "",
    // Optional shared secret. When set, all /api/ requests must present it
    // (Authorization: Bearer <token>, X-Api-Key, sv_token cookie, or ?token=).
    authToken: env.AUTH_TOKEN || env.ACCESS_TOKEN || "",
    scanHour: Math.min(23, Math.max(0, asNumber(env.SCAN_HOUR, 8))),
    scanMaxRepos: Math.max(50, asNumber(env.SCAN_MAX_REPOS, 800)),
    githubSearchPages: Math.max(1, Math.min(8, asNumber(env.GITHUB_SEARCH_PAGES, 2))),
    githubTrendLimit: Math.max(0, Math.min(300, asNumber(env.GITHUB_TREND_LIMIT, 80))),
    githubTrendingMaxRepos: Math.max(0, Math.min(120, asNumber(env.GITHUB_TRENDING_MAX_REPOS, 60))),
    githubTrendingPerPeriod: Math.max(5, Math.min(50, asNumber(env.GITHUB_TRENDING_PER_PERIOD, 25))),
    runScanOnBoot: asBoolean(env.RUN_SCAN_ON_BOOT, false),
    storePath: path.join(process.cwd(), "data", "store.json"),
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
    authRequired: Boolean(config.authToken)
  };
}

module.exports = {
  buildConfig,
  publicConfig
};
