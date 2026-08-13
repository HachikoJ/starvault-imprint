#!/usr/bin/env node

const fs = require("node:fs");
const { buildQueryProfiles } = require("../src/lib/github");
const { observationPlanDraftQualityIssues } = require("../src/lib/llm");

const DEFAULT_BASE_URL = process.env.STARVAULT_AUDIT_BASE_URL || "http://127.0.0.1:4173";

const CASES = [
  {
    name: "LoRaWAN 现场遥测",
    detailedNeed: "关注 LoRaWAN 网关、网络服务器、设备管理、MQTT 遥测和低功耗现场部署工具。",
    type: "protocol-niche",
    anchors: ["lorawan", "lora", "chirpstack", "the things stack", "mqtt", "packet forwarder"],
    minKeywords: 8,
    minQueries: 6
  },
  {
    name: "FHIR 临床互操作",
    detailedNeed: "关注 FHIR 服务端、SMART on FHIR、术语服务、数据映射和临床系统集成。",
    type: "industry-standard",
    anchors: ["fhir", "hl7", "smart on fhir", "terminology", "clinical interoperability"],
    minKeywords: 10,
    minQueries: 8
  },
  {
    name: "OpenType 可变字体",
    detailedNeed: "关注 OpenType 可变字体生成、字轴检查、子集化、WOFF2 转换和字体质量工具。",
    type: "creative-technical",
    anchors: ["opentype", "variable font", "fonttools", "woff2", "glyph", "font axis"],
    minKeywords: 10,
    minQueries: 8
  },
  {
    name: "ROS 2 仓储导航",
    detailedNeed: "关注 ROS 2、Nav2、SLAM、路径规划、车队调度和仓储机器人仿真。",
    type: "robotics",
    anchors: ["ros 2", "ros2", "nav2", "slam", "path planning", "robot fleet"],
    minKeywords: 10,
    minQueries: 8
  },
  {
    name: "IFC 建筑数据",
    detailedNeed: "关注 IFC 解析、buildingSMART 校验、BIM 数据转换、模型查看和规则检查。",
    type: "engineering-standard",
    anchors: ["ifc", "buildingsmart", "bim", "ifcopenshell", "model checker"],
    minKeywords: 10,
    minQueries: 8
  },
  {
    name: "OpenTelemetry 可观测性",
    detailedNeed: "关注 OTel Collector、链路追踪、指标日志关联、采样和可观测性后端。",
    type: "cloud-native",
    anchors: ["opentelemetry", "otel", "collector", "distributed tracing", "telemetry"],
    minKeywords: 10,
    minQueries: 8
  },
  {
    name: "KiCad PCB 自动化",
    detailedNeed: "关注 KiCad 插件、原理图和 PCB 自动化、BOM、DRC、制造文件与 EDA 工作流。",
    type: "hardware-tooling",
    anchors: ["kicad", "pcb", "eda", "schematic", "bom", "gerber"],
    minKeywords: 10,
    minQueries: 8
  },
  {
    name: "Passkey 身份认证",
    detailedNeed: "关注 WebAuthn、FIDO2、Passkey 服务端、凭据同步、认证 SDK 和迁移工具。",
    type: "security-standard",
    anchors: ["webauthn", "fido2", "passkey", "credential", "authentication"],
    minKeywords: 10,
    minQueries: 8
  },
  {
    name: "FITS 天文测光",
    detailedNeed: "关注 FITS 图像处理、孔径测光、星表匹配、Astropy 管道和观测数据质检。",
    type: "scientific-niche",
    anchors: ["fits", "photometry", "astropy", "aperture", "star catalog"],
    minKeywords: 8,
    minQueries: 6
  },
  {
    name: "FASTQ 测序分析",
    detailedNeed: "关注 FASTQ 质控、序列比对、变异分析、工作流编排和可复现生信管道。",
    type: "bioinformatics",
    anchors: ["fastq", "sequence alignment", "bioinformatics", "variant calling", "nextflow", "snakemake"],
    minKeywords: 10,
    minQueries: 8
  }
];

const GENERIC_QUERY_CORES = new Set([
  "app",
  "tool",
  "tools",
  "workflow",
  "workflows",
  "software",
  "platform",
  "system",
  "dashboard",
  "project",
  "projects",
  "application",
  "open source",
  "starter",
  "template"
]);

function parseArgs(argv) {
  const args = {
    offline: false,
    live: false,
    counts: false,
    baseUrl: DEFAULT_BASE_URL,
    limit: CASES.length,
    cases: [],
    casesFile: ""
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--offline") args.offline = true;
    else if (arg === "--live") args.live = true;
    else if (arg === "--counts") args.counts = true;
    else if (arg === "--base-url") args.baseUrl = argv[(index += 1)] || args.baseUrl;
    else if (arg === "--limit") args.limit = Number(argv[(index += 1)] || args.limit);
    else if (arg === "--case") args.cases.push(argv[(index += 1)] || "");
    else if (arg === "--cases-file") args.casesFile = argv[(index += 1)] || "";
    else if (arg === "--help" || arg === "-h") args.help = true;
  }
  return args;
}

