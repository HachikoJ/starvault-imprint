const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  buildQueryProfiles,
  isGithubRateLimitError,
  normalizeGithubOrGroups,
  repositoryMatchesPlanProfile
} = require("../src/lib/github");
const {
  generateObservationPlanWithProvider,
  minimumObservationDraftCustomQueries,
  observationPlanDraftQualityIssues,
  observationPlanPrompt
} = require("../src/lib/llm");
const { createStorage } = require("../src/lib/storage");

function tempStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "starvault-plan-contract-"));
  return createStorage(path.join(dir, "store.json"));
}

function query(label, core) {
  return {
    label,
    labelZh: label,
    labelEn: label,
    query: `${core} in:name,description,readme archived:false mirror:false`,
    stars: 0
  };
}

function plan(id, name, keywords, queries) {
  return {
    id,
    name,
    requirements: [{ text: `${name} 相关项目，关注真实工具、集成和工作流` }],
    searchLogic: {
      baseMode: "only",
      keywords,
      excludeTerms: [],
      customQueries: queries
    }
  };
}

function generatedDraft(name = "LoRaWAN 现场遥测", queryCount = 8, keywordCount = 12) {
  const keywords = [
    "LoRaWAN",
    "LoRa",
    "ChirpStack",
    "The Things Stack",
    "MQTT telemetry",
    "LoRa gateway",
    "LoRaWAN device",
    "LoRaWAN network server",
    "Semtech packet forwarder",
    "Class A device",
    "OTAA",
    "ABP",
    "FUOTA",
    "LoRaWAN geolocation"
  ].slice(0, keywordCount);
  const cores = [
    "LoRaWAN gateway",
    "LoRaWAN network server",
    "ChirpStack LoRaWAN",
    '"The Things Stack" LoRaWAN',
    "LoRaWAN MQTT telemetry",
    "LoRaWAN device management",
    "LoRaWAN packet forwarder",
    "LoRaWAN FUOTA",
    "LoRaWAN geolocation",
    "LoRaWAN OTAA"
  ];
  const customQueries = Array.from({ length: queryCount }, (_, index) => query(`LoRaWAN ${index + 1}`, cores[index % cores.length]));
  const strategy = {
    baseMode: "only",
    keywords,
    excludeTerms: [],
    customQueries,
    preferredLanguages: [],
    preferredCategories: [],
    preferredShapes: [],
    minStars: 0,
    notes: "基于当前需求和研究证据生成。"
  };
  return {
    name,
    nameEn: name,
    description: "持续发现 LoRaWAN 现场遥测工具。",
    descriptionEn: "Track LoRaWAN field telemetry tools.",
    requirements: [{ text: "关注网关、网络服务器、设备管理和遥测工作流" }],
    strategy,
    searchLogic: strategy
  };
}

test("custom plan executes exactly the queries visible in its search logic", () => {
  const customQueries = Array.from({ length: 24 }, (_, index) => query(`Telemetry ${index + 1}`, `LoRaWAN telemetry surface-${index + 1}`));
  const profiles = buildQueryProfiles(plan("lorawan", "LoRaWAN 遥测", ["LoRaWAN", "ChirpStack", "MQTT"], customQueries));

  assert.equal(profiles.length, customQueries.length);
  assert.equal(profiles.every((profile) => profile.planGenerated), true);
  assert.equal(profiles.every((profile) => profile.observationPlanId === "lorawan"), true);
  assert.equal(profiles.some((profile) => profile.key === "self-hosted-apps"), false);
});

test("only, focused and blend modes have explicit execution semantics", () => {
  const custom = [query("FHIR 核心", "FHIR server")];
  const base = plan("fhir", "FHIR 互操作", ["FHIR", "HL7 FHIR"], custom);
  const defaults = buildQueryProfiles().length;

  assert.equal(buildQueryProfiles(base).length, 1);
  assert.equal(buildQueryProfiles({ ...base, searchLogic: { ...base.searchLogic, baseMode: "focused" } }).length, 11);
  assert.equal(buildQueryProfiles({ ...base, searchLogic: { ...base.searchLogic, baseMode: "blend" } }).length, defaults + 1);
});

