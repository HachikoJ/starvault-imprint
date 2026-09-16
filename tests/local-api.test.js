const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { indexedDB, IDBKeyRange } = require("fake-indexeddb");
const { createStorage } = require("../src/lib/storage");

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
  // public/bootstrap.js sets this flag in the real page. Tests only opt in
  // when they want the static demo seeding path.
  if (options.bootstrap) window.__STARVAULT_BOOTSTRAPPED__ = true;
  if (options.deployment) window.__STARVAULT_DEPLOYMENT__ = options.deployment;
  if (options.exaProxy !== undefined) window.__STARVAULT_EXA_PROXY__ = options.exaProxy;
  if (options.baseURI) window.document = { baseURI: options.baseURI };
  const context = {
    window,
    globalThis: { IDBKeyRange },
    indexedDB,
    IDBKeyRange,
    location: window.location,
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

function response(payload, status = 200, headers = {}) {
  const entries = Object.entries(headers).map(([key, value]) => [String(key).toLowerCase(), String(value)]);
  const headerMap = new Map(entries);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name) => headerMap.get(String(name).toLowerCase()) ?? null
    },
    json: async () => payload,
    text: async () => JSON.stringify(payload)
  };
}

function githubResponse(url, payload) {
  return new URL(url).pathname.endsWith("/rate_limit")
    ? response({ resources: { search: { remaining: 30, reset: Math.floor(Date.now() / 1000) + 60 } } })
    : response(payload);
}

function repository(fullName, id, overrides = {}) {
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
    license: { spdx_id: "MIT" },
    ...overrides
  };
}

const DEMO_SNAPSHOT_PATH = path.join(__dirname, "../public/demo-snapshot.json");
const DEMO_SNAPSHOT_SCHEMA = "starvault-demo-snapshot/v1";
const CREDENTIAL_FIELD = /(?:token|api[_-]?key|secret|password|authorization|credential)/i;

function demoSnapshot() {
  return JSON.parse(fs.readFileSync(DEMO_SNAPSHOT_PATH, "utf8"));
}

function credentialFieldPaths(value, prefix = "", depth = 0, paths = []) {
  if (!value || typeof value !== "object" || depth > 8) return paths;
  for (const [key, entry] of Object.entries(value)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (CREDENTIAL_FIELD.test(key)) paths.push(next);
    credentialFieldPaths(entry, next, depth + 1, paths);
  }
  return paths;
}

