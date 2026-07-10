(function () {
  const SECRETS_KEY = "localSecrets";
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
    "学习中枢要根据我的收藏、Star/Fork、研判、AI 分析、不合适/隐藏这些明确行为调整项目池和榜单，普通点开看看不要给太高权重。",
    "默认观察就当作通用起步方案，先保持只读；如果我要看 CAD、PS、CRM、AI 硬件这类具体领域，再单独新建观察方案。"
  ];
  const MEMORY_EVENT_WEIGHTS = {
    select_project: 0.03,
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
    sortProjects(items, params.sort || snapshot.settings?.defaultSort || "opportunity");
    return items;
  }

  function sortProjects(items, sort) {
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
      return score(b, "opportunity") - score(a, "opportunity") || Number(b.stars || 0) - Number(a.stars || 0);
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
    const items = filterProjects(snapshot, { ...params, limit: "all" }, sourceProjects);
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
      totalProjects: Number(snapshot.counts?.projects || items.length),
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

  function buildLeaderboard(snapshot, params = {}, sourceProjects = null) {
    const limit = Math.max(5, Math.min(Number(params.limit || 20), 30));
    const items = filterProjects(snapshot, { sort: "opportunity", limit: "all" }, sourceProjects)
      .slice(0, limit)
      .map((project, index) => ({
        ...project,
        rank: index + 1,
        leaderboardScore: Number(project.scores?.opportunity || 0),
        rankChange: null,
        scoreParts: { memoryBoost: 0 }
      }));
    return {
      period: params.period || "daily",
      date: new Date().toISOString().slice(0, 10),
      generatedAt: nowIso(),
      limit,
      memory: activePlan(snapshot).memory || snapshot.store.memory || defaultMemory(),
      observationPlan: publicPlan(activePlan(snapshot), snapshot.activeObservationPlanId, false),
      items,
      archiveDates: Object.keys(snapshot.store.leaderboards?.daily || {}).sort().reverse()
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

  async function githubFetch(path, options = {}) {
    const secrets = await getSecrets();
    const response = await fetch(`https://api.github.com${path}`, {
      ...options,
      headers: { ...githubHeaders(secrets.githubToken), ...(options.headers || {}) }
    });
    const text = await response.text();
    const json = text ? JSON.parse(text) : {};
    if (!response.ok) {
      throw new Error(json.message || `GitHub request failed ${response.status}`);
    }
    return json;
  }

  function githubRepoToProject(repo, planId, profile = {}) {
    const pushedDays = Math.max(0, Math.floor((Date.now() - new Date(repo.pushed_at || repo.updated_at || Date.now()).getTime()) / 86400000));
    const starScore = Math.min(45, Math.log10(Math.max(1, Number(repo.stargazers_count || 0))) * 16);
    const momentum = Math.max(8, Math.min(100, 100 - pushedDays));
    const opportunity = Math.round(Math.max(10, Math.min(100, starScore + momentum * 0.35 + Math.min(20, Number(repo.forks_count || 0) / 20))));
    const licenseBucket = repo.license?.spdx_id && repo.license.spdx_id !== "NOASSERTION" ? "permissive-commercial" : "unknown-no-license";
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
      category: { key: "discovered-project", label: "Discovered Projects", labelZh: "扫描发现项目", labelEn: "Discovered Projects" },
      useCase: { key: "github-discovery", label: "GitHub discovery", labelZh: "GitHub 项目发现", labelEn: "GitHub discovery" },
      licensePolicy: { bucket: licenseBucket, label: repo.license?.spdx_id || "Unknown", labelZh: repo.license?.spdx_id || "未知许可", labelEn: repo.license?.spdx_id || "Unknown" },
      scores: { opportunity, momentum, quality: repo.archived ? 20 : 55, community: Math.min(100, Math.round(starScore * 2)), productization: 50, novelty: 50, risk: repo.archived ? 45 : 10, licenseRisk: licenseBucket === "unknown-no-license" ? 28 : 8, overallRisk: repo.archived ? 45 : 14, actionability: repo.archived ? 25 : 58 },
      signals: {},
      reasons: ["Browser IndexedDB scan result"],
      actions: [],
      source: "github-browser",
      firstSeenAt: nowIso(),
      lastSeenAt: nowIso(),
      updatedInMonitorAt: nowIso(),
      profileKey: profile.key || "",
      profileLabel: profile.label || "",
      observationPlanMatches: {
        [planId]: {
          planId,
          firstSeenAt: nowIso(),
          lastSeenAt: nowIso(),
          profileKey: profile.key || "",
          profileLabel: profile.label || ""
        }
      }
    };
  }

  function scanProfiles(plan) {
    const logic = plan.searchLogic || plan.strategy || {};
    const profiles = [];
    for (const [index, item] of (logic.customQueries || []).entries()) {
      const query = item.query || item.q;
      if (!query) continue;
      profiles.push({
        key: String(item.key || `local-${plan.id}-${index + 1}`),
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

  async function runBrowserScan(snapshot, requestedPlanId = "") {
    const planId = String(requestedPlanId || snapshot.activeObservationPlanId || "default");
    const plan = snapshot.store.observationPlans?.[planId];
    if (!plan) throw new Error("扫描任务对应的观察方案已不存在。");
    const profiles = scanProfiles(plan);
    if (!profiles.length) throw new Error("当前观察方案没有可执行的检索逻辑。");
    const seen = new Map();
    const errors = [];
    for (const profile of profiles) {
      try {
        const params = new URLSearchParams({ q: profile.query, sort: "stars", order: "desc", per_page: String(profile.perPage), page: "1" });
        const result = await githubFetch(`/search/repositories?${params.toString()}`);
        for (const repo of result.items || []) {
          if (!seen.has(repo.full_name)) seen.set(repo.full_name, githubRepoToProject(repo, plan.id, profile));
        }
      } catch (error) {
        errors.push(error.message);
      }
    }
    if (!seen.size && errors.length) throw new Error(errors[0]);
    await storage().replaceProjectsForPlan(plan.id, Array.from(seen.values()));
    const scan = {
      id: `browser-scan-${Date.now()}`,
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
    snapshot.store.scans = [scan, ...(snapshot.store.scans || [])].slice(0, 120);
    const planProjects = await projectsForActivePlan(snapshot);
    snapshot.counts = { ...(snapshot.counts || {}), projects: await storage().countProjects() };
    snapshot.summary = summary(snapshot, {}, planProjects);
    snapshot.leaderboard = buildLeaderboard(snapshot, { limit: 20 }, planProjects);
    updateCounts(snapshot);
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
      throw new Error(payload?.error?.message || payload?.message || `模型接口请求失败 ${response.status}`);
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

  function normalizeBrowserPlan(plan = {}, fallback = {}) {
    const name = fallback.name || plan.name || "自定义观察";
    const logic = plan.searchLogic || plan.strategy || {};
    const customQueries = Array.isArray(logic.customQueries) ? logic.customQueries : [];
    return {
      id: plan.id || `plan-${Date.now()}`,
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

  function browserPlanGenerationPrompt(name, idea, repair = null) {
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
      "每条 customQuery 都会直接执行，必须包含 in:name,description,readme archived:false mirror:false，不使用 OR 串；重要别名拆成独立查询。",
      "excludeTerms 通常可以为空，只在存在明确歧义、低价值仓库类型或反复假阳性时添加。不要罗列任意无关词。",
      "customQueries 最多 30 条，不足 30 条不要硬凑。成熟领域应覆盖主要仓库形态，小众领域放宽 Star 和更新时间限制，但始终保留核心锚点。",
      "searchLogic 与 strategy 必须同形；若只返回一个，系统会自动复制。",
      repair ? `上次结果没有通过质量门禁：${repair.issues.join("；")}。请修复，不要降低相关性。上次输出：${repair.raw.slice(0, 2400)}` : "",
      `JSON 结构：${JSON.stringify(schema)}`,
      `方案名称：${name}`,
      `详细需求：${idea}`
    ]
      .filter(Boolean)
      .join("\n");
  }

  function browserPlanQualityIssues(plan = {}, expectedName = "") {
    const logic = plan.searchLogic || plan.strategy || {};
    const keywords = Array.isArray(logic.keywords) ? logic.keywords.map((item) => String(item || "").trim()).filter(Boolean) : [];
    const queries = Array.isArray(logic.customQueries) ? logic.customQueries.filter((item) => String(item?.query || item?.q || "").trim()) : [];
    const issues = [];
    if (String(plan.name || "").trim() !== String(expectedName || "").trim()) issues.push("方案名没有原样保留");
    if (keywords.length < 8) issues.push(`keywords 过少：${keywords.length}/8`);
    if (queries.length < 6) issues.push(`customQueries 过少：${queries.length}/6`);
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
    return issues;
  }

  async function generatePlanWithModel(snapshot, body = {}) {
    const name = String(body.name || "").trim();
    const idea = [body.idea, body.detailedNeed].map((item) => String(item || "").trim()).filter(Boolean).join("\n");
    if (!name || !idea) throw new Error("方案名称和详细需求不能为空");
    const first = await callModelJson(snapshot, [{ role: "user", content: browserPlanGenerationPrompt(name, idea) }]);
    let raw = first.raw;
    let plan = normalizeBrowserPlan(first.json, { name, idea });
    let issues = browserPlanQualityIssues(plan, name);
    if (issues.length) {
      const repaired = await callModelJson(snapshot, [
        { role: "user", content: browserPlanGenerationPrompt(name, idea, { issues, raw }) }
      ]);
      raw = repaired.raw;
      plan = normalizeBrowserPlan(repaired.json, { name, idea });
      issues = browserPlanQualityIssues(plan, name);
    }
    if (issues.length) throw new Error(`AI 生成方案未通过质量门禁：${issues.slice(0, 3).join("；")}`);
    return { ok: true, source: "ai-browser", raw, plan };
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
      return { status: "completed", scan: await runBrowserScan(snapshot, task.input?.observationPlanId) };
    }
    if (task.type === "analysis") return analyzeProjectWithModel(snapshot, task.input, await projectForKey(snapshot, task.input.fullName));
    if (task.type === "plan-generation") return generatePlanWithModel(snapshot, task.input);
    throw new Error(`Unsupported task type: ${task.type}`);
  }

  function startLocalTask(snapshot, task) {
    if (!task?.id || localTaskPromises.has(task.id)) return;
    if (Number(task.attempts || 0) >= 3) {
      task.status = "failed";
      task.error = "Task was interrupted too many times";
      task.finishedAt = nowIso();
      task.updatedAt = task.finishedAt;
      saveSnapshot(snapshot).catch(() => {});
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
        task.finishedAt = nowIso();
        task.updatedAt = task.finishedAt;
        await saveSnapshot(snapshot);
      })
      .catch(async (error) => {
        task.status = "failed";
        task.result = null;
        task.error = error?.message || "Task failed";
        task.finishedAt = nowIso();
        task.updatedAt = task.finishedAt;
        await saveSnapshot(snapshot).catch(() => {});
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
    if (override !== undefined && Number.isFinite(Number(override))) return Number(override);
    return MEMORY_EVENT_WEIGHTS[eventType] ?? 0.5;
  }

  function projectProfile(project = {}, planId = "") {
    const matches = project.observationPlanMatches || project.observationMatches || {};
    let match = null;
    if (Array.isArray(matches)) {
      match = matches.find((item) => typeof item === "object" && String(item?.planId || item?.id || "") === planId) || null;
    } else {
      match = matches?.[planId] || null;
    }
    return {
      key: String(match?.profileKey || project.profileKey || ""),
      label: String(match?.profileLabel || project.profileLabel || "")
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
    if (profile.key) adjustLocalBucket(memory.discoveryProfiles, profile.key, signed, -40, 40);
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
    adjustLocalMemorySignal(memory, project, planId, Number(event.weight || localEventWeight(type)), type, -1);
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
      return { port: "", host: location.host, githubConfigured: Boolean(secrets.githubToken), tavilyConfigured: Boolean(secrets.tavilyKey), exaConfigured: Boolean(secrets.exaKey), scanHour: 8, scanMaxRepos: 800, githubSearchPages: 2, githubTrendLimit: 80, githubTrendingMaxRepos: 60, githubTrendingPerPeriod: 25 };
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
      return settingsResponse(snapshot, nextSecrets);
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
      const plan = { ...(body.plan || body), id: (body.plan || body).id || `plan-${Date.now()}`, builtIn: false, active: false, updatedAt: nowIso(), createdAt: (body.plan || body).createdAt || nowIso(), memory: (body.plan || body).memory || defaultMemory(), userData: (body.plan || body).userData || defaultUserData() };
      snapshot.store.observationPlans[plan.id] = plan;
      updateCounts(snapshot);
      await saveSnapshot(snapshot);
      return { plan: publicPlan(plan, activeId, true), plans: Object.values(snapshot.store.observationPlans).map((item) => publicPlan(item, activeId, false)) };
    }
    if (method === "POST" && url.pathname === "/api/observation-plans/delete") {
      if (body.id === "default") throw new Error("Default observation plan cannot be deleted");
      delete snapshot.store.observationPlans[body.id];
      if (snapshot.activeObservationPlanId === body.id) snapshot.activeObservationPlanId = "default";
      snapshot.settings.activeObservationPlanId = snapshot.activeObservationPlanId;
      updateCounts(snapshot);
      await saveSnapshot(snapshot);
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
      const projects = await projectsForActivePlan(snapshot);
      return buildLeaderboard(snapshot, params, projects);
    }
    if (method === "GET" && url.pathname === "/api/leaderboard-archives") return { dates: Object.keys(snapshot.store.leaderboards?.daily || {}).sort().reverse() };
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
      const memory = activePlan(snapshot).memory || defaultMemory();
      memory.harness = { ...(memory.harness || {}), mode: "local-indexeddb", lastEvaluatedAt: nowIso(), recommendations: [] };
      if (url.pathname.endsWith("/tune")) memory.harness.lastTunedAt = nowIso();
      activePlan(snapshot).memory = memory;
      snapshot.store.memory = memory;
      await saveSnapshot(snapshot);
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
    if (method === "GET" && url.pathname === "/api/portable-data/export") return portableData(snapshot);
    if (method === "POST" && url.pathname === "/api/portable-data/import") return importPortableData(snapshot, body);
    if (method === "POST" && url.pathname === "/api/provider-test") {
      await callModelJson(snapshot, [
        { role: "system", content: "Return JSON only." },
        { role: "user", content: "{\"ok\":true}" }
      ]);
      return { ok: true };
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
    localModeForced
  };
})();