test("unseen-domain matrix keeps relevant repositories and rejects unrelated ones", () => {
  const cases = [
    {
      plan: plan("lorawan", "LoRaWAN 遥测", ["LoRaWAN", "ChirpStack", "MQTT"], [query("网关", "LoRaWAN gateway")]),
      relevant: { fullName: "acme/field-gateway", name: "field-gateway", owner: "acme", description: "LoRaWAN gateway and MQTT telemetry bridge", topics: ["lorawan", "mqtt"] },
      unrelated: { fullName: "acme/video-editor", name: "video-editor", owner: "acme", description: "Timeline editor and subtitle workflow", topics: ["video"] }
    },
    {
      plan: plan("fhir", "FHIR 临床互操作", ["FHIR", "HL7 FHIR", "SMART on FHIR"], [query("FHIR 服务", "FHIR server")]),
      relevant: { fullName: "acme/clinical-server", name: "clinical-server", owner: "acme", description: "FHIR server for clinical interoperability", topics: ["fhir", "healthcare"] },
      unrelated: { fullName: "acme/font-tools", name: "font-tools", owner: "acme", description: "Variable font inspection utilities", topics: ["fonts"] }
    },
    {
      plan: plan("fonts", "OpenType 可变字体", ["OpenType", "variable font", "fontTools", "WOFF2"], [query("可变字体", '"variable font" OpenType')]),
      relevant: { fullName: "acme/axis-inspector", name: "axis-inspector", owner: "acme", description: "OpenType variable font axis inspector", topics: ["opentype", "fonts"] },
      unrelated: { fullName: "acme/telemetry", name: "telemetry", owner: "acme", description: "Remote sensor gateway", topics: ["iot"] }
    },
    {
      plan: plan("ros2", "ROS 2 导航", ["ROS 2", "Nav2", "robot navigation"], [query("Nav2", "ROS2 Nav2")]),
      relevant: { fullName: "acme/warehouse-nav", name: "warehouse-nav", owner: "acme", description: "ROS 2 Nav2 autonomous robot navigation stack", topics: ["ros2", "nav2"] },
      unrelated: { fullName: "acme/sales-board", name: "sales-board", owner: "acme", description: "CRM sales pipeline dashboard", topics: ["crm"] }
    },
    {
      plan: plan("ifc", "IFC 建筑数据", ["IFC", "buildingSMART", "BIM"], [query("IFC", "IFC buildingSMART")]),
      relevant: { fullName: "acme/ifc-toolkit", name: "ifc-toolkit", owner: "acme", description: "IFC parser and buildingSMART BIM validation tools", topics: ["ifc", "bim"] },
      unrelated: { fullName: "acme/podcast", name: "podcast", owner: "acme", description: "Audio recording and podcast publishing", topics: ["audio"] }
    },
    {
      plan: plan("otel", "OpenTelemetry 可观测性", ["OpenTelemetry", "OTel", "distributed tracing"], [query("OTel", "OpenTelemetry tracing")]),
      relevant: { fullName: "acme/trace-collector", name: "trace-collector", owner: "acme", description: "OpenTelemetry collector for metrics traces and logs", topics: ["opentelemetry", "observability"] },
      unrelated: { fullName: "acme/photo-filter", name: "photo-filter", owner: "acme", description: "Image filters and photo presets", topics: ["image"] }
    },
    {
      plan: plan("kicad", "KiCad 自动化", ["KiCad", "PCB", "EDA"], [query("KiCad", "KiCad PCB")]),
      relevant: { fullName: "acme/pcb-automation", name: "pcb-automation", owner: "acme", description: "KiCad PCB design automation and EDA tooling", topics: ["kicad", "pcb"] },
      unrelated: { fullName: "acme/hr-portal", name: "hr-portal", owner: "acme", description: "Employee leave and payroll portal", topics: ["hr"] }
    },
    {
      plan: plan("passkeys", "Passkey 身份认证", ["WebAuthn", "passkey", "FIDO2"], [query("WebAuthn", "WebAuthn passkey")]),
      relevant: { fullName: "acme/passkey-server", name: "passkey-server", owner: "acme", description: "FIDO2 WebAuthn passkey authentication server", topics: ["webauthn", "passkeys"] },
      unrelated: { fullName: "acme/cad-mesh", name: "cad-mesh", owner: "acme", description: "Mesh conversion for mechanical CAD", topics: ["cad"] }
    },
    {
      plan: plan("fits", "FITS 天文测光", ["FITS", "photometry", "astropy"], [query("FITS", "FITS photometry")]),
      relevant: { fullName: "acme/star-photometry", name: "star-photometry", owner: "acme", description: "FITS aperture photometry pipeline built with Astropy", topics: ["astronomy", "fits"] },
      unrelated: { fullName: "acme/video-timeline", name: "video-timeline", owner: "acme", description: "Nonlinear video editing timeline", topics: ["video"] }
    },
    {
      plan: plan("fastq", "FASTQ 测序分析", ["FASTQ", "sequence alignment", "bioinformatics"], [query("FASTQ", "FASTQ alignment")]),
      relevant: { fullName: "acme/read-aligner", name: "read-aligner", owner: "acme", description: "FASTQ sequencing read alignment workflow", topics: ["bioinformatics", "fastq"] },
      unrelated: { fullName: "acme/browser-notes", name: "browser-notes", owner: "acme", description: "Browser extension for personal notes", topics: ["browser-extension"] }
    }
  ];

  for (const item of cases) {
    const [profile] = buildQueryProfiles(item.plan);
    assert.equal(repositoryMatchesPlanProfile(item.relevant, profile), true, item.plan.name);
    assert.equal(repositoryMatchesPlanProfile(item.unrelated, profile), false, item.plan.name);
  }
});

