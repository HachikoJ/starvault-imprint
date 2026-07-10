const I18N = {
  zh: {
    brand: "星仓印记",
    brandSub: "从海量 GitHub 项目中发现值得学习、理解与持续跟踪的开源灵感。",
    homeLinkLabel: "返回首页",
    navProjects: "项目池",
    navLeaderboard: "榜单",
    navLearning: "学习中枢",
    navBrief: "结构看板",
    navGithubRepos: "我的仓库",
    navSettings: "设置",
    guideTourButton: "引导",
    guideTourClose: "关闭引导",
    guideTourPrev: "上一步",
    guideTourNext: "下一步",
    guideTourFinish: "完成",
    guideTourFinishHome: "完成并回到项目池",
    guideTourFinishSettings: "完成并去配置",
    guideTourSkip: "稍后再说",
    guideTourStep: "步骤 {current}/{total}",
    guideTourConnectionsTitle: "先看右上角连接状态",
    guideTourConnectionsBody: "这里快速判断 GitHub、Tavily、Exa 和 AI 是否可用。顶部“导出”只导出当前方案的项目池数据，不是配置备份。",
    guideTourTokenTitle: "配置 GitHub Token",
    guideTourTokenBody: "GitHub Token 是扫描、Star/Fork 和我的仓库的基础。右侧有获取 Key 入口，保存设置会先验证有效性。",
    guideTourAiTitle: "配置 DeepSeek API Key",
    guideTourAiBody: "生成方案和项目 AI 分析都依赖这里。API Key 行可获取 Key，配置后测试连接，确认模型可用再生成方案。",
    guideTourPlanTitle: "生成、切换和备份观察方案",
    guideTourPlanBody: "填写方案名称和详细需求后生成 JSON 草案；切换方案会重新扫描。配置备份在左侧导入导出配置，不在顶部导出。",
    guideTourScanTitle: "点击扫描刷新项目池",
    guideTourScanBody: "扫描会先检查 GitHub Token，再按当前方案检索 GitHub Search、Trending 和可选外部信号。完成后会回到项目池。",
    guideTourPoolTitle: "在项目池筛选和判断项目",
    guideTourPoolBody: "左侧筛选缩小范围，点击列表打开档案。收藏、隐藏、研判、AI 分析、更多数据、Star/Fork 才是更强的学习信号。",
    guideTourLearningTitle: "到学习中枢校准系统记忆",
    guideTourLearningBody: "这里查看偏好画像、隐藏项目样本和学习策略；需要重来时再清除学习记录，平时可压缩上下文保留长期记忆。",
    runtimeStatus: "运行状态",
    autoScan: "自动扫描",
    desk: "今日研判",
    headline: "星仓印记",
    headlineSub: "从海量 GitHub 项目中发现值得学习、理解与持续跟踪的开源灵感。",
    exportJson: "导出 JSON",
    exportCsv: "导出 CSV",
    exportShort: "导出",
    exportHint: "导出当前方案项目池数据",
    runScan: "重新扫描",
    runScanShort: "扫描",
    runScanHint: "重新检索 GitHub Search、GitHub Trending 与外部搜索源，生成新的项目池结果。",
    configReadyHint: "打开 {name} 设置。",
    configMissingHint: "配置 {name}，点击进入设置。",
    autoScanHint: "自动扫描：{time}",
    totalProjects: "项目总数",
    watchlist: "收藏",
    lastScan: "最近扫描",
    search: "搜索",
    searchPlaceholder: "仓库、主题、语言",
    filterIntent: "筛选意图",
    reset: "重置",
    resetFilters: "重置筛选",
    clearAllFilters: "清除所有筛选",
    advancedFilters: "精细筛选",
    advancedFiltersHint: "按当前扫描池动态生成标签，支持能力、对象、形态、语言、许可和排序组合筛选",
    presetBalanced: "高信号总览",
    presetBalancedHint: "综合推荐、风险和多样性",
    presetCommercial: "许可友好",
    presetCommercialHint: "优先 MIT/Apache/BSD 等许可清晰的项目",
    presetGrowth: "增长爆发",
    presetGrowthHint: "近期热度和增长速度优先",
    presetActionable: "可落地",
    presetActionableHint: "低风险、好理解、方便下手",
    presetProduct: "应用价值",
    presetProductHint: "更接近真实可用场景",
    presetFavorites: "我的收藏",
    presetFavoritesHint: "只看已经收藏的项目",
    category: "分类",
    license: "许可",
    risk: "风险",
    recordFilter: "记录状态",
    triageFilter: "研判",
    aiAnalysisFilter: "AI 分析",
    aiShort: "AI",
    projectRisk: "项目风险",
    licenseRisk: "许可风险",
    overallRisk: "行动风险",
    semanticProblem: "解决什么",
    semanticAudience: "给谁用",
    semanticShape: "可做成",
    semanticScene: "使用场景",
    allProblems: "全部",
    allAudiences: "全部",
    allShapes: "全部",
    allLanguages: "全部",
    author: "作者",
    unknownAuthor: "未知作者",
    actionability: "可落地性",
    quality: "工程质量",
    stars: "Stars",
    forks: "Forks",
    issues: "Issues",
    sort: "排序",
    all: "全部",
    watchOnly: "仅看收藏",
    idle: "空闲",
    scanning: "扫描中",
    scanRunning: "扫描中",
    scanAlreadyRunning: "已有扫描正在运行",
    scanStagePrepare: "准备",
    scanStageCatalog: "检查接口",
    scanStageGithub: "检索 GitHub/Trending",
    scanStageTavily: "补充 Tavily",
    scanStageExa: "补充 Exa",
    scanStageScore: "分析与保存",
    scanStageCompleted: "完成",
    scanStageFailed: "失败",
    scanProgressHint: "{stage} · {percent}%",
    scanEtaPending: "剩余估算中",
    scanEtaRemaining: "剩余约 {time}",
    scanEtaRange: "剩余约 {min}-{max}",
    scanEtaWarmingUp: "正在建立耗时基线",
    scanEtaNetworkSensitive: "接口耗时会有波动",
    scanEtaSteady: "估算较稳定",
    scanEtaUnderMinute: "不到 1 分钟",
    longTaskBeforeUnload: "当前仍有任务正在进行，刷新或关闭页面可能中断结果写入。请等待任务完成。",
    project: "项目",
    opportunity: "推荐值",
    momentum: "近期热度",
    momentumHint: "近期热度：综合最近 Stars/Forks 增长、更新活跃度和外部讨论，0-100 越高代表越热。",
    trendHint: "趋势在扫描时从 GitHub 在线统计并缓存，按上一自然日 UTC 00:00-24:00 的 Stars/Forks 新增量计算。",
    trendLoading: "等待扫描更新",
    trendNotCached: "未纳入趋势缓存",
    trendNotCachedHint: "本次扫描只会给排序靠前的一部分项目更新趋势缓存；该项目暂未覆盖，可等下次扫描或提高趋势缓存数量。",
    trendUnavailable: "趋势统计失败",
    trendPartial: "GitHub 在线统计未覆盖完整区间，当前结果可能偏低。",
    trendPartialShort: "部分统计",
    trendStarsPartial: "Stars 未完整",
    trendForksPartial: "Forks 未完整",
    trendZeroHint: "前一自然日没有新增 Stars 或 Forks，这是有效统计结果，不是异常。",
    trendReasonRateLimited: "GitHub API 限流，等待下一次扫描重试。",
    trendReasonAuth: "GitHub Token 无效或权限不足。",
    trendReasonForbidden: "GitHub 拒绝本次趋势请求，可能是权限或二级限流。",
    trendReasonNotFound: "仓库不可访问、已删除或更名。",
    trendReasonRequestFailed: "GitHub 趋势请求失败，等待下一次扫描重试。",
    riskHint: "项目风险：只评估维护、成熟度、热度异常和元数据完整度；0-100 越高风险越大，不等同于许可风险。",
    repo: "仓库",
    selection: "项目详情",
    chooseProject: "尚未选择项目",
    chooseProjectHint: "点击左侧项目后再打开详情；默认留白不会写入学习记录。",
    chooseProjectTipBrowse: "筛选、翻页和扫描只是浏览项目池。",
    chooseProjectTipLearn: "只有打开详情、收藏、Star/Fork、研判或 AI 分析才会进入学习记录。",
    dailyBrief: "结构看板",
    topActionable: "机会摘要",
    compliance: "许可视图",
    licenseDistribution: "许可分布",
    coverage: "分类视图",
    directionView: "方向视图",
    stackView: "技术栈",
    categorySpread: "分类分布",
    overviewDashboard: "结构看板",
    overviewDashboardHint: "整合当前项目池结果的方向结构、语言、许可和功能标签。",
    monitorScope: "当前项目池",
    categoryCoverage: "覆盖分类",
    useCaseCoverage: "用途标签",
    languageCoverage: "主要语言",
    topicCoverage: "功能标签",
    licenseReady: "MIT/Apache/BSD",
    licenseBoundary: "许可边界",
    projectRiskBasis: "项目风险",
    highHeatProjects: "高热项目",
    projectDistribution: "方向结构",
    projectDistributionHint: "融合分类和用途，直接看项目池集中在哪些应用方向。",
    languageDistribution: "语言分布",
    languageDistributionHint: "判断技术栈集中度和后续验证成本。",
    licenseReadinessPanel: "许可准备度",
    licenseReadinessHint: "查看项目池内许可类型和复核优先级。",
    topicMap: "功能标签地图",
    topicMapHint: "按项目能力和应用场景归纳，越靠前代表这类机会越集中。",
    overviewFilterHint: "点击筛选项目池",
    overviewFilterApplied: "已筛选项目池：{label}",
    reviewQueueHint: "许可边界需要优先人工复核的项目。",
    trendQueueHint: "近期 Stars/Forks 变化更明显的项目。",
    noTrendQueue: "暂无明显升温项目",
    emptyDistribution: "暂无可展示的分布数据",
    shareLabel: "占比",
    settings: "设置",
    modelHub: "大模型",
    dataSources: "连接配置",
    dataSourcesHint: "集中管理 GitHub、搜索渠道和 AI 配置。",
    saveSettings: "保存设置",
    savingSettings: "保存中",
    settingsSaved: "保存完成",
    language: "语言",
    keyManagement: "密钥管理",
    keyManagementHint: "每个 key 独立显示、保存和清除",
    observationPlans: "观察方案",
    observationPlansHint: "按领域切换扫描策略与学习记忆",
    observationPlanSelectModule: "方案选择",
    observationPlanSelectModuleHint: "选择后切换，切换会重新扫描",
    observationPlanGenerateModule: "方案生成",
    observationPlanGenerateModuleHint: "填写需求后生成可编辑草案",
    observationPlanTransferModule: "导入导出配置",
    observationPlanTransferModuleHint: "备份或恢复配置与学习数据",
    activeObservationPlan: "当前方案",
    observationPlanName: "方案名称",
    observationPlanNamePlaceholder: "如：内容创作工具观察",
    observationPlanIdea: "详细需求",
    observationPlanIdeaPlaceholder: "输入关注领域、目标用户、工具形态、希望排除的项目类型等",
    observationPlanRequirements: "已记录需求",
    observationPlanRequirementsEmpty: "暂无历史需求；生成方案时会自动记录当前输入。",
    deleteObservationRequirement: "删除需求",
    observationRequirementDeletedInline: "需求已删除",
    observationRequirementSavedInline: "需求已更新",
    observationPlanLogic: "检索逻辑",
    observationPlanLogicPlaceholder: "生成草案后可编辑方案名称、检索条目、辅助词和排除项",
    observationPlanLogicInvalid: "检索逻辑必须是合法 JSON",
    observationPlanModeDefault: "内置默认矩阵",
    observationPlanModeFocused: "聚焦混合",
    observationPlanModeBlend: "全量混合",
    observationPlanModeOnly: "仅用本方案",
    observationPlanQueries: "查询",
    observationPlanLogicItems: "检索逻辑",
    observationPlanLearningPreview: "学习中枢",
    observationPlanUserEvents: "用户操作",
    observationPlanFavoritePreview: "收藏",
    observationPlanTriagePreview: "研判",
    observationPlanAiPreview: "AI 分析",
    observationPlanGithubPreview: "GitHub 本地状态",
    observationPlanEvolutionPreview: "平台自进化",
    observationPlanItemsUnit: "条",
    observationPlanMemoryUnit: "项",
    observationPlanKeywords: "辅助词",
    observationPlanExcludes: "排除项",
    switchObservationPlan: "切换方案",
    generateObservationPlan: "生成方案",
    editObservationPlan: "编辑",
    editObservationPlanHint: "编辑检索逻辑",
    cancelObservationPlanEdit: "取消",
    cancelObservationPlanDraft: "取消",
    saveObservationPlan: "保存",
    saveObservationPlanHint: "保存方案",
    observationPlanCanceledInline: "已取消",
    observationPlanSavedInline: "已保存",
    openObservationPlanPicker: "选择方案",
    editObservationPlanAction: "编辑方案",
    deleteObservationPlanAction: "删除方案",
    observationPlanDeleteBackupConfirm: "删除「{name}」前建议先导出配置备份。导出的配置不包含任何密钥。现在导出备份吗？",
    observationPlanDeleteConfirm: "确认删除「{name}」吗？该方案的检索逻辑、学习记忆、用户操作记录、收藏、研判、AI 分析和本地 GitHub 状态会一并删除，且无法撤销。",
    observationPlanDeleteBackupAction: "导出备份",
    observationPlanDeleteConfirmAction: "确认删除",
    observationPlanDeleteBackupDone: "备份已导出，可继续删除",
    observationPlanConfirmSwitchAction: "切换并扫描",
    observationPlanDeletedInline: "已删除",
    exportPortableData: "导出配置",
    importPortableData: "导入配置",
    observationPlanSwitched: "观察方案已切换",
    observationPlanSwitchScan: "观察方案已切换，开始重新扫描",
    observationPlanSwitchConfirm: "重要提醒：切换到「{name}」后，将应用该方案的检索逻辑、学习中枢配置、用户操作记录和平台自进化内容，并立即重新扫描项目池。扫描可能需要一些时间。确定切换并重新扫描吗？",
    observationPlanSwitchHint: "切换方案会立即重新扫描项目池。",
    planSwitchingTitle: "正在切换观察方案",
    planSwitchingBody: "正在重建当前方案的项目池与榜单，完成前不会记录浏览、收藏、研判、AI 分析等学习行为。",
    planSwitchingCacheHint: "历史缓存仍会保留；这里仅临时隐藏旧方案结果。",
    planSwitchingLearningLocked: "学习记录已冻结",
    planSwitchFailedTitle: "方案扫描未完成",
    planSwitchFailedBody: "当前方案暂未生成项目池。请重新扫描，或返回设置重新选择方案。",
    observationPlanPreviewOnly: "当前仅预览「{name}」的检索逻辑，点击切换方案后才会生效。",
    observationPlanGenerateRequired: "请填写方案名称和详细需求后再生成方案。",
    observationPlanGenerateFailed: "AI 生成方案失败，请稍后重试或检查模型配置。",
    observationPlanGenerated: "方案草案已生成，可编辑 JSON 后保存",
    observationPlanDraftReady: "方案草案已生成",
    observationPlanDraftFallback: "AI 未返回标准方案，已生成可编辑的本地草案。",
    portableDataImported: "配置与学习数据已导入",
    portableDataExported: "配置与学习数据已导出，不包含任何密钥",
    observationPlanStats: "{profiles} 条查询 · {keywords} 个关键词",
    defaultObservationPlan: "默认观察",
    searchLogicHint: "GitHub 为主源；Trending 校验热度；Tavily/Exa 补充外部信号。",
    searchLogic: "检索逻辑",
    modelProviders: "大模型配置",
    leaderboardDesk: "榜单 · 每日精选 20",
    dailyRank: "日榜",
    weeklyRank: "周榜",
    monthlyRank: "月榜",
    allRank: "总榜",
    dailyArchive: "日榜存档",
    latestArchive: "最新",
    noArchive: "暂无存档",
    leaderboardLimit: "精选 20 个项目",
    leaderboardSource: "来源：完整候选池",
    leaderboardOpenDetail: "查看详情",
    leaderboardOpenDetailHint: "跳转到项目池并打开详情页",
    generatedAt: "刷新于",
    rankingLogic: "榜单逻辑",
    rankingLogicCopy: "价值、增长、Trending、记忆与用途轮转。",
    memoryState: "记忆状态",
    memoryTuning: "记忆偏好调优",
    memoryTuningHint: "系统从收藏、Star、Fork、点开、AI 分析和榜单反馈中学习；手动校准会作为长期偏好保留。",
    increasePreference: "增强",
    decreasePreference: "减弱",
    removePreference: "移除",
    memoryUpdated: "记忆偏好已更新",
    memorySettingsSaved: "学习策略已保存",
    actionCompleted: "已完成",
    shortTermMemory: "短期记忆",
    longTermPreference: "长期偏好",
    memorySnapshot: "学习概况",
    activePreferences: "活跃偏好",
    negativeSignals: "负向信号",
    behaviorSamples: "行为样本",
    explorationRatio: "跨域探索",
    diversityFloor: "方向分散",
    noveltyRatio: "新近发现",
    explorationRatioHelp: "调高：更多跨方向发现；调低：更贴近已知偏好。",
    diversityFloorHelp: "调高：减少同类扎堆；调低：重点方向更集中。",
    noveltyRatioHelp: "调高：更多新近项目；调低：更多成熟稳定项目。",
    memoryEmpty: "还没有足够行为数据，系统会先保持更高多样性。",
    categoryPreference: "收藏分类偏好",
    useCasePreference: "收藏用途偏好",
    learningDesk: "学习中枢",
    learningTitle: "它如何理解你的偏好",
    learningLoopAction: "你做了什么",
    learningLoopActionEmpty: "还没有近期行为",
    learningLoopActionBody: "{count} 个近期动作：{actions}",
    learningLoopLearned: "系统学到了什么",
    learningLoopLearnedEmpty: "偏好画像仍在建立",
    learningLoopLearnedBody: "{positive} 个正向、{negative} 个负向；近期样本 {events} 条",
    learningLoopNext: "下次会怎么变",
    learningLoopNextEmpty: "先保持多样化推荐",
    learningLoopNextBody: "偏好加权，保留 {explore}% 探索",
    learningLoopNextAi: "AI 已参与调优。",
    learningLoopNextRule: "当前由本地规则学习。",
    preferenceProfile: "偏好画像",
    preferenceProfileHint: "长期记忆的主编辑区",
    expandPreferenceProfile: "展开偏好画像",
    expandPreferenceProfileShort: "展开",
    expandPanelShort: "展开",
    collapsePanelShort: "收起",
    learningControls: "学习策略",
    learningControlsHint: "控制下次推荐如何变化",
    evolutionLog: "演化记录",
    latestEvolution: "最近演化",
    contextEvolution: "上下文压缩",
    harnessEvolution: "质量复盘",
    tuningEvolution: "AI 优化",
    noEvolutionYet: "暂无演化记录",
    learningSubtitle: "偏好强度越高，相关项目在榜单和项目池中的记忆加权越明显；负向偏好会降低相似项目密度。",
    positiveMemory: "长期偏好",
    negativeMemory: "负向偏好",
    recentBehavior: "近期行为",
    clearRecentBehavior: "清除学习记录",
    clearBehaviorHint: "清除后会同步移除对应范围内的行为、AI 分析、研判、收藏和本地 GitHub 操作记录；手动校准仍会保留。",
    clearBehavior1h: "1 小时内",
    clearBehavior1d: "一天内",
    clearBehavior7d: "一周内",
    clearBehavior30d: "一月内",
    clearBehavior90d: "三个月内",
    clearBehaviorAll: "所有",
    clearBehaviorConfirm: "确定清除「{range}」的学习记录吗？会同步清除这段时间内的行为、AI 分析、研判、收藏和本地 GitHub 操作记录，手动校准会保留。",
    clearBehaviorConfirmAll: "确定清除所有学习记录和压缩行为上下文吗？AI 分析、研判、收藏和本地 GitHub 操作记录也会清除，自动学习偏好会回到手动校准基线，此操作不可撤销。",
    clearBehaviorConfirmAction: "确认清除",
    clearBehaviorCancelAction: "取消",
    clearBehaviorClearing: "清除中",
    behaviorCleared: "学习记录已清除",
    clearSummaryBehavior: "行为",
    clearSummaryAnalysis: "AI 分析",
    clearSummaryNotes: "研判",
    clearSummaryFavorites: "收藏",
    clearSummaryGithub: "GitHub 操作",
    antiBubblePolicy: "反信息茧房",
    antiBubbleTotal: "总计",
    antiBubbleHint: "三项为一组配比，合计固定 100%。调高一项，其余项会自动按剩余比例调整。",
    contextCompression: "上下文压缩",
    compactContext: "压缩上下文",
    contextCompressed: "上下文已压缩",
    noContextToCompress: "暂无近期行为可压缩",
    contextSummary: "压缩摘要",
    rawEvents: "原始近期事件",
    compressedChunks: "压缩块",
    compressedEvents: "已压缩事件",
    behaviorBottomHint: "我也是有底线的～",
    compressionPolicy: "近期行为保留原文，旧行为压缩成摘要和证据，调优时优先使用压缩上下文。",
    harnessQuality: "复盘与优化",
    projectHarness: "复盘与优化",
    projectHarnessHint: "检查相关、重复、探索与许可，并优化下次结果。",
    runHarness: "立即评估",
    tuneMemory: "AI 调优",
    harnessLocalAction: "立即评估",
    harnessLlmAction: "AI 优化",
    harnessLocalTitle: "本地评估",
    harnessLocalHint: "检查相关、重复、探索与许可。",
    harnessLlmTitle: "AI 优化",
    harnessLlmHint: "总结近期行为，更新偏好权重。",
    harnessLocalRunning: "评估中...",
    harnessLlmRunning: "优化中...",
    preferenceGuide: "强度说明",
    preferenceWeak: "弱",
    preferenceMedium: "中",
    preferenceStrong: "强",
    preferenceVeryStrong: "极强",
    preferenceImpactLow: "轻微影响排序",
    preferenceImpactMedium: "明显影响同类项目排序",
    preferenceImpactHigh: "强烈影响推荐密度",
    preferenceSuggestedRange: "建议保持在 {range}",
    positivePreferenceHint: "喜欢时逐步增强到「中」即可；只有持续收藏、Star 或多次深入研判的方向才建议到「强」。",
    negativePreferenceHint: "不喜欢时先减弱或加入负向偏好；只有连续误推荐的方向才提高到「强」。",
    manualCalibration: "手动校准",
    learnedFromBehavior: "行为学习",
    harnessUpdated: "评估已更新",
    harnessEvaluationDone: "本地评估已完成",
    memoryTuned: "AI 优化已应用",
    learningMode: "学习模式",
    localLearning: "本地规则学习",
    llmLearning: "AI 辅助调优",
    localLearningShort: "规则",
    llmLearningShort: "AI",
    noHarness: "尚未运行评估",
    noBehavior: "暂无近期行为",
    noNegativeMemory: "暂无负向偏好",
    saveLearningPolicy: "保存学习策略",
    overallScore: "推荐质量",
    scoreScale: "0-100 · 越高越好",
    scoreMeaning: "评分口径",
    scoreOverallHint: "综合相关、重复、许可与探索。",
    scoreRelevanceHint: "偏好匹配度。",
    scoreRepetitionHint: "越高表示重复越少。",
    scoreActionabilityHint: "清晰、成熟、可验证。",
    relevanceHitRate: "相关命中",
    diversityCoverage: "用途覆盖",
    repetitionControl: "重复控制",
    actionabilityFit: "可落地性",
    licenseReadiness: "许可可用",
    explorationFit: "探索匹配",
    eventFavorite: "收藏",
    eventUnfavorite: "取消收藏",
    eventStar: "Star",
    eventUnstar: "Unstar",
    eventFork: "Fork",
    eventOpenGithub: "打开 GitHub",
    eventSelectProject: "查看详情",
    eventCopyUrl: "复制地址",
    eventTriageNote: "保存研判",
    eventAiAnalyze: "AI 分析",
    eventLeaderboardPositive: "榜单正反馈",
    eventLeaderboardStrongPositive: "强正反馈",
    eventLeaderboardNegative: "不感兴趣",
    eventManualMemoryEdit: "手动编辑",
    rankNew: "新上榜",
    rankUp: "上升",
    rankDown: "下降",
    rankSame: "持平",
    trend: "趋势",
    diversitySlot: "探索位",
    relevant: "收藏",
    notRelevant: "不感兴趣",
    feedbackSaved: "已写入榜单记忆",
    tavilyKey: "Tavily Key",
    tavilyKeyPlaceholder: "用于外部网页信号补充",
    clearTavilyKey: "清除",
    exaKey: "Exa Key",
    exaKeyPlaceholder: "用于语义网页检索补充",
    clearExaKey: "清除",
    classicTokens: "Tokens (classic)",
    refreshProviderCatalog: "刷新接口地址",
    fetchProviderModels: "拉取模型",
    testProvider: "测试配置",
    providerCatalog: "接口地址库",
    providerReady: "配置可用",
    providerFailed: "配置失败",
    modelsLoaded: "模型已拉取",
    deepSeekOnly: "当前默认只开放 DeepSeek，其他模型会在后续扩展。",
    lastChecked: "最近检查",
    showKey: "显示",
    hideKey: "隐藏",
    getKey: "获取 Key",
    githubToken: "GitHub Token",
    githubTokenPlaceholder: "用于扫描、Star、Fork 和读取我的仓库",
    clearGithubToken: "清除",
    githubHub: "GitHub",
    githubOps: "账号与仓库操作",
    githubOpsHint: "连接账号后，可刷新仓库并执行 Star、Fork 等操作。",
    testGithub: "测试连接",
    refreshGithubRepos: "刷新我的仓库",
    myGithubProjects: "我的 GitHub 项目",
    githubConnectHelp: "配置 GitHub Token 后，可以读取你的仓库，并对值得收藏的项目一键 Star 或 Fork。",
    githubNotConfiguredHelp: "还没有可用的 GitHub Token。保存 Token 后再测试连接。",
    githubTokenInvalidHelp: "GitHub Token 无效或已过期，请在设置中更换新的 Token 后再扫描。",
    githubTokenRequiredScan: "扫描项目池必须先配置有效的 GitHub Token。",
    githubCredentialRequiredAction: "此功能需要 GitHub Token。请先在设置中配置并保存。",
    aiCredentialRequiredAction: "此功能需要 DeepSeek API Key。请先在大模型配置中填写并保存。",
    aiCredentialRequiredGenerate: "生成观察方案需要 DeepSeek API Key。请先完成大模型配置。",
    aiCredentialRequiredAnalyze: "AI 分析需要 DeepSeek API Key。请先完成大模型配置。",
    aiCredentialRequiredTune: "AI 优化需要 DeepSeek API Key。请先完成大模型配置。",
    tokenExpired: "Token 已过期",
    githubConnected: "已连接",
    githubReady: "GitHub 配置可用",
    githubFailed: "GitHub 配置失败",
    githubReposLoaded: "已加载我的仓库",
    githubRepoEmpty: "暂无仓库，或当前 Token 没有读取仓库权限。",
    publicRepo: "公开",
    privateRepo: "私有",
    starRepo: "Star",
    unstarRepo: "Unstar",
    forkRepo: "Fork",
    githubActionBusy: "处理中",
    starred: "已 Star",
    unstarred: "已取消 Star",
    forkStarted: "Fork 已发起",
    alreadyForked: "已 Fork",
    alreadyForkedHint: "这个仓库已经记录为已 Fork，避免重复操作。",
    openRepo: "打开仓库",
    githubReposNotLoaded: "已连接账号。点击「刷新我的仓库」后再加载仓库列表。",
    githubReposNeedConnection: "先测试连接确认账号；也可以直接点击「刷新我的仓库」并加载仓库列表。",
    scanOverview: "结构看板",
    newToday: "今日新增",
    seenToday: "今日更新",
    receivedRepos: "本次扫描",
    scanErrors: "扫描异常",
    reviewQueue: "需复核许可",
    trendQueue: "热度变化",
    noReviewQueue: "暂无需要优先复核的许可项",
    goLeaderboard: "看榜单",
    projects: "项目",
    matched: "命中",
    displayed: "预览",
    currentMatches: "当前命中",
    currentPagePreview: "本页预览",
    matchesShort: "命中",
    previewShort: "预览",
    filterCountHintAll: "当前可选 {available} 个；标签库 {catalog} 个；当前命中：全部。",
    filterCountHintActive: "当前可选 {available} 个；标签库 {catalog} 个；当前命中：{label}。",
    filterTagUnavailable: "当前组合下暂无命中，保留高亮便于调整或重置。",
    filterTagCatalog: "项目池全量标签",
    filterTagAvailable: "当前筛选可选",
    pageSize: "单页",
    pageSizeLabel: "{count} 条/页",
    pageJump: "页码",
    pageJumpAction: "跳转",
    prevPage: "上一页",
    nextPage: "下一页",
    pageStatus: "第 {page} / {pages} 页",
    noProjectMatches: "当前没有可展示项目",
    noProjectMatchesHint: "可以清除筛选条件，或撤销刚才隐藏的项目。",
    openGitHub: "打开 GitHub",
    copyUrl: "复制地址",
    watch: "收藏",
    unwatch: "取消收藏",
    favoriteSaved: "已收藏，偏好记忆已更新",
    favoriteRemoved: "已取消收藏，偏好权重已降低",
    dismissProject: "不合适",
    dismissProjectHint: "从当前方案隐藏，并轻量记录偏好。",
    projectDismissed: "已从当前方案隐藏",
    undoDismiss: "撤销",
    dismissUndoDone: "已恢复",
    dismissedLearningTitle: "隐藏项目样本",
    dismissedLearningHint: "回看隐藏项目；手动修正原因会帮助系统下次判断更准。",
    noDismissedProjects: "暂无隐藏项目",
    noDismissedProjectsHint: "点击项目池里的“不合适”后，这里会展示可恢复的隐藏样本。",
    dismissedSamplesCount: "隐藏项目 {count}",
    dismissedSamplesLatest: "最近：{name} · {time}",
    expandDismissedSamples: "展开",
    collapseDismissedSamples: "收起",
    restoreProject: "恢复",
    editDismissedFeedback: "编辑",
    cancelDismissedFeedback: "取消",
    saveFeedbackTags: "保存",
    feedbackTagsSaved: "已保存",
    feedbackProblem: "解决什么",
    feedbackAudience: "给谁用",
    feedbackShape: "可做成",
    feedbackNote: "原因修正",
    feedbackAutoTags: "系统判断",
    feedbackNegativeTags: "负向标签",
    feedbackNegativeReason: "原因分析",
    feedbackLearningHint: "你的每次手动修正都会作为系统自学习的重要信号。",
    feedbackPlaceholder: "写下你真实隐藏它的原因",
    aiAnalyze: "AI 分析",
    aiReAnalyze: "再次分析",
    aiAnalysisTitle: "AI 风险与机会研判",
    aiAnalysisHint: "固定输出风险、边界、实践启发和下一步验证；结果会保存到当前项目。",
    aiAnalysisEmpty: "还没有 AI 研判。点击后会生成项目专属的风险、边界、实践启发和下一步验证，并保存到当前项目。",
    aiAnalysisSaved: "上次分析",
    aiAnalyzingTitle: "正在分析当前项目",
    aiAnalyzingHint: "正在整理为风险、边界、实践启发和下一步验证四段短句。",
    aiAnalysisDone: "AI 分析已保存",
    aiRiskLevel: "风险等级",
    aiRisks: "风险",
    aiBoundaries: "边界",
    aiReuseIdeas: "实践启发",
    aiNextActions: "下一步验证",
    aiAnalyzeOptions: "分析需求",
    aiAnalyzeOptionsHint: "不填也可以直接分析；填写后会结合你的目标判断。",
    aiCustomNeed: "特殊需求",
    aiCustomNeedPlaceholder: "例如：我关注视频、设计或内容创作场景；希望工具轻量、易验证、适合长期跟踪。",
    aiContextSaved: "分析依据",
    saveNote: "保存笔记",
    saveTriage: "保存",
    noteSaved: "研判记录已保存，之后点开该项目仍在这里。",
    noteDeleted: "研判记录已删除。",
    deleteNote: "删除",
    deleteNoteConfirm: "确定删除这条研判记录吗？",
    noteStatusRequired: "请选择研判状态",
    noteConfirmSave: "确认",
    noteCancelSave: "取消",
    noteDeleteConfirmWatch: "删除这条研判记录？",
    noteDeleteConfirmDeepDive: "删除「优先验证」研判并取消收藏？",
    noteSaveConfirmWatch: "保存为「继续观察」？",
    noteSaveConfirmWatchUnfavorite: "保存为「继续观察」并取消收藏？",
    noteSaveConfirmDeepDive: "保存为「优先验证」并加入收藏？",
    noteSaveConfirmSkip: "保存为「暂不合适」并隐藏该项目？",
    noteSavedFavoriteInline: "已保存并收藏",
    noteSavedUnfavoritedInline: "已保存并取消收藏",
    noteSavedHiddenInline: "已保存并隐藏",
    noteDeletedUnfavoritedInline: "已删除并取消收藏",
    noteBadge: "已记录",
    aiRecommendationValidate: "AI 建议验证",
    aiRecommendationWatch: "AI 谨慎观察",
    aiRecommendationPause: "AI 暂缓跟进",
    triageRecord: "我的研判记录",
    triageRecordHelp: "记录你对这个仓库的判断。保存后绑定到当前仓库，重新打开这个项目仍会显示在这里。",
    savedRecord: "已保存记录",
    noSavedRecord: "还没有保存记录",
    notePlaceholder: "记录你对这个项目的理解：值得学习的地方、需要留意的边界，以及后续想继续观察的问题...",
    triageStatus: "研判状态",
    statusNone: "未研判",
    statusWatch: "继续观察",
    statusDeep: "优先验证",
    statusSkip: "暂不合适",
    aiAnalysisAll: "全部",
    aiNotAnalyzed: "待分析",
    decisionSummary: "研判结论",
    nextStep: "下一步",
    reuseBoundary: "使用边界",
    whyWatch: "为什么值得关注",
    keySignals: "关键数据",
    moreProjectData: "更多数据",
    dataSnapshot: "数据快照",
    projectHomepage: "主页/演示",
    noHomepage: "无",
    topics: "主题",
    updated: "更新",
    savedAt: "保存于",
    licenseBlock: "许可",
    signals: "信号",
    reasons: "关注理由",
    actions: "建议动作",
    skepticism: "风险拆解",
    triageNote: "研判笔记",
    analysis: "模型分析",
    noAnomaly: "暂无异常标记",
    noReasons: "暂无计算理由",
    keepObserve: "继续观察",
    githubNoToken: "未配置",
    configured: "已配置",
    off: "关闭",
    apiKey: "接口密钥",
    baseUrl: "接口地址",
    model: "模型",
    protocol: "协议",
    enabled: "启用",
    clearKey: "清除密钥",
    keyCleared: "密钥已清除",
    keyClearPending: "待保存清除",
    keyClearMarked: "已标记清除，保存后生效",
    keySet: "已设置",
    keyEmpty: "未设置",
    saved: "已保存",
    scanDone: "扫描完成",
    scanDoneRefreshed: "扫描完成，项目池已刷新",
    scanFailed: "扫描失败",
    copied: "已复制",
    analyzing: "分析中"
  },
  en: {
    brand: "StarVault Imprint",
    brandSub: "Discover open-source projects worth learning from, understanding, and tracking over time.",
    homeLinkLabel: "Back to home",
    navProjects: "Projects",
    navLeaderboard: "Ranking",
    navLearning: "Learning",
    navBrief: "Board",
    navGithubRepos: "Repos",
    navSettings: "Settings",
    guideTourButton: "Guide",
    guideTourClose: "Close guide",
    guideTourPrev: "Back",
    guideTourNext: "Next",
    guideTourFinish: "Finish",
    guideTourFinishHome: "Finish to Projects",
    guideTourFinishSettings: "Finish to Settings",
    guideTourSkip: "Later",
    guideTourStep: "Step {current}/{total}",
    guideTourConnectionsTitle: "Start with connection status",
    guideTourConnectionsBody: "This strip shows whether GitHub, Tavily, Exa, and AI are ready. The top Export button exports active-plan project-pool data, not configuration backups.",
    guideTourTokenTitle: "Configure GitHub Token",
    guideTourTokenBody: "GitHub Token powers scanning, Star/Fork, and My Repos. Use the get-key link on the card, then save settings so the token is validated first.",
    guideTourAiTitle: "Configure DeepSeek API Key",
    guideTourAiBody: "Plan generation and project AI analysis depend on this section. Use the get-key link, test the provider, and confirm the model before generating plans.",
    guideTourPlanTitle: "Generate, switch, and back up plans",
    guideTourPlanBody: "Enter a plan name and detailed need to generate an editable JSON draft. Switching plans rescans. Configuration backup lives in Import/Export config, not the top Export button.",
    guideTourScanTitle: "Scan to refresh the project pool",
    guideTourScanBody: "A scan validates GitHub Token first, then uses the active plan with GitHub Search, Trending, and optional external signals.",
    guideTourPoolTitle: "Filter and judge projects in the pool",
    guideTourPoolBody: "Use filters to narrow the pool, then click rows for details. Favorites, dismissals, triage, AI analysis, more data, and Star/Fork are the stronger learning signals.",
    guideTourLearningTitle: "Calibrate system memory in Learning",
    guideTourLearningBody: "Review preference profile, hidden samples, and learning strategy here. Clear learning records only when needed; compact context keeps long-term memory lighter.",
    runtimeStatus: "Runtime",
    autoScan: "Auto scan",
    desk: "Today",
    headline: "StarVault Imprint",
    headlineSub: "Discover open-source projects worth learning from, understanding, and tracking over time.",
    exportJson: "Export JSON",
    exportCsv: "Export CSV",
    exportShort: "Export",
    exportHint: "Export active-plan project pool data",
    runScan: "Rescan GitHub",
    runScanShort: "Scan",
    runScanHint: "Run GitHub Search, GitHub Trending, and web enrichment to rebuild the project pool.",
    configReadyHint: "Open {name} settings.",
    configMissingHint: "Configure {name}. Click to open settings.",
    autoScanHint: "Auto scan: {time}",
    totalProjects: "Total projects",
    watchlist: "Favorites",
    lastScan: "Last scan",
    search: "Search",
    searchPlaceholder: "repo, topic, language",
    filterIntent: "Filter intent",
    reset: "Reset",
    resetFilters: "Reset filters",
    clearAllFilters: "Clear all filters",
    advancedFilters: "Advanced filters",
    advancedFiltersHint: "Tags are rebuilt from the current scan pool, then combined with language, license, and sort order",
    presetBalanced: "Opportunity overview",
    presetBalancedHint: "Balanced potential, risk, and diversity",
    presetCommercial: "License-friendly",
    presetCommercialHint: "Lower license friction for easier follow-up",
    presetGrowth: "Fast growth",
    presetGrowthHint: "Recent heat and growth first",
    presetActionable: "Actionable",
    presetActionableHint: "Lower risk and easier to evaluate",
    presetProduct: "Applied potential",
    presetProductHint: "Closer to a real usable scenario",
    presetFavorites: "My favorites",
    presetFavoritesHint: "Only favorited projects",
    category: "Category",
    license: "License",
    recordFilter: "Records",
    triageFilter: "Triage",
    aiAnalysisFilter: "AI review",
    aiShort: "AI",
    risk: "Risk",
    projectRisk: "Project risk",
    licenseRisk: "License risk",
    overallRisk: "Action risk",
    semanticProblem: "Problem",
    semanticAudience: "Audience",
    semanticShape: "Can become",
    semanticScene: "Scenario",
    allProblems: "All",
    allAudiences: "All",
    allShapes: "All",
    allLanguages: "All",
    author: "Author",
    unknownAuthor: "Unknown author",
    actionability: "Actionability",
    quality: "Quality",
    stars: "stars",
    forks: "forks",
    issues: "issues",
    sort: "Sort",
    all: "All",
    watchOnly: "Favorites only",
    idle: "Idle",
    scanning: "Scanning",
    scanRunning: "Scanning",
    scanAlreadyRunning: "Scan already running",
    scanStagePrepare: "Preparing",
    scanStageCatalog: "Checking endpoints",
    scanStageGithub: "Searching GitHub/Trending",
    scanStageTavily: "Enriching Tavily",
    scanStageExa: "Enriching Exa",
    scanStageScore: "Analyze & Save",
    scanStageCompleted: "Done",
    scanStageFailed: "Failed",
    scanProgressHint: "{stage} · {percent}%",
    scanEtaPending: "Estimating time left",
    scanEtaRemaining: "About {time} left",
    scanEtaRange: "About {min}-{max} left",
    scanEtaWarmingUp: "Building timing baseline",
    scanEtaNetworkSensitive: "API timing may vary",
    scanEtaSteady: "Estimate is steadier",
    scanEtaUnderMinute: "under 1 min",
    longTaskBeforeUnload: "A task is still running. Refreshing or closing this page may interrupt saving the result.",
    project: "Project",
    opportunity: "Opportunity",
    momentum: "Recent heat",
    momentumHint: "Recent heat combines Stars/Forks growth, update recency, and external mentions. Higher is hotter.",
    trendHint: "Trend is fetched from GitHub during scans and cached, using the previous UTC calendar day, 00:00-24:00.",
    trendLoading: "Awaiting scan",
    trendNotCached: "Not in trend cache",
    trendNotCachedHint: "Each scan updates trend cache for only a ranked subset. This project was not covered yet; wait for another scan or raise the trend cache limit.",
    trendUnavailable: "Trend failed",
    trendPartial: "GitHub online statistics did not cover the full window, so this result may be lower than the real value.",
    trendPartialShort: "Partial",
    trendStarsPartial: "Stars incomplete",
    trendForksPartial: "Forks incomplete",
    trendZeroHint: "No Stars or Forks were added during the previous calendar day. This is a valid result, not an error.",
    trendReasonRateLimited: "GitHub API rate limit. The next scan can retry.",
    trendReasonAuth: "GitHub token is invalid or lacks permission.",
    trendReasonForbidden: "GitHub rejected the trend request, possibly due to permission or secondary rate limits.",
    trendReasonNotFound: "Repository is unavailable, deleted, or renamed.",
    trendReasonRequestFailed: "GitHub trend request failed. The next scan can retry.",
    riskHint: "Project risk covers maintenance, maturity, hype anomaly, and metadata quality. Higher is riskier and separate from license risk.",
    repo: "Repo",
    selection: "Project detail",
    chooseProject: "No project selected",
    chooseProjectHint: "Click a project in the list to open details. The blank default state does not write learning history.",
    chooseProjectTipBrowse: "Filtering, paging, and scanning only browse the pool.",
    chooseProjectTipLearn: "Opening details, favoriting, Star/Fork, triage, and AI analysis feed learning records.",
    dailyBrief: "Structure Board",
    topActionable: "Opportunity snapshot",
    compliance: "License view",
    licenseDistribution: "License distribution",
    coverage: "Category view",
    directionView: "Direction view",
    stackView: "Tech stack",
    categorySpread: "Category distribution",
    overviewDashboard: "Structure Board",
    overviewDashboardHint: "Aggregate direction structure, languages, licenses, and capability tags across the current project pool.",
    monitorScope: "Current project pool",
    categoryCoverage: "Categories",
    useCaseCoverage: "Use cases",
    languageCoverage: "Languages",
    topicCoverage: "Capability tags",
    licenseReady: "MIT/Apache/BSD",
    licenseBoundary: "License boundary",
    projectRiskBasis: "Project risk",
    highHeatProjects: "High-heat projects",
    projectDistribution: "Direction structure",
    projectDistributionHint: "Merges categories and use cases so concentration is easier to read.",
    languageDistribution: "Language distribution",
    languageDistributionHint: "Understand stack concentration and validation effort.",
    licenseReadinessPanel: "License readiness",
    licenseReadinessHint: "Review license types and manual-review priority across the pool.",
    topicMap: "Capability map",
    topicMapHint: "Grouped by project capability and application scenario. Higher count means stronger concentration.",
    overviewFilterHint: "Click to filter project pool",
    overviewFilterApplied: "Project pool filtered: {label}",
    reviewQueueHint: "Projects whose license boundary should be reviewed first.",
    trendQueueHint: "Projects with stronger recent Stars/Forks movement.",
    noTrendQueue: "No clear heat movers yet",
    emptyDistribution: "No distribution data yet",
    shareLabel: "Share",
    settings: "Settings",
    modelHub: "LLM",
    dataSources: "Connection Settings",
    dataSourcesHint: "Manage GitHub, search channels, and AI configuration in one place.",
    saveSettings: "Save settings",
    savingSettings: "Saving",
    settingsSaved: "Saved",
    language: "Language",
    keyManagement: "Key management",
    keyManagementHint: "Each key can be shown, saved, or cleared independently",
    observationPlans: "Observation plans",
    observationPlansHint: "Switch discovery strategy and learning memory by domain",
    observationPlanSelectModule: "Plan selection",
    observationPlanSelectModuleHint: "Switching applies the plan and rescans",
    observationPlanGenerateModule: "Plan generation",
    observationPlanGenerateModuleHint: "Generate an editable draft from the need",
    observationPlanTransferModule: "Config import/export",
    observationPlanTransferModuleHint: "Back up or restore config and learning data",
    activeObservationPlan: "Active plan",
    observationPlanName: "Plan name",
    observationPlanNamePlaceholder: "e.g. Creator tools watch",
    observationPlanIdea: "Detailed need",
    observationPlanIdeaPlaceholder: "Describe domain, users, tool shape, and project types to avoid",
    observationPlanRequirements: "Saved needs",
    observationPlanRequirementsEmpty: "No saved needs yet. Generating a plan will save the current input.",
    deleteObservationRequirement: "Delete need",
    observationRequirementDeletedInline: "Need deleted",
    observationRequirementSavedInline: "Need updated",
    observationPlanLogic: "Search logic",
    observationPlanLogicPlaceholder: "Edit plan name, search entries, helper terms, and exclusions after draft generation",
    observationPlanLogicInvalid: "Search logic must be valid JSON",
    observationPlanModeDefault: "Built-in default matrix",
    observationPlanModeFocused: "Focused blend",
    observationPlanModeBlend: "Full blend",
    observationPlanModeOnly: "Plan only",
    observationPlanQueries: "Queries",
    observationPlanLogicItems: "Search logic",
    observationPlanLearningPreview: "Learning Hub",
    observationPlanUserEvents: "User actions",
    observationPlanFavoritePreview: "Favorites",
    observationPlanTriagePreview: "Triage",
    observationPlanAiPreview: "AI analysis",
    observationPlanGithubPreview: "Local GitHub state",
    observationPlanEvolutionPreview: "Self-evolution",
    observationPlanItemsUnit: "items",
    observationPlanMemoryUnit: "items",
    observationPlanKeywords: "Helper terms",
    observationPlanExcludes: "Exclusions",
    switchObservationPlan: "Switch plan",
    generateObservationPlan: "Generate plan",
    editObservationPlan: "Edit",
    editObservationPlanHint: "Edit search logic",
    cancelObservationPlanEdit: "Cancel",
    cancelObservationPlanDraft: "Cancel",
    saveObservationPlan: "Save",
    saveObservationPlanHint: "Save plan",
    observationPlanCanceledInline: "Canceled",
    observationPlanSavedInline: "Saved",
    openObservationPlanPicker: "Choose plan",
    editObservationPlanAction: "Edit plan",
    deleteObservationPlanAction: "Delete plan",
    observationPlanDeleteBackupConfirm: "Before deleting \"{name}\", exporting a config backup is recommended. The export contains no secrets. Export a backup now?",
    observationPlanDeleteConfirm: "Delete \"{name}\"? Its search logic, learning memory, user actions, favorites, triage, AI analysis, and local GitHub state will be removed. This cannot be undone.",
    observationPlanDeleteBackupAction: "Export backup",
    observationPlanDeleteConfirmAction: "Delete",
    observationPlanDeleteBackupDone: "Backup exported. You can continue deleting.",
    observationPlanConfirmSwitchAction: "Switch and scan",
    observationPlanDeletedInline: "Deleted",
    exportPortableData: "Export config",
    importPortableData: "Import config",
    observationPlanSwitched: "Observation plan switched",
    observationPlanSwitchScan: "Observation plan switched. Starting a fresh scan.",
    observationPlanSwitchConfirm: "Important: switching to \"{name}\" will apply its search logic, Learning Hub settings, user actions, and self-evolution data, then immediately rescan the project pool. The scan may take some time. Switch and rescan?",
    observationPlanSwitchHint: "Switching plans immediately rescans the project pool.",
    planSwitchingTitle: "Switching observation plan",
    planSwitchingBody: "Rebuilding the project pool and leaderboard for this plan. Browsing, favorites, triage, AI analysis, and other learning actions are not recorded until it finishes.",
    planSwitchingCacheHint: "Historical cache is kept; old plan results are only hidden temporarily.",
    planSwitchingLearningLocked: "Learning writes locked",
    planSwitchFailedTitle: "Plan scan did not finish",
    planSwitchFailedBody: "This plan has not produced a project pool yet. Rescan or return to Settings to choose another plan.",
    observationPlanPreviewOnly: "Previewing \"{name}\" search logic only. It takes effect after switching.",
    observationPlanGenerateRequired: "Enter a plan name and detailed need before generating a plan.",
    observationPlanGenerateFailed: "AI failed to generate the plan. Try again later or check the model settings.",
    observationPlanGenerated: "Draft generated. Edit the JSON before saving.",
    observationPlanDraftReady: "Draft ready",
    observationPlanDraftFallback: "AI did not return a valid plan; a local editable draft was generated.",
    portableDataImported: "Configuration and learning data imported",
    portableDataExported: "Configuration and learning data exported without secrets",
    observationPlanStats: "{profiles} profiles · {keywords} keywords",
    defaultObservationPlan: "Default observation",
    searchLogicHint: "GitHub is the source; Trending validates heat; Tavily/Exa enrich signals.",
    searchLogic: "Discovery logic",
    modelProviders: "Model providers",
    leaderboardDesk: "Leaderboard · Daily Top 20",
    dailyRank: "Daily",
    weeklyRank: "Weekly",
    monthlyRank: "Monthly",
    allRank: "All-time",
    dailyArchive: "Daily archive",
    latestArchive: "Latest",
    noArchive: "No archives",
    leaderboardLimit: "20 curated projects",
    leaderboardSource: "From full candidate pool",
    leaderboardOpenDetail: "View details",
    leaderboardOpenDetailHint: "Open this project in the pool detail panel",
    generatedAt: "Refreshed",
    rankingLogic: "Ranking Logic",
    rankingLogicCopy: "Value, growth, Trending, memory, rotation.",
    memoryState: "Memory State",
    memoryTuning: "Memory tuning",
    memoryTuningHint: "The system learns from favorites, Star, Fork, opens, AI analysis, and rank feedback. Manual calibration is kept as long-term preference.",
    increasePreference: "Increase",
    decreasePreference: "Decrease",
    removePreference: "Remove",
    memoryUpdated: "Memory preference updated",
    memorySettingsSaved: "Learning policy saved",
    actionCompleted: "Done",
    shortTermMemory: "Short-term memory",
    longTermPreference: "Long-term preference",
    memorySnapshot: "Learning snapshot",
    activePreferences: "Active preferences",
    negativeSignals: "Negative signals",
    behaviorSamples: "Behavior samples",
    explorationRatio: "Explore",
    diversityFloor: "Diversity",
    noveltyRatio: "Freshness",
    explorationRatioHelp: "Higher: more cross-domain finds. Lower: closer to known preferences.",
    diversityFloorHelp: "Higher: less same-type clustering. Lower: stronger focus areas.",
    noveltyRatioHelp: "Higher: more newly found projects. Lower: more mature projects.",
    memoryEmpty: "Not enough behavior data yet, so the system keeps stronger diversity.",
    categoryPreference: "Category focus",
    useCasePreference: "Use-case focus",
    learningDesk: "Learning Hub",
    learningTitle: "How it understands your preferences",
    learningLoopAction: "What you did",
    learningLoopActionEmpty: "No recent behavior yet",
    learningLoopActionBody: "{count} recent actions: {actions}",
    learningLoopLearned: "What it learned",
    learningLoopLearnedEmpty: "Preference profile is still forming",
    learningLoopLearnedBody: "{positive} positive, {negative} negative; {events} recent samples",
    learningLoopNext: "What changes next",
    learningLoopNextEmpty: "Keep recommendations diverse first",
    learningLoopNextBody: "Preference-weighted, with {explore}% exploration.",
    learningLoopNextAi: "AI tuning is active.",
    learningLoopNextRule: "Local rules are active.",
    preferenceProfile: "Preference Profile",
    preferenceProfileHint: "Main editor for long-term memory",
    expandPreferenceProfile: "Expand preference profile",
    expandPreferenceProfileShort: "Expand",
    expandPanelShort: "Expand",
    collapsePanelShort: "Collapse",
    learningControls: "Learning Policy",
    learningControlsHint: "Control how the next recommendations change",
    evolutionLog: "Evolution Log",
    latestEvolution: "Latest evolution",
    contextEvolution: "Context compression",
    harnessEvolution: "Quality review",
    tuningEvolution: "AI optimization",
    noEvolutionYet: "No evolution record yet",
    learningSubtitle: "Higher preference strength gives similar projects more memory weight. Negative preference reduces similar-project density.",
    positiveMemory: "Long-term preference",
    negativeMemory: "Negative preference",
    recentBehavior: "Recent behavior",
    clearRecentBehavior: "Clear learning records",
    clearBehaviorHint: "Clears behavior, AI analysis, triage, favorites, and local GitHub action records in the selected range. Manual calibration stays intact.",
    clearBehavior1h: "Last hour",
    clearBehavior1d: "Last day",
    clearBehavior7d: "Last week",
    clearBehavior30d: "Last month",
    clearBehavior90d: "Last 3 months",
    clearBehaviorAll: "All",
    clearBehaviorConfirm: "Clear learning records for \"{range}\"? This removes behavior, AI analysis, triage, favorites, and local GitHub action records from that range. Manual calibration stays intact.",
    clearBehaviorConfirmAll: "Clear all learning records and compressed context? AI analysis, triage, favorites, and local GitHub action records will also be cleared. Auto-learned preference returns to the manual baseline. This cannot be undone.",
    clearBehaviorConfirmAction: "Confirm clear",
    clearBehaviorCancelAction: "Cancel",
    clearBehaviorClearing: "Clearing",
    behaviorCleared: "Learning records cleared",
    clearSummaryBehavior: "Behavior",
    clearSummaryAnalysis: "AI analysis",
    clearSummaryNotes: "Triage",
    clearSummaryFavorites: "Favorites",
    clearSummaryGithub: "GitHub actions",
    antiBubblePolicy: "Anti-bubble policy",
    antiBubbleTotal: "Total",
    antiBubbleHint: "These three settings are one 100% allocation. Raising one automatically redistributes the remainder.",
    contextCompression: "Context compression",
    compactContext: "Compress context",
    contextCompressed: "Context compressed",
    noContextToCompress: "No recent behavior to compress",
    contextSummary: "Compressed summary",
    rawEvents: "Raw recent events",
    compressedChunks: "Compressed chunks",
    compressedEvents: "Compressed events",
    behaviorBottomHint: "That is the bottom line.",
    compressionPolicy: "Recent behavior stays raw; older behavior is summarized into evidence for tuning.",
    harnessQuality: "Review & optimize",
    projectHarness: "Review & optimize",
    projectHarnessHint: "Checks relevance, repetition, exploration, and license fit.",
    runHarness: "Evaluate quality",
    tuneMemory: "AI optimization",
    harnessLocalAction: "Evaluate now",
    harnessLlmAction: "Optimize with AI",
    harnessLocalTitle: "Local check",
    harnessLocalHint: "Relevance, repetition, exploration, license.",
    harnessLlmTitle: "AI optimization",
    harnessLlmHint: "Summarizes behavior and updates weights.",
    harnessLocalRunning: "Evaluating...",
    harnessLlmRunning: "Optimizing...",
    preferenceGuide: "Strength guide",
    preferenceWeak: "Weak",
    preferenceMedium: "Medium",
    preferenceStrong: "Strong",
    preferenceVeryStrong: "Very strong",
    preferenceImpactLow: "Light ranking impact",
    preferenceImpactMedium: "Clear impact on similar projects",
    preferenceImpactHigh: "Strong recommendation-density impact",
    preferenceSuggestedRange: "Suggested range: {range}",
    positivePreferenceHint: "For likes, raise to Medium first. Use Strong only after repeated favorites, Stars, or deep reviews.",
    negativePreferenceHint: "For dislikes, weaken or add negative preference first. Use Strong only for repeated mismatches.",
    manualCalibration: "Manual calibration",
    learnedFromBehavior: "Behavior learning",
    harnessUpdated: "Evaluation updated",
    harnessEvaluationDone: "Local evaluation complete",
    memoryTuned: "AI optimization applied",
    learningMode: "Learning mode",
    localLearning: "Local rule learning",
    llmLearning: "AI-assisted tuning",
    localLearningShort: "Rules",
    llmLearningShort: "AI",
    noHarness: "No evaluation yet",
    noBehavior: "No recent behavior",
    noNegativeMemory: "No negative preference yet",
    saveLearningPolicy: "Save learning policy",
    overallScore: "Quality",
    scoreScale: "0-100 · higher is better",
    scoreMeaning: "Scoring rule",
    scoreOverallHint: "Relevance, repetition, license, exploration.",
    scoreRelevanceHint: "Preference fit.",
    scoreRepetitionHint: "Higher means less repetition.",
    scoreActionabilityHint: "Clear, mature, verifiable.",
    relevanceHitRate: "Relevance hit",
    diversityCoverage: "Use-case coverage",
    repetitionControl: "Repeat control",
    actionabilityFit: "Actionability",
    licenseReadiness: "License readiness",
    explorationFit: "Exploration fit",
    eventFavorite: "Favorite",
    eventUnfavorite: "Unfavorite",
    eventStar: "Star",
    eventUnstar: "Unstar",
    eventFork: "Fork",
    eventOpenGithub: "Open GitHub",
    eventSelectProject: "View detail",
    eventCopyUrl: "Copy URL",
    eventTriageNote: "Save triage",
    eventAiAnalyze: "AI Analyze",
    eventLeaderboardPositive: "Positive feedback",
    eventLeaderboardStrongPositive: "Strong positive",
    eventLeaderboardNegative: "Not interested",
    eventManualMemoryEdit: "Manual edit",
    rankNew: "New",
    rankUp: "Up",
    rankDown: "Down",
    rankSame: "Flat",
    trend: "Trend",
    diversitySlot: "Exploration slot",
    relevant: "Favorite",
    notRelevant: "Not interested",
    feedbackSaved: "Leaderboard memory updated",
    tavilyKey: "Tavily Key",
    tavilyKeyPlaceholder: "Used for external web signal enrichment",
    clearTavilyKey: "Clear",
    exaKey: "Exa Key",
    exaKeyPlaceholder: "Used for semantic web search enrichment",
    clearExaKey: "Clear",
    classicTokens: "Tokens (classic)",
    refreshProviderCatalog: "Refresh endpoints",
    fetchProviderModels: "Fetch models",
    testProvider: "Test config",
    providerCatalog: "Endpoint catalog",
    providerReady: "Config works",
    providerFailed: "Config failed",
    modelsLoaded: "Models loaded",
    deepSeekOnly: "DeepSeek is the only default provider enabled for now. More providers can be added later.",
    lastChecked: "Last checked",
    showKey: "Show",
    hideKey: "Hide",
    getKey: "Get key",
    githubToken: "GitHub Token",
    githubTokenPlaceholder: "Used for scans, Star, Fork, and your repositories",
    clearGithubToken: "Clear",
    githubHub: "GitHub",
    githubOps: "Account & repository actions",
    githubOpsHint: "Connect your account, refresh repositories, and run Star or Fork actions.",
    testGithub: "Test connection",
    refreshGithubRepos: "Refresh my repos",
    myGithubProjects: "My GitHub projects",
    githubConnectHelp: "After configuring a GitHub Token, you can read your repositories and one-click Star or Fork favorite-worthy candidates.",
    githubNotConfiguredHelp: "No usable GitHub Token yet. Save a token before testing.",
    githubTokenInvalidHelp: "GitHub Token is invalid or expired. Replace it in Settings before scanning.",
    githubTokenRequiredScan: "A valid GitHub Token is required before scanning the project pool.",
    githubCredentialRequiredAction: "This action needs a GitHub Token. Configure and save it in Settings first.",
    aiCredentialRequiredAction: "This action needs a DeepSeek API Key. Add and save it in Model settings first.",
    aiCredentialRequiredGenerate: "Generating an observation plan needs a DeepSeek API Key. Finish model setup first.",
    aiCredentialRequiredAnalyze: "AI analysis needs a DeepSeek API Key. Finish model setup first.",
    aiCredentialRequiredTune: "AI tuning needs a DeepSeek API Key. Finish model setup first.",
    tokenExpired: "Token expired",
    githubConnected: "Connected",
    githubReady: "GitHub config works",
    githubFailed: "GitHub config failed",
    githubReposLoaded: "My repositories loaded",
    githubRepoEmpty: "No repositories found, or this token cannot read repositories.",
    publicRepo: "Public",
    privateRepo: "Private",
    starRepo: "Star",
    unstarRepo: "Unstar",
    forkRepo: "Fork",
    githubActionBusy: "Working",
    starred: "Starred",
    unstarred: "Unstarred",
    forkStarted: "Fork started",
    alreadyForked: "Forked",
    alreadyForkedHint: "This repository is already marked as forked to avoid duplicate action.",
    openRepo: "Open repo",
    githubReposNotLoaded: "Account connected. Click \"Refresh my repos\" to load your repositories.",
    githubReposNeedConnection: "Test the connection first, or click \"Refresh my repos\" to connect and load repositories.",
    scanOverview: "Structure Board",
    newToday: "New today",
    seenToday: "Updated today",
    receivedRepos: "This scan",
    scanErrors: "Scan issues",
    reviewQueue: "License checks",
    trendQueue: "Heat changes",
    noReviewQueue: "No urgent license review items",
    goLeaderboard: "View ranks",
    projects: "projects",
    matched: "matched",
    displayed: "previewed",
    currentMatches: "Current matches",
    currentPagePreview: "This page",
    matchesShort: "Matches",
    previewShort: "Preview",
    filterCountHintAll: "{available} available now; {catalog} in catalog; active: all.",
    filterCountHintActive: "{available} available now; {catalog} in catalog; active: {label}.",
    filterTagUnavailable: "No matches under the current filter combination; kept highlighted so you can adjust or reset.",
    filterTagCatalog: "Full-pool tag",
    filterTagAvailable: "Available now",
    pageSize: "Page",
    pageSizeLabel: "{count} / page",
    pageJump: "Go to",
    pageJumpAction: "Go",
    prevPage: "Prev",
    nextPage: "Next",
    pageStatus: "Page {page} / {pages}",
    noProjectMatches: "No projects to show",
    noProjectMatchesHint: "Clear filters or undo the last hidden project.",
    openGitHub: "Open GitHub",
    copyUrl: "Copy URL",
    watch: "Favorite",
    unwatch: "Unfavorite",
    favoriteSaved: "Favorited and preference memory updated",
    favoriteRemoved: "Unfavorited and preference weight reduced",
    dismissProject: "Not a fit",
    dismissProjectHint: "Hide from this plan and lightly update preferences.",
    projectDismissed: "Hidden from this plan",
    undoDismiss: "Undo",
    dismissUndoDone: "Restored",
    dismissedLearningTitle: "Hidden project samples",
    dismissedLearningHint: "Review hidden projects; manual reason edits help the system judge better next time.",
    noDismissedProjects: "No hidden projects",
    noDismissedProjectsHint: "Projects hidden with “Not a fit” will appear here for restore.",
    dismissedSamplesCount: "{count} hidden projects",
    dismissedSamplesLatest: "Latest: {name} · {time}",
    expandDismissedSamples: "Expand",
    collapseDismissedSamples: "Collapse",
    restoreProject: "Restore",
    editDismissedFeedback: "Edit",
    cancelDismissedFeedback: "Cancel",
    saveFeedbackTags: "Save",
    feedbackTagsSaved: "Saved",
    feedbackProblem: "Problem",
    feedbackAudience: "Audience",
    feedbackShape: "Can become",
    feedbackNote: "Reason edit",
    feedbackAutoTags: "System labels",
    feedbackNegativeTags: "Negative labels",
    feedbackNegativeReason: "Reason",
    feedbackLearningHint: "Each manual edit becomes an important self-learning signal.",
    feedbackPlaceholder: "Describe the real reason you hid it",
    aiAnalyze: "AI Analyze",
    aiReAnalyze: "Analyze again",
    aiAnalysisTitle: "AI Risk & Opportunity Review",
    aiAnalysisHint: "Stable output: risks, boundaries, practical inspiration, and next validation. Results are saved here.",
    aiAnalysisEmpty: "No AI review yet. Run it to generate project-specific risks, boundaries, practical inspiration, and next validation steps.",
    aiAnalysisSaved: "Last analyzed",
    aiAnalyzingTitle: "Analyzing this project",
    aiAnalyzingHint: "Structuring the output into risks, boundaries, practical inspiration, and next validation.",
    aiAnalysisDone: "AI analysis saved",
    aiRiskLevel: "Risk Level",
    aiRisks: "Risks",
    aiBoundaries: "Boundaries",
    aiReuseIdeas: "Practical Inspiration",
    aiNextActions: "Next Validation",
    aiAnalyzeOptions: "Analysis Need",
    aiAnalyzeOptionsHint: "Leave empty for default analysis, or add your goal for a tailored review.",
    aiCustomNeed: "Custom need",
    aiCustomNeedPlaceholder: "Example: I care about video, design, or content workflows; prefer lightweight projects that are easy to validate and track.",
    aiContextSaved: "Analysis context",
    saveNote: "Save Note",
    saveTriage: "Save",
    noteSaved: "Triage note saved. It will stay on this project.",
    noteDeleted: "Triage note deleted.",
    deleteNote: "Delete",
    deleteNoteConfirm: "Delete this triage record?",
    noteStatusRequired: "Choose a triage status",
    noteConfirmSave: "Confirm",
    noteCancelSave: "Cancel",
    noteDeleteConfirmWatch: "Delete this triage record?",
    noteDeleteConfirmDeepDive: 'Delete "Priority validation" and remove from favorites?',
    noteSaveConfirmWatch: 'Save as "Keep watching"?',
    noteSaveConfirmWatchUnfavorite: 'Save as "Keep watching" and remove from favorites?',
    noteSaveConfirmDeepDive: 'Save as "Priority validation" and add to favorites?',
    noteSaveConfirmSkip: 'Save as "Not a fit now" and hide this project?',
    noteSavedFavoriteInline: "Saved and favorited",
    noteSavedUnfavoritedInline: "Saved and unfavorited",
    noteSavedHiddenInline: "Saved and hidden",
    noteDeletedUnfavoritedInline: "Deleted and unfavorited",
    noteBadge: "Recorded",
    aiRecommendationValidate: "AI Validate",
    aiRecommendationWatch: "AI Watch",
    aiRecommendationPause: "AI Pause",
    triageRecord: "My Triage Record",
    triageRecordHelp: "Capture your judgment for this repository. Saved notes stay attached to this project.",
    savedRecord: "Saved record",
    noSavedRecord: "No saved record yet",
    notePlaceholder: "Capture what you understand: what is worth learning, what needs care, and what you want to keep observing...",
    triageStatus: "Triage status",
    statusNone: "Not reviewed",
    statusWatch: "Keep watching",
    statusDeep: "Priority validation",
    statusSkip: "Not a fit now",
    aiAnalysisAll: "All",
    aiNotAnalyzed: "To analyze",
    decisionSummary: "Decision Summary",
    nextStep: "Next Step",
    reuseBoundary: "Use Boundary",
    whyWatch: "Why Follow",
    keySignals: "Key Signals",
    moreProjectData: "More data",
    dataSnapshot: "Data snapshot",
    projectHomepage: "Homepage/demo",
    noHomepage: "None",
    topics: "Topics",
    updated: "Updated",
    savedAt: "Saved at",
    licenseBlock: "License",
    signals: "Signals",
    reasons: "Follow reasons",
    actions: "Actions",
    skepticism: "Risk breakdown",
    triageNote: "Triage note",
    analysis: "Model analysis",
    noAnomaly: "No anomaly flags",
    noReasons: "No reasons computed yet",
    keepObserve: "Keep observing",
    githubNoToken: "No token",
    configured: "Configured",
    off: "Off",
    apiKey: "API Key",
    baseUrl: "Base URL",
    model: "Model",
    protocol: "Protocol",
    enabled: "Enabled",
    clearKey: "Clear key",
    keyCleared: "Key cleared",
    keyClearPending: "Clear pending save",
    keyClearMarked: "Marked for clearing. Save settings to apply.",
    keySet: "Set",
    keyEmpty: "Empty",
    saved: "Saved",
    scanDone: "Scan completed",
    scanDoneRefreshed: "Scan completed, project pool refreshed",
    scanFailed: "Scan failed",
    copied: "Copied",
    analyzing: "Analyzing"
  }
};

const FILTERS = {
  category: [
    ["all", "全部", "All"],
    ["product-starters", "应用基础模板", "Product Starters"],
    ["ai-native-products", "AI 产品", "AI Products"],
    ["developer-productivity", "开发效率", "Developer Tools"],
    ["business-saas", "SaaS 业务", "SaaS"],
    ["data-knowledge", "数据知识", "Data & Knowledge"],
    ["infra-cloud", "云平台", "Infra & Cloud"],
    ["security-compliance", "安全合规", "Security"],
    ["frontend-creative", "前端创意", "Frontend & Creative"],
    ["creative-media", "视频音频内容", "Creative Media"],
    ["consumer-productivity", "个人效率工具", "Consumer Productivity"],
    ["commerce-growth-content", "商业内容", "Commerce & Content"],
    ["vertical-domain", "垂直行业", "Vertical Apps"],
    ["systems-runtime-edge", "系统边缘", "Systems & Edge"],
    ["learning-research-assets", "学习研究", "Learning & Research"],
    ["other", "其他", "Other"]
  ],
  license: [
    ["all", "全部", "All"],
    ["permissive-commercial", "MIT/Apache/BSD", "MIT/Apache/BSD", "通常允许使用、修改和分发，需保留声明", "Usually allows use, modification, and distribution with notices kept"],
    ["conditional-commercial", "需履约许可", "License with obligations", "MPL/LGPL/EPL 等，需要看义务边界", "License use with obligations"],
    ["distribution-copyleft", "分发需开源", "Source release on distribution", "GPL 类，分发衍生物通常要开源", "GPL-style source release on distribution"],
    ["network-copyleft", "网络服务高风险", "SaaS source-release risk", "AGPL/SSPL 类，网络服务也可能触发", "AGPL/SSPL network copyleft"],
    ["restricted-noncommercial", "受限许可", "Restricted license", "用途可能受限，适合先观察", "Intended use may be restricted"],
    ["unknown-no-license", "无许可勿复制", "No license: monitor only", "只能监控，不能默认复制/修改/分发", "Monitor only until reviewed"],
    ["manual-review", "人工复核", "Manual review", "识别到许可但不在安全白名单", "Read the exact license text"]
  ],
  risk: [
    ["all", "全部", "All"],
    ["low", "低项目风险", "Low risk"],
    ["medium", "需观察", "Watch"],
    ["high", "高波动", "Volatile"],
    ["critical", "避险优先", "Avoid first"]
  ],
  sort: [
    ["opportunity", "综合推荐", "Recommended", "推荐值、质量、社区和应用线索综合排序", "Balanced opportunity score"],
    ["productization", "应用价值", "Applied value", "更接近真实可用场景", "Closer to a usable scenario"],
    ["momentum", "增长爆发", "Fast growth", "优先看近期热度和增长速度", "Recent attention and growth"],
    ["stars", "人气最高", "Most starred", "按总 star 排，容易受历史热度影响", "Total popularity"],
    ["trendStars", "趋势 Star", "Trending Stars", "按扫描缓存的上一自然日 Star 新增量降序", "Sort by cached Stars added during the previous day"],
    ["trendForks", "趋势 Forks", "Trending Forks", "按扫描缓存的上一自然日 Forks 新增量降序", "Sort by cached Forks added during the previous day"],
    ["commercial", "许可清晰", "Clear license", "优先 MIT/Apache/BSD 等许可", "MIT/Apache/BSD style licenses first"],
    ["quality", "工程质量", "Quality", "维护、描述、活跃度更稳", "Health and maintainability"],
    ["actionability", "可落地优先", "Actionable", "低风险、质量较好、方便下手", "Low risk and easier to act on"],
    ["risk", "项目风险排查", "Project risk review", "不含许可，先看维护/热度/成熟度风险", "Maintenance, hype, and maturity risk"],
    ["updated", "最近活跃", "Recently active", "按最近 push 时间排序", "Most recently pushed"]
  ]
};

const LANGUAGE_FILTERS = [
  ["all", "全部", "All"],
  ["TypeScript", "TypeScript", "TypeScript"],
  ["JavaScript", "JavaScript", "JavaScript"],
  ["Python", "Python", "Python"],
  ["Go", "Go", "Go"],
  ["Rust", "Rust", "Rust"],
  ["Java", "Java", "Java"],
  ["Swift", "Swift", "Swift"],
  ["Kotlin", "Kotlin", "Kotlin"],
  ["Dart", "Dart", "Dart"],
  ["C++", "C++", "C++"]
];

const SEMANTIC_FILTER_KEYS = {
  problem: "semanticProblem",
  audience: "semanticAudience",
  shape: "semanticShape"
};

const SEMANTIC_COUNT_ELEMENT_KEYS = {
  problem: "problemFilterCount",
  audience: "audienceFilterCount",
  shape: "shapeFilterCount"
};

const SEMANTIC_FILTER_LIMITS = {
  problem: 20,
  audience: 14,
  shape: 15
};

const SEMANTIC_FILTER_PICK_KEYS = {
  problem: [
    "knowledge-search",
    "document-extraction",
    "data-visualization",
    "business-operations",
    "workflow-automation",
    "browser-automation",
    "api-debugging",
    "testing-code-review",
    "ai-coding-workflow",
    "mcp-tooling",
    "design-to-code-editing",
    "design-system-generation",
    "video-production",
    "audio-production",
    "voice-clone-transcription",
    "presentation-generation",
    "commerce-growth",
    "finance-trading",
    "platform-operations",
    "security-compliance"
  ],
  audience: [
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
    "audience-finance-operators",
    "audience-security-teams",
    "audience-platform-ops-teams",
    "audience-individual-users"
  ],
  shape: [
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

const NOTE_STATUSES = [
  ["watch", "statusWatch"],
  ["deep-dive", "statusDeep"],
  ["skip", "statusSkip"]
];
const TRIAGE_FILTERS = [
  ["all", "all", "all"],
  ["none", "statusNone", "statusNone"],
  ["watch", "statusWatch", "statusWatch"],
  ["deep-dive", "statusDeep", "statusDeep"],
  ["skip", "statusSkip", "statusSkip"]
];
const AI_ANALYSIS_FILTERS = [
  ["all", "aiAnalysisAll", "aiAnalysisAll"],
  ["unanalyzed", "aiNotAnalyzed", "aiNotAnalyzed"],
  ["validate", "aiRecommendationValidate", "aiRecommendationValidate"],
  ["watch", "aiRecommendationWatch", "aiRecommendationWatch"],
  ["pause", "aiRecommendationPause", "aiRecommendationPause"]
];
const MEMORY_CLEAR_RANGES = [
  ["1h", "clearBehavior1h"],
  ["1d", "clearBehavior1d"],
  ["7d", "clearBehavior7d"],
  ["30d", "clearBehavior30d"],
  ["90d", "clearBehavior90d"],
  ["all", "clearBehaviorAll"]
];
const FILTER_PRESETS = [
  ["balanced", "presetBalanced", "presetBalancedHint", { sort: "opportunity", license: "all", watchlist: false }],
  ["commercial", "presetCommercial", "presetCommercialHint", { sort: "commercial", license: "permissive-commercial", watchlist: false }],
  ["growth", "presetGrowth", "presetGrowthHint", { sort: "momentum", license: "all", watchlist: false }],
  ["actionable", "presetActionable", "presetActionableHint", { sort: "actionability", license: "all", watchlist: false }],
  ["product", "presetProduct", "presetProductHint", { sort: "productization", license: "all", watchlist: false }]
];
const DEFAULT_FILTERS = {
  q: "",
  tag: "",
  semanticProblem: "all",
  semanticAudience: "all",
  semanticShape: "all",
  language: "all",
  category: "all",
  license: "all",
  triageStatus: "all",
  aiAnalysis: "all",
  risk: "all",
  sort: "opportunity",
  watchlist: false
};
const PRESET_COMPARE_KEYS = Object.keys(DEFAULT_FILTERS).filter((key) => key !== "q");
const LEADERBOARD_PERIODS = [
  ["daily", "dailyRank"],
  ["weekly", "weeklyRank"],
  ["monthly", "monthlyRank"],
  ["all", "allRank"]
];
const LEADERBOARD_LIMIT = 20;
const PROJECT_DISMISS_NOTICE_MS = 8000;
const PROJECT_RESTORE_NOTICE_MS = 5000;

const CATEGORY_ZH = Object.fromEntries(FILTERS.category.map((item) => [item[0], item[1]]));
const CATEGORY_EN = Object.fromEntries(FILTERS.category.map((item) => [item[0], item[2]]));
const CATEGORY_EN_TO_ZH = {
  "Product Starters & App Shells": "应用基础模板",
  "Product Starters & App Templates": "应用基础模板",
  "AI Products & Agents": "AI 产品与自动化",
  "AI Apps & Assistants": "AI 应用与助手",
  "AI Products & Automation": "AI 产品与自动化",
  "Developer Productivity & AI Coding": "开发效率与 AI 编程",
  "SaaS & Business Systems": "SaaS 与业务系统",
  "Data, Analytics & Knowledge": "数据与知识系统",
  "Infra, Cloud & Platform Engineering": "云原生与平台工程",
  "Security, Privacy & Compliance": "安全与合规",
  "Frontend, Design & Creative Tools": "前端、设计与创意工具",
  "Creative Media & Content Production": "视频音频与内容创作",
  "Consumer Productivity & Personal Tools": "个人效率工具",
  "Commerce, Growth & Content": "商业增长与内容",
  "Vertical & Domain Applications": "垂直行业",
  "Systems, Runtime & Edge": "系统、运行时与边缘",
  "Learning, Lists & Research Assets": "学习与研究资产",
  Other: "其他"
};
const POSITIVE_LABEL_NORMALIZE_ZH = {
  "\u4ea7\u54c1\u58f3": "应用工作台",
  "\u4ea7\u54c1\u58f3模板": "应用基础模板",
  "\u4ea7\u54c1\u58f3与模板": "应用基础模板"
};
function positiveLabelZh(value) {
  const raw = String(value || "");
  return POSITIVE_LABEL_NORMALIZE_ZH[raw] || raw.replaceAll("\u4ea7\u54c1\u58f3", "应用雏形").replaceAll("\u6210\u54c1\u65b9\u5411", "应用路径");
}
const LICENSE_EN_TO_ZH = {
  "Low-friction commercial": "MIT/Apache/BSD",
  "Low-friction license": "MIT/Apache/BSD",
  "Commercial with obligations": "需履约许可",
  "License with obligations": "需履约许可",
  "Distribution may require source release": "分发需开源",
  "SaaS source-release risk": "网络服务高风险",
  "Restricted or non-commercial": "受限用途",
  "Restricted use": "受限用途",
  "No license: monitor only": "无许可：仅监控",
  "Manual review before reuse": "先人工复核",
  "Manual review first": "先人工复核"
};
const LICENSE_LABEL_ZH_NORMALIZE = {
  "低摩擦商用": "MIT/Apache/BSD",
  "可商用但需履约": "需履约许可",
  "禁止商用/受限": "受限用途",
  "人工复核后再用": "先人工复核"
};
const TERM_ZH = {
  ai: "AI",
  "ai-agent": "AI 智能体",
  "ai-agents": "AI 智能体",
  "ai-coding": "AI 编程",
  llm: "大模型",
  rag: "检索增强",
  mcp: "模型上下文协议",
  agent: "智能体",
  agents: "智能体",
  agentic: "智能体化",
  assistant: "助手",
  assistants: "助手",
  autonomous: "自主",
  swarm: "群体智能",
  engineering: "工程",
  from: "从",
  scratch: "零开始",
  code: "代码",
  coding: "编程",
  coder: "编程助手",
  claude: "Claude",
  "claude-code": "Claude Code",
  codex: "Codex",
  chatgpt: "ChatGPT",
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Gemini",
  graph: "图谱",
  memory: "记忆",
  design: "设计",
  open: "开源",
  cli: "命令行工具",
  command: "命令",
  terminal: "终端",
  "developer-tools": "开发者工具",
  developer: "开发者",
  developers: "开发者",
  ide: "IDE",
  testing: "测试",
  ci: "持续集成",
  "deep-learning": "深度学习",
  "machine-learning": "机器学习",
  "generative-ai": "生成式 AI",
  "ai-engineering": "AI 工程",
  "computer-vision": "计算机视觉",
  "from-scratch": "从零实现",
  nlp: "自然语言处理",
  dashboard: "仪表盘",
  admin: "后台管理",
  starter: "启动模板",
  saas: "SaaS",
  security: "安全",
  privacy: "隐私",
  compliance: "合规",
  scanner: "扫描器",
  scan: "扫描",
  data: "数据",
  analytics: "分析",
  analysis: "分析",
  pipeline: "流水线",
  etl: "数据抽取转换加载",
  vector: "向量",
  database: "数据库",
  db: "数据库",
  browser: "浏览器",
  notes: "笔记",
  note: "笔记",
  ui: "界面",
  ux: "体验",
  components: "组件",
  component: "组件",
  workflow: "工作流",
  workflows: "工作流",
  automation: "自动化",
  orchestrator: "编排器",
  orchestration: "编排",
  search: "搜索",
  knowledge: "知识",
  tools: "工具",
  tool: "工具",
  awesome: "精选资源",
  learn: "学习",
  learning: "学习",
  tutorial: "教程",
  educational: "教学",
  image: "图像",
  video: "视频",
  audio: "音频",
  music: "音乐",
  podcast: "播客",
  voice: "语音",
  subtitle: "字幕",
  caption: "字幕",
  render: "渲染",
  timeline: "时间线",
  thumbnail: "缩略图",
  shorts: "短视频",
  media: "媒体",
  creator: "创作者",
  finance: "金融",
  trading: "交易",
  stock: "股票",
  stocks: "股票",
  cms: "内容管理",
  ecommerce: "电商",
  commerce: "商业",
  content: "内容",
  local: "本地",
  "local-first": "本地优先",
  first: "优先",
  sync: "同步",
  api: "接口",
  server: "服务端",
  client: "客户端",
  platform: "平台",
  framework: "框架",
  kit: "套件",
  studio: "工作台",
  editor: "编辑器",
  docs: "文档",
  document: "文档",
  knowledgebase: "知识库",
  observability: "可观测性",
  kubernetes: "Kubernetes"
};
const CATEGORY_ACTION_ZH = {
  "product-starters": "优先检查部署方式、业务闭环和可替换模块，适合观察成熟应用形态",
  "ai-native-products": "适合观察 AI 应用原型、自动执行流程和具体交互场景",
  "developer-productivity": "适合拆解为开发者工具、CLI、IDE 插件或团队效率产品",
  "business-saas": "适合评估为 SaaS、后台系统或企业内部工具",
  "data-knowledge": "适合拆解为数据平台、知识检索或企业分析能力",
  "infra-cloud": "适合研究平台工程能力，但落地通常需要更强运维与可信度",
  "security-compliance": "适合安全产品方向，但需要更高正确性和责任边界",
  "frontend-creative": "适合包装成设计、前端、创意生产力工具",
  "creative-media": "适合评估为视频、音频、音乐、播客或内容创作工具",
  "consumer-productivity": "适合个人效率产品或本地优先工具方向",
  "commerce-growth-content": "适合内容、电商、增长或创作者工具方向",
  "vertical-domain": "适合垂直行业机会，但需要额外行业知识与合规判断",
  "systems-runtime-edge": "更像长期技术资产，转化为清晰用户价值通常需要更长验证",
  "learning-research-assets": "更适合作为市场情报和学习资产，先用于理解方向",
  other: "需要进一步人工判断产品方向"
};
const CATEGORY_PROJECT_NAME_ZH = {
  "product-starters": "应用基础模板",
  "ai-native-products": "AI 自动化项目",
  "developer-productivity": "开发效率工具",
  "business-saas": "SaaS 业务系统",
  "data-knowledge": "数据与知识系统",
  "infra-cloud": "云原生平台工程项目",
  "security-compliance": "安全合规工具",
  "frontend-creative": "前端设计与创意工具",
  "creative-media": "视频音频与内容创作工具",
  "consumer-productivity": "个人效率工具",
  "commerce-growth-content": "商业增长与内容工具",
  "vertical-domain": "垂直行业应用",
  "systems-runtime-edge": "系统运行时与边缘项目",
  "learning-research-assets": "学习与研究资产",
  other: "待研判项目"
};
const CATEGORY_BRIEF_ZH = {
  "product-starters": {
    labelZh: "应用基础模板",
    purpose: "提供可运行的应用雏形、脚手架、模板或开源替代品",
    value: "适合优先观察部署方式、业务闭环和场景延展空间"
  },
  "ai-native-products": {
    labelZh: "AI 应用",
    purpose: "把模型能力包装成具体用户场景、助手或知识工作流",
    value: "只有具备明确用户场景、界面或部署路径时才适合重点评估"
  },
  "developer-productivity": {
    labelZh: "开发者工具",
    purpose: "提升开发、调试、编码或工程协作效率",
    value: "适合拆解为开发者工具、IDE 插件、CLI 或团队效率产品"
  },
  "business-saas": {
    labelZh: "后台模板",
    purpose: "搭建 SaaS、后台管理或企业业务系统",
    value: "适合作为内部工具、行业模板或管理系统的灵感来源"
  },
  "data-knowledge": {
    labelZh: "数据与知识",
    purpose: "处理数据、知识检索、分析或问答",
    value: "适合做知识库、数据平台、RAG 或企业搜索产品"
  },
  "infra-cloud": {
    labelZh: "平台工程",
    purpose: "建设云原生、平台工程、部署或运维能力",
    value: "适合技术资产沉淀，但商用落地需要更强可靠性验证"
  },
  "security-compliance": {
    labelZh: "安全检查",
    purpose: "安全检测、隐私保护、审计或合规治理",
    value: "适合安全产品研究，但需要更严格的正确性和责任边界"
  },
  "frontend-creative": {
    labelZh: "前端创意工具",
    purpose: "界面开发、设计系统、组件或创意生产",
    value: "适合包装成前端工具、设计工具或创作型产品"
  },
  "creative-media": {
    labelZh: "视频音频与内容创作",
    purpose: "制作视频、音频、音乐、播客、字幕或内容生产流程",
    value: "适合评估为内容创作工具、剪辑工具、配音工具或创作者工作台"
  },
  "consumer-productivity": {
    labelZh: "个人效率",
    purpose: "管理个人任务、笔记、日程或本地工作流",
    value: "适合评估为轻量个人效率产品或本地优先工具"
  },
  "commerce-growth-content": {
    labelZh: "内容与增长",
    purpose: "内容生产、商业增长、电商或创作者运营",
    value: "适合做增长工具、内容工具或垂直运营系统"
  },
  "vertical-domain": {
    labelZh: "垂直行业应用",
    purpose: "解决特定行业场景的业务流程或自动化问题",
    value: "适合行业化产品验证，但需要补充行业知识和合规判断"
  },
  "systems-runtime-edge": {
    labelZh: "系统与边缘",
    purpose: "提供底层运行时、系统工具或边缘计算能力",
    value: "更像长期技术资产，需要先验证使用门槛和清晰价值"
  },
  "learning-research-assets": {
    labelZh: "学习资料",
    purpose: "学习、研究、资料整理或技术路线参考",
    value: "更适合作为情报和学习资产，不宜直接当成成品底座"
  },
  other: {
    labelZh: "待研判",
    purpose: "探索一个尚需人工判断的开源方向",
    value: "需要先明确用户、场景和长期价值线索"
  }
};
const PROJECT_BRIEF_HINTS = {
  "product-starters": {
    lead: "这类项目已经具备应用雏形、模板、脚手架或开源替代实现。",
    capability: "看它是否能直接部署、是否有清晰业务闭环，以及哪些模块可替换。",
    reuse: "适合优先观察完整应用形态、部署路径和场景延展空间。"
  },
  "ai-native-products": {
    lead: "这类项目把模型能力放进具体应用、助手或知识工作流。",
    capability: "重点看它有没有真实用户流程、界面、部署路径，而不只是 Agent 编排概念。",
    reuse: "适合观察可借鉴的交互方式和垂直场景，抽象框架要降权观察。"
  },
  "developer-productivity": {
    lead: "这类项目多在提升编码、调试、命令行或协作效率。",
    capability: "看它是否能稳定接入开发流程、工作流和工程上下文。",
    reuse: "适合启发 CLI、IDE 插件、代码审查或团队效率工具方向。"
  },
  "business-saas": {
    lead: "这类项目通常是后台、SaaS 或业务系统底座。",
    capability: "看业务流程是否完整，还是只停留在模板层。",
    reuse: "适合观察管理系统、行业模板或内部工具的完整流程。"
  },
  "data-knowledge": {
    lead: "这类项目围绕数据处理、检索、分析或问答。",
    capability: "看它是否真的把数据流、索引和结果解释连起来。",
    reuse: "适合启发知识库、数据平台、RAG 或企业搜索方向。"
  },
  "infra-cloud": {
    lead: "这类项目偏基础设施、平台工程或云原生能力。",
    capability: "看它能否稳定运行、监控和扩展，而不是只展示概念。",
    reuse: "更像技术资产，深入采用前要验证稳定性和运维成本。"
  },
  "security-compliance": {
    lead: "这类项目通常处理安全、隐私或合规问题。",
    capability: "看它是否有准确、可复核的检测链路，而不是只给结论。",
    reuse: "适合安全方向研究，但要更严格看责任边界。"
  },
  "frontend-creative": {
    lead: "这类项目围绕界面、组件、设计系统或创意生产。",
    capability: "看界面生成、交互和可编辑性是否真的好用。",
    reuse: "适合启发前端工具、设计工具或创作型工作流。"
  },
  "creative-media": {
    lead: "这类项目处理视频、音频、音乐、播客或字幕。",
    capability: "看它是否能形成完整创作链，而不只是单点处理。",
    reuse: "适合观察剪辑、配音、字幕或内容工坊方向。"
  },
  "consumer-productivity": {
    lead: "这类项目偏个人效率、本地优先或日常工作流。",
    capability: "看它能否长期使用，还是只在演示时顺手。",
    reuse: "适合个人效率产品或本地优先工具。"
  },
  "commerce-growth-content": {
    lead: "这类项目面向内容生产、商业增长、电商或创作者运营。",
    capability: "看它是否真的提升转化、生产效率或运营节奏。",
    reuse: "适合观察增长工具、内容工具或垂直运营系统方向。"
  },
  "vertical-domain": {
    lead: "这类项目解决某个垂直行业的问题。",
    capability: "看行业流程是否足够具体，而不是泛泛模板。",
    reuse: "适合行业场景验证，但要补足行业和合规判断。"
  },
  "systems-runtime-edge": {
    lead: "这类项目偏底层运行时、系统工具或边缘能力。",
    capability: "看它是否能在真实环境里稳定运行和迭代。",
    reuse: "更像长期技术资产，转化为用户价值通常需要更长验证。"
  },
  "learning-research-assets": {
    lead: "这类项目更像学习资料、案例集或研究资产。",
    capability: "看它是否真的能帮助你选题、拆解和复现。",
    reuse: "更适合作为市场情报和学习输入，先用于理解方向。"
  },
  other: {
    lead: "这类项目还需要进一步人工判断。",
    capability: "先确认它的真实使用场景，再看是否值得持续跟踪。",
    reuse: "不要急着下结论，先补齐项目本身的信息。"
  }
};
const PURPOSE_RULES_ZH = [
  {
    labelZh: "产品模板",
    purpose: "提供可运行的应用基础模板、脚手架或全栈示例",
    value: "可快速观察部署方式、业务闭环和场景延展空间",
    pattern: /saas[-\s_]?starter|starter kit|boilerplate|scaffold|full[-\s]?stack starter|production[-\s]?ready template/i
  },
  {
    labelZh: "开源替代品",
    purpose: "参考成熟产品形态并提供可自部署的开源实现",
    value: "适合学习成熟产品的核心功能和差异化表达方式",
    pattern: /open[-\s]?source alternative|alternative to|open source.*alternative|clone/i
  },
  {
    labelZh: "自托管应用",
    purpose: "提供可以私有部署的完整应用",
    value: "适合自用、私有化部署或围绕具体行业探索延展方向",
    pattern: /self[-\s]?hosted|selfhosted|docker compose|private deployment/i
  },
  {
    labelZh: "应用工作台",
    purpose: "已经具备界面、工作流或业务闭环",
    value: "适合观察核心功能、部署方式和可延展模块，再判断应用路径",
    pattern: /app shell|dashboard|admin panel|workspace|studio|portal|console/i
  },
  {
    labelZh: "浏览器自动化",
    purpose: "让 AI 或脚本在网页中点击、填写、抓取和完成线上任务",
    value: "可启发网页流程自动化、数据采集、测试执行或 AI 办公助手方向",
    pattern: /browser[-\s_]?harness|browser[-\s_]?use|browser[-\s_]?automation|browser agent|websites accessible/i
  },
  {
    labelZh: "AI 角色库",
    purpose: "沉淀可复用的专家角色、提示词和任务分工模板",
    value: "可用于客服、运营、研发、营销等垂直 AI 助手的角色体系设计",
    pattern: /agency[-\s_]?agents|agent definitions?|ai roles?|expert roles?|personas?|即插即用的 AI 专家角色/i
  },
  {
    labelZh: "AI 记忆服务",
    purpose: "为 AI 应用提供长期记忆、个性化上下文和用户偏好管理",
    value: "可启发客服、助手、知识库或个人效率工具的记忆层设计",
    pattern: /mem0|memory layer|ai memory|memory for ai|personalized ai|long[-\s]?term memory/i
  },
  {
    labelZh: "AI 任务操作系统",
    purpose: "为 AI 应用提供任务运行、工具接入和上下文管理底座",
    value: "适合研究多工具任务执行框架，但落地前要验证稳定性和边界控制",
    pattern: /agent operating system|open-source Agent Operating System/i
  },
  {
    labelZh: "规格驱动开发",
    purpose: "把需求规格转成开发计划、任务拆解和可执行实现路径",
    value: "可启发产品需求到代码、团队研发流程或 AI 编程前置规划工具",
    pattern: /spec[-\s]?kit|spec[-\s]?driven|specification/i
  },
  {
    labelZh: "大模型应用合集",
    purpose: "汇总可运行、可改造的 AI 应用、RAG 应用和自动化案例",
    value: "更适合作为选题库和实现参考，筛出具体场景后再深入验证",
    pattern: /awesome.*llm.*apps?|llm apps?.*clone|AI Agent & RAG apps/i
  },
  {
    labelZh: "AI 设计工具",
    purpose: "生成界面原型、设计系统素材和多端页面草稿",
    value: "可启发设计到代码、原型生成、品牌界面生成或创意生产工具",
    pattern: /open[-\s_]?design|claude design|ui-generator|figma-alternative|design-tools|prototyping/i
  },
  {
    labelZh: "内容创作工具",
    purpose: "生成、剪辑或整理视频、音频、音乐和播客内容",
    value: "可启发剪辑器、字幕器、配音器、内容工坊或创作者助手方向",
    pattern: /video|audio|music|podcast|voice|tts|subtitle|caption|timeline|render|shorts/i
  },
  {
    labelZh: "PPT 生成工具",
    purpose: "把文档或素材转换成可编辑的演示文稿",
    value: "可启发报告生成、销售材料、课程课件或企业文档自动化方向",
    pattern: /ppt|powerpoint|presentation|slides?|pptx/i
  },
  {
    labelZh: "大模型推理服务",
    purpose: "提升大模型推理、部署和服务吞吐效率",
    value: "偏底层技术资产，适合做企业 AI 基础设施或私有化部署能力研究",
    pattern: /vllm|inference|serving engine|model serving|managed inference/i
  },
  {
    labelZh: "信息抽取",
    purpose: "从文本、文档或非结构化资料中抽取结构化信息",
    value: "可启发合同解析、研报抽取、客服工单整理或知识入库方向",
    pattern: /langextract|extracting structured information|information extraction|source grounding/i
  },
  {
    labelZh: "设计参考库",
    purpose: "整理品牌设计规范、界面风格和可复用设计上下文",
    value: "可作为 AI 编程生成界面时的设计输入，也可包装成设计资产管理工具",
    pattern: /awesome.*design|design[-\s_]?md|brand design systems?|design tokens/i
  },
  {
    labelZh: "自动化案例库",
    purpose: "整理真实办公、内容、运维和知识管理自动化场景",
    value: "可作为产品选题池，先验证高频场景再拆成独立工具",
    pattern: /openclaw.*usecases?|usecases?.*自动化办公|真实场景/i
  },
  {
    labelZh: "安全技能库",
    purpose: "为 AI 助手或安全团队整理网络安全技能与知识框架",
    value: "可用于安全自动化、攻防训练、合规检查或安全知识库产品研究",
    pattern: /cybersecurity|security skills?|mitre|attack|nist|owasp|vulnerabil/i
  },
  {
    labelZh: "知识图谱工具",
    purpose: "把代码、文档或知识结构转换成可交互图谱",
    value: "可用于代码理解、学习导航、技术文档可视化或企业知识库",
    pattern: /knowledge graph|interactive knowledge graph|graphify|graph that|code graph/i
  },
  {
    labelZh: "学习资料",
    purpose: "系统学习并从零复现关键技术能力",
    value: "可作为课程、训练营、技术拆解或产品原型验证资料",
    pattern: /course|learn|tutorial|from[-\s]?scratch|educational|teaching|best[-\s]?practice/i
  },
  {
    labelZh: "AI 编程助手",
    purpose: "增强 AI 编程助手或开发者自动化工具的工作流",
    value: "可参考其技能、记忆、安全和任务流程设计，启发开发者效率工具",
    pattern: /agent harness|skills|instincts|memory|claude code|codex|cursor|opencode|gemini cli/i
  },
  {
    labelZh: "AI 工作流",
    purpose: "把信息收集、工具调用、执行、校验和结果汇总串成自动流程",
    value: "可用于 AI 工作流平台、自动执行链或跨工具任务处理产品",
    pattern: /multi[-\s]?agent|swarm|orchestrat|autonomous|agentic workflow/i
  },
  {
    labelZh: "开发者工具",
    purpose: "提升开发者编码、调试和命令行操作效率",
    value: "可启发 CLI、IDE 插件、代码审查或团队工程助手方向",
    pattern: /ai[-\s]?coding|developer tool|devtool|cli|terminal|command line/i
  },
  {
    labelZh: "知识检索",
    purpose: "基于资料进行检索、问答或知识发现",
    value: "可启发企业知识库、垂直搜索、客服问答或研究助手方向",
    pattern: /rag|vector|semantic search|knowledge base|search/i
  },
  {
    labelZh: "后台模板",
    purpose: "快速搭建后台、仪表盘或业务管理系统",
    value: "可改造成内部管理工具、SaaS 模板或行业交付系统",
    pattern: /dashboard|admin|backoffice|\bcrm\b|\berp\b|saas starter/i
  },
  {
    labelZh: "金融工具",
    purpose: "处理金融、交易、资产、票据或财务分析场景",
    value: "可启发垂直业务工具方向，但需要额外数据质量和合规判断",
    pattern: /finance|trading|stock|portfolio|invoice|accounting|quant/i
  },
  {
    labelZh: "SRE 运维",
    purpose: "处理告警、故障定位、可观测性和自动化修复",
    value: "可启发企业运维助手、故障分析台或自动化修复流程",
    pattern: /sre|observability|incident|root[-\s]?cause|remediation|alerting|grafana|datadog/i
  },
  {
    labelZh: "数据分析",
    purpose: "采集、处理、分析或展示数据",
    value: "可启发数据看板、指标系统、分析工具或自动报表方向",
    pattern: /etl|pipeline|analytics|analysis|database|warehouse/i
  },
  {
    labelZh: "安全检查",
    purpose: "发现安全、隐私或合规风险",
    value: "可启发检测工具、审计系统或企业治理模块方向",
    pattern: /scanner|privacy|compliance|audit/i
  },
  {
    labelZh: "前端创意工具",
    purpose: "构建界面组件、编辑器、设计系统或创意工具",
    value: "可启发前端资产库、低代码组件或创作型工具方向",
    pattern: /ui component|design system|frontend|editor|canvas|creative/i
  },
  {
    labelZh: "视频音频与内容创作",
    purpose: "构建视频、音频、音乐、播客、字幕或内容生产工具",
    value: "可启发剪辑工具、配音工具、内容工作台或创作者工具方向",
    pattern: /video|audio|music|podcast|voice|tts|subtitle|caption|timeline|render|shorts/i
  },
  {
    labelZh: "内容与增长",
    purpose: "支撑内容管理、商业增长、电商或创作者运营",
    value: "可启发内容后台、营销工具、店铺系统或创作者工具方向",
    pattern: /cms|content|ecommerce|commerce|marketing|growth/i
  },
  {
    labelZh: "平台工程",
    purpose: "提供部署、监控、云平台或底层系统工程能力",
    value: "可作为平台工程资产，深入采用前要验证稳定性和运维成本",
    pattern: /kubernetes|cloud|infra|observability|monitoring|runtime|edge|deploy/i
  },
  {
    labelZh: "个人效率",
    purpose: "管理个人效率、本地数据或日常工作流",
    value: "可启发个人效率工具、笔记任务系统或本地优先应用方向",
    pattern: /local[-\s]?first|notes?|calendar|task|productivity|personal/i
  }
];
const CAPABILITY_PHRASE_RULES_ZH = [
  { pattern: /saas[-\s_]?starter|starter kit|boilerplate|scaffold|full[-\s]?stack starter|production[-\s]?ready template/i, phrases: ["产品脚手架", "可部署模板", "业务基础模块"] },
  { pattern: /open[-\s]?source alternative|alternative to|open source.*alternative|clone/i, phrases: ["开源替代", "成熟产品形态", "差异化表达"] },
  { pattern: /self[-\s]?hosted|selfhosted|docker compose|private deployment/i, phrases: ["私有部署", "完整应用", "自托管"] },
  { pattern: /app shell|dashboard|admin panel|workspace|studio|portal|console/i, phrases: ["产品界面", "业务流程", "操作台"] },
  { pattern: /browser[-\s_]?harness|browser[-\s_]?use|browser[-\s_]?automation|browser agent|websites accessible/i, phrases: ["网页点击填写", "浏览器任务执行", "流程自动化"] },
  { pattern: /agency[-\s_]?agents|agent definitions?|ai roles?|expert roles?|personas?|即插即用的 AI 专家角色/i, phrases: ["专家角色模板", "任务分工", "提示词资产"] },
  { pattern: /mem0|memory layer|ai memory|memory for ai|personalized ai|long[-\s]?term memory/i, phrases: ["长期记忆", "偏好上下文", "用户画像"] },
  { pattern: /agent operating system|open-source Agent Operating System/i, phrases: ["任务运行环境", "工具接入", "上下文管理"] },
  { pattern: /spec[-\s]?kit|spec[-\s]?driven|specification/i, phrases: ["需求规格", "任务拆解", "实现计划"] },
  { pattern: /awesome.*llm.*apps?|llm apps?.*clone|AI Agent & RAG apps/i, phrases: ["可运行案例", "RAG 应用", "AI 产品选题"] },
  { pattern: /open[-\s_]?design|claude design|ui-generator|figma-alternative|design-tools|prototyping/i, phrases: ["界面原型", "设计系统", "多端生成"] },
  { pattern: /video|audio|music|podcast|voice|tts|subtitle|caption|timeline|render|shorts/i, phrases: ["视频剪辑", "音频制作", "内容创作"] },
  { pattern: /ppt|powerpoint|presentation|slides?|pptx/i, phrases: ["文档转 PPT", "可编辑形状", "演示文稿自动化"] },
  { pattern: /vllm|inference|serving engine|model serving|managed inference/i, phrases: ["模型推理", "高吞吐服务", "私有化部署"] },
  { pattern: /langextract|extracting structured information|information extraction|source grounding/i, phrases: ["结构化抽取", "来源定位", "交互可视化"] },
  { pattern: /awesome.*design|design[-\s_]?md|brand design systems?|design tokens/i, phrases: ["设计规范", "品牌风格", "AI 界面生成上下文"] },
  { pattern: /openclaw.*usecases?|usecases?.*自动化办公|真实场景/i, phrases: ["场景案例", "办公自动化", "产品选题"] },
  { pattern: /cybersecurity|security skills?|mitre|attack|nist|owasp|vulnerabil/i, phrases: ["安全技能库", "攻防框架映射", "合规知识组织"] },
  { pattern: /knowledge graph|interactive knowledge graph|graphify|code graph/i, phrases: ["代码图谱生成", "交互式知识导航", "文档可视化"] },
  { pattern: /course|learn|tutorial|from[-\s]?scratch|educational|teaching|best[-\s]?practice/i, phrases: ["教程体系", "从零实现", "实践样例"] },
  { pattern: /agent harness|skills|instincts|memory|claude code|codex|cursor|opencode|gemini cli/i, phrases: ["AI 编程工作流", "技能与记忆机制", "开发者助手"] },
  { pattern: /multi[-\s]?agent|swarm|orchestrat|autonomous|agentic workflow/i, phrases: ["步骤串联", "工具调用", "结果汇总"] },
  { pattern: /ai[-\s]?coding|developer tool|devtool|cli|terminal|command line/i, phrases: ["编码辅助", "命令行工具", "工程效率"] },
  { pattern: /rag|vector|semantic search|knowledge base|search/i, phrases: ["语义检索", "知识问答", "资料索引"] },
  { pattern: /dashboard|admin|backoffice|\bcrm\b|\berp\b|saas starter/i, phrases: ["后台界面", "业务流程", "SaaS 模板"] },
  { pattern: /finance|trading|stock|portfolio|invoice|accounting|quant/i, phrases: ["金融数据", "交易分析", "财务流程"] },
  { pattern: /sre|observability|incident|root[-\s]?cause|remediation|alerting|grafana|datadog/i, phrases: ["告警处理", "故障定位", "自动修复"] },
  { pattern: /etl|pipeline|analytics|analysis|database|warehouse/i, phrases: ["数据处理", "指标分析", "自动报表"] },
  { pattern: /scanner|privacy|compliance|audit/i, phrases: ["风险扫描", "隐私检查", "审计流程"] },
  { pattern: /ui component|design system|frontend|editor|canvas|creative/i, phrases: ["组件体系", "编辑器能力", "创意生产"] },
  { pattern: /cms|content|ecommerce|commerce|marketing|growth/i, phrases: ["内容管理", "商业增长", "运营自动化"] },
  { pattern: /kubernetes|cloud|infra|observability|monitoring|runtime|edge|deploy/i, phrases: ["部署运维", "监控观测", "平台工程"] },
  { pattern: /local[-\s]?first|notes?|calendar|task|productivity|personal/i, phrases: ["个人工作流", "本地数据", "效率管理"] }
];
const PROJECT_NAME_RULES_ZH = [
  { pattern: /saas[-\s_]?starter|starter kit|boilerplate|scaffold|full[-\s]?stack starter|production[-\s]?ready template/i, name: "产品脚手架" },
  { pattern: /open[-\s]?source alternative|alternative to|open source.*alternative|clone/i, name: "开源替代品" },
  { pattern: /self[-\s]?hosted|selfhosted|docker compose|private deployment/i, name: "自托管应用" },
  { pattern: /app shell|dashboard|admin panel|workspace|studio|portal|console/i, name: "产品操作台" },
  { pattern: /browser[-\s_]?harness|browser harness/i, name: "浏览器自动化框架" },
  { pattern: /browser[-\s_]?use|browser[-\s_]?automation|browser agent|websites accessible/i, name: "浏览器自动化工具" },
  { pattern: /agency[-\s_]?agents|agent definitions?|ai roles?|expert roles?|personas?|即插即用的 AI 专家角色/i, name: "AI 助手角色库" },
  { pattern: /mem0|memory layer|ai memory|memory for ai|personalized ai|long[-\s]?term memory/i, name: "AI 长期记忆服务" },
  { pattern: /spec[-\s]?kit|spec[-\s]?driven|specification/i, name: "规格驱动开发工具" },
  { pattern: /best[-\s]?practice|claude-code-best-practice/i, name: "AI 编程实践指南" },
  { pattern: /awesome.*llm.*apps?|llm apps?.*clone|AI Agent & RAG apps/i, name: "大模型应用合集" },
  { pattern: /ragflow|retrieval augmented|knowledge base|semantic search|vector search/i, name: "知识检索系统" },
  { pattern: /daily.*stock|stock.*analysis|stock analysis|AI-Trader|trading/i, name: "股票分析助手" },
  { pattern: /open[-\s_]?design|claude design|ui-generator|figma-alternative|design-tools|prototyping/i, name: "AI 设计生成工具" },
  { pattern: /video|audio|music|podcast|voice|tts|subtitle|caption|timeline|render|shorts/i, name: "内容创作工具" },
  { pattern: /ppt|powerpoint|presentation|slides?|pptx/i, name: "PPT 生成工具" },
  { pattern: /awesome.*design|design[-\s_]?md|brand design systems?|design tokens/i, name: "设计参考库" },
  { pattern: /openclaw.*usecases?|usecases?.*自动化办公|真实场景/i, name: "自动化场景案例库" },
  { pattern: /awesome[-\s_]?openclaw[-\s_]?skills|official OpenClaw Skills Registry|OpenClaw skills registry/i, name: "AI 技能库" },
  { pattern: /agent operating system|open-source Agent Operating System/i, name: "AI 任务操作系统" },
  { pattern: /vllm|inference|serving engine|model serving|managed inference/i, name: "大模型推理服务引擎" },
  { pattern: /langextract|extracting structured information|information extraction|source grounding/i, name: "文本信息抽取工具" },
  { pattern: /text measurement|text layout|pretext/i, name: "文本排版测量工具" },
  { pattern: /cybersecurity|security skills?|mitre|attack|nist|owasp|vulnerabil/i, name: "网络安全技能库" },
  { pattern: /knowledge graph|interactive knowledge graph|graphify|code graph/i, name: "代码知识图谱工具" },
  { pattern: /multi[-\s]?agent|swarm|orchestrat|autonomous agent|agentic/i, name: "AI 工作流平台" },
  { pattern: /ai[-\s]?agent|agent harness|assistant|copilot/i, name: "AI 编程助手工具" },
  { pattern: /claude code|codex|ai coding|developer tool|devtool|terminal|cli|command line/i, name: "开发者效率工具" },
  { pattern: /rag|vector|knowledge graph|knowledge base|semantic search/i, name: "知识检索系统" },
  { pattern: /dashboard|admin|backoffice|\bcrm\b|\berp\b|saas starter/i, name: "业务后台系统" },
  { pattern: /sre|observability|incident|root[-\s]?cause|remediation|alerting|grafana|datadog/i, name: "SRE 运维助手" },
  { pattern: /workflow|automation|zapier|n8n|pipeline/i, name: "工作流自动化平台" },
  { pattern: /security|scanner|vulnerability|privacy|compliance/i, name: "安全合规工具" },
  { pattern: /ui component|design system|frontend|editor|canvas|creative/i, name: "前端设计工具" },
  { pattern: /cms|content|ecommerce|commerce|marketing|growth/i, name: "内容与增长工具" },
  { pattern: /finance|trading|stock|portfolio|invoice|accounting/i, name: "金融业务工具" },
  { pattern: /kubernetes|cloud|infra|observability|monitoring|runtime|edge/i, name: "云原生工程工具" },
  { pattern: /local[-\s]?first|notes?|personal|productivity|calendar|task/i, name: "个人效率工具" },
  { pattern: /learn|tutorial|course|awesome|list|research/i, name: "学习研究资产" }
];
const GENERIC_PROJECT_NAMES_ZH = new Set([
  "产品脚手架",
  "开源替代品",
  "自托管应用",
  "产品操作台",
  "浏览器自动化框架",
  "浏览器自动化工具",
  "AI 助手角色库",
  "AI 长期记忆服务",
  "规格驱动开发工具",
  "AI 编程实践指南",
  "大模型应用合集",
  "AI 设计生成工具",
  "知识图谱工具",
  "代码知识图谱工具",
  "内容创作工具",
  "PPT 生成工具",
  "设计参考库",
  "自动化场景案例库",
  "AI 技能库",
  "AI 任务操作系统",
  "大模型推理服务引擎",
  "文本信息抽取工具",
  "文本排版测量工具",
  "网络安全技能库",
  "AI 工作流平台",
  "AI 编程助手工具",
  "开发者效率工具",
  "知识检索系统",
  "业务后台系统",
  "工作流自动化平台",
  "安全合规工具",
  "前端设计工具",
  "内容与增长工具",
  "金融业务工具",
  "云原生工程工具",
  "个人效率工具",
  "学习研究资产"
]);

const PROJECT_NAME_DESCRIPTOR_RULES_ZH = [
  { pattern: /learn it\. build it\. ship it for others|ai-engineering-from-scratch/i, name: "AI 工程从零实践" },
  { pattern: /agency-agents|即插即用的 AI 专家角色/i, name: "AI 专家角色库" },
  { pattern: /agent harness performance optimization system|^ECC$/i, name: "Agent Harness 优化系统" },
  { pattern: /Understand-Anything|graphs that teach|interactive knowledge graph/i, name: "代码知识图谱探索器" },
  { pattern: /graphify|queryable knowledge graph/i, name: "可查询代码知识图谱" },
  { pattern: /lean cortex|cognitive context layer/i, name: "Agent 上下文层" },
  { pattern: /leading agent orchestration platform|multi-agent swarms|mission-control/i, name: "Agent 编排控制台" },
  { pattern: /codeburn|AI coding tokens/i, name: "AI 编程成本看板" },
  { pattern: /html-anything|agentic HTML editor/i, name: "Agent HTML 编辑器" },
  { pattern: /Vibe-Trading|personal trading agent/i, name: "个人交易 Agent" },
  { pattern: /obsidian-second-brain|living AI-first second brain/i, name: "Obsidian AI 第二大脑" },
  { pattern: /claude-mem|persistent context across sessions/i, name: "Agent 跨会话记忆层" },
  { pattern: /open-design|Claude Design alternative/i, name: "本地优先设计生成器" },
  { pattern: /career-ops|job search system/i, name: "AI 求职工作台" },
  { pattern: /AionUi|Cowork app/i, name: "AI 助手协作桌面端" },
  { pattern: /OpenCLI|Make Any Website into CLI/i, name: "网站转命令行工具" },
  { pattern: /browser-harness|Self-healing harness/i, name: "浏览器任务 Harness" },
  { pattern: /GenericAgent|self-evolving agent/i, name: "自进化 Agent" },
  { pattern: /anything-llm|AI productivity accelerator/i, name: "本地优先 AI 效率台" },
  { pattern: /oh-my-zsh|ohmyzsh|zsh configuration/i, name: "Zsh 配置管理框架" },
  { pattern: /mem0|universal memory layer/i, name: "AI Agent 记忆层" },
  { pattern: /PPTX|presentation generator|slides?/i, name: "可编辑 PPT 生成器" },
  { pattern: /DESIGN\.md|brand design systems/i, name: "品牌设计系统库" },
  { pattern: /Screen Studio|create stunning demos/i, name: "产品演示制作工具" },
  { pattern: /voice studio|clone, dictate, create/i, name: "AI 语音工作室" },
  { pattern: /Unsloth Studio|training and running open models/i, name: "本地模型训练界面" },
  { pattern: /payments platform|payment, payout, fraud/i, name: "可组合支付平台" },
  { pattern: /travel\/trip planner/i, name: "自托管旅行规划器" },
  { pattern: /download manager/i, name: "下载管理器" },
  { pattern: /media downloads|studying media/i, name: "媒体学习桌面端" },
  { pattern: /USB-C cable/i, name: "USB-C 线缆识别工具" },
  { pattern: /music utility|audio management/i, name: "个人音乐库工具" }
];
const PRODUCT_SIGNAL_LABEL_ZH = {
  "starter-template": "产品模板/脚手架",
  "self-hosted": "可自托管部署",
  "app-surface": "有应用界面",
  "editor-workbench": "有编辑器或工作台",
  "business-flow": "有业务流程",
  "end-user-app": "面向终端用户",
  "known-product-shape": "成熟产品形态",
  "domain-product": "垂直行业场景",
  "homepage-demo": "有主页或演示",
  deployable: "可部署线索",
  docs: "有文档/快速开始",
  "integration-ready": "可集成"
};
const LICENSE_NOTE_ZH = {
  "unknown-no-license": "未检测到标准开源许可。GitHub 公开可见不等于授予复制、修改或分发权利。",
  "permissive-commercial": "需要保留版权声明和许可文本。",
  "conditional-commercial": "可能可以商用，但再分发、链接方式、文件级修改等义务需要人工复核。",
  "distribution-copyleft": "对闭源商用品摩擦较高，分发衍生软件时通常要考虑源码开放义务。",
  "network-copyleft": "网络服务场景也可能触发源码开放义务，不适合未复核就直接包装成闭源服务。",
  "restricted-noncommercial": "用途可能被禁止或受限制，建议先作为观察对象，不急于深入采用。",
  "manual-review": "识别到了许可，但不在低风险白名单内，必须阅读完整许可文本。"
};
const PROFILE_LABEL_ZH = {
  "ai-agent-fast": "AI 智能体",
  "llm-apps": "大模型应用",
  "rag-apps": "检索增强应用",
  mcp: "模型上下文协议生态",
  "ai-coding": "AI 编程工具",
  "new-fast-growth": "新近高速增长项目",
  devtools: "开发者工具",
  "cli-tools": "命令行工具",
  "saas-starter": "SaaS 启动模板",
  "admin-dashboard": "后台仪表盘",
  "workflow-automation": "工作流自动化",
  "data-pipeline": "数据流水线",
  "knowledge-search": "知识检索",
  security: "安全工具",
  "llm-security": "大模型安全",
  observability: "可观测性",
  "cloud-platform": "云平台工程",
  "consumer-productivity": "个人效率",
  "local-first": "本地优先工具",
  "creative-video": "视频创作与剪辑",
  "ai-video-generation": "AI 视频生成",
  "audio-music-tools": "音频与音乐工具",
  "podcast-voice": "播客与语音创作",
  "creator-content-tools": "创作者内容工具",
  "design-prototyping": "设计与原型工具",
  "visual-asset-generation": "视觉素材生成",
  "ui-components": "前端与创意工具",
  "canvas-editor": "画布与编辑器工具",
  "commerce-content": "商业与内容",
  "vertical-finance": "金融与交易",
  "typescript-new": "TypeScript 新项目",
  "python-new": "Python 新项目",
  "go-infra": "Go 基础设施",
  "rust-infra": "Rust 基础设施",
  "commercial-friendly-mit": "MIT 许可友好",
  "commercial-friendly-apache": "Apache 许可友好"
};
const REGION_LABELS = {
  zh: { global: "国际", china: "国内", custom: "自定义" },
  en: { global: "Global", china: "China", custom: "Custom" }
};
const PROTOCOL_LABELS = {
  zh: {
    "openai-compatible": "OpenAI 兼容接口",
    anthropic: "Anthropic 接口",
    gemini: "Gemini 接口"
  },
  en: {
    "openai-compatible": "OpenAI-compatible",
    anthropic: "Anthropic",
    gemini: "Gemini"
  }
};
const ANOMALY_ZH = {
  "High stars with unusually low fork activity": "星标较高，但分叉活跃度异常偏低",
  "Very young repository with sudden attention": "项目很新，但突然获得大量关注",
  "Repository appears stale": "仓库近期维护活跃度偏低",
  "Repository is archived": "仓库已归档"
};

const SERVICE_KEY_ISSUE_STORAGE_KEYS = {
  github: "starvault.githubTokenIssue",
  tavily: "starvault.tavilyKeyIssue",
  exa: "starvault.exaKeyIssue"
};
const GUIDE_SEEN_STORAGE_KEY = "starvault.guideSeen.v1";
const GUIDE_TOUR_STEPS = [
  {
    view: "projects",
    selector: ".connection-strip",
    titleKey: "guideTourConnectionsTitle",
    bodyKey: "guideTourConnectionsBody"
  },
  {
    view: "settings",
    selector: "#github-token",
    titleKey: "guideTourTokenTitle",
    bodyKey: "guideTourTokenBody"
  },
  {
    view: "settings",
    selector: "#view-settings .model-key-section",
    titleKey: "guideTourAiTitle",
    bodyKey: "guideTourAiBody"
  },
  {
    view: "settings",
    selector: "#view-settings .observation-plan-section",
    titleKey: "guideTourPlanTitle",
    bodyKey: "guideTourPlanBody",
    renderBefore: "observationPlans",
    scrollBlock: "start"
  },
  {
    view: "projects",
    selector: "#scan-button",
    titleKey: "guideTourScanTitle",
    bodyKey: "guideTourScanBody"
  },
  {
    view: "projects",
    selector: "#view-projects",
    titleKey: "guideTourPoolTitle",
    bodyKey: "guideTourPoolBody"
  },
  {
    view: "learning",
    selector: "#view-learning .learning-shell",
    titleKey: "guideTourLearningTitle",
    bodyKey: "guideTourLearningBody"
  }
];
const INDEXEDDB_SNAPSHOT_MIN_AGE_MS = 5 * 60 * 1000;
const INDEXEDDB_SNAPSHOT_BOOT_DELAY_MS = 1800;
const INDEXEDDB_SNAPSHOT_MUTATION_DELAY_MS = 2400;
const INDEXEDDB_PROJECT_SYNC_REVISION_KEY = "serverProjectSyncRevision";
const INDEXEDDB_PROJECT_SYNC_PAGE_SIZE = 250;
const INDEXEDDB_LEADERBOARD_SYNC_REVISION_KEY = "serverLeaderboardSyncRevision";
const INDEXEDDB_LEADERBOARD_SYNC_PAGE_SIZE = 10;
const SERVICE_KEY_ISSUE_LABELS = {
  github: "Token 已过期",
  tavily: "Key 无效",
  exa: "Key 无效"
};

const SCAN_COPY_POOLS = {
  zh: {
    prepare: [
      { title: "先热身，别急着冲", body: "通行证、方案和缓存先过一遍，省得半路掉链子。" },
      { title: "牛马开工，先检查装备", body: "GitHub Token、观察方案和本地状态正在对齐。" },
      { title: "开跑前先看路", body: "先确认接口和扫描路线，再把项目拖回星仓。" }
    ],
    catalog: [
      { title: "通行证确认中", body: "先把门票验好，再进仓库里跑。" },
      { title: "接口目录点名中", body: "能走的通道先排好队，后面少绕路。" },
      { title: "检查补给站", body: "外部信号源能用就用，不能用也别硬等。" }
    ],
    github: [
      { title: "正在 GitHub 里翻线索", body: "项目多的时候会多跑几圈，腿还行。" },
      { title: "仓库草原有点大", body: "正在挑更像机会的项目，不是看到草就往回薅。" },
      { title: "核心项目检索中", body: "先看强相关，再把噪音挡在仓库门外。" },
      { title: "顺手看看 Trending", body: "热闹不等于有用，但热闹也值得瞄一眼。" }
    ],
    tavily: [
      { title: "顺路看看外部信号", body: "不是所有价值都写在 README 第一行。" },
      { title: "补一圈网页线索", body: "看看外面怎么讨论它，别只听仓库自己说。" },
      { title: "给项目找旁证", body: "有些机会藏在博客、文档和真实使用场景里。" }
    ],
    exa: [
      { title: "补一点语义判断", body: "同名项目太多，先把语境拎清楚。" },
      { title: "再查一层上下文", body: "名字像不代表真相关，还是要多看两眼。" },
      { title: "外部语义对齐中", body: "把项目和你的观察方向再校准一下。" }
    ],
    score: [
      { title: "拖回星仓，开始整理", body: "分类、风险、用途和排序正在归档。" },
      { title: "开始分拣战利品", body: "能学什么、给谁用、值不值得跟进，正在排队。" },
      { title: "最后一轮打分", body: "把候选池和每日精选捋顺，再交给你看。" }
    ],
    long: [
      { title: "这趟有点远，再给它几步", body: "接口和趋势缓存都在跑，慢一点但别乱来。" },
      { title: "项目太多，腿已经热起来了", body: "还在筛强相关结果，快到收尾段了。" },
      { title: "等久了，正在压线冲刺", body: "再忍一下，马上把能看的结果搬回星仓。" }
    ],
    completed: [{ title: "扫描完成", body: "项目池已经更新，新的线索进仓。" }],
    failed: [{ title: "扫描遇到阻碍", body: "先看提示处理配置或接口问题，再重新开跑。" }],
    running: [{ title: "扫描中", body: "正在刷新项目池，请稍等。" }]
  },
  en: {
    prepare: [
      { title: "Warming up the route", body: "Checking access, plan, and cache before the run." },
      { title: "Getting the gear in order", body: "GitHub token, active plan, and local state are lining up." },
      { title: "Mapping the run first", body: "A little prep now saves a messy detour later." }
    ],
    catalog: [
      { title: "Checking the pass", body: "Verifying the doors before sprinting into the vault." },
      { title: "Calling the source roster", body: "Available channels are lining up for the scan." },
      { title: "Checking the supply stops", body: "External signals join if they are ready." }
    ],
    github: [
      { title: "Combing through GitHub signals", body: "Large field today; still picking the useful tracks." },
      { title: "The repository field is wide", body: "Filtering for stronger matches, not just more matches." },
      { title: "Searching the core projects", body: "Strong relevance first, noise outside the vault." },
      { title: "Taking a Trending glance", body: "Heat is not value, but it is still a useful clue." }
    ],
    tavily: [
      { title: "Taking a quick context detour", body: "Not every useful clue lives in the README." },
      { title: "Checking outside mentions", body: "A project should make sense beyond its own description." },
      { title: "Looking for supporting signals", body: "Docs, posts, and use cases can reveal the real shape." }
    ],
    exa: [
      { title: "Adding semantic context", body: "Similar names are easy; useful meaning takes another look." },
      { title: "Checking one layer deeper", body: "Name match is not enough, so the context gets a vote." },
      { title: "Aligning external meaning", body: "Tuning the candidates back to this observation plan." }
    ],
    score: [
      { title: "Bringing findings back to the vault", body: "Sorting category, risk, use case, and priority." },
      { title: "Sorting the haul", body: "What it solves, who it helps, and whether to follow it." },
      { title: "Final scoring pass", body: "The candidate pool and daily picks are getting lined up." }
    ],
    long: [
      { title: "Long run today. A few more steps", body: "APIs and trend cache are moving; carefully, not wildly." },
      { title: "Big field, warm legs", body: "Still filtering for relevance and getting close to the finish." },
      { title: "Still moving, almost there", body: "Holding the line so the returned pool stays useful." }
    ],
    completed: [{ title: "Scan complete", body: "The project pool is refreshed and new clues are in the vault." }],
    failed: [{ title: "Scan hit a blocker", body: "Check the configuration or API hint, then try again." }],
    running: [{ title: "Scanning", body: "Refreshing the project pool. Please wait." }]
  }
};

function readServiceKeyIssue(kind) {
  try {
    return localStorage.getItem(SERVICE_KEY_ISSUE_STORAGE_KEYS[kind]) === "1";
  } catch {
    return false;
  }
}

function writeServiceKeyIssue(kind, value) {
  try {
    if (value) {
      localStorage.setItem(SERVICE_KEY_ISSUE_STORAGE_KEYS[kind], "1");
    } else {
      localStorage.removeItem(SERVICE_KEY_ISSUE_STORAGE_KEYS[kind]);
    }
  } catch {
    /* ignore storage failures */
  }
}

function readGuideSeen() {
  try {
    return localStorage.getItem(GUIDE_SEEN_STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

function writeGuideSeen(value = true) {
  try {
    if (value) {
      localStorage.setItem(GUIDE_SEEN_STORAGE_KEY, "1");
    } else {
      localStorage.removeItem(GUIDE_SEEN_STORAGE_KEY);
    }
  } catch {
    /* ignore storage failures */
  }
}

const state = {
  config: null,
  settings: null,
  discovery: null,
  summary: null,
  leaderboard: null,
  memory: null,
  observationPlans: {
    active: null,
    plans: []
  },
  indexedDbSnapshotMeta: null,
  indexedDbSnapshotSyncing: false,
  indexedDbSnapshotTimer: null,
  observationPlanDraft: null,
  observationPlanEditMode: "",
  observationPlanPreviewId: "",
  observationPlanGenerating: false,
  observationPlanSwitching: false,
  observationPlanInlineStatus: null,
  observationPlanInlineStatusTimer: null,
  observationPlanPendingConfirm: null,
  settingsSaveStatus: "",
  settingsSaveTimer: null,
  settingsInlineStatusTimer: null,
  githubTestInlineStatusTimer: null,
  githubTestRedirectTimer: null,
  observationPlanDraftNotice: "",
  leaderboardPeriod: "daily",
  leaderboardDate: "",
  leaderboardSelectedFullName: "",
  planTransition: {
    active: false,
    status: "",
    planId: "",
    planName: "",
    message: ""
  },
  secretVisibility: {
    github: false,
    tavily: false,
    exa: false,
    providers: {}
  },
  pendingSecretClears: {
    github: false,
    tavily: false,
    exa: false,
    providers: {}
  },
  githubUser: null,
  githubRepos: [],
  githubReposLoaded: false,
  githubActions: {},
  githubActionBusy: {},
  providerActionStatus: {},
  providerActionTimers: {},
  localActionBusy: {},
  copiedUrlFullName: "",
  copyUrlStatusTimer: null,
  keyIssues: {
    github: readServiceKeyIssue("github"),
    tavily: readServiceKeyIssue("tavily"),
    exa: readServiceKeyIssue("exa")
  },
  githubTokenIssue: readServiceKeyIssue("github"),
  learningBusy: "",
  learningPolicySaveStatus: "",
  learningPolicySaveTimer: null,
  learningContextCompactStatus: "",
  learningContextCompactTimer: null,
  pendingMemoryClearRange: "",
  memoryClearBusyRange: "",
  memoryClearCompleteStatus: "",
  memoryClearCompleteTimer: null,
  scanProgress: {
    status: "idle",
    stage: "idle",
    percent: 0
  },
  scanCopyStartedAt: 0,
  scanEtaDisplaySeconds: null,
  scanEtaUpdatedAt: 0,
  scanProgressTimer: null,
  durableTasksRestored: false,
  scanIdleTimer: null,
  projects: [],
  dismissedProjects: [],
  dismissedSamplesExpanded: false,
  editingDismissedFeedback: "",
  dismissedFeedbackInlineStatus: null,
  dismissedFeedbackInlineStatusTimer: null,
  openNoteSectionFullName: "",
  pendingNoteSaveConfirmation: null,
  pendingNoteDeleteConfirmation: null,
  noteDrafts: {},
  noteStatusPointerScroll: null,
  noteInlineStatus: null,
  noteInlineStatusTimer: null,
  projectPool: {
    items: [],
    total: 0,
    pageSize: 10,
    page: 1
  },
  defaultProjectPoolSnapshot: null,
  projectPoolPreviewSnapshot: null,
  projectRequestId: 0,
  projectSelectionRequestId: 0,
  projectDismissNotice: null,
  projectDismissNoticeSeq: 0,
  projectDismissNoticeTimer: null,
  pendingRestoredProjectFullName: "",
  pendingRestoredProjectSelectionInFlight: false,
  restoredSelectedFullName: "",
  summaryRequestId: 0,
  summaryRefreshTimer: 0,
  summaryRefreshInFlight: null,
  summaryRefreshQueued: false,
  selected: null,
  analysis: {},
  analysisDrafts: {},
  analysisInFlight: {},
  analysisCompleteFullName: "",
  analysisCompleteTimer: null,
  analysisInlineStatus: null,
  analysisInlineStatusTimer: null,
  learningInlineStatus: null,
  learningInlineStatusTimer: null,
  guideTourActive: false,
  guideTourIndex: 0,
  guideTourTarget: null,
  guideTourPositionTimer: null,
  view: "projects",
  language: "zh",
  filters: { ...DEFAULT_FILTERS }
};

const elements = {
  githubState: document.querySelector("#github-state"),
  tavilyState: document.querySelector("#tavily-state"),
  exaState: document.querySelector("#exa-state"),
  modelState: document.querySelector("#model-state"),
  metricTotal: document.querySelector("#metric-total"),
  metricWatch: document.querySelector("#metric-watch"),
  metricScan: document.querySelector("#metric-scan"),
  projectCount: document.querySelector("#project-count"),
  projectRows: document.querySelector("#project-rows"),
  detailPanel: document.querySelector("#detail-panel"),
  briefList: document.querySelector("#brief-list"),
  licenseBars: document.querySelector("#license-bars"),
  categoryBars: document.querySelector("#category-bars"),
  languageBars: document.querySelector("#language-bars"),
  topicCloud: document.querySelector("#topic-cloud"),
  leaderboardTabs: document.querySelector("#leaderboard-tabs"),
  leaderboardArchive: document.querySelector("#leaderboard-archive"),
  leaderboardMeta: document.querySelector("#leaderboard-meta"),
  leaderboardList: document.querySelector("#leaderboard-list"),
  leaderboardLogic: document.querySelector("#leaderboard-logic"),
  memoryPanel: document.querySelector("#memory-panel"),
  learningLoop: document.querySelector("#learning-loop"),
  learningEvolution: document.querySelector("#learning-evolution"),
  learningScorecards: document.querySelector("#learning-scorecards"),
  learningHarness: document.querySelector("#learning-harness"),
  learningPositive: document.querySelector("#learning-positive"),
  learningNegative: document.querySelector("#learning-negative"),
  learningDismissed: document.querySelector("#learning-dismissed"),
  learningPolicy: document.querySelector("#learning-policy"),
  learningContext: document.querySelector("#learning-context"),
  learningEvents: document.querySelector("#learning-events"),
  scanStatus: document.querySelector("#scan-status"),
  scanButton: document.querySelector("#scan-button"),
  guideTourButton: document.querySelector("#guide-tour-button"),
  guideTour: document.querySelector("#guide-tour"),
  guideTourMasks: Array.from(document.querySelectorAll("[data-guide-tour-mask]")),
  guideTourSpotlight: document.querySelector("#guide-tour-spotlight"),
  guideTourCard: document.querySelector("#guide-tour-card"),
  guideTourKicker: document.querySelector("#guide-tour-kicker"),
  guideTourTitle: document.querySelector("#guide-tour-title"),
  guideTourBody: document.querySelector("#guide-tour-body"),
  guideTourDots: document.querySelector("#guide-tour-dots"),
  guideTourPrev: document.querySelector("#guide-tour-prev"),
  guideTourSkip: document.querySelector("#guide-tour-skip"),
  guideTourNext: document.querySelector("#guide-tour-next"),
  exportMenu: document.querySelector("#export-menu"),
  searchInput: document.querySelector("#search-input"),
  presetChips: document.querySelector("#preset-chips"),
  clearAllFilters: document.querySelector("#clear-all-filters"),
  problemChips: document.querySelector("#problem-chips"),
  problemFilterCount: document.querySelector("#problem-filter-count"),
  audienceChips: document.querySelector("#audience-chips"),
  audienceFilterCount: document.querySelector("#audience-filter-count"),
  shapeChips: document.querySelector("#shape-chips"),
  shapeFilterCount: document.querySelector("#shape-filter-count"),
  languageChips: document.querySelector("#language-chips"),
  licenseChips: document.querySelector("#license-chips"),
  triageChips: document.querySelector("#triage-chips"),
  aiAnalysisChips: document.querySelector("#ai-analysis-chips"),
  sortChips: document.querySelector("#sort-chips"),
  watchFilter: document.querySelector("#watch-filter"),
  githubToken: document.querySelector("#github-token"),
  githubTokenIssue: document.querySelector("#github-token-issue"),
  clearGithubToken: document.querySelector("#clear-github-token"),
  githubKeyState: document.querySelector("#github-key-state"),
  tavilyKey: document.querySelector("#tavily-key"),
  tavilyKeyIssue: document.querySelector("#tavily-key-issue"),
  clearTavilyKey: document.querySelector("#clear-tavily-key"),
  tavilyKeyState: document.querySelector("#tavily-key-state"),
  exaKey: document.querySelector("#exa-key"),
  exaKeyIssue: document.querySelector("#exa-key-issue"),
  clearExaKey: document.querySelector("#clear-exa-key"),
  exaKeyState: document.querySelector("#exa-key-state"),
  providerList: document.querySelector("#provider-list"),
  saveSettingsButton: document.querySelector("#save-settings-button"),
  saveSettingsStatusShell: document.querySelector("#settings-save-status-shell"),
  saveSettingsStatus: document.querySelector("#settings-save-status"),
  githubAccount: document.querySelector("#github-account"),
  githubRepos: document.querySelector("#github-repos"),
  githubTestStatusShell: document.querySelector("#github-test-status-shell"),
  githubTestStatus: document.querySelector("#github-test-status"),
  testGithubButton: document.querySelector("#test-github-button"),
  refreshGithubReposButton: document.querySelector("#refresh-github-repos-button"),
  observationPlanSelect: document.querySelector("#observation-plan-select"),
  observationPlanPicker: document.querySelector("#observation-plan-picker"),
  observationPlanName: document.querySelector("#observation-plan-name"),
  observationPlanIdea: document.querySelector("#observation-plan-idea"),
  observationPlanRequirements: document.querySelector("#observation-plan-requirements"),
  observationPlanToolbar: document.querySelector("#observation-plan-toolbar"),
  observationPlanView: document.querySelector("#observation-plan-view"),
  observationPlanLogic: document.querySelector("#observation-plan-logic"),
  switchObservationPlanButton: document.querySelector("#switch-observation-plan-button"),
  observationPlanStatus: document.querySelector("#observation-plan-status")
};

const ANTI_BUBBLE_KEYS = ["explorationRatio", "diversityFloor", "noveltyRatio"];

function t(key) {
  return I18N[state.language]?.[key] || I18N.en[key] || key;
}

function localized(item) {
  if (item?.[1] && I18N.zh[item[1]]) return t(item[1]);
  return state.language === "zh" ? item[1] : item[2];
}

function chipLabelMarkup(label = "") {
  return escapeHtml(label).replace(/\//g, "/<wbr>");
}

const CHIP_LABEL_LINES = {
  zh: new Map([
    ["项目风险排查", ["项目风险排查"]],
    ["可落地优先", ["可落地优先"]],
    ["需履约许可", ["需履约许可"]],
    ["分发需开源", ["分发需开源"]],
    ["无许可勿复制", ["无许可勿复制"]],
    ["综合推荐", ["综合推荐"]],
    ["增长爆发", ["增长爆发"]],
    ["许可清晰", ["许可清晰"]],
    ["应用价值", ["应用价值"]],
    ["工程质量", ["工程质量"]],
    ["人气最高", ["人气最高"]],
    ["趋势 Star", ["趋势 Star"]],
    ["趋势 Forks", ["趋势 Forks"]],
    ["最近活跃", ["最近活跃"]],
    ["网络服务高风险", ["网络服务", "高风险"]],
    ["MIT/Apache/BSD", ["MIT/Apache", "BSD"]],
    ["知识库检索与 RAG 问答", ["知识库检索", "RAG 问答"]],
    ["设计稿转代码与界面编辑", ["设计稿转代码", "界面编辑"]],
    ["代码与资料结构理解", ["代码与资料", "结构理解"]],
    ["学习资料与实践样例", ["学习资料", "实践样例"]],
    ["命令行与本地开发工具", ["命令行", "本地开发工具"]],
    ["部署运维与平台能力", ["部署运维", "平台能力"]],
    ["安全检查与合规治理", ["安全检查", "合规治理"]],
    ["视频剪辑与短内容制作", ["视频剪辑", "短内容制作"]],
    ["多助手任务调度与执行", ["多助手任务", "调度执行"]],
    ["AI编程与命令行协作", ["AI 编程", "命令行协作"]],
    ["数据看板与业务管理", ["数据看板", "业务管理"]],
    ["工具接入与MCP扩展", ["工具接入", "MCP 扩展"]],
    ["内容创作工具", ["内容创作", "工具"]],
    ["桌面/移动应用", ["桌面应用", "移动应用"]],
    ["音频与音乐", ["音频", "音乐"]],
    ["系统与边缘", ["系统", "边缘"]],
    ["开发者与知识工作者", ["开发者", "知识工作者"]],
    ["研究者与知识管理者", ["研究者", "知识管理者"]],
    ["设计师与前端开发者", ["设计师", "前端开发者"]],
    ["业务与运营团队", ["业务", "运营团队"]],
    ["自动化与 AI 应用团队", ["自动化", "AI 应用团队"]],
    ["工具集成开发者", ["工具集成", "开发者"]],
    ["研究者与知识工作者", ["研究者", "知识工作者"]],
    ["设计与内容团队", ["设计", "内容团队"]],
    ["平台与运维团队", ["平台", "运维团队"]],
    ["安全与合规团队", ["安全", "合规团队"]],
    ["API与后端开发者", ["API", "后端开发者"]],
    ["框架/库", ["框架", "库"]],
    ["学习/案例库", ["学习", "案例库"]]
  ]),
  en: new Map([
    ["Project risk review", ["Project risk", "review"]],
    ["SaaS source-release risk", ["SaaS source-release", "risk"]],
    ["Source release on distribution", ["Source release", "on distribution"]],
    ["License with obligations", ["License", "with obligations"]],
    ["No license: monitor only", ["No license:", "monitor only"]],
    ["Recently active", ["Recently", "active"]]
  ])
};

const CHIP_LABEL_BREAK_AFTER = /与|和|及|或|、|转|为|给|对|按|类|：|:/g;
const CHIP_LABEL_SPLIT_AROUND = /[与和及或、]/;

function normalizedChipLabel(label = "") {
  return String(label || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[|｜]+/g, "")
    .replace(/／/g, "/");
}

function filterChipLabelLines(label = "") {
  const text = String(label || "").trim();
  if (!text) return [""];
  const labelMap = CHIP_LABEL_LINES[state.language];
  const normalized = normalizedChipLabel(text);
  const mapped =
    labelMap?.get(text) ||
    Array.from(labelMap?.entries() || []).find(([key]) => normalizedChipLabel(key) === normalized)?.[1];
  if (mapped) return mapped;
  if (/^[A-Za-z0-9][A-Za-z0-9\s&:/+.-]*$/.test(text)) {
    return text.split(/\s+/).length > 2 ? [text] : [text];
  }
  if (!/[一-龥]/.test(text)) return [text];
  if (CHIP_LABEL_SPLIT_AROUND.test(text)) {
    const parts = text
      .split(CHIP_LABEL_SPLIT_AROUND)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length === 2) return parts;
  }
  return text
    .replace(CHIP_LABEL_BREAK_AFTER, (match) => `${match}|`)
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

function filterChipLabelMarkup(label = "") {
  return filterChipLabelLines(label)
    .map((part) => {
      const escaped = escapeHtml(part);
      const text = part === "MIT/Apache/BSD" ? escaped : escaped.replace(/\//g, "/<wbr>");
      return `<span class="chip-label-line">${text}</span>`;
    })
    .join("");
}

function categoryLabel(category) {
  if (!category) return state.language === "zh" ? "其他" : "Other";
  if (state.language === "zh") return positiveLabelZh(CATEGORY_ZH[category.key] || CATEGORY_EN_TO_ZH[category.label] || category.label || "其他");
  return CATEGORY_EN[category.key] || category.label || "Other";
}

function translateCompoundTerm(value) {
  const raw = String(value || "");
  const lower = raw.toLowerCase();
  if (TERM_ZH[lower]) return TERM_ZH[lower];
  const parts = lower.split(/[-_\s./]+/).filter(Boolean);
  if (parts.length <= 1) return raw;
  const translated = parts.map((part) => TERM_ZH[part] || "").filter(Boolean);
  return translated.length ? translated.join("") : raw;
}

function polishChineseText(value) {
  return String(value || "")
    .replace(/\bAI工程/g, "AI 工程")
    .replace(/\bAI智能体/g, "AI 智能体")
    .replace(/\bAI编程/g, "AI 编程")
    .replace(/\bAI Agent开发/g, "AI Agent 开发")
    .replace(/\bLLM驱动/g, "LLM 驱动")
    .replace(/\bLLM决策/g, "LLM 决策")
    .replace(/\b高级RAG/g, "高级 RAG")
    .replace(/\bPDF 生成的开源项目基于/g, "PDF 文档处理工具，基于")
    .replace(/\bClaude代码/g, "Claude Code")
    .replace(/\bAPI接口/g, "API 接口")
    .replace(/\bSaaS业务/g, "SaaS 业务")
    .replace(/\bPython 开源/g, "Python 开源")
    .replace(/\bJavaScript 开源/g, "JavaScript 开源")
    .replace(/\bTypeScript 开源/g, "TypeScript 开源")
    .replaceAll("\u4ea7\u54c1\u58f3", "应用雏形")
    .replaceAll("\u6210\u54c1\u65b9\u5411", "应用路径");
}

function sentenceCase(value) {
  const text = String(value || "").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

function cleanRepoDescription(description = "") {
  return String(description || "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s:：\-–—|]+/, "")
    .replace(/[。.!！]+$/, "")
    .trim();
}

function normalizeEnglishDescription(description = "") {
  return cleanRepoDescription(description)
    .replace(/^an?\s+open[-\s]?source\s+/i, "")
    .replace(/^open[-\s]?source\s+/i, "")
    .replace(/^a\s+/i, "")
    .trim();
}

function uniqueZh(items) {
  return [...new Set(items.filter(Boolean))];
}

function englishFeaturePhrasesZh(text) {
  const features = [
    [/smart chat|chat\b|conversational/i, "智能聊天"],
    [/autonomous agents?|ai agents?|agentic/i, "AI Agent"],
    [/\bassistants?\b/i, "助手"],
    [/frontier llms?|llm apis?|openai|anthropic|gemini|qwen|deepseek/i, "大模型接入"],
    [/dashboard|console|admin panel/i, "仪表盘"],
    [/web ui|ui\b|interface/i, "可视化界面"],
    [/pdf generation|pdf/i, "PDF 生成"],
    [/batch processing|batch/i, "批处理"],
    [/workflow|automation|orchestrat/i, "自动化工作流"],
    [/rag|knowledge base|semantic search|vector search/i, "知识检索"],
    [/knowledge graph|graph/i, "知识图谱"],
    [/api gateway|proxy server|gateway|proxy/i, "API 网关"],
    [/\bsdk\b|library/i, "SDK/库"],
    [/cost tracking|cost/i, "成本追踪"],
    [/guardrails?|safety/i, "安全护栏"],
    [/training|fine[-\s]?tuning|open models?/i, "模型训练与运行"],
    [/automatic https|https|http\/1|http\/2|http\/3|web server/i, "Web 服务"],
    [/desktop|macos|windows|linux/i, "桌面端"],
    [/mobile|android|ios|flutter/i, "移动端"],
    [/video|subtitle|caption|timeline|shorts/i, "视频内容"],
    [/audio|music|voice|tts|podcast/i, "音频内容"],
    [/design|prototype|figma|wireframe|brand/i, "设计原型"],
    [/slides?|presentation|powerpoint|pptx/i, "演示文稿"],
    [/download|file transfer|send things/i, "文件传输"],
    [/monitoring|observability|incident|alert/i, "监控运维"],
    [/security|vulnerabil|privacy|compliance|audit/i, "安全合规"],
    [/analytics|analysis|etl|pipeline|database/i, "数据分析"],
    [/notes?|calendar|task|productivity/i, "个人效率"],
    [/ecommerce|commerce|marketing|growth|cms|content/i, "内容与增长"],
    [/job search|resume|career/i, "求职流程"],
    [/travel|trip|map|budget/i, "旅行规划"]
  ];
  return uniqueZh(features.filter(([pattern]) => pattern.test(text)).map(([, phrase]) => phrase)).slice(0, 4);
}

function translateEnglishDescriptionFallbackZh(description = "") {
  const text = normalizeEnglishDescription(description);
  if (!text) return "";
  const lower = text.toLowerCase();
  const features = englishFeaturePhrasesZh(text);
  const featureText = features.length ? `，覆盖${features.join("、")}` : "";

  const summaryRules = [
    [/agent that grows with you/i, "会随使用逐步成长的 AI Agent。"],
    [/ai productivity studio|productivity studio/i, `AI 效率工作室${featureText || "，用于统一管理聊天、助手和模型能力"}。`],
    [/job search system/i, `AI 求职系统${featureText || "，用于求职流程、材料生成和批处理"}。`],
    [/code editor/i, "现代开源代码编辑器，帮助开发者更高效地编写和管理代码。"],
    [/web server|http\/1|http\/2|http\/3|automatic https/i, `跨平台 Web 服务器${featureText || "，支持 HTTP 服务、自动 HTTPS 和扩展能力"}。`],
    [/sdk|proxy server|gateway|llm apis?/i, `大模型 API 接入工具${featureText || "，用于统一调用、代理和治理多模型接口"}。`],
    [/desktop app/i, `桌面应用${featureText || "，用于本地工作流和资料管理"}。`],
    [/mobile.*app|mobile.*utility|android|ios|flutter/i, `移动端工具${featureText || "，用于移动设备上的内容或效率管理"}。`],
    [/web ui/i, `Web 可视化界面${featureText || "，用于更直观地操作和管理开源模型或工具"}。`],
    [/platform/i, `开源平台${featureText || "，用于组织、管理和交付一组相关能力"}。`],
    [/framework/i, `开源框架${featureText || "，用于搭建可复用的工程能力"}。`],
    [/library/i, `开源库${featureText || "，用于在项目中集成特定能力"}。`],
    [/toolkit|tool kit|suite/i, `工具套件${featureText || "，提供多项可组合能力"}。`],
    [/\btool\b|tools\b/i, `开源工具${featureText || "，用于解决具体工作流中的效率问题"}。`],
    [/\bapp\b|application/i, `开源应用${featureText || "，提供面向用户的具体功能"}。`],
    [/agent/i, `AI Agent 项目${featureText || "，用于执行任务、连接工具或管理上下文"}。`],
    [/assistant|copilot/i, `AI 助手项目${featureText || "，用于辅助完成具体任务"}。`],
    [/server/i, `服务端项目${featureText || "，用于提供后端服务和接口能力"}。`]
  ];

  const matched = summaryRules.find(([pattern]) => pattern.test(text));
  if (matched) return matched[1];
  if (features.length) return `用于${features.join("、")}的开源项目。`;

  return "用于探索具体工作流的开源项目。";
}

function shouldTranslateMixedEnglishRun(run = "") {
  const words = String(run).match(/[A-Za-z][A-Za-z0-9+#.]*/g) || [];
  if (words.length < 6) return false;
  if (/(\+|&|\/)/.test(run) && words.length < 10) return false;
  return /\b(is|are|for|with|from|into|that|which|supports?|powered|building|built|generate|creates?|turns?|manage|integrates?|platform|workspace|production)\b/i.test(run);
}

function localizeMixedDescriptionZh(description = "") {
  let text = cleanRepoDescription(description);
  if (!text || !/[\u4e00-\u9fa5]/.test(text)) return text;

  const englishRuns = text.match(/[A-Za-z][A-Za-z0-9+/#.,:;'"()&\-\s]{22,}/g) || [];
  for (const run of englishRuns) {
    const raw = run.trim();
    if (!raw || !shouldTranslateMixedEnglishRun(raw)) continue;
    const translated = translateEnglishDescriptionFallbackZh(raw).replace(/[。.!！]+$/, "");
    if (!translated || !/[\u4e00-\u9fa5]/.test(translated)) continue;
    text = text.replace(run, `。${translated}。`);
  }

  return text
    .replace(/\s+/g, " ")
    .replace(/[|｜]+/g, "；")
    .replace(/[–—-]{2,}/g, "。")
    .replace(/\s+[–—-]\s+/g, "。")
    .replace(/。+/g, "。")
    .replace(/；+/g, "；")
    .replace(/。；/g, "。")
    .replace(/；。/g, "。")
    .replace(/\s+([，。；：、])/g, "$1")
    .replace(/([，；：、])\s+/g, "$1")
    .replace(/([。；])([^。；，、\s])/g, "$1$2")
    .replace(/^[\s。；，、:：|｜/–—-]+/, "")
    .trim();
}

const DESCRIPTION_TRANSLATION_RULES_ZH = [
  { pattern: /learn it\. build it\. ship it for others/i, summary: "围绕 AI 工程从零学习、动手构建并交付给他人的实践路线。" },
  { pattern: /agent harness performance optimization system/i, summary: "面向 Claude Code、Codex、OpenCode、Cursor 等 AI 编程工具的 Agent Harness 性能优化系统，覆盖技能、直觉、记忆、安全和研究优先工作流。" },
  { pattern: /graphs that teach|turn any code into an interactive knowledge graph/i, summary: "把代码转换成可探索、可搜索、可提问的交互式知识图谱，重点帮助理解项目结构和知识关系。" },
  { pattern: /turn any folder of code|sql schemas?|r scripts?|queryable knowledge graph/i, summary: "把代码目录、数据库结构、脚本、文档、论文、图片或视频转成可查询知识图谱，把应用代码、数据库和基础设施放进同一张图里。" },
  { pattern: /lean cortex|cognitive context layer/i, summary: "为智能体系统提供认知上下文层，包含多种 MCP 工具、读取模式和 shell 模式，用于减少上下文消耗。" },
  { pattern: /leading agent orchestration platform|multi-agent swarms|autonomous workflows/i, summary: "面向 Claude 的智能体编排平台，可部署多智能体群组、协调自动化工作流，并构建对话式 AI 系统。" },
  { pattern: /see where your ai coding tokens go|Interactive TUI dashboard for Claude Code, Codex, and Cursor cost/i, summary: "用交互式 TUI 看清 Claude Code、Codex、Cursor 等 AI 编程工具的 token 消耗和成本分布。" },
  { pattern: /agentic HTML editor|your local AI agent writes the HTML/i, summary: "本地 AI HTML 编辑器，可让 Agent 编写 HTML 并输出杂志页、演示稿、海报、小红书/推文、原型、数据报告等内容。" },
  { pattern: /lightweight, open-source AI agent for your tools, chats, and workflows/i, summary: "轻量开源 AI Agent，可连接工具、聊天和工作流，适合做个人或团队自动化入口。" },
  { pattern: /vibe-trading|personal trading agent/i, summary: "个人交易 Agent，用大模型辅助交易分析、决策流程或交易工作台探索。" },
  { pattern: /AI Coding agent for the terminal|hash-anchored edits/i, summary: "运行在终端里的 AI 编程 Agent，支持锚定编辑、工具 Harness、LSP、Python、浏览器和子 Agent。" },
  { pattern: /cross-CLI skill for Obsidian|living AI-first second brain/i, summary: "面向 Obsidian 的跨 CLI 技能，把笔记库变成 AI 优先的第二大脑，支持研究、定时 Agent 和写作校验。" },
  { pattern: /persistent context across sessions|captures everything your agent does/i, summary: "为各类 AI Agent 保存跨会话上下文，压缩历史操作，并在未来会话中注入相关记忆。" },
  { pattern: /installable GitHub library of .*agentic skills/i, summary: "可安装的 GitHub Agent 技能库，提供安装器、技能包、工作流以及官方/社区技能集合。" },
  { pattern: /multi-harness agentic plugin marketplace/i, summary: "面向 Claude Code、Codex CLI、Cursor、OpenCode、Gemini CLI 等工具的多 Harness Agent 插件市场。" },
  { pattern: /claude code skills|agent skills|custom commands|customizable references/i, summary: "Claude Code 及多种编码 Agent 的技能、Agent、命令和参考资料集合，覆盖工程、营销、产品、合规、研究和商业运营。" },
  { pattern: /self-hosted AI agent orchestration platform|mission control dashboard/i, summary: "自托管 AI Agent 编排平台，可分派任务、运行多 Agent 工作流、监控成本并治理运行过程。" },
  { pattern: /DeepSeek-native AI coding agent/i, summary: "面向 DeepSeek 的终端 AI 编程 Agent，围绕前缀缓存稳定性设计，适合长时间运行。" },
  { pattern: /Claude Design alternative|brand-grade Design Systems|Generate web .*desktop .*mobile prototypes/i, summary: "本地优先的开源 Claude Design 替代工具，可生成网页、桌面、移动原型、幻灯片、图片和视频，并支持沙盒预览与多格式导出。" },
  { pattern: /AI-powered job search system|skill modes|Go dashboard|PDF generation/i, summary: "基于 Claude Code 的 AI 求职系统，包含多种技能模式、Go 仪表盘、PDF 生成和批处理能力。" },
  { pattern: /24\/7 Cowork app|customize your assistants/i, summary: "本地开源的 24/7 AI 协作桌面应用，可接入 OpenClaw、Hermes Agent、Claude Code、Codex、OpenCode、Gemini CLI 等助手并自定义配置。" },
  { pattern: /make any website into CLI|logged-in browser/i, summary: "把任意网站包装成命令行工具，并让 AI Agent 使用已登录浏览器完成操作。" },
  { pattern: /self-healing harness that enables LLMs/i, summary: "自修复浏览器 Harness，让大模型在网页中执行任务并从失败中恢复。" },
  { pattern: /self-evolving agent|grows skill tree/i, summary: "自进化 Agent，可从种子能力扩展技能树，并以更少上下文消耗获得系统控制能力。" },
  { pattern: /agent engineering platform/i, summary: "面向 Agent 工程的平台，用于构建、管理或交付智能体能力。" },
  { pattern: /all-in-one AI productivity accelerator|privacy first/i, summary: "一体化 AI 效率工具，强调本地设备和隐私优先，减少复杂配置。" },
  { pattern: /framework for managing your zsh configuration|optional plugins .*themes/i, summary: "社区驱动的 Zsh 配置管理框架，内置大量插件、主题和自动更新机制，用来快速搭建和维护终端环境。" },
  { pattern: /universal memory layer for AI Agents/i, summary: "面向 AI Agent 的通用记忆层，用于保存长期记忆、用户偏好和个性化上下文。" },
  { pattern: /AI generates natively editable PPTX/i, summary: "把任意文档生成可原生编辑的 PPTX，输出真实 PowerPoint 形状和动画，而不是图片。" },
  { pattern: /collection of DESIGN\.md files|brand design systems/i, summary: "收集热门品牌设计系统的 DESIGN.md，让编码 Agent 按指定品牌风格生成匹配 UI。" },
  { pattern: /write HTML\. render video/i, summary: "用 HTML 编写并渲染视频，面向 Agent 自动生成视频内容。" },
  { pattern: /open-source AI voice studio|clone, dictate, create/i, summary: "开源 AI 语音工作室，支持语音克隆、听写和创作。" },
  { pattern: /high-throughput and memory-efficient inference/i, summary: "面向大模型的高吞吐、低内存推理与服务引擎。" },
  { pattern: /virtual whiteboard for sketching/i, summary: "用于绘制手绘风格图表的虚拟白板。" },
  { pattern: /natural language commands and AI-assisted visualization/i, summary: "Next.js 图表应用，可用自然语言和 AI 辅助创建、修改和增强 draw.io 图表。" },
  { pattern: /format specification for describing a visual identity/i, summary: "用结构化格式描述视觉识别和设计系统，帮助编码 Agent 持续理解品牌风格。" },
  { pattern: /Generate production-quality SVG\+PNG technical diagrams/i, summary: "用自然语言生成生产级 SVG/PNG 技术图，支持多种风格、UML 和 AI/Agent 工作流图。" },
  { pattern: /create stunning demos|alternative to Screen Studio/i, summary: "开源产品演示制作工具，无订阅、无水印，并允许免费商用，可作为 Screen Studio 替代品。" },
  { pattern: /web UI for training and running open models|Unsloth Studio/i, summary: "用于本地训练和运行 Gemma、Qwen、DeepSeek、gpt-oss 等开源模型的 Web UI。" },
  { pattern: /composable payments platform|payment, payout, fraud, vault/i, summary: "可组合的开源支付平台，支持自托管/SaaS、支付连接、风控、金库、智能路由、成本观测和对账。" },
  { pattern: /self-hosted travel\/trip planner/i, summary: "自托管旅行规划应用，支持实时协作、交互地图、PWA、SSO、预算、装箱清单等功能。" },
  { pattern: /download manager/i, summary: "功能完整的下载管理器，面向文件下载、任务管理和桌面工具场景。" },
  { pattern: /desktop app for downloading, organizing and studying media/i, summary: "跨平台媒体学习桌面应用，可下载、整理和学习媒体，支持 PDF/EPUB 阅读、时间戳笔记、间隔复习和插件扩展。" },
  { pattern: /menu bar app.*USB-C cable/i, summary: "macOS 菜单栏工具，用直白语言说明每根 USB-C 线实际支持的能力。" },
  { pattern: /mobile music utility|audio management/i, summary: "移动端音乐工具，用 Flutter 和 Go 管理个人音乐库，强调高质量音频、开源、无广告和无订阅。" }
];

function translateDescriptionZh(description = "") {
  const cleaned = normalizeEnglishDescription(description);
  if (!cleaned) return "";
  if (/[\u4e00-\u9fa5]/.test(cleaned)) return polishChineseText(localizeMixedDescriptionZh(cleaned));
  const lower = cleaned.toLowerCase();
  const specific = DESCRIPTION_TRANSLATION_RULES_ZH.find((item) => item.pattern.test(cleaned));
  if (specific) return specific.summary;
  if (/browser.*(agent|automation|use|harness)/i.test(cleaned)) {
    return "让 AI 或脚本操作浏览器，完成网页点击、填写、抓取和任务执行";
  }
  if (/memory.*ai|ai memory|long[-\s]?term memory|personalized ai/i.test(cleaned)) {
    return "为 AI 应用提供长期记忆、用户偏好和个性化上下文";
  }
  if (/video|video[-\s_]?editor|subtitle|caption|timeline|shorts/.test(lower)) {
    return "用于视频剪辑、字幕处理、时间线编辑或短视频内容生产";
  }
  if (/audio|music|voice|tts|podcast/.test(lower)) {
    return "用于音频、音乐、语音合成、配音或播客内容制作";
  }
  if (/design|figma|prototype|ui generator|design system/i.test(cleaned)) {
    return "用于界面原型、设计系统素材或多端页面生成";
  }
  if (/motion|illustration|brand|typography|framer|webflow|wireframe/.test(lower)) {
    return "用于视觉设计、动效表达、品牌资产或页面原型制作";
  }
  if (/rag|knowledge base|semantic search|vector search/i.test(cleaned)) {
    return "用于资料索引、语义检索、知识库问答或 RAG 应用";
  }
  if (/dashboard|admin|crm|erp|saas/i.test(cleaned)) {
    return "用于搭建后台、仪表盘、SaaS 模板或业务管理系统";
  }
  if (/cli|terminal|developer tool|code review|coding|ide/i.test(cleaned)) {
    return "用于提升编码、命令行、代码审查或工程协作效率";
  }
  if (/security|scanner|vulnerabil|privacy|compliance|audit/i.test(cleaned)) {
    return "用于安全检测、隐私检查、漏洞扫描或合规审计";
  }
  if (/workflow|automation|orchestrat|agentic|multi[-\s]?agent/i.test(cleaned)) {
    return "用于把多步骤任务、工具调用和结果汇总串成自动流程";
  }
  if (/kubernetes|cloud|observability|deploy|runtime|edge/i.test(cleaned)) {
    return "用于云原生部署、平台工程、可观测性或运行时能力建设";
  }
  if (/finance|trading|stock|portfolio|invoice|accounting/i.test(cleaned)) {
    return "用于金融数据、交易分析、投资组合或财务流程处理";
  }
  if (/tutorial|course|awesome|learn|examples|guide/i.test(cleaned)) {
    return "整理教程、示例、实践路径或可复现的学习资料";
  }
  return polishChineseText(translateEnglishDescriptionFallbackZh(cleaned));
}

function projectLicenseBoundary(project) {
  const bucket = project.licensePolicy?.bucket || "unknown-no-license";
  if (state.language !== "zh") {
    if (project.licensePolicy?.practiceBoundary) return project.licensePolicy.practiceBoundary;
    if (bucket === "permissive-commercial") return "allows use, modification, and distribution; keep notices and license text";
    if (bucket === "unknown-no-license") return "monitor and study only until license review";
    if (bucket === "network-copyleft" || bucket === "restricted-noncommercial") return "avoid deeper adoption before legal review";
    return "review obligations before deeper adoption";
  }
  if (project.licensePolicy?.practiceBoundaryZh) return project.licensePolicy.practiceBoundaryZh;
  if (bucket === "permissive-commercial") return "通常允许使用、修改和分发，需保留版权声明和许可文本";
  if (bucket === "unknown-no-license") return "仅适合监控和学习方向";
  if (bucket === "network-copyleft" || bucket === "restricted-noncommercial") return "未复核前不要深入采用";
  if (bucket === "distribution-copyleft") return "分发前先确认开源义务";
  return "先人工复核许可义务";
}

function inferProjectNameZh(project) {
  const haystack = `${project.name || ""} ${project.description || ""} ${(project.topics || []).join(" ")} ${(project.category?.matchedKeywords || []).join(" ")}`;
  const rule = PROJECT_NAME_RULES_ZH.find((item) => item.pattern.test(haystack));
  return rule?.name || "";
}

const GENERIC_ENGLISH_PROJECT_NAME = /^(awesome(-list)?|tool(s)?|app|project|starter|template|boilerplate|repository|repo|demo|example(s)?|code|script(s)?|studio|kit|suite|platform)$/i;

function originalProjectName(project) {
  const fullName = String(project?.fullName || "").trim();
  const slug = fullName.includes("/") ? fullName.split("/").pop() : fullName;
  return String(project?.name || slug || fullName || "").trim();
}

function translatedSlugName(rawName) {
  const tokens = String(rawName || "")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .split(/[-_\s.]+/)
    .filter(Boolean)
    .slice(0, 5);
  if (!tokens.length) return "";

  const translated = [];
  let translatedCount = 0;
  for (const token of tokens) {
    const lower = token.toLowerCase();
    const term = TERM_ZH[lower];
    if (!term || term === token) {
      if (/^[a-z0-9]+$/i.test(token)) return "";
      translated.push(token);
      continue;
    }
    translated.push(term);
    translatedCount += 1;
  }

  if (translatedCount < 2) return "";
  return polishChineseText(translated.join(""));
}

function displayProjectName(project) {
  return originalProjectName(project);
}

function descriptiveProjectNameZh(project) {
  const haystack = `${project.name || ""} ${project.description || ""} ${(project.topics || []).join(" ")} ${(project.category?.matchedKeywords || []).join(" ")}`;
  const specific = PROJECT_NAME_DESCRIPTOR_RULES_ZH.find((item) => item.pattern.test(haystack));
  if (specific) return specific.name;
  const inferred = inferProjectNameZh(project);
  return inferred && !GENERIC_PROJECT_NAMES_ZH.has(inferred) ? inferred : "";
}

function projectNameZh(project) {
  if (state.language !== "zh") return "";
  const rawName = originalProjectName(project);
  if (!rawName || /[\u4e00-\u9fa5]/.test(rawName)) return "";
  const translated = translatedSlugName(rawName);
  if (translated && translated !== rawName && !GENERIC_PROJECT_NAMES_ZH.has(translated)) return translated;
  return descriptiveProjectNameZh(project);
}

function projectTitleMarkup(project) {
  return `
    <span class="repo-name-line">
      <strong>${escapeHtml(displayProjectName(project))}</strong>
    </span>
  `;
}

function topicSummaryZh(project) {
  const terms = [];
  for (const topic of [...(project.category?.matchedKeywords || []), ...(project.topics || [])]) {
    const translated = polishChineseText(translateCompoundTerm(topic));
    if (translated && !terms.includes(translated)) terms.push(translated);
    if (terms.length >= 3) break;
  }
  return terms.length ? terms.join("、") : categoryLabel(project.category);
}

function coreCapabilities(project) {
  const haystack = `${project.name || ""} ${project.description || ""} ${(project.topics || []).join(" ")} ${(project.category?.matchedKeywords || []).join(" ")}`;
  const matched = CAPABILITY_PHRASE_RULES_ZH.find((item) => item.pattern.test(haystack));
  if (matched) return matched.phrases.join("、");
  return topicSummaryZh(project);
}

function projectPurpose(project) {
  const haystack = `${project.name || ""} ${project.description || ""} ${(project.topics || []).join(" ")} ${(project.category?.matchedKeywords || []).join(" ")}`;
  const category = CATEGORY_BRIEF_ZH[project.category?.key || "other"] || CATEGORY_BRIEF_ZH.other;
  return PURPOSE_RULES_ZH.find((item) => item.pattern.test(haystack)) || category;
}

function projectDirectionLabel(project) {
  if (state.language !== "zh") {
    return project.useCase?.labelEn || project.useCase?.label || categoryLabel(project.category);
  }
  return positiveLabelZh(project.useCase?.labelZh || projectPurpose(project).labelZh || categoryLabel(project.category));
}

function projectDirectionTitle(project) {
  if (state.language !== "zh") {
    return project.useCase?.summaryEn || project.useCase?.summary || "";
  }
  return polishChineseText(project.useCase?.summaryZh || projectPurpose(project).purpose || "");
}

function useCaseLabelFromKey(key, items = []) {
  const match = items.find((item) => item.useCase?.key === key);
  if (match?.useCase) {
    return state.language === "zh"
      ? positiveLabelZh(match.useCase.labelZh || match.useCase.label || key)
      : match.useCase.labelEn || match.useCase.label || key;
  }
  return state.language === "zh" ? translateCompoundTerm(key) : key;
}

function projectHaystack(project) {
  return `${project.name || ""} ${project.fullName || ""} ${project.description || ""} ${(project.topics || []).join(" ")}`;
}

function firstSemanticMatch(haystack, rules, fallback) {
  const match = rules.find((item) => item.pattern.test(haystack));
  return match || fallback;
}

const SEMANTIC_PROBLEM_RULES = [
  {
    pattern: /agency[-\s_]?agents|agent definitions?|expert roles?|personas?|prompt library|prompt collection|即插即用的 AI 专家角色/i,
    zh: "专家角色与提示词复用",
    en: "Expert role reuse",
    filterKind: "useCase",
    filterValue: "ai-role-library"
  },
  {
    pattern: /html[-\s_]?anything|agentic html editor|local ai agent writes the html|magazine pages|posters?|rednote|x posts?|tweet|data reports?/i,
    zh: "内容页面与原型生成",
    en: "Content page generation",
    filterKind: "useCase",
    filterValue: "frontend-creative"
  },
  {
    pattern: /knowledge graph|interactive knowledge graph|queryable knowledge graph|graphify|code graph|understand[-\s_]?anything/i,
    zh: "代码与资料结构理解",
    en: "Code and knowledge mapping",
    filterKind: "useCase",
    filterValue: "knowledge-graph"
  },
  {
    pattern: /browser[-\s_]?harness|browser[-\s_]?use|browser[-\s_]?automation|browser agent|websites accessible/i,
    zh: "网页任务自动化",
    en: "Browser task automation",
    filterKind: "useCase",
    filterValue: "browser-automation"
  },
  {
    pattern: /mem0|memory layer|ai memory|memory for ai|personalized ai|long[-\s]?term memory|persistent context/i,
    zh: "长期记忆与偏好管理",
    en: "Long-term memory",
    filterKind: "useCase",
    filterValue: "ai-memory"
  },
  {
    pattern: /spec[-\s]?kit|spec[-\s]?driven|specification/i,
    zh: "需求规格到实现路径",
    en: "Spec to implementation",
    filterKind: "useCase",
    filterValue: "spec-driven-dev"
  },
  {
    pattern: /trading|quantitative[-\s]?finance|quantitative[-\s]?trading|stock analysis|market data|portfolio tracker|invoice|accounting|股票|行情|量化|交易|财务/i,
    zh: "金融交易与财务分析",
    en: "Finance and trading analysis",
    filterKind: "category",
    filterValue: "finance-trading"
  },
  {
    pattern: /langextract|information extraction|structured extraction|source grounding|ocr|pdf extraction|document processing|document parsing/i,
    zh: "文档解析与信息抽取",
    en: "Document extraction",
    filterKind: "useCase",
    filterValue: "document-extraction"
  },
  {
    pattern: /design tokens?|dtcg|figma variables|extract.*design system|design system.*extract|css health audit|tailwind v4|shadcn\/ui/i,
    zh: "设计系统抽取与规范管理",
    en: "Design system extraction",
    filterKind: "useCase",
    filterValue: "design-system-extraction"
  },
  {
    pattern: /design-to-code|figma-alternative|cursor for designers|visually build|edit your react app|ui generator|prompt\s*[→-]\s*prototype|prompt.*prototype/i,
    zh: "设计稿转代码与界面编辑",
    en: "Design-to-code editing",
    filterKind: "useCase",
    filterValue: "design-to-code-editing"
  },
  {
    pattern: /design system|figma|design token|brand|ui generator|design[-\s_]?md|design-to-code|design tools?|prototyping/i,
    zh: "设计系统与界面生成",
    en: "Design systems",
    filterKind: "useCase",
    filterValue: "ai-design-tool"
  },
  {
    pattern: /whiteboard|diagram|draw|canvas|excalidraw|flowchart|wireframe|prototype/i,
    zh: "图表白板与原型表达",
    en: "Whiteboarding",
    filterKind: "category",
    filterValue: "frontend-creative"
  },
  {
    pattern: /claude code|cursor|opencode|ai coding|agent harness|code review|coding assistant|developer assistant/i,
    zh: "AI 编程与命令行协作",
    en: "AI coding workflow",
    filterKind: "useCase",
    filterValue: "ai-coding-workflow"
  },
  {
    pattern: /mcp[-\s_]?server|mcp registry|model context protocol|\bmcp\b/i,
    zh: "工具接入与 MCP 扩展",
    en: "MCP tool integration",
    filterKind: "useCase",
    filterValue: "mcp-tooling"
  },
  {
    pattern: /trigger\.dev|activepieces|zapier|n8n|workflow automation|automation workflow|pipeline automation|task automation/i,
    zh: "业务流程自动化",
    en: "Workflow automation",
    filterKind: "useCase",
    filterValue: "workflow-automation"
  },
  {
    pattern: /leading agent orchestration platform|multi-agent swarms|autonomous workflows|mission[-\s]?control|openclaw multi-agent orchestration|三省六部制|ruflo|edict/i,
    zh: "多助手任务调度与执行",
    en: "Agent task coordination",
    filterKind: "useCase",
    filterValue: "ai-workflow"
  },
  {
    pattern: /rag|knowledge base|semantic search|vector search|notebook|document search|问答|知识库/i,
    zh: "知识库检索与 RAG 问答",
    en: "RAG knowledge search",
    filterKind: "useCase",
    filterValue: "knowledge-search"
  },
  {
    pattern: /ppt|powerpoint|presentation|slides?|pptx/i,
    zh: "文档与演示生成",
    en: "Presentation generation",
    filterKind: "useCase",
    filterValue: "presentation-generation"
  },
  {
    pattern: /video|subtitle|caption|timeline|screen studio|demo|shorts|render video/i,
    zh: "视频剪辑与短内容制作",
    en: "Video editing",
    filterKind: "useCase",
    filterValue: "creative-video-editing"
  },
  {
    pattern: /voice[-\s]?clone|voice ai|tts|speech synthesis|dictate|whisper|transcription/i,
    zh: "语音克隆与转写合成",
    en: "Voice cloning and transcription",
    filterKind: "useCase",
    filterValue: "voice-clone-transcription"
  },
  {
    pattern: /audio|music|voice|tts|podcast|speech/i,
    zh: "音频音乐与语音创作",
    en: "Audio creation",
    filterKind: "useCase",
    filterValue: "creative-audio-music"
  },
  {
    pattern: /code review|testing tool|unit test|e2e test|lint|debugger|quality gate|static analysis/i,
    zh: "测试质量与代码审查",
    en: "Testing and code review",
    filterKind: "useCase",
    filterValue: "testing-code-review"
  },
  {
    pattern: /developer tool|devtool|ide|sdk|terminal|command line|command-line|shell|tui/i,
    zh: "命令行与本地开发工具",
    en: "CLI and local dev tools",
    filterKind: "useCase",
    filterValue: "cli-local-devtools"
  },
  {
    pattern: /data visualization|metrics dashboard|analytics dashboard|business intelligence|warehouse|etl pipeline/i,
    zh: "数据可视化与指标分析",
    en: "Data visualization",
    filterKind: "category",
    filterValue: "data-visualization"
  },
  {
    pattern: /crm\b|erp\b|backoffice|admin panel|business system|customer portal|enterprise resource planning|工单|客服|进销存/i,
    zh: "业务流程与后台管理",
    en: "Business operations",
    filterKind: "category",
    filterValue: "business-operations"
  },
  {
    pattern: /dashboard|admin|backoffice|crm|erp|analytics|superset|report/i,
    zh: "数据看板与业务管理",
    en: "Business dashboard",
    filterKind: "category",
    filterValue: "business-saas"
  },
  {
    pattern: /payment|commerce|ecommerce|cms|marketing|growth|content management/i,
    zh: "内容商业与增长运营",
    en: "Commerce and growth",
    filterKind: "category",
    filterValue: "commerce-growth-content"
  },
  {
    pattern: /download|file transfer|sync|send|localsend|storage/i,
    zh: "文件传输与资料同步",
    en: "File transfer",
    filterKind: "category",
    filterValue: "consumer-productivity"
  },
  {
    pattern: /self[-\s]?hosted|docker compose|deployment|cloud|kubernetes|observability|monitoring/i,
    zh: "部署运维与平台能力",
    en: "Platform operations",
    filterKind: "category",
    filterValue: "infra-cloud"
  },
  {
    pattern: /security|vulnerability|scanner|privacy|audit|compliance|owasp|attack/i,
    zh: "安全检查与合规治理",
    en: "Security review",
    filterKind: "useCase",
    filterValue: "security-tools"
  },
  {
    pattern: /api client|api testing|api debug|postman|insomnia|graphql client|rest client|http client|request inspector|endpoint testing|openapi mock/i,
    zh: "接口调试与测试",
    en: "API debugging",
    filterKind: "category",
    filterValue: "developer-productivity"
  },
  {
    pattern: /course|tutorial|learn|awesome|example|from[-\s]?scratch|guide/i,
    zh: "学习资料与实践样例",
    en: "Learning assets",
    filterKind: "useCase",
    filterValue: "learning-assets"
  },
  {
    pattern: /agentic workflow|multi[-\s]?agent|assistant|workflow|automation|orchestrat|swarm|mcp/i,
    zh: "任务自动化与 AI 助手",
    en: "AI automation",
    filterKind: "useCase",
    filterValue: "ai-workflow"
  }
];

const SEMANTIC_AUDIENCE_RULES = [
  { pattern: /agency[-\s_]?agents|agent definitions?|expert roles?|personas?|prompt library|prompt collection/i, zh: "AI 应用搭建者", en: "AI builders" },
  { pattern: /design tokens?|dtcg|figma variables|extract.*design system|design system.*extract|css health audit|tailwind v4|shadcn\/ui/i, zh: "设计系统维护者", en: "Design system maintainers" },
  { pattern: /design-to-code|figma-alternative|cursor for designers|visually build|edit your react app|ui generator|prompt\s*[→-]\s*prototype|prompt.*prototype/i, zh: "设计师与前端开发者", en: "Designers and frontend developers" },
  { pattern: /html[-\s_]?anything|agentic html editor|magazine pages|posters?|rednote|x posts?|prototype|design|figma|whiteboard|diagram|canvas/i, zh: "设计与内容团队", en: "Design and content teams" },
  { pattern: /knowledge graph|interactive knowledge graph|queryable knowledge graph|graphify|code graph|understand[-\s_]?anything/i, zh: "开发者与知识工作者", en: "Developers and knowledge workers" },
  { pattern: /rag|knowledge base|semantic search|vector search|notebook|document search|document chat|paper|research/i, zh: "研究者与知识管理者", en: "Researchers and knowledge managers" },
  { pattern: /voice[-\s]?clone|voice ai|tts|speech synthesis|dictate|whisper|transcription/i, zh: "音频创作者与播客团队", en: "Audio creators and podcasters" },
  { pattern: /video|audio|music|podcast|voice|subtitle|caption|creator|content/i, zh: "内容创作者", en: "Creators" },
  { pattern: /api client|api testing|api debug|postman|insomnia|graphql client|rest client|http client|sdk|openapi/i, zh: "API 与后端开发者", en: "API and backend developers" },
  { pattern: /trigger\.dev|activepieces|zapier|n8n|workflow automation|automation workflow|pipeline automation|task automation/i, zh: "流程自动化搭建者", en: "Workflow automation builders" },
  { pattern: /leading agent orchestration platform|multi-agent swarms|autonomous workflows|mission[-\s]?control|openclaw multi-agent orchestration|三省六部制|ruflo|edict/i, zh: "自动化与 AI 应用团队", en: "Automation and AI app teams" },
  { pattern: /browser[-\s_]?harness|browser[-\s_]?use|browser[-\s_]?automation|browser agent/i, zh: "自动化与运营团队", en: "Automation teams" },
  { pattern: /mcp[-\s_]?server|mcp registry|model context protocol|\bmcp\b/i, zh: "工具集成开发者", en: "Tool integration developers" },
  { pattern: /claude code|cursor|opencode|ai coding|agent harness|code review|coding assistant|developer assistant/i, zh: "AI 编程用户", en: "AI coding users" },
  { pattern: /finance|trading|stock|portfolio|quant|invoice|accounting/i, zh: "金融与财务从业者", en: "Finance operators" },
  { pattern: /bi\b|data visualization|visualization|metrics|analytics dashboard|warehouse|etl/i, zh: "数据分析师", en: "Data analysts" },
  { pattern: /developer tool|devtool|cli|terminal|ide|sdk|code review|testing tool|debugger/i, zh: "开发者", en: "Developers" },
  { pattern: /admin|dashboard|crm|erp|saas|business|commerce|marketing|growth/i, zh: "业务与运营团队", en: "Business teams" },
  { pattern: /rag|knowledge|research|notebook|document|paper|learning|course|tutorial/i, zh: "研究者与知识工作者", en: "Knowledge workers" },
  { pattern: /security|privacy|compliance|audit|vulnerability/i, zh: "安全与合规团队", en: "Security teams" },
  { pattern: /kubernetes|cloud|observability|monitoring|deployment|infra|platform/i, zh: "平台与运维团队", en: "Platform teams" },
  { pattern: /local[-\s]?first|notes?|calendar|task|productivity|personal|desktop|mobile/i, zh: "个人用户", en: "Individual users" }
];

const SEMANTIC_SHAPE_RULES = [
  { pattern: /browser extension|chrome extension|firefox extension|edge extension|safari extension|webextension/i, zh: "浏览器插件", en: "Browser plugin" },
  { pattern: /(?:^|[^a-z0-9])(?:plugin|plugins|extension|extensions|addon|addons|add-on|add-ons|workbench|connector|integration)(?:[^a-z0-9]|$)|插件|扩展/i, zh: "插件/扩展工具", en: "Plugin/extension tool" },
  { pattern: /design tokens?|dtcg|figma variables|extract.*design system|design system.*extract|css health audit|tailwind v4|shadcn\/ui/i, zh: "设计规范工具", en: "Design governance tool" },
  { pattern: /design-to-code|figma-alternative|cursor for designers|visually build|edit your react app|ui generator|prompt\s*[→-]\s*prototype|prompt.*prototype/i, zh: "界面生成编辑器", en: "UI generation editor" },
  { pattern: /desktop|electron|macos|windows|linux/i, zh: "桌面应用", en: "Desktop app" },
  { pattern: /mobile|android|ios|flutter/i, zh: "移动应用", en: "Mobile app" },
  { pattern: /template|starter|boilerplate|scaffold|kit/i, zh: "模板工程", en: "Template project" },
  { pattern: /cli|terminal|command line/i, zh: "CLI 工具", en: "CLI tool" },
  { pattern: /api client|api testing|api debug|postman|insomnia|graphql client|rest client|http client|gateway|proxy|sdk|service/i, zh: "API 服务", en: "API service" },
  { pattern: /self[-\s]?hosted|docker compose|deployment/i, zh: "自托管平台", en: "Self-hosted platform" },
  { pattern: /html[-\s_]?anything|agentic html editor|magazine pages|posters?|rednote|x posts?|prototype|design studio|design-to-code|ui generator|figma/i, zh: "创作编辑器", en: "Creative editor" },
  { pattern: /rag|knowledge base|semantic search|vector search|document chat|question answering|qa system/i, zh: "知识库问答系统", en: "Knowledge Q&A system" },
  { pattern: /knowledge graph|interactive knowledge graph|queryable knowledge graph|graphify|code graph|understand[-\s_]?anything/i, zh: "知识图谱工具", en: "Knowledge graph tool" },
  { pattern: /video editor|timeline|subtitle|caption|shorts|render video|screen studio/i, zh: "视频创作工作台", en: "Video creation studio" },
  { pattern: /voice[-\s]?clone|voice ai|tts|speech synthesis|dictate|whisper|transcription/i, zh: "语音工作台", en: "Voice studio" },
  { pattern: /mem0|memory layer|ai memory|long[-\s]?term memory|persistent context/i, zh: "记忆服务", en: "Memory service" },
  { pattern: /agency[-\s_]?agents|agent definitions?|expert roles?|personas?|prompt library|prompt collection/i, zh: "角色/提示词库", en: "Role and prompt library" },
  { pattern: /leading agent orchestration platform|multi-agent swarms|autonomous workflows|mission[-\s]?control|openclaw multi-agent orchestration|三省六部制|ruflo|edict/i, zh: "任务控制台", en: "Task control console" },
  { pattern: /trigger\.dev|activepieces|zapier|n8n|workflow automation|automation workflow|pipeline automation|task automation/i, zh: "流程自动化平台", en: "Workflow automation platform" },
  { pattern: /mcp[-\s_]?server|mcp registry|model context protocol|\bmcp\b/i, zh: "MCP 工具服务", en: "MCP tool service" },
  { pattern: /claude code|cursor|opencode|ai coding|agent harness|code review|coding assistant|developer assistant/i, zh: "AI 编程工作台", en: "AI coding workspace" },
  { pattern: /course|tutorial|learn|awesome|example|from[-\s]?scratch|guide/i, zh: "学习/案例库", en: "Learning library" },
  { pattern: /workflow|automation|agent|orchestrat|mcp/i, zh: "自动化工作流", en: "Automation workflow" },
  { pattern: /dashboard|admin|console|studio|workspace|platform|web ui|web app/i, zh: "Web 工作台", en: "Web workspace" },
  { pattern: /library|framework|package|component|engine/i, zh: "框架/库", en: "Framework/library" }
];

const SEMANTIC_SCENE_RULES = [
  { pattern: /agency[-\s_]?agents|agent definitions?|ai roles?|expert roles?|personas?|prompt library|prompt collection/i, zh: "助手角色配置与任务分工", en: "Assistant role setup" },
  { pattern: /leading agent orchestration platform|multi-agent swarms|autonomous workflows|mission[-\s]?control|openclaw multi-agent orchestration|三省六部制|ruflo|edict/i, zh: "复杂任务编排与过程监控", en: "Complex task orchestration" },
  { pattern: /knowledge graph|interactive knowledge graph|queryable knowledge graph|graphify|code graph|understand[-\s_]?anything/i, zh: "代码理解与知识沉淀", en: "Code understanding" },
  { pattern: /html[-\s_]?anything|agentic html editor|magazine pages|posters?|rednote|x posts?|prototype/i, zh: "内容表达与原型制作", en: "Content prototyping" },
  { pattern: /api client|api testing|api debug|postman|insomnia|graphql client|rest client|http client|request inspector|endpoint testing/i, zh: "接口开发调试", en: "API development" },
  { pattern: /whiteboard|diagram|wireframe|design/i, zh: "方案表达与设计协作", en: "Design collaboration" },
  { pattern: /rag|knowledge|semantic search|notebook|document|paper/i, zh: "资料整理与知识沉淀", en: "Knowledge management" },
  { pattern: /video|audio|music|podcast|voice|subtitle|caption|demo/i, zh: "内容生产与素材制作", en: "Content production" },
  { pattern: /claude code|codex|cursor|code review|terminal|cli|ide/i, zh: "研发提效与工程协作", en: "Engineering workflow" },
  { pattern: /admin|dashboard|crm|erp|analytics|report/i, zh: "业务管理与数据分析", en: "Business operations" },
  { pattern: /commerce|marketing|growth|cms|content/i, zh: "内容运营与商业增长", en: "Growth operations" },
  { pattern: /security|privacy|audit|compliance|vulnerability/i, zh: "风险排查与合规审计", en: "Risk review" },
  { pattern: /kubernetes|cloud|deploy|monitoring|observability|incident/i, zh: "部署监控与运维治理", en: "Platform operations" },
  { pattern: /notes?|calendar|task|productivity|local[-\s]?first|sync/i, zh: "个人效率与本地工作流", en: "Personal productivity" },
  { pattern: /course|tutorial|learn|awesome|examples?|guide/i, zh: "学习研究与选题参考", en: "Learning and research" }
];

const SEMANTIC_TAG_KEYS = {
  problem: {
    "专家角色与提示词复用": "ai-role-library",
    "内容页面与原型生成": "content-page-generation",
    "代码与资料结构理解": "knowledge-graph",
    "网页任务自动化": "browser-automation",
    "长期记忆与偏好管理": "ai-memory",
    "需求规格到实现路径": "spec-driven-dev",
    "文档解析与信息抽取": "document-extraction",
    "设计系统抽取与规范管理": "design-system-extraction",
    "设计稿转代码与界面编辑": "design-to-code-editing",
    "AI 编程与命令行协作": "ai-coding-workflow",
    "工具接入与 MCP 扩展": "mcp-tooling",
    "业务流程自动化": "workflow-automation",
    "多助手任务调度与执行": "agent-coordination",
    "图表白板与原型表达": "whiteboard-prototyping",
    "知识库检索与 RAG 问答": "knowledge-search",
    "文档与演示生成": "presentation-generation",
    "视频剪辑与短内容制作": "video-production",
    "语音克隆与转写合成": "voice-clone-transcription",
    "音频音乐与语音创作": "audio-production",
    "设计系统与界面生成": "design-system-generation",
    "测试质量与代码审查": "testing-code-review",
    "命令行与本地开发工具": "cli-local-devtools",
    "金融交易与财务分析": "finance-trading",
    "数据可视化与指标分析": "data-visualization",
    "业务流程与后台管理": "business-operations",
    "数据看板与业务管理": "business-dashboard",
    "内容商业与增长运营": "commerce-growth",
    "文件传输与资料同步": "file-transfer-sync",
    "部署运维与平台能力": "platform-operations",
    "安全检查与合规治理": "security-compliance",
    "接口调试与测试": "api-debugging",
    "学习资料与实践样例": "learning-assets",
    "任务自动化与 AI 助手": "ai-assistant-automation"
  },
  audience: {
    "AI 应用搭建者": "audience-ai-builders",
    "AI 编程用户": "audience-ai-coding-users",
    "设计系统维护者": "audience-design-system-maintainers",
    "设计师与前端开发者": "audience-design-frontend-devs",
    "工具集成开发者": "audience-tool-integrators",
    "API 与后端开发者": "audience-api-backend-devs",
    "流程自动化搭建者": "audience-workflow-builders",
    "自动化与 AI 应用团队": "audience-automation-ai-teams",
    "开发者与知识工作者": "audience-dev-knowledge-workers",
    "设计与内容团队": "audience-design-content-teams",
    "内容创作者": "audience-creators",
    "音频创作者与播客团队": "audience-audio-podcasters",
    "自动化与运营团队": "audience-automation-ops-teams",
    "开发者": "audience-developers",
    "金融与财务从业者": "audience-finance-operators",
    "数据分析师": "audience-data-analysts",
    "业务与运营团队": "audience-business-ops-teams",
    "研究者与知识工作者": "audience-research-knowledge-workers",
    "研究者与知识管理者": "audience-research-knowledge-managers",
    "安全与合规团队": "audience-security-teams",
    "平台与运维团队": "audience-platform-ops-teams",
    "个人用户": "audience-individual-users"
  },
  shape: {
    "浏览器插件": "shape-browser-plugin",
    "插件/扩展工具": "shape-plugin-extension-tool",
    "插件": "shape-plugin-extension-tool",
    "角色/提示词库": "shape-role-prompt-library",
    "AI 编程工作台": "shape-ai-coding-workspace",
    "MCP 工具服务": "shape-mcp-tool-service",
    "流程自动化平台": "shape-workflow-platform",
    "创作编辑器": "shape-creative-editor",
    "知识图谱工具": "shape-knowledge-graph-tool",
    "记忆服务": "shape-memory-service",
    "任务控制台": "shape-task-console",
    "学习/案例库": "shape-learning-library",
    "自托管平台": "shape-self-hosted-platform",
    "桌面应用": "shape-desktop-app",
    "移动应用": "shape-mobile-app",
    "模板工程": "shape-template-project",
    "CLI 工具": "shape-cli-tool",
    "API 服务": "shape-api-service",
    "设计规范工具": "shape-design-governance-tool",
    "界面生成编辑器": "shape-ui-generation-editor",
    "知识库问答系统": "shape-knowledge-qa-system",
    "视频创作工作台": "shape-video-creation-studio",
    "语音工作台": "shape-voice-studio",
    "自动化工作流": "shape-automation-workflow",
    "Web 工作台": "shape-web-workspace",
    "框架/库": "shape-framework-library"
  }
};

function semanticItemKey(kind, item) {
  return SEMANTIC_TAG_KEYS[kind]?.[item?.zh] || item?.filterValue || "";
}

function semanticFilterItem(kind, item) {
  const key = semanticItemKey(kind, item);
  return [
    key || item.zh,
    item.zh,
    item.en,
    semanticTagValue(kind, item)
  ];
}

function semanticFilterOptions(kind) {
  const dynamic = state.summary?.distribution?.semanticFilters?.[kind] || [];
  const catalog = state.summary?.distribution?.semanticCatalog?.[kind] || [];
  const catalogValues = new Set(catalog.map((item) => item.value).filter(Boolean));
  const activeValue = state.filters[SEMANTIC_FILTER_KEYS[kind]];
  const allLabels = {
    problem: ["all", "全部", "All", ""],
    audience: ["all", "全部", "All", ""],
    shape: ["all", "全部", "All", ""]
  };
  if (dynamic.length) {
    const options = dynamic
      .filter((item) => Number(item.count || 0) > 0 || item.value === activeValue)
      .map((item) => [
        item.key,
        item.labelZh || item.key,
        item.labelEn || item.labelZh || item.key,
        item.value || `semantic:${kind}:${[item.key, item.labelZh, item.labelEn].filter(Boolean).join("|")}`,
        {
          count: Number(item.count || 0),
          newCount: Number(item.newCount || 0),
          source: item.source || "dynamic",
          memoryWeight: Number(item.memoryWeight || 0),
          inCatalog: catalogValues.has(item.value)
        }
      ]);
    const limit = SEMANTIC_FILTER_LIMITS[kind] || 16;
    const limited = options.slice(0, limit);
    if (activeValue && activeValue !== "all" && !limited.some((item) => item[3] === activeValue)) {
      const active = options.find((item) => item[3] === activeValue) || semanticFilterOptionFromValue(kind, activeValue);
      if (active) limited.unshift(active);
    }
    return [allLabels[kind], ...limited];
  }

  const source =
    kind === "problem"
      ? SEMANTIC_PROBLEM_RULES
      : kind === "audience"
        ? SEMANTIC_AUDIENCE_RULES
        : kind === "shape"
          ? SEMANTIC_SHAPE_RULES
          : [];
  const seen = new Set();
  const options = [];
  for (const item of source) {
    const key = semanticItemKey(kind, item) || item.zh;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    options.push(semanticFilterItem(kind, item));
  }
  const picked = SEMANTIC_FILTER_PICK_KEYS[kind] || [];
  const optionMap = new Map(options.map((item) => [item[0], item]));
  const selectedOptions = picked.map((key) => optionMap.get(key)).filter(Boolean);
  const fallbackOptions = options.filter((item) => !picked.includes(item[0]));
  return [allLabels[kind], ...[...selectedOptions, ...fallbackOptions].slice(0, SEMANTIC_FILTER_LIMITS[kind] || 16)];
}

function semanticCatalogCount(kind) {
  return (state.summary?.distribution?.semanticCatalog?.[kind] || []).filter((item) => Number(item.count || 0) > 0).length;
}

function semanticVisibleOptionCount(kind) {
  return semanticFilterOptions(kind).filter((item) => item[0] !== "all" && Number(item[4]?.count ?? 1) > 0).length;
}

function semanticActiveLabel(kind, filterKey) {
  const active = state.filters[filterKey];
  if (!active || active === "all") return "";
  const options = semanticFilterOptions(kind);
  const match = options.find((item) => (item[3] || item[0]) === active || item[0] === active);
  if (match) return localized(match);
  return active.split("|").filter(Boolean).at(1) || active;
}

function semanticFilterOptionFromValue(kind, value = "") {
  const [prefix = "", rawValue = ""] = String(value || "").split(/:(.*)/s);
  if (prefix !== "semantic") return null;
  const [semanticKind = "", payload = ""] = rawValue.split(/:(.*)/s);
  if (semanticKind !== kind) return null;
  const [key = "", zh = "", en = ""] = payload.split("|").map((item) => item.trim());
  if (!key && !zh && !en) return null;
  return [key || zh || en, zh || key || en, en || zh || key, value, { count: 0, source: "selected" }];
}

function languageFilterOptions() {
  const dynamic = state.summary?.distribution?.languages || [];
  const active = state.filters.language;
  if (!dynamic.length) return LANGUAGE_FILTERS;
  const options = [
    ["all", "全部", "All"],
    ...dynamic
      .filter((item) => item.key && item.key !== "unknown" && Number(item.count || 0) > 0)
      .map((item) => [item.key, item.key, item.key, Number(item.count || 0)])
  ];
  if (active && active !== "all" && !options.some((item) => item[0] === active)) {
    options.splice(1, 0, [active, active, active, 0]);
  }
  return options.slice(0, 14);
}

function semanticFallback(project, field) {
  const category = project.category?.key || "other";
  const map = {
    problem: {
      "ai-native-products": ["AI 应用任务", "AI workflow"],
      "developer-productivity": ["开发效率问题", "Developer workflow"],
      "business-saas": ["业务管理问题", "Business workflow"],
      "data-knowledge": ["数据知识处理", "Data and knowledge"],
      "infra-cloud": ["平台工程能力", "Platform capability"],
      "security-compliance": ["安全合规问题", "Security review"],
      "frontend-creative": ["界面与创意表达", "Frontend creativity"],
      "creative-media": ["内容素材生产", "Creative media"],
      "consumer-productivity": ["个人效率管理", "Personal productivity"],
      "commerce-growth-content": ["内容增长运营", "Growth workflow"],
      "learning-research-assets": ["学习研究资料", "Learning assets"]
    },
    audience: {
      "developer-productivity": ["开发者", "Developers"],
      "frontend-creative": ["设计与前端团队", "Design and frontend teams"],
      "creative-media": ["内容创作者", "Creators"],
      "business-saas": ["业务团队", "Business teams"],
      "data-knowledge": ["知识工作者", "Knowledge workers"],
      "infra-cloud": ["平台团队", "Platform teams"],
      "security-compliance": ["安全团队", "Security teams"],
      "consumer-productivity": ["个人用户", "Individual users"]
    },
    shape: {
      "product-starters": ["模板工程", "Template project"],
      "ai-native-products": ["AI 应用/工作流", "AI app/workflow"],
      "developer-productivity": ["开发者工具", "Developer tool"],
      "business-saas": ["Web 工作台", "Web workspace"],
      "data-knowledge": ["知识/数据服务", "Knowledge service"],
      "infra-cloud": ["平台服务", "Platform service"],
      "security-compliance": ["检测工具", "Review tool"],
      "frontend-creative": ["创意工具", "Creative tool"],
      "creative-media": ["创作工具", "Creation tool"],
      "consumer-productivity": ["效率应用", "Productivity app"]
    },
    scene: {
      "developer-productivity": ["研发提效与工程协作", "Engineering workflow"],
      "frontend-creative": ["设计协作与原型生成", "Design collaboration"],
      "creative-media": ["内容生产与素材制作", "Content production"],
      "business-saas": ["业务管理与数据分析", "Business operations"],
      "data-knowledge": ["资料整理与知识沉淀", "Knowledge management"],
      "infra-cloud": ["部署监控与运维治理", "Platform operations"],
      "security-compliance": ["风险排查与合规审计", "Risk review"],
      "consumer-productivity": ["个人效率与本地工作流", "Personal workflow"]
    }
  };
  const fallback = map[field]?.[category] || {
    problem: ["具体工作流问题", "Specific workflow"],
    audience: ["需要该能力的人", "Relevant users"],
    shape: ["工具/服务", "Tool/service"],
    scene: ["实际工作流", "Practical workflow"]
  }[field];
  return {
    zh: fallback[0],
    en: fallback[1]
  };
}

function semanticTagValue(kind, item) {
  if (!item) return "";
  if (item.value) return item.value;
  const key = semanticItemKey(kind, item);
  return `semantic:${kind}:${[key, item.zh, item.en].filter(Boolean).join("|")}`;
}

function projectSemanticProfile(project) {
  const backend = project.semantic || {};
  const fromBackend = (kind, labelKey, className) => {
    const item = backend[kind];
    if (!item?.key && !item?.labelZh && !item?.labelEn) return null;
    const zh = item.labelZh || item.labelEn || item.key;
    const en = item.labelEn || item.labelZh || item.key;
    return {
      kind,
      label: t(labelKey),
      text: state.language === "zh" ? zh : en,
      value: item.value || `semantic:${kind}:${[item.key, zh, en].filter(Boolean).join("|")}`,
      className
    };
  };
  const haystack = projectHaystack(project);
  const problem = firstSemanticMatch(haystack, SEMANTIC_PROBLEM_RULES, semanticFallback(project, "problem"));
  const audience = firstSemanticMatch(haystack, SEMANTIC_AUDIENCE_RULES, semanticFallback(project, "audience"));
  const shape = firstSemanticMatch(haystack, SEMANTIC_SHAPE_RULES, semanticFallback(project, "shape"));
  const scene = firstSemanticMatch(haystack, SEMANTIC_SCENE_RULES, semanticFallback(project, "scene"));
  const localizedSemantic = (kind, item, labelKey, className) => ({
    kind,
    label: t(labelKey),
    text: state.language === "zh" ? item.zh : item.en,
    value: semanticTagValue(kind, item),
    className
  });
  return {
    problem: fromBackend("problem", "semanticProblem", "semantic-problem") || localizedSemantic("problem", problem, "semanticProblem", "semantic-problem"),
    audience: fromBackend("audience", "semanticAudience", "semantic-audience") || localizedSemantic("audience", audience, "semanticAudience", "semantic-audience"),
    shape: fromBackend("shape", "semanticShape", "semantic-shape") || localizedSemantic("shape", shape, "semanticShape", "semantic-shape"),
    scene: localizedSemantic("scene", scene, "semanticScene", "semantic-scene")
  };
}

function semanticTagMarkup(tag) {
  if (!tag?.text) return "";
  return `<span class="semantic-tag ${escapeHtml(tag.className)} clickable-tag" role="button" tabindex="0" data-project-tag-filter="${escapeHtml(tag.value)}" aria-label="${escapeHtml(`${tag.label}：${tag.text}`)}"><small>${escapeHtml(tag.label)}</small>${escapeHtml(tag.text)}</span>`;
}

function projectSemanticTags(project, limit = 4) {
  const profile = projectSemanticProfile(project);
  return [profile.problem, profile.audience, profile.shape, profile.scene].slice(0, limit);
}

function renderSemanticTags(project, limit = 4) {
  return projectSemanticTags(project, limit).map(semanticTagMarkup).join("");
}

function projectOwnerName(project) {
  return String(project?.owner || project?.fullName?.split("/")?.[0] || "").trim();
}

function metaTagMarkup(label, text, value, className) {
  if (!text) return "";
  const filterAttrs = value ? ` role="button" tabindex="0" data-project-tag-filter="${escapeHtml(value)}"` : "";
  const clickableClass = value ? " clickable-tag" : "";
  return `<span class="project-meta-tag ${escapeHtml(className)}${clickableClass}"${filterAttrs} aria-label="${escapeHtml(`${label}：${text}`)}"><small>${escapeHtml(label)}</small>${escapeHtml(text)}</span>`;
}

function renderProjectMetaTags(project) {
  const owner = projectOwnerName(project);
  const language = languageLabel(project.language);
  return [
    metaTagMarkup(t("author"), owner || t("unknownAuthor"), owner ? `owner:${owner}` : "", "repo-owner"),
    metaTagMarkup(t("language"), language, project.language ? `language:${project.language}` : "", "language-tag"),
    renderSemanticTags(project, 3)
  ].join("");
}

function hasTriageRecord(project) {
  return Boolean(project?.triageStatus);
}

function hasAiAnalysisRecord(project) {
  const analysis = project?.analysis || state.analysis?.[project?.fullName];
  return Boolean(analysis?.result || analysis?.updatedAt || analysis?.raw);
}

function normalizedAiRecommendation(value) {
  const normalized = String(value || "").toLowerCase().trim();
  if (["validate", "validation", "continue", "deep-dive", "deep_dive"].includes(normalized)) return "validate";
  if (["pause", "skip", "hold", "not-fit", "not_fit"].includes(normalized)) return "pause";
  if (["watch", "observe", "review"].includes(normalized)) return "watch";
  return "";
}

function aiAnalysisRecommendation(projectOrRecord = {}) {
  const analysis =
    projectOrRecord?.result || projectOrRecord?.analysis
      ? projectOrRecord
      : state.analysis?.[projectOrRecord?.fullName] || projectOrRecord;
  const result = analysis?.result || analysis?.analysis?.result || {};
  const direct = normalizedAiRecommendation(result.recommendation || analysis?.recommendation);
  if (direct) return direct;
  const riskLevel = String(result.riskLevel || "").toLowerCase();
  const text = plainAnalysisText([result.verdict, result.summary].filter(Boolean).join(" "));
  if (/暂缓|暂不|不建议|不适合|先放弃|skip|pause|not fit|not recommended/i.test(text)) return "pause";
  if (/建议验证|优先验证|继续跟进|值得验证|值得关注|validate|continue|priority/i.test(text) && riskLevel !== "high") return "validate";
  if (riskLevel === "high") return "pause";
  if (riskLevel === "low") return "validate";
  return "watch";
}

function aiAnalysisRecommendationLabel(projectOrRecord = {}) {
  const recommendation = aiAnalysisRecommendation(projectOrRecord);
  if (recommendation === "validate") return t("aiRecommendationValidate");
  if (recommendation === "pause") return t("aiRecommendationPause");
  return t("aiRecommendationWatch");
}

function renderProjectRecordHints(project) {
  const hints = [
    hasTriageRecord(project) ? ["triage", noteStatusLabel(project.triageStatus)] : null,
    hasAiAnalysisRecord(project) ? ["ai", aiAnalysisRecommendationLabel(project)] : null
  ].filter(Boolean);
  if (!hints.length) return "";
  return hints.map(([kind, label]) => `<small class="repo-record-hint ${kind}"><i></i>${escapeHtml(label)}</small>`).join("");
}

function semanticSentence(project) {
  const profile = projectSemanticProfile(project);
  if (state.language !== "zh") {
    return `For ${profile.audience.text}, solves ${profile.problem.text.toLowerCase()} as a ${profile.shape.text.toLowerCase()} in ${profile.scene.text.toLowerCase()}.`;
  }
  return `面向${profile.audience.text}，解决${profile.problem.text}，可沉淀为${profile.shape.text}，适合${profile.scene.text}。`;
}

function projectBrief(project) {
  if (state.language !== "zh") {
    const raw = normalizeEnglishDescription(project.description);
    const useCase = projectDirectionTitle(project);
    const hint = PROJECT_BRIEF_HINTS[project.category?.key || "other"] || PROJECT_BRIEF_HINTS.other;
    const subject = raw || useCase || semanticSentence(project) || hint.lead;
    return `${sentenceCase(subject)}`;
  }
  const categoryHint = PROJECT_BRIEF_HINTS[project.category?.key || "other"] || PROJECT_BRIEF_HINTS.other;
  const original = translateDescriptionZh(project.description);
  const useCase = project.useCase?.summaryZh || projectDirectionTitle(project);
  const semantic = semanticSentence(project);
  const lead = original || useCase || semantic || categoryHint.lead;
  const cleanedLead = polishChineseText(`${lead}`.replace(/[。.!！]+$/, ""));
  const cleaned = polishChineseText(cleanedLead.replace(/[。.!！]+$/, ""));
  return cleaned.endsWith("。") ? cleaned : `${cleaned}。`;
}

function projectTrendLabel(project) {
  const trend = project.trend || {};
  if (trend.error || trend.unavailable) return t("trendUnavailable");
  if (trend.cached === false) return t("trendNotCached");
  if (trend.pending || trend.stars === null || trend.stars === undefined || trend.forks === null || trend.forks === undefined) {
    return t("trendLoading");
  }
  if (trend.complete === false || trend.starsComplete === false || trend.forksComplete === false) {
    return `${t("trend")} ${t("trendPartialShort")}`;
  }
  return `${t("trend")} +${fmtNumber(trend.stars || 0)} Stars / +${fmtNumber(trend.forks || 0)} Forks`;
}

function trendFailureReason(reason = "") {
  const keyMap = {
    "rate-limited": "trendReasonRateLimited",
    auth: "trendReasonAuth",
    forbidden: "trendReasonForbidden",
    "not-found": "trendReasonNotFound",
    "request-failed": "trendReasonRequestFailed"
  };
  return t(keyMap[reason] || "trendReasonRequestFailed");
}

function projectTrendHint(project) {
  const trend = project.trend || {};
  const date = trend.date ? `${trend.date} · ` : "";
  if (trend.cached === false) return date + t("trendNotCachedHint");
  if (trend.error || trend.unavailable) {
    return [date + t("trendUnavailable"), trendFailureReason(trend.reason), trend.error].filter(Boolean).join(" · ");
  }
  if (trend.pending || trend.stars === null || trend.stars === undefined || trend.forks === null || trend.forks === undefined) {
    return date + t("trendLoading");
  }
  const parts = [date + (state.language === "zh" ? "前一日增量" : "Previous-day change")];
  parts.push(`Stars +${fmtNumber(trend.stars || 0)}`);
  parts.push(`Forks +${fmtNumber(trend.forks || 0)}`);
  if ((trend.stars || 0) === 0 && (trend.forks || 0) === 0) parts.push(t("trendZeroHint"));
  if (trend.complete === false || trend.starsComplete === false || trend.forksComplete === false) {
    parts.push(t("trendPartial"));
    if (trend.starsComplete === false) parts.push(t("trendStarsPartial"));
    if (trend.forksComplete === false) parts.push(t("trendForksPartial"));
  }
  return parts.filter(Boolean).join(" · ");
}

function clickableProjectTag(label, value, extraClass = "tag") {
  if (!label || !value) return "";
  return `<span class="${extraClass} clickable-tag" role="button" tabindex="0" data-project-tag-filter="${escapeHtml(value)}">${escapeHtml(label)}</span>`;
}

function topicLabel(topic) {
  if (state.language !== "zh") return topic;
  return translateCompoundTerm(topic);
}

function languageLabel(language) {
  if (language) return language;
  return state.language === "zh" ? "未知语言" : "Unknown";
}

function licenseName(policy) {
  if (policy?.name) return policy.name;
  return state.language === "zh" ? "未检测到许可" : "No license detected";
}

function profileLabel(profile) {
  if (state.language !== "zh") return profile.label;
  return PROFILE_LABEL_ZH[profile.key] || translateCompoundTerm(profile.label);
}

function regionLabel(region) {
  return REGION_LABELS[state.language]?.[region] || region || "-";
}

function protocolLabel(protocol) {
  return PROTOCOL_LABELS[state.language]?.[protocol] || protocol || "-";
}

function providerKeyUrl(providerId) {
  const links = {
    deepseek: "https://platform.deepseek.com/api_keys"
  };
  return links[providerId] || "";
}

function anomalyLabel(label) {
  if (state.language !== "zh") return label;
  return ANOMALY_ZH[label] || label;
}

function localizedDistributionLabel(label, kind) {
  if (state.language !== "zh") return label;
  if (kind === "license") return LICENSE_EN_TO_ZH[label] || label;
  if (kind === "category") return positiveLabelZh(CATEGORY_EN_TO_ZH[label] || label);
  return positiveLabelZh(label);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeExternalUrl(value, options = {}) {
  try {
    const url = new URL(String(value || ""));
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return "";
    const hosts = Array.isArray(options.hosts) ? options.hosts.map((host) => String(host).toLowerCase()) : [];
    if (hosts.length && !hosts.some((host) => url.hostname.toLowerCase() === host || url.hostname.toLowerCase().endsWith(`.${host}`))) return "";
    return url.href;
  } catch {
    return "";
  }
}

function cssEscape(value) {
  return window.CSS?.escape ? CSS.escape(String(value || "")) : String(value || "").replaceAll('"', '\\"');
}

const ICON_PATHS = {
  archive: '<path d="M3 7h18"/><path d="M5 7v12h14V7"/><path d="M8 7V5h8v2"/><path d="M10 12h4"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  arrowDown: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
  arrowUp: '<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>',
  brain: '<path d="M9 5a3 3 0 0 0-3 3v7a4 4 0 0 0 4 4"/><path d="M15 5a3 3 0 0 1 3 3v7a4 4 0 0 1-4 4"/><path d="M9 5a3 3 0 0 1 6 0"/><path d="M8 11h8"/><path d="M9 15h6"/>',
  chart: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 15v-4"/><path d="M12 15V8"/><path d="M16 15v-6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  copy: '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V5a2 2 0 0 1 2-2h9a1 1 0 0 1 1 1v1"/>',
  download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  external: '<path d="M14 4h6v6"/><path d="m10 14 10-10"/><path d="M20 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4"/>',
  eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="m3 3 18 18"/><path d="M10.6 10.6A3 3 0 0 0 13.4 13.4"/><path d="M9.9 5.2A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a13.2 13.2 0 0 1-2.4 3.2"/><path d="M6.2 6.9C3.5 8.7 2 12 2 12s3.5 7 10 7a10.2 10.2 0 0 0 4.2-.9"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  fork: '<circle cx="6" cy="5" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><path d="M6 7v3a4 4 0 0 0 4 4h2"/><path d="M18 7v3a4 4 0 0 1-4 4h-2"/><path d="M12 14v3"/>',
  github: '<path d="M9 19c-5 1.5-5-2.5-7-3"/><path d="M15 22v-3.9a3.4 3.4 0 0 0-1-2.6c3.4-.4 7-1.7 7-7.5a5.8 5.8 0 0 0-1.6-4c.2-.4.7-2-.2-4 0 0-1.3-.4-4.2 1.6a14.4 14.4 0 0 0-7.6 0C4.5-.4 3.2 0 3.2 0c-.9 2-.4 3.6-.2 4A5.8 5.8 0 0 0 1.4 8c0 5.8 3.6 7.1 7 7.5a3 3 0 0 0-.9 2.2V22"/>',
  heart: '<path d="M19.5 12.6 12 20l-7.5-7.4A5 5 0 0 1 12 6a5 5 0 0 1 7.5 6.6z"/>',
  heartFilled: '<path class="ui-icon-fill" d="M19.5 12.6 12 20l-7.5-7.4A5 5 0 0 1 12 6a5 5 0 0 1 7.5 6.6z"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12 21 2"/><path d="m16 7 2 2"/><path d="m19 4 2 2"/>',
  plug: '<path d="M9 6V2"/><path d="M15 6V2"/><path d="M8 6h8v5a4 4 0 0 1-8 0z"/><path d="M12 15v7"/>',
  refresh: '<path d="M20 6v5h-5"/><path d="M4 18v-5h5"/><path d="M19 11a7 7 0 0 0-12-4L4 10"/><path d="M5 13a7 7 0 0 0 12 4l3-3"/>',
  save: '<path d="M5 3h12l2 2v16H5z"/><path d="M8 3v6h8"/><path d="M8 21v-7h8v7"/>',
  scan: '<path d="M4 7V5a1 1 0 0 1 1-1h2"/><path d="M17 4h2a1 1 0 0 1 1 1v2"/><path d="M20 17v2a1 1 0 0 1-1 1h-2"/><path d="M7 20H5a1 1 0 0 1-1-1v-2"/><path d="M7 12h10"/>',
  settings: '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7.2 4l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.6h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.6 1h.2a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.6 1z"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-5"/>',
  sparkle: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2 7.5 14 3 9.6l6.2-.9z"/>',
  starFilled: '<path class="ui-icon-fill" d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2 7.5 14 3 9.6l6.2-.9z"/>',
  minus: '<path d="M5 12h14"/>',
  plusCircle: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8"/><path d="M8 12h8"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 15h10l1-15"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  trophy: '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v2a3 3 0 0 0 3 3"/><path d="M17 6h3v2a3 3 0 0 1-3 3"/>',
  x: '<path d="M6 6l12 12"/><path d="M18 6 6 18"/>'
};

const STATIC_ICON_TARGETS = [
  ['[data-view-target="projects"]', "folder"],
  ['[data-view-target="leaderboard"]', "trophy"],
  ['[data-view-target="learning"]', "brain"],
  ['[data-view-target="brief"]', "chart"],
  ['[data-view-target="github"]', "github"],
  ['[data-view-target="settings"]', "settings"],
  ["#guide-tour-button", "shield"],
  ["#scan-button", "scan"],
  ["#export-menu > summary", "download"],
  ["#save-settings-button", "save"],
  ["#test-github-button", "plug"],
  ["#refresh-github-repos-button", "refresh"],
  ["#clear-all-filters", "x", "clearAllFilters"]
];

function iconSvg(name, className = "") {
  const path = ICON_PATHS[name];
  if (!path) return "";
  const cls = ["ui-icon", className].filter(Boolean).join(" ");
  return `<svg class="${escapeHtml(cls)}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${path}</svg>`;
}

function iconLabel(name, label, className = "") {
  return `<span class="ui-icon-label ${escapeHtml(className)}">${iconSvg(name)}<span>${escapeHtml(label)}</span></span>`;
}

function iconOnly(name, label, className = "") {
  return `<span class="ui-icon-only ${escapeHtml(className)}">${iconSvg(name)}<span class="sr-only">${escapeHtml(label)}</span></span>`;
}

function setIconButtonContent(node, iconName, label, options = {}) {
  if (!node) return;
  const text = String(label || node.textContent || "").trim();
  node.innerHTML = options.iconOnly ? iconOnly(iconName, text) : iconLabel(iconName, text);
}

function decorateStaticIcons() {
  STATIC_ICON_TARGETS.forEach(([selector, iconName, explicitLabelKey]) => {
    const node = document.querySelector(selector);
    if (!node) return;
    const labelKey = explicitLabelKey || node.dataset.i18n;
    const label = labelKey ? t(labelKey) : node.textContent.trim();
    setIconButtonContent(node, iconName, label);
  });
}

function compactText(value, limit = 72) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  const chars = Array.from(text);
  return chars.length > limit ? `${chars.slice(0, limit).join("").trim()}...` : text;
}

function clampChars(value, limit = 160) {
  const chars = Array.from(String(value || ""));
  if (!limit || chars.length <= limit) return chars.join("");
  return `${chars.slice(0, Math.max(0, limit - 1)).join("").trim()}…`;
}

function fmtNumber(value) {
  return new Intl.NumberFormat(state.language === "zh" ? "zh-CN" : "en", {
    notation: value >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1
  }).format(value || 0);
}

function fmtDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(state.language === "zh" ? "zh-CN" : "en-GB", {
    month: state.language === "zh" ? "short" : "2-digit",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function riskClass(score) {
  if (score >= 60) return "critical";
  if (score >= 35) return "high";
  if (score >= 15) return "medium";
  return "low";
}

function riskLabel(score) {
  if (state.language === "zh") {
    if (score >= 60) return "避险优先";
    if (score >= 35) return "高波动";
    if (score >= 15) return "需观察";
    return "低项目风险";
  }
  if (score >= 60) return "Avoid first";
  if (score >= 35) return "Volatile";
  if (score >= 15) return "Watch";
  return "Low risk";
}

function riskDisplay(score) {
  const label = riskLabel(score);
  return state.language === "zh" ? `${t("projectRisk")}：${label}（${score}/100）` : `${t("projectRisk")}: ${label} (${score}/100)`;
}

function riskBasisText(score) {
  if (state.language !== "zh") {
    return `${score}/100, based on maintenance, maturity, heat anomaly, and metadata completeness`;
  }
  return `${score}/100，评估维护活跃、成熟度、热度异常和元数据完整度`;
}

function momentumDisplay(score) {
  return `${t("momentum")}：${score}/100`;
}

function momentumCompact(score) {
  return state.language === "zh" ? `热度 ${score}` : `Heat ${score}`;
}

function riskCompact(score) {
  return state.language === "zh" ? `${riskLabel(score)} ${score}` : `${riskLabel(score)} ${score}`;
}

function analysisTextValue(value) {
  if (Array.isArray(value)) return value.map((item) => analysisTextValue(item)).filter(Boolean).join("；");
  if (value && typeof value === "object") {
    return Object.values(value)
      .map((item) => analysisTextValue(item))
      .filter(Boolean)
      .join("；");
  }
  return String(value || "");
}

function decodeEscapedUnicode(value) {
  const text = String(value || "");
  if (!/\\u[0-9a-fA-F]{4}/.test(text)) return text;
  try {
    return JSON.parse(`"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\\\\u/g, "\\u")}"`);
  } catch (_) {
    return text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  }
}

function plainAnalysisText(value) {
  return decodeEscapedUnicode(analysisTextValue(value))
    .replace(/```[a-zA-Z0-9_-]*\s*([\s\S]*?)```/g, " $1 ")
    .replace(/\\n|\\r|\\t/g, " ")
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\ufffd]/g, "")
    .replace(/[{}[\]"“”]+/g, "")
    .replace(/[#>*_`]+/g, " ")
    .replace(/^\s*[-•·]\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function analysisStructureKeys() {
  return [
    "verdict",
    "summary",
    "recommendation",
    "riskLevel",
    "sections",
    "risks",
    "risk",
    "biggestRisks",
    "riskAnalysis",
    "boundaries",
    "boundary",
    "practiceBoundary",
    "cleanRoom",
    "reuseBoundary",
    "cleanRoomBoundary",
    "inspirations",
    "practiceIdeas",
    "reuseIdeas",
    "developmentPath",
    "productizationIdeas",
    "validations",
    "nextActions",
    "actions"
  ];
}

function analysisSectionAliases(sectionKey = "") {
  const aliases = {
    summary: ["summary"],
    risks: ["risks", "risk", "biggestRisks", "riskAnalysis"],
    boundaries: ["boundaries", "boundary", "practiceBoundary", "cleanRoom", "reuseBoundary", "cleanRoomBoundary"],
    inspirations: ["inspirations", "practiceIdeas", "reuseIdeas", "developmentPath", "productizationIdeas"],
    validations: ["validations", "nextActions", "actions"]
  };
  return aliases[sectionKey] || [];
}

function extractAnalysisStructuredSegment(text, sectionKey = "") {
  const source = String(text || "");
  const aliases = analysisSectionAliases(sectionKey);
  if (!source || !aliases.length) return "";
  const allKeys = analysisStructureKeys().map(escapeRegExp).join("|");
  for (const alias of aliases) {
    const pattern = new RegExp(`(?:^|[\\s,，;；])${escapeRegExp(alias)}\\s*[:：]\\s*([\\s\\S]*?)(?=\\s*[,，;；]?\\s*(?:${allKeys})\\s*[:：]|$)`, "i");
    const match = pattern.exec(source);
    if (match?.[1]) return match[1];
  }
  return "";
}

function stripAnalysisStructuredResidue(text) {
  const labels = analysisStructureKeys().map(escapeRegExp).join("|");
  return String(text || "")
    .replace(/\briskLevel\s*[:：]\s*(?:low|medium|high|低|中|高)\s*[,，;；]?\s*/gi, " ")
    .replace(/\brecommendation\s*[:：]\s*(?:validate|watch|pause|continue|skip|hold)\s*[,，;；]?\s*/gi, " ")
    .replace(/\bverdict\s*[:：]\s*[^,，;；。.!?]+[,，;；]?\s*/gi, " ")
    .replace(new RegExp(`\\b(?:${labels})\\s*[:：]\\s*`, "gi"), " ")
    .replace(/\b(?:low|medium|high)\b\s*[,，;；]?\s*/gi, " ")
    .replace(/^[\s,，;；:：.-]+/, "")
    .replace(/\s*[,，;；]\s*/g, "，")
    .replace(/\s+/g, " ")
    .replace(/，{2,}/g, "，")
    .replace(/^[，;；:：\s]+|[，;；:：\s]+$/g, "")
    .trim();
}

function analysisDisplayText(value, sectionKey = "") {
  const text = plainAnalysisText(value);
  if (!text) return "";
  const structured = extractAnalysisStructuredSegment(text, sectionKey || "summary");
  if (sectionKey === "risks" && !structured && /\bsummary\s*[:：]/i.test(text) && /\b(?:verdict|sections|riskLevel)\s*[:：]/i.test(text)) {
    return "";
  }
  return stripAnalysisStructuredResidue(structured || text);
}

function usefulAnalysisDisplayItem(text) {
  if (!text) return false;
  return !/^(继续跟进|谨慎观察|暂缓跟进|暂不建议|validate|watch|pause)$/i.test(text);
}

function analysisHighlightMarkup(text) {
  const escaped = escapeHtml(text);
  const terms = [
    "高风险",
    "中风险",
    "低风险",
    "风险",
    "依赖",
    "稳定性",
    "真实效果",
    "实际效果",
    "验证",
    "许可证",
    "许可",
    "版权声明",
    "边界",
    "API",
    "隐私",
    "合规",
    "安全",
    "维护",
    "热度极高",
    "候选人筛选助手",
    "risk",
    "dependency",
    "license",
    "boundary",
    "validate",
    "validation",
    "privacy",
    "security"
  ];
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
  return escaped.replace(pattern, '<span class="analysis-highlight">$1</span>');
}

function normalizeAnalysisRecord(record) {
  if (!record) return null;
  if (typeof record === "string") {
    const text = plainAnalysisText(record);
    if (!text) return null;
    return {
      result: {
        verdict: state.language === "zh" ? "历史分析" : "Previous review",
        summary: clampChars(text, state.language === "zh" ? 160 : 240),
        riskLevel: "medium",
        risks: [],
        boundaries: [],
        inspirations: [],
        validations: []
      },
      updatedAt: ""
    };
  }
  const normalized = record.result ? { ...record, result: { ...record.result } } : { result: { ...record }, updatedAt: record.updatedAt || "" };
  const result = normalized.result;
  const sections = result.sections && typeof result.sections === "object" ? result.sections : {};
  const risks = Array.isArray(result.risks) ? result.risks : [sections.risks || result.risks || result.biggestRisks || result.riskAnalysis].flat().filter(Boolean);
  const boundaries = Array.isArray(result.boundaries)
    ? result.boundaries
    : [sections.boundaries || result.practiceBoundary || result.cleanRoom || result.reuseBoundary || result.cleanRoomBoundary].flat().filter(Boolean);
  normalized.result = {
    ...result,
    risks,
    boundaries,
    inspirations: Array.isArray(result.inspirations)
      ? result.inspirations
      : [sections.inspirations || result.inspirations || result.practiceIdeas || result.reuseIdeas].flat().filter(Boolean),
    validations: Array.isArray(result.validations)
      ? result.validations
      : [sections.validations || result.validations || result.nextActions].flat().filter(Boolean),
    practiceIdeas: result.practiceIdeas || result.inspirations || [],
    nextActions: result.nextActions || result.validations || [],
    practiceBoundary: result.practiceBoundary || boundaries.join("；")
  };
  return normalized;
}

function analysisRiskLabel(level) {
  const normalized = String(level || "").toLowerCase();
  if (state.language === "zh") {
    if (normalized === "high") return "高";
    if (normalized === "low") return "低";
    return "中";
  }
  if (normalized === "high") return "High";
  if (normalized === "low") return "Low";
  return "Medium";
}

function analysisList(items, emptyText = "", limit = 3, sectionKey = "") {
  const normalized = (Array.isArray(items) ? items : [])
    .map((item) => analysisDisplayText(item, sectionKey))
    .filter(usefulAnalysisDisplayItem)
    .filter((item, index, list) => list.indexOf(item) === index)
    .slice(0, limit);
  if (!normalized.length) return emptyText ? `<p>${escapeHtml(emptyText)}</p>` : "";
  return `<ul>${normalized.map((item) => `<li>${analysisHighlightMarkup(item)}</li>`).join("")}</ul>`;
}

function renderAnalysisSection(titleKey, items, emptyText = "", sectionKey = "") {
  return `
    <section>
      <h5>${escapeHtml(t(titleKey))}</h5>
      ${analysisList(items, emptyText, 3, sectionKey)}
    </section>
  `;
}

function renderAnalysisResult(record) {
  const normalized = normalizeAnalysisRecord(record);
  if (!normalized?.result) {
    return `<div class="analysis-empty">${escapeHtml(t("aiAnalysisEmpty"))}</div>`;
  }
  const result = normalized.result;
  const summary = analysisDisplayText(result.summary, "summary");
  const updated = normalized.updatedAt ? `${t("aiAnalysisSaved")} ${formatNoteTime(normalized.updatedAt)}` : "";
  const recommendation = aiAnalysisRecommendation(normalized);
  const recommendationLabel = aiAnalysisRecommendationLabel(normalized);
  const context = normalized.context || {};
  const contextText = plainAnalysisText(context.userNeed);
  const empty = {
    risks: state.language === "zh" ? "暂无明确风险条目" : "No explicit risk items",
    boundaries: state.language === "zh" ? "暂无明确边界" : "No explicit boundary",
    inspirations: state.language === "zh" ? "暂无实践启发" : "No practical inspiration yet",
    validations: state.language === "zh" ? "暂无下一步验证" : "No validation steps"
  };
  return `
    <div class="analysis-result">
      <div class="analysis-verdict">
        <span class="analysis-recommendation ${escapeHtml(recommendation)}">${escapeHtml(recommendationLabel)}</span>
        <span class="analysis-risk ${escapeHtml(result.riskLevel || "medium")}">${escapeHtml(t("aiRiskLevel"))}：${escapeHtml(analysisRiskLabel(result.riskLevel))}</span>
        ${updated ? `<small>${escapeHtml(updated)}</small>` : ""}
      </div>
      ${summary ? `<p>${analysisHighlightMarkup(summary)}</p>` : ""}
      ${contextText ? `<div class="analysis-context"><span>${escapeHtml(t("aiContextSaved"))}</span><strong>${escapeHtml(contextText)}</strong></div>` : ""}
      <div class="analysis-grid">
        ${renderAnalysisSection("aiRisks", result.risks, empty.risks, "risks")}
        ${renderAnalysisSection("aiBoundaries", result.boundaries, empty.boundaries, "boundaries")}
        ${renderAnalysisSection("aiReuseIdeas", result.inspirations, empty.inspirations, "inspirations")}
        ${renderAnalysisSection("aiNextActions", result.validations, empty.validations, "validations")}
      </div>
    </div>
  `;
}

function observationPlanToggleIconMarkup(extraClass = "") {
  const className = ["observation-plan-toggle-icon", extraClass].filter(Boolean).join(" ");
  return `
    <span class="${escapeHtml(className)}" aria-hidden="true">
      <span class="ui-icon-label observation-plan-toggle-closed">${iconSvg("arrowDown")}<span>${escapeHtml(t("expandPanelShort"))}</span></span>
      <span class="ui-icon-label observation-plan-toggle-open">${iconSvg("arrowUp")}<span>${escapeHtml(t("collapsePanelShort"))}</span></span>
    </span>
  `;
}

function foldToggleIconLabel(expanded) {
  return iconLabel(expanded ? "arrowUp" : "arrowDown", t(expanded ? "collapsePanelShort" : "expandPanelShort"));
}

function detailFoldToggleMarkup() {
  return observationPlanToggleIconMarkup("detail-fold-toggle");
}

function renderAnalysisLoading() {
  return `
    <div class="analysis-loading">
      <strong>${escapeHtml(t("aiAnalyzingTitle"))}</strong>
      <p>${escapeHtml(t("aiAnalyzingHint"))}</p>
    </div>
  `;
}

function activeLongTaskLabels() {
  const labels = [];
  const progress = normalizeScanProgress(state.scanProgress || {});
  if (progress.running || progress.status === "running") labels.push(t("scanRunning"));
  if (isPlanTransitionActive()) labels.push(t("planSwitchingTitle"));
  if (state.observationPlanGenerating) labels.push(t("generateObservationPlan"));
  if (Object.values(state.analysisInFlight || {}).some(Boolean)) labels.push(t("aiAnalyzingTitle"));
  if (state.learningBusy) labels.push(state.learningBusy === "harness" ? t("runHarness") : t("memoryTuning"));
  if (state.learningPolicySaveStatus === "saving") labels.push(t("saveLearningPolicy"));
  if (state.learningContextCompactStatus === "saving") labels.push(t("compactContext"));
  if (state.settingsSaveStatus === "saving") labels.push(t("savingSettings"));
  if (state.memoryClearBusyRange) labels.push(t("clearBehaviorClearing"));
  return labels.filter((label, index, list) => label && list.indexOf(label) === index);
}

function hasBlockingLongTask() {
  return activeLongTaskLabels().length > 0;
}

function handleLongTaskBeforeUnload(event) {
  if (!hasBlockingLongTask()) return;
  const labels = activeLongTaskLabels();
  const message = labels.length ? `${t("longTaskBeforeUnload")} ${labels.join(" · ")}` : t("longTaskBeforeUnload");
  event.preventDefault();
  event.returnValue = message;
  return message;
}

function getAuthToken() {
  try {
    return localStorage.getItem("sv_token") || "";
  } catch {
    return "";
  }
}

function setAuthToken(token) {
  try {
    if (token) {
      localStorage.setItem("sv_token", token);
    } else {
      localStorage.removeItem("sv_token");
    }
  } catch {
    /* ignore */
  }
}

// Remove legacy query-string tokens from browser history. Authentication tokens
// are accepted only through the in-app credential flow and request headers.
(function cleanLegacyTokenParameter() {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("token")) return;
    url.searchParams.delete("token");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  } catch {
    /* ignore */
  }
})();

async function api(path, options = {}) {
  const { skipIndexedDbSync, ...fetchOptions } = options;
  const localApi = window.StarVaultLocalApi;
  if (!skipIndexedDbSync && localApi?.shouldUseLocal?.(path, fetchOptions)) {
    return localApi.handle(path, fetchOptions);
  }
  const token = getAuthToken();
  const headers = { "Content-Type": "application/json", ...(fetchOptions.headers || {}) };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(path, { ...fetchOptions, headers });
  } catch (error) {
    if (!skipIndexedDbSync && localApi?.canHandle?.(path, fetchOptions)) {
      return localApi.handle(path, fetchOptions);
    }
    throw error;
  }

  // Server has AUTH_TOKEN configured but we haven't provided one yet — ask once, then retry.
  if (response.status === 401 && !token) {
    let prompted = "";
    try {
      prompted = (window.prompt("Access token required:") || "").trim();
    } catch {
      prompted = "";
    }
    if (prompted) {
      setAuthToken(prompted);
      headers["Authorization"] = `Bearer ${prompted}`;
      response = await fetch(path, { ...fetchOptions, headers });
    }
  }

  let json = null;
  try {
    json = await response.json();
  } catch (error) {
    if (!skipIndexedDbSync && localApi?.canHandle?.(path, fetchOptions)) {
      return localApi.handle(path, fetchOptions);
    }
    throw error;
  }
  if (!response.ok && response.status === 404 && !skipIndexedDbSync && localApi?.canHandle?.(path, fetchOptions)) {
    return localApi.handle(path, fetchOptions);
  }
  if (!response.ok) {
    const error = new Error(json.message || json.error || "Request failed");
    error.status = response.status;
    error.details = json;
    throw error;
  }
  if (!skipIndexedDbSync) {
    handleIndexedDbApiSuccess(path, fetchOptions, json);
  }
  return json;
}

const DURABLE_TASK_IDS_KEY = "starvault.pendingTaskIds";

function durableTaskIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DURABLE_TASK_IDS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function setDurableTaskIds(ids = []) {
  try {
    const unique = Array.from(new Set(ids.map(String).filter(Boolean))).slice(-30);
    if (unique.length) localStorage.setItem(DURABLE_TASK_IDS_KEY, JSON.stringify(unique));
    else localStorage.removeItem(DURABLE_TASK_IDS_KEY);
  } catch {
    /* ignore */
  }
}

function rememberDurableTask(task) {
  if (!task?.id) return;
  setDurableTaskIds([...durableTaskIds(), task.id]);
}

function forgetDurableTask(id) {
  setDurableTaskIds(durableTaskIds().filter((taskId) => taskId !== id));
}

async function waitForDurableTaskResponse(response) {
  if (!response?.task?.id) return response;
  const taskId = response.task.id;
  rememberDurableTask(response.task);
  let task = response.task;
  while (task.status === "queued" || task.status === "running") {
    await new Promise((resolve) => setTimeout(resolve, 850));
    const latest = await api(`/api/tasks/${encodeURIComponent(taskId)}`);
    task = latest.task;
  }
  forgetDurableTask(taskId);
  if (task.status === "failed") throw new Error(task.error || "Task failed");
  return task.result;
}

function indexedDbStore() {
  return window.StarVaultIndexedDB && window.StarVaultIndexedDB.isSupported?.() ? window.StarVaultIndexedDB : null;
}

async function refreshIndexedDbSnapshot(options = {}) {
  const store = indexedDbStore();
  if (!store || state.indexedDbSnapshotSyncing) return null;
  const force = Boolean(options.force);
  if (!force) {
    const shouldSync = await store.shouldSyncSnapshot(INDEXEDDB_SNAPSHOT_MIN_AGE_MS).catch(() => false);
    if (!shouldSync) return state.indexedDbSnapshotMeta;
  }
  state.indexedDbSnapshotSyncing = true;
  try {
    const snapshot = await api("/api/local-snapshot", { skipIndexedDbSync: true });
    const previousProjectRevision = String((await store.getValue(INDEXEDDB_PROJECT_SYNC_REVISION_KEY).catch(() => "")) || "");
    const previousLeaderboardRevision = String((await store.getValue(INDEXEDDB_LEADERBOARD_SYNC_REVISION_KEY).catch(() => "")) || "");
    const localProjectCount = await store.countProjects().catch(() => 0);
    const localLeaderboardCount = await store.countLeaderboards().catch(() => 0);
    const expectedProjectCount = Number(snapshot?.counts?.projects || 0);
    const expectedLeaderboardCount = Number(snapshot?.counts?.leaderboards || 0);
    const projectRevision = String(snapshot?.sync?.projectRevision || "");
    const leaderboardRevision = String(snapshot?.sync?.leaderboardRevision || "");
    const meta = await store.putSnapshot(snapshot, { preserveProjects: true, preserveLeaderboards: true });
    state.indexedDbSnapshotMeta = meta;
    const shouldSyncProjects =
      options.syncProjects === true ||
      localProjectCount !== expectedProjectCount ||
      previousProjectRevision !== projectRevision;
    if (shouldSyncProjects) {
      const retainedKeys = [];
      let cursor = "";
      let done = false;
      while (!done) {
        const params = new URLSearchParams({ limit: String(INDEXEDDB_PROJECT_SYNC_PAGE_SIZE) });
        if (cursor) params.set("cursor", cursor);
        const page = await api(`/api/local-projects?${params.toString()}`, { skipIndexedDbSync: true });
        if (String(page.projectRevision || "") !== projectRevision) {
          throw new Error("Project data changed during IndexedDB synchronization");
        }
        const items = Array.isArray(page.items) ? page.items : [];
        await store.putProjects(items);
        retainedKeys.push(...items.map((project) => String(project?.fullName || "").toLowerCase()).filter(Boolean));
        cursor = String(page.nextCursor || "");
        done = Boolean(page.done) || !items.length;
      }
      await store.deleteProjectsExcept(retainedKeys);
      await store.putValue(INDEXEDDB_PROJECT_SYNC_REVISION_KEY, projectRevision);
    }
    const shouldSyncLeaderboards =
      options.syncLeaderboards === true ||
      localLeaderboardCount !== expectedLeaderboardCount ||
      previousLeaderboardRevision !== leaderboardRevision;
    if (shouldSyncLeaderboards) {
      const retainedIds = [];
      let cursor = "";
      let done = false;
      while (!done) {
        const params = new URLSearchParams({ limit: String(INDEXEDDB_LEADERBOARD_SYNC_PAGE_SIZE) });
        if (cursor) params.set("cursor", cursor);
        const page = await api(`/api/local-leaderboards?${params.toString()}`, { skipIndexedDbSync: true });
        if (String(page.leaderboardRevision || "") !== leaderboardRevision) {
          throw new Error("Leaderboard data changed during IndexedDB synchronization");
        }
        const items = Array.isArray(page.items) ? page.items : [];
        await store.putLeaderboardRecords(items);
        retainedIds.push(...items.map((record) => String(record?.id || "")).filter(Boolean));
        cursor = String(page.nextCursor || "");
        done = Boolean(page.done) || !items.length;
      }
      await store.deleteLeaderboardsExcept(retainedIds);
      await store.putValue(INDEXEDDB_LEADERBOARD_SYNC_REVISION_KEY, leaderboardRevision);
    }
    return meta;
  } finally {
    state.indexedDbSnapshotSyncing = false;
  }
}

function queueIndexedDbSnapshotSync(reason = "", delay = INDEXEDDB_SNAPSHOT_MUTATION_DELAY_MS, options = {}) {
  const store = indexedDbStore();
  if (!store) return;
  clearTimeout(state.indexedDbSnapshotTimer);
  state.indexedDbSnapshotTimer = setTimeout(() => {
    state.indexedDbSnapshotTimer = null;
    refreshIndexedDbSnapshot(options).catch(() => {});
  }, delay);
}

function handleIndexedDbApiSuccess(path, options = {}, json = null) {
  const store = indexedDbStore();
  if (!store || !String(path || "").startsWith("/api/")) return;
  if (path === "/api/local-snapshot" && json?.schema === "starvault-indexeddb-snapshot/v1") {
    store.putSnapshot(json, { preserveProjects: true, preserveLeaderboards: true }).then((meta) => {
      state.indexedDbSnapshotMeta = meta;
    }).catch(() => {});
    return;
  }
  const projectItems = Array.isArray(json?.items)
    ? json.items
    : json?.project?.fullName
      ? [json.project]
      : json?.fullName
        ? [json]
        : [];
  if (projectItems.length && ["/api/project", "/api/projects", "/api/leaderboard"].some((prefix) => String(path).startsWith(prefix))) {
    store.putProjects(projectItems).catch(() => {});
  }
  const method = String(options.method || "GET").toUpperCase();
  if (method !== "GET") {
    queueIndexedDbSnapshotSync("mutation", INDEXEDDB_SNAPSHOT_MUTATION_DELAY_MS, { force: true });
  }
}

function scanErrorMessage(error) {
  const message = String(error?.message || error?.details?.message || "");
  if (error?.status === 401 || /GitHub Token is invalid|GitHub Token is required|bad credentials|requires authentication/i.test(message)) {
    return /required/i.test(message) ? t("githubTokenRequiredScan") : t("githubTokenInvalidHelp");
  }
  return message || t("scanFailed");
}

function isGithubTokenScanError(error) {
  const message = String(error?.message || error?.details?.message || "");
  return error?.status === 401 || /GitHub Token is invalid|GitHub Token is required|bad credentials|requires authentication/i.test(message);
}

function githubCredentialReady() {
  return !isSecretClearPending("github") && Boolean(state.settings?.githubTokenSet || state.config?.githubConfigured);
}

function activeAiProvider(providerId = "") {
  const providers = state.settings?.llmProviders || [];
  const preferredId = providerId || state.settings?.activeProvider || "deepseek";
  return providers.find((provider) => provider.id === preferredId) || providers.find((provider) => provider.enabled !== false) || null;
}

function aiProviderCredentialReady(providerId = "") {
  const provider = activeAiProvider(providerId);
  if (!provider || provider.enabled === false) return false;
  return !isSecretClearPending("provider", provider.id) && Boolean(provider.apiKeySet);
}

function showAnalysisInlineStatus(kind, label, fullName = state.selected?.fullName || "") {
  if (!fullName) return;
  clearTimeout(state.analysisInlineStatusTimer);
  state.analysisInlineStatus = {
    fullName,
    kind,
    label,
    icon: kind === "failed" ? "x" : "check"
  };
  renderDetailPreservingScroll(state.selected);
  state.analysisInlineStatusTimer = setTimeout(() => {
    if (state.analysisInlineStatus?.fullName !== fullName) return;
    state.analysisInlineStatus = null;
    state.analysisInlineStatusTimer = null;
    renderDetailPreservingScroll(state.selected);
  }, 2200);
}

function promptCredentialSetup(kind, options = {}) {
  if (kind === "github") {
    const label = t(options.messageKey || "githubCredentialRequiredAction");
    if (options.markIssue) {
      setGithubTokenIssue(true);
    } else if (!state.settings?.githubTokenSet && !state.config?.githubConfigured) {
      setGithubTokenIssue(false);
    }
    if (options.scan) {
      renderScanStatus({
        status: "failed",
        stage: "failed",
        percent: 0,
        error: label
      });
      scheduleScanIdleReset(2600);
    }
    openSettingsFor("github", { focus: false });
    showSettingsInlineStatus("failed", label);
    return label;
  }

  const label = t(options.messageKey || "aiCredentialRequiredAction");
  if (options.observationPlan) {
    showObservationPlanInlineStatus("failed", label, { preserveInputs: true });
  }
  if (options.analysisFullName) {
    showAnalysisInlineStatus("failed", label, options.analysisFullName);
  }
  if (options.learning) {
    showLearningInlineStatus("failed", label);
  }
  openSettingsFor("deepseek", { focus: false });
  showSettingsInlineStatus("failed", label);
  return label;
}

function requireGithubCredential(options = {}) {
  if (githubCredentialReady()) return true;
  promptCredentialSetup("github", options);
  return false;
}

function requireAiProviderCredential(options = {}) {
  if (aiProviderCredentialReady(options.providerId)) return true;
  promptCredentialSetup("ai", options);
  return false;
}

function setServiceKeyIssues(nextIssues = {}) {
  state.keyIssues = {
    ...(state.keyIssues || {}),
    ...nextIssues
  };
  state.githubTokenIssue = Boolean(state.keyIssues.github);
  Object.keys(SERVICE_KEY_ISSUE_STORAGE_KEYS).forEach((kind) => {
    writeServiceKeyIssue(kind, Boolean(state.keyIssues[kind]));
  });
  renderSettings();
  renderConfig(state.config);
}

function setServiceKeyIssue(kind, value) {
  setServiceKeyIssues({ [kind]: Boolean(value) });
}

function setGithubTokenIssue(value) {
  setServiceKeyIssue("github", value);
}

function applyServiceKeyValidation(validation = null) {
  if (!validation) return;
  setServiceKeyIssues({
    github: Boolean(validation.github?.configured && validation.github.valid === false),
    tavily: Boolean(validation.tavily?.configured && validation.tavily.valid === false),
    exa: Boolean(validation.exa?.configured && validation.exa.valid === false)
  });
}

function settingsRevealQuery() {
  const reveal = [];
  if (state.secretVisibility.github) reveal.push("github");
  if (state.secretVisibility.tavily) reveal.push("tavily");
  if (state.secretVisibility.exa) reveal.push("exa");
  for (const [providerId, visible] of Object.entries(state.secretVisibility.providers || {})) {
    if (visible) reveal.push(`provider:${providerId}`);
  }
  if (!reveal.length) return "";
  const params = new URLSearchParams({ reveal: reveal.join(",") });
  return `?${params.toString()}`;
}

function isSecretClearPending(kind, providerId = "") {
  if (kind === "provider") return Boolean(state.pendingSecretClears.providers?.[providerId]);
  return Boolean(state.pendingSecretClears[kind]);
}

function applyPendingSecretClears(settings) {
  if (!settings) return settings;
  const next = { ...settings };
  if (state.pendingSecretClears.github) {
    next.githubToken = "";
    next.githubTokenSet = false;
    next.githubTokenPreview = "";
  }
  if (state.pendingSecretClears.tavily) {
    next.tavilyKey = "";
    next.tavilyKeySet = false;
    next.tavilyKeyPreview = "";
  }
  if (state.pendingSecretClears.exa) {
    next.exaKey = "";
    next.exaKeySet = false;
    next.exaKeyPreview = "";
  }
  next.llmProviders = (next.llmProviders || []).map((provider) =>
    state.pendingSecretClears.providers?.[provider.id]
      ? {
          ...provider,
          apiKey: "",
          apiKeySet: false,
          apiKeyPreview: ""
        }
      : provider
  );
  return next;
}

function resetPendingSecretClears() {
  state.pendingSecretClears = {
    github: false,
    tavily: false,
    exa: false,
    providers: {}
  };
}

async function loadSettingsWithVisibleSecrets() {
  state.settings = applyPendingSecretClears(await api(`/api/settings${settingsRevealQuery()}`));
  return state.settings;
}

async function loadObservationPlans() {
  state.observationPlans = await api("/api/observation-plans");
  return state.observationPlans;
}

async function refreshObservationPlans() {
  await loadObservationPlans();
  renderObservationPlans();
  return state.observationPlans;
}

function isSecretVisible(kind, providerId = "") {
  if (kind === "provider") return Boolean(state.secretVisibility.providers?.[providerId]);
  return Boolean(state.secretVisibility[kind]);
}

function actionKey(fullName) {
  return String(fullName || "").toLowerCase();
}

function githubActionState(fullName) {
  return state.githubActions?.[actionKey(fullName)] || {};
}

function githubActionBusyKey(fullName, kind) {
  return `${actionKey(fullName)}:${kind}`;
}

function isGithubActionBusy(fullName, kind) {
  return Boolean(state.githubActionBusy?.[githubActionBusyKey(fullName, kind)]);
}

function renderGithubActionContent(iconName, label, busy = false) {
  if (!busy) return iconLabel(iconName, label);
  return `
    <span class="ui-icon-label github-action-loading-label">
      <span class="github-button-spinner" aria-hidden="true"></span>
      <span>${escapeHtml(label)}</span>
    </span>
  `;
}

function renderGithubActionSurfaces() {
  const projectTop = projectListScrollElement()?.scrollTop ?? 0;
  const leaderboardTop = elements.leaderboardList?.scrollTop ?? 0;
  const detailTop = elements.detailPanel?.scrollTop ?? 0;
  const pageX = window.scrollX || 0;
  const pageY = window.scrollY || 0;
  renderProjectPoolPage();
  renderLeaderboard(state.leaderboard);
  renderDetail(state.selected);
  const projectScroll = projectListScrollElement();
  if (projectScroll) projectScroll.scrollTop = projectTop;
  if (elements.leaderboardList) elements.leaderboardList.scrollTop = leaderboardTop;
  if (elements.detailPanel) elements.detailPanel.scrollTop = detailTop;
  window.scrollTo?.({ left: pageX, top: pageY, behavior: "auto" });
}

function setGithubActionBusy(fullName, kind, busy, options = {}) {
  const key = githubActionBusyKey(fullName, kind);
  if (busy) {
    state.githubActionBusy[key] = true;
  } else {
    delete state.githubActionBusy[key];
  }
  if (options.render !== false) {
    renderGithubActionSurfaces();
  }
}

function localActionBusyKey(fullName, kind) {
  return `${actionKey(fullName)}:${kind}`;
}

function isLocalActionBusy(fullName, kind) {
  return Boolean(state.localActionBusy?.[localActionBusyKey(fullName, kind)]);
}

function renderMiniActionBusy(label) {
  return `
    <span class="ui-icon-only action-loading-only">
      <span class="action-button-spinner" aria-hidden="true"></span>
      <span class="sr-only">${escapeHtml(label)}</span>
    </span>
  `;
}

function renderActionLabelContent(iconName, label, busy = false) {
  if (!busy) return iconLabel(iconName, label);
  return `
    <span class="ui-icon-label action-loading-label">
      <span class="action-button-spinner" aria-hidden="true"></span>
      <span>${escapeHtml(label)}</span>
    </span>
  `;
}

function actionSelector(action, fullName = "") {
  const nameSelector = fullName ? `[data-full-name="${cssEscape(fullName)}"]` : "";
  return `[data-action="${cssEscape(action)}"]${nameSelector}`;
}

function providerActionKey(providerId = "deepseek", action = "") {
  return `${providerId || "deepseek"}:${action}`;
}

function providerActionState(providerId, action) {
  return state.providerActionStatus?.[providerActionKey(providerId, action)] || "";
}

function providerActionButtonClass(providerId, action) {
  const status = providerActionState(providerId, action);
  return [status === "loading" ? "local-action-loading" : "", status === "done" ? "local-action-done" : ""].filter(Boolean).join(" ");
}

function providerActionButtonContent(providerId, action, iconName, labelKey, doneKey = "actionCompleted") {
  const status = providerActionState(providerId, action);
  if (status === "loading") return renderActionLabelContent(iconName, t(labelKey), true);
  if (status === "done") return iconLabel("check", t(doneKey));
  return iconLabel(iconName, t(labelKey));
}

function resetProviderActionButton(providerId, action) {
  const meta =
    {
      "refresh-provider-catalog": ["refresh", "refreshProviderCatalog"],
      "fetch-provider-models": ["download", "fetchProviderModels"],
      "test-provider": ["plug", "testProvider"]
    }[action] || null;
  if (!meta) return;
  const button = document.querySelector(`${actionSelector(action)}[data-provider-id="${cssEscape(providerId || "deepseek")}"]`);
  if (!button) return;
  button.classList.remove("local-action-loading", "local-action-done");
  button.disabled = false;
  button.innerHTML = iconLabel(meta[0], t(meta[1]));
}

function clearProviderActionTimer(providerId, action) {
  const key = providerActionKey(providerId, action);
  if (state.providerActionTimers?.[key]) {
    clearTimeout(state.providerActionTimers[key]);
    delete state.providerActionTimers[key];
  }
}

function setProviderActionStatus(providerId, action, status) {
  const key = providerActionKey(providerId, action);
  clearProviderActionTimer(providerId, action);
  state.providerActionStatus = {
    ...(state.providerActionStatus || {}),
    [key]: status
  };
  if (!status) {
    delete state.providerActionStatus[key];
  }
  renderSettings();
}

function showProviderActionCompleteStatus(providerId, action) {
  const key = providerActionKey(providerId, action);
  setProviderActionStatus(providerId, action, "done");
  state.providerActionTimers = {
    ...(state.providerActionTimers || {}),
    [key]: setTimeout(() => {
      delete state.providerActionTimers[key];
      if (state.providerActionStatus?.[key] === "done") {
        delete state.providerActionStatus[key];
        resetProviderActionButton(providerId, action);
      }
    }, 1600)
  };
}

async function withProviderActionFeedback(providerId, action, doneKey, task) {
  setProviderActionStatus(providerId, action, "loading");
  try {
    const result = await task();
    showProviderActionCompleteStatus(providerId, action);
    return result;
  } catch (error) {
    setProviderActionStatus(providerId, action, "");
    throw error;
  }
}

function providerApiKeyInputValue(providerId = "deepseek") {
  const item = document.querySelector(`.provider-item[data-provider-id="${cssEscape(providerId || "deepseek")}"]`);
  return item?.querySelector('[data-provider-field="apiKey"]')?.value.trim() || "";
}

function handleProviderActionError(error, providerId = "deepseek") {
  const message = error?.message || t("aiCredentialRequiredAction");
  openSettingsFor(providerId || "deepseek", { focus: false });
  showSettingsInlineStatus("failed", message);
}

function projectListScrollElement() {
  return elements.projectRows?.querySelector(".project-row-scroll") || elements.projectRows;
}

function renderLocalActionSurfaces(options = {}) {
  const projectTop = projectListScrollElement()?.scrollTop ?? 0;
  const leaderboardTop = elements.leaderboardList?.scrollTop ?? 0;
  const detailTop = elements.detailPanel?.scrollTop ?? 0;
  const pageX = window.scrollX || 0;
  const pageY = window.scrollY || 0;
  renderProjectPoolPage();
  renderLeaderboard(state.leaderboard);
  renderDetail(state.selected);
  if (options.dismissed !== false) {
    renderDismissedProjectSamples();
  }
  const projectScroll = projectListScrollElement();
  if (projectScroll) projectScroll.scrollTop = projectTop;
  if (elements.leaderboardList) elements.leaderboardList.scrollTop = leaderboardTop;
  if (elements.detailPanel) elements.detailPanel.scrollTop = detailTop;
  window.scrollTo?.({ left: pageX, top: pageY, behavior: "auto" });
}

function projectPoolSnapshot() {
  return {
    items: state.projectPool.items.map((project) => ({ ...project })),
    total: state.projectPool.total,
    pageSize: state.projectPool.pageSize,
    page: state.projectPool.page
  };
}

function applyProjectPoolSnapshot(snapshot, options = {}) {
  if (!snapshot?.items) return false;
  state.projectPool.pageSize = snapshot.pageSize || state.projectPool.pageSize;
  state.projectPool.page = snapshot.page || 1;
  applyProjectResponse(
    {
      items: snapshot.items.map((project) => ({ ...project })),
      total: snapshot.total ?? snapshot.items.length
    },
    {
      resetPosition: options.resetPosition !== false,
      scrollTop: options.scrollTop !== false,
      refreshSummary: false
    }
  );
  return true;
}

function rememberDefaultProjectPoolSnapshot() {
  if (hasActiveFilters() || state.projectPool.page !== 1) return;
  state.defaultProjectPoolSnapshot = projectPoolSnapshot();
}

function renderDetailPreservingScroll(project) {
  const detailTop = elements.detailPanel?.scrollTop ?? 0;
  const pageX = window.scrollX || 0;
  const pageY = window.scrollY || 0;
  renderDetail(project);
  if (elements.detailPanel) elements.detailPanel.scrollTop = detailTop;
  window.scrollTo?.({ left: pageX, top: pageY, behavior: "auto" });
}

function scrollDetailPanelToBottomOnExpand(section) {
  if (!section?.open || !elements.detailPanel) return;
  requestAnimationFrame(() => {
    elements.detailPanel.scrollTo?.({ top: elements.detailPanel.scrollHeight, left: 0, behavior: "smooth" });
    if (!elements.detailPanel.scrollTo) elements.detailPanel.scrollTop = elements.detailPanel.scrollHeight;
  });
}

function scrollAnalysisSectionToTop() {
  const ANALYSIS_SCROLL_TOP_GAP = 10;
  const panel = elements.detailPanel;
  const section = panel?.querySelector(".analysis-section");
  if (!panel || !section) return;
  const top = Math.max(0, section.getBoundingClientRect().top - panel.getBoundingClientRect().top + panel.scrollTop - ANALYSIS_SCROLL_TOP_GAP);
  panel.scrollTo?.({ top, left: 0, behavior: "auto" });
  panel.scrollTop = top;
}

function revealObservationPlanEditorStart() {
  const editor = elements.observationPlanLogic;
  const target = editor?.closest(".observation-plan-logic");
  if (!editor || !target || editor.hidden) return;
  requestAnimationFrame(() => {
    editor.scrollTop = 0;
    target.scrollIntoView({ block: "start", behavior: "smooth" });
  });
}

function revealObservationPlanConfirmStart() {
  const target =
    document.querySelector("#view-settings .observation-plan-toolbar") ||
    document.querySelector("#view-settings .observation-plan-logic");
  if (!target) return;
  requestAnimationFrame(() => {
    target.scrollIntoView({ block: "start", behavior: "smooth" });
  });
}

function collapseObservationPlanEditOnOutsideClick(event) {
  if (state.observationPlanEditMode !== "edit" || !state.observationPlanDraft) return false;
  const keepTarget = event.target.closest(
    "#observation-plan-name, #observation-plan-idea, #observation-plan-logic, [data-action='cancel-observation-plan-draft'], [data-action='save-observation-plan'], [data-action='generate-observation-plan'], .observation-plan-requirements, .observation-plan-toolbar"
  );
  if (keepTarget) return false;
  state.observationPlanDraft = null;
  state.observationPlanEditMode = "";
  state.observationPlanDraftNotice = "";
  state.observationPlanInlineStatus = null;
  clearObservationPlanFormValues();
  renderObservationPlans();
  return true;
}

function captureScrollPosition() {
  return {
    detailTop: elements.detailPanel?.scrollTop ?? 0,
    pageX: window.scrollX || 0,
    pageY: window.scrollY || 0
  };
}

function restoreScrollPosition(position) {
  if (!position) return;
  if (elements.detailPanel) elements.detailPanel.scrollTop = position.detailTop;
  window.scrollTo?.({ left: position.pageX, top: position.pageY, behavior: "auto" });
}

function revealNoteSaveConfirmation(fullName) {
  requestAnimationFrame(() => {
    const row = elements.detailPanel?.querySelector(".note-confirm-row");
    row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
}

function captureNoteStatusPointerScroll(event) {
  const target = event.target.closest?.("[data-action='set-note-status']");
  if (!target) return;
  state.noteStatusPointerScroll = captureScrollPosition();
  event.preventDefault();
}

function setNoteStatus(target) {
  const section = target.closest(".note-section");
  const scrollPosition = state.noteStatusPointerScroll || captureScrollPosition();
  const status = target.dataset.status || "";
  section?.querySelectorAll(".note-status-chip").forEach((button) => {
    button.classList.toggle("active", button === target);
  });
  if (state.selected?.fullName) {
    state.noteDrafts[state.selected.fullName] = {
      text: section?.querySelector("#note-text")?.value || "",
      status
    };
  }
  state.pendingNoteSaveConfirmation = null;
  state.pendingNoteDeleteConfirmation = null;
  section?.querySelectorAll(".note-confirm-row").forEach((node) => node.remove());
  restoreScrollPosition(scrollPosition);
  requestAnimationFrame(() => restoreScrollPosition(scrollPosition));
  state.noteStatusPointerScroll = null;
}

async function refreshSelectedProjectAfterNoteChange(fullName) {
  const projectTop = projectListScrollElement()?.scrollTop ?? 0;
  const project = projectWithRestoredNoteDraft(await api(`/api/project?fullName=${encodeURIComponent(fullName)}`));
  mergeLocalProject(project);
  state.selected = state.selected?.fullName === fullName ? { ...state.selected, ...project } : project;
  renderProjectPoolPage();
  const projectScroll = projectListScrollElement();
  if (projectScroll) projectScroll.scrollTop = projectTop;
  renderDetailPreservingScroll(state.selected);
  return state.selected;
}

function setLocalActionBusy(fullName, kind, busy, options = {}) {
  const key = localActionBusyKey(fullName, kind);
  if (busy) {
    state.localActionBusy[key] = true;
  } else {
    delete state.localActionBusy[key];
  }
  if (options.render !== false) {
    renderLocalActionSurfaces(options.renderOptions || {});
  }
}

function patchLocalProject(fullName, updater) {
  const patchOne = (project) => {
    if (!project || project.fullName !== fullName) return project;
    return updater(project);
  };
  state.projects = state.projects.map(patchOne);
  state.projectPool.items = state.projectPool.items.map(patchOne);
  if (state.leaderboard?.items) {
    state.leaderboard.items = state.leaderboard.items.map(patchOne);
  }
  if (state.selected?.fullName === fullName) {
    state.selected = updater(state.selected);
  }
}

function mergeLocalProject(project) {
  if (!project?.fullName) return;
  patchLocalProject(project.fullName, (current) => ({ ...current, ...project }));
}

function upsertProjectAt(items = [], project, preferredIndex = 0) {
  if (!project?.fullName) return items;
  const existing = items.find((item) => item.fullName === project.fullName);
  const nextProject = existing ? { ...existing, ...project } : project;
  const withoutProject = items.filter((item) => item.fullName !== project.fullName);
  const index = Math.max(0, Math.min(Number(preferredIndex) || 0, withoutProject.length));
  withoutProject.splice(index, 0, nextProject);
  return withoutProject;
}

function projectWithRestoredNoteDraft(project) {
  if (!project?.fullName) return project;
  const existingDraft = state.noteDrafts[project.fullName] || null;
  const shouldUseRestoredDraft =
    Boolean(project.restoredNoteDraft) ||
    (project.triageStatus === "skip" &&
      (state.pendingRestoredProjectFullName === project.fullName ||
        state.restoredSelectedFullName === project.fullName ||
        existingDraft?.status === ""));
  if (!shouldUseRestoredDraft) return project;
  const draftText = project.restoredNoteDraft?.text ?? existingDraft?.text ?? project.note ?? "";
  state.noteDrafts[project.fullName] = { text: draftText, status: "" };
  const nextProject = {
    ...project,
    note: "",
    triageStatus: "",
    noteUpdatedAt: ""
  };
  delete nextProject.restoredNoteDraft;
  return nextProject;
}

function restoreLocalProject(project, notice = {}) {
  if (!project?.fullName) return;
  project = projectWithRestoredNoteDraft(project);
  const existedInPool = state.projectPool.items.some((item) => item.fullName === project.fullName);
  state.projects = upsertProjectAt(state.projects, project, notice.projectsIndex ?? notice.poolIndex ?? 0);
  state.projectPool.items = upsertProjectAt(state.projectPool.items, project, notice.poolIndex ?? 0);
  if (!existedInPool) {
    state.projectPool.total += 1;
  }
  if (state.selected?.fullName === project.fullName) {
    state.selected = { ...state.selected, ...project };
  }
}

function applyLocalWatched(fullName, watched, options = {}) {
  patchLocalProject(fullName, (project) => ({ ...project, watched: Boolean(watched) }));
  if (state.filters.watchlist && !watched) {
    const before = state.projectPool.items.length;
    state.projectPool.items = state.projectPool.items.filter((project) => project.fullName !== fullName);
    if (before !== state.projectPool.items.length) {
      state.projectPool.total = Math.max(0, state.projectPool.total - (before - state.projectPool.items.length));
    }
  }
  if (options.render !== false) {
    renderLocalActionSurfaces(options.renderOptions || {});
  }
}

function shouldResetFiltersAfterManualUnfavorite(fullName, current, nextWatched, options = {}) {
  if (options.silent || !state.filters.watchlist || nextWatched || !current?.watched) return false;
  return state.projectPool.total <= 1 && state.projectPool.items.some((project) => project.fullName === fullName);
}

function hideLocalProject(fullName) {
  const removeProject = (items = []) => items.filter((project) => project.fullName !== fullName);
  const beforePool = state.projectPool.items.length;
  state.projects = removeProject(state.projects);
  state.projectPool.items = removeProject(state.projectPool.items);
  if (beforePool !== state.projectPool.items.length) {
    state.projectPool.total = Math.max(0, state.projectPool.total - (beforePool - state.projectPool.items.length));
  }
  if (state.leaderboard?.items) {
    state.leaderboard.items = removeProject(state.leaderboard.items).map((project, index) => ({ ...project, rank: index + 1 }));
  }
  if (state.selected?.fullName === fullName) {
    state.selected = null;
  }
  renderLocalActionSurfaces();
}

function refreshLearningAfterLocalAction() {
  scheduleSummaryRefresh(120);
  refreshMemory({ render: true }).catch(() => {});
  refreshObservationPlans().catch(() => {});
}

function toast(message) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3600);
}

function applyTranslations() {
  document.documentElement.lang = state.language;
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.setAttribute("placeholder", t(node.dataset.i18nPlaceholder));
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
    node.setAttribute("aria-label", t(node.dataset.i18nAriaLabel));
  });
  document.querySelectorAll("[data-i18n-title]").forEach((node) => {
    const label = t(node.dataset.i18nTitle);
    node.removeAttribute("title");
    node.setAttribute("data-tooltip", label);
    if (!/^H[1-6]$/i.test(node.tagName)) {
      node.setAttribute("aria-label", label);
    }
  });
  document.querySelectorAll("[data-language]").forEach((node) => {
    node.classList.toggle("active", node.dataset.language === state.language);
  });
  decorateStaticIcons();
  renderScanStatus(state.scanProgress);
  if (state.guideTourActive) {
    renderGuideTourStep();
  }
}

function scanStageLabel(stage = "idle") {
  const key = {
    prepare: "scanStagePrepare",
    catalog: "scanStageCatalog",
    github: "scanStageGithub",
    tavily: "scanStageTavily",
    exa: "scanStageExa",
    score: "scanStageScore",
    completed: "scanStageCompleted",
    failed: "scanStageFailed",
    idle: "idle"
  }[stage];
  return key ? t(key) : t("scanning");
}

function scanStartedAtMs(progress = {}) {
  const rawStartedAt = progress.startedAt || state.scanCopyStartedAt;
  if (!rawStartedAt) return 0;
  const value = typeof rawStartedAt === "number" ? rawStartedAt : Date.parse(rawStartedAt);
  if (!Number.isFinite(value)) return 0;
  return value < 1_000_000_000_000 ? value * 1000 : value;
}

function scanElapsedSeconds(progress = {}) {
  const startedAt = scanStartedAtMs(progress);
  return startedAt ? Math.max(0, Math.round((Date.now() - startedAt) / 1000)) : 0;
}

function scanFinishedAtMs(progress = {}) {
  const rawFinishedAt = progress.finishedAt || progress.updatedAt;
  if (!rawFinishedAt) return Date.now();
  const value = typeof rawFinishedAt === "number" ? rawFinishedAt : Date.parse(rawFinishedAt);
  if (!Number.isFinite(value)) return Date.now();
  return value < 1_000_000_000_000 ? value * 1000 : value;
}

function formatDurationCompact(seconds) {
  const safeSeconds = Math.max(0, Math.round(Number(seconds || 0)));
  if (state.language === "zh") {
    if (safeSeconds < 60) return `${safeSeconds} 秒`;
    const minutes = Math.floor(safeSeconds / 60);
    const restSeconds = safeSeconds % 60;
    if (minutes < 60) return restSeconds ? `${minutes} 分 ${restSeconds} 秒` : `${minutes} 分`;
    const hours = Math.floor(minutes / 60);
    const restMinutes = minutes % 60;
    return restMinutes ? `${hours} 小时 ${restMinutes} 分` : `${hours} 小时`;
  }
  if (safeSeconds < 60) return `${safeSeconds}s`;
  const minutes = Math.floor(safeSeconds / 60);
  const restSeconds = safeSeconds % 60;
  if (minutes < 60) return restSeconds ? `${minutes}m ${restSeconds}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return restMinutes ? `${hours}h ${restMinutes}m` : `${hours}h`;
}

function scanActualDurationLabel(progress = {}) {
  const startedAt = scanStartedAtMs(progress);
  if (!startedAt) return "";
  const seconds = Math.max(0, (scanFinishedAtMs(progress) - startedAt) / 1000);
  const duration = formatDurationCompact(seconds);
  return state.language === "zh" ? `耗时 ${duration}` : `Took ${duration}`;
}

function scanCopyForProgress(progress = {}) {
  const normalized = normalizeScanProgress(progress);
  const language = SCAN_COPY_POOLS[state.language] ? state.language : "en";
  const pools = SCAN_COPY_POOLS[language];
  const status = normalized.status || "idle";
  const stage = status === "completed" || status === "failed" ? status : normalized.stage || "running";
  const elapsed = scanElapsedSeconds(normalized);
  const useLongCopy = status === "running" && elapsed >= 90 && stage !== "completed" && stage !== "failed";
  const candidates = (useLongCopy ? pools.long : pools[stage]) || pools.running;
  const safeCandidates = candidates?.length ? candidates : [{ title: scanStageLabel(stage), body: "" }];
  const percentBucket = Math.floor(Math.max(0, Math.min(100, Number(normalized.percent || 0))) / 18);
  const elapsedBucket = Math.floor(elapsed / 90);
  const selected = safeCandidates[(percentBucket + elapsedBucket) % safeCandidates.length];
  return {
    stage,
    stageLabel: scanStageLabel(stage),
    title: selected.title,
    body: selected.body,
    patient: useLongCopy
  };
}

function normalizeScanProgress(progress = {}) {
  const status = progress.status || (progress.running ? "running" : "idle");
  const percent = Math.max(0, Math.min(100, Math.round(Number(progress.percent || 0))));
  return {
    ...progress,
    status,
    percent,
    stage: progress.stage || (status === "running" ? "prepare" : status)
  };
}

function formatDurationShort(seconds) {
  const safeSeconds = Math.max(0, Math.round(Number(seconds || 0)));
  if (safeSeconds < 60) return t("scanEtaUnderMinute");
  const minutes = Math.round(safeSeconds / 60);
  if (state.language === "zh") {
    if (minutes < 60) return `${minutes} 分钟`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours} 小时 ${rest} 分钟` : `${hours} 小时`;
  }
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function scanEtaLabel(progress) {
  if (!(progress.status === "running" || progress.running)) return "";
  const minSeconds = Number(progress.etaMinSeconds);
  const maxSeconds = Number(progress.etaMaxSeconds);
  const reasonLabel = {
    "warming-up": "scanEtaWarmingUp",
    "network-sensitive": "scanEtaNetworkSensitive",
    steady: "scanEtaSteady"
  }[progress.etaReason];
  const suffix = reasonLabel ? ` · ${t(reasonLabel)}` : "";
  if (Number.isFinite(minSeconds) && Number.isFinite(maxSeconds) && maxSeconds > 0) {
    const safeMin = Math.max(0, minSeconds);
    const safeMax = Math.max(safeMin, maxSeconds);
    if (safeMax < 60) return `${t("scanEtaUnderMinute")}${suffix}`;
    const minLabel = formatDurationShort(safeMin);
    const maxLabel = formatDurationShort(safeMax);
    const label =
      minLabel === maxLabel
        ? t("scanEtaRemaining").replace("{time}", maxLabel)
        : t("scanEtaRange").replace("{min}", minLabel).replace("{max}", maxLabel);
    return `${label}${suffix}`;
  }
  const etaSeconds = Number(progress.etaSeconds);
  if (!Number.isFinite(etaSeconds) || etaSeconds <= 0) {
    return `${t("scanEtaPending")}${suffix}`;
  }
  const now = Date.now();
  const elapsedSinceUpdate = progress.updatedAt ? Math.max(0, (now - Date.parse(progress.updatedAt)) / 1000) : 0;
  const serverEta = Math.max(0, etaSeconds - elapsedSinceUpdate);
  if (state.scanEtaDisplaySeconds === null || progress.percent < 8) {
    state.scanEtaDisplaySeconds = serverEta;
  } else {
    const localDecay = Math.max(0, state.scanEtaDisplaySeconds - Math.max(0, (now - state.scanEtaUpdatedAt) / 1000));
    const upperBound = Math.max(localDecay, state.scanEtaDisplaySeconds * 1.08);
    state.scanEtaDisplaySeconds = Math.min(Math.max(serverEta, localDecay * 0.82), upperBound);
  }
  state.scanEtaUpdatedAt = now;
  return `${t("scanEtaRemaining").replace("{time}", formatDurationShort(state.scanEtaDisplaySeconds))}${suffix}`;
}

function renderScanButtonState(progress = state.scanProgress) {
  if (!elements.scanButton) return;
  const normalized = normalizeScanProgress(progress);
  const isRunning = normalized.status === "running" || normalized.running;
  const isCompleted = normalized.status === "completed";
  const isFailed = normalized.status === "failed";
  const mode = isRunning ? "running" : isCompleted ? "completed" : isFailed ? "failed" : "idle";
  const label = isRunning ? t("scanRunning") : isCompleted ? t("scanDone") : isFailed ? t("scanFailed") : t("runScanShort");

  elements.scanButton.classList.toggle("local-action-loading", isRunning);
  elements.scanButton.classList.toggle("local-action-done", isCompleted);
  elements.scanButton.classList.toggle("local-action-failed", isFailed);
  elements.scanButton.setAttribute("aria-busy", isRunning ? "true" : "false");
  elements.scanButton.disabled = isRunning;

  if (elements.scanButton.dataset.scanRenderMode === mode && elements.scanButton.dataset.scanRenderLabel === label) {
    return;
  }
  elements.scanButton.dataset.scanRenderMode = mode;
  elements.scanButton.dataset.scanRenderLabel = label;
  if (isRunning) {
    elements.scanButton.innerHTML = renderActionLabelContent("scan", label, true);
  } else if (isCompleted) {
    elements.scanButton.innerHTML = iconLabel("check", label);
  } else if (isFailed) {
    elements.scanButton.innerHTML = iconLabel("x", label);
  } else {
    elements.scanButton.innerHTML = iconLabel("scan", label);
  }
}

function activeScanStatusMarkup() {
  return `
    <span class="scan-status-content">
      <span class="scan-main">
        <span class="scan-spinner" aria-hidden="true"></span>
        <span class="scan-stage"></span>
        <span class="scan-step" hidden></span>
        <strong class="scan-percent"></strong>
      </span>
      <span class="scan-eta" hidden></span>
    </span>
  `;
}

function updateScanStatusContent(label, percent, detailText = "", eta = "") {
  const stageNode = elements.scanStatus?.querySelector(".scan-stage");
  const percentNode = elements.scanStatus?.querySelector(".scan-percent");
  const stepNode = elements.scanStatus?.querySelector(".scan-step");
  const etaNode = elements.scanStatus?.querySelector(".scan-eta");
  const spinnerNode = elements.scanStatus?.querySelector(".scan-spinner");
  if (!stageNode || !percentNode || !stepNode || !etaNode || !spinnerNode) return false;
  const copy = typeof label === "string" ? { title: label, body: "", stageLabel: label } : label || {};
  const etaParts = [copy.body, eta].filter(Boolean);
  const hasPercent = percent !== null && percent !== undefined && percent !== "";
  stageNode.textContent = copy.title || copy.stageLabel || "";
  percentNode.textContent = hasPercent ? `${percent}%` : "";
  percentNode.hidden = !hasPercent;
  stepNode.textContent = detailText;
  stepNode.hidden = !detailText;
  etaNode.textContent = etaParts.join(" · ");
  etaNode.hidden = !etaParts.length;
  return true;
}

function renderScanStatus(progress = state.scanProgress) {
  if (!elements.scanStatus) return;
  const normalized = normalizeScanProgress(progress);
  if (!(normalized.status === "running" || normalized.running)) {
    state.scanCopyStartedAt = 0;
    state.scanEtaDisplaySeconds = null;
    state.scanEtaUpdatedAt = 0;
  } else if (!state.scanCopyStartedAt) {
    state.scanCopyStartedAt = Date.now();
  }
  state.scanProgress = normalized;
  renderScanButtonState(normalized);
  const isRunning = normalized.status === "running" || normalized.running;
  const isCompleted = normalized.status === "completed";
  const isFailed = normalized.status === "failed";
  const isIdle = !isRunning && !isCompleted && !isFailed;
  const copy = scanCopyForProgress(normalized);
  const label = copy.stageLabel;
  const percent = normalized.percent;
  const failureDetail = isFailed && normalized.error ? scanErrorMessage({ message: normalized.error }) : "";
  const eta = failureDetail || scanEtaLabel(normalized);
  const detailText = isRunning && normalized.total > 0 ? `${fmtNumber(normalized.completed || 0)}/${fmtNumber(normalized.total || 0)}` : "";
  const mode = isRunning ? "running" : isCompleted ? "completed" : isFailed ? "failed" : "idle";
  const statusCopy = isRunning
    ? { title: t("scanRunning"), body: "", stageLabel: label }
    : isCompleted
      ? { title: t("scanStageCompleted"), body: "", stageLabel: label }
      : isFailed
        ? { title: t("scanStageFailed"), body: "", stageLabel: label }
        : copy;
  const statusPercent = isRunning ? percent : null;
  const statusEta = isCompleted ? scanActualDurationLabel(normalized) : eta;
  const statusDetail = isRunning ? detailText : "";

  elements.scanStatus.classList.remove("is-running", "is-completed", "is-failed", "is-idle");
  if (isRunning) elements.scanStatus.classList.add("is-running");
  if (isCompleted) elements.scanStatus.classList.add("is-completed");
  if (isFailed) elements.scanStatus.classList.add("is-failed");
  if (isIdle) elements.scanStatus.classList.add("is-idle");
  elements.scanStatus.setAttribute(
    "aria-label",
    isRunning
      ? [t("scanProgressHint").replace("{stage}", label).replace("{percent}", String(percent)), statusEta].filter(Boolean).join(" · ")
      : isCompleted
        ? [t("scanStageCompleted"), statusEta].filter(Boolean).join(" · ")
      : label
  );

  if (isRunning || isCompleted || isFailed) {
    if (elements.scanStatus.dataset.scanRenderMode !== mode || !updateScanStatusContent(statusCopy, statusPercent, statusDetail, statusEta)) {
      elements.scanStatus.innerHTML = activeScanStatusMarkup();
      elements.scanStatus.dataset.scanRenderMode = mode;
      updateScanStatusContent(statusCopy, statusPercent, statusDetail, statusEta);
    }
    if (isPlanTransitionActive()) {
      renderProjectPoolTransitionState();
      renderLeaderboardTransitionState();
      renderDetail(null);
    }
    return;
  }

  if (elements.scanStatus.dataset.scanRenderMode !== mode) {
    elements.scanStatus.innerHTML = `
      <span class="scan-status-content">
        <span class="scan-main scan-main-idle">
          <span class="scan-idle-dot" aria-hidden="true"></span>
          <span class="scan-stage">${escapeHtml(t("idle"))}</span>
        </span>
      </span>
    `;
    elements.scanStatus.dataset.scanRenderMode = mode;
  } else {
    const stageNode = elements.scanStatus.querySelector(".scan-stage");
    if (stageNode) stageNode.textContent = t("idle");
  }
  if (isPlanTransitionActive()) {
    renderProjectPoolTransitionState();
    renderLeaderboardTransitionState();
    renderDetail(null);
  }
}

async function loadScanProgress(options = {}) {
  const progress = await api("/api/scan/status");
  renderScanStatus(progress);
  const running = Boolean(progress.running || progress.status === "running");
  elements.scanButton.disabled = running;
  if (!running && state.scanProgressTimer) {
    stopScanProgressPolling();
    if (options.scheduleIdleReset !== false && (progress.status === "completed" || progress.status === "failed")) {
      scheduleScanIdleReset(progress.status === "failed" ? 2600 : 1800);
    }
  }
  return progress;
}

function stopScanProgressPolling() {
  if (state.scanProgressTimer) {
    clearInterval(state.scanProgressTimer);
    state.scanProgressTimer = null;
  }
}

function clearScanIdleReset() {
  if (state.scanIdleTimer) {
    clearTimeout(state.scanIdleTimer);
    state.scanIdleTimer = null;
  }
}

function startScanProgressPolling() {
  stopScanProgressPolling();
  state.scanProgressTimer = setInterval(() => {
    loadScanProgress().catch(() => {});
  }, 900);
}

async function waitForScanCompletion() {
  for (;;) {
    const progress = await loadScanProgress({ scheduleIdleReset: false });
    const running = Boolean(progress.running || progress.status === "running");
    if (!running) return progress;
    await new Promise((resolve) => setTimeout(resolve, 900));
  }
}

function scheduleScanIdleReset(delay = 1800) {
  clearScanIdleReset();
  state.scanIdleTimer = setTimeout(() => {
    state.scanIdleTimer = null;
    renderScanStatus({
      status: "idle",
      stage: "idle",
      percent: 0
    });
  }, delay);
}

function renderChips() {
  renderPresetChips();
  if (elements.watchFilter) {
    elements.watchFilter.checked = Boolean(state.filters.watchlist);
  }
  if (elements.clearAllFilters) {
    elements.clearAllFilters.disabled = !hasActiveFilters();
  }
  renderSemanticFilterGroup(elements.problemChips, "problem", "semanticProblem");
  renderSemanticFilterGroup(elements.audienceChips, "audience", "semanticAudience");
  renderSemanticFilterGroup(elements.shapeChips, "shape", "semanticShape");
  renderChipGroup(elements.languageChips, languageFilterOptions(), "language");
  renderChipGroup(elements.licenseChips, FILTERS.license, "license");
  renderChipGroup(elements.triageChips, TRIAGE_FILTERS, "triageStatus");
  renderChipGroup(elements.aiAnalysisChips, AI_ANALYSIS_FILTERS, "aiAnalysis");
  renderChipGroup(elements.sortChips, FILTERS.sort, "sort");
}

function updateChipActiveState(container, filterKey) {
  if (!container) return;
  container.querySelectorAll("[data-filter-key]").forEach((button) => {
    if (button.dataset.filterKey !== filterKey) return;
    button.classList.toggle("active", state.filters[filterKey] === button.dataset.filterValue);
  });
}

function updatePresetActiveState() {
  if (!elements.presetChips) return;
  elements.presetChips.querySelectorAll("[data-filter-preset]").forEach((button) => {
    const preset = FILTER_PRESETS.find((item) => item[0] === button.dataset.filterPreset);
    button.classList.toggle("active", Boolean(preset && presetActive(preset)));
  });
}

function syncFilterControls() {
  if (elements.watchFilter) {
    elements.watchFilter.checked = Boolean(state.filters.watchlist);
  }
  if (elements.clearAllFilters) {
    elements.clearAllFilters.disabled = !hasActiveFilters();
  }
  updatePresetActiveState();
  updateChipActiveState(elements.problemChips, "semanticProblem");
  updateChipActiveState(elements.audienceChips, "semanticAudience");
  updateChipActiveState(elements.shapeChips, "semanticShape");
  updateChipActiveState(elements.languageChips, "language");
  updateChipActiveState(elements.licenseChips, "license");
  updateChipActiveState(elements.triageChips, "triageStatus");
  updateChipActiveState(elements.aiAnalysisChips, "aiAnalysis");
  updateChipActiveState(elements.sortChips, "sort");
}

function hasActiveFilters() {
  return PRESET_COMPARE_KEYS.some((key) => state.filters[key] !== DEFAULT_FILTERS[key]) || Boolean(state.filters.q);
}

function resetAllFilters() {
  state.filters = { ...DEFAULT_FILTERS };
  if (elements.searchInput) elements.searchInput.value = "";
  if (elements.watchFilter) elements.watchFilter.checked = false;
  renderChips();
}

function previewCurrentPageFavorites() {
  const snapshot = projectPoolSnapshot();
  const favoriteItems = snapshot.items.filter((project) => project.watched);
  state.projectPoolPreviewSnapshot = snapshot;
  applyProjectResponse(
    {
      items: favoriteItems,
      total: favoriteItems.length
    },
    {
      resetPosition: true,
      scrollTop: true,
      refreshSummary: false
    }
  );
}

function previewDefaultProjectPool() {
  return applyProjectPoolSnapshot(state.defaultProjectPoolSnapshot);
}

function applyProjectTagFilter(value = "") {
  const tag = String(value || "").trim();
  if (!tag) return;
  const [kind, rawValue = ""] = tag.split(/:(.*)/s);
  if (kind === "semantic") {
    const [semanticKind = "", payload = ""] = rawValue.split(/:(.*)/s);
    const filterKey = SEMANTIC_FILTER_KEYS[semanticKind];
    if (filterKey) {
      state.filters[filterKey] = tag;
      state.filters.tag = "";
    } else {
      state.filters.tag = tag;
    }
  } else if (kind === "language") {
    state.filters.language = rawValue || "all";
    state.filters.tag = "";
  } else {
    state.filters.tag = tag;
  }
  state.projectPool.page = 1;
  syncFilterControls();
  loadProjects({ resetPosition: true }).catch((error) => toast(error.message));
}

function overviewFilterValue(entry, kind) {
  const key = String(entry?.key || "").trim();
  if (!key) return null;
  const label = distributionLabel(entry, kind);
  if (kind === "language") return { filterKey: "language", value: key, label };
  if (kind === "license") return { filterKey: "license", value: key, label };
  if (kind === "category") return { tag: `category:${key}`, label };
  if (kind === "useCase") return { tag: `useCase:${key}`, label };
  if (kind === "topic") {
    const zh = entry.labelZh || label;
    const en = entry.labelEn || entry.label || key;
    return { semanticKey: "semanticProblem", value: `semantic:problem:${[key, zh, en].filter(Boolean).join("|")}`, label };
  }
  return null;
}

function applyOverviewFilter(payload = "") {
  let filter = null;
  try {
    filter = JSON.parse(payload);
  } catch {
    return;
  }
  if (!filter) return;
  state.projectPool.page = 1;
  if (filter.filterKey) {
    state.filters[filter.filterKey] = filter.value || "all";
  } else if (filter.semanticKey) {
    state.filters[filter.semanticKey] = filter.value || "all";
    state.filters.tag = "";
  } else if (filter.tag) {
    state.filters.tag = filter.tag;
  }
  syncFilterControls();
  switchView("projects");
  document.querySelector("#projects")?.scrollIntoView({ block: "start", behavior: "smooth" });
  loadProjects({ resetPosition: true }).catch((error) => toast(error.message));
}

function presetActive(preset) {
  const filters = {
    ...DEFAULT_FILTERS,
    q: state.filters.q,
    ...(preset[3] || {})
  };
  return PRESET_COMPARE_KEYS.every((key) => state.filters[key] === filters[key]);
}

function renderPresetChips() {
  if (!elements.presetChips) return;
  elements.presetChips.innerHTML = FILTER_PRESETS.map((preset) => {
    const [key, labelKey, hintKey] = preset;
    const active = presetActive(preset) ? "active" : "";
    const hint = t(hintKey);
    return `
      <button class="preset-chip ${active}" type="button" data-filter-preset="${escapeHtml(key)}" aria-label="${escapeHtml(`${t(labelKey)}：${hint}`)}">
        <span>${escapeHtml(t(labelKey))}</span>
        <small>${escapeHtml(hint)}</small>
      </button>
    `;
  }).join("");
}

function applyFilterPreset(key) {
  if (key === "reset") {
    state.filters = {
      ...DEFAULT_FILTERS,
      q: state.filters.q
    };
    return;
  }
  const preset = FILTER_PRESETS.find((item) => item[0] === key);
  if (!preset) return;
  state.filters = {
    ...state.filters,
    tag: "",
    semanticProblem: "all",
    semanticAudience: "all",
    semanticShape: "all",
    language: "all",
    ...(preset[3] || {})
  };
}

function semanticFilterActive(filterKey, item) {
  const current = state.filters[filterKey];
  const value = item[3] || item[0];
  if (current === value) return true;
  if (item[0] !== "all" && current === item[0]) return true;
  return false;
}

function renderSemanticFilterGroup(container, kind, filterKey) {
  if (!container) return;
  const options = semanticFilterOptions(kind);
  container.innerHTML = options
    .map((item) => {
      const value = item[3] || item[0];
      const active = semanticFilterActive(filterKey, item) ? "active" : "";
      const all = item[0] === "all" ? "all-chip" : "";
      const meta = item[4] || {};
      const unavailable = item[0] !== "all" && Number(meta.count || 0) <= 0 ? "unavailable" : "";
      const sourceClass = meta.source === "core" ? "core" : meta.source === "emerging" || meta.newCount > 0 ? "emerging" : "dynamic";
      const title = semanticFilterHint(meta);
      return `
        <button class="chip semantic-filter-chip ${sourceClass} ${all} ${active} ${unavailable}" type="button" data-filter-key="${filterKey}" data-filter-value="${escapeHtml(value)}" title="${escapeHtml(title)}">
          <span>${filterChipLabelMarkup(localized(item))}</span>
        </button>
      `;
    })
    .join("");
  renderSemanticCountBadge(kind, filterKey);
}

function renderSemanticCountBadge(kind, filterKey) {
  const element = elements[SEMANTIC_COUNT_ELEMENT_KEYS[kind]];
  if (!element) return;
  if (!state.summary) {
    element.textContent = "";
    element.removeAttribute("title");
    return;
  }
  const catalog = semanticCatalogCount(kind);
  const available = semanticVisibleOptionCount(kind);
  const activeLabel = semanticActiveLabel(kind, filterKey);
  const template = activeLabel ? t("filterCountHintActive").replace("{label}", activeLabel) : t("filterCountHintAll");
  element.textContent = fmtNumber(available);
  element.setAttribute("title", template.replace("{catalog}", fmtNumber(catalog)).replace("{available}", fmtNumber(available)));
}

function semanticFilterHint(meta = {}) {
  const parts = [];
  if (Number(meta.count || 0) > 0) {
    parts.push(`${t("filterTagAvailable")} ${fmtNumber(meta.count)}`);
  } else if (meta.source === "selected") {
    parts.push(t("filterTagUnavailable"));
  }
  if (Number(meta.newCount || 0) > 0) {
    parts.push(state.language === "zh" ? `新出现 ${fmtNumber(meta.newCount)}` : `${fmtNumber(meta.newCount)} new`);
  }
  if (Number(meta.memoryWeight || 0) > 0) {
    parts.push(state.language === "zh" ? "受偏好记忆加权" : "Boosted by memory");
  }
  if (meta.inCatalog) {
    parts.push(t("filterTagCatalog"));
  }
  if (meta.source === "core") {
    parts.push(state.language === "zh" ? "核心方向" : "Core direction");
  }
  if (meta.source === "emerging") {
    parts.push(state.language === "zh" ? "扫描池新兴标签" : "Emerging from scan pool");
  }
  return parts.join(" · ");
}

function renderChipGroup(container, items, filterKey) {
  if (!container) return;
  container.innerHTML = items
    .map((item) => {
      const [value] = item;
      const active = state.filters[filterKey] === value ? "active" : "";
      const danger =
        value === "high" ||
        value === "critical" ||
        value.includes("copyleft") ||
        value === "unknown-no-license" ||
        value === "restricted-noncommercial";
      const warning = value === "medium" || value === "conditional-commercial" || value === "manual-review";
      const hint = state.language === "zh" ? item[3] : item[4];
      const count = Number(item[3]);
      if (filterKey === "language" && Number.isFinite(count) && value !== "all") {
        return `
          <button class="chip ${active}" type="button" data-filter-key="${filterKey}" data-filter-value="${escapeHtml(value)}" title="${escapeHtml(`${fmtNumber(count)} ${t("matched")}`)}">
            <span>${filterChipLabelMarkup(localized(item))}</span>
          </button>
        `;
      }
      if (filterKey === "sort" || filterKey === "license") {
        return `
          <button class="chip ${filterKey === "sort" ? "sort-chip" : "license-chip"} ${active} ${danger ? "danger" : ""} ${warning ? "warning" : ""}" type="button" data-filter-key="${filterKey}" data-filter-value="${value}" title="${escapeHtml(hint || "")}">
            <span>${filterChipLabelMarkup(localized(item))}</span>
            <small>${escapeHtml(hint || "")}</small>
          </button>
        `;
      }
      return `<button class="chip ${active} ${danger ? "danger" : ""} ${warning ? "warning" : ""}" type="button" data-filter-key="${filterKey}" data-filter-value="${value}"><span>${filterChipLabelMarkup(localized(item))}</span></button>`;
    })
    .join("");
}

function tagForLicense(policy) {
  const bucket = policy?.bucket || "unknown-no-license";
  const label = licenseLabel(policy);
  const cls =
    bucket === "permissive-commercial"
      ? ""
      : bucket.includes("copyleft") || bucket === "unknown-no-license" || bucket === "restricted-noncommercial"
        ? "danger"
        : "caution";
  return `<span class="tag ${cls}">${escapeHtml(label)}</span>`;
}

function licenseLabel(policy) {
  if (!policy) return state.language === "zh" ? "无许可：仅监控" : "No license: monitor only";
  if (state.language === "zh") {
    const raw = policy.labelZh || LICENSE_EN_TO_ZH[policy.label] || policy.label;
    return LICENSE_LABEL_ZH_NORMALIZE[raw] || raw;
  }
  return policy.labelEn || policy.label;
}

function projectReasons(project) {
  if (state.language !== "zh") return project.reasons || [];
  const reasons = [];
  const brief = translateDescriptionZh(project.description) || projectDirectionTitle(project) || categoryLabel(project.category);
  if (brief) reasons.push(`这个仓库主要在做：${brief}。`);
  if (project.stars) reasons.push(`${fmtNumber(project.stars)} ${t("stars")} 说明已经有公开关注度，但仍要看是否真能解决具体问题。`);
  if (project.forks) reasons.push(`${fmtNumber(project.forks)} ${t("forks")} 说明有实现层面的复用或学习兴趣。`);
  if (project.homepage) reasons.push("项目提供了外部主页或演示入口，建议优先验证真实体验。");
  reasons.push(`许可判断为「${licenseLabel(project.licensePolicy)}」，深入采用前要先确认边界。`);
  reasons.push(`${t("momentum")} 不是 Star 总数，而是近期增长、更新活跃和外部讨论的综合分。`);
  return reasons.slice(0, 5);
}

function projectActions(project) {
  if (state.language !== "zh") return project.actions || [];
  const actions = [];
  const bucket = project.licensePolicy?.bucket;
  if (bucket === "permissive-commercial") {
    actions.push("先拆解核心功能、部署方式和差异化空间，判断是否值得持续跟踪。");
  } else if (bucket === "unknown-no-license" || bucket === "restricted-noncommercial" || bucket === "network-copyleft") {
    actions.push("先作为观察和学习对象，不要复制代码；重点提炼思路和使用边界。");
  } else {
    actions.push("先人工阅读完整许可证，再决定是否深入采用、分发或集成。");
  }
  actions.push(CATEGORY_ACTION_ZH[project.category?.key || "other"] || CATEGORY_ACTION_ZH.other);
  if ((project.scores?.risk || 0) >= 15) actions.push("项目风险不是许可风险，需重点检查维护活跃度、成熟度和热度结构。");
  return actions;
}

function noteStatusLabel(status) {
  const match = NOTE_STATUSES.find(([value]) => value === (status || ""));
  return t(match?.[1] || "statusNone");
}

function noteSaveConfirmationMessage(status, previousStatus = "") {
  if (status === "deep-dive") return t("noteSaveConfirmDeepDive");
  if (status === "watch" && previousStatus === "deep-dive") return t("noteSaveConfirmWatchUnfavorite");
  if (status === "skip") return t("noteSaveConfirmSkip");
  return t("noteSaveConfirmWatch");
}

function noteSavedInlineLabel(status, sideEffect = {}) {
  if (sideEffect?.favoriteRemoved) return t("noteSavedUnfavoritedInline");
  if (status === "deep-dive") return t("noteSavedFavoriteInline");
  if (status === "skip") return t("noteSavedHiddenInline");
  return t("observationPlanSavedInline");
}

function noteDeleteConfirmationMessage(status) {
  if (status === "deep-dive") return t("noteDeleteConfirmDeepDive");
  return t("noteDeleteConfirmWatch");
}

function noteDeletedInlineLabel(sideEffect = {}) {
  if (sideEffect?.favoriteRemoved) return t("noteDeletedUnfavoritedInline");
  return t("observationPlanDeletedInline");
}

function noteSaveConfirmationIcon(status) {
  if (status === "deep-dive") return "heart";
  if (status === "skip") return "eyeOff";
  return "check";
}

function formatNoteTime(value) {
  return value ? fmtDate(value) : "";
}

function providerConnectionIssue(provider) {
  if (!provider?.testStatus || !/^failed/i.test(provider.testStatus)) return "";
  const detail = provider.testStatus.replace(/^failed:\s*/i, "").trim();
  return detail ? `${t("providerFailed")} · ${detail}` : t("providerFailed");
}

function renderConfigDot(element, name, ready, extra = "", issue = "") {
  if (!element) return;
  const hasIssue = Boolean(issue);
  const isReady = Boolean(ready) && !hasIssue;
  const isMissing = !ready && !hasIssue;
  const label = hasIssue ? issue : ready ? t("configured") : t("keyEmpty");
  element.innerHTML = iconOnly(hasIssue ? "x" : ready ? "check" : "x", label, "connection-status-icon");
  const target = element.closest(".connection-dot");
  target?.classList.toggle("ready", isReady);
  target?.classList.toggle("missing", isMissing);
  target?.classList.toggle("error", hasIssue);
  const hint = (hasIssue ? t("configReadyHint") : ready ? t("configReadyHint") : t("configMissingHint")).replace("{name}", name);
  const detail = extra ? `${hint} ${extra}` : hint;
  if (target) {
    const nextDetail = hasIssue ? `${hint} ${issue}` : detail;
    target.dataset.tooltip = nextDetail;
    target.setAttribute("aria-label", nextDetail);
  }
}

function renderConfig(config) {
  if (!config) return;
  const activeProvider = (state.settings?.llmProviders || []).find((provider) => provider.id === "deepseek");
  const scanTime = `${String(config.scanHour).padStart(2, "0")}:00`;
  renderConfigDot(
    elements.githubState,
    "GitHub",
    config.githubConfigured,
    t("autoScanHint").replace("{time}", scanTime),
    state.keyIssues?.github ? SERVICE_KEY_ISSUE_LABELS.github : ""
  );
  renderConfigDot(
    elements.tavilyState,
    "Tavily",
    config.tavilyConfigured,
    "",
    state.keyIssues?.tavily ? SERVICE_KEY_ISSUE_LABELS.tavily : ""
  );
  renderConfigDot(
    elements.exaState,
    "Exa",
    config.exaConfigured,
    "",
    state.keyIssues?.exa ? SERVICE_KEY_ISSUE_LABELS.exa : ""
  );
  renderConfigDot(elements.modelState, "AI", activeProvider?.enabled !== false && activeProvider?.apiKeySet, "", providerConnectionIssue(activeProvider));
}

function renderSummary(summary) {
  if (!summary) return;
  elements.metricTotal.textContent = fmtNumber(summary.totalProjects);
  elements.metricWatch.textContent = fmtNumber(summary.watched);
  elements.metricScan.textContent = summary.lastScan ? fmtDate(summary.lastScan.at) : "-";

  const distribution = summary.distribution || {};
  const coverage = distribution.coverage || {};
  const statCards = [
    ["monitorScope", summary.totalProjects || 0],
    ["categoryCoverage", coverage.categoryCount || 0],
    ["useCaseCoverage", coverage.useCaseCount || 0],
    ["languageCoverage", coverage.languageCount || 0],
    ["licenseReady", coverage.licenseReadyCount || 0],
    ["highHeatProjects", coverage.highHeatCount || 0]
  ];
  elements.briefList.innerHTML = statCards
    .map(
      ([labelKey, value]) => `
        <article class="overview-scope-item">
          <span>${escapeHtml(t(labelKey))}</span>
          <strong>${fmtNumber(value)}</strong>
        </article>
      `
    )
    .join("");

  renderDistributionBars(elements.categoryBars, distribution.useCases || distribution.categories || [], "useCase", 8);
  renderDistributionBars(elements.languageBars, distribution.languages || [], "language", 6);
  renderDistributionBars(elements.licenseBars, distribution.licenses || [], "license", 5);
  renderTopicCloud(elements.topicCloud, distribution.topics || []);
}

function percentText(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function distributionLabel(entry, kind) {
  if (kind === "category") return categoryLabel({ key: entry.key, label: entry.label });
  if (kind === "useCase") {
    if (state.language === "zh") return positiveLabelZh(entry.labelZh || translateCompoundTerm(entry.key));
    return entry.labelEn || entry.label || entry.key;
  }
  if (kind === "language") return languageLabel(entry.key);
  if (kind === "license") return licenseLabel(entry);
  if (kind === "risk" || kind === "momentum" || kind === "actionability") {
    return state.language === "zh" ? entry.labelZh || entry.label || entry.key : entry.labelEn || entry.label || entry.key;
  }
  if (kind === "topic") return state.language === "zh" ? entry.labelZh || entry.label || topicLabel(entry.key) : entry.labelEn || entry.label || entry.key;
  return entry.label || entry.key;
}

function renderDistributionBars(container, entries, kind, limit = 10) {
  if (!container) return;
  const visible = (entries || []).filter((entry) => entry.count > 0).slice(0, limit);
  if (!visible.length) {
    container.innerHTML = `<p class="brief-empty">${escapeHtml(t("emptyDistribution"))}</p>`;
    return;
  }
  container.innerHTML = visible
    .map((entry) => {
      const width = Math.max(4, Math.round(Number(entry.share || 0) * 100));
      const label = distributionLabel(entry, kind);
      const filter = overviewFilterValue(entry, kind);
      const filterAttr = filter
        ? ` type="button" data-overview-filter="${escapeHtml(JSON.stringify(filter))}" title="${escapeHtml(`${t("overviewFilterHint")}：${label}`)}"`
        : "";
      const tagName = filter ? "button" : "div";
      return `
        <${tagName} class="overview-bar-row"${filterAttr}>
          <header>
            <span>${escapeHtml(label)}</span>
            <strong>${fmtNumber(entry.count)} · ${percentText(entry.share)}</strong>
          </header>
          <div class="bar-track" aria-hidden="true"><div class="bar-fill" style="width:${width}%"></div></div>
        </${tagName}>
      `;
    })
    .join("");
}

function renderTopicCloud(container, entries) {
  if (!container) return;
  const merged = new Map();
  for (const entry of entries || []) {
    if (!entry?.count) continue;
    const label = distributionLabel(entry, "topic").trim();
    const key = label.toLowerCase();
    if (!key) continue;
    const previous = merged.get(key);
    if (previous) {
      previous.count += Number(entry.count || 0);
      previous.share += Number(entry.share || 0);
    } else {
      merged.set(key, {
        ...entry,
        label,
        count: Number(entry.count || 0),
        share: Number(entry.share || 0)
      });
    }
  }
  const visible = Array.from(merged.values())
    .sort((a, b) => b.count - a.count || distributionLabel(a, "topic").localeCompare(distributionLabel(b, "topic")))
    .slice(0, 28);
  if (!visible.length) {
    container.innerHTML = `<p class="brief-empty">${escapeHtml(t("emptyDistribution"))}</p>`;
    return;
  }
  const max = Math.max(1, ...visible.map((entry) => entry.count || 0));
  container.innerHTML = visible
    .map((entry) => {
      const weight = Math.max(1, Math.min(4, Math.ceil(((entry.count || 0) / max) * 4)));
      const label = distributionLabel(entry, "topic");
      const filter = overviewFilterValue(entry, "topic");
      const filterAttr = filter
        ? ` type="button" data-overview-filter="${escapeHtml(JSON.stringify(filter))}" title="${escapeHtml(`${t("overviewFilterHint")}：${label}`)}"`
        : "";
      const tagName = filter ? "button" : "span";
      return `<${tagName} class="topic-chip weight-${weight}"${filterAttr}>${escapeHtml(label)}<strong>${fmtNumber(entry.count)}</strong></${tagName}>`;
    })
    .join("");
}

function renderBars(container, data, kind = "") {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map((entry) => entry[1]));
  container.innerHTML = entries
    .slice(0, 14)
    .map(([label, value]) => {
      const width = Math.max(3, (value / max) * 100);
      return `
        <div class="bar-row">
          <header><span>${escapeHtml(localizedDistributionLabel(label, kind))}</span><strong>${fmtNumber(value)}</strong></header>
          <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
        </div>
      `;
    })
    .join("");
}

function rankChangeText(change) {
  if (change === null || change === undefined) return t("rankNew");
  if (change > 0) return `${t("rankUp")} ${change}`;
  if (change < 0) return `${t("rankDown")} ${Math.abs(change)}`;
  return t("rankSame");
}

function rankChangeClass(change) {
  if (change === null || change === undefined) return "new";
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "same";
}

function rankPodiumClass(rank) {
  return Number(rank) >= 1 && Number(rank) <= 3 ? `podium-${rank}` : "";
}

function rankMedalLabel(rank) {
  return state.language === "zh" ? `第 ${rank} 名` : `Top ${rank}`;
}

function rankChangeValue(change) {
  if (change === null || change === undefined) return state.language === "zh" ? "新" : "NEW";
  if (change === 0) return "0";
  return String(Math.abs(change));
}

function rankChangeIcon(change) {
  const cls = rankChangeClass(change);
  const iconName = cls === "up" ? "arrowUp" : cls === "down" ? "arrowDown" : cls === "new" ? "plusCircle" : "minus";
  const label = rankChangeText(change);
  return `
    <small class="rank-change ${escapeHtml(cls)}" aria-label="${escapeHtml(label)}">
      ${iconOnly(iconName, label)}
      <span aria-hidden="true">${escapeHtml(rankChangeValue(change))}</span>
    </small>
  `;
}

function filterLabel(filterKey, value) {
  const source = FILTERS[filterKey] || [];
  const match = source.find((item) => item[0] === value);
  return match ? localized(match) : value || "-";
}

function memoryPreferenceLabel(kind, key, items = []) {
  if (kind === "category") return categoryLabel({ key });
  if (kind === "useCase") return useCaseLabelFromKey(key, items);
  if (kind === "language") return languageLabel(key);
  if (kind === "license") return filterLabel("license", key);
  if (kind === "risk") return filterLabel("risk", key);
  return key;
}

function memoryEventLabel(type) {
  const normalized = String(type || "").replaceAll("-", "_");
  const labels = {
    favorite: "eventFavorite",
    unfavorite: "eventUnfavorite",
    star: "eventStar",
    unstar: "eventUnstar",
    fork: "eventFork",
    open_github: "eventOpenGithub",
    select_project: "eventSelectProject",
    copy_url: "eventCopyUrl",
    triage_note: "eventTriageNote",
    ai_analyze: "eventAiAnalyze",
    leaderboard_positive: "eventLeaderboardPositive",
    leaderboard_strong_positive: "eventLeaderboardStrongPositive",
    leaderboard_negative: "eventLeaderboardNegative",
    manual_memory_edit: "eventManualMemoryEdit"
  };
  if (normalized === "watch") return t("eventFavorite");
  return t(labels[normalized] || type || "eventManualMemoryEdit");
}

function humanizeLearningCopy(value = "") {
  return String(value || "")
    .replace(/Harness/g, state.language === "zh" ? "质量复盘" : "quality review")
    .replace(/harness/g, state.language === "zh" ? "质量复盘" : "quality review")
    .replace(/模型调优/g, "AI 优化")
    .replace(/AI tuning/g, "AI optimization");
}

function preferenceStrength(value, scope = "positive") {
  const score = Number(value || 0);
  if (score >= (scope === "negative" ? 18 : 24)) {
    return {
      label: t("preferenceVeryStrong"),
      cls: "very-strong",
      impact: t("preferenceImpactHigh"),
      range: scope === "negative" ? "18-30" : "24-40"
    };
  }
  if (score >= (scope === "negative" ? 10 : 14)) {
    return {
      label: t("preferenceStrong"),
      cls: "strong",
      impact: t("preferenceImpactHigh"),
      range: scope === "negative" ? "10-18" : "14-24"
    };
  }
  if (score >= (scope === "negative" ? 4 : 5)) {
    return {
      label: t("preferenceMedium"),
      cls: "medium",
      impact: t("preferenceImpactMedium"),
      range: scope === "negative" ? "4-10" : "5-14"
    };
  }
  return {
    label: t("preferenceWeak"),
    cls: "weak",
    impact: t("preferenceImpactLow"),
    range: scope === "negative" ? "1-4" : "1-5"
  };
}

function preferenceBucketName(kind) {
  const map = {
    category: "categories",
    useCase: "useCases",
    language: "languages",
    license: "licenses",
    risk: "riskLevels"
  };
  return map[kind] || "";
}

function manualPreferenceValue(memory = {}, kind, key, scope = "positive") {
  const root = scope === "negative" ? memory.manualNegativePreferences : memory.manualPreferences;
  const bucket = preferenceBucketName(kind);
  return Number(root?.[bucket]?.[key] || 0);
}

function learnedPreferenceValue(total, manual) {
  return Math.max(0, Number(total || 0) - Number(manual || 0));
}

function preferenceEntryCount(...groups) {
  return groups.reduce((sum, values = {}) => sum + Object.values(values || {}).filter((value) => Number(value) > 0).length, 0);
}

function renderLeaderboardTabs() {
  if (!elements.leaderboardTabs) return;
  elements.leaderboardTabs.innerHTML = LEADERBOARD_PERIODS.map(([period, labelKey]) => {
    const active = state.leaderboardPeriod === period ? "active" : "";
    return `<button class="${active}" type="button" data-leaderboard-period="${period}">${escapeHtml(t(labelKey))}</button>`;
  }).join("");
}

function isPlanTransitionActive() {
  return Boolean(state.planTransition?.active);
}

function planTransitionLabel() {
  return state.planTransition?.planName || observationPlanLabel(state.observationPlans?.active || {}) || t("defaultObservationPlan");
}

function transitionProgressText() {
  const progress = state.scanProgress || {};
  const parts = [];
  if (progress.status === "running" || progress.running) {
    parts.push(`${Math.max(0, Math.min(100, Math.round(progress.percent || 0)))}%`);
    if (progress.stage) parts.push(scanStageLabel(progress.stage));
    const eta = scanEtaLabel(progress);
    if (eta) parts.push(eta);
  }
  return parts.join(" · ");
}

function transitionHeadingText() {
  const progress = normalizeScanProgress(state.scanProgress || {});
  if (progress.status === "running" || progress.running) {
    return `${t("scanRunning")} · ${Math.max(0, Math.min(100, Math.round(progress.percent || 0)))}%`;
  }
  if (progress.status === "completed") {
    return [t("scanStageCompleted"), scanActualDurationLabel(progress)].filter(Boolean).join(" · ");
  }
  if (progress.status === "failed") {
    return t("scanStageFailed");
  }
  return t("scanRunning");
}

function activeObservationPlanLabel() {
  const plans = state.observationPlans?.plans || [];
  const active = state.observationPlans?.active || plans.find((plan) => plan.active) || {};
  return observationPlanLabel(active) || t("defaultObservationPlan");
}

function renderProjectPoolHeading(summaryContent = "") {
  const planLabel = activeObservationPlanLabel();
  const summary = Array.isArray(summaryContent)
    ? summaryContent
        .filter((item) => item?.text)
        .map((item, index) => `${index ? '<span class="project-count-separator">·</span>' : ""}<span class="${escapeHtml(item.className || "")}">${escapeHtml(item.text)}</span>`)
        .join("")
    : escapeHtml(String(summaryContent || "").trim());
  return `
    <button class="project-plan-chip" type="button" data-action="open-observation-plans" aria-label="${escapeHtml(t("activeObservationPlan"))}：${escapeHtml(planLabel)}">
      ${iconSvg("settings")}
      <span>${escapeHtml(t("activeObservationPlan"))}</span>
      <strong>${escapeHtml(planLabel)}</strong>
    </button>
    ${summary ? `<span class="project-count-summary">${summary}</span>` : ""}
  `;
}

function planTransitionCopy() {
  const failed = state.planTransition?.status === "failed";
  if (failed) {
    return {
      title: t("planSwitchFailedTitle"),
      body: state.planTransition?.message || t("planSwitchFailedBody")
    };
  }
  const copy = scanCopyForProgress(state.scanProgress || {});
  return {
    title: copy.title || t("planSwitchingTitle"),
    body: copy.body || t("planSwitchingBody")
  };
}

function renderPlanTransitionState(surface = "projects") {
  const failed = state.planTransition?.status === "failed";
  const progressText = failed ? "" : transitionProgressText();
  const copy = planTransitionCopy();
  return `
    <div class="plan-transition-state ${failed ? "failed" : ""} ${escapeHtml(surface)}" data-transition-mode="${failed ? "failed" : "running"}">
      <div class="plan-transition-icon" aria-hidden="true">
        ${failed ? iconSvg("x") : `<span class="scan-spinner"></span>`}
      </div>
      <div>
        <p class="eyebrow plan-transition-label">${escapeHtml(planTransitionLabel())}</p>
        <h3 class="plan-transition-title">${escapeHtml(copy.title)}</h3>
        <p class="plan-transition-body">${escapeHtml(copy.body)}</p>
        <div class="plan-transition-meta">
          <span>${escapeHtml(t("planSwitchingLearningLocked"))}</span>
          <span>${escapeHtml(t("planSwitchingCacheHint"))}</span>
          <span class="plan-transition-progress" ${progressText ? "" : "hidden"}>${escapeHtml(progressText)}</span>
        </div>
      </div>
    </div>
  `;
}

function updatePlanTransitionState(container, surface = "projects") {
  if (!container) return;
  const failed = state.planTransition?.status === "failed";
  const mode = failed ? "failed" : "running";
  const existing = container.querySelector(`.plan-transition-state.${surface}`);
  if (!existing || existing.dataset.transitionMode !== mode) {
    container.innerHTML = renderPlanTransitionState(surface);
    return;
  }
  const progressText = failed ? "" : transitionProgressText();
  const copy = planTransitionCopy();
  const labelNode = existing.querySelector(".plan-transition-label");
  const titleNode = existing.querySelector(".plan-transition-title");
  const bodyNode = existing.querySelector(".plan-transition-body");
  const progressNode = existing.querySelector(".plan-transition-progress");
  if (labelNode) labelNode.textContent = planTransitionLabel();
  if (titleNode) titleNode.textContent = copy.title;
  if (bodyNode) bodyNode.textContent = copy.body;
  if (progressNode) {
    progressNode.textContent = progressText;
    progressNode.hidden = !progressText;
  }
}

function renderProjectPoolTransitionState() {
  if (elements.projectCount) {
    elements.projectCount.innerHTML = renderProjectPoolHeading(transitionHeadingText());
  }
  if (elements.projectRows) {
    updatePlanTransitionState(elements.projectRows, "projects");
  }
}

function renderLeaderboardTransitionState() {
  if (!elements.leaderboardList) return;
  if (elements.leaderboardArchive) elements.leaderboardArchive.disabled = true;
  if (elements.leaderboardMeta) {
    elements.leaderboardMeta.textContent = `${transitionHeadingText()} · ${planTransitionLabel()}`;
  }
  updatePlanTransitionState(elements.leaderboardList, "leaderboard");
}

function beginPlanTransition(plan = {}) {
  state.planTransition = {
    active: true,
    status: "running",
    planId: plan.id || "",
    planName: observationPlanLabel(plan),
    message: ""
  };
  state.projects = [];
  state.projectPool = {
    ...state.projectPool,
    items: [],
    total: 0,
    page: 1
  };
  state.selected = null;
  state.restoredSelectedFullName = "";
  state.pendingRestoredProjectFullName = "";
  state.leaderboardSelectedFullName = "";
  renderProjectPoolTransitionState();
  renderLeaderboardTransitionState();
  renderDetail(null);
}

function completePlanTransition() {
  state.planTransition = {
    active: false,
    status: "",
    planId: "",
    planName: "",
    message: ""
  };
  renderProjectPoolPage();
  renderLeaderboard(state.leaderboard);
  renderDetail(state.selected);
}

function failPlanTransition(message = "") {
  if (!isPlanTransitionActive()) return;
  state.planTransition = {
    ...(state.planTransition || {}),
    active: true,
    status: "failed",
    message: message || t("planSwitchFailedBody")
  };
  state.projects = [];
  state.projectPool = {
    ...state.projectPool,
    items: [],
    total: 0,
    page: 1
  };
  state.selected = null;
  state.restoredSelectedFullName = "";
  state.pendingRestoredProjectFullName = "";
  renderProjectPoolTransitionState();
  renderLeaderboardTransitionState();
  renderDetail(null);
}

function preferenceRows(values = {}, kind, items = [], options = {}) {
  const scope = options.scope || "positive";
  const limit = options.limit ?? Infinity;
  const memory = options.memory || {};
  const entries = Object.entries(values)
    .filter(([, value]) => Number(value) > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, Number.isFinite(limit) ? limit : undefined);
  if (!entries.length) {
    return `<p class="memory-empty">${escapeHtml(scope === "negative" ? t("noNegativeMemory") : t("memoryEmpty"))}</p>`;
  }
  const max = Math.max(1, ...entries.map((entry) => Number(entry[1])));
  return entries
    .map(([key, value]) => {
      const label = memoryPreferenceLabel(kind, key, items);
      const width = Math.max(8, (Number(value) / max) * 100);
      const manual = manualPreferenceValue(memory, kind, key, scope);
      const learned = learnedPreferenceValue(value, manual);
      const strength = preferenceStrength(value, scope);
      const suggested = t("preferenceSuggestedRange").replace("{range}", strength.range);
      return `
        <div class="memory-row">
          <header>
            <div class="memory-row-title">
              <span>${escapeHtml(label)}</span>
              <strong class="preference-level ${escapeHtml(strength.cls)}">${escapeHtml(strength.label)} · ${fmtNumber(value)}</strong>
            </div>
            <div class="memory-controls compact">
              <button class="memory-icon-button has-tooltip" type="button" data-action="memory-adjust" data-memory-kind="${escapeHtml(kind)}" data-memory-scope="${escapeHtml(scope)}" data-memory-key="${escapeHtml(key)}" data-delta="-2" aria-label="${escapeHtml(t("decreasePreference"))}" data-tooltip="${escapeHtml(t("decreasePreference"))}">${iconOnly("arrowDown", t("decreasePreference"))}</button>
              <button class="memory-icon-button has-tooltip" type="button" data-action="memory-adjust" data-memory-kind="${escapeHtml(kind)}" data-memory-scope="${escapeHtml(scope)}" data-memory-key="${escapeHtml(key)}" data-delta="2" aria-label="${escapeHtml(t("increasePreference"))}" data-tooltip="${escapeHtml(t("increasePreference"))}">${iconOnly("arrowUp", t("increasePreference"))}</button>
              <button class="memory-icon-button memory-remove-button has-tooltip" type="button" data-action="memory-adjust" data-memory-kind="${escapeHtml(kind)}" data-memory-scope="${escapeHtml(scope)}" data-memory-key="${escapeHtml(key)}" data-value="0" aria-label="${escapeHtml(t("removePreference"))}" data-tooltip="${escapeHtml(t("removePreference"))}">${iconOnly("x", t("removePreference"))}</button>
            </div>
          </header>
          <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
          <div class="memory-row-meta">
            <span>${escapeHtml(strength.impact)}</span>
            <span>${escapeHtml(suggested)}</span>
            <span>${escapeHtml(t("learnedFromBehavior"))} ${fmtNumber(learned)} · ${escapeHtml(t("manualCalibration"))} ${fmtNumber(manual)}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderMemoryPanel(memory = {}, items = []) {
  if (!elements.memoryPanel) return;
  const activePreferences = preferenceEntryCount(memory.preferences?.categories, memory.preferences?.useCases);
  const negativeSignals = preferenceEntryCount(memory.negativePreferences?.categories, memory.negativePreferences?.useCases);
  const behaviorSamples = (memory.events || []).length;
  const contextChunks = (memory.context?.chunks || []).length;
  elements.memoryPanel.innerHTML = `
    <div class="memory-snapshot-grid">
      <div class="memory-stat">
        <span>${escapeHtml(t("activePreferences"))}</span>
        <strong>${fmtNumber(activePreferences)}</strong>
      </div>
      <div class="memory-stat">
        <span>${escapeHtml(t("negativeSignals"))}</span>
        <strong>${fmtNumber(negativeSignals)}</strong>
      </div>
      <div class="memory-stat">
        <span>${escapeHtml(t("behaviorSamples"))}</span>
        <strong>${fmtNumber(behaviorSamples)}</strong>
      </div>
      <div class="memory-stat">
        <span>${escapeHtml(t("compressedChunks"))}</span>
        <strong>${fmtNumber(contextChunks)}</strong>
      </div>
      <div class="memory-stat">
        <span>${escapeHtml(t("learningMode"))}</span>
        <strong>${escapeHtml(memory.harness?.lastTuning ? t("llmLearningShort") : t("localLearningShort"))}</strong>
      </div>
    </div>
  `;
}

function compressedEventCount(context = {}) {
  const factValue = Number(
    context.permanentFacts?.find((item) => String(item).startsWith("compressed_events="))?.split("=")[1] || 0
  );
  return factValue || (context.chunks || []).reduce((sum, chunk) => sum + Number(chunk.eventCount || 0), 0);
}

function renderLearningLoop(memory = {}) {
  if (!elements.learningLoop) return;
  const recentEvents = memory.events || memory.shortTerm || [];
  const behaviorSamples = recentEvents.length;
  const activePreferences = preferenceEntryCount(memory.preferences?.categories, memory.preferences?.useCases);
  const negativeSignals = preferenceEntryCount(memory.negativePreferences?.categories, memory.negativePreferences?.useCases);
  const antiBubble = normalizedAntiBubblePercent(memory.antiBubble || {});
  const hasAiTuning = Boolean(memory.harness?.lastTuning);
  const actionSummary = [...new Set(recentEvents.slice(0, 3).map((event) => memoryEventLabel(event.type || event.reason)).filter(Boolean))].join("、");
  const actionBody = behaviorSamples
    ? t("learningLoopActionBody")
        .replace("{count}", fmtNumber(behaviorSamples))
        .replace("{actions}", actionSummary || t("recentBehavior"))
    : t("learningLoopActionEmpty");
  const learnedBody = activePreferences || negativeSignals
    ? t("learningLoopLearnedBody")
        .replace("{positive}", fmtNumber(activePreferences))
        .replace("{negative}", fmtNumber(negativeSignals))
        .replace("{events}", fmtNumber(behaviorSamples))
    : t("learningLoopLearnedEmpty");
  const nextBody = activePreferences || negativeSignals
    ? `${t("learningLoopNextBody").replace("{explore}", fmtNumber(antiBubble.explorationRatio))} ${t(hasAiTuning ? "learningLoopNextAi" : "learningLoopNextRule")}`
    : t("learningLoopNextEmpty");
  const cards = [
    ["learningLoopAction", fmtNumber(behaviorSamples), actionBody, behaviorSamples > 0 ? "recentBehavior" : ""],
    ["learningLoopLearned", fmtNumber(activePreferences + negativeSignals), learnedBody, activePreferences + negativeSignals > 0 ? "preferenceProfile" : ""],
    ["learningLoopNext", `${fmtNumber(antiBubble.explorationRatio)}%`, nextBody, "antiBubblePolicy"]
  ];
  const inlineStatus = state.learningInlineStatus
    ? `<span class="learning-inline-status ${escapeHtml(state.learningInlineStatus.kind || "")}">${iconLabel(
        state.learningInlineStatus.kind === "failed" || state.learningInlineStatus.kind === "canceled" ? "x" : "check",
        state.learningInlineStatus.label || ""
      )}</span>`
    : "";
  elements.learningLoop.innerHTML =
    inlineStatus +
    cards
    .map(([titleKey, value, body, target]) => {
      const clickable = target ? "button" : "article";
      const targetLabel = target === "preferenceProfile" ? t("preferenceProfile") : target === "antiBubblePolicy" ? t("antiBubblePolicy") : t("recentBehavior");
      const attrs = target
        ? `type="button" data-action="scroll-learning-section" data-learning-section="${escapeHtml(target)}" aria-label="${escapeHtml(targetLabel)}"`
        : "";
      return `
        <${clickable} class="learning-loop-card ${target ? "clickable" : ""}" ${attrs}>
          <span>${escapeHtml(t(titleKey))}</span>
          <strong>${escapeHtml(value)}</strong>
          <p>${escapeHtml(body)}</p>
        </${clickable}>
      `;
    })
    .join("");
}

function renderLeaderboard(leaderboard) {
  if (!leaderboard || !elements.leaderboardList) return;
  if (isPlanTransitionActive()) {
    renderLeaderboardTransitionState();
    return;
  }
  renderLeaderboardTabs();

  const archives = leaderboard.archiveDates || [];
  elements.leaderboardArchive.innerHTML = archives.length
    ? [
        `<option value="">${escapeHtml(t("latestArchive"))}</option>`,
        ...archives.map((date) => `<option value="${escapeHtml(date)}" ${leaderboard.date === date ? "selected" : ""}>${escapeHtml(date)}</option>`)
      ].join("")
    : `<option value="">${escapeHtml(t("noArchive"))}</option>`;
  elements.leaderboardArchive.disabled = state.leaderboardPeriod !== "daily" || !archives.length;

  const generated = leaderboard.generatedAt ? `${t("generatedAt")} ${fmtDate(leaderboard.generatedAt)}` : "";
  elements.leaderboardMeta.textContent = [t("leaderboardSource"), generated].filter(Boolean).join(" · ");

  const items = leaderboard.items || [];
  const noticeHtml = renderLeaderboardDismissNotice();
  elements.leaderboardList.innerHTML = items.length
    ? `${noticeHtml}${items
        .map((project) => {
          const selected = state.leaderboardSelectedFullName === project.fullName ? "selected" : "";
          return `
            <article class="leaderboard-item ${selected}" data-full-name="${escapeHtml(project.fullName)}">
              <span class="leaderboard-rank-select" aria-hidden="true">
                <span class="rank-cell ${rankPodiumClass(project.rank)}">
                  ${rankPodiumClass(project.rank) ? iconOnly("trophy", rankMedalLabel(project.rank), "rank-medal") : ""}
                  ${rankPodiumClass(project.rank) ? "" : `<strong>${project.rank}</strong>`}
                  ${rankChangeIcon(project.rankChange)}
                </span>
              </span>
              <span class="leaderboard-main">
                <span class="leaderboard-select leaderboard-title-select">
                  <span class="repo-title">
                    <span class="repo-name-line">
                      <strong>${escapeHtml(displayProjectName(project))}</strong>
                      ${renderProjectRecordHints(project)}
                    </span>
                    <span class="repo-meta-line">
                      ${renderProjectMetaTags(project)}
                    </span>
                  </span>
                </span>
                <span class="leaderboard-select leaderboard-description-select">
                  <span class="repo-description">${escapeHtml(projectBrief(project))}</span>
                </span>
                <span class="leaderboard-github-row">
                  ${githubActionButtons(project, "compact")}
                  <span class="mini-metric trend-tag has-tooltip" data-full-name="${escapeHtml(project.fullName)}" data-tooltip="${escapeHtml(projectTrendHint(project))}">${escapeHtml(projectTrendLabel(project))}</span>
                </span>
              </span>
              <div class="leaderboard-score">
                <div class="leaderboard-actions">
                  ${favoriteActionButton(project, "compact")}
                  ${dismissProjectButton(project, "compact", "leaderboard")}
                  <a class="repo-link repo-link-icon has-tooltip" href="${escapeHtml(safeExternalUrl(project.url, { hosts: ["github.com"] }))}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(t("openGitHub"))}" data-tooltip="${escapeHtml(t("openGitHub"))}" data-memory-link="open_github" data-full-name="${escapeHtml(project.fullName)}">${iconOnly("external", t("openGitHub"))}</a>
                </div>
              </div>
            </article>
          `;
        })
        .join("")}`
    : `${noticeHtml}<div class="empty-detail"><p class="eyebrow">${escapeHtml(t("leaderboardDesk"))}</p><h3>${escapeHtml(t("noArchive"))}</h3></div>`;

  const memory = setMemory(leaderboard.memory || {}, { render: false });
  elements.leaderboardLogic.innerHTML = `
    <p>${escapeHtml(t("rankingLogicCopy"))}</p>
    <div class="logic-matrix">
      <span>${escapeHtml(t("opportunity"))}</span>
      <span>${escapeHtml(t("momentum"))}</span>
      <span>${escapeHtml(t("actionability"))}</span>
      <span>${escapeHtml(t("projectRisk"))}</span>
      <span>${escapeHtml(t("longTermPreference"))}</span>
    </div>
  `;
  renderLearning(memory);
}

function renderMetricCard(key, value) {
  const hintMap = {
    overallScore: "scoreOverallHint",
    relevanceHitRate: "scoreRelevanceHint",
    repetitionControl: "scoreRepetitionHint",
    actionabilityFit: "scoreActionabilityHint"
  };
  const hint = t(hintMap[key] || "scoreScale");
  return `
    <article class="learning-score-card">
      <span>${escapeHtml(t(key))}</span>
      <div class="learning-score-value">
        <strong>${value ?? "-"}</strong>
      </div>
      <p>${escapeHtml(hint)}</p>
    </article>
  `;
}

function renderLearningEvolution(memory = {}) {
  if (!elements.learningEvolution) return;
  const harness = memory.harness || {};
  const context = memory.context || {};
  const chunk = (context.chunks || [])[0];
  const rows = [
    harness.lastTuning && {
      title: t("tuningEvolution"),
      at: harness.lastTuning.at || harness.lastTuning.createdAt,
      body: state.language === "zh" ? harness.lastTuning.summaryZh || harness.lastTuning.summaryEn : harness.lastTuning.summaryEn || harness.lastTuning.summaryZh
    },
    (context.compressedAt || chunk?.compressedAt) && {
      title: t("contextEvolution"),
      at: context.compressedAt || chunk?.compressedAt,
      body: state.language === "zh" ? context.summaryZh || chunk?.summaryZh : context.summaryEn || chunk?.summaryEn || context.summaryZh
    }
  ].filter(Boolean);

  elements.learningEvolution.innerHTML = rows.length
    ? rows
        .slice(0, 2)
        .map(
          (row) => `
            <div class="evolution-line">
              <div class="evolution-line-head">
                <strong>${escapeHtml(row.title)}</strong>
                <span>${escapeHtml(row.at ? fmtDate(row.at) : t("latestEvolution"))}</span>
              </div>
              <p>${escapeHtml(humanizeLearningCopy(row.body || t("noEvolutionYet")))}</p>
            </div>
          `
        )
        .join("")
    : `
      <div class="evolution-line">
        <div class="evolution-line-head">
          <strong>${escapeHtml(t("latestEvolution"))}</strong>
          <span>${escapeHtml(t("noEvolutionYet"))}</span>
        </div>
      </div>
    `;
}

function renderPreferenceGroup(titleKey, kind, values, memory, items, scope = "positive") {
  const anchor = scope === "positive" && kind === "category" ? ` id="learning-category-preference"` : "";
  const count = preferenceEntryCount(values);
  return `
    <div class="learning-pref-group"${anchor}>
      <h4><span>${escapeHtml(t(titleKey))}</span><small class="preference-group-count">${fmtNumber(count)}</small></h4>
      <div class="learning-pref-list">
        ${preferenceRows(values || {}, kind, items, { scope, memory })}
      </div>
    </div>
  `;
}

function localizedSemanticLabel(payload = {}) {
  return state.language === "zh" ? payload.labelZh || payload.labelEn || "" : payload.labelEn || payload.labelZh || "";
}

function localizedUseCaseLabel(useCase = {}) {
  return state.language === "zh" ? useCase.labelZh || useCase.label || useCase.labelEn || "" : useCase.labelEn || useCase.label || useCase.labelZh || "";
}

function syncDismissedSamplesLayout(expanded) {
  const isExpanded = Boolean(expanded);
  const shell = document.querySelector("#view-learning .learning-shell");
  const dismissedPanel = document.querySelector("#learning-dismissed-projects");
  const preferencePanel = document.querySelector("#view-learning .learning-preference-panel");
  const preferenceHead = preferencePanel?.querySelector(".learning-panel-head");
  const preferenceGrid = preferencePanel?.querySelector(".learning-grid");
  const preferenceToggle = document.querySelector("#preference-profile-toggle");
  shell?.classList.toggle("is-dismissed-expanded", isExpanded);
  dismissedPanel?.classList.toggle("is-expanded", isExpanded);
  preferencePanel?.classList.toggle("is-collapsed-for-dismissed", isExpanded);
  preferenceGrid?.setAttribute("aria-hidden", isExpanded ? "true" : "false");
  if (preferenceHead) {
    if (isExpanded) {
      preferenceHead.dataset.action = "expand-preference-panel";
      preferenceHead.setAttribute("role", "button");
      preferenceHead.setAttribute("tabindex", "0");
      preferenceHead.setAttribute("aria-expanded", "false");
      preferenceHead.setAttribute("aria-label", t("expandPreferenceProfile"));
    } else {
      preferenceHead.removeAttribute("data-action");
      preferenceHead.removeAttribute("role");
      preferenceHead.removeAttribute("tabindex");
      preferenceHead.removeAttribute("aria-expanded");
      preferenceHead.removeAttribute("aria-label");
    }
  }
  if (preferenceToggle) {
    preferenceToggle.hidden = !isExpanded;
    preferenceToggle.setAttribute("aria-expanded", isExpanded ? "false" : "true");
    preferenceToggle.setAttribute("aria-label", t("expandPreferenceProfile"));
    preferenceToggle.innerHTML = iconLabel("arrowDown", t("expandPreferenceProfileShort"));
  }
}

function dismissedListScrollState() {
  const list = elements.learningDismissed?.querySelector(".dismissed-sample-list");
  return {
    hasList: Boolean(list),
    top: list?.scrollTop || 0,
    left: list?.scrollLeft || 0,
    pageX: window.scrollX || 0,
    pageY: window.scrollY || 0
  };
}

function restoreDismissedListScroll(scrollState) {
  if (!scrollState) return;
  const list = elements.learningDismissed?.querySelector(".dismissed-sample-list");
  if (scrollState.hasList && list) {
    list.scrollTop = scrollState.top;
    list.scrollLeft = scrollState.left;
  }
  window.scrollTo(scrollState.pageX, scrollState.pageY);
}

function revealDismissedEditor(fullName, scrollState) {
  if (!fullName) return;
  const list = elements.learningDismissed?.querySelector(".dismissed-sample-list");
  const card = list?.querySelector(`.dismissed-sample-card[data-full-name="${cssEscape(fullName)}"]`);
  const target = card?.querySelector(".dismissed-feedback-grid") || card;
  if (!list || !target) return;

  const padding = 8;
  const listRect = list.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const visibleTop = listRect.top + padding;
  const visibleBottom = listRect.bottom - padding;

  if (targetRect.height > listRect.height - padding * 2 || targetRect.top < visibleTop) {
    list.scrollTop -= visibleTop - targetRect.top;
  } else if (targetRect.bottom > visibleBottom) {
    list.scrollTop += targetRect.bottom - visibleBottom;
  }
  if (scrollState) window.scrollTo(scrollState.pageX, scrollState.pageY);
}

function showDismissedFeedbackInlineStatus(fullName, kind, label) {
  if (state.dismissedFeedbackInlineStatusTimer) {
    clearTimeout(state.dismissedFeedbackInlineStatusTimer);
  }
  state.dismissedFeedbackInlineStatus = { fullName, kind, label };
  renderDismissedProjectSamples();
  state.dismissedFeedbackInlineStatusTimer = setTimeout(() => {
    const statusFullName = state.dismissedFeedbackInlineStatus?.fullName || "";
    state.dismissedFeedbackInlineStatus = null;
    state.dismissedFeedbackInlineStatusTimer = null;
    if (statusFullName) clearDismissedFeedbackInlineStatusDom(statusFullName);
  }, 2000);
}

function renderDismissedProjectSamples() {
  if (!elements.learningDismissed) return;
  const scrollState = dismissedListScrollState();
  const items = state.dismissedProjects || [];
  const expanded = Boolean(state.dismissedSamplesExpanded);
  syncDismissedSamplesLayout(expanded);
  document.querySelector("[data-dismissed-panel-toggle]")?.setAttribute("aria-expanded", expanded ? "true" : "false");
  const countBadge = document.querySelector("#dismissed-count-badge");
  if (countBadge) countBadge.textContent = fmtNumber(items.length);
  const toggleIcon = document.querySelector("#dismissed-toggle-icon");
  if (toggleIcon) toggleIcon.innerHTML = foldToggleIconLabel(expanded);
  if (!expanded) {
    elements.learningDismissed.innerHTML = "";
    restoreDismissedListScroll(scrollState);
    return;
  }
  if (!items.length) {
    elements.learningDismissed.innerHTML = `
      <div class="dismissed-empty">
        <strong>${escapeHtml(t("noDismissedProjects"))}</strong>
        <span>${escapeHtml(t("noDismissedProjectsHint"))}</span>
      </div>
    `;
    restoreDismissedListScroll(scrollState);
    return;
  }
  elements.learningDismissed.innerHTML = `
    <div class="dismissed-sample-list ${items.length === 1 ? "is-single" : "is-scrollable"}">
      ${items
        .map((item) => {
          const feedback = item.feedback || {};
          const semantic = item.semantic || {};
          const negativeLearning = item.negativeLearning || {};
          const isEditing = state.editingDismissedFeedback === item.fullName;
          const autoTags = [
            {
              kind: "category",
              labelZh: item.category?.labelZh || item.category?.label,
              labelEn: item.category?.labelEn || item.category?.label
            },
            {
              kind: "useCase",
              labelZh: localizedUseCaseLabel(item.useCase),
              labelEn: localizedUseCaseLabel(item.useCase)
            }
          ].filter((tag) => tag.labelZh || tag.labelEn);
          const negativeTags = (negativeLearning.tags?.length ? negativeLearning.tags : autoTags)
            .filter((tag) => tag.kind !== "language" && tag.kind !== "license")
            .map((tag) => (state.language === "zh" ? tag.labelZh || tag.labelEn : tag.labelEn || tag.labelZh))
            .filter(Boolean)
            .slice(0, 3);
          const contextChips = [
            [t("feedbackProblem"), localizedSemanticLabel(semantic.problem)],
            [t("feedbackAudience"), localizedSemanticLabel(semantic.audience)],
            [t("feedbackShape"), localizedSemanticLabel(semantic.shape)]
          ].filter(([, value]) => value);
          const reason =
            feedback.reason ||
            feedback.note ||
            (state.language === "zh" ? negativeLearning.reasonZh || "" : negativeLearning.reasonEn || "");
          const reasonDraft = feedback.reason || feedback.note || "";
          const restoreBusy = isLocalActionBusy(item.fullName, "restore");
          const inlineStatus =
            state.dismissedFeedbackInlineStatus?.fullName === item.fullName
              ? `<span class="observation-plan-inline-status ${escapeHtml(state.dismissedFeedbackInlineStatus.kind || "")}">${iconLabel(
                  state.dismissedFeedbackInlineStatus.kind === "canceled" ? "x" : "check",
                  state.dismissedFeedbackInlineStatus.label || ""
                )}</span>`
              : "";
          const reasonInput = () => `
            <label class="dismissed-reason-editor">
              <span>${escapeHtml(t("feedbackNote"))}</span>
              <textarea data-dismissed-feedback="reason" placeholder="${escapeHtml(t("feedbackPlaceholder"))}">${escapeHtml(reasonDraft)}</textarea>
              <small>${escapeHtml(t("feedbackLearningHint"))}</small>
            </label>
          `;
          return `
            <article class="dismissed-sample-card" data-full-name="${escapeHtml(item.fullName)}">
              <header>
                <div>
                  <strong>${escapeHtml(item.name || item.fullName)}<span>${escapeHtml(fmtDate(item.dismissedAt))}</span></strong>
                </div>
                <div class="dismissed-sample-actions">
                  ${inlineStatus}
                  <button class="ghost-button ${restoreBusy ? "local-action-loading" : ""}" type="button" data-action="restore-dismissed-project" data-full-name="${escapeHtml(item.fullName)}" ${restoreBusy ? "disabled" : ""}>${renderActionLabelContent("refresh", t("restoreProject"), restoreBusy)}</button>
                  ${
                    isEditing
                      ? `
                        <button class="ghost-button" type="button" data-action="cancel-dismissed-feedback" data-full-name="${escapeHtml(item.fullName)}">${iconLabel("x", t("cancelDismissedFeedback"))}</button>
                        <button class="primary-button" type="button" data-action="save-dismissed-feedback" data-full-name="${escapeHtml(item.fullName)}">${iconLabel("save", t("saveFeedbackTags"))}</button>
                      `
                      : `<button class="ghost-button" type="button" data-action="edit-dismissed-feedback" data-full-name="${escapeHtml(item.fullName)}">${iconLabel("edit", t("editDismissedFeedback"))}</button>`
                  }
                </div>
              </header>
              <div class="dismissed-context-strip">
                ${contextChips.map(([label, value]) => `<b><span>${escapeHtml(label)}</span>${escapeHtml(value)}</b>`).join("")}
                ${
                  negativeTags.length
                    ? `<div class="dismissed-negative-inline"><span>${escapeHtml(t("feedbackNegativeTags"))}</span><div>${negativeTags.map((tag) => `<b>${escapeHtml(tag)}</b>`).join("")}</div></div>`
                    : ""
                }
              </div>
              <div class="dismissed-negative-learning">
                <p><strong>${escapeHtml(t("feedbackNegativeReason"))}</strong>${escapeHtml(reason)}</p>
              </div>
              ${
                isEditing
                  ? `
                    <div class="dismissed-feedback-grid" aria-label="${escapeHtml(t("editDismissedFeedback"))}">
                      ${reasonInput()}
                    </div>
                  `
                  : ""
              }
            </article>
          `;
        })
        .join("")}
    </div>
  `;
  restoreDismissedListScroll(scrollState);
  revealDismissedEditor(state.editingDismissedFeedback, scrollState);
}

function toggleDismissedSamples() {
  setDismissedSamplesExpanded(!state.dismissedSamplesExpanded);
}

function setDismissedSamplesExpanded(expanded) {
  state.dismissedSamplesExpanded = Boolean(expanded);
  if (!state.dismissedSamplesExpanded) {
    state.editingDismissedFeedback = "";
  }
  renderDismissedProjectSamples();
}

function collapseDismissedSamples() {
  if (!state.dismissedSamplesExpanded) return;
  setDismissedSamplesExpanded(false);
}

function expandPreferencePanel() {
  collapseDismissedSamples();
}

function clickStartedInsideDismissedPanel(event) {
  const path = typeof event.composedPath === "function" ? event.composedPath() : [];
  if (path.some((node) => node?.id === "learning-dismissed-projects")) return true;
  return Boolean(event.target.closest?.("#learning-dismissed-projects"));
}

function clearRangeLabel(range) {
  const match = MEMORY_CLEAR_RANGES.find(([value]) => value === range);
  return t(match?.[1] || "clearBehavior1d");
}

function clearMemoryConfirmMessage(range) {
  const label = clearRangeLabel(range);
  return range === "all"
    ? t("clearBehaviorConfirmAll")
    : t("clearBehaviorConfirm").replace("{range}", label);
}

function memoryClearControls() {
  const pendingRange = state.pendingMemoryClearRange || "";
  const busyRange = state.memoryClearBusyRange || "";
  const completeStatus = pendingRange ? "" : state.memoryClearCompleteStatus || "";
  const confirmMessage = pendingRange ? clearMemoryConfirmMessage(pendingRange) : "";
  const busy = Boolean(busyRange);
  const confirmLabel = busy ? t("clearBehaviorClearing") : t("clearBehaviorConfirmAction");
  return `
    <div class="memory-clear-box">
      <div>
        <strong>${escapeHtml(t("clearRecentBehavior"))}</strong>
        <span>${escapeHtml(t("clearBehaviorHint"))}</span>
      </div>
      <div class="memory-clear-actions">
        ${MEMORY_CLEAR_RANGES.map(
          ([range, labelKey]) => {
            const active = range === pendingRange ? "active" : "";
            return `<button class="${range === "all" ? "danger-button" : ""} ${active}" type="button" data-action="clear-memory-events" data-clear-range="${escapeHtml(range)}" ${busy ? "disabled" : ""}>${escapeHtml(t(labelKey))}</button>`;
          }
        ).join("")}
      </div>
      ${
        pendingRange
          ? `<div class="memory-clear-confirm-row" role="status">
              <span>${iconSvg("trash")}${escapeHtml(confirmMessage)}</span>
              <div class="memory-clear-confirm-actions">
                <button class="ghost-button memory-clear-confirm-button" type="button" data-action="cancel-clear-memory-events" ${busy ? "disabled" : ""}>${iconLabel("x", t("clearBehaviorCancelAction"))}</button>
                <button class="danger-button memory-clear-confirm-button memory-clear-confirm-primary ${busy ? "local-action-loading" : ""}" type="button" data-action="confirm-clear-memory-events" data-clear-range="${escapeHtml(pendingRange)}" ${busy ? "disabled" : ""}>${busy ? renderMiniActionBusy(confirmLabel) : iconLabel("trash", confirmLabel)}</button>
              </div>
            </div>`
          : completeStatus
            ? `<div class="memory-clear-complete-row" role="status">${iconLabel("check", completeStatus)}</div>`
          : ""
      }
    </div>
  `;
}

function normalizedAntiBubblePercent(antiBubble = {}) {
  const raw = {
    explorationRatio: Number(antiBubble.explorationRatio ?? 0.25),
    diversityFloor: Number(antiBubble.diversityFloor ?? 0.35),
    noveltyRatio: Number(antiBubble.noveltyRatio ?? 0.2)
  };
  const total = ANTI_BUBBLE_KEYS.reduce((sum, key) => sum + Math.max(0, raw[key] || 0), 0) || 1;
  const firstTwo = ANTI_BUBBLE_KEYS.slice(0, 2).map((key) => Math.round((Math.max(0, raw[key] || 0) / total) * 100));
  return {
    explorationRatio: firstTwo[0],
    diversityFloor: firstTwo[1],
    noveltyRatio: Math.max(0, 100 - firstTwo[0] - firstTwo[1])
  };
}

function antiBubbleValuesFromDom() {
  const values = {};
  ANTI_BUBBLE_KEYS.forEach((key) => {
    const input = document.querySelector(`[data-learning-setting="${key}"]`);
    values[key] = Number(input?.value || 0);
  });
  const total = ANTI_BUBBLE_KEYS.reduce((sum, key) => sum + values[key], 0);
  if (total !== 100) values.noveltyRatio += 100 - total;
  return values;
}

function renderAntiBubbleTotal(values = antiBubbleValuesFromDom()) {
  const total = ANTI_BUBBLE_KEYS.reduce((sum, key) => sum + Number(values[key] || 0), 0);
  const totalNode = document.querySelector("[data-learning-total]");
  if (totalNode) totalNode.textContent = `${total}%`;
}

function syncAntiBubbleSliders(changedInput) {
  const changedKey = changedInput.dataset.learningSetting;
  const changedValue = Math.max(0, Math.min(100, Number(changedInput.value || 0)));
  const remaining = Math.max(0, 100 - changedValue);
  const otherKeys = ANTI_BUBBLE_KEYS.filter((key) => key !== changedKey);
  const current = antiBubbleValuesFromDom();
  const otherTotal = otherKeys.reduce((sum, key) => sum + Math.max(0, current[key] || 0), 0);
  const next = { ...current, [changedKey]: changedValue };
  if (otherTotal <= 0) {
    next[otherKeys[0]] = Math.floor(remaining / 2);
    next[otherKeys[1]] = remaining - next[otherKeys[0]];
  } else {
    next[otherKeys[0]] = Math.round((Math.max(0, current[otherKeys[0]] || 0) / otherTotal) * remaining);
    next[otherKeys[1]] = remaining - next[otherKeys[0]];
  }
  ANTI_BUBBLE_KEYS.forEach((key) => {
    const input = document.querySelector(`[data-learning-setting="${key}"]`);
    const valueLabel = input?.parentElement?.querySelector("strong");
    if (input) input.value = String(next[key]);
    if (valueLabel) valueLabel.textContent = `${next[key]}%`;
  });
  renderAntiBubbleTotal(next);
}

function renderLearning(memory = state.memory || {}) {
  if (!elements.learningLoop) return;
  const items = state.leaderboard?.items || state.projects || [];
  const harness = memory.harness || {};
  const scorecard = harness.scorecard || {};
  const metrics = scorecard.metrics || {};
  const antiBubble = memory.antiBubble || {};
  const context = memory.context || {};
  const preferences = memory.preferences || {};
  const negative = memory.negativePreferences || {};
  const eventRows = (memory.events || memory.shortTerm || [])
    .map(
      (event) => `
        <div class="learning-event">
          <strong>${escapeHtml(memoryEventLabel(event.type || event.reason))}</strong>
          <span>${escapeHtml(compactText(event.fullName || "-", 34))}</span>
          <small>${escapeHtml(fmtDate(event.at))} · ${event.weight > 0 ? "+" : ""}${escapeHtml(String(event.weight || 0))}</small>
        </div>
      `
    )
    .join("");
  const recommendations = (harness.recommendations || scorecard.recommendations || [])
    .slice(0, 2)
    .map((item) => `<li>${escapeHtml(compactText(item, 64))}</li>`)
    .join("");
  const lastTuning = harness.lastTuning;

  renderLearningLoop(memory);
  renderMemoryPanel(memory, items);

  if (elements.learningHarness) {
    const localBusy = state.learningBusy === "harness";
    const llmBusy = state.learningBusy === "tune";
    elements.learningHarness.innerHTML = `
      <div class="harness-panel">
        <div class="harness-metrics">
          <span>${escapeHtml(t("diversityCoverage"))}: ${escapeHtml(String(metrics.diversityCoverage ?? "-"))}</span>
          <span>${escapeHtml(t("explorationFit"))}: ${escapeHtml(String(metrics.explorationFit ?? "-"))}</span>
          <span>${escapeHtml(t("licenseReadiness"))}: ${escapeHtml(String(metrics.licenseReadiness ?? "-"))}</span>
        </div>
        <div class="harness-actions">
          <section class="harness-action-card">
            <div>
              <strong>${escapeHtml(t("harnessLocalTitle"))}</strong>
              <span>${escapeHtml(t("harnessLocalHint"))}</span>
            </div>
          <button class="ghost-button" type="button" data-action="run-harness" ${state.learningBusy ? "disabled" : ""}>
              ${iconLabel(localBusy ? "refresh" : "shield", localBusy ? t("harnessLocalRunning") : t("harnessLocalAction"))}
            </button>
          </section>
          <section class="harness-action-card">
            <div>
              <strong>${escapeHtml(t("harnessLlmTitle"))}</strong>
              <span>${escapeHtml(t("harnessLlmHint"))}</span>
            </div>
            <button class="primary-button" type="button" data-action="tune-memory" ${state.learningBusy ? "disabled" : ""}>
              ${iconLabel(llmBusy ? "refresh" : "sparkle", llmBusy ? t("harnessLlmRunning") : t("harnessLlmAction"))}
            </button>
          </section>
        </div>
      </div>
    `;
  }

  elements.learningPositive.innerHTML = `
    ${renderPreferenceGroup("categoryPreference", "category", preferences.categories, memory, items, "positive")}
    ${renderPreferenceGroup("useCasePreference", "useCase", preferences.useCases, memory, items, "positive")}
  `;

  elements.learningNegative.innerHTML = `
    ${renderPreferenceGroup("categoryPreference", "category", negative.categories, memory, items, "negative")}
    ${renderPreferenceGroup("useCasePreference", "useCase", negative.useCases, memory, items, "negative")}
  `;
  renderDismissedProjectSamples();

  const antiBubblePercent = normalizedAntiBubblePercent(antiBubble);
  const antiBubbleTotal = ANTI_BUBBLE_KEYS.reduce((sum, key) => sum + antiBubblePercent[key], 0);
  const policySaveStatus = state.learningPolicySaveStatus || "";
  const policySaving = policySaveStatus === "saving";
  const policySaved = policySaveStatus === "saved";
  const policySaveLabel = policySaving ? t("githubActionBusy") : policySaved ? t("actionCompleted") : t("saveLearningPolicy");
  const policySaveIcon = policySaved ? "check" : "save";
  elements.learningPolicy.innerHTML = `
    <div class="anti-bubble-summary">
      <span>${escapeHtml(t("antiBubbleHint"))}</span>
      <strong>${escapeHtml(t("antiBubbleTotal"))} <b data-learning-total>${antiBubbleTotal}%</b></strong>
    </div>
    <label class="learning-slider">
      <span>${escapeHtml(t("explorationRatio"))}</span>
      <input type="range" min="0" max="100" step="1" data-learning-setting="explorationRatio" value="${antiBubblePercent.explorationRatio}" />
      <strong>${antiBubblePercent.explorationRatio}%</strong>
      <small class="learning-slider-help">${escapeHtml(t("explorationRatioHelp"))}</small>
    </label>
    <label class="learning-slider">
      <span>${escapeHtml(t("diversityFloor"))}</span>
      <input type="range" min="0" max="100" step="1" data-learning-setting="diversityFloor" value="${antiBubblePercent.diversityFloor}" />
      <strong>${antiBubblePercent.diversityFloor}%</strong>
      <small class="learning-slider-help">${escapeHtml(t("diversityFloorHelp"))}</small>
    </label>
    <label class="learning-slider">
      <span>${escapeHtml(t("noveltyRatio"))}</span>
      <input type="range" min="0" max="100" step="1" data-learning-setting="noveltyRatio" value="${antiBubblePercent.noveltyRatio}" />
      <strong>${antiBubblePercent.noveltyRatio}%</strong>
      <small class="learning-slider-help">${escapeHtml(t("noveltyRatioHelp"))}</small>
    </label>
    <button class="ghost-button full-width learning-policy-save-button ${policySaving ? "local-action-loading" : ""} ${policySaved ? "local-action-done" : ""}" type="button" data-action="save-learning-policy" aria-busy="${policySaving ? "true" : "false"}" ${policySaving ? "disabled" : ""}>${policySaving ? renderActionLabelContent("save", policySaveLabel, true) : iconLabel(policySaveIcon, policySaveLabel)}</button>
  `;

  const rawRecent = (memory.events || []).length;
  const compressedEvents = compressedEventCount(context);
  const contextSummary = state.language === "zh" ? context.summaryZh : context.summaryEn || context.summaryZh;
  const contextCompactStatus = state.learningContextCompactStatus || "";
  const contextCompacting = contextCompactStatus === "saving";
  const contextCompacted = contextCompactStatus === "saved";
  const contextCompactLabel = contextCompacting ? t("githubActionBusy") : contextCompacted ? t("actionCompleted") : t("compactContext");
  const contextCompactIcon = contextCompacted ? "check" : "archive";
  elements.learningContext.innerHTML = `
    <div class="context-stat-grid">
      <div class="memory-stat">
        <span>${escapeHtml(t("rawEvents"))}</span>
        <strong>${fmtNumber(rawRecent)}</strong>
      </div>
      <div class="memory-stat">
        <span>${escapeHtml(t("compressedChunks"))}</span>
        <strong>${fmtNumber((context.chunks || []).length)}</strong>
      </div>
      <div class="memory-stat">
        <span>${escapeHtml(t("compressedEvents"))}</span>
        <strong>${fmtNumber(compressedEvents)}</strong>
      </div>
    </div>
    ${
      contextSummary
        ? `<div class="learning-note compact context-summary-note">
            <strong>${escapeHtml(t("contextSummary"))}</strong>
            <span>${escapeHtml(contextSummary)}</span>
          </div>`
        : ""
    }
    <button class="ghost-button full-width learning-context-compact-button ${contextCompacting ? "local-action-loading" : ""} ${contextCompacted ? "local-action-done" : ""}" type="button" data-action="compact-memory" aria-busy="${contextCompacting ? "true" : "false"}" ${contextCompacting ? "disabled" : ""}>${contextCompacting ? renderActionLabelContent("archive", contextCompactLabel, true) : iconLabel(contextCompactIcon, contextCompactLabel)}</button>
  `;

  elements.learningEvents.innerHTML = `
    ${memoryClearControls()}
    <div class="learning-event-list">
      ${eventRows || `<p class="memory-empty">${escapeHtml(t("noBehavior"))}</p>`}
      ${eventRows ? `<div class="learning-event-bottom">${escapeHtml(t("behaviorBottomHint"))}</div>` : ""}
    </div>
  `;
}

function relayBoundedScroll(event) {
  const list = event.target.closest?.(".learning-event-list");
  if (!list) return;
  const container = list.closest(".learning-side-scroll");
  if (!container) return;
  const atTop = list.scrollTop <= 0;
  const atBottom = Math.ceil(list.scrollTop + list.clientHeight) >= list.scrollHeight;
  const shouldRelay = (event.deltaY < 0 && atTop) || (event.deltaY > 0 && atBottom);
  if (!shouldRelay) return;
  event.preventDefault();
  container.scrollTop += event.deltaY;
}

function renderProjects(response) {
  const projects = response.items || [];
  state.projectPool.items = projects;
  state.projectPool.total = response.total || projects.length;
  const pageCount = Math.max(1, Math.ceil(state.projectPool.total / state.projectPool.pageSize));
  state.projectPool.page = Math.max(1, Math.min(pageCount, Number(state.projectPool.page || 1)));
  state.projects = projects;
  if (isPlanTransitionActive()) {
    renderProjectPoolTransitionState();
    return;
  }
  const total = state.projectPool.total;
  elements.projectCount.innerHTML = renderProjectPoolHeading([
    { className: "project-match-count", text: `${t("matchesShort")} ${fmtNumber(total)}` },
    { className: "project-preview-count", text: `${t("previewShort")} ${fmtNumber(projects.length)}` }
  ]);

  const rowsHtml = projects
    .map((project) => {
      const selectedFullName = state.selected?.fullName || state.restoredSelectedFullName || "";
      const selected = selectedFullName === project.fullName ? "selected" : "";
      const description = projectBrief(project);
      return `
        <article class="repo-item ${selected}" data-full-name="${escapeHtml(project.fullName)}">
          <span class="repo-score-select" aria-hidden="true">
            <span class="repo-score-rail">
              <strong>${project.scores?.opportunity || 0}</strong>
              <small>${state.language === "zh" ? "分" : "Score"}</small>
            </span>
          </span>
          <span class="repo-main">
            <span class="repo-title">
              <span class="repo-main-select repo-name-select">
                <span class="repo-name-line">
                  <strong>${escapeHtml(displayProjectName(project))}</strong>
                  ${renderProjectRecordHints(project)}
                </span>
              </span>
              <span class="repo-meta-line">
                ${renderProjectMetaTags(project)}
              </span>
            </span>
            <span class="repo-main-select">
              <span class="repo-description">${escapeHtml(description)}</span>
            </span>
            <span class="repo-github-row">
              ${githubActionButtons(project, "compact")}
              <span class="mini-metric trend-tag has-tooltip" data-full-name="${escapeHtml(project.fullName)}" data-tooltip="${escapeHtml(projectTrendHint(project))}">${escapeHtml(projectTrendLabel(project))}</span>
            </span>
          </span>
          <div class="repo-actions">
            <div class="repo-primary-actions">
              ${favoriteActionButton(project, "compact")}
              ${dismissProjectButton(project, "compact")}
              <a class="repo-link repo-link-icon has-tooltip" href="${escapeHtml(safeExternalUrl(project.url, { hosts: ["github.com"] }))}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(t("openGitHub"))}" data-tooltip="${escapeHtml(t("openGitHub"))}" data-memory-link="open_github" data-full-name="${escapeHtml(project.fullName)}">${iconOnly("external", t("openGitHub"))}</a>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
  const emptyRowsHtml = `
    <div class="project-list-empty">
      <strong>${escapeHtml(t("noProjectMatches"))}</strong>
      <span>${escapeHtml(t("noProjectMatchesHint"))}</span>
    </div>
  `;
  elements.projectRows.innerHTML = `
    ${renderProjectDismissNotice()}
    <div class="project-row-scroll">
      ${rowsHtml || emptyRowsHtml}
    </div>
    ${renderProjectPager()}
  `;
}

function renderProjectDismissNotice() {
  const notice = state.projectDismissNotice;
  if (!notice?.fullName) return `<div class="project-dismiss-slot" aria-hidden="true"></div>`;
  const message = notice.restored ? t("dismissUndoDone") : t("projectDismissed");
  const undoBusy = isLocalActionBusy(notice.fullName, "restore");
  const undoLabel = renderActionLabelContent("refresh", t("undoDismiss"), undoBusy);
  return `
    <div class="project-dismiss-slot is-visible">
      <div class="project-dismiss-notice" role="status">
        <span>${iconSvg(notice.restored ? "check" : "eyeOff")}${escapeHtml(message)} · ${escapeHtml(notice.label || notice.fullName)}</span>
        ${notice.restored ? "" : `<button class="${undoBusy ? "local-action-loading" : ""}" type="button" data-action="undo-dismiss-project" data-full-name="${escapeHtml(notice.fullName)}" ${undoBusy ? "disabled" : ""}>${undoLabel}</button>`}
      </div>
    </div>
  `;
}

function renderLeaderboardDismissNotice() {
  const notice = state.projectDismissNotice;
  if (!notice?.fullName) return "";
  const message = notice.restored ? t("dismissUndoDone") : t("projectDismissed");
  const undoBusy = isLocalActionBusy(notice.fullName, "restore");
  const undoLabel = renderActionLabelContent("refresh", t("undoDismiss"), undoBusy);
  return `
    <div class="leaderboard-dismiss-slot is-visible">
      <div class="leaderboard-dismiss-notice" role="status">
        <span>${iconSvg(notice.restored ? "check" : "eyeOff")}${escapeHtml(message)} · ${escapeHtml(notice.label || notice.fullName)}</span>
        ${notice.restored ? "" : `<button class="${undoBusy ? "local-action-loading" : ""}" type="button" data-action="undo-dismiss-project" data-full-name="${escapeHtml(notice.fullName)}" ${undoBusy ? "disabled" : ""}>${undoLabel}</button>`}
      </div>
    </div>
  `;
}

function renderProjectPager() {
  const { total, pageSize, page } = state.projectPool;
  if (!total) return "";
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const sizeOptions = [10, 20, 50, 100]
    .map((size) => `<option value="${size}" ${size === pageSize ? "selected" : ""}>${escapeHtml(t("pageSizeLabel").replace("{count}", String(size)))}</option>`)
    .join("");
  const pageItems = paginationItems(page, pageCount);
  const pageButtons = pageItems
    .map((item) => {
      if (item === "ellipsis") return `<span class="project-page-ellipsis">...</span>`;
      const active = item === page ? "active" : "";
      return `<button class="project-page-button ${active}" type="button" data-project-page="${item}" aria-label="${escapeHtml(String(item))}">${item}</button>`;
    })
    .join("");
  const status = t("pageStatus").replace("{page}", String(page)).replace("{pages}", String(pageCount));
  const compactStatus = `${page}/${pageCount}`;
  return `
    <div class="project-pager" data-project-pager>
      <div class="project-page-main">
        <span class="project-pager-status" aria-label="${escapeHtml(status)}">${escapeHtml(compactStatus)}</span>
        <div class="project-page-buttons">
          <button class="project-page-nav" type="button" data-project-page-prev ${page <= 1 ? "disabled" : ""}>${escapeHtml(t("prevPage"))}</button>
          ${pageButtons}
          <button class="project-page-nav" type="button" data-project-page-next ${page >= pageCount ? "disabled" : ""}>${escapeHtml(t("nextPage"))}</button>
        </div>
        <label class="project-page-jump">
          <span>${escapeHtml(t("pageJump"))}</span>
          <input type="number" min="1" max="${pageCount}" value="${page}" inputmode="numeric" data-project-page-input aria-label="${escapeHtml(t("pageJump"))}" />
          <button class="project-page-nav" type="button" data-project-page-jump>${escapeHtml(t("pageJumpAction"))}</button>
        </label>
      </div>
      <label class="project-page-size-control">
        <span>${escapeHtml(t("pageSize"))}</span>
        <select data-project-page-size>${sizeOptions}</select>
      </label>
    </div>
  `;
}

function paginationItems(page, pageCount) {
  if (pageCount <= 6) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const windowStart = Math.max(2, Math.min(page - 1, pageCount - 3));
  const windowEnd = Math.min(pageCount - 1, windowStart + 2);
  const items = [1];
  if (windowStart > 2) items.push("ellipsis");
  for (let item = windowStart; item <= windowEnd; item += 1) {
    items.push(item);
  }
  if (windowEnd < pageCount - 1) items.push("ellipsis");
  items.push(pageCount);
  return items;
}

function favoriteActionButton(project, variant = "default") {
  const cls = variant === "compact" ? "mini-action-button favorite-action" : "ghost-button favorite-action";
  const busy = isLocalActionBusy(project.fullName, "favorite");
  const active = project.watched ? "favorite-active" : "";
  const label = project.watched ? t("unwatch") : t("watch");
  const iconName = project.watched ? "heartFilled" : "heart";
  const content = busy ? renderMiniActionBusy(label) : variant === "compact" ? iconOnly(iconName, label) : iconLabel(iconName, label);
  const busyClass = busy ? "local-action-loading" : "";
  const disabled = busy ? "disabled" : "";
  const ariaLabel = busy ? `${label} ${t("githubActionBusy")}` : label;
  return `
    <button class="${cls} ${active} ${busyClass} has-tooltip" type="button" data-action="favorite" data-full-name="${escapeHtml(project.fullName)}" aria-label="${escapeHtml(ariaLabel)}" data-tooltip="${escapeHtml(ariaLabel)}" ${disabled}>
      ${content}
    </button>
  `;
}

function dismissProjectButton(project, variant = "default", source = "") {
  const cls = variant === "compact" ? "mini-action-button dismiss-action" : "ghost-button detail-icon-button dismiss-action";
  const busy = isLocalActionBusy(project.fullName, "dismiss");
  const label = t("dismissProject");
  const hint = t("dismissProjectHint");
  const content = busy ? renderMiniActionBusy(label) : variant === "compact" ? iconOnly("eyeOff", label) : iconOnly("eyeOff", label);
  const sourceAttr = source ? ` data-dismiss-source="${escapeHtml(source)}"` : "";
  const busyClass = busy ? "local-action-loading" : "";
  const disabled = busy ? "disabled" : "";
  const ariaLabel = busy ? `${label} ${t("githubActionBusy")}` : label;
  return `
    <button class="${cls} ${busyClass} has-tooltip" type="button" data-action="dismiss-project" data-full-name="${escapeHtml(project.fullName)}"${sourceAttr} aria-label="${escapeHtml(ariaLabel)}" data-tooltip="${escapeHtml(hint)}" ${disabled}>
      ${content}
    </button>
  `;
}

function githubActionButtons(projectOrFullName, variant = "default") {
  const project =
    typeof projectOrFullName === "string"
      ? { fullName: projectOrFullName, stars: 0, forks: 0 }
      : projectOrFullName || {};
  const fullName = project.fullName || "";
  const configured = Boolean(state.config?.githubConfigured || state.settings?.githubTokenSet);
  const cls = variant === "compact" ? "github-stat-button compact" : "github-stat-button";
  const wrapClass = variant === "compact" ? "github-stat-actions compact" : "github-stat-actions";
  const action = githubActionState(fullName);
  const starBusy = isGithubActionBusy(fullName, "star");
  const forkBusy = isGithubActionBusy(fullName, "fork");
  const starAction = action.starred ? "github-unstar" : "github-star";
  const starText = action.starred ? t("unstarRepo") : t("starRepo");
  const starIcon = action.starred ? "starFilled" : "star";
  const starLabel = starBusy ? `${starText} ${t("githubActionBusy")}` : configured ? starText : t("githubNotConfiguredHelp");
  const starActive = action.starred ? "github-action-active" : "";
  const starLoading = starBusy ? "github-action-loading" : "";
  const starDisabled = starBusy ? "disabled" : "";
  const forkLabel = action.forked
    ? t("alreadyForkedHint")
    : forkBusy
      ? `${t("forkRepo")} ${t("githubActionBusy")}`
    : configured
      ? t("forkRepo")
      : t("githubNotConfiguredHelp");
  const forkAction = action.forked ? "noop" : "github-fork";
  const forkDisabled = action.forked ? `aria-disabled="true"` : forkBusy ? "disabled" : "";
  const forkText = action.forked ? t("alreadyForked") : t("forkRepo");
  const forkDone = action.forked ? "github-action-done" : "";
  const forkLoading = forkBusy ? "github-action-loading" : "";
  const starCount = fmtNumber(project.stars || 0);
  const forkCount = fmtNumber(project.forks || 0);
  return `
    <div class="${wrapClass}">
      <div class="github-stat-action">
        <button class="${cls} ${starActive} ${starLoading} has-tooltip" type="button" data-action="${starAction}" data-full-name="${escapeHtml(fullName)}" aria-label="${escapeHtml(starLabel)}" data-tooltip="${escapeHtml(starLabel)}" ${starDisabled}>${renderGithubActionContent(starIcon, starText, starBusy)}</button>
        <span class="github-stat-count" title="${escapeHtml(`${starCount} ${t("stars")}`)}">${escapeHtml(starCount)}</span>
      </div>
      <div class="github-stat-action">
        <button class="${cls} ${forkDone} ${forkLoading} has-tooltip" type="button" data-action="${forkAction}" data-full-name="${escapeHtml(fullName)}" aria-label="${escapeHtml(forkLabel)}" data-tooltip="${escapeHtml(forkLabel)}" ${forkDisabled}>${renderGithubActionContent("fork", forkText, forkBusy)}</button>
        <span class="github-stat-count" title="${escapeHtml(`${forkCount} ${t("forks")}`)}">${escapeHtml(forkCount)}</span>
      </div>
    </div>
  `;
}

function renderEmptyDetailPlaceholder() {
  return `
    <div class="empty-detail">
      <p class="eyebrow">${t("selection")}</p>
      <h3>${t("chooseProject")}</h3>
      <p>${escapeHtml(t("chooseProjectHint"))}</p>
      <div class="empty-detail-hints">
        <span>${escapeHtml(t("chooseProjectTipBrowse"))}</span>
        <span>${escapeHtml(t("chooseProjectTipLearn"))}</span>
      </div>
    </div>
  `;
}

function renderDetail(project) {
  if (!project) {
    elements.detailPanel.innerHTML = renderEmptyDetailPlaceholder();
    return;
  }
  if (isPlanTransitionActive()) {
    elements.detailPanel.innerHTML = renderPlanTransitionState("detail");
    return;
  }

  const risk = project.scores?.risk || 0;
  const githubUrl = safeExternalUrl(project.url, { hosts: ["github.com"] });
  const homepageUrl = safeExternalUrl(project.homepage);
  const semanticProfile = projectSemanticProfile(project);
  const semanticCards = [semanticProfile.problem, semanticProfile.audience, semanticProfile.shape, semanticProfile.scene]
    .map(
      (item) => `
        <div class="detail-semantic-card ${escapeHtml(item.className)}">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.text)}</strong>
        </div>
      `
    )
    .join("");
  const topics = (project.topics || []).slice(0, 8).map((topic) => `<span class="tag">${escapeHtml(topicLabel(topic))}</span>`).join(" ");
  const analysis = project.analysis || state.analysis[project.fullName] || null;
  const analysisBusy = Boolean(state.analysisInFlight?.[project.fullName]);
  const analysisComplete = state.analysisCompleteFullName === project.fullName;
  const analysisButtonLabel = analysisBusy ? t("analyzing") : analysisComplete ? t("aiAnalysisDone") : analysis ? t("aiReAnalyze") : t("aiAnalyze");
  const analysisInlineStatus =
    state.analysisInlineStatus?.fullName === project.fullName
      ? `<span class="observation-plan-inline-status ${escapeHtml(state.analysisInlineStatus.kind || "")}">${iconLabel(
          state.analysisInlineStatus.icon || "check",
          state.analysisInlineStatus.label || ""
        )}</span>`
      : "";
  const analysisDraft = state.analysisDrafts[project.fullName] || {
    userNeed: analysis?.context?.userNeed || ""
  };
  const pendingNoteSave = state.pendingNoteSaveConfirmation?.fullName === project.fullName ? state.pendingNoteSaveConfirmation : null;
  const pendingNoteDelete = state.pendingNoteDeleteConfirmation?.fullName === project.fullName ? state.pendingNoteDeleteConfirmation : null;
  const noteDraft = state.noteDrafts?.[project.fullName] || {};
  const savedNoteStatus = project.triageStatus || "";
  const savedNoteStatusPill = savedNoteStatus
    ? `<span class="status-pill">${escapeHtml(noteStatusLabel(savedNoteStatus))}</span>`
    : "";
  const previousNoteStatus = pendingNoteSave?.previousStatus || savedNoteStatus;
  const noteStatus = pendingNoteSave?.status || noteDraft.status || savedNoteStatus;
  const noteStatusOptions = NOTE_STATUSES.map(([value, labelKey]) => {
    const active = value === noteStatus ? "active" : "";
    return `<button class="note-status-chip ${active}" type="button" data-action="set-note-status" data-status="${escapeHtml(value)}">${escapeHtml(t(labelKey))}</button>`;
  }).join("");
  const hasSavedNote = Boolean(project.note || project.triageStatus);
  const savedNote = project.note
    ? `<div class="saved-note">
        <div><strong>${escapeHtml(noteStatusLabel(savedNoteStatus))}</strong>${project.noteUpdatedAt ? `<span>${escapeHtml(t("savedAt"))} ${escapeHtml(formatNoteTime(project.noteUpdatedAt))}</span>` : ""}</div>
        <p>${escapeHtml(project.note)}</p>
      </div>`
    : `<p class="note-empty">${escapeHtml(t("noSavedRecord"))}</p>`;
  const noteOpen = state.openNoteSectionFullName === project.fullName;
  const noteSummaryPreview = String(project.note || "").replace(/\s+/g, " ").trim();
  const noteTextValue = pendingNoteSave?.text ?? noteDraft.text ?? project.note ?? "";
  const noteInlineStatus =
    state.noteInlineStatus?.fullName === project.fullName
      ? `<span class="observation-plan-inline-status ${escapeHtml(state.noteInlineStatus.kind || "")}">${iconLabel(
          state.noteInlineStatus.icon || "check",
          state.noteInlineStatus.label || ""
        )}</span>`
      : "";
  const copyUrlDone = state.copiedUrlFullName === project.fullName;
  const copyUrlLabel = copyUrlDone ? t("copied") : t("copyUrl");
  const copyUrlClass = copyUrlDone ? "copy-action-done" : "";
  const noteSaveConfirmation = pendingNoteSave
    ? `
        <div class="note-confirm-row" role="status">
          <span>${iconSvg(noteSaveConfirmationIcon(pendingNoteSave.status))}${escapeHtml(noteSaveConfirmationMessage(pendingNoteSave.status, pendingNoteSave.previousStatus || previousNoteStatus))}</span>
          <div class="note-confirm-actions">
            <button class="ghost-button" type="button" data-action="cancel-save-note" data-full-name="${escapeHtml(project.fullName)}">${iconLabel("x", t("noteCancelSave"))}</button>
            <button class="primary-button" type="button" data-action="confirm-save-note" data-full-name="${escapeHtml(project.fullName)}">${iconLabel("check", t("noteConfirmSave"))}</button>
          </div>
        </div>
      `
    : "";
  const noteDeleteConfirmation = pendingNoteDelete
    ? `
        <div class="note-confirm-row" role="status">
          <span>${iconSvg("trash")}${escapeHtml(noteDeleteConfirmationMessage(pendingNoteDelete.status))}</span>
          <div class="note-confirm-actions">
            <button class="ghost-button" type="button" data-action="cancel-delete-note" data-full-name="${escapeHtml(project.fullName)}">${iconLabel("x", t("noteCancelSave"))}</button>
            <button class="primary-button" type="button" data-action="confirm-delete-note" data-full-name="${escapeHtml(project.fullName)}">${iconLabel("check", t("noteConfirmSave"))}</button>
          </div>
        </div>
      `
    : "";
  const homepageLabel = homepageUrl
    ? (() => {
        try {
          return new URL(homepageUrl).hostname;
        } catch {
          return String(homepageUrl).replace(/^https?:\/\//, "").slice(0, 42);
        }
      })()
    : "";
  const dataRows = [
    [t("language"), escapeHtml(languageLabel(project.language))],
    [t("issues"), escapeHtml(fmtNumber(project.openIssues || 0))],
    [t("updated"), escapeHtml(fmtDate(project.pushedAt || project.updatedAt))],
    [t("projectHomepage"), homepageUrl ? `<a href="${escapeHtml(homepageUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(homepageLabel)}</a>` : `<span>${escapeHtml(t("noHomepage"))}</span>`]
  ]
    .map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${value}</strong></div>`)
    .join("");
  const dataSummary = `${languageLabel(project.language)} · ${fmtNumber(project.openIssues || 0)} ${t("issues")} · ${fmtDate(project.pushedAt || project.updatedAt)}`;

  elements.detailPanel.innerHTML = `
    <div class="detail-content">
      <section class="detail-hero">
        <div class="detail-title-row">
          <div>
            <h3>${escapeHtml(displayProjectName(project))}</h3>
          </div>
        </div>
        <p class="detail-summary">${escapeHtml(projectBrief(project))}</p>
        <div class="detail-semantic-grid">${semanticCards}</div>
        <div class="detail-basis-row">
          <span><strong>${escapeHtml(t("licenseBoundary"))}</strong>${escapeHtml(licenseName(project.licensePolicy))} · ${escapeHtml(projectLicenseBoundary(project))}</span>
          <span><strong>${escapeHtml(t("projectRiskBasis"))}</strong>${escapeHtml(riskBasisText(risk))}</span>
        </div>
        <div class="hero-metrics">
          <div><span>${escapeHtml(t("opportunity"))}</span><strong>${project.scores?.opportunity ?? 0}</strong></div>
          <div><span>${escapeHtml(t("actionability"))}</span><strong>${project.scores?.actionability ?? 0}</strong></div>
          <div><span>${escapeHtml(t("licenseRisk"))}</span><strong>${project.scores?.licenseRisk ?? 0}</strong></div>
        </div>
      </section>

      <div class="detail-command-bar">
        <div class="detail-action-buttons">
          ${favoriteActionButton(project, "compact")}
          ${dismissProjectButton(project, "compact")}
          <button class="ghost-button detail-icon-button copy-action ${copyUrlClass} has-tooltip" type="button" data-action="copy-url" data-url="${escapeHtml(githubUrl)}" data-full-name="${escapeHtml(project.fullName)}" aria-label="${escapeHtml(copyUrlLabel)}" data-tooltip="${escapeHtml(copyUrlLabel)}">${iconOnly(copyUrlDone ? "check" : "copy", copyUrlLabel)}</button>
          <a class="ghost-button detail-icon-button has-tooltip" href="${escapeHtml(githubUrl)}" target="_blank" rel="noopener noreferrer" data-memory-link="open_github" data-full-name="${escapeHtml(project.fullName)}" aria-label="${escapeHtml(t("openGitHub"))}" data-tooltip="${escapeHtml(t("openGitHub"))}">${iconOnly("external", t("openGitHub"))}</a>
        </div>
        <div class="detail-github-inline">
          ${githubActionButtons(project)}
        </div>
      </div>

      <section class="detail-section analysis-section">
        <div class="analysis-head">
          <div>
            <h4>${escapeHtml(t("aiAnalysisTitle"))}</h4>
            <p>${escapeHtml(t("aiAnalysisHint"))}</p>
          </div>
          <div class="analysis-action-stack">
            ${analysisInlineStatus}
            <button class="primary-button ${analysisBusy ? "local-action-loading" : ""} ${analysisComplete ? "analysis-action-done" : ""}" type="button" data-action="ai-analyze" data-full-name="${escapeHtml(project.fullName)}" aria-busy="${analysisBusy ? "true" : "false"}" ${analysisBusy ? "disabled" : ""}>
              ${analysisBusy ? renderActionLabelContent("refresh", t("analyzing"), true) : iconLabel(analysisComplete ? "check" : "sparkle", analysisButtonLabel)}
            </button>
          </div>
        </div>
        <details class="analysis-options" open>
          <summary>
            <span>${escapeHtml(t("aiAnalyzeOptions"))}</span>
            <small>${escapeHtml(t("aiAnalyzeOptionsHint"))}</small>
          </summary>
          <label class="analysis-need-label" for="analysis-need">${escapeHtml(t("aiCustomNeed"))}</label>
          <textarea id="analysis-need" maxlength="1000" placeholder="${escapeHtml(t("aiCustomNeedPlaceholder"))}">${escapeHtml(analysisDraft.userNeed || "")}</textarea>
        </details>
        <div class="analysis-box" id="analysis-box">${analysisBusy ? renderAnalysisLoading() : renderAnalysisResult(analysis)}</div>
      </section>

      <details class="detail-section detail-more-section">
        <summary class="detail-fold-summary">
          <div>
            <h4>${escapeHtml(t("moreProjectData"))}</h4>
            <span>${escapeHtml(dataSummary)}</span>
          </div>
          ${detailFoldToggleMarkup()}
        </summary>
        <div class="signal-grid detail-data-grid">${dataRows}</div>
        <div class="detail-topic-block">
          <span>${escapeHtml(t("topics"))}</span>
          <div class="topic-strip">${topics || `<span class="muted-inline">${escapeHtml(state.language === "zh" ? "暂无主题" : "No topics")}</span>`}</div>
        </div>
      </details>

      <details class="detail-section note-section" ${noteOpen ? "open" : ""}>
        <summary class="detail-fold-summary note-summary">
          <div>
            <h4>${escapeHtml(t("triageRecord"))}</h4>
            ${noteSummaryPreview ? `<p class="note-summary-preview">${escapeHtml(noteSummaryPreview)}</p>` : ""}
          </div>
          ${savedNoteStatusPill}
          ${detailFoldToggleMarkup()}
        </summary>
        <div class="saved-record">
          <strong>${escapeHtml(t("savedRecord"))}</strong>
          ${savedNote}
        </div>
        <label class="note-label">${escapeHtml(t("triageStatus"))}</label>
        <div class="note-status-row">${noteStatusOptions}</div>
        <textarea id="note-text" placeholder="${escapeHtml(t("notePlaceholder"))}">${escapeHtml(noteTextValue)}</textarea>
        <div class="note-action-row">
          <button class="primary-button note-save" type="button" data-action="save-note" data-full-name="${escapeHtml(project.fullName)}">${iconLabel("save", t("saveTriage"))}</button>
          ${
            hasSavedNote
              ? `<button class="ghost-button note-delete" type="button" data-action="delete-note" data-full-name="${escapeHtml(project.fullName)}">${iconLabel("trash", t("deleteNote"))}</button>`
              : ""
          }
          ${noteInlineStatus}
        </div>
        ${noteSaveConfirmation}${noteDeleteConfirmation}
      </details>
    </div>
  `;
}

function renderSettings() {
  const settings = state.settings;
  if (!settings) return;
  renderObservationPlans();

  [
    ["github", elements.githubTokenIssue],
    ["tavily", elements.tavilyKeyIssue],
    ["exa", elements.exaKeyIssue]
  ].forEach(([kind, element]) => {
    if (!element) return;
    element.hidden = !state.keyIssues?.[kind];
    element.textContent = SERVICE_KEY_ISSUE_LABELS[kind];
  });
  const githubVisible = isSecretVisible("github");
  const tavilyVisible = isSecretVisible("tavily");
  const exaVisible = isSecretVisible("exa");
  const githubPendingClear = isSecretClearPending("github");
  const tavilyPendingClear = isSecretClearPending("tavily");
  const exaPendingClear = isSecretClearPending("exa");
  elements.githubToken.type = githubVisible ? "text" : "password";
  elements.githubToken.value = githubPendingClear ? "" : githubVisible ? settings.githubToken || "" : "";
  elements.tavilyKey.type = tavilyVisible ? "text" : "password";
  elements.tavilyKey.value = tavilyPendingClear ? "" : tavilyVisible ? settings.tavilyKey || "" : "";
  elements.exaKey.type = exaVisible ? "text" : "password";
  elements.exaKey.value = exaPendingClear ? "" : exaVisible ? settings.exaKey || "" : "";
  const githubConfigured = !githubPendingClear && (settings.githubTokenSet || state.config?.githubConfigured);
  const tavilyConfigured = !tavilyPendingClear && (settings.tavilyKeySet || state.config?.tavilyConfigured);
  const exaConfigured = !exaPendingClear && (settings.exaKeySet || state.config?.exaConfigured);
  elements.clearGithubToken.disabled = githubPendingClear || !githubConfigured;
  elements.clearTavilyKey.disabled = tavilyPendingClear || !tavilyConfigured;
  elements.clearExaKey.disabled = exaPendingClear || !exaConfigured;
  elements.githubKeyState.textContent = githubPendingClear
    ? t("keyClearPending")
    : settings.githubTokenSet
    ? `${t("keySet")} ${settings.githubTokenPreview || ""}`
    : githubConfigured
      ? t("configured")
      : t("keyEmpty");
  elements.tavilyKeyState.textContent = tavilyPendingClear
    ? t("keyClearPending")
    : settings.tavilyKeySet
    ? `${t("keySet")} ${settings.tavilyKeyPreview || ""}`
    : tavilyConfigured
      ? t("configured")
      : t("keyEmpty");
  elements.exaKeyState.textContent = exaPendingClear
    ? t("keyClearPending")
    : settings.exaKeySet
    ? `${t("keySet")} ${settings.exaKeyPreview || ""}`
    : exaConfigured
      ? t("configured")
      : t("keyEmpty");
  document.querySelectorAll("[data-action='toggle-secret'][data-secret-kind='github']").forEach((button) => {
    setIconButtonContent(button, githubVisible ? "eyeOff" : "eye", t(githubVisible ? "hideKey" : "showKey"));
  });
  document.querySelectorAll("[data-action='toggle-secret'][data-secret-kind='tavily']").forEach((button) => {
    setIconButtonContent(button, tavilyVisible ? "eyeOff" : "eye", t(tavilyVisible ? "hideKey" : "showKey"));
  });
  document.querySelectorAll("[data-action='toggle-secret'][data-secret-kind='exa']").forEach((button) => {
    setIconButtonContent(button, exaVisible ? "eyeOff" : "eye", t(exaVisible ? "hideKey" : "showKey"));
  });
  setIconButtonContent(elements.clearGithubToken, "trash", t("clearGithubToken"));
  setIconButtonContent(elements.clearTavilyKey, "trash", t("clearTavilyKey"));
  setIconButtonContent(elements.clearExaKey, "trash", t("clearExaKey"));

  const deepSeek = (settings.llmProviders || []).find((provider) => provider.id === "deepseek") || (settings.llmProviders || [])[0];
  const visibleProviders = deepSeek ? [deepSeek] : [];

  elements.providerList.innerHTML = visibleProviders
    .map((provider) => {
      const providerVisible = isSecretVisible("provider", provider.id);
      const providerPendingClear = isSecretClearPending("provider", provider.id);
      const keyUrl = providerKeyUrl(provider.id);
      const status = providerPendingClear
        ? t("keyClearPending")
        : provider.apiKeySet
          ? `${t("keySet")} ${provider.apiKeyPreview}`
          : t("keyEmpty");
      const endpointOptions = (settings.providerCatalog?.endpoints || [])
        .filter((endpoint) => endpoint.providerId === provider.id)
        .map((endpoint) => endpoint.baseUrl);
      if (provider.baseUrl && !endpointOptions.includes(provider.baseUrl)) {
        endpointOptions.unshift(provider.baseUrl);
      }
      if (!endpointOptions.length) {
        endpointOptions.push("https://api.deepseek.com");
      }
      const modelOptions = Array.isArray(provider.models) ? provider.models : [];
      const modelControl = modelOptions.length
        ? `<select data-provider-field="model">
            ${modelOptions
              .map((model) => `<option value="${escapeHtml(model)}" ${provider.model === model ? "selected" : ""}>${escapeHtml(model)}</option>`)
              .join("")}
          </select>`
        : `<input data-provider-field="model" value="${escapeHtml(provider.model || "")}" />`;
      const testStatus =
        provider.testStatus === "ok"
          ? t("providerReady")
          : provider.testStatus === "models-loaded"
            ? t("modelsLoaded")
            : provider.testStatus
              ? `${t("providerFailed")} · ${provider.testStatus.replace(/^failed:\s*/i, "")}`
              : t("keyEmpty");
      const protocols = [
        ["openai-compatible", protocolLabel("openai-compatible")]
      ];
      const catalogActionState = providerActionState(provider.id, "refresh-provider-catalog");
      const modelsActionState = providerActionState(provider.id, "fetch-provider-models");
      const testActionState = providerActionState(provider.id, "test-provider");
      return `
        <article class="provider-item" data-provider-id="${escapeHtml(provider.id)}">
          <div class="provider-head">
            <div>
              <strong>${escapeHtml(provider.name)}</strong>
              <span>${escapeHtml(regionLabel(provider.region))} · ${escapeHtml(protocolLabel(provider.protocol))} · ${escapeHtml(status)}</span>
              <em>${escapeHtml(t("deepSeekOnly"))}</em>
            </div>
            <label class="toggle-row">
              <input type="checkbox" data-provider-field="enabled" ${provider.enabled ? "checked" : ""} />
              <span>${t("enabled")}</span>
            </label>
          </div>
          <div class="provider-grid">
            <label><span>${t("baseUrl")}</span>
              <select data-provider-field="baseUrl">
                ${endpointOptions
                  .map((baseUrl) => `<option value="${escapeHtml(baseUrl)}" ${provider.baseUrl === baseUrl ? "selected" : ""}>${escapeHtml(baseUrl)}</option>`)
                  .join("")}
              </select>
            </label>
            <label><span>${t("model")}</span>${modelControl}</label>
            <label><span>${t("protocol")}</span>
              <select data-provider-field="protocol">
                ${protocols
                  .map(
                    ([value, label]) =>
                      `<option value="${escapeHtml(value)}" ${provider.protocol === value ? "selected" : ""}>${escapeHtml(label)}</option>`
                  )
                  .join("")}
              </select>
            </label>
            <label class="secret-label">
              <span class="field-title-row">
                <span>${t("apiKey")}</span>
                ${safeExternalUrl(keyUrl) ? `<a class="key-source-link" href="${escapeHtml(safeExternalUrl(keyUrl))}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("getKey"))}</a>` : ""}
              </span>
              <div class="secret-field">
                <input data-provider-field="apiKey" type="${providerVisible ? "text" : "password"}" value="${providerPendingClear ? "" : providerVisible ? escapeHtml(provider.apiKey || "") : ""}" placeholder="${escapeHtml(status)}" />
                <button class="ghost-button secret-toggle" type="button" data-action="toggle-secret" data-secret-kind="provider" data-provider-id="${escapeHtml(provider.id)}">${iconLabel(providerVisible ? "eyeOff" : "eye", t(providerVisible ? "hideKey" : "showKey"))}</button>
                <button class="ghost-button danger-button secret-clear" type="button" data-action="clear-secret" data-secret-kind="provider" data-provider-id="${escapeHtml(provider.id)}" ${providerPendingClear || !provider.apiKeySet ? "disabled" : ""}>${iconLabel("trash", t("clearKey"))}</button>
              </div>
            </label>
            <div class="provider-actions">
              <button class="ghost-button ${escapeHtml(providerActionButtonClass(provider.id, "refresh-provider-catalog"))}" type="button" data-action="refresh-provider-catalog" data-provider-id="${escapeHtml(provider.id)}" ${catalogActionState === "loading" ? "disabled" : ""}>${providerActionButtonContent(provider.id, "refresh-provider-catalog", "refresh", "refreshProviderCatalog", "actionCompleted")}</button>
              <button class="ghost-button ${escapeHtml(providerActionButtonClass(provider.id, "fetch-provider-models"))}" type="button" data-action="fetch-provider-models" data-provider-id="${escapeHtml(provider.id)}" ${modelsActionState === "loading" ? "disabled" : ""}>${providerActionButtonContent(provider.id, "fetch-provider-models", "download", "fetchProviderModels", "modelsLoaded")}</button>
              <button class="primary-button ${escapeHtml(providerActionButtonClass(provider.id, "test-provider"))}" type="button" data-action="test-provider" data-provider-id="${escapeHtml(provider.id)}" ${testActionState === "loading" ? "disabled" : ""}>${providerActionButtonContent(provider.id, "test-provider", "plug", "testProvider", "providerReady")}</button>
            </div>
            <div class="provider-status">
              <span>${escapeHtml(testStatus)}</span>
              ${
                provider.lastTestAt || provider.lastModelSyncAt || settings.providerCatalog?.updatedAt
                  ? `<small>${escapeHtml(t("lastChecked"))} ${escapeHtml(fmtDate(provider.lastTestAt || provider.lastModelSyncAt || settings.providerCatalog?.updatedAt))}</small>`
                  : ""
              }
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  renderGithubPanel();

  if (state.discovery && elements.queryProfiles) {
    if (elements.queryProfileCount) {
      elements.queryProfileCount.textContent = fmtNumber(state.discovery.profiles?.length || 0);
    }
    elements.queryProfiles.innerHTML = state.discovery.profiles
      .map(
        (profile) => `
          <div class="query-item">
            <strong>${escapeHtml(profileLabel(profile))}</strong>
            <code>${escapeHtml(profile.query)}</code>
          </div>
        `
      )
      .join("");
  }
  updateSaveSettingsButton();
}

function observationPlanLabel(plan = {}) {
  if (!plan) return t("defaultObservationPlan");
  return state.language === "en" ? plan.nameEn || plan.name || plan.id : plan.name || plan.nameEn || plan.id;
}

function observationPlanSearchLogic(plan = {}) {
  return plan.searchLogic || plan.strategy || {
    baseMode: "focused",
    keywords: [],
    excludeTerms: [],
    customQueries: [],
    minStars: 20
  };
}

function observationPlanRequirementsText(plan = {}) {
  const requirements = Array.isArray(plan.requirements) ? plan.requirements : [];
  return requirements
    .map((item) => (typeof item === "string" ? item : item?.text))
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join("\n");
}

function observationPlanRequirementDraftsFromText(text = "") {
  const seen = new Set();
  return String(text || "")
    .split(/\n+/)
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((item, index) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return null;
      seen.add(key);
      return {
        id: item.slice(0, 40).replace(/\s+/g, "-").toLowerCase() || `req-${index}`,
        text: item
      };
    })
    .filter(Boolean);
}

function observationQueryLabel(item = {}) {
  if (state.language === "en") return item.labelEn || item.label || item.query || "-";
  return item.labelZh || item.label || item.query || "-";
}

function formatObservationPlanLogic(plan = {}) {
  const logic = observationPlanSearchLogic(plan);
  return JSON.stringify(
    {
      name: plan.name || "",
      nameEn: plan.nameEn || "",
      description: plan.description || "",
      descriptionEn: plan.descriptionEn || "",
      strategy: logic,
      searchLogic: logic
    },
    null,
    2
  );
}

function observationPlanModeLabel(mode = "focused") {
  return (
    {
      default: t("observationPlanModeDefault"),
      focused: t("observationPlanModeFocused"),
      blend: t("observationPlanModeBlend"),
      only: t("observationPlanModeOnly")
    }[mode] || mode
  );
}

function renderObservationPlanReadable(plan = {}) {
  const logic = observationPlanSearchLogic(plan);
  const queries = Array.isArray(logic.customQueries) ? logic.customQueries : [];
  const keywords = Array.isArray(logic.keywords) ? logic.keywords : [];
  const excludes = Array.isArray(logic.excludeTerms) ? logic.excludeTerms : [];
  const summary = plan.summary || {};
  const learning = summary.learningConfig || {};
  const evolution = summary.evolution || {};
  const previewStats = [
    [t("observationPlanLearningPreview"), `${fmtNumber(Math.round((learning.explorationRatio || 0) * 100))}% / ${fmtNumber(Math.round((learning.diversityFloor || 0) * 100))}% / ${fmtNumber(Math.round((learning.noveltyRatio || 0) * 100))}%`],
    [t("observationPlanUserEvents"), `${fmtNumber(summary.userEvents || 0)} ${t("observationPlanItemsUnit")}`],
    [t("observationPlanFavoritePreview"), `${fmtNumber(summary.favorites || 0)} ${t("observationPlanItemsUnit")}`],
    [t("observationPlanTriagePreview"), `${fmtNumber(summary.triageRecords || 0)} ${t("observationPlanItemsUnit")}`],
    [t("observationPlanAiPreview"), `${fmtNumber(summary.aiAnalyses || 0)} ${t("observationPlanItemsUnit")}`],
    [t("observationPlanGithubPreview"), `${fmtNumber(summary.githubActions || 0)} ${t("observationPlanItemsUnit")}`],
    [
      t("observationPlanEvolutionPreview"),
      `${fmtNumber((evolution.positivePreferences || 0) + (evolution.negativePreferences || 0) + (evolution.compressedFacts || 0) + (evolution.harnessRuns || 0))} ${t("observationPlanMemoryUnit")}`
    ]
  ];
  const queryList = queries
    .slice(0, 80)
    .map(
      (item) => `
        <li>
          <strong>${escapeHtml(observationQueryLabel(item))}</strong>
          <code>${escapeHtml(item.query || "")}</code>
        </li>
      `
    )
    .join("");
  return `
    <div class="observation-plan-readable">
      <div class="observation-plan-state-grid">
        ${previewStats
          .map(
            ([label, value]) => `
              <span>
                <small>${escapeHtml(label)}</small>
                <strong>${escapeHtml(value)}</strong>
              </span>
            `
          )
          .join("")}
      </div>
      ${
        keywords.length || excludes.length
          ? `<div class="observation-plan-token-row">
              ${keywords.slice(0, 10).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
              ${excludes.slice(0, 8).map((item) => `<span class="negative">${escapeHtml(item)}</span>`).join("")}
            </div>`
          : ""
      }
      <ul class="observation-plan-query-preview">${queryList}</ul>
      ${logic.notes ? `<p>${escapeHtml(logic.notes)}</p>` : ""}
    </div>
  `;
}

function renderObservationPlanPendingConfirm() {
  const pending = state.observationPlanPendingConfirm;
  if (!pending) return "";
  const isDelete = pending.type === "delete";
  const busy = Boolean(pending.busy || (pending.type === "switch" && state.observationPlanSwitching));
  const confirmLabel = isDelete ? t("observationPlanDeleteConfirmAction") : t("observationPlanConfirmSwitchAction");
  const message = pending.backupExported ? t("observationPlanDeleteBackupDone") : pending.message || "";
  const backupButton = isDelete
    ? `<button class="observation-plan-confirm-button ghost-button" type="button" data-action="export-observation-plan-delete-backup" ${busy ? "disabled" : ""}>${iconLabel("download", t("observationPlanDeleteBackupAction"))}</button>`
    : "";
  return `
    <span class="observation-plan-confirm-message ${isDelete ? "danger" : ""}" role="status">
      ${iconSvg(isDelete ? "trash" : "scan")}
      <span>${escapeHtml(message)}</span>
    </span>
    <button class="observation-plan-confirm-button ghost-button" type="button" data-action="cancel-observation-plan-confirm" ${busy ? "disabled" : ""}>${iconLabel("x", t("clearBehaviorCancelAction"))}</button>
    ${backupButton}
    <button class="observation-plan-confirm-button ${isDelete ? "danger-button" : "primary-button"} ${busy ? "local-action-loading" : ""}" type="button" data-action="confirm-observation-plan-action" ${busy ? "disabled" : ""}>
      ${busy ? renderMiniActionBusy(confirmLabel) : iconLabel(isDelete ? "trash" : "scan", confirmLabel)}
    </button>
  `;
}

function renderObservationPlanToolbar(editable = {}, draft = null) {
  const strategy = observationPlanSearchLogic(editable);
  const queryCount = strategy.customQueries?.length || 0;
  const count = editable.summary?.searchLogicItems ?? queryCount;
  const cancelLabel = state.observationPlanEditMode === "edit" ? t("cancelObservationPlanEdit") : t("cancelObservationPlanDraft");
  const saveHint = t("saveObservationPlanHint");
  const editHint = t("editObservationPlanHint");
  const actions = draft
    ? `
        <button class="observation-plan-tool ghost-button" type="button" data-action="cancel-observation-plan-draft" aria-label="${escapeHtml(cancelLabel)}">${iconLabel("x", cancelLabel)}</button>
        <button class="observation-plan-tool primary-button" type="button" data-action="save-observation-plan" aria-label="${escapeHtml(saveHint)}">${iconLabel("save", t("saveObservationPlan"))}</button>
      `
    : editable?.builtIn ? "" : `<button class="observation-plan-tool ghost-button" type="button" data-action="edit-observation-plan" aria-label="${escapeHtml(editHint)}">${iconLabel("edit", t("editObservationPlan"))}</button>`;
  const kind = state.observationPlanInlineStatus?.kind || "";
  const statusIcon = kind === "failed" ? "x" : kind === "canceled" ? "x" : "check";
  const status = state.observationPlanInlineStatus
    ? `<span class="observation-plan-inline-status ${escapeHtml(kind)}">${iconLabel(statusIcon, state.observationPlanInlineStatus.label || "")}</span>`
    : "";
  const pendingConfirm = renderObservationPlanPendingConfirm();
  const actionContent = pendingConfirm || `${actions}${status}`;
  return `
    <div class="observation-plan-toolbar-title">
      <strong>${escapeHtml(t("observationPlanLogicItems"))}</strong>
      <span>${escapeHtml(fmtNumber(count))}</span>
    </div>
    <div class="observation-plan-toolbar-actions ${pendingConfirm ? "confirming" : ""}">${actionContent}</div>
  `;
}

function renderObservationPlanPicker(plans = [], preview = null, active = null) {
  const selected = preview || active || plans[0] || {};
  const selectedLabel = observationPlanLabel(selected);
  const rows = plans
    .map((plan) => {
      const label = observationPlanLabel(plan);
      const selectedClass = plan.id === selected?.id ? "selected" : "";
      const activeMark = plan.id === active?.id ? `<span class="observation-plan-active-mark">${iconSvg("check")}</span>` : "";
      const editButton = plan.builtIn
        ? ""
        : `<button class="observation-plan-option-icon" type="button" data-action="edit-observation-plan" data-plan-id="${escapeHtml(plan.id)}" aria-label="${escapeHtml(t("editObservationPlanAction"))}">${iconOnly("edit", t("editObservationPlanAction"))}</button>`;
      const deleteButton = plan.builtIn
        ? ""
        : `<button class="observation-plan-option-icon danger" type="button" data-action="delete-observation-plan" data-plan-id="${escapeHtml(plan.id)}" aria-label="${escapeHtml(t("deleteObservationPlanAction"))}">${iconOnly("trash", t("deleteObservationPlanAction"))}</button>`;
      return `
        <div class="observation-plan-option ${selectedClass}" role="option" aria-selected="${plan.id === selected?.id ? "true" : "false"}" data-action="preview-observation-plan" data-plan-id="${escapeHtml(plan.id)}">
          <span class="observation-plan-option-name">${activeMark}${escapeHtml(label)}</span>
          <span class="observation-plan-option-actions">
            ${editButton}
            ${deleteButton}
          </span>
        </div>
      `;
    })
    .join("");
  return `
    <details class="observation-plan-picker-menu">
      <summary aria-label="${escapeHtml(t("openObservationPlanPicker"))}">
        <span>${escapeHtml(selectedLabel)}</span>
        ${observationPlanToggleIconMarkup()}
      </summary>
      <div class="observation-plan-options" role="listbox">
        ${rows}
      </div>
    </details>
  `;
}

function renderObservationPlanRequirements(plan = {}, options = {}) {
  const requirements = Array.isArray(plan.requirements) ? plan.requirements : [];
  const canDelete = Boolean(options.canDelete);
  const rows = requirements.length
    ? requirements
        .map(
          (item, index) => `
            <div class="observation-requirement-item" data-requirement-index="${index}">
              <span class="observation-requirement-text">${escapeHtml(typeof item === "string" ? item : item.text || "")}</span>
              ${canDelete ? `<button class="observation-requirement-delete" type="button" data-action="delete-observation-requirement" data-requirement-index="${index}" aria-label="${escapeHtml(t("deleteObservationRequirement"))}">${iconOnly("trash", t("deleteObservationRequirement"))}</button>` : ""}
            </div>
          `
        )
        .join("")
    : `<p>${escapeHtml(t("observationPlanRequirementsEmpty"))}</p>`;
  return `
    <div class="observation-requirements-title">
      <strong>${escapeHtml(t("observationPlanRequirements"))}</strong>
      <span>${escapeHtml(fmtNumber(requirements.length))}</span>
    </div>
    <div class="observation-requirements-list">${rows}</div>
  `;
}

function updateObservationPlanGenerateButton() {
  const button = document.querySelector("[data-action='generate-observation-plan']");
  if (!button) return;
  const busy = Boolean(state.observationPlanGenerating);
  button.disabled = busy;
  button.classList.toggle("local-action-loading", busy);
  button.setAttribute("aria-busy", busy ? "true" : "false");
  button.innerHTML = renderActionLabelContent("sparkle", t("generateObservationPlan"), busy);
}

function updateObservationPlanSwitchButton() {
  const button = elements.switchObservationPlanButton;
  if (!button) return;
  const busy = Boolean(state.observationPlanSwitching);
  button.disabled = busy;
  button.classList.toggle("local-action-loading", busy);
  button.setAttribute("aria-busy", busy ? "true" : "false");
  button.setAttribute("aria-label", `${t("switchObservationPlan")}：${t("observationPlanSwitchHint")}`);
  button.innerHTML = busy ? renderActionLabelContent("scan", t("scanning"), true) : escapeHtml(t("switchObservationPlan"));
}

function captureObservationPlanFormValues() {
  return {
    name: elements.observationPlanName?.value ?? "",
    idea: elements.observationPlanIdea?.value ?? ""
  };
}

function restoreObservationPlanFormValues(values) {
  if (!values) return;
  if (elements.observationPlanName) elements.observationPlanName.value = values.name;
  if (elements.observationPlanIdea) elements.observationPlanIdea.value = values.idea;
}

function clearObservationPlanFormValues() {
  if (elements.observationPlanName) elements.observationPlanName.value = "";
  if (elements.observationPlanIdea) elements.observationPlanIdea.value = "";
}

function clearObservationPlanInlineStatusDom() {
  elements.observationPlanToolbar
    ?.querySelectorAll(".observation-plan-toolbar-actions > .observation-plan-inline-status")
    .forEach((node) => node.remove());
}

function clearLearningInlineStatusDom() {
  elements.learningLoop?.querySelector(".learning-inline-status")?.remove();
}

function clearMemoryCompleteStatusDom() {
  elements.learningEvents?.querySelector(".memory-clear-complete-row")?.remove();
}

function resetLearningPolicySaveButton() {
  const button = elements.learningPolicy?.querySelector(actionSelector("save-learning-policy"));
  if (!button) return;
  button.classList.remove("local-action-loading", "local-action-done");
  button.disabled = false;
  button.setAttribute("aria-busy", "false");
  button.innerHTML = iconLabel("save", t("saveLearningPolicy"));
}

function resetLearningContextCompactButton() {
  const button = elements.learningContext?.querySelector(actionSelector("compact-memory"));
  if (!button) return;
  button.classList.remove("local-action-loading", "local-action-done");
  button.disabled = false;
  button.setAttribute("aria-busy", "false");
  button.innerHTML = iconLabel("archive", t("compactContext"));
}

function resetCopyUrlButton(fullName) {
  const button = elements.detailPanel?.querySelector(actionSelector("copy-url", fullName));
  if (!button) return;
  const label = t("copyUrl");
  button.classList.remove("copy-action-done");
  button.setAttribute("aria-label", label);
  button.dataset.tooltip = label;
  button.innerHTML = iconOnly("copy", label);
}

function resetAnalysisCompleteButton(fullName) {
  if (state.analysisInFlight?.[fullName]) return;
  const button = elements.detailPanel?.querySelector(actionSelector("ai-analyze", fullName));
  if (!button) return;
  const project = state.selected?.fullName === fullName ? state.selected : null;
  const analysis = project?.analysis || state.analysis?.[fullName] || null;
  const label = analysis ? t("aiReAnalyze") : t("aiAnalyze");
  button.classList.remove("analysis-action-done", "local-action-loading");
  button.disabled = false;
  button.setAttribute("aria-busy", "false");
  button.innerHTML = iconLabel("sparkle", label);
}

function clearNoteInlineStatusDom(fullName) {
  elements.detailPanel
    ?.querySelector(actionSelector("save-note", fullName))
    ?.closest(".note-action-row")
    ?.querySelector(".observation-plan-inline-status")
    ?.remove();
}

function clearDismissedFeedbackInlineStatusDom(fullName) {
  elements.learningDismissed
    ?.querySelector(`.dismissed-sample-card[data-full-name="${cssEscape(fullName)}"]`)
    ?.querySelector(".observation-plan-inline-status")
    ?.remove();
}

function clearProjectDismissNoticeDom() {
  document.querySelectorAll(".project-dismiss-slot").forEach((slot) => {
    slot.classList.remove("is-visible");
    slot.setAttribute("aria-hidden", "true");
    slot.innerHTML = "";
  });
  document.querySelectorAll(".leaderboard-dismiss-slot").forEach((slot) => slot.remove());
}

function showObservationPlanInlineStatus(kind, label, options = {}) {
  if (state.observationPlanInlineStatusTimer) {
    clearTimeout(state.observationPlanInlineStatusTimer);
  }
  const preservedInputs = options.preserveInputs ? captureObservationPlanFormValues() : null;
  state.observationPlanInlineStatus = { kind, label };
  renderObservationPlans();
  if (options.clearInputs) {
    clearObservationPlanFormValues();
  } else {
    restoreObservationPlanFormValues(preservedInputs);
  }
  state.observationPlanInlineStatusTimer = setTimeout(() => {
    state.observationPlanInlineStatus = null;
    state.observationPlanInlineStatusTimer = null;
    clearObservationPlanInlineStatusDom();
  }, 2000);
}

function showObservationPlanActionError(error, options = {}) {
  showObservationPlanInlineStatus("failed", error?.message || t("observationPlanGenerateFailed"), { preserveInputs: true, ...options });
}

function queueObservationPlanSwitchConfirm(id = "") {
  const plans = state.observationPlans?.plans || [];
  const targetPlan = plans.find((plan) => plan.id === id) || { id };
  const label = observationPlanLabel(targetPlan);
  state.observationPlanInlineStatus = null;
  state.observationPlanPendingConfirm = {
    type: "switch",
    planId: id,
    message: t("observationPlanSwitchConfirm").replace("{name}", label)
  };
  renderObservationPlans();
}

function queueObservationPlanDeleteConfirm(id = "") {
  const plans = state.observationPlans?.plans || [];
  const plan = plans.find((item) => item.id === id);
  if (!plan || plan.builtIn) return;
  const label = observationPlanLabel(plan);
  state.observationPlanInlineStatus = null;
  state.observationPlanPendingConfirm = {
    type: "delete",
    planId: id,
    message: t("observationPlanDeleteConfirm").replace("{name}", label)
  };
  renderObservationPlans();
  revealObservationPlanConfirmStart();
}

function cancelObservationPlanPendingConfirm() {
  const pending = state.observationPlanPendingConfirm;
  const activePlan = state.observationPlans?.active || (state.observationPlans?.plans || []).find((plan) => plan.active);
  state.observationPlanPendingConfirm = null;
  if (pending?.type === "switch" && elements.observationPlanSelect && activePlan?.id) {
    state.observationPlanPreviewId = activePlan.id;
    elements.observationPlanSelect.value = activePlan.id;
  }
  renderObservationPlans();
  showObservationPlanInlineStatus("canceled", t("observationPlanCanceledInline"));
}

async function confirmObservationPlanPendingAction() {
  const pending = state.observationPlanPendingConfirm;
  if (!pending?.planId) return;
  state.observationPlanPendingConfirm = { ...pending, busy: true };
  renderObservationPlans();
  if (pending.type === "switch") {
    await switchObservationPlan(pending.planId, { confirmed: true });
    return;
  }
  if (pending.type === "delete") {
    await deleteObservationPlan(pending.planId, { confirmed: true });
  }
}

async function exportObservationPlanPendingDeleteBackup() {
  const pending = state.observationPlanPendingConfirm;
  if (pending?.type !== "delete") return;
  await exportPortableData({ silent: true });
  state.observationPlanPendingConfirm = { ...pending, backupExported: true };
  renderObservationPlans();
}

function showNoteInlineStatus(kind, label) {
  if (state.noteInlineStatusTimer) {
    clearTimeout(state.noteInlineStatusTimer);
  }
  const fullName = state.selected?.fullName || "";
  const icon = kind === "deleted" ? "trash" : kind === "canceled" ? "x" : "check";
  state.noteInlineStatus = { fullName, kind, label, icon };
  renderDetailPreservingScroll(state.selected);
  state.noteInlineStatusTimer = setTimeout(() => {
    const statusFullName = state.noteInlineStatus?.fullName || "";
    state.noteInlineStatus = null;
    state.noteInlineStatusTimer = null;
    if (statusFullName) clearNoteInlineStatusDom(statusFullName);
  }, 2000);
}

function showSettingsInlineStatus(kind, label) {
  if (!elements.saveSettingsStatus) return;
  if (state.settingsInlineStatusTimer) {
    clearTimeout(state.settingsInlineStatusTimer);
  }
  const statusShell = elements.saveSettingsStatusShell || elements.saveSettingsStatus;
  elements.saveSettingsStatus.className = `observation-plan-inline-status ${kind || ""}`;
  elements.saveSettingsStatus.innerHTML = iconLabel(kind === "failed" || kind === "canceled" ? "x" : "check", label || "");
  statusShell.hidden = false;
  state.settingsInlineStatusTimer = setTimeout(() => {
    statusShell.hidden = true;
    elements.saveSettingsStatus.innerHTML = "";
    state.settingsInlineStatusTimer = null;
  }, 2000);
}

function updateSaveSettingsButton() {
  const button = elements.saveSettingsButton;
  if (!button) return;
  const saving = state.settingsSaveStatus === "saving";
  const saved = state.settingsSaveStatus === "saved";
  button.disabled = saving;
  button.classList.toggle("local-action-loading", saving);
  button.classList.toggle("local-action-done", saved);
  button.setAttribute("aria-busy", saving ? "true" : "false");
  button.innerHTML = saving ? renderActionLabelContent("save", t("savingSettings"), true) : iconLabel(saved ? "check" : "save", t(saved ? "settingsSaved" : "saveSettings"));
}

function showSaveSettingsCompleteStatus() {
  if (state.settingsSaveTimer) {
    clearTimeout(state.settingsSaveTimer);
  }
  state.settingsSaveStatus = "saved";
  updateSaveSettingsButton();
  state.settingsSaveTimer = setTimeout(() => {
    state.settingsSaveStatus = "";
    state.settingsSaveTimer = null;
    updateSaveSettingsButton();
  }, 2000);
}

function showGithubTestInlineStatus(kind = "success") {
  if (!elements.githubTestStatus) return;
  if (state.githubTestInlineStatusTimer) {
    clearTimeout(state.githubTestInlineStatusTimer);
  }
  const statusShell = elements.githubTestStatusShell || elements.githubTestStatus;
  const failed = kind === "failed";
  elements.githubTestStatus.className = `observation-plan-inline-status ${failed ? "failed" : ""}`;
  elements.githubTestStatus.innerHTML = iconSvg(failed ? "x" : "check");
  statusShell.hidden = false;
  state.githubTestInlineStatusTimer = setTimeout(() => {
    statusShell.hidden = true;
    elements.githubTestStatus.innerHTML = "";
    state.githubTestInlineStatusTimer = null;
  }, 2000);
}

function showCopyUrlInlineStatus(fullName) {
  clearTimeout(state.copyUrlStatusTimer);
  state.copiedUrlFullName = fullName;
  renderDetailPreservingScroll(state.selected);
  state.copyUrlStatusTimer = setTimeout(() => {
    if (state.copiedUrlFullName !== fullName) return;
    state.copiedUrlFullName = "";
    resetCopyUrlButton(fullName);
  }, 1600);
}

function showAnalysisCompleteStatus(fullName) {
  clearTimeout(state.analysisCompleteTimer);
  state.analysisCompleteFullName = fullName;
  renderDetailPreservingScroll(state.selected);
  state.analysisCompleteTimer = setTimeout(() => {
    if (state.analysisCompleteFullName !== fullName) return;
    state.analysisCompleteFullName = "";
    resetAnalysisCompleteButton(fullName);
  }, 1600);
}

function showLearningInlineStatus(kind, label) {
  clearTimeout(state.learningInlineStatusTimer);
  state.learningInlineStatus = { kind, label };
  renderLearning(state.memory);
  state.learningInlineStatusTimer = setTimeout(() => {
    state.learningInlineStatus = null;
    state.learningInlineStatusTimer = null;
    clearLearningInlineStatusDom();
  }, 2000);
}

function showMemoryClearCompleteStatus(label) {
  clearTimeout(state.memoryClearCompleteTimer);
  state.memoryClearCompleteStatus = label;
  renderLearning(state.memory);
  state.memoryClearCompleteTimer = setTimeout(() => {
    state.memoryClearCompleteStatus = "";
    state.memoryClearCompleteTimer = null;
    clearMemoryCompleteStatusDom();
  }, 2000);
}

function showLearningPolicySaveCompleteStatus() {
  clearTimeout(state.learningPolicySaveTimer);
  state.learningPolicySaveStatus = "saved";
  renderLearning(state.memory);
  state.learningPolicySaveTimer = setTimeout(() => {
    state.learningPolicySaveStatus = "";
    state.learningPolicySaveTimer = null;
    resetLearningPolicySaveButton();
  }, 2000);
}

function showLearningContextCompactCompleteStatus() {
  clearTimeout(state.learningContextCompactTimer);
  state.learningContextCompactStatus = "saved";
  renderLearning(state.memory);
  state.learningContextCompactTimer = setTimeout(() => {
    state.learningContextCompactStatus = "";
    state.learningContextCompactTimer = null;
    resetLearningContextCompactButton();
  }, 2000);
}

function handleGithubConnectionFailure() {
  setGithubTokenIssue(true);
  showGithubTestInlineStatus("failed");
  if (state.githubTestRedirectTimer) {
    clearTimeout(state.githubTestRedirectTimer);
  }
  state.githubTestRedirectTimer = setTimeout(() => {
    state.githubTestRedirectTimer = null;
    openSettingsFor("github", { focus: true });
  }, 2000);
}

function renderObservationPlans() {
  if (!elements.observationPlanSelect) return;
  const plans = state.observationPlans?.plans || [];
  const storedActive = state.observationPlans?.active || null;
  const active = plans.find((plan) => plan.id === storedActive?.id) || plans.find((plan) => plan.active) || plans[0] || storedActive || null;
  const selectedId = state.observationPlanPreviewId || elements.observationPlanSelect.value || active?.id || "";
  const preview = plans.find((plan) => plan.id === selectedId) || active;
  state.observationPlanPreviewId = preview?.id || "";
  elements.observationPlanSelect.innerHTML = plans
    .map(
      (plan) =>
        `<option value="${escapeHtml(plan.id)}" ${preview?.id === plan.id ? "selected" : ""}>${escapeHtml(observationPlanLabel(plan))}</option>`
    )
    .join("");
  if (preview?.id) {
    elements.observationPlanSelect.value = preview.id;
  }
  const currentPreview = preview;
  if (elements.observationPlanPicker) {
    elements.observationPlanPicker.innerHTML = renderObservationPlanPicker(plans, currentPreview, active);
  }
  const draft = state.observationPlanDraft;
  const editable = draft || currentPreview || {};
  if (elements.observationPlanName && document.activeElement !== elements.observationPlanName) {
    if (draft) {
      elements.observationPlanName.value = observationPlanLabel(draft);
    }
  }
  if (elements.observationPlanLogic && document.activeElement !== elements.observationPlanLogic) {
    elements.observationPlanLogic.value = formatObservationPlanLogic(editable);
    elements.observationPlanLogic.hidden = !draft;
  }
  if (elements.observationPlanStatus) {
    const label = observationPlanLabel(preview);
    const previewOnly = preview?.id && active?.id && preview.id !== active.id && !draft;
    const baseStatus = active ? (previewOnly ? t("observationPlanPreviewOnly").replace("{name}", label) : t("observationPlanSwitchHint")) : "";
    const draftNotice = draft ? state.observationPlanDraftNotice || "" : "";
    elements.observationPlanStatus.textContent = [baseStatus, draftNotice].filter(Boolean).join(" · ");
  }
  if (elements.observationPlanToolbar) {
    elements.observationPlanToolbar.innerHTML = renderObservationPlanToolbar(editable, draft);
  }
  updateObservationPlanSwitchButton();
  if (elements.observationPlanRequirements) {
    elements.observationPlanRequirements.innerHTML = renderObservationPlanRequirements(editable, { canDelete: state.observationPlanEditMode === "edit" && !editable?.builtIn });
  }
  if (elements.observationPlanView) {
    elements.observationPlanView.hidden = Boolean(draft);
    elements.observationPlanView.innerHTML = draft ? "" : renderObservationPlanReadable(editable);
  }
  updateObservationPlanGenerateButton();
}

function renderGithubPanel() {
  if (!elements.githubAccount || !elements.githubRepos) return;
  const configured = Boolean(state.config?.githubConfigured || state.settings?.githubTokenSet);
  const user = state.githubUser;
  const connected = Boolean(user?.login);
  if (elements.testGithubButton) {
    elements.testGithubButton.disabled = connected;
    elements.testGithubButton.classList.toggle("is-connected", connected);
    setIconButtonContent(elements.testGithubButton, connected ? "check" : "plug", connected ? t("githubConnected") : t("testGithub"));
  }
  if (elements.refreshGithubReposButton) {
    elements.refreshGithubReposButton.disabled = false;
    setIconButtonContent(elements.refreshGithubReposButton, "refresh", t("refreshGithubRepos"));
  }

  if (!configured) {
    elements.githubAccount.innerHTML = `
      <div class="github-empty">
        <strong>${escapeHtml(t("githubFailed"))}</strong>
        <p>${escapeHtml(t("githubNotConfiguredHelp"))}</p>
      </div>
    `;
    elements.githubRepos.innerHTML = "";
    return;
  }

  elements.githubAccount.innerHTML = user
    ? `
      <div class="github-account-card">
        ${user.avatarUrl ? `<img src="${escapeHtml(user.avatarUrl)}" alt="" />` : `<div class="github-avatar-fallback">GH</div>`}
        <div>
          <strong>${escapeHtml(user.name || user.login || "GitHub")}</strong>
          <span>${escapeHtml(t("githubConnected"))} · @${escapeHtml(user.login || "-")}</span>
        </div>
        ${safeExternalUrl(user.url, { hosts: ["github.com"] }) ? `<a class="repo-link" href="${escapeHtml(safeExternalUrl(user.url, { hosts: ["github.com"] }))}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("openGitHub"))}</a>` : ""}
      </div>
    `
    : `
      <div class="github-empty">
        <strong>${escapeHtml(t("githubHub"))}</strong>
        <p>${escapeHtml(t("githubConnectHelp"))}</p>
      </div>
    `;

  if (!connected) {
    elements.githubRepos.innerHTML = `
      <div class="github-empty compact">
        <strong>${escapeHtml(t("myGithubProjects"))}</strong>
        <p>${escapeHtml(t("githubReposNeedConnection"))}</p>
      </div>
    `;
    return;
  }

  if (!state.githubReposLoaded) {
    elements.githubRepos.innerHTML = `
      <div class="github-empty compact">
        <strong>${escapeHtml(t("myGithubProjects"))}</strong>
        <p>${escapeHtml(t("githubReposNotLoaded"))}</p>
      </div>
    `;
    return;
  }

  const repos = state.githubRepos || [];
  elements.githubRepos.innerHTML = repos.length
    ? `
      <div class="github-repo-head">
        <strong>${escapeHtml(t("myGithubProjects"))}</strong>
        <span>${fmtNumber(repos.length)}</span>
      </div>
      ${repos
        .slice(0, 50)
        .map((repo) => {
          const visibility = repo.private ? t("privateRepo") : t("publicRepo");
          const description = repo.description || (state.language === "zh" ? "暂无仓库简介" : "No description");
          return `
            <article class="github-repo-item">
              <div>
                <strong>${escapeHtml(repo.fullName)}</strong>
                <p>${escapeHtml(description)}</p>
                <span>${escapeHtml(visibility)} · ${fmtNumber(repo.stars)} ${escapeHtml(t("stars"))} · ${fmtNumber(repo.forks)} ${escapeHtml(t("forks"))} · ${escapeHtml(languageLabel(repo.language))}</span>
              </div>
              <a class="repo-link" href="${escapeHtml(safeExternalUrl(repo.url, { hosts: ["github.com"] }))}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("openRepo"))}</a>
            </article>
          `;
        })
        .join("")}
    `
    : `
      <div class="github-empty compact">
        <strong>${escapeHtml(t("myGithubProjects"))}</strong>
        <p>${escapeHtml(t("githubRepoEmpty"))}</p>
      </div>
    `;
}

function collectFilters() {
  state.filters.q = elements.searchInput.value.trim();
  state.filters.watchlist = elements.watchFilter.checked;
}

function exportUrl(format) {
  collectFilters();
  const params = new URLSearchParams({
    format,
    language: state.language,
    q: state.filters.q,
    tag: state.filters.tag,
    semanticProblem: state.filters.semanticProblem,
    semanticAudience: state.filters.semanticAudience,
    semanticShape: state.filters.semanticShape,
    projectLanguage: state.filters.language,
    category: state.filters.category,
    license: state.filters.license,
    triageStatus: state.filters.triageStatus,
    aiAnalysis: state.filters.aiAnalysis,
    risk: state.filters.risk,
    sort: state.filters.sort,
    limit: "2000"
  });
  if (state.filters.watchlist) params.set("watchlist", "true");
  return `/api/export?${params.toString()}`;
}

function projectPoolParams(limit = String(state.projectPool.pageSize), offset = "0") {
  collectFilters();
  const params = new URLSearchParams({
    q: state.filters.q,
    tag: state.filters.tag,
    semanticProblem: state.filters.semanticProblem,
    semanticAudience: state.filters.semanticAudience,
    semanticShape: state.filters.semanticShape,
    projectLanguage: state.filters.language,
    category: state.filters.category,
    license: state.filters.license,
    triageStatus: state.filters.triageStatus,
    aiAnalysis: state.filters.aiAnalysis,
    risk: state.filters.risk,
    sort: state.filters.sort,
    limit
  });
  if (offset !== "0") params.set("offset", offset);
  if (state.filters.watchlist) params.set("watchlist", "true");
  return params;
}

function summaryParams() {
  collectFilters();
  const params = new URLSearchParams({
    q: state.filters.q,
    tag: state.filters.tag,
    semanticProblem: state.filters.semanticProblem,
    semanticAudience: state.filters.semanticAudience,
    semanticShape: state.filters.semanticShape,
    projectLanguage: state.filters.language,
    category: state.filters.category,
    license: state.filters.license,
    triageStatus: state.filters.triageStatus,
    aiAnalysis: state.filters.aiAnalysis,
    risk: state.filters.risk
  });
  if (state.filters.watchlist) params.set("watchlist", "true");
  return params;
}

function summaryUrl() {
  return `/api/summary?${summaryParams().toString()}`;
}

function resetProjectListPosition() {
  const projectScroll = projectListScrollElement();
  if (!projectScroll) return;
  projectScroll.scrollTop = 0;
  projectScroll.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
  elements.projectRows.closest(".project-table-panel")?.scrollIntoView({ block: "start", behavior: "auto" });
}

function renderProjectPoolPage() {
  if (isPlanTransitionActive()) {
    renderProjectPoolTransitionState();
    return;
  }
  renderProjects({
    items: state.projectPool.items,
    total: state.projectPool.total,
    limit: state.projectPool.pageSize
  });
}

function setProjectPage(page, options = {}) {
  const pageCount = Math.max(1, Math.ceil(state.projectPool.total / state.projectPool.pageSize));
  state.projectPool.page = Math.max(1, Math.min(pageCount, Number(page || 1)));
  loadProjects({ scrollTop: options.scrollTop !== false, refreshSummary: false }).catch((error) => toast(error.message));
}

async function findProjectPoolPosition(fullName) {
  const params = projectPoolParams(String(state.projectPool.pageSize), "0");
  params.set("fullName", fullName);
  params.set("pageSize", String(state.projectPool.pageSize));
  return api(`/api/projects/position?${params.toString()}`);
}

function scheduleSummaryRefresh(delay = 320) {
  clearTimeout(state.summaryRefreshTimer);
  state.summaryRefreshTimer = setTimeout(() => {
    state.summaryRefreshTimer = 0;
    refreshSummaryInBackground().catch(() => {});
  }, delay);
}

async function refreshSummaryInBackground() {
  if (state.summaryRefreshInFlight) {
    state.summaryRefreshQueued = true;
    return state.summaryRefreshInFlight;
  }
  const currentRequestId = ++state.summaryRequestId;
  const url = summaryUrl();
  state.summaryRefreshInFlight = api(url).catch(() => null);
  try {
    const summary = await state.summaryRefreshInFlight;
    if (!summary || currentRequestId !== state.summaryRequestId || url !== summaryUrl()) return;
    state.summary = summary;
    renderSummary(summary);
    renderChips();
  } finally {
    state.summaryRefreshInFlight = null;
    if (state.summaryRefreshQueued) {
      state.summaryRefreshQueued = false;
      scheduleSummaryRefresh(120);
    }
  }
}

function applyProjectResponse(projects, options = {}) {
  const resetPosition = Boolean(options.resetPosition);
  const scrollTop = options.scrollTop !== false;
  if (resetPosition) {
    state.projectPool.page = 1;
    state.selected = null;
    state.restoredSelectedFullName = "";
    state.pendingRestoredProjectFullName = "";
  }
  renderProjects(projects);
  if (resetPosition || scrollTop) {
    resetProjectListPosition();
  }
  if (state.selected) {
    const fresh = projects.items.find((project) => project.fullName === state.selected.fullName);
    if (fresh) {
      state.selected = fresh;
      renderDetail(fresh);
    } else {
      state.selected = null;
      renderDetail(null);
    }
  } else {
    renderDetail(null);
  }
}

async function loadProjects(options = {}) {
  const requestId = ++state.projectRequestId;
  const resetPosition = Boolean(options.resetPosition);
  if (resetPosition) {
    state.projectPool.page = 1;
  }
  const offset = Math.max(0, (state.projectPool.page - 1) * state.projectPool.pageSize);
  const params = projectPoolParams(String(state.projectPool.pageSize), String(offset));
  const projects = await api(`/api/projects?${params.toString()}`);
  const normalizedProjects = {
    ...projects,
    items: (projects.items || []).map(projectWithRestoredNoteDraft)
  };
  if (requestId !== state.projectRequestId) return;
  applyProjectResponse(normalizedProjects, options);
  rememberDefaultProjectPoolSnapshot();
  state.projectPoolPreviewSnapshot = null;
  if (options.refreshSummary !== false) {
    scheduleSummaryRefresh(options.summaryDelay ?? 320);
  }
}

async function loadLeaderboard(period = state.leaderboardPeriod, date = state.leaderboardDate) {
  state.leaderboardPeriod = period;
  state.leaderboardDate = period === "daily" ? date || "" : "";
  const params = new URLSearchParams({
    period: state.leaderboardPeriod,
    limit: String(LEADERBOARD_LIMIT)
  });
  if (state.leaderboardPeriod === "daily" && state.leaderboardDate) {
    params.set("date", state.leaderboardDate);
  }
  state.leaderboard = await api(`/api/leaderboard?${params.toString()}`);
  renderLeaderboard(state.leaderboard);
}

async function restoreDurableTask(task) {
  if (!task?.id) return;
  const fullName = task.type === "analysis" ? String(task.key || "").replace(/^analysis:/, "") : "";
  if (task.type === "analysis" && fullName) {
    state.analysisInFlight = { ...(state.analysisInFlight || {}), [fullName]: true };
  }
  if (task.type === "plan-generation") state.observationPlanGenerating = true;
  try {
    const result = await waitForDurableTaskResponse({ task });
    if (task.type === "analysis" && result) {
      state.analysis[fullName] = result.analysis || null;
      if (result.project) mergeLocalProject(result.project);
      delete state.analysisInFlight[fullName];
      renderGithubActionSurfaces();
      if (state.selected?.fullName === fullName) {
        showAnalysisCompleteStatus(fullName);
        scrollAnalysisSectionToTop();
      }
    }
    if (task.type === "plan-generation" && result?.plan) {
      state.observationPlanDraft = { ...result.plan, name: result.plan.name, nameEn: result.plan.nameEn || result.plan.name };
      state.observationPlanEditMode = "draft";
      state.observationPlanDraftNotice = t("observationPlanDraftReady");
      showObservationPlanInlineStatus("saved", t("observationPlanGenerated"), { preserveInputs: true });
      renderObservationPlans();
    }
    if (task.type === "scan") {
      state.projectPool.page = 1;
      state.selected = null;
      switchView("projects");
      await loadProjects({ resetPosition: true });
      await loadLeaderboard(state.leaderboardPeriod, state.leaderboardDate).catch(() => {});
      queueIndexedDbSnapshotSync("restored-scan-complete", 250, { force: true, syncProjects: true });
    }
  } catch (error) {
    if (task.type === "plan-generation") showObservationPlanInlineStatus("failed", error.message, { preserveInputs: true });
    if (task.type === "scan") {
      renderScanStatus({ status: "failed", stage: "failed", percent: 0, error: error.message });
    }
  } finally {
    if (fullName) delete state.analysisInFlight[fullName];
    if (task.type === "plan-generation") state.observationPlanGenerating = false;
  }
}

async function restoreDurableTasks() {
  if (state.durableTasksRestored) return;
  state.durableTasksRestored = true;
  const remembered = durableTaskIds();
  const tasks = [];
  for (const id of remembered) {
    try {
      const response = await api(`/api/tasks/${encodeURIComponent(id)}`);
      if (response.task) tasks.push(response.task);
    } catch {
      forgetDurableTask(id);
    }
  }
  try {
    const response = await api("/api/tasks?limit=30");
    tasks.push(...(response.tasks || []).filter((task) => task.status === "queued" || task.status === "running"));
  } catch {
    /* Local browser mode completes operations in the current tab. */
  }
  const unique = Array.from(new Map(tasks.map((task) => [task.id, task])).values());
  await Promise.all(unique.map(restoreDurableTask));
}

async function loadAll(options = {}) {
  const leaderboardParams = new URLSearchParams({
    period: state.leaderboardPeriod,
    limit: String(LEADERBOARD_LIMIT)
  });
  if (state.leaderboardPeriod === "daily" && state.leaderboardDate) {
    leaderboardParams.set("date", state.leaderboardDate);
  }
  const [config, settings, scanProgress, observationPlans] = await Promise.all([
    api("/api/config"),
    api(`/api/settings${settingsRevealQuery()}`),
    api("/api/scan/status"),
    api("/api/observation-plans")
  ]);
  state.config = config;
  state.settings = settings;
  state.observationPlans = observationPlans;
  if (scanProgress?.running || scanProgress?.status === "running") {
    state.scanProgress = scanProgress;
  } else if (!options.preserveScanStatus) {
    state.scanProgress = {
      status: "idle",
      stage: "idle",
      percent: 0
    };
  }
  state.language = settings.language || state.language;
  applyTranslations();
  renderChips();
  renderConfig(config);
  renderSettings();
  renderGithubPanel();
  renderScanStatus(state.scanProgress);
  maybeShowInitialGuide();
  if (state.scanProgress.running || state.scanProgress.status === "running") {
    startScanProgressPolling();
  }
  await loadProjects({
    resetPosition: Boolean(options.resetProjectPool),
    refreshSummary: false
  });
  scheduleSummaryRefresh(700);
  loadSecondaryData(leaderboardParams).catch(() => {});
  restoreDurableTasks().catch(() => {});
  queueIndexedDbSnapshotSync("boot", INDEXEDDB_SNAPSHOT_BOOT_DELAY_MS);
}

async function loadSecondaryData(leaderboardParams) {
  api("/api/discovery")
    .then((discovery) => {
      state.discovery = discovery;
      renderSettings();
    })
    .catch(() => {});
  api(`/api/leaderboard?${leaderboardParams.toString()}`)
    .then((leaderboard) => {
      state.leaderboard = leaderboard;
      state.memory = state.memory || leaderboard.memory;
      renderLeaderboard(leaderboard);
      if (!state.memory && leaderboard.memory) {
        renderLearning(leaderboard.memory);
      }
    })
    .catch(() => {});
  api("/api/github/actions")
    .then((githubActions) => {
      state.githubActions = githubActions.actions || {};
      renderGithubActionSurfaces();
    })
    .catch(() => {});
  api("/api/memory")
    .then((memory) => {
      state.memory = memory || state.memory;
      renderLearning(state.memory);
    })
    .catch(() => {});
  loadDismissedProjects()
    .then(() => renderLearning(state.memory))
    .catch(() => {});
}

async function selectProject(fullName, options = {}) {
  const selectionRequestId = ++state.projectSelectionRequestId;
  const beforeTop = projectListScrollElement()?.scrollTop ?? 0;
  state.restoredSelectedFullName = "";
  state.pendingRestoredProjectFullName = "";
  const localProject = localProjectByFullName(fullName);
  if (localProject) {
    state.selected = localProject;
    markProjectPoolSelection(fullName);
    renderDetail(localProject);
  }
  const project = projectWithRestoredNoteDraft(await api(`/api/project?fullName=${encodeURIComponent(fullName)}`));
  if (selectionRequestId !== state.projectSelectionRequestId) {
    return state.selected;
  }
  state.selected = project;
  recordMemoryEvent(fullName, "select_project", { source: options.source || "ui" }).catch(() => {});
  renderDetail(project);
  if (options.renderList !== false) {
    renderProjectPoolPage();
    const projectScroll = projectListScrollElement();
    if (options.preserveListScroll !== false && projectScroll) {
      projectScroll.scrollTop = beforeTop;
    }
  } else {
    markProjectPoolSelection(fullName);
  }
  return project;
}

function markProjectPoolSelection(fullName) {
  if (!elements.projectRows) return;
  elements.projectRows.querySelectorAll(".repo-item").forEach((row) => {
    row.classList.toggle("selected", row.dataset.fullName === fullName);
  });
}

function focusSelectedProjectInPool(fullName, options = {}) {
  const behavior = options.behavior || "smooth";
  const row = [...(elements.projectRows?.querySelectorAll(".repo-item") || [])].find((item) => item.dataset.fullName === fullName);
  row?.scrollIntoView({ block: "center", behavior });
  elements.detailPanel?.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
}

async function applyPendingRestoredProjectSelection() {
  const fullName = state.pendingRestoredProjectFullName;
  if (!fullName || state.pendingRestoredProjectSelectionInFlight) return;
  state.pendingRestoredProjectSelectionInFlight = true;
  try {
    const position = await findProjectPoolPosition(fullName).catch(() => null);
    if (state.view !== "projects") return;
    if (position?.found && position.page && position.page !== state.projectPool.page) {
      state.projectPool.page = position.page;
      await loadProjects({ scrollTop: false, refreshSummary: false });
    }
    state.restoredSelectedFullName = fullName;
    state.selected = null;
    renderProjectPoolPage();
    renderDetail(null);
    requestAnimationFrame(() => {
      focusSelectedProjectInPool(fullName, { behavior: "auto" });
    });
    clearProjectDismissNoticeSoon(PROJECT_RESTORE_NOTICE_MS);
    state.pendingRestoredProjectFullName = "";
  } finally {
    state.pendingRestoredProjectSelectionInFlight = false;
  }
}

async function openProjectDetailInPool(fullName, source = "ui") {
  const fromLeaderboard = source === "leaderboard";
  if (fromLeaderboard) {
    state.leaderboardSelectedFullName = fullName;
    const leaderboardTop = elements.leaderboardList?.scrollTop ?? 0;
    renderLeaderboard(state.leaderboard);
    if (elements.leaderboardList) {
      elements.leaderboardList.scrollTop = leaderboardTop;
    }
    switchView("projects");
    const localProject = localProjectByFullName(fullName);
    if (localProject) {
      state.selected = localProject;
      renderDetail(localProject);
      renderProjectPoolPage();
    }
    const position = await findProjectPoolPosition(fullName);
    if (position?.found && position.page && position.page !== state.projectPool.page) {
      state.projectPool.page = position.page;
      await loadProjects({ scrollTop: false, refreshSummary: false });
      const fresh = state.projectPool.items.find((project) => project.fullName === fullName);
      if (fresh) {
        state.selected = fresh;
        renderDetail(fresh);
        renderProjectPoolPage();
      } else {
        await selectProject(fullName, { source, renderList: false });
      }
    } else {
      await selectProject(fullName, { source });
    }
  } else {
    switchView("projects");
    await selectProject(fullName, { source });
  }
  if (fromLeaderboard) {
    requestAnimationFrame(() => {
      focusSelectedProjectInPool(fullName, { behavior: "auto" });
    });
  } else {
    elements.detailPanel?.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
  }
}

async function openProjectDetailFromLeaderboard(fullName) {
  return openProjectDetailInPool(fullName, "leaderboard");
}

function localProjectByFullName(fullName) {
  if (state.selected?.fullName === fullName) return state.selected;
  return (
    state.projects.find((project) => project.fullName === fullName) ||
    (state.leaderboard?.items || []).find((project) => project.fullName === fullName) ||
    null
  );
}

function setMemory(memory, options = {}) {
  state.memory = memory || state.memory;
  if (state.leaderboard) {
    state.leaderboard.memory = state.memory || state.leaderboard.memory;
  }
  if (options.render !== false) {
    renderLearning(state.memory);
  }
  return state.memory;
}

async function refreshMemory(options = {}) {
  const memory = await api("/api/memory").catch(() => state.memory);
  return setMemory(memory, options);
}

async function loadDismissedProjects(options = {}) {
  const result = await api("/api/dismissed-projects").catch(() => ({ items: state.dismissedProjects || [] }));
  state.dismissedProjects = result.items || [];
  if (state.editingDismissedFeedback && !state.dismissedProjects.some((item) => item.fullName === state.editingDismissedFeedback)) {
    state.editingDismissedFeedback = "";
  }
  if (options.render !== false) {
    renderDismissedProjectSamples();
  }
  return state.dismissedProjects;
}

async function recordMemoryEvent(fullName, type, options = {}) {
  if (isPlanTransitionActive()) return;
  if (!fullName) return;
  const result = await api("/api/memory-event", {
    method: "POST",
    body: JSON.stringify({
      fullName,
      type,
      ...options
    })
  });
  setMemory(result.memory);
  await refreshObservationPlans();
}

async function toggleFavorite(fullName, options = {}) {
  if (isLocalActionBusy(fullName, "favorite")) return;
  const current = localProjectByFullName(fullName);
  const watched = !Boolean(current?.watched);
  const shouldResetFilters = shouldResetFiltersAfterManualUnfavorite(fullName, current, watched, options);
  setLocalActionBusy(fullName, "favorite", true, { render: false });
  applyLocalWatched(fullName, watched, { render: false });
  renderLocalActionSurfaces({ dismissed: false });
  try {
    const result = await api("/api/watchlist", {
      method: "POST",
      body: JSON.stringify({ fullName, watched })
    });
    if (result.project) {
      mergeLocalProject(result.project);
    }
    refreshLearningAfterLocalAction();
    loadLeaderboard(state.leaderboardPeriod, state.leaderboardDate).catch(() => {});
    if (shouldResetFilters) {
      resetAllFilters();
      applyProjectPoolSnapshot(state.defaultProjectPoolSnapshot);
      loadProjects({ resetPosition: true, refreshSummary: false }).catch(() => {});
    } else if (state.filters.watchlist) {
      loadProjects({ scrollTop: false, refreshSummary: false }).catch(() => {});
    }
  } catch (error) {
    applyLocalWatched(fullName, !watched, { render: false });
    loadProjects({ scrollTop: false, refreshSummary: false }).catch(() => {});
    throw error;
  } finally {
    setLocalActionBusy(fullName, "favorite", false, { render: false });
    renderLocalActionSurfaces({ dismissed: false });
  }
}

function clearProjectDismissNoticeSoon(duration = PROJECT_DISMISS_NOTICE_MS) {
  clearTimeout(state.projectDismissNoticeTimer);
  state.projectDismissNoticeTimer = setTimeout(() => {
    state.projectDismissNotice = null;
    clearProjectDismissNoticeDom();
  }, duration);
}

async function dismissProject(fullName, options = {}) {
  if (isLocalActionBusy(fullName, "dismiss")) return;
  const current = localProjectByFullName(fullName);
  const label = current ? displayProjectName(current) : fullName;
  const noticeSeq = ++state.projectDismissNoticeSeq;
  state.projectDismissNotice = {
    fullName,
    label,
    seq: noticeSeq,
    project: current ? { ...current } : null,
    poolIndex: Math.max(0, state.projectPool.items.findIndex((project) => project.fullName === fullName)),
    projectsIndex: Math.max(0, state.projects.findIndex((project) => project.fullName === fullName))
  };
  if (options.source === "leaderboard" && state.leaderboardPeriod === "daily" && state.leaderboardDate) {
    state.leaderboardDate = "";
  }
  setLocalActionBusy(fullName, "dismiss", true, { render: false });
  hideLocalProject(fullName);
  clearProjectDismissNoticeSoon(PROJECT_DISMISS_NOTICE_MS);
  try {
    const result = await api("/api/project-dismissal", {
      method: "POST",
      body: JSON.stringify({ fullName, dismissed: true })
    });
    setMemory(result.memory);
  } catch (error) {
    if (state.projectDismissNotice?.seq === noticeSeq) {
      state.projectDismissNotice = null;
    }
    await loadProjects({ scrollTop: false, refreshSummary: false }).catch(() => {});
    await loadLeaderboard(state.leaderboardPeriod, state.leaderboardDate).catch(() => {});
    throw error;
  } finally {
    setLocalActionBusy(fullName, "dismiss", false, { render: false });
  }
  if (state.selected?.fullName === fullName) {
    state.selected = null;
    renderDetail(null);
  }
  refreshLearningAfterLocalAction();
  loadProjects({ scrollTop: false, refreshSummary: false }).catch(() => {});
  loadLeaderboard(state.leaderboardPeriod, state.leaderboardDate).catch(() => {});
  loadDismissedProjects().catch(() => {});
}

async function undoDismissProject(fullName) {
  const notice = state.projectDismissNotice;
  if (!notice || notice.fullName !== fullName || notice.restored) return;
  if (isLocalActionBusy(fullName, "restore")) return;
  const noticeSeq = notice.seq;
  setLocalActionBusy(fullName, "restore", true);
  let renderedFinalState = false;
  try {
    const result = await api("/api/project-dismissal", {
      method: "POST",
      body: JSON.stringify({ fullName, dismissed: false })
    });
    if (state.projectDismissNotice?.seq !== noticeSeq || state.projectDismissNotice?.fullName !== fullName) {
      return;
    }
    const restoredProject = result.project || notice.project;
    state.projectDismissNotice = {
      fullName,
      label: restoredProject ? displayProjectName(restoredProject) : notice.label || fullName,
      restored: true,
      seq: noticeSeq
    };
    if (restoredProject) {
      restoreLocalProject(restoredProject, notice);
    }
    state.dismissedProjects = state.dismissedProjects.filter((item) => item.fullName !== fullName);
    setMemory(result.memory);
    setLocalActionBusy(fullName, "restore", false, { render: false });
    renderLocalActionSurfaces();
    renderedFinalState = true;
    refreshLearningAfterLocalAction();
    loadProjects({ scrollTop: false, refreshSummary: false }).catch(() => {});
    loadLeaderboard(state.leaderboardPeriod, state.leaderboardDate).catch(() => {});
    loadDismissedProjects().catch(() => {});
    clearProjectDismissNoticeSoon(PROJECT_RESTORE_NOTICE_MS);
  } finally {
    setLocalActionBusy(fullName, "restore", false, { render: !renderedFinalState });
  }
}

async function restoreDismissedProject(fullName) {
  if (isLocalActionBusy(fullName, "restore")) return;
  setLocalActionBusy(fullName, "restore", true);
  let renderedFinalState = false;
  try {
    const result = await api("/api/project-dismissal", {
      method: "POST",
      body: JSON.stringify({ fullName, dismissed: false })
    });
    state.selected = null;
    state.restoredSelectedFullName = fullName;
    state.pendingRestoredProjectFullName = fullName;
    if (state.editingDismissedFeedback === fullName) {
      state.editingDismissedFeedback = "";
    }
    clearTimeout(state.projectDismissNoticeTimer);
    state.projectDismissNoticeTimer = null;
    state.projectDismissNotice = {
      fullName,
      label: result.project ? displayProjectName(result.project) : fullName,
      restored: true
    };
    if (result.project) {
      mergeLocalProject(projectWithRestoredNoteDraft(result.project));
    }
    state.dismissedProjects = state.dismissedProjects.filter((item) => item.fullName !== fullName);
    setMemory(result.memory);
    setLocalActionBusy(fullName, "restore", false, { render: false });
    renderLocalActionSurfaces();
    renderedFinalState = true;
    refreshLearningAfterLocalAction();
    loadProjects({ scrollTop: false, refreshSummary: false }).catch(() => {});
    loadLeaderboard(state.leaderboardPeriod, state.leaderboardDate).catch(() => {});
    loadDismissedProjects().catch(() => {});
  } finally {
    setLocalActionBusy(fullName, "restore", false, { render: !renderedFinalState });
  }
}

async function saveDismissedFeedback(fullName, container) {
  if (!container) return;
  const valueFor = (field) => container.querySelector(`[data-dismissed-feedback="${field}"]`)?.value || "";
  const result = await api("/api/dismissed-project-feedback", {
    method: "POST",
    body: JSON.stringify({
      fullName,
      feedback: {
        problem: valueFor("problem"),
        audience: valueFor("audience"),
        shape: valueFor("shape"),
        note: valueFor("note") || valueFor("reason"),
        reason: valueFor("reason") || valueFor("note")
      }
    })
  });
  state.dismissedProjects = result.items || state.dismissedProjects;
  state.editingDismissedFeedback = "";
  showDismissedFeedbackInlineStatus(fullName, "saved", t("feedbackTagsSaved"));
}

function editDismissedFeedback(fullName) {
  state.dismissedFeedbackInlineStatus = null;
  state.editingDismissedFeedback = fullName;
  renderDismissedProjectSamples();
}

function cancelDismissedFeedback(fullName) {
  if (state.editingDismissedFeedback === fullName) {
    state.editingDismissedFeedback = "";
    showDismissedFeedbackInlineStatus(fullName, "canceled", t("observationPlanCanceledInline"));
  }
}

async function ensureProjectFavorite(fullName) {
  const current = localProjectByFullName(fullName);
  if (current?.watched) return false;
  await toggleFavorite(fullName, { silent: true });
  return true;
}

async function removeProjectFavorite(fullName) {
  const current = localProjectByFullName(fullName);
  if (!current?.watched) return false;
  await toggleFavorite(fullName, { silent: true });
  return true;
}

async function applyNoteStatusSideEffect(fullName, noteStatus, previousStatus = "") {
  if (noteStatus === "deep-dive") {
    return { favorited: await ensureProjectFavorite(fullName) };
  }
  if (noteStatus === "watch" && previousStatus === "deep-dive") {
    return { favoriteRemoved: await removeProjectFavorite(fullName) };
  }
  if (noteStatus === "skip") {
    await dismissProject(fullName, { source: "triage" });
    return { hidden: true };
  }
  return {};
}

async function saveNote(fullName, options = {}) {
  const pending = state.pendingNoteSaveConfirmation?.fullName === fullName ? state.pendingNoteSaveConfirmation : null;
  const noteText = options.confirmed && pending ? pending.text : document.querySelector("#note-text")?.value || "";
  const noteStatus = options.confirmed && pending ? pending.status : document.querySelector(".note-status-chip.active")?.dataset.status || "";
  const previousNoteStatus = options.confirmed && pending ? pending.previousStatus || "" : localProjectByFullName(fullName)?.triageStatus || state.selected?.triageStatus || "";
  state.openNoteSectionFullName = fullName;
  if (!noteStatus) {
    state.pendingNoteSaveConfirmation = null;
    state.pendingNoteDeleteConfirmation = null;
    state.noteDrafts[fullName] = { text: noteText, status: noteStatus };
    showNoteInlineStatus("failed", t("noteStatusRequired"));
    return;
  }
  if (!options.confirmed) {
    state.pendingNoteSaveConfirmation = { fullName, text: noteText, status: noteStatus, previousStatus: previousNoteStatus };
    state.pendingNoteDeleteConfirmation = null;
    state.noteDrafts[fullName] = { text: noteText, status: noteStatus };
    renderDetailPreservingScroll(state.selected);
    revealNoteSaveConfirmation(fullName);
    return;
  }
  state.pendingNoteSaveConfirmation = null;
  state.pendingNoteDeleteConfirmation = null;
  await api("/api/note", {
    method: "POST",
    body: JSON.stringify({ fullName, text: noteText, status: noteStatus })
  });
  delete state.noteDrafts[fullName];
  await refreshSelectedProjectAfterNoteChange(fullName);
  const sideEffect = await applyNoteStatusSideEffect(fullName, noteStatus, previousNoteStatus);
  showNoteInlineStatus("saved", noteSavedInlineLabel(noteStatus, sideEffect));
  await refreshMemory();
  await refreshObservationPlans();
}

async function confirmPendingNoteSave(fullName) {
  if (state.pendingNoteSaveConfirmation?.fullName !== fullName) return;
  await saveNote(fullName, { confirmed: true });
}

function cancelPendingNoteSave(fullName) {
  const pending = state.pendingNoteSaveConfirmation;
  if (!pending || pending.fullName !== fullName) return;
  state.noteDrafts[fullName] = { text: pending.text, status: pending.status };
  state.pendingNoteSaveConfirmation = null;
  renderDetailPreservingScroll(state.selected);
  showNoteInlineStatus("canceled", t("observationPlanCanceledInline"));
}

async function deleteNote(fullName, options = {}) {
  const pending = state.pendingNoteDeleteConfirmation?.fullName === fullName ? state.pendingNoteDeleteConfirmation : null;
  const savedNoteStatus = options.confirmed && pending ? pending.status || "" : localProjectByFullName(fullName)?.triageStatus || state.selected?.triageStatus || "";
  state.openNoteSectionFullName = fullName;
  if (!options.confirmed) {
    state.pendingNoteSaveConfirmation = null;
    state.pendingNoteDeleteConfirmation = { fullName, status: savedNoteStatus };
    renderDetailPreservingScroll(state.selected);
    revealNoteSaveConfirmation(fullName);
    return;
  }
  state.pendingNoteSaveConfirmation = null;
  state.pendingNoteDeleteConfirmation = null;
  delete state.noteDrafts[fullName];
  await api("/api/note", {
    method: "POST",
    body: JSON.stringify({ fullName, text: "", status: "" })
  });
  await refreshSelectedProjectAfterNoteChange(fullName);
  const sideEffect = {};
  if (savedNoteStatus === "deep-dive") {
    sideEffect.favoriteRemoved = await removeProjectFavorite(fullName);
  }
  showNoteInlineStatus("deleted", noteDeletedInlineLabel(sideEffect));
  await refreshMemory();
  await refreshObservationPlans();
}

async function confirmPendingNoteDelete(fullName) {
  if (state.pendingNoteDeleteConfirmation?.fullName !== fullName) return;
  await deleteNote(fullName, { confirmed: true });
}

function cancelPendingNoteDelete(fullName) {
  const pending = state.pendingNoteDeleteConfirmation;
  if (!pending || pending.fullName !== fullName) return;
  state.openNoteSectionFullName = fullName;
  state.pendingNoteDeleteConfirmation = null;
  renderDetailPreservingScroll(state.selected);
  showNoteInlineStatus("canceled", t("observationPlanCanceledInline"));
}

async function analyzeProject(fullName) {
  if (state.analysisInFlight?.[fullName]) return;
  if (!requireAiProviderCredential({ messageKey: "aiCredentialRequiredAnalyze", analysisFullName: fullName })) {
    return;
  }
  const method = "balanced";
  const userNeed = document.querySelector("#analysis-need")?.value || state.analysisDrafts[fullName]?.userNeed || "";
  state.analysisDrafts[fullName] = {
    userNeed
  };
  state.analysisInFlight = {
    ...(state.analysisInFlight || {}),
    [fullName]: true
  };
  renderDetailPreservingScroll(state.selected);
  try {
    const result = await waitForDurableTaskResponse(
      await api("/api/analyze", {
        method: "POST",
        body: JSON.stringify({ fullName, method, userNeed })
      })
    );
    state.analysis[fullName] = result.analysis || null;
    const analyzedProject = result.project
      ? { ...result.project, analysis: result.analysis || result.project.analysis || null }
      : null;
    if (analyzedProject) {
      mergeLocalProject(analyzedProject);
    }
    await refreshObservationPlans();
    renderGithubActionSurfaces();
    delete state.analysisInFlight[fullName];
    showAnalysisCompleteStatus(fullName);
    scrollAnalysisSectionToTop();
  } catch (error) {
    delete state.analysisInFlight[fullName];
    renderDetailPreservingScroll(state.selected);
    throw error;
  }
}

async function runScan(options = {}) {
  if (!githubCredentialReady()) {
    if (isPlanTransitionActive()) {
      failPlanTransition(t("githubTokenRequiredScan"));
    }
    promptCredentialSetup("github", { messageKey: "githubTokenRequiredScan", scan: true });
    return;
  }
  elements.scanButton.disabled = true;
  state.scanEtaDisplaySeconds = null;
  state.scanEtaUpdatedAt = 0;
  clearScanIdleReset();
  renderScanStatus({
    status: "running",
    stage: "prepare",
    percent: 1
  });
  startScanProgressPolling();
  try {
    const result = await api("/api/scan", {
      method: "POST",
      body: JSON.stringify({ mode: "manual" })
    });
    if (result.task) rememberDurableTask(result.task);
    if (result.status === "already-running") {
      const finalProgress = await loadScanProgress({ scheduleIdleReset: false }).catch(() => null);
      if (finalProgress) renderScanStatus(finalProgress);
      startScanProgressPolling();
      return;
    }
    const finalProgress =
      result.status === "started"
        ? await waitForScanCompletion()
        : await loadScanProgress({ scheduleIdleReset: false }).catch(() => null);
    if (finalProgress?.status === "failed") {
      throw new Error(finalProgress.error || "Scan failed");
    }
    if (result.task?.id) forgetDurableTask(result.task.id);
    queueIndexedDbSnapshotSync("scan-complete", 250, { force: true, syncProjects: true });
    clearScanIdleReset();
    renderScanStatus(finalProgress || {
      status: "completed",
      stage: "completed",
      percent: 100
    });
    state.projectPool.page = 1;
    state.selected = null;
    state.restoredSelectedFullName = "";
    state.pendingRestoredProjectFullName = "";
    switchView("projects");
    await loadAll({ preserveScanStatus: true, resetProjectPool: true });
    queueIndexedDbSnapshotSync("scan-completed", 1200, { force: true });
    if (isPlanTransitionActive()) {
      await loadLeaderboard(state.leaderboardPeriod, state.leaderboardDate).catch(() => {});
    }
    if (isPlanTransitionActive()) {
      completePlanTransition();
    }
    scheduleScanIdleReset();
  } catch (error) {
    const message = scanErrorMessage(error);
    renderScanStatus({
      status: "failed",
      stage: "failed",
      percent: 0,
      error: message
    });
    if (isPlanTransitionActive()) {
      failPlanTransition(message);
    }
    if (isGithubTokenScanError(error)) {
      setGithubTokenIssue(true);
      openSettingsFor("github", { focus: false });
    }
    scheduleScanIdleReset(2600);
  } finally {
    const stillRunning = Boolean(state.scanProgress.running || state.scanProgress.status === "running");
    if (!stillRunning) {
      stopScanProgressPolling();
    }
    elements.scanButton.disabled = stillRunning;
  }
}

function collectObservationPlanDraft() {
  const active = state.observationPlans?.active || {};
  const draft = state.observationPlanDraft || {};
  const nameInput = elements.observationPlanName?.value.trim() || "";
  const name = nameInput || observationPlanLabel(draft || active);
  const idea = elements.observationPlanIdea?.value.trim() || "";
  const ideaRequirements = state.observationPlanEditMode === "edit" ? observationPlanRequirementDraftsFromText(idea) : [];
  let parsedDraft = null;
  let searchLogic = draft.searchLogic || draft.strategy || active.searchLogic || active.strategy || null;
  const logicText = state.observationPlanDraft ? elements.observationPlanLogic?.value.trim() || "" : "";
  if (logicText) {
    try {
      parsedDraft = JSON.parse(logicText);
      searchLogic = parsedDraft.searchLogic || parsedDraft.strategy || parsedDraft;
    } catch (_) {
      throw new Error(t("observationPlanLogicInvalid"));
    }
  }
  if (!searchLogic) {
    searchLogic = {
      baseMode: "focused",
      keywords: idea ? [idea] : [],
      excludeTerms: [],
      customQueries: [],
      minStars: 20
    };
  }
  return {
    ...draft,
    ...(parsedDraft && typeof parsedDraft === "object" ? parsedDraft : {}),
    id: draft.id || (active?.builtIn || state.observationPlanDraft ? "" : active.id),
    name: nameInput || name,
    nameEn: nameInput || parsedDraft?.nameEn || draft.nameEn || name,
    description: parsedDraft?.description || draft.description || idea,
    descriptionEn: parsedDraft?.descriptionEn || draft.descriptionEn || idea,
    requirements: ideaRequirements.length ? ideaRequirements : Array.isArray(draft.requirements) ? draft.requirements : Array.isArray(parsedDraft?.requirements) ? parsedDraft.requirements : [],
    strategy: searchLogic,
    searchLogic
  };
}

async function switchObservationPlan(id = currentObservationPlanPreview()?.id || elements.observationPlanSelect?.value, options = {}) {
  if (!id) {
    showObservationPlanInlineStatus("canceled", t("observationPlanPreviewOnly").replace("{name}", observationPlanLabel(state.observationPlans?.active || {})));
    return;
  }
  const plans = state.observationPlans?.plans || [];
  const targetPlan = plans.find((plan) => plan.id === id);
  const activePlan = state.observationPlans?.active || plans.find((plan) => plan.active);
  if (targetPlan?.id === activePlan?.id && !options.force) {
    renderObservationPlans();
    showObservationPlanInlineStatus("saved", t("observationPlanSwitched"));
    return;
  }
  if (!options.silent && !options.confirmed) {
    queueObservationPlanSwitchConfirm(id);
    return;
  }
  state.observationPlanPendingConfirm = null;
  state.observationPlanSwitching = true;
  updateObservationPlanSwitchButton();
  try {
    const result = await api("/api/observation-plans/active", {
      method: "POST",
      body: JSON.stringify({ id })
    });
    state.observationPlans = {
      ...(state.observationPlans || {}),
      active: result.active || targetPlan || state.observationPlans?.active,
      plans: result.plans || state.observationPlans?.plans || []
    };
    state.observationPlanDraft = null;
    state.observationPlanEditMode = "";
    state.observationPlanInlineStatus = null;
    state.filters = { ...DEFAULT_FILTERS };
    if (elements.searchInput) elements.searchInput.value = "";
    state.selected = null;
    state.restoredSelectedFullName = "";
    state.pendingRestoredProjectFullName = "";
    if (elements.observationPlanSelect) {
      elements.observationPlanSelect.value = id;
    }
    state.observationPlanPreviewId = id;
    beginPlanTransition(state.observationPlans.active || targetPlan || {});
    renderObservationPlans();
    if (!options.silent) showObservationPlanInlineStatus("saved", t("observationPlanSwitchScan"));
    if (options.scan !== false) {
      await runScan({ source: "plan-switch" });
    } else {
      completePlanTransition();
    }
  } finally {
    state.observationPlanSwitching = false;
    updateObservationPlanSwitchButton();
  }
}

async function generateObservationPlan() {
  if (state.observationPlanGenerating) return;
  const nameInput = elements.observationPlanName?.value.trim() || "";
  const ideaInput = elements.observationPlanIdea?.value.trim() || "";
  if (!nameInput || !ideaInput) {
    showObservationPlanInlineStatus("failed", t("observationPlanGenerateRequired"), { preserveInputs: true });
    (nameInput ? elements.observationPlanIdea : elements.observationPlanName)?.focus?.();
    return;
  }
  if (!requireAiProviderCredential({ messageKey: "aiCredentialRequiredGenerate", observationPlan: true })) {
    return;
  }
  state.observationPlanGenerating = true;
  renderObservationPlans();
  let generated = false;
  const idea = ideaInput;
  const currentPlan = currentObservationPlanPreview();
  const isEditingObservationPlan = state.observationPlanEditMode === "edit" && Boolean(state.observationPlanDraft);
  const editingPlanId = isEditingObservationPlan ? state.observationPlanDraft?.id || currentPlan?.id || "" : "";
  try {
    const result = await waitForDurableTaskResponse(
      await api("/api/observation-plans/generate", {
        method: "POST",
        body: JSON.stringify({
          name: nameInput,
          idea
        })
      })
    );
    await refreshObservationPlans();
    if (elements.observationPlanSelect && editingPlanId) {
      elements.observationPlanSelect.value = editingPlanId;
    }
    const resultRequirements = Array.isArray(result.plan?.requirements) ? result.plan.requirements : [];
    const draftRequirements = resultRequirements.length ? resultRequirements : [];
    state.observationPlanDraft = {
      ...(result.plan || {}),
      id: editingPlanId || result.plan?.id,
      name: nameInput,
      nameEn: nameInput,
      requirements: draftRequirements
    };
    state.observationPlanEditMode = "draft";
    state.observationPlanInlineStatus = null;
    state.observationPlanDraftNotice =
      result.source === "ai"
        ? t("observationPlanDraftReady")
        : `${t("observationPlanDraftReady")} · ${t("observationPlanDraftFallback")}`;
    generated = true;
  } catch (error) {
    showObservationPlanInlineStatus("failed", error?.message || t("observationPlanGenerateFailed"), { preserveInputs: true });
  } finally {
    state.observationPlanGenerating = false;
    renderObservationPlans();
  }
  if (generated) {
    showObservationPlanInlineStatus("saved", t("observationPlanGenerated"), { preserveInputs: true });
    revealObservationPlanEditorStart();
  }
}

function previewObservationPlan(id) {
  if (!id || !elements.observationPlanSelect) return;
  state.observationPlanDraft = null;
  state.observationPlanEditMode = "";
  state.observationPlanInlineStatus = null;
  state.observationPlanPreviewId = id;
  elements.observationPlanSelect.value = id;
  renderObservationPlans();
}

function editObservationPlan(id = "") {
  const plans = state.observationPlans?.plans || [];
  const active = state.observationPlans?.active || plans.find((plan) => plan.active) || plans[0] || {};
  const selectedId = id || elements.observationPlanSelect?.value || active.id;
  const selected = plans.find((plan) => plan.id === selectedId) || active;
  if (elements.observationPlanSelect && selected?.id) {
    elements.observationPlanSelect.value = selected.id;
  }
  state.observationPlanPreviewId = selected?.id || "";
  if (selected?.builtIn) {
    state.observationPlanDraft = null;
    state.observationPlanEditMode = "";
    state.observationPlanInlineStatus = null;
    state.observationPlanDraftNotice = "";
    renderObservationPlans();
    return;
  }
  const label = observationPlanLabel(selected);
  state.observationPlanDraft = {
    ...selected,
    id: selected.id,
    builtIn: false,
    name: selected.name || label,
    nameEn: selected.nameEn || selected.name || label
  };
  state.observationPlanEditMode = "edit";
  state.observationPlanInlineStatus = null;
  state.observationPlanDraftNotice = "";
  renderObservationPlans();
  restoreObservationPlanFormValues({
    name: observationPlanLabel(state.observationPlanDraft),
    idea: observationPlanRequirementsText(selected)
  });
  revealObservationPlanEditorStart();
}

async function deleteObservationPlan(id = "", options = {}) {
  const plans = state.observationPlans?.plans || [];
  const plan = plans.find((item) => item.id === id);
  if (!plan || plan.builtIn) return;
  if (!options.confirmed) {
    queueObservationPlanDeleteConfirm(id);
    return;
  }
  const result = await api("/api/observation-plans/delete", {
    method: "POST",
    body: JSON.stringify({ id })
  });
  state.observationPlanPendingConfirm = null;
  state.observationPlanDraft = null;
  state.observationPlanEditMode = "";
  state.observationPlans = {
    ...(state.observationPlans || {}),
    plans: result.plans || state.observationPlans?.plans || []
  };
  const activeId = result.activeObservationPlanId || state.observationPlans.plans.find((item) => item.active)?.id || "default";
  const active = state.observationPlans.plans.find((item) => item.id === activeId) || state.observationPlans.plans[0] || null;
  state.observationPlans.active = active;
  if (elements.observationPlanSelect) {
    elements.observationPlanSelect.value = active?.id || "";
  }
  state.observationPlanPreviewId = active?.id || "";
  showObservationPlanInlineStatus("deleted", t("observationPlanDeletedInline"));
}

function currentObservationPlanPreview() {
  const plans = state.observationPlans?.plans || [];
  const storedActive = state.observationPlans?.active || null;
  const active = plans.find((plan) => plan.id === storedActive?.id) || plans.find((plan) => plan.active) || plans[0] || storedActive || {};
  const selectedId = state.observationPlanPreviewId || elements.observationPlanSelect?.value || active?.id || "";
  return plans.find((plan) => plan.id === selectedId) || active || {};
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

async function saveObservationPlanRequirements(planId = "", requirements = [], label = t("observationRequirementSavedInline")) {
  const result = await api("/api/observation-plans/requirements", {
    method: "POST",
    body: JSON.stringify({ id: planId, requirements })
  });
  state.observationPlans = {
    ...(state.observationPlans || {}),
    plans: result.plans || state.observationPlans?.plans || [],
    active: result.plan?.active ? result.plan : state.observationPlans?.active
  };
  if (elements.observationPlanSelect && planId) {
    elements.observationPlanSelect.value = planId;
  }
  if (state.observationPlanDraft?.id === planId || currentObservationPlanPreview()?.id === planId) {
    state.observationPlanDraft = state.observationPlanDraft
      ? { ...state.observationPlanDraft, requirements: result.plan?.requirements || requirements }
      : state.observationPlanDraft;
  }
  renderObservationPlans();
  showObservationPlanInlineStatus("deleted", label, { preserveInputs: true });
}

async function deleteObservationRequirement(index) {
  if (state.observationPlanDraft) {
    const requirements = Array.isArray(state.observationPlanDraft.requirements) ? [...state.observationPlanDraft.requirements] : [];
    if (!requirements[index]) return;
    requirements.splice(index, 1);
    state.observationPlanDraft = { ...state.observationPlanDraft, requirements };
    renderObservationPlans();
    showObservationPlanInlineStatus("deleted", t("observationRequirementDeletedInline"), { preserveInputs: true });
    return;
  }
  const plan = currentObservationPlanPreview();
  const requirements = Array.isArray(plan.requirements) ? [...plan.requirements] : [];
  if (!requirements[index]) return;
  requirements.splice(index, 1);
  await saveObservationPlanRequirements(plan.id, requirements, t("observationRequirementDeletedInline"));
}

function cancelObservationPlanDraft() {
  const shouldClearPrefilledInputs = state.observationPlanEditMode === "edit";
  state.observationPlanDraft = null;
  state.observationPlanEditMode = "";
  state.observationPlanDraftNotice = "";
  showObservationPlanInlineStatus("canceled", t("observationPlanCanceledInline"), shouldClearPrefilledInputs ? { clearInputs: true } : { preserveInputs: true });
}

async function saveObservationPlan() {
  const plan = collectObservationPlanDraft();
  const previousActive = state.observationPlans?.active || null;
  const result = await api("/api/observation-plans", {
    method: "POST",
    body: JSON.stringify({ plan })
  });
  state.observationPlanDraft = null;
  state.observationPlanEditMode = "";
  state.observationPlanDraftNotice = "";
  state.observationPlans = {
    ...(state.observationPlans || {}),
    plans: result.plans || state.observationPlans?.plans || [],
    active: previousActive || state.observationPlans?.active
  };
  if (elements.observationPlanSelect && result.plan?.id) {
    state.observationPlanPreviewId = result.plan.id;
    elements.observationPlanSelect.value = result.plan.id;
  }
  renderObservationPlans();
  showObservationPlanInlineStatus("saved", t("observationPlanSavedInline"), { clearInputs: true });
  if (result.plan?.id && result.plan.id !== previousActive?.id) {
    queueObservationPlanSwitchConfirm(result.plan.id);
  }
}

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function exportPortableData(options = {}) {
  const payload = await api("/api/portable-data/export");
  downloadJson(`starvault-config-learning-${new Date().toISOString().slice(0, 10)}.json`, payload);
  if (!options.silent) showObservationPlanInlineStatus("saved", t("portableDataExported"));
}

async function importPortableData() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json";
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const result = await api("/api/portable-data/import", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      state.observationPlans = {
        ...(state.observationPlans || {}),
        plans: result.plans || state.observationPlans?.plans || []
      };
      await loadAll({ resetProjectPool: true, preserveScanStatus: true });
      showObservationPlanInlineStatus("saved", t("portableDataImported"));
    } catch (error) {
      showObservationPlanActionError(error);
    }
  });
  input.click();
}

function collectSettings() {
  const previous = state.settings || {};
  const editedProviders = Array.from(document.querySelectorAll(".provider-item")).map((item) => {
    const id = item.dataset.providerId;
    const prior = (previous.llmProviders || []).find((provider) => provider.id === id) || {};
    const fields = {};
    item.querySelectorAll("[data-provider-field]").forEach((input) => {
      const field = input.dataset.providerField;
      if (input.type === "checkbox") {
        fields[field] = input.checked;
      } else {
        fields[field] = input.value.trim();
      }
    });
    if ((isSecretClearPending("provider", id) || isSecretVisible("provider", id)) && !fields.apiKey) {
      fields.clearApiKey = true;
    }
    return {
      ...prior,
      ...fields,
      id
    };
  });
  const editedById = new Map(editedProviders.map((provider) => [provider.id, provider]));
  const providers = (previous.llmProviders || []).map((provider) => editedById.get(provider.id) || provider);
  for (const provider of editedProviders) {
    if (!providers.some((item) => item.id === provider.id)) {
      providers.push(provider);
    }
  }

  return {
    language: previous.language || state.language,
    dailyBriefSize: Number(previous.dailyBriefSize || 120),
    activeProvider: previous.activeProvider || "deepseek",
    githubToken: elements.githubToken.value.trim(),
    tavilyKey: elements.tavilyKey.value.trim(),
    exaKey: elements.exaKey.value.trim(),
    clearGithubToken: (isSecretClearPending("github") || isSecretVisible("github")) && !elements.githubToken.value.trim(),
    clearTavilyKey: (isSecretClearPending("tavily") || isSecretVisible("tavily")) && !elements.tavilyKey.value.trim(),
    clearExaKey: (isSecretClearPending("exa") || isSecretVisible("exa")) && !elements.exaKey.value.trim(),
    llmProviders: providers
  };
}

async function saveSettings(options = {}) {
  if (!options.silent) {
    if (state.settingsSaveStatus === "saving") return;
    if (state.settingsSaveTimer) {
      clearTimeout(state.settingsSaveTimer);
      state.settingsSaveTimer = null;
    }
    state.settingsSaveStatus = "saving";
    updateSaveSettingsButton();
  }
  try {
    const next = collectSettings();
    const result = await api("/api/settings", {
      method: "POST",
      body: JSON.stringify(next)
    });
    const { keyValidation, ...settingsResult } = result;
    state.settings = settingsResult;
    applyServiceKeyValidation(keyValidation);
    resetPendingSecretClears();
    const [visibleSettings, configResult] = await Promise.all([
      loadSettingsWithVisibleSecrets(),
      api("/api/config").catch(() => state.config)
    ]);
    state.settings = visibleSettings;
    state.language = state.settings.language || "zh";
    state.config = configResult;
    if (!state.settings.githubTokenSet && !state.config?.githubConfigured) {
      state.githubUser = null;
      state.githubRepos = [];
      state.githubReposLoaded = false;
    }
    applyTranslations();
    renderChips();
    renderConfig(state.config);
    renderSettings();
    renderGithubPanel();
    renderSummary(state.summary);
    renderLeaderboard(state.leaderboard);
    renderLearning(state.memory);
    renderProjectPoolPage();
    renderDetail(state.selected);
    if (!options.silent) showSaveSettingsCompleteStatus();
  } catch (error) {
    if (!options.silent) {
      state.settingsSaveStatus = "";
      updateSaveSettingsButton();
    }
    throw error;
  }
}

async function refreshProviderCatalog(providerId = "deepseek") {
  return withProviderActionFeedback(providerId, "refresh-provider-catalog", "actionCompleted", async () => {
    await saveSettings({ silent: true });
    const result = await api("/api/provider-catalog/refresh", {
      method: "POST",
      body: JSON.stringify({})
    });
    state.settings = result.settings || state.settings;
    await loadSettingsWithVisibleSecrets();
    renderSettings();
    renderConfig({
      ...state.config,
      tavilyConfigured: state.settings?.tavilyKeySet || state.config?.tavilyConfigured,
      exaConfigured: state.settings?.exaKeySet || state.config?.exaConfigured
    });
  });
}

async function fetchProviderModels(providerId) {
  if (!aiProviderCredentialReady(providerId) && !providerApiKeyInputValue(providerId)) {
    promptCredentialSetup("ai", { messageKey: "aiCredentialRequiredAction" });
    return;
  }
  return withProviderActionFeedback(providerId, "fetch-provider-models", "modelsLoaded", async () => {
    await saveSettings({ silent: true });
    const result = await api("/api/provider-models", {
      method: "POST",
      body: JSON.stringify({ providerId })
    });
    state.settings = result.settings || state.settings;
    await loadSettingsWithVisibleSecrets();
    renderSettings();
  });
}

async function testProvider(providerId) {
  if (!aiProviderCredentialReady(providerId) && !providerApiKeyInputValue(providerId)) {
    promptCredentialSetup("ai", { messageKey: "aiCredentialRequiredAction" });
    return;
  }
  return withProviderActionFeedback(providerId, "test-provider", "providerReady", async () => {
    await saveSettings({ silent: true });
    const result = await api("/api/provider-test", {
      method: "POST",
      body: JSON.stringify({ providerId })
    });
    state.settings = result.settings || state.settings;
    await loadSettingsWithVisibleSecrets();
    renderSettings();
  });
}

async function submitLeaderboardFeedback(fullName, feedback) {
  const result = await api("/api/leaderboard-feedback", {
    method: "POST",
    body: JSON.stringify({ fullName, feedback })
  });
  setMemory(result.memory);
  showLearningInlineStatus("saved", t("feedbackSaved"));
  await refreshObservationPlans();
  await loadLeaderboard(state.leaderboardPeriod, state.leaderboardDate);
}

async function adjustMemoryPreference(kind, key, patch) {
  const result = await api("/api/memory-preference", {
    method: "POST",
    body: JSON.stringify({
      kind,
      key,
      ...patch
    })
  });
  setMemory(result.memory);
  showLearningInlineStatus("saved", t("memoryUpdated"));
  await refreshObservationPlans();
  await loadLeaderboard(state.leaderboardPeriod, state.leaderboardDate);
}

async function runHarnessEvaluation() {
  if (state.learningBusy) return;
  state.learningBusy = "harness";
  renderLearning(state.memory);
  try {
    const result = await api("/api/memory/harness/evaluate", {
      method: "POST",
      body: JSON.stringify({})
    });
    setMemory(result.memory, { render: false });
    showLearningInlineStatus("saved", t("harnessUpdated"));
    await refreshObservationPlans();
    await loadLeaderboard(state.leaderboardPeriod, state.leaderboardDate);
  } finally {
    state.learningBusy = "";
    renderLearning(state.memory);
  }
}

async function tuneMemory() {
  if (state.learningBusy) return;
  if (!requireAiProviderCredential({ messageKey: "aiCredentialRequiredTune", learning: true })) return;
  state.learningBusy = "tune";
  renderLearning(state.memory);
  try {
    const result = await api("/api/memory/harness/tune", {
      method: "POST",
      body: JSON.stringify({})
    });
    setMemory(result.memory, { render: false });
    showLearningInlineStatus("saved", t("memoryTuned"));
    await refreshObservationPlans();
    await loadLeaderboard(state.leaderboardPeriod, state.leaderboardDate);
  } finally {
    state.learningBusy = "";
    renderLearning(state.memory);
  }
}

async function compactMemory() {
  if (state.learningContextCompactStatus === "saving") return;
  clearTimeout(state.learningContextCompactTimer);
  state.learningContextCompactTimer = null;
  state.learningContextCompactStatus = "saving";
  renderLearning(state.memory);
  try {
    const result = await api("/api/memory/context/compact", {
      method: "POST",
      body: JSON.stringify({ force: true, manual: true })
    });
    setMemory(result.memory);
    await refreshObservationPlans();
    await loadLeaderboard(state.leaderboardPeriod, state.leaderboardDate);
    showLearningContextCompactCompleteStatus();
  } catch (error) {
    state.learningContextCompactStatus = "";
    renderLearning(state.memory);
    throw error;
  }
}

function clearMemoryEvents(range) {
  if (state.memoryClearBusyRange) return;
  clearTimeout(state.memoryClearCompleteTimer);
  state.memoryClearCompleteTimer = null;
  state.memoryClearCompleteStatus = "";
  state.pendingMemoryClearRange = range;
  renderLearning(state.memory);
}

function cancelClearMemoryEvents() {
  if (state.memoryClearBusyRange) return;
  state.pendingMemoryClearRange = "";
  renderLearning(state.memory);
}

async function confirmClearMemoryEvents(range = state.pendingMemoryClearRange || "1d") {
  if (state.memoryClearBusyRange) return;
  state.pendingMemoryClearRange = range;
  state.memoryClearBusyRange = range;
  renderLearning(state.memory);
  const selectedFullName = state.selected?.fullName || "";
  let completeLabel = "";
  try {
    const result = await api("/api/memory/events/clear", {
      method: "POST",
      body: JSON.stringify({ range, confirm: true })
    });
    setMemory(result.memory, { render: false });
    state.analysis = {};
    state.analysisDrafts = {};
    state.summary = await api(summaryUrl()).catch(() => state.summary);
    state.githubActions = (await api("/api/github/actions").catch(() => ({ actions: state.githubActions }))).actions || {};
    await loadDismissedProjects({ render: false });
    const clearedParts = [
      [t("clearSummaryBehavior"), result.cleared?.events || 0],
      [t("clearSummaryAnalysis"), result.cleared?.analysis || 0],
      [t("clearSummaryNotes"), result.cleared?.notes || 0],
      [t("clearSummaryFavorites"), result.cleared?.favorites || 0],
      [t("dismissProject"), result.cleared?.dismissedProjects || 0],
      [t("clearSummaryGithub"), result.cleared?.githubActions || 0]
    ]
      .filter(([, count]) => Number(count) > 0)
      .map(([name, count]) => `${name} ${fmtNumber(count)}`);
    if (state.summary) renderSummary(state.summary);
    renderLearning(state.memory);
    completeLabel = `${t("behaviorCleared")}${clearedParts.length ? ` · ${clearedParts.join(" · ")}` : ""}`;
    await refreshObservationPlans();
    await loadProjects();
    await loadLeaderboard(state.leaderboardPeriod, state.leaderboardDate);
    if (selectedFullName) {
      await selectProject(selectedFullName).catch(() => {
        state.selected = null;
        renderDetail(null);
      });
    }
  } finally {
    state.memoryClearBusyRange = "";
    state.pendingMemoryClearRange = "";
    renderLearning(state.memory);
  }
  if (completeLabel) showMemoryClearCompleteStatus(completeLabel);
}

async function saveLearningPolicy() {
  if (state.learningPolicySaveStatus === "saving") return;
  clearTimeout(state.learningPolicySaveTimer);
  state.learningPolicySaveTimer = null;
  state.learningPolicySaveStatus = "saving";
  renderLearning(state.memory);
  const percent = antiBubbleValuesFromDom();
  const values = Object.fromEntries(ANTI_BUBBLE_KEYS.map((key) => [key, Number(percent[key] || 0) / 100]));
  try {
    const result = await api("/api/memory-settings", {
      method: "POST",
      body: JSON.stringify({
        antiBubble: values
      })
    });
    setMemory(result.memory);
    await refreshObservationPlans();
    await loadLeaderboard(state.leaderboardPeriod, state.leaderboardDate);
    showLearningPolicySaveCompleteStatus();
  } catch (error) {
    state.learningPolicySaveStatus = "";
    renderLearning(state.memory);
    throw error;
  }
}

async function toggleSecretVisibility(kind, providerId = "") {
  if (kind === "provider") {
    state.secretVisibility.providers = {
      ...(state.secretVisibility.providers || {}),
      [providerId]: !state.secretVisibility.providers?.[providerId]
    };
  } else {
    state.secretVisibility[kind] = !state.secretVisibility[kind];
  }
  await loadSettingsWithVisibleSecrets();
  renderSettings();
}

async function clearSecret(kind, providerId = "") {
  if (kind === "github") {
    state.pendingSecretClears.github = true;
    state.secretVisibility.github = false;
    state.githubUser = null;
    state.githubRepos = [];
    state.githubReposLoaded = false;
    setGithubTokenIssue(false);
  } else if (kind === "tavily") {
    state.pendingSecretClears.tavily = true;
    state.secretVisibility.tavily = false;
    setServiceKeyIssue("tavily", false);
  } else if (kind === "exa") {
    state.pendingSecretClears.exa = true;
    state.secretVisibility.exa = false;
    setServiceKeyIssue("exa", false);
  } else if (kind === "provider") {
    state.secretVisibility.providers = {
      ...(state.secretVisibility.providers || {}),
      [providerId]: false
    };
    state.pendingSecretClears.providers = {
      ...(state.pendingSecretClears.providers || {}),
      [providerId]: true
    };
  } else {
    return;
  }

  state.settings = applyPendingSecretClears(state.settings);
  renderSettings();
  showSettingsInlineStatus("saved", t("keyClearMarked"));
  renderProjectPoolPage();
  renderDetail(state.selected);
}

async function testGithub() {
  if (!githubCredentialReady() && !elements.githubToken?.value.trim()) {
    promptCredentialSetup("github", { messageKey: "githubCredentialRequiredAction" });
    return;
  }
  try {
    await saveSettings({ silent: true });
    const result = await api("/api/github/me");
    setGithubTokenIssue(false);
    state.githubUser = result.user || null;
    state.githubReposLoaded = false;
    state.config = await api("/api/config").catch(() => state.config);
    renderConfig(state.config);
    renderGithubPanel();
    showGithubTestInlineStatus("success");
  } catch (error) {
    handleGithubConnectionFailure();
  }
}

async function loadGithubRepos() {
  if (!githubCredentialReady() && !elements.githubToken?.value.trim()) {
    promptCredentialSetup("github", { messageKey: "githubCredentialRequiredAction" });
    return;
  }
  try {
    await saveSettings({ silent: true });
    const [me, repos] = await Promise.all([
      api("/api/github/me"),
      api("/api/github/repos?perPage=50")
    ]);
    setGithubTokenIssue(false);
    state.githubUser = me.user || null;
    state.githubRepos = repos.repositories || [];
    state.githubReposLoaded = true;
    state.config = await api("/api/config").catch(() => state.config);
    renderConfig(state.config);
    renderGithubPanel();
    showGithubTestInlineStatus("success");
  } catch (error) {
    handleGithubConnectionFailure();
  }
}

function refreshLearningAfterGithubAction() {
  Promise.all([refreshMemory({ render: false }), refreshObservationPlans()])
    .then(() => {
      renderLearning(state.memory);
    })
    .catch(() => {});
}

async function applyGithubActionResult(fullName, result) {
  if (result.action) state.githubActions[actionKey(fullName)] = result.action;
  if (result.project) mergeLocalProject(result.project);
  if (result.memory) setMemory(result.memory);
  renderGithubActionSurfaces();
  if (result.memory) renderLearning(state.memory);
  refreshLearningAfterGithubAction();
}

async function starGithubRepo(fullName) {
  if (isGithubActionBusy(fullName, "star")) return;
  if (!requireGithubCredential({ messageKey: "githubCredentialRequiredAction" })) return;
  setGithubActionBusy(fullName, "star", true);
  try {
    const result = await api("/api/github/star", {
      method: "POST",
      body: JSON.stringify({ fullName })
    });
    await applyGithubActionResult(fullName, result);
  } catch (error) {
    if (isGithubTokenScanError(error)) {
      promptCredentialSetup("github", { messageKey: "githubTokenInvalidHelp", markIssue: true });
      return;
    }
    throw error;
  } finally {
    setGithubActionBusy(fullName, "star", false);
  }
}

async function unstarGithubRepo(fullName) {
  if (isGithubActionBusy(fullName, "star")) return;
  if (!requireGithubCredential({ messageKey: "githubCredentialRequiredAction" })) return;
  setGithubActionBusy(fullName, "star", true);
  try {
    const result = await api("/api/github/unstar", {
      method: "POST",
      body: JSON.stringify({ fullName })
    });
    await applyGithubActionResult(fullName, result);
  } catch (error) {
    if (isGithubTokenScanError(error)) {
      promptCredentialSetup("github", { messageKey: "githubTokenInvalidHelp", markIssue: true });
      return;
    }
    throw error;
  } finally {
    setGithubActionBusy(fullName, "star", false);
  }
}

async function forkGithubRepo(fullName) {
  if (isGithubActionBusy(fullName, "fork")) return;
  if (!requireGithubCredential({ messageKey: "githubCredentialRequiredAction" })) return;
  setGithubActionBusy(fullName, "fork", true);
  try {
    const result = await api("/api/github/fork", {
      method: "POST",
      body: JSON.stringify({ fullName })
    });
    await applyGithubActionResult(fullName, result);
  } catch (error) {
    if (isGithubTokenScanError(error)) {
      promptCredentialSetup("github", { messageKey: "githubTokenInvalidHelp", markIssue: true });
      return;
    }
    throw error;
  } finally {
    setGithubActionBusy(fullName, "fork", false);
  }
}

function githubReadyForGuide() {
  return Boolean(state.config?.githubConfigured || state.settings?.githubTokenSet);
}

function maybeShowInitialGuide() {
  if (readGuideSeen() || githubReadyForGuide()) return;
  setTimeout(() => startGuideTour({ markSeenOnClose: false }), 520);
}

function guideTourStepText(index) {
  return t("guideTourStep")
    .replace("{current}", String(index + 1).padStart(2, "0"))
    .replace("{total}", String(GUIDE_TOUR_STEPS.length).padStart(2, "0"));
}

function guideTourTarget(step) {
  const node = document.querySelector(step?.selector || "");
  if (!node) return document.querySelector(".workspace") || document.body;
  if (step.selector === "#github-token") {
    return node.closest(".key-card") || node;
  }
  return node;
}

function guideTourCardContains(target) {
  return Boolean(target && elements.guideTourCard?.contains(target));
}

function scrollGuideTourTargetIntoView(target, step = {}) {
  if (!target?.scrollIntoView) return;
  target.scrollIntoView({
    block: step.scrollBlock || "center",
    inline: "center",
    behavior: "auto"
  });
}

function prepareGuideTourStep(step) {
  if (!step) return;
  if (step.view) {
    switchView(step.view, { manual: false });
  }
  if (step.renderBefore === "observationPlans") {
    renderObservationPlans();
    document.querySelector(".observation-plan-picker-menu[open]")?.removeAttribute("open");
  }
  const target = guideTourTarget(step);
  state.guideTourTarget?.classList.remove("guide-tour-target");
  state.guideTourTarget = target;
  target?.classList.add("guide-tour-target");
  scrollGuideTourTargetIntoView(target, step);
}

function renderGuideTourDots() {
  if (!elements.guideTourDots) return;
  elements.guideTourDots.innerHTML = GUIDE_TOUR_STEPS.map((_, index) => {
    const active = index === state.guideTourIndex ? " is-active" : "";
    return `<span class="guide-tour-dot${active}"></span>`;
  }).join("");
}

function guideTourCompletionTarget() {
  if (state.keyIssues?.github || !githubCredentialReady()) {
    return { view: "settings", source: "github" };
  }
  if (!aiProviderCredentialReady("deepseek")) {
    return { view: "settings", source: "deepseek" };
  }
  return { view: "projects" };
}

function guideTourFinishLabel() {
  return guideTourCompletionTarget().view === "settings" ? t("guideTourFinishSettings") : t("guideTourFinishHome");
}

function scheduleGuideTourPosition(delay = 160) {
  if (!state.guideTourActive) return;
  clearTimeout(state.guideTourPositionTimer);
  state.guideTourPositionTimer = setTimeout(positionGuideTour, delay);
}

function positionGuideTour() {
  if (!state.guideTourActive || !elements.guideTour || !elements.guideTourCard || !elements.guideTourSpotlight) return;
  const step = GUIDE_TOUR_STEPS[state.guideTourIndex];
  const target = guideTourTarget(step);
  if (target !== state.guideTourTarget) {
    state.guideTourTarget?.classList.remove("guide-tour-target");
    state.guideTourTarget = target;
    target?.classList.add("guide-tour-target");
  }
  const rect = target.getBoundingClientRect();
  const margin = 10;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const left = Math.max(8, rect.left - margin);
  const top = Math.max(8, rect.top - margin);
  const right = Math.min(viewportWidth - 8, rect.right + margin);
  const bottom = Math.min(viewportHeight - 8, rect.bottom + margin);
  elements.guideTourSpotlight.style.left = `${left}px`;
  elements.guideTourSpotlight.style.top = `${top}px`;
  elements.guideTourSpotlight.style.width = `${Math.max(60, right - left)}px`;
  elements.guideTourSpotlight.style.height = `${Math.max(36, bottom - top)}px`;
  const maskRects = {
    top: [0, 0, viewportWidth, top],
    right: [right, top, viewportWidth - right, bottom - top],
    bottom: [0, bottom, viewportWidth, viewportHeight - bottom],
    left: [0, top, left, bottom - top]
  };
  elements.guideTourMasks?.forEach((mask) => {
    const rectValues = maskRects[mask.dataset.guideTourMask] || [0, 0, 0, 0];
    const [maskLeft, maskTop, maskWidth, maskHeight] = rectValues.map((value) => Math.max(0, value));
    mask.style.left = `${maskLeft}px`;
    mask.style.top = `${maskTop}px`;
    mask.style.width = `${maskWidth}px`;
    mask.style.height = `${maskHeight}px`;
  });

  const card = elements.guideTourCard;
  card.style.visibility = "hidden";
  card.style.left = "16px";
  card.style.top = "16px";
  const cardRect = card.getBoundingClientRect();
  const cardWidth = Math.min(cardRect.width || 380, viewportWidth - 32);
  const cardHeight = Math.min(cardRect.height || 260, viewportHeight - 32);
  const gap = 16;
  let cardLeft = rect.right + gap;
  let cardTop = rect.top + rect.height / 2 - cardHeight / 2;

  if (viewportWidth < 760) {
    cardLeft = 14;
    cardTop = Math.min(viewportHeight - cardHeight - 14, Math.max(14, rect.bottom + gap));
    if (cardTop + cardHeight > viewportHeight - 14) {
      cardTop = Math.max(14, rect.top - cardHeight - gap);
    }
  } else if (cardLeft + cardWidth > viewportWidth - 16) {
    cardLeft = rect.left - cardWidth - gap;
    if (cardLeft < 16) {
      cardLeft = Math.min(viewportWidth - cardWidth - 16, Math.max(16, rect.left + rect.width / 2 - cardWidth / 2));
      cardTop = rect.bottom + gap;
      if (cardTop + cardHeight > viewportHeight - 16) {
        cardTop = rect.top - cardHeight - gap;
      }
    }
  }

  cardLeft = Math.max(14, Math.min(cardLeft, viewportWidth - cardWidth - 14));
  cardTop = Math.max(14, Math.min(cardTop, viewportHeight - cardHeight - 14));
  card.style.left = `${cardLeft}px`;
  card.style.top = `${cardTop}px`;
  card.style.visibility = "";
}

function renderGuideTourStep() {
  if (!state.guideTourActive) return;
  const step = GUIDE_TOUR_STEPS[state.guideTourIndex];
  prepareGuideTourStep(step);
  if (elements.guideTourKicker) elements.guideTourKicker.textContent = guideTourStepText(state.guideTourIndex);
  if (elements.guideTourTitle) elements.guideTourTitle.textContent = t(step.titleKey);
  if (elements.guideTourBody) elements.guideTourBody.textContent = t(step.bodyKey);
  if (elements.guideTourPrev) {
    elements.guideTourPrev.textContent = t("guideTourPrev");
    elements.guideTourPrev.disabled = state.guideTourIndex === 0;
  }
  if (elements.guideTourSkip) elements.guideTourSkip.textContent = t("guideTourSkip");
  if (elements.guideTourNext) {
    elements.guideTourNext.textContent = state.guideTourIndex === GUIDE_TOUR_STEPS.length - 1 ? guideTourFinishLabel() : t("guideTourNext");
  }
  const closeButton = elements.guideTour?.querySelector(".guide-tour-close");
  closeButton?.setAttribute("aria-label", t("guideTourClose"));
  renderGuideTourDots();
  scheduleGuideTourPosition(0);
  requestAnimationFrame(() => {
    positionGuideTour();
    requestAnimationFrame(positionGuideTour);
  });
  scheduleGuideTourPosition(180);
  setTimeout(() => scheduleGuideTourPosition(0), 420);
}

function startGuideTour(options = {}) {
  if (!elements.guideTour) return;
  hideFloatingTooltip();
  state.guideTourActive = true;
  state.guideTourIndex = Math.max(0, Math.min(Number(options.index || 0), GUIDE_TOUR_STEPS.length - 1));
  elements.guideTour.hidden = false;
  elements.guideTour.setAttribute("aria-hidden", "false");
  document.documentElement.classList.add("guide-tour-open");
  document.body.classList.add("guide-tour-open");
  renderGuideTourStep();
}

function stopGuideTour(options = {}) {
  clearTimeout(state.guideTourPositionTimer);
  state.guideTourActive = false;
  state.guideTourTarget?.classList.remove("guide-tour-target");
  state.guideTourTarget = null;
  elements.guideTour?.setAttribute("aria-hidden", "true");
  if (elements.guideTour) elements.guideTour.hidden = true;
  document.documentElement.classList.remove("guide-tour-open");
  document.body.classList.remove("guide-tour-open");
  if (options.markSeen !== false) {
    writeGuideSeen(true);
  }
}

function nextGuideTourStep() {
  if (state.guideTourIndex >= GUIDE_TOUR_STEPS.length - 1) {
    finishGuideTour();
    return;
  }
  state.guideTourIndex += 1;
  renderGuideTourStep();
}

function prevGuideTourStep() {
  if (state.guideTourIndex <= 0) return;
  state.guideTourIndex -= 1;
  renderGuideTourStep();
}

function blockGuideTourBackgroundInteraction(event) {
  if (!state.guideTourActive) return;
  if (guideTourCardContains(event.target)) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
}

function handleGuideTourKeydown(event) {
  if (!state.guideTourActive) return;
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    stopGuideTour();
    return;
  }
  const blockedKeys = new Set([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Home", "End"]);
  if (blockedKeys.has(event.key)) {
    if (event.key === " " && guideTourCardContains(event.target) && event.target.closest?.("button")) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    return;
  }
  if (guideTourCardContains(event.target)) return;
}

function finishGuideTour() {
  const target = guideTourCompletionTarget();
  stopGuideTour();
  if (target.view === "settings") {
    openSettingsFor(target.source, { focus: false });
    return;
  }
  goHome();
}

function switchView(view, options = {}) {
  state.view = view;
  document.querySelectorAll("[data-view-target]").forEach((button) => {
    button.classList.toggle("active", button.dataset.viewTarget === view);
  });
  document.querySelectorAll(".view-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `view-${view}`);
  });
  if (view === "projects" && options.manual) {
    applyPendingRestoredProjectSelection().catch((error) => toast(error.message));
  }
  scheduleGuideTourPosition(80);
}

function goHome() {
  switchView("projects", { manual: true });
  document.querySelector("#projects")?.scrollIntoView({ block: "start", behavior: "smooth" });
}

function openSettingsFor(source = "", options = {}) {
  switchView("settings");
  const selectorBySource = {
    github: "#github-token",
    tavily: "#tavily-key",
    exa: "#exa-key",
    deepseek: ".provider-item"
  };
  const target = document.querySelector(selectorBySource[source] || "#view-settings");
  target?.scrollIntoView({ block: "center", behavior: "smooth" });
  if (options.focus !== false && target?.matches("input, select, textarea, button")) {
    setTimeout(() => target.focus(), 180);
  }
}

function openObservationPlanSettings() {
  switchView("settings");
  renderObservationPlans();
  const target = document.querySelector("#view-settings .observation-plan-select-module") || document.querySelector("#observation-plan-select");
  target?.scrollIntoView({ block: "center", behavior: "smooth" });
  if (target) {
    target.classList.add("is-focus-pulse");
    setTimeout(() => target.classList.remove("is-focus-pulse"), 900);
  }
  setTimeout(() => {
    const picker = document.querySelector("#observation-plan-picker .observation-plan-picker-menu");
    picker?.setAttribute("open", "");
    picker?.querySelector("summary")?.focus();
  }, 180);
}

function scrollToLearningSection(section = "") {
  switchView("learning");
  if (section === "preferenceProfile") {
    expandPreferencePanel();
  }
  const selectorBySection = {
    recentBehavior: "#learning-recent-behavior",
    preferenceProfile: "#view-learning .learning-preference-panel",
    antiBubblePolicy: "#learning-anti-bubble"
  };
  const target = document.querySelector(selectorBySection[section] || "#view-learning");
  target?.scrollIntoView({ block: "start", behavior: "smooth" });
  if (target) {
    const focusTargets =
      section === "preferenceProfile"
        ? [target, ...target.querySelectorAll(".learning-subpanel")]
        : [target];
    focusTargets.forEach((node) => node.classList.add("is-focus-pulse"));
    setTimeout(() => focusTargets.forEach((node) => node.classList.remove("is-focus-pulse")), 900);
  }
}

let activeTooltipTarget = null;
let floatingTooltip = null;

function tooltipText(target) {
  return target?.dataset?.tooltip || target?.getAttribute("aria-label") || target?.getAttribute("title") || "";
}

function ensureFloatingTooltip() {
  if (floatingTooltip) return floatingTooltip;
  floatingTooltip = document.createElement("div");
  floatingTooltip.className = "floating-tooltip";
  floatingTooltip.setAttribute("role", "tooltip");
  document.body.appendChild(floatingTooltip);
  return floatingTooltip;
}

function restoreNativeTitle(target) {
  if (!target?.dataset?.nativeTitle) return;
  target.setAttribute("title", target.dataset.nativeTitle);
  delete target.dataset.nativeTitle;
}

function positionFloatingTooltip(target) {
  const tooltip = ensureFloatingTooltip();
  const rect = target.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const gap = 8;
  const margin = 8;
  let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
  let top = rect.bottom + gap;
  const hasRoomBelow = rect.bottom + gap + tooltipRect.height <= window.innerHeight - margin;

  if (target.closest(".topbar-actions")) {
    top = hasRoomBelow ? rect.bottom + gap : rect.top - tooltipRect.height - gap;
  } else if (target.closest(".sidebar") && window.innerWidth > 900) {
    left = rect.right + 10;
    top = rect.top + rect.height / 2 - tooltipRect.height / 2;
  } else if (!hasRoomBelow) {
    top = rect.top - tooltipRect.height - gap;
  }

  left = Math.max(margin, Math.min(left, window.innerWidth - tooltipRect.width - margin));
  top = Math.max(margin, Math.min(top, window.innerHeight - tooltipRect.height - margin));
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function showFloatingTooltip(target) {
  if (state.guideTourActive) return;
  const text = tooltipText(target);
  if (!text) return;
  activeTooltipTarget = target;
  if (target.hasAttribute("title")) {
    target.dataset.nativeTitle = target.getAttribute("title");
    target.removeAttribute("title");
  }
  const tooltip = ensureFloatingTooltip();
  tooltip.textContent = text;
  tooltip.classList.add("visible");
  positionFloatingTooltip(target);
}

function hideFloatingTooltip() {
  if (activeTooltipTarget) restoreNativeTitle(activeTooltipTarget);
  activeTooltipTarget = null;
  if (floatingTooltip) floatingTooltip.classList.remove("visible");
}

function tooltipTargetFromEvent(event) {
  return event.target.closest("[data-tooltip], .has-tooltip[aria-label]");
}

function wireFloatingTooltips() {
  document.addEventListener("pointerover", (event) => {
    const target = tooltipTargetFromEvent(event);
    if (!target) return;
    showFloatingTooltip(target);
  });
  document.addEventListener("pointerout", (event) => {
    const target = tooltipTargetFromEvent(event);
    if (!target || (event.relatedTarget && target.contains(event.relatedTarget))) return;
    hideFloatingTooltip();
  });
  document.addEventListener("focusin", (event) => {
    const target = tooltipTargetFromEvent(event);
    if (target) showFloatingTooltip(target);
  });
  document.addEventListener("focusout", hideFloatingTooltip);
  document.addEventListener("pointermove", () => {
    if (activeTooltipTarget) positionFloatingTooltip(activeTooltipTarget);
  });
  window.addEventListener("resize", hideFloatingTooltip);
  window.addEventListener("scroll", hideFloatingTooltip, true);
}

function wireEvents() {
  wireFloatingTooltips();
  window.addEventListener("beforeunload", handleLongTaskBeforeUnload);
  window.addEventListener("resize", () => scheduleGuideTourPosition(60));
  window.addEventListener("scroll", () => scheduleGuideTourPosition(60), true);
  document.addEventListener("pointerdown", blockGuideTourBackgroundInteraction, true);
  document.addEventListener("click", blockGuideTourBackgroundInteraction, true);
  document.addEventListener("wheel", blockGuideTourBackgroundInteraction, { passive: false, capture: true });
  document.addEventListener("touchmove", blockGuideTourBackgroundInteraction, { passive: false, capture: true });
  document.addEventListener("keydown", handleGuideTourKeydown, true);
  elements.scanButton.addEventListener("click", () => runScan());
  elements.exportMenu?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-export-format]");
    if (!button) return;
    event.preventDefault();
    elements.exportMenu.open = false;
    window.location.href = exportUrl(button.dataset.exportFormat);
  });
  document.addEventListener("click", (event) => {
    if (!elements.exportMenu?.open || elements.exportMenu.contains(event.target)) return;
    elements.exportMenu.open = false;
  });
  document.addEventListener("click", (event) => {
    const planMenu = document.querySelector(".observation-plan-picker-menu[open]");
    if (!planMenu || planMenu.contains(event.target)) return;
    planMenu.removeAttribute("open");
  });
  document.addEventListener(
    "toggle",
    (event) => {
      const detailFoldSection = event.target.closest?.("#view-projects .detail-more-section, #view-projects .note-section");
      if (!detailFoldSection) return;
      scrollDetailPanelToBottomOnExpand(detailFoldSection);
      const noteSection = detailFoldSection.matches?.(".note-section") ? detailFoldSection : null;
      if (!noteSection || !state.selected?.fullName) return;
      state.openNoteSectionFullName = noteSection.open ? state.selected.fullName : "";
    },
    true
  );
  document.addEventListener("pointerdown", captureNoteStatusPointerScroll);
  elements.saveSettingsButton.addEventListener("click", () => saveSettings().catch((error) => toast(error.message)));

  document.querySelectorAll("[data-view-target]").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.viewTarget, { manual: true }));
  });

  document.querySelectorAll("[data-language]").forEach((button) => {
    button.addEventListener("click", async () => {
      hideFloatingTooltip();
      state.language = button.dataset.language;
      state.settings = {
        ...(state.settings || {}),
        language: state.language
      };
      applyTranslations();
      renderChips();
      renderConfig(state.config);
      renderSummary(state.summary);
      renderSettings();
      renderLeaderboard(state.leaderboard);
      renderProjectPoolPage();
      renderDetail(state.selected);
      const languageResult = await api("/api/settings", {
        method: "POST",
        body: JSON.stringify({ language: state.language })
      });
      const { keyValidation, ...settingsResult } = languageResult;
      state.settings = settingsResult;
      applyServiceKeyValidation(keyValidation);
      loadSettingsWithVisibleSecrets()
        .then(() => renderSettings())
        .catch(() => {});
    });
  });

  elements.observationPlanSelect?.addEventListener("change", () => {
    state.observationPlanDraft = null;
    state.observationPlanEditMode = "";
    state.observationPlanPreviewId = elements.observationPlanSelect?.value || "";
    renderObservationPlans();
  });

  document.addEventListener("click", (event) => {
    const homeLink = event.target.closest("[data-action='go-home']");
    if (homeLink) {
      event.preventDefault();
      goHome();
      return;
    }

    const pageButton = event.target.closest("[data-project-page]");
    if (pageButton) {
      setProjectPage(pageButton.dataset.projectPage);
      return;
    }
    if (event.target.closest("[data-project-page-prev]")) {
      setProjectPage(state.projectPool.page - 1);
      return;
    }
    if (event.target.closest("[data-project-page-next]")) {
      setProjectPage(state.projectPool.page + 1);
      return;
    }
    const pageJumpButton = event.target.closest("[data-project-page-jump]");
    if (pageJumpButton) {
      const input = pageJumpButton.closest(".project-pager")?.querySelector("[data-project-page-input]");
      setProjectPage(input?.value || state.projectPool.page);
      return;
    }

    const viewButton = event.target.closest("[data-view-target]");
    if (viewButton) {
      switchView(viewButton.dataset.viewTarget, { manual: true });
      return;
    }

    const overviewFilter = event.target.closest("[data-overview-filter]");
    if (overviewFilter) {
      event.preventDefault();
      applyOverviewFilter(overviewFilter.dataset.overviewFilter);
      return;
    }

    const tagFilter = event.target.closest("[data-project-tag-filter]");
    if (tagFilter) {
      event.preventDefault();
      event.stopPropagation();
      applyProjectTagFilter(tagFilter.dataset.projectTagFilter);
      return;
    }

    const clearAll = event.target.closest("[data-filter-clear-all]");
    if (clearAll && !clearAll.disabled) {
      resetAllFilters();
      previewDefaultProjectPool();
      loadProjects({ resetPosition: true }).catch((error) => toast(error.message));
      return;
    }

    const filter = event.target.closest("[data-filter-key]");
    if (filter) {
      state.filters[filter.dataset.filterKey] = filter.dataset.filterValue;
      if (String(filter.dataset.filterKey || "").startsWith("semantic")) {
        state.filters.tag = "";
      }
      syncFilterControls();
      loadProjects({ resetPosition: true }).catch((error) => toast(error.message));
      return;
    }

    const presetButton = event.target.closest("[data-filter-preset]");
    if (presetButton) {
      applyFilterPreset(presetButton.dataset.filterPreset);
      syncFilterControls();
      loadProjects({ resetPosition: true }).catch((error) => toast(error.message));
      return;
    }

    const reset = event.target.closest("[data-filter-reset]");
    if (reset) {
      const key = reset.dataset.filterReset;
      state.filters[key] = DEFAULT_FILTERS[key] ?? "all";
      if (key.startsWith("semantic")) state.filters.tag = "";
      syncFilterControls();
      loadProjects({ resetPosition: true }).catch((error) => toast(error.message));
      return;
    }

    const resetGroup = event.target.closest("[data-filter-reset-group]");
    if (resetGroup) {
      if (resetGroup.dataset.filterResetGroup === "records") {
        state.filters.triageStatus = DEFAULT_FILTERS.triageStatus;
        state.filters.aiAnalysis = DEFAULT_FILTERS.aiAnalysis;
        syncFilterControls();
        loadProjects({ resetPosition: true }).catch((error) => toast(error.message));
      }
      return;
    }

    const memoryLink = event.target.closest("[data-memory-link]");
    if (memoryLink) {
      recordMemoryEvent(memoryLink.dataset.fullName, memoryLink.dataset.memoryLink, { source: "link" }).catch(() => {});
    }

    collapseObservationPlanEditOnOutsideClick(event);
    const target = event.target.closest("[data-action]");
    if (!target) {
      const interactiveTarget = event.target.closest(
        "a, button, input, select, textarea, label, summary, details, [role='button'], .repo-github-row, .leaderboard-github-row, .github-stat-actions, .github-stat-count, .trend-tag, [data-project-page], [data-project-page-prev], [data-project-page-next], [data-project-page-jump], [data-project-page-input], [data-project-page-size], [data-project-tag-filter], [data-overview-filter], [data-filter-key], [data-filter-preset], [data-filter-reset], [data-filter-reset-group], [data-filter-clear-all]"
      );
      if (interactiveTarget) return;

      const leaderboardItem = event.target.closest("#view-leaderboard .leaderboard-item[data-full-name]");
      if (leaderboardItem) {
        openProjectDetailFromLeaderboard(leaderboardItem.dataset.fullName).catch((error) => toast(error.message));
        return;
      }

      const repoItem = event.target.closest("#view-projects .repo-item[data-full-name]");
      if (repoItem) {
        selectProject(repoItem.dataset.fullName, { renderList: false }).catch((error) => toast(error.message));
      }
      return;
    }
    const action = target.dataset.action;
    const fullName = target.dataset.fullName;
    if (action === "start-guide-tour") {
      startGuideTour();
      return;
    }
    if (action === "guide-tour-next") {
      nextGuideTourStep();
      return;
    }
    if (action === "guide-tour-prev") {
      prevGuideTourStep();
      return;
    }
    if (action === "guide-tour-skip") {
      stopGuideTour();
      return;
    }
    if (action === "noop" || target.getAttribute("aria-disabled") === "true") {
      return;
    }
    if (action === "open-settings") {
      openSettingsFor(target.dataset.configSource || "");
      return;
    }
    if (action === "open-observation-plans") {
      openObservationPlanSettings();
      return;
    }
    if (action === "toggle-secret") {
      toggleSecretVisibility(target.dataset.secretKind, target.dataset.providerId || "").catch((error) => toast(error.message));
      return;
    }
    if (action === "clear-secret") {
      clearSecret(target.dataset.secretKind, target.dataset.providerId || "").catch((error) => toast(error.message));
      return;
    }
    if (action === "switch-observation-plan") {
      switchObservationPlan().catch((error) => showObservationPlanActionError(error));
      return;
    }
    if (action === "generate-observation-plan") {
      generateObservationPlan().catch((error) => showObservationPlanActionError(error));
      return;
    }
    if (action === "preview-observation-plan") {
      previewObservationPlan(target.dataset.planId || "");
      target.closest(".observation-plan-picker-menu")?.removeAttribute("open");
      return;
    }
    if (action === "edit-observation-plan") {
      editObservationPlan(target.dataset.planId || "");
      target.closest(".observation-plan-picker-menu")?.removeAttribute("open");
      return;
    }
    if (action === "delete-observation-requirement") {
      deleteObservationRequirement(Number(target.dataset.requirementIndex)).catch((error) => showObservationPlanActionError(error));
      return;
    }
    if (action === "delete-observation-plan") {
      deleteObservationPlan(target.dataset.planId || "").catch((error) => showObservationPlanActionError(error));
      target.closest(".observation-plan-picker-menu")?.removeAttribute("open");
      return;
    }
    if (action === "cancel-observation-plan-confirm") {
      cancelObservationPlanPendingConfirm();
      return;
    }
    if (action === "confirm-observation-plan-action") {
      confirmObservationPlanPendingAction().catch((error) => showObservationPlanActionError(error));
      return;
    }
    if (action === "export-observation-plan-delete-backup") {
      exportObservationPlanPendingDeleteBackup().catch((error) => showObservationPlanActionError(error));
      return;
    }
    if (action === "cancel-observation-plan-draft") {
      cancelObservationPlanDraft();
      return;
    }
    if (action === "save-observation-plan") {
      saveObservationPlan().catch((error) => showObservationPlanActionError(error));
      return;
    }
    if (action === "export-portable-data") {
      exportPortableData().catch((error) => showObservationPlanActionError(error));
      return;
    }
    if (action === "import-portable-data") {
      importPortableData().catch((error) => showObservationPlanActionError(error));
      return;
    }
    if (action === "test-github") {
      testGithub();
      return;
    }
    if (action === "load-github-repos") {
      loadGithubRepos();
      return;
    }
    if (action === "github-star") {
      starGithubRepo(fullName).catch((error) => toast(error.message));
      return;
    }
    if (action === "github-unstar") {
      unstarGithubRepo(fullName).catch((error) => toast(error.message));
      return;
    }
    if (action === "github-fork") {
      forkGithubRepo(fullName).catch((error) => toast(error.message));
      return;
    }
    if (action === "leaderboard-feedback") {
      submitLeaderboardFeedback(fullName, target.dataset.feedback || "positive").catch((error) => toast(error.message));
      return;
    }
    if (action === "memory-adjust") {
      const patch =
        target.dataset.value !== undefined
          ? { value: Number(target.dataset.value) }
          : { delta: Number(target.dataset.delta || 0) };
      patch.scope = target.dataset.memoryScope || "positive";
      adjustMemoryPreference(target.dataset.memoryKind, target.dataset.memoryKey, patch).catch((error) => toast(error.message));
      return;
    }
    if (action === "run-harness") {
      runHarnessEvaluation().catch((error) => toast(error.message));
      return;
    }
    if (action === "run-scan") {
      runScan().catch((error) => toast(error.message));
      return;
    }
    if (action === "tune-memory") {
      tuneMemory().catch((error) => toast(error.message));
      return;
    }
    if (action === "compact-memory") {
      compactMemory().catch((error) => toast(error.message));
      return;
    }
    if (action === "scroll-learning-section") {
      scrollToLearningSection(target.dataset.learningSection || "");
      return;
    }
    if (action === "clear-memory-events") {
      clearMemoryEvents(target.dataset.clearRange || "1d");
      return;
    }
    if (action === "confirm-clear-memory-events") {
      confirmClearMemoryEvents(target.dataset.clearRange || "1d").catch((error) => toast(error.message));
      return;
    }
    if (action === "cancel-clear-memory-events") {
      cancelClearMemoryEvents();
      return;
    }
    if (action === "toggle-dismissed-samples") {
      toggleDismissedSamples();
      return;
    }
    if (action === "expand-preference-panel") {
      expandPreferencePanel();
      return;
    }
    if (action === "save-learning-policy") {
      saveLearningPolicy().catch((error) => toast(error.message));
      return;
    }
    if (action === "refresh-provider-catalog") {
      refreshProviderCatalog(target.dataset.providerId || "deepseek").catch((error) => handleProviderActionError(error, target.dataset.providerId || "deepseek"));
      return;
    }
    if (action === "fetch-provider-models") {
      fetchProviderModels(target.dataset.providerId || "deepseek").catch((error) => handleProviderActionError(error, target.dataset.providerId || "deepseek"));
      return;
    }
    if (action === "test-provider") {
      testProvider(target.dataset.providerId || "deepseek").catch((error) => handleProviderActionError(error, target.dataset.providerId || "deepseek"));
      return;
    }
    if (action === "set-note-status") {
      setNoteStatus(target);
      return;
    }
    if (action === "select") {
      if (target.dataset.selectSource === "leaderboard") {
        openProjectDetailFromLeaderboard(fullName).catch((error) => toast(error.message));
      } else if (target.dataset.selectSource === "learning") {
        openProjectDetailInPool(fullName, "learning").catch((error) => toast(error.message));
      } else {
        selectProject(fullName).catch((error) => toast(error.message));
      }
      return;
    }
    if (action === "favorite") {
      toggleFavorite(fullName).catch((error) => toast(error.message));
      return;
    }
    if (action === "dismiss-project") {
      dismissProject(fullName, { source: target.dataset.dismissSource || "" }).catch((error) => toast(error.message));
      return;
    }
    if (action === "undo-dismiss-project") {
      undoDismissProject(fullName).catch((error) => toast(error.message));
      return;
    }
    if (action === "restore-dismissed-project") {
      restoreDismissedProject(fullName).catch((error) => toast(error.message));
      return;
    }
    if (action === "edit-dismissed-feedback") {
      editDismissedFeedback(fullName);
      return;
    }
    if (action === "cancel-dismissed-feedback") {
      cancelDismissedFeedback(fullName);
      return;
    }
    if (action === "save-dismissed-feedback") {
      const card = target.closest(".dismissed-sample-card");
      saveDismissedFeedback(fullName, card).catch((error) => toast(error.message));
      return;
    }
    if (action === "save-note") {
      saveNote(fullName).catch((error) => toast(error.message));
      return;
    }
    if (action === "confirm-save-note") {
      confirmPendingNoteSave(fullName).catch((error) => toast(error.message));
      return;
    }
    if (action === "cancel-save-note") {
      cancelPendingNoteSave(fullName);
      return;
    }
    if (action === "confirm-delete-note") {
      confirmPendingNoteDelete(fullName).catch((error) => toast(error.message));
      return;
    }
    if (action === "cancel-delete-note") {
      cancelPendingNoteDelete(fullName);
      return;
    }
    if (action === "delete-note") {
      deleteNote(fullName).catch((error) => toast(error.message));
      return;
    }
    if (action === "ai-analyze") {
      analyzeProject(fullName).catch((error) => toast(error.message));
    }
    if (action === "copy-url") {
      navigator.clipboard.writeText(target.dataset.url || "").then(() => showCopyUrlInlineStatus(fullName)).catch((error) => toast(error.message));
      recordMemoryEvent(fullName, "copy_url", { source: "ui" }).catch(() => {});
    }
  });
  document.addEventListener("click", (event) => {
    if (!state.dismissedSamplesExpanded) return;
    if (!document.querySelector("#view-learning")?.classList.contains("active")) return;
    if (clickStartedInsideDismissedPanel(event)) return;
    collapseDismissedSamples();
  });

  let searchTimer = 0;
  elements.searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadProjects({ resetPosition: true }).catch((error) => toast(error.message)), 180);
  });
  elements.watchFilter.addEventListener("change", () => {
    state.filters.watchlist = elements.watchFilter.checked;
    syncFilterControls();
    if (state.filters.watchlist) {
      previewCurrentPageFavorites();
    } else {
      previewDefaultProjectPool();
    }
    loadProjects({ resetPosition: true }).catch((error) => toast(error.message));
  });
  document.addEventListener("input", (event) => {
    const pageSizeSelect = event.target.closest("[data-project-page-size]");
    if (pageSizeSelect) {
      state.projectPool.pageSize = Number(pageSizeSelect.value || 10);
      state.projectPool.page = 1;
      loadProjects({ resetPosition: true, refreshSummary: false }).catch((error) => toast(error.message));
      return;
    }
    if (event.target?.id === "analysis-need" && state.selected?.fullName) {
      state.analysisDrafts[state.selected.fullName] = {
        ...(state.analysisDrafts[state.selected.fullName] || {}),
        userNeed: event.target.value || ""
      };
    }
    const slider = event.target.closest("[data-learning-setting]");
    if (!slider) return;
    syncAntiBubbleSliders(slider);
  });
  document.addEventListener("wheel", relayBoundedScroll, { passive: false });
  document.addEventListener("keydown", (event) => {
    if (state.guideTourActive && event.key === "Escape") {
      event.preventDefault();
      stopGuideTour();
      return;
    }
    const tagFilter = event.target.closest?.("[data-project-tag-filter]");
    if (tagFilter && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      applyProjectTagFilter(tagFilter.dataset.projectTagFilter);
      return;
    }
    const dismissedPanelToggle = event.target.closest?.("[data-dismissed-panel-toggle]");
    if (dismissedPanelToggle && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      toggleDismissedSamples();
      return;
    }
    const collapsedPreferenceHead = event.target.closest?.(
      "#view-learning .learning-preference-panel.is-collapsed-for-dismissed .learning-panel-head[data-action='expand-preference-panel']"
    );
    if (collapsedPreferenceHead && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      expandPreferencePanel();
      return;
    }
    const pageInput = event.target.closest?.("[data-project-page-input]");
    if (pageInput && event.key === "Enter") {
      event.preventDefault();
      setProjectPage(pageInput.value || state.projectPool.page);
    }
  });
  elements.leaderboardArchive.addEventListener("change", () => {
    loadLeaderboard("daily", elements.leaderboardArchive.value).catch((error) => toast(error.message));
  });
  document.addEventListener("click", (event) => {
    const periodButton = event.target.closest("[data-leaderboard-period]");
    if (!periodButton) return;
    loadLeaderboard(periodButton.dataset.leaderboardPeriod, "").catch((error) => toast(error.message));
  });
}

wireEvents();
loadAll().catch((error) => toast(error.message));
