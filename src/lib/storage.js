const fs = require("node:fs");
const path = require("node:path");
const { classifyRepository, inferUseCase } = require("./scoring");
const { isNxCadRepository } = require("./domain-relevance");
const { buildQueryProfiles } = require("./github");

// Passive browsing must stay weak; explicit actions carry the learning signal.
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

const DISMISSED_REASON_VERSION = 2;

function emptyPreferenceRoot() {
  return {
    categories: {},
    useCases: {},
    languages: {},
    licenses: {},
    riskLevels: {}
  };
}

function emptyNegativePreferenceRoot() {
  return {
    ...emptyPreferenceRoot(),
    repositories: {}
  };
}

function defaultProviders() {
  return [
    {
      id: "deepseek",
      name: "DeepSeek",
      region: "china",
      protocol: "openai-compatible",
      baseUrl: "https://api.deepseek.com",
      model: "deepseek-v4-flash",
      apiKey: "",
      enabled: false,
      models: []
    }
  ];
}

function defaultMemory() {
  return {
    shortTerm: [],
    events: [],
    preferences: emptyPreferenceRoot(),
    negativePreferences: emptyNegativePreferenceRoot(),
    manualPreferences: emptyPreferenceRoot(),
    manualNegativePreferences: emptyNegativePreferenceRoot(),
    antiBubble: {
      explorationRatio: 0.25,
      diversityFloor: 0.35,
      noveltyRatio: 0.2
    },
    stats: {
      eventCounts: {}
    },
    context: {
      rawEventLimit: 300,
      shortTermLimit: 80,
      compactAfterEvents: 180,
      keepRecentEvents: 120,
      compressedAt: "",
      sourceEventCount: 0,
      summaryZh: "",
      summaryEn: "",
      permanentFacts: [],
      preferenceEvidence: [],
      dismissedReasonCorrections: [],
      openQuestions: [],
      safetyRules: [
        "只压缩行为与偏好信号，不写入 API Key、Token 或原始密钥。",
        "手动压缩会将当前近期行为转为长期摘要，新行为从空列表重新记录。",
        "压缩摘要只作为推荐辅助，不覆盖用户手动编辑的偏好。"
      ],
      chunks: []
    },
    harness: {
      policyVersion: "memory-harness-v1",
      mode: "local-rules",
      lastEvaluatedAt: "",
      lastTunedAt: "",
      scorecard: null,
      recommendations: [],
      runs: [],
      lastTuning: null
    }
  };
}

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

function defaultObservationPlan(memory = defaultMemory()) {
  const now = new Date().toISOString();
  return {
    id: "default",
    name: "默认观察",
    nameEn: "Default observation",
    description: "通用开源机会观察，适合日常发现值得学习、理解与持续跟踪的 GitHub 项目。",
    descriptionEn: "General open-source opportunity observation for everyday discovery.",
    createdAt: now,
    updatedAt: now,
    builtIn: true,
    strategy: {
      baseMode: "default",
      keywords: [],
      excludeTerms: [],
      customQueries: [],
      minStars: 20
    },
    requirements: DEFAULT_OBSERVATION_REQUIREMENTS,
    userData: {
      watchlist: {},
      githubActions: {},
      notes: {},
      analysis: {},
      dismissedProjects: {}
    },
    memory
  };
}

function emptyStore() {
  const memory = defaultMemory();
  const defaultPlan = defaultObservationPlan(memory);
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    projects: {},
    scans: [],
    leaderboards: {
      daily: {}
    },
    watchlist: {},
    githubActions: {},
    notes: {},
    analysis: {},
    memory,
    observationPlans: {
      [defaultPlan.id]: defaultPlan
    },
    settings: {
      language: "zh",
      dailyBriefSize: 120,
      defaultSort: "opportunity",
      activeObservationPlanId: "default",
      activeProvider: "deepseek",
      githubToken: "",
      tavilyKey: "",
      exaKey: "",
      providerCatalog: {
        updatedAt: "",
        endpoints: []
      },
      llmProviders: defaultProviders()
    }
  };
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readStore(filePath) {
  ensureDir(filePath);
  if (!fs.existsSync(filePath)) {
    return emptyStore();
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const defaults = emptyStore();
    const observationPlans = normalizeObservationPlans(parsed.observationPlans, parsed.memory, defaults.observationPlans);
    const merged = {
      ...defaults,
      ...parsed,
      leaderboards: normalizeLeaderboards(parsed.leaderboards, defaults.leaderboards),
      githubActions: {
        ...defaults.githubActions,
        ...(parsed.githubActions || {})
      },
      analysis: {
        ...defaults.analysis,
        ...(parsed.analysis || {})
      },
      memory: normalizeMemory(parsed.memory, defaults.memory),
      observationPlans,
      settings: {
        ...defaults.settings,
        ...(parsed.settings || {}),
        providerCatalog: {
          ...defaults.settings.providerCatalog,
          ...(parsed.settings?.providerCatalog || {})
        },
        activeObservationPlanId: normalizeActiveObservationPlanId(parsed.settings?.activeObservationPlanId, observationPlans),
        llmProviders: mergeProviders(defaults.settings.llmProviders, parsed.settings?.llmProviders || [])
      }
    };
    const activePlan = merged.observationPlans[merged.settings.activeObservationPlanId] || merged.observationPlans.default;
    merged.settings.activeObservationPlanId = activePlan.id;
    if (!hasPlanUserData(merged.observationPlans.default?.userData)) {
      merged.observationPlans.default = {
        ...merged.observationPlans.default,
        userData: normalizePlanUserData({
          watchlist: merged.watchlist,
          githubActions: merged.githubActions,
          notes: merged.notes,
          analysis: merged.analysis
        })
      };
    }
    merged.memory = normalizeMemory(activePlan.memory || merged.memory, defaults.memory);
    merged.observationPlans[activePlan.id] = {
      ...activePlan,
      userData: normalizePlanUserData(activePlan.userData || {}),
      memory: merged.memory
    };
    return merged;
  } catch (error) {
    const backupPath = `${filePath}.corrupt-${Date.now()}`;
    fs.copyFileSync(filePath, backupPath);
    return {
      ...emptyStore(),
      warnings: [`Store was corrupt and backed up to ${path.basename(backupPath)}.`]
    };
  }
}

function normalizeLeaderboards(saved = {}, defaults = { daily: {} }) {
  const byPlan = {
    ...(defaults.byPlan || {}),
    ...(saved?.byPlan || {})
  };
  for (const [planId, archive] of Object.entries(byPlan)) {
    byPlan[planId] = {
      ...(archive || {}),
      daily: {
        ...(archive?.daily || {})
      }
    };
  }
  return {
    ...defaults,
    ...(saved || {}),
    daily: {
      ...(defaults.daily || {}),
      ...(saved?.daily || {})
    },
    byPlan
  };
}

function normalizeActiveObservationPlanId(activeId, plans) {
  const id = String(activeId || "default").trim() || "default";
  return plans?.[id] ? id : "default";
}

function normalizeObservationPlanId(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function normalizePlanUserData(data = {}) {
  return {
    watchlist: plainObject(data.watchlist),
    githubActions: plainObject(data.githubActions),
    notes: plainObject(data.notes),
    analysis: plainObject(data.analysis),
    dismissedProjects: plainObject(data.dismissedProjects)
  };
}

function normalizeDismissedFeedback(feedback = {}) {
  const clean = (value, limit = 80) => String(value || "").trim().slice(0, limit);
  const reason = clean(feedback.reason || feedback.note, 240);
  return {
    problem: clean(feedback.problem),
    audience: clean(feedback.audience),
    shape: clean(feedback.shape),
    note: clean(feedback.note || feedback.reason, 240),
    reason
  };
}

function compactLabelPair(labelZh, labelEn) {
  return {
    labelZh: String(labelZh || labelEn || "").trim(),
    labelEn: String(labelEn || labelZh || "").trim()
  };
}

function normalizeObservationRequirements(requirements = []) {
  const source = Array.isArray(requirements) ? requirements : String(requirements || "").split(/\n+/);
  const now = new Date().toISOString();
  const seen = new Set();
  return source
    .map((item, index) => {
      const text = typeof item === "string" ? item : item?.text;
      const normalizedText = String(text || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 600);
      if (!normalizedText) return null;
      const key = normalizedText.toLowerCase();
      if (seen.has(key)) return null;
      seen.add(key);
      return {
        id: normalizeObservationPlanId(item?.id || normalizedText.slice(0, 40)) || `req-${Date.now()}-${index}`,
        text: normalizedText,
        createdAt: item?.createdAt || now,
        updatedAt: item?.updatedAt || now
      };
    })
    .filter(Boolean)
    .slice(0, 30);
}

function hasPlanUserData(data = {}) {
  const normalized = normalizePlanUserData(data);
  return Object.values(normalized).some((bucket) => Object.keys(bucket).length > 0);
}

const DEFAULT_OBSERVATION_PROFILE_COUNT = 55;
const MAX_OBSERVATION_CUSTOM_QUERIES = 30;

function observationExecutionProfileCount(strategy = {}) {
  const customCount = Array.isArray(strategy.customQueries) ? strategy.customQueries.length : 0;
  const mode = strategy.baseMode || "focused";
  if (mode === "only") return customCount;
  if (mode === "blend") return customCount + DEFAULT_OBSERVATION_PROFILE_COUNT;
  return customCount + Math.min(10, DEFAULT_OBSERVATION_PROFILE_COUNT);
}

function normalizeObservationPlan(plan = {}, fallbackMemory = defaultMemory()) {
  const now = new Date().toISOString();
  const id = normalizeObservationPlanId(plan.id) || `plan-${Date.now()}`;
  const builtIn = id === "default" || Boolean(plan.builtIn);
  const defaults = id === "default" ? defaultObservationPlan(fallbackMemory) : {};
  const requirementSource = id === "default" ? defaults.requirements || [] : plan.requirements || defaults.requirements || [];
  return {
    ...defaults,
    ...plan,
    id,
    builtIn,
    name: String(plan.name || defaults.name || "观察方案").trim().slice(0, 80),
    nameEn: String(plan.nameEn || defaults.nameEn || plan.name || "Observation plan").trim().slice(0, 100),
    description: String(plan.description || defaults.description || "").trim().slice(0, 600),
    descriptionEn: String(plan.descriptionEn || defaults.descriptionEn || "").trim().slice(0, 800),
    createdAt: plan.createdAt || now,
    updatedAt: plan.updatedAt || now,
    requirements: normalizeObservationRequirements(requirementSource),
    strategy: normalizeObservationStrategy(plan.searchLogic || plan.strategy || defaults.strategy || {}),
    searchLogic: normalizeObservationStrategy(plan.searchLogic || plan.strategy || defaults.strategy || {}),
    userData: normalizePlanUserData(plan.userData || defaults.userData || {}),
    memory: normalizeMemory(plan.memory || fallbackMemory)
  };
}

function normalizeObservationStrategy(strategy = {}) {
  const stringList = (value, limit = 40) =>
    (Array.isArray(value) ? value : String(value || "").split(/[,，;\n]/))
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .slice(0, limit);
  const customQueries = Array.isArray(strategy.customQueries)
    ? strategy.customQueries
        .map((item) => {
          if (typeof item === "string") {
            return { label: item.slice(0, 80), query: item.slice(0, 240) };
          }
          return {
            label: String(item?.label || item?.name || item?.query || "").slice(0, 80),
            labelEn: String(item?.labelEn || item?.label || item?.name || "").slice(0, 80),
            labelZh: String(item?.labelZh || item?.label || item?.name || "").slice(0, 80),
            query: String(item?.query || item?.q || "").slice(0, 640),
            stars: Number.isFinite(Number(item?.stars)) ? Number(item.stars) : undefined
          };
        })
        .filter((item) => item.query)
        .slice(0, MAX_OBSERVATION_CUSTOM_QUERIES)
    : [];
  const baseMode = ["focused", "blend", "only", "default"].includes(strategy.baseMode) ? strategy.baseMode : "focused";
  return {
    baseMode,
    keywords: stringList(strategy.keywords || strategy.focusTerms, 30),
    excludeTerms: stringList(strategy.excludeTerms || strategy.exclude, 30),
    customQueries,
    preferredLanguages: stringList(strategy.preferredLanguages, 20),
    preferredCategories: stringList(strategy.preferredCategories, 20),
    preferredShapes: stringList(strategy.preferredShapes, 20),
    minStars: Math.max(0, Math.min(5000, Number(strategy.minStars ?? 20) || 0)),
    notes: String(strategy.notes || "").slice(0, 1200)
  };
}

function normalizeObservationPlans(savedPlans, legacyMemory, defaultPlans = {}) {
  const plans = {};
  const source = savedPlans && typeof savedPlans === "object" ? savedPlans : {};
  for (const [id, plan] of Object.entries(source)) {
    plans[id] = normalizeObservationPlan({ ...plan, id }, legacyMemory || defaultMemory());
  }
  if (!plans.default) {
    plans.default = normalizeObservationPlan(defaultObservationPlan(normalizeMemory(legacyMemory || defaultMemory())));
  }
  for (const [id, plan] of Object.entries(defaultPlans || {})) {
    if (!plans[id]) plans[id] = normalizeObservationPlan(plan);
  }
  return plans;
}

function activeObservationPlan(store) {
  const activeId = store.settings?.activeObservationPlanId || "default";
  const plan = store.observationPlans?.[activeId] || store.observationPlans?.default || normalizeObservationPlan(defaultObservationPlan(store.memory));
  return normalizeObservationPlan(plan, store.memory);
}

function activeObservationPlanId(store) {
  return activeObservationPlan(store).id;
}

function observationPlanMemory(store) {
  return normalizeMemory(activeObservationPlan(store).memory || store.memory);
}

function syncActivePlanMemory(store, memory) {
  const planId = activeObservationPlanId(store);
  store.observationPlans = store.observationPlans || {};
  const plan = normalizeObservationPlan(store.observationPlans[planId] || { id: planId }, store.memory);
  const normalized = normalizeMemory(memory || plan.memory || store.memory);
  store.memory = normalized;
  store.observationPlans[planId] = {
    ...plan,
    memory: normalized,
    updatedAt: new Date().toISOString()
  };
  store.settings = {
    ...(store.settings || {}),
    activeObservationPlanId: planId
  };
  return normalized;
}

function activePlanUserData(store) {
  const planId = activeObservationPlanId(store);
  store.observationPlans = store.observationPlans || {};
  const plan = normalizeObservationPlan(store.observationPlans[planId] || { id: planId }, store.memory);
  const userData = normalizePlanUserData(plan.userData || {});
  store.observationPlans[planId] = {
    ...plan,
    userData
  };
  return userData;
}

function observationPlanSummary(plan = {}) {
  const normalized = normalizeObservationPlan(plan);
  const logic = normalized.searchLogic || normalized.strategy || {};
  const userData = normalizePlanUserData(normalized.userData || {});
  const memory = normalizeMemory(normalized.memory || defaultMemory());
  return {
    searchLogicItems: normalized.id === "default" ? DEFAULT_OBSERVATION_PROFILE_COUNT : observationExecutionProfileCount(logic),
    learningConfig: {
      explorationRatio: memory.antiBubble?.explorationRatio ?? 0,
      diversityFloor: memory.antiBubble?.diversityFloor ?? 0,
      noveltyRatio: memory.antiBubble?.noveltyRatio ?? 0,
      rawEventLimit: memory.context?.rawEventLimit || 0,
      shortTermLimit: memory.context?.shortTermLimit || 0,
      compactAfterEvents: memory.context?.compactAfterEvents || 0
    },
    userEvents: Array.isArray(memory.events) ? memory.events.length : 0,
    recentActions: Array.isArray(memory.shortTerm) ? memory.shortTerm.length : 0,
    favorites: Object.keys(userData.watchlist || {}).length,
    triageRecords: Object.keys(userData.notes || {}).length,
    aiAnalyses: Object.keys(userData.analysis || {}).length,
    dismissedProjects: Object.keys(userData.dismissedProjects || {}).length,
    githubActions: Object.keys(userData.githubActions || {}).length,
    evolution: {
      positivePreferences: Object.values(memory.preferences || {}).reduce((sum, bucket) => sum + Object.keys(bucket || {}).length, 0),
      negativePreferences: Object.values(memory.negativePreferences || {}).reduce((sum, bucket) => sum + Object.keys(bucket || {}).length, 0),
      compressedFacts: Array.isArray(memory.context?.permanentFacts) ? memory.context.permanentFacts.length : 0,
      harnessRuns: Array.isArray(memory.harness?.runs) ? memory.harness.runs.length : 0,
      lastTunedAt: memory.harness?.lastTunedAt || "",
      lastEvaluatedAt: memory.harness?.lastEvaluatedAt || ""
    }
  };
}

function observationPlanPublicView(plan, activeId = "default", includeMemory = false) {
  const normalized = normalizeObservationPlan(plan);
  const logic = normalized.searchLogic || normalized.strategy;
  const publicLogic =
    normalized.id === "default"
      ? {
          ...logic,
          customQueries: buildQueryProfiles().map((profile) => ({
            key: profile.key,
            label: profile.label,
            labelZh: profile.labelZh || profile.label,
            labelEn: profile.labelEn || profile.label,
            query: profile.q
          }))
        }
      : logic;
  const view = {
    id: normalized.id,
    name: normalized.name,
    nameEn: normalized.nameEn,
    description: normalized.description,
    descriptionEn: normalized.descriptionEn,
    requirements: normalizeObservationRequirements(normalized.requirements),
    builtIn: Boolean(normalized.builtIn),
    active: normalized.id === activeId,
    createdAt: normalized.createdAt,
    updatedAt: normalized.updatedAt,
    strategy: publicLogic,
    searchLogic: publicLogic,
    summary: observationPlanSummary(normalized)
  };
  if (includeMemory) {
    view.memory = normalizeMemory(normalized.memory);
    view.userData = normalizePlanUserData(normalized.userData);
  }
  return view;
}

function observationPlanMatchAliases(plan = {}, planId = "") {
  return [
    planId,
    plan.id,
    plan.name,
    plan.nameEn,
    plan.description,
    plan.descriptionEn
  ]
    .map((item) => normalizeObservationPlanId(item))
    .filter((item, index, list) => item && item !== "default" && item.length >= 2 && list.indexOf(item) === index);
}

function projectMatchesObservationPlan(project, planId, plan = null) {
  const id = String(planId || "default");
  if (id === "default") return true;
  const matches = project.observationPlanMatches || {};
  if (matches[id]) return true;
  const aliases = observationPlanMatchAliases(plan || {}, id);
  if (!aliases.length) return false;
  return Object.entries(matches).some(([matchId, match]) => {
    const profileText = normalizeObservationPlanId(`${match?.profileKey || ""} ${match?.profileLabel || ""}`);
    return aliases.some((alias) => matchId === alias || (matchId.startsWith(`${alias}-`) && profileText.includes(alias)));
  });
}

function mergeProviders(defaults, saved) {
  const savedById = new Map(saved.map((provider) => [provider.id, provider]));
  const merged = defaults.map((provider) => {
    const savedProvider = savedById.get(provider.id) || {};
    const nextProvider = {
      ...provider,
      ...savedProvider
    };
    if (nextProvider.id === "deepseek" && nextProvider.model === "deepseek-chat") {
      nextProvider.model = "deepseek-v4-flash";
    }
    return nextProvider;
  });
  for (const provider of saved) {
    if (!merged.some((item) => item.id === provider.id)) {
      merged.push(provider);
    }
  }
  return merged;
}

function normalizeMemory(saved = {}, defaults = defaultMemory()) {
  return {
    ...defaults,
    ...(saved || {}),
    shortTerm: Array.isArray(saved?.shortTerm) ? saved.shortTerm : [],
    events: Array.isArray(saved?.events) ? saved.events : Array.isArray(saved?.shortTerm) ? saved.shortTerm : [],
    preferences: {
      ...defaults.preferences,
      ...(saved?.preferences || {}),
      categories: {
        ...defaults.preferences.categories,
        ...(saved?.preferences?.categories || {})
      },
      useCases: {
        ...defaults.preferences.useCases,
        ...(saved?.preferences?.useCases || {})
      },
      languages: {
        ...defaults.preferences.languages,
        ...(saved?.preferences?.languages || {})
      },
      licenses: {
        ...defaults.preferences.licenses,
        ...(saved?.preferences?.licenses || {})
      },
      riskLevels: {
        ...defaults.preferences.riskLevels,
        ...(saved?.preferences?.riskLevels || {})
      }
    },
    negativePreferences: {
      ...defaults.negativePreferences,
      ...(saved?.negativePreferences || {}),
      categories: {
        ...defaults.negativePreferences.categories,
        ...(saved?.negativePreferences?.categories || {})
      },
      useCases: {
        ...defaults.negativePreferences.useCases,
        ...(saved?.negativePreferences?.useCases || {})
      },
      languages: {
        ...defaults.negativePreferences.languages,
        ...(saved?.negativePreferences?.languages || {})
      },
      licenses: {
        ...defaults.negativePreferences.licenses,
        ...(saved?.negativePreferences?.licenses || {})
      },
      riskLevels: {
        ...defaults.negativePreferences.riskLevels,
        ...(saved?.negativePreferences?.riskLevels || {})
      },
      repositories: {
        ...defaults.negativePreferences.repositories,
        ...(saved?.negativePreferences?.repositories || {})
      }
    },
    manualPreferences: {
      ...defaults.manualPreferences,
      ...(saved?.manualPreferences || {}),
      categories: {
        ...defaults.manualPreferences.categories,
        ...(saved?.manualPreferences?.categories || {})
      },
      useCases: {
        ...defaults.manualPreferences.useCases,
        ...(saved?.manualPreferences?.useCases || {})
      },
      languages: {
        ...defaults.manualPreferences.languages,
        ...(saved?.manualPreferences?.languages || {})
      },
      licenses: {
        ...defaults.manualPreferences.licenses,
        ...(saved?.manualPreferences?.licenses || {})
      },
      riskLevels: {
        ...defaults.manualPreferences.riskLevels,
        ...(saved?.manualPreferences?.riskLevels || {})
      }
    },
    manualNegativePreferences: {
      ...defaults.manualNegativePreferences,
      ...(saved?.manualNegativePreferences || {}),
      categories: {
        ...defaults.manualNegativePreferences.categories,
        ...(saved?.manualNegativePreferences?.categories || {})
      },
      useCases: {
        ...defaults.manualNegativePreferences.useCases,
        ...(saved?.manualNegativePreferences?.useCases || {})
      },
      languages: {
        ...defaults.manualNegativePreferences.languages,
        ...(saved?.manualNegativePreferences?.languages || {})
      },
      licenses: {
        ...defaults.manualNegativePreferences.licenses,
        ...(saved?.manualNegativePreferences?.licenses || {})
      },
      riskLevels: {
        ...defaults.manualNegativePreferences.riskLevels,
        ...(saved?.manualNegativePreferences?.riskLevels || {})
      },
      repositories: {
        ...defaults.manualNegativePreferences.repositories,
        ...(saved?.manualNegativePreferences?.repositories || {})
      }
    },
    antiBubble: {
      ...defaults.antiBubble,
      ...(saved?.antiBubble || {})
    },
    stats: {
      ...defaults.stats,
      ...(saved?.stats || {}),
      eventCounts: {
        ...defaults.stats.eventCounts,
        ...(saved?.stats?.eventCounts || {})
      }
    },
    context: {
      ...defaults.context,
      ...(saved?.context || {}),
      permanentFacts: Array.isArray(saved?.context?.permanentFacts) ? saved.context.permanentFacts : [],
      preferenceEvidence: Array.isArray(saved?.context?.preferenceEvidence) ? saved.context.preferenceEvidence : [],
      dismissedReasonCorrections: Array.isArray(saved?.context?.dismissedReasonCorrections) ? saved.context.dismissedReasonCorrections : [],
      openQuestions: Array.isArray(saved?.context?.openQuestions) ? saved.context.openQuestions : [],
      safetyRules: Array.isArray(saved?.context?.safetyRules) ? saved.context.safetyRules : defaults.context.safetyRules,
      chunks: Array.isArray(saved?.context?.chunks) ? saved.context.chunks : []
    },
    harness: {
      ...defaults.harness,
      ...(saved?.harness || {}),
      recommendations: Array.isArray(saved?.harness?.recommendations) ? saved.harness.recommendations : [],
      runs: Array.isArray(saved?.harness?.runs) ? saved.harness.runs : []
    }
  };
}

function maskProvider(provider, includeSecrets = false) {
  if (includeSecrets) {
    return provider;
  }
  const apiKey = provider.apiKey || "";
  return {
    ...provider,
    apiKey: "",
    apiKeySet: Boolean(apiKey),
    apiKeyPreview: apiKey ? `...${apiKey.slice(-4)}` : ""
  };
}

function cloneJson(value, fallback) {
  if (value === undefined || value === null) return fallback;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_) {
    return fallback;
  }
}

function plainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function portableProvider(provider = {}) {
  return {
    id: String(provider.id || "").trim(),
    name: String(provider.name || "").trim(),
    region: String(provider.region || "").trim(),
    protocol: String(provider.protocol || "openai-compatible").trim(),
    baseUrl: String(provider.baseUrl || "").trim(),
    model: String(provider.model || "").trim(),
    enabled: Boolean(provider.enabled),
    models: Array.isArray(provider.models) ? provider.models.map(String).filter(Boolean).slice(0, 80) : [],
    lastModelSyncAt: provider.lastModelSyncAt || "",
    lastTestAt: provider.lastTestAt || "",
    testStatus: provider.testStatus || ""
  };
}

function portableSettings(settings = {}) {
  return {
    language: ["zh", "en"].includes(settings.language) ? settings.language : "zh",
    dailyBriefSize: Number(settings.dailyBriefSize || 120),
    defaultSort: settings.defaultSort || "opportunity",
    activeProvider: "deepseek",
    activeObservationPlanId: settings.activeObservationPlanId || "default",
    providerCatalog: cloneJson(settings.providerCatalog || { updatedAt: "", endpoints: [] }, { updatedAt: "", endpoints: [] }),
    llmProviders: (settings.llmProviders || []).map(portableProvider).filter((provider) => provider.id)
  };
}