test("confirmed adjacent query terms can match without repeating the plan title", () => {
  const [profile] = buildQueryProfiles(
    plan("clinical", "临床数据互操作", ["FHIR", "HL7", "SMART on FHIR"], [query("SMART 授权", '"SMART on FHIR" OAuth')])
  );
  const repo = {
    fullName: "acme/smart-launcher",
    name: "smart-launcher",
    owner: "acme",
    description: "OAuth launcher for SMART clinical applications",
    topics: ["smart-on-fhir", "oauth"]
  };

  assert.equal(repositoryMatchesPlanProfile(repo, profile), true);
});

test("low-value resource containers are rejected after GitHub search", () => {
  const [profile] = buildQueryProfiles(plan("fonts", "OpenType 字体", ["OpenType", "fontTools"], [query("OpenType", "OpenType font") ]));
  assert.equal(
    repositoryMatchesPlanProfile(
      {
        fullName: "acme/awesome-font-resources",
        name: "awesome-font-resources",
        owner: "acme",
        description: "Curated OpenType resource list and tutorials",
        topics: ["awesome-list", "resources"]
      },
      profile
    ),
    false
  );
});

test("OR normalization is domain-independent and retains the strongest plan anchor", () => {
  const fhirPlan = plan("fhir", "FHIR 临床互操作", ["FHIR", "HL7 FHIR"], []);
  const normalized = normalizeGithubOrGroups(
    "generic OR FHIR OR unrelated in:name,description,readme archived:false mirror:false",
    fhirPlan
  );

  assert.doesNotMatch(normalized, /\bOR\b/);
  assert.match(normalized, /FHIR/);
});

test("default observation exposes the complete built-in execution matrix", () => {
  const storage = tempStore();
  const defaultPlan = storage.listObservationPlans().find((item) => item.id === "default");
  const profiles = buildQueryProfiles();

  assert.ok(defaultPlan?.builtIn);
  assert.equal(defaultPlan.summary.searchLogicItems, profiles.length);
  assert.equal(defaultPlan.searchLogic.customQueries.length, profiles.length);
});

test("saved plans cap visible and executable queries at thirty", () => {
  const storage = tempStore();
  const saved = storage.saveObservationPlan({
    name: "LoRaWAN 观察",
    searchLogic: {
      baseMode: "only",
      keywords: ["LoRaWAN", "ChirpStack"],
      customQueries: Array.from({ length: 45 }, (_, index) => query(`查询 ${index + 1}`, `LoRaWAN surface-${index + 1}`))
    }
  });

  assert.equal(saved.searchLogic.customQueries.length, 30);
  assert.equal(saved.summary.searchLogicItems, 30);
  assert.equal(buildQueryProfiles(saved).length, 30);
});

