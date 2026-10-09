const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const { IDBFactory, IDBKeyRange } = require("fake-indexeddb");

const sourceRoot = process.env.STARVAULT_TEST_SOURCE_ROOT || path.join(__dirname, "..");
const END = "2026-10-09T00:30:00.000Z";
const START = "2026-10-09T00:00:00.000Z";
const PLAN = "trend-window-fixture";

function response(payload) {
  return { ok: true, status: 200, headers: { get: () => null }, json: async () => payload, text: async () => JSON.stringify(payload) };
}

async function runtime(repositories = []) {
  const clock = { now: Date.parse(END) };
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [clock.now])); }
    static now() { return clock.now; }
  }
  const values = new Map();
  const indexedDB = new IDBFactory();
  const calls = [];
  const window = { indexedDB, IDBKeyRange, __STARVAULT_GITHUB_REQUEST_SPACING_MS__: 0,
    localStorage: { getItem: key => values.get(String(key)) || null, setItem: (key, value) => values.set(String(key), String(value)), removeItem: key => values.delete(String(key)) },
    location: { origin: "http://127.0.0.1:4173", host: "127.0.0.1:4173", hostname: "127.0.0.1" } };
  const context = { window, globalThis: { IDBKeyRange }, indexedDB, IDBKeyRange, location: window.location,
    fetch: async url => {
      const parsed = new URL(url); calls.push(parsed.href);
      assert.equal(parsed.origin, "https://api.github.com", "All non-fixture network requests are blocked");
      if (parsed.pathname === "/rate_limit") return response({ resources: { search: { remaining: 30, reset: clock.now / 1000 + 60 } } });
      assert.equal(parsed.pathname, "/search/repositories");
      return response({ total_count: repositories.length, incomplete_results: false, items: repositories });
    }, setTimeout, clearTimeout, AbortController, TextDecoder, Date: ClockDate, JSON, Map, Set, Promise, Error, Object, Array, String, Number, Boolean, URL, URLSearchParams, Math };
  vm.runInNewContext(fs.readFileSync(path.join(sourceRoot, "public/domain-core.js"), "utf8"), context);
  window.StarVaultDomainCore = context.globalThis.StarVaultDomainCore;
  vm.runInNewContext(fs.readFileSync(path.join(sourceRoot, "public/indexeddb-storage.js"), "utf8"), context);
  vm.runInNewContext(fs.readFileSync(path.join(sourceRoot, "public/local-api.js"), "utf8"), context);
  const api = window.StarVaultLocalApi;
  await api.handle("/api/settings", { method: "POST", body: JSON.stringify({ githubToken: "fixture-t09-token" }) });
  await api.handle("/api/observation-plans", { method: "POST", body: JSON.stringify({ plan: { id: PLAN, name: "Trend fixture", searchLogic: { baseMode: "only", keywords: ["fixturetrend"], customQueries: [{ key: "core", label: "Fixture", query: "fixturetrend in:name" }] } } }) });
  await api.handle("/api/observation-plans/active", { method: "POST", body: JSON.stringify({ id: PLAN }) });
  return { api, storage: window.StarVaultIndexedDB, calls, clock };
}

function project(name, overrides = {}) {
  return { fullName: `acme/fixturetrend-${name}`, name: `fixturetrend-${name}`, owner: "acme", stars: 200, forks: 20,
    observationPlanMatches: { [PLAN]: { planId: PLAN } }, scores: { opportunity: 60, quality: 50, momentum: 40, actionability: 30, community: 20 }, ...overrides };
}

function repository(name, id) {
  const fullName = `acme/fixturetrend-${name}`;
  return { id, full_name: fullName, name: fullName.split("/")[1], owner: { login: "acme" }, html_url: `https://github.com/${fullName}`,
    description: "fixturetrend toolkit", language: "TypeScript", topics: [], stargazers_count: 250, forks_count: 25, watchers_count: 250,
    open_issues_count: 1, default_branch: "main", created_at: "2026-07-01T00:00:00.000Z", updated_at: START, pushed_at: START,
    archived: false, disabled: false, fork: false, license: { spdx_id: "MIT" } };
}

async function scan(api) {
  const { task } = await api.handle("/api/scan", { method: "POST", body: JSON.stringify({ mode: "manual" }) });
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const status = (await api.handle(`/api/tasks/${task.id}`)).task;
    if (!["queued", "running"].includes(status.status)) { assert.equal(status.status, "completed", status.error); return status; }
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  throw new Error("Fixture scan did not finish");
}

