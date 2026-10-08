const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { spawnSync } = require("node:child_process");
const { IDBFactory, IDBKeyRange } = require("fake-indexeddb");

// Run against the untouched audit baseline with STARVAULT_TEST_SOURCE_ROOT.
// Every runtime gets a new in-memory IndexedDB; the Node fixture writes only
// its retained scratch directory. No network request can escape its mock.
const DEFAULT_SOURCE_ROOT = fs.existsSync(path.join(__dirname, "../public/domain-core.js"))
  ? path.join(__dirname, "..") : path.resolve(__dirname, "../../..");
const SOURCE_ROOT = path.resolve(process.env.STARVAULT_TEST_SOURCE_ROOT || DEFAULT_SOURCE_ROOT);
const source = (name) => fs.readFileSync(path.join(SOURCE_ROOT, "public", name), "utf8");

function repository(fullName, id, overrides = {}) {
  const [owner, name] = fullName.split("/");
  return {
    id, full_name: fullName, name, owner: { login: owner, avatar_url: "" },
    html_url: `https://github.com/${fullName}`, description: `${name} toolkit`,
    language: "TypeScript", topics: ["alpha", "beta"],
    stargazers_count: 50, forks_count: 5, watchers_count: 50,
    open_issues_count: 1, default_branch: "main", archived: false,
    disabled: false, fork: false, license: { spdx_id: "MIT" },
    created_at: "2024-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
    pushed_at: "2026-01-01T00:00:00Z", ...overrides
  };
}

function response(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
}

function browserRuntime(fetchImpl, indexedDB = new IDBFactory()) {
  const values = new Map();
  const window = {
    indexedDB, IDBKeyRange, __STARVAULT_GITHUB_REQUEST_SPACING_MS__: 0,
    localStorage: { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value) },
    location: { origin: "http://127.0.0.1:4173", hostname: "127.0.0.1", host: "127.0.0.1:4173" }
  };
  const context = {
    window, globalThis: { IDBKeyRange }, indexedDB, IDBKeyRange,
    location: window.location, fetch: fetchImpl, setTimeout, clearTimeout,
    AbortController, Date, JSON, Map, Set, Promise, Error, Object,
    Array, String, Number, Boolean, URL, URLSearchParams, Math
  };
  vm.runInNewContext(source("domain-core.js"), context);
  window.StarVaultDomainCore = context.globalThis.StarVaultDomainCore;
  vm.runInNewContext(source("indexeddb-storage.js"), context);
  vm.runInNewContext(source("local-api.js"), context);
  return { indexedDB, api: window.StarVaultLocalApi, storage: window.StarVaultIndexedDB };
}

function githubMock(search) {
  return async (input, init = {}) => {
    const url = new URL(String(input));
    assert.equal(url.origin, "https://api.github.com", "fixture must not call a non-GitHub service");
    assert.equal(init.method || "GET", "GET", "fixture must not perform any GitHub write");
    if (url.pathname === "/rate_limit") return response({ resources: {
      search: { remaining: 30, reset: Math.floor(Date.now() / 1000) + 3600 },
      core: { remaining: 5000, reset: Math.floor(Date.now() / 1000) + 3600 }
    } });
    assert.equal(url.pathname, "/search/repositories", "unexpected mock GitHub route");
    return search(url);
  };
}

const post = (api, endpoint, body) => api.handle(endpoint, { method: "POST", body: JSON.stringify(body) });

async function addPlan(api, id, anchors) {
  await post(api, "/api/observation-plans", { plan: {
    id, name: id, searchLogic: { baseMode: "only", keywords: anchors,
      customQueries: anchors.map((anchor) => ({ label: anchor, query: `${anchor} in:name,description,readme` })) }
  } });
}

