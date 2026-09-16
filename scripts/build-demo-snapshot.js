#!/usr/bin/env node

/**
 * Builds public/demo-snapshot.json for the static online demo.
 *
 * Every repository record comes from the public GitHub REST API at build time.
 * No token is required. If GITHUB_TOKEN is present in the environment it is
 * used only as an Authorization header to raise the anonymous rate limit; it is
 * never written to the snapshot or to any log line.
 *
 * The generated file is validated before writing:
 *  - every repository carries the live stars/forks/pushed_at values from GitHub
 *  - every repository matches the anchor terms of the demo plan query it is
 *    filed under, so the demo pool cannot drift away from the plan it shows
 *
 * Usage:
 *   node scripts/build-demo-snapshot.js
 *   node scripts/build-demo-snapshot.js --out public/demo-snapshot.json
 *   node scripts/build-demo-snapshot.js --cache .cache/demo-repos.json
 *   node scripts/build-demo-snapshot.js --allow-partial
 */

const fs = require("node:fs");
const path = require("node:path");
const domainCore = require("../public/domain-core");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_OUT = path.join(ROOT, "public", "demo-snapshot.json");
const GITHUB_API = "https://api.github.com";

const DEMO_PLAN = {
  id: "demo-content",
  name: "在线体验：内容与设计工作流",
  nameEn: "Online demo: content and design workflows",
  description:
    "在线体验专用示例方案。用真实 GitHub 公开仓库元数据演示“方案生成 → 扫描检索 → 项目池 → 榜单”的完整链路，不写入任何个人账号数据。",
  descriptionEn:
    "Sample plan used by the static online demo. It replays the plan, scan, project pool and leaderboard flow with real public GitHub repository metadata and stores no personal account data.",
  requirements: [
    {
      id: "demo-requirement-1",
      text: "只观察内容创作、设计协作和知识管理方向的真实开源项目，用来演示从方案到扫描再到项目池的完整链路。",
      textEn: "Only observe real open source projects in content creation, design collaboration and knowledge management so the demo covers the full plan-to-scan-to-pool flow."
    },
    {
      id: "demo-requirement-2",
      text: "覆盖设计画布与界面编辑、白板与图表、视频与音频创作、文档与知识协作、AI 创作工作台、内容管理与发布、创作流程自动化这些方向。",
      textEn: "Cover design canvas and interface editing, whiteboards and diagrams, video and audio production, documents and knowledge collaboration, AI creation workspaces, content management and publishing, and creative workflow automation."
    },
    {
      id: "demo-requirement-3",
      text: "入池项目要近期仍在提交、Star 或 Fork 有一定规模、许可信息可读取（GitHub 未识别时按未知许可标注），并排除资料合集、教程和已归档项目。",
      textEn: "Only keep repositories with recent commits, meaningful stars or forks and readable license metadata (flagged as unknown when GitHub cannot identify it), excluding link collections, tutorials and archived projects."
    },
    {
      id: "demo-requirement-4",
      text: "示例数据只使用真实 GitHub 公开仓库元数据，不写入任何个人账号信息，也不调用需要密钥的服务。",
      textEn: "Sample data uses real public GitHub repository metadata only. It contains no personal account data and calls no service that needs a key."
    }
  ]
};

