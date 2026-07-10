const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { indexedDB, IDBKeyRange } = require("fake-indexeddb");

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

async function createBrowserRuntime(fetchImpl) {
  await deleteDatabase();
  const window = {
    indexedDB,
    IDBKeyRange,
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
    text: async () => JSON.stringify(payload)
  };
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
    const query = parsed.searchParams.get("q") || "";
    searchQueries.push(query);
    return response({ items: [repository(query.includes("alpha-anchor") ? "acme/alpha" : "acme/beta", searchQueries.length)] });
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

test("browser learning uses explicit-action weights and reprioritizes the next plan scan", async () => {
  const searchRequests = [];
  const runtime = await createBrowserRuntime(async (url) => {
    const parsed = new URL(url);
    searchRequests.push({ query: parsed.searchParams.get("q") || "", perPage: Number(parsed.searchParams.get("per_page") || 0) });
    return response({ items: [] });
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
    body: JSON.stringify({ fullName: "acme/second", type: "select_project" })
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
  assert.equal(memory.events.find((event) => event.type === "select_project").weight, 0.03);
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
