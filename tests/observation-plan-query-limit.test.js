const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { buildQueryProfiles, isGithubRateLimitError, repositoryMatchesPlanProfile } = require("../src/lib/github");
const { classifyRepository, inferUseCase } = require("../src/lib/scoring");
const { createStorage } = require("../src/lib/storage");

function tempStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "starvault-plan-limit-"));
  return createStorage(path.join(dir, "store.json"));
}

test("custom observation plan execution matches visible custom query count", () => {
  const plan = {
    id: "cad-plan",
    name: "CAD 观察",
    searchLogic: {
      baseMode: "only",
      minStars: 10,
      excludeTerms: ["tutorial", "paper list"],
      keywords: Array.from({ length: 20 }, (_, index) => `cad keyword ${index}`),
      customQueries: Array.from({ length: 40 }, (_, index) => ({
        label: `CAD query ${index}`,
        query: `cad viewer editor workflow ${index}`,
        stars: 10
      }))
    }
  };

  const profiles = buildQueryProfiles(plan);

  assert.equal(profiles.length, 40);
  assert.match(profiles[0].q, /in:name,description,readme/);
  assert.match(profiles[0].q, /archived:false/);
  assert.doesNotMatch(profiles[0].q, /-tutorial/);
  assert.equal(profiles.some((profile) => /cad keyword/.test(profile.q)), false);
  assert.equal(profiles.every((profile) => profile.observationPlanId === "cad-plan"), true);
});

test("default observation plan exposes built-in search profiles for settings preview", () => {
  const storage = tempStore();
  const defaultPlan = storage.listObservationPlans().find((plan) => plan.id === "default");
  const profiles = buildQueryProfiles();

  assert.ok(defaultPlan);
  assert.equal(defaultPlan.builtIn, true);
  assert.equal(defaultPlan.summary.searchLogicItems, profiles.length);
  assert.equal(defaultPlan.searchLogic.customQueries.length, profiles.length);
  assert.match(defaultPlan.searchLogic.customQueries[0].query, /in:name,description,readme/);
});

test("observation plan switch and delete responses return hydrated search logic", () => {
  const serverSource = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");
  const activeRoute = serverSource.slice(
    serverSource.indexOf('if (req.method === "POST" && url.pathname === "/api/observation-plans/active")'),
    serverSource.indexOf('if (req.method === "POST" && url.pathname === "/api/observation-plans/delete")')
  );
  const deleteRoute = serverSource.slice(
    serverSource.indexOf('if (req.method === "POST" && url.pathname === "/api/observation-plans/delete")'),
    serverSource.indexOf('if (req.method === "POST" && url.pathname === "/api/observation-plans/generate")')
  );

  assert.match(activeRoute, /active: hydrateObservationPlanSearchLogic\(result\.active, language\)/);
  assert.match(activeRoute, /plans: \(result\.plans \|\| \[\]\)\.map\(\(plan\) => hydrateObservationPlanSearchLogic\(plan, language\)\)/);
  assert.match(deleteRoute, /active: hydrateObservationPlanSearchLogic\(storage\.getObservationPlan\(\), language\)/);
  assert.match(deleteRoute, /plans: \(result\.plans \|\| \[\]\)\.map\(\(plan\) => hydrateObservationPlanSearchLogic\(plan, language\)\)/);
});

test("generated observation plans ask for about thirty focused queries", () => {
  const llmSource = fs.readFileSync(path.join(__dirname, "../src/lib/llm.js"), "utf8");
  const serverSource = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");

  assert.match(llmSource, /const queryLimit = 30/);
  assert.match(llmSource, /最多生成 \$\{queryLimit\} 条最相关 customQueries/);
  assert.match(llmSource, /这是硬上限，不是填满目标/);
  assert.match(llmSource, /中文模式下，name、description、notes、labels/);
  assert.match(serverSource, /const OBSERVATION_CUSTOM_QUERY_LIMIT = 30/);
});

