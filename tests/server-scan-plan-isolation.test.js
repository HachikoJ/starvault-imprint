const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "starvault-plan-isolation-"));

process.env.STORE_PATH = path.join(tempDir, "starvault.db");
process.env.GITHUB_TOKEN = "test-token";
process.env.AUTH_TOKEN = "";
process.env.HOST = "127.0.0.1";
process.env.RUN_SCAN_ON_BOOT = "false";

const { server, initializeRuntime } = require("../src/server");
const { clearGithubCooldown } = require("../src/lib/github");

const originalFetch = global.fetch;
const PLAN_A = "plan-isolation-a";
const PLAN_B = "plan-isolation-b";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jsonResponse(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json",
      ...headers
    }
  });
}

async function request(baseUrl, pathname, options = {}) {
  const response = await originalFetch(`${baseUrl}${pathname}`, {
    method: options.method || "GET",
    headers: options.body ? { "content-type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await response.text();
  return {
    status: response.status,
    body: text ? JSON.parse(text) : null
  };
}

async function waitForTask(baseUrl, id, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await request(baseUrl, `/api/tasks/${encodeURIComponent(id)}`);
    const task = response.body?.task;
    if (!task) throw new Error(`Task ${id} lookup failed: ${response.status} ${JSON.stringify(response.body)}`);
    if (!["queued", "running"].includes(task.status)) return task;
    // Keep test polling below the API limiter's 240 requests/minute budget.
    await sleep(400);
  }
  throw new Error(`Task ${id} did not finish within ${timeoutMs}ms`);
}

async function waitForScanStatus(baseUrl, planId, predicate, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    const response = await request(baseUrl, `/api/scan/status?observationPlanId=${encodeURIComponent(planId)}`);
    last = response.body;
    if (predicate(last)) return last;
    await sleep(400);
  }
  throw new Error(`Scan status for ${planId} never matched: ${JSON.stringify(last)}`);
}

function planRepository(owner, name) {
  return {
    id: 424242,
    full_name: `${owner}/${name}`,
    name,
    owner: { login: owner, avatar_url: "" },
    html_url: `https://github.com/${owner}/${name}`,
    description: `${owner} toolkit that keeps observation plans isolated`,
    homepage: "",
    language: "TypeScript",
    topics: [owner],
    stargazers_count: 128,
    forks_count: 12,
    watchers_count: 128,
    open_issues_count: 3,
    default_branch: "main",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    pushed_at: "2026-01-01T00:00:00Z",
    license: { key: "mit", name: "MIT License", spdx_id: "MIT", url: "" },
    archived: false,
    disabled: false,
    fork: false
  };
}

function healthyRateLimit() {
  const reset = Math.floor(Date.now() / 1000) + 1800;
  return {
    resources: {
      core: { limit: 5000, remaining: 4990, reset },
      search: { limit: 30, remaining: 29, reset },
      graphql: { limit: 5000, remaining: 4990, reset }
    }
  };
}

function planBody(id, name, query) {
  return {
    plan: {
      id,
      name,
      searchLogic: {
        baseMode: "only",
        keywords: [query],
        minStars: 0,
        customQueries: [{ key: `${id}-core`, label: name, query: `${query} in:name` }]
      }
    }
  };
}

async function startServer(t) {
  t.after(async () => {
    clearGithubCooldown();
    global.fetch = originalFetch;
    if (server.listening) await new Promise((resolve) => server.close(resolve));
  });
  initializeRuntime();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  return `http://127.0.0.1:${port}`;
}

test("scan status, tasks, and pools stay isolated per observation plan", async (t) => {
  let releaseSearch = () => {};
  const searchGate = new Promise((resolve) => {
    releaseSearch = resolve;
  });
  let gateSearch = true;

  global.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    if (url.hostname !== "api.github.com") return originalFetch(input, init);
    if (url.pathname === "/user") {
      return jsonResponse({
        login: "starvault-plan-test",
        name: "StarVault Plan Test",
        html_url: "https://github.com/starvault-plan-test",
        public_repos: 3
      });
    }
    if (url.pathname === "/rate_limit") return jsonResponse(healthyRateLimit());
    if (url.pathname === "/search/repositories") {
      // Hold the scan open so the test can observe a plan that is mid-run.
      if (gateSearch) await searchGate;
      return jsonResponse({
        total_count: 1,
        incomplete_results: false,
        items: [planRepository("starvaultplanprobe", "plan-isolation-toolkit")]
      });
    }
    throw new Error(`Unexpected GitHub request: ${url.pathname}`);
  };

  const baseUrl = await startServer(t);

  const savedA = await request(baseUrl, "/api/observation-plans", {
    method: "POST",
    body: planBody(PLAN_A, "Plan isolation A", "starvaultplanprobe")
  });
  assert.equal(savedA.status, 200);
  const savedB = await request(baseUrl, "/api/observation-plans", {
    method: "POST",
    body: planBody(PLAN_B, "Plan isolation B", "planisolationotherprobe")
  });
  assert.equal(savedB.status, 200);

  await request(baseUrl, "/api/observation-plans/active", { method: "POST", body: { id: PLAN_A } });

  const started = await request(baseUrl, "/api/scan", { method: "POST", body: { mode: "manual" } });
  assert.equal(started.status, 202);
  assert.equal(started.body.observationPlanId, PLAN_A);
  assert.equal(started.body.task.key, `scan:${PLAN_A}`);
  assert.equal(started.body.task.observationPlanId, PLAN_A);

  const running = await waitForScanStatus(baseUrl, PLAN_A, (body) => body.running === true || body.status === "running");
  assert.equal(running.observationPlanId, PLAN_A);

  // While A scans, B has no scan of its own and must not adopt A's task.
  const statusB = await request(baseUrl, `/api/scan/status?observationPlanId=${PLAN_B}`);
  assert.equal(statusB.status, 200);
  assert.equal(statusB.body.observationPlanId, PLAN_B);
  assert.equal(statusB.body.status, "idle");
  assert.equal(statusB.body.running, false);
  assert.equal(statusB.body.hasScan, false);
  assert.equal(statusB.body.task, null);

  const tasksB = await request(baseUrl, `/api/tasks?type=scan&observationPlanId=${PLAN_B}`);
  assert.deepEqual(tasksB.body.tasks, []);
  const tasksA = await request(baseUrl, `/api/tasks?type=scan&observationPlanId=${PLAN_A}`);
  assert.equal(tasksA.body.tasks.length, 1);
  assert.equal(tasksA.body.tasks[0].key, `scan:${PLAN_A}`);
  assert.equal(tasksA.body.tasks[0].observationPlanId, PLAN_A);

  // Switching plans mid-scan must not transfer the running scan to the new plan.
  await request(baseUrl, "/api/observation-plans/active", { method: "POST", body: { id: PLAN_B } });
  const activeStatus = await request(baseUrl, "/api/scan/status");
  assert.equal(activeStatus.body.observationPlanId, PLAN_B);
  assert.equal(activeStatus.body.status, "idle");
  assert.equal(activeStatus.body.running, false);
  assert.equal(activeStatus.body.hasScan, false);
  const stillRunningA = await request(baseUrl, `/api/scan/status?observationPlanId=${PLAN_A}`);
  assert.equal(stillRunningA.body.running, true);
  assert.equal(stillRunningA.body.observationPlanId, PLAN_A);

  gateSearch = false;
  releaseSearch();
  const finished = await waitForTask(baseUrl, started.body.task.id);
  assert.equal(finished.status, "completed");

  // A keeps the pool its own scan produced.
  await request(baseUrl, "/api/observation-plans/active", { method: "POST", body: { id: PLAN_A } });
  const summaryA = await request(baseUrl, "/api/summary");
  assert.equal(summaryA.body.hasScan, true);
  assert.ok(summaryA.body.totalProjects > 0, "plan A should own the scanned projects");
  assert.equal(summaryA.body.lastScan.observationPlanId, PLAN_A);
  const projectsA = await request(baseUrl, "/api/projects?limit=10");
  assert.equal(projectsA.body.items.length, 1);
  assert.equal(projectsA.body.items[0].fullName, "starvaultplanprobe/plan-isolation-toolkit");

  // B stays unscanned: no inherited scan record, projects, or completion state.
  await request(baseUrl, "/api/observation-plans/active", { method: "POST", body: { id: PLAN_B } });
  const summaryB = await request(baseUrl, "/api/summary");
  assert.equal(summaryB.body.hasScan, false);
  assert.equal(summaryB.body.lastScan, null);
  assert.equal(summaryB.body.totalProjects, 0);
  assert.deepEqual(summaryB.body.scans, []);
  const projectsB = await request(baseUrl, "/api/projects?limit=10");
  assert.deepEqual(projectsB.body.items, []);
  const statusBAfter = await request(baseUrl, `/api/scan/status?observationPlanId=${PLAN_B}`);
  assert.equal(statusBAfter.body.status, "idle");
  assert.equal(statusBAfter.body.hasScan, false);
});

test("saving the same Chinese-only plan name twice reuses one plan", async (t) => {
  global.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    if (url.hostname !== "api.github.com") return originalFetch(input, init);
    if (url.pathname === "/rate_limit") return jsonResponse(healthyRateLimit());
    throw new Error(`Unexpected GitHub request: ${url.pathname}`);
  };

  const baseUrl = await startServer(t);
  const body = {
    plan: {
      name: "抖音",
      searchLogic: {
        baseMode: "only",
        keywords: ["douyin"],
        customQueries: [{ key: "core", label: "抖音", query: "douyin in:name" }]
      }
    }
  };

  const first = await request(baseUrl, "/api/observation-plans", { method: "POST", body });
  const second = await request(baseUrl, "/api/observation-plans", { method: "POST", body });

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  // A name that cannot be slugged used to mint a fresh `plan-<timestamp>` id on
  // every save, which split one requirement across plans with separate pools.
  assert.match(first.body.plan.id, /^[a-z0-9-]+$/);
  assert.equal(second.body.plan.id, first.body.plan.id);
  // Other tests in this file share the same data directory, so only the
  // duplicate Chinese plan name is counted here.
  assert.equal(second.body.plans.filter((plan) => plan.name === "抖音").length, 1);
});
