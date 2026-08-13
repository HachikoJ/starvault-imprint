(function () {
  const domainCore = window.StarVaultDomainCore;
  if (!domainCore) throw new Error("StarVault domain core is unavailable");
  const SECRETS_KEY = "localSecrets";
  const LAST_PORTABLE_EXPORT_KEY = "lastPortableExportAt";
  const STORAGE_MODE_KEY = "starvault.storageMode";
  const DEFAULT_PROVIDER = {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    models: ["deepseek-chat"],
    model: "deepseek-chat",
    enabled: true
  };
  const DEFAULT_OBSERVATION_REQUIREMENTS = [
    "我想先用默认观察长期盯 GitHub 上真正能做成工具、服务或工作流的开源项目，不要只是论文、教程、awesome 列表这类资料合集。",
    "项目池要覆盖自托管应用、开源替代、SaaS/全栈模板、管理后台、浏览器插件、桌面/移动端、本地优先和个人效率工具这些更容易落地的方向。",
    "开发者工具这块也要持续关注，包括 API 客户端、CLI、本地开发工具、测试质量、集成平台和工作流自动化，重点看能不能提升实际效率。",
    "内容创作和设计工具不要漏掉，比如视频剪辑、字幕配音、录屏演示、音频播客、画布编辑、白板图表、视觉素材和演示文稿工具。",
    "数据、知识和业务系统也要保留在默认观察里，包括数据看板、ETL/数据管道、知识库/RAG、文档搜索、CRM/客服、电商、内容管理、支付发票和增长运营。",
    "AI 相关不要泛泛搜概念，尽量找能落地的 AI 聊天产品、AI 工作台、RAG 产品、AI 设计/媒体工具、具体 Agent 产品和模型服务相关项目。",
    "入池项目要优先考虑近期有更新、有一定 Star/Fork 热度、许可边界更清楚、可维护性更好的项目；风险只在确实需要警觉时提醒。",
    "学习中枢要根据我的收藏、Star/Fork、研判、AI 分析、不合适/隐藏这些明确行为调整项目池和榜单，普通点开看看不参与偏好学习。",
    "默认观察就当作通用起步方案，先保持只读；如果我要看 CAD、PS、CRM、AI 硬件这类具体领域，再单独新建观察方案。"
  ];
  const MEMORY_EVENT_WEIGHTS = {
    select_project: 0,
    open_github: 0.12,
    copy_url: 0.16,
    ai_analyze: 1,
    triage_note: 1.6,
    leaderboard_positive: 1.4,
    favorite: 2.6,
    leaderboard_strong_positive: 2.8,
    star: 3.2,
    fork: 4.2,
    unfavorite: -1.6,
    unstar: -2.1,
    leaderboard_negative: -2.6,
    dismiss_project: -0.35
  };
  const localTaskPromises = new Map();
  const githubRateBudgets = new Map();
  let githubRequestGate = Promise.resolve();
  let githubNextRequestAt = 0;
  let githubCooldownUntil = 0;
  const DEFAULT_BROWSER_QUERY_GROUPS = [
    ["自托管应用", "self hosted app stars:>100 pushed:>=2024-01-01"],
    ["开源替代", "open source alternative stars:>100 pushed:>=2024-01-01"],
    ["本地优先", "local first app stars:>50 pushed:>=2024-01-01"],
    ["个人效率", "personal productivity app stars:>50 pushed:>=2024-01-01"],
    ["桌面应用", "desktop app stars:>100 pushed:>=2024-01-01"],
    ["浏览器扩展", "browser extension productivity stars:>50 pushed:>=2024-01-01"],
    ["开发者工具", "developer tool stars:>100 pushed:>=2024-01-01"],
    ["命令行工具", "cli tool stars:>100 pushed:>=2024-01-01"],
    ["API 客户端", "api client tool stars:>50 pushed:>=2024-01-01"],
    ["测试工具", "testing tool developer stars:>50 pushed:>=2024-01-01"],
    ["工作流自动化", "workflow automation stars:>100 pushed:>=2024-01-01"],
    ["集成平台", "integration platform self hosted stars:>50 pushed:>=2024-01-01"],
    ["管理后台", "admin dashboard self hosted stars:>100 pushed:>=2024-01-01"],
    ["SaaS 模板", "saas starter full stack stars:>100 pushed:>=2024-01-01"],
    ["客户管理", "open source crm self hosted stars:>50 pushed:>=2024-01-01"],
    ["客服工单", "helpdesk ticketing self hosted stars:>50 pushed:>=2024-01-01"],
    ["内容管理", "headless cms self hosted stars:>100 pushed:>=2024-01-01"],
    ["数据看板", "data dashboard analytics stars:>100 pushed:>=2024-01-01"],
    ["数据管道", "etl data pipeline stars:>100 pushed:>=2024-01-01"],
    ["知识库", "knowledge base self hosted stars:>100 pushed:>=2024-01-01"],
    ["文档搜索", "document search app stars:>50 pushed:>=2024-01-01"],
    ["RAG 产品", "rag knowledge base app stars:>100 pushed:>=2024-01-01"],
    ["AI 聊天产品", "ai chat app self hosted stars:>100 pushed:>=2024-01-01"],
    ["AI 工作台", "ai workspace app stars:>50 pushed:>=2024-01-01"],
    ["Agent 产品", "ai agent platform app stars:>100 pushed:>=2024-01-01"],
    ["设计工具", "design editor open source stars:>100 pushed:>=2024-01-01"],
    ["视频工具", "video editor open source stars:>100 pushed:>=2024-01-01"],
    ["音频工具", "audio editor open source stars:>100 pushed:>=2024-01-01"],
    ["白板图表", "whiteboard diagram editor stars:>100 pushed:>=2024-01-01"],
    ["演示工具", "presentation editor generator stars:>50 pushed:>=2024-01-01"]
  ];

  const storage = () => window.StarVaultIndexedDB || null;
  const nowIso = () => new Date().toISOString();
  const lower = (value) => String(value || "").toLowerCase();
  const projectKey = (fullName) => lower(fullName).trim();
  const clone = (value, fallback = null) => {
    try {
      return JSON.parse(JSON.stringify(value ?? fallback));
    } catch {
      return fallback;
    }
  };

  function defaultBrowserSearchLogic() {
    const customQueries = DEFAULT_BROWSER_QUERY_GROUPS.map(([label, core], index) => ({
      key: `browser-default-${index + 1}`,
      label,
      labelZh: label,
      labelEn: label,
      query: `${core} in:name,description,readme archived:false mirror:false`,
      stars: 0
    }));
    return {
      baseMode: "only",
      keywords: [],
      excludeTerms: ["awesome list", "paper list", "tutorial", "course", "toy example"],
      customQueries,
      minStars: 0
    };
  }

  function localModeForced() {
    try {
      return window.localStorage.getItem(STORAGE_MODE_KEY) === "indexeddb";
    } catch {
      return false;
    }
  }

  function activateLocalMode() {
    try {
      window.localStorage.setItem(STORAGE_MODE_KEY, "indexeddb");
    } catch {
      /* ignore */
    }
    return true;
  }

  function deactivateLocalMode() {
    try {
      window.localStorage.removeItem(STORAGE_MODE_KEY);
    } catch {
      /* ignore */
    }
    return true;
  }

  async function getSnapshot(options = {}) {
    const db = storage();
    return db?.getSnapshot ? db.getSnapshot(options) : null;
  }

  async function saveSnapshot(snapshot) {
    const db = storage();
    if (!db?.putSnapshot) throw new Error("IndexedDB is unavailable");
    ensureDefaultObservationPlan(snapshot);
    snapshot.exportedAt = nowIso();
    snapshot.store = snapshot.store || {};
    snapshot.store.updatedAt = nowIso();
    return db.putSnapshot(snapshot, { preserveProjects: true });
  }

  async function getSecrets() {
    const db = storage();
    return (await db?.getValue?.(SECRETS_KEY)) || {};
  }

  async function saveSecrets(secrets) {
    const db = storage();
    if (!db?.putValue) return;
    await db.putValue(SECRETS_KEY, secrets || {});
  }

  function emptySnapshot() {
    const createdAt = nowIso();
    const defaultPlan = {
      id: "default",
      name: "默认观察",
      nameEn: "Default Observation",
      description: "本地 IndexedDB 默认观察方案。",
      descriptionEn: "Default local IndexedDB observation plan.",
      requirements: defaultObservationRequirements(createdAt),
      builtIn: true,
      active: true,
      createdAt,
      updatedAt: createdAt,
      strategy: defaultBrowserSearchLogic(),
      searchLogic: defaultBrowserSearchLogic(),
      summary: {},
      memory: defaultMemory(),
      userData: defaultUserData()
    };
    return {
      schema: "starvault-indexeddb-snapshot/v1",
      exportedAt: createdAt,
      app: { name: "StarVault Imprint", nameZh: "星仓印记" },
      privacy: {
        localOnly: true,
        secretsIncluded: false,
        excluded: ["githubToken", "tavilyKey", "exaKey", "llmProviders.apiKey"]
      },
      activeObservationPlanId: "default",
      settings: defaultSettings(),
      store: {
        version: 1,
        createdAt,
        updatedAt: createdAt,
        projects: {},
        scans: [],
        tasks: {},
        leaderboards: { daily: {} },
        memory: defaultPlan.memory,
        observationPlans: { default: defaultPlan }
      },
      counts: { projects: 0, scans: 0, observationPlans: 1 }
    };
  }

  function defaultObservationRequirements(timestamp = nowIso()) {
    return DEFAULT_OBSERVATION_REQUIREMENTS.map((text, index) => ({
      id: `default-observation-requirement-${index + 1}`,
      text,
      createdAt: timestamp,
      updatedAt: timestamp
    }));
  }

  function ensureDefaultObservationPlan(snapshot = {}) {
    snapshot.store = snapshot.store || {};
    snapshot.store.observationPlans = snapshot.store.observationPlans || {};
    if (!snapshot.store.observationPlans.default) {
      snapshot.store.observationPlans.default = emptySnapshot().store.observationPlans.default;
    }
    const plan = snapshot.store.observationPlans.default;
    const timestamp = plan.createdAt || nowIso();
    plan.id = "default";
    plan.builtIn = true;
    plan.requirements = defaultObservationRequirements(timestamp);
    const logic = plan.searchLogic || plan.strategy || {};
    if (!Array.isArray(logic.customQueries) || logic.customQueries.length === 0) {
      plan.searchLogic = defaultBrowserSearchLogic();
      plan.strategy = plan.searchLogic;
    }
    plan.updatedAt = plan.updatedAt || timestamp;
    return plan;
  }

  async function requireSnapshot() {
    const snapshot = (await getSnapshot({ includeProjects: false })) || emptySnapshot();
    snapshot.store = snapshot.store || {};
    snapshot.store.projects = snapshot.store.projects || {};
    snapshot.store.scans = Array.isArray(snapshot.store.scans) ? snapshot.store.scans : [];
    snapshot.store.tasks = snapshot.store.tasks && typeof snapshot.store.tasks === "object" ? snapshot.store.tasks : {};
    snapshot.store.leaderboards = snapshot.store.leaderboards || { daily: {} };
    snapshot.store.observationPlans = snapshot.store.observationPlans || {};
    ensureDefaultObservationPlan(snapshot);
    snapshot.activeObservationPlanId = snapshot.activeObservationPlanId || snapshot.settings?.activeObservationPlanId || "default";
    snapshot.settings = { ...defaultSettings(), ...(snapshot.settings || {}), activeObservationPlanId: snapshot.activeObservationPlanId };
    const active = activePlan(snapshot);
    snapshot.store.memory = active.memory || snapshot.store.memory || defaultMemory();
    snapshot.counts = {
      projects: Number(snapshot.counts?.projects || 0),
      scans: snapshot.store.scans.length,
      observationPlans: Object.keys(snapshot.store.observationPlans || {}).length
    };
    return snapshot;
  }

  function defaultSettings() {
    return {
      language: "zh",
      dailyBriefSize: 120,
      defaultSort: "opportunity",
      activeProvider: "deepseek",
      activeObservationPlanId: "default",
      providerCatalog: { updatedAt: "", endpoints: [] },
      llmProviders: [{ ...DEFAULT_PROVIDER }]
    };
  }

  function defaultUserData() {
    return {
      watchlist: {},
      githubActions: {},
      notes: {},
      analysis: {},
      dismissedProjects: {}
    };
  }

  function defaultMemory() {
    return {
      shortTerm: [],
      events: [],
      preferences: { categories: {}, useCases: {}, languages: {}, licenses: {}, riskLevels: {} },
      negativePreferences: { categories: {}, useCases: {}, languages: {}, licenses: {}, riskLevels: {}, repositories: {} },
      discoveryProfiles: {},
      manualPreferences: { categories: {}, useCases: {}, languages: {}, licenses: {}, riskLevels: {} },
      manualNegativePreferences: { categories: {}, useCases: {}, languages: {}, licenses: {}, riskLevels: {}, repositories: {} },
      antiBubble: { explorationRatio: 0.25, diversityFloor: 0.35, noveltyRatio: 0.2 },
      stats: { eventCounts: {} },
      context: {
        rawEventLimit: 300,
        shortTermLimit: 80,
        compactAfterEvents: 180,
        keepRecentEvents: 120,
        chunks: []
      },
      harness: { policyVersion: "memory-harness-v1", mode: "local-indexeddb", runs: [], recommendations: [] }
    };
  }

  function planById(snapshot, requestedId = "") {
    const plans = snapshot.store?.observationPlans || {};
    const id = requestedId || snapshot.activeObservationPlanId || snapshot.settings?.activeObservationPlanId || "default";
    return plans[id] || plans.default || Object.values(plans)[0] || emptySnapshot().store.observationPlans.default;
  }

  function activePlan(snapshot) {
    return planById(snapshot);
  }

  function userDataForPlan(snapshot, planId = "") {
    const plan = planById(snapshot, planId);
    plan.userData = { ...defaultUserData(), ...(plan.userData || {}) };
    return plan.userData;
  }

  function activeUserData(snapshot) {
    return userDataForPlan(snapshot);
  }

  function publicPlan(plan, activeId, includeMemory = false) {
    const isDefault = plan?.id === "default";
    const view = {
      ...plan,
      active: plan.id === activeId,
      requirements: isDefault ? defaultObservationRequirements(plan.createdAt || nowIso()) : plan.requirements,
      searchLogic: plan.searchLogic || plan.strategy || {},
      strategy: plan.searchLogic || plan.strategy || {}
    };
    if (!includeMemory) {
      delete view.memory;
      delete view.userData;
    } else {
      view.memory = view.memory || defaultMemory();
      view.userData = { ...defaultUserData(), ...(view.userData || {}) };
    }
    return view;
  }

  function withUserState(project, snapshot, planId = "") {
    const key = projectKey(project.fullName);
    const userData = userDataForPlan(snapshot, planId);
    const note = userData.notes?.[key] || {};
    return {
      ...project,
      watched: Boolean(userData.watchlist?.[key]),
      note: note.text || "",
      triageStatus: note.status || "",
      noteUpdatedAt: note.updatedAt || "",
      analysis: userData.analysis?.[key] || null,
      dismissed: Boolean(userData.dismissedProjects?.[key]),
      githubAction: userData.githubActions?.[key] || null
    };
  }

  function projectMatchesPlan(project, snapshot) {
    const plan = activePlan(snapshot);
    const matches = project.observationPlanMatches || project.observationMatches || [];
    const matchIds = Array.isArray(matches)
      ? matches.map((item) => String(typeof item === "string" ? item : item?.planId || item?.id || "")).filter(Boolean)
      : Object.keys(matches || {});
    if (!plan || plan.id === "default") return matchIds.length === 0 || matchIds.includes("default");
    if (matchIds.includes(plan.id)) return true;
    if (matchIds.length) return false;
    const haystack = [project.fullName, project.name, project.description, project.language, ...(project.topics || [])].join(" ").toLowerCase();
    const logic = plan.searchLogic || plan.strategy || {};
    const keywords = Array.isArray(logic.keywords) ? logic.keywords : [];
    return keywords.some((keyword) => haystack.includes(lower(keyword)));
  }

  function riskLevel(project) {
    const risk = Number(project.scores?.risk || project.scores?.overallRisk || 0);
    if (risk >= 60) return "critical";
    if (risk >= 35) return "high";
    if (risk >= 15) return "medium";
    return "low";
  }

  function analysisRecommendation(project) {
    return project.analysis?.recommendation || project.analysis?.result?.recommendation || project.analysis?.result?.decision || "watch";
  }

  function projectHasAnalysis(project) {
    return Boolean(project.analysis?.result || project.analysis?.updatedAt || project.analysis?.raw || project.analysis?.recommendation);
  }

  function tagMatches(project, tag) {
    const [kind, rawValue = ""] = String(tag || "").split(/:(.*)/s);
    const value = lower(rawValue).trim();
    if (!kind || !value) return true;
    if (kind === "semantic") return semanticMatches(project, rawValue);
    if (kind === "owner") return lower(project.owner || project.fullName?.split("/")[0]) === value;
    if (kind === "category") return [project.category?.key, project.category?.label, project.category?.labelZh, project.category?.labelEn].some((item) => lower(item) === value);
    if (kind === "useCase") return [project.useCase?.key, project.useCase?.label, project.useCase?.labelZh, project.useCase?.labelEn].some((item) => lower(item) === value);
    if (kind === "language") return lower(project.language) === value;
    if (kind === "topic") return (project.topics || []).some((topic) => lower(topic) === value);
    return false;
  }

  function semanticMatches(project, rawValue) {
    const parts = String(rawValue || "").split("|").map(lower).filter(Boolean);
    if (!parts.length) return true;
    const haystack = [
      project.semantic?.problem?.key,
      project.semantic?.audience?.key,
      project.semantic?.shape?.key,
      project.useCase?.key,
      project.useCase?.label,
      project.useCase?.labelZh,
      project.category?.key,
      project.category?.label,
      project.description,
      ...(project.topics || [])
    ].join(" ").toLowerCase();
    return parts.some((part) => haystack.includes(part));
  }

  async function projectsForActivePlan(snapshot) {
    const db = storage();
    if (db?.getProjectsByPlan) return db.getProjectsByPlan(snapshot.activeObservationPlanId || "default");
    return Object.values(snapshot.store.projects || {});
  }

  async function projectsForKeys(snapshot, keys = []) {
    const db = storage();
    if (db?.getProjects) return db.getProjects(keys);
    return (keys || []).map((key) => snapshot.store.projects?.[projectKey(key)]).filter(Boolean);
  }

  async function projectForKey(snapshot, key = "") {
    const db = storage();
    if (db?.getProject) return db.getProject(projectKey(key));
    return snapshot.store.projects?.[projectKey(key)] || null;
  }

  async function hydratedProject(snapshot, key = "", planId = "") {
    const project = await projectForKey(snapshot, key);
    return project?.fullName ? withUserState(project, snapshot, planId) : null;
  }

  function filterProjects(snapshot, params = {}, sourceProjects = null) {
    let items = (sourceProjects || Object.values(snapshot.store.projects || {}))
      .map((project) => withUserState(project, snapshot))
      .filter((project) => projectMatchesPlan(project, snapshot));

    if (params.includeDismissed !== "true") items = items.filter((project) => !project.dismissed);
    if (params.q) {
      const q = lower(params.q);
      items = items.filter((project) => [project.fullName, project.owner, project.description, project.language, project.category?.label, project.useCase?.label, project.useCase?.labelZh, ...(project.topics || [])].join(" ").toLowerCase().includes(q));
    }
    if (params.category && params.category !== "all") items = items.filter((project) => project.category?.key === params.category);
    if (params.license && params.license !== "all") items = items.filter((project) => project.licensePolicy?.bucket === params.license);
    if (params.projectLanguage && params.projectLanguage !== "all") items = items.filter((project) => lower(project.language || "unknown") === lower(params.projectLanguage));
    if (params.risk && params.risk !== "all") items = items.filter((project) => riskLevel(project) === params.risk);
    if (params.watchlist === "true" || params.watchlist === true) items = items.filter((project) => project.watched);
    if (params.triageStatus && params.triageStatus !== "all") {
      items = params.triageStatus === "none" ? items.filter((project) => !project.triageStatus) : items.filter((project) => project.triageStatus === params.triageStatus);
    }
    if (params.aiAnalysis && params.aiAnalysis !== "all") {
      items = items.filter((project) => {
        const hasAnalysis = projectHasAnalysis(project);
        if (params.aiAnalysis === "unanalyzed") return !hasAnalysis;
        return hasAnalysis && analysisRecommendation(project) === params.aiAnalysis;
      });
    }
    if (params.tag) items = items.filter((project) => tagMatches(project, params.tag));
    for (const tag of [params.semanticProblem, params.semanticAudience, params.semanticShape]) {
      if (tag && tag !== "all") items = items.filter((project) => tagMatches(project, tag));
    }
    sortProjects(items, params.sort || snapshot.settings?.defaultSort || "opportunity", memoryForPlan(snapshot));
    return items;
  }

  function sortProjects(items, sort, memory = defaultMemory()) {
    const dateValue = (value) => new Date(value || 0).getTime() || 0;
    const score = (project, key) => Number(project.scores?.[key] || 0);
    items.sort((a, b) => {
      if (sort === "stars") return Number(b.stars || 0) - Number(a.stars || 0);
      if (sort === "updated") return dateValue(b.pushedAt) - dateValue(a.pushedAt);
      if (sort === "risk") return score(b, "risk") - score(a, "risk");
      if (sort === "momentum") return score(b, "momentum") - score(a, "momentum");
      if (sort === "actionability") return score(b, "actionability") - score(a, "actionability");
      if (sort === "productization") return score(b, "productization") - score(a, "productization");
      if (sort === "quality") return score(b, "quality") - score(a, "quality");
      const personalized = (project) => score(project, "opportunity") + domainCore.memoryScore(project, memory);
      return personalized(b) - personalized(a) || Number(b.stars || 0) - Number(a.stars || 0);
    });
  }

  function paginate(items, params = {}, defaultLimit = 10) {
    const total = items.length;
    const limit = params.limit === "all" ? total : Math.max(1, Math.min(Number(params.limit || defaultLimit), 500));
    const offset = Math.max(0, Number(params.offset || 0));
    return { items: items.slice(offset, offset + limit), total, limit, offset, sort: params.sort || "opportunity" };
  }

  function settingsResponse(snapshot, secrets, reveal = "") {
    const revealSet = new Set(String(reveal || "").split(",").map((item) => item.trim()).filter(Boolean));
    const settings = { ...defaultSettings(), ...(snapshot.settings || {}) };
    const providers = (settings.llmProviders || [DEFAULT_PROVIDER]).map((provider) => {
      const secretProvider = (secrets.llmProviders || {})[provider.id] || {};
      const apiKey = secretProvider.apiKey || provider.apiKey || "";
      const revealProvider = revealSet.has(`provider:${provider.id}`);
      return {
        ...provider,
        apiKey: revealProvider ? apiKey : "",
        apiKeySet: Boolean(apiKey),
        apiKeyPreview: apiKey ? `...${apiKey.slice(-4)}` : ""
      };
    });
    return {
      ...settings,
      activeProvider: "deepseek",
      githubToken: revealSet.has("github") ? secrets.githubToken || "" : "",
      githubTokenSet: Boolean(secrets.githubToken),
      githubTokenPreview: secrets.githubToken ? `${secrets.githubToken.slice(0, 8)}...${secrets.githubToken.slice(-4)}` : "",
      tavilyKey: revealSet.has("tavily") ? secrets.tavilyKey || "" : "",
      tavilyKeySet: Boolean(secrets.tavilyKey),
      tavilyKeyPreview: secrets.tavilyKey ? `${secrets.tavilyKey.slice(0, 8)}...${secrets.tavilyKey.slice(-4)}` : "",
      exaKey: revealSet.has("exa") ? secrets.exaKey || "" : "",
      exaKeySet: Boolean(secrets.exaKey),
      exaKeyPreview: secrets.exaKey ? `${secrets.exaKey.slice(0, 8)}...${secrets.exaKey.slice(-4)}` : "",
      llmProviders: providers
    };
  }

  function safeSettings(settings = {}) {
    const { githubToken, tavilyKey, exaKey, ...rest } = settings;
    return {
      ...rest,
      activeProvider: "deepseek",
      llmProviders: (settings.llmProviders || [DEFAULT_PROVIDER]).map(({ apiKey, clearApiKey, apiKeySet, apiKeyPreview, ...provider }) => provider)
    };
  }

  function updateCounts(snapshot) {
    const loadedProjectCount = Object.keys(snapshot.store.projects || {}).length;
    snapshot.counts = {
      projects: loadedProjectCount || Number(snapshot.counts?.projects || 0),
      scans: snapshot.store.scans?.length || 0,
      observationPlans: Object.keys(snapshot.store.observationPlans || {}).length
    };
    return snapshot;
  }

  function compactProject(project) {
    return {
      fullName: project.fullName,
      name: project.name,
      description: project.description,
      url: project.url,
      category: project.category,
      useCase: project.useCase,
      language: project.language,
      stars: project.stars,
      forks: project.forks,
      openIssues: project.openIssues,
      pushedAt: project.pushedAt,
      firstSeenAt: project.firstSeenAt,
      lastSeenAt: project.lastSeenAt,
      licensePolicy: project.licensePolicy,
      scores: project.scores,
      signals: project.signals,
      reasons: project.reasons,
      actions: project.actions
    };
  }

  function summary(snapshot, params = {}, sourceProjects = null) {
    const planProjects = sourceProjects || Object.values(snapshot.store.projects || {}).filter((project) => projectMatchesPlan(project, snapshot));
    const items = filterProjects(snapshot, { ...params, limit: "all" }, planProjects);
    const counts = {};
    const languages = {};
    const licenses = {};
    const topics = {};
    for (const project of items) {
      const cat = project.useCase?.key || project.category?.key || "other";
      counts[cat] = (counts[cat] || 0) + 1;
      if (project.language) languages[project.language] = (languages[project.language] || 0) + 1;
      const license = project.licensePolicy?.bucket || "unknown-no-license";
      licenses[license] = (licenses[license] || 0) + 1;
      for (const topic of project.topics || []) topics[topic] = (topics[topic] || 0) + 1;
    }
    const entries = (source, limit) => Object.entries(source).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([key, count]) => ({ key, count, share: items.length ? count / items.length : 0 }));
    const top = items.slice(0, 120).map(compactProject);
    return {
      totalProjects: planProjects.length,
      poolTotal: items.length,
      poolLimit: items.length,
      poolSort: params.sort || snapshot.settings?.defaultSort || "opportunity",
      watched: Object.keys(activeUserData(snapshot).watchlist || {}).length,
      scans: (snapshot.store.scans || []).slice(0, 10),
      lastScan: snapshot.store.scans?.[0] || null,
      byCategory: counts,
      byLicense: licenses,
      byRisk: {},
      distribution: {
        categories: entries(counts, 12),
        useCases: entries(counts, 12),
        languages: entries(languages, 10),
        licenses: entries(licenses, 8),
        topics: entries(topics, 28),
        semanticFilters: { problem: [], audience: [], shape: [] },
        semanticCatalog: { problem: [], audience: [], shape: [] },
        coverage: {
          categoryCount: Object.keys(counts).length,
          useCaseCount: Object.keys(counts).length,
          languageCount: Object.keys(languages).length,
          topicCount: Object.keys(topics).length,
          licenseReadyCount: licenses["permissive-commercial"] || 0,
          highHeatCount: items.filter((project) => Number(project.scores?.momentum || 0) >= 70).length,
          highRiskCount: items.filter((project) => ["high", "critical"].includes(riskLevel(project))).length
        }
      },
      brief: { newToday: 0, seenToday: 0, licenseReview: [], highTrend: [], scanErrors: [] },
      top
    };
  }

  function projectPeriodDelta(project, field, days) {
    const snapshots = (project.snapshots || []).slice().sort((a, b) => String(a.at || "").localeCompare(String(b.at || "")));
    if (snapshots.length < 2) return Number(project.trend?.[field] || 0);
    const cutoff = Date.now() - days * 86400000;
    const latest = snapshots[snapshots.length - 1];
    const baseline = snapshots.find((item) => new Date(item.at || 0).getTime() >= cutoff) || snapshots[0];
    return Math.max(0, Number(latest?.[field] || 0) - Number(baseline?.[field] || 0));
  }

  function browserLeaderboardScore(project, period, memory) {
    const memoryBoost = domainCore.memoryScore(project, memory);
    const opportunity = Number(project.scores?.opportunity || 0);
    const quality = Number(project.scores?.quality || 0);
    const momentum = Number(project.scores?.momentum || 0);
    const actionability = Number(project.scores?.actionability || 0);
    const community = Number(project.scores?.community || 0);
    const days = period === "daily" ? 1 : period === "weekly" ? 7 : period === "monthly" ? 30 : 3650;
    const starDelta = projectPeriodDelta(project, "stars", days);
    const forkDelta = projectPeriodDelta(project, "forks", days);
    const trendBoost = Math.min(24, Math.log10(1 + starDelta) * 8 + Math.log10(1 + forkDelta) * 5);
    const weights = {
      daily: [0.34, 0.12, 0.26, 0.16, 0.12],
      weekly: [0.36, 0.17, 0.2, 0.16, 0.11],
      monthly: [0.38, 0.22, 0.14, 0.16, 0.1],
      all: [0.34, 0.28, 0.08, 0.19, 0.11]
    }[period] || [0.36, 0.2, 0.16, 0.17, 0.11];
    const base = opportunity * weights[0] + quality * weights[1] + momentum * weights[2] + actionability * weights[3] + community * weights[4];
    return { score: Number((base + trendBoost + memoryBoost).toFixed(2)), memoryBoost: Number(memoryBoost.toFixed(2)), starDelta, forkDelta };
  }

  function buildLeaderboard(snapshot, params = {}, sourceProjects = null) {
    const limit = Math.max(5, Math.min(Number(params.limit || 20), 30));
    const period = ["daily", "weekly", "monthly", "all"].includes(params.period) ? params.period : "daily";
    const memory = memoryForPlan(snapshot);
    const ranked = filterProjects(snapshot, { sort: "opportunity", limit: "all" }, sourceProjects)
      .map((project) => ({ project, parts: browserLeaderboardScore(project, period, memory) }))
      .sort((a, b) => b.parts.score - a.parts.score || Number(b.project.stars || 0) - Number(a.project.stars || 0));
    const items = ranked.slice(0, limit).map(({ project, parts }, index) => ({
        ...project,
        rank: index + 1,
        leaderboardScore: parts.score,
        rankChange: null,
        scoreParts: parts
      }));
    const planId = snapshot.activeObservationPlanId || "default";
    const dailyArchive = planId === "default" ? snapshot.store.leaderboards?.daily || {} : snapshot.store.leaderboards?.byPlan?.[planId]?.daily || {};
    return {
      period,
      date: new Date().toISOString().slice(0, 10),
      generatedAt: nowIso(),
      limit,
      memory,
      observationPlan: publicPlan(activePlan(snapshot), snapshot.activeObservationPlanId, false),
      items,
      archiveDates: Object.keys(dailyArchive).sort().reverse()
    };
  }

  function githubHeaders(token) {
    if (!token) throw new Error("GitHub Token is required. Please configure a valid token before scanning projects.");
    return {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28"
    };
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms || 0))));

  function githubHeader(response, name) {
    return response?.headers?.get?.(name) || response?.headers?.get?.(name.toLowerCase()) || null;
  }

  function githubResource(path = "") {
    return /\/search\//i.test(path) ? "search" : /\/graphql\b/i.test(path) ? "graphql" : "core";
  }

  function githubRequestSpacing(path = "") {
    const override = Number(window.__STARVAULT_GITHUB_REQUEST_SPACING_MS__);
    if (Number.isFinite(override) && override >= 0) return override;
    if (/\/search\//i.test(path)) return 2200;
    if (/\/graphql\b/i.test(path)) return 900;
    return 350;
  }

  function parseRetryAfter(value) {
    if (!value) return null;
    const seconds = Number(value);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const time = Date.parse(value);
    return Number.isFinite(time) ? Math.max(0, time - Date.now()) : null;
  }

  function updateGithubBudget(response, path) {
    const remaining = Number(githubHeader(response, "x-ratelimit-remaining"));
    const reset = Number(githubHeader(response, "x-ratelimit-reset"));
    if (!Number.isFinite(remaining) && !Number.isFinite(reset)) return;
    githubRateBudgets.set(githubHeader(response, "x-ratelimit-resource") || githubResource(path), {
      remaining: Number.isFinite(remaining) ? remaining : null,
      resetAt: Number.isFinite(reset) && reset > 0 ? reset * 1000 : null
    });
  }

  async function waitForGithubWindow(path) {
    const previous = githubRequestGate;
    let release = () => {};
    githubRequestGate = new Promise((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      const budget = githubRateBudgets.get(githubResource(path));
      const reserve = githubResource(path) === "search" ? 2 : 10;
      const budgetWait = budget?.remaining !== null && budget?.remaining <= reserve && budget?.resetAt
        ? Math.max(0, budget.resetAt - Date.now() + 1000)
        : 0;
      const wait = Math.max(0, githubCooldownUntil - Date.now(), githubNextRequestAt - Date.now(), budgetWait);
      if (wait) await sleep(wait);
      githubNextRequestAt = Date.now() + githubRequestSpacing(path);
    } finally {
      release();
    }
  }

  function githubError(message, status, code = "github-request") {
    const error = new Error(message);
    error.status = status;
    error.code = code;
    return error;
  }

  async function githubFetch(path, options = {}, requestOptions = {}) {
    const secrets = await getSecrets();
    const retries = Math.max(0, Number(requestOptions.retries ?? 3));
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      await waitForGithubWindow(path);
      const response = await fetch(`https://api.github.com${path}`, {
        ...options,
        headers: { ...githubHeaders(secrets.githubToken), ...(options.headers || {}) }
      });
      updateGithubBudget(response, path);
      const text = await response.text();
      let json = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = { message: text };
      }
      if (response.ok) return json;
      const message = String(json.message || `GitHub request failed ${response.status}`);
      if (response.status === 401 || /bad credentials|requires authentication/i.test(message)) {
        throw githubError("GitHub Token 无效或已过期，请重新配置后再扫描。", response.status, "github-auth");
      }
      const secondary = response.status === 429 || /secondary rate limit|abuse detection|too many requests|temporarily blocked/i.test(message);
      const remaining = githubHeader(response, "x-ratelimit-remaining");
      const primary = remaining === "0" || /API rate limit exceeded/i.test(message);
      if ((secondary || primary) && attempt < retries) {
        const reset = Number(githubHeader(response, "x-ratelimit-reset"));
        const resetWait = Number.isFinite(reset) && reset > 0 ? Math.max(0, reset * 1000 - Date.now()) : 0;
        const retryAfter = parseRetryAfter(githubHeader(response, "retry-after"));
        const fallback = secondary ? Math.min(300000, 60000 * 2 ** attempt) : 1000 * 2 ** attempt;
        const delay = Math.max(1000, retryAfter ?? 0, resetWait, fallback);
        githubCooldownUntil = Math.max(githubCooldownUntil, Date.now() + delay);
        await sleep(delay);
        continue;
      }
      if (secondary || primary) {
        throw githubError("GitHub 请求仍受限流保护，请等待额度恢复后再扫描。", response.status, "github-rate-limit");
      }
      throw githubError(`GitHub request failed ${response.status}: ${message.slice(0, 240)}`, response.status);
    }
    throw githubError("GitHub request failed", 500);
  }

  async function validateGithubScanToken() {
    const status = await githubFetch("/rate_limit", {}, { retries: 0 });
    for (const [resource, budget] of Object.entries(status.resources || {})) {
      const remaining = Number(budget?.remaining);
      const reset = Number(budget?.reset);
      githubRateBudgets.set(resource, {
        remaining: Number.isFinite(remaining) ? remaining : null,
        resetAt: Number.isFinite(reset) && reset > 0 ? reset * 1000 : null
      });
    }
    return status;
  }

  function keyValidationResult(configured, valid, message = "") {
    return { configured: Boolean(configured), valid: configured ? Boolean(valid) : null, message };
  }

  async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  function isProviderAuthError(error) {
    const status = Number(error?.status || error?.statusCode || 0);
    const message = String(error?.message || "");
    return (
      Boolean(error?.providerAuthFailure) ||
      status === 401 ||
      /invalid[_\s-]*api[_\s-]*key|api key.*(?:invalid|expired)|unauthori[sz]ed|authentication|permission denied|bad credentials/i.test(message)
    );
  }

  function providerFailureStatus(provider = {}, error) {
    const message = isProviderAuthError(error)
      ? `${provider.name || "AI"} API Key 无效或已过期，请重新配置。`
      : String(error?.message || "Provider request failed").slice(0, 300);
    return `${isProviderAuthError(error) ? "auth-failed" : "failed"}: ${message}`;
  }

  function updateProviderStatus(snapshot, providerId, patch = {}) {
    const providers = (snapshot.settings?.llmProviders || [DEFAULT_PROVIDER]).map((provider) =>
      provider.id === providerId ? { ...provider, ...patch } : provider
    );
    snapshot.settings = {
      ...snapshot.settings,
      activeProvider: "deepseek",
      llmProviders: providers
    };
    return providers.find((provider) => provider.id === providerId) || null;
  }

  async function validateBrowserProviderStatus(snapshot, secrets, providerId = "deepseek") {
    const provider = activeProvider(snapshot, secrets);
    if (!provider || provider.id !== providerId || provider.enabled === false || !provider.apiKey) {
      updateProviderStatus(snapshot, providerId, { testStatus: "", lastTestAt: "" });
      return { providerId, configured: false, valid: null, authFailure: false };
    }
    try {
      const response = await fetchWithTimeout(`${String(provider.baseUrl || DEFAULT_PROVIDER.baseUrl).replace(/\/+$/, "")}/models`, {
        headers: {
          Authorization: `Bearer ${provider.apiKey}`,
          "Content-Type": "application/json"
        }
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        const error = new Error(text.slice(0, 300) || `Provider request failed with ${response.status}`);
        error.status = response.status;
        error.providerAuthFailure = response.status === 401;
        throw error;
      }
      const payload = await response.json().catch(() => ({}));
      const models = Array.isArray(payload.data) ? payload.data.map((item) => item.id).filter(Boolean) : provider.models || [];
      updateProviderStatus(snapshot, providerId, {
        models,
        lastTestAt: nowIso(),
        testStatus: "ok"
      });
      return { providerId, configured: true, valid: true, authFailure: false };
    } catch (error) {
      updateProviderStatus(snapshot, providerId, {
        lastTestAt: nowIso(),
        testStatus: providerFailureStatus(provider, error)
      });
      return {
        providerId,
        configured: true,
        valid: false,
        authFailure: isProviderAuthError(error),
        error: String(error?.message || "Provider request failed").slice(0, 300)
      };
    }
  }

  async function validateBrowserServiceKeys(secrets = {}) {
    const github = secrets.githubToken
      ? await validateGithubScanToken().then(() => keyValidationResult(true, true)).catch(() => keyValidationResult(true, false, "GitHub Token 无效或已过期"))
      : keyValidationResult(false, null);
    const tavily = secrets.tavilyKey
      ? await fetchWithTimeout("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${secrets.tavilyKey}` },
          body: JSON.stringify({ query: "GitHub open source", search_depth: "basic", max_results: 1, include_answer: false, include_raw_content: false })
        }).then((response) => keyValidationResult(true, response.ok, response.ok ? "" : "Tavily Key 无效")).catch(() => keyValidationResult(true, false, "Tavily Key 无效或浏览器无法直连"))
      : keyValidationResult(false, null);
    const exa = secrets.exaKey
      ? await fetchWithTimeout("https://api.exa.ai/search", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": secrets.exaKey },
          body: JSON.stringify({ query: "GitHub open source", type: "auto", numResults: 1, text: false })
        }).then((response) => keyValidationResult(true, response.ok, response.ok ? "" : "Exa Key 无效")).catch(() => keyValidationResult(true, false, "Exa Key 无效或浏览器无法直连"))
      : keyValidationResult(false, null);
    return { checkedAt: nowIso(), github, tavily, exa };
  }

  function browserProjectShape(repo = {}) {
    const text = [repo.name, repo.description, repo.language, ...(repo.topics || [])].filter(Boolean).join(" ").toLowerCase();
    const rules = [
      ["plugin-extension", "插件/扩展工具", "Plugin or extension", /\bplugin\b|\bextension\b|\baddon\b|\bworkbench\b/],
      ["desktop-mobile-app", "桌面/移动应用", "Desktop or mobile app", /desktop app|mobile app|electron|tauri|flutter|react native/],
      ["web-application", "Web 应用", "Web application", /web app|dashboard|admin panel|workspace|studio|portal|frontend/],
      ["cli-automation", "CLI/自动化工具", "CLI or automation tool", /\bcli\b|command[- ]line|terminal|automation|workflow|pipeline/],
      ["api-service", "API/服务", "API or service", /\bapi\b|server|service|gateway|backend/],
      ["library-sdk", "库/SDK", "Library or SDK", /\blibrary\b|\bsdk\b|framework|package|component|engine/],
      ["data-format-tool", "格式/数据工具", "Format or data tool", /converter|parser|viewer|editor|format|protocol|database/]
    ];
    const match = rules.find(([, , , pattern]) => pattern.test(text));
    const [key, labelZh, labelEn] = match || ["project-tool", "项目工具", "Project tool"];
    return { key, label: labelEn, labelZh, labelEn, summaryZh: labelZh, summaryEn: labelEn };
  }

  function browserProjectScores(repo = {}, licensePolicy = {}) {
    const now = Date.now();
    const createdAt = new Date(repo.created_at || repo.createdAt || now).getTime();
    const pushedAt = new Date(repo.pushed_at || repo.updated_at || repo.pushedAt || now).getTime();
    const ageDays = Math.max(1, (now - createdAt) / 86400000);
    const pushedDays = Math.max(0, (now - pushedAt) / 86400000);
    const stars = Number(repo.stargazers_count ?? repo.stars ?? 0);
    const forks = Number(repo.forks_count ?? repo.forks ?? 0);
    const starScale = Math.min(100, Math.log10(Math.max(1, stars)) * 24);
    const forkScale = Math.min(100, Math.log10(Math.max(1, forks)) * 28);
    const recency = Math.max(0, 100 - Math.min(100, pushedDays * 0.8));
    const velocity = Math.min(100, Math.log10(1 + stars / ageDays) * 42);
    const clarity = Math.min(100, 28 + Math.min(30, String(repo.description || "").length / 4) + Math.min(24, (repo.topics || []).length * 4) + (repo.homepage ? 12 : 0));
    const licenseRisk = Number(licensePolicy.risk || 58);
    const quality = Math.max(0, Math.min(100, clarity * 0.38 + recency * 0.34 + starScale * 0.28 - (repo.archived ? 38 : 0)));
    const community = Math.max(0, Math.min(100, starScale * 0.68 + forkScale * 0.32));
    const momentum = Math.max(0, Math.min(100, recency * 0.58 + velocity * 0.42));
    const actionability = Math.max(0, Math.min(100, clarity * 0.55 + quality * 0.25 + (100 - licenseRisk) * 0.2));
    const productization = Math.max(0, Math.min(100, clarity * 0.64 + community * 0.16 + actionability * 0.2));
    const risk = Math.max(0, Math.min(100, licenseRisk * 0.62 + (repo.archived ? 28 : 0) + (pushedDays > 730 ? 18 : 0)));
    const opportunity = Math.max(
      0,
      Math.min(100, quality * 0.22 + community * 0.16 + momentum * 0.2 + actionability * 0.24 + productization * 0.18 - risk * 0.12)
    );
    return Object.fromEntries(
      Object.entries({ opportunity, momentum, quality, community, productization, novelty: velocity, risk, licenseRisk, overallRisk: risk, actionability }).map(
        ([key, value]) => [key, Math.round(value)]
      )
    );
  }

  function githubRepoToProject(repo, plan, profile = {}) {
    const planId = plan.id;
    const licensePolicy = domainCore.classifyLicensePolicy(repo.license || null);
    const categoryLabel = String(profile.labelZh || profile.label || profile.labelEn || plan.name || "扫描发现");
    const categoryKey = `profile-${domainCore.normalizedId(profile.key || categoryLabel) || domainCore.stableHash(categoryLabel)}`;
    const shape = browserProjectShape(repo);
    const evidence = domainCore.profileEvidence(profile);
    const scores = browserProjectScores(repo, licensePolicy);
    return {
      id: repo.id,
      fullName: repo.full_name,
      name: repo.name,
      owner: repo.owner?.login || "",
      ownerAvatar: repo.owner?.avatar_url || "",
      url: repo.html_url,
      description: repo.description || "",
      homepage: repo.homepage || "",
      language: repo.language || "unknown",
      topics: Array.isArray(repo.topics) ? repo.topics : [],
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      watchers: repo.watchers_count || 0,
      openIssues: repo.open_issues_count || 0,
      defaultBranch: repo.default_branch || "main",
      createdAt: repo.created_at || "",
      updatedAt: repo.updated_at || "",
      pushedAt: repo.pushed_at || repo.updated_at || "",
      license: repo.license || null,
      archived: Boolean(repo.archived),
      disabled: Boolean(repo.disabled),
      fork: Boolean(repo.fork),
      category: { key: categoryKey, label: categoryLabel, labelZh: categoryLabel, labelEn: profile.labelEn || categoryLabel },
      useCase: shape,
      semantic: {
        problem: { key: categoryKey, label: categoryLabel, labelZh: categoryLabel, labelEn: profile.labelEn || categoryLabel },
        audience: {
          key: `audience-${domainCore.normalizedId(planId) || "default"}`,
          label: `${plan.nameEn || plan.name || "Observation"} users`,
          labelZh: `${plan.name || "当前方案"}关注用户`,
          labelEn: `${plan.nameEn || plan.name || "Observation"} users`
        },
        shape
      },
      licensePolicy,
      scores,
      signals: {},
      reasons: [`命中检索画像：${categoryLabel}`, `许可边界：${licensePolicy.labelZh}`],
      actions: [],
      source: "github-browser",
      firstSeenAt: nowIso(),
      lastSeenAt: nowIso(),
      updatedInMonitorAt: nowIso(),
      profileKey: profile.key || "",
      profileLabel: profile.label || "",
      profileMatches: evidence ? [evidence] : [],
      observationPlanMatches: {
        [planId]: {
          planId,
          firstSeenAt: nowIso(),
          lastSeenAt: nowIso(),
          profileKey: profile.key || "",
          profileLabel: profile.label || "",
          profileMatches: evidence ? [evidence] : []
        }
      }
    };
  }

  function scanProfiles(plan) {
    const logic = plan.searchLogic || plan.strategy || {};
    const profiles = [];
    const assignedQueries = domainCore.assignProfileIds(plan.id, logic.customQueries || [], logic.customQueries || []);
    if (Array.isArray(logic.customQueries)) {
      logic.customQueries = assignedQueries;
      plan.searchLogic = logic;
      plan.strategy = logic;
    }
    for (const [index, item] of assignedQueries.entries()) {
      const query = item.query || item.q;
      if (!query) continue;
      profiles.push({
        key: String(item.profileId || item.key || `local-${plan.id}-${index + 1}`),
        profileId: String(item.profileId || item.key || `local-${plan.id}-${index + 1}`),
        label: String(item.labelZh || item.label || item.labelEn || query),
        query: String(query).trim(),
        index
      });
    }
    if (!profiles.length) {
      for (const [index, keyword] of (logic.keywords || []).entries()) {
        if (!keyword || profiles.length >= 30) continue;
        profiles.push({
          key: `local-${plan.id}-keyword-${index + 1}`,
          profileId: `local-${plan.id}-keyword-${index + 1}`,
          label: String(keyword),
          query: `${keyword} in:name,description,readme archived:false mirror:false`,
          index
        });
      }
    }
    const memory = plan.memory || defaultMemory();
    const seen = new Set();
    return profiles
      .filter((profile) => {
        const query = lower(profile.query);
        if (!query || seen.has(query)) return false;
        seen.add(query);
        return true;
      })
      .slice(0, 30)
      .map((profile) => {
        const learnedSignal = Number(memory.discoveryProfiles?.[profile.key] || 0);
        return {
          ...profile,
          learnedSignal,
          perPage: Math.max(20, Math.min(60, 30 + Math.round(Math.max(-5, Math.min(15, learnedSignal)) * 2)))
        };
      })
      .sort((a, b) => b.learnedSignal - a.learnedSignal || a.index - b.index);
  }

  function githubNamesFromSignals(signals = []) {
    const names = new Set();
    for (const signal of signals) {
      const text = [signal.url, signal.title, signal.content].filter(Boolean).join(" ");
      for (const match of text.matchAll(/github\.com\/([a-z0-9_.-]+)\/([a-z0-9_.-]+)/gi)) {
        const repo = `${match[1]}/${match[2].replace(/(?:\.git)?[?#/].*$/i, "").replace(/\.git$/i, "")}`;
        if (!/^(topics|collections|trending|features|settings)\//i.test(repo)) names.add(repo);
      }
    }
    return Array.from(names).slice(0, 8);
  }

  const PLAN_TERM_STOP_WORDS = new Set([
    "app", "application", "apps", "tool", "tools", "plugin", "plugins", "extension", "extensions", "workflow", "workflows",
    "project", "projects", "repository", "repositories", "github", "open", "source", "software", "platform", "system",
    "service", "services", "related", "monitor", "monitoring", "observe", "observation", "in", "name", "description", "readme",
    "archived", "mirror", "false", "true", "stars", "pushed", "created", "language", "license", "topic"
  ]);

  function planAnchorTerms(plan = {}) {
    const logic = plan.searchLogic || plan.strategy || {};
    const sources = [
      plan.name,
      plan.nameEn,
      ...(Array.isArray(logic.keywords) ? logic.keywords : []),
      ...(Array.isArray(logic.customQueries)
        ? logic.customQueries.flatMap((item) => [item?.label, item?.labelZh, item?.labelEn, item?.query || item?.q])
        : [])
    ];
    const terms = [];
    const add = (value) => {
      const raw = String(value || "")
        .replace(/\b(?:in:name,description,readme|archived|mirror|stars|pushed|created|language|license|topic):?[^\s]*/gi, " ")
        .replace(/\b(?:AND|OR|NOT)\b/gi, " ")
        .replace(/[()]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (!raw) return;
      const candidates = [
        ...Array.from(raw.matchAll(/"([^"\\]{2,100})"/g)).map((match) => match[1]),
        ...(raw.match(/[A-Za-z0-9][A-Za-z0-9.+#-]{1,48}|[\u4e00-\u9fa5]{2,18}/g) || [])
      ];
      for (const candidate of candidates) {
        const clean = String(candidate).trim();
        const normalized = clean.toLowerCase();
        if (clean.length < 2 || PLAN_TERM_STOP_WORDS.has(normalized) || /^\d+$/.test(clean)) continue;
        if (!terms.some((item) => item.toLowerCase() === normalized)) terms.push(clean);
      }
    };
    sources.forEach(add);
    return terms.slice(0, 48);
  }

  function textHasPlanAnchor(text, term) {
    const source = lower(text).replace(/[_./-]+/g, " ").replace(/\s+/g, " ");
    const target = lower(term).replace(/[_./-]+/g, " ").replace(/\s+/g, " ").trim();
    if (!source || !target) return false;
    if (/^[\u4e00-\u9fa5]+$/.test(target)) return source.includes(target);
    if (target.includes(" ")) return source.includes(target) || source.replace(/\s+/g, "").includes(target.replace(/\s+/g, ""));
    const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i").test(source);
  }

  function browserRepositoryMatchesPlan(repo = {}, plan = {}, options = {}) {
    if (!plan || plan.id === "default") return true;
    const text = [repo.full_name, repo.fullName, repo.name, repo.description, repo.homepage, ...(repo.topics || [])].filter(Boolean).join(" ");
    if (/\b(?:awesome[-\s]?list|curated list|resource hub|profile readme|tutorial|course|paper list)\b/i.test(text)) return false;
    if (options.searchEvidence) return true;
    const terms = planAnchorTerms(plan);
    return terms.length > 0 && terms.some((term) => textHasPlanAnchor(text, term));
  }

  async function browserScanExternalDiscovery(plan) {
    const secrets = await getSecrets();
    const logic = plan.searchLogic || plan.strategy || {};
    const query = [
      plan.name || plan.nameEn || "",
      plan.description || "",
      ...(Array.isArray(logic.keywords) ? logic.keywords.slice(0, 12) : []),
      "GitHub repositories"
    ].join(" ").replace(/\s+/g, " ").trim();
    const result = { signals: [], errors: [] };
    const jobs = [];
    if (secrets.tavilyKey) {
      jobs.push(browserTavilySearch(query, secrets.tavilyKey).then((items) => result.signals.push(...items)).catch((error) => result.errors.push(`Tavily: ${error.message}`)));
    }
    if (secrets.exaKey) {
      jobs.push(browserExaSearch(query, secrets.exaKey).then((items) => result.signals.push(...items)).catch((error) => result.errors.push(`Exa: ${error.message}`)));
    }
    await Promise.all(jobs);
    result.repositories = githubNamesFromSignals(result.signals);
    return result;
  }

  function mergeBrowserScanProject(seen, project, planId) {
    const key = projectKey(project?.fullName);
    if (!key) return;
    if (!seen.has(key)) {
      seen.set(key, project);
      return;
    }
    const previous = seen.get(key);
    previous.profileMatches = domainCore.mergeProfileMatches(previous.profileMatches, project.profileMatches);
    previous.observationPlanMatches = {
      ...(previous.observationPlanMatches || {}),
      ...(project.observationPlanMatches || {})
    };
    if (planId) {
      previous.observationPlanMatches[planId] = {
        ...(previous.observationPlanMatches[planId] || {}),
        ...(project.observationPlanMatches?.[planId] || {}),
        planId,
        profileMatches: previous.profileMatches
      };
    }
    previous.signals = { ...(previous.signals || {}), ...(project.signals || {}) };
  }

  function applyBrowserScanArtifact(seen, errors, artifact, planId) {
    for (const project of artifact?.projects || []) mergeBrowserScanProject(seen, project, planId);
    for (const error of artifact?.errors || []) {
      if (error && !errors.includes(error)) errors.push(error);
    }
  }

  function initialBrowserScanCheckpoint(task, planId) {
    const current = task?.checkpoint;
    if (current?.version === 1 && current.planId === planId) {
      return {
        ...current,
        completedProfiles: Array.isArray(current.completedProfiles) ? current.completedProfiles : []
      };
    }
    return {
      version: 1,
      planId,
      stage: "prepare",
      completedProfiles: [],
      externalCompleted: false,
      scanId: ""
    };
  }

  async function persistBrowserScanCheckpoint(snapshot, task, checkpoint, patch = {}) {
    if (!task) return { ...checkpoint, ...patch };
    const next = { ...checkpoint, ...patch };
    task.checkpoint = next;
    task.updatedAt = nowIso();
    await saveSnapshot(snapshot);
    return next;
  }

  async function runBrowserScan(snapshot, requestedPlanId = "", task = null) {
    const planId = String(requestedPlanId || snapshot.activeObservationPlanId || "default");
    const plan = snapshot.store.observationPlans?.[planId];
    if (!plan) throw new Error("扫描任务对应的观察方案已不存在。");
    await validateGithubScanToken();
    if (task?.checkpoint?.planId && task.checkpoint.planId !== planId) {
      await storage().clearTaskArtifacts?.(task.id);
      task.checkpoint = null;
    }
    let checkpoint = initialBrowserScanCheckpoint(task, planId);
    const completedScan = checkpoint.stage === "completed" && checkpoint.scanId
      ? (snapshot.store.scans || []).find((item) => item.id === checkpoint.scanId)
      : null;
    if (completedScan) return completedScan;
    const profiles = scanProfiles(plan);
    if (!profiles.length) throw new Error("当前观察方案没有可执行的检索逻辑。");
    const seen = new Map();
    const errors = [];
    const artifacts = task ? await storage().getTaskArtifacts?.(task.id) || {} : {};
    for (const profile of profiles) {
      const artifactKey = `github:${profile.index}:${profile.key}`;
      let artifact = checkpoint.completedProfiles.includes(artifactKey) ? artifacts[artifactKey] : null;
      if (!artifact) {
        const profileProjects = [];
        const profileErrors = [];
        try {
          const params = new URLSearchParams({ q: profile.query, sort: "stars", order: "desc", per_page: String(profile.perPage), page: "1" });
          const result = await githubFetch(`/search/repositories?${params.toString()}`);
          for (const repo of result.items || []) profileProjects.push(githubRepoToProject(repo, plan, profile));
        } catch (error) {
          if (["github-auth", "github-rate-limit"].includes(error.code)) throw error;
          profileErrors.push(error.message);
        }
        artifact = { projects: profileProjects, errors: profileErrors };
        if (task) {
          await storage().putTaskArtifact(task.id, artifactKey, artifact);
          artifacts[artifactKey] = artifact;
          checkpoint = await persistBrowserScanCheckpoint(snapshot, task, checkpoint, {
            stage: "github-search",
            completedProfiles: [...checkpoint.completedProfiles.filter((key) => key !== artifactKey), artifactKey]
          });
        }
      }
      applyBrowserScanArtifact(seen, errors, artifact, plan.id);
    }
    if (!seen.size && errors.length) throw new Error(errors[0]);
    const externalArtifactKey = "external-discovery";
    let externalArtifact = checkpoint.externalCompleted ? artifacts[externalArtifactKey] : null;
    if (!externalArtifact) {
      const external = await browserScanExternalDiscovery(plan);
      const externalProjects = [];
      const externalErrors = [...external.errors];
      const externalProfile = {
        key: `profile-${domainCore.normalizedId(plan.id) || "default"}-external-web`,
        profileId: `profile-${domainCore.normalizedId(plan.id) || "default"}-external-web`,
        label: "外部研究信号",
        labelZh: "外部研究信号",
        labelEn: "External research signals",
        query: `${plan.name || plan.nameEn || ""} GitHub repositories`
      };
      for (const fullName of external.repositories || []) {
        const existing = seen.get(projectKey(fullName));
        const matchedSignals = external.signals.filter((signal) => [signal.url, signal.title, signal.content].join(" ").toLowerCase().includes(fullName.toLowerCase()));
        if (existing) {
          const project = clone(existing, existing);
          project.signals = { ...(project.signals || {}), externalWeb: matchedSignals };
          externalProjects.push(project);
          continue;
        }
        try {
          const repo = await githubFetch(`/repos/${fullName.split("/").map(encodeURIComponent).join("/")}`);
          if (!browserRepositoryMatchesPlan(repo, plan)) continue;
          const project = githubRepoToProject(repo, plan, externalProfile);
          project.signals.externalWeb = matchedSignals;
          project.source = "github-browser-external-discovery";
          externalProjects.push(project);
        } catch (error) {
          if (["github-auth", "github-rate-limit"].includes(error.code)) throw error;
          externalErrors.push(`External discovery ${fullName}: ${error.message}`);
        }
      }
      externalArtifact = { projects: externalProjects, errors: externalErrors };
      if (task) {
        await storage().putTaskArtifact(task.id, externalArtifactKey, externalArtifact);
        artifacts[externalArtifactKey] = externalArtifact;
        checkpoint = await persistBrowserScanCheckpoint(snapshot, task, checkpoint, {
          stage: "external-discovery",
          externalCompleted: true
        });
      }
    }
    applyBrowserScanArtifact(seen, errors, externalArtifact, plan.id);
    const projects = Array.from(seen.values());
    const previousProjects = await storage().getProjects(projects.map((project) => project.fullName));
    const previousByKey = new Map(previousProjects.map((project) => [projectKey(project.fullName), project]));
    const scannedAt = nowIso();
    for (const project of projects) {
      const previous = previousByKey.get(projectKey(project.fullName));
      const snapshotEntry = {
        at: scannedAt,
        stars: Number(project.stars || 0),
        forks: Number(project.forks || 0),
        openIssues: Number(project.openIssues || 0),
        opportunity: Number(project.scores?.opportunity || 0),
        momentum: Number(project.scores?.momentum || 0),
        risk: Number(project.scores?.risk || 0)
      };
      project.firstSeenAt = previous?.firstSeenAt || scannedAt;
      project.lastSeenAt = scannedAt;
      project.snapshots = [...(previous?.snapshots || []), snapshotEntry].slice(-180);
      project.trend = previous
        ? {
            stars: Number(project.stars || 0) - Number(previous.stars || 0),
            forks: Number(project.forks || 0) - Number(previous.forks || 0),
            date: scannedAt.slice(0, 10),
            status: "ready",
            source: "github-browser-snapshots",
            updatedAt: scannedAt,
            complete: true
          }
        : {
            stars: 0,
            forks: 0,
            date: scannedAt.slice(0, 10),
            status: "baseline",
            source: "github-browser-snapshots",
            updatedAt: scannedAt,
            complete: false
          };
    }
    await storage().replaceProjectsForPlan(plan.id, projects);
    checkpoint = await persistBrowserScanCheckpoint(snapshot, task, checkpoint, { stage: "persisted" });
    const scanId = task ? `browser-scan-${task.id}` : `browser-scan-${Date.now()}`;
    const scan = {
      id: scanId,
      at: nowIso(),
      status: errors.length ? "completed-with-errors" : "completed",
      mode: "browser-indexeddb",
      observationPlanId: plan.id,
      observationPlanName: plan.name,
      received: seen.size,
      insertedOrUpdated: seen.size,
      profiles: profiles.map((profile) => profile.key),
      errors
    };
    snapshot.store.scans = [scan, ...(snapshot.store.scans || []).filter((item) => item.id !== scan.id)].slice(0, 120);
    const planProjects = await projectsForActivePlan(snapshot);
    snapshot.counts = { ...(snapshot.counts || {}), projects: await storage().countProjects() };
    snapshot.summary = summary(snapshot, {}, planProjects);
    snapshot.leaderboard = buildLeaderboard(snapshot, { limit: 20 }, planProjects);
    const archiveDate = scannedAt.slice(0, 10);
    if (plan.id === "default") {
      snapshot.store.leaderboards.daily = snapshot.store.leaderboards.daily || {};
      snapshot.store.leaderboards.daily[archiveDate] = clone(snapshot.leaderboard, snapshot.leaderboard);
    } else {
      snapshot.store.leaderboards.byPlan = snapshot.store.leaderboards.byPlan || {};
      snapshot.store.leaderboards.byPlan[plan.id] = snapshot.store.leaderboards.byPlan[plan.id] || { daily: {} };
      snapshot.store.leaderboards.byPlan[plan.id].daily[archiveDate] = clone(snapshot.leaderboard, snapshot.leaderboard);
    }
    updateCounts(snapshot);
    if (task) {
      checkpoint = { ...checkpoint, stage: "completed", scanId: scan.id };
      task.checkpoint = checkpoint;
      task.updatedAt = nowIso();
    }
    await saveSnapshot(snapshot);
    return scan;
  }

  function activeProvider(snapshot, secrets) {
    const settings = snapshot.settings || defaultSettings();
    const providerId = settings.activeProvider || "deepseek";
    const provider = (settings.llmProviders || [DEFAULT_PROVIDER]).find((item) => item.id === providerId) || DEFAULT_PROVIDER;
    const providerSecret = secrets.llmProviders?.[provider.id] || {};
    return {
      ...provider,
      apiKey: providerSecret.apiKey || provider.apiKey || "",
      model: provider.model || provider.models?.[0] || DEFAULT_PROVIDER.model
    };
  }

  function chatCompletionsUrl(provider) {
    const rawBase = String(provider.baseUrl || DEFAULT_PROVIDER.baseUrl).replace(/\/+$/, "");
    let parsed;
    try {
      parsed = new URL(rawBase);
    } catch {
      throw new Error("模型接口地址无效");
    }
    const targetHost = parsed.hostname.toLowerCase();
    const pageHost = window.location.hostname.toLowerCase();
    const targetIsLocal = ["localhost", "127.0.0.1", "::1"].includes(targetHost) || /^(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(targetHost);
    const pageIsLocal = ["localhost", "127.0.0.1", "::1"].includes(pageHost);
    if (parsed.protocol !== "https:" && !(pageIsLocal && targetIsLocal)) throw new Error("模型接口地址必须使用 HTTPS");
    if (parsed.username || parsed.password) throw new Error("模型接口地址不能包含账号或密码");
    if (targetIsLocal && !pageIsLocal) throw new Error("公网页面不能连接本机或私有网络模型地址");
    const base = parsed.toString().replace(/\/+$/, "");
    return /\/chat\/completions$/i.test(base) ? base : `${base}/v1/chat/completions`;
  }

  function parseJsonFromText(text) {
    const source = String(text || "").trim();
    if (!source) throw new Error("AI 返回为空");
    try {
      return JSON.parse(source);
    } catch {
      const match = source.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("AI 返回内容不是 JSON");
      return JSON.parse(match[0]);
    }
  }

  async function callModelJson(snapshot, messages) {
    const secrets = await getSecrets();
    const provider = activeProvider(snapshot, secrets);
    if (!provider.apiKey) throw new Error("请先在设置里配置并保存可用的 AI 模型 API Key");
    let response;
    try {
      response = await fetch(chatCompletionsUrl(provider), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${provider.apiKey}`
        },
        body: JSON.stringify({
          model: provider.model || DEFAULT_PROVIDER.model,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages
        })
      });
    } catch (error) {
      throw new Error(`模型接口无法从浏览器直连，可能被 CORS 拦截：${error.message}`);
    }
    const text = await response.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { raw: text };
    }
    if (!response.ok) {
      const error = new Error(payload?.error?.message || payload?.message || `模型接口请求失败 ${response.status}`);
      error.status = response.status;
      error.providerAuthFailure = [401, 403].includes(response.status);
      throw error;
    }
    const content = payload?.choices?.[0]?.message?.content || payload?.content || payload?.raw || "";
    return {
      raw: content,
      json: parseJsonFromText(content),
      provider
    };
  }

  function normalizeBrowserAnalysis(result = {}, project, context = {}) {
    const normalized = {
      recommendation: result.recommendation || result.suggestion || "watch",
      riskLevel: result.riskLevel || result.risk || "medium",
      verdict: result.verdict || result.summary || "",
      summary: result.summary || result.verdict || "",
      risks: Array.isArray(result.risks) ? result.risks : [],
      boundaries: Array.isArray(result.boundaries) ? result.boundaries : [],
      inspirations: Array.isArray(result.inspirations) ? result.inspirations : Array.isArray(result.practiceIdeas) ? result.practiceIdeas : [],
      validations: Array.isArray(result.validations) ? result.validations : Array.isArray(result.nextActions) ? result.nextActions : []
    };
    return {
      result: normalized,
      updatedAt: nowIso(),
      provider: "browser-direct",
      model: "",
      language: "zh",
      context,
      raw: JSON.stringify(result)
    };
  }

  async function analyzeProjectWithModel(snapshot, body = {}, sourceProject = null) {
    const planId = String(body.observationPlanId || snapshot.activeObservationPlanId || "default");
    const key = projectKey(body.fullName);
    const project = sourceProject?.fullName ? withUserState(sourceProject, snapshot, planId) : await hydratedProject(snapshot, key, planId);
    if (!project?.fullName) throw new Error("Project not found");
    const context = {
      method: String(body.method || "balanced").slice(0, 40),
      methodLabel: String(body.methodLabel || "").slice(0, 80),
      userNeed: String(body.userNeed || "").slice(0, 1000)
    };
    const { json, raw, provider } = await callModelJson(snapshot, [
      {
        role: "system",
        content:
          "你是星仓印记的 GitHub 项目实践研判助手。只返回 JSON，不要 Markdown。字段：recommendation(validate/watch/pause)、riskLevel(low/medium/high)、summary、risks数组、boundaries数组、inspirations数组、validations数组。实践启发要围绕解决什么问题、目标用户、可形成的工具/服务/工作流。"
      },
      {
        role: "user",
        content: JSON.stringify({
          project: {
            fullName: project.fullName,
            description: project.description,
            language: project.language,
            topics: project.topics,
            stars: project.stars,
            forks: project.forks,
            license: project.licensePolicy,
            scores: project.scores
          },
          context
        })
      }
    ]);
    const analysis = normalizeBrowserAnalysis(json, project, context);
    analysis.provider = provider.name || provider.id || "browser-direct";
    analysis.model = provider.model || "";
    analysis.raw = raw;
    userDataForPlan(snapshot, planId).analysis[key] = analysis;
    appendLocalMemoryEvent(snapshot, project, "ai_analyze", { planId, source: analysis.provider || "llm" });
    await saveSnapshot(snapshot);
    return { provider: analysis.provider, model: analysis.model, analysis, project: await hydratedProject(snapshot, key, planId) };
  }

  function normalizeBrowserPlan(plan = {}, fallback = {}, previousPlan = null) {
    const name = fallback.name || plan.name || "自定义观察";
    const logic = plan.searchLogic || plan.strategy || {};
    const id = plan.id || previousPlan?.id || `plan-${Date.now()}`;
    const customQueries = domainCore.assignProfileIds(
      id,
      Array.isArray(logic.customQueries) ? logic.customQueries : [],
      previousPlan?.searchLogic?.customQueries || previousPlan?.strategy?.customQueries || []
    );
    return {
      id,
      name,
      nameEn: fallback.name || plan.nameEn || name,
      description: plan.description || `围绕「${name}」发现值得学习、理解与持续跟踪的项目。`,
      descriptionEn: plan.descriptionEn || `Track useful repositories around ${name}.`,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      builtIn: false,
      requirements: Array.isArray(plan.requirements) ? plan.requirements : fallback.idea ? [{ id: `req-${Date.now()}`, text: fallback.idea, createdAt: nowIso() }] : [],
      searchLogic: {
        baseMode: logic.baseMode || "only",
        keywords: Array.isArray(logic.keywords) ? logic.keywords.slice(0, 30) : [],
        excludeTerms: Array.isArray(logic.excludeTerms) ? logic.excludeTerms.slice(0, 20) : [],
        customQueries: customQueries
          .map((item) => ({
            profileId: item.profileId,
            label: item.label || item.labelZh || item.query || "",
            labelZh: item.labelZh || item.label || "",
            labelEn: item.labelEn || item.label || "",
            query: item.query || item.q || "",
            stars: Number(item.stars || 0)
          }))
          .filter((item) => item.query)
          .slice(0, 30),
        preferredLanguages: Array.isArray(logic.preferredLanguages) ? logic.preferredLanguages : [],
        preferredCategories: Array.isArray(logic.preferredCategories) ? logic.preferredCategories : [],
        preferredShapes: Array.isArray(logic.preferredShapes) ? logic.preferredShapes : [],
        minStars: Number(logic.minStars || 0),
        notes: String(logic.notes || "")
      },
      memory: defaultMemory(),
      userData: defaultUserData()
    };
  }

  async function browserTavilySearch(query, key, maxResults = 6) {
    if (!key) return [];
    const response = await fetchWithTimeout("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ query, search_depth: "basic", max_results: maxResults, include_answer: false, include_raw_content: false })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    return (payload.results || []).slice(0, maxResults).map((item) => ({ source: "tavily", title: item.title || "", content: item.content || "", url: item.url || "" }));
  }

  async function browserExaSearch(query, key, maxResults = 6) {
    if (!key) return [];
    const response = await fetchWithTimeout("https://api.exa.ai/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key },
      body: JSON.stringify({ query, type: "auto", numResults: maxResults, text: true })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    return (payload.results || []).slice(0, maxResults).map((item) => ({
      source: "exa",
      title: item.title || "",
      content: (item.highlights || []).join(" ") || item.text || "",
      url: item.url || ""
    }));
  }

  async function browserPlanResearch(snapshot, name, idea) {
    const secrets = await getSecrets();
    const query = `${name} ${idea}`.replace(/\s+/g, " ").trim().slice(0, 500);
    const research = { query, github: null, tavily: [], exa: [], errors: [] };
    const jobs = [];
    if (secrets.githubToken) {
      jobs.push(
        githubFetch(`/search/repositories?${new URLSearchParams({ q: `${name} in:name,description,readme`, per_page: "5", page: "1" }).toString()}`)
          .then((result) => {
            research.github = {
              totalCount: Number(result.total_count || 0),
              repositories: (result.items || []).slice(0, 5).map((repo) => ({ fullName: repo.full_name, description: repo.description || "", topics: repo.topics || [] }))
            };
          })
          .catch((error) => research.errors.push(`GitHub research: ${error.message}`))
      );
    }
    if (secrets.tavilyKey) {
      jobs.push(
        browserTavilySearch(query, secrets.tavilyKey)
          .then((items) => {
            research.tavily = items;
          })
          .catch((error) => research.errors.push(`Tavily research: ${error.message}`))
      );
    }
    if (secrets.exaKey) {
      jobs.push(
        browserExaSearch(query, secrets.exaKey)
          .then((items) => {
            research.exa = items;
          })
          .catch((error) => research.errors.push(`Exa research: ${error.message}`))
      );
    }
    await Promise.all(jobs);
    return research;
  }

  function browserPlanGenerationPrompt(name, idea, research = {}, repair = null) {
    const schema = {
      name,
      nameEn: name,
      description: "中文方案说明",
      descriptionEn: "English description",
      requirements: [{ text: idea }],
      searchLogic: {
        baseMode: "only",
        keywords: ["强相关领域词"],
        excludeTerms: [],
        customQueries: [
          {
            label: "中文短标签",
            labelZh: "中文短标签",
            labelEn: "English label",
            query: "GitHub repository query in:name,description,readme archived:false mirror:false",
            stars: 0
          }
        ],
        preferredLanguages: [],
        preferredCategories: [],
        preferredShapes: [],
        minStars: 0,
        notes: "生成依据"
      }
    };
    return [
      "你是星仓印记的 GitHub 观察方案生成器。只返回一个严格 JSON 对象，不要 Markdown。",
      "只根据本次方案名称和详细需求工作，不读取、猜测或混入其他方案。方案名必须原样保留。",
      "使用同一套不依赖固定领域词典的方法：先确定唯一核心锚点及准确含义，再识别官方名称、确认别名、格式/协议、API/SDK、插件或扩展体系、产品族、相邻库、用户工作流和实际 GitHub 仓库形态；删除无法绑定核心锚点的宽泛父级词、SEO/GEO 噪音和无关厂商词。不存在的维度留空，不要硬编。",
      "先生成紧凑且强相关的 keywords，再由这些词生成 customQueries。不能只返回“名称 + app/tool/workflow”这类表面变体。",
      "每条 customQuery 都会直接执行，必须保留方案名称或详细需求中的核心锚点/确认别名，并包含 in:name,description,readme archived:false mirror:false，不使用 OR 串；重要别名拆成独立查询。",
      "excludeTerms 通常可以为空，只在存在明确歧义、低价值仓库类型或反复假阳性时添加。不要罗列任意无关词。",
      "customQueries 最多 30 条，不足 30 条不要硬凑。成熟领域应覆盖主要仓库形态，小众领域放宽 Star 和更新时间限制，但始终保留核心锚点。",
      "searchLogic 与 strategy 必须同形；若只返回一个，系统会自动复制。",
      `研究上下文：${JSON.stringify(research).slice(0, 12000)}`,
      repair ? `上次结果没有通过质量门禁：${repair.issues.join("；")}。请修复，不要降低相关性。上次输出：${repair.raw.slice(0, 2400)}` : "",
      `JSON 结构：${JSON.stringify(schema)}`,
      `方案名称：${name}`,
      `详细需求：${idea}`
    ]
      .filter(Boolean)
      .join("\n");
  }

  function browserPlanQualityMinimums(research = {}) {
    const totalCount = Number(research.github?.totalCount);
    if (!Number.isFinite(totalCount)) return { keywords: 4, queries: 3 };
    if (totalCount >= 10_000) return { keywords: 8, queries: 8 };
    if (totalCount >= 1_000) return { keywords: 8, queries: 6 };
    if (totalCount >= 100) return { keywords: 6, queries: 5 };
    if (totalCount >= 20) return { keywords: 5, queries: 4 };
    return { keywords: 3, queries: 2 };
  }

  function browserPlanAnchorTerms(expectedName = "", need = "", research = {}) {
    const source = `${expectedName} ${need}`;
    const terms = [source, expectedName, ...Array.from(source.matchAll(/[A-Za-z][A-Za-z0-9.+#-]{1,48}|[\u4e00-\u9fa5]{2,20}/g)).map((match) => match[0])];
    for (const repository of research.github?.repositories || []) terms.push(...(repository.topics || []));
    const generic = new Set(["相关", "项目", "开源", "工具", "平台", "软件", "系统", "应用", "服务", "领域", "方向", "观察", "github", "open source", "app", "tool", "workflow"]);
    return Array.from(new Set(terms.map((term) => String(term || "").replace(/\s+/g, " ").trim()).filter((term) => {
      const normalized = lower(term);
      return normalized.length >= 2 && !generic.has(normalized);
    })));
  }

  function browserTextContainsAny(text, terms) {
    const source = lower(text).replace(/[_./-]+/g, " ").replace(/\s+/g, " ");
    return terms.some((term) => {
      const target = lower(term).replace(/[_./-]+/g, " ").replace(/\s+/g, " ").trim();
      return target && source.includes(target);
    });
  }

  function browserPlanQualityIssues(plan = {}, expectedName = "", research = {}, detailedNeed = "") {
    const logic = plan.searchLogic || plan.strategy || {};
    const keywords = Array.isArray(logic.keywords) ? logic.keywords.map((item) => String(item || "").trim()).filter(Boolean) : [];
    const queries = Array.isArray(logic.customQueries) ? logic.customQueries.filter((item) => String(item?.query || item?.q || "").trim()) : [];
    const minimums = browserPlanQualityMinimums(research);
    const anchorTerms = browserPlanAnchorTerms(expectedName, detailedNeed, research);
    const issues = [];
    if (String(plan.name || "").trim() !== String(expectedName || "").trim()) issues.push("方案名没有原样保留");
    if (keywords.length < minimums.keywords) issues.push(`keywords 过少：${keywords.length}/${minimums.keywords}`);
    if (queries.length < minimums.queries) issues.push(`customQueries 过少：${queries.length}/${minimums.queries}`);
    if (anchorTerms.length && !browserTextContainsAny(keywords.join(" "), anchorTerms)) issues.push("keywords 缺少当前方案的核心锚点");
    const directAnchoredCount = queries.filter((item) => browserTextContainsAny(
      `${item.label || ""} ${item.labelZh || ""} ${item.labelEn || ""} ${item.query || item.q || ""}`,
      anchorTerms
    )).length;
    if (queries.length && anchorTerms.length && directAnchoredCount < Math.ceil(queries.length * 0.5)) {
      issues.push("customQueries 中保留核心锚点的查询比例过低");
    }
    const weak = queries.filter((item) => {
      const query = String(item.query || item.q || "");
      const linked = keywords.some((keyword) => lower(`${item.label || ""} ${item.labelZh || ""} ${query}`).includes(lower(keyword)));
      return (
        !linked ||
        /\bOR\b/i.test(query) ||
        !/in:name,description,readme/i.test(query) ||
        !/archived:false/i.test(query) ||
        !/mirror:false/i.test(query)
      );
    });
    if (weak.length) issues.push(`${weak.length} 条 customQueries 缺少领域锚点或 GitHub 限定符`);
    const evidenceText = `${expectedName} ${detailedNeed} ${JSON.stringify(research)}`;
    const excludeTerms = Array.isArray(logic.excludeTerms) ? logic.excludeTerms.filter(Boolean) : [];
    const universalNoise = new Set(["awesome list", "paper list", "toy example", "benchmark", "course", "tutorial", "resource list", "curated list"]);
    const unsupported = excludeTerms.filter((term) => !universalNoise.has(lower(term).trim()) && !browserTextContainsAny(evidenceText, [term]));
    if (unsupported.length) issues.push(`排除词缺少当前需求或研究证据：${unsupported.slice(0, 4).join("、")}`);
    return issues;
  }

  async function generatePlanWithModel(snapshot, body = {}) {
    const name = String(body.name || "").trim();
    const idea = [body.idea, body.detailedNeed].map((item) => String(item || "").trim()).filter(Boolean).join("\n");
    if (!name || !idea) throw new Error("方案名称和详细需求不能为空");
    const research = await browserPlanResearch(snapshot, name, idea);
    const first = await callModelJson(snapshot, [{ role: "user", content: browserPlanGenerationPrompt(name, idea, research) }]);
    let raw = first.raw;
    let plan = normalizeBrowserPlan(first.json, { name, idea });
    let issues = browserPlanQualityIssues(plan, name, research, idea);
    if (issues.length) {
      const repaired = await callModelJson(snapshot, [
        { role: "user", content: browserPlanGenerationPrompt(name, idea, research, { issues, raw }) }
      ]);
      raw = repaired.raw;
      plan = normalizeBrowserPlan(repaired.json, { name, idea });
      issues = browserPlanQualityIssues(plan, name, research, idea);
    }
    if (issues.length) throw new Error(`AI 生成方案未通过质量门禁：${issues.slice(0, 3).join("；")}`);
    return { ok: true, source: "ai-browser", raw, plan, research };
  }

  function publicLocalTask(task = {}) {
    return {
      id: task.id,
      type: task.type,
      key: task.key || "",
      status: task.status,
      attempts: Number(task.attempts || 0),
      result: task.status === "completed" ? task.result : null,
      error: task.status === "failed" ? task.error || "Task failed" : "",
      createdAt: task.createdAt || "",
      startedAt: task.startedAt || "",
      finishedAt: task.finishedAt || "",
      updatedAt: task.updatedAt || ""
    };
  }

  async function executeLocalTask(snapshot, task) {
    if (task.type === "scan") {
      return { status: "completed", scan: await runBrowserScan(snapshot, task.input?.observationPlanId, task) };
    }
    if (task.type === "analysis") return analyzeProjectWithModel(snapshot, task.input, await projectForKey(snapshot, task.input.fullName));
    if (task.type === "plan-generation") return generatePlanWithModel(snapshot, task.input);
    throw new Error(`Unsupported task type: ${task.type}`);
  }

  async function clearLocalTaskArtifacts(task) {
    if (task?.type === "scan") await storage().clearTaskArtifacts?.(task.id);
  }

  function startLocalTask(snapshot, task) {
    if (!task?.id || localTaskPromises.has(task.id)) return;
    if (Number(task.attempts || 0) >= 3) {
      task.status = "failed";
      task.error = "Task was interrupted too many times";
      task.finishedAt = nowIso();
      task.updatedAt = task.finishedAt;
      saveSnapshot(snapshot).then(() => clearLocalTaskArtifacts(task)).catch(() => {});
      return;
    }
    const startedAt = nowIso();
    task.status = "running";
    task.attempts = Number(task.attempts || 0) + 1;
    task.startedAt = startedAt;
    task.updatedAt = startedAt;
    task.error = "";
    const promise = saveSnapshot(snapshot)
      .then(() => executeLocalTask(snapshot, task))
      .then(async (result) => {
        task.status = "completed";
        task.result = result;
        if (task.type === "analysis" || task.type === "plan-generation") {
          updateProviderStatus(snapshot, "deepseek", { lastTestAt: nowIso(), testStatus: "ok" });
        }
        task.finishedAt = nowIso();
        task.updatedAt = task.finishedAt;
        await saveSnapshot(snapshot);
        await clearLocalTaskArtifacts(task).catch(() => {});
      })
      .catch(async (error) => {
        task.status = "failed";
        task.result = null;
        task.error = error?.message || "Task failed";
        if ((task.type === "analysis" || task.type === "plan-generation") && isProviderAuthError(error)) {
          const provider = activeProvider(snapshot, await getSecrets());
          updateProviderStatus(snapshot, "deepseek", {
            lastTestAt: nowIso(),
            testStatus: providerFailureStatus(provider, error)
          });
        }
        task.finishedAt = nowIso();
        task.updatedAt = task.finishedAt;
        await saveSnapshot(snapshot).catch(() => {});
        await clearLocalTaskArtifacts(task).catch(() => {});
      })
      .finally(() => localTaskPromises.delete(task.id));
    localTaskPromises.set(task.id, promise);
  }

  async function enqueueLocalTask(snapshot, type, key, input = {}) {
    const existing = Object.values(snapshot.store.tasks || {}).find(
      (task) => task.type === type && task.key === key && ["queued", "running"].includes(task.status)
    );
    if (existing) {
      startLocalTask(snapshot, existing);
      return existing;
    }
    const createdAt = nowIso();
    const task = {
      id: `local-task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type,
      key,
      status: "queued",
      attempts: 0,
      input: clone(input, {}),
      result: null,
      error: "",
      createdAt,
      updatedAt: createdAt,
      startedAt: "",
      finishedAt: ""
    };
    snapshot.store.tasks = snapshot.store.tasks || {};
    snapshot.store.tasks[task.id] = task;
    const ordered = Object.values(snapshot.store.tasks).sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
    snapshot.store.tasks = Object.fromEntries(ordered.slice(0, 60).map((item) => [item.id, item]));
    await saveSnapshot(snapshot);
    startLocalTask(snapshot, task);
    return task;
  }

  function portableData(snapshot) {
    const userData = activeUserData(snapshot);
    return {
      schema: "starvault-portable-config/v1",
      exportedAt: nowIso(),
      app: { name: "StarVault Imprint", nameZh: "星仓印记" },
      privacy: {
        secretsIncluded: false,
        excluded: ["githubToken", "tavilyKey", "exaKey", "llmProviders.apiKey"]
      },
      settings: safeSettings(snapshot.settings || {}),
      observationPlans: {
        activeObservationPlanId: snapshot.activeObservationPlanId || "default",
        plans: Object.values(snapshot.store.observationPlans || {}).map((plan) => publicPlan(plan, snapshot.activeObservationPlanId, true))
      },
      learning: {
        memory: activePlan(snapshot).memory || snapshot.store.memory || defaultMemory(),
        watchlist: clone(userData.watchlist || {}, {}),
        notes: clone(userData.notes || {}, {}),
        analysis: clone(userData.analysis || {}, {}),
        dismissedProjects: clone(userData.dismissedProjects || {}, {}),
        githubActions: clone(userData.githubActions || {}, {})
      }
    };
  }

  function localExportRecord(project, language, index) {
    const localized = (value = {}) => language === "zh" ? value.labelZh || value.label || value.labelEn || "" : value.labelEn || value.label || value.labelZh || "";
    const fields = language === "zh"
      ? {
          排名: index + 1,
          仓库全名: project.fullName,
          项目名: project.name,
          中文名: project.nameZh || project.name,
          作者: project.owner,
          "GitHub 地址": project.url,
          项目主页: project.homepage,
          原始简介: project.description,
          中文简介: project.descriptionZh || project.description,
          解决什么: localized(project.semantic?.problem),
          给谁用: localized(project.semantic?.audience),
          可做成: localized(project.semantic?.shape),
          分类: localized(project.category),
          用途方向: localized(project.useCase),
          语言: project.language,
          主题: (project.topics || []).join(" / "),
          Stars: project.stars,
          Forks: project.forks,
          Issues: project.openIssues,
          "趋势 Stars": project.trend?.stars ?? "",
          "趋势 Forks": project.trend?.forks ?? "",
          趋势日期: project.trend?.date || "",
          推荐值: project.scores?.opportunity ?? "",
          可落地性: project.scores?.actionability ?? "",
          工程质量: project.scores?.quality ?? "",
          项目风险: project.scores?.risk ?? "",
          许可风险: project.scores?.licenseRisk ?? "",
          许可证: project.licensePolicy?.name || project.license?.name || "",
          许可标签: project.licensePolicy?.labelZh || "",
          最近更新: project.pushedAt || project.updatedAt || "",
          首次入池: project.firstSeenAt || "",
          最近入池: project.lastSeenAt || "",
          已收藏: Boolean(project.watched),
          研判状态: project.triageStatus || "",
          研判记录: project.note || ""
        }
      : {
          rank: index + 1,
          fullName: project.fullName,
          name: project.name,
          nameZh: project.nameZh || project.name,
          owner: project.owner,
          githubUrl: project.url,
          homepage: project.homepage,
          description: project.description,
          descriptionZh: project.descriptionZh || project.description,
          problem: localized(project.semantic?.problem),
          audience: localized(project.semantic?.audience),
          canBecome: localized(project.semantic?.shape),
          category: localized(project.category),
          useCase: localized(project.useCase),
          language: project.language,
          topics: (project.topics || []).join(" / "),
          stars: project.stars,
          forks: project.forks,
          issues: project.openIssues,
          trendStars: project.trend?.stars ?? "",
          trendForks: project.trend?.forks ?? "",
          trendDate: project.trend?.date || "",
          opportunity: project.scores?.opportunity ?? "",
          actionability: project.scores?.actionability ?? "",
          quality: project.scores?.quality ?? "",
          projectRisk: project.scores?.risk ?? "",
          licenseRisk: project.scores?.licenseRisk ?? "",
          license: project.licensePolicy?.name || project.license?.name || "",
          licensePolicy: project.licensePolicy?.labelEn || "",
          pushedAt: project.pushedAt || project.updatedAt || "",
          firstSeenAt: project.firstSeenAt || "",
          lastSeenAt: project.lastSeenAt || "",
          favorite: Boolean(project.watched),
          triageStatus: project.triageStatus || "",
          note: project.note || ""
        };
    return fields;
  }

  function csvCell(value) {
    const text = String(value ?? "");
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }

  async function localProjectExport(snapshot, params = {}) {
    const language = params.language === "en" ? "en" : "zh";
    const projects = await projectsForActivePlan(snapshot);
    const items = filterProjects(snapshot, { ...params, limit: "all" }, projects).slice(0, 2000);
    const records = items.map((project, index) => localExportRecord(project, language, index));
    const format = params.format === "csv" ? "csv" : "json";
    if (format === "csv") {
      const headers = Object.keys(records[0] || localExportRecord({}, language, 0));
      const content = `\ufeff${[headers.map(csvCell).join(","), ...records.map((record) => headers.map((header) => csvCell(record[header])).join(","))].join("\n")}`;
      return { filename: `starvault-projects-${Date.now()}.csv`, mimeType: "text/csv;charset=utf-8", content };
    }
    const payload = language === "zh"
      ? { 导出时间: nowIso(), 观察方案: publicPlan(activePlan(snapshot), snapshot.activeObservationPlanId, false), 总数: records.length, 项目: records }
      : { exportedAt: nowIso(), observationPlan: publicPlan(activePlan(snapshot), snapshot.activeObservationPlanId, false), total: records.length, items: records };
    return { filename: `starvault-projects-${Date.now()}.json`, mimeType: "application/json;charset=utf-8", content: JSON.stringify(payload, null, 2) };
  }

  async function importPortableData(snapshot, payload = {}) {
    if (!payload || payload.schema !== "starvault-portable-config/v1") {
      throw new Error("No portable configuration data to import");
    }
    snapshot.settings = { ...snapshot.settings, ...safeSettings(payload.settings || {}) };
    const planPayload = payload.observationPlans || {};
    for (const plan of planPayload.plans || []) {
      if (!plan?.id) continue;
      snapshot.store.observationPlans[plan.id] = {
        ...plan,
        memory: plan.memory || defaultMemory(),
        userData: plan.userData || defaultUserData()
      };
    }
    if (planPayload.activeObservationPlanId && snapshot.store.observationPlans[planPayload.activeObservationPlanId]) {
      snapshot.activeObservationPlanId = planPayload.activeObservationPlanId;
      snapshot.settings.activeObservationPlanId = planPayload.activeObservationPlanId;
    }
    const userData = activeUserData(snapshot);
    const learning = payload.learning || {};
    if (learning.memory) activePlan(snapshot).memory = learning.memory;
    userData.watchlist = clone(learning.watchlist || userData.watchlist || {}, {});
    userData.notes = clone(learning.notes || userData.notes || {}, {});
    userData.analysis = clone(learning.analysis || userData.analysis || {}, {});
    userData.dismissedProjects = clone(learning.dismissedProjects || userData.dismissedProjects || {}, {});
    userData.githubActions = clone(learning.githubActions || userData.githubActions || {}, {});
    snapshot.store.memory = activePlan(snapshot).memory || defaultMemory();
    updateCounts(snapshot);
    await saveSnapshot(snapshot);
    return {
      imported: true,
      activeObservationPlanId: snapshot.activeObservationPlanId,
      plans: Object.values(snapshot.store.observationPlans || {}).map((plan) => publicPlan(plan, snapshot.activeObservationPlanId, false))
    };
  }

  function applyPreference(memory, kind, key, options = {}) {
    const scope = options.scope === "negative" ? "negativePreferences" : "preferences";
    const root = memory[scope] || {};
    const bucketName = kind === "category" ? "categories" : kind === "useCase" ? "useCases" : kind === "language" ? "languages" : kind === "license" ? "licenses" : "riskLevels";
    root[bucketName] = root[bucketName] || {};
    if (Number.isFinite(Number(options.value))) {
      root[bucketName][key] = Number(options.value);
    } else {
      root[bucketName][key] = Math.max(0, Number(root[bucketName][key] || 0) + Number(options.delta || 0));
    }
    if (root[bucketName][key] <= 0) delete root[bucketName][key];
    memory[scope] = root;
    return memory;
  }

  function memoryForPlan(snapshot, planId = "") {
    const plan = planById(snapshot, planId);
    const defaults = defaultMemory();
    const saved = plan.memory || {};
    const mergeBuckets = (base, value) =>
      Object.fromEntries(Object.keys(base).map((key) => [key, { ...(base[key] || {}), ...(value?.[key] || {}) }]));
    plan.memory = {
      ...defaults,
      ...saved,
      preferences: mergeBuckets(defaults.preferences, saved.preferences),
      negativePreferences: mergeBuckets(defaults.negativePreferences, saved.negativePreferences),
      discoveryProfiles: { ...defaults.discoveryProfiles, ...(saved.discoveryProfiles || {}) },
      stats: {
        ...defaults.stats,
        ...(saved.stats || {}),
        eventCounts: { ...defaults.stats.eventCounts, ...(saved.stats?.eventCounts || {}) }
      },
      context: { ...defaults.context, ...(saved.context || {}) }
    };
    return plan.memory;
  }

  function syncPlanMemory(snapshot, planId, memory) {
    const plan = planById(snapshot, planId);
    plan.memory = memory;
    plan.updatedAt = nowIso();
    if (plan.id === (snapshot.activeObservationPlanId || "default")) snapshot.store.memory = memory;
    return memory;
  }

  function localMemoryEventType(value = "") {
    return String(value || "select_project").trim().replaceAll("-", "_");
  }

  function localEventWeight(eventType, override) {
    if (eventType === "select_project") return 0;
    if (override !== undefined && Number.isFinite(Number(override))) return Number(override);
    return MEMORY_EVENT_WEIGHTS[eventType] ?? 0.5;
  }

  function projectProfile(project = {}, planId = "") {
    const matches = domainCore.projectProfileMatches(project, planId);
    const primary = matches[0] || {};
    return {
      key: String(primary.key || ""),
      label: String(primary.label || ""),
      matches
    };
  }

  function localMemoryKeys(project = {}) {
    return {
      category: String(project.category?.key || project.category?.label || "").trim(),
      useCase: String(project.useCase?.key || project.useCase?.label || "").trim(),
      language: String(project.language || "").trim(),
      license: String(project.licensePolicy?.bucket || project.license?.spdx_id || "").trim(),
      risk: riskLevel(project)
    };
  }

  function adjustLocalBucket(bucket, key, delta, min = 0, max = 40) {
    if (!key || !Number.isFinite(Number(delta)) || Number(delta) === 0) return;
    const next = Math.max(min, Math.min(max, Number(bucket[key] || 0) + Number(delta)));
    if (Math.abs(next) < 0.005) delete bucket[key];
    else bucket[key] = Number(next.toFixed(3));
  }

  function adjustLocalMemorySignal(memory, project, planId, weight, eventType, direction = 1) {
    const keys = localMemoryKeys(project);
    const preferences = memory.preferences;
    const negative = memory.negativePreferences;
    const signed = Number(weight || 0) * direction;
    const absolute = Math.abs(Number(weight || 0)) * direction;
    if (weight >= 0) {
      adjustLocalBucket(preferences.categories, keys.category, signed);
      adjustLocalBucket(preferences.useCases, keys.useCase, signed);
      adjustLocalBucket(preferences.languages, keys.language, signed * 0.45);
      adjustLocalBucket(preferences.licenses, keys.license, signed * 0.35);
      adjustLocalBucket(preferences.riskLevels, keys.risk, signed * 0.25);
      adjustLocalBucket(negative.categories, keys.category, -signed * 0.45, 0, 30);
      adjustLocalBucket(negative.useCases, keys.useCase, -signed * 0.45, 0, 30);
    } else {
      adjustLocalBucket(preferences.categories, keys.category, signed);
      adjustLocalBucket(preferences.useCases, keys.useCase, signed);
      adjustLocalBucket(preferences.languages, keys.language, signed * 0.25);
      adjustLocalBucket(negative.categories, keys.category, absolute * 0.75, 0, 30);
      adjustLocalBucket(negative.useCases, keys.useCase, absolute * 0.85, 0, 30);
      adjustLocalBucket(negative.languages, keys.language, absolute * 0.25, 0, 30);
      if (eventType === "leaderboard_negative") {
        adjustLocalBucket(negative.repositories, project.fullName, absolute, 0, 20);
      }
    }
    const profile = projectProfile(project, planId);
    const profileDelta = profile.matches.length ? signed / profile.matches.length : 0;
    for (const match of profile.matches) adjustLocalBucket(memory.discoveryProfiles, match.key, profileDelta, -40, 40);
    return { keys, profile };
  }

  function appendLocalMemoryEvent(snapshot, project, eventType, options = {}) {
    if (!project?.fullName) return null;
    const planId = String(options.planId || snapshot.activeObservationPlanId || "default");
    const type = localMemoryEventType(eventType);
    const memory = memoryForPlan(snapshot, planId);
    const weight = localEventWeight(type, options.weight);
    const { keys, profile } = adjustLocalMemorySignal(memory, project, planId, weight, type, 1);
    const at = nowIso();
    const entry = {
      at,
      type,
      reason: options.reason || type,
      weight: Number(weight.toFixed(2)),
      fullName: project.fullName,
      category: keys.category,
      useCase: keys.useCase,
      language: keys.language,
      license: keys.license,
      risk: keys.risk,
      profileKey: profile.key,
      profileLabel: profile.label,
      profileMatches: profile.matches,
      observationPlanId: planId,
      source: options.source || "indexeddb"
    };
    memory.events = [entry, ...(memory.events || [])].slice(0, Number(memory.context?.rawEventLimit || 300));
    memory.shortTerm = [entry, ...(memory.shortTerm || [])].slice(0, Number(memory.context?.shortTermLimit || 80));
    memory.stats.eventCounts[type] = Number(memory.stats.eventCounts[type] || 0) + 1;
    memory.stats.lastEventAt = at;
    syncPlanMemory(snapshot, planId, memory);
    return entry;
  }

  function removeLatestLocalMemoryEvent(snapshot, project, eventType, options = {}) {
    if (!project?.fullName) return false;
    const planId = String(options.planId || snapshot.activeObservationPlanId || "default");
    const type = localMemoryEventType(eventType);
    const memory = memoryForPlan(snapshot, planId);
    const matches = (entry) => projectKey(entry.fullName) === projectKey(project.fullName) && localMemoryEventType(entry.type || entry.reason) === type;
    const event = (memory.events || []).find(matches);
    if (!event) return false;
    const rollbackProject = event.profileMatches?.length
      ? {
          ...project,
          observationPlanMatches: {
            ...(project.observationPlanMatches || {}),
            [planId]: {
              planId,
              profileKey: event.profileKey || "",
              profileLabel: event.profileLabel || "",
              profileMatches: event.profileMatches
            }
          }
        }
      : project;
    adjustLocalMemorySignal(memory, rollbackProject, planId, Number(event.weight || localEventWeight(type)), type, -1);
    const removeFirst = (items = []) => {
      let removed = false;
      return items.filter((item) => {
        if (!removed && matches(item)) {
          removed = true;
          return false;
        }
        return true;
      });
    };
    memory.events = removeFirst(memory.events);
    memory.shortTerm = removeFirst(memory.shortTerm);
    memory.stats.eventCounts[type] = Math.max(0, Number(memory.stats.eventCounts[type] || 0) - 1);
    syncPlanMemory(snapshot, planId, memory);
    return true;
  }

  async function recordLocalMemoryEvent(snapshot, fullName, eventType, options = {}) {
    const project = await projectForKey(snapshot, fullName);
    return appendLocalMemoryEvent(snapshot, project, eventType, options);
  }

  function browserHarnessScorecard(snapshot) {
    const planId = snapshot.activeObservationPlanId || "default";
    const memory = memoryForPlan(snapshot, planId);
    const archive = planId === "default" ? snapshot.store.leaderboards?.daily || {} : snapshot.store.leaderboards?.byPlan?.[planId]?.daily || {};
    const cutoff = Date.now() - 30 * 86400000;
    const recentArchives = Object.values(archive).filter((entry) => new Date(entry.generatedAt || entry.date || 0).getTime() >= cutoff);
    const currentItems = snapshot.leaderboard?.items || recentArchives[recentArchives.length - 1]?.items || [];
    const exposed = new Set(recentArchives.flatMap((entry) => (entry.items || []).map((item) => projectKey(item.fullName))));
    currentItems.forEach((item) => exposed.add(projectKey(item.fullName)));
    const events = (memory.events || []).filter((event) => new Date(event.at || 0).getTime() >= cutoff);
    const positiveTypes = new Set(["favorite", "star", "fork", "triage_note", "ai_analyze", "leaderboard_positive", "leaderboard_strong_positive"]);
    const negativeTypes = new Set(["unfavorite", "unstar", "leaderboard_negative", "dismiss_project"]);
    const positiveProjects = new Set(events.filter((event) => positiveTypes.has(event.type)).map((event) => projectKey(event.fullName)));
    const negativeProjects = new Set(events.filter((event) => negativeTypes.has(event.type)).map((event) => projectKey(event.fullName)));
    const useCaseCounts = {};
    for (const item of currentItems) {
      const key = item.useCase?.key || item.category?.key || "other";
      useCaseCounts[key] = Number(useCaseCounts[key] || 0) + 1;
    }
    const maxShare = currentItems.length ? Math.max(0, ...Object.values(useCaseCounts)) / currentItems.length : 0;
    const diversity = Object.keys(useCaseCounts).length;
    const targetExploration = Number(memory.antiBubble?.explorationRatio || 0.25);
    const explorationShare = currentItems.length
      ? currentItems.filter((item) => Number(item.scoreParts?.memoryBoost || 0) <= 0.5).length / currentItems.length
      : targetExploration;
    const percent = (value) => Math.max(0, Math.min(100, Math.round(Number(value || 0))));
    const exposedCount = Math.max(1, exposed.size);
    const metrics = {
      positiveYield: percent((positiveProjects.size / exposedCount) * 100),
      negativeRate: percent((negativeProjects.size / exposedCount) * 100),
      diversityCoverage: percent(currentItems.length ? (diversity / Math.min(8, currentItems.length)) * 100 : 0),
      repetitionControl: percent((1 - maxShare) * 100),
      actionabilityFit: percent(currentItems.length ? currentItems.reduce((sum, item) => sum + Number(item.scores?.actionability || 0), 0) / currentItems.length : 0),
      licenseReadiness: percent(currentItems.length ? (currentItems.filter((item) => item.licensePolicy?.bucket === "permissive-commercial").length / currentItems.length) * 100 : 0),
      explorationFit: percent((1 - Math.min(1, Math.abs(explorationShare - targetExploration) / 0.35)) * 100)
    };
    const qualityMetrics = [metrics.diversityCoverage, metrics.repetitionControl, metrics.actionabilityFit, metrics.licenseReadiness, metrics.explorationFit];
    const scorecard = {
      evaluatedAt: nowIso(),
      proxyOnly: true,
      sample: {
        exposedProjects30d: exposed.size,
        rankedItems: currentItems.length,
        events30d: events.length,
        positiveProjects: positiveProjects.size,
        negativeProjects: negativeProjects.size
      },
      metrics,
      overall: percent(qualityMetrics.reduce((sum, value) => sum + value, 0) / qualityMetrics.length),
      recommendations: []
    };
    if (metrics.diversityCoverage < 55 || metrics.repetitionControl < 60) scorecard.recommendations.push("提高探索比例或压低重复用途权重，避免同类项目连续占据前排。");
    if (metrics.negativeRate > metrics.positiveYield && events.length >= 3) scorecard.recommendations.push("近期明确负反馈偏多，应降低对应画像的候选预算并保留探索位。");
    if (metrics.actionabilityFit < 55) scorecard.recommendations.push("当前项目可实践性偏弱，后续排序应提高工程质量与用途清晰度权重。");
    if (metrics.licenseReadiness < 35) scorecard.recommendations.push("许可清晰项目占比较低，不明许可项目应更多进入观察而非前排。");
    if (!scorecard.recommendations.length) scorecard.recommendations.push("当前代理指标稳定，继续保留个性化加权和探索位，并等待更多明确反馈。");
    return scorecard;
  }

  function applyBrowserMemoryTuning(memory, tuning = {}) {
    const applied = [];
    const apply = (root, deltas, scope) => {
      for (const bucket of ["categories", "useCases", "languages", "licenses", "riskLevels"]) {
        root[bucket] = root[bucket] || {};
        for (const [key, raw] of Object.entries(deltas?.[bucket] || {})) {
          const delta = Math.max(-3, Math.min(3, Number(raw || 0)));
          if (!key || !delta) continue;
          adjustLocalBucket(root[bucket], key, delta, 0, scope === "negative" ? 30 : 40);
          applied.push(`${scope}.${bucket}.${key}:${delta > 0 ? "+" : ""}${delta}`);
        }
      }
    };
    apply(memory.preferences, tuning.positivePreferenceDeltas, "positive");
    apply(memory.negativePreferences, tuning.negativePreferenceDeltas, "negative");
    if (Number.isFinite(Number(tuning.antiBubble?.explorationRatio))) {
      memory.antiBubble.explorationRatio = Math.max(0.1, Math.min(0.45, Number(tuning.antiBubble.explorationRatio)));
      applied.push(`antiBubble.explorationRatio:${memory.antiBubble.explorationRatio}`);
    }
    return applied;
  }

  async function tuneBrowserMemory(snapshot, scorecard) {
    const memory = memoryForPlan(snapshot);
    const { json, provider } = await callModelJson(snapshot, [
      {
        role: "system",
        content:
          "你是星仓印记学习策略调优器。只返回 JSON。不得删除探索位，不得按普通点击放大偏好。字段：summaryZh、summaryEn、confidence、recommendations数组、positivePreferenceDeltas、negativePreferenceDeltas、antiBubble.explorationRatio。各偏好增量只能在 -3 到 3。"
      },
      {
        role: "user",
        content: JSON.stringify({
          scorecard,
          memory: {
            preferences: memory.preferences,
            negativePreferences: memory.negativePreferences,
            antiBubble: memory.antiBubble,
            recentEvents: (memory.events || []).slice(0, 40)
          }
        })
      }
    ]);
    const applied = applyBrowserMemoryTuning(memory, json);
    const at = nowIso();
    memory.harness = {
      ...(memory.harness || {}),
      mode: provider.name || provider.id || "llm",
      lastTunedAt: at,
      lastTuning: {
        at,
        source: provider.name || provider.id || "llm",
        confidence: json.confidence ?? null,
        summaryZh: json.summaryZh || "",
        summaryEn: json.summaryEn || "",
        recommendations: Array.isArray(json.recommendations) ? json.recommendations.slice(0, 8) : [],
        applied
      }
    };
    syncPlanMemory(snapshot, snapshot.activeObservationPlanId || "default", memory);
    await saveSnapshot(snapshot);
    return { tuning: json, memory, provider: provider.name || provider.id || "", model: provider.model || "" };
  }

  async function handle(path, options = {}) {
    const url = new URL(path, window.location.origin);
    const params = Object.fromEntries(url.searchParams.entries());
    const method = String(options.method || "GET").toUpperCase();
    const body = options.body ? JSON.parse(options.body) : {};
    const snapshot = await requireSnapshot();
    const secrets = await getSecrets();
    const userData = activeUserData(snapshot);
    const activeId = snapshot.activeObservationPlanId || "default";

    if (method === "GET" && url.pathname === "/api/tasks") {
      const tasks = Object.values(snapshot.store.tasks || {})
        .filter((task) => !params.type || task.type === params.type)
        .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
        .slice(0, Math.max(1, Math.min(60, Number(params.limit || 30))));
      tasks.filter((task) => task.status === "queued" || task.status === "running").forEach((task) => startLocalTask(snapshot, task));
      return { tasks: tasks.map(publicLocalTask) };
    }
    if (method === "GET" && url.pathname.startsWith("/api/tasks/")) {
      const id = decodeURIComponent(url.pathname.slice("/api/tasks/".length));
      const task = snapshot.store.tasks?.[id];
      if (!task) throw new Error("Task not found");
      if (task.status === "queued" || task.status === "running") startLocalTask(snapshot, task);
      return { task: publicLocalTask(task) };
    }

    if (method === "GET" && url.pathname === "/api/config") {
      const persistence = await storage().storageStatus?.() || { supported: false, persisted: false };
      const lastPortableExportAt = String((await storage().getValue?.(LAST_PORTABLE_EXPORT_KEY)) || "");
      const backupDue = !lastPortableExportAt || Date.now() - new Date(lastPortableExportAt).getTime() > 7 * 86400000;
      return { port: "", host: location.host, runtime: "browser-indexeddb", githubConfigured: Boolean(secrets.githubToken), tavilyConfigured: Boolean(secrets.tavilyKey), exaConfigured: Boolean(secrets.exaKey), scanHour: 8, scanMaxRepos: 800, githubSearchPages: 2, githubTrendLimit: 80, githubTrendingMaxRepos: 60, githubTrendingPerPeriod: 25, storagePersistence: persistence, lastPortableExportAt, backupDue };
    }
    if (method === "GET" && url.pathname === "/api/settings") return settingsResponse(snapshot, secrets, url.searchParams.get("reveal") || "");
    if (method === "POST" && url.pathname === "/api/settings") {
      const nextSecrets = { ...secrets };
      if (body.githubToken) nextSecrets.githubToken = body.githubToken.trim();
      if (body.tavilyKey) nextSecrets.tavilyKey = body.tavilyKey.trim();
      if (body.exaKey) nextSecrets.exaKey = body.exaKey.trim();
      if (body.clearGithubToken) nextSecrets.githubToken = "";
      if (body.clearTavilyKey) nextSecrets.tavilyKey = "";
      if (body.clearExaKey) nextSecrets.exaKey = "";
      nextSecrets.llmProviders = { ...(nextSecrets.llmProviders || {}) };
      for (const provider of body.llmProviders || []) {
        if (provider.apiKey) nextSecrets.llmProviders[provider.id] = { apiKey: provider.apiKey.trim() };
        if (provider.clearApiKey) nextSecrets.llmProviders[provider.id] = { apiKey: "" };
      }
      snapshot.settings = { ...snapshot.settings, ...safeSettings(body), activeObservationPlanId: activeId };
      await saveSecrets(nextSecrets);
      await saveSnapshot(snapshot);
      const keyValidation = await validateBrowserServiceKeys(nextSecrets);
      if (body.validateProvider !== false) {
        keyValidation.provider = await validateBrowserProviderStatus(snapshot, nextSecrets, "deepseek");
      }
      await saveSnapshot(snapshot);
      return { ...settingsResponse(snapshot, nextSecrets), keyValidation };
    }
    if (method === "GET" && url.pathname === "/api/observation-plans") {
      const plans = Object.values(snapshot.store.observationPlans || {}).map((plan) => publicPlan(plan, activeId, false));
      return { active: publicPlan(activePlan(snapshot), activeId, true), plans };
    }
    if (method === "POST" && url.pathname === "/api/observation-plans/requirements") {
      if ((body.id || activeId) === "default") throw new Error("Default observation plan requirements cannot be edited");
      const plan = snapshot.store.observationPlans[body.id || activeId];
      if (!plan) throw new Error("Observation plan not found");
      plan.requirements = Array.isArray(body.requirements) ? body.requirements : [];
      plan.updatedAt = nowIso();
      await saveSnapshot(snapshot);
      return { plan: publicPlan(plan, activeId, true), plans: Object.values(snapshot.store.observationPlans).map((item) => publicPlan(item, activeId, false)) };
    }
    if (method === "POST" && url.pathname === "/api/observation-plans/active") {
      if (!snapshot.store.observationPlans?.[body.id]) throw new Error("Observation plan not found");
      snapshot.activeObservationPlanId = body.id;
      snapshot.settings.activeObservationPlanId = body.id;
      snapshot.store.memory = snapshot.store.observationPlans[body.id].memory || defaultMemory();
      await saveSnapshot(snapshot);
      return { active: publicPlan(snapshot.store.observationPlans[body.id], body.id, true), plans: Object.values(snapshot.store.observationPlans).map((plan) => publicPlan(plan, body.id, false)) };
    }
    if (method === "POST" && url.pathname === "/api/observation-plans") {
      const sourcePlan = body.plan || body;
      const id = sourcePlan.id || `plan-${Date.now()}`;
      const previousPlan = snapshot.store.observationPlans[id] || null;
      const plan = normalizeBrowserPlan(
        {
          ...(previousPlan || {}),
          ...sourcePlan,
          id,
          builtIn: false,
          active: false,
          updatedAt: nowIso(),
          createdAt: previousPlan?.createdAt || sourcePlan.createdAt || nowIso(),
          memory: sourcePlan.memory || previousPlan?.memory || defaultMemory(),
          userData: sourcePlan.userData || previousPlan?.userData || defaultUserData()
        },
        { name: sourcePlan.name || previousPlan?.name || "自定义观察" },
        previousPlan
      );
      snapshot.store.observationPlans[plan.id] = plan;
      updateCounts(snapshot);
      await saveSnapshot(snapshot);
      return { plan: publicPlan(plan, activeId, true), plans: Object.values(snapshot.store.observationPlans).map((item) => publicPlan(item, activeId, false)) };
    }
    if (method === "POST" && url.pathname === "/api/observation-plans/delete") {
      if (body.id === "default") throw new Error("Default observation plan cannot be deleted");
      const activeTask = Object.values(snapshot.store.tasks || {}).find(
        (task) => task?.input?.observationPlanId === body.id && ["queued", "running"].includes(task.status)
      );
      if (activeTask) throw new Error("方案有正在执行的任务，请等待完成后再删除");
      const deletedTaskIds = Object.entries(snapshot.store.tasks || {})
        .filter(([, task]) => task?.input?.observationPlanId === body.id)
        .map(([taskId]) => taskId);
      delete snapshot.store.observationPlans[body.id];
      snapshot.store.scans = (snapshot.store.scans || []).filter((scan) => scan.observationPlanId !== body.id);
      if (snapshot.store.leaderboards?.byPlan) delete snapshot.store.leaderboards.byPlan[body.id];
      for (const [taskId, task] of Object.entries(snapshot.store.tasks || {})) {
        if (task.input?.observationPlanId === body.id) delete snapshot.store.tasks[taskId];
      }
      if (snapshot.activeObservationPlanId === body.id) snapshot.activeObservationPlanId = "default";
      snapshot.settings.activeObservationPlanId = snapshot.activeObservationPlanId;
      updateCounts(snapshot);
      await saveSnapshot(snapshot);
      await storage().deletePlanData?.(body.id);
      await Promise.all(deletedTaskIds.map((taskId) => Promise.resolve(storage().clearTaskArtifacts?.(taskId)).catch(() => {})));
      return { activeObservationPlanId: snapshot.activeObservationPlanId, plans: Object.values(snapshot.store.observationPlans).map((item) => publicPlan(item, snapshot.activeObservationPlanId, false)) };
    }
    if (method === "GET" && url.pathname === "/api/projects") {
      const projects = await projectsForActivePlan(snapshot);
      return paginate(filterProjects(snapshot, params, projects), params, 10);
    }
    if (method === "GET" && url.pathname === "/api/project") {
      const project = await hydratedProject(snapshot, url.searchParams.get("fullName"));
      if (!project?.fullName) throw new Error("Project not found");
      return project;
    }
    if (method === "GET" && url.pathname === "/api/projects/position") {
      const fullName = url.searchParams.get("fullName");
      const projects = await projectsForActivePlan(snapshot);
      const items = filterProjects(snapshot, { ...params, limit: "all" }, projects);
      const index = items.findIndex((project) => projectKey(project.fullName) === projectKey(fullName));
      const pageSize = Math.max(1, Number(params.pageSize || params.limit || 10));
      return { found: index >= 0, index, page: index >= 0 ? Math.floor(index / pageSize) + 1 : null, pageSize, total: items.length };
    }
    if (method === "GET" && url.pathname === "/api/summary") {
      const projects = await projectsForActivePlan(snapshot);
      return summary(snapshot, params, projects);
    }
    if (method === "GET" && url.pathname === "/api/leaderboard") {
      const planId = snapshot.activeObservationPlanId || "default";
      const archive = planId === "default" ? snapshot.store.leaderboards?.daily || {} : snapshot.store.leaderboards?.byPlan?.[planId]?.daily || {};
      if ((params.period || "daily") === "daily" && params.date && archive[params.date]) {
        return {
          ...clone(archive[params.date], archive[params.date]),
          period: "daily",
          date: params.date,
          memory: memoryForPlan(snapshot),
          observationPlan: publicPlan(activePlan(snapshot), planId, false),
          archiveDates: Object.keys(archive).sort().reverse()
        };
      }
      const projects = await projectsForActivePlan(snapshot);
      return buildLeaderboard(snapshot, params, projects);
    }
    if (method === "GET" && url.pathname === "/api/leaderboard-archives") {
      const planId = snapshot.activeObservationPlanId || "default";
      const archive = planId === "default" ? snapshot.store.leaderboards?.daily || {} : snapshot.store.leaderboards?.byPlan?.[planId]?.daily || {};
      return { dates: Object.keys(archive).sort().reverse() };
    }
    if (method === "GET" && url.pathname === "/api/memory") return activePlan(snapshot).memory || snapshot.store.memory || defaultMemory();
    if (method === "POST" && url.pathname === "/api/memory-preference") {
      const memory = applyPreference(activePlan(snapshot).memory || defaultMemory(), body.kind, body.key, body);
      activePlan(snapshot).memory = memory;
      snapshot.store.memory = memory;
      await saveSnapshot(snapshot);
      return { memory };
    }
    if (method === "GET" && url.pathname === "/api/github/actions") return { actions: userData.githubActions || {} };
    if (method === "GET" && url.pathname === "/api/dismissed-projects") {
      const projects = await projectsForKeys(snapshot, Object.keys(userData.dismissedProjects || {}));
      const items = projects.map((project) => withUserState(project, snapshot)).filter((item) => item?.fullName);
      return { items };
    }
    if (method === "POST" && url.pathname === "/api/watchlist") {
      const key = projectKey(body.fullName);
      const wasWatched = Boolean(userData.watchlist[key]);
      if (body.watched) userData.watchlist[key] = { fullName: body.fullName, at: nowIso() };
      else delete userData.watchlist[key];
      if (wasWatched !== Boolean(body.watched)) {
        await recordLocalMemoryEvent(snapshot, body.fullName, body.watched ? "favorite" : "unfavorite", { planId: activeId });
      }
      await saveSnapshot(snapshot);
      return { project: await hydratedProject(snapshot, key), memory: activePlan(snapshot).memory || defaultMemory() };
    }
    if (method === "POST" && url.pathname === "/api/project-dismissal") {
      const key = projectKey(body.fullName);
      const project = await projectForKey(snapshot, key);
      const wasDismissed = Boolean(userData.dismissedProjects[key]);
      if (body.dismissed !== false) {
        userData.dismissedProjects[key] = { fullName: body.fullName, at: nowIso() };
        if (!wasDismissed) appendLocalMemoryEvent(snapshot, project, "dismiss_project", { planId: activeId, source: "project_pool" });
      } else {
        delete userData.dismissedProjects[key];
        if (wasDismissed) removeLatestLocalMemoryEvent(snapshot, project, "dismiss_project", { planId: activeId });
      }
      await saveSnapshot(snapshot);
      return { project: await hydratedProject(snapshot, key), memory: activePlan(snapshot).memory || defaultMemory() };
    }
    if (method === "POST" && url.pathname === "/api/dismissed-project-feedback") {
      const key = projectKey(body.fullName);
      userData.dismissedProjects[key] = {
        ...(userData.dismissedProjects[key] || { fullName: body.fullName, at: nowIso() }),
        feedback: body.feedback || {},
        updatedAt: nowIso()
      };
      await saveSnapshot(snapshot);
      const dismissedProjects = await projectsForKeys(snapshot, Object.keys(userData.dismissedProjects || {}));
      return {
        project: await hydratedProject(snapshot, key),
        items: dismissedProjects.map((project) => withUserState(project, snapshot)).filter((item) => item?.fullName)
      };
    }
    if (method === "POST" && url.pathname === "/api/note") {
      const key = projectKey(body.fullName);
      const previous = userData.notes[key] || null;
      const next = { text: String(body.text || "").slice(0, 4000), status: String(body.status || ""), updatedAt: nowIso() };
      if (!next.text && !next.status) {
        delete userData.notes[key];
        if (previous) removeLatestLocalMemoryEvent(snapshot, await projectForKey(snapshot, key), "triage_note", { planId: activeId });
      } else {
        userData.notes[key] = next;
        if (!previous || previous.text !== next.text || previous.status !== next.status) {
          await recordLocalMemoryEvent(snapshot, body.fullName, "triage_note", { planId: activeId });
        }
      }
      await saveSnapshot(snapshot);
      return hydratedProject(snapshot, key);
    }
    if (method === "POST" && url.pathname === "/api/memory-event") {
      await recordLocalMemoryEvent(snapshot, body.fullName, body.type || "select_project", {
        planId: activeId,
        source: body.source || "indexeddb",
        weight: body.weight
      });
      const memory = memoryForPlan(snapshot, activeId);
      await saveSnapshot(snapshot);
      return { memory };
    }
    if (method === "POST" && url.pathname === "/api/leaderboard-feedback") {
      const type = `leaderboard_${String(body.feedback || "positive").replaceAll("-", "_")}`;
      await recordLocalMemoryEvent(snapshot, body.fullName, type, { planId: activeId, source: "leaderboard" });
      const memory = memoryForPlan(snapshot, activeId);
      await saveSnapshot(snapshot);
      return { memory };
    }
    if (method === "POST" && url.pathname === "/api/memory/events/clear") {
      const memory = activePlan(snapshot).memory || defaultMemory();
      memory.events = [];
      memory.shortTerm = [];
      activePlan(snapshot).memory = memory;
      snapshot.store.memory = memory;
      await saveSnapshot(snapshot);
      return { memory };
    }
    if (method === "POST" && url.pathname === "/api/memory/context/compact") {
      const memory = activePlan(snapshot).memory || defaultMemory();
      const events = memory.events || [];
      const chunk = {
        id: `local-chunk-${Date.now()}`,
        at: nowIso(),
        summaryZh: `已压缩 ${events.length} 条本地行为记录。`,
        summaryEn: `Compressed ${events.length} local behavior events.`,
        sourceEventCount: events.length
      };
      memory.context = { ...(memory.context || {}), compressedAt: nowIso(), sourceEventCount: events.length, chunks: [chunk, ...(memory.context?.chunks || [])].slice(0, 20) };
      memory.shortTerm = [];
      activePlan(snapshot).memory = memory;
      snapshot.store.memory = memory;
      await saveSnapshot(snapshot);
      return { memory, chunk };
    }
    if (method === "POST" && ["/api/memory/harness/evaluate", "/api/memory/harness/tune"].includes(url.pathname)) {
      const projects = await projectsForActivePlan(snapshot);
      snapshot.leaderboard = buildLeaderboard(snapshot, { period: "daily", limit: 20 }, projects);
      const scorecard = browserHarnessScorecard(snapshot);
      const memory = memoryForPlan(snapshot);
      memory.harness = {
        ...(memory.harness || {}),
        mode: "local-rules",
        lastEvaluatedAt: scorecard.evaluatedAt,
        scorecard,
        recommendations: scorecard.recommendations,
        runs: [{ at: scorecard.evaluatedAt, overall: scorecard.overall, metrics: scorecard.metrics }, ...(memory.harness?.runs || [])].slice(0, 30)
      };
      syncPlanMemory(snapshot, activeId, memory);
      await saveSnapshot(snapshot);
      if (url.pathname.endsWith("/tune")) return { ok: true, ...(await tuneBrowserMemory(snapshot, scorecard)) };
      return { ok: true, harness: memory.harness, memory };
    }
    if (method === "POST" && url.pathname === "/api/memory-settings") {
      const memory = activePlan(snapshot).memory || defaultMemory();
      memory.antiBubble = { ...(memory.antiBubble || {}), ...(body.antiBubble || {}) };
      memory.context = { ...(memory.context || {}), ...(body.context || {}) };
      activePlan(snapshot).memory = memory;
      snapshot.store.memory = memory;
      await saveSnapshot(snapshot);
      return { memory };
    }
    if (method === "GET" && url.pathname === "/api/github/me") {
      const user = await githubFetch("/user");
      return { user };
    }
    if (method === "GET" && url.pathname === "/api/github/repos") {
      const perPage = Math.max(1, Math.min(Number(params.perPage || 50), 100));
      const repositories = await githubFetch(`/user/repos?per_page=${perPage}&sort=updated`);
      return { repositories };
    }
    if (method === "POST" && ["/api/github/star", "/api/github/unstar"].includes(url.pathname)) {
      const key = projectKey(body.fullName);
      const [owner, repo] = String(body.fullName || "").split("/");
      const starred = url.pathname.endsWith("/star");
      await githubFetch(`/user/starred/${owner}/${repo}`, { method: starred ? "PUT" : "DELETE" });
      const wasStarred = Boolean(userData.githubActions[key]?.starred);
      userData.githubActions[key] = { ...(userData.githubActions[key] || {}), starred, updatedAt: nowIso() };
      if (wasStarred !== starred) {
        await recordLocalMemoryEvent(snapshot, body.fullName, starred ? "star" : "unstar", { planId: activeId, source: "github" });
      }
      await saveSnapshot(snapshot);
      return { action: userData.githubActions[key], project: await hydratedProject(snapshot, key), memory: activePlan(snapshot).memory || defaultMemory() };
    }
    if (method === "POST" && url.pathname === "/api/github/fork") {
      const key = projectKey(body.fullName);
      const [owner, repo] = String(body.fullName || "").split("/");
      const fork = await githubFetch(`/repos/${owner}/${repo}/forks`, { method: "POST" });
      const wasForked = Boolean(userData.githubActions[key]?.forked);
      userData.githubActions[key] = { ...(userData.githubActions[key] || {}), forked: true, forkUrl: fork.html_url || "", updatedAt: nowIso() };
      if (!wasForked) await recordLocalMemoryEvent(snapshot, body.fullName, "fork", { planId: activeId, source: "github" });
      await saveSnapshot(snapshot);
      return { action: userData.githubActions[key], project: await hydratedProject(snapshot, key), memory: activePlan(snapshot).memory || defaultMemory() };
    }
    if (method === "POST" && url.pathname === "/api/scan") {
      const task = await enqueueLocalTask(snapshot, "scan", "scan", {
        mode: body.mode || "manual",
        observationPlanId: activeId
      });
      return { status: "started", task: publicLocalTask(task) };
    }
    if (method === "POST" && url.pathname === "/api/analyze") {
      const task = await enqueueLocalTask(snapshot, "analysis", `analysis:${projectKey(body.fullName)}`, {
        fullName: String(body.fullName || "").slice(0, 240),
        method: String(body.method || "balanced").slice(0, 40),
        userNeed: String(body.userNeed || "").slice(0, 1000),
        observationPlanId: activeId
      });
      return { status: "started", task: publicLocalTask(task) };
    }
    if (method === "POST" && url.pathname === "/api/observation-plans/generate") {
      const name = String(body.name || "").trim();
      const task = await enqueueLocalTask(snapshot, "plan-generation", `plan:${lower(name)}`, {
        name: name.slice(0, 80),
        idea: String(body.idea || "").slice(0, 6000),
        detailedNeed: String(body.detailedNeed || "").slice(0, 6000)
      });
      return { status: "started", task: publicLocalTask(task) };
    }
    if (method === "GET" && url.pathname === "/api/scan/status") {
      const lastScan = snapshot.store.scans?.[0] || null;
      const task = Object.values(snapshot.store.tasks || {}).filter((item) => item.type === "scan").sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))[0] || null;
      const running = Boolean(task && ["queued", "running"].includes(task.status));
      return { status: running ? "running" : lastScan ? "completed" : "idle", stage: running ? "github" : lastScan ? "completed" : "idle", label: running ? "扫描中" : lastScan ? "完成" : "空闲", percent: running ? 20 : lastScan ? 100 : 0, running, task: task ? publicLocalTask(task) : null, updatedAt: task?.updatedAt || lastScan?.at || null };
    }
    if (method === "GET" && url.pathname === "/api/export") return localProjectExport(snapshot, params);
    if (method === "GET" && url.pathname === "/api/portable-data/export") {
      const exportedAt = nowIso();
      await storage().putValue?.(LAST_PORTABLE_EXPORT_KEY, exportedAt);
      return { ...portableData(snapshot), exportedAt };
    }
    if (method === "POST" && url.pathname === "/api/portable-data/import") return importPortableData(snapshot, body);
    if (method === "POST" && url.pathname === "/api/provider-test") {
      try {
        const result = await callModelJson(snapshot, [
          { role: "system", content: "Return JSON only." },
          { role: "user", content: "{\"ok\":true}" }
        ]);
        updateProviderStatus(snapshot, "deepseek", { lastTestAt: nowIso(), testStatus: "ok" });
        await saveSnapshot(snapshot);
        return { ok: true, settings: settingsResponse(snapshot, secrets) };
      } catch (error) {
        const provider = activeProvider(snapshot, secrets);
        updateProviderStatus(snapshot, "deepseek", {
          lastTestAt: nowIso(),
          testStatus: providerFailureStatus(provider, error)
        });
        await saveSnapshot(snapshot);
        error.details = { settings: settingsResponse(snapshot, secrets) };
        throw error;
      }
    }
    if (method === "POST" && url.pathname === "/api/provider-models") {
      const provider = activeProvider(snapshot, secrets);
      return { models: provider.models || [provider.model || DEFAULT_PROVIDER.model] };
    }
    if (method === "POST" && url.pathname === "/api/provider-catalog/refresh") {
      snapshot.settings.providerCatalog = { updatedAt: nowIso(), endpoints: [{ id: "deepseek", name: "DeepSeek", baseUrl: DEFAULT_PROVIDER.baseUrl }] };
      await saveSnapshot(snapshot);
      return { providerCatalog: snapshot.settings.providerCatalog };
    }
    if (method === "GET" && url.pathname === "/api/discovery") {
      return { profiles: [], count: 0, source: "indexeddb" };
    }
    throw new Error(`Local IndexedDB API does not support ${method} ${url.pathname}`);
  }

  function canHandle(path) {
    return storage()?.isSupported?.() && String(path || "").startsWith("/api/");
  }

  function shouldUseLocal(path, options = {}) {
    if (!canHandle(path)) return false;
    if (localModeForced()) return true;
    return false;
  }

  window.StarVaultLocalApi = {
    canHandle,
    shouldUseLocal,
    handle,
    localModeForced,
    activateLocalMode,
    deactivateLocalMode
  };
})();