test("T-09 browser public scan API records actual intervals, zero/negative changes and unknown baselines", async () => {
  const cases = [
    { name: "month", at: "2026-09-09T00:30:00.000Z", delta: 50 },
    { name: "same-day", at: START, delta: 50 },
    { name: "offset-same-instant", at: "2026-10-08T20:30:00-04:00", delta: null },
    { name: "future", at: "2026-10-10T00:00:00.000Z", delta: null },
    { name: "missing", delta: null },
    { name: "invalid", at: "not-a-date", delta: null },
    { name: "date-only", at: "2026-10-08", delta: null },
    { name: "first", first: true, delta: null },
    { name: "zero", at: START, stars: 250, delta: 0 },
    { name: "negative", at: START, stars: 260, delta: -10 },
    { name: "history-fallback", snapshots: [{ at: "2026-10-08T20:15:00-04:00", stars: 210, forks: 21 }, { at: "2026-10-08T23:50:00Z", stars: 205, forks: 20 }], delta: 40, start: "2026-10-09T00:15:00.000Z" }
  ];
  const { api, storage, calls, clock } = await runtime(cases.map((item, index) => repository(item.name, index + 1)));
  await storage.putProjects(cases.filter(item => !item.first).map(item => project(item.name, {
    stars: item.stars ?? 200, lastSeenAt: item.at, snapshots: item.snapshots || (item.at ? [{ at: item.at, stars: item.stars ?? 200, forks: 20 }] : [])
  })));
  await scan(api);
  for (const item of cases) {
    const saved = await storage.getProject(project(item.name).fullName);
    assert.equal(saved.trend.stars, item.delta, item.name);
    assert.equal(saved.trend.complete, item.delta !== null, item.name);
    assert.equal(saved.trend.source, "github-browser-snapshots");
    assert.equal(saved.trend.period, "since-previous-scan");
    assert.equal(saved.trend.intervalStart, item.delta === null ? "" : item.start || new Date(item.at).toISOString(), item.name);
    assert.equal(saved.trend.intervalEnd, item.delta === null ? "" : END, item.name);
    assert.equal(saved.snapshots.length, 1 + (item.first || !item.at && !item.snapshots ? 0 : item.snapshots?.length || 1));
  }
  // A second same-day scan must use the first scan's paired timestamp/counts.
  clock.now = Date.parse("2026-10-09T01:00:00.000Z");
  await scan(api);
  const twice = await storage.getProject(project("first").fullName);
  assert.equal(twice.trend.intervalStart, END);
  assert.equal(twice.trend.intervalEnd, "2026-10-09T01:00:00.000Z");
  assert.equal(twice.trend.stars, 0);
  assert.equal(twice.trend.complete, true);
  assert.ok(calls.every(url => new URL(url).origin === "https://api.github.com"));
});