function printHelp() {
  console.log(`Observation plan quality audit

Usage:
  node scripts/observation-plan-quality-audit.js --offline
  node scripts/observation-plan-quality-audit.js --live [--limit 8]
  node scripts/observation-plan-quality-audit.js --live --case "FHIR 临床互操作"
  node scripts/observation-plan-quality-audit.js --live --cases-file ./my-audit-cases.json

Options:
  --offline       Run the repeatable domain-independent quality matrix without network calls.
  --live          Call the local /api/observation-plans/generate endpoint.
  --base-url URL Local StarVault server URL. Default: ${DEFAULT_BASE_URL}
  --limit N      Number of built-in cases to run when --case is omitted.
  --case NAME    Run one or more named cases.
  --cases-file   Read an arbitrary-domain JSON case array instead of the built-in matrix.

The script does not save or switch plans. The local server may retain durable task audit records in its configured store.`);
}

function offlineDraftForCase(testCase) {
  const anchor = testCase.anchors[0];
  const surfaces = [
    "server",
    "client",
    "SDK API",
    "plugin extension",
    "parser converter",
    "viewer editor",
    "automation workflow",
    "self-hosted dashboard",
    "data integration",
    "testing tooling"
  ];
  const keywords = Array.from(new Set([...testCase.anchors, ...surfaces.map((surface) => `${anchor} ${surface}`)])).slice(0, 18);
  const customQueries = surfaces.map((surface, index) => ({
    key: `offline-${index + 1}`,
    label: `${anchor} ${surface}`,
    labelZh: `${anchor} ${surface}`,
    labelEn: `${anchor} ${surface}`,
    query: `${anchor} ${surface} in:name,description,readme archived:false mirror:false`,
    stars: 0
  }));
  const strategy = {
    baseMode: "only",
    keywords,
    excludeTerms: [],
    customQueries,
    preferredLanguages: [],
    preferredCategories: [],
    preferredShapes: [],
    minStars: 0,
    notes: "离线质量矩阵样本"
  };
  return {
    name: testCase.name,
    nameEn: testCase.name,
    coreKeyword: anchor,
    detailedNeed: testCase.detailedNeed,
    researchContext: {
      githubActivity: { activityLevel: "medium", maxTotalCount: 900 },
      domainModel: {
        aliases: testCase.anchors,
        formats: [],
        standards: [],
        software: [],
        libraries: [],
        workflows: [],
        productSurfaces: surfaces
      }
    },
    strategy,
    searchLogic: strategy
  };
}