function demoFetch(snapshot, options = {}) {
  const calls = [];
  const impl = async (url) => {
    calls.push(String(url));
    if (String(url).includes("demo-snapshot.json")) {
      if (options.missingDemo) return response({ message: "Not Found" }, 404);
      return response(snapshot ?? demoSnapshot());
    }
    return githubResponse(url, { items: [] });
  };
  impl.calls = calls;
  return impl;
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

test("browser-local settings default to DeepSeek v4.1 Flash", async () => {
  const runtime = await createBrowserRuntime(async () => response({}));
  const settings = await runtime.api.handle("/api/settings");
  const provider = settings.llmProviders.find((item) => item.id === "deepseek");

  assert.equal(provider.model, "deepseek-flash");
  assert.deepEqual(provider.models, ["deepseek-flash", "deepseek-v4-pro"]);
});

test("browser-local settings migrate legacy DeepSeek defaults", async () => {
  const runtime = await createBrowserRuntime(async () => response({}));
  await runtime.api.handle("/api/settings", {
    method: "POST",
    body: JSON.stringify({
      validateProvider: false,
      llmProviders: [{ id: "deepseek", model: "deepseek-v4-flash", models: [] }]
    })
  });

  const settings = await runtime.api.handle("/api/settings");
  const provider = settings.llmProviders.find((item) => item.id === "deepseek");
  assert.equal(provider.model, "deepseek-flash");
  assert.deepEqual(provider.models, ["deepseek-flash", "deepseek-v4-pro"]);
});

test("static deployment sends Exa requests through the configured proxy", async () => {
  const calls = [];
  const runtime = await createBrowserRuntime(
    async (url) => {
      calls.push(String(url));
      return response({ results: [] });
    },
    { deployment: "static", exaProxy: "/api/exa/search" }
  );

  const settings = await runtime.api.handle("/api/settings", {
    method: "POST",
    body: JSON.stringify({ exaKey: "test-exa-key", validateProvider: false })
  });

  assert.deepEqual(calls, ["/api/exa/search"]);
  assert.equal(settings.keyValidation.exa.configured, true);
  assert.equal(settings.keyValidation.exa.valid, true);
  assert.equal(settings.keyValidation.exa.message, "");
});

test("proxied Exa errors keep their upstream meaning", async () => {
  const runtime = await createBrowserRuntime(async () => response({ error: "Invalid API key", tag: "INVALID_API_KEY" }, 401), {
    deployment: "static",
    exaProxy: "/api/exa/search"
  });

  const settings = await runtime.api.handle("/api/settings", {
    method: "POST",
    body: JSON.stringify({ exaKey: "expired-key", validateProvider: false })
  });

  assert.equal(settings.keyValidation.exa.valid, false);
  assert.match(settings.keyValidation.exa.message, /Exa Key 无效或已过期/);
});

test("static deployment without an Exa proxy does not blame the network", async () => {
  const runtime = await createBrowserRuntime(
    async () => {
      throw new TypeError("Failed to fetch");
    },
    { deployment: "static" }
  );

  const settings = await runtime.api.handle("/api/settings", {
    method: "POST",
    body: JSON.stringify({ exaKey: "test-exa-key", validateProvider: false })
  });

  assert.equal(settings.keyValidation.exa.valid, false);
  assert.match(settings.keyValidation.exa.message, /未配置 Exa 代理/);
});

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
    const alpha = query.includes("alpha-anchor");
    return githubResponse(url, {
      items: [
        repository(alpha ? "acme/alpha" : "acme/beta", searchQueries.length, {
          description: alpha ? "alpha-anchor toolkit" : "beta-anchor toolkit"
        })
      ]
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
  assert.deepEqual(searchQueries, ["alpha-anchor in:name archived:false mirror:false"]);
  assert.deepEqual((await storage.getProjectsByPlan("alpha")).map((item) => item.fullName), ["acme/alpha"]);
  assert.deepEqual((await storage.getProjectsByPlan("beta")).map((item) => item.fullName), []);
  assert.equal(completed.result.scan.observationPlanId, "alpha");
});

test("non-Latin plan names keep one stable ASCII id that matches server mode", async () => {
  const runtime = await createBrowserRuntime(async () => response({}));
  const draft = {
    name: "抖音",
    searchLogic: {
      baseMode: "only",
      keywords: ["douyin"],
      customQueries: [{ key: "core", label: "抖音", query: "douyin in:name" }]
    }
  };

  const first = await savePlan(runtime.api, draft);
  const second = await savePlan(runtime.api, { ...draft });

  // Re-saving the generated draft must reuse the same pool instead of minting a
  // second plan with an empty project list.
  assert.match(first.plan.id, /^[a-z0-9-]+$/);
  assert.equal(second.plan.id, first.plan.id);
  const listed = await runtime.api.handle("/api/observation-plans");
  assert.equal(listed.plans.filter((plan) => !plan.builtIn).length, 1);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "starvault-plan-id-parity-"));
  const serverStorage = createStorage(path.join(dir, "store.json"));
  const serverPlan = serverStorage.saveObservationPlan({ ...draft });
  assert.equal(first.plan.id, serverPlan.id);
});

test("browser mode adopts a legacy timestamp plan when the same name is regenerated", async () => {
  const runtime = await createBrowserRuntime(async () => response({}));
  const searchLogic = {
    baseMode: "only",
    keywords: ["douyin"],
    customQueries: [{ key: "core", label: "抖音", query: "douyin in:name" }]
  };

  const legacy = await savePlan(runtime.api, { id: "plan-1700000000000", name: "抖音", searchLogic });
  assert.equal(legacy.plan.id, "plan-1700000000000");

  // Regenerating「抖音」must reuse the plan that owns the pool rather than
  // forking a second plan with an empty project list.
  const regenerated = await savePlan(runtime.api, { name: "抖音", searchLogic });
  assert.equal(regenerated.plan.id, legacy.plan.id);
  assert.equal(
    (await runtime.api.handle("/api/observation-plans")).plans.filter((plan) => !plan.builtIn).length,
    1
  );
});

