const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { chromium } = require("playwright");

// Point this at an unchanged checkout to prove the regression fails there.
// Only these three public scripts are served; no application server, .env,
// demo bootstrap, existing user database, or production endpoint is involved.
const SOURCE_ROOT = path.resolve(process.env.STARVAULT_TEST_SOURCE_ROOT || path.join(__dirname, ".."));
const SCRIPT_NAMES = new Set(["domain-core.js", "indexeddb-storage.js", "local-api.js"]);
const PROJECT = "fixture/asset-retention";

function launchOptions() {
  const candidates = [
    process.env.PLAYWRIGHT_EXECUTABLE_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
  ].filter(Boolean);
  const executablePath = candidates.find((candidate) => fs.existsSync(candidate));
  return { headless: true, ...(executablePath ? { executablePath } : {}) };
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

async function withDeadline(promise, milliseconds, message) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), milliseconds);
    })]);
  } finally {
    clearTimeout(timer);
  }
}

async function fixture(t, modelHandler) {
  const server = http.createServer((request, response) => {
    const name = new URL(request.url, "http://127.0.0.1").pathname.slice(1);
    if (!name) {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end('<!doctype html><meta charset="utf-8"><script src="/domain-core.js"></script><script src="/indexeddb-storage.js"></script><script src="/local-api.js"></script>');
    } else if (SCRIPT_NAMES.has(name)) {
      response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
      response.end(fs.readFileSync(path.join(SOURCE_ROOT, "public", name)));
    } else {
      response.writeHead(404);
      response.end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  let context;
  t.after(async () => {
    await context?.close();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  // Preserve the scratch profile for diagnosing failed assertions. Never use
  // the user's browser profile and never install a missing browser silently.
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "starvault-idb-concurrency-"));
  t.diagnostic(`source=${SOURCE_ROOT}; isolated browser profile=${profile}; origin=${origin}`);
  context = await chromium.launchPersistentContext(profile, launchOptions());
  const unexpected = [];
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === origin && (!url.pathname.slice(1) || SCRIPT_NAMES.has(url.pathname.slice(1)))) {
      return route.continue();
    }
    if (url.origin === "https://api.deepseek.com" && url.pathname === "/v1/chat/completions" && modelHandler) {
      return modelHandler(route);
    }
    unexpected.push(`${route.request().method()} ${url.origin}${url.pathname}`);
    await route.abort("blockedbyclient");
  });
  t.after(() => assert.deepEqual(unexpected, [], "all non-fixture network requests must be denied"));
  const a = context.pages()[0] || await context.newPage();
  const b = await context.newPage();
  await Promise.all([a.goto(origin), b.goto(origin)]);
  await Promise.all([a, b].map((page) => page.waitForFunction(() => Boolean(window.StarVaultLocalApi && window.StarVaultIndexedDB))));
  return { a, b, context };
}

async function api(page, endpoint, body) {
  return page.evaluate(({ endpoint, body }) => window.StarVaultLocalApi.handle(endpoint, body === undefined ? {} : {
    method: "POST", body: JSON.stringify(body)
  }), { endpoint, body });
}

async function snapshot(page) {
  return page.evaluate(() => window.StarVaultIndexedDB.getSnapshot());
}

async function persistedAfterReload(page) {
  await page.reload();
  return snapshot(page);
}

async function seed(page) {
  await api(page, "/api/settings", { validateProvider: false, language: "zh", dailyBriefSize: 120 });
}

async function savePlan(page, id) {
  return api(page, "/api/observation-plans", {
    id, name: id, requirements: [],
    searchLogic: { baseMode: "only", keywords: [id], customQueries: [{ label: id, query: `${id} in:name` }] }
  });
}