function runOfflineAudit() {
  const results = CASES.map((testCase) => {
    const draft = offlineDraftForCase(testCase);
    const issues = observationPlanDraftQualityIssues(draft, draft);
    const analyzed = analyzePlan(testCase, { plan: draft });
    return { name: testCase.name, issues, analyzed };
  });
  const adversarial = offlineDraftForCase(CASES[0]);
  adversarial.searchLogic = {
    ...adversarial.searchLogic,
    customQueries: adversarial.searchLogic.customQueries.map((item, index) => index === 0
      ? { ...item, query: "stock market dashboard in:name,description,readme archived:false mirror:false" }
      : item),
    excludeTerms: ["stocks"]
  };
  adversarial.strategy = adversarial.searchLogic;
  const adversarialIssues = observationPlanDraftQualityIssues(adversarial, adversarial);
  const failures = results.filter((item) => item.issues.length || item.analyzed.status === "FAIL");
  const guards = adversarialIssues.some((issue) => /core anchor|negative terms|excludeTerms/i.test(issue));
  console.log("# Offline Observation Plan Quality Matrix");
  console.log(`Cases: ${results.length} · PASS: ${results.length - failures.length} · FAIL: ${failures.length}`);
  results.forEach((item) => console.log(`- ${item.issues.length || item.analyzed.status === "FAIL" ? "FAIL" : "PASS"} ${item.name}`));
  console.log(`- ${guards ? "PASS" : "FAIL"} adversarial unrelated query/exclusion guard`);
  if (failures.length || !guards) {
    failures.forEach((item) => console.log(`  ${item.name}: ${item.issues.join("; ") || item.analyzed.hardFailures.join("; ")}`));
    if (!guards) console.log(`  adversarial: ${adversarialIssues.join("; ") || "guard did not fire"}`);
    process.exitCode = 2;
  }
}

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[_./-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripQualifiers(query = "") {
  return String(query || "")
    .replace(/\bin:name,description,readme\b/gi, "")
    .replace(/\barchived:false\b/gi, "")
    .replace(/\bmirror:false\b/gi, "")
    .replace(/\bstars:[^\s]+/gi, "")
    .replace(/\bpushed:>=\d{4}-\d{2}-\d{2}\b/gi, "")
    .replace(/\blanguage:[^\s]+/gi, "")
    .replace(/\blicense:[^\s]+/gi, "")
    .replace(/\s+-[^\s]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function positiveTokenCount(query = "") {
  const core = stripQualifiers(query)
    .replace(/"[^"]+"/g, (match) => match.replace(/\s+/g, "_"))
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !/^OR$/i.test(token) && !token.startsWith("-"));
  return core.length;
}

function containsAny(text = "", terms = []) {
  const clean = normalizeText(text);
  return terms.some((term) => {
    const cleanTerm = normalizeText(term);
    if (!cleanTerm) return false;
    return clean.includes(cleanTerm);
  });
}

function queryHasOnlyGenericCore(query = "") {
  const core = normalizeText(stripQualifiers(query).replaceAll('"', ""));
  if (!core) return true;
  if (GENERIC_QUERY_CORES.has(core)) return true;
  const tokens = core.split(/\s+/).filter(Boolean);
  return tokens.length > 0 && tokens.every((token) => GENERIC_QUERY_CORES.has(token));
}

function planLogic(plan = {}) {
  return plan.searchLogic || plan.strategy || {};
}

function analyzePlan(testCase, payload) {
  const plan = payload?.plan || payload;
  const logic = planLogic(plan);
  const keywords = Array.isArray(logic.keywords) ? logic.keywords.filter(Boolean) : [];
  const queries = Array.isArray(logic.customQueries) ? logic.customQueries.filter(Boolean) : [];
  const profiles = buildQueryProfiles(plan);
  const warnings = [];
  const hardFailures = [];

  if (plan.name !== testCase.name) hardFailures.push(`方案名被改写：${plan.name || "(empty)"}`);
  if (keywords.length < testCase.minKeywords) hardFailures.push(`keywords 太少：${keywords.length}/${testCase.minKeywords}`);
  if (queries.length < testCase.minQueries) hardFailures.push(`customQueries 太少：${queries.length}/${testCase.minQueries}`);
  if (profiles.length < Math.min(testCase.minQueries, queries.length)) {
    hardFailures.push(`执行 profiles 被过滤过多：${profiles.length}/${queries.length}`);
  }
  if (profiles.length !== queries.length) {
    hardFailures.push(`可见 customQueries 与实际执行 profiles 不一致：${queries.length}/${profiles.length}`);
  }
  if (queries.length > 30) hardFailures.push(`customQueries 超过 30：${queries.length}`);

  const keywordText = keywords.join(" ");
  if (!containsAny(keywordText, testCase.anchors)) {
    hardFailures.push("keywords 缺少核心锚点或确认别名");
  }

  const queryIssues = [];
  queries.forEach((item, index) => {
    const query = String(item.query || item.q || "");
    const label = item.labelZh || item.label || `#${index + 1}`;
    const issue = [];
    if (/\bOR\b/i.test(query)) issue.push("包含 OR");
    if (!/in:name,description,readme/i.test(query)) issue.push("缺少 in:name,description,readme");
    if (!/archived:false/i.test(query)) issue.push("缺少 archived:false");
    if (!/mirror:false/i.test(query)) issue.push("缺少 mirror:false");
    if (!containsAny(`${label} ${query}`, testCase.anchors)) issue.push("缺少本需求锚点");
    if (queryHasOnlyGenericCore(query)) issue.push("只有泛化词");
    if (positiveTokenCount(query) > 7) issue.push(`可能过严(${positiveTokenCount(query)} 个正向词)`);
    if (testCase.unrelatedNoise?.length && containsAny(`${label} ${query}`, testCase.unrelatedNoise)) issue.push("包含无关排除/噪音词");
    if (issue.length) {
      queryIssues.push(`${index + 1}. ${label}: ${issue.join("、")} => ${query}`);
    }
  });
  if (queryIssues.length) {
    const severe = queryIssues.filter((item) => /缺少本需求锚点|只有泛化词|包含 OR|包含无关/.test(item));
    if (severe.length) hardFailures.push(`查询质量问题 ${severe.length}/${queries.length}`);
    else warnings.push(`查询可读性/松紧度提醒 ${queryIssues.length}/${queries.length}`);
  }

  const excludeTerms = Array.isArray(logic.excludeTerms) ? logic.excludeTerms.filter(Boolean) : [];
  if (excludeTerms.length > 8) warnings.push(`excludeTerms 偏多：${excludeTerms.length}`);
  if (testCase.unrelatedNoise?.length && containsAny(excludeTerms.join(" "), testCase.unrelatedNoise)) {
    hardFailures.push("excludeTerms 包含明显无关领域词");
  }

  const generatedLabels = new Set(queries.map((item) => normalizeText(item.labelZh || item.label || item.query || item.q || "")));
  const profileLabels = new Set(profiles.map((profile) => normalizeText(profile.labelZh || profile.label || "")));
  const dropped = queries
    .filter((item) => {
      const label = normalizeText(item.labelZh || item.label || item.query || item.q || "");
      return label && !Array.from(profileLabels).some((profileLabel) => profileLabel.includes(label) || label.includes(profileLabel));
    })
    .slice(0, 5)
    .map((item) => item.labelZh || item.label || item.query || item.q);

  return {
    caseName: testCase.name,
    type: testCase.type,
    keywordCount: keywords.length,
    queryCount: queries.length,
    profileCount: profiles.length,
    status: hardFailures.length ? "FAIL" : warnings.length ? "WARN" : "PASS",
    hardFailures,
    warnings,
    queryIssues: queryIssues.slice(0, 6),
    dropped,
    sampleKeywords: keywords.slice(0, 12),
    sampleQueries: queries.slice(0, 5).map((item) => ({
      label: item.labelZh || item.label || "",
      query: item.query || item.q || ""
    }))
  };
}

async function generateCase(baseUrl, testCase) {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/observation-plans/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: testCase.name,
      detailedNeed: testCase.detailedNeed
    })
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = json?.error || json?.message || response.statusText;
    throw new Error(`${response.status} ${message}`);
  }
  return json;
}