function mergePortableProviders(existing = [], imported = []) {
  const existingById = new Map((existing || []).map((provider) => [provider.id, provider]));
  const importedById = new Map((imported || []).map((provider) => [provider.id, portableProvider(provider)]).filter(([id]) => id));
  const merged = (existing || []).map((provider) => {
    const incoming = importedById.get(provider.id);
    if (!incoming) return provider;
    importedById.delete(provider.id);
    return {
      ...provider,
      ...incoming,
      apiKey: provider.apiKey || "",
      apiKeySet: undefined,
      apiKeyPreview: undefined
    };
  });
  for (const provider of importedById.values()) {
    merged.push({
      ...provider,
      apiKey: "",
      apiKeySet: undefined,
      apiKeyPreview: undefined
    });
  }
  return merged;
}

function mergePortableSettings(existing = {}, imported = {}) {
  const next = portableSettings({
    ...existing,
    ...plainObject(imported),
    llmProviders: mergePortableProviders(existing.llmProviders || defaultProviders(), plainObject(imported).llmProviders || [])
  });
  return {
    ...existing,
    ...next,
    activeProvider: "deepseek",
    githubToken: existing.githubToken || "",
    tavilyKey: existing.tavilyKey || "",
    exaKey: existing.exaKey || "",
    llmProviders: mergePortableProviders(existing.llmProviders || defaultProviders(), plainObject(imported).llmProviders || [])
  };
}

function writeStore(filePath, store) {
  ensureDir(filePath);
  const next = {
    ...store,
    updatedAt: new Date().toISOString()
  };
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(next, null, 2));
  fs.renameSync(tempPath, filePath);
  return next;
}

function projectKey(fullName) {
  return String(fullName || "").toLowerCase();
}

function normalizedAnalysisRecommendation(value) {
  const normalized = String(value || "").toLowerCase().trim();
  if (["validate", "validation", "continue", "deep-dive", "deep_dive"].includes(normalized)) return "validate";
  if (["pause", "skip", "hold", "not-fit", "not_fit"].includes(normalized)) return "pause";
  if (["watch", "observe", "review"].includes(normalized)) return "watch";
  return "";
}

function compactAnalysisText(value) {
  if (Array.isArray(value)) return value.map(compactAnalysisText).filter(Boolean).join(" ");
  if (value && typeof value === "object") return Object.values(value).map(compactAnalysisText).filter(Boolean).join(" ");
  return String(value || "").replace(/\s+/g, " ").trim();
}

function analysisRecommendation(projectOrAnalysis = {}) {
  const analysis = projectOrAnalysis?.result ? projectOrAnalysis : projectOrAnalysis?.analysis || projectOrAnalysis;
  const result = analysis?.result || analysis || {};
  const direct = normalizedAnalysisRecommendation(result.recommendation || analysis?.recommendation);
  if (direct) return direct;
  const riskLevel = String(result.riskLevel || "").toLowerCase();
  const text = compactAnalysisText([result.verdict, result.summary]);
  if (/暂缓|暂不|不建议|不适合|先放弃|skip|pause|not fit|not recommended/i.test(text)) return "pause";
  if (/建议验证|优先验证|继续跟进|值得验证|值得关注|validate|continue|priority/i.test(text) && riskLevel !== "high") return "validate";
  if (riskLevel === "high") return "pause";
  if (riskLevel === "low") return "validate";
  return "watch";
}

function normalizedListLimit(value, defaultLimit = 500) {
  if (value === "all" || value === -1 || value === "-1" || defaultLimit === "all") return Number.POSITIVE_INFINITY;
  const limit = Number(value || defaultLimit);
  if (!Number.isFinite(limit)) return defaultLimit;
  return Math.min(2000, Math.max(1, limit));
}

const TOPIC_ALIASES = {
  "ai-agent": "ai-agent",
  "ai-agents": "ai-agent",
  agent: "ai-agent",
  agents: "ai-agent",
  agentic: "ai-agent",
  "agentic-ai": "ai-agent",
  "autonomous-agent": "ai-agent",
  "autonomous-agents": "ai-agent",
  "artificial-intelligence": "ai",
  "artificial intelligence": "ai",
  "large-language-model": "llm",
  "large-language-models": "llm",
  "language-model": "llm",
  "language-models": "llm",
  "retrieval-augmented-generation": "rag",
  "model-context-protocol": "mcp",
  "developer-tool": "developer-tools",
  devtools: "developer-tools",
  "dev-tools": "developer-tools",
  "command-line": "cli",
  commandline: "cli",
  terminal: "cli",
  "awesome-list": "awesome",
  "awesome-lists": "awesome",
  js: "javascript",
  ts: "typescript",
  golang: "go",
  k8s: "kubernetes",
  k8: "kubernetes",
  "kube": "kubernetes",
  "open-source": "open-source",
  opensource: "open-source",
  "open source": "open-source",
  workflow: "workflow",
  workflows: "workflow",
  tool: "tools",
  component: "components",
  note: "notes",
  stock: "stocks",
  subtitle: "caption"
};

function normalizeTopicKey(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[./_]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!raw) return "";
  return TOPIC_ALIASES[raw] || raw;
}

const CAPABILITY_TAG_RULES = [
  {
    key: "engineering-cad-nx",
    labelZh: "工程 CAD/NX 自动化",
    labelEn: "Engineering CAD/NX automation",
    pattern: /\bugnx\b|ug\s*nx|siemens\s+nx|nx\s*open\b|nxopen(?!api|gl)|ugopen|unigraphics|postbuilder|post\s*processor|\bmom\b/i
  },
  {
    key: "content-creation",
    labelZh: "内容创作工具",
    labelEn: "Content creation tools",
    pattern: /video|audio|music|podcast|voice|tts|subtitle|caption|timeline|render|shorts|creator tool|content creation|transcription/i
  },
  {
    key: "design-editor",
    labelZh: "设计与编辑器",
    labelEn: "Design and editors",
    pattern: /figma|design system|design token|ui generator|prototype|canvas|whiteboard|diagram|visual editor|image editor|creative tool/i
  },
  {
    key: "browser-automation",
    labelZh: "浏览器自动化",
    labelEn: "Browser automation",
    pattern: /browser[-\s_]?harness|browser[-\s_]?use|browser[-\s_]?automation|browser agent|websites accessible|web automation|scraping|crawler/i
  },
  {
    key: "knowledge-search",
    labelZh: "知识检索问答",
    labelEn: "Knowledge search and Q&A",
    pattern: /rag|vector search|semantic search|knowledge base|knowledge graph|qa system|question answering|document chat|search engine/i
  },
  {
    key: "data-extraction",
    labelZh: "信息抽取处理",
    labelEn: "Information extraction",
    pattern: /langextract|information extraction|structured extraction|source grounding|parser|ocr|pdf extraction|document processing|etl|pipeline/i
  },
  {
    key: "data-analytics",
    labelZh: "数据分析看板",
    labelEn: "Analytics dashboards",
    pattern: /analytics|analysis|dashboard|metrics|reporting|bi\b|warehouse|data visualization|visualization/i
  },
  {
    key: "admin-saas",
    labelZh: "后台与业务系统",
    labelEn: "Admin and business systems",
    pattern: /admin panel|backoffice|crm\b|erp\b|saas|billing|subscription|portal|console|workspace|business system/i
  },
  {
    key: "product-template",
    labelZh: "应用模板脚手架",
    labelEn: "App templates and starters",
    pattern: /starter|starter kit|boilerplate|scaffold|template|full[-\s]?stack|production[-\s]?ready|app shell/i
  },
  {
    key: "self-hosted-app",
    labelZh: "自托管应用",
    labelEn: "Self-hosted apps",
    pattern: /self[-\s]?hosted|selfhosted|docker compose|private deployment|local[-\s]?first/i
  },
  {
    key: "open-source-alternative",
    labelZh: "开源替代方案",
    labelEn: "Open-source alternatives",
    pattern: /open[-\s]?source alternative|alternative to|clone of|replacement for/i
  },
  {
    key: "ai-assistant",
    labelZh: "AI 助手应用",
    labelEn: "AI assistant apps",
    pattern: /assistant|copilot|chatbot|ai app|ai agent|agentic app|personalized ai|ai productivity/i
  },
  {
    key: "ai-workflow",
    labelZh: "AI 工作流执行",
    labelEn: "AI workflow execution",
    pattern: /workflow|orchestrat|multi[-\s]?agent|autonomous|task execution|tool use|agent operating system|mcp/i
  },
  {
    key: "ai-memory",
    labelZh: "AI 记忆服务",
    labelEn: "AI memory services",
    pattern: /mem0|memory layer|ai memory|long[-\s]?term memory|preference memory|personalization/i
  },
  {
    key: "ai-coding",
    labelZh: "AI 编程助手",
    labelEn: "AI coding assistants",
    pattern: /ai[-\s]?coding|claude code|codex|cursor|opencode|gemini cli|code assistant|code review|developer agent/i
  },
  {
    key: "developer-tooling",
    labelZh: "开发者工具",
    labelEn: "Developer tooling",
    pattern: /developer tool|devtool|cli|command line|terminal|sdk|debugger|testing|ci\/cd|gitops/i
  },
  {
    key: "model-serving",
    labelZh: "模型推理服务",
    labelEn: "Model serving",
    pattern: /vllm|inference|serving engine|model serving|llm serving|gateway|proxy server|api gateway/i
  },
  {
    key: "security-scanning",
    labelZh: "安全检查工具",
    labelEn: "Security scanning",
    pattern: /security|vulnerability|scanner|audit|compliance|privacy|owasp|mitre|attack|secret scanning/i
  },
  {
    key: "sre-ops",
    labelZh: "运维与可观测",
    labelEn: "Ops and observability",
    pattern: /sre|observability|monitoring|alerting|incident|root[-\s]?cause|remediation|grafana|prometheus|kubernetes/i
  },
  {
    key: "commerce-growth",
    labelZh: "内容与增长系统",
    labelEn: "Content and growth systems",
    pattern: /cms|content management|ecommerce|commerce|marketing|growth|shopify|storefront|seo/i
  },
  {
    key: "finance-tool",
    labelZh: "金融与财务工具",
    labelEn: "Finance tools",
    pattern: /finance|trading|stock|portfolio|invoice|accounting|quant|payment/i
  },
  {
    key: "personal-productivity",
    labelZh: "个人效率工具",
    labelEn: "Personal productivity",
    pattern: /\bnotes?\b|calendar|task manager|todo|productivity|personal[-\s]?(tool|assistant|workspace|knowledge|productivity)|bookmark|download manager|menubar/i
  },
  {
    key: "learning-material",
    labelZh: "学习案例资料",
    labelEn: "Learning materials",
    pattern: /course|tutorial|learn|from[-\s]?scratch|educational|teaching|awesome list|best practice|examples/i
  }
];

const CATEGORY_CAPABILITY_FALLBACKS = {
  "engineering-cad-nx": "engineering-cad-nx",
  "product-starters": "product-template",
  "ai-native-products": "ai-assistant",
  "developer-productivity": "developer-tooling",
  "business-saas": "admin-saas",
  "data-knowledge": "knowledge-search",
  "infra-cloud": "sre-ops",
  "security-compliance": "security-scanning",
  "frontend-creative": "design-editor",
  "creative-media": "content-creation",
  "consumer-productivity": "personal-productivity",
  "commerce-growth-content": "commerce-growth",
  "systems-runtime-edge": "model-serving",
  "learning-research-assets": "learning-material"
};

const CAPABILITY_TAG_BY_KEY = new Map(CAPABILITY_TAG_RULES.map((rule) => [rule.key, rule]));

function projectCapabilityTags(project) {
  const topics = (project.topics || []).map(normalizeTopicKey);
  const haystack = [
    project.fullName,
    project.name,
    project.description,
    project.homepage,
    project.language,
    ...(project.reasons || []),
    ...(project.actions || []),
    ...topics,
    project.category?.key,
    project.category?.label,
    project.useCase?.key,
    project.useCase?.label,
    project.useCase?.labelZh,
    project.useCase?.labelEn,
    project.useCase?.summaryZh,
    project.useCase?.summaryEn
  ]
    .filter(Boolean)
    .join(" ");
  let matched = CAPABILITY_TAG_RULES.filter((rule) => rule.pattern.test(haystack));
  if (isNxCadRepository(project)) {
    const nxTag = CAPABILITY_TAG_BY_KEY.get("engineering-cad-nx");
    const genericNoise = new Set(["content-creation", "knowledge-search", "ai-assistant", "ai-workflow", "ai-coding", "data-analytics"]);
    matched = matched.filter((rule) => !genericNoise.has(rule.key));
    if (nxTag) matched.unshift(nxTag);
  }
  const fallback = CAPABILITY_TAG_BY_KEY.get(CATEGORY_CAPABILITY_FALLBACKS[project.category?.key || ""]);
  if (fallback) matched.push(fallback);
  const unique = new Map();
  for (const tag of matched) {
    unique.set(tag.key, tag);
  }
  return Array.from(unique.values()).slice(0, 4);
}

function commercialScore(project) {
  const bucket = project.licensePolicy?.bucket || "unknown-no-license";
  const licenseBoost = {
    "permissive-commercial": 112,
    "conditional-commercial": 74,
    "manual-review": 42,
    "distribution-copyleft": 24,
    "network-copyleft": 12,
    "restricted-noncommercial": 4,
    "unknown-no-license": 6
  }[bucket] || 20;

  return (
    licenseBoost +
    (project.scores?.actionability || 0) * 0.65 +
    (project.scores?.productization || 0) * 0.45 +
    (project.scores?.opportunity || 0) * 0.25 -
    (project.scores?.risk || 0) * 0.8
  );
}

function projectFocusKey(project) {
  const computed = withComputedUseCase(project);
  const useCaseKey = computed.useCase?.key || "";
  const noisyAiUseCases = new Set(["ai-role-library", "ai-agent-os", "ai-workflow", "ai-assistant", "llm-app-gallery"]);
  if (computed.category?.key === "ai-native-products" && noisyAiUseCases.has(useCaseKey)) {
    return "ai-native-products";
  }
  return useCaseKey || computed.category?.key || "other";
}

function withComputedUseCase(project) {
  const category = classifyRepository(project);
  const licensePolicy = normalizeProjectLicensePolicy(project.licensePolicy);
  const computed = {
    ...project,
    licensePolicy,
    category,
    useCase: inferUseCase({ ...project, category }, category)
  };
  const semanticProfile = projectSemanticProfile(computed);
  const next = {
    ...computed,
    semantic: projectSemanticPayload({ ...computed, _semanticProfile: semanticProfile }),
    trend: cachedTrend(project)
  };
  Object.defineProperty(next, "_semanticProfile", {
    value: semanticProfile,
    enumerable: false,
    configurable: true
  });
  return next;
}

function licenseBoundaryFallback(policy = {}, language = "zh") {
  const bucket = policy?.bucket || "unknown-no-license";
  const fallback = {
    "permissive-commercial": {
      en: "Usually practical with notice preservation.",
      zh: "通常便于深入采用或集成，但要保留版权声明和许可文本。"
    },
    "conditional-commercial": {
      en: "Review license obligations before integration, distribution, or hosted use.",
      zh: "深入采用前先复核许可证义务，尤其注意链接、署名和再分发边界。"
    },
    "distribution-copyleft": {
      en: "Distribution may require source release; review obligations first.",
      zh: "分发前先确认同许可证开源义务。"
    },
    "network-copyleft": {
      en: "Hosted-service use may trigger source-release duties; review first.",
      zh: "托管服务可能触发源码开放义务，使用前需复核。"
    },
    "restricted-noncommercial": {
      en: "Monitor only unless the exact license grants the intended use.",
      zh: "除非许可明确允许目标用途，否则默认仅监控。"
    },
    "manual-review": {
      en: "Review the exact license text before copying or redistributing.",
      zh: "复制、修改或分发前必须人工阅读完整许可文本。"
    },
    "unknown-no-license": {
      en: "Monitor and study direction only until legal/manual review.",
      zh: "只能监控和研究方向，未经人工确认前不要复制、修改或分发代码。"
    }
  }[bucket] || {
    en: "Review the exact license text before practical adoption.",
    zh: "深入采用前先人工复核许可边界。"
  };
  return language === "en" ? fallback.en : fallback.zh;
}

function normalizeProjectLicensePolicy(policy = {}) {
  if (!policy || typeof policy !== "object") return policy;
  const rest = {};
  for (const [key, value] of Object.entries(policy)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, "");
    if (normalizedKey === "seconddevelopment" || normalizedKey === "seconddevelopmentzh") continue;
    rest[key] = value;
  }
  return {
    ...rest,
    practiceBoundary: rest.practiceBoundary || licenseBoundaryFallback(rest, "en"),
    practiceBoundaryZh: rest.practiceBoundaryZh || licenseBoundaryFallback(rest, "zh")
  };
}

function riskLevel(project) {
  const risk = Number(project.scores?.risk || project.scores?.overallRisk || 0);
  if (risk >= 60) return "critical";
  if (risk >= 35) return "high";
  if (risk >= 15) return "medium";
  return "low";
}

function boundedPreferenceValue(value, max = 40) {
  const next = Number(value);
  if (!Number.isFinite(next)) return 0;
  return Math.max(0, Math.min(max, next));
}

function adjustPreferenceBucket(bucket, key, delta, max = 40) {
  const safeKey = String(key || "").trim();
  if (!safeKey) return;
  const next = boundedPreferenceValue(Number(bucket[safeKey] || 0) + Number(delta || 0), max);
  if (next <= 0) {
    delete bucket[safeKey];
  } else {
    bucket[safeKey] = Number(next.toFixed(2));
  }
}

function clonePreferenceRoot(root = {}, includeRepositories = false) {
  const next = emptyPreferenceRoot();
  for (const key of Object.keys(next)) {
    next[key] = {
      ...(root?.[key] || {})
    };
  }
  if (includeRepositories) {
    next.repositories = {
      ...(root?.repositories || {})
    };
  }
  return next;
}

function enforceManualFloors(memory) {
  const applyFloor = (displayRoot = {}, manualRoot = {}) => {
    for (const bucket of Object.keys(manualRoot || {})) {
      if (!displayRoot[bucket] || !manualRoot[bucket] || typeof manualRoot[bucket] !== "object") continue;
      for (const [key, value] of Object.entries(manualRoot[bucket])) {
        const floor = Number(value || 0);
        if (floor > 0 && Number(displayRoot[bucket][key] || 0) < floor) {
          displayRoot[bucket][key] = Number(floor.toFixed(2));
        }
      }
    }
  };
  applyFloor(memory.preferences, memory.manualPreferences);
  applyFloor(memory.negativePreferences, memory.manualNegativePreferences);
  return memory;
}

function projectMemoryKeys(project) {
  const computed = project?.category?.key && project?.useCase?.key && project?.licensePolicy?.bucket ? project : withComputedUseCase(project);
  return {
    category: computed.category?.key || "other",
    useCase: computed.useCase?.key || "other",
    language: computed.language || "unknown",
    license: computed.licensePolicy?.bucket || "unknown-no-license",
    risk: riskLevel(computed)
  };
}

function dismissProjectSignalScales(project) {
  const quality = Number(project.scores?.quality ?? 50);
  const actionability = Number(project.scores?.actionability ?? 50);
  const risk = Number(project.scores?.risk ?? project.scores?.overallRisk ?? 0);
  const qualityDriven = quality < 45 || actionability < 45 || risk >= 35;
  return {
    semantic: qualityDriven ? 0.18 : 0.55,
    language: qualityDriven ? 0.03 : 0.08,
    license: risk >= 35 ? 0.18 : 0.06,
    risk: qualityDriven ? 0.22 : 0.05,
    repository: 1
  };
}

function daysSince(value) {
  const time = new Date(value || 0).getTime();
  if (!Number.isFinite(time) || time <= 0) return 0;
  return Math.max(0, Math.floor((Date.now() - time) / 86400000));
}

function positivePreferenceTotal(memory = {}) {
  const preferences = memory.preferences || {};
  return Object.values(preferences).reduce(
    (sum, bucket) =>
      sum +
      Object.values(bucket || {}).reduce((inner, value) => inner + Math.max(0, Number(value || 0)), 0),
    0
  );
}

function likelyDismissedReason(project, memory = {}) {
  const computed = withComputedUseCase(project);
  const scores = computed.scores || {};
  const quality = Number(scores.quality ?? 50);
  const actionability = Number(scores.actionability ?? 50);
  const risk = Number(scores.risk ?? scores.overallRisk ?? 0);
  const description = String(computed.description || "").trim();
  const pushedDays = daysSince(computed.pushedAt || computed.updatedAt);
  const projectLabel = computed.name || computed.fullName || "该项目";
  const projectLabelEn = computed.name || computed.fullName || "this project";
  const stars = Number(computed.stars || 0);
  const forks = Number(computed.forks || 0);
  const directionZh = [
    computed.category?.labelZh || computed.category?.label,
    computed.useCase?.labelZh || computed.useCase?.label,
    computed.language
  ]
    .filter(Boolean)
    .slice(0, 2)
    .join(" / ");
  const directionEn = [
    computed.category?.labelEn || computed.category?.label,
    computed.useCase?.labelEn || computed.useCase?.label,
    computed.language
  ]
    .filter(Boolean)
    .slice(0, 2)
    .join(" / ");
  const profileZh = `${projectLabel}${directionZh ? `（${directionZh}）` : ""}，${stars} Stars / ${forks} Forks`;
  const profileEn = `${projectLabelEn}${directionEn ? ` (${directionEn})` : ""}, ${stars} Stars / ${forks} Forks`;
  const keys = projectMemoryKeys(computed);
  const preferences = memory.preferences || {};
  const hasPreference = positivePreferenceTotal(memory) >= 2;
  const matchesPreference =
    Number(preferences.categories?.[keys.category] || 0) > 0 ||
    Number(preferences.useCases?.[keys.useCase] || 0) > 0 ||
    Number(preferences.languages?.[keys.language] || 0) > 0;

  const build = (code, reasonZh, reasonEn, signals = {}) => ({
    version: DISMISSED_REASON_VERSION,
    code,
    reasonZh,
    reasonEn,
    signals: {
      quality,
      actionability,
      risk,
      stars: Number(computed.stars || 0),
      forks: Number(computed.forks || 0),
      pushedDays,
      ...signals
    }
  });

  if (description.length < 36) {
    return build(
      "missing-context",
      `${profileZh}。系统更倾向判断为项目说明不足：简介仅 ${description.length} 字，场景信号太少，短时间内难以判断它能解决什么问题、适合谁用。`,
      `${profileEn}. The strongest signal is missing context: the description is only ${description.length} characters, so the problem and audience are hard to judge quickly.`,
      { descriptionLength: description.length }
    );
  }
  if (risk >= 35 || /unknown|no-license|network|agpl/i.test(String(computed.licensePolicy?.bucket || computed.licensePolicy?.name || ""))) {
    const license = computed.licensePolicy?.labelZh || computed.licensePolicy?.name || "许可边界不明";
    const licenseEn = computed.licensePolicy?.labelEn || computed.licensePolicy?.name || "unclear license boundary";
    return build(
      "risk-boundary",
      `${profileZh}。系统更倾向判断为风险或边界不够清晰：当前许可/边界信号为“${license}”，合规、部署或维护成本可能高于当前观察价值。`,
      `${profileEn}. The strongest signal is unclear risk or boundaries: the current license/boundary cue is "${licenseEn}", so compliance, deployment, or maintenance cost may outweigh current value.`,
      { license: computed.licensePolicy?.bucket || computed.licensePolicy?.name || "" }
    );
  }
  if (quality < 45 || actionability < 45) {
    return build(
      "quality-actionability",
      `${profileZh}。系统更倾向判断为工程质量或落地路径不足：质量 ${Math.round(quality)}、可行动性 ${Math.round(actionability)}，还需要更多验证才适合重点跟踪。`,
      `${profileEn}. The strongest signal is weak quality or actionability: quality ${Math.round(quality)} and actionability ${Math.round(actionability)} suggest it needs more validation before focused tracking.`
    );
  }
  if (pushedDays >= 365) {
    return build(
      "maintenance-activity",
      `${profileZh}。系统更倾向判断为维护活跃度不足：距最近更新约 ${pushedDays} 天，后续跟踪价值需要谨慎判断。`,
      `${profileEn}. The strongest signal is weak maintenance activity: it was last updated about ${pushedDays} days ago, so future tracking value is uncertain.`
    );
  }
  if (Number(computed.stars || 0) < 80 && Number(computed.forks || 0) < 8) {
    return build(
      "weak-adoption",
      `${profileZh}。系统更倾向判断为公开关注和复用信号偏弱：Star 与 Fork 都偏低，外部验证还不够充分，优先级可以降低。`,
      `${profileEn}. The strongest signal is weak adoption: Stars and Forks are both low, so external validation is still thin and priority can be reduced.`
    );
  }
  if (hasPreference && !matchesPreference) {
    return build(
      "preference-mismatch",
      `${profileZh}。系统更倾向判断为方向不匹配：它与当前已形成的关注方向、用途或技术偏好关联较弱。`,
      `${profileEn}. The strongest signal is a preference mismatch: it has weak overlap with your current direction, use-case, or stack preferences.`
    );
  }
  return build(
    "fit-mismatch",
    `${profileZh}。系统更倾向判断为当前场景匹配度不足：项目本身可能有价值，但暂时不是这套观察方案最需要优先跟踪的对象。`,
    `${profileEn}. The strongest signal is a fit mismatch: the project may be useful, but is not a priority for this observation plan right now.`
  );
}

function reasonCodeFromText(text = "") {
  const value = String(text || "").toLowerCase();
  if (/许可|协议|合规|商用|分发|license|compliance|commercial|agpl|gpl/.test(value)) return "risk-boundary";
  if (/质量|粗糙|bug|不稳定|维护|过时|更新|成熟|落地|quality|bug|stale|maintenance|mature/.test(value)) return "quality-actionability";
  if (/描述|看不出|不清楚|空泛|文档|说明|context|description|docs|unclear/.test(value)) return "missing-context";
  if (/不相关|不匹配|方向|用户|场景|需求|重复|同质|agent|智能体|fit|mismatch|irrelevant|duplicate/.test(value)) return "preference-mismatch";
  return "fit-mismatch";
}