test("T-01 real tabs retain user assets and active-plan memory while analysis is pending", { timeout: 45000 }, async (t) => {
  const called = deferred();
  const release = deferred();
  let modelCalls = 0;
  const { a, b } = await fixture(t, async (route) => {
    modelCalls += 1;
    called.resolve();
    await release.promise;
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ choices: [{ message: { content: JSON.stringify({
      recommendation: "validate", riskLevel: "low", summary: "Fixture analysis with usable validation evidence.",
      risks: [], boundaries: [], inspirations: ["Validate the fixture workflow"], validations: ["Run the fixture"]
    }) } }] }) });
  });
  // Ensure failure paths also release the mocked response before closing tabs.
  t.after(() => release.resolve());
  await seed(a);
  await savePlan(a, "analysis-owner");
  await api(a, "/api/observation-plans/active", { id: "analysis-owner" });
  await a.evaluate(async (fullName) => {
    const value = await window.StarVaultIndexedDB.getSnapshot();
    value.store.projects[fullName] = {
      fullName, owner: "fixture", name: "asset-retention", description: "Fixture productivity workflow",
      language: "TypeScript", topics: ["workflow"], stars: 50, forks: 5,
      scores: { opportunity: 70, quality: 75, actionability: 70, risk: 5 },
      observationPlanMatches: { "analysis-owner": { planId: "analysis-owner" } }
    };
    await window.StarVaultIndexedDB.putSnapshot(value);
  }, PROJECT);
  await api(a, "/api/settings", { validateProvider: false, activeProvider: "deepseek", llmProviders: [{
    id: "deepseek", baseUrl: "https://api.deepseek.com", enabled: true, model: "deepseek-flash", apiKey: "fixture-model-key"
  }] });
  const started = await api(a, "/api/analyze", { fullName: PROJECT, userNeed: "Fixture need" });
  await withDeadline(called.promise, 10000, "mock model was not requested");
  await api(b, "/api/note", { fullName: PROJECT, text: "Saved while model was pending", status: "validate" });
  await api(b, "/api/watchlist", { fullName: PROJECT, watched: true });
  await api(b, "/api/memory-preference", { kind: "language", key: "FixtureManualOwner", value: 7 });
  await savePlan(b, "new-active-plan");
  await api(b, "/api/observation-plans/active", { id: "new-active-plan" });
  await api(b, "/api/memory-preference", { kind: "language", key: "FixtureManualActive", value: 11 });
  release.resolve();
  await a.waitForFunction(async (id) => {
    const state = await window.StarVaultIndexedDB.getSnapshot();
    return ["completed", "failed"].includes(state?.store?.tasks?.[id]?.status);
  }, started.task.id, { timeout: 15000 });
  const value = await persistedAfterReload(b);
  const owner = value.store.observationPlans["analysis-owner"];
  assert.equal(value.store.tasks[started.task.id]?.status, "completed", JSON.stringify(value.store.tasks[started.task.id]));
  assert.equal(modelCalls, 1);
  assert.equal(owner.userData.analysis[PROJECT]?.result.summary, "Fixture analysis with usable validation evidence.");
  assert.equal(owner.userData.notes[PROJECT]?.text, "Saved while model was pending", "analysis must not overwrite a completed note write");
  assert.ok(owner.userData.watchlist[PROJECT], "analysis must not overwrite a completed favorite write");
  assert.equal(owner.memory.preferences.languages.FixtureManualOwner, 7);
  for (const type of ["triage_note", "favorite", "ai_analyze"]) {
    assert.equal(owner.memory.events.filter((event) => event.type === type && event.fullName === PROJECT).length, 1, `retain exactly one ${type} learning event`);
    assert.equal(owner.memory.stats.eventCounts[type], 1);
  }
  assert.ok(value.store.observationPlans["new-active-plan"], "new plan must survive the stale task commit");
  assert.equal(value.activeObservationPlanId, "new-active-plan");
  assert.equal(value.settings.activeObservationPlanId, "new-active-plan");
  assert.deepEqual(value.store.memory, value.store.observationPlans["new-active-plan"].memory, "memory alias must follow the current active plan");
  assert.equal(value.store.memory.preferences.languages.FixtureManualActive, 11);
});

test("T-01 real tabs merge independently changed settings from stale snapshots", { timeout: 25000 }, async (t) => {
  const { a, b } = await fixture(t);
  await seed(a);
  await Promise.all([a, b].map((page) => page.evaluate(async () => { window.pendingSnapshot = await window.StarVaultIndexedDB.getSnapshot(); })));
  await a.evaluate(async () => {
    window.pendingSnapshot.settings.language = "en";
    await window.StarVaultIndexedDB.putSnapshot(window.pendingSnapshot);
  });
  await b.evaluate(async () => {
    window.pendingSnapshot.settings.dailyBriefSize = 37;
    await window.StarVaultIndexedDB.putSnapshot(window.pendingSnapshot);
  });
  const value = await persistedAfterReload(a);
  assert.equal(value.settings.language, "en");
  assert.equal(value.settings.dailyBriefSize, 37);
  const settings = await api(b, "/api/settings");
  assert.equal(settings.language, "en", "a warm tab must refresh the committed revision");
  assert.equal(settings.dailyBriefSize, 37);
});

