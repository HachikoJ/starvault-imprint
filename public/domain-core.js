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
    const risk = Number(project.scores?.risk ?? project.scores?.overallRisk ?? project.licensePolicy?.risk ?? 0);
    if (risk >= 60) return "critical";
    if (risk >= 35) return "high";
    if (risk >= 15) return "medium";
    return "low";
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
      negative.repositories?.[project.fullName] || negative.repositories?.[String(project.fullName || "").toLowerCase()] || 0
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