function reasonCorrectionDeltas(project, code, userReason = "") {
  const keys = projectMemoryKeys(project);
  const deltas = [];
  const push = (bucket, key, value) => {
    if (!key || !Number(value)) return;
    deltas.push({ bucket, key, value: Number(value.toFixed(3)) });
  };
  const reasonLengthBoost = Math.min(0.08, String(userReason || "").length / 1200);
  const semantic = code === "preference-mismatch" ? 0.2 : code === "missing-context" ? 0.12 : 0.08;
  push("categories", keys.category, semantic + reasonLengthBoost);
  push("useCases", keys.useCase, semantic + reasonLengthBoost);
  if (code === "risk-boundary") {
    push("licenses", keys.license, 0.18);
    push("riskLevels", keys.risk, 0.1);
  } else if (code === "quality-actionability") {
    push("riskLevels", keys.risk, 0.14);
    push("repositories", project.fullName, 0.08);
  } else if (code === "missing-context") {
    push("repositories", project.fullName, 0.06);
  }
  return deltas;
}

function applyReasonCorrectionDeltas(memory, deltas = [], direction = 1) {
  const negative = memory.negativePreferences || defaultMemory().negativePreferences;
  for (const delta of deltas || []) {
    if (!negative[delta.bucket]) continue;
    adjustPreferenceBucket(negative[delta.bucket], delta.key, Number(delta.value || 0) * direction, delta.bucket === "repositories" ? 20 : 30);
  }
  memory.negativePreferences = negative;
}

function dismissedNegativeLearning(project, entry = {}, memory = {}) {
  const computed = withComputedUseCase(project);
  const addTag = (tags, kind, zh, en) => {
    const pair = compactLabelPair(zh, en);
    if (!pair.labelZh && !pair.labelEn) return;
    const key = `${kind}:${pair.labelZh || pair.labelEn}`;
    if (tags.some((item) => item.key === key)) return;
    tags.push({ key, kind, ...pair });
  };
  const tags = [];
  addTag(tags, "category", computed.category?.labelZh || computed.category?.label, computed.category?.labelEn || computed.category?.label);
  addTag(tags, "useCase", computed.useCase?.labelZh || computed.useCase?.label, computed.useCase?.labelEn || computed.useCase?.label);
  addTag(tags, "language", computed.language, computed.language);
  addTag(tags, "license", computed.licensePolicy?.labelZh || computed.licensePolicy?.name, computed.licensePolicy?.labelEn || computed.licensePolicy?.name);
  const feedback = normalizeDismissedFeedback(entry.feedback || {});
  const systemReason =
    entry.systemReason?.version === DISMISSED_REASON_VERSION ? entry.systemReason : likelyDismissedReason(computed, memory);
  const userReason = feedback.reason || feedback.note || "";
  return {
    tags: tags.slice(0, 8),
    reasonZh: userReason || systemReason.reasonZh,
    reasonEn: userReason || systemReason.reasonEn,
    systemReason,
    userReason: userReason
      ? {
          reason: userReason,
          updatedAt: entry.feedbackUpdatedAt || ""
        }
      : null
  };
}

function applyDismissProjectSignal(memory, project, absWeight = 0, direction = 1) {
  const keys = projectMemoryKeys(project);
  const preferences = memory.preferences || defaultMemory().preferences;
  const negative = memory.negativePreferences || defaultMemory().negativePreferences;
  const scales = dismissProjectSignalScales(project);
  const signed = (value) => Number(value || 0) * direction;

  adjustPreferenceBucket(negative.categories, keys.category, signed(absWeight * scales.semantic), 30);
  adjustPreferenceBucket(negative.useCases, keys.useCase, signed(absWeight * scales.semantic), 30);
  adjustPreferenceBucket(negative.languages, keys.language, signed(absWeight * scales.language), 30);
  adjustPreferenceBucket(negative.licenses, keys.license, signed(absWeight * scales.license), 30);
  adjustPreferenceBucket(negative.riskLevels, keys.risk, signed(absWeight * scales.risk), 30);
  adjustPreferenceBucket(negative.repositories, project.fullName, signed(absWeight * scales.repository), 20);

  memory.preferences = preferences;
  memory.negativePreferences = negative;
  return keys;
}

function applyMemorySignal(memory, project, weight = 1, eventType = "") {
  const keys = projectMemoryKeys(project);
  const preferences = memory.preferences || defaultMemory().preferences;
  const negative = memory.negativePreferences || defaultMemory().negativePreferences;
  const absWeight = Math.abs(Number(weight || 0));

  if (eventType === "dismiss_project") {
    return applyDismissProjectSignal(memory, project, absWeight, 1);
  }

  if (weight >= 0) {
    adjustPreferenceBucket(preferences.categories, keys.category, weight);
    adjustPreferenceBucket(preferences.useCases, keys.useCase, weight);
    adjustPreferenceBucket(preferences.languages, keys.language, weight * 0.45);
    adjustPreferenceBucket(preferences.licenses, keys.license, weight * 0.35);
    adjustPreferenceBucket(preferences.riskLevels, keys.risk, weight * 0.25);
    adjustPreferenceBucket(negative.categories, keys.category, -weight * 0.45);
    adjustPreferenceBucket(negative.useCases, keys.useCase, -weight * 0.45);
  } else {
    adjustPreferenceBucket(preferences.categories, keys.category, weight);
    adjustPreferenceBucket(preferences.useCases, keys.useCase, weight);
    adjustPreferenceBucket(preferences.languages, keys.language, weight * 0.25);
    adjustPreferenceBucket(preferences.licenses, keys.license, weight * 0.2);
    adjustPreferenceBucket(preferences.riskLevels, keys.risk, weight * 0.2);
    adjustPreferenceBucket(negative.categories, keys.category, absWeight * 0.75, 30);
    adjustPreferenceBucket(negative.useCases, keys.useCase, absWeight * 0.85, 30);
    adjustPreferenceBucket(negative.languages, keys.language, absWeight * 0.25, 30);
    adjustPreferenceBucket(negative.licenses, keys.license, absWeight * 0.2, 30);
    adjustPreferenceBucket(negative.riskLevels, keys.risk, absWeight * 0.2, 30);
    if (eventType === "leaderboard_negative") {
      adjustPreferenceBucket(negative.repositories, project.fullName, absWeight, 20);
    }
  }

  memory.preferences = preferences;
  memory.negativePreferences = negative;
  return keys;
}

function rollbackMemorySignal(memory, project, event = {}) {
  const weight = Number.isFinite(Number(event.weight)) ? Number(event.weight) : eventWeight(event.type || legacyMemoryEventType(event.reason));
  const eventType = event.type || legacyMemoryEventType(event.reason);
  const keys = projectMemoryKeys(project);
  const preferences = memory.preferences || defaultMemory().preferences;
  const negative = memory.negativePreferences || defaultMemory().negativePreferences;
  const absWeight = Math.abs(Number(weight || 0));
  const restoreIfPresent = (bucket, key, delta, max) => {
    if (Number(bucket?.[key] || 0) > 0) {
      adjustPreferenceBucket(bucket, key, delta, max);
    }
  };

  if (eventType === "dismiss_project") {
    applyDismissProjectSignal(memory, project, absWeight, -1);
    return;
  }

  if (weight >= 0) {
    adjustPreferenceBucket(preferences.categories, keys.category, -weight);
    adjustPreferenceBucket(preferences.useCases, keys.useCase, -weight);
    adjustPreferenceBucket(preferences.languages, keys.language, -weight * 0.45);
    adjustPreferenceBucket(preferences.licenses, keys.license, -weight * 0.35);
    adjustPreferenceBucket(preferences.riskLevels, keys.risk, -weight * 0.25);
    restoreIfPresent(negative.categories, keys.category, weight * 0.45, 30);
    restoreIfPresent(negative.useCases, keys.useCase, weight * 0.45, 30);
  } else {
    restoreIfPresent(preferences.categories, keys.category, absWeight);
    restoreIfPresent(preferences.useCases, keys.useCase, absWeight);
    restoreIfPresent(preferences.languages, keys.language, absWeight * 0.25);
    restoreIfPresent(preferences.licenses, keys.license, absWeight * 0.2);
    restoreIfPresent(preferences.riskLevels, keys.risk, absWeight * 0.2);
    adjustPreferenceBucket(negative.categories, keys.category, -absWeight * 0.75, 30);
    adjustPreferenceBucket(negative.useCases, keys.useCase, -absWeight * 0.85, 30);
    adjustPreferenceBucket(negative.languages, keys.language, -absWeight * 0.25, 30);
    adjustPreferenceBucket(negative.licenses, keys.license, -absWeight * 0.2, 30);
    adjustPreferenceBucket(negative.riskLevels, keys.risk, -absWeight * 0.2, 30);
    if (eventType === "leaderboard_negative") {
      adjustPreferenceBucket(negative.repositories, project.fullName, -absWeight, 20);
    }
  }

  memory.preferences = preferences;
  memory.negativePreferences = negative;
}

function eventWeight(eventType, override) {
  if (override !== undefined) return Number(override);
  return MEMORY_EVENT_WEIGHTS[eventType] ?? 0.5;
}

function legacyMemoryEventType(reason = "") {
  const value = String(reason || "").replaceAll("-", "_");
  if (value === "watch") return "favorite";
  if (value === "leaderboard_positive") return "leaderboard_positive";
  if (value === "leaderboard_strong_positive") return "leaderboard_strong_positive";
  if (value === "leaderboard_negative") return "leaderboard_negative";
  if (value === "dismiss_project") return "dismiss_project";
  if (value === "triage_note") return "triage_note";
  if (value.startsWith("manual_memory")) return "manual_memory_edit";
  return value || "manual_memory_edit";
}

function appendMemoryEvent(store, project, eventType, options = {}) {
  if (!project) return null;
  const memory = observationPlanMemory(store);
  const computed = withComputedUseCase(project);
  const weight = eventWeight(eventType, options.weight);
  const keys = applyMemorySignal(memory, computed, weight, eventType);
  const at = new Date().toISOString();
  const entry = {
    at,
    type: eventType,
    reason: options.reason || eventType,
    weight: Number.isFinite(weight) ? Number(weight.toFixed(2)) : 0,
    fullName: computed.fullName,
    category: keys.category,
    useCase: keys.useCase,
    language: keys.language,
    license: keys.license,
    risk: keys.risk,
    source: options.source || "system"
  };

  const context = memory.context || defaultMemory().context;
  memory.events = [entry, ...(memory.events || [])].slice(0, Number(context.rawEventLimit || 300));
  memory.shortTerm = [entry, ...(memory.shortTerm || [])].slice(0, Number(context.shortTermLimit || 80));
  memory.stats = memory.stats || { eventCounts: {} };
  memory.stats.eventCounts = memory.stats.eventCounts || {};
  memory.stats.eventCounts[eventType] = (memory.stats.eventCounts[eventType] || 0) + 1;
  memory.stats.lastEventAt = at;
  compactMemoryContextInPlace(memory, { force: false });
  syncActivePlanMemory(store, memory);
  return entry;
}

function removeLatestMemoryEvent(store, fullName, eventType) {
  const memory = observationPlanMemory(store);
  const key = projectKey(fullName);
  const project = store.projects[key];
  if (!project) return false;
  const matches = (event) => projectKey(event.fullName) === key && (event.type || legacyMemoryEventType(event.reason)) === eventType;
  const event = (memory.events || []).find(matches) || null;
  if (!event) return false;
  rollbackMemorySignal(memory, withComputedUseCase(project), { ...event, type: eventType });
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
  memory.events = removeFirst(memory.events || []);
  memory.shortTerm = removeFirst(memory.shortTerm || []);
  memory.stats = memory.stats || { eventCounts: {} };
  memory.stats.eventCounts = eventCounts(memory.events);
  memory.stats.lastEventAt = memory.events[0]?.at || memory.shortTerm[0]?.at || "";
  syncActivePlanMemory(store, memory);
  return true;
}

function diversifyProjects(projects, limit) {
  const grouped = new Map();
  for (const project of projects) {
    const key = projectFocusKey(project);
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(project);
  }

  const groups = Array.from(grouped.entries()).map(([key, items]) => [
    key,
    items.slice().sort((a, b) => (b.scores?.opportunity || 0) - (a.scores?.opportunity || 0))
  ]);

  groups.sort((a, b) => (b[1][0]?.scores?.opportunity || 0) - (a[1][0]?.scores?.opportunity || 0));

  const selected = [];
  let round = 0;
  while (selected.length < limit) {
    let progressed = false;
    for (const [, items] of groups) {
      const item = items[round];
      if (item) {
        selected.push(item);
        progressed = true;
        if (selected.length >= limit) {
          break;
        }
      }
    }
    if (!progressed) {
      break;
    }
    round += 1;
  }

  return selected;
}

function todayKey(value = new Date()) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysForPeriod(period) {
  if (period === "weekly") return 7;
  if (period === "monthly") return 30;
  if (period === "all") return 3650;
  return 1;
}

function snapshotDelta(project, field, days) {
  const snapshots = project.snapshots || [];
  if (!snapshots.length) return 0;
  const latest = snapshots[snapshots.length - 1];
  const cutoff = Date.now() - days * 86400000;
  const baseline =
    snapshots
      .slice()
      .reverse()
      .find((snapshot) => new Date(snapshot.at).getTime() <= cutoff) || snapshots[0];
  return Math.max(0, (latest[field] || 0) - (baseline[field] || 0));
}

function previousDayWindow(reference = new Date()) {
  const end = new Date(reference);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 1);
  return {
    start: start.getTime(),
    end: end.getTime(),
    startKey: todayKey(start)
  };
}

function onlineTrendPlaceholder(reference = new Date()) {
  const window = previousDayWindow(reference);
  return {
    stars: null,
    forks: null,
    period: "previous-day-online",
    date: window.startKey,
    source: "github-online",
    reason: "not-selected",
    pending: false,
    cached: false
  };
}

function cachedTrend(project) {
  const trend = project.trend || onlineTrendPlaceholder();
  if (trend.pending && trend.stars === null && trend.forks === null && !trend.error) {
    return {
      ...trend,
      pending: false,
      cached: false
    };
  }
  if (
    trend.source === "github-online" &&
    trend.method !== "graphql-star-v1" &&
    Number(trend.stars || 0) === 0 &&
    Number(trend.forks || 0) > 0
  ) {
    return {
      ...trend,
      starsComplete: false,
      complete: false
    };
  }
  return trend;
}

function memoryScoreFromNormalized(project, normalized = defaultMemory()) {
  const keys = projectMemoryKeys(project);
  const preferences = normalized.preferences || {};
  const negative = normalized.negativePreferences || {};
  const positive =
    (preferences.categories?.[keys.category] || 0) * 2 +
    (preferences.useCases?.[keys.useCase] || 0) * 2.6 +
    (preferences.languages?.[keys.language] || 0) * 0.95 +
    (preferences.licenses?.[keys.license] || 0) * 0.75 +
    (preferences.riskLevels?.[keys.risk] || 0) * 0.55;
  const penalty =
    (negative.categories?.[keys.category] || 0) * 2.25 +
    (negative.useCases?.[keys.useCase] || 0) * 2.9 +
    (negative.languages?.[keys.language] || 0) * 0.8 +
    (negative.licenses?.[keys.license] || 0) * 0.65 +
    (negative.riskLevels?.[keys.risk] || 0) * 0.55 +
    (negative.repositories?.[project.fullName] || 0) * 3.2;
  const ratio = Number(normalized.antiBubble?.explorationRatio ?? 0.25);
  const personalWeight = Math.max(0.55, Math.min(0.95, 1 - ratio * 0.35));
  return Math.max(-28, Math.min(36, (positive - penalty) * personalWeight));
}

function memoryScore(project, memory = {}) {
  return memoryScoreFromNormalized(project, normalizeMemory(memory));
}

function personalizedOpportunity(project, memory = {}) {
  return (project.scores?.opportunity || 0) + memoryScore(project, memory);
}

function leaderboardScore(project, period, memory = {}) {
  const days = daysForPeriod(period);
  const starDelta = snapshotDelta(project, "stars", days);
  const forkDelta = snapshotDelta(project, "forks", days);
  const agentNoise = Number(project.signals?.productFit?.abstractAgentPenalty || 0);
  const trendingBoost = Math.min(
    8,
    (project.signals?.githubTrending || []).reduce((score, signal) => {
      const periodWeight = {
        daily: 3.2,
        weekly: 2.1,
        monthly: 1.4
      }[signal.period] || 1.2;
      const rankBoost = Math.max(0, 26 - Number(signal.rank || 26)) / 12;
      return score + periodWeight + rankBoost;
    }, 0)
  );
  const base =
    (project.scores?.opportunity || 0) * 0.42 +
    (project.scores?.productization || 0) * 0.22 +
    (project.scores?.actionability || 0) * 0.22 +
    (project.scores?.momentum || 0) * 0.14 -
    (project.scores?.overallRisk || 0) * 0.16 -
    agentNoise * 0.2;
  const trend = Math.min(25, Math.log10(starDelta + 1) * 9 + Math.log10(forkDelta + 1) * 5);
  return Math.round(Math.max(0, base + trend + trendingBoost + memoryScore(project, memory)));
}

function leaderboardItem(project, rank, period, memory = {}, previousRanks = new Map()) {
  const fullName = project.fullName;
  const days = daysForPeriod(period);
  const previousRank = previousRanks.get(fullName) || null;
  const memoryBoost = memoryScore(project, memory);
  return {
    rank,
    previousRank,
    rankChange: previousRank ? previousRank - rank : null,
    fullName,
    name: project.name,
    url: project.url,
    description: project.description,
    category: project.category,
    useCase: project.useCase,
    language: project.language,
    stars: project.stars,
    forks: project.forks,
    licensePolicy: project.licensePolicy,
    scores: project.scores,
    signals: project.signals,
    leaderboardScore: leaderboardScore(project, period, memory),
    scoreParts: {
      opportunity: project.scores?.opportunity || 0,
      recentHeat: project.scores?.momentum || 0,
      actionability: project.scores?.actionability || 0,
      projectRisk: project.scores?.risk || 0,
      memoryBoost,
      diversitySlot: memoryBoost <= 0.5
    },
    trend: cachedTrend(project),
    watched: project.watched,
    note: project.note,
    triageStatus: project.triageStatus,
    analysis: project.analysis || null
  };
}

function hydrateLeaderboardRecordState(item, userData = {}) {
  if (!item?.fullName) return item;
  const key = projectKey(item.fullName);
  const note = userData.notes?.[key] || {};
  return {
    ...item,
    note: note.text || item.note || "",
    triageStatus: note.status || item.triageStatus || "",
    noteUpdatedAt: note.updatedAt || item.noteUpdatedAt || "",
    watched: Boolean(userData.watchlist?.[key]),
    analysis: userData.analysis?.[key] || item.analysis || null
  };
}

function rankMap(archive) {
  return new Map((archive?.items || []).map((item) => [item.fullName, item.rank]));
}

function previousDateKey(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() - 1);
  return todayKey(date);
}

function rememberProject(store, project, reason, weight) {
  const eventType =
    reason === "favorite"
      ? "favorite"
      : reason === "unfavorite"
        ? "unfavorite"
        : reason === "triage-note"
          ? "triage_note"
          : reason === "leaderboard-negative"
            ? "leaderboard_negative"
            : reason === "leaderboard-strong-positive"
              ? "leaderboard_strong_positive"
              : reason === "leaderboard-positive"
                ? "leaderboard_positive"
                : reason || "manual";
  appendMemoryEvent(store, project, eventType, {
    reason,
    ...(weight !== undefined ? { weight } : {}),
    source: "legacy"
  });
}

function daysAgo(days) {
  return Date.now() - days * 86400000;
}

function recentEvents(memory, days = 30) {
  const cutoff = daysAgo(days);
  return (memory.events || memory.shortTerm || [])
    .map((event) => ({
      ...event,
      type: event.type || legacyMemoryEventType(event.reason)
    }))
    .filter((event) => new Date(event.at || 0).getTime() >= cutoff);
}

function normalizedMemoryEvents(memory) {
  return (memory.events || memory.shortTerm || []).map((event) => ({
    ...event,
    type: event.type || legacyMemoryEventType(event.reason),
    at: event.at || new Date(0).toISOString()
  }));
}

const MEMORY_CLEAR_RANGES = {
  "1h": 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000
};

