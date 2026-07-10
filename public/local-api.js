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

  function localModeForced() {
    try {
      return window.localStorage.getItem(STORAGE_MODE_KEY) === "indexeddb";
    } catch {
      return false;
    }
  }

  async function getSnapshot() {
    const db = storage();
    return db?.getSnapshot ? db.getSnapshot() : null;
  }

  async function saveSnapshot(snapshot) {
    const db = storage();
    if (!db?.putSnapshot) throw new Error("IndexedDB is unavailable");
    ensureDefaultObservationPlan(snapshot);
    snapshot.exportedAt = nowIso();
    snapshot.store = snapshot.store || {};
    snapshot.store.updatedAt = nowIso();
    return db.putSnapshot(snapshot);
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
      strategy: { baseMode: "only", keywords: [], excludeTerms: [], customQueries: [], minStars: 0 },
      searchLogic: { baseMode: "only", keywords: [], excludeTerms: [], customQueries: [], minStars: 0 },
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
    plan.updatedAt = plan.updatedAt || timestamp;
    return plan;
  }

  async function requireSnapshot() {
    const snapshot = (await getSnapshot()) || emptySnapshot();
    snapshot.store = snapshot.store || {};
    snapshot.store.projects = snapshot.store.projects || {};
    snapshot.store.scans = Array.isArray(snapshot.store.scans) ? snapshot.store.scans : [];
    snapshot.store.leaderboards = snapshot.store.leaderboards || { daily: {} };
    snapshot.store.observationPlans = snapshot.store.observationPlans || {};
    ensureDefaultObservationPlan(snapshot);
    snapshot.activeObservationPlanId = snapshot.activeObservationPlanId || snapshot.settings?.activeObservationPlanId || "default";
    snapshot.settings = { ...defaultSettings(), ...(snapshot.settings || {}), activeObservationPlanId: snapshot.activeObservationPlanId };
    const active = activePlan(snapshot);
    snapshot.store.memory = active.memory || snapshot.store.memory || defaultMemory();
    snapshot.counts = {
      projects: Object.keys(snapshot.store.projects || {}).length,
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

  function activePlan(snapshot) {
    const plans = snapshot.store?.observationPlans || {};
    const id = snapshot.activeObservationPlanId || snapshot.settings?.activeObservationPlanId || "default";
    return plans[id] || plans.default || Object.values(plans)[0] || emptySnapshot().store.observationPlans.default;
  }

  function activeUserData(snapshot) {
    const plan = activePlan(snapshot);
    plan.userData = { ...defaultUserData(), ...(plan.userData || {}) };
    return plan.userData;
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

  function withUserState(project, snapshot) {
    const key = projectKey(project.fullName);
    const userData = activeUserData(snapshot);
    const note = userData.notes?.[key] || {};
    return {
      ...project,
      watched: Boolean(userData.watchlist?.[key]),
      note: note.text || project.note || "",
      triageStatus: note.status || project.triageStatus || "",
      noteUpdatedAt: note.updatedAt || project.noteUpdatedAt || "",
      analysis: userData.analysis?.[key] || project.analysis || null,
      dismissed: Boolean(userData.dismissedProjects?.[key]),
      githubAction: userData.githubActions?.[key] || project.githubAction || null
    };
  }

  function projectMatchesPlan(project, snapshot) {
    const plan = activePlan(snapshot);
    if (!plan || plan.id === "default") return true;
    const matches = project.observationPlanMatches || project.observationMatches || [];
    if (Array.isArray(matches) && matches.some((item) => item === plan.id || item?.id === plan.id || item?.planId === plan.id)) return true;
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

  function filterProjects(snapshot, params = {}) {
    let items = Object.values(snapshot.store.projects || {})
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
    snapshot.counts = {
      projects: Object.keys(snapshot.store.projects || {}).length,
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

  function summary(snapshot, params = {}) {
    const items = filterProjects(snapshot, { ...params, limit: "all" });
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
      totalProjects: Object.keys(snapshot.store.projects || {}).length,
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

  function buildLeaderboard(snapshot, params = {}) {
    const limit = Math.max(5, Math.min(Number(params.limit || 20), 30));
    const items = filterProjects(snapshot, { sort: "opportunity", limit: "all" })
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

  function githubRepoToProject(repo, planId) {
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
      observationPlanMatches: [planId]
    };
  }

  function scanQueries(plan) {
    const logic = plan.searchLogic || plan.strategy || {};
    const queries = [];
    for (const item of logic.customQueries || []) {
      const query = item.query || item.q;
      if (query) queries.push(query);
    }
    for (const keyword of logic.keywords || []) {
      if (keyword && queries.length < 30) queries.push(`${keyword} in:name,description,readme archived:false`);
    }
    return [...new Set(queries.map((item) => String(item).trim()).filter(Boolean))].slice(0, 30);
  }

  async function runBrowserScan(snapshot) {
    const plan = activePlan(snapshot);
    const queries = scanQueries(plan);
    if (!queries.length) throw new Error("当前观察方案没有可执行的检索逻辑。");
    const seen = new Map();
    const errors = [];
    for (const query of queries) {
      try {
        const params = new URLSearchParams({ q: query, sort: "stars", order: "desc", per_page: "30", page: "1" });
        const result = await githubFetch(`/search/repositories?${params.toString()}`);
        for (const repo of result.items || []) {
          if (!seen.has(repo.full_name)) seen.set(repo.full_name, githubRepoToProject(repo, plan.id));
        }
      } catch (error) {
        errors.push(error.message);
      }
    }
    if (!seen.size && errors.length) throw new Error(errors[0]);
    for (const project of seen.values()) {
      const key = projectKey(project.fullName);
      snapshot.store.projects[key] = { ...(snapshot.store.projects[key] || {}), ...project, firstSeenAt: snapshot.store.projects[key]?.firstSeenAt || project.firstSeenAt, lastSeenAt: nowIso() };
    }
    const scan = {
      id: `browser-scan-${Date.now()}`,
      at: nowIso(),
      status: errors.length ? "completed-with-errors" : "completed",
      mode: "browser-indexeddb",
      observationPlanId: plan.id,
      observationPlanName: plan.name,
      received: seen.size,
      insertedOrUpdated: seen.size,
      errors
    };
    snapshot.store.scans = [scan, ...(snapshot.store.scans || [])].slice(0, 120);
    snapshot.summary = summary(snapshot);
    snapshot.leaderboard = buildLeaderboard(snapshot, { limit: 20 });
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
    const base = String(provider.baseUrl || DEFAULT_PROVIDER.baseUrl).replace(/\/+$/, "");
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

  async function analyzeProjectWithModel(snapshot, body = {}) {
    const key = projectKey(body.fullName);
    const project = withUserState(snapshot.store.projects[key], snapshot);
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
    activeUserData(snapshot).analysis[key] = analysis;
    await saveSnapshot(snapshot);
    return { provider: analysis.provider, model: analysis.model, analysis, project: withUserState(snapshot.store.projects[key], snapshot) };
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

  async function generatePlanWithModel(snapshot, body = {}) {
    const name = String(body.name || "").trim();
    const idea = [body.idea, body.detailedNeed].map((item) => String(item || "").trim()).filter(Boolean).join("\n");
    if (!name || !idea) throw new Error("方案名称和详细需求不能为空");
    const { json, raw } = await callModelJson(snapshot, [
      {
        role: "system",
        content:
          "你是星仓印记的 GitHub 检索方案生成器。只返回 JSON。必须基于用户方案名称和详细需求生成强相关 GitHub 检索逻辑，不要混入无关领域。customQueries 不超过 30 条，不足 30 条不要硬凑。字段必须包含 name,nameEn,description,descriptionEn,requirements,searchLogic。searchLogic 包含 keywords,excludeTerms,customQueries,minStars。customQueries 每项包含 label,labelZh,labelEn,query,stars。"
      },
      {
        role: "user",
        content: JSON.stringify({
          name,
          detailedNeed: idea,
          rules: [
            "先识别最核心关键词、同义词、产品名、格式、框架、生态工具和常见英文表达",
            "关键词必须强相关，不能把上一个方案或无关领域混入",
            "排除词只用于明确歧义，不要罗列无关世界词",
            "query 必须是 GitHub Search 可执行语法"
          ]
        })
      }
    ]);
    const plan = normalizeBrowserPlan(json, { name, idea });
    if (!plan.searchLogic.customQueries.length && !plan.searchLogic.keywords.length) {
      throw new Error("AI 生成方案未返回可执行 GitHub 检索逻辑，请补充需求后重试");
    }
    return { ok: true, source: "ai-browser", raw, plan };
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

  async function handle(path, options = {}) {
    const url = new URL(path, window.location.origin);
    const params = Object.fromEntries(url.searchParams.entries());
    const method = String(options.method || "GET").toUpperCase();
    const body = options.body ? JSON.parse(options.body) : {};
    const snapshot = await requireSnapshot();
    const secrets = await getSecrets();
    const userData = activeUserData(snapshot);
    const activeId = snapshot.activeObservationPlanId || "default";

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
    if (method === "GET" && url.pathname === "/api/projects") return paginate(filterProjects(snapshot, params), params, 10);
    if (method === "GET" && url.pathname === "/api/project") {
      const project = withUserState(snapshot.store.projects[projectKey(url.searchParams.get("fullName"))], snapshot);
      if (!project?.fullName) throw new Error("Project not found");
      return project;
    }
    if (method === "GET" && url.pathname === "/api/projects/position") {
      const fullName = url.searchParams.get("fullName");
      const items = filterProjects(snapshot, { ...params, limit: "all" });
      const index = items.findIndex((project) => projectKey(project.fullName) === projectKey(fullName));
      const pageSize = Math.max(1, Number(params.pageSize || params.limit || 10));
      return { found: index >= 0, index, page: index >= 0 ? Math.floor(index / pageSize) + 1 : null, pageSize, total: items.length };
    }
    if (method === "GET" && url.pathname === "/api/summary") return summary(snapshot, params);
    if (method === "GET" && url.pathname === "/api/leaderboard") return snapshot.leaderboard || buildLeaderboard(snapshot, params);
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
      const items = Object.keys(userData.dismissedProjects || {}).map((key) => withUserState(snapshot.store.projects[key], snapshot)).filter((item) => item?.fullName);
      return { items };
    }
    if (method === "POST" && url.pathname === "/api/watchlist") {
      const key = projectKey(body.fullName);
      if (body.watched) userData.watchlist[key] = { fullName: body.fullName, at: nowIso() };
      else delete userData.watchlist[key];
      await saveSnapshot(snapshot);
      return { project: withUserState(snapshot.store.projects[key], snapshot), memory: activePlan(snapshot).memory || defaultMemory() };
    }
    if (method === "POST" && url.pathname === "/api/project-dismissal") {
      const key = projectKey(body.fullName);
      if (body.dismissed !== false) userData.dismissedProjects[key] = { fullName: body.fullName, at: nowIso() };
      else delete userData.dismissedProjects[key];
      await saveSnapshot(snapshot);
      return { project: withUserState(snapshot.store.projects[key], snapshot), memory: activePlan(snapshot).memory || defaultMemory() };
    }
    if (method === "POST" && url.pathname === "/api/dismissed-project-feedback") {
      const key = projectKey(body.fullName);
      userData.dismissedProjects[key] = {
        ...(userData.dismissedProjects[key] || { fullName: body.fullName, at: nowIso() }),
        feedback: body.feedback || {},
        updatedAt: nowIso()
      };
      await saveSnapshot(snapshot);
      return {
        project: withUserState(snapshot.store.projects[key], snapshot),
        items: Object.keys(userData.dismissedProjects || {}).map((itemKey) => withUserState(snapshot.store.projects[itemKey], snapshot)).filter((item) => item?.fullName)
      };
    }
    if (method === "POST" && url.pathname === "/api/note") {
      const key = projectKey(body.fullName);
      userData.notes[key] = { text: String(body.text || "").slice(0, 4000), status: String(body.status || ""), updatedAt: nowIso() };
      await saveSnapshot(snapshot);
      return withUserState(snapshot.store.projects[key], snapshot);
    }
    if (method === "POST" && url.pathname === "/api/memory-event") {
      const memory = activePlan(snapshot).memory || defaultMemory();
      const entry = { fullName: body.fullName, type: body.type || "select_project", at: nowIso(), source: body.source || "indexeddb" };
      memory.events = [entry, ...(memory.events || [])].slice(0, Number(memory.context?.rawEventLimit || 300));
      memory.shortTerm = [entry, ...(memory.shortTerm || [])].slice(0, Number(memory.context?.shortTermLimit || 80));
      activePlan(snapshot).memory = memory;
      snapshot.store.memory = memory;
      await saveSnapshot(snapshot);
      return { memory };
    }
    if (method === "POST" && url.pathname === "/api/leaderboard-feedback") {
      const memory = activePlan(snapshot).memory || defaultMemory();
      const entry = { fullName: body.fullName, type: `leaderboard-${body.feedback || "positive"}`, at: nowIso(), source: "indexeddb" };
      memory.events = [entry, ...(memory.events || [])].slice(0, Number(memory.context?.rawEventLimit || 300));
      activePlan(snapshot).memory = memory;
      snapshot.store.memory = memory;
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
      userData.githubActions[key] = { ...(userData.githubActions[key] || {}), starred, updatedAt: nowIso() };
      await saveSnapshot(snapshot);
      return { action: userData.githubActions[key], project: withUserState(snapshot.store.projects[key], snapshot), memory: activePlan(snapshot).memory || defaultMemory() };
    }
    if (method === "POST" && url.pathname === "/api/github/fork") {
      const key = projectKey(body.fullName);
      const [owner, repo] = String(body.fullName || "").split("/");
      const fork = await githubFetch(`/repos/${owner}/${repo}/forks`, { method: "POST" });
      userData.githubActions[key] = { ...(userData.githubActions[key] || {}), forked: true, forkUrl: fork.html_url || "", updatedAt: nowIso() };
      await saveSnapshot(snapshot);
      return { action: userData.githubActions[key], project: withUserState(snapshot.store.projects[key], snapshot), memory: activePlan(snapshot).memory || defaultMemory() };
    }
    if (method === "POST" && url.pathname === "/api/scan") {
      const scan = await runBrowserScan(snapshot);
      return { status: "completed", scan };
    }
    if (method === "POST" && url.pathname === "/api/analyze") {
      return analyzeProjectWithModel(snapshot, body);
    }
    if (method === "POST" && url.pathname === "/api/observation-plans/generate") {
      return generatePlanWithModel(snapshot, body);
    }
    if (method === "GET" && url.pathname === "/api/scan/status") {
      const lastScan = snapshot.store.scans?.[0] || null;
      return { status: lastScan ? "completed" : "idle", stage: lastScan ? "completed" : "idle", label: lastScan ? "完成" : "空闲", percent: lastScan ? 100 : 0, running: false, updatedAt: lastScan?.at || null };
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