test("T-01 real tabs use the documented commit-last policy for the same settings field", { timeout: 25000 }, async (t) => {
  const { a, b } = await fixture(t);
  await seed(a);
  await Promise.all([a, b].map((page) => page.evaluate(async () => { window.pendingSnapshot = await window.StarVaultIndexedDB.getSnapshot(); })));
  await a.evaluate(async () => {
    window.pendingSnapshot.settings.defaultSort = "quality";
    await window.StarVaultIndexedDB.putSnapshot(window.pendingSnapshot);
  });
  await b.evaluate(async () => {
    window.pendingSnapshot.settings.defaultSort = "stars";
    await window.StarVaultIndexedDB.putSnapshot(window.pendingSnapshot);
  });
  assert.equal((await persistedAfterReload(a)).settings.defaultSort, "stars");
});

test("T-01 real tabs preserve other task records across repeated stale-task saves", { timeout: 25000 }, async (t) => {
  const { a, b } = await fixture(t);
  await seed(a);
  await Promise.all([a, b].map((page) => page.evaluate(async () => { window.pendingSnapshot = await window.StarVaultIndexedDB.getSnapshot(); })));
  await a.evaluate(async () => {
    window.pendingSnapshot.store.tasks["fixture-task-a"] = { id: "fixture-task-a", type: "analysis", status: "completed", result: { summary: "a" } };
    await window.StarVaultIndexedDB.putSnapshot(window.pendingSnapshot);
  });
  await b.evaluate(async () => {
    window.pendingSnapshot.store.tasks["fixture-task-b"] = { id: "fixture-task-b", type: "analysis", status: "completed", result: { summary: "b" } };
    await window.StarVaultIndexedDB.putSnapshot(window.pendingSnapshot);
  });
  await a.evaluate(async () => {
    window.pendingSnapshot.store.tasks["fixture-task-a"].result.summary = "a-updated";
    await window.StarVaultIndexedDB.putSnapshot(window.pendingSnapshot);
  });
  const value = await persistedAfterReload(b);
  assert.equal(value.store.tasks["fixture-task-a"]?.result.summary, "a-updated");
  assert.equal(value.store.tasks["fixture-task-b"]?.result.summary, "b");
});

test("T-01 real API replay preserves concurrent learning when undo was clipped at zero", { timeout: 25000 }, async (t) => {
  const { a, b } = await fixture(t);
  await seed(a);
  await a.evaluate(async (fullName) => {
    const value = await window.StarVaultIndexedDB.getSnapshot();
    value.store.projects[fullName] = {
      fullName, owner: "fixture", name: "asset-retention", language: "TypeScript",
      category: { key: "tools" }, useCase: { key: "workflow" },
      observationPlanMatches: { default: { planId: "default" } }
    };
    await window.StarVaultIndexedDB.putSnapshot(value);
  }, PROJECT);
  await api(a, "/api/note", { fullName: PROJECT, text: "Old note", status: "validate" });
  await api(a, "/api/memory-preference", { kind: "category", key: "tools", value: 1 });
  await b.evaluate(() => {
    const store = window.StarVaultIndexedDB;
    const save = store.putSnapshot;
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    window.releaseCheckpoint = release;
    store.putSnapshot = async (...args) => {
      window.checkpointPending = true;
      await gate;
      return save(...args);
    };
  });
  const clearing = api(b, "/api/note", { fullName: PROJECT, text: "", status: "" });
  await b.waitForFunction(() => window.checkpointPending === true);
  await api(a, "/api/watchlist", { fullName: PROJECT, watched: true });
  await b.evaluate(() => window.releaseCheckpoint());
  await clearing;
  const value = await persistedAfterReload(a);
  const memory = value.store.observationPlans.default.memory;
  assert.equal(memory.preferences.categories.tools, 2, "latest 3.6 minus actual undo 1.6, rather than stale clipped delta");
  assert.equal(memory.stats.eventCounts.favorite, 1);
  assert.equal(memory.stats.eventCounts.triage_note, 0);
  assert.equal(memory.events.filter((event) => event.type === "favorite").length, 1);
  assert.equal(memory.events.filter((event) => event.type === "triage_note").length, 0);
  assert.ok(value.store.observationPlans.default.userData.watchlist[PROJECT]);
  assert.equal(value.store.observationPlans.default.userData.notes[PROJECT], undefined);
});