// Each entry pairs a user-visible plan direction with the repositories that a
// GitHub search for that direction actually returns.
const DEMO_PROFILES = [
  {
    key: "demo-design-tools",
    labelZh: "设计工具与界面编辑",
    labelEn: "Design tools and interface editing",
    query: "design tool prototyping collaboration in:name,description,readme archived:false mirror:false",
    repos: ["penpot/penpot", "onlook-dev/onlook", "drawdb-io/drawdb"]
  },
  {
    key: "demo-whiteboard-diagram",
    labelZh: "白板与图表",
    labelEn: "Whiteboards and diagrams",
    query: "whiteboard collaborative diagram canvas in:name,description,readme archived:false mirror:false",
    repos: ["excalidraw/excalidraw", "tldraw/tldraw"]
  },
  {
    key: "demo-video-editing",
    labelZh: "视频创作与剪辑",
    labelEn: "Video creation and editing",
    query: "video editor open source in:name,description,readme archived:false mirror:false",
    repos: ["remotion-dev/remotion", "mifi/lossless-cut", "OpenShot/openshot-qt"]
  },
  {
    key: "demo-audio-tools",
    labelZh: "音频创作工具",
    labelEn: "Audio creation tools",
    query: "audio editor open source in:name,description,readme archived:false mirror:false",
    repos: ["audacity/audacity", "mixxxdj/mixxx"]
  },
  {
    key: "demo-document-signing",
    labelZh: "文档签署与审批",
    labelEn: "Document signing and approval",
    query: "document signing electronic signature in:name,description,readme archived:false mirror:false",
    repos: ["documenso/documenso", "OpenSignLabs/OpenSign"]
  },
  {
    key: "demo-knowledge-base",
    labelZh: "知识库与知识管理",
    labelEn: "Knowledge bases and knowledge management",
    query: "knowledge base note taking in:name,description,readme archived:false mirror:false",
    repos: ["outline/outline", "siyuan-note/siyuan", "toeverything/AFFiNE"]
  },
  {
    key: "demo-ai-creation",
    labelZh: "AI 创作工作台",
    labelEn: "AI creation workspaces",
    query: "ai creative generation open source in:name,description,readme archived:false mirror:false",
    repos: ["comfyanonymous/ComfyUI", "invoke-ai/InvokeAI", "langgenius/dify"]
  },
  {
    key: "demo-content-publishing",
    labelZh: "无头 CMS 与内容发布",
    labelEn: "Headless CMS and content publishing",
    query: "headless cms content publishing in:name,description,readme archived:false mirror:false",
    repos: ["directus/directus", "strapi/strapi", "payloadcms/payload"]
  },
  {
    key: "demo-visual-builder",
    labelZh: "可视化搭建与页面编辑",
    labelEn: "Visual builders and page editing",
    query: "page builder template builder drag and drop in:name,description,readme archived:false mirror:false",
    repos: ["grapesjs/grapesjs", "BuilderIO/builder"]
  },
  {
    key: "demo-workflow-automation",
    labelZh: "自动化与 AI 工作流",
    labelEn: "Automation and AI workflows",
    query: "mcp workflow automation integrations in:name,description,readme archived:false mirror:false",
    repos: ["n8n-io/n8n", "activepieces/activepieces"]
  }
];

function parseArgs(argv = []) {
  const args = { out: DEFAULT_OUT, cache: "", allowPartial: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--out" || value === "-o") {
      args.out = path.resolve(process.cwd(), argv[index + 1] || DEFAULT_OUT);
      index += 1;
    } else if (value === "--cache") {
      args.cache = path.resolve(process.cwd(), argv[index + 1] || "");
      index += 1;
    } else if (value === "--allow-partial") {
      args.allowPartial = true;
    } else if (value === "--help" || value === "-h") {
      args.help = true;
    }
  }
  return args;
}

function printHelp() {
  process.stdout.write(
    [
      "Usage: node scripts/build-demo-snapshot.js [--out <file>] [--allow-partial]",
      "",
      "  --out <file>    snapshot path (default public/demo-snapshot.json)",
      "  --cache <file>  reuse raw GitHub payloads between runs",
      "  --allow-partial write the valid subset instead of failing on a bad repository",
      "",
      "Fetches public GitHub repository metadata anonymously and writes the static",
      "online demo snapshot. Set GITHUB_TOKEN to raise the rate limit; the token is",
      "used for the request header only and never written to the output."
    ].join("\n") + "\n"
  );
}