test("browser scan resumes after refresh from the last completed profile", async () => {
  const firstSearches = [];
  const first = await createBrowserRuntime(async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/rate_limit")) return githubResponse(url, {});
    const query = parsed.searchParams.get("q") || "";
    firstSearches.push(query);
    if (query.includes("second-anchor")) return new Promise(() => {});
    return githubResponse(url, { items: [repository("acme/first", 1, { description: "first-anchor toolkit" })] });
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
    // The first profile is only checkpointed before the second request is
    // issued, so wait for both instead of racing the next fetch.
    if (checkpoint?.completedProfiles?.length === 1 && firstSearches.length === 2) break;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.equal(checkpoint?.completedProfiles?.length, 1);
  assert.deepEqual(firstSearches, ["first-anchor in:name archived:false mirror:false", "second-anchor in:name archived:false mirror:false"]);

  const resumedSearches = [];
  const resumed = await createBrowserRuntime(async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/rate_limit")) return githubResponse(url, {});
    const query = parsed.searchParams.get("q") || "";
    resumedSearches.push(query);
    return githubResponse(url, { items: [repository("acme/second", 2, { description: "second-anchor toolkit" })] });
  }, { reset: false });
  const completed = await waitForTask(resumed.api, started.task.id);

  assert.equal(completed.status, "completed");
  assert.deepEqual(resumedSearches, ["second-anchor in:name archived:false mirror:false"]);
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
      validateProvider: false,
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
      validateProvider: false,
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
  assert.equal(modelCalls, 1);
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

test("browser scan trips an account cooldown on a secondary GitHub rate limit without retrying", async () => {
  const searchQueries = [];
  const runtime = await createBrowserRuntime(async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/rate_limit")) return githubResponse(url, {});
    searchQueries.push(parsed.searchParams.get("q") || "");
    return response({ message: "You have exceeded a secondary rate limit" }, 403, { "retry-after": "2" });
  });
  const { api, storage } = runtime;
  await api.handle("/api/settings", { method: "POST", body: JSON.stringify({ githubToken: "test-token" }) });
  await savePlan(api, {
    id: "cooldown-secondary",
    name: "Cooldown secondary",
    searchLogic: {
      baseMode: "only",
      keywords: ["cooldown-anchor"],
      customQueries: [{ key: "cooldown-core", label: "Cooldown", query: "cooldown-anchor in:name" }]
    }
  });
  await activatePlan(api, "cooldown-secondary");

  const started = await api.handle("/api/scan", { method: "POST", body: JSON.stringify({ mode: "manual" }) });
  const completed = await waitForTask(api, started.task.id);

  assert.equal(completed.status, "failed");
  // GitHub escalates repeated calls inside a penalty window, so the scan must
  // end on the first rate-limited response instead of retrying.
  assert.deepEqual(searchQueries, ["cooldown-anchor in:name archived:false mirror:false"]);
  assert.equal(completed.cooldown.active, true);
  assert.equal(completed.cooldown.reason, "secondary");
  assert.match(completed.cooldown.message, /冷却|限流/);
  assert.ok(completed.cooldown.remainingSeconds > 0);
  assert.ok(Date.parse(completed.cooldown.until) > Date.now());

  const status = await api.handle("/api/scan/status");
  assert.equal(status.status, "cooling");
  assert.equal(status.stage, "cooling");
  assert.equal(status.cooling, true);
  assert.equal(status.running, false);
  assert.equal(status.percent, 0);
  assert.equal(status.cooldown.active, true);
  assert.equal(status.cooldown.reason, "secondary");
  assert.ok(status.cooldown.remainingSeconds > 0);

  const taskList = await api.handle("/api/tasks?type=scan");
  assert.equal(taskList.cooling, true);
  assert.equal(taskList.cooldown.reason, "secondary");
  assert.equal(taskList.tasks[0].cooldown.active, true);

  const tasksBefore = Object.keys((await storage.getSnapshot({ includeProjects: false })).store.tasks).length;
  await assert.rejects(
    api.handle("/api/scan", { method: "POST", body: JSON.stringify({ mode: "manual" }) }),
    (error) => error.status === 429 && error.code === "GITHUB_COOLDOWN" && error.cooldown?.active === true
  );
  const tasksAfter = Object.keys((await storage.getSnapshot({ includeProjects: false })).store.tasks).length;
  assert.equal(tasksAfter, tasksBefore);
  assert.equal(searchQueries.length, 1);
});

test("browser scan trips the same cooldown when GitHub reports the primary quota is exhausted", async () => {
  const searchQueries = [];
  const runtime = await createBrowserRuntime(async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/rate_limit")) return githubResponse(url, {});
    searchQueries.push(parsed.searchParams.get("q") || "");
    return response({ message: "API rate limit exceeded" }, 403, {
      "x-ratelimit-remaining": "0",
      "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 2)
    });
  });
  const { api, storage } = runtime;
  await api.handle("/api/settings", { method: "POST", body: JSON.stringify({ githubToken: "test-token" }) });
  await savePlan(api, {
    id: "cooldown-primary",
    name: "Cooldown primary",
    searchLogic: {
      baseMode: "only",
      keywords: ["cooldown-anchor"],
      customQueries: [{ key: "cooldown-core", label: "Cooldown", query: "cooldown-anchor in:name" }]
    }
  });
  await activatePlan(api, "cooldown-primary");

  const started = await api.handle("/api/scan", { method: "POST", body: JSON.stringify({ mode: "manual" }) });
  const completed = await waitForTask(api, started.task.id);

  assert.equal(completed.status, "failed");
  assert.equal(searchQueries.length, 1);
  assert.equal(completed.cooldown.active, true);
  assert.equal(completed.cooldown.reason, "primary");
  assert.ok(completed.cooldown.remainingSeconds > 0);
  assert.equal(await storage.countProjects(), 0);

  const status = await api.handle("/api/scan/status");
  assert.equal(status.cooling, true);
  assert.equal(status.running, false);
  assert.equal(status.cooldown.reason, "primary");
});