function selectCases(args, catalog = CASES) {
  if (args.cases.length) {
    const wanted = new Set(args.cases.map((item) => normalizeText(item)));
    return catalog.filter((item) => wanted.has(normalizeText(item.name)));
  }
  return catalog.slice(0, Math.max(1, Math.min(catalog.length, args.limit || catalog.length)));
}

function printReport(results) {
  const totals = results.reduce(
    (acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    },
    { PASS: 0, WARN: 0, FAIL: 0 }
  );

  console.log("\n# Observation Plan Quality Audit");
  console.log(`Summary: PASS ${totals.PASS || 0} · WARN ${totals.WARN || 0} · FAIL ${totals.FAIL || 0}`);
  for (const item of results) {
    console.log(`\n## [${item.status}] ${item.caseName} (${item.type})`);
    console.log(`keywords ${item.keywordCount} · customQueries ${item.queryCount} · executableProfiles ${item.profileCount}`);
    [...item.hardFailures, ...item.warnings].forEach((warning) => console.log(`- ${warning}`));
    if (item.dropped.length) {
      console.log(`- 可能被执行层过滤的查询：${item.dropped.join("；")}`);
    }
    if (item.queryIssues.length) {
      console.log("- 样例问题：");
      item.queryIssues.forEach((issue) => console.log(`  ${issue}`));
    }
    console.log(`- keywords 样例：${item.sampleKeywords.join(" / ") || "(empty)"}`);
    item.sampleQueries.forEach((query) => console.log(`- ${query.label}: ${query.query}`));
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  if (args.offline) {
    runOfflineAudit();
    return;
  }
  if (!args.live) {
    printHelp();
    process.exitCode = 1;
    return;
  }

  const catalog = args.casesFile ? JSON.parse(fs.readFileSync(args.casesFile, "utf8")) : CASES;
  if (!Array.isArray(catalog) || catalog.some((item) => !item?.name || !item?.detailedNeed || !Array.isArray(item?.anchors))) {
    throw new Error("Audit cases must be a JSON array with name, detailedNeed, and anchors fields");
  }
  const selected = selectCases(args, catalog);
  if (!selected.length) {
    throw new Error(`No matching cases: ${args.cases.join(", ")}`);
  }

  const results = [];
  for (const testCase of selected) {
    process.stderr.write(`Generating ${testCase.name}... `);
    const started = Date.now();
    try {
      const payload = await generateCase(args.baseUrl, testCase);
      const result = analyzePlan(testCase, payload);
      results.push(result);
      process.stderr.write(`${result.status} (${Math.round((Date.now() - started) / 1000)}s)\n`);
    } catch (error) {
      results.push({
        caseName: testCase.name,
        type: testCase.type,
        keywordCount: 0,
        queryCount: 0,
        profileCount: 0,
        status: "FAIL",
        hardFailures: [`生成失败：${error.message}`],
        warnings: [],
        queryIssues: [],
        dropped: [],
        sampleKeywords: [],
        sampleQueries: []
      });
      process.stderr.write(`FAIL (${error.message})\n`);
    }
  }

  printReport(results);
  process.exitCode = results.some((item) => item.status === "FAIL") ? 2 : 0;
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
