const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { indexedDB, IDBKeyRange } = require("fake-indexeddb");

const domainCoreSource = fs.readFileSync(path.join(__dirname, "../public/domain-core.js"), "utf8");
const indexedDbSource = fs.readFileSync(path.join(__dirname, "../public/indexeddb-storage.js"), "utf8");
const localApiSource = fs.readFileSync(path.join(__dirname, "../public/local-api.js"), "utf8");

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(String(key)) || null,
    setItem: (key, value) => values.set(String(key), String(value)),
    removeItem: (key) => values.delete(String(key))
  };
}

function deleteDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase("starvault-imprint");
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
    request.onblocked = () => {};
  });
}

async function createBrowserRuntime(fetchImpl, options = {}) {
  if (options.reset !== false) await deleteDatabase();
  const window = {
    indexedDB,
    IDBKeyRange,
    __STARVAULT_GITHUB_REQUEST_SPACING_MS__: 0,
    localStorage: memoryStorage(),
    location: {
      origin: "http://127.0.0.1:4173",
      host: "127.0.0.1:4173",
      hostname: "127.0.0.1"
    }
  };
  const context = {
    window,
    globalThis: { IDBKeyRange },
    indexedDB,
    IDBKeyRange,
    fetch: (...args) => fetchImpl(...args),
    setTimeout,
    clearTimeout,
    AbortController,
    Date,
    JSON,
    Map,
    Set,
    Promise,
    Error,
    Object,
    Array,
    String,
    Number,
    Boolean,
    URL,
    URLSearchParams,
    Math
  };
  vm.runInNewContext(domainCoreSource, context);
  window.StarVaultDomainCore = context.globalThis.StarVaultDomainCore;
  vm.runInNewContext(indexedDbSource, context);
  vm.runInNewContext(localApiSource, context);
  return {
    api: window.StarVaultLocalApi,
    storage: window.StarVaultIndexedDB
  };
}

function response(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => payload,
    text: async () => JSON.stringify(payload)
  };
}

function githubResponse(url, payload) {
  return new URL(url).pathname.endsWith("/rate_limit")
    ? response({ resources: { search: { remaining: 30, reset: Math.floor(Date.now() / 1000) + 60 } } })
    : response(payload);
}

function repository(fullName, id) {
  const [owner, name] = fullName.split("/");
  return {
    id,
    full_name: fullName,
    name,
    owner: { login: owner, avatar_url: "" },
    html_url: `https://github.com/${fullName}`,
    description: `${name} repository`,
    language: "TypeScript",
    topics: [],
    stargazers_count: 50,
    forks_count: 5,
    watchers_count: 50,
    open_issues_count: 1,
    default_branch: "main",
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-10T00:00:00.000Z",
    pushed_at: "2026-07-10T00:00:00.000Z",
    archived: false,
    disabled: false,
    fork: false,
    license: { spdx_id: "MIT" }
  };
}

async function savePlan(api, plan) {
  return api.handle("/api/observation-plans", {
    method: "POST",
    body: JSON.stringify({ plan })
  });
}

async function activatePlan(api, id) {
  return api.handle("/api/observation-plans/active", {
    method: "POST",
    body: JSON.stringify({ id })
  });
}

async function waitForTask(api, id) {
  for (let index = 0; index < 100; index += 1) {
    const { task } = await api.handle(`/api/tasks/${encodeURIComponent(id)}`);
    if (!["queued", "running"].includes(task.status)) return task;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(`Task ${id} did not finish`);
}

test("browser scan tasks stay bound to the plan that created them", async () => {
  const searchQueries = [];
  const runtime = await createBrowserRuntime(async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/rate_limit")) return githubResponse(url, {});
    const query = parsed.searchParams.get("q") || "";
    searchQueries.push(query);
    return githubResponse(url, {
      items: [repository(query.includes("alpha-anchor") ? "acme/alpha" : "acme/beta", searchQueries.length)]
    });
  });
  const { api, storage } = runtime;
  await api.handle("/api/settings", { method: "POST", body: JSON.stringify({ githubToken: "test-token" }) });
  await savePlan(api, {
    id: "alpha",
    name: "Alpha",
    searchLogic: { baseMode: "only", keywords: ["alpha-anchor"], customQueries: [{ key: "alpha-core", label: "Alpha", query: "alpha-anchor in:name" }] }
  });
  await savePlan(api, {
    id: "beta",
    name: "Beta",
    searchLogic: { baseMode: "only", keywords: ["beta-anchor"], customQueries: [{ key: "beta-core", label: "Beta", query: "beta-anchor in:name" }] }
  });
  await activatePlan(api, "alpha");

  const started = await api.handle("/api/scan", { method: "POST", body: JSON.stringify({ mode: "manual" }) });
  await activatePlan(api, "beta");
  const completed = await waitForTask(api, started.task.id);

  assert.equal(completed.status, "completed");
  assert.deepEqual(searchQueries, ["alpha-anchor in:name"]);
  assert.deepEqual((await storage.getProjectsByPlan("alpha")).map((item) => item.fullName), ["acme/alpha"]);
  assert.deepEqual((await storage.getProjectsByPlan("beta")).map((item) => item.fullName), []);
  assert.equal(completed.result.scan.observationPlanId, "alpha");
});