function githubHeaders() {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "starvault-imprint-demo-builder",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  const token = String(process.env.GITHUB_TOKEN || "").trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function readCache(file) {
  if (!file) return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeCache(file, cache) {
  if (!file) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
}

async function fetchRepository(fullName, attempt = 0) {
  const response = await fetch(`${GITHUB_API}/repos/${fullName}`, { headers: githubHeaders() });
  if (response.status === 403 || response.status === 429) {
    const retryAfter = Number(response.headers.get("retry-after") || 0);
    if (attempt < 2) {
      await sleep(retryAfter > 0 ? retryAfter * 1000 : 1500 * (attempt + 1));
      return fetchRepository(fullName, attempt + 1);
    }
    throw new Error(`GitHub rate limited the demo snapshot build for ${fullName}`);
  }
  if (response.status === 404) throw new Error(`Repository not found: ${fullName}`);
  if (!response.ok) throw new Error(`GitHub request failed for ${fullName}: ${response.status}`);
  return response.json();
}

// Trim the payload to the fields the browser uses, so the demo file never ships
// account, collaborator or traffic data that the product does not display.
function demoRepositoryRecord(raw) {
  return {
    id: raw.id,
    full_name: raw.full_name,
    name: raw.name,
    owner: {
      login: raw.owner?.login || "",
      avatar_url: raw.owner?.avatar_url || ""
    },
    html_url: raw.html_url,
    description: raw.description || "",
    homepage: raw.homepage || "",
    language: raw.language || "",
    topics: Array.isArray(raw.topics) ? raw.topics : [],
    stargazers_count: Number(raw.stargazers_count || 0),
    forks_count: Number(raw.forks_count || 0),
    watchers_count: Number(raw.watchers_count || 0),
    open_issues_count: Number(raw.open_issues_count || 0),
    default_branch: raw.default_branch || "",
    created_at: raw.created_at || "",
    updated_at: raw.updated_at || "",
    pushed_at: raw.pushed_at || "",
    license: raw.license
      ? {
          key: raw.license.key || "",
          name: raw.license.name || "",
          spdx_id: raw.license.spdx_id || "",
          url: raw.license.url || ""
        }
      : null,
    archived: Boolean(raw.archived),
    disabled: Boolean(raw.disabled),
    fork: Boolean(raw.fork)
  };
}

function planSearchLogic() {
  return {
    baseMode: "only",
    keywords: [],
    excludeTerms: ["awesome list", "tutorial", "course", "archived"],
    customQueries: DEMO_PROFILES.map((profile) => ({
      key: profile.key,
      label: profile.labelEn,
      labelZh: profile.labelZh,
      labelEn: profile.labelEn,
      query: domainCore.completePlanQuery(profile.query),
      stars: 0
    })),
    minStars: 0
  };
}

function profileAnchors(profile) {
  return domainCore.planAnchorTerms(profile.query, [profile.labelZh, profile.labelEn], { includeIntent: true });
}

function validateItem(item) {
  const problems = [];
  const repo = item.repository;
  const profile = DEMO_PROFILES.find((entry) => entry.key === item.profileKey);
  if (!profile) return [`unknown profile ${item.profileKey}`];
  if (!repo.stargazers_count && !repo.forks_count) problems.push("no stars or forks recorded");
  if (!repo.pushed_at) problems.push("missing pushed_at");
  if (!repo.license?.spdx_id) problems.push("missing license metadata");
  if (repo.archived) problems.push("archived repository");
  if (repo.disabled) problems.push("disabled repository");
  const anchors = profileAnchors(profile);
  if (!domainCore.repositoryMatchesPlanAnchors(repo, anchors)) {
    problems.push(`does not match plan query anchors [${anchors.slice(0, 8).join(", ")}]`);
  }
  return problems;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const cache = readCache(args.cache);
  const items = [];
  const failures = [];
  for (const profile of DEMO_PROFILES) {
    for (const fullName of profile.repos) {
      try {
        const raw = cache[fullName] || (await fetchRepository(fullName));
        if (!cache[fullName]) {
          cache[fullName] = raw;
          await sleep(120);
        }
        const item = {
          profileKey: profile.key,
          profileLabelZh: profile.labelZh,
          profileLabelEn: profile.labelEn,
          repository: demoRepositoryRecord(raw)
        };
        const problems = validateItem(item);
        if (problems.length) throw new Error(`${fullName}: ${problems.join("; ")}`);
        items.push(item);
        process.stdout.write(`ok   ${fullName} (${item.repository.stargazers_count} stars)\n`);
      } catch (error) {
        failures.push(`${fullName}: ${error.message}`);
        process.stdout.write(`fail ${fullName}: ${error.message}\n`);
      }
    }
  }

  if (failures.length && !args.allowPartial) {
    process.stderr.write(
      `\nDemo snapshot build stopped: ${failures.length} repositories failed validation.\n${failures.join("\n")}\n` +
        "Fix the repository list, the plan query, or pass --allow-partial to write the valid subset.\n"
    );
    process.exitCode = 1;
    return;
  }
  if (!items.length) {
    process.stderr.write("No valid repositories were collected; nothing to write.\n");
    process.exitCode = 1;
    return;
  }

  const generatedAt = new Date().toISOString();
  const snapshot = {
    schema: "starvault-demo-snapshot/v1",
    generatedAt,
    generator: "scripts/build-demo-snapshot.js",
    source: {
      provider: "github-rest-api",
      endpoint: GITHUB_API,
      mode: "anonymous-public-metadata",
      note: "Public repository metadata captured with the unauthenticated GitHub REST API. Repository names, descriptions, licenses and counts belong to their owners.",
      license: "GitHub API terms: https://docs.github.com/site-policy/github-terms/github-api-terms"
    },
    plan: {
      ...DEMO_PLAN,
      searchLogic: planSearchLogic()
    },
    profiles: DEMO_PROFILES.map((profile) => ({
      key: profile.key,
      labelZh: profile.labelZh,
      labelEn: profile.labelEn,
      query: domainCore.completePlanQuery(profile.query),
      anchors: profileAnchors(profile)
    })),
    items
  };

  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  writeCache(args.cache, cache);
  process.stdout.write(`\nWrote ${items.length} repositories to ${path.relative(ROOT, args.out) || args.out}\n`);
  if (failures.length) process.stdout.write(`Skipped ${failures.length} repositories because of --allow-partial.\n`);
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { DEMO_PLAN, DEMO_PROFILES, demoRepositoryRecord, profileAnchors, validateItem };