test("plan prompt applies one generic metacognitive method without named-domain dictionaries", () => {
  const prompt = observationPlanPrompt(
    {
      name: "OpenType 可变字体",
      coreKeyword: "OpenType variable fonts",
      detailedNeed: "关注字体轴、渲染、子集化、格式转换和设计工具",
      researchContext: {
        githubActivity: { activityLevel: "medium", maxTotalCount: 1600 },
        domainModel: { aliases: ["variable font"], formats: ["WOFF2"], libraries: ["fontTools"] }
      }
    },
    "zh"
  );

  assert.match(prompt, /识别唯一主核心关键词/);
  assert.match(prompt, /命名产品、宽泛类别、缩写、文件格式、协议、框架、软件生态或工作流/);
  assert.match(prompt, /官方名称、别名、翻译、标准、格式、API\/SDK/);
  assert.match(prompt, /GitHub 活跃度是松紧度旋钮/);
  assert.match(prompt, /最多生成 30 条最相关 customQueries/);
  assert.match(prompt, /OpenType variable fonts/);
  assert.doesNotMatch(prompt, /UGNX|Photoshop|剪映|CapCut|CAD ->|CRM ->|AI 硬件/);
});

test("query minimum adapts to evidence instead of forcing thirty", () => {
  assert.equal(minimumObservationDraftCustomQueries({}), 6);
  assert.equal(minimumObservationDraftCustomQueries({ researchContext: { githubActivity: { activityLevel: "low", maxTotalCount: 80 } } }), 8);
  assert.equal(minimumObservationDraftCustomQueries({ researchContext: { githubActivity: { activityLevel: "medium", maxTotalCount: 900 } } }), 10);
  assert.equal(minimumObservationDraftCustomQueries({ researchContext: { githubActivity: { activityLevel: "high", maxTotalCount: 9000 } } }), 12);
});

test("quality gate rejects thin or unanchored drafts and accepts focused unseen-domain drafts", () => {
  const payload = {
    name: "LoRaWAN 现场遥测",
    coreKeyword: "LoRaWAN",
    detailedNeed: "关注网关、网络服务器、设备管理和遥测工作流",
    researchContext: { githubActivity: { activityLevel: "low", maxTotalCount: 180 } }
  };
  const thin = generatedDraft(payload.name, 2, 3);
  const robust = generatedDraft(payload.name, 8, 12);

  assert.ok(observationPlanDraftQualityIssues(thin, payload).some((issue) => /too thin/.test(issue)));
  assert.deepEqual(observationPlanDraftQualityIssues(robust, payload), []);
});

test("generation fails closed when two AI repairs still miss the quality gate", async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    return {
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: JSON.stringify(generatedDraft("LoRaWAN 现场遥测", 2, 3)) } }] })
    };
  };

  try {
    await assert.rejects(
      generateObservationPlanWithProvider({
        provider: { protocol: "openai-compatible", baseUrl: "https://api.example.test", apiKey: "test", model: "test-model" },
        payload: { name: "LoRaWAN 现场遥测", coreKeyword: "LoRaWAN", detailedNeed: "现场遥测" },
        language: "zh"
      }),
      /did not pass the quality gate/
    );
    assert.equal(calls, 3);
  } finally {
    global.fetch = originalFetch;
  }
});

test("generation preserves the user plan name and valid AI vocabulary", async () => {
  const originalFetch = global.fetch;
  const draft = generatedDraft("LoRaWAN 现场遥测", 8, 12);
  global.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: JSON.stringify(draft) } }] })
  });

  try {
    const result = await generateObservationPlanWithProvider({
      provider: { protocol: "openai-compatible", baseUrl: "https://api.example.test", apiKey: "test", model: "test-model" },
      payload: { name: draft.name, coreKeyword: "LoRaWAN", detailedNeed: "现场遥测" },
      language: "zh"
    });
    assert.equal(result.plan.name, draft.name);
    assert.deepEqual(result.plan.searchLogic.keywords, draft.searchLogic.keywords);
    assert.equal(result.plan.searchLogic.customQueries.length, 8);
  } finally {
    global.fetch = originalFetch;
  }
});

test("GitHub rate-limit failures are classified as blocking scan errors", () => {
  assert.equal(isGithubRateLimitError(new Error("GitHub request failed 403: You have exceeded a secondary rate limit")), true);
  assert.equal(isGithubRateLimitError(new Error("GitHub API rate limit exhausted")), true);
  assert.equal(isGithubRateLimitError(new Error("ordinary validation error")), false);
});