test("browser scan resumes after refresh from the last completed profile", async () => {
  const firstSearches = [];
  const first = await createBrowserRuntime(async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/rate_limit")) return githubResponse(url, {});
    const query = parsed.searchParams.get("q") || "";
    firstSearches.push(query);
    if (query.includes("second-anchor")) return new Promise(() => {});
    return githubResponse(url, { items: [repository("acme/first", 1)] });
  });
  await first.api.handle("/api/settings", { method: "POST", body: JSON.stringify({ githubToken: "test-token" }) });
  await savePlan(first.api, {
    id: "resumable",
    name: "Resumable",
    searchLogic: {
      baseMode: "only",
      keywords: ["first-anchor", "second-anchor"],
      customQueries: [
        { key: "first-profile", label: "First", query: "first-anchor in:name" },
        { key: "second-profile", label: "Second", query: "second-anchor in:name" }
      ]
    }
  });
  await activatePlan(first.api, "resumable");
  const started = await first.api.handle("/api/scan", { method: "POST", body: JSON.stringify({ mode: "manual" }) });

  let checkpoint = null;
  for (let index = 0; index < 100; index += 1) {
    const snapshot = await first.storage.getSnapshot({ includeProjects: false });
    checkpoint = snapshot.store.tasks?.[started.task.id]?.checkpoint;
    if (checkpoint?.completedProfiles?.length === 1) break;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.equal(checkpoint?.completedProfiles?.length, 1);
  assert.deepEqual(firstSearches, ["first-anchor in:name", "second-anchor in:name"]);

  const resumedSearches = [];
  const resumed = await createBrowserRuntime(async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/rate_limit")) return githubResponse(url, {});
    const query = parsed.searchParams.get("q") || "";
    resumedSearches.push(query);
    return githubResponse(url, { items: [repository("acme/second", 2)] });
  }, { reset: false });
  const completed = await waitForTask(resumed.api, started.task.id);

  assert.equal(completed.status, "completed");
  assert.deepEqual(resumedSearches, ["second-anchor in:name"]);
  assert.deepEqual(
    (await resumed.storage.getProjectsByPlan("resumable")).map((item) => item.fullName).sort(),
    ["acme/first", "acme/second"]
  );
  assert.deepEqual(await resumed.storage.getTaskArtifacts(started.task.id), {});
});