async function scan(api, planId) {
  await post(api, "/api/observation-plans/active", { id: planId });
  const started = await post(api, "/api/scan", { mode: "retention-fixture" });
  const deadline = Date.now() + 4000;
  while (Date.now() < deadline) {
    const { task } = await api.handle(`/api/tasks/${encodeURIComponent(started.task.id)}`);
    if (!["queued", "running"].includes(task.status)) {
      assert.equal(task.status, "completed", JSON.stringify(task));
      return task.result.scan;
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(`Fixture scan did not complete: ${started.task.id}`);
}

const names = (items) => Array.from(items, (item) => item.fullName.toLowerCase()).sort();

test("T-05 / A-05: scanning a shared repository into B preserves A membership and history after reopening", async (t) => {
  const fetchImpl = githubMock(() => response({ total_count: 1, items: [repository("fixture/shared-tool", 1)] }));
  const runtime = browserRuntime(fetchImpl);
  await post(runtime.api, "/api/settings", { githubToken: "mock-token", validateProvider: false });
  await addPlan(runtime.api, "retention-a", ["alpha"]);
  await addPlan(runtime.api, "retention-b", ["beta"]);
  await scan(runtime.api, "retention-a");
  const before = await runtime.storage.getProject("fixture/shared-tool");
  await scan(runtime.api, "retention-b");

  const reopened = browserRuntime(fetchImpl, runtime.indexedDB);
  const a = await reopened.storage.getProjectsByPlan("retention-a");
  const b = await reopened.storage.getProjectsByPlan("retention-b");
  const shared = await reopened.storage.getProject("fixture/shared-tool");
  t.diagnostic(JSON.stringify({ before, after: shared, planA: names(a), planB: names(b) }));
  assert.deepEqual(names(a), ["fixture/shared-tool"], "B scan must not revoke A's match");
  assert.deepEqual(names(b), ["fixture/shared-tool"]);
  assert.deepEqual(Object.keys(shared.observationPlanMatches).sort(), ["retention-a", "retention-b"]);
  assert.equal(shared.firstSeenAt, before.firstSeenAt);
  assert.equal(shared.snapshots.length, before.snapshots.length + 1);
  assert.equal(shared.snapshots[0].at, before.snapshots[0].at);

  await scan(reopened.api, "retention-a");
  const finalReader = browserRuntime(fetchImpl, runtime.indexedDB);
  assert.deepEqual(names(await finalReader.storage.getProjectsByPlan("retention-a")), ["fixture/shared-tool"]);
  assert.deepEqual(names(await finalReader.storage.getProjectsByPlan("retention-b")), ["fixture/shared-tool"]);
});

test("T-05 / A-05: storage replacement for a new scope retains old global firstSeen and snapshots", async (t) => {
  const runtime = browserRuntime(githubMock(() => { throw new Error("This fixture must not search"); }));
  const previous = {
    fullName: "Fixture/Shared-History", firstSeenAt: "2020-01-01T00:00:00Z",
    snapshots: [{ at: "2020-01-01T00:00:00Z", stars: 7 }],
    observationPlanMatches: { "retention-a": { planId: "retention-a", firstSeenAt: "2020-01-01T00:00:00Z" } }
  };
  await runtime.storage.replaceProjectsForPlan("retention-a", [previous]);
  await runtime.storage.replaceProjectsForPlan("retention-b", [{
    fullName: "fixture/shared-history", firstSeenAt: "2026-10-08T00:00:00Z",
    observationPlanMatches: { "retention-b": { planId: "retention-b" } }
  }]);
  const reopened = browserRuntime(githubMock(() => { throw new Error("No search allowed"); }), runtime.indexedDB);
  const after = await reopened.storage.getProject("fixture/shared-history");
  t.diagnostic(JSON.stringify({ before: previous, after }));
  assert.equal(after.firstSeenAt, previous.firstSeenAt, "new scope must not reset global firstSeen");
  assert.deepEqual(JSON.parse(JSON.stringify(after.snapshots)), previous.snapshots, "omitted incoming history must not erase old snapshots");
  assert.deepEqual(names(await reopened.storage.getProjectsByPlan("retention-a")), ["fixture/shared-history"]);
  assert.deepEqual(names(await reopened.storage.getProjectsByPlan("retention-b")), ["fixture/shared-history"]);
});

test("T-05 control: a complete replacement revokes only its own scope on a shared row", async () => {
  const fetchImpl = githubMock(() => { throw new Error("No search allowed"); });
  const runtime = browserRuntime(fetchImpl);
  await runtime.storage.putProjects([{
    fullName: "fixture/shared-control", firstSeenAt: "2020-01-01T00:00:00Z",
    snapshots: [{ at: "2020-01-01T00:00:00Z", stars: 10 }],
    observationPlanMatches: {
      "retention-a": { planId: "retention-a" },
      "retention-b": { planId: "retention-b" }
    }
  }]);
  await runtime.storage.replaceProjectsForPlan("retention-a", []);
  const reopened = browserRuntime(fetchImpl, runtime.indexedDB);
  assert.deepEqual(names(await reopened.storage.getProjectsByPlan("retention-a")), []);
  assert.deepEqual(names(await reopened.storage.getProjectsByPlan("retention-b")), ["fixture/shared-control"]);
  const shared = await reopened.storage.getProject("fixture/shared-control");
  assert.equal(shared.firstSeenAt, "2020-01-01T00:00:00Z");
  assert.equal(shared.snapshots[0].stars, 10);
});

test("T-05 legacy implicit default membership remains reachable after a new scope match", async () => {
  const runtime = browserRuntime(githubMock(() => { throw new Error("No search allowed"); }));
  await runtime.storage.putProjects([{ fullName: "fixture/legacy-shared", firstSeenAt: "2020-01-01" }]);
  assert.deepEqual(names(await runtime.storage.getProjectsByPlan("default")), ["fixture/legacy-shared"]);
  await runtime.storage.replaceProjectsForPlan("b", [{ fullName: "fixture/legacy-shared", observationPlanMatches: { b: { planId: "b" } } }]);
  const reopened = browserRuntime(githubMock(() => { throw new Error("No search allowed"); }), runtime.indexedDB);
  assert.deepEqual(names(await reopened.storage.getProjectsByPlan("default")), ["fixture/legacy-shared"]);
  assert.deepEqual(names(await reopened.storage.getProjectsByPlan("b")), ["fixture/legacy-shared"]);
});

for (const partialResponse of [502, "incomplete"]) test(`T-04 / A-04: partial query ${partialResponse} retains old members and user records`, async (t) => {
  let degraded = false;
  const fetchImpl = githubMock((url) => {
    const beta = url.searchParams.get("q").startsWith("beta ");
    if (degraded && beta) return partialResponse === 502
      ? response({ message: "fixture beta temporary failure" }, 502)
      : response({ total_count: 1, incomplete_results: true, items: [] });
    const item = beta ? repository("fixture/beta-kept", 2, { topics: ["beta"] })
      : repository("fixture/alpha-updated", 1, { topics: ["alpha"], stargazers_count: degraded ? 100 : 50 });
    return response({ total_count: 1, items: [item] });
  });
  const runtime = browserRuntime(fetchImpl);
  await post(runtime.api, "/api/settings", { githubToken: "mock-token", validateProvider: false });
  await addPlan(runtime.api, "partial-retention", ["alpha", "beta"]);
  await scan(runtime.api, "partial-retention");
  await post(runtime.api, "/api/note", { fullName: "fixture/beta-kept", text: "retained fixture note" });
  await post(runtime.api, "/api/watchlist", { fullName: "fixture/beta-kept", watched: true });
  degraded = true;
  const result = await scan(runtime.api, "partial-retention");
  const reopened = browserRuntime(fetchImpl, runtime.indexedDB);
  const members = await reopened.storage.getProjectsByPlan("partial-retention");
  const snapshot = await reopened.storage.getSnapshot({ includeProjects: true });
  t.diagnostic(JSON.stringify({ scan: result, members: names(members), userData: snapshot.store.observationPlans["partial-retention"].userData }));
  assert.equal(result.status, "completed-with-errors");
  assert.equal(result.discoveryCoverage.complete, false);
  assert.equal(result.discoveryCoverage.memberPolicy, "retain");
  assert.match(result.discoveryCoverage.reasons.join(" "), partialResponse === 502 ? /fixture beta temporary failure/ : /incomplete results/);
  assert.match(result.errors.join(" "), partialResponse === 502 ? /fixture beta temporary failure/ : /incomplete results/);
  assert.deepEqual(names(members), ["fixture/alpha-updated", "fixture/beta-kept"], "missing failed-query results are unknown, not revoked matches");
  assert.equal((await reopened.storage.getProject("fixture/alpha-updated")).stars, 100, "successful partition still updates");
  const userData = snapshot.store.observationPlans["partial-retention"].userData;
  assert.equal(userData.notes["fixture/beta-kept"].text, "retained fixture note");
  assert.ok(userData.watchlist["fixture/beta-kept"]);
  assert.ok(await reopened.storage.getProject("fixture/beta-kept"), "the preserved user records must still resolve to a project");
  const archive = Object.values(snapshot.store.leaderboards.byPlan["partial-retention"].daily)[0];
  assert.equal(archive.discoveryCoverage.complete, false);
});

test("T-04 control: a fully successful scan still replaces the current discovery pool", async () => {
  let betaAbsent = false;
  const fetchImpl = githubMock((url) => {
    const beta = url.searchParams.get("q").startsWith("beta ");
    if (beta && betaAbsent) return response({ total_count: 0, items: [] });
    return response({ total_count: 1, items: [beta
      ? repository("fixture/beta-old", 2, { topics: ["beta"] })
      : repository("fixture/alpha-current", 1, { topics: ["alpha"] })] });
  });
  const runtime = browserRuntime(fetchImpl);
  await post(runtime.api, "/api/settings", { githubToken: "mock-token", validateProvider: false });
  await addPlan(runtime.api, "complete-retention-control", ["alpha", "beta"]);
  await scan(runtime.api, "complete-retention-control");
  assert.deepEqual(names(await runtime.storage.getProjectsByPlan("complete-retention-control")), ["fixture/alpha-current", "fixture/beta-old"]);
  betaAbsent = true;
  const result = await scan(runtime.api, "complete-retention-control");
  const reopened = browserRuntime(fetchImpl, runtime.indexedDB);
  assert.equal(result.status, "completed");
  assert.equal(result.discoveryCoverage.complete, true);
  assert.equal(result.errors.length, 0);
  assert.deepEqual(names(await reopened.storage.getProjectsByPlan("complete-retention-control")), ["fixture/alpha-current"]);
});

for (const status of [502, 429]) test(`T-04 browser ${status} failure does not publish an empty complete pool or erase user assets`, async () => {
  let failing = false;
  const fetchImpl = githubMock(() => failing
    ? response({ message: status === 429 ? "Too many requests" : "All queries failed" }, status)
    : response({ total_count: 1, items: [repository("fixture/alpha-retained", 1, { topics: ["alpha"] })] }));
  const runtime = browserRuntime(fetchImpl);
  await post(runtime.api, "/api/settings", { githubToken: "mock-token", validateProvider: false });
  await addPlan(runtime.api, "failed-retention", ["alpha"]);
  await scan(runtime.api, "failed-retention");
  await post(runtime.api, "/api/note", { fullName: "fixture/alpha-retained", text: "keep on failure" });
  await post(runtime.api, "/api/watchlist", { fullName: "fixture/alpha-retained", watched: true });
  const before = await runtime.storage.getSnapshot();
  failing = true;
  const { task } = await post(runtime.api, "/api/scan", {});
  let terminal;
  const deadline = Date.now() + 4000;
  while (Date.now() < deadline) {
    terminal = (await runtime.api.handle(`/api/tasks/${task.id}`)).task;
    if (!["queued", "running"].includes(terminal.status)) break;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.equal(terminal.status, "failed");
  const after = await runtime.storage.getSnapshot();
  assert.deepEqual(names(await runtime.storage.getProjectsByPlan("failed-retention")), ["fixture/alpha-retained"]);
  assert.equal(after.store.observationPlans["failed-retention"].userData.notes["fixture/alpha-retained"].text, "keep on failure");
  assert.ok(after.store.observationPlans["failed-retention"].userData.watchlist["fixture/alpha-retained"]);
  assert.equal(after.store.scans.length, before.store.scans.length);
  assert.deepEqual(JSON.parse(JSON.stringify(after.store.leaderboards)), JSON.parse(JSON.stringify(before.store.leaderboards)));
});

// Keep server singletons/environment and real SQLite connections out of the
// browser tests. A fresh child only imports the explicitly selected source.
const NODE_PAGINATION_FIXTURE = String.raw`
const fs = require("node:fs");
const path = require("node:path");
const root = process.argv[1], fixtureDir = process.argv[2];
const { createStorage } = require(path.join(root, "src/lib/storage.js"));
const storePath = path.join(fixtureDir, "fixture.db");
const seed = createStorage(storePath);
const plan = seed.saveObservationPlan({ id: "pagination-retention", name: "Pagination retention", searchLogic: {
  baseMode: "only", keywords: ["alpha"], customQueries: [{ label: "alpha", query: "alpha in:name,description,readme" }]
}});
seed.setActiveObservationPlan(plan.id);
seed.updateSettings({ githubToken: "mock-token", clearTavilyKey: true, clearExaKey: true,
  providerCatalog: { updatedAt: new Date().toISOString(), endpoints: [{ id: "deepseek", baseUrl: "https://api.deepseek.com" }] } });
seed.upsertProjects([{ id: 2, fullName: "fixture/alpha-old-page-two", name: "alpha-old-page-two",
  description: "alpha toolkit formerly returned on page two", topics: ["alpha"], language: "TypeScript",
  stars: 25, forks: 5, createdAt: "2020-01-01T00:00:00Z", pushedAt: new Date().toISOString(),
  license: { spdxId: "MIT" }, scores: { opportunity: 60, quality: 60, risk: 6 },
  profileKey: plan.searchLogic.customQueries[0].profileId || "alpha", profileLabel: "alpha"
}], { observationPlanId: plan.id });
seed.setNote("fixture/alpha-old-page-two", "retained pagination note", "watch", { observationPlanId: plan.id });
seed.setWatch("fixture/alpha-old-page-two", true, { observationPlanId: plan.id });
const before = seed.listProjects({ observationPlanId: plan.id, limit: "all" }).items;
fs.writeFileSync(path.join(fixtureDir, "before.json"), JSON.stringify(before, null, 2));
const requests = [];
global.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  if (url.origin !== "https://api.github.com" || (init.method || "GET") !== "GET") throw new Error("Denied non-fixture network request");
  requests.push(url.pathname + url.search);
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  if (url.pathname === "/user") return json({ login: "fixture-user" });
  if (url.pathname === "/rate_limit") return json({ resources: {
    core: { limit: 5000, remaining: 4999, reset: Math.floor(Date.now() / 1000) + 3600 },
    search: { limit: 30, remaining: 29, reset: Math.floor(Date.now() / 1000) + 3600 },
    graphql: { limit: 5000, remaining: 4999, reset: Math.floor(Date.now() / 1000) + 3600 }
  } });
  if (url.pathname !== "/search/repositories") throw new Error("Unexpected GitHub fixture route: " + url.pathname);
  if (url.searchParams.get("page") === "2") return process.argv[3] === "incomplete"
    ? json({ total_count: 2, incomplete_results: true, items: [] })
    : json({ message: "fixture page two failed" }, 502);
  return json({ total_count: 2, incomplete_results: false, items: [{ id: 1,
    full_name: "fixture/alpha-new-page-one", name: "alpha-new-page-one", owner: { login: "fixture" },
    html_url: "https://github.com/fixture/alpha-new-page-one", description: "alpha toolkit from successful page one",
    topics: ["alpha"], language: "TypeScript", stargazers_count: 100, forks_count: 10,
    watchers_count: 100, default_branch: "main", created_at: "2020-01-01T00:00:00Z",
    pushed_at: new Date().toISOString(), license: { key: "mit", spdx_id: "MIT", name: "MIT License" }
  }] });
};
(async () => {
  const { runScan } = require(path.join(root, "src/server.js"));
  const result = await runScan({ observationPlanId: plan.id, pagesPerProfile: 2, maxRepos: 800,
    trendCount: 0, trendingCount: 0, tavilyCount: 0, exaCount: 0, mode: "retention-fixture" });
  const reader = createStorage(storePath);
  const after = reader.listProjects({ observationPlanId: plan.id, limit: "all" }).items;
  const scan = reader.latestScanForPlan(plan.id);
  const archive = reader.buildLeaderboard("daily", { observationPlanId: plan.id, persist: false });
  const output = { result, requests, scan, before, after, archive };
  fs.writeFileSync(path.join(fixtureDir, "after.json"), JSON.stringify(output, null, 2));
  console.log("RETENTION_FIXTURE " + JSON.stringify(output));
})().catch(error => { console.error(error); process.exitCode = 1; });
`;

for (const partialResponse of [502, "incomplete"]) test(`T-04 / A-04: Node partial page two ${partialResponse} retains members and notes`, { timeout: 25000 }, (t) => {
  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "starvault-pagination-retention-"));
  t.diagnostic(`retained fixture=${fixtureDir}; source=${SOURCE_ROOT}`);
  const child = spawnSync(process.execPath, ["-e", NODE_PAGINATION_FIXTURE, SOURCE_ROOT, fixtureDir, String(partialResponse)], {
    cwd: fixtureDir, encoding: "utf8", timeout: 22000, maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, STORE_PATH: path.join(fixtureDir, "fixture.db"), HOST: "127.0.0.1",
      AUTH_TOKEN: "", ACCESS_TOKEN: "", PUBLIC_ORIGIN: "", RUN_SCAN_ON_BOOT: "false",
      GITHUB_TOKEN: "mock-token", TAVILY_API_KEY: "", EXA_API_KEY: "", DEEPSEEK_API_KEY: "",
      GITHUB_TREND_LIMIT: "0", GITHUB_TRENDING_MAX_REPOS: "0" }
  });
  assert.equal(child.status, 0, child.stderr || child.stdout || String(child.error));
  const line = child.stdout.split("\n").find((item) => item.startsWith("RETENTION_FIXTURE "));
  assert.ok(line, child.stdout);
  const result = JSON.parse(line.slice("RETENTION_FIXTURE ".length));
  t.diagnostic(JSON.stringify({ requests: result.requests, scan: result.scan, members: names(result.after) }));
  assert.ok(result.requests.some((url) => /[?&]page=2(?:&|$)/.test(url)), "must exercise the actual second-page request");
  assert.ok(result.result.errors.some((error) => error.page === 2));
  assert.equal(result.scan.status, "completed-with-errors");
  assert.equal(result.scan.discoveryCoverage.complete, false);
  assert.equal(result.scan.discoveryCoverage.memberPolicy, "retain");
  assert.equal(result.archive.discoveryCoverage.complete, false);
  assert.deepEqual(names(result.after), ["fixture/alpha-new-page-one", "fixture/alpha-old-page-two"], "page-two failure must not revoke old members");
  const old = result.after.find((item) => item.fullName === "fixture/alpha-old-page-two");
  assert.equal(old.note, "retained pagination note");
  assert.equal(old.watched, true);
  assert.equal(result.after.find((item) => item.fullName === "fixture/alpha-new-page-one").stars, 100);
});