test("plan scans replace stale matches for that plan", () => {
  const storage = tempStore();
  const savedPlan = storage.saveObservationPlan({
    name: "FHIR 观察",
    searchLogic: { baseMode: "only", keywords: ["FHIR"], customQueries: [query("FHIR", "FHIR server")] }
  });
  storage.setActiveObservationPlan(savedPlan.id);
  const repo = (fullName) => ({
    fullName,
    owner: fullName.split("/")[0],
    name: fullName.split("/")[1],
    description: "FHIR server",
    language: "TypeScript",
    topics: ["fhir"],
    stars: 80,
    forks: 8,
    pushedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scores: { opportunity: 70, quality: 70, actionability: 70, risk: 5 }
  });

  storage.upsertProjects([repo("acme/old-fhir"), repo("acme/current-fhir")], {
    observationPlanId: savedPlan.id,
    replaceObservationPlanMatches: true
  });
  storage.upsertProjects([repo("acme/current-fhir")], {
    observationPlanId: savedPlan.id,
    replaceObservationPlanMatches: true
  });

  assert.deepEqual(storage.listProjects({ limit: "all" }).items.map((item) => item.fullName), ["acme/current-fhir"]);
});

test("default plan excludes custom-only projects and preserves legacy default data", () => {
  const storage = tempStore();
  const repo = (fullName) => ({
    fullName,
    owner: fullName.split("/")[0],
    name: fullName.split("/")[1],
    description: fullName,
    language: "TypeScript",
    topics: [],
    stars: 10,
    forks: 1,
    pushedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scores: { opportunity: 60, quality: 60, actionability: 60, risk: 5 }
  });

  storage.upsertProjects([repo("acme/default-project")], { observationPlanId: "default" });
  const savedPlan = storage.saveObservationPlan({ name: "FHIR", searchLogic: { baseMode: "only", keywords: ["FHIR"], customQueries: [query("FHIR", "FHIR")] } });
  storage.setActiveObservationPlan(savedPlan.id);
  storage.upsertProjects([repo("acme/custom-project")], { observationPlanId: savedPlan.id });
  const raw = storage.load();
  raw.projects["acme/legacy-project"] = repo("acme/legacy-project");
  raw.projects["acme/legacy-custom-project"] = {
    ...repo("acme/legacy-custom-project"),
    observationPlanMatches: [savedPlan.id]
  };
  storage.save(raw);
  storage.setActiveObservationPlan("default");

  assert.deepEqual(
    storage.listProjects({ limit: "all" }).items.map((item) => item.fullName).sort(),
    ["acme/default-project", "acme/legacy-project"]
  );
});

test("deleting a custom plan removes custom-only orphan projects", () => {
  const storage = tempStore();
  const savedPlan = storage.saveObservationPlan({ name: "Disposable", searchLogic: { baseMode: "only", keywords: ["FHIR"], customQueries: [query("FHIR", "FHIR")] } });
  storage.setActiveObservationPlan(savedPlan.id);
  storage.upsertProjects(
    [{ fullName: "acme/orphan", owner: "acme", name: "orphan", description: "FHIR", language: "Go", topics: ["fhir"], stars: 5, forks: 0, pushedAt: new Date().toISOString(), scores: { opportunity: 50 } }],
    { observationPlanId: savedPlan.id }
  );
  const raw = storage.load();
  raw.projects["acme/orphan"].observationPlanMatches = [savedPlan.id];
  storage.save(raw);

  storage.deleteObservationPlan(savedPlan.id);

  assert.equal(storage.load().projects["acme/orphan"], undefined);
  assert.equal(storage.listProjects({ limit: "all" }).items.some((item) => item.fullName === "acme/orphan"), false);
});

test("default requirements remain read-only product intent", () => {
  const storage = tempStore();
  const defaultPlan = storage.getObservationPlan("default");
  const notes = defaultPlan.requirements.map((item) => item.text).join("\n");

  assert.ok(defaultPlan.requirements.length >= 8);
  assert.match(notes, /学习中枢/);
  assert.match(notes, /保持只读/);
  assert.throws(() => storage.saveObservationPlanRequirements("default", ["replace"]), /cannot be edited/i);
});

test("active custom-search source contains no legacy named-domain packs", () => {
  const serverSource = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");
  const githubSource = fs.readFileSync(path.join(__dirname, "../src/lib/github.js"), "utf8");

  assert.doesNotMatch(serverSource, /OBSERVATION_DOMAIN_PACKS|CAD_OBSERVATION_PACK|NX_CAD_OBSERVATION_PACK/);
  assert.doesNotMatch(githubSource, /CAD_STRONG_PLAN_TERMS|BUSINESS_CRM_STRONG_PLAN_TERMS|AI_HARDWARE_STRONG_PLAN_TERMS/);
});
