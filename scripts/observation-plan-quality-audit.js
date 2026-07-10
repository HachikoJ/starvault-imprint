#!/usr/bin/env node

const { buildQueryProfiles } = require("../src/lib/github");

const DEFAULT_BASE_URL = process.env.STARVAULT_AUDIT_BASE_URL || "http://127.0.0.1:4173";

const CASES = [
  {
    name: "CAD",
    detailedNeed: "CAD 相关，重点关注工程设计、文件格式、建模、查看转换、插件和自动化工具",
    type: "broad",
    anchors: [
      "cad",
      "computer aided design",
      "dwg",
      "dxf",
      "step",
      "stp",
      "iges",
      "stl",
      "obj",
      "3mf",
      "freecad",
      "opencascade",
      "occt",
      "cadquery",
      "qcad",
      "librecad",
      "openscad",
      "jscad",
      "bim",
      "cam",
      "cae"
    ],
    minKeywords: 16,
    minQueries: 12
  },
  {
    name: "UGNX",
    detailedNeed: "UGNX / Siemens NX 相关插件、NXOpen 自动化、工程设计工作流和转换工具",
    type: "niche",
    anchors: ["ugnx", "siemens nx", "nxopen", "nx open", "ugopen", "unigraphics", "postbuilder"],
    minKeywords: 8,
    minQueries: 6
  },
  {
    name: "CRM",
    detailedNeed: "CRM 系统相关，关注客户管理、销售线索、商机跟进、客服工单、自托管 CRM 和 SaaS 后台",
    type: "broad",
    anchors: ["crm", "customer relationship management", "sales pipeline", "lead management", "contact management", "deal tracking", "helpdesk", "ticketing"],
    minKeywords: 16,
    minQueries: 12
  },
  {
    name: "Photoshop",
    detailedNeed: "Photoshop 相关插件、脚本、扩展、PSD 工作流、设计自动化和素材处理工具",
    type: "named",
    anchors: ["photoshop", "adobe photoshop", "psd", "psb", "uxp", "cep", "photoshop plugin", "photoshop script", "photoshop action"],
    minKeywords: 12,
    minQueries: 10
  },
  {
    name: "MacBook",
    detailedNeed: "MacBook 相关工具，关注电池、菜单栏、性能监控、Apple Silicon、外设和 macOS 工作流",
    type: "named",
    anchors: ["macbook", "macos", "apple silicon", "battery", "menu bar", "m1", "m2", "m3", "m4"],
    minKeywords: 12,
    minQueries: 10
  },
  {
    name: "微信",
    detailedNeed: "微信相关工具，关注 WeChat、公众号、小程序、聊天机器人、企业微信、消息归档和自动化工作流",
    type: "named",
    anchors: ["微信", "wechat", "weixin", "wecom", "企业微信", "小程序", "mini program", "公众号"],
    minKeywords: 12,
    minQueries: 10
  },
  {
    name: "小红书",
    detailedNeed: "小红书相关工具，关注 Xiaohongshu、RED 内容采集、创作者运营、笔记分析和自动化工作流",
    type: "named",
    anchors: ["小红书", "xiaohongshu", "rednote", "red book", "red"],
    minKeywords: 10,
    minQueries: 8
  },
  {
    name: "抖音",
    detailedNeed: "抖音相关工具，关注 Douyin、TikTok、短视频、直播、内容分析、创作者运营和自动化工作流",
    type: "named",
    anchors: ["抖音", "douyin", "tiktok", "short video", "live streaming"],
    minKeywords: 12,
    minQueries: 10
  },
  {
    name: "剪映",
    detailedNeed: "剪映相关，关注 CapCut / Jianying 模板、字幕、视频剪辑自动化、创作者工作流和素材处理",
    type: "named",
    anchors: ["剪映", "capcut", "jianying", "video editor", "subtitle", "template"],
    minKeywords: 12,
    minQueries: 10,
    unrelatedNoise: ["stock", "trading", "finance", "股票", "证券"]
  },
  {
    name: "视频剪辑软件",
    detailedNeed: "视频剪辑软件相关，关注开源视频编辑器、时间线、非线性编辑、字幕、音频和 FFmpeg 工作流",
    type: "category",
    anchors: ["video editor", "video editing", "timeline", "nonlinear", "ffmpeg", "subtitle", "nle", "剪辑"],
    minKeywords: 14,
    minQueries: 12,
    unrelatedNoise: ["stock", "trading", "finance", "股票", "证券"]
  },
  {
    name: "AI 硬件",
    detailedNeed: "AI 硬件相关，关注 AI accelerator、边缘推理、NPU、TPU、CUDA、TensorRT、OpenVINO 和部署工作流",
    type: "broad",
    anchors: [
      "ai hardware",
      "ai accelerator",
      "npu",
      "tpu",
      "cuda",
      "rocm",
      "tensorrt",
      "openvino",
      "apache tvm",
      "tvm",
      "onnx runtime",
      "tflite",
      "rknn",
      "snpe",
      "ncnn",
      "mnn",
      "jetson",
      "tinyml"
    ],
    minKeywords: 14,
    minQueries: 12,
    unrelatedNoise: ["oiledmachine", "profile readme", "essay"]
  },
  {
    name: "AI 产品",
    detailedNeed: "AI 产品相关，关注真实可用的 AI 应用、工作台、Agent 产品、知识库、媒体生成和自动化工具",
    type: "broad",
    anchors: ["ai", "llm", "agent", "rag", "chat", "workspace", "workflow", "knowledge base"],
    minKeywords: 14,
    minQueries: 12
  },
  {
    name: "OCR",
    detailedNeed: "OCR 相关，关注文字识别、版面分析、表格识别、文档解析、PDF OCR 和本地部署工具",
    type: "category",
    anchors: ["ocr", "text recognition", "document ai", "layout analysis", "table recognition", "pdf ocr"],
    minKeywords: 12,
    minQueries: 10
  },
  {
    name: "RPA",
    detailedNeed: "RPA 相关，关注浏览器自动化、桌面自动化、流程机器人、录制回放、工作流编排和企业集成",
    type: "category",
    anchors: ["rpa", "robotic process automation", "browser automation", "desktop automation", "workflow automation"],
    minKeywords: 12,
    minQueries: 10
  },
  {
    name: "PDF 工具",
    detailedNeed: "PDF 工具相关，关注 PDF 编辑、解析、转换、OCR、签署、批注、表单和文档工作流",
    type: "category",
    anchors: ["pdf", "pdf editor", "pdf parser", "pdf converter", "pdf ocr", "pdf form", "signature"],
    minKeywords: 12,
    minQueries: 10
  },
  {
    name: "3D 打印",
    detailedNeed: "3D 打印相关，关注切片、STL 修复、G-code、打印机控制、模型管理和制造工作流",
    type: "category",
    anchors: ["3d printing", "3d printer", "slicer", "stl", "g-code", "octoprint", "mesh repair"],
    minKeywords: 12,
    minQueries: 10
  },
  {
    name: "Figma plugin",
    detailedNeed: "Figma plugin 相关，关注插件、设计自动化、tokens、导出、组件库、设计系统和开发者工作流",
    type: "named",
    anchors: ["figma", "figma plugin", "figma api", "design tokens", "design system"],
    minKeywords: 12,
    minQueries: 10
  },
  {
    name: "Chrome 插件",
    detailedNeed: "Chrome 插件相关，关注浏览器扩展、Manifest V3、内容脚本、自动化、效率工具和开发者工具",
    type: "category",
    anchors: ["chrome extension", "browser extension", "manifest v3", "content script", "webextension"],
    minKeywords: 12,
    minQueries: 10
  },
  {
    name: "数据可视化",
    detailedNeed: "数据可视化相关，关注图表库、dashboard、BI、报表、交互式分析和大屏工具",
    type: "category",
    anchors: ["data visualization", "chart", "dashboard", "bi", "reporting", "analytics", "echarts", "d3"],
    minKeywords: 12,
    minQueries: 10
  },
  {
    name: "低代码平台",
    detailedNeed: "低代码平台相关，关注 low-code、no-code、表单、流程、内部工具、应用搭建和自托管平台",
    type: "category",
    anchors: ["low-code", "low code", "no-code", "no code", "form builder", "workflow", "internal tool"],
    minKeywords: 12,
    minQueries: 10
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
    live: false,
    counts: false,
    baseUrl: DEFAULT_BASE_URL,
    limit: CASES.length,
    cases: []
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--live") args.live = true;
    else if (arg === "--counts") args.counts = true;
    else if (arg === "--base-url") args.baseUrl = argv[(index += 1)] || args.baseUrl;
    else if (arg === "--limit") args.limit = Number(argv[(index += 1)] || args.limit);
    else if (arg === "--case") args.cases.push(argv[(index += 1)] || "");
    else if (arg === "--help" || arg === "-h") args.help = true;
  }
  return args;
}

function printHelp() {
  console.log(`Observation plan quality audit

Usage:
  node scripts/observation-plan-quality-audit.js --live [--limit 8]
  node scripts/observation-plan-quality-audit.js --live --case CAD --case 微信

Options:
  --live          Call the local /api/observation-plans/generate endpoint.
  --base-url URL Local StarVault server URL. Default: ${DEFAULT_BASE_URL}
  --limit N      Number of built-in cases to run when --case is omitted.
  --case NAME    Run one or more named cases.

The script does not save plans, switch plans, or mutate data/store.json.`);
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

function selectCases(args) {
  if (args.cases.length) {
    const wanted = new Set(args.cases.map((item) => normalizeText(item)));
    return CASES.filter((item) => wanted.has(normalizeText(item.name)));
  }
  return CASES.slice(0, Math.max(1, Math.min(CASES.length, args.limit || CASES.length)));
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
  if (args.help || !args.live) {
    printHelp();
    if (!args.live) process.exitCode = 1;
    return;
  }

  const selected = selectCases(args);
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