test("observation plan prompt requires anchored coverage and self-audit", () => {
  const llmSource = fs.readFileSync(path.join(__dirname, "../src/lib/llm.js"), "utf8");

  assert.match(llmSource, /相关性契约：每条 customQuery 必须至少包含一个/);
  assert.match(llmSource, /核心关键词扩展契约/);
  assert.match(llmSource, /识别唯一主核心关键词/);
  assert.match(llmSource, /写 JSON 前必须按这个方法思考/);
  assert.match(llmSource, /判断锚点类型：命名产品、宽泛类别、缩写、文件格式、协议、框架、软件生态或工作流/);
  assert.match(llmSource, /从官方名称、别名、翻译、标准、格式、API\/SDK/);
  assert.match(llmSource, /移除 SEO\/GEO\/厂商结果噪音/);
  assert.match(llmSource, /下面只是方法示例，不是固定字典：CAD ->/);
  assert.match(llmSource, /Photoshop -> photoshop, Adobe Photoshop, PSD, PSB, UXP, CEP/);
  assert.match(llmSource, /剪映 -> 剪映, CapCut, Jianying/);
  assert.match(llmSource, /对命名产品、软件、硬件、平台和缩写/);
  assert.match(llmSource, /不要把丰富生态压缩成产品名加一个变体/);
  assert.match(llmSource, /每个主要 customQuery 组都应在 strategy\.keywords 中有对应关键词或短语/);
  assert.match(llmSource, /错误 keyword 形态包括/);
  assert.match(llmSource, /覆盖方法：把领域词表转成少量高信号查询组/);
  assert.match(llmSource, /活跃度校准方法：存在 researchContext\.githubActivity 时/);
  assert.match(llmSource, /精确核心锚点活跃度高时/);
  assert.match(llmSource, /只返回 3-6 个 keywords 或 3-6 条 customQueries 是无效的/);
  assert.match(llmSource, /Photoshop 可用形态包括 photoshop plugin/);
  assert.match(llmSource, /中文命名产品和平台必须当成命名软件处理/);
  assert.match(llmSource, /不要依赖任何固定产品字典/);
  assert.match(llmSource, /剪映代表 CapCut\/Jianying 视频剪辑生态/);
  assert.match(llmSource, /excludeTerms 可以为空/);
  assert.match(llmSource, /不要列任意无关领域作为排除词/);
  assert.doesNotMatch(llmSource, /exclude stock\/trading\/finance noise/);
  assert.match(llmSource, /CAD、AI、graph、video、audio/);
  assert.match(llmSource, /沿用成功的 UGNX 模式/);
  assert.match(llmSource, /返回 JSON 前必须自检每条 customQuery/);
  assert.match(llmSource, /keywords 必须是紧凑的规范锚点列表，不是大型关键词堆/);
  assert.match(llmSource, /只返回需求词加/);
  assert.match(llmSource, /不要把 payload\.name 改成营销标题/);
  assert.match(llmSource, /function observationDraftStrategy\(parsed = \{\}\)/);
  assert.match(llmSource, /function observationPlanRepairPrompt\(payload = \{\}, raw = "", language = "zh"\)/);
  assert.match(llmSource, /Before writing JSON, internally use this method/);
  assert.match(llmSource, /requestObservationPlanCompletion\(\{[\s\S]*temperature: 0/);
});

test("observation plan generation repairs thin but valid drafts", () => {
  const llmSource = fs.readFileSync(path.join(__dirname, "../src/lib/llm.js"), "utf8");

  assert.match(llmSource, /function observationPlanDraftQualityIssues\(parsed = \{\}, payload = \{\}\)/);
  assert.match(llmSource, /function minimumObservationDraftCustomQueries\(payload = \{\}\)/);
  assert.match(llmSource, /function observationPlanQualityRepairPrompt\(payload = \{\}, raw = "", issues = \[\], language = "zh"\)/);
  assert.match(llmSource, /strategy\.customQueries is too thin/);
  assert.match(llmSource, /Quality gate failures/);
  assert.match(llmSource, /至少生成 \$\{requiredQueries\} 条强相关 customQueries/);
  assert.match(llmSource, /不要使用 OR 串/);
  assert.match(llmSource, /customQueries have quality issues/);
  assert.match(llmSource, /let qualityIssues = observationPlanDraftQualityIssues\(parsed, payload\)/);
  assert.match(llmSource, /qualityRepairAttempt < 2/);
  assert.match(llmSource, /observationPlanQualityRepairPrompt\(payload, raw, qualityIssues, language\)/);
});

test("business acronym plans use broad CRM surfaces instead of thin vendor profiles", () => {
  const llmSource = fs.readFileSync(path.join(__dirname, "../src/lib/llm.js"), "utf8");
  const serverSource = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");
  const githubSource = fs.readFileSync(path.join(__dirname, "../src/lib/github.js"), "utf8");

  assert.match(llmSource, /CRM -> CRM, customer relationship management, sales pipeline/);
  assert.match(llmSource, /Do not use a single vendor\/project name, SEO article name, GEO answer snippet, or commercial product brand as a profile unless the user explicitly asked/);
  assert.match(serverSource, /key:\s*"business-crm"/);
  assert.match(serverSource, /"crm dashboard"/);
  assert.match(serverSource, /"sales pipeline crm"/);
  assert.match(serverSource, /const specificAcronym = \/\^\[A-Z0-9\]/);
  assert.match(serverSource, /function isOverSpecificAcronymProjectQuery/);
  assert.doesNotMatch(serverSource, /function minimumObservationProfileCount/);
  assert.doesNotMatch(serverSource, /fallbackMatrixQueries/);
  assert.doesNotMatch(serverSource, /mergedQueries\.length < minimumProfiles/);
  assert.doesNotMatch(serverSource, /relevantCustomQueries\.length < minimumProfiles/);
  assert.match(githubSource, /const BUSINESS_CRM_STRONG_PLAN_TERMS = \[/);
  assert.match(githubSource, /function isBusinessCrmObservationPlan\(plan = \{\}\)/);
});

test("CRM scan relevance accepts business CRM surfaces beyond the acronym itself", () => {
  const plan = {
    id: "crm",
    name: "CRM 系统",
    searchLogic: {
      baseMode: "only",
      customQueries: [
        {
          label: "销售管道",
          query: "sales pipeline crm in:name,description,readme archived:false mirror:false"
        }
      ]
    }
  };
  const [profile] = buildQueryProfiles(plan);

  assert.ok(profile.planTerms.includes("sales pipeline"));
  assert.equal(
    repositoryMatchesPlanProfile(
      {
        fullName: "acme/pipeline-board",
        name: "pipeline-board",
        owner: "acme",
        description: "Open source sales pipeline and deal tracking dashboard for small teams.",
        topics: ["sales", "pipeline", "dashboard"]
      },
      profile
    ),
    true
  );
});

test("media observation exclude terms stay limited to real ambiguity or result noise", () => {
  const serverSource = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");
  const mediaPack = serverSource.slice(
    serverSource.indexOf('key: "media"'),
    serverSource.indexOf('key: "design"')
  );

  assert.match(mediaPack, /excludeTerms: \["movie list", "music list", "paper", "dataset", "tutorial"\]/);
  assert.doesNotMatch(mediaPack, /"stock"|"stocks"|"trading"|"finance"|"quant"|"crypto"|"股票"|"证券"|"交易"|"量化"|"行情"/);
  assert.match(serverSource, /function filterObservationExcludeTerms\(values = \[\], options = \{\}\)/);
  assert.match(serverSource, /excludeTerms: filterObservationExcludeTerms\(strategy\.excludeTerms \|\| \[\]/);
  assert.doesNotMatch(serverSource, /const trustedExcludeTerms = uniqueStrings/);
  assert.doesNotMatch(serverSource, /filterObservationExcludeTerms\([\s\S]*planLogic\.excludeTerms[\s\S]*trustedExcludeTerms/);
});

test("observation plan generation does not mix history from a different plan name", () => {
  const serverSource = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");

  assert.match(serverSource, /const planName = String\(body\.name \|\| ""\)\.trim\(\)/);
  assert.match(serverSource, /const latestNeed = uniqueStrings\(\[body\.idea, body\.detailedNeed\], 2\)\.join\("\\n"\)\.trim\(\)/);
  assert.match(serverSource, /const requirementRecords = draftObservationRequirements\(latestNeed\)/);
  assert.match(serverSource, /const combinedNeed = requirementRecords\.map\(\(item\) => item\.text\)\.filter\(Boolean\)\.join\("\\n"\)/);
  assert.doesNotMatch(serverSource, /const requestRequirements = Array\.isArray\(body\.requirements\)/);
  assert.doesNotMatch(serverSource, /body\.currentSearchLogic/);
  assert.doesNotMatch(serverSource, /storage\.saveObservationPlanRequirements\(currentPlan\.id,\s*requirementTexts\)/);
  assert.doesNotMatch(serverSource, /const savedRequirementPlan = storage\.saveObservationPlanRequirements\(currentPlan\.id,\s*requirementTexts\)/);
});

test("AI observation plan failures are not silently downgraded to weak local drafts", () => {
  const serverSource = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");
  const generateRoute = serverSource.slice(
    serverSource.indexOf('if (req.method === "POST" && url.pathname === "/api/observation-plans/generate")'),
    serverSource.indexOf('if (req.method === "GET" && url.pathname === "/api/portable-data/export")')
  );

  assert.match(generateRoute, /请先在设置里配置并保存可用的 AI 模型 API Key 后再生成观察方案/);
  assert.match(generateRoute, /AI 生成方案未返回可执行 GitHub 检索逻辑，请补充需求后重试/);
  assert.match(generateRoute, /sendError\(res, 502, message, \{ providerMessage: aiError\.message \}\)/);
  assert.doesNotMatch(generateRoute, /heuristicObservationPlanDraft/);
  assert.doesNotMatch(generateRoute, /fallbackPlan/);
  assert.doesNotMatch(generateRoute, /catch \(aiError\) \{\s*sendJson\(res, 200,[\s\S]*?source: "local"/);
});

test("generated observation plans rely on the AI prompt instead of service-side profile packs", () => {
  const serverSource = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");
  const llmSource = fs.readFileSync(path.join(__dirname, "../src/lib/llm.js"), "utf8");

  assert.match(serverSource, /function explicitNeedTerms\(need = ""\)/);
  assert.match(serverSource, /"Siemens NX",\s*"NXOpen",\s*"NX Open",\s*"UGOpen",\s*"Unigraphics",\s*"UG NX"/);
  assert.match(serverSource, /queryMatchesExplicitNeed\(item, expandedNeedText\)/);
  assert.doesNotMatch(serverSource, /function explicitNeedProfiles/);
  assert.doesNotMatch(serverSource, /function observationDomainMatrix/);
  assert.doesNotMatch(serverSource, /function dynamicObservationProfiles/);
  assert.match(llmSource, /不要把 payload\.name 或 payload\.detailedNeed 中明确的产品、框架、软件、缩写替换成宽泛父级领域/);
  assert.match(llmSource, /比如 UGNX plugins/);
});

test("observation plan generation passes GitHub activity evidence into the plan prompt", () => {
  const serverSource = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");

  assert.match(serverSource, /function githubActivityProbeTerms\(need = ""\)/);
  assert.match(serverSource, /function probeGithubActivityForObservationNeed\(need = "", token = ""\)/);
  assert.match(serverSource, /githubRepositorySearchCount\(token,\s*`\$\{quoteObservationSearchTerm\(term\)\} in:name,description,readme archived:false mirror:false`\)/);
  assert.match(serverSource, /const githubActivity = await probeGithubActivityForObservationNeed\(researchNeed, effectiveGithubToken\(\)\)/);
  assert.match(serverSource, /\.\.\.baseResearchContext,\s*githubActivity/);
  assert.match(serverSource, /function compactObservationResearchContextForPrompt\(context = \{\}\)/);
  assert.match(serverSource, /const promptResearchContext = compactObservationResearchContextForPrompt\(researchContext\)/);
  assert.match(serverSource, /researchContext: promptResearchContext/);
});

test("generic CAD plans do not inherit NX-specific vocabulary", () => {
  const serverSource = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");
  const cadPack = serverSource.slice(serverSource.indexOf("const CAD_OBSERVATION_PACK"), serverSource.indexOf("const OBSERVATION_DOMAIN_PACKS"));

  assert.match(serverSource, /"cad",\s*"cae",\s*"cam"/);
  assert.match(serverSource, /const NX_CAD_OBSERVATION_PACK = \{/);
  assert.match(serverSource, /const OBSERVATION_DOMAIN_PACKS = \[\s*NX_CAD_OBSERVATION_PACK,\s*CAD_OBSERVATION_PACK/);
  assert.doesNotMatch(cadPack, /"UGNX"|"UG NX"|"Siemens NX"|"NXOpen"|"NX Open"|"UGOpen"|"Unigraphics"/);
  assert.match(serverSource, /function pruneObservationTermsForNeed\(values = \[\], need = "", limit = 80\)/);
  assert.match(serverSource, /const allowNxTerms = isNxObservationNeed\(need\)/);
  assert.match(serverSource, /const needPacks = detectedObservationPacks\(need\)/);
  assert.match(serverSource, /const hasSpecificNeedAnchor = explicitNeedTerms\(need\)\.some\(isSpecificObservationTerm\)/);
  assert.match(serverSource, /const packs = needPacks\.length \? needPacks : hasSpecificNeedAnchor \? \[\] : detectedObservationPacks\(text\)/);
  assert.match(serverSource, /function isWeakGenericCadQuery\(item = \{\}, domainModel = \{\}\)/);
  assert.match(serverSource, /!\s*isWeakGenericCadQuery\(item, domainModel\)[\s\S]*queryMatchesDomain\(item, queryDomainModel, needText\)[\s\S]*queryMatchesExplicitNeed\(item, expandedNeedText\)/);
});

test("CAD observation plans execute confirmed adjacent ecosystem queries", () => {
  const plan = {
    id: "cad",
    name: "CAD",
    requirements: [{ text: "CAD 相关，重点关注工程设计、文件格式、建模、查看转换、插件和自动化工具" }],
    searchLogic: {
      baseMode: "only",
      keywords: ["CAD", "DWG", "DXF", "STEP", "JSCAD", "BRL-CAD", "OpenCascade"],
      customQueries: [
        {
          label: "JSCAD",
          query: "JSCAD in:name,description,readme archived:false mirror:false stars:>20"
        },
        {
          label: "BRL-CAD",
          query: "BRL-CAD in:name,description,readme archived:false mirror:false stars:>20"
        },
        {
          label: "DWG 文件工具",
          query: "DWG in:name,description,readme archived:false mirror:false stars:>20"
        }
      ]
    }
  };
  const profiles = buildQueryProfiles(plan);

  assert.equal(profiles.length, 3);
  assert.ok(profiles.some((profile) => /JSCAD/i.test(profile.q)));
  assert.ok(profiles.some((profile) => /BRL-CAD/i.test(profile.q)));
  assert.ok(profiles.some((profile) => /DWG/i.test(profile.q)));
});

test("video editing plans use media vocabulary instead of observation noise", () => {
  const serverSource = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");

  assert.match(serverSource, /"视频剪辑软件"/);
  assert.match(serverSource, /"video editing software"/);
  assert.match(serverSource, /"timeline video editor"/);
  assert.match(serverSource, /"nonlinear video editor"/);
  assert.match(serverSource, /"observation",\s*"observations"/);
  assert.match(serverSource, /const needEnglishTerms = extractEnglishTerms\(need, 24\)/);
  assert.match(serverSource, /const needChineseTerms = extractChineseTerms\(need, 24\)/);
  assert.match(serverSource, /const useResearchWordTerms = Boolean\(primary\) \|\| !hasSpecificNeedAnchor/);
  assert.match(serverSource, /\.\.\.\(useResearchWordTerms \? chineseTerms : \[\]\)/);
  assert.match(serverSource, /\.\.\.\(useResearchWordTerms \? englishTerms : \[\]\)/);
  assert.match(serverSource, /function isObservationPlatformNoise\(item = \{\}, need = ""\)/);
  assert.match(serverSource, /!\s*isObservationPlatformNoise\(item, needText\)[\s\S]*queryMatchesDomain\(item, queryDomainModel, needText\)/);
  assert.doesNotMatch(serverSource, /function cleanObservationDraftNeed\(value = ""\)/);
  assert.doesNotMatch(serverSource, /const queryNeed = \[planTitle, idea\]\.filter\(Boolean\)\.join\("\\n"\) \|\| display/);
  assert.doesNotMatch(serverSource, /`\$\{display\.slice\(0, 36\)\} observation`/);
});

test("saved observation plans display and execute the same capped query count", () => {
  const storage = tempStore();
  const saved = storage.saveObservationPlan({
    name: "CAD 观察",
    searchLogic: {
      baseMode: "only",
      customQueries: Array.from({ length: 80 }, (_, index) => ({
        label: `CAD 查询 ${index}`,
        labelZh: `CAD 查询 ${index}`,
        query: `cad viewer editor ${index} in:name,description,readme stars:>10 pushed:>=2026-01-01 archived:false mirror:false`
      }))
    }
  });

  const plan = storage.getObservationPlan(saved.id);
  const displayedCount = plan.searchLogic.customQueries.length;
  const executableCount = buildQueryProfiles(plan).length;

  assert.equal(displayedCount, 30);
  assert.equal(plan.summary.searchLogicItems, 30);
  assert.equal(executableCount, displayedCount);
});

test("completed observation plans preserve AI-generated keyword results", () => {
  const storage = tempStore();
  const saved = storage.saveObservationPlan({
    name: "macbook",
    searchLogic: {
      baseMode: "only",
      keywords: ["macbook", "macOS", "Apple Silicon", "battery health", "thermal monitor", "menu bar utility"],
      customQueries: [
        {
          label: "电池健康",
          query: "macbook battery health in:name,description,readme archived:false mirror:false"
        },
        {
          label: "温度监控",
          query: "macbook thermal monitor in:name,description,readme archived:false mirror:false"
        }
      ]
    }
  });

  const plan = storage.getObservationPlan(saved.id);
  assert.ok(plan.searchLogic.keywords.includes("Apple Silicon"));
  assert.ok(plan.searchLogic.keywords.includes("battery health"));
  assert.ok(plan.searchLogic.keywords.includes("menu bar utility"));
  assert.equal(buildQueryProfiles(plan).length, plan.searchLogic.customQueries.length);
});

test("local observation plan fallback is removed from generation", () => {
  const serverSource = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");
  const generateRoute = serverSource.slice(
    serverSource.indexOf('if (req.method === "POST" && url.pathname === "/api/observation-plans/generate")'),
    serverSource.indexOf('if (req.method === "GET" && url.pathname === "/api/portable-data/export")')
  );

  assert.match(serverSource, /function cleanObservationKeywordList\(values = \[\], need = "", limit = OBSERVATION_KEYWORD_LIMIT\)/);
  assert.match(serverSource, /OBSERVATION_KEYWORD_STOP_WORDS/);
  assert.match(serverSource, /replace\(\/\\bin:name,description,readme\\b\.\*\$\/i, ""\)/);
  assert.match(serverSource, /isShallowObservationKeywordVariant\(term, explicitTerms\)/);
  assert.match(generateRoute, /sendError\(res, 400, "请先在设置里配置并保存可用的 AI 模型 API Key 后再生成观察方案"\)/);
  assert.doesNotMatch(serverSource, /function heuristicObservationPlanDraft/);
  assert.doesNotMatch(serverSource, /function buildHeuristicQueries/);
  assert.doesNotMatch(generateRoute, /source:\s*"local"/);
});

test("AI generated query groups can backfill aligned keyword vocabulary without fallback keywords", () => {
  const serverSource = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");
  const completeSlice = serverSource.slice(serverSource.indexOf("function completeObservationPlanQueries"), serverSource.indexOf("async function researchObservationPlanContext"));

  assert.match(serverSource, /function aiProfileKeywordCandidates\(profiles = \[\], need = "", limit = 80\)/);
  assert.match(serverSource, /function observationKeywordBackfillProfiles\(options = \{\}\)/);
  assert.match(serverSource, /function executableObservationCustomQueries\(plan = \{\}, searchLogic = \{\}\)/);
  assert.match(completeSlice, /const aiProfileKeywords = aiProfileKeywordCandidates\(customQueries, needText, OBSERVATION_KEYWORD_LIMIT\)/);
  assert.match(completeSlice, /\.\.\.strategyKeywordList,\s*\.\.\.aiProfileKeywords/);
  assert.match(completeSlice, /const backfillTerms = cleanObservationKeywordsForNeed/);
  assert.match(completeSlice, /const backfilledCustomQueries = observationKeywordBackfillProfiles/);
  assert.match(completeSlice, /const combinedCustomQueries = compactObservationProfiles/);
  assert.doesNotMatch(completeSlice, /fallbackKeywords/);
});

test("generated plan completion keeps AI keywords as the primary vocabulary", () => {
  const serverSource = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");
  const completeSlice = serverSource.slice(serverSource.indexOf("function completeObservationPlanQueries"), serverSource.indexOf("async function researchObservationPlanContext"));

  assert.match(serverSource, /function cleanObservationKeywordsForNeed\(values = \[\], need = "", limit = OBSERVATION_KEYWORD_LIMIT\)/);
  assert.match(serverSource, /function isUnrequestedObservationSurface\(item = \{\}, need = ""\)/);
  assert.match(completeSlice, /const domainModel = buildObservationDomainModel\(needText, \{\}\)/);
  assert.match(completeSlice, /const queryDomainModel = \{[\s\S]*sampleTerms: uniqueStrings\(\[\.\.\.\(domainModel\.sampleTerms \|\| \[\]\), \.\.\.strategyKeywordList, \.\.\.aiProfileKeywords\]/);
  assert.match(completeSlice, /searchLogic\.customQueries = executableObservationCustomQueries/);
  assert.doesNotMatch(completeSlice, /const explicitQueries/);
  assert.doesNotMatch(completeSlice, /fallbackMatrixQueries/);
  assert.doesNotMatch(completeSlice, /supplementalQueries/);
  assert.doesNotMatch(serverSource, /function mergeObservationPlanWithMetacognition/);
  assert.doesNotMatch(serverSource, /function observationKeywordMatchesDomain/);
});

test("custom observation plan scans do not inject global trending candidates", () => {
  const serverSource = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");

  assert.match(serverSource, /const isDefaultObservationPlan = activePlan\.id === "default";/);
  assert.match(serverSource, /let trendingMaxRepos = isDefaultObservationPlan\s*\? Math\.max\([\s\S]*?\)\s*:\s*0;/);
});

test("generic CAD plan scans reject README-only and low-value container noise", () => {
  const weakPlan = {
    id: "cad",
    name: "CAD",
    searchLogic: {
      baseMode: "only",
      customQueries: [
        { label: "CAD 核心项目", query: "cad in:name,description,readme archived:false mirror:false" },
        { label: "CAD 工具", query: "cad tool in:name,description,readme archived:false mirror:false" },
        { label: "DWG 工具", query: "dwg viewer editor in:name,description,readme archived:false mirror:false" }
      ]
    }
  };
  assert.deepEqual(
    buildQueryProfiles(weakPlan).map((profile) => profile.labelZh),
    ["DWG 工具"]
  );

  const plan = {
    id: "cad",
    name: "CAD",
    searchLogic: {
      baseMode: "only",
      customQueries: [
        {
          label: "工程图工具",
          query:
            "technical drawing cad in:name,description,readme stars:>15 pushed:>=2025-07-08 archived:false mirror:false -topic:agent -topic:awesome"
        }
      ]
    }
  };
  const [profile] = buildQueryProfiles(plan);

  assert.doesNotMatch(profile.q, /-topic:/);
  assert.ok(profile.planTerms.includes("FreeCAD"));
  assert.ok(profile.planTerms.includes("DWG"));
  assert.equal(
    repositoryMatchesPlanProfile(
      {
        fullName: "LazyAGI/LazyLLM",
        name: "LazyLLM",
        owner: "LazyAGI",
        description: "Easiest way for building multi-agent LLM applications.",
        topics: ["llm", "agent"]
      },
      profile
    ),
    false
  );
  assert.equal(
    repositoryMatchesPlanProfile(
      {
        fullName: "josephmisiti/awesome-machine-learning",
        name: "awesome-machine-learning",
        owner: "josephmisiti",
        description: "A curated list of awesome Machine Learning frameworks, libraries and software.",
        topics: ["awesome", "machine-learning"]
      },
      profile
    ),
    false
  );
  assert.equal(
    repositoryMatchesPlanProfile(
      {
        fullName: "cirosantilli/linux-kernel-module-cheat",
        name: "linux-kernel-module-cheat",
        owner: "cirosantilli",
        description: "GDB step debug and KGDB just work for Linux kernel modules.",
        topics: ["linux-kernel", "qemu"]
      },
      profile
    ),
    false
  );
  assert.equal(
    repositoryMatchesPlanProfile(
      {
        fullName: "FreeCAD/FreeCAD",
        name: "FreeCAD",
        owner: "FreeCAD",
        description: "This is the official source code of FreeCAD, a free and open source multiplatform 3D parametric modeler.",
        topics: ["cad", "parametric-modeling", "opencascade"]
      },
      profile
    ),
    true
  );
});

test("named media product plans keep exact anchors and reject finance noise", () => {
  const plan = {
    id: "jianying",
    name: "剪映",
    requirements: [{ text: "剪映相关的剪辑软件、模板、字幕和自动化项目" }],
    searchLogic: {
      baseMode: "only",
      customQueries: [
        {
          label: "股票分析",
          query: "stock analysis software in:name,description,readme archived:false mirror:false"
        },
        {
          label: "CapCut 模板",
          query: "capcut template in:name,description,readme archived:false mirror:false"
        },
        {
          label: "Jianying 自动化",
          query: "jianying automation in:name,description,readme archived:false mirror:false"
        }
      ]
    }
  };
  const profiles = buildQueryProfiles(plan);

  assert.deepEqual(
    profiles.map((profile) => profile.labelZh),
    ["CapCut 模板", "Jianying 自动化"]
  );
  assert.ok(profiles[0].planTerms.includes("剪映"));
  assert.ok(profiles[0].planTerms.includes("CapCut"));
  assert.equal(
    repositoryMatchesPlanProfile(
      {
        fullName: "finance/stock-analysis",
        name: "stock-analysis",
        owner: "finance",
        description: "Stock analysis and trading dashboard",
        topics: ["stock", "trading", "finance"]
      },
      profiles[0]
    ),
    false
  );
  assert.equal(
    repositoryMatchesPlanProfile(
      {
        fullName: "creator/capcut-template-tools",
        name: "capcut-template-tools",
        owner: "creator",
        description: "CapCut template helper for video editors and subtitle workflows",
        topics: ["capcut", "video-editing", "subtitle"]
      },
      profiles[0]
    ),
    true
  );
});

test("named image software plans keep Photoshop anchors and reject mechanical padding", () => {
  const serverSource = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");
  const llmSource = fs.readFileSync(path.join(__dirname, "../src/lib/llm.js"), "utf8");

  assert.match(llmSource, /Photoshop -> photoshop, Adobe Photoshop, PSD, PSB, UXP, CEP/);
  assert.match(llmSource, /Photoshop 可用形态包括 photoshop plugin/);
  assert.doesNotMatch(serverSource, /const NAMED_SOFTWARE_SURFACES = \[/);
  assert.doesNotMatch(serverSource, /const IMAGE_DESIGN_SOFTWARE_SURFACES = \[/);
  assert.match(serverSource, /function isMechanicalObservationExpansion\(item = \{\}, need = ""\)/);

  const plan = {
    id: "photoshop",
    name: "photoshop",
    requirements: [{ text: "photoshop 相关的插件、脚本、PSD 和工作流" }],
    searchLogic: {
      baseMode: "only",
      customQueries: [
        {
          label: "股票分析",
          query: "stock analysis software in:name,description,readme archived:false mirror:false"
        },
        {
          label: "Photoshop 插件",
          query: "photoshop plugin in:name,description,readme archived:false mirror:false"
        },
        {
          label: "Photoshop 动作",
          query: "photoshop action in:name,description,readme archived:false mirror:false"
        },
        {
          label: "Photoshop PSD",
          query: "photoshop psd in:name,description,readme archived:false mirror:false"
        },
        {
          label: "机械扩展",
          query: "uxp-photoshop-plugin-samples app dashboard in:name,description,readme archived:false mirror:false"
        }
      ]
    }
  };
  const profiles = buildQueryProfiles(plan);

  assert.deepEqual(
    profiles.map((profile) => profile.labelZh),
    ["Photoshop 插件", "Photoshop 动作", "Photoshop PSD"]
  );
  assert.ok(profiles.every((profile) => /photoshop/i.test(profile.q)));
  assert.equal(
    repositoryMatchesPlanProfile(
      {
        fullName: "finance/stock-dashboard",
        name: "stock-dashboard",
        owner: "finance",
        description: "Stock analysis and trading dashboard",
        topics: ["stock", "trading", "finance"]
      },
      profiles[0]
    ),
    false
  );
  assert.equal(
    repositoryMatchesPlanProfile(
      {
        fullName: "adobe/photoshop-uxp-plugin-samples",
        name: "photoshop-uxp-plugin-samples",
        owner: "adobe",
        description: "Photoshop UXP plugin samples",
        topics: ["photoshop", "uxp", "plugin"]
      },
      profiles[0]
    ),
    true
  );
});

test("Chinese named product plans use generic method without fixed product dictionaries", () => {
  const serverSource = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");
  const githubSource = fs.readFileSync(path.join(__dirname, "../src/lib/github.js"), "utf8");

  assert.match(serverSource, /function isLikelyChineseNamedProductTerm\(term = "", need = ""\)/);
  assert.match(githubSource, /function chinesePlanTerms\(text = "", limit = 12\)/);
  assert.match(githubSource, /const keywordText = \[strategy\.keywords, strategy\.focusTerms\]/);
  assert.doesNotMatch(serverSource, /key: "wechat-platform"/);
  assert.doesNotMatch(serverSource, /WECHAT_PLATFORM_PROFILES/);
  assert.doesNotMatch(serverSource, /namedPlatformNeedTerms/);
  assert.doesNotMatch(githubSource, /namedPlatformPlanTerms/);

  const plan = {
    id: "chinese-product",
    name: "微信",
    requirements: [{ text: "微信相关项目" }],
    searchLogic: {
      baseMode: "only",
      keywords: ["微信", "WeChat", "Weixin"],
      customQueries: [
        {
          label: "股票分析",
          query: "stock analysis software in:name,description,readme archived:false mirror:false"
        },
        {
          label: "Telegram 机器人",
          query: "telegram bot in:name,description,readme archived:false mirror:false"
        },
        {
          label: "中文锚点插件",
          query: "微信 plugin in:name,description,readme archived:false mirror:false"
        },
        {
          label: "AI 发现别名",
          query: "wechat mini program in:name,description,readme archived:false mirror:false"
        },
        {
          label: "AI 发现英文别名",
          query: "weixin sdk api in:name,description,readme archived:false mirror:false"
        }
      ]
    }
  };
  const profiles = buildQueryProfiles(plan);

  assert.deepEqual(
    profiles.map((profile) => profile.labelZh),
    ["中文锚点插件", "AI 发现别名", "AI 发现英文别名"]
  );
  assert.ok(profiles.every((profile) => /wechat|weixin|微信/i.test(profile.q)));
  assert.equal(
    repositoryMatchesPlanProfile(
      {
        fullName: "telegram/bot-dashboard",
        name: "bot-dashboard",
        owner: "telegram",
        description: "Telegram bot dashboard",
        topics: ["telegram", "bot"]
      },
      profiles[0]
    ),
    false
  );
  assert.equal(
    repositoryMatchesPlanProfile(
      {
        fullName: "wechaty/wechaty",
        name: "wechaty",
        owner: "wechaty",
        description: "Conversational SDK for WeChat bots",
        topics: ["wechat", "bot", "sdk"]
      },
      profiles[0]
    ),
    true
  );
});

test("Chinese named platform plans normalize boolean alias groups and preserve short aliases", () => {
  const llmSource = fs.readFileSync(path.join(__dirname, "../src/lib/llm.js"), "utf8");
  const plan = {
    id: "xhs-platform",
    name: "小红书",
    requirements: [{ text: "小红书相关项目" }],
    searchLogic: {
      baseMode: "only",
      keywords: ["小红书", "xiaohongshu", "RedNote", "XHS", "小红书爬虫", "小红书API", "MCP"],
      customQueries: [
        {
          label: "小红书采集",
          query: "(小红书 OR xiaohongshu OR XHS OR RedNote) (爬虫 OR 采集 OR spider OR crawler) in:name,description,readme archived:false mirror:false",
          stars: 20
        },
        {
          label: "短别名采集",
          query: "XHS crawler in:name,description,readme archived:false mirror:false"
        },
        {
          label: "无关股票",
          query: "stock analysis dashboard in:name,description,readme archived:false mirror:false"
        }
      ]
    }
  };
  const profiles = buildQueryProfiles(plan);

  assert.deepEqual(
    profiles.map((profile) => profile.labelZh),
    ["小红书采集", "短别名采集"]
  );
  assert.ok(profiles[0].planTerms.includes("XHS"));
  assert.ok(!profiles[0].planTerms.includes("MCP"));
  assert.doesNotMatch(profiles[0].q, /\bOR\b|[()]/);
  assert.match(profiles[0].q, /xiaohongshu|小红书|RedNote|XHS/i);
  assert.match(profiles[0].q, /crawler|spider|爬虫|采集/i);
  assert.equal(
    repositoryMatchesPlanProfile(
      {
        fullName: "example/xhs-crawler",
        name: "xhs-crawler",
        owner: "example",
        description: "Crawler for XHS notes",
        topics: ["crawler"]
      },
      profiles[1]
    ),
    true
  );
  assert.equal(
    repositoryMatchesPlanProfile(
      {
        fullName: "modelcontextprotocol/mcp-server",
        name: "mcp-server",
        owner: "modelcontextprotocol",
        description: "Generic MCP server collection",
        topics: ["mcp"]
      },
      profiles[0]
    ),
    false
  );
  assert.match(llmSource, /不要使用 "\(A OR B\)" 这类括号布尔 OR 组/);
});

test("specific observation plan searches reject README-only container noise", () => {
  const plan = {
    id: "ugnx",
    name: "UGNX",
    requirements: [{ text: "UGNX 相关插件" }],
    searchLogic: {
      baseMode: "only",
      customQueries: [
        {
          label: "UGNX 核心项目",
          query: "ugnx in:name,description,readme archived:false mirror:false"
        }
      ]
    }
  };
  const [profile] = buildQueryProfiles(plan);

  assert.deepEqual(profile.planTerms, ["UGNX", "Siemens NX", "NXOpen", "NX Open", "UGOpen", "Unigraphics", "UG NX"]);
  assert.equal(
    repositoryMatchesPlanProfile(
      {
        fullName: "PPJJ0222/QtUGNXall",
        name: "QtUGNXall",
        owner: "PPJJ0222",
        description: "",
        topics: []
      },
      profile
    ),
    true
  );
  assert.equal(
    repositoryMatchesPlanProfile(
      {
        fullName: "Foadsf/NXOpen_Python_tutorials",
        name: "NXOpen_Python_tutorials",
        owner: "Foadsf",
        description: "a collection of NXOpen Python tutorials",
        topics: []
      },
      profile
    ),
    true
  );
  assert.equal(
    repositoryMatchesPlanProfile(
      {
        fullName: "DreamEnding/NX_MCP",
        name: "NX_MCP",
        owner: "DreamEnding",
        description: "MCP server for Siemens NX (UG) - AI agents control NX GUI via tools",
        topics: []
      },
      profile
    ),
    true
  );
  assert.equal(
    repositoryMatchesPlanProfile(
      {
        fullName: "AkshayKaswa1008/AkshayKaswa1008",
        name: "AkshayKaswa1008",
        owner: "AkshayKaswa1008",
        description: "Config files for my GitHub profile.",
        topics: ["config", "github-config"]
      },
      profile
    ),
    false
  );
  assert.equal(
    repositoryMatchesPlanProfile(
      {
        fullName: "Dujltqzv/Some-Many-Books",
        name: "Some-Many-Books",
        owner: "Dujltqzv",
        description: `${"个人收藏书籍列表 ".repeat(120)} Siemens NX UG NX PDF下载`,
        topics: []
      },
      profile
    ),
    false
  );
  assert.equal(
    repositoryMatchesPlanProfile(
      {
        fullName: "yorikvanhavre/CADExchanger",
        name: "CADExchanger",
        owner: "yorikvanhavre",
        description: "A FreeCAD addon that uses CAD Exchanger to allow import and export of additional CAD file formats",
        topics: ["cad", "freecad"]
      },
      profile
    ),
    false
  );
  assert.equal(
    repositoryMatchesPlanProfile(
      {
        fullName: "ismrmrd/siemens_to_ismrmrd",
        name: "siemens_to_ismrmrd",
        owner: "ismrmrd",
        description: "Siemens ISMRMRD converter",
        topics: []
      },
      profile
    ),
    false
  );
  assert.equal(
    repositoryMatchesPlanProfile(
      {
        fullName: "nexon-oss/nxopenapi-docs",
        name: "nxopenapi-docs",
        owner: "nexon-oss",
        description: "NEXON Open API docs.",
        topics: ["nexon", "openapi", "oss"]
      },
      profile
    ),
    false
  );
  assert.equal(
    repositoryMatchesPlanProfile(
      {
        fullName: "m2n037/awesome-mecheng",
        name: "awesome-mecheng",
        owner: "m2n037",
        description: "Awesome Mechanical Engineering Resources",
        topics: ["awesome", "mechanical-engineering", "unigraphics"]
      },
      profile
    ),
    false
  );
  assert.equal(
    repositoryMatchesPlanProfile(
      {
        fullName: "vketch/videoplayer",
        name: "videoplayer",
        owner: "vketch",
        description: "mbed-os video player based on UniGrapic for NUCLEO-F412ZG",
        topics: ["mbed-os", "unigraphics"]
      },
      profile
    ),
    false
  );
  assert.equal(
    repositoryMatchesPlanProfile(
      {
        fullName: "erfan4323/UniGraphics",
        name: "UniGraphics",
        owner: "erfan4323",
        description: "An abstraction layer that unifies multiple graphics libraries.",
        topics: ["opengl", "raylib", "sdl2", "sfml", "sokol", "unigraphics"]
      },
      profile
    ),
    false
  );
  assert.equal(
    repositoryMatchesPlanProfile(
      {
        fullName: "eavpsp/raylib-nx-opengl4.2",
        name: "raylib-nx-opengl4.2",
        owner: "eavpsp",
        description: "Updated Version of Raylib for NX that supports Open GL 4.2",
        topics: []
      },
      profile
    ),
    false
  );
  assert.equal(
    repositoryMatchesPlanProfile(
      {
        fullName: "networkoptix/nx_open",
        name: "nx_open",
        owner: "networkoptix",
        description: "NetworkOptix open-source components used to build Powered-by-Nx products including Desktop Client for Network Optix Video Management Platform.",
        topics: ["networkoptix", "nx", "video-processing", "vms", "webrtc"]
      },
      profile
    ),
    false
  );
  assert.equal(
    repositoryMatchesPlanProfile(
      {
        fullName: "bilasyurii/unigraphics",
        name: "unigraphics",
        owner: "bilasyurii",
        description: "Program for students of Ukrainian schools which is created to help them better understand some concepts of Computer Graphics sphere.",
        topics: []
      },
      profile
    ),
    false
  );
  assert.equal(
    repositoryMatchesPlanProfile(
      {
        fullName: "Unigraphics/PostBuilder",
        name: "PostBuilder",
        owner: "Unigraphics",
        description: "PostBuilder",
        topics: ["postbuilder", "postprocessor", "tcl", "ugs", "unigraphics"]
      },
      profile
    ),
    true
  );
  assert.equal(
    repositoryMatchesPlanProfile(
      {
        fullName: "TakashiNord/mom_user_Mazak_Integrex_i400S",
        name: "mom_user_Mazak_Integrex_i400S",
        owner: "TakashiNord",
        description: "mom_user for Mazak Integrex i400S",
        topics: ["mom", "postprocessor", "ugopen", "unigraphics"]
      },
      profile
    ),
    true
  );
});

test("NX CAD repositories keep engineering labels instead of generic media or knowledge labels", () => {
  const repos = [
    {
      fullName: "Renderium404/UGNX_lib",
      name: "UGNX_lib",
      owner: "Renderium404",
      description: "这是一个用于CAD建模的二次封装库",
      topics: []
    },
    {
      fullName: "Egor031/Launcher_Screenshot_PRT",
      name: "Launcher_Screenshot_PRT",
      owner: "Egor031",
      description: "Windows launcher for Siemens NX batch export PRT to OBJ and orthographic OBJ to PNG rendering",
      topics: ["cad", "dataset", "nxopen", "pyrender", "siemens-nx"]
    },
    {
      fullName: "PDubovikov/GCodeDevelop",
      name: "GCodeDevelop",
      owner: "PDubovikov",
      description: "Simple IDE for developing cnc programs and checking them in the Siemens NX CAM (NXOpen)",
      topics: []
    }
  ];

  for (const repo of repos) {
    const category = classifyRepository(repo);
    const useCase = inferUseCase(repo, category);
    assert.equal(category.key, "engineering-cad-nx");
    assert.equal(useCase.key, "engineering-cad-nx-automation");
    assert.notEqual(useCase.key, "creative-video-editing");
    assert.notEqual(useCase.key, "creative-audio-music");
    assert.notEqual(useCase.key, "knowledge-search");
  }
});

test("GitHub rate limits block scans instead of writing empty plan results", () => {
  const githubSource = fs.readFileSync(path.join(__dirname, "../src/lib/github.js"), "utf8");
  const serverSource = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");

  assert.equal(isGithubRateLimitError(new Error("GitHub request failed 403: API rate limit exceeded")), true);
  assert.equal(isGithubRateLimitError(new Error("You have exceeded a secondary rate limit")), true);
  assert.equal(isGithubRateLimitError(new Error("GitHub API 调用已触发限流")), true);
  assert.match(githubSource, /isGithubAuthError\(error\) \|\| isGithubRateLimitError\(error\)/);
  assert.match(githubSource, /GitHub network request failed/);
  assert.doesNotMatch(githubSource, /appliedExcludeTerms/);
  assert.match(serverSource, /function assertNoGithubBlockingErrors\(errors = \[\]\)/);
  assert.match(serverSource, /function assertGithubSearchUsable\(result = \{\}\)/);
  assert.match(serverSource, /assertNoGithubBlockingErrors\(result\.errors\)/);
  assert.match(serverSource, /assertGithubSearchUsable\(result\)/);
  assert.match(serverSource, /replaceObservationPlanMatches:\s*enriched\.length > 0 \|\| !scanErrors\.length/);
  assert.match(serverSource, /isGithubRateLimitError\(error\) \? 429/);
});

test("domain-stable generated queries use a wider pushed window", () => {
  const serverSource = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");
  const llmSource = fs.readFileSync(path.join(__dirname, "../src/lib/llm.js"), "utf8");

  assert.match(serverSource, /function observationQueryFreshnessDays\(query = "", options = \{\}\)/);
  assert.match(serverSource, /cad\|bim\|dwg\|dxf\|step\|iges\|stl\|ifc/);
  assert.match(serverSource, /return 365/);
  assert.match(serverSource, /normalizeObservationQueryFreshness\(cleanWithoutAntiNoise, options\)/);
  assert.match(llmSource, /CAD\/BIM\/geometry kernels\/file-format 生态通常约 365 天/);
});

test("AI hardware plans avoid OR soup and reject overlay noise", () => {
  const serverSource = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");
  const llmSource = fs.readFileSync(path.join(__dirname, "../src/lib/llm.js"), "utf8");
  const plan = {
    id: "ai-hardware",
    name: "AI 硬件",
    requirements: [{ text: "AI 硬件相关" }],
    searchLogic: {
      baseMode: "only",
      keywords: ["硬件", "GPU", "CUDA", "ROCm", "NPU", "TPU", "FPGA", "ASIC", "TensorRT", "OpenVINO", "TVM"],
      customQueries: [
        {
          label: "GPU CUDA ROCm AI",
          query: "in:name,description,readme GPU AI OR CUDA OR ROCm OR GPU deep learning archived:false mirror:false -awesome -paper -demo",
          stars: 0
        },
        {
          label: "NPU TPU AI芯片",
          query: "in:name,description,readme NPU OR TPU OR neural processing unit OR AI chip archived:false mirror:false -awesome -paper -demo",
          stars: 0
        },
        {
          label: "OpenCL机器学习加速",
          query: "in:name,description,readme OpenCL machine learning OR OpenCL deep learning OR OpenCL neural network archived:false mirror:false -awesome -paper -demo",
          stars: 0
        }
      ]
    }
  };
  const profiles = buildQueryProfiles(plan);
  const gpuProfile = profiles.find((profile) => /GPU CUDA ROCm AI/.test(profile.labelZh));
  const npuProfile = profiles.find((profile) => /NPU TPU AI芯片/.test(profile.labelZh));

  assert.match(serverSource, /AI 硬件与推理加速/);
  assert.match(llmSource, /对 AI 硬件、AI accelerator、edge inference、AI chip/);
  assert.equal(profiles.length, 3);
  assert.ok(gpuProfile);
  assert.ok(npuProfile);
  assert.doesNotMatch(gpuProfile.q, /\bOR\b/);
  assert.match(gpuProfile.q, /CUDA|GPU AI|GPU deep learning|ROCm/);
  assert.match(profiles[2].q, /OpenCL/);
  assert.equal(
    repositoryMatchesPlanProfile(
      {
        fullName: "RylandPrescotT/oiledmachine-overlay",
        name: "oiledmachine-overlay",
        owner: "RylandPrescotT",
        description: "adding ROCm 7.1 to oiledmachine-overlay. do not use. stick to upstream.",
        topics: []
      },
      gpuProfile
    ),
    false
  );
  assert.equal(
    repositoryMatchesPlanProfile(
      {
        fullName: "anilsathyan7/Portrait-Segmentation",
        name: "Portrait-Segmentation",
        owner: "anilsathyan7",
        description: "Real-time portrait segmentation for mobile devices",
        topics: ["coral-tpu", "edge-ai", "gpu-delegate", "int8-inference", "jetson-tx2", "tensorflow-lite"]
      },
      npuProfile
    ),
    true
  );
  assert.equal(
    repositoryMatchesPlanProfile(
      {
        fullName: "ericrenone/Tesla-Memory-Bandwidth-Wall",
        name: "Tesla-Memory-Bandwidth-Wall",
        owner: "ericrenone",
        description: "The Supervised Ceiling: Tesla memory bandwidth wall and a hardware convergence essay",
        topics: []
      },
      gpuProfile
    ),
    false
  );
});

test("default observation plan exposes read-only origin notes", () => {
  const storage = tempStore();
  const plan = storage.getObservationPlan("default");
  const notes = plan.requirements.map((item) => item.text).join("\n");

  assert.equal(plan.builtIn, true);
  assert.ok(plan.requirements.length >= 8);
  assert.match(notes, /默认观察/);
  assert.match(notes, /工具、服务或工作流/);
  assert.match(notes, /自托管应用/);
  assert.match(notes, /开发者工具/);
  assert.match(notes, /AI 相关不要泛泛搜概念/);
  assert.match(notes, /学习中枢/);
  assert.match(notes, /保持只读/);
  assert.throws(
    () => storage.saveObservationPlanRequirements("default", ["不应覆盖默认观察来源说明"]),
    /Default observation plan requirements cannot be edited/
  );
});

test("local IndexedDB API keeps default observation requirements in sync", () => {
  const localApiSource = fs.readFileSync(path.join(__dirname, "../public/local-api.js"), "utf8");

  assert.match(localApiSource, /const DEFAULT_OBSERVATION_REQUIREMENTS = \[/);
  assert.match(localApiSource, /requirements: defaultObservationRequirements\(createdAt\)/);
  assert.match(localApiSource, /function ensureDefaultObservationPlan\(snapshot = \{\}\)/);
  assert.match(localApiSource, /ensureDefaultObservationPlan\(snapshot\)/);
  assert.match(localApiSource, /requirements: isDefault \? defaultObservationRequirements\(plan\.createdAt \|\| nowIso\(\)\) : plan\.requirements/);
  assert.match(localApiSource, /Default observation plan requirements cannot be edited/);
  assert.doesNotMatch(localApiSource, /requirements: \[\]/);
});

test("plan scans replace stale project matches for that plan", () => {
  const storage = tempStore();
  const plan = storage.saveObservationPlan({
    name: "CAD 观察",
    searchLogic: {
      baseMode: "only",
      customQueries: [
        {
          label: "CAD viewer",
          query: "cad viewer"
        }
      ]
    }
  });
  storage.setActiveObservationPlan(plan.id);
  const scanMeta = {
    observationPlanId: plan.id,
    replaceObservationPlanMatches: true
  };
  const repo = (fullName) => ({
    fullName,
    owner: fullName.split("/")[0],
    name: fullName.split("/")[1],
    description: "CAD viewer",
    language: "TypeScript",
    topics: ["cad"],
    stars: 80,
    forks: 8,
    openIssues: 1,
    pushedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scores: {
      opportunity: 70,
      quality: 70,
      actionability: 70,
      risk: 5
    }
  });

  storage.upsertProjects([repo("acme/old-cad"), repo("acme/current-cad")], scanMeta);
  assert.deepEqual(
    storage
      .listProjects({ limit: "all" })
      .items.map((project) => project.fullName)
      .sort(),
    ["acme/current-cad", "acme/old-cad"]
  );

  storage.upsertProjects([repo("acme/current-cad")], scanMeta);

  assert.deepEqual(
    storage
      .listProjects({ limit: "all" })
      .items.map((project) => project.fullName),
    ["acme/current-cad"]
  );
  assert.equal(Boolean(storage.load().projects["acme/old-cad"].observationPlanMatches?.[plan.id]), false);
});

test("renamed observation plans still show legacy plan-id matches", () => {
  const storage = tempStore();
  const plan = storage.saveObservationPlan({
    id: "cad",
    name: "CAD",
    searchLogic: {
      baseMode: "only",
      customQueries: [
        {
          label: "CAD viewer",
          query: "cad viewer"
        }
      ]
    }
  });
  storage.setActiveObservationPlan(plan.id);
  storage.upsertProjects(
    [
      {
        fullName: "acme/legacy-cad",
        owner: "acme",
        name: "legacy-cad",
        description: "CAD viewer",
        profileKey: "plan-cad-0-cad-viewer",
        profileLabel: "CAD · CAD viewer",
        language: "TypeScript",
        topics: ["cad"],
        stars: 80,
        forks: 8,
        openIssues: 1,
        pushedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        scores: {
          opportunity: 70,
          quality: 70,
          actionability: 70,
          risk: 5
        }
      }
    ],
    {
      observationPlanId: "cad-cad-cad-observation"
    }
  );

  assert.deepEqual(
    storage.listProjects({ limit: "all" }).items.map((project) => project.fullName),
    ["acme/legacy-cad"]
  );
  assert.equal(storage.summary().totalProjects, 1);
  assert.equal(storage.buildLeaderboard("daily", { limit: 20, persist: false }).items[0].fullName, "acme/legacy-cad");
});