test("browser learning uses explicit-action weights and reprioritizes the next plan scan", async () => {
  const searchRequests = [];
  const runtime = await createBrowserRuntime(async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/rate_limit")) return githubResponse(url, {});
    searchRequests.push({ query: parsed.searchParams.get("q") || "", perPage: Number(parsed.searchParams.get("per_page") || 0) });
    return githubResponse(url, { items: [] });
  });
  const { api, storage } = runtime;
  await api.handle("/api/settings", { method: "POST", body: JSON.stringify({ githubToken: "test-token" }) });
  await savePlan(api, {
    id: "signals",
    name: "Signals",
    searchLogic: {
      baseMode: "only",
      keywords: ["first-anchor", "second-anchor"],
      customQueries: [
        { key: "first-profile", label: "First", query: "first-anchor in:name" },
        { key: "second-profile", label: "Second", query: "second-anchor in:name" }
      ]
    }
  });
  await activatePlan(api, "signals");
  await storage.putProjects([
    {
      fullName: "acme/first",
      name: "first",
      language: "TypeScript",
      category: { key: "tool" },
      useCase: { key: "workflow" },
      licensePolicy: { bucket: "permissive-commercial" },
      scores: { risk: 5 },
      profileKey: "first-profile",
      profileLabel: "First",
      observationPlanMatches: { signals: { planId: "signals", profileKey: "first-profile", profileLabel: "First" } }
    },
    {
      fullName: "acme/second",
      name: "second",
      language: "TypeScript",
      category: { key: "tool" },
      useCase: { key: "workflow" },
      licensePolicy: { bucket: "permissive-commercial" },
      scores: { risk: 5 },
      profileKey: "second-profile",
      profileLabel: "Second",
      observationPlanMatches: { signals: { planId: "signals", profileKey: "second-profile", profileLabel: "Second" } }
    }
  ]);

  await api.handle("/api/memory-event", {
    method: "POST",
    body: JSON.stringify({ fullName: "acme/second", type: "select_project", weight: 9 })
  });
  await api.handle("/api/watchlist", {
    method: "POST",
    body: JSON.stringify({ fullName: "acme/second", watched: true })
  });
  await api.handle("/api/watchlist", {
    method: "POST",
    body: JSON.stringify({ fullName: "acme/second", watched: true })
  });
  const memory = await api.handle("/api/memory");
  assert.equal(memory.events.find((event) => event.type === "select_project").weight, 0);
  assert.equal(memory.events.filter((event) => event.type === "favorite").length, 1);
  assert.equal(memory.events.find((event) => event.type === "favorite").weight, 2.6);
  assert.ok(
    Number(memory.discoveryProfiles["second-profile"] || 0) > Number(memory.discoveryProfiles["first-profile"] || 0),
    JSON.stringify(memory.discoveryProfiles)
  );

  const started = await api.handle("/api/scan", { method: "POST", body: JSON.stringify({ mode: "manual" }) });
  const completed = await waitForTask(api, started.task.id);
  assert.equal(completed.status, "completed");
  assert.match(searchRequests[0].query, /second-anchor/);
  assert.ok(searchRequests[0].perPage > searchRequests[1].perPage);
});

test("browser plan generation repairs thin domain output and fails closed behind a generic quality gate", async () => {
  let modelCalls = 0;
  const weakPlan = {
    name: "家庭物联网协议",
    searchLogic: {
      baseMode: "only",
      keywords: ["iot", "tool"],
      excludeTerms: [],
      customQueries: [{ label: "IoT", query: "iot tool" }]
    }
  };
  const keywords = ["Zigbee", "Matter", "Thread", "IEEE 802.15.4", "ZCL", "coordinator", "mesh network", "device bridge"];
  const goodPlan = {
    name: "家庭物联网协议",
    nameEn: "Home IoT protocols",
    description: "持续观察家庭物联网协议与设备集成项目。",
    requirements: [{ text: "关注协议栈、网关、设备桥接和自动化工具" }],
    searchLogic: {
      baseMode: "only",
      keywords,
      excludeTerms: [],
      customQueries: keywords.slice(0, 6).map((keyword, index) => ({
        label: keyword,
        labelZh: keyword,
        labelEn: keyword,
        query: `${keyword} in:name,description,readme archived:false mirror:false`,
        stars: 0,
        key: `iot-${index + 1}`
      }))
    }
  };
  const runtime = await createBrowserRuntime(async (url) => {
    assert.equal(new URL(url).hostname, "api.deepseek.com");
    modelCalls += 1;
    const content = modelCalls === 1 ? weakPlan : goodPlan;
    return response({ choices: [{ message: { content: JSON.stringify(content) } }] });
  });
  const { api } = runtime;
  await api.handle("/api/settings", {
    method: "POST",
    body: JSON.stringify({
      activeProvider: "deepseek",
      llmProviders: [
        {
          id: "deepseek",
          name: "DeepSeek",
          baseUrl: "https://api.deepseek.com",
          model: "deepseek-chat",
          enabled: true,
          apiKey: "test-model-key"
        }
      ]
    })
  });

  const started = await api.handle("/api/observation-plans/generate", {
    method: "POST",
    body: JSON.stringify({ name: "家庭物联网协议", detailedNeed: "关注 Zigbee、Matter、Thread 协议栈和设备集成" })
  });
  const completed = await waitForTask(api, started.task.id);

  assert.equal(completed.status, "completed");
  assert.equal(modelCalls, 2);
  assert.equal(completed.result.plan.name, "家庭物联网协议");
  assert.equal(completed.result.plan.searchLogic.customQueries.length, 6);
  assert.equal(completed.result.plan.searchLogic.keywords.length, 8);
});

