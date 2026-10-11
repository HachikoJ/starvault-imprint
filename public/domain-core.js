(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.StarVaultDomainCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const LICENSE_GROUPS = {
    permissive: new Set(["mit", "apache-2.0", "bsd-2-clause", "bsd-3-clause", "isc", "unlicense", "0bsd", "zlib"]),
    conditional: new Set([
      "mpl-2.0",
      "lgpl-2.1",
      "lgpl-2.1-only",
      "lgpl-2.1-or-later",
      "lgpl-3.0",
      "lgpl-3.0-only",
      "lgpl-3.0-or-later",
      "epl-2.0",
      "eupl-1.2",
      "cc-by-4.0"
    ]),
    distributionCopyleft: new Set([
      "gpl-2.0",
      "gpl-2.0-only",
      "gpl-2.0-or-later",
      "gpl-3.0",
      "gpl-3.0-only",
      "gpl-3.0-or-later"
    ]),
    networkCopyleft: new Set(["agpl-3.0", "agpl-3.0-only", "agpl-3.0-or-later", "sspl-1.0", "osl-3.0"]),
    restricted: new Set(["cc-by-nc-4.0"])
  };

  function stableHash(value = "") {
    let hash = 2166136261;
    for (const character of String(value)) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function csvCell(value) {
    let text = String(value ?? "");
    // Test the original type before serializing: a negative measurement is a
    // number, while provider/user text must not become a spreadsheet formula.
    if (typeof value === "string" && /^[\s\x00-\x1f\x7f-\x9f\u200b-\u200f\u202a-\u202e\u2060-\u206f]*[=+\-@]/u.test(text)) {
      text = "'" + text;
    }
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }

  function providerApiUrls(value, options = {}) {
    const raw = String(value || "").trim();
    let url;
    try { url = new URL(raw); } catch { throw new Error("Provider base URL is invalid"); }
    if (!["https:", "http:"].includes(url.protocol)) throw new Error("Provider base URL must use HTTP or HTTPS");
    if (url.username || url.password) throw new Error("Provider base URL must not contain credentials");
    if (/[?#]/.test(raw)) throw new Error("Provider base URL must not contain query or fragment");
    // A full operation URL and a versioned API base select the same API prefix.
    // Keep Node's existing root contract and the browser's /v1 default for
    // roots/unversioned gateways. Explicit versions and operations take priority.
    let prefix = url.pathname.replace(/\/+$/, "");
    const operation = /\/(?:chat\/completions|messages|models\/[^/]+:generateContent)$/i.test(prefix);
    prefix = prefix.replace(/\/(?:chat\/completions|messages)$/i, "");
    prefix = prefix.replace(/\/models\/[^/]+:generateContent$/i, "");
    if (options.browserRoot && !operation && !/\/v\d[\w.-]*$/i.test(prefix)) prefix += "/v1";
    const baseUrl = url.origin + prefix;
    return {baseUrl, modelsUrl: baseUrl + "/models", chatCompletionsUrl: baseUrl + "/chat/completions", messagesUrl: baseUrl + "/messages"};
  }

  function invalidAnalysisError(detail) {
    const error = new Error(`AI analysis is invalid: ${detail}`);
    error.code = "AI_ANALYSIS_INVALID";
    return error;
  }

  function isAnalysisObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === null || Object.getPrototypeOf(prototype) === null;
  }

  function assertAnalysisDelivery(payload) {
    // Inspect only explicit provider failure metadata. Length/max_tokens alone
    // cannot reject a complete and valid business result.
    const rejected = (value) => {
      if (!value || typeof value !== "object") return false;
      if (value.error || value.refusal || value.blocked || value.blockReason || value.blockedReason) return true;
      if (/^(?:error|refusal|blocked)$/i.test(String(value.type || ""))) return true;
      return [value.finish_reason, value.finishReason, value.stop_reason].some(reason =>
        /^(?:refusal|content_filter|safety|recitation|blocked|blocklist|prohibited_content|spii)$/i.test(String(reason || "")));
    };
    const selected = payload?.choices?.[0];
    const candidate = payload?.candidates?.[0];
    const parts = [payload, selected, selected?.message, candidate, payload?.promptFeedback,
      ...(Array.isArray(payload?.content) ? payload.content : []),
      ...(Array.isArray(selected?.message?.content) ? selected.message.content : []),
      ...(Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [])];
    if (parts.some(rejected)) throw invalidAnalysisError("provider returned an error, refusal or blocked result");
  }

  function validateAnalysisResult(parsed) {
    if (!isAnalysisObject(parsed)) throw invalidAnalysisError("expected a business JSON object");
    assertAnalysisDelivery(parsed);
    const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
    const text = (value, field) => {
      if (typeof value !== "string") throw invalidAnalysisError(`${field} must be a string`);
      return value.replace(/\s+/g, " ").trim();
    };
    const summaryFields = ["summary", "verdict", "marketAngle"];
    const texts = {};
    for (const field of summaryFields) if (has(parsed, field)) texts[field] = text(parsed[field], field);
    // Known service/refusal messages are not project conclusions even when a
    // gateway wraps them in a syntactically valid summary field.
    const serviceFailure = /^(?:(?:the )?service (?:is )?)?(?:overloaded|unavailable|too many requests)(?:[.!]?|\s*[,;:]?\s*(?:please )?try again(?: later)?[.!]?)$/i;
    const refusal = /^(?:i (?:cannot|can't|am unable to) (?:assist|help|comply|analy[sz]e)\b|(?:很抱歉[，,\s]*)?(?:我)?无法(?:协助|处理|分析)(?:这个|该|您的)?请求|服务(?:繁忙|过载)[，。!！\s]*请稍后)/i;
    if (Object.values(texts).some(value => serviceFailure.test(value) || refusal.test(value))) throw invalidAnalysisError("provider returned a service or refusal message");
    const meaningful = value => /[\p{L}\p{N}]/u.test(value || "");
    const summary = summaryFields.map(field => texts[field]).find(meaningful) || "";
    if (!summary) throw invalidAnalysisError("a non-empty summary or verdict is required");

    const recommendations = {
      validate: "validate", validation: "validate", continue: "validate", "deep-dive": "validate", deep_dive: "validate",
      watch: "watch", observe: "watch", review: "watch",
      pause: "pause", skip: "pause", hold: "pause", "not-fit": "pause", not_fit: "pause"
    };
    const enumValue = (fields, allowed, fallback) => {
      let selected;
      for (const field of fields) {
        if (!has(parsed, field)) continue;
        const value = text(parsed[field], field).toLowerCase();
        if (!has(allowed, value)) throw invalidAnalysisError(`${field} has an unsupported value`);
        if (selected === undefined) selected = allowed[value];
      }
      return selected === undefined ? fallback : selected;
    };
    const recommendation = enumValue(["recommendation", "decision", "recommendationTag", "suggestion"], recommendations, "watch");
    const riskLevel = enumValue(["riskLevel", "risk"], { low: "low", medium: "medium", high: "high" }, "medium");
    if (has(parsed, "sections") && !isAnalysisObject(parsed.sections)) throw invalidAnalysisError("sections must be an object");
    const sections = parsed.sections || {};
    const aliases = {
      risks: ["biggestRisks", "riskAnalysis"],
      boundaries: ["boundary", "practiceBoundary", "cleanRoom", "reuseBoundary", "cleanRoomBoundary"],
      inspirations: ["practiceIdeas", "reuseIdeas", "developmentPath", "productizationIdeas"],
      validations: ["nextActions", "actions"]
    };
    const list = (value, field, scalarAlias = false) => {
      if (scalarAlias && typeof value === "string") return value.split(/\n+|[；;]/).map(item => item.trim()).filter(Boolean);
      if (!Array.isArray(value) || value.some(item => typeof item !== "string")) throw invalidAnalysisError(`${field} must be a string array`);
      return Array.from(value, item => item.trim()).filter(Boolean);
    };
    const lists = {};
    for (const [field, oldFields] of Object.entries(aliases)) {
      // Validate every explicitly supplied recognized field, even when a higher
      // priority field is present; malformed output must not hide behind aliases.
      const choices = [];
      if (has(sections, field)) choices.push(list(sections[field], `sections.${field}`));
      if (has(parsed, field)) choices.push(list(parsed[field], field));
      for (const old of oldFields) if (has(parsed, old)) choices.push(list(parsed[old], old, true));
      lists[field] = choices.length ? choices[0] : [];
    }
    return { recommendation, riskLevel, summary, verdict: meaningful(texts.verdict) ? texts.verdict : summary, ...lists };
  }

  function normalizeAnalysisContext(context = {}) {
    const methods = ["balanced", "commercial", "cleanRoom", "technical", "niche"];
    const method = String(context.method || "balanced").trim();
    return {
      method: methods.includes(method) ? method : "balanced",
      methodLabel: String(context.methodLabel || "").replace(/\s+/g, " ").trim().slice(0, 80),
      userNeed: String(context.userNeed || "")
        .replace(/[\u0000-\u0008\u000B-\u001F\u007F\u200B-\u200D\uFEFF]/g, "")
        .replace(/<\|[^|]*\|>/g, "").replace(/\s+/g, " ").trim().slice(0, 1000)
    };
  }

  function canonicalJson(value) {
    if (Array.isArray(value)) return `[${value.map(item => canonicalJson(item) ?? "null").join(",")}]`;
    if (value && typeof value === "object") return `{${Object.keys(value).sort()
      .filter(key => value[key] !== undefined).map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
    return JSON.stringify(value);
  }

  function analysisProviderIdentity(provider = {}) {
    // Persist only the endpoint contract, never URL credentials or API keys.
    const url = new URL(String(provider.baseUrl || ""));
    if (url.username || url.password || url.search || url.hash) throw new Error("Analysis provider URL must not contain credentials, query or fragment");
    return { id: String(provider.id || ""), model: String(provider.model || ""), protocol: String(provider.protocol || "openai-compatible"),
      endpoint: url.toString().replace(/\/+$/, "") };
  }

  function createAnalysisTaskInput(body, planId, project, provider, language = "zh") {
    const fullName = String(project?.fullName || body.fullName || "").trim().toLowerCase().slice(0, 240);
    const captured = {};
    for (const field of ["description", "url", "language", "topics", "stars", "forks", "openIssues", "category", "useCase", "licensePolicy", "scores", "scoringVersion", "riskSemantics", "riskDefinitions", "signals", "reasons", "actions", "observationPlanMatches", "observationMatches"]) {
      if (project?.[field] !== undefined) captured[field] = JSON.parse(JSON.stringify(project[field]));
    }
    captured.fullName = fullName;
    return { fullName, ...normalizeAnalysisContext(body), observationPlanId: String(planId || "").trim(),
      analysisRequest: { version: 1, project: captured, provider: analysisProviderIdentity(provider), language } };
  }

  function analysisTaskIdentity(input = {}) {
    const request = input.analysisRequest;
    if (request?.version !== 1 || !input.observationPlanId || !input.fullName ||
        request.project?.fullName !== input.fullName || !request.provider?.id || !request.provider?.endpoint) return "";
    return canonicalJson({ fullName: input.fullName, ...normalizeAnalysisContext(input),
      observationPlanId: input.observationPlanId, analysisRequest: request });
  }

  function analysisTaskKey(input) {
    return `analysis:${input.observationPlanId}:${input.fullName}:${stableHash(analysisTaskIdentity(input))}`;
  }

  function externalSignalOutcome(value, source = "", fullName = "") {
    const diagnostic = error => {
      const status = Number(error?.httpStatus ?? error?.status);
      return { source: String(error?.source || source), fullName: String(error?.fullName || fullName),
        httpStatus: Number.isFinite(status) && status >= 100 && status <= 599 ? status : 0,
        code: String(error?.code || ""), message: String(error?.message || error?.content || error || "External enrichment failed").slice(0, 500) };
    };
    const errors = Array.isArray(value?.errors) ? value.errors.map(diagnostic) : [];
    const entries = Array.isArray(value) ? value : Array.isArray(value?.signals) ? value.signals : [];
    const signals = [];
    for (const signal of entries) {
      if (!signal || typeof signal !== "object" || Array.isArray(signal) || !String(signal.source || "").trim()) continue;
      const provider = String(signal.source).toLowerCase();
      const legacyFailure = ["tavily", "exa"].includes(provider) &&
        String(signal.title || "").toLowerCase() === `${provider} enrichment failed` && !signal.url && signal.score === 0;
      if (legacyFailure || signal.status === "error") errors.push(diagnostic(signal));
      else signals.push(signal);
    }
    if (value?.status === "error") {
      signals.length = 0;
      if (!errors.length) errors.push(diagnostic(value));
    }
    const uniqueErrors = Array.from(new Map(errors.map(error => [JSON.stringify(error), error])).values());
    return { status: uniqueErrors.length ? signals.length ? "partial" : "error" : value == null || value.status === "skipped" ? "skipped" : "success",
      signals, errors: uniqueErrors };
  }

  function githubWatchers(repository = {}) {
    const value = repository.subscribers_count;
    const known = Number.isInteger(value) && value >= 0;
    return { watchers: known ? value : null, watchersSource: known ? "github-subscribers" : "unknown", watchersStatus: known ? "known" : "unknown" };
  }

  function watcherFact(project = {}) {
    if (project.watchersSource === "github-subscribers" && Number.isInteger(project.watchers) && project.watchers >= 0) {
      return { watchers: project.watchers, watchersSource: "github-subscribers", watchersStatus: "known" };
    }
    const legacy = project.watchersSource === "legacy-unknown" || project.watchersStatus === "legacy" ||
      (!project.watchersSource && project.watchers !== undefined && project.watchers !== null);
    return { watchers: null, watchersSource: legacy ? "legacy-unknown" : "unknown", watchersStatus: legacy ? "legacy" : "unknown" };
  }

  function measurementTime(value) {
    if (typeof value !== "string") return NaN;
    const parts = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i.exec(value);
    if (!parts) return NaN;
    const calendar = new Date(0);
    calendar.setUTCFullYear(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
    if (calendar.getUTCFullYear() !== Number(parts[1]) || calendar.getUTCMonth() + 1 !== Number(parts[2]) || calendar.getUTCDate() !== Number(parts[3])) return NaN;
    return Date.parse(value);
  }

  function measurementCount(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }

  function describeTrend(trend = {}) {
    trend = trend && typeof trend === "object" ? trend : {};
    const source = String(trend.source || "");
    let start = measurementTime(trend.intervalStart);
    let end = measurementTime(trend.intervalEnd);
    const daily = source === "github-online" && trend.period === "previous-day-online";
    // Only the existing online-event contract proves a legacy date is a UTC
    // day. A browser snapshot date never proves the start of its interval.
    if (daily && trend.cached !== false && !trend.pending && !trend.intervalStart && !trend.intervalEnd && /^\d{4}-\d{2}-\d{2}$/.test(trend.date || "")) {
      start = Date.parse(`${trend.date}T00:00:00.000Z`);
      if (Number.isFinite(start) && new Date(start).toISOString().slice(0, 10) === trend.date) end = start + 86400000;
    }
    const windowKnown = Number.isFinite(start) && Number.isFinite(end) && start < end;
    const utcDay = daily && windowKnown && end - start === 86400000 && start % 86400000 === 0;
    const usable = windowKnown && !trend.error && !trend.unavailable && !trend.pending && trend.cached !== false;
    const stars = usable ? measurementCount(trend.stars) : null;
    const forks = usable ? measurementCount(trend.forks) : null;
    return {
      source, kind: utcDay ? "utc-day-events" : source === "github-browser-snapshots" || source === "github-snapshots" ? "snapshot-net-change" : "observed-change",
      windowKnown, intervalStart: windowKnown ? new Date(start).toISOString() : "",
      intervalEnd: windowKnown ? new Date(end).toISOString() : "", durationMs: windowKnown ? end - start : null,
      stars, forks, complete: usable && stars !== null && forks !== null && trend.complete !== false && trend.starsComplete !== false && trend.forksComplete !== false
    };
  }

  function snapshotTrend(previous, current, scannedAt) {
    let baseline = previous;
    let start = measurementTime(previous?.lastSeenAt);
    const end = measurementTime(scannedAt);
    let fallbackPoints = [];
    if (previous && !previous.lastSeenAt) {
      // A fallback timestamp must travel with the counts observed at that time.
      fallbackPoints = (Array.isArray(previous.snapshots) ? previous.snapshots : []).map(point => ({point,at:measurementTime(point?.at)}))
        .filter(item => Number.isFinite(item.at) && item.at < end).sort((a, b) => b.at - a.at);
      baseline = fallbackPoints[0]?.point;
      start = fallbackPoints[0]?.at;
    }
    const valid = Boolean(baseline) && Number.isFinite(start) && Number.isFinite(end) && start < end;
    const count = value => Number.isInteger(value) && value >= 0;
    const delta = field => valid && count(baseline[field]) && count(current?.[field]) && fallbackPoints.every(item => item.at !== start || item.point[field] === baseline[field])
      ? current[field] - baseline[field] : null;
    const stars = delta("stars");
    const forks = delta("forks");
    return { source:"github-browser-snapshots", period:"since-previous-scan", date:Number.isFinite(end) ? new Date(end).toISOString().slice(0, 10) : "",
      intervalStart:valid ? new Date(start).toISOString() : "", intervalEnd:valid ? new Date(end).toISOString() : "",
      stars, forks, complete:valid && stars !== null && forks !== null,
      status:valid ? "measured" : previous ? "unknown" : "baseline", cached:true, pending:false };
  }

  function snapshotGrowth(project, days, reference = Date.now()) {
    const endLimit = typeof reference === "number" ? reference : measurementTime(reference);
    const cutoff = endLimit - days * 86400000;
    // Use observations inside the requested rolling period. A lone current
    // observation plus a month-old baseline cannot prove a daily growth bonus.
    const snapshots = (Array.isArray(project.snapshots) ? project.snapshots : []).map(point => ({point,at:measurementTime(point?.at)}))
      .filter(item => Number.isFinite(item.at) && item.at >= cutoff && item.at <= endLimit).sort((a, b) => a.at - b.at);
    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];
    const valid = first && last && first.at < last.at;
    const count = value => Number.isInteger(value) && value >= 0;
    const delta = field => valid && count(first.point[field]) && count(last.point[field]) && snapshots.every(item =>
      (item.at !== first.at || item.point[field] === first.point[field]) && (item.at !== last.at || item.point[field] === last.point[field])) ? last.point[field] - first.point[field] : null;
    const measurement = describeTrend({ source:"github-snapshots", intervalStart:valid ? first.point.at : "", intervalEnd:valid ? last.point.at : "", stars:delta("stars"), forks:delta("forks") });
    return { ...measurement, requestedDays:days, periodCoverage:measurement.windowKnown ? "observed-interval" : "unknown" };
  }

  function normalizedId(value = "") {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72);
  }

  function normalizedQuery(value = "") {
    return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function legacyProfileKey(planId, index, query) {
    const keyBase = `${planId}-${index}-${String(query || "").replace(/\s+/g, " ").trim()}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 64);
    return `plan-${keyBase || index}`;
  }

  function explicitProfileId(item = {}) {
    return normalizedId(item.profileId || item.profileKey || item.id || item.key || "");
  }

  function assignProfileIds(planId = "default", queries = [], previousQueries = []) {
    const prior = (Array.isArray(previousQueries) ? previousQueries : []).map((item, index) => ({
      ...item,
      profileId: explicitProfileId(item) || legacyProfileKey(planId, index, item?.query || item?.q || "")
    }));
    const priorByQuery = new Map(prior.map((item) => [normalizedQuery(item.query || item.q), item]).filter(([key]) => key));
    const priorByLabel = new Map(
      prior
        .map((item) => [normalizedQuery(item.labelZh || item.label || item.labelEn || item.name), item])
        .filter(([key]) => key)
    );
    const used = new Set();

    return (Array.isArray(queries) ? queries : []).map((source, index) => {
      const item = typeof source === "string" ? { label: source, query: source } : { ...(source || {}) };
      const query = String(item.query || item.q || "").replace(/\s+/g, " ").trim();
      const label = String(item.labelZh || item.label || item.labelEn || item.name || query).trim();
      const matched = priorByQuery.get(normalizedQuery(query)) || priorByLabel.get(normalizedQuery(label)) || prior[index];
      const generated = `profile-${normalizedId(planId) || "default"}-${stableHash(`${label}|${query}`)}`;
      let profileId = explicitProfileId(item) || explicitProfileId(matched) || generated;
      if (used.has(profileId)) profileId = `${profileId.slice(0, 60)}-${stableHash(`${query}|${index}`)}`;
      used.add(profileId);
      return { ...item, profileId };
    });
  }

  function profileEvidence(profile = {}) {
    const key = normalizedId(profile.profileId || profile.profileKey || profile.key || profile.id || "");
    if (!key) return null;
    return {
      key,
      label: String(profile.labelZh || profile.label || profile.labelEn || "").slice(0, 120),
      query: String(profile.query || profile.q || "").slice(0, 720)
    };
  }

  function mergeProfileMatches(...groups) {
    const matches = new Map();
    for (const group of groups) {
      const entries = Array.isArray(group) ? group : group ? [group] : [];
      for (const entry of entries) {
        const normalized = profileEvidence(entry);
        if (!normalized) continue;
        matches.set(normalized.key, { ...(matches.get(normalized.key) || {}), ...normalized });
      }
    }
    return Array.from(matches.values());
  }

  function projectProfileMatches(project = {}, planId = "") {
    const planMatch = planId ? project.observationPlanMatches?.[planId] || project.observationMatches?.[planId] : null;
    if (planMatch) {
      return mergeProfileMatches(
        planMatch.profileMatches,
        planMatch.profileKey ? { key: planMatch.profileKey, label: planMatch.profileLabel || "" } : null
      );
    }
    return mergeProfileMatches(
      project.profileMatches,
      project.profileKey ? { key: project.profileKey, label: project.profileLabel || "" } : null
    );
  }

  // Words that carry no domain meaning on their own. They must never act as the
  // relevance anchor of a generated query, otherwise broad profile words like
  // "tool" or "web" pull unrelated repositories into a focused plan pool.
  const PLAN_ANCHOR_STOP_WORDS = new Set([
    "a",
    "an",
    "and",
    "api",
    "apis",
    "app",
    "application",
    "apps",
    "archived",
    "automation",
    "basic",
    "bot",
    "cli",
    "client",
    "code",
    "console",
    "converter",
    "created",
    "dashboard",
    "data",
    "database",
    "demo",
    "description",
    "editor",
    "engine",
    "exchange",
    "extension",
    "extensions",
    "false",
    "fast",
    "for",
    "fork",
    "forks",
    "framework",
    "frameworks",
    "general",
    "generator",
    "github",
    "gui",
    "in",
    "integration",
    "kit",
    "keyword",
    "keywords",
    "language",
    "library",
    "libraries",
    "license",
    "manager",
    "management",
    "misc",
    "mirror",
    "modern",
    "name",
    "new",
    "not",
    "open",
    "or",
    "other",
    "platform",
    "plugin",
    "plugins",
    "portal",
    "profile",
    "profiles",
    "project",
    "projects",
    "pushed",
    "query",
    "queries",
    "readme",
    "release",
    "releases",
    "repository",
    "repositories",
    "result",
    "results",
    "script",
    "scripts",
    "sdk",
    "search",
    "server",
    "service",
    "services",
    "simple",
    "software",
    "source",
    "starter",
    "starters",
    "stars",
    "suite",
    "support",
    "system",
    "systems",
    "template",
    "templates",
    "term",
    "terms",
    "the",
    "to",
    "tool",
    "tools",
    "topic",
    "topics",
    "true",
    "ui",
    "ux",
    "version",
    "viewer",
    "web",
    "workflow",
    "workflows",
    "young",
    "项目",
    "工具",
    "平台",
    "软件",
    "系统",
    "应用",
    "服务",
    "领域",
    "方向",
    "相关",
    "开源",
    "方案",
    "观察",
    "监控",
    "插件",
    "自动化",
    "工作流",
    "管理",
    "开发",
    "设计",
    "生成",
    "查询",
    "检索",
    "搜索",
    "核心",
    "主题",
    "标签",
    "关键词",
    "词表",
    "条目",
    "列表",
    "近期",
    "最新",
    "热门",
    "精选",
    "推荐",
    "汇总",
    "合集",
    "大型",
    "小型",
    "快速",
    "现代",
    "简单",
    "基础",
    "通用",
    "其他",
    "本次"
  ]);

  // Labels such as "抖音核心锚点" or "Douyin core anchor" describe the shape of
  // a generated query, not the domain. They must never become anchors, or every
  // repository that happens to talk about a "core" or an "anchor" passes.
  const PLAN_ANCHOR_LABEL_WORDS = new Set([
    "锚点",
    "核心锚点",
    "anchor",
    "anchors",
    "core",
    "entity",
    "entities",
    "subject",
    "alias",
    "aliases",
    "label",
    "labels"
  ]);

  // Capability words describe what a repository does, not which domain it
  // belongs to. A query such as "douyin downloader" has to be proven by
  // "douyin"; "downloader" on its own may never admit a repository.
  const PLAN_INTENT_WORDS = new Set([
    "analyzer",
    "analyzers",
    "collector",
    "collectors",
    "comment",
    "comments",
    "convert",
    "converter",
    "converters",
    "crawl",
    "crawler",
    "crawlers",
    "crawling",
    "danmaku",
    "download",
    "downloader",
    "downloaders",
    "downloads",
    "extract",
    "extractor",
    "extractors",
    "fetch",
    "fetcher",
    "migrate",
    "parse",
    "parser",
    "parsers",
    "parsing",
    "remover",
    "reverse",
    "scrape",
    "scraper",
    "scrapers",
    "scraping",
    "stream",
    "streaming",
    "streams",
    "sync",
    "tracker",
    "tracking",
    "watermark",
    "watermarks"
  ]);

  const LOW_VALUE_CONTAINER_TOPIC_RE = /\b(awesome|awesome-list|awesome-lists|resources?|resource-list|book|books|tutorials?)\b/i;
  const LOW_VALUE_CONTAINER_TEXT_RE =
    /(^|[\/\s_-])awesome[-_\s]|professional[-_\s]+complete[-_\s]+edition|\b(config files for my github profile|github profile|profile readme|awesome list|curated list|curated.+resources?|resource hub|reference hub|free assets|book list|pdf download|tools assets and tutorials|crack|activation|license key|serial key|do not use|stick to upstream|oiledmachine overlay)\b|个人收藏书籍|电子书下载|pdf下载|百度云|不限速下载/i;

  function normalizePlanSearchText(value = "") {
    return String(value || "")
      // Compound repository names such as `DouyinLiveWebFetcher` carry the
      // domain anchor as a whole word; splitting camelCase keeps that match
      // while arbitrary substrings (`mydouyincopy`) stay unmatched.
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .toLowerCase()
      .replace(/[_./-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function compactPlanSearchText(value = "") {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "");
  }

  function escapeRegExp(value = "") {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function planTextMatches(text = "", term = "") {
    const cleanText = normalizePlanSearchText(text);
    const cleanTerm = normalizePlanSearchText(String(term || "").replace(/^["“]|["”]$/g, ""));
    if (!cleanText || !cleanTerm) return false;
    if (cleanTerm.includes(" ")) {
      if (cleanText.includes(cleanTerm)) return true;
      const compactTerm = compactPlanSearchText(cleanTerm);
      return compactTerm.length >= 4 && compactPlanSearchText(cleanText).includes(compactTerm);
    }
    if (/[\u4e00-\u9fa5]/.test(cleanTerm)) return cleanText.includes(cleanTerm);
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(cleanTerm)}($|[^a-z0-9])`).test(cleanText);
  }

  function anchorWordCandidates(value = "") {
    return String(value || "").match(/[A-Za-z0-9][A-Za-z0-9.+#-]{1,40}|[\u4e00-\u9fa5]{2,16}/g) || [];
  }

  // Positive part of a query: GitHub qualifiers, negated terms (`NOT x`, `-x`)
  // and boolean operators are removed before any anchor is derived. A negated
  // anti-noise term such as `NOT awesome` can therefore never act as an anchor.
  function planPositiveQueryText(query = "") {
    return String(query || "")
      .replace(/\bNOT\b\s+(?:"[^"]*"|\([^)]*\)|\S+)/gi, " ")
      .replace(/(^|\s)-(?:"[^"]*"|\S+)/g, " ")
      .replace(/\b(?:archived|mirror|stars|pushed|created|language|license|topic|topics|fork|forks|size|followers):[^\s]+/gi, " ")
      .replace(/\bin:[^\s]+/gi, " ")
      .replace(/\b(?:AND|OR|NOT)\b/gi, " ")
      .replace(/[()]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Extract the domain anchors a single query must prove before its results may
  // enter the pool. Anchors are core entities only: the subject of the query
  // plus any plan/label identity term it mentions. Capability words ("downloader",
  // "crawler") and negated terms are deliberately excluded so a broad capability
  // can never widen a focused plan.
  function planAnchorTerms(query = "", labels = [], options = {}) {
    const limit = Math.max(1, Math.min(64, Number(options.limit || 16)));
    const includeIntent = Boolean(options.includeIntent);
    const usable = (term) => {
      if (!term) return false;
      const key = String(term).trim().toLowerCase();
      if (!key || /^\d+$/.test(key)) return false;
      if (PLAN_ANCHOR_STOP_WORDS.has(key) || PLAN_ANCHOR_LABEL_WORDS.has(key)) return false;
      if (!includeIntent && PLAN_INTENT_WORDS.has(key)) return false;
      return Array.from(String(term).trim()).length >= 2;
    };

    const positive = planPositiveQueryText(query);
    const phrases = Array.from(positive.matchAll(/"([^"]{2,80})"/g)).map((match) => match[1]);
    const words = anchorWordCandidates(positive.replace(/"[^"]+"/g, " "));
    const queryTerms = [...phrases, ...words].map((term) => String(term).trim()).filter(Boolean);
    const labelTerms = (Array.isArray(labels) ? labels : [labels])
      .filter(Boolean)
      .flatMap((value) => anchorWordCandidates(value))
      .map((term) => String(term).trim())
      .filter(Boolean);

    const identity = new Set(labelTerms.map((term) => term.toLowerCase()));
    const picked = [];
    const push = (term) => {
      const key = String(term).trim().toLowerCase();
      if (!key || picked.some((item) => item.toLowerCase() === key)) return;
      picked.push(String(term).trim());
    };

    if (queryTerms.length) {
      // 1. Query terms that also name the plan or one of its confirmed aliases.
      for (const term of queryTerms) {
        if (identity.has(term.toLowerCase()) && usable(term)) push(term);
      }
      // 2. Otherwise the subject of the query carries the anchor on its own.
      if (!picked.length) {
        const subject = queryTerms.find((term) => usable(term));
        if (subject) push(subject);
      }
    } else {
      for (const term of labelTerms) {
        if (usable(term)) push(term);
      }
    }
    return picked.slice(0, limit);
  }

  function repositoryPlanText(repo = {}) {
    return [
      repo.fullName || repo.full_name,
      repo.name,
      repo.owner?.login || repo.owner,
      repo.description,
      repo.homepage,
      ...(Array.isArray(repo.topics) ? repo.topics : [])
    ]
      .filter(Boolean)
      .join(" ");
  }

  function isLowValuePlanContainer(repo = {}) {
    const owner = normalizePlanSearchText(typeof repo.owner === "string" ? repo.owner : repo.owner?.login || "");
    const name = normalizePlanSearchText(repo.name);
    const description = String(repo.description || "");
    const topics = Array.isArray(repo.topics) ? repo.topics.join(" ") : String(repo.topics || "");
    const text = `${repo.fullName || repo.full_name || ""} ${repo.name || ""} ${description} ${topics}`;

    if (owner && name && owner === name && /config files for my github profile|github profile/i.test(description)) {
      return true;
    }
    if (description.length > 1000) return true;
    return LOW_VALUE_CONTAINER_TOPIC_RE.test(topics) || LOW_VALUE_CONTAINER_TEXT_RE.test(text);
  }

  // Relevance gate shared by the server scan and the browser scan. A generated
  // profile without a verifiable anchor fails closed so unrelated repositories
  // can never be accepted just because a broad word happened to match.
  function repositoryMatchesPlanAnchors(repo = {}, anchors = []) {
    const terms = (Array.isArray(anchors) ? anchors : []).map((term) => String(term || "").trim()).filter(Boolean);
    if (!terms.length) return false;
    const text = repositoryPlanText(repo);
    return terms.some((term) => planTextMatches(text, term));
  }

  // Controlled relaxation for niche domains: drop only popularity/recency
  // limiters. Scope, archive state, and every anti-noise exclusion stay intact.
  function relaxPlanQuery(query = "") {
    return String(query || "")
      .replace(/(^|\s)(?:stars|pushed|created):\S+/gi, "$1")
      .replace(/\s+/g, " ")
      .trim();
  }

  // The saved query is the contract the user reviews and the scan executes.
  // Completion only fills in missing GitHub qualifiers so a hand-written or
  // imported plan cannot silently widen its results. Popularity, recency, and
  // anti-noise conditions the plan declared are never removed here.
  function completePlanQuery(query = "") {
    const clean = String(query || "").replace(/\s+/g, " ").trim();
    if (!clean) return "";
    return [
      clean,
      // A narrowed scope such as in:name is intentional and is never widened or
      // repeated. Only a query with no scope at all receives the standard
      // product scope, because GitHub rejects a repeated in: qualifier.
      /\bin:/i.test(clean) ? "" : "in:name,description,readme",
      /\barchived:/i.test(clean) ? "" : "archived:false",
      /\bmirror:/i.test(clean) ? "" : "mirror:false"
    ]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function classifyLicensePolicy(license) {
    const rawKey = license?.spdxId || license?.spdx_id || license?.key || "NOASSERTION";
    const key = String(rawKey || "NOASSERTION").toLowerCase();
    const name = license?.name || rawKey || "No license detected";
    const result = (bucket, label, labelZh, risk, practiceBoundary, practiceBoundaryZh, note) => ({
      key,
      name,
      bucket,
      label,
      labelZh,
      labelEn: label,
      risk,
      practiceBoundary,
      practiceBoundaryZh,
      note
    });

    if (!license || key === "noassertion" || key === "other") {
      return result(
        "unknown-no-license",
        "No license: monitor only",
        "无许可：仅监控",
        82,
        "Monitor and study direction only. Do not copy, modify, or redistribute code before legal review.",
        "只能监控和研究方向。未经人工确认前不要复制、修改或分发代码。",
        "No recognized SPDX license was detected. GitHub public visibility does not grant reuse rights."
      );
    }
    if (LICENSE_GROUPS.permissive.has(key)) {
      return result(
        "permissive-commercial",
        "Low-friction license",
        "低摩擦许可",
        14,
        "Deeper adoption is usually practical with notice preservation.",
        "通常便于深入采用或集成，但要保留版权声明和许可文本。",
        "Keep copyright notices and license text."
      );
    }
    if (LICENSE_GROUPS.conditional.has(key)) {
      return result(
        "conditional-commercial",
        "License with obligations",
        "需履约许可",
        46,
        "Use with architectural separation and license-specific obligations.",
        "可以考虑深入采用，但要按许可证履约，尤其注意文件级开源、链接、署名或再分发义务。",
        "Use may be possible, but redistribution obligations need review."
      );
    }
    if (LICENSE_GROUPS.distributionCopyleft.has(key)) {
      return result(
        "distribution-copyleft",
        "Distribution may require source release",
        "分发需开源",
        70,
        "Distribution may require source release; review obligations before deeper adoption.",
        "如果分发衍生软件，通常要承担同许可证开源义务；深入采用前需复核边界。",
        "Treat as high-friction for closed-source distribution."
      );
    }
    if (LICENSE_GROUPS.networkCopyleft.has(key)) {
      return result(
        "network-copyleft",
        "SaaS source-release risk",
        "SaaS 高风险",
        88,
        "Monitor and study behavior first. Avoid service wrapping without legal review.",
        "网络服务也可能触发源码开放义务。适合先监控和研究，不宜未经复核直接封装服务。",
        "Network copyleft is high-friction for hosted services."
      );
    }
    if (LICENSE_GROUPS.restricted.has(key)) {
      return result(
        "restricted-noncommercial",
        "Restricted use",
        "受限用途",
        90,
        "Monitor only unless the exact license grants your intended use.",
        "默认仅监控。除非人工确认许可允许你的用途，否则不要深入采用。",
        "Some intended uses may be prohibited or restricted."
      );
    }
    return result(
      "manual-review",
      "Manual review first",
      "先人工复核",
      58,
      "Monitor and review exact license text before copying or redistributing.",
      "可以监控，但复制、修改或分发前必须人工阅读完整许可文本。",
      "Recognized as a license, but not in the low-risk allowlist."
    );
  }

  function riskLevel(project = {}) {
    const risk = projectRisk(project);
    if (risk === null) return "unknown";
    if (risk >= 60) return "critical";
    if (risk >= 35) return "high";
    if (risk >= 15) return "medium";
    return "low";
  }

  const SCORING_VERSION = "starvault-node-v1";
  const LEADERBOARD_VERSION = "starvault-node-board-v1";
  const RISK_SEMANTICS = "project-license-action-v1";

  function scoreVersion(project = {}) {
    const value = project.scoringVersion;
    return typeof value === "string" && value.trim() ? value.trim() : "unknown";
  }

  function scoreVersionCompare(a, b) {
    const left = scoreVersion(a), right = scoreVersion(b);
    if (left === right) return 0;
    if (left === SCORING_VERSION) return -1;
    if (right === SCORING_VERSION) return 1;
    if (left === "unknown") return 1;
    if (right === "unknown") return -1;
    return left.localeCompare(right);
  }

  function compareScoredProjects(a, b, compare = () => 0) {
    const group = scoreVersionCompare(a, b);
    if (group) return group;
    if (scoreVersion(a) === SCORING_VERSION) {
      const result = compare(a, b);
      if (Number.isFinite(result) && result) return result;
    }
    return Number(b.stars || 0) - Number(a.stars || 0) || String(a.fullName || "").localeCompare(String(b.fullName || ""));
  }

  function scoreGroups(projects = []) {
    const groups = new Map();
    for (const project of projects) {
      const version = scoreVersion(project);
      if (!groups.has(version)) groups.set(version, []);
      groups.get(version).push(project);
    }
    return Array.from(groups, ([scoringVersion, items]) => ({ scoringVersion, items }))
      .sort((a, b) => scoreVersionCompare(a, b));
  }

  function appendScoreSnapshot(history = [], entry) {
    const combined = [...history, entry];
    const version = scoreVersion(entry);
    const sameVersion = combined.filter(point => scoreVersion(point) === version);
    const retained = new Set(sameVersion.slice(-180));
    // Retention applies to the new version only: a first new scan must not
    // discard historical observations belonging to another scoring contract.
    return combined.filter(point => scoreVersion(point) !== version || retained.has(point));
  }

  function scoreHistoryAfterUpdate(previous, project, at) {
    const history = [...(previous?.scoreHistory || [])];
    if (previous?.scores && (scoreVersion(previous) !== scoreVersion(project) ||
        (previous.riskSemantics || "unknown") !== (project.riskSemantics || "unknown"))) {
      history.push({ at: previous.lastSeenAt || previous.firstSeenAt || at,
        scoringVersion: scoreVersion(previous), riskSemantics: previous.riskSemantics || "unknown",
        riskDefinitions: previous.riskDefinitions, scores: JSON.parse(JSON.stringify(previous.scores)) });
    }
    return history;
  }

  function selectLeaderboardProjects(projects, limit) {
    const selected = [];
    const ranked = projects.slice().sort((a, b) => compareScoredProjects(a, b, (left, right) =>
      right._leaderboardScore - left._leaderboardScore || (right.scores?.opportunity || 0) - (left.scores?.opportunity || 0)));
    for (const versionGroup of scoreGroups(ranked)) {
      if (selected.length >= limit) break;
      if (versionGroup.scoringVersion !== SCORING_VERSION) {
        selected.push(...versionGroup.items.slice(0, limit - selected.length));
        continue;
      }
      const grouped = new Map();
      for (const project of versionGroup.items) {
        const key = project.useCase?.key || project.category?.key || "other";
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(project);
      }
      const groups = Array.from(grouped.values()).sort((a, b) => compareScoredProjects(a[0], b[0], (left, right) => right._leaderboardScore - left._leaderboardScore));
      for (let round = 0; selected.length < limit; round++) {
        let progressed = false;
        for (const group of groups) {
          if (group[round]) { selected.push(group[round]); progressed = true; }
          if (selected.length >= limit) break;
        }
        if (!progressed) break;
      }
    }
    return selected;
  }

  function projectRisk(project = {}) {
    const value = project.scores?.risk;
    return project.riskSemantics === RISK_SEMANTICS && typeof value === "number" && Number.isFinite(value) ? value : null;
  }

  function comparableRankChange(project, previous, rank) {
    return previous && scoreVersion(project) === SCORING_VERSION && scoreVersion(project) === scoreVersion(previous) &&
      project.leaderboardVersion && project.leaderboardVersion === previous.leaderboardVersion &&
      Number.isInteger(previous.rank) && Number.isInteger(rank) ? previous.rank - rank : null;
  }

  function leaderboardScore(project, period = "daily", memoryBoost = 0, reference = Date.now()) {
    if (scoreVersion(project) !== SCORING_VERSION) return null;
    const days = { daily: 1, weekly: 7, monthly: 30, all: 3650 }[period] || 1;
    const growth = snapshotGrowth(project, days, reference);
    const starDelta = Math.max(0, growth.stars ?? 0), forkDelta = Math.max(0, growth.forks ?? 0);
    const agentNoise = Number(project.signals?.productFit?.abstractAgentPenalty || 0);
    const trendingBoost = Math.min(8, (project.signals?.githubTrending || []).reduce((score, signal) => {
      const periodWeight = { daily: 3.2, weekly: 2.1, monthly: 1.4 }[signal.period] || 1.2;
      return score + periodWeight + Math.max(0, 26 - Number(signal.rank || 26)) / 12;
    }, 0));
    const base = (project.scores?.opportunity || 0) * 0.42 + (project.scores?.productization || 0) * 0.22 +
      (project.scores?.actionability || 0) * 0.22 + (project.scores?.momentum || 0) * 0.14 -
      (project.scores?.overallRisk || 0) * 0.16 - agentNoise * 0.2;
    const trend = Math.min(25, Math.log10(starDelta + 1) * 9 + Math.log10(forkDelta + 1) * 5);
    return Math.round(Math.max(0, base + trend + trendingBoost + memoryBoost));
  }

  function memoryScore(project = {}, memory = {}) {
    const category = project.category?.key || "other";
    const useCase = project.useCase?.key || "other";
    const language = project.language || "unknown";
    const license = project.licensePolicy?.bucket || "unknown-no-license";
    const risk = riskLevel(project);
    const preferences = memory.preferences || {};
    const negative = memory.negativePreferences || {};
    const positive =
      Number(preferences.categories?.[category] || 0) * 2 +
      Number(preferences.useCases?.[useCase] || 0) * 2.6 +
      Number(preferences.languages?.[language] || 0) * 0.95 +
      Number(preferences.licenses?.[license] || 0) * 0.75 +
      Number(preferences.riskLevels?.[risk] || 0) * 0.55;
    const repositoryPenalty = Number(
      negative.repositories?.[project.fullName] || 0
    );
    const penalty =
      Number(negative.categories?.[category] || 0) * 2.25 +
      Number(negative.useCases?.[useCase] || 0) * 2.9 +
      Number(negative.languages?.[language] || 0) * 0.8 +
      Number(negative.licenses?.[license] || 0) * 0.65 +
      Number(negative.riskLevels?.[risk] || 0) * 0.55 +
      repositoryPenalty * 3.2;
    const ratio = Number(memory.antiBubble?.explorationRatio ?? 0.25);
    const personalWeight = Math.max(0.55, Math.min(0.95, 1 - ratio * 0.35));
    return Math.max(-28, Math.min(36, (positive - penalty) * personalWeight));
  }

  return {
    SCORING_VERSION,
    LEADERBOARD_VERSION,
    RISK_SEMANTICS,
    scoreVersion,
    scoreVersionCompare,
    compareScoredProjects,
    scoreGroups,
    appendScoreSnapshot,
    scoreHistoryAfterUpdate,
    selectLeaderboardProjects,
    projectRisk,
    comparableRankChange,
    leaderboardScore,
    providerApiUrls,
    csvCell,
    assertAnalysisDelivery,
    validateAnalysisResult,
    externalSignalOutcome,
    githubWatchers,
    watcherFact,
    describeTrend,
    snapshotTrend,
    snapshotGrowth,
    analysisProviderIdentity,
    analysisTaskIdentity,
    analysisTaskKey,
    createAnalysisTaskInput,
    normalizeAnalysisContext,
    assignProfileIds,
    classifyLicensePolicy,
    compactPlanSearchText,
    completePlanQuery,
    escapeRegExp,
    isLowValuePlanContainer,
    legacyProfileKey,
    memoryScore,
    mergeProfileMatches,
    normalizePlanSearchText,
    normalizedId,
    planAnchorTerms,
    planIntentWords: () => Array.from(PLAN_INTENT_WORDS),
    planPositiveQueryText,
    planTextMatches,
    profileEvidence,
    projectProfileMatches,
    relaxPlanQuery,
    repositoryMatchesPlanAnchors,
    repositoryPlanText,
    riskLevel,
    stableHash
  };
});