test("T-09 browser sorting and bilingual JSON/CSV exports keep window provenance and unknown separate from zero", async () => {
  const { api, storage } = await runtime();
  const window = { source: "github-browser-snapshots", intervalStart: START, intervalEnd: END, complete: true };
  await storage.putProjects([
    project("unknown", { stars: 999, trend: { source: "github-browser-snapshots", stars: 999, forks: 999, date: "2026-10-08", complete: true } }),
    project("zero", { trend: { ...window, stars: 0, forks: 0 } }),
    project("negative", { trend: { ...window, stars: -10, forks: -2 } }),
    project("positive", { trend: { ...window, stars: 50, forks: 5 } }),
    project("utc-day", { trend: { source: "github-online", period: "previous-day-online", date: "2026-10-08", stars: 2, forks: 1, complete: true } })
  ]);
  for (const sort of ["trendStars", "trendForks"]) {
    const result = await api.handle(`/api/projects?sort=${sort}&limit=all`);
    assert.deepEqual(Array.from(result.items, row => row.name), ["positive", "utc-day", "zero", "negative", "unknown"].map(name => `fixturetrend-${name}`));
  }
  for (const language of ["en", "zh"]) {
    const json = JSON.parse((await api.handle(`/api/export?format=json&language=${language}`)).content);
    const rows = language === "en" ? json.items : json.项目;
    const name = language === "en" ? "fullName" : "仓库全名";
    const keys = language === "en" ? ["trendIntervalStart", "trendIntervalEnd", "trendSource", "trendKind", "trendDurationMs", "trendStatus"] : ["趋势区间开始", "趋势区间结束", "趋势来源", "趋势种类", "趋势区间毫秒", "趋势状态"];
    const unknown = rows.find(row => row[name].endsWith("-unknown"));
    const zero = rows.find(row => row[name].endsWith("-zero"));
    const utc = rows.find(row => row[name].endsWith("-utc-day"));
    for (const row of rows) for (const key of keys) assert.ok(Object.hasOwn(row, key), key);
    assert.equal(unknown[language === "en" ? "trendStars" : "趋势 Stars"], null);
    assert.equal(zero[language === "en" ? "trendStars" : "趋势 Stars"], 0);
    assert.match(unknown[keys[5]], /measurement window unknown|测量区间未知/);
    assert.equal(utc[keys[0]], "2026-10-08T00:00:00.000Z");
    assert.equal(utc[keys[1]], "2026-10-09T00:00:00.000Z");
    const csv = (await api.handle(`/api/export?format=csv&language=${language}`)).content;
    const lines = csv.replace(/^\ufeff/, "").split("\n");
    const headers = lines[0].split(",");
    for (const key of keys) assert.ok(headers.includes(key), key);
    const cells = lines.find(line => line.includes("acme/fixturetrend-unknown")).split(",");
    assert.equal(cells[headers.indexOf(language === "en" ? "trendStars" : "趋势 Stars")], "");
    assert.doesNotMatch(csv, /fixture-t09-token/);
  }
});

test("T-09 browser daily leaderboard and persisted archive use only numeric-time snapshots inside requested period", async () => {
  const repositories = [repository("multi", 1), repository("month", 2), repository("negative", 3)];
  const { api, storage } = await runtime(repositories);
  const history = [
    { at: "2026-10-08T20:15:00-04:00", stars: 210, forks: 21 },
    { at: "2026-10-09T00:00:00Z", stars: 200, forks: 20 },
    { at: "2026-09-01T00:00:00Z", stars: 100, forks: 10 },
    { at: "not-a-date", stars: 0, forks: 0 }
  ];
  await storage.putProjects([
    project("multi", { lastSeenAt: START, snapshots: history }),
    project("month", { lastSeenAt: "2026-09-09T00:30:00Z", snapshots: [{ at: "2026-09-09T00:30:00Z", stars: 200, forks: 20 }] }),
    project("negative", { lastSeenAt: START, stars: 260, forks: 30, snapshots: [{ at: START, stars: 260, forks: 30 }] })
  ]);
  await scan(api);
  const board = await api.handle("/api/leaderboard?period=daily&limit=20");
  const parts = name => board.items.find(row => row.fullName === project(name).fullName).scoreParts;
  assert.equal(parts("multi").starDelta, 50);
  assert.equal(parts("multi").growthWindow.intervalStart, START);
  assert.equal(parts("multi").growthWindow.intervalEnd, END);
  assert.equal(parts("multi").growthWindow.requestedDays, 1);
  assert.equal(parts("month").starDelta, null, "A month-wide net change is not a daily bonus");
  assert.equal(parts("month").growthWindow.periodCoverage, "unknown");
  assert.equal(parts("negative").starDelta, -10);
  assert.ok(Number.isFinite(parts("negative").score));
  const snapshot = await storage.getSnapshot();
  const archived = snapshot.store.leaderboards.byPlan[PLAN].daily[END.slice(0, 10)];
  assert.equal(archived.observationPlan.id, PLAN);
  for (const row of archived.items) assert.deepEqual(JSON.parse(JSON.stringify(row.scoreParts.growthWindow)), JSON.parse(JSON.stringify(parts(row.name.replace("fixturetrend-", "")).growthWindow)));
  const restored = await api.handle(`/api/leaderboard?date=${END.slice(0, 10)}`);
  assert.equal(restored.items.find(row => row.fullName.endsWith("-month")).scoreParts.starDelta, null);
  const savedHistory = (await storage.getProject(project("multi").fullName)).snapshots;
  for (const point of history) assert.ok(savedHistory.some(saved => JSON.stringify(saved) === JSON.stringify(point)), "Existing snapshot data are retained; storage already normalizes ordering");
});
