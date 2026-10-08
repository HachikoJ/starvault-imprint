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
