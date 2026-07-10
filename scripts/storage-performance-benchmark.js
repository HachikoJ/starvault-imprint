#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { performance } = require("node:perf_hooks");
const { DatabaseSync } = require("node:sqlite");
const { writeSqliteStore } = require("../src/lib/sqlite-store");
const { createStorage } = require("../src/lib/storage");

function parseArgs(argv) {
  return {
    storePath: path.resolve(argv.find((arg) => !arg.startsWith("--")) || process.env.STORE_PATH || "data/starvault.db"),
    assert: argv.includes("--assert"),
    fixture: argv.includes("--fixture")
  };
}

function createFixtureStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "starvault-storage-fixture-"));
  const storePath = path.join(dir, "fixture.db");
  const storage = createStorage(storePath);
  const store = storage.load();
  const now = "2026-07-10T00:00:00.000Z";

  for (let index = 1; index <= 10; index += 1) {
    const id = `fixture-plan-${index}`;
    store.observationPlans[id] = {
      id,
      name: `Fixture plan ${index}`,
      nameEn: `Fixture plan ${index}`,
      description: "Synthetic performance fixture",
      descriptionEn: "Synthetic performance fixture",
      createdAt: now,
      updatedAt: now,
      strategy: {
        baseMode: "only",
        keywords: [`fixture-${index}`, `workflow-${index}`],
        excludeTerms: [],
        customQueries: [
          {
            label: `Fixture query ${index}`,
            query: `fixture-${index} in:name,description,readme archived:false mirror:false`,
            stars: 0
          }
        ],
        minStars: 0
      },
      requirements: [`Track fixture domain ${index}`],
      userData: { watchlist: {}, githubActions: {}, notes: {}, analysis: {}, dismissedProjects: {} },
      memory: {}
    };
  }

  store.projects = {};
  for (let index = 1; index <= 6263; index += 1) {
    const fullName = `fixture-owner-${index % 97}/fixture-project-${index}`;
    const key = fullName.toLowerCase();
    const customPlanId = `fixture-plan-${(index % 10) + 1}`;
    store.projects[key] = {
      fullName,
      owner: `fixture-owner-${index % 97}`,
      name: `fixture-project-${index}`,
      description: `Synthetic repository ${index} for repeatable storage performance checks across project discovery, ranking and local-first workflows.`,
      descriptionZh: `用于存储性能门禁的合成项目 ${index}，覆盖项目发现、排序与本地优先工作流。`,
      url: `https://github.com/${fullName}`,
      homepage: "",
      language: ["TypeScript", "Python", "Go", "Rust"][index % 4],
      topics: ["local-first", "developer-tools", `fixture-${index % 24}`],
      stars: 50 + (index % 50_000),
      forks: 5 + (index % 4_000),
      openIssues: index % 120,
      pushedAt: now,
      updatedAt: now,
      lastSeenAt: now,
      scores: {
        opportunity: 40 + (index % 60),
        quality: 35 + (index % 65),
        actionability: 30 + (index % 70),
        risk: index % 20
      },
      semantic: {
        category: `fixture-category-${index % 12}`,
        useCase: `fixture-use-${index % 18}`,
        shape: `fixture-shape-${index % 8}`
      },
      trend: {
        stars: index % 25,
        forks: index % 9,
        status: "ready",
        updatedAt: now
      },
      snapshots: [{ at: now, stars: 50 + (index % 50_000), forks: 5 + (index % 4_000) }],
      observationPlanMatches: {
        default: { planId: "default", matchedAt: now },
        ...(index % 3 === 0 ? { [customPlanId]: { planId: customPlanId, matchedAt: now } } : {})
      }
    };
  }

  store.scans = Array.from({ length: 120 }, (_, index) => ({
    id: `fixture-scan-${index + 1}`,
    at: new Date(Date.parse(now) - index * 60 * 60 * 1000).toISOString(),
    observationPlanId: index % 4 === 0 ? `fixture-plan-${(index % 10) + 1}` : "default",
    received: 100 + index,
    insertedOrUpdated: 80 + index,
    trendUpdated: 20,
    errors: []
  }));
  store.leaderboards = { daily: {}, byPlan: {} };
  const projectNames = Object.values(store.projects)
    .slice(0, 20)
    .map((project) => project.fullName);
  for (let index = 0; index < 60; index += 1) {
    const date = new Date(Date.parse(now) - index * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    store.leaderboards.daily[date] = {
      generatedAt: `${date}T00:00:00.000Z`,
      items: projectNames.map((fullName, rank) => ({ fullName, rank: rank + 1, leaderboardScore: 100 - rank }))
    };
  }
  writeSqliteStore(storePath, store, { force: true });
  return { dir, storePath };
}

function bytes(value) {
  return Buffer.byteLength(JSON.stringify(value));
}

function elapsed(start) {
  return Number((performance.now() - start).toFixed(1));
}

function sqliteCounts(storePath) {
  const db = new DatabaseSync(storePath, { readOnly: true });
  try {
    return db
      .prepare(
        "SELECT (SELECT COUNT(*) FROM projects) projects, (SELECT COUNT(*) FROM observation_plans) plans, (SELECT COUNT(*) FROM scans) scans"
      )
      .get();
  } finally {
    db.close();
  }
}