test("browser cooldown survives a refresh and releases the queued scan once it expires", async () => {
  const requests = [];
  let limited = true;
  const handler = async (url) => {
    const parsed = new URL(url);
    requests.push({ path: parsed.pathname, search: /\/search\//.test(parsed.pathname), at: Date.now() });
    if (parsed.pathname.endsWith("/rate_limit")) return githubResponse(url, {});
    if (limited) {
      limited = false;
      return response({ message: "You have exceeded a secondary rate limit" }, 403, { "retry-after": "2" });
    }
    return response({ total_count: 1, items: [repository("acme/cooldown-anchor-tool", 7)] });
  };
  const searchRequests = () => requests.filter((item) => item.search);

  const first = await createBrowserRuntime(handler);
  await first.api.handle("/api/settings", { method: "POST", body: JSON.stringify({ githubToken: "test-token" }) });
  await savePlan(first.api, {
    id: "cooldown-resume",
    name: "Cooldown resume",
    searchLogic: {
      baseMode: "only",
      keywords: ["cooldown-anchor"],
      customQueries: [{ key: "cooldown-core", label: "Cooldown", query: "cooldown-anchor in:name" }]
    }
  });
  await activatePlan(first.api, "cooldown-resume");
  const started = await first.api.handle("/api/scan", { method: "POST", body: JSON.stringify({ mode: "manual" }) });
  const failed = await waitForTask(first.api, started.task.id);

  assert.equal(failed.status, "failed");
  assert.equal(failed.cooldown.reason, "secondary");
  const cooldownUntil = Date.parse(failed.cooldown.until);
  assert.ok(cooldownUntil > Date.now());
  assert.equal(searchRequests().length, 1);

  // The breaker is persisted, so a refreshed tab restores it instead of
  // handing the account straight back to GitHub.
  let stored = null;
  for (let index = 0; index < 100; index += 1) {
    stored = await first.storage.getValue("githubCooldown");
    if (stored?.active) break;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.equal(stored?.active, true);
  assert.equal(stored.reason, "secondary");
  assert.equal(Date.parse(stored.until), cooldownUntil);

  // Simulate a scan that was queued before the tab was reopened. It must stay
  // queued (not run, not fail) until the persisted countdown lapses.
  const raw = await first.storage.getSnapshot({ includeProjects: false });
  raw.store.tasks["queued-cooldown-scan"] = {
    id: "queued-cooldown-scan",
    type: "scan",
    key: "scan",
    status: "queued",
    attempts: 0,
    input: { mode: "manual", observationPlanId: "cooldown-resume" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await first.storage.putSnapshot(raw, { preserveProjects: true });

  const resumed = await createBrowserRuntime(handler, { reset: false });
  const cooling = await resumed.api.handle("/api/scan/status");
  assert.equal(cooling.status, "cooling");
  assert.equal(cooling.cooling, true);
  assert.equal(cooling.running, false);
  assert.equal(cooling.cooldown.reason, "secondary");
  assert.ok(cooling.cooldown.remainingSeconds > 0);
  assert.equal(cooling.task.status, "queued");
  assert.equal(searchRequests().length, 1);

  // The status read is also the recovery point: once the countdown lapses the
  // queued scan resumes and completes without any manual retry.
  let released = cooling;
  for (let index = 0; index < 120 && released.cooling; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    released = await resumed.api.handle("/api/scan/status");
  }
  assert.equal(released.cooling, false);

  const completed = await waitForTask(resumed.api, "queued-cooldown-scan");
  assert.equal(completed.status, "completed");
  assert.equal(searchRequests().length, 2);
  // Everything after the rate-limited hit has to wait for the countdown; the
  // first entry is the response that tripped the breaker.
  assert.ok(
    searchRequests().slice(1).every((item) => item.at >= cooldownUntil - 50),
    `no GitHub request may be issued during the cooldown window: ${JSON.stringify(searchRequests())}`
  );
  assert.deepEqual(
    (await resumed.storage.getProjectsByPlan("cooldown-resume")).map((item) => item.fullName),
    ["acme/cooldown-anchor-tool"]
  );
});

test("browser scan keeps every matching profile for a repository", async () => {
  const searchQueries = [];
  const runtime = await createBrowserRuntime(async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/rate_limit")) return githubResponse(url, {});
    searchQueries.push(parsed.searchParams.get("q") || "");
    return githubResponse(url, {
      items: [repository("acme/shared-cad-tool", 88, { description: "STEP and DXF CAD exchange toolkit" })]
    });
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

test("browser scan rejects popular repositories that miss the plan domain anchors", async () => {
  const runtime = await createBrowserRuntime(async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/rate_limit")) return githubResponse(url, {});
    return githubResponse(url, {
      total_count: 120,
      items: [
        repository("ocornut/imgui", 1),
        repository("jaywcjlove/linux-command", 2),
        {
          ...repository("comfyanonymous/ComfyUI", 3),
          description: "The most powerful and modular diffusion model GUI and backend"
        },
        {
          ...repository("acme/photoshop-uxp-plugin", 4),
          description: "Adobe Photoshop UXP plugin for PSD batch editing",
          topics: ["photoshop", "adobe", "psd"]
        }
      ]
    });
  });
  const { api, storage } = runtime;
  await api.handle("/api/settings", { method: "POST", body: JSON.stringify({ githubToken: "test-token" }) });
  await savePlan(api, {
    id: "photoshop",
    name: "Photoshop 插件",
    searchLogic: {
      baseMode: "only",
      keywords: ["Photoshop", "PSD", "UXP"],
      customQueries: [
        {
          profileId: "photoshop-core",
          label: "Photoshop 插件",
          query: "Photoshop plugin in:name,description,readme archived:false mirror:false"
        }
      ]
    }
  });
  await activatePlan(api, "photoshop");

  const started = await api.handle("/api/scan", { method: "POST", body: JSON.stringify({ mode: "manual" }) });
  const completed = await waitForTask(api, started.task.id);

  assert.equal(completed.status, "completed");
  assert.deepEqual(
    (await storage.getProjectsByPlan("photoshop")).map((item) => item.fullName),
    ["acme/photoshop-uxp-plugin"]
  );
});

test("browser scan relaxes a sparse domain once while preserving scope and exclusions", async () => {
  const searchQueries = [];
  const runtime = await createBrowserRuntime(async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/rate_limit")) return githubResponse(url, {});
    const query = parsed.searchParams.get("q") || "";
    searchQueries.push(query);
    if (/\b(?:stars|pushed|created):/i.test(query)) {
      return githubResponse(url, { total_count: 3, items: [repository("ocornut/imgui", 1)] });
    }
    return githubResponse(url, {
      total_count: 18,
      items: [
        {
          ...repository("acme/rarebus-sdk", 2),
          description: "RareBus protocol SDK and device integration tooling",
          topics: ["rarebus", "protocol"]
        }
      ]
    });
  });
  const { api, storage } = runtime;
  await api.handle("/api/settings", { method: "POST", body: JSON.stringify({ githubToken: "test-token" }) });
  await savePlan(api, {
    id: "rarebus",
    name: "RareBus 协议",
    searchLogic: {
      baseMode: "only",
      keywords: ["RareBus", "RareBus protocol"],
      customQueries: [
        {
          profileId: "rarebus-core",
          label: "RareBus 协议",
          query:
            "RareBus protocol in:name,description,readme archived:false mirror:false stars:>50 pushed:>=2025-01-01 -topic:awesome -topic:tutorial"
        }
      ]
    }
  });
  await activatePlan(api, "rarebus");

  const started = await api.handle("/api/scan", { method: "POST", body: JSON.stringify({ mode: "manual" }) });
  const completed = await waitForTask(api, started.task.id);
  const relaxation = completed.result.scan.relaxations[0];

  assert.equal(completed.status, "completed");
  assert.equal(searchQueries.length, 2);
  assert.equal(searchQueries[0], "RareBus protocol in:name,description,readme archived:false mirror:false stars:>50 pushed:>=2025-01-01 -topic:awesome -topic:tutorial");
  assert.equal(searchQueries[1], "RareBus protocol in:name,description,readme archived:false mirror:false -topic:awesome -topic:tutorial");
  assert.equal(relaxation.reportedTotalCount, 3);
  assert.equal(relaxation.matchedBeforeRelaxation, 0);
  assert.equal(relaxation.matchedAfterRelaxation, 1);
  assert.deepEqual((await storage.getProjectsByPlan("rarebus")).map((item) => item.fullName), ["acme/rarebus-sdk"]);
});

test("browser plan queries are completed on save and hydration so the scan runs the reviewed query", async () => {
  const searchQueries = [];
  const runtime = await createBrowserRuntime(async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/rate_limit")) return githubResponse(url, {});
    searchQueries.push(parsed.searchParams.get("q") || "");
    return githubResponse(url, {
      total_count: 6,
      items: [
        {
          ...repository("acme/step-cad", 1),
          description: "STEP and CAD exchange toolkit for manufacturing pipelines",
          topics: ["step", "cad"]
        }
      ]
    });
  });
  const { api, storage } = runtime;
  await api.handle("/api/settings", { method: "POST", body: JSON.stringify({ githubToken: "test-token" }) });

  const handWritten = "STEP CAD stars:>50 -topic:awesome";
  const completedQuery = "STEP CAD stars:>50 -topic:awesome in:name,description,readme archived:false mirror:false";
  const saved = await savePlan(api, {
    id: "cad",
    name: "CAD 交换格式",
    searchLogic: {
      baseMode: "only",
      keywords: ["STEP", "CAD"],
      customQueries: [{ profileId: "cad-step", label: "STEP CAD", query: handWritten }]
    }
  });

  // Saving a hand-written plan completes the missing scope qualifiers and keeps
  // every limit or exclusion the user declared.
  assert.equal(saved.plan.searchLogic.customQueries[0].query, completedQuery);

  // A legacy record written before that rule existed is completed on hydration,
  // so the query the user reviews is the query the scan executes.
  const raw = await storage.getSnapshot({ includeProjects: false });
  raw.store.observationPlans.cad.searchLogic.customQueries[0].query = handWritten;
  await storage.putSnapshot(raw, { preserveProjects: true, preserveLeaderboards: true });
  const plans = await api.handle("/api/observation-plans");
  const hydrated = plans.plans.find((item) => item.id === "cad");
  assert.equal(hydrated.searchLogic.customQueries[0].query, completedQuery);

  await activatePlan(api, "cad");
  const started = await api.handle("/api/scan", { method: "POST", body: JSON.stringify({ mode: "manual" }) });
  const completed = await waitForTask(api, started.task.id);

  assert.equal(completed.status, "completed");
  assert.equal(searchQueries[0], completedQuery);
  assert.ok(searchQueries.every((query) => /in:name,description,readme archived:false mirror:false/.test(query)));
  assert.ok(searchQueries.every((query) => query.includes("-topic:awesome")));
});

test("focused and blend modes admit default profiles without applying custom plan anchors", async () => {
  for (const [baseMode, expectedQueries] of [["focused", 11], ["blend", 31]]) {
    const searchQueries = [];
    const runtime = await createBrowserRuntime(async (url) => {
      const parsed = new URL(url);
      if (parsed.pathname.endsWith("/rate_limit")) return githubResponse(url, {});
      const query = parsed.searchParams.get("q") || "";
      searchQueries.push(query);
      if (query.includes("Photoshop plugin")) {
        return githubResponse(url, {
          total_count: 120,
          items: [
            {
              ...repository("acme/photoshop-uxp-plugin", 1),
              description: "Adobe Photoshop UXP plugin for PSD editing",
              topics: ["photoshop"]
            }
          ]
        });
      }
      if (query.includes("self hosted app")) {
        return githubResponse(url, {
          total_count: 120,
          items: [
            {
              ...repository("acme/default-only", 2),
              description: "Self-hosted app for team knowledge",
              topics: ["self-hosted"]
            }
          ]
        });
      }
      return githubResponse(url, { total_count: 120, items: [] });
    });
    const { api, storage } = runtime;
    await api.handle("/api/settings", { method: "POST", body: JSON.stringify({ githubToken: "test-token" }) });
    await savePlan(api, {
      id: `photoshop-${baseMode}`,
      name: "Photoshop 插件",
      searchLogic: {
        baseMode,
        keywords: ["Photoshop", "PSD", "UXP"],
        customQueries: [
          {
            profileId: "photoshop-core",
            label: "Photoshop 插件",
            query: "Photoshop plugin in:name,description,readme archived:false mirror:false"
          }
        ]
      }
    });
    await activatePlan(api, `photoshop-${baseMode}`);
    const planResponse = await api.handle("/api/observation-plans");
    assert.equal(planResponse.active.searchLogic.baseMode, baseMode);

    const started = await api.handle("/api/scan", { method: "POST", body: JSON.stringify({ mode: "manual" }) });
    const completed = await waitForTask(api, started.task.id);

    assert.equal(completed.status, "completed");
    assert.equal(searchQueries.length, expectedQueries, `${baseMode}: ${JSON.stringify(completed.result.scan.profiles)}`);
    assert.deepEqual(
      (await storage.getProjectsByPlan(`photoshop-${baseMode}`)).map((item) => item.fullName).sort(),
      ["acme/default-only", "acme/photoshop-uxp-plugin"],
      baseMode
    );
  }
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

test("static demo snapshot carries 25 unique public repositories and no credential fields", () => {
  const snapshot = demoSnapshot();

  assert.equal(snapshot.schema, DEMO_SNAPSHOT_SCHEMA);
  assert.match(String(snapshot.generatedAt), /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(snapshot.plan.id, "demo-content");
  assert.ok(String(snapshot.plan.name || "").length > 0);
  assert.ok(String(snapshot.plan.nameEn || "").length > 0);
  assert.ok(snapshot.plan.requirements.length >= 3);

  assert.ok(snapshot.profiles.length >= 5);
  assert.equal(new Set(snapshot.profiles.map((profile) => profile.key)).size, snapshot.profiles.length);
  for (const profile of snapshot.profiles) {
    assert.match(String(profile.key), /^demo-[a-z0-9-]+$/);
    assert.ok(String(profile.labelZh || "").length > 0);
    assert.ok(String(profile.labelEn || "").length > 0);
  }

  assert.equal(snapshot.items.length, 25);
  assert.equal(new Set(snapshot.items.map((item) => item.repository.full_name)).size, 25);
  for (const item of snapshot.items) {
    const repositoryRecord = item.repository;
    assert.ok(Number(repositoryRecord.id) > 0, `${repositoryRecord.full_name} keeps its GitHub repository id`);
    assert.match(String(repositoryRecord.full_name), /^[^/]+\/[^/]+$/);
    assert.match(String(repositoryRecord.html_url), /^https:\/\/github\.com\/[^/]+\/[^/]+$/);
    assert.ok(Number(repositoryRecord.stargazers_count) > 0, `${repositoryRecord.full_name} keeps live star counts`);
    assert.ok(String(repositoryRecord.pushed_at || "").length > 0);
    assert.equal(repositoryRecord.archived, false);
    assert.equal(repositoryRecord.disabled, false);
    assert.ok(
      snapshot.profiles.some((profile) => profile.key === item.profileKey),
      `${repositoryRecord.full_name} is filed under a declared profile`
    );
  }
  assert.equal(
    new Set(snapshot.items.map((item) => item.profileKey)).size,
    snapshot.profiles.length,
    "every demo profile contributes at least one repository"
  );

  // The demo file is published to a static host, so it must never carry a
  // credential field. GitHub's license object is the only allowed `key`.
  assert.deepEqual(credentialFieldPaths(snapshot), []);
});

test("static demo seeds a real sample workspace on the first visit", async () => {
  const fetchImpl = demoFetch();
  const runtime = await createBrowserRuntime(fetchImpl, { bootstrap: true });

  const plans = await runtime.api.handle("/api/observation-plans");
  assert.equal(plans.active.id, "demo-content");
  assert.ok(plans.plans.some((plan) => plan.id === "demo-content"));
  assert.equal(plans.plans.find((plan) => plan.id === "demo-content").sample, true);

  const projects = await runtime.api.handle("/api/projects?limit=all");
  assert.equal(projects.total, 25);
  assert.ok(projects.items.every((project) => project.fullName.includes("/")));

  const snapshot = await runtime.storage.getSnapshot({ includeProjects: true, includeLeaderboards: true });
  assert.equal(snapshot.activeObservationPlanId, "demo-content");
  assert.equal(Object.keys(snapshot.store.projects).length, 25);
  assert.equal(snapshot.counts.projects, 25);
  assert.equal(snapshot.store.scans.length, 1);
  assert.equal(snapshot.store.scans[0].status, "completed");
  assert.equal(snapshot.store.scans[0].mode, "static-demo-snapshot");
  assert.equal(snapshot.store.scans[0].observationPlanId, "demo-content");

  const archiveDates = Object.keys(snapshot.store.leaderboards.byPlan["demo-content"].daily);
  assert.equal(archiveDates.length, 1);
  assert.equal(snapshot.store.leaderboards.byPlan["demo-content"].daily[archiveDates[0]].source, "static-demo-snapshot");
  assert.ok(snapshot.store.leaderboards.byPlan["demo-content"].daily[archiveDates[0]].items.length > 0);

  const leaderboard = await runtime.api.handle("/api/leaderboard");
  assert.equal(leaderboard.period, "daily");
  assert.ok(leaderboard.items.length > 0);

  assert.deepEqual(fetchImpl.calls, ["http://127.0.0.1:4173/demo-snapshot.json"]);
  await runtime.api.handle("/api/projects?limit=all");
  await runtime.api.handle("/api/leaderboard");
  assert.deepEqual(fetchImpl.calls, ["http://127.0.0.1:4173/demo-snapshot.json"]);
});

test("static deployment routes API calls directly to IndexedDB", async () => {
  const runtime = await createBrowserRuntime(async () => {
    throw new Error("static deployment must not probe a backend");
  }, { deployment: "static" });

  assert.equal(runtime.api.isStaticDeployment(), true);
  assert.equal(runtime.api.localModeForced(), true);
  assert.equal(runtime.api.shouldUseLocal("/api/config"), true);
  const config = await runtime.api.handle("/api/config");
  assert.equal(config.runtime, "browser-indexeddb");
});

test("static demo does not seed twice when the page is reloaded", async () => {
  const first = demoFetch();
  const seeded = await createBrowserRuntime(first, { bootstrap: true });
  assert.equal((await seeded.api.handle("/api/projects?limit=all")).total, 25);

  const reloadedFetch = demoFetch();
  const reloaded = await createBrowserRuntime(reloadedFetch, { bootstrap: true, reset: false });
  assert.equal((await reloaded.api.handle("/api/projects?limit=all")).total, 25);

  const snapshot = await reloaded.storage.getSnapshot({ includeProjects: true, includeLeaderboards: true });
  assert.equal(Object.keys(snapshot.store.projects).length, 25);
  assert.equal(snapshot.store.scans.length, 1);
  assert.equal(Object.keys(snapshot.store.leaderboards.byPlan["demo-content"].daily).length, 1);
  assert.deepEqual(reloadedFetch.calls, []);
});

test("concurrent first requests share a single demo snapshot fetch", async () => {
  const fetchImpl = demoFetch();
  const runtime = await createBrowserRuntime(fetchImpl, { bootstrap: true });

  await Promise.all([
    runtime.api.handle("/api/observation-plans"),
    runtime.api.handle("/api/projects?limit=all"),
    runtime.api.handle("/api/leaderboard"),
    runtime.api.handle("/api/summary")
  ]);

  assert.deepEqual(fetchImpl.calls, ["http://127.0.0.1:4173/demo-snapshot.json"]);
});

test("static demo resolves the snapshot against the GitHub Pages sub path", async () => {
  const fetchImpl = demoFetch();
  const runtime = await createBrowserRuntime(fetchImpl, {
    bootstrap: true,
    baseURI: "https://hachikoj.github.io/starvault-imprint/"
  });

  assert.equal((await runtime.api.handle("/api/projects?limit=all")).total, 25);
  assert.deepEqual(fetchImpl.calls, [
    "https://hachikoj.github.io/starvault-imprint/demo-snapshot.json"
  ]);
});

test("unit tests without the bootstrap flag keep an empty workspace", async () => {
  const fetchImpl = demoFetch();
  const runtime = await createBrowserRuntime(fetchImpl);

  const projects = await runtime.api.handle("/api/projects?limit=all");
  assert.equal(projects.total, 0);
  assert.deepEqual(fetchImpl.calls, []);

  const plans = await runtime.api.handle("/api/observation-plans");
  assert.equal(plans.active.id, "default");
  assert.equal(plans.plans.some((plan) => plan.id === "demo-content"), false);
});

test("static demo never overwrites an existing key, pool or plan", async () => {
  const withSecret = await createBrowserRuntime(async () => response({}));
  await withSecret.api.handle("/api/settings", {
    method: "POST",
    body: JSON.stringify({ githubToken: "private-token" })
  });

  const secretFetch = demoFetch();
  const secretRuntime = await createBrowserRuntime(secretFetch, { bootstrap: true, reset: false });
  assert.equal((await secretRuntime.api.handle("/api/projects?limit=all")).total, 0);
  assert.deepEqual(secretFetch.calls, []);
  const secretSeed = await secretRuntime.storage.getValue("starvault.demoSeed");
  assert.equal(secretSeed.mode, "skipped");
  assert.equal(secretSeed.reason, "secrets");

  const withProjects = await createBrowserRuntime(async () => response({}));
  await withProjects.storage.putProjects([
    {
      fullName: "acme/kept",
      name: "kept",
      owner: "acme",
      url: "https://github.com/acme/kept",
      observationPlanMatches: { default: { planId: "default" } }
    }
  ]);

  const poolFetch = demoFetch();
  const poolRuntime = await createBrowserRuntime(poolFetch, { bootstrap: true, reset: false });
  const pool = await poolRuntime.api.handle("/api/projects?limit=all");
  assert.equal(pool.total, 1);
  assert.equal(pool.items[0].fullName, "acme/kept");
  assert.deepEqual(poolFetch.calls, []);

  const planFetch = demoFetch();
  const planRuntime = await createBrowserRuntime(planFetch, { bootstrap: true, reset: false });
  await planRuntime.api.handle("/api/observation-plans/delete", {
    method: "POST",
    body: JSON.stringify({ id: "default" })
  }).catch(() => {});
  const plans = await planRuntime.api.handle("/api/observation-plans");
  assert.equal(plans.plans.some((plan) => plan.id === "demo-content"), false);
});

test("static demo refuses a snapshot that smuggles credential fields", async () => {
  const tampered = demoSnapshot();
  tampered.items[0].repository.apiToken = "fixture-value-that-must-never-be-seeded";
  const fetchImpl = demoFetch(tampered);
  const runtime = await createBrowserRuntime(fetchImpl, { bootstrap: true });

  const projects = await runtime.api.handle("/api/projects?limit=all");
  assert.equal(projects.total, 0);
  const seed = await runtime.storage.getValue("starvault.demoSeed");
  assert.equal(seed.mode, "rejected");
  const snapshot = await runtime.storage.getSnapshot({ includeProjects: true, includeLeaderboards: true });
  assert.equal((snapshot?.store?.scans || []).length, 0);
});

test("a missing demo snapshot leaves the static app usable without retry loops", async () => {
  const fetchImpl = demoFetch(null, { missingDemo: true });
  const runtime = await createBrowserRuntime(fetchImpl, { bootstrap: true });

  assert.equal((await runtime.api.handle("/api/projects?limit=all")).total, 0);
  assert.equal(fetchImpl.calls.length, 1);

  // A static host that lacks the demo file retries once, then stays empty
  // instead of hammering the host for every later request.
  assert.equal((await runtime.api.handle("/api/observation-plans")).active.id, "default");
  assert.equal(fetchImpl.calls.length, 2);
  assert.equal((await runtime.api.handle("/api/settings")).githubTokenSet, false);
  assert.equal((await runtime.api.handle("/api/config")).githubConfigured, false);
  assert.equal(fetchImpl.calls.length, 2);
  await runtime.api.handle("/api/projects?limit=all");
  assert.equal(fetchImpl.calls.length, 2);
});