test("browser plan generation accepts a compact coherent strategy for a sparse GitHub domain", async () => {
  let modelCalls = 0;
  const sparsePlan = {
    name: "稀有工业协议",
    searchLogic: {
      baseMode: "only",
      keywords: ["RareBus", "RareBus SDK", "RareBus protocol"],
      excludeTerms: [],
      customQueries: [
        {
          label: "RareBus 协议",
          query: "RareBus protocol in:name,description,readme archived:false mirror:false"
        },
        {
          label: "RareBus SDK",
          query: "RareBus SDK in:name,description,readme archived:false mirror:false"
        }
      ]
    }
  };
  const runtime = await createBrowserRuntime(async (url) => {
    const parsed = new URL(url);
    if (parsed.hostname === "api.github.com" && parsed.pathname.endsWith("/rate_limit")) return githubResponse(url, {});
    if (parsed.hostname === "api.github.com") return response({ total_count: 4, items: [] });
    modelCalls += 1;
    return response({ choices: [{ message: { content: JSON.stringify(sparsePlan) } }] });
  });
  const { api } = runtime;
  await api.handle("/api/settings", {
    method: "POST",
    body: JSON.stringify({
      githubToken: "test-token",
      activeProvider: "deepseek",
      llmProviders: [
        {
          id: "deepseek",
          name: "DeepSeek",
          baseUrl: "https://api.deepseek.com",
          model: "deepseek-chat",
          enabled: true,
          apiKey: "test-model-key"
        }
      ]
    })
  });

  const started = await api.handle("/api/observation-plans/generate", {
    method: "POST",
    body: JSON.stringify({ name: "稀有工业协议", detailedNeed: "只关注 RareBus 协议栈和 SDK" })
  });
  const completed = await waitForTask(api, started.task.id);

  assert.equal(completed.status, "completed");
  assert.equal(modelCalls, 2);
  assert.equal(completed.result.plan.searchLogic.customQueries.length, 2);
});

test("browser scan validates the GitHub token before issuing any repository search", async () => {
  const requests = [];
  const runtime = await createBrowserRuntime(async (url) => {
    const parsed = new URL(url);
    requests.push(parsed.pathname);
    if (parsed.pathname.endsWith("/rate_limit")) return response({ message: "Bad credentials" }, 401);
    return response({ items: [repository("acme/should-not-be-seen", 1)] });
  });
  const { api, storage } = runtime;
  await api.handle("/api/settings", { method: "POST", body: JSON.stringify({ githubToken: "expired-token" }) });
  requests.length = 0;

  const started = await api.handle("/api/scan", { method: "POST", body: JSON.stringify({ mode: "manual" }) });
  const completed = await waitForTask(api, started.task.id);

  assert.equal(completed.status, "failed");
  assert.match(completed.error, /token|credential|401/i);
  assert.deepEqual(requests, ["/rate_limit"]);
  assert.equal(await storage.countProjects(), 0);
});

test("browser scan keeps every matching profile for a repository", async () => {
  const searchQueries = [];
  const runtime = await createBrowserRuntime(async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/rate_limit")) return githubResponse(url, {});
    searchQueries.push(parsed.searchParams.get("q") || "");
    return githubResponse(url, { items: [repository("acme/shared-cad-tool", 88)] });
  });
  const { api, storage } = runtime;
  await api.handle("/api/settings", { method: "POST", body: JSON.stringify({ githubToken: "test-token" }) });
  await savePlan(api, {
    id: "cad",
    name: "CAD",
    searchLogic: {
      baseMode: "only",
      keywords: ["STEP", "DXF"],
      customQueries: [
        { profileId: "cad-step", label: "STEP", query: "STEP CAD in:name,description,readme archived:false mirror:false" },
        { profileId: "cad-dxf", label: "DXF", query: "DXF CAD in:name,description,readme archived:false mirror:false" }
      ]
    }
  });
  await activatePlan(api, "cad");

  const started = await api.handle("/api/scan", { method: "POST", body: JSON.stringify({ mode: "manual" }) });
  const completed = await waitForTask(api, started.task.id);
  const project = await storage.getProject("acme/shared-cad-tool");

  assert.equal(completed.status, "completed");
  assert.equal(searchQueries.length, 2);
  assert.deepEqual(
    project.observationPlanMatches.cad.profileMatches.map((item) => item.key).sort(),
    ["cad-dxf", "cad-step"]
  );
});