function eventTime(event) {
  const time = new Date(event?.at || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function recordTime(record, ...fields) {
  for (const field of fields) {
    const time = new Date(record?.[field] || 0).getTime();
    if (Number.isFinite(time) && time > 0) return time;
  }
  return 0;
}

function eventCounts(events = []) {
  return events.reduce((counts, event) => {
    const type = event.type || legacyMemoryEventType(event.reason);
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, {});
}

function topEntriesFromCounts(counts, limit = 5) {
  return Object.entries(counts)
    .filter(([key]) => key)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function summarizeEventsForContext(events) {
  const categoryCounts = {};
  const useCaseCounts = {};
  const languageCounts = {};
  const licenseCounts = {};
  const typeCounts = {};
  const repoCounts = {};
  let positiveSignals = 0;
  let negativeSignals = 0;
  const positiveTypes = new Set(["favorite", "star", "fork", "triage_note", "ai_analyze", "leaderboard_positive", "leaderboard_strong_positive"]);
  const negativeTypes = new Set(["unfavorite", "unstar", "leaderboard_negative", "dismiss_project"]);

  for (const event of events) {
    const type = event.type || legacyMemoryEventType(event.reason);
    typeCounts[type] = (typeCounts[type] || 0) + 1;
    if (event.category) categoryCounts[event.category] = (categoryCounts[event.category] || 0) + 1;
    if (event.useCase) useCaseCounts[event.useCase] = (useCaseCounts[event.useCase] || 0) + 1;
    if (event.language) languageCounts[event.language] = (languageCounts[event.language] || 0) + 1;
    if (event.license) licenseCounts[event.license] = (licenseCounts[event.license] || 0) + 1;
    if (event.fullName) repoCounts[event.fullName] = (repoCounts[event.fullName] || 0) + 1;
    if (positiveTypes.has(type) || Number(event.weight || 0) > 0) positiveSignals += 1;
    if (negativeTypes.has(type) || Number(event.weight || 0) < 0) negativeSignals += 1;
  }

  const first = events[events.length - 1]?.at || "";
  const last = events[0]?.at || "";
  const topCategories = topEntriesFromCounts(categoryCounts);
  const topUseCases = topEntriesFromCounts(useCaseCounts);
  const topRepos = topEntriesFromCounts(repoCounts, 6);
  const topTypes = topEntriesFromCounts(typeCounts, 6);
  const summaryZh = events.length
    ? `压缩 ${events.length} 条历史行为，时间范围 ${first ? first.slice(0, 10) : "-"} 至 ${last ? last.slice(0, 10) : "-"}；正向信号 ${positiveSignals}，负向信号 ${negativeSignals}；主要分类 ${topCategories.map((item) => item.key).join("、") || "暂无"}；主要用途 ${topUseCases.map((item) => item.key).join("、") || "暂无"}。`
    : "暂无可压缩的历史行为。";
  const summaryEn = events.length
    ? `Compressed ${events.length} historical behavior events from ${first ? first.slice(0, 10) : "-"} to ${last ? last.slice(0, 10) : "-"}; positive signals ${positiveSignals}, negative signals ${negativeSignals}; top categories ${topCategories.map((item) => item.key).join(", ") || "none"}; top use cases ${topUseCases.map((item) => item.key).join(", ") || "none"}.`
    : "No historical behavior to compress yet.";

  return {
    first,
    last,
    eventCount: events.length,
    positiveSignals,
    negativeSignals,
    topCategories,
    topUseCases,
    topLanguages: topEntriesFromCounts(languageCounts),
    topLicenses: topEntriesFromCounts(licenseCounts),
    topRepositories: topRepos,
    topEventTypes: topTypes,
    summaryZh,
    summaryEn
  };
}

function compactMemoryContextInPlace(memory, options = {}) {
  const context = {
    ...defaultMemory().context,
    ...(memory.context || {})
  };
  const events = normalizedMemoryEvents(memory).sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
  const manual = Boolean(options.manual);
  const keepRecent = manual
    ? 0
    : Math.max(40, Math.min(220, Number(options.keepRecentEvents || context.keepRecentEvents || 120)));
  const compactAfter = Math.max(keepRecent + 20, Number(context.compactAfterEvents || 180));
  const force = Boolean(options.force);
  const shouldCompact = force || events.length > compactAfter;
  const compressible = events.slice(keepRecent);
  const retained = events.slice(0, keepRecent);
  const basis = compressible.length ? compressible : force ? events : [];
  const existingCompressedFact = Number(
    (context.permanentFacts || [])
      .find((fact) => String(fact).startsWith("compressed_events="))
      ?.split("=")[1] || 0
  );
  const existingCompressed = Math.max(
    existingCompressedFact,
    (context.chunks || []).reduce((sum, chunk) => sum + Number(chunk.eventCount || 0), 0)
  );
  const updateVolumeFacts = (rawCount, compressedCount) => {
    context.permanentFacts = [
      `raw_recent_events=${rawCount}`,
      `compressed_events=${compressedCount}`,
      ...(context.permanentFacts || []).filter(
        (fact) =>
          !String(fact).startsWith("raw_recent_events=") && !String(fact).startsWith("compressed_events=")
      )
    ];
  };

  if (!shouldCompact) {
    context.sourceEventCount = events.length;
    updateVolumeFacts(events.length, existingCompressed);
    memory.events = events.slice(0, Number(context.rawEventLimit || 300));
    memory.shortTerm = (memory.shortTerm || []).slice(0, Number(context.shortTermLimit || 80));
    memory.context = context;
    return {
      compacted: false,
      context
    };
  }

  const shouldCreateChunk = shouldCompact && basis.length > 0;
  if (shouldCompact && !basis.length) {
    context.sourceEventCount = events.length;
    updateVolumeFacts(retained.length, existingCompressed);
    memory.events = retained;
    memory.shortTerm = manual ? [] : (memory.shortTerm || []).slice(0, Number(context.shortTermLimit || 80));
    memory.context = context;
    return {
      compacted: false,
      context
    };
  }
  const digest = summarizeEventsForContext(basis);
  const nextCompressed = existingCompressed + (shouldCreateChunk ? digest.eventCount : 0);

  context.keepRecentEvents = manual ? context.keepRecentEvents : keepRecent;
  context.sourceEventCount = events.length;
  context.compressedAt = shouldCompact ? new Date().toISOString() : context.compressedAt || "";
  context.summaryZh = digest.summaryZh;
  context.summaryEn = digest.summaryEn;
  updateVolumeFacts(retained.length, nextCompressed);
  context.permanentFacts = [
    ...context.permanentFacts.filter(
      (fact) => !String(fact).startsWith("positive_signals=") && !String(fact).startsWith("negative_signals=")
    ),
    `positive_signals=${digest.positiveSignals}`,
    `negative_signals=${digest.negativeSignals}`
  ];
  context.preferenceEvidence = [
    ...digest.topCategories.map((item) => `category:${item.key} x${item.count}`),
    ...digest.topUseCases.map((item) => `useCase:${item.key} x${item.count}`),
    ...digest.topRepositories.slice(0, 3).map((item) => `repo:${item.key} x${item.count}`)
  ].slice(0, 12);
  context.openQuestions =
    digest.negativeSignals > digest.positiveSignals
      ? ["近期负反馈多于正反馈，需要确认是否应扩大探索比例。"]
      : ["继续观察偏好是否过度集中，避免形成信息茧房。"];

  if (shouldCreateChunk) {
    const chunk = {
      id: `ctx-${Date.now()}`,
      compressedAt: context.compressedAt,
      from: digest.first,
      to: digest.last,
      eventCount: digest.eventCount,
      positiveSignals: digest.positiveSignals,
      negativeSignals: digest.negativeSignals,
      summaryZh: digest.summaryZh,
      summaryEn: digest.summaryEn,
      topCategories: digest.topCategories,
      topUseCases: digest.topUseCases,
      topRepositories: digest.topRepositories
    };
    context.chunks = [chunk, ...(context.chunks || [])].slice(0, 20);
    memory.events = retained;
  } else {
    memory.events = events.slice(0, Number(context.rawEventLimit || 300));
  }

  memory.shortTerm = manual && shouldCreateChunk ? [] : (memory.shortTerm || []).slice(0, Number(context.shortTermLimit || 80));
  memory.context = context;
  return {
    compacted: shouldCreateChunk,
    context
  };
}

function uniqueCount(items, keyFn) {
  return new Set(items.map(keyFn).filter(Boolean)).size;
}

function average(items, keyFn) {
  if (!items.length) return 0;
  return items.reduce((sum, item) => sum + Number(keyFn(item) || 0), 0) / items.length;
}

function scorePercent(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

const SEMANTIC_STOP_TERMS = new Set([
  "and",
  "or",
  "the",
  "for",
  "with",
  "tool",
  "tools",
  "service",
  "services",
  "app",
  "apps",
  "project",
  "projects",
  "workflow",
  "workflows",
  "category",
  "usecase",
  "useCase",
  "工具",
  "服务",
  "项目",
  "应用",
  "能力",
  "问题",
  "场景",
  "需要该能力的人",
  "具体工作流问题",
  "工具/服务",
  "代码",
  "资料",
  "团队",
  "用户",
  "人群",
  "协作",
  "developers",
  "users",
  "teams",
  "design",
  "content",
  "developer",
  "business",
  "platform",
  "knowledge",
  "search"
]);

const SEMANTIC_TERM_GROUPS = [
  {
    match: ["图表白板", "原型表达", "whiteboarding", "frontend-creative"],
    terms: ["whiteboard", "diagram", "draw", "canvas", "flowchart", "wireframe", "prototype", "excalidraw", "figma", "design-editor"]
  },
  {
    match: ["代码与资料结构理解", "code and knowledge", "knowledge-graph"],
    terms: ["knowledge-graph", "graphify", "code-graph", "understand-anything", "interactive-graph", "architecture-map"]
  },
  {
    match: ["资料检索", "知识问答", "knowledge search"],
    terms: ["rag", "vector", "semantic-search", "knowledge-base", "notebook", "document-search", "qa", "question-answering"]
  },
  {
    match: ["网页任务自动化", "browser task", "browser-automation"],
    terms: ["browser-automation", "browser-use", "browser-harness", "browser-agent", "web-automation", "scraping", "crawler"]
  },
  {
    match: ["长期记忆", "long-term memory", "ai-memory"],
    terms: ["ai-memory", "memory-layer", "long-term-memory", "persistent-context", "personalized-ai", "preference-memory"]
  },
  {
    match: ["多助手任务", "任务自动化", "agent task", "ai-workflow"],
    terms: ["multi-agent", "agentic", "orchestrat", "workflow", "automation", "swarm", "mcp", "autonomous", "task-execution"]
  },
  {
    match: ["专家角色", "提示词", "expert role", "ai-role-library"],
    terms: ["ai-role-library", "prompt", "persona", "agent-definition", "expert-role", "role-library", "prompt-library"]
  },
  {
    match: ["研发流程", "编程效率", "engineering productivity", "ai-assistant"],
    terms: ["developer-tools", "developer-productivity", "ai-coding", "claude-code", "codex", "cursor", "cli", "terminal", "code-review", "ide"]
  },
  {
    match: ["数据看板", "业务管理", "business dashboard", "business-saas"],
    terms: ["dashboard", "admin", "backoffice", "crm", "erp", "analytics", "report", "business-saas", "admin-saas", "internal-tool"]
  },
  {
    match: ["视频制作", "video creation", "creative-video-editing"],
    terms: ["video", "subtitle", "caption", "timeline", "shorts", "render", "screen-studio", "video-editor", "creative-media"]
  },
  {
    match: ["音频音乐", "语音创作", "audio creation", "creative-audio-music"],
    terms: ["audio", "music", "voice", "tts", "podcast", "speech", "sound", "mixing", "creative-media"]
  },
  {
    match: ["设计系统", "界面生成", "design systems", "ai-design-tool"],
    terms: ["design-system", "figma", "design-token", "ui-generator", "prototype", "brand", "style-guide", "design-reference"]
  },
  {
    match: ["内容商业", "增长运营", "commerce", "growth"],
    terms: ["commerce", "ecommerce", "cms", "marketing", "growth", "content-management", "shopify", "storefront", "seo"]
  },
  {
    match: ["部署运维", "平台能力", "platform operations", "infra-cloud"],
    terms: ["infra-cloud", "kubernetes", "cloud", "deploy", "deployment", "observability", "monitoring", "sre", "platform-engineering"]
  },
  {
    match: ["安全检查", "合规治理", "security review", "security-tools"],
    terms: ["security", "vulnerability", "scanner", "privacy", "audit", "compliance", "owasp", "secret-scanning", "security-scanning"]
  },
  {
    match: ["接口调试", "api debugging"],
    terms: ["api", "api-client", "api-testing", "graphql", "rest-client", "http-client", "postman", "insomnia", "openapi"]
  },
  {
    match: ["学习资料", "实践样例", "learning assets"],
    terms: ["learning-assets", "course", "tutorial", "learn", "from-scratch", "guide", "examples", "awesome", "best-practice"]
  },
  {
    match: ["设计与内容团队", "design and content"],
    terms: ["designer", "design-system", "figma", "prototype", "whiteboard", "ui-generator", "creative-media", "video-editor"]
  },
  {
    match: ["开发者与知识工作者", "developers and knowledge"],
    terms: ["developer-tools", "developer-productivity", "knowledge-search", "knowledge-graph", "code-review", "technical-docs"]
  },
  {
    match: ["开发者", "developers"],
    terms: ["developer-tools", "developer-productivity", "cli", "terminal", "sdk", "ide", "code-review", "ai-coding"]
  },
  {
    match: ["内容创作者", "creators"],
    terms: ["video", "audio", "music", "podcast", "subtitle", "caption", "creative-media", "video-editor"]
  },
  {
    match: ["业务与运营团队", "business teams"],
    terms: ["dashboard", "crm", "erp", "marketing", "growth", "commerce", "analytics", "backoffice"]
  },
  {
    match: ["平台与运维团队", "platform teams"],
    terms: ["sre", "ops", "devops", "kubernetes", "observability", "monitoring", "deployment", "platform-engineering"]
  },
  {
    match: ["安全与合规团队", "security teams"],
    terms: ["security", "privacy", "compliance", "audit", "vulnerability", "scanner"]
  },
  {
    match: ["个人用户", "individual users"],
    terms: ["personal", "productivity", "notes", "calendar", "task", "desktop", "mobile", "local-first"]
  },
  {
    match: ["浏览器插件", "browser plugin"],
    terms: ["browser-extension", "chrome-extension", "firefox-extension", "webextension"]
  },
  {
    match: ["插件/扩展工具", "插件", "plugin/extension tool", "plugin"],
    terms: ["plugin", "extension", "addon", "workbench", "connector", "integration"]
  },
  {
    match: ["创作编辑器", "creative editor"],
    terms: ["creative-editor", "visual-editor", "html-editor", "page-builder", "canvas-editor", "prototype", "ui-generator", "design-to-code", "editor-workbench"]
  },
  {
    match: ["知识图谱工具", "knowledge graph tool"],
    terms: ["knowledge-graph", "graphify", "code-graph", "interactive-graph", "understand-anything"]
  },
  {
    match: ["任务控制台", "task control"],
    terms: ["console", "dashboard", "mission-control", "task-control", "workflow", "orchestrat", "multi-agent"]
  },
  {
    match: ["模板工程", "template project"],
    terms: ["template", "starter", "boilerplate", "scaffold", "starter-kit", "product-starter", "full-stack"]
  },
  {
    match: ["cli 工具", "cli tool"],
    terms: ["cli", "terminal", "command-line", "tui", "shell"]
  },
  {
    match: ["api 服务", "api service"],
    terms: ["api-service", "api-client", "sdk", "gateway", "proxy", "openapi"]
  },
  {
    match: ["web 工作台", "web workspace"],
    terms: ["web-workspace", "dashboard", "admin", "console", "studio", "workbench"]
  },
  {
    match: ["自托管平台", "self-hosted platform"],
    terms: ["self-hosted", "selfhosted", "docker-compose", "private-deployment"]
  },
  {
    match: ["效率应用", "productivity app"],
    terms: ["productivity", "task", "notes", "calendar", "desktop", "mobile", "personal"]
  }
];

const SEMANTIC_KEY_PATTERNS = {
  "cad-nx-automation": /\bugnx\b|ug\s*nx|siemens\s+nx|nx\s*open\b|nxopen(?!api|gl)|ugopen|unigraphics|postbuilder|post\s*processor|\bmom\b|nx cad|nx cam|nx cae/i,
  "audience-cad-engineering-users": /\bugnx\b|ug\s*nx|siemens\s+nx|nx\s*open\b|nxopen(?!api|gl)|ugopen|unigraphics|cad|cam|cae|cnc|mechanical engineering|manufacturing/i,
  "shape-cad-nx-plugin": /\bugnx\b|ug\s*nx|siemens\s+nx|nx\s*open\b|nxopen(?!api|gl)|ugopen|unigraphics|postbuilder|post\s*processor|nx\s+(?:cad|cam|cae|plugin|extension|addon|workbench|journal|automation)|(?:plugin|extension|addon|workbench|journal|automation).{0,80}\b(?:ugnx|ug\s*nx|siemens\s+nx|nxopen|nx\s*open|ugopen|unigraphics)\b/i,

  "ai-role-library": /agency[-\s_]?agents|agent definitions?|expert roles?|personas?|prompt library|prompt collection|即插即用的 AI 专家角色/i,
  "content-page-generation": /html[-\s_]?anything|agentic html editor|magazine pages|posters?|rednote|x posts?|tweet|data reports?|page generation|content page/i,
  "knowledge-graph": /knowledge graph|interactive knowledge graph|queryable knowledge graph|graphify|code graph|understand[-\s_]?anything|architecture map/i,
  "browser-automation": /browser[-\s_]?harness|browser[-\s_]?use|browser[-\s_]?automation|browser agent|web automation|websites accessible|scraping|crawler/i,
  "ai-memory": /mem0|memory layer|ai memory|memory for ai|personalized ai|long[-\s]?term memory|persistent context|preference memory/i,
  "spec-driven-dev": /spec[-\s]?kit|spec[-\s]?driven|specification|requirements? to implementation/i,
  "document-extraction": /langextract|information extraction|structured extraction|source grounding|ocr|pdf extraction|document processing|document parsing/i,
  "design-system-extraction": /design tokens?|dtcg|figma variables|extract.*design system|design system.*extract|css health audit|tailwind v4|shadcn\/ui/i,
  "design-to-code-editing": /design-to-code|figma-alternative|cursor for designers|visually build|edit your react app|ui generator|prompt\s*[→-]\s*prototype|prompt.*prototype/i,
  "ai-coding-workflow": /claude code|cursor|opencode|ai coding|agent harness|code review|coding assistant|developer assistant/i,
  "mcp-tooling": /mcp[-\s_]?server|mcp registry|model context protocol|\bmcp\b|tool integration/i,
  "workflow-automation": /trigger\.dev|activepieces|zapier|n8n|workflow automation|automation workflow|pipeline automation|task automation/i,
  "agent-coordination": /leading agent orchestration platform|multi[-\s]?agent|multi-agent swarms|autonomous workflows|mission[-\s]?control|openclaw multi-agent orchestration|swarm|orchestrat|三省六部制|ruflo|edict/i,
  "whiteboard-prototyping": /whiteboard|diagram|draw|canvas|excalidraw|flowchart|wireframe|prototype|visual editor/i,
  "knowledge-search": /rag|knowledge base|semantic search|vector search|notebook|document search|document chat|qa system|question answering|问答|知识库/i,
  "presentation-generation": /ppt|powerpoint|presentation|slides?|pptx|deck/i,
  "video-production": /video|subtitle|caption|timeline|screen studio|demo|shorts|render video|video editor/i,
  "voice-clone-transcription": /voice[-\s]?clone|voice ai|tts|speech synthesis|dictate|whisper|transcription/i,
  "audio-production": /audio|music|voice|tts|podcast|speech|sound|mixing/i,
  "design-system-generation": /design system|figma|design token|brand|ui generator|design[-\s_]?md|design-to-code|design tools?|prototyping|style guide/i,
  "testing-code-review": /code review|testing tool|unit test|e2e test|lint|debugger|quality gate|static analysis/i,
  "cli-local-devtools": /developer tool|devtool|ide|sdk|terminal|command line|command-line|shell|tui/i,
  "finance-trading": /trading|quantitative[-\s]?finance|quantitative[-\s]?trading|stock analysis|market data|portfolio tracker|invoice|accounting|股票|行情|量化|交易|财务/i,
  "data-visualization": /data visualization|metrics dashboard|analytics dashboard|business intelligence|warehouse|etl pipeline/i,
  "business-operations": /crm\b|erp\b|backoffice|admin panel|business system|customer portal|enterprise resource planning|工单|客服|进销存/i,
  "business-dashboard": /dashboard|admin|backoffice|crm\b|erp\b|analytics|superset|report|business intelligence|internal tool/i,
  "commerce-growth": /payment|commerce|ecommerce|cms|marketing|growth|content management|shopify|storefront|seo/i,
  "file-transfer-sync": /download|file transfer|sync|send|localsend|storage|backup/i,
  "platform-operations": /self[-\s]?hosted|docker compose|deployment|cloud|kubernetes|observability|monitoring|sre|devops/i,
  "security-compliance": /security|vulnerability|scanner|privacy|audit|compliance|owasp|attack|secret scanning/i,
  "api-debugging": /api client|api testing|api debug|postman|insomnia|graphql client|rest client|http client|request inspector|endpoint testing|openapi mock/i,
  "learning-assets": /course|tutorial|learn|awesome|example|examples|from[-\s]?scratch|guide|educational|teaching|best practice/i,
  "ai-assistant-automation": /agentic workflow|ai[-\s]?agent|ai agents?|copilot|autonomous agent|agentic|assistant/i,

  "audience-ai-builders": /agency[-\s_]?agents|agent definitions?|expert roles?|personas?|prompt library|prompt collection|ai app|ai builder/i,
  "audience-design-system-maintainers": /design tokens?|dtcg|figma variables|extract.*design system|design system.*extract|css health audit|tailwind v4|shadcn\/ui/i,
  "audience-design-frontend-devs": /design-to-code|figma-alternative|cursor for designers|visually build|edit your react app|ui generator|prompt\s*[→-]\s*prototype|prompt.*prototype/i,
  "audience-ai-coding-users": /claude code|cursor|opencode|ai coding|agent harness|code review|coding assistant|developer assistant/i,
  "audience-tool-integrators": /mcp[-\s_]?server|mcp registry|model context protocol|\bmcp\b|tool integration|sdk|plugin/i,
  "audience-api-backend-devs": /api client|api testing|api debug|postman|insomnia|graphql client|rest client|http client|sdk|openapi|backend/i,
  "audience-workflow-builders": /trigger\.dev|activepieces|zapier|n8n|workflow automation|automation workflow|pipeline automation|task automation/i,
  "audience-automation-ai-teams": /multi[-\s]?agent|autonomous workflows|mission[-\s]?control|orchestrat|workflow automation|ai agents?|swarm/i,
  "audience-dev-knowledge-workers": /knowledge graph|code graph|understand[-\s_]?anything|technical docs|document search|knowledge base|developer productivity/i,
  "audience-design-content-teams": /html[-\s_]?anything|prototype|design|figma|whiteboard|diagram|canvas|ui generator|content page/i,
  "audience-research-knowledge-managers": /rag|knowledge base|semantic search|vector search|notebook|document search|document chat|paper|research/i,
  "audience-audio-podcasters": /voice[-\s]?clone|voice ai|tts|speech synthesis|dictate|whisper|transcription/i,
  "audience-creators": /video|audio|music|podcast|voice|subtitle|caption|creator|content creation/i,
  "audience-automation-ops-teams": /browser[-\s_]?automation|browser agent|web automation|scraping|crawler|ops automation/i,
  "audience-developers": /developer tool|devtool|coding|cli|terminal|ide|sdk|code review|testing tool/i,
  "audience-finance-operators": /trading|quantitative[-\s]?finance|quantitative[-\s]?trading|stock analysis|market data|portfolio tracker|invoice|accounting|股票|行情|量化|交易|财务/i,
  "audience-data-analysts": /data visualization|metrics dashboard|analytics dashboard|business intelligence|warehouse|etl pipeline/i,
  "audience-business-ops-teams": /admin|dashboard|crm\b|erp\b|saas|business|commerce|marketing|growth|analytics|backoffice/i,
  "audience-research-knowledge-workers": /rag|knowledge|research|notebook|document|paper|learning|course|tutorial|semantic search/i,
  "audience-security-teams": /security|privacy|compliance|audit|vulnerability|owasp|scanner/i,
  "audience-platform-ops-teams": /kubernetes|cloud|observability|monitoring|deployment|infra|platform|devops|sre/i,
  "audience-individual-users": /local[-\s]?first|notes?|calendar|task|productivity|personal|desktop|mobile|bookmark/i,

  "shape-browser-plugin": /browser extension|chrome extension|firefox extension|edge extension|safari extension|webextension/i,
  "shape-plugin-extension-tool": /(?:^|[^a-z0-9])(?:plugin|plugins|extension|extensions|addon|addons|add-on|add-ons|workbench|connector|integration)(?:[^a-z0-9]|$)|插件|扩展/i,
  "shape-role-prompt-library": /agency[-\s_]?agents|agent definitions?|expert roles?|personas?|prompt library|prompt collection/i,
  "shape-ai-coding-workspace": /claude code|cursor|opencode|ai coding|agent harness|code review|coding workspace|developer assistant/i,
  "shape-mcp-tool-service": /mcp[-\s_]?server|mcp registry|model context protocol|\bmcp\b|tool service/i,
  "shape-workflow-platform": /trigger\.dev|activepieces|zapier|n8n|workflow automation|automation workflow|pipeline automation|task automation/i,
  "shape-creative-editor": /html[-\s_]?anything|agentic html editor|magazine pages|posters?|rednote|x posts?|prototype|design studio|design-to-code|ui generator|figma|creative editor|visual editor|page builder/i,
  "shape-knowledge-graph-tool": /knowledge graph|interactive knowledge graph|queryable knowledge graph|graphify|code graph|understand[-\s_]?anything/i,
  "shape-memory-service": /mem0|memory layer|ai memory|long[-\s]?term memory|persistent context|preference memory/i,
  "shape-task-console": /mission[-\s]?control|task control|task console|multi[-\s]?agent|orchestrat|autonomous workflows/i,
  "shape-learning-library": /course|tutorial|learn|awesome|example|examples|from[-\s]?scratch|guide|learning library/i,
  "shape-self-hosted-platform": /self[-\s]?hosted|selfhosted|docker compose|private deployment|deployment platform/i,
  "shape-desktop-app": /desktop|electron|macos|windows|linux/i,
  "shape-mobile-app": /mobile|android|ios|flutter/i,
  "shape-template-project": /template|starter|boilerplate|scaffold|starter kit|full[-\s]?stack/i,
  "shape-cli-tool": /cli|terminal|command line|command-line|tui|shell/i,
  "shape-api-service": /api service|api client|api testing|sdk|gateway|proxy|openapi/i,
  "shape-design-governance-tool": /design tokens?|dtcg|figma variables|extract.*design system|design system.*extract|css health audit|tailwind v4|shadcn\/ui/i,
  "shape-ui-generation-editor": /design-to-code|figma-alternative|cursor for designers|visually build|edit your react app|ui generator|prompt\s*[→-]\s*prototype|prompt.*prototype/i,
  "shape-automation-workflow": /workflow|automation|agent|orchestrat|mcp|pipeline automation/i,
  "shape-knowledge-qa-system": /rag|knowledge base|semantic search|vector search|document chat|question answering|qa system/i,
  "shape-video-creation-studio": /video editor|timeline|subtitle|caption|shorts|render video|screen studio/i,
  "shape-voice-studio": /voice[-\s]?clone|voice ai|tts|speech synthesis|dictate|whisper|transcription/i,
  "shape-web-workspace": /dashboard|admin|backoffice|crm\b|erp\b|analytics dashboard|web ui|web app|workbench|studio/i,
  "shape-framework-library": /library|framework|package|component|engine/i,

  "ai-workflow": /multi[-\s]?agent|agentic workflow|autonomous workflows|orchestrat|swarm|ai[-\s]?agent|assistant/i,
  "frontend-creative": /whiteboard|diagram|canvas|prototype|design|figma|ui generator|creative editor|html editor/i,
  "creative-video-editing": /video|subtitle|caption|timeline|shorts|render video|video editor/i,
  "creative-audio-music": /audio|music|voice|tts|podcast|speech/i,
  "ai-design-tool": /design system|figma|design token|ui generator|prototype|brand/i,
  "business-saas": /dashboard|admin|backoffice|crm\b|erp\b|analytics|report|saas/i,
  "consumer-productivity": /download|file transfer|sync|notes?|calendar|task|productivity|personal/i,
  "infra-cloud": /self[-\s]?hosted|docker compose|deployment|cloud|kubernetes|observability|monitoring/i,
  "security-tools": /security|vulnerability|scanner|privacy|audit|compliance|owasp/i
};

const SEMANTIC_KEY_RULES = {
  problem: [
    "cad-nx-automation",
    "ai-role-library",
    "content-page-generation",
    "knowledge-graph",
    "browser-automation",
    "ai-memory",
    "spec-driven-dev",
    "finance-trading",
    "document-extraction",
    "design-system-extraction",
    "design-to-code-editing",
    "whiteboard-prototyping",
    "design-system-generation",
    "ai-coding-workflow",
    "mcp-tooling",
    "workflow-automation",
    "agent-coordination",
    "knowledge-search",
    "presentation-generation",
    "video-production",
    "voice-clone-transcription",
    "audio-production",
    "testing-code-review",
    "cli-local-devtools",
    "data-visualization",
    "business-operations",
    "business-dashboard",
    "commerce-growth",
    "file-transfer-sync",
    "platform-operations",
    "security-compliance",
    "api-debugging",
    "learning-assets",
    "ai-assistant-automation"
  ],
  audience: [
    "audience-cad-engineering-users",
    "audience-ai-builders",
    "audience-design-system-maintainers",
    "audience-design-frontend-devs",
    "audience-design-content-teams",
    "audience-dev-knowledge-workers",
    "audience-research-knowledge-managers",
    "audience-audio-podcasters",
    "audience-creators",
    "audience-api-backend-devs",
    "audience-workflow-builders",
    "audience-automation-ai-teams",
    "audience-automation-ops-teams",
    "audience-tool-integrators",
    "audience-ai-coding-users",
    "audience-developers",
    "audience-finance-operators",
    "audience-data-analysts",
    "audience-business-ops-teams",
    "audience-research-knowledge-workers",
    "audience-security-teams",
    "audience-platform-ops-teams",
    "audience-individual-users"
  ],
  shape: [
    "shape-cad-nx-plugin",
    "shape-browser-plugin",
    "shape-plugin-extension-tool",
    "shape-design-governance-tool",
    "shape-ui-generation-editor",
    "shape-desktop-app",
    "shape-mobile-app",
    "shape-template-project",
    "shape-cli-tool",
    "shape-api-service",
    "shape-self-hosted-platform",
    "shape-creative-editor",
    "shape-knowledge-qa-system",
    "shape-knowledge-graph-tool",
    "shape-video-creation-studio",
    "shape-voice-studio",
    "shape-memory-service",
    "shape-role-prompt-library",
    "shape-task-console",
    "shape-workflow-platform",
    "shape-mcp-tool-service",
    "shape-ai-coding-workspace",
    "shape-learning-library",
    "shape-automation-workflow",
    "shape-web-workspace",
    "shape-framework-library"
  ]
};

const SEMANTIC_FILTER_CORE_KEYS = {
  problem: [
    "cad-nx-automation",
    "knowledge-search",
    "document-extraction",
    "data-visualization",
    "business-operations",
    "workflow-automation",
    "browser-automation",
    "api-debugging",
    "testing-code-review",
    "ai-coding-workflow",
    "design-to-code-editing",
    "video-production",
    "audio-production",
    "commerce-growth",
    "finance-trading",
    "platform-operations",
    "security-compliance"
  ],
  audience: [
    "audience-cad-engineering-users",
    "audience-creators",
    "audience-design-content-teams",
    "audience-design-frontend-devs",
    "audience-developers",
    "audience-ai-coding-users",
    "audience-api-backend-devs",
    "audience-workflow-builders",
    "audience-business-ops-teams",
    "audience-data-analysts",
    "audience-research-knowledge-managers",
    "audience-security-teams",
    "audience-platform-ops-teams",
    "audience-individual-users"
  ],
  shape: [
    "shape-cad-nx-plugin",
    "shape-web-workspace",
    "shape-creative-editor",
    "shape-ui-generation-editor",
    "shape-video-creation-studio",
    "shape-voice-studio",
    "shape-knowledge-qa-system",
    "shape-workflow-platform",
    "shape-browser-plugin",
    "shape-plugin-extension-tool",
    "shape-cli-tool",
    "shape-api-service",
    "shape-self-hosted-platform",
    "shape-template-project",
    "shape-desktop-app",
    "shape-mobile-app"
  ]
};

const SEMANTIC_LABELS = {
  problem: {
    "cad-nx-automation": ["工程 CAD/NX 自动化", "Engineering CAD/NX automation"],
    "ai-role-library": ["专家角色与提示词复用", "Expert role reuse"],
    "content-page-generation": ["内容页面与原型生成", "Content page generation"],
    "knowledge-graph": ["代码与资料结构理解", "Code and knowledge mapping"],
    "browser-automation": ["网页任务自动化", "Browser task automation"],
    "ai-memory": ["长期记忆与偏好管理", "Long-term memory"],
    "spec-driven-dev": ["需求规格到实现路径", "Spec to implementation"],
    "finance-trading": ["金融交易与财务分析", "Finance and trading analysis"],
    "document-extraction": ["文档解析与信息抽取", "Document extraction"],
    "design-system-extraction": ["设计系统抽取与规范管理", "Design system extraction"],
    "design-to-code-editing": ["设计稿转代码与界面编辑", "Design-to-code editing"],
    "whiteboard-prototyping": ["图表白板与原型表达", "Whiteboarding"],
    "design-system-generation": ["设计系统与界面生成", "Design systems"],
    "ai-coding-workflow": ["AI 编程与命令行协作", "AI coding workflow"],
    "mcp-tooling": ["工具接入与 MCP 扩展", "MCP tool integration"],
    "workflow-automation": ["业务流程自动化", "Workflow automation"],
    "agent-coordination": ["多助手任务调度与执行", "Agent task coordination"],
    "knowledge-search": ["知识库检索与 RAG 问答", "RAG knowledge search"],
    "presentation-generation": ["文档与演示生成", "Presentation generation"],
    "video-production": ["视频剪辑与短内容制作", "Video editing"],
    "voice-clone-transcription": ["语音克隆与转写合成", "Voice cloning and transcription"],
    "audio-production": ["音频音乐与语音创作", "Audio creation"],
    "testing-code-review": ["测试质量与代码审查", "Testing and code review"],
    "cli-local-devtools": ["命令行与本地开发工具", "CLI and local dev tools"],
    "data-visualization": ["数据可视化与指标分析", "Data visualization"],
    "business-operations": ["业务流程与后台管理", "Business operations"],
    "business-dashboard": ["数据看板与业务管理", "Business dashboard"],
    "commerce-growth": ["内容商业与增长运营", "Commerce and growth"],
    "file-transfer-sync": ["文件传输与资料同步", "File transfer"],
    "platform-operations": ["部署运维与平台能力", "Platform operations"],
    "security-compliance": ["安全检查与合规治理", "Security review"],
    "api-debugging": ["接口调试与测试", "API debugging"],
    "learning-assets": ["学习资料与实践样例", "Learning assets"],
    "ai-assistant-automation": ["任务自动化与 AI 助手", "AI automation"]
  },
  audience: {
    "audience-cad-engineering-users": ["CAD/CAM 工程用户", "CAD/CAM engineering users"],
    "audience-ai-builders": ["AI 应用搭建者", "AI builders"],
    "audience-design-system-maintainers": ["设计系统维护者", "Design system maintainers"],
    "audience-design-frontend-devs": ["设计师与前端开发者", "Designers and frontend developers"],
    "audience-design-content-teams": ["设计与内容团队", "Design and content teams"],
    "audience-dev-knowledge-workers": ["开发者与知识工作者", "Developers and knowledge workers"],
    "audience-research-knowledge-managers": ["研究者与知识管理者", "Researchers and knowledge managers"],
    "audience-audio-podcasters": ["音频创作者与播客团队", "Audio creators and podcasters"],
    "audience-creators": ["内容创作者", "Creators"],
    "audience-api-backend-devs": ["API 与后端开发者", "API and backend developers"],
    "audience-workflow-builders": ["流程自动化搭建者", "Workflow automation builders"],
    "audience-automation-ai-teams": ["自动化与 AI 应用团队", "Automation and AI app teams"],
    "audience-automation-ops-teams": ["自动化与运营团队", "Automation teams"],
    "audience-tool-integrators": ["工具集成开发者", "Tool integration developers"],
    "audience-ai-coding-users": ["AI 编程用户", "AI coding users"],
    "audience-developers": ["开发者", "Developers"],
    "audience-finance-operators": ["金融与财务从业者", "Finance operators"],
    "audience-data-analysts": ["数据分析师", "Data analysts"],
    "audience-business-ops-teams": ["业务与运营团队", "Business teams"],
    "audience-research-knowledge-workers": ["研究者与知识工作者", "Knowledge workers"],
    "audience-security-teams": ["安全与合规团队", "Security teams"],
    "audience-platform-ops-teams": ["平台与运维团队", "Platform teams"],
    "audience-individual-users": ["个人用户", "Individual users"]
  },
  shape: {
    "shape-cad-nx-plugin": ["工程插件/自动化工具", "Engineering plugin/automation tool"],
    "shape-browser-plugin": ["浏览器插件", "Browser plugin"],
    "shape-plugin-extension-tool": ["插件/扩展工具", "Plugin/extension tool"],
    "shape-design-governance-tool": ["设计规范工具", "Design governance tool"],
    "shape-ui-generation-editor": ["界面生成编辑器", "UI generation editor"],
    "shape-desktop-app": ["桌面应用", "Desktop app"],
    "shape-mobile-app": ["移动应用", "Mobile app"],
    "shape-template-project": ["模板工程", "Template project"],
    "shape-cli-tool": ["CLI 工具", "CLI tool"],
    "shape-api-service": ["API 服务", "API service"],
    "shape-self-hosted-platform": ["自托管平台", "Self-hosted platform"],
    "shape-creative-editor": ["创作编辑器", "Creative editor"],
    "shape-knowledge-qa-system": ["知识库问答系统", "Knowledge Q&A system"],
    "shape-knowledge-graph-tool": ["知识图谱工具", "Knowledge graph tool"],
    "shape-video-creation-studio": ["视频创作工作台", "Video creation studio"],
    "shape-voice-studio": ["语音工作台", "Voice studio"],
    "shape-memory-service": ["记忆服务", "Memory service"],
    "shape-role-prompt-library": ["角色/提示词库", "Role and prompt library"],
    "shape-task-console": ["任务控制台", "Task control console"],
    "shape-workflow-platform": ["流程自动化平台", "Workflow automation platform"],
    "shape-mcp-tool-service": ["MCP 工具服务", "MCP tool service"],
    "shape-ai-coding-workspace": ["AI 编程工作台", "AI coding workspace"],
    "shape-learning-library": ["学习/案例库", "Learning library"],
    "shape-automation-workflow": ["自动化工作流", "Automation workflow"],
    "shape-web-workspace": ["Web 工作台", "Web workspace"],
    "shape-framework-library": ["框架/库", "Framework/library"]
  }
};

function normalizeSemanticText(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[./_]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function addSemanticTerm(target, value = "") {
  const normalized = normalizeSemanticText(value);
  if (!normalized || SEMANTIC_STOP_TERMS.has(normalized)) return;
  if (/^[a-z0-9-]+$/.test(normalized) && normalized.length < 3) return;
  target.add(normalized);
}

function addSemanticTextTerms(target, value = "") {
  const raw = String(value || "").trim();
  if (!raw) return;
  addSemanticTerm(target, raw);
  raw
    .split(/[|,，、/：:]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => addSemanticTerm(target, item));
}

function semanticTermsFromTag(rawValue = "") {
  const [semanticKind = "", payload = ""] = String(rawValue || "").split(/:(.*)/s);
  const payloadParts = payload
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
  const semanticKey =
    payloadParts.map(normalizeSemanticText).find((part) => SEMANTIC_KEY_PATTERNS[part]) || "";
  const visibleParts = [...payloadParts];
  const filterKind = normalizeSemanticText(visibleParts.at(-1) || "");
  if ((filterKind === "category" || filterKind === "usecase" || filterKind === "use-case") && visibleParts.length >= 3) {
    visibleParts.splice(-2, 2);
  }
  const normalizedPayload = visibleParts.map(normalizeSemanticText).join("|");
  const terms = new Set();
  addSemanticTerm(terms, semanticKind);
  visibleParts.forEach((part) => addSemanticTextTerms(terms, part));

  for (const group of SEMANTIC_TERM_GROUPS) {
    if (group.match.some((item) => normalizedPayload.includes(normalizeSemanticText(item)))) {
      group.terms.forEach((term) => addSemanticTerm(terms, term));
    }
  }

  terms.delete(normalizeSemanticText(semanticKind));
  return {
    kind: normalizeSemanticText(semanticKind),
    key: semanticKey,
    terms: Array.from(terms)
  };
}

function semanticHaystackParts(project, options = {}) {
  const capabilityTags = options.includeCapabilities === false ? [] : projectCapabilityTags(project);
  return [
    project.fullName,
    project.owner,
    project.name,
    project.description,
    project.homepage,
    project.language,
    project.useCase?.key,
    project.useCase?.label,
    project.useCase?.labelZh,
    project.useCase?.labelEn,
    project.useCase?.summaryZh,
    project.useCase?.summaryEn,
    ...(project.topics || []),
    ...(project.reasons || []),
    ...(project.actions || []),
    ...capabilityTags.flatMap((tag) => [tag.key, tag.labelZh, tag.labelEn])
  ]
    .filter(Boolean);
}

function semanticRawHaystack(project, options = {}) {
  return semanticHaystackParts(project, options).join(" ");
}

function semanticSourceHaystack(project) {
  return [
    project.fullName,
    project.owner,
    project.name,
    project.description,
    project.homepage,
    project.language,
    ...(project.topics || [])
  ]
    .filter(Boolean)
    .join(" ");
}

function semanticHaystack(project) {
  return semanticHaystackParts(project).map(normalizeSemanticText).join(" ");
}

function projectSemanticKey(project, kind = "") {
  const rules = SEMANTIC_KEY_RULES[kind] || [];
  if (!rules.length) return "";
  const haystack = semanticSourceHaystack(project);
  return rules.find((key) => SEMANTIC_KEY_PATTERNS[key]?.test(haystack)) || "";
}

function semanticFallbackKey(project, kind = "") {
  const category = project.category?.key || "other";
  const map = {
    problem: {
      "product-starters": "business-operations",
      "ai-native-products": "ai-assistant-automation",
      "developer-productivity": "cli-local-devtools",
      "business-saas": "business-dashboard",
      "data-knowledge": "knowledge-search",
      "infra-cloud": "platform-operations",
      "security-compliance": "security-compliance",
      "frontend-creative": "design-to-code-editing",
      "creative-media": "video-production",
      "consumer-productivity": "file-transfer-sync",
      "commerce-growth-content": "commerce-growth",
      "learning-research-assets": "learning-assets",
      "engineering-cad-nx": "cad-nx-automation"
    },
    audience: {
      "product-starters": "audience-developers",
      "ai-native-products": "audience-ai-builders",
      "developer-productivity": "audience-developers",
      "business-saas": "audience-business-ops-teams",
      "data-knowledge": "audience-research-knowledge-workers",
      "infra-cloud": "audience-platform-ops-teams",
      "security-compliance": "audience-security-teams",
      "frontend-creative": "audience-design-frontend-devs",
      "creative-media": "audience-creators",
      "consumer-productivity": "audience-individual-users",
      "commerce-growth-content": "audience-business-ops-teams",
      "learning-research-assets": "audience-research-knowledge-workers",
      "engineering-cad-nx": "audience-cad-engineering-users"
    },
    shape: {
      "product-starters": "shape-template-project",
      "ai-native-products": "shape-automation-workflow",
      "developer-productivity": "shape-cli-tool",
      "business-saas": "shape-web-workspace",
      "data-knowledge": "shape-knowledge-qa-system",
      "infra-cloud": "shape-self-hosted-platform",
      "security-compliance": "shape-framework-library",
      "frontend-creative": "shape-creative-editor",
      "creative-media": "shape-video-creation-studio",
      "consumer-productivity": "shape-desktop-app",
      "commerce-growth-content": "shape-web-workspace",
      "learning-research-assets": "shape-learning-library",
      "engineering-cad-nx": "shape-cad-nx-plugin"
    }
  };
  return map[kind]?.[category] || "";
}

function projectSemanticProfile(project) {
  if (project?._semanticProfile) return project._semanticProfile;
  if (project?.category?.key === "engineering-cad-nx" || isNxCadRepository(project)) {
    return {
      problem: "cad-nx-automation",
      audience: "audience-cad-engineering-users",
      shape: "shape-cad-nx-plugin"
    };
  }
  return {
    problem: projectSemanticKey(project, "problem") || semanticFallbackKey(project, "problem"),
    audience: projectSemanticKey(project, "audience") || semanticFallbackKey(project, "audience"),
    shape: projectSemanticKey(project, "shape") || semanticFallbackKey(project, "shape")
  };
}

function projectSemanticPayload(project) {
  const profile = projectSemanticProfile(project);
  return Object.fromEntries(
    Object.entries(profile).map(([kind, key]) => {
      const labels = semanticLabel(kind, key);
      return [
        kind,
        {
          key,
          value: semanticFilterValue(kind, key),
          labelZh: labels.labelZh,
          labelEn: labels.labelEn
        }
      ];
    })
  );
}

function semanticLabel(kind = "", key = "") {
  const labels = SEMANTIC_LABELS[kind]?.[key];
  if (labels) {
    return {
      labelZh: labels[0],
      labelEn: labels[1]
    };
  }
  return {
    labelZh: key,
    labelEn: key
  };
}

const EMERGING_SEMANTIC_BLOCKLIST = new Set([
  "ai",
  "agent",
  "agents",
  "ai-agent",
  "ai-agents",
  "llm-agent",
  "llm-agents",
  "llm",
  "generative-ai",
  "artificial-intelligence",
  "machine-learning",
  "deep-learning",
  "open-source",
  "opensource",
  "github",
  "tool",
  "tools",
  "app",
  "apps",
  "web",
  "frontend",
  "backend",
  "fullstack",
  "typescript",
  "javascript",
  "python",
  "java",
  "golang",
  "rust",
  "react",
  "vue",
  "svelte",
  "nextjs",
  "nodejs",
  "html",
  "css",
  "tailwindcss",
  "docker",
  "library",
  "framework",
  "awesome",
  "list",
  "demo",
  "example",
  "examples",
  "hacktoberfest",
  "good-first-issue",
  "good-first-issues",
  "help-wanted",
  "beginner-friendly",
  "community",
  "awesome-list",
  "resource",
  "resources",
  "ai-assistant",
  "frontend-creative",
  "developer-tooling",
  "personal-productivity",
  "data-analytics",
  "product-template",
  "app-shell",
  "cli-local-devtools",
  "business-dashboard",
  "business-saas",
  "admin-saas"
]);

const EMERGING_PROBLEM_BLOCKLIST = new Set([
  "other",
  "unknown",
  "misc",
  "cli",
  "terminal",
  "command-line",
  "developer-tools",
  "devtools",
  "automation",
  "workflow",
  "kubernetes",
  "cloud",
  "platform-engineering",
  "claude",
  "claude-code",
  "cursor",
  "codex",
  "mcp",
  "dashboard",
  "admin",
  "frontend",
  "backend",
  "full-stack",
  "fullstack"
]);

const EMERGING_LABEL_ZH = {
  automation: "自动化",
  scraper: "网页采集",
  scraping: "网页采集",
  crawler: "网页采集",
  "chrome-extension": "Chrome 插件",
  "browser-extension": "浏览器插件",
  "vscode-extension": "VS Code 插件",
  plugin: "插件",
  cli: "CLI 工具",
  dashboard: "数据看板",
  editor: "编辑器",
  studio: "工作台",
  template: "模板工程",
  boilerplate: "脚手架",
  starter: "启动模板",
  api: "API 服务",
  sdk: "SDK 工具",
  bot: "机器人",
  "slack-bot": "Slack 机器人",
  "discord-bot": "Discord 机器人",
  "telegram-bot": "Telegram 机器人",
  pdf: "PDF 处理",
  spreadsheet: "表格处理",
  invoice: "发票账单",
  payment: "支付流程",
  ecommerce: "电商",
  cms: "内容管理",
  crm: "客户管理",
  analytics: "数据分析",
  "data-visualization": "数据可视化",
  "document-processing": "文档处理",
  "image-generation": "图像生成",
  "video-editing": "视频剪辑",
  subtitle: "字幕处理",
  podcast: "播客",
  voice: "语音",
  music: "音乐",
  whiteboard: "白板",
  diagram: "图表",
  prototyping: "原型设计",
  "design-system": "设计系统",
  security: "安全检查",
  privacy: "隐私保护",
  compliance: "合规治理",
  monitoring: "监控告警",
  observability: "可观测性",
  deployment: "部署发布",
  "self-hosted": "自托管",
  "local-first": "本地优先",
  notes: "笔记",
  "knowledge-base": "知识库",
  rag: "RAG 问答",
  "vector-search": "向量检索",
  "workflow-automation": "流程自动化"
};

const EMERGING_AUDIENCE_LABELS = {
  creators: ["内容创作者", "Creators"],
  creator: ["内容创作者", "Creators"],
  designers: ["设计师", "Designers"],
  designer: ["设计师", "Designers"],
  developers: ["开发者", "Developers"],
  developer: ["开发者", "Developers"],
  marketers: ["营销与增长团队", "Marketers"],
  marketer: ["营销与增长团队", "Marketers"],
  teachers: ["教师与教育团队", "Teachers"],
  teacher: ["教师与教育团队", "Teachers"],
  students: ["学生与学习者", "Students"],
  student: ["学生与学习者", "Students"],
  researchers: ["研究者", "Researchers"],
  researcher: ["研究者", "Researchers"],
  writers: ["写作者", "Writers"],
  writer: ["写作者", "Writers"],
  podcasters: ["播客团队", "Podcasters"],
  podcaster: ["播客团队", "Podcasters"],
  founders: ["创业者", "Founders"],
  founder: ["创业者", "Founders"],
  "ops-teams": ["运营团队", "Ops teams"],
  "security-teams": ["安全团队", "Security teams"],
  "finance-teams": ["金融财务团队", "Finance teams"]
};

const EMERGING_SHAPE_LABELS = {
  cli: ["CLI 工具", "CLI tool"],
  dashboard: ["数据看板", "Dashboard"],
  editor: ["编辑器", "Editor"],
  studio: ["工作台", "Studio"],
  template: ["模板工程", "Template"],
  boilerplate: ["脚手架", "Boilerplate"],
  starter: ["启动模板", "Starter kit"],
  plugin: ["插件", "Plugin"],
  extension: ["插件/扩展工具", "Extension"],
  "chrome-extension": ["Chrome 插件", "Chrome extension"],
  "vscode-extension": ["VS Code 插件", "VS Code extension"],
  bot: ["机器人", "Bot"],
  api: ["API 服务", "API service"],
  sdk: ["SDK 工具", "SDK"],
  desktop: ["桌面应用", "Desktop app"],
  mobile: ["移动应用", "Mobile app"],
  "self-hosted": ["自托管平台", "Self-hosted platform"],
  "web-app": ["Web 应用", "Web app"],
  "browser-extension": ["浏览器插件", "Browser extension"]
};

function titleCaseEmergingLabel(value = "") {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function compactEmergingLabel(value = "", max = 28) {
  const text = String(value || "").trim();
  if (!text || text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function usefulEmergingTerm(value = "") {
  const key = normalizeTopicKey(value);
  if (!key || EMERGING_SEMANTIC_BLOCKLIST.has(key) || SEMANTIC_STOP_TERMS.has(key)) return "";
  if (/^\d+$/.test(key) || key.length < 3 || key.length > 42) return "";
  if (/^(react|vue|node|python|typescript|javascript|rust|go)-/.test(key)) return "";
  return key;
}

function usefulEmergingProblemTerm(value = "") {
  const key = usefulEmergingTerm(value);
  if (!key || EMERGING_PROBLEM_BLOCKLIST.has(key)) return "";
  return key;
}

function emergingLabelForKey(key = "", fallbackZh = "", fallbackEn = "") {
  const normalized = usefulEmergingTerm(key);
  const en = compactEmergingLabel(fallbackEn || titleCaseEmergingLabel(normalized || key), 34);
  const zh = compactEmergingLabel(fallbackZh || EMERGING_LABEL_ZH[normalized] || en, 24);
  return {
    labelZh: zh,
    labelEn: en
  };
}

function semanticLabelAlreadyExists(kind = "", labelZh = "", labelEn = "") {
  const zh = String(labelZh || "").trim().toLowerCase();
  const en = String(labelEn || "").trim().toLowerCase();
  return Object.values(SEMANTIC_LABELS[kind] || {}).some(([knownZh, knownEn]) => {
    return (zh && zh === String(knownZh || "").trim().toLowerCase()) || (en && en === String(knownEn || "").trim().toLowerCase());
  });
}

function emergingFilterValue(kind = "", matchKey = "", labelZh = "", labelEn = "") {
  return `semantic:${kind}:${[matchKey, labelZh, labelEn].filter(Boolean).join("|")}`;
}

function addEmergingCandidate(candidates, kind, matchKey, labelZh, labelEn, source = "emerging") {
  const normalized = kind === "problem" ? usefulEmergingProblemTerm(matchKey) : usefulEmergingTerm(matchKey);
  if (!normalized) return;
  const labels = emergingLabelForKey(normalized, labelZh, labelEn);
  if (semanticLabelAlreadyExists(kind, labels.labelZh, labels.labelEn)) return;
  candidates.push({
    key: SEMANTIC_LABELS[kind]?.[normalized] ? normalized : `emerging-${kind}-${normalized}`,
    matchKey: normalized,
    value: emergingFilterValue(kind, normalized, labels.labelZh, labels.labelEn),
    labelZh: labels.labelZh,
    labelEn: labels.labelEn,
    source
  });
}

function emergingSemanticCandidates(project, kind = "") {
  const candidates = [];
  const topics = (project.topics || []).map(normalizeTopicKey).filter(Boolean);
  const useCase = project.useCase || {};

  if (kind === "problem") {
    if (useCase.key && !SEMANTIC_LABELS.problem?.[useCase.key]) {
      addEmergingCandidate(candidates, kind, useCase.key, useCase.labelZh || useCase.label, useCase.labelEn || useCase.label, "emerging");
    }
    for (const topic of topics) {
      addEmergingCandidate(candidates, kind, topic, "", "", "emerging");
    }
  }

  if (kind === "audience") {
    for (const topic of topics) {
      const labels = EMERGING_AUDIENCE_LABELS[topic];
      if (labels) addEmergingCandidate(candidates, kind, topic, labels[0], labels[1], "emerging");
    }
  }

  if (kind === "shape") {
    for (const topic of topics) {
      const labels = EMERGING_SHAPE_LABELS[topic];
      if (labels) addEmergingCandidate(candidates, kind, topic, labels[0], labels[1], "emerging");
    }
  }

  const unique = new Map();
  for (const candidate of candidates) {
    const key = `${candidate.key}:${candidate.value}`;
    if (!unique.has(key)) unique.set(key, candidate);
  }
  return Array.from(unique.values()).slice(0, 8);
}

function semanticFilterValue(kind = "", key = "") {
  const labels = semanticLabel(kind, key);
  return `semantic:${kind}:${[key, labels.labelZh, labels.labelEn].filter(Boolean).join("|")}`;
}

function memorySemanticScore(kind = "", key = "", memory = {}) {
  const labels = semanticLabel(kind, key);
  const terms = new Set([key, labels.labelZh, labels.labelEn].map(normalizeSemanticText).filter(Boolean));
  for (const group of SEMANTIC_TERM_GROUPS) {
    const groupMatch = group.match.map(normalizeSemanticText);
    if ([...terms].some((term) => groupMatch.includes(term))) {
      group.terms.forEach((term) => terms.add(normalizeSemanticText(term)));
    }
  }
  const preferences = memory.preferences || {};
  const negative = memory.negativePreferences || {};
  let score = 0;
  for (const term of terms) {
    score += Number(preferences.categories?.[term] || 0) * 1.1;
    score += Number(preferences.useCases?.[term] || 0) * 1.5;
    score -= Number(negative.categories?.[term] || 0) * 1.4;
    score -= Number(negative.useCases?.[term] || 0) * 1.8;
  }
  return Number(score.toFixed(2));
}

function semanticTermMatches(haystack, term) {
  if (!term) return false;
  if (/[\u4e00-\u9fa5]/.test(term)) return haystack.includes(term);
  const spacedTerm = term.replace(/-/g, " ");
  const spacedHaystack = haystack.replace(/-/g, " ");
  return haystack.includes(term) || spacedHaystack.includes(spacedTerm);
}

function semanticTagMatches(project, rawValue = "") {
  const { kind, key, terms } = semanticTermsFromTag(rawValue);
  if (key && SEMANTIC_KEY_PATTERNS[key]) {
    return projectSemanticProfile(project)[kind] === key;
  }
  const payloadKey = terms[0] || "";
  if (payloadKey && projectSemanticProfile(project)[kind] === payloadKey) {
    return true;
  }
  if (payloadKey && emergingSemanticCandidates(project, kind).some((candidate) => candidate.matchKey === payloadKey || candidate.key === key)) {
    return true;
  }
  if (!terms.length) return true;
  const exactKeys = [
    project.useCase?.key,
    ...(project.topics || []),
    ...projectCapabilityTags(project).map((tag) => tag.key)
  ].map(normalizeSemanticText);
  if (terms.some((term) => exactKeys.includes(term))) return true;
  const haystack = semanticHaystack(project);
  return terms.some((term) => semanticTermMatches(haystack, term));
}

function projectTagMatches(project, tag = "") {
  const [kind, rawValue = ""] = String(tag || "").split(/:(.*)/s);
  const value = rawValue.toLowerCase().trim();
  if (!kind || !value) return true;
  if (kind === "semantic") {
    return semanticTagMatches(project, rawValue);
  }
  if (kind === "owner") {
    return String(project.owner || project.fullName?.split("/")[0] || "").toLowerCase() === value;
  }
  if (kind === "category") {
    return [project.category?.key, project.category?.label, project.category?.labelZh, project.category?.labelEn]
      .filter(Boolean)
      .some((item) => String(item).toLowerCase() === value);
  }
  if (kind === "useCase") {
    return [project.useCase?.key, project.useCase?.label, project.useCase?.labelZh, project.useCase?.labelEn]
      .filter(Boolean)
      .some((item) => String(item).toLowerCase() === value);
  }
  if (kind === "language") {
    return String(project.language || "").toLowerCase() === value;
  }
  if (kind === "topic") {
    return (project.topics || []).some((topic) => String(topic).toLowerCase() === value);
  }
  return false;
}

function cachedTrendValue(project, field) {
  const trend = cachedTrend(project);
  if (trend.cached === false || trend.pending || trend.error || trend.unavailable) return -1;
  if (field === "stars" && trend.starsComplete === false) return -1;
  if (field === "forks" && trend.forksComplete === false) return -1;
  const value = trend?.[field];
  return Number.isFinite(Number(value)) ? Number(value) : -1;
}

function countSemanticFilters(projects = [], memory = {}) {
  const today = todayKey();
  const buckets = {
    problem: new Map(),
    audience: new Map(),
    shape: new Map()
  };
  const ensureEntry = (kind, key, meta = {}) => {
    if (!key) return null;
    const labels = meta.labelZh || meta.labelEn ? { labelZh: meta.labelZh, labelEn: meta.labelEn } : semanticLabel(kind, key);
    if (!labels.labelZh && !labels.labelEn) return null;
    const value = meta.value || semanticFilterValue(kind, key);
    const bucket = buckets[kind];
    const entryKey = meta.value || key;
    if (!bucket.has(entryKey)) {
      bucket.set(entryKey, {
        key,
        matchKey: meta.matchKey || key,
        value,
        labelZh: labels.labelZh,
        labelEn: labels.labelEn,
        count: 0,
        newCount: 0,
        memoryWeight: memorySemanticScore(kind, key, memory),
        source: meta.source || (SEMANTIC_FILTER_CORE_KEYS[kind]?.includes(key) ? "core" : "dynamic")
      });
    }
    return bucket.get(entryKey);
  };

  for (const kind of Object.keys(buckets)) {
    for (const key of SEMANTIC_FILTER_CORE_KEYS[kind] || []) {
      ensureEntry(kind, key);
    }
  }

  for (const project of projects) {
    const semantic = projectSemanticProfile(project);
    for (const kind of Object.keys(buckets)) {
      const entry = ensureEntry(kind, semantic[kind]);
      if (entry) {
        entry.count += 1;
        if (todayKey(project.firstSeenAt) === today) {
          entry.newCount += 1;
        }
      }
      for (const candidate of emergingSemanticCandidates(project, kind)) {
        const emergingEntry = ensureEntry(kind, candidate.key, candidate);
        if (!emergingEntry) continue;
        emergingEntry.count += 1;
        if (todayKey(project.firstSeenAt) === today) {
          emergingEntry.newCount += 1;
        }
      }
    }
  }

  const toList = (kind) =>
    Array.from(buckets[kind].values())
      .map((entry) => ({
        ...entry,
        share: projects.length ? entry.count / projects.length : 0
      }))
      .filter((entry) => entry.count > 0 || entry.source === "core")
      .sort(
        (a, b) =>
          Number(b.memoryWeight || 0) - Number(a.memoryWeight || 0) ||
          Number(b.count || 0) - Number(a.count || 0) ||
          Number(b.newCount || 0) - Number(a.newCount || 0) ||
          a.key.localeCompare(b.key)
      );

  return {
    problem: toList("problem"),
    audience: toList("audience"),
    shape: toList("shape")
  };
}

function countSemanticFilterKind(projects = [], memory = {}, kind = "") {
  if (!["problem", "audience", "shape"].includes(kind)) return [];
  const today = todayKey();
  const bucket = new Map();
  const ensureEntry = (key, meta = {}) => {
    if (!key) return null;
    const labels = meta.labelZh || meta.labelEn ? { labelZh: meta.labelZh, labelEn: meta.labelEn } : semanticLabel(kind, key);
    if (!labels.labelZh && !labels.labelEn) return null;
    const value = meta.value || semanticFilterValue(kind, key);
    const entryKey = meta.value || key;
    if (!bucket.has(entryKey)) {
      bucket.set(entryKey, {
        key,
        matchKey: meta.matchKey || key,
        value,
        labelZh: labels.labelZh,
        labelEn: labels.labelEn,
        count: 0,
        newCount: 0,
        memoryWeight: memorySemanticScore(kind, key, memory),
        source: meta.source || (SEMANTIC_FILTER_CORE_KEYS[kind]?.includes(key) ? "core" : "dynamic")
      });
    }
    return bucket.get(entryKey);
  };

  for (const key of SEMANTIC_FILTER_CORE_KEYS[kind] || []) {
    ensureEntry(key);
  }

  for (const project of projects) {
    const semantic = projectSemanticProfile(project);
    const entry = ensureEntry(semantic[kind]);
    if (entry) {
      entry.count += 1;
      if (todayKey(project.firstSeenAt) === today) {
        entry.newCount += 1;
      }
    }
    for (const candidate of emergingSemanticCandidates(project, kind)) {
      const emergingEntry = ensureEntry(candidate.key, candidate);
      if (!emergingEntry) continue;
      emergingEntry.count += 1;
      if (todayKey(project.firstSeenAt) === today) {
        emergingEntry.newCount += 1;
      }
    }
  }

  return Array.from(bucket.values())
    .map((entry) => ({
      ...entry,
      share: projects.length ? entry.count / projects.length : 0
    }))
    .filter((entry) => entry.count > 0 || entry.source === "core")
    .sort(
      (a, b) =>
        Number(b.memoryWeight || 0) - Number(a.memoryWeight || 0) ||
        Number(b.count || 0) - Number(a.count || 0) ||
        Number(b.newCount || 0) - Number(a.newCount || 0) ||
        a.key.localeCompare(b.key)
    );
}

function buildHarnessScorecard(store) {
  const planId = activeObservationPlanId(store);
  const memory = observationPlanMemory(store);
  const dailyArchive = planId === "default" ? store.leaderboards?.daily : store.leaderboards?.byPlan?.[planId]?.daily;
  const todayArchive = dailyArchive?.[todayKey()];
  const items = todayArchive?.items || [];
  const events = recentEvents(memory, 30);
  const positiveTypes = new Set(["favorite", "star", "fork", "triage_note", "ai_analyze", "leaderboard_positive", "leaderboard_strong_positive"]);
  const negativeTypes = new Set(["unfavorite", "unstar", "leaderboard_negative", "dismiss_project"]);
  const positive = events.filter((event) => positiveTypes.has(event.type)).length;
  const negative = events.filter((event) => negativeTypes.has(event.type)).length;
  const feedbackTotal = positive + negative;
  const useCaseCoverage = uniqueCount(items, (item) => item.useCase?.key || item.category?.key);
  const useCaseCounts = {};
  for (const item of items) {
    const key = item.useCase?.key || item.category?.key || "other";
    useCaseCounts[key] = (useCaseCounts[key] || 0) + 1;
  }
  const maxShare = items.length ? Math.max(0, ...Object.values(useCaseCounts)) / items.length : 0;
  const explorationShare = items.length
    ? items.filter((item) => (item.scoreParts?.memoryBoost || 0) <= 0.5).length / items.length
    : memory.antiBubble.explorationRatio || 0.25;
  const licenseReady = items.filter((item) => item.licensePolicy?.bucket === "permissive-commercial").length;
  const actionabilityAverage = average(items, (item) => item.scoreParts?.actionability || item.scores?.actionability || 0);
  const targetExploration = memory.antiBubble?.explorationRatio || 0.25;
  const explorationDiff = Math.abs(explorationShare - targetExploration);

  const scorecard = {
    evaluatedAt: new Date().toISOString(),
    sample: {
      rankedItems: items.length,
      events30d: events.length,
      positiveSignals: positive,
      negativeSignals: negative
    },
    metrics: {
      relevanceHitRate: scorePercent(feedbackTotal ? (positive / feedbackTotal) * 100 : 50),
      diversityCoverage: scorePercent(items.length ? (useCaseCoverage / Math.min(8, items.length)) * 100 : 0),
      repetitionControl: scorePercent((1 - maxShare) * 100),
      actionabilityFit: scorePercent(actionabilityAverage),
      licenseReadiness: scorePercent(items.length ? (licenseReady / items.length) * 100 : 0),
      explorationFit: scorePercent((1 - Math.min(1, explorationDiff / 0.35)) * 100)
    }
  };
  const metricValues = Object.values(scorecard.metrics);
  scorecard.overall = scorePercent(metricValues.reduce((sum, value) => sum + value, 0) / Math.max(1, metricValues.length));

  const recommendations = [];
  if (scorecard.metrics.diversityCoverage < 55 || scorecard.metrics.repetitionControl < 60) {
    recommendations.push("提高探索比例或压低重复用途权重，避免同类项目连续霸榜。");
  }
  if (negative > positive && feedbackTotal >= 3) {
    recommendations.push("近期负反馈偏多，应把对应分类和用途写入负向偏好，降低相似项目密度。");
  }
  if (scorecard.metrics.actionabilityFit < 55) {
    recommendations.push("榜单可落地性偏弱，建议提高工程质量、许可清晰度和应用潜力权重。");
  }
  if (scorecard.metrics.licenseReadiness < 35) {
    recommendations.push("许可清晰的项目占比偏低，应把不明许可项目更多放入观察而非高优先榜单。");
  }
  if (!recommendations.length) {
    recommendations.push("当前推荐质量稳定，继续保留个人偏好加权和探索位。");
  }

  return {
    ...scorecard,
    recommendations
  };
}

function applyMemoryTuningPatch(memory, tuning = {}) {
  const applied = [];
  const clampDelta = (value) => Math.max(-2, Math.min(2, Number(value || 0)));
  const applyDeltas = (root, deltas = {}, scopeName) => {
    const map = {
      categories: root.categories,
      useCases: root.useCases,
      languages: root.languages,
      licenses: root.licenses,
      riskLevels: root.riskLevels
    };
    for (const [bucket, values] of Object.entries(deltas || {})) {
      if (!map[bucket] || !values || typeof values !== "object") continue;
      for (const [key, rawDelta] of Object.entries(values)) {
        const delta = scopeName === "negative" ? Math.abs(clampDelta(rawDelta)) : clampDelta(rawDelta);
        if (!delta) continue;
        adjustPreferenceBucket(map[bucket], key, delta, scopeName === "negative" ? 30 : 40);
        applied.push(`${scopeName}.${bucket}.${key}:${delta > 0 ? "+" : ""}${delta}`);
      }
    }
  };

  if (tuning.antiBubble?.explorationRatio !== undefined) {
    const nextRatio = Math.max(0.1, Math.min(0.45, Number(tuning.antiBubble.explorationRatio)));
    if (Number.isFinite(nextRatio)) {
      memory.antiBubble.explorationRatio = Number(nextRatio.toFixed(2));
      applied.push(`antiBubble.explorationRatio:${memory.antiBubble.explorationRatio}`);
    }
  }

  applyDeltas(memory.preferences, tuning.positivePreferenceDeltas, "positive");
  applyDeltas(memory.negativePreferences, tuning.negativePreferenceDeltas, "negative");
  return applied;
}

function createStorage(filePath) {
  let storeCache = null;
  let storeCacheMtimeMs = 0;
  let computedProjectItemsCache = null;
  let computedProjectItemsVersion = "";
  const summaryCache = new Map();
  const SUMMARY_CACHE_LIMIT = 24;
  const leaderboardCache = new Map();
  const LEADERBOARD_CACHE_LIMIT = 16;

  function invalidateComputedProjectItems() {
    computedProjectItemsCache = null;
    computedProjectItemsVersion = "";
    summaryCache.clear();
    leaderboardCache.clear();
  }

  function projectPoolCacheVersion(store) {
    const plan = activeObservationPlan(store);
    const userData = normalizePlanUserData(plan.userData || {});
    return [
      plan.id,
      Object.keys(store.projects || {}).length,
      Object.keys(userData.watchlist || {}).length,
      Object.keys(userData.notes || {}).length,
      Object.keys(userData.analysis || {}).length,
      Object.keys(userData.dismissedProjects || {}).length,
      Object.keys(userData.githubActions || {}).length,
      store.scans?.[0]?.id || "",
      store.scans?.[0]?.at || "",
      plan.memory?.stats?.lastEventAt || "",
      plan.memory?.context?.compressedAt || ""
    ].join(":");
  }

  function leaderboardCacheVersion(store, planId) {
    const plan = store.observationPlans?.[planId] || store.observationPlans?.default || activeObservationPlan(store);
    const userData = normalizePlanUserData(plan?.userData || {});
    return [
      planId,
      Object.keys(store.projects || {}).length,
      Object.keys(userData.watchlist || {}).length,
      Object.keys(userData.notes || {}).length,
      Object.keys(userData.analysis || {}).length,
      Object.keys(userData.dismissedProjects || {}).length,
      Object.keys(userData.githubActions || {}).length,
      store.scans?.[0]?.id || "",
      store.scans?.[0]?.at || "",
      plan?.memory?.stats?.lastEventAt || "",
      plan?.memory?.context?.compressedAt || ""
    ].join(":");
  }

  function rememberLeaderboardCache(cacheKey, result) {
    leaderboardCache.set(cacheKey, cloneJson(result, result));
    while (leaderboardCache.size > LEADERBOARD_CACHE_LIMIT) {
      leaderboardCache.delete(leaderboardCache.keys().next().value);
    }
  }

  function load() {
    try {
      const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
      const mtimeMs = stat?.mtimeMs || 0;
      if (storeCache && storeCacheMtimeMs === mtimeMs) {
        return storeCache;
      }
      storeCache = readStore(filePath);
      storeCacheMtimeMs = mtimeMs;
      invalidateComputedProjectItems();
      return storeCache;
    } catch {
      storeCache = readStore(filePath);
      storeCacheMtimeMs = 0;
      invalidateComputedProjectItems();
      return storeCache;
    }
  }

  function save(store) {
    syncActivePlanMemory(store, store.memory);
    storeCache = writeStore(filePath, store);
    storeCacheMtimeMs = fs.existsSync(filePath) ? fs.statSync(filePath).mtimeMs : Date.now();
    invalidateComputedProjectItems();
    return storeCache;
  }

  function getProject(fullName) {
    const store = load();
    const key = projectKey(fullName);
    const project = store.projects[key] || null;
    const userData = activePlanUserData(store);
    const note = userData.notes?.[key] || {};
    return project
      ? withComputedUseCase({
          ...project,
          note: note.text || "",
          triageStatus: note.status || "",
          noteUpdatedAt: note.updatedAt || "",
          watched: Boolean(userData.watchlist?.[key]),
          analysis: userData.analysis?.[key] || null,
          dismissed: Boolean(userData.dismissedProjects?.[key])
        })
      : null;
  }

  function projectItems(store) {
    const userData = activePlanUserData(store);
    const version = `${store.updatedAt || ""}:${activeObservationPlanId(store)}:${Object.keys(store.projects || {}).length}:${Object.keys(userData.watchlist || {}).length}:${Object.keys(userData.notes || {}).length}:${Object.keys(userData.analysis || {}).length}:${Object.keys(userData.dismissedProjects || {}).length}`;
    if (computedProjectItemsCache && computedProjectItemsVersion === version) {
      return computedProjectItemsCache.slice();
    }
    computedProjectItemsCache = Object.values(store.projects).map((project) => {
      const key = projectKey(project.fullName);
      const note = userData.notes?.[key] || {};
      return withComputedUseCase({
        ...project,
        note: note.text || "",
        triageStatus: note.status || "",
        noteUpdatedAt: note.updatedAt || "",
        watched: Boolean(userData.watchlist?.[key]),
        analysis: userData.analysis?.[key] || null,
        dismissed: Boolean(userData.dismissedProjects?.[key])
      });
    });
    computedProjectItemsVersion = version;
    return computedProjectItemsCache.slice();
  }

  function projectPool(store, filters = {}, defaultLimit = 500) {
    const planId = filters.observationPlanId || activeObservationPlanId(store);
    const plan = store.observationPlans?.[planId] || store.observationPlans?.default || null;
    const memory = observationPlanMemory(store);
    let items = projectItems(store);
    if (planId !== "default") {
      items = items.filter((project) => projectMatchesObservationPlan(project, planId, plan));
    }
    if (filters.includeDismissed !== "true" && filters.includeDismissed !== true) {
      items = items.filter((project) => !project.dismissed);
    }

    if (filters.q) {
      const q = String(filters.q).toLowerCase();
      items = items.filter((project) => {
        return [
          project.fullName,
          project.owner,
          project.description,
          project.language,
          project.category?.label,
          project.useCase?.label,
          project.useCase?.labelZh,
          ...(project.topics || [])
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);
      });
    }

    if (filters.category && filters.category !== "all") {
      items = items.filter((project) => project.category?.key === filters.category);
    }

    if (filters.license && filters.license !== "all") {
      items = items.filter((project) => project.licensePolicy?.bucket === filters.license);
    }

    if (filters.projectLanguage && filters.projectLanguage !== "all") {
      const language = String(filters.projectLanguage).toLowerCase();
      items = items.filter((project) => String(project.language || "unknown").toLowerCase() === language);
    }

    if (filters.risk && filters.risk !== "all") {
      if (filters.risk === "critical") {
        items = items.filter((project) => (project.scores?.risk || 0) >= 60);
      }
      if (filters.risk === "high") {
        items = items.filter((project) => {
          const risk = project.scores?.risk || 0;
          return risk >= 35 && risk < 60;
        });
      }
      if (filters.risk === "medium") {
        items = items.filter((project) => {
          const risk = project.scores?.risk || 0;
          return risk >= 15 && risk < 35;
        });
      }
      if (filters.risk === "low") {
        items = items.filter((project) => (project.scores?.risk || 0) < 15);
      }
    }

    if (filters.watchlist === "true" || filters.watchlist === true) {
      items = items.filter((project) => Boolean(project.watched));
    }

    if (filters.triageStatus && filters.triageStatus !== "all") {
      if (filters.triageStatus === "none") {
        items = items.filter((project) => !project.triageStatus);
      } else {
        items = items.filter((project) => project.triageStatus === filters.triageStatus);
      }
    }

    if (filters.aiAnalysis && filters.aiAnalysis !== "all") {
      items = items.filter((project) => {
        const hasAnalysis = Boolean(project.analysis?.result || project.analysis?.updatedAt || project.analysis?.raw);
        if (filters.aiAnalysis === "unanalyzed") return !hasAnalysis;
        if (!hasAnalysis) return false;
        return analysisRecommendation(project) === filters.aiAnalysis;
      });
    }

    if (filters.tag) {
      items = items.filter((project) => projectTagMatches(project, filters.tag));
    }

    for (const tag of [filters.semanticProblem, filters.semanticAudience, filters.semanticShape]) {
      if (tag && tag !== "all") {
        items = items.filter((project) => projectTagMatches(project, tag));
      }
    }

    const sort = filters.sort || store.settings.defaultSort || "opportunity";
    const skipSort = filters.skipSort === true || filters.skipSort === "true";
    if (!skipSort) {
      const normalizedMemory = normalizeMemory(memory);
      const personalizedScores = new Map();
      const personalizedScore = (project) => {
        const key = projectKey(project.fullName);
        if (!personalizedScores.has(key)) {
          personalizedScores.set(key, (project.scores?.opportunity || 0) + memoryScoreFromNormalized(project, normalizedMemory));
        }
        return personalizedScores.get(key);
      };
      items.sort((a, b) => {
        if (sort === "stars") return (b.stars || 0) - (a.stars || 0);
        if (sort === "updated") return new Date(b.pushedAt || 0) - new Date(a.pushedAt || 0);
        if (sort === "risk") return (b.scores?.risk || 0) - (a.scores?.risk || 0);
        if (sort === "momentum") return (b.scores?.momentum || 0) - (a.scores?.momentum || 0);
        if (sort === "actionability") return (b.scores?.actionability || 0) - (a.scores?.actionability || 0);
        if (sort === "commercial") return commercialScore(b) - commercialScore(a);
        if (sort === "productization") return (b.scores?.productization || 0) - (a.scores?.productization || 0);
        if (sort === "quality") return (b.scores?.quality || 0) - (a.scores?.quality || 0);
        if (sort === "trendStars") {
          return cachedTrendValue(b, "stars") - cachedTrendValue(a, "stars") || personalizedScore(b) - personalizedScore(a);
        }
        if (sort === "trendForks") {
          return cachedTrendValue(b, "forks") - cachedTrendValue(a, "forks") || personalizedScore(b) - personalizedScore(a);
        }
        return personalizedScore(b) - personalizedScore(a);
      });
    }

    const total = items.length;
    const limit = normalizedListLimit(filters.limit, defaultLimit);
    const offset = Math.max(0, Number(filters.offset || 0));
    if (!skipSort && sort === "opportunity" && filters.diversify === "true") {
      const diversifyLimit = Number.isFinite(limit) ? limit : total;
      items = diversifyProjects(items, diversifyLimit);
    }
    return {
      items: Number.isFinite(limit) ? items.slice(offset, offset + limit) : items.slice(offset),
      total,
      limit: Number.isFinite(limit) ? limit : total,
      offset,
      sort
    };
  }

  function listProjects(filters = {}) {
    const store = load();
    const result = projectPool(store, filters, 500);
    return {
      items: result.items,
      total: result.total
    };
  }

  function projectPoolPosition(fullName, filters = {}) {
    const store = load();
    const result = projectPool(
      store,
      {
        ...filters,
        limit: "all",
        offset: 0
      },
      "all"
    );
    const key = projectKey(fullName);
    const index = result.items.findIndex((project) => projectKey(project.fullName) === key);
    const pageSize = normalizedListLimit(filters.pageSize || filters.limit, 10);
    return {
      found: index >= 0,
      index,
      page: index >= 0 && Number.isFinite(pageSize) ? Math.floor(index / pageSize) + 1 : null,
      pageSize: Number.isFinite(pageSize) ? pageSize : result.total,
      total: result.total
    };
  }

  function trendRefreshCandidates(limit = 80) {
    const store = load();
    const result = projectPool(
      store,
      {
        sort: store.settings.defaultSort || "opportunity",
        diversify: "true",
        limit: Math.max(1, Number(limit || 80)),
        offset: 0
      },
      limit
    );
    return result.items;
  }

  function listObservationPlans(options = {}) {
    const store = load();
    const activeId = activeObservationPlanId(store);
    return Object.values(store.observationPlans || {})
      .map((plan) => observationPlanPublicView(plan, activeId, Boolean(options.includeMemory)))
      .sort((a, b) => Number(b.active) - Number(a.active) || Number(b.builtIn) - Number(a.builtIn) || a.name.localeCompare(b.name));
  }

  function getObservationPlan(id = "", options = {}) {
    const store = load();
    const activeId = activeObservationPlanId(store);
    const planId = id ? normalizeObservationPlanId(id) : activeId;
    const plan = store.observationPlans?.[planId];
    if (!plan) {
      throw new Error("Observation plan not found");
    }
    return observationPlanPublicView(plan, activeId, Boolean(options.includeMemory));
  }

  function saveObservationPlan(plan = {}) {
    const store = load();
    syncActivePlanMemory(store, store.memory);
    const requestedId = normalizeObservationPlanId(plan.id || plan.nameEn || plan.name);
    const id = requestedId && requestedId !== "default" ? requestedId : `plan-${Date.now()}`;
    const previous = store.observationPlans?.[id] || {};
    if (previous.builtIn) {
      throw new Error("Built-in observation plan cannot be overwritten");
    }
    store.observationPlans = store.observationPlans || {};
    const normalized = normalizeObservationPlan(
      {
        ...previous,
        ...plan,
        id,
        builtIn: false,
        createdAt: previous.createdAt || plan.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        memory: plan.memory || previous.memory || defaultMemory()
      },
      previous.memory || defaultMemory()
    );
    store.observationPlans[id] = normalized;
    const saved = save(store);
    return observationPlanPublicView(saved.observationPlans[id], activeObservationPlanId(saved), true);
  }

  function saveObservationPlanRequirements(id, requirements = []) {
    const store = load();
    const planId = normalizeObservationPlanId(id) || activeObservationPlanId(store);
    if (planId === "default") {
      throw new Error("Default observation plan requirements cannot be edited");
    }
    if (!store.observationPlans?.[planId]) {
      throw new Error("Observation plan not found");
    }
    const normalized = normalizeObservationPlan(store.observationPlans[planId], store.memory);
    store.observationPlans[planId] = {
      ...normalized,
      requirements: normalizeObservationRequirements(requirements),
      updatedAt: new Date().toISOString()
    };
    const saved = save(store);
    return observationPlanPublicView(saved.observationPlans[planId], activeObservationPlanId(saved), true);
  }

  function deleteObservationPlan(id) {
    const store = load();
    const planId = normalizeObservationPlanId(id);
    if (!planId || planId === "default") {
      throw new Error("Default observation plan cannot be deleted");
    }
    if (!store.observationPlans?.[planId]) {
      throw new Error("Observation plan not found");
    }
    syncActivePlanMemory(store, store.memory);
    delete store.observationPlans[planId];
    if (store.settings?.activeObservationPlanId === planId) {
      store.settings.activeObservationPlanId = "default";
      store.memory = normalizeMemory(store.observationPlans.default?.memory || store.memory);
    }
    const saved = save(store);
    return {
      ok: true,
      activeObservationPlanId: activeObservationPlanId(saved),
      plans: Object.values(saved.observationPlans || {}).map((plan) => observationPlanPublicView(plan, activeObservationPlanId(saved), false))
    };
  }

  function setActiveObservationPlan(id) {
    const store = load();
    const previousId = activeObservationPlanId(store);
    syncActivePlanMemory(store, store.memory);
    const planId = normalizeObservationPlanId(id);
    if (!planId || !store.observationPlans?.[planId]) {
      throw new Error("Observation plan not found");
    }
    store.settings = {
      ...(store.settings || {}),
      activeObservationPlanId: planId
    };
    store.memory = normalizeMemory(store.observationPlans[planId].memory || defaultMemory());
    store.observationPlans[planId] = {
      ...normalizeObservationPlan(store.observationPlans[planId], store.memory),
      memory: store.memory,
      updatedAt: new Date().toISOString()
    };
    const saved = save(store);
    buildLeaderboard("daily", { limit: 20, persist: true });
    return {
      previousId,
      active: observationPlanPublicView(saved.observationPlans[planId], planId, true),
      plans: Object.values(saved.observationPlans || {}).map((plan) => observationPlanPublicView(plan, planId, false))
    };
  }

  function exportObservationPlans(options = {}) {
    const store = load();
    syncActivePlanMemory(store, store.memory);
    const includeMemory = options.includeMemory !== false;
    const plans = Object.values(store.observationPlans || {}).map((plan) =>
      observationPlanPublicView(plan, activeObservationPlanId(store), includeMemory)
    );
    return {
      schema: "starvault-observation-plans/v1",
      exportedAt: new Date().toISOString(),
      activeObservationPlanId: activeObservationPlanId(store),
      privacy: {
        secretsIncluded: false,
        note: "API keys and tokens are never included in observation plan exports."
      },
      plans
    };
  }

  function importObservationPlans(payload = {}, options = {}) {
    const store = load();
    syncActivePlanMemory(store, store.memory);
    const plans = Array.isArray(payload.plans) ? payload.plans : [];
    if (!plans.length) {
      throw new Error("No observation plans to import");
    }
    let imported = 0;
    for (const plan of plans) {
      const normalized = normalizeObservationPlan(plan, plan.memory || defaultMemory());
      if (normalized.id === "default") continue;
      store.observationPlans[normalized.id] = {
        ...normalized,
        builtIn: false,
        updatedAt: new Date().toISOString()
      };
      imported += 1;
    }
    if (options.activate && payload.activeObservationPlanId && store.observationPlans[payload.activeObservationPlanId]) {
      store.settings.activeObservationPlanId = payload.activeObservationPlanId;
      store.memory = normalizeMemory(store.observationPlans[payload.activeObservationPlanId].memory || defaultMemory());
    }
    const saved = save(store);
    return {
      imported,
      activeObservationPlanId: activeObservationPlanId(saved),
      plans: Object.values(saved.observationPlans || {}).map((plan) => observationPlanPublicView(plan, activeObservationPlanId(saved), false))
    };
  }

  function exportPortableData() {
    const store = load();
    syncActivePlanMemory(store, store.memory);
    const activeId = activeObservationPlanId(store);
    const userData = activePlanUserData(store);
    return {
      schema: "starvault-portable-config/v1",
      exportedAt: new Date().toISOString(),
      app: {
        name: "StarVault Imprint",
        nameZh: "星仓印记"
      },
      privacy: {
        secretsIncluded: false,
        excluded: ["githubToken", "tavilyKey", "exaKey", "llmProviders.apiKey"],
        note: "This export contains portable configuration and learning data only. API keys and tokens are never included."
      },
      settings: portableSettings(store.settings || {}),
      observationPlans: {
        activeObservationPlanId: activeId,
        plans: Object.values(store.observationPlans || {}).map((plan) => observationPlanPublicView(plan, activeId, true))
      },
      learning: {
        memory: normalizeMemory(store.memory),
        watchlist: cloneJson(userData.watchlist || {}, {}),
        notes: cloneJson(userData.notes || {}, {}),
        analysis: cloneJson(userData.analysis || {}, {}),
        dismissedProjects: cloneJson(userData.dismissedProjects || {}, {}),
        githubActions: cloneJson(userData.githubActions || {}, {})
      }
    };
  }

  function exportLocalSnapshot(options = {}) {
    const store = load();
    syncActivePlanMemory(store, store.memory);
    const activeId = activeObservationPlanId(store);
    const plans = Object.fromEntries(
      Object.entries(store.observationPlans || {}).map(([id, plan]) => [id, observationPlanPublicView(plan, activeId, true)])
    );
    const snapshot = {
      schema: "starvault-indexeddb-snapshot/v1",
      exportedAt: new Date().toISOString(),
      app: {
        name: "StarVault Imprint",
        nameZh: "星仓印记"
      },
      privacy: {
        localOnly: true,
        secretsIncluded: false,
        excluded: ["githubToken", "tavilyKey", "exaKey", "llmProviders.apiKey"],
        note: "This snapshot is designed for browser IndexedDB storage. API keys and tokens are never included."
      },
      activeObservationPlanId: activeId,
      settings: portableSettings(store.settings || {}),
      store: {
        version: store.version || 1,
        createdAt: store.createdAt || "",
        updatedAt: store.updatedAt || "",
        projects: cloneJson(store.projects || {}, {}),
        scans: cloneJson(store.scans || [], []),
        leaderboards: cloneJson(store.leaderboards || { daily: {} }, { daily: {} }),
        memory: normalizeMemory(store.memory),
        observationPlans: plans
      },
      counts: {
        projects: Object.keys(store.projects || {}).length,
        scans: Array.isArray(store.scans) ? store.scans.length : 0,
        observationPlans: Object.keys(store.observationPlans || {}).length
      }
    };
    if (options.includeComputed !== false) {
      snapshot.summary = summary({});
      snapshot.leaderboard = buildLeaderboard("daily", { limit: 20, persist: false });
    }
    return snapshot;
  }

  function importPortableData(payload = {}, options = {}) {
    const store = load();
    syncActivePlanMemory(store, store.memory);
    const isPortable = payload.schema === "starvault-portable-config/v1" || payload.settings || payload.learning || payload.observationPlans;
    const planPayload = payload.observationPlans || payload;
    const plans = Array.isArray(planPayload.plans) ? planPayload.plans : [];
    if (!isPortable && !plans.length) {
      throw new Error("No portable configuration data to import");
    }

    store.settings = mergePortableSettings(store.settings || {}, payload.settings || {});
    let importedPlans = 0;
    for (const plan of plans) {
      const normalized = normalizeObservationPlan(plan, plan.memory || defaultMemory());
      if (normalized.id === "default") {
        store.observationPlans.default = normalizeObservationPlan(
          {
            ...store.observationPlans.default,
            memory: normalized.memory || store.observationPlans.default?.memory || store.memory
          },
          store.observationPlans.default?.memory || store.memory
        );
        continue;
      }
      store.observationPlans[normalized.id] = {
        ...normalized,
        builtIn: false,
        updatedAt: new Date().toISOString()
      };
      importedPlans += 1;
    }

    const requestedActiveId =
      normalizeObservationPlanId(options.activate === false ? "" : payload.settings?.activeObservationPlanId || planPayload.activeObservationPlanId) ||
      activeObservationPlanId(store);
    if (store.observationPlans?.[requestedActiveId]) {
      store.settings.activeObservationPlanId = requestedActiveId;
    }
    const activeId = activeObservationPlanId(store);
    const activeUserData = activePlanUserData(store);
    const learning = plainObject(payload.learning);
    if (learning.watchlist) activeUserData.watchlist = { ...(activeUserData.watchlist || {}), ...plainObject(learning.watchlist) };
    if (learning.notes) activeUserData.notes = { ...(activeUserData.notes || {}), ...plainObject(learning.notes) };
    if (learning.analysis) activeUserData.analysis = { ...(activeUserData.analysis || {}), ...plainObject(learning.analysis) };
    if (learning.dismissedProjects) {
      activeUserData.dismissedProjects = {
        ...(activeUserData.dismissedProjects || {}),
        ...plainObject(learning.dismissedProjects)
      };
    }
    if (learning.githubActions) {
      activeUserData.githubActions = { ...(activeUserData.githubActions || {}), ...plainObject(learning.githubActions) };
    }
    const importedMemory = learning.memory ? normalizeMemory(learning.memory) : null;
    const activePlan = normalizeObservationPlan(store.observationPlans[activeId], store.memory);
    store.memory = normalizeMemory(activePlan.memory || importedMemory || store.memory);
    if (importedMemory && (!activePlan.memory || activeId === (payload.settings?.activeObservationPlanId || planPayload.activeObservationPlanId))) {
      store.memory = importedMemory;
    }
    store.observationPlans[activeId] = {
      ...activePlan,
      memory: store.memory,
      updatedAt: new Date().toISOString()
    };

    const saved = save(store);
    return {
      imported: {
        plans: importedPlans,
        learning: Boolean(payload.learning),
        settings: Boolean(payload.settings)
      },
      activeObservationPlanId: activeObservationPlanId(saved),
      plans: Object.values(saved.observationPlans || {}).map((plan) => observationPlanPublicView(plan, activeObservationPlanId(saved), false))
    };
  }

  function updateProjectTrends(trends = {}) {
    const store = load();
    let updated = 0;
    for (const [fullName, trend] of Object.entries(trends || {})) {
      const key = projectKey(fullName);
      if (!store.projects[key] || !trend) continue;
      store.projects[key].trend = trend;
      if (!trend.error) updated += 1;
    }
    save(store);
    buildLeaderboard("daily", { limit: 20 });
    return updated;
  }

  function updateLatestScan(patch = {}) {
    const store = load();
    if (!store.scans?.length) return null;
    store.scans[0] = {
      ...store.scans[0],
      ...patch
    };
    return save(store).scans[0];
  }

  function upsertProjects(projects, scanMeta = {}) {
    const store = load();
    const now = new Date().toISOString();
    const planId = scanMeta.observationPlanId || activeObservationPlanId(store);
    const userData = activePlanUserData(store);
    const incomingKeys = new Set(projects.map((project) => projectKey(project.fullName)).filter(Boolean));

    if (scanMeta.replaceObservationPlanMatches && planId !== "default") {
      for (const [key, project] of Object.entries(store.projects || {})) {
        if (!project?.observationPlanMatches?.[planId] || incomingKeys.has(key)) continue;
        const nextMatches = { ...(project.observationPlanMatches || {}) };
        delete nextMatches[planId];
        store.projects[key] = {
          ...project,
          observationPlanMatches: nextMatches
        };
      }
    }

    for (const project of projects) {
      const key = projectKey(project.fullName);
      const previous = store.projects[key];
      const previousMatches = previous?.observationPlanMatches || {};
      const observationPlanMatches = {
        ...previousMatches,
        [planId]: {
          planId,
          firstSeenAt: previousMatches[planId]?.firstSeenAt || now,
          lastSeenAt: now,
          profileKey: project.profileKey || "",
          profileLabel: project.profileLabel || ""
        }
      };
      const snapshot = {
        at: now,
        stars: project.stars || 0,
        forks: project.forks || 0,
        openIssues: project.openIssues || 0,
        opportunity: project.scores?.opportunity || 0,
        momentum: project.scores?.momentum || 0,
        risk: project.scores?.risk || 0
      };

      store.projects[key] = {
        ...(previous || {}),
        ...project,
        firstSeenAt: previous?.firstSeenAt || now,
        lastSeenAt: now,
        snapshots: [...(previous?.snapshots || []), snapshot].slice(-180),
        note: userData.notes?.[key]?.text || "",
        triageStatus: userData.notes?.[key]?.status || "",
        noteUpdatedAt: userData.notes?.[key]?.updatedAt || "",
        analysis: userData.analysis?.[key] || null,
        trend: project.trend || previous?.trend || onlineTrendPlaceholder(),
        watched: Boolean(userData.watchlist?.[key]),
        observationPlanMatches
      };
    }

    store.scans.unshift({
      id: scanMeta.id || `scan-${Date.now()}`,
      at: now,
      status: scanMeta.status || "completed",
      mode: scanMeta.mode || "broad",
      observationPlanId: planId,
      observationPlanName: scanMeta.observationPlanName || store.observationPlans?.[planId]?.name || "",
      profiles: scanMeta.profiles || [],
      received: scanMeta.received || projects.length,
      insertedOrUpdated: projects.length,
      trendUpdated: scanMeta.trendUpdated || 0,
      trendLimit: scanMeta.trendLimit || 0,
      githubSearchReceived: scanMeta.githubSearchReceived || 0,
      githubTrendingFound: scanMeta.githubTrendingFound || 0,
      githubTrendingAdded: scanMeta.githubTrendingAdded || 0,
      errors: scanMeta.errors || []
    });

    store.scans = store.scans.slice(0, 120);
    const saved = save(store);
    buildLeaderboard("daily", { limit: 20 });
    return saved;
  }

  function addScan(scan) {
    const store = load();
    store.scans.unshift({
      id: scan.id || `scan-${Date.now()}`,
      at: new Date().toISOString(),
      ...scan
    });
    store.scans = store.scans.slice(0, 120);
    return save(store);
  }

  function setWatch(fullName, watched) {
    const store = load();
    const key = projectKey(fullName);
    const userData = activePlanUserData(store);
    if (watched) {
      userData.watchlist[key] = {
        fullName,
        addedAt: new Date().toISOString()
      };
    } else {
      delete userData.watchlist[key];
    }
    if (store.projects[key]) {
      store.projects[key].watched = Boolean(watched);
      if (watched) {
        rememberProject(store, withComputedUseCase(store.projects[key]), "favorite");
      } else {
        rememberProject(store, withComputedUseCase(store.projects[key]), "unfavorite");
      }
    }
    return save(store).projects[key] || null;
  }

  function setProjectDismissed(fullName, dismissed) {
    const store = load();
    const key = projectKey(fullName);
    const project = store.projects[key];
    if (!project) {
      throw new Error("Project not found");
    }
    const userData = activePlanUserData(store);
    const now = new Date().toISOString();
    const alreadyDismissed = Boolean(userData.dismissedProjects?.[key]);
    let restoredNoteDraft = null;
    if (dismissed) {
      if (!alreadyDismissed) {
        const computed = withComputedUseCase(project);
        userData.dismissedProjects[key] = {
          fullName,
          dismissedAt: now,
          systemReason: likelyDismissedReason(computed, observationPlanMemory(store))
        };
        appendMemoryEvent(store, computed, "dismiss_project", {
          source: "project_pool",
          reason: "not_fit"
        });
      }
    } else if (alreadyDismissed) {
      delete userData.dismissedProjects[key];
      removeLatestMemoryEvent(store, fullName, "dismiss_project");
      const note = userData.notes?.[key] || null;
      const shouldClearSkipTriage = note?.status === "skip" || project.triageStatus === "skip";
      if (shouldClearSkipTriage) {
        restoredNoteDraft = {
          text: note?.text || project.note || "",
          status: ""
        };
        delete userData.notes[key];
        project.note = "";
        project.triageStatus = "";
        project.noteUpdatedAt = "";
        removeLatestMemoryEvent(store, fullName, "triage_note");
      }
    }
    project.dismissed = Boolean(dismissed);
    const saved = save(store);
    buildLeaderboard("daily", { limit: 20 });
    const savedProject = saved.projects[key] || project;
    const result = withComputedUseCase({
      ...savedProject,
      dismissed: Boolean(dismissed)
    });
    if (restoredNoteDraft) {
      result.restoredNoteDraft = restoredNoteDraft;
    }
    return result;
  }

  function dismissedProjectView(store, key, entry = {}) {
    const project = store.projects[key];
    if (!project) return null;
    const computed = withComputedUseCase(project);
    return {
      fullName: computed.fullName,
      name: computed.name,
      owner: computed.owner,
      url: computed.url,
      description: computed.description,
      category: computed.category,
      useCase: computed.useCase,
      language: computed.language,
      licensePolicy: computed.licensePolicy,
      semantic: computed.semantic || {},
      negativeLearning: dismissedNegativeLearning(computed, entry, observationPlanMemory(store)),
      dismissedAt: entry.dismissedAt || "",
      feedback: normalizeDismissedFeedback(entry.feedback || {}),
      feedbackUpdatedAt: entry.feedbackUpdatedAt || ""
    };
  }

  function listDismissedProjects() {
    const store = load();
    const userData = activePlanUserData(store);
    return Object.entries(userData.dismissedProjects || {})
      .map(([key, entry]) => dismissedProjectView(store, projectKey(key), entry))
      .filter(Boolean)
      .sort((a, b) => String(b.dismissedAt || "").localeCompare(String(a.dismissedAt || "")));
  }

  function updateDismissedProjectFeedback(fullName, feedback = {}) {
    const store = load();
    const key = projectKey(fullName);
    const userData = activePlanUserData(store);
    const entry = userData.dismissedProjects?.[key];
    if (!entry) {
      throw new Error("Dismissed project not found");
    }
    const project = store.projects[key];
    if (!project) {
      throw new Error("Project not found");
    }
    const computed = withComputedUseCase(project);
    const memory = observationPlanMemory(store);
    if (Array.isArray(entry.reasonLearning?.deltas)) {
      applyReasonCorrectionDeltas(memory, entry.reasonLearning.deltas, -1);
    }
    const normalizedFeedback = normalizeDismissedFeedback(feedback);
    const systemReason =
      entry.systemReason?.version === DISMISSED_REASON_VERSION ? entry.systemReason : likelyDismissedReason(computed, memory);
    const userReason = normalizedFeedback.reason || normalizedFeedback.note || "";
    const userReasonCode = userReason ? reasonCodeFromText(userReason) : "";
    const deltas = userReason ? reasonCorrectionDeltas(computed, userReasonCode, userReason) : [];
    if (deltas.length) {
      applyReasonCorrectionDeltas(memory, deltas, 1);
    }
    memory.context = {
      ...defaultMemory().context,
      ...(memory.context || {}),
      dismissedReasonCorrections: [
        ...(memory.context?.dismissedReasonCorrections || []).filter((item) => item.fullName !== fullName),
        ...(userReason
          ? [
              {
                fullName,
                updatedAt: new Date().toISOString(),
                systemReason,
                userReason,
                userReasonCode,
                deltas
              }
            ]
          : [])
      ].slice(-120)
    };
    syncActivePlanMemory(store, memory);
    userData.dismissedProjects[key] = {
      ...entry,
      fullName: entry.fullName || fullName,
      systemReason,
      feedback: normalizedFeedback,
      feedbackUpdatedAt: new Date().toISOString(),
      reasonLearning: userReason
        ? {
            userReasonCode,
            deltas
          }
        : null
    };
    const saved = save(store);
    const savedUserData = activePlanUserData(saved);
    return dismissedProjectView(saved, key, savedUserData.dismissedProjects?.[key] || {});
  }

  function getGithubActions() {
    const store = load();
    return activePlanUserData(store).githubActions || {};
  }

  function setGithubAction(fullName, patch = {}) {
    const store = load();
    const key = projectKey(fullName);
    const userData = activePlanUserData(store);
    const previous = userData.githubActions?.[key] || { fullName };
    userData.githubActions[key] = {
      ...previous,
      fullName,
      ...patch,
      updatedAt: new Date().toISOString()
    };
    save(store);
    return userData.githubActions[key];
  }

  function setNote(fullName, text, status = "") {
    const store = load();
    const key = projectKey(fullName);
    const userData = activePlanUserData(store);
    const nextText = String(text || "").slice(0, 4000);
    const nextStatus = String(status || "").slice(0, 80);
    if (!nextText && !nextStatus) {
      delete userData.notes[key];
      if (store.projects[key]) {
        store.projects[key].note = "";
        store.projects[key].triageStatus = "";
        store.projects[key].noteUpdatedAt = "";
      }
      return save(store).projects[key] || null;
    }
    userData.notes[key] = {
      fullName,
      text: nextText,
      status: nextStatus,
      updatedAt: new Date().toISOString()
    };
    if (store.projects[key]) {
      store.projects[key].note = userData.notes[key].text;
      store.projects[key].triageStatus = userData.notes[key].status;
      store.projects[key].noteUpdatedAt = userData.notes[key].updatedAt;
      rememberProject(store, withComputedUseCase(store.projects[key]), "triage-note");
    }
    return save(store).projects[key] || null;
  }

  function setAnalysis(fullName, result = {}, meta = {}) {
    const store = load();
    const key = projectKey(fullName);
    if (!store.projects[key]) {
      throw new Error("Project not found");
    }
    const now = new Date().toISOString();
    const userData = activePlanUserData(store);
    userData.analysis[key] = {
      fullName,
      result,
      raw: String(meta.raw || "").slice(0, 8000),
      provider: meta.provider || "",
      model: meta.model || "",
      language: meta.language || store.settings?.language || "zh",
      context: meta.context || {},
      updatedAt: now,
      runCount: Number(userData.analysis[key]?.runCount || 0) + 1
    };
    store.projects[key].analysis = userData.analysis[key];
    appendMemoryEvent(store, store.projects[key], "ai_analyze", {
      source: meta.provider || "llm"
    });
    const saved = save(store);
    buildLeaderboard("daily", { limit: 20 });
    return withComputedUseCase({
      ...saved.projects[key],
      analysis: normalizePlanUserData(saved.observationPlans?.[activeObservationPlanId(saved)]?.userData || {}).analysis?.[key] || null
    });
  }

  function summary(filters = {}) {
    const store = load();
    const userData = activePlanUserData(store);
    const cacheKey = `${projectPoolCacheVersion(store)}:${JSON.stringify(Object.entries(filters || {}).sort(([a], [b]) => a.localeCompare(b)))}`;
    if (summaryCache.has(cacheKey)) {
      const cached = summaryCache.get(cacheKey);
      summaryCache.delete(cacheKey);
      summaryCache.set(cacheKey, cached);
      return cached;
    }
    const planId = activeObservationPlanId(store);
    const plan = store.observationPlans?.[planId] || store.observationPlans?.default || null;
    const memory = observationPlanMemory(store);
    const allProjects = projectItems(store).filter((project) => projectMatchesObservationPlan(project, planId, plan));
    const totalProjects = allProjects.length;
    const pool = projectPool(
      store,
      {
        ...filters,
        skipSort: "true",
        limit: "all",
        offset: 0
      },
      "all"
    );
    const projects = pool.items;
    const semanticBaseFilters = {
      ...filters,
      skipSort: "true",
      limit: "all",
      offset: 0
    };
    const semanticProjectsFor = (filterKey) => {
      const value = filters?.[filterKey];
      if (!value || value === "all") return projects;
      return projectPool(store, { ...semanticBaseFilters, [filterKey]: "all" }, "all").items;
    };
    const semanticFilters = {
      problem: countSemanticFilterKind(
        semanticProjectsFor("semanticProblem"),
        memory,
        "problem"
      ),
      audience: countSemanticFilterKind(
        semanticProjectsFor("semanticAudience"),
        memory,
        "audience"
      ),
      shape: countSemanticFilterKind(
        semanticProjectsFor("semanticShape"),
        memory,
        "shape"
      )
    };
    const semanticCatalog = countSemanticFilters(allProjects, memory);
    const byCategory = {};
    const byLicense = {};
    const byRisk = { low: 0, medium: 0, high: 0 };
    const categoryCounts = {};
    const categoryLabels = {};
    const useCaseCounts = {};
    const useCaseLabels = {};
    const languageCounts = {};
    const licenseCounts = {};
    const licenseLabels = {};
    const riskCounts = { low: 0, medium: 0, high: 0, critical: 0 };
    const momentumCounts = { hot: 0, rising: 0, steady: 0, quiet: 0 };
    const actionabilityCounts = { ready: 0, promising: 0, evaluate: 0, early: 0 };
    const capabilityCounts = {};
    const capabilityLabels = {};
    const today = todayKey();
    const projectRiskLevel = (project) => {
      const risk = Number(project.scores?.risk ?? 0);
      if (risk >= 60) return "critical";
      if (risk >= 35) return "high";
      if (risk >= 15) return "medium";
      return "low";
    };

    for (const project of projects) {
      const category = project.category?.label || "Other";
      byCategory[category] = (byCategory[category] || 0) + 1;
      const license = project.licensePolicy?.label || "Unknown";
      byLicense[license] = (byLicense[license] || 0) + 1;
      const risk = project.scores?.risk || 0;
      if (risk >= 35) byRisk.high += 1;
      else if (risk >= 15) byRisk.medium += 1;
      else byRisk.low += 1;

      const categoryKey = project.category?.key || "other";
      categoryCounts[categoryKey] = (categoryCounts[categoryKey] || 0) + 1;
      categoryLabels[categoryKey] = {
        label: project.category?.label || "Other"
      };

      const useCaseKey = project.useCase?.key || categoryKey;
      useCaseCounts[useCaseKey] = (useCaseCounts[useCaseKey] || 0) + 1;
      useCaseLabels[useCaseKey] = {
        label: project.useCase?.label || project.category?.label || useCaseKey,
        labelZh: project.useCase?.labelZh || "",
        labelEn: project.useCase?.labelEn || project.useCase?.label || ""
      };

      const languageKey = project.language || "unknown";
      languageCounts[languageKey] = (languageCounts[languageKey] || 0) + 1;

      const licenseKey = project.licensePolicy?.bucket || "unknown-no-license";
      licenseCounts[licenseKey] = (licenseCounts[licenseKey] || 0) + 1;
      licenseLabels[licenseKey] = {
        bucket: licenseKey,
        label: project.licensePolicy?.label || "Unknown",
        labelZh: project.licensePolicy?.labelZh || "",
        labelEn: project.licensePolicy?.labelEn || project.licensePolicy?.label || ""
      };

      const riskKey = projectRiskLevel(project);
      riskCounts[riskKey] = (riskCounts[riskKey] || 0) + 1;

      const momentum = Number(project.scores?.momentum || 0);
      const momentumKey = momentum >= 70 ? "hot" : momentum >= 45 ? "rising" : momentum >= 20 ? "steady" : "quiet";
      momentumCounts[momentumKey] = (momentumCounts[momentumKey] || 0) + 1;

      const actionability = Number(project.scores?.actionability || 0);
      const actionabilityKey = actionability >= 70 ? "ready" : actionability >= 50 ? "promising" : actionability >= 30 ? "evaluate" : "early";
      actionabilityCounts[actionabilityKey] = (actionabilityCounts[actionabilityKey] || 0) + 1;

      for (const tag of projectCapabilityTags(project)) {
        capabilityCounts[tag.key] = (capabilityCounts[tag.key] || 0) + 1;
        capabilityLabels[tag.key] = {
          label: tag.labelEn,
          labelZh: tag.labelZh,
          labelEn: tag.labelEn
        };
      }
    }

    const compactProject = (project) => ({
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
    });

    const summaryTopLimit = Math.max(1, Math.min(Number(store.settings.dailyBriefSize || 120), 120));
    const top = diversifyProjects(
      projects
        .slice()
        .sort((a, b) => (b.scores?.opportunity || 0) - (a.scores?.opportunity || 0)),
      summaryTopLimit
    )
      .slice(0, summaryTopLimit)
      .map(compactProject);

    const reviewBuckets = new Set([
      "unknown-no-license",
      "restricted-noncommercial",
      "network-copyleft",
      "distribution-copyleft",
      "manual-review"
    ]);
    const licenseReview = projects
      .filter((project) => reviewBuckets.has(project.licensePolicy?.bucket || "unknown-no-license"))
      .sort((a, b) => (b.scores?.opportunity || 0) - (a.scores?.opportunity || 0))
      .slice(0, 8)
      .map(compactProject);
    const highTrend = projects
      .slice()
      .sort((a, b) => {
        const aTrend = (a.signals?.starDelta || 0) + (a.signals?.forkDelta || 0) * 2;
        const bTrend = (b.signals?.starDelta || 0) + (b.signals?.forkDelta || 0) * 2;
        return bTrend - aTrend;
      })
      .slice(0, 8)
      .map(compactProject);
    const newToday = projects.filter((project) => todayKey(project.firstSeenAt) === today).length;
    const seenToday = projects.filter((project) => todayKey(project.lastSeenAt) === today).length;
    const semanticPreview = (groups = {}, limit = 64) =>
      Object.fromEntries(Object.entries(groups).map(([kind, entries]) => [kind, entries.slice(0, limit)]));
    const distributionEntries = (counts, labels = {}, limit = 12) =>
      Object.entries(counts)
        .map(([key, count]) => ({
          key,
          count,
          share: projects.length ? count / projects.length : 0,
          ...(labels[key] || {})
        }))
        .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
        .slice(0, limit);
    const orderedEntries = (counts, metas, order) =>
      order.map((key) => ({
        key,
        count: counts[key] || 0,
        share: projects.length ? (counts[key] || 0) / projects.length : 0,
        ...(metas[key] || {})
      }));
    const riskMeta = {
      low: { labelZh: "稳健", labelEn: "Stable", tone: "good" },
      medium: { labelZh: "需观察", labelEn: "Watch", tone: "watch" },
      high: { labelZh: "高波动", labelEn: "Volatile", tone: "warning" },
      critical: { labelZh: "避险优先", labelEn: "Avoid first", tone: "danger" }
    };
    const momentumMeta = {
      hot: { labelZh: "高热", labelEn: "Hot", tone: "hot" },
      rising: { labelZh: "升温", labelEn: "Rising", tone: "good" },
      steady: { labelZh: "平稳", labelEn: "Steady", tone: "watch" },
      quiet: { labelZh: "低波动", labelEn: "Quiet", tone: "muted" }
    };
    const actionabilityMeta = {
      ready: { labelZh: "准备度高", labelEn: "Ready", tone: "good" },
      promising: { labelZh: "值得评估", labelEn: "Promising", tone: "watch" },
      evaluate: { labelZh: "需要验证", labelEn: "Needs validation", tone: "warning" },
      early: { labelZh: "早期观察", labelEn: "Early watch", tone: "muted" }
    };

    const result = {
      totalProjects,
      poolTotal: pool.total,
      poolLimit: pool.limit,
      poolSort: pool.sort,
      watched: Object.keys(userData.watchlist || {}).length,
      scans: store.scans.slice(0, 10),
      lastScan: store.scans[0] || null,
      byCategory,
      byLicense,
      byRisk,
      distribution: {
        categories: distributionEntries(categoryCounts, categoryLabels, 12),
        useCases: distributionEntries(useCaseCounts, useCaseLabels, 12),
        languages: distributionEntries(languageCounts, {}, 10),
        licenses: distributionEntries(licenseCounts, licenseLabels, 8),
        projectRisk: orderedEntries(riskCounts, riskMeta, ["low", "medium", "high", "critical"]),
        momentum: orderedEntries(momentumCounts, momentumMeta, ["hot", "rising", "steady", "quiet"]),
        actionability: orderedEntries(actionabilityCounts, actionabilityMeta, ["ready", "promising", "evaluate", "early"]),
        topics: distributionEntries(capabilityCounts, capabilityLabels, 28),
        semanticFilters: semanticPreview(semanticFilters),
        semanticCatalog: semanticPreview(semanticCatalog),
        coverage: {
          categoryCount: Object.keys(categoryCounts).length,
          useCaseCount: Object.keys(useCaseCounts).length,
          languageCount: Object.keys(languageCounts).filter((key) => key !== "unknown").length,
          topicCount: Object.keys(capabilityCounts).length,
          licenseReadyCount: licenseCounts["permissive-commercial"] || 0,
          licenseReadyShare: projects.length ? (licenseCounts["permissive-commercial"] || 0) / projects.length : 0,
          highHeatCount: momentumCounts.hot || 0,
          highRiskCount: (riskCounts.high || 0) + (riskCounts.critical || 0)
        }
      },
      brief: {
        newToday,
        seenToday,
        licenseReview,
        highTrend,
        scanErrors: store.scans[0]?.errors || []
      },
      top
    };
    summaryCache.set(cacheKey, result);
    while (summaryCache.size > SUMMARY_CACHE_LIMIT) {
      summaryCache.delete(summaryCache.keys().next().value);
    }
    return result;
  }

  function buildLeaderboard(period = "daily", options = {}) {
    const store = load();
    const planId = options.observationPlanId || activeObservationPlanId(store);
    const plan = store.observationPlans?.[planId] || store.observationPlans?.default;
    const memory = normalizeMemory(plan?.memory || store.memory);
    const userData = normalizePlanUserData(plan?.userData || {});
    const dailyArchive = planId === "default" ? store.leaderboards?.daily : store.leaderboards?.byPlan?.[planId]?.daily;
    const dateKey = options.date || todayKey();
    const limit = Math.max(5, Math.min(Number(options.limit || 20), 30));
    const cacheKey = `${leaderboardCacheVersion(store, planId)}:${period}:${dateKey}:${limit}`;
    if (options.persist === false && leaderboardCache.has(cacheKey)) {
      const cached = leaderboardCache.get(cacheKey);
      leaderboardCache.delete(cacheKey);
      leaderboardCache.set(cacheKey, cached);
      return cloneJson(cached, cached);
    }
    const dismissedProjects = userData.dismissedProjects || {};
    const projects = Object.values(store.projects)
      .filter((project) => projectMatchesObservationPlan(project, planId, plan))
      .map((project) => {
        const key = projectKey(project.fullName);
        const note = userData.notes?.[key] || {};
        return withComputedUseCase({
          ...project,
          note: note.text || project.note || "",
          triageStatus: note.status || project.triageStatus || "",
          noteUpdatedAt: note.updatedAt || project.noteUpdatedAt || "",
          watched: Boolean(userData.watchlist?.[key]),
          analysis: userData.analysis?.[key] || project.analysis || null,
          dismissed: Boolean(userData.dismissedProjects?.[key])
        });
      });

    if (period === "daily" && options.date && dailyArchive?.[dateKey]) {
      return {
        ...dailyArchive[dateKey],
        items: (dailyArchive[dateKey].items || []).map((item) => hydrateLeaderboardRecordState(item, userData)),
        memory,
        observationPlan: observationPlanPublicView(plan, planId, false),
        archiveDates: Object.keys(dailyArchive || {}).sort().reverse()
      };
    }

    const previousRanks = rankMap(dailyArchive?.[previousDateKey(dateKey)]);
    const ranked = projects
      .map((project) => ({
        ...project,
        _leaderboardScore: leaderboardScore(project, period, memory)
      }))
      .sort((a, b) => b._leaderboardScore - a._leaderboardScore || (b.scores?.opportunity || 0) - (a.scores?.opportunity || 0));

    const grouped = new Map();
    for (const project of ranked) {
      const key = project.useCase?.key || project.category?.key || "other";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(project);
    }

    const groups = Array.from(grouped.values()).sort((a, b) => (b[0]?._leaderboardScore || 0) - (a[0]?._leaderboardScore || 0));
    const selected = [];
    let round = 0;
    while (selected.length < limit) {
      let progressed = false;
      for (const group of groups) {
        const project = group[round];
        if (project) {
          progressed = true;
          if (!dismissedProjects[projectKey(project.fullName)]) {
            selected.push(project);
          }
          if (selected.length >= limit) break;
        }
      }
      if (!progressed) break;
      round += 1;
    }

    const result = {
      period,
      date: dateKey,
      generatedAt: new Date().toISOString(),
      limit,
      memory,
      observationPlan: observationPlanPublicView(plan, planId, false),
      items: selected.map((project, index) => hydrateLeaderboardRecordState(leaderboardItem(project, index + 1, period, memory, previousRanks), userData)),
      archiveDates: Object.keys(dailyArchive || {}).sort().reverse()
    };

    if (period === "daily" && dateKey === todayKey() && options.persist !== false) {
      store.leaderboards = store.leaderboards || { daily: {} };
      const target =
        planId === "default"
          ? (store.leaderboards.daily = store.leaderboards.daily || {})
          : ((store.leaderboards.byPlan = store.leaderboards.byPlan || {}),
            (store.leaderboards.byPlan[planId] = store.leaderboards.byPlan[planId] || { daily: {} }),
            (store.leaderboards.byPlan[planId].daily = store.leaderboards.byPlan[planId].daily || {}));
      target[dateKey] = {
        period: result.period,
        date: result.date,
        generatedAt: result.generatedAt,
        limit: result.limit,
        observationPlan: result.observationPlan,
        items: result.items
      };
      save(store);
    }

    rememberLeaderboardCache(cacheKey, result);
    return result;
  }

  function leaderboardArchives() {
    const store = load();
    const planId = activeObservationPlanId(store);
    const dailyArchive = planId === "default" ? store.leaderboards?.daily : store.leaderboards?.byPlan?.[planId]?.daily;
    return Object.keys(dailyArchive || {}).sort().reverse();
  }

  function recordLeaderboardFeedback(fullName, feedback = "positive") {
    const store = load();
    const key = projectKey(fullName);
    const project = store.projects[key];
    if (!project) {
      throw new Error("Project not found");
    }

    rememberProject(store, withComputedUseCase(project), `leaderboard-${feedback}`);
    const saved = save(store);
    buildLeaderboard("daily", { limit: 20 });
    return {
      memory: observationPlanMemory(saved)
    };
  }

  function updateMemoryPreference(kind, key, options = {}) {
    const store = load();
    const memory = observationPlanMemory(store);
    const scope = options.scope === "negative" ? "negativePreferences" : "preferences";
    const manualScope = scope === "negativePreferences" ? "manualNegativePreferences" : "manualPreferences";
    const targetRoot = memory[manualScope];
    const targetMap = {
      useCase: "useCases",
      category: "categories",
      language: "languages",
      license: "licenses",
      risk: "riskLevels"
    };
    const target = targetRoot[targetMap[kind] || ""];
    const displayRoot = scope === "negativePreferences" ? memory.negativePreferences : memory.preferences;
    const displayTarget = displayRoot[targetMap[kind] || ""];
    if (!target) {
      throw new Error("Unknown memory preference kind");
    }
    const safeKey = String(key || "").trim();
    if (!safeKey) {
      throw new Error("Preference key is required");
    }

    const current = Number(displayTarget?.[safeKey] || target[safeKey] || 0);
    const maxValue = scope === "negativePreferences" ? 30 : 40;
    const nextValue =
      options.value !== undefined
        ? Number(options.value)
        : current + Number(options.delta || 0);
    const normalized = Math.max(0, Math.min(maxValue, Number.isFinite(nextValue) ? nextValue : current));
    if (normalized <= 0) {
      delete target[safeKey];
    } else {
      target[safeKey] = normalized;
    }
    if (displayTarget) {
      if (normalized <= 0) delete displayTarget[safeKey];
      else displayTarget[safeKey] = Number(normalized.toFixed(2));
    }
    const entry = {
      at: new Date().toISOString(),
      type: "manual_memory_edit",
      reason: `manual-memory-${scope === "negativePreferences" ? "negative-" : ""}${kind}`,
      weight: normalized - current,
      category: kind === "category" ? safeKey : "",
      useCase: kind === "useCase" ? safeKey : "",
      source: "manual"
    };
    const context = memory.context || defaultMemory().context;
    memory.shortTerm = [entry, ...(memory.shortTerm || [])].slice(0, Number(context.shortTermLimit || 80));
    memory.events = [entry, ...(memory.events || [])].slice(0, Number(context.rawEventLimit || 300));
    compactMemoryContextInPlace(memory, { force: false });
    syncActivePlanMemory(store, enforceManualFloors(memory));
    const saved = save(store);
    buildLeaderboard("daily", { limit: 20 });
    return observationPlanMemory(saved);
  }

  function updateMemorySettings(patch = {}) {
    const store = load();
    const memory = observationPlanMemory(store);
    if (patch.antiBubble) {
      const current = memory.antiBubble || defaultMemory().antiBubble;
      memory.antiBubble = {
        ...current,
        explorationRatio: boundedPreferenceValue(patch.antiBubble.explorationRatio ?? current.explorationRatio, 0.45),
        diversityFloor: boundedPreferenceValue(patch.antiBubble.diversityFloor ?? current.diversityFloor, 0.7),
        noveltyRatio: boundedPreferenceValue(patch.antiBubble.noveltyRatio ?? current.noveltyRatio, 0.5)
      };
      memory.antiBubble.explorationRatio = Math.max(0.1, memory.antiBubble.explorationRatio);
      memory.antiBubble.diversityFloor = Math.max(0.2, memory.antiBubble.diversityFloor);
      memory.antiBubble.noveltyRatio = Math.max(0.05, memory.antiBubble.noveltyRatio);
    }
    syncActivePlanMemory(store, enforceManualFloors(memory));
    const saved = save(store);
    buildLeaderboard("daily", { limit: 20 });
    return observationPlanMemory(saved);
  }

  function getMemory() {
    const store = load();
    return observationPlanMemory(store);
  }

  function clearMemoryEvents(range = "1d") {
    const store = load();
    const memory = observationPlanMemory(store);
    const userData = activePlanUserData(store);
    const normalizedRange = String(range || "1d");
    const removeAll = normalizedRange === "all";
    const duration = MEMORY_CLEAR_RANGES[normalizedRange];
    if (!removeAll && !duration) {
      throw new Error("Unknown memory clear range");
    }

    const cutoff = Date.now() - Number(duration || 0);
    const shouldKeep = (event) => !removeAll && eventTime(event) < cutoff;
    const beforeEvents = (memory.events || []).length;
    const beforeShortTerm = (memory.shortTerm || []).length;
    const currentEvents = memory.events || [];
    const currentShortTerm = memory.shortTerm || [];
    const removedEvents = removeAll ? currentEvents : currentEvents.filter((event) => !shouldKeep(event));
    memory.events = removeAll ? [] : currentEvents.filter(shouldKeep);
    memory.shortTerm = removeAll ? [] : currentShortTerm.filter(shouldKeep);
    if (removeAll) {
      memory.preferences = clonePreferenceRoot(memory.manualPreferences);
      memory.negativePreferences = clonePreferenceRoot(memory.manualNegativePreferences, true);
    } else {
      for (const event of removedEvents) {
        const type = event.type || legacyMemoryEventType(event.reason);
        if (type === "manual_memory_edit") continue;
        const project = store.projects[projectKey(event.fullName)];
        if (project) rollbackMemorySignal(memory, withComputedUseCase(project), { ...event, type });
      }
    }

    const cleared = {
      events: beforeEvents - memory.events.length,
      shortTerm: beforeShortTerm - memory.shortTerm.length,
      analysis: 0,
      notes: 0,
      favorites: 0,
      dismissedProjects: 0,
      githubActions: 0
    };

    const inlineAnalysisKeys = new Set();
    for (const [key, project] of Object.entries(store.projects || {})) {
      if (project.analysis?.result || project.analysis?.raw || project.analysis?.updatedAt) {
        inlineAnalysisKeys.add(key);
      }
      project.analysis = null;
    }
    const analysisKeys = new Set([...Object.keys(userData.analysis || {}), ...inlineAnalysisKeys]);
    userData.analysis = {};
    cleared.analysis = analysisKeys.size;

    const noteKeys = new Set(Object.keys(userData.notes || {}));
    for (const [key, project] of Object.entries(store.projects || {})) {
      if (project.note || project.triageStatus || project.noteUpdatedAt) {
        noteKeys.add(key);
      }
      project.note = "";
      project.triageStatus = "";
      project.noteUpdatedAt = "";
    }
    userData.notes = {};
    cleared.notes = noteKeys.size;

    cleared.favorites = Object.keys(userData.watchlist || {}).length;
    userData.watchlist = {};
    for (const project of Object.values(store.projects || {})) {
      project.watched = false;
    }

    cleared.dismissedProjects = Object.keys(userData.dismissedProjects || {}).length;
    userData.dismissedProjects = {};
    for (const project of Object.values(store.projects || {})) {
      project.dismissed = false;
    }

    cleared.githubActions = Object.keys(userData.githubActions || {}).length;
    userData.githubActions = {};
    const context = memory.context || defaultMemory().context;
    const dismissedReasonCorrections = Array.isArray(context.dismissedReasonCorrections) ? context.dismissedReasonCorrections : [];
    if (!removeAll) {
      for (const correction of dismissedReasonCorrections) {
        applyReasonCorrectionDeltas(memory, correction.deltas || [], -1);
      }
    }

    if (removeAll) {
      memory.context = {
        ...defaultMemory().context,
        rawEventLimit: context.rawEventLimit,
        shortTermLimit: context.shortTermLimit,
        compactAfterEvents: context.compactAfterEvents,
        keepRecentEvents: context.keepRecentEvents
      };
    } else {
      memory.context = {
        ...context,
        sourceEventCount: memory.events.length,
        dismissedReasonCorrections: [],
        permanentFacts: (context.permanentFacts || []).map((fact) =>
          String(fact).startsWith("raw_recent_events=") ? `raw_recent_events=${memory.events.length}` : fact
        )
      };
    }

    memory.stats = {
      ...(memory.stats || {}),
      eventCounts: eventCounts(memory.events),
      lastEventAt: memory.events[0]?.at || memory.shortTerm[0]?.at || ""
    };
    syncActivePlanMemory(store, memory);
    const saved = save(store);
    buildLeaderboard("daily", { limit: 20 });
    return {
      memory: observationPlanMemory(saved),
      cleared,
      range: normalizedRange
    };
  }

  function compactMemoryContext(options = {}) {
    const store = load();
    const memory = observationPlanMemory(store);
    const result = compactMemoryContextInPlace(memory, {
      force: options.force !== false,
      manual: Boolean(options.manual),
      keepRecentEvents: options.keepRecentEvents
    });
    syncActivePlanMemory(store, memory);
    const saved = save(store);
    const savedMemory = observationPlanMemory(saved);
    return {
      compacted: result.compacted,
      memory: savedMemory,
      context: savedMemory.context
    };
  }

  function recordMemoryEvent(fullName, eventType, options = {}) {
    const store = load();
    const key = projectKey(fullName);
    const project = store.projects[key];
    if (!project) {
      throw new Error("Project not found");
    }
    appendMemoryEvent(store, project, eventType, {
      ...options,
      source: options.source || "ui"
    });
    const saved = save(store);
    buildLeaderboard("daily", { limit: 20 });
    return observationPlanMemory(saved);
  }

  function evaluateMemoryHarness() {
    const store = load();
    const memory = observationPlanMemory(store);
    const scorecard = buildHarnessScorecard({
      ...store,
      memory
    });
    memory.harness = {
      ...memory.harness,
      mode: "local-rules",
      lastEvaluatedAt: scorecard.evaluatedAt,
      scorecard,
      recommendations: scorecard.recommendations,
      runs: [
        {
          at: scorecard.evaluatedAt,
          overall: scorecard.overall,
          metrics: scorecard.metrics
        },
        ...(memory.harness?.runs || [])
      ].slice(0, 30)
    };
    syncActivePlanMemory(store, memory);
    const saved = save(store);
    return observationPlanMemory(saved).harness;
  }

  function applyMemoryTuning(tuning = {}, source = "llm") {
    const store = load();
    const memory = observationPlanMemory(store);
    const applied = applyMemoryTuningPatch(memory, tuning);
    const now = new Date().toISOString();
    memory.harness = {
      ...memory.harness,
      mode: source,
      lastTunedAt: now,
      lastTuning: {
        at: now,
        source,
        confidence: tuning.confidence ?? null,
        summaryZh: tuning.summaryZh || tuning.summary || "",
        summaryEn: tuning.summaryEn || "",
        recommendations: Array.isArray(tuning.recommendations) ? tuning.recommendations.slice(0, 8) : [],
        applied
      }
    };
    syncActivePlanMemory(store, memory);
    const saved = save(store);
    buildLeaderboard("daily", { limit: 20 });
    return observationPlanMemory(saved);
  }

  function getSettings(includeSecrets = false) {
    const store = load();
    return {
      ...store.settings,
      activeProvider: "deepseek",
      githubToken: includeSecrets ? store.settings.githubToken || "" : "",
      githubTokenSet: Boolean(store.settings.githubToken),
      githubTokenPreview: store.settings.githubToken ? `${store.settings.githubToken.slice(0, 8)}...${store.settings.githubToken.slice(-4)}` : "",
      tavilyKey: includeSecrets ? store.settings.tavilyKey || "" : "",
      tavilyKeySet: Boolean(store.settings.tavilyKey),
      tavilyKeyPreview: store.settings.tavilyKey ? `${store.settings.tavilyKey.slice(0, 8)}...${store.settings.tavilyKey.slice(-4)}` : "",
      exaKey: includeSecrets ? store.settings.exaKey || "" : "",
      exaKeySet: Boolean(store.settings.exaKey),
      exaKeyPreview: store.settings.exaKey ? `${store.settings.exaKey.slice(0, 8)}...${store.settings.exaKey.slice(-4)}` : "",
      llmProviders: (store.settings.llmProviders || []).map((provider) => maskProvider(provider, includeSecrets))
    };
  }

  function updateSettings(nextSettings) {
    const store = load();
    const previousProviders = new Map((store.settings.llmProviders || []).map((provider) => [provider.id, provider]));
    const providers = Array.isArray(nextSettings.llmProviders)
      ? nextSettings.llmProviders.map((provider) => {
          const previous = previousProviders.get(provider.id) || {};
          let apiKey = previous.apiKey || "";
          if (typeof provider.apiKey === "string" && provider.apiKey.trim()) {
            apiKey = provider.apiKey.trim();
          }
          if (provider.clearApiKey) {
            apiKey = "";
          }
          return {
            ...previous,
            ...provider,
            apiKey,
            clearApiKey: undefined,
            enabled: Boolean(provider.enabled)
          };
        })
      : store.settings.llmProviders;

    store.settings = {
      ...store.settings,
      language: ["zh", "en"].includes(nextSettings.language) ? nextSettings.language : store.settings.language,
      dailyBriefSize: Number(nextSettings.dailyBriefSize || store.settings.dailyBriefSize || 120),
      defaultSort: nextSettings.defaultSort || store.settings.defaultSort || "opportunity",
      activeProvider: "deepseek",
      githubToken: nextSettings.clearGithubToken
        ? ""
        : typeof nextSettings.githubToken === "string" && nextSettings.githubToken.trim()
          ? nextSettings.githubToken.trim()
          : store.settings.githubToken || "",
      tavilyKey: nextSettings.clearTavilyKey
        ? ""
        : typeof nextSettings.tavilyKey === "string" && nextSettings.tavilyKey.trim()
          ? nextSettings.tavilyKey.trim()
          : store.settings.tavilyKey || "",
      exaKey: nextSettings.clearExaKey
        ? ""
        : typeof nextSettings.exaKey === "string" && nextSettings.exaKey.trim()
          ? nextSettings.exaKey.trim()
          : store.settings.exaKey || "",
      providerCatalog: nextSettings.providerCatalog || store.settings.providerCatalog || { updatedAt: "", endpoints: [] },
      llmProviders: providers
    };

    save(store);
    return getSettings(false);
  }

  return {
    addScan,
    applyMemoryTuning,
    buildLeaderboard,
    clearMemoryEvents,
    compactMemoryContext,
    evaluateMemoryHarness,
    getGithubActions,
    getMemory,
    getSettings,
    getProject,
    getObservationPlan,
    exportObservationPlans,
    exportLocalSnapshot,
    exportPortableData,
    importObservationPlans,
    importPortableData,
    leaderboardArchives,
    listDismissedProjects,
    listObservationPlans,
    listProjects,
    load,
    projectPoolPosition,
    recordMemoryEvent,
    recordLeaderboardFeedback,
    save,
    saveObservationPlan,
    saveObservationPlanRequirements,
    setActiveObservationPlan,
    deleteObservationPlan,
    setGithubAction,
    setProjectDismissed,
    setAnalysis,
    setNote,
    setWatch,
    summary,
    trendRefreshCandidates,
    updateProjectTrends,
    updateLatestScan,
    updateDismissedProjectFeedback,
    updateMemoryPreference,
    updateMemorySettings,
    updateSettings,
    upsertProjects
  };
}

module.exports = {
  createStorage,
  projectKey
};