function incrementalWriteBenchmark(storePath, fullName) {
  if (!fullName) return null;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "starvault-storage-bench-"));
  const copyPath = path.join(dir, "benchmark.db");
  const source = new DatabaseSync(storePath, { readOnly: true });
  try {
    source.exec(`VACUUM INTO '${copyPath.replaceAll("'", "''")}'`);
  } finally {
    source.close();
  }
  const script = `
    const { performance } = require("node:perf_hooks");
    const { createStorage } = require(${JSON.stringify(path.join(__dirname, "../src/lib/storage"))});
    const storage = createStorage(process.env.BENCH_STORE);
    const project = storage.getProject(process.env.BENCH_PROJECT);
    const started = performance.now();
    storage.setWatch(process.env.BENCH_PROJECT, !project.watched);
    process.stdout.write(JSON.stringify({ writeMs: Number((performance.now() - started).toFixed(1)) }));
  `;
  const child = spawnSync(process.execPath, ["-e", script], {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, BENCH_STORE: copyPath, BENCH_PROJECT: fullName },
    encoding: "utf8"
  });
  fs.rmSync(dir, { recursive: true, force: true });
  if (child.status !== 0) throw new Error(child.stderr || "Incremental write benchmark failed");
  return JSON.parse(child.stdout).writeMs;
}

function assertBudgets(report) {
  const failures = [];
  const listBudgetMs = report.fixture ? 3000 : 1500;
  const summaryBudgetMs = report.fixture ? 3000 : 2500;
  const check = (condition, message) => {
    if (!condition) failures.push(message);
  };
  check(report.coldLoadMs <= 2500, `cold load ${report.coldLoadMs}ms exceeds 2500ms`);
  check(report.listActivePlanMs <= listBudgetMs, `active-plan list ${report.listActivePlanMs}ms exceeds ${listBudgetMs}ms`);
  check(report.summaryActivePlanMs <= summaryBudgetMs, `summary ${report.summaryActivePlanMs}ms exceeds ${summaryBudgetMs}ms`);
  check(report.coreSnapshotBytes <= 2 * 1024 * 1024, `core snapshot ${report.coreSnapshotBytes} bytes exceeds 2 MiB`);
  check(report.projectPage250Bytes <= 4 * 1024 * 1024, `project page ${report.projectPage250Bytes} bytes exceeds 4 MiB`);
  check(report.leaderboardPage10Bytes <= 2 * 1024 * 1024, `leaderboard page ${report.leaderboardPage10Bytes} bytes exceeds 2 MiB`);
  if (report.incrementalWriteMs !== null) {
    check(report.incrementalWriteMs <= 2000, `incremental write ${report.incrementalWriteMs}ms exceeds 2000ms`);
  }
  if (failures.length) throw new Error(`Storage performance budget failed:\n- ${failures.join("\n- ")}`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const fixture = args.fixture ? createFixtureStore() : null;
  const storePath = fixture?.storePath || args.storePath;
  try {
    if (!fs.existsSync(storePath)) throw new Error(`Store not found: ${storePath}`);
    const rows = sqliteCounts(storePath);
    const coldStarted = performance.now();
    const storage = createStorage(storePath);
    const loaded = storage.load();
    const coldLoadMs = elapsed(coldStarted);
    const listStarted = performance.now();
    const projects = storage.listProjects({ limit: "all" });
    const listActivePlanMs = elapsed(listStarted);
    const summaryStarted = performance.now();
    const summary = storage.summary({});
    const summaryActivePlanMs = elapsed(summaryStarted);
    const core = storage.exportLocalSnapshot({ includeProjects: false, includeLeaderboards: false, includeComputed: false });
    const projectPage = storage.exportLocalProjectPage({ limit: 250 });
    const leaderboardPage = storage.exportLocalLeaderboardPage({ limit: 10 });
    const firstProject = Object.values(loaded.projects || {})[0];
    const report = {
      fixture: Boolean(fixture),
      storePath,
      rows: { ...rows, leaderboards: core.counts.leaderboards },
      sqliteBytes: fs.statSync(storePath).size,
      walBytes: fs.existsSync(`${storePath}-wal`) ? fs.statSync(`${storePath}-wal`).size : 0,
      coldLoadMs,
      listActivePlanMs,
      summaryActivePlanMs,
      activePlanProjects: projects.total,
      summaryPool: summary.poolTotal,
      coreSnapshotBytes: bytes(core),
      projectPage250Bytes: bytes(projectPage),
      leaderboardPage10Bytes: bytes(leaderboardPage),
      incrementalWriteMs: incrementalWriteBenchmark(storePath, firstProject?.fullName || ""),
      heapUsedMb: Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1))
    };
    if (args.assert) assertBudgets(report);
    console.log(JSON.stringify(report, null, 2));
  } finally {
    if (fixture) fs.rmSync(fixture.dir, { recursive: true, force: true });
  }
}

try {
  main();
} catch (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
}