test("browser plan deletion removes plan-owned records without touching shared projects", async () => {
  const runtime = await createBrowserRuntime(async (url) => githubResponse(url, { items: [] }));
  const { api, storage } = runtime;
  await savePlan(api, {
    id: "temporary",
    name: "Temporary",
    searchLogic: { baseMode: "only", keywords: ["temporary"], customQueries: [{ key: "temporary-core", query: "temporary in:name" }] }
  });
  await storage.putProjects([
    { fullName: "acme/custom-only", observationPlanMatches: { temporary: { planId: "temporary" } } },
    {
      fullName: "acme/shared",
      observationPlanMatches: { default: { planId: "default" }, temporary: { planId: "temporary" } }
    }
  ]);
  const snapshot = await storage.getSnapshot({ includeProjects: false });
  snapshot.store.scans = [{ id: "scan-temporary", at: new Date().toISOString(), observationPlanId: "temporary" }];
  snapshot.store.tasks = {
    "task-temporary": {
      id: "task-temporary",
      type: "scan",
      status: "completed",
      input: { observationPlanId: "temporary" }
    }
  };
  snapshot.store.leaderboards = {
    daily: {},
    byPlan: { temporary: { daily: { "2026-07-18": { items: [{ fullName: "acme/custom-only" }] } } } }
  };
  await storage.putSnapshot(snapshot, { preserveProjects: true });

  await api.handle("/api/observation-plans/delete", {
    method: "POST",
    body: JSON.stringify({ id: "temporary" })
  });

  const remaining = await storage.getSnapshot({ includeProjects: false });
  assert.equal(await storage.getProject("acme/custom-only"), null);
  assert.deepEqual(Object.keys((await storage.getProject("acme/shared")).observationPlanMatches), ["default"]);
  assert.equal(remaining.store.observationPlans.temporary, undefined);
  assert.equal(remaining.store.scans.some((scan) => scan.observationPlanId === "temporary"), false);
  assert.equal(remaining.store.tasks["task-temporary"], undefined);
  assert.equal(await storage.countLeaderboards(), 0);
});

test("browser plan deletion is blocked while a plan task is running", async () => {
  const runtime = await createBrowserRuntime(async (url) => githubResponse(url, { items: [] }));
  const { api, storage } = runtime;
  await savePlan(api, {
    id: "busy-browser-plan",
    name: "Busy browser plan",
    searchLogic: { baseMode: "only", keywords: ["busy"], customQueries: [{ key: "busy", query: "busy in:name" }] }
  });
  const snapshot = await storage.getSnapshot({ includeProjects: false });
  snapshot.store.tasks["busy-task"] = {
    id: "busy-task",
    type: "scan",
    status: "running",
    input: { observationPlanId: "busy-browser-plan" }
  };
  await storage.putSnapshot(snapshot, { preserveProjects: true });

  await assert.rejects(
    api.handle("/api/observation-plans/delete", {
      method: "POST",
      body: JSON.stringify({ id: "busy-browser-plan" })
    }),
    /正在执行|running/i
  );
  assert.ok((await api.handle("/api/observation-plans")).plans.some((plan) => plan.id === "busy-browser-plan"));
});

test("browser JSON and CSV exports contain the active project pool and never expose credentials", async () => {
  const runtime = await createBrowserRuntime(async (url) => githubResponse(url, { items: [] }));
  const { api, storage } = runtime;
  await api.handle("/api/settings", {
    method: "POST",
    body: JSON.stringify({ githubToken: "private-token", tavilyKey: "private-tavily" })
  });
  await storage.putProjects([
    {
      fullName: "acme/exported",
      name: "exported",
      owner: "acme",
      url: "https://github.com/acme/exported",
      description: "Exported project",
      language: "TypeScript",
      stars: 42,
      forks: 4,
      observationPlanMatches: { default: { planId: "default" } },
      licensePolicy: { name: "MIT", bucket: "permissive-commercial", labelZh: "低摩擦许可", labelEn: "Low-friction license" },
      scores: { opportunity: 72, actionability: 68, quality: 70, risk: 5 }
    }
  ]);

  const jsonExport = await api.handle("/api/export?format=json&language=zh");
  const csvExport = await api.handle("/api/export?format=csv&language=en");

  assert.match(jsonExport.filename, /\.json$/);
  assert.match(jsonExport.content, /acme\/exported/);
  assert.doesNotMatch(jsonExport.content, /private-token|private-tavily/);
  assert.match(csvExport.filename, /\.csv$/);
  assert.match(csvExport.content, /fullName/);
  assert.match(csvExport.content, /acme\/exported/);
  assert.doesNotMatch(csvExport.content, /private-token|private-tavily/);
});
