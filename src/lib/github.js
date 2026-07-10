const { fetchWithRetries, parseRetryAfter, defaultRetryDelay } = require("./http-client");

function dateDaysAgo(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function planWords(value) {
  return Array.isArray(value)
    ? value
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    : String(value || "")
        .split(/[,，;\n]/)
        .map((item) => item.trim())
        .filter(Boolean);
}

function quoteSearchTerm(term = "") {
  const clean = String(term || "").trim();
  if (!clean) return "";
  return /\s/.test(clean) && !/^".*"$/.test(clean) ? `"${clean.replaceAll('"', "")}"` : clean;
}

function escapeRegExp(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const GENERIC_CHINESE_PLAN_TERMS = new Set(["方案名称", "详细需求", "历史需求", "相关", "项目", "开源", "工具", "平台", "软件", "系统", "应用", "服务", "领域", "方向", "观察"]);
const GENERIC_SHORT_ALIAS_TERMS = new Set(["ai", "ml", "api", "sdk", "mcp", "rpa", "cli", "gui", "web", "bot", "ocr", "ui", "ux", "ios"]);

function chinesePlanTerms(text = "", limit = 12) {
  const matches = String(text || "").match(/[\u4e00-\u9fa5][\u4e00-\u9fa5A-Za-z0-9+#.-]{1,15}/g) || [];
  return Array.from(
    new Set(
      matches
        .map((term) =>
          term
            .replace(/^(方案名称|详细需求|历史需求|相关的?|关于|有关|寻找|关注|监控|发现|检索|收集|生成|观察)/, "")
            .replace(/^(方案名称|详细需求|历史需求)/, "")
            .replace(/(相关的?|开源项目|开源|项目|工具|平台|软件|系统|应用|服务|领域|方向)+$/g, "")
            .trim()
        )
        .filter((term) => {
          const size = Array.from(term).length;
          if (size < 2 || size > 8 || GENERIC_CHINESE_PLAN_TERMS.has(term)) return false;
          return !/(软件|工具|平台|系统|服务|项目|领域|方向|方案|应用|插件|模板|工作流|设计|开发|管理|分析|生成|编辑|剪辑)$/.test(term);
        })
    )
  ).slice(0, limit);
}

function explicitPlanTerms(plan = {}) {
  const strategy = plan.searchLogic || plan.strategy || {};
  const requestedTerms = [plan.name, plan.nameEn]
    .concat(planWords(strategy.keywords || strategy.focusTerms || []))
    .map((term) => String(term || "").replace(/^['"“”]|['"“”]$/g, "").trim())
    .filter(Boolean);
  const requestedSet = new Set(requestedTerms.map((term) => term.toLowerCase()));
  const primaryText = [plan.name, plan.nameEn]
    .concat(Array.isArray(plan.requirements) ? plan.requirements.map((item) => (typeof item === "string" ? item : item?.text)) : [])
    .concat(Array.isArray(plan.requirementHistory) ? plan.requirementHistory.map((item) => (typeof item === "string" ? item : item?.text)) : [])
    .filter(Boolean)
    .join(" ");
  const keywordText = [strategy.keywords, strategy.focusTerms].flatMap((value) => (Array.isArray(value) ? value : [value])).filter(Boolean).join(" ");
  const text = [primaryText, keywordText].filter(Boolean).join(" ") || [plan.description, plan.descriptionEn].filter(Boolean).join(" ");
  const generic = new Set([
    "app",
    "tool",
    "plugin",
    "github",
    "project",
    "projects",
    "keyword",
    "keywords",
    "term",
    "terms",
    "focus",
    "repository",
    "repositories",
    "track",
    "tracking",
    "useful",
    "around",
    "related",
    "relevant"
  ]);
  const detected = text.match(/\b[A-Za-z][A-Za-z0-9.+#-]{1,30}\b/g) || [];
  return Array.from(new Set([...requestedTerms, ...detected, ...chinesePlanTerms(text)].map((term) => String(term || "").trim()).filter(Boolean)))
    .filter((term) => {
      const lower = term.toLowerCase();
      if (requestedSet.has(lower)) return Array.from(term).length >= 2 && !generic.has(lower);
      const shortNamedAlias = /^[A-Z0-9][A-Z0-9+#.-]{1,4}$/.test(term) && !GENERIC_SHORT_ALIAS_TERMS.has(lower);
      if (/[\u4e00-\u9fa5]/.test(term)) return Array.from(term).length >= 2;
      return !generic.has(lower) && (lower.length >= 4 || /\s/.test(lower) || shortNamedAlias);
    })
    .slice(0, 16);
}

function planFilterTerms(plan = {}) {
  return explicitPlanTerms(plan).slice(0, 80);
}

const GENERIC_PROFILE_ANCHORS = new Set([
  "app",
  "application",
  "dashboard",
  "editor",
  "extension",
  "github",
  "integration",
  "open",
  "platform",
  "plugin",
  "project",
  "repository",
  "sdk",
  "software",
  "source",
  "system",
  "tool",
  "viewer",
  "workflow"
]);

function profileAnchorTerms(item = {}, query = "") {
  const core = String(query || "")
    .replace(/\bin:name,description,readme\b/gi, " ")
    .replace(/\b(?:archived|mirror):(?:true|false)\b/gi, " ")
    .replace(/\b(?:stars|pushed|created|language|license|topic):[^\s]+/gi, " ")
    .replace(/\s+-\S+/g, " ")
    .replace(/[()]/g, " ")
    .replace(/\b(?:AND|OR|NOT)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const phrases = Array.from(core.matchAll(/"([^"]{2,80})"/g)).map((match) => match[1]);
  const unquoted = core.replace(/"[^"]+"/g, " ");
  const words = unquoted.match(/[A-Za-z0-9][A-Za-z0-9.+#-]{1,40}|[\u4e00-\u9fa5]{2,16}/g) || [];
  const labels = [item.label, item.labelZh, item.labelEn]
    .filter(Boolean)
    .flatMap((value) => String(value).match(/[A-Za-z0-9][A-Za-z0-9.+#-]{1,40}|[\u4e00-\u9fa5]{2,16}/g) || []);
  return Array.from(new Set([...phrases, ...words, ...labels].map((term) => String(term).trim()).filter(Boolean)))
    .filter((term) => !GENERIC_PROFILE_ANCHORS.has(term.toLowerCase()))
    .slice(0, 16);
}

const LOW_VALUE_CONTAINER_TOPIC_RE = /\b(awesome|awesome-list|awesome-lists|resources?|resource-list|book|books|tutorials?)\b/i;
const LOW_VALUE_CONTAINER_TEXT_RE =
  /(^|[\/\s_-])awesome[-_\s]|professional[-_\s]+complete[-_\s]+edition|\b(config files for my github profile|github profile|profile readme|awesome list|curated list|curated.+resources?|resource hub|reference hub|free assets|book list|pdf download|tools assets and tutorials|crack|activation|license key|serial key|do not use|stick to upstream|oiledmachine overlay)\b|个人收藏书籍|电子书下载|pdf下载|百度云|不限速下载/i;

function normalizePlanSearchText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[_./-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactPlanSearchText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function textContainsPlanTerm(text = "", term = "") {
  const cleanText = normalizePlanSearchText(text);
  const cleanTerm = normalizePlanSearchText(String(term || "").replace(/^["“]|["”]$/g, ""));
  if (!cleanText || !cleanTerm) return false;
  if (cleanTerm.includes(" ")) {
    if (cleanText.includes(cleanTerm)) return true;
    const compactTerm = compactPlanSearchText(cleanTerm);
    return compactTerm.length >= 4 && compactPlanSearchText(cleanText).includes(compactTerm);
  }
  const boundaryMatch = new RegExp(`(^|[^a-z0-9])${escapeRegExp(cleanTerm)}($|[^a-z0-9])`).test(cleanText);
  if (boundaryMatch) return true;
  return false;
}

function repositoryPlanText(repo = {}) {
  return [repo.fullName, repo.name, repo.owner, repo.description, repo.homepage, ...(Array.isArray(repo.topics) ? repo.topics : [])]
    .filter(Boolean)
    .join(" ");
}

function isLowValuePlanContainer(repo = {}) {
  const owner = normalizePlanSearchText(repo.owner);
  const name = normalizePlanSearchText(repo.name);
  const description = String(repo.description || "");
  const topics = Array.isArray(repo.topics) ? repo.topics.join(" ") : "";
  const text = `${repo.fullName || ""} ${repo.name || ""} ${description} ${topics}`;

  if (owner && name && owner === name && /config files for my github profile|github profile/i.test(description)) {
    return true;
  }
  if (description.length > 1000) return true;
  if (LOW_VALUE_CONTAINER_TOPIC_RE.test(topics) || LOW_VALUE_CONTAINER_TEXT_RE.test(text)) return true;
  return false;
}

function repositoryMatchesPlanProfile(repo = {}, profile = {}) {
  if (!profile?.planGenerated) return true;
  const terms = Array.isArray(profile.planTerms) ? profile.planTerms.filter(Boolean) : [];
  if (!terms.length) return true;

  const fullText = repositoryPlanText(repo);
  const hasPlanTerm = terms.some((term) => textContainsPlanTerm(fullText, term));
  if (!hasPlanTerm) return false;

  return !isLowValuePlanContainer(repo);
}

function queryContainsPlanTerm(query = "", term = "") {
  const lowerQuery = String(query || "").toLowerCase();
  const lowerTerm = String(term || "").replace(/^["“]|["”]$/g, "").trim().toLowerCase();
  if (!lowerQuery || !lowerTerm) return false;
  if (/\s/.test(lowerTerm)) return lowerQuery.includes(lowerTerm) || lowerQuery.includes(`"${lowerTerm}"`);
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(lowerTerm)}($|[^a-z0-9])`).test(lowerQuery);
}

function isSpecificPlanQuery(query = "", plan = {}) {
  return explicitPlanTerms(plan).some((term) => queryContainsPlanTerm(query, term));
}

function planQueryFreshnessDays(query = "", plan = {}) {
  const text = `${query || ""} ${plan.name || ""} ${plan.description || ""}`.toLowerCase();
  if (/\b(parser|converter|viewer|sdk|library|kernel|plugin|extension|addon|workbench|file format)\b/.test(text)) return 180;
  return 90;
}

function splitOrGroupAlternatives(group = "") {
  return String(group || "")
    .split(/\s+\bOR\b\s+/i)
    .map((item) =>
      item
        .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean)
    .slice(0, 8);
}

function quotePlanAlternative(term = "") {
  const clean = String(term || "").trim();
  if (!clean) return "";
  return /\s/.test(clean) && !/^".*"$/.test(clean) ? `"${clean.replaceAll('"', "")}"` : clean;
}

function scoreOrAlternative(term = "", planTerms = []) {
  const clean = String(term || "").trim();
  const lower = clean.toLowerCase();
  if (!clean || lower === "or") return -1000;
  let score = 0;
  const exactPlanTerm = planTerms.some((item) => item.toLowerCase() === lower);
  if (exactPlanTerm) score += 100;
  const containedPlanTerms = planTerms.filter((item) => {
    const termLower = String(item || "").toLowerCase();
    return termLower && termLower.length >= 3 && lower.includes(termLower);
  });
  if (!exactPlanTerm && containedPlanTerms.length) score += 80 + containedPlanTerms.length * 8;
  if (/^[a-z0-9][a-z0-9+#.-]{3,}$/i.test(clean) && !GENERIC_SHORT_ALIAS_TERMS.has(lower)) score += 24;
  if (/^[A-Z0-9][A-Z0-9+#.-]{1,4}$/.test(clean) && !GENERIC_SHORT_ALIAS_TERMS.has(lower)) score += 20;
  if (/^[A-Z0-9][A-Z0-9+#.-]{1,4}$/.test(clean) && GENERIC_SHORT_ALIAS_TERMS.has(lower)) score += 22;
  if (/[\u4e00-\u9fa5]/.test(clean)) score += 18;
  if (/\s/.test(clean)) score += 6;
  return score;
}

function chooseOrAlternative(group = "", plan = {}) {
  const alternatives = splitOrGroupAlternatives(group);
  if (!alternatives.length) return "";
  const planTerms = planFilterTerms(plan).map((term) => term.toLowerCase());
  return alternatives
    .map((term, index) => ({ term, index, score: scoreOrAlternative(term, planTerms) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)[0].term;
}

function normalizeGithubOrGroups(query = "", plan = {}) {
  const parenthesized = String(query || "")
    .replace(/\(([^()]*\bOR\b[^()]*)\)/gi, (_match, group) => quotePlanAlternative(chooseOrAlternative(group, plan)))
    .replace(/\s+/g, " ")
    .trim();
  if (!/\bOR\b/i.test(parenthesized)) return parenthesized;
  return normalizeLooseGithubOrQuery(parenthesized, plan);
}

function normalizeLooseGithubOrQuery(query = "", plan = {}) {
  const tokens = String(query || "").match(/"[^"]+"|\S+/g) || [];
  const qualifiers = [];
  const coreTokens = [];
  for (const token of tokens) {
    if (/^(?:in:|archived:|mirror:|stars:|pushed:|language:|license:|topic:|-)/i.test(token)) {
      qualifiers.push(token);
    } else {
      coreTokens.push(token);
    }
  }
  const core = coreTokens.join(" ");
  const chosen = quotePlanAlternative(chooseOrAlternative(core, plan));
  return [chosen || core.replace(/\s+\bOR\b\s+/gi, " "), ...qualifiers]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePlanGeneratedQuery(query = "", plan = {}) {
  const clean = normalizeGithubOrGroups(query, plan);
  if (!clean) return "";
  const cleanWithoutAntiNoise = stripPlanGeneratedAntiNoise(clean);
  if (isSpecificPlanQuery(cleanWithoutAntiNoise, plan)) {
    return cleanWithoutAntiNoise
      .replace(/\bstars:[^\s]+/g, "")
      .replace(/\bpushed:>=\d{4}-\d{2}-\d{2}\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  const days = planQueryFreshnessDays(cleanWithoutAntiNoise, plan);
  if (days <= 90 || !/\bpushed:>=\d{4}-\d{2}-\d{2}\b/.test(cleanWithoutAntiNoise)) return cleanWithoutAntiNoise;
  const relaxedDate = dateDaysAgo(days);
  return cleanWithoutAntiNoise.replace(/\bpushed:>=(\d{4}-\d{2}-\d{2})\b/g, (match, date) => (date > relaxedDate ? `pushed:>=${relaxedDate}` : match));
}

function stripPlanGeneratedAntiNoise(query = "") {
  return String(query || "")
    .replace(/\s+-topic:(?:agent|agents|ai-agent|agentic|multi-agent|autonomous-agent|swarm|mcp|awesome|tutorial|course|paper|benchmark)\b/gi, "")
    .replace(/\s+-"(?:awesome list|paper list|toy example)"/gi, "")
    .replace(/\s+-(?:benchmark|course|tutorial)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}


const PROFILE_LABEL_ZH = {
  "self-hosted-apps": "自托管应用",
  "open-source-alternatives": "开源替代品",
  "fullstack-starters": "全栈启动模板",
  "saas-starter": "SaaS 启动模板",
  "admin-dashboard": "管理后台",
  "template-boilerplate": "产品模板",
  "browser-extension-products": "浏览器插件产品",
  "desktop-products": "桌面应用",
  "mobile-products": "移动应用",
  "local-first": "本地优先产品",
  "consumer-productivity": "个人效率产品",
  "notes-knowledge-apps": "笔记与知识库",
  "browser-automation-products": "浏览器自动化",
  "workflow-automation": "工作流自动化",
  "integration-platforms": "集成平台",
  "api-client-tools": "API 客户端工具",
  "developer-tools": "开发者工具",
  "cli-tools": "命令行工具",
  "testing-tools": "测试与质量工具",
  "ecommerce-products": "电商产品",
  "payment-invoice-tools": "支付与发票工具",
  "cms-content-products": "内容管理产品",
  "creator-studios": "创作者工作台",
  "marketing-growth-tools": "营销增长工具",
  "crm-helpdesk-products": "CRM 与客服产品",
  "creative-video": "视频编辑工具",
  "subtitle-dubbing": "字幕与配音工具",
  "screen-recording-demos": "录屏与演示工具",
  "audio-music-tools": "音频与音乐工具",
  "podcast-voice": "播客与语音工具",
  "design-prototyping": "设计与原型工具",
  "canvas-editor": "画布编辑器",
  "whiteboard-diagram-tools": "白板与图表工具",
  "visual-asset-generation": "视觉素材工具",
  "presentation-tools": "演示文稿工具",
  "data-apps": "数据应用",
  "data-pipeline": "数据管道产品",
  "knowledge-base-apps": "知识库应用",
  "document-search-apps": "文档搜索应用",
  "security-products": "安全产品",
  "privacy-compliance": "隐私与合规工具",
  "finance-products": "金融产品",
  "trading-products": "交易产品",
  "education-products": "教育产品",
  "health-legal-products": "医疗与法律产品",
  "ai-chat-products": "AI 聊天产品",
  "ai-workbench-products": "AI 工作台产品",
  "rag-products": "RAG 知识库产品",
  "ai-design-products": "AI 设计产品",
  "ai-media-products": "AI 媒体产品",
  "ai-agent-products": "具体 AI Agent 产品",
  "new-product-apps": "新兴产品应用",
  "new-starter-kits": "新兴启动套件",
  "commercial-friendly-mit": "MIT 许可候选",
  "commercial-friendly-apache": "Apache 许可候选"
};

function buildObservationPlanProfiles(plan, defaults) {
  if (!plan || plan.id === "default") return [];
  const strategy = plan.searchLogic || plan.strategy || {};
  const productScope = "in:name,description,readme";
  const planTerms = planFilterTerms(plan);
  const customQueries = Array.isArray(strategy.customQueries) ? strategy.customQueries : [];
  const keywordQueries = planWords(strategy.keywords || strategy.focusTerms || [])
    .slice(0, 10)
    .map((term) => ({
      label: term,
      query: quoteSearchTerm(term)
    }));
  const rawQueries = customQueries.length ? customQueries : keywordQueries;
  const seen = new Set();

  return rawQueries
    .map((item, index) => {
      const query = typeof item === "string" ? item : item.query || item.q || item.label || "";
      const label = typeof item === "string" ? item : item.label || item.name || query;
      const cleanQuery = normalizeGithubOrGroups(String(query || "").replace(/\s+/g, " ").trim(), plan);
      if (!cleanQuery) return null;
      const keyBase = `${plan.id}-${index}-${cleanQuery}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 64);
      const key = `plan-${keyBase || index}`;
      if (seen.has(key)) return null;
      seen.add(key);
      const stars = Math.max(0, Number(item.stars ?? strategy.minStars ?? 0));
      const completeQuery = /in:name,description,readme/.test(cleanQuery) && /archived:false/.test(cleanQuery);
      const specificQuery = isSpecificPlanQuery(cleanQuery, plan);
      const pushedDate = dateDaysAgo(planQueryFreshnessDays(cleanQuery, plan));
      const starPart = stars > 0 && !specificQuery ? `stars:>${stars}` : "";
      const fresh = `${specificQuery ? "" : `pushed:>=${pushedDate}`} archived:false mirror:false`;
      const normalizedQuery = completeQuery ? normalizePlanGeneratedQuery(cleanQuery, plan) : cleanQuery;
      return {
        key,
        label: `${plan.name || plan.nameEn || "Observation"} · ${label}`.slice(0, 96),
        labelEn: item.labelEn || label,
        labelZh: item.labelZh || label,
        q: completeQuery ? normalizedQuery : `${normalizedQuery} ${productScope} ${starPart} ${fresh}`.replace(/\s+/g, " ").trim(),
        observationPlanId: plan.id,
        planTerms: Array.from(new Set([...planTerms, ...profileAnchorTerms(item, cleanQuery)])).slice(0, 32),
        planGenerated: true
      };
    })
    .filter(Boolean);
}

function buildQueryProfiles(plan = null) {
  const pushed30 = dateDaysAgo(30);
  const pushed90 = dateDaysAgo(90);
  const created180 = dateDaysAgo(180);
  const created365 = dateDaysAgo(365);
  const productScope = "in:name,description,readme";
  const abstractAiNoise = "-topic:agent -topic:agents -topic:ai-agent -topic:agentic -topic:multi-agent -topic:autonomous-agent -topic:swarm -topic:mcp";
  const researchNoise = "-topic:awesome -topic:tutorial -topic:course -topic:paper -topic:benchmark";
  const fresh = `pushed:>=${pushed90} archived:false mirror:false`;
  const hot = `pushed:>=${pushed30} archived:false mirror:false`;
  const profile = (key, label, query, options = {}) => ({
    key,
    label,
    labelZh: PROFILE_LABEL_ZH[key] || label,
    q: `${query} ${productScope} stars:>${options.stars || 40} ${options.hot ? hot : fresh} ${options.allowAbstractAi ? "" : abstractAiNoise} ${
      options.allowResearch ? "" : researchNoise
    }`
      .replace(/\s+/g, " ")
      .trim()
  });

  const defaults = [
    profile("self-hosted-apps", "Self-hosted apps", "self-hosted app", { stars: 25 }),
    profile("open-source-alternatives", "Open-source alternatives", "\"open source alternative\"", { stars: 30 }),
    profile("fullstack-starters", "Full-stack starters", "fullstack starter", { stars: 35 }),
    profile("saas-starter", "SaaS starters", "saas starter", { stars: 45 }),
    profile("admin-dashboard", "Admin dashboards", "admin dashboard", { stars: 45 }),
    profile("template-boilerplate", "Product templates", "production ready template", { stars: 30 }),
    profile("browser-extension-products", "Browser extension products", "browser extension", { stars: 30 }),
    profile("desktop-products", "Desktop products", "desktop app", { stars: 30 }),
    profile("mobile-products", "Mobile app products", "mobile app", { stars: 30 }),
    profile("local-first", "Local-first products", "local-first app", { stars: 25 }),
    profile("consumer-productivity", "Consumer productivity", "productivity app", { stars: 35 }),
    profile("notes-knowledge-apps", "Notes and knowledge apps", "notes knowledge app", { stars: 30 }),
    profile("browser-automation-products", "Browser automation products", "browser automation", { stars: 30 }),

    profile("workflow-automation", "Workflow automation products", "workflow automation dashboard", { stars: 35 }),
    profile("integration-platforms", "Integration platforms", "integration platform", { stars: 35 }),
    profile("api-client-tools", "API client tools", "api client", { stars: 35, hot: true }),
    profile("developer-tools", "Developer tools", "developer tool", { stars: 55, hot: true }),
    profile("cli-tools", "CLI tools", "cli tool", { stars: 55, hot: true }),
    profile("testing-tools", "Testing tools", "testing dashboard", { stars: 35, hot: true }),

    profile("ecommerce-products", "Commerce products", "ecommerce platform", { stars: 35 }),
    profile("payment-invoice-tools", "Payment and invoice tools", "invoice app", { stars: 25 }),
    profile("cms-content-products", "CMS and content products", "cms content management", { stars: 35 }),
    profile("creator-studios", "Creator studios", "creator studio", { stars: 20 }),
    profile("marketing-growth-tools", "Marketing and growth tools", "marketing dashboard", { stars: 30 }),
    profile("crm-helpdesk-products", "CRM and helpdesk products", "crm helpdesk", { stars: 25 }),

    profile("creative-video", "Video editors", "video editor", { stars: 20 }),
    profile("subtitle-dubbing", "Subtitle and dubbing tools", "subtitle editor", { stars: 20 }),
    profile("screen-recording-demos", "Screen recording and demos", "screen recorder demo", { stars: 20 }),
    profile("audio-music-tools", "Audio and music tools", "audio editor", { stars: 20 }),
    profile("podcast-voice", "Podcast and voice tools", "podcast voice", { stars: 20 }),
    profile("design-prototyping", "Design and prototyping tools", "design prototyping tool", { stars: 25 }),
    profile("canvas-editor", "Canvas and editor tools", "canvas editor", { stars: 25 }),
    profile("whiteboard-diagram-tools", "Whiteboard and diagram tools", "whiteboard diagram", { stars: 25 }),
    profile("visual-asset-generation", "Visual asset tools", "image editor", { stars: 25 }),
    profile("presentation-tools", "Presentation tools", "presentation generator", { stars: 25 }),

    profile("data-apps", "Data applications", "data dashboard", { stars: 40, hot: true }),
    profile("data-pipeline", "Data pipeline products", "etl pipeline", { stars: 40, hot: true }),
    profile("knowledge-base-apps", "Knowledge base apps", "knowledge base app", { stars: 35 }),
    profile("document-search-apps", "Document search apps", "document search app", { stars: 30 }),
    profile("security-products", "Security products", "security scanner", { stars: 40, hot: true }),
    profile("privacy-compliance", "Privacy and compliance tools", "privacy compliance", { stars: 25 }),
    profile("finance-products", "Finance products", "finance dashboard", { stars: 25 }),
    profile("trading-products", "Trading products", "trading platform", { stars: 30 }),
    profile("education-products", "Education products", "education app", { stars: 25 }),
    profile("health-legal-products", "Health and legal products", "healthcare app", { stars: 20 }),

    profile("ai-chat-products", "AI chat products", "llm chat app", { stars: 35, hot: true }),
    profile("ai-workbench-products", "AI workbench products", "AI workspace dashboard", { stars: 35, hot: true }),
    profile("rag-products", "RAG products", "rag knowledge base app", { stars: 35, hot: true }),
    profile("ai-design-products", "AI design products", "AI design tool", { stars: 25, hot: true }),
    profile("ai-media-products", "AI media products", "AI video editor", { stars: 25, hot: true }),
    profile("ai-agent-products", "Concrete AI agent products", "AI agent dashboard", { stars: 45, hot: true, allowAbstractAi: true }),
    {
      key: "new-product-apps",
      label: "Young product apps",
      labelZh: PROFILE_LABEL_ZH["new-product-apps"],
      q: `app ${productScope} created:>=${created180} stars:>50 ${hot} ${abstractAiNoise} ${researchNoise}`
    },
    {
      key: "new-starter-kits",
      label: "Young starter kits",
      labelZh: PROFILE_LABEL_ZH["new-starter-kits"],
      q: `starter ${productScope} created:>=${created365} stars:>50 ${hot} ${abstractAiNoise} ${researchNoise}`
    },
    {
      key: "commercial-friendly-mit",
      label: "MIT product candidates",
      labelZh: PROFILE_LABEL_ZH["commercial-friendly-mit"],
      q: `starter ${productScope} license:mit stars:>45 ${fresh} ${abstractAiNoise} ${researchNoise}`
    },
    {
      key: "commercial-friendly-apache",
      label: "Apache product candidates",
      labelZh: PROFILE_LABEL_ZH["commercial-friendly-apache"],
      q: `dashboard ${productScope} license:apache-2.0 stars:>45 ${fresh} ${abstractAiNoise} ${researchNoise}`
    }
  ];
  const planProfiles = buildObservationPlanProfiles(plan, defaults);
  if (!planProfiles.length) return defaults;
  const baseMode = (plan?.searchLogic || plan?.strategy)?.baseMode || "focused";
  if (baseMode === "only") return planProfiles;
  if (baseMode === "blend") return [...planProfiles, ...defaults];
  return [...planProfiles, ...defaults.slice(0, 10)];
}

const PROFILE_MEMORY_HINTS = {
  "self-hosted-apps": ["product-starters", "consumer-productivity", "business-saas"],
  "product-app-templates": ["product-starters", "business-saas", "consumer-productivity"],
  "product-app-shells": ["product-starters", "business-saas", "consumer-productivity"],
  "open-source-alternatives": ["product-starters", "commerce-growth-content", "permissive-commercial"],
  "fullstack-starters": ["product-starters", "business-saas", "developer-productivity"],
  "template-boilerplate": ["product-starters", "business-saas", "permissive-commercial"],
  "mobile-products": ["consumer-productivity", "personal-efficiency", "product-starters"],
  "notes-knowledge-apps": ["consumer-productivity", "data-knowledge", "personal-efficiency"],
  "browser-automation-products": ["consumer-productivity", "automation-usecases", "developer-productivity"],
  "ecommerce-products": ["commerce-growth-content", "business-saas"],
  "payment-invoice-tools": ["commerce-growth-content", "business-saas", "finance-tools"],
  "cms-content-products": ["commerce-growth-content", "creative-media"],
  "creator-studios": ["creative-media", "creative-media-production", "commerce-growth-content"],
  "creative-video": ["creative-media", "creative-video-editing", "video-production", "shape-video-creation-studio", "audience-creators"],
  "subtitle-dubbing": ["creative-media", "creative-video-editing", "video-production", "voice-clone-transcription", "audience-creators"],
  "screen-recording-demos": ["creative-media", "creative-video-editing", "video-production", "commerce-growth-content", "audience-creators"],
  "audio-music-tools": ["creative-media", "creative-audio-music", "audio-production", "audience-creators", "audience-audio-podcasters"],
  "podcast-voice": ["creative-media", "creative-podcast-voice", "voice-clone-transcription", "audio-production", "audience-audio-podcasters"],
  "marketing-growth-tools": ["commerce-growth-content", "commerce-growth", "business-saas"],
  "crm-helpdesk-products": ["business-saas", "admin-saas", "commerce-growth-content"],
  "desktop-products": ["consumer-productivity", "personal-efficiency", "product-starters"],
  "browser-extension-products": ["consumer-productivity", "personal-efficiency", "developer-productivity"],
  "api-client-tools": ["developer-productivity", "developer-tools"],
  "integration-platforms": ["business-saas", "automation-usecases"],
  "testing-tools": ["developer-productivity", "developer-tools"],
  "data-apps": ["data-knowledge", "data-analytics"],
  "developer-tools": ["developer-productivity", "developer-tools"],
  "security-products": ["security-compliance", "security-tools"],
  "privacy-compliance": ["security-compliance", "security-tools"],
  "finance-products": ["vertical-domain", "finance-tools"],
  "trading-products": ["vertical-domain", "finance-tools"],
  "education-products": ["vertical-domain", "product-starters"],
  "health-legal-products": ["vertical-domain"],
  "ai-chat-products": ["ai-native-products", "ai-products", "product-starters"],
  "ai-workbench-products": ["ai-native-products", "ai-products", "business-saas"],
  "rag-products": ["data-knowledge", "knowledge-search", "ai-native-products"],
  "ai-design-products": ["frontend-creative", "ai-design-tool", "creative-media"],
  "ai-media-products": ["creative-media", "creative-media-production", "ai-native-products"],
  "ai-agent-products": ["ai-native-products", "ai-workflow", "business-saas"],
  "new-product-apps": ["product-starters", "consumer-productivity", "business-saas"],
  "new-starter-kits": ["product-starters", "developer-productivity"],
  "ai-video-generation": ["creative-media", "creative-media-production", "video-production", "shape-video-creation-studio"],
  "creator-content-tools": ["creative-media", "creative-media-production", "commerce-growth-content"],
  "design-prototyping": ["frontend-creative", "ai-design-tool", "design-reference", "design-to-code-editing", "shape-creative-editor"],
  "canvas-editor": ["frontend-creative", "ai-design-tool", "shape-creative-editor"],
  "whiteboard-diagram-tools": ["frontend-creative", "ai-design-tool", "design-reference", "whiteboard-prototyping", "shape-creative-editor"],
  "visual-asset-generation": ["frontend-creative", "creative-media", "ai-design-tool", "creative-video-editing", "design-system-generation"],
  "presentation-tools": ["frontend-creative", "presentation-generation", "commerce-growth-content", "shape-creative-editor"],
  "knowledge-base-apps": ["data-knowledge", "knowledge-search", "business-saas", "shape-knowledge-qa-system"],
  "document-search-apps": ["data-knowledge", "knowledge-search", "document-extraction", "consumer-productivity"],
  "ai-agent-fast": ["ai-native-products", "ai-workflow"],
  "llm-apps": ["ai-native-products", "llm-app-gallery"],
  "rag-apps": ["data-knowledge", "knowledge-search"],
  mcp: ["ai-native-products", "ai-agent-os"],
  "ai-coding": ["developer-productivity", "ai-assistant"],
  "new-fast-growth": ["other"],
  devtools: ["developer-productivity", "developer-tools"],
  "cli-tools": ["developer-productivity", "ai-assistant"],
  "saas-starter": ["business-saas", "admin-saas"],
  "admin-dashboard": ["business-saas", "admin-saas"],
  "workflow-automation": ["business-saas", "automation-usecases", "ai-workflow"],
  "data-pipeline": ["data-knowledge", "data-analytics"],
  "knowledge-search": ["data-knowledge", "knowledge-search"],
  security: ["security-compliance", "security-tools"],
  "llm-security": ["security-compliance", "security-skills"],
  observability: ["infra-cloud", "sre-ops"],
  "cloud-platform": ["infra-cloud", "platform-engineering"],
  "consumer-productivity": ["consumer-productivity", "personal-efficiency"],
  "local-first": ["consumer-productivity", "personal-efficiency"],
  "ui-components": ["frontend-creative", "creative-media"],
  "commerce-content": ["commerce-growth-content", "commerce-growth"],
  "vertical-finance": ["vertical-domain", "finance-tools"],
  "typescript-new": ["developer-productivity", "frontend-creative"],
  "python-new": ["ai-native-products", "data-knowledge"],
  "go-infra": ["infra-cloud", "systems-runtime-edge"],
  "rust-infra": ["systems-runtime-edge", "infra-cloud"],
  "commercial-friendly-mit": ["permissive-commercial"],
  "commercial-friendly-apache": ["permissive-commercial"]
};

const MEMORY_SEARCH_TERMS = {
  "ai-native-products": "AI app",
  "ai-products": "AI tool",
  "ai-workflow": "AI workflow",
  "ai-assistant": "AI assistant",
  "ai-agent-os": "AI agent dashboard",
  "ai-design-tool": "AI design tool",
  "business-saas": "SaaS dashboard",
  "admin-saas": "admin dashboard",
  "commerce-growth-content": "content marketing tool",
  "commerce-growth": "growth dashboard",
  "consumer-productivity": "productivity app",
  "personal-efficiency": "personal productivity app",
  "creative-media": "creator studio",
  "creative-media-production": "media creation tool",
  "creative-video-editing": "video editor",
  "creative-audio-music": "audio editor",
  "creative-podcast-voice": "podcast voice tool",
  "data-knowledge": "knowledge base",
  "knowledge-search": "knowledge search",
  "data-analytics": "data dashboard",
  "developer-productivity": "developer tool",
  "developer-tools": "developer tool",
  "frontend-creative": "design prototyping tool",
  "design-reference": "design system tool",
  "design-to-code-editing": "design to code",
  "security-compliance": "security scanner",
  "security-tools": "security tool",
  "infra-cloud": "cloud platform",
  "platform-engineering": "platform engineering tool",
  "systems-runtime-edge": "runtime edge tool",
  "finance-tools": "finance dashboard",
  "finance-trading": "trading dashboard",
  "automation-usecases": "workflow automation",
  "product-starters": "starter template",
  "shape-video-creation-studio": "video creation studio",
  "shape-creative-editor": "creative editor",
  "shape-knowledge-qa-system": "knowledge qa system",
  "audience-creators": "creator tool",
  "audience-audio-podcasters": "podcast tool",
  "permissive-commercial": "MIT Apache starter"
};

function memorySearchTerm(key = "") {
  const normalized = String(key || "").trim();
  if (!normalized) return "";
  if (MEMORY_SEARCH_TERMS[normalized]) return MEMORY_SEARCH_TERMS[normalized];
  return normalized
    .replace(/^(shape|audience|category|usecase|license|risk)-/i, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function topMemoryEntries(root = {}, buckets = [], limit = 8) {
  return buckets
    .flatMap((bucket) =>
      Object.entries(root?.[bucket] || {}).map(([key, value]) => ({
        bucket,
        key,
        value: Number(value || 0)
      }))
    )
    .filter((entry) => entry.value > 0 && memorySearchTerm(entry.key))
    .sort((a, b) => b.value - a.value || a.key.localeCompare(b.key))
    .slice(0, limit);
}

function memoryNegativeExcludes(memory = {}, positiveTerms = new Set()) {
  return topMemoryEntries(memory.negativePreferences || {}, ["useCases", "categories"], 4)
    .map((entry) => memorySearchTerm(entry.key))
    .filter((term) => term && !positiveTerms.has(term.toLowerCase()))
    .map((term) => `-${quoteSearchTerm(term)}`)
    .join(" ");
}

function buildMemoryQueryProfiles(memory = {}) {
  const preferences = memory.preferences || {};
  const positiveEntries = topMemoryEntries(preferences, ["useCases", "categories", "languages", "licenses"], 8);
  if (!positiveEntries.length) return [];
  const productScope = "in:name,description,readme";
  const fresh = `pushed:>=${dateDaysAgo(90)} archived:false mirror:false`;
  const positiveTerms = new Set(positiveEntries.map((entry) => memorySearchTerm(entry.key).toLowerCase()));
  const excludes = memoryNegativeExcludes(memory, positiveTerms);
  const seen = new Set();

  return positiveEntries
    .map((entry, index) => {
      const term = memorySearchTerm(entry.key);
      if (!term) return null;
      const safeKey = `${entry.bucket}-${entry.key}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 72);
      if (seen.has(safeKey)) return null;
      seen.add(safeKey);
      const queryCore =
        entry.bucket === "languages"
          ? `app language:${quoteSearchTerm(entry.key)}`
          : entry.bucket === "licenses" && entry.key === "permissive-commercial"
            ? `starter license:mit`
            : quoteSearchTerm(term);
      return {
        key: `memory-${safeKey || index}`,
        label: `Learned preference · ${term}`,
        labelZh: `学习偏好 · ${term}`,
        q: `${queryCore} ${productScope} stars:>15 ${fresh} ${excludes}`.replace(/\s+/g, " ").trim(),
        memoryGenerated: true,
        memoryWeight: entry.value,
        profileCapMultiplier: 2.4
      };
    })
    .filter(Boolean);
}

function profileMemoryScore(profile, memory = {}) {
  const hints = PROFILE_MEMORY_HINTS[profile.key] || [];
  const preferences = memory.preferences || {};
  const negative = memory.negativePreferences || {};
  const positive =
    hints.reduce(
      (score, key) =>
        score +
        Number(preferences.categories?.[key] || 0) * 1.4 +
        Number(preferences.useCases?.[key] || 0) * 1.7 +
        Number(preferences.licenses?.[key] || 0) * 0.7,
      0
    );
  const penalty =
    hints.reduce(
      (score, key) =>
        score +
        Number(negative.categories?.[key] || 0) * 1.7 +
        Number(negative.useCases?.[key] || 0) * 2 +
        Number(negative.licenses?.[key] || 0) * 0.8,
      0
    );
  const directProfileSignal = Number(memory.discoveryProfiles?.[profile.key] || 0) * 4;
  return positive - penalty + directProfileSignal;
}

function applyMemoryToQueryProfiles(profiles = buildQueryProfiles(), memory = {}) {
  const hasObservationPlanProfiles = profiles.some((profile) => profile.planGenerated);
  const memoryProfiles = hasObservationPlanProfiles ? [] : buildMemoryQueryProfiles(memory);
  const scored = profiles.map((profile, index) => {
    const memoryWeight = profileMemoryScore(profile, memory);
    return {
      ...profile,
      originalIndex: index,
      memoryWeight,
      profileCapMultiplier: Math.max(0.7, Math.min(2.2, Number(profile.profileCapMultiplier || 1) + memoryWeight / 24))
    };
  });
  const explorationRatio = Math.max(0.1, Math.min(0.45, Number(memory.antiBubble?.explorationRatio || 0.25)));
  const explorationStep = Math.max(3, Math.round(1 / explorationRatio));

  scored.sort((a, b) => b.memoryWeight - a.memoryWeight || a.originalIndex - b.originalIndex);

  const chosen = [];
  const used = new Set();
  let naturalIndex = 0;
  for (const profile of scored) {
    if ((chosen.length + 1) % explorationStep === 0) {
      while (naturalIndex < profiles.length && used.has(profiles[naturalIndex].key)) {
        naturalIndex += 1;
      }
      const exploration = profiles[naturalIndex];
      if (exploration && !used.has(exploration.key)) {
        chosen.push({ ...exploration, memoryWeight: 0, explorationSlot: true });
        used.add(exploration.key);
      }
    }
    if (!used.has(profile.key)) {
      chosen.push(profile);
      used.add(profile.key);
    }
  }

  for (const profile of profiles) {
    if (!used.has(profile.key)) {
      chosen.push({ ...profile, memoryWeight: 0, explorationSlot: true });
    }
  }

  return [...memoryProfiles, ...chosen];
}

function headers(token) {
  const base = {
    Accept: "application/vnd.github+json",
    "User-Agent": "starvault-imprint",
    "X-GitHub-Api-Version": "2022-11-28"
  };

  if (token) {
    base.Authorization = `Bearer ${token}`;
  }

  return base;
}

function htmlHeaders(token) {
  const base = {
    Accept: "text/html,application/xhtml+xml",
    "User-Agent": "starvault-imprint"
  };

  if (token) {
    base.Authorization = `Bearer ${token}`;
  }

  return base;
}

const GITHUB_SECONDARY_RATE_LIMIT_MIN_DELAY_MS = 60_000;
const GITHUB_SECONDARY_RATE_LIMIT_MAX_DELAY_MS = 5 * 60_000;
const GITHUB_RATE_RESOURCE_RESERVE = {
  core: 10,
  search: 2,
  graphql: 50
};
let githubCooldownUntil = 0;
let githubNextRequestAt = 0;
let githubRequestGate = Promise.resolve();
const githubRateBudgets = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

function githubRequestSpacingMs(url = "") {
  const value = String(url || "");
  if (/\/search\//i.test(value)) return 2200;
  if (/\/graphql\b/i.test(value)) return 900;
  return 350;
}

function githubRateResourceForUrl(url = "") {
  const value = String(url || "");
  if (/\/search\//i.test(value)) return "search";
  if (/\/graphql\b/i.test(value)) return "graphql";
  return "core";
}

function normalizeRateBudget(resource = {}) {
  const remaining = Number(resource.remaining);
  const reset = Number(resource.reset);
  const limit = Number(resource.limit);
  return {
    limit: Number.isFinite(limit) ? limit : null,
    remaining: Number.isFinite(remaining) ? remaining : null,
    resetAt: Number.isFinite(reset) && reset > 0 ? reset * 1000 : null
  };
}

function seedGithubRateBudgets(resources = {}) {
  for (const [resource, value] of Object.entries(resources || {})) {
    const budget = normalizeRateBudget(value);
    if (budget.remaining !== null || budget.resetAt !== null) {
      githubRateBudgets.set(resource, budget);
    }
  }
}

function updateGithubRateBudgetFromHeaders(response, url = "") {
  if (!response?.headers) return;
  const resource = response.headers.get("x-ratelimit-resource") || githubRateResourceForUrl(url);
  const budget = normalizeRateBudget({
    limit: response.headers.get("x-ratelimit-limit"),
    remaining: response.headers.get("x-ratelimit-remaining"),
    reset: response.headers.get("x-ratelimit-reset")
  });
  if (budget.remaining !== null || budget.resetAt !== null) {
    githubRateBudgets.set(resource, budget);
  }
}

function githubRateBudgetWaitMs(resource) {
  const budget = githubRateBudgets.get(resource);
  if (!budget || budget.remaining === null || !budget.resetAt) return 0;
  const reserve = GITHUB_RATE_RESOURCE_RESERVE[resource] ?? 5;
  if (budget.remaining > reserve) return 0;
  return Math.max(0, budget.resetAt - Date.now() + 1000);
}

function setGithubCooldown(delayMs) {
  const ms = Math.max(0, Number(delayMs || 0));
  if (!ms) return;
  githubCooldownUntil = Math.max(githubCooldownUntil, Date.now() + ms);
}

async function waitForGithubRequestWindow(url = "") {
  const resource = githubRateResourceForUrl(url);
  const previous = githubRequestGate;
  let release = () => {};
  githubRequestGate = new Promise((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    const now = Date.now();
    const cooldownWait = Math.max(0, githubCooldownUntil - now);
    if (cooldownWait) {
      await sleep(cooldownWait);
    }
    const budgetWait = githubRateBudgetWaitMs(resource);
    if (budgetWait) {
      await sleep(budgetWait);
    }
    const spacingWait = Math.max(0, githubNextRequestAt - Date.now());
    if (spacingWait) {
      await sleep(spacingWait);
    }
    githubNextRequestAt = Date.now() + githubRequestSpacingMs(url);
  } finally {
    release();
  }
}

function secondaryRateLimitDelay(attempt = 0) {
  return Math.min(
    GITHUB_SECONDARY_RATE_LIMIT_MAX_DELAY_MS,
    GITHUB_SECONDARY_RATE_LIMIT_MIN_DELAY_MS * 2 ** Math.max(0, Number(attempt || 0))
  );
}

async function githubRateLimitInfo(response) {
  if (!response) {
    return {
      primary: false,
      secondary: false,
      retryAfterMs: null,
      resetMs: null,
      message: ""
    };
  }
  const retryAfterMs = parseRetryAfter(response.headers.get("retry-after"));
  const reset = Number(response.headers.get("x-ratelimit-reset"));
  const resetMs = Number.isFinite(reset) && reset > 0 ? Math.max(0, reset * 1000 - Date.now()) : null;
  const remaining = response.headers.get("x-ratelimit-remaining");
  let message = "";
  if (response.status === 403 || response.status === 429) {
    try {
      const text = await response.clone().text();
      if (text) {
        try {
          const body = JSON.parse(text);
          message = String(body?.message || text);
        } catch {
          message = text;
        }
      }
    } catch {
      message = "";
    }
  }
  const secondary = /secondary rate limit|abuse detection|too many requests|temporarily blocked/i.test(message);
  const primary = remaining === "0" || /API rate limit exceeded/i.test(message);
  return {
    primary,
    secondary,
    retryAfterMs,
    resetMs,
    message
  };
}

async function githubShouldRetry(response, error, attempt) {
  if (error) return true; // network error / timeout
  if (!response) return false;
  if (response.status === 429) return true;
  if (response.status >= 500 && response.status < 600) return true;
  if (response.status === 403) {
    const info = await githubRateLimitInfo(response);
    if (info.primary || info.secondary || info.retryAfterMs != null) return true;
  }
  return false;
}

async function githubRetryDelay(response, error, attempt, baseMs, maxMs) {
  if (response) {
    const info = await githubRateLimitInfo(response);
    if (info.retryAfterMs != null) {
      const delay = Math.max(info.retryAfterMs, baseMs);
      setGithubCooldown(delay);
      return delay;
    }
    if (info.secondary) {
      const delay = secondaryRateLimitDelay(attempt);
      setGithubCooldown(delay);
      return delay;
    }
    if (info.primary && info.resetMs != null) {
      const delay = Math.max(info.resetMs, baseMs);
      setGithubCooldown(delay);
      return delay;
    }
  }
  return defaultRetryDelay(response, error, attempt, baseMs, maxMs);
}

function extractGithubErrorMessage(text = "") {
  const raw = String(text || "").trim();
  if (!raw) return "";
  try {
    const body = JSON.parse(raw);
    return String(body?.message || raw);
  } catch {
    return raw;
  }
}

function githubResponseErrorMessage(status, text = "") {
  const message = extractGithubErrorMessage(text);
  if (/secondary rate limit|abuse detection|too many requests|temporarily blocked/i.test(message)) {
    return "GitHub secondary rate limit is still active after backoff. Please wait a few minutes before scanning again.";
  }
  if (/API rate limit exceeded/i.test(message)) {
    return "GitHub API rate limit is exhausted. Please wait for the rate limit reset before scanning again.";
  }
  return `GitHub request failed ${status}: ${message.slice(0, 240)}`;
}

async function githubRequest(url, token, options = {}) {
  await waitForGithubRequestWindow(url);
  let response;
  try {
    response = await fetchWithRetries(
      url,
      {
        ...options,
        headers: {
          ...headers(token),
          ...(options.headers || {})
        }
      },
      {
        timeoutMs: 20_000,
        retries: 4,
        baseDelayMs: 1000,
        maxDelayMs: GITHUB_SECONDARY_RATE_LIMIT_MAX_DELAY_MS,
        shouldRetry: githubShouldRetry,
        retryDelay: githubRetryDelay
      }
    );
  } catch (error) {
    const cause = error?.cause?.code || error?.cause?.message || "";
    throw new Error(`GitHub network request failed: ${error.message}${cause ? ` (${cause})` : ""}`);
  }
  updateGithubRateBudgetFromHeaders(response, url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(githubResponseErrorMessage(response.status, text));
  }
  if (response.status === 204) {
    return null;
  }
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (options.returnHeaders) {
    return {
      data,
      headers: response.headers
    };
  }
  return data;
}

async function githubRateLimitStatus(token) {
  if (!token) {
    throw new Error("GitHub token is required");
  }
  const data = await githubRequest("https://api.github.com/rate_limit", token);
  const resources = data?.resources || {};
  seedGithubRateBudgets(resources);
  return {
    checkedAt: new Date().toISOString(),
    resources
  };
}

function isGithubAuthError(error) {
  return /401|bad credentials|requires authentication|GitHub token is required/i.test(String(error?.message || ""));
}

function isGithubRateLimitError(error) {
  return /api rate limit exceeded|secondary rate limit|rate limit|too many requests|abuse detection|限流|频率限制/i.test(String(error?.message || ""));
}

async function githubGraphqlRequest(query, variables, token) {
  if (!token) {
    throw new Error("GitHub token is required for GraphQL trend lookup");
  }
  for (let attempt = 0; attempt <= 4; attempt += 1) {
    const response = await githubRequest("https://api.github.com/graphql", token, {
      method: "POST",
      body: JSON.stringify({ query, variables }),
      headers: {
        "Content-Type": "application/json"
      }
    });
    if (!response?.errors?.length) {
      return response?.data || {};
    }
    const message = response.errors.map((error) => error.message).join("; ");
    if (isGithubRateLimitError({ message }) && attempt < 4) {
      const delay = secondaryRateLimitDelay(attempt);
      setGithubCooldown(delay);
      await sleep(delay);
      continue;
    }
    throw new Error(message);
  }
  return {};
}

async function fetchJson(url, token) {
  return githubRequest(url, token);
}

async function githubRepositorySearchCount(token, query = "") {
  if (!token) {
    throw new Error("GitHub token is required for repository search count");
  }
  const cleanQuery = String(query || "").replace(/\s+/g, " ").trim();
  if (!cleanQuery) {
    return {
      query: "",
      totalCount: 0,
      incompleteResults: false
    };
  }
  const url = new URL("https://api.github.com/search/repositories");
  url.searchParams.set("q", cleanQuery);
  url.searchParams.set("per_page", "1");
  url.searchParams.set("page", "1");
  const json = await fetchJson(url.toString(), token);
  return {
    query: cleanQuery,
    totalCount: Number(json?.total_count || 0),
    incompleteResults: Boolean(json?.incomplete_results)
  };
}

async function sampleRepositorySearchResults(token, query = "", limit = 8) {
  if (!token) {
    throw new Error("GitHub token is required for repository search samples");
  }
  const cleanQuery = String(query || "").replace(/\s+/g, " ").trim();
  if (!cleanQuery) return [];
  const url = new URL("https://api.github.com/search/repositories");
  url.searchParams.set("q", cleanQuery);
  url.searchParams.set("per_page", String(Math.max(1, Math.min(20, Number(limit || 8)))));
  url.searchParams.set("page", "1");
  const json = await fetchJson(url.toString(), token);
  return (json.items || []).map((item) =>
    normalizeRepo(item, {
      key: "observation-sample",
      label: "Observation sample"
    })
  );
}

function normalizeRepo(item, profile) {
  return {
    id: item.id,
    fullName: item.full_name,
    name: item.name,
    owner: item.owner?.login || "",
    ownerAvatar: item.owner?.avatar_url || "",
    url: item.html_url,
    description: item.description || "",
    homepage: item.homepage || "",
    language: item.language || "",
    topics: item.topics || [],
    stars: item.stargazers_count || 0,
    forks: item.forks_count || 0,
    watchers: item.watchers_count || 0,
    openIssues: item.open_issues_count || 0,
    defaultBranch: item.default_branch || "",
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    pushedAt: item.pushed_at,
    license: item.license
      ? {
          key: item.license.key,
          name: item.license.name,
          spdxId: item.license.spdx_id,
          url: item.license.url
        }
      : null,
    archived: Boolean(item.archived),
    disabled: Boolean(item.disabled),
    fork: Boolean(item.fork),
    profileKey: profile.key,
    profileLabel: profile.label
  };
}

function decodeHtml(value = "") {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)));
}

function stripHtml(value = "") {
  return decodeHtml(
    String(value || "")
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function parseCount(value = "") {
  const number = Number(String(value || "").replace(/[^\d]/g, ""));
  return Number.isFinite(number) ? number : null;
}

function trendingPeriodLabel(period = "daily") {
  return {
    daily: "daily",
    weekly: "weekly",
    monthly: "monthly"
  }[period] || "daily";
}

function normalizeTrendingPeriod(period = "daily") {
  return ["daily", "weekly", "monthly"].includes(period) ? period : "daily";
}

function trendingStarsInPeriod(text = "", period = "daily") {
  const label = {
    daily: "today",
    weekly: "this week",
    monthly: "this month"
  }[period] || "today";
  const match = String(text || "").match(new RegExp(`([\\d,]+)\\s+stars?\\s+${label}`, "i"));
  return match ? parseCount(match[1]) : null;
}

function parseTrendingRepositories(html = "", period = "daily") {
  const normalizedPeriod = normalizeTrendingPeriod(period);
  const articles = String(html || "").match(/<article\b[\s\S]*?<\/article>/gi) || [];
  const parsed = [];

  for (const article of articles) {
    const repoMatch = article.match(/<h2[\s\S]*?<a[^>]+href="\/([^"?#/]+)\/([^"?#]+)"[^>]*>/i);
    if (!repoMatch) continue;
    const owner = decodeURIComponent(decodeHtml(repoMatch[1] || "")).trim();
    const name = decodeURIComponent(decodeHtml(repoMatch[2] || "")).trim();
    if (!owner || !name) continue;

    const fullName = `${owner}/${name}`;
    const descriptionMatch = article.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
    const languageMatch = article.match(/itemprop="programmingLanguage"[^>]*>([\s\S]*?)<\/span>/i);
    const plain = stripHtml(article);
    parsed.push({
      fullName,
      owner,
      name,
      url: `https://github.com/${fullName}`,
      description: descriptionMatch ? stripHtml(descriptionMatch[1]) : "",
      language: languageMatch ? stripHtml(languageMatch[1]) : "",
      rank: parsed.length + 1,
      period: normalizedPeriod,
      starsInPeriod: trendingStarsInPeriod(plain, normalizedPeriod)
    });
  }

  return parsed;
}

async function fetchTrendingHtml(period = "daily", token = "", options = {}) {
  const url = new URL("https://github.com/trending");
  url.searchParams.set("since", normalizeTrendingPeriod(period));
  const timeoutMs = Math.max(3000, Math.min(Number(options.timeoutMs || 12000), 30000));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url.toString(), {
      headers: htmlHeaders(token),
      signal: controller.signal
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GitHub Trending request failed ${response.status}: ${text.slice(0, 180)}`);
    }
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function trendingSignal(item) {
  const period = normalizeTrendingPeriod(item.period);
  const periodWeight = {
    daily: 1.6,
    weekly: 1.25,
    monthly: 1
  }[period];
  return {
    source: "github-trending",
    title: `GitHub Trending ${trendingPeriodLabel(period)} #${item.rank}`,
    url: `https://github.com/trending?since=${period}`,
    snippet: `Appeared on GitHub Trending ${trendingPeriodLabel(period)} ranking.`,
    period,
    rank: item.rank,
    starsInPeriod: item.starsInPeriod,
    weight: Number((periodWeight + Math.max(0, 26 - Number(item.rank || 26)) / 60).toFixed(2))
  };
}

async function fetchRepositoryByFullName(token, fullName, profile) {
  const { owner, repo } = splitFullName(fullName);
  const item = await fetchJson(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, token);
  return normalizeRepo(item, profile);
}

async function fetchTrendingRepositories(options = {}) {
  const {
    token = "",
    periods = ["daily", "weekly", "monthly"],
    perPeriod = 25,
    maxRepos = 60,
    concurrency = 3,
    onProgress = null
  } = options || {};
  if (!token) {
    throw new Error("GitHub token is required for project scans");
  }
  const normalizedPeriods = Array.from(new Set(periods.map(normalizeTrendingPeriod)));
  const signals = new Map();
  const errors = [];
  const profiles = normalizedPeriods.map((period) => `github-trending-${period}`);
  let completed = 0;
  let total = normalizedPeriods.length;
  const report = (extra = {}) => {
    if (typeof onProgress === "function") {
      onProgress({
        completed,
        total,
        found: signals.size,
        ...extra
      });
    }
  };

  for (const period of normalizedPeriods) {
    try {
      const html = await fetchTrendingHtml(period, token, options);
      const items = parseTrendingRepositories(html, period).slice(0, Math.max(1, Math.min(Number(perPeriod || 25), 50)));
      for (const item of items) {
        const list = signals.get(item.fullName) || [];
        list.push(trendingSignal(item));
        signals.set(item.fullName, list);
      }
    } catch (error) {
      if (isGithubAuthError(error) || isGithubRateLimitError(error)) {
        throw error;
      }
      errors.push({
        profile: `github-trending-${period}`,
        message: error.name === "AbortError" ? "GitHub Trending request timed out" : error.message
      });
    } finally {
      completed += 1;
      report({ period });
    }
  }

  const fullNames = Array.from(signals.keys()).slice(0, Math.max(0, Math.min(Number(maxRepos || 60), 100)));
  const repositories = [];
  total += fullNames.length;
  let index = 0;
  const workerCount = Math.max(1, Math.min(Number(concurrency || 3), 5, fullNames.length || 1));

  async function worker() {
    while (index < fullNames.length) {
      const fullName = fullNames[index];
      index += 1;
      const primary = signals.get(fullName)?.[0] || {};
      const profile = {
        key: `github-trending-${primary.period || "daily"}`,
        label: `GitHub Trending ${trendingPeriodLabel(primary.period || "daily")}`
      };
      try {
        const repository = await fetchRepositoryByFullName(token, fullName, profile);
        repository.source = "github-trending";
        repositories.push(repository);
        if (repository.fullName && repository.fullName !== fullName && signals.has(fullName)) {
          signals.set(repository.fullName, signals.get(fullName));
        }
      } catch (error) {
        if (isGithubAuthError(error) || isGithubRateLimitError(error)) {
          throw error;
        }
        errors.push({
          profile: profile.key,
          fullName,
          message: error.message
        });
      } finally {
        completed += 1;
        report({ fullName, repositories: repositories.length });
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return {
    repositories,
    signals,
    errors,
    profiles,
    found: signals.size
  };
}

async function searchCandidateRepositories(options) {
  const {
    token = "",
    maxRepos = 800,
    pagesPerProfile = 2,
    profiles = buildQueryProfiles(),
    onProgress = null
  } = options || {};
  if (!token) {
    throw new Error("GitHub token is required for project scans");
  }

  const deduped = new Map();
  const errors = [];
  const usedProfiles = [];
  const profileCounts = new Map();
  const totalSteps = profiles.length * pagesPerProfile;
  let completedSteps = 0;

  for (const profile of profiles) {
    const profileCap = candidateCapForProfile(maxRepos, profiles.length, profile);
    usedProfiles.push(profile.key);
    for (let page = 1; page <= pagesPerProfile; page += 1) {
      if (deduped.size >= maxRepos) {
        break;
      }
      if ((profileCounts.get(profile.key) || 0) >= profileCap) {
        break;
      }

      const url = new URL("https://api.github.com/search/repositories");
      url.searchParams.set("q", profile.q);
      url.searchParams.set("sort", "stars");
      url.searchParams.set("order", "desc");
      url.searchParams.set("per_page", "50");
      url.searchParams.set("page", String(page));

      try {
        const json = await fetchJson(url.toString(), token);
        for (const item of json.items || []) {
          const normalized = normalizeRepo(item, profile);
          if (!repositoryMatchesPlanProfile(normalized, profile)) {
            continue;
          }
          if (!deduped.has(normalized.fullName.toLowerCase())) {
            deduped.set(normalized.fullName.toLowerCase(), normalized);
            profileCounts.set(profile.key, (profileCounts.get(profile.key) || 0) + 1);
            if ((profileCounts.get(profile.key) || 0) >= profileCap) {
              break;
            }
          }
        }
      } catch (error) {
        if (isGithubAuthError(error) || isGithubRateLimitError(error)) {
          throw error;
        }
        errors.push({
          profile: profile.key,
          page,
          message: error.message
        });
        break;
      } finally {
        completedSteps += 1;
        if (typeof onProgress === "function") {
          onProgress({
            profile: profile.key,
            page,
            completed: completedSteps,
            total: totalSteps,
            found: deduped.size
          });
        }
      }
    }
  }

  return {
    repositories: Array.from(deduped.values()).slice(0, maxRepos),
    profiles: usedProfiles,
    errors
  };
}

function candidateCapForProfile(maxRepos, profileCount, profile = {}) {
  const baseProfileCap = Math.max(12, Math.ceil(Number(maxRepos || 0) / Math.max(1, Number(profileCount || 0))));
  const multiplier = Math.max(0.7, Math.min(2.2, Number(profile.profileCapMultiplier || 1)));
  return Math.max(12, Math.ceil(baseProfileCap * multiplier));
}

async function getAuthenticatedUser(token) {
  if (!token) {
    throw new Error("GitHub token is required");
  }
  const user = await fetchJson("https://api.github.com/user", token);
  return {
    login: user.login,
    name: user.name || "",
    avatarUrl: user.avatar_url || "",
    url: user.html_url || "",
    publicRepos: user.public_repos || 0,
    privateRepos: user.total_private_repos || 0
  };
}

async function listOwnRepositories(token, options = {}) {
  if (!token) {
    throw new Error("GitHub token is required");
  }
  const perPage = Math.max(1, Math.min(Number(options.perPage || 50), 100));
  const url = new URL("https://api.github.com/user/repos");
  url.searchParams.set("visibility", "all");
  url.searchParams.set("affiliation", "owner,collaborator,organization_member");
  url.searchParams.set("sort", "updated");
  url.searchParams.set("direction", "desc");
  url.searchParams.set("per_page", String(perPage));
  const repos = await fetchJson(url.toString(), token);
  return (repos || []).map((item) => ({
    ...normalizeRepo(item, {
      key: "github-owned",
      label: "My GitHub repositories"
    }),
    private: Boolean(item.private),
    visibility: item.visibility || (item.private ? "private" : "public"),
    permissions: item.permissions || {}
  }));
}

function splitFullName(fullName) {
  const [owner, repo] = String(fullName || "").split("/");
  if (!owner || !repo) {
    throw new Error("fullName must be owner/repo");
  }
  return { owner, repo };
}

function previousUtcDayWindow(reference = new Date()) {
  const end = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 1);
  return {
    start,
    end,
    date: start.toISOString().slice(0, 10)
  };
}

function lastPageFromLink(link = "") {
  const match = String(link || "").match(/[?&]page=(\d+)>;\s*rel="last"/);
  return match ? Number(match[1]) : 1;
}

function countEventsInWindow(events = [], dateField, window) {
  let count = 0;
  let hasOlder = false;
  for (const event of events) {
    const at = new Date(event[dateField] || 0);
    if (Number.isNaN(at.getTime())) continue;
    if (at >= window.start && at < window.end) {
      count += 1;
    } else if (at < window.start) {
      hasOlder = true;
    }
  }
  return { count, hasOlder };
}

function trendErrorReason(error) {
  const message = String(error?.message || "");
  if (/rate limit|secondary rate/i.test(message)) return "rate-limited";
  if (/\b401\b|bad credentials|requires authentication/i.test(message)) return "auth";
  if (/\b403\b|forbidden/i.test(message)) return "forbidden";
  if (/\b404\b|not found/i.test(message)) return "not-found";
  return "request-failed";
}

async function countRepositoryStarsWithGraphql({ token, owner, repo, window, maxPages = 20 }) {
  const query = `
    query RepositoryStargazers($owner: String!, $repo: String!, $cursor: String) {
      repository(owner: $owner, name: $repo) {
        stargazers(first: 100, after: $cursor, orderBy: {field: STARRED_AT, direction: DESC}) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            starredAt
          }
        }
      }
    }
  `;
  let count = 0;
  let complete = true;
  let cursor = null;

  for (let page = 0; page < maxPages; page += 1) {
    const data = await githubGraphqlRequest(query, { owner, repo, cursor }, token);
    const stargazers = data?.repository?.stargazers;
    const edges = Array.isArray(stargazers?.edges) ? stargazers.edges : [];
    if (!edges.length) return { count, complete };

    for (const edge of edges) {
      const at = new Date(edge.starredAt || 0);
      if (Number.isNaN(at.getTime())) continue;
      if (at >= window.start && at < window.end) {
        count += 1;
      } else if (at < window.start) {
        return { count, complete };
      }
    }

    if (!stargazers.pageInfo?.hasNextPage) return { count, complete };
    cursor = stargazers.pageInfo.endCursor;
  }

  complete = false;
  return { count, complete };
}

async function fetchRepositoryEventsPage({ token, owner, repo, path, page, headers: extraHeaders = {} }) {
  const url = new URL(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${path}`);
  url.searchParams.set("per_page", "100");
  url.searchParams.set("page", String(page));
  if (path === "forks") url.searchParams.set("sort", "newest");
  return githubRequest(url.toString(), token, {
    headers: extraHeaders,
    returnHeaders: true
  });
}

async function countRepositoryEventsSince({ token, owner, repo, path, dateField, window, maxPages = 20, headers: extraHeaders = {}, reverse = false }) {
  let count = 0;
  let complete = true;
  let page = 1;
  let step = 1;
  let hitPaginationCap = false;

  if (reverse) {
    const first = await fetchRepositoryEventsPage({ token, owner, repo, path, page: 1, headers: extraHeaders });
    const firstEvents = Array.isArray(first.data) ? first.data : [];
    if (!firstEvents.length) return { count, complete };
    page = lastPageFromLink(first.headers.get("link")) || 1;
    hitPaginationCap = path === "stargazers" && page >= 400;
    step = -1;
  }

  for (let fetched = 0; fetched < maxPages && page >= 1; fetched += 1, page += step) {
    const response = await fetchRepositoryEventsPage({ token, owner, repo, path, page, headers: extraHeaders });
    const events = Array.isArray(response.data) ? response.data : [];
    if (!events.length) return { count, complete };

    const pageCount = countEventsInWindow(events, dateField, window);
    count += pageCount.count;

    if (pageCount.hasOlder) return { count, complete: complete && !hitPaginationCap };
    if (!reverse && events.length < 100) return { count, complete };
  }

  complete = false;
  return { count, complete };
}

async function repositoryOnlineTrend(token, fullName, options = {}) {
  const { owner, repo } = splitFullName(fullName);
  const window = previousUtcDayWindow(options.reference || new Date());
  const stars = await countRepositoryStarsWithGraphql({
    token,
    owner,
    repo,
    window,
    maxPages: options.maxPages || 20
  }).catch(() =>
    countRepositoryEventsSince({
      token,
      owner,
      repo,
      path: "stargazers",
      dateField: "starred_at",
      window,
      maxPages: options.maxPages || 20,
      reverse: true,
      headers: {
        Accept: "application/vnd.github.star+json"
      }
    })
  );
  const forks = await countRepositoryEventsSince({
    token,
    owner,
    repo,
    path: "forks",
    dateField: "created_at",
    window,
    maxPages: options.maxPages || 20
  });
  return {
    fullName,
    stars: stars.count,
    forks: forks.count,
    period: "previous-day-online",
    date: window.date,
    source: "github-online",
    method: "graphql-star-v1",
    starsComplete: stars.complete,
    forksComplete: forks.complete,
    complete: stars.complete && forks.complete,
    cached: true,
    pending: false
  };
}

async function repositoryOnlineTrends(token, fullNames = [], options = {}) {
  if (!token) {
    throw new Error("GitHub token is required for project scans");
  }
  const unique = Array.from(new Set(fullNames.map((item) => String(item || "").trim()).filter(Boolean))).slice(0, options.limit || 30);
  const items = {};
  const errors = [];
  const concurrency = Math.max(1, Math.min(Number(options.concurrency || 2), 2));
  const onProgress = typeof options.onProgress === "function" ? options.onProgress : null;
  let index = 0;
  let completed = 0;

  async function worker() {
    while (index < unique.length) {
      const fullName = unique[index];
      index += 1;
      try {
        items[fullName] = await repositoryOnlineTrend(token, fullName, options);
      } catch (error) {
        if (isGithubAuthError(error) || isGithubRateLimitError(error)) {
          throw error;
        }
        errors.push({ fullName, message: error.message });
        items[fullName] = {
          fullName,
          stars: null,
          forks: null,
          period: "previous-day-online",
          date: previousUtcDayWindow(options.reference || new Date()).date,
          source: "github-online",
          complete: false,
          pending: false,
          cached: true,
          reason: trendErrorReason(error),
          error: error.message
        };
      } finally {
        completed += 1;
        if (onProgress) {
          onProgress({
            completed,
            total: unique.length,
            fullName
          });
        }
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, unique.length) }, () => worker()));
  return {
    items,
    errors
  };
}

async function starRepository(token, fullName) {
  if (!token) {
    throw new Error("GitHub token is required");
  }
  const { owner, repo } = splitFullName(fullName);
  await githubRequest(`https://api.github.com/user/starred/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, token, {
    method: "PUT",
    headers: {
      "Content-Length": "0"
    }
  });
  return {
    ok: true,
    fullName
  };
}

async function unstarRepository(token, fullName) {
  if (!token) {
    throw new Error("GitHub token is required");
  }
  const { owner, repo } = splitFullName(fullName);
  await githubRequest(`https://api.github.com/user/starred/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, token, {
    method: "DELETE"
  });
  return {
    ok: true,
    fullName
  };
}

async function forkRepository(token, fullName) {
  if (!token) {
    throw new Error("GitHub token is required");
  }
  const { owner, repo } = splitFullName(fullName);
  const fork = await githubRequest(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/forks`, token, {
    method: "POST",
    body: JSON.stringify({}),
    headers: {
      "Content-Type": "application/json"
    }
  });
  return fork
    ? normalizeRepo(fork, {
        key: "github-fork",
        label: "Forked repository"
      })
    : {
        ok: true,
        fullName
      };
}

module.exports = {
  applyMemoryToQueryProfiles,
  buildQueryProfiles,
  candidateCapForProfile,
  fetchTrendingRepositories,
  fetchJson,
  fetchRepositoryByFullName,
  forkRepository,
  getAuthenticatedUser,
  githubRepositorySearchCount,
  githubRateLimitStatus,
  githubRequest,
  isGithubAuthError,
  isGithubRateLimitError,
  normalizeGithubOrGroups,
  parseTrendingRepositories,
  repositoryOnlineTrends,
  repositoryMatchesPlanProfile,
  listOwnRepositories,
  normalizeRepo,
  sampleRepositorySearchResults,
  starRepository,
  unstarRepository,
  searchCandidateRepositories
};
