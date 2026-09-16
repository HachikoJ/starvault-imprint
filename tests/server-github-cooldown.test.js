const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "starvault-server-cooldown-"));
const storePath = path.join(tempDir, "starvault.db");

process.env.STORE_PATH = storePath;
process.env.GITHUB_TOKEN = "test-token";
process.env.AUTH_TOKEN = "";
process.env.HOST = "127.0.0.1";
process.env.RUN_SCAN_ON_BOOT = "false";

const { server, initializeRuntime } = require("../src/server");
const { clearGithubCooldown } = require("../src/lib/github");
const { createStorage } = require("../src/lib/storage");

const originalFetch = global.fetch;

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

async function waitForTask(baseUrl, id, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await request(baseUrl, `/api/tasks/${encodeURIComponent(id)}`);
    if (!["queued", "running"].includes(response.body?.task?.status)) return response.body.task;
    await sleep(25);
  }
  throw new Error(`Task ${id} did not finish within ${timeoutMs}ms`);
}

test("Node scan cooldown rejects duplicate work and persists the GitHub breaker", async (t) => {
  const githubRequests = [];
  global.fetch = async (input, init = {}) => {
    const rawUrl = typeof input === "string" ? input : input.url;
    const url = new URL(rawUrl);
    if (url.hostname !== "api.github.com") return originalFetch(input, init);

    githubRequests.push({
      path: url.pathname,
      query: url.searchParams.get("q") || "",
      at: Date.now()
    });
    if (url.pathname === "/user") {
      return jsonResponse({
        login: "starvault-test",
        name: "StarVault Test",
        html_url: "https://github.com/starvault-test",
        public_repos: 1
      });
    }
    if (url.pathname === "/rate_limit") {
      const reset = Math.floor(Date.now() / 1000) + 60;
      return jsonResponse({
        resources: {
          core: { limit: 5000, remaining: 4990, reset },
          search: { limit: 30, remaining: 28, reset },
          graphql: { limit: 5000, remaining: 4990, reset }
        }
      });
    }
    if (url.pathname === "/search/repositories") {
      return jsonResponse(
        { message: "You have exceeded a secondary rate limit" },
        403,
        { "retry-after": "2" }
      );
    }
    throw new Error(`Unexpected GitHub request: ${url}`);
  };

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
  const baseUrl = `http://127.0.0.1:${port}`;

  const saved = await request(baseUrl, "/api/observation-plans", {
    method: "POST",
    body: {
      plan: {
        id: "server-cooldown",
        name: "Server cooldown",
        searchLogic: {
          baseMode: "only",
          keywords: ["server-cooldown-anchor"],
          customQueries: [
            {
              key: "server-cooldown-core",
              label: "Server cooldown",
              query: "server-cooldown-anchor in:name"
            }
          ]
        }
      }
    }
  });
  assert.equal(saved.status, 200);

  const activated = await request(baseUrl, "/api/observation-plans/active", {
    method: "POST",
    body: { id: "server-cooldown" }
  });
  assert.equal(activated.status, 200);

  const started = await request(baseUrl, "/api/scan", {
    method: "POST",
    body: { mode: "manual" }
  });
  assert.equal(started.status, 202);

  const task = await waitForTask(baseUrl, started.body.task.id);
  assert.equal(task.status, "failed");
  assert.equal(task.cooldown.active, true);
  assert.equal(task.cooldown.reason, "secondary");
  assert.ok(task.cooldown.remainingSeconds > 0);
  assert.match(task.cooldown.message, /冷却|限流/);

  const searchRequests = githubRequests.filter((item) => item.path === "/search/repositories");
  assert.equal(searchRequests.length, 1, "a rate-limited search must not be retried");
  assert.match(searchRequests[0].query, /server-cooldown-anchor/);

  const status = await request(baseUrl, "/api/scan/status");
  assert.equal(status.body.status, "cooling");
  assert.equal(status.body.stage, "cooling");
  assert.equal(status.body.running, false);
  assert.equal(status.body.cooling, true);
  assert.equal(status.body.cooldown.reason, "secondary");
  assert.ok(status.body.cooldown.remainingSeconds > 0);
  assert.equal(status.body.task.status, "failed");
  assert.equal(status.body.task.cooldown.reason, "secondary");

  const tasksBeforeRejectedScan = await request(baseUrl, "/api/tasks?type=scan&limit=30");
  const rejected = await request(baseUrl, "/api/scan", {
    method: "POST",
    body: { mode: "manual" }
  });
  assert.equal(rejected.status, 429);
  assert.equal(rejected.body.error, "GITHUB_COOLDOWN");
  assert.equal(rejected.body.cooldown.reason, "secondary");

  const tasksAfterRejectedScan = await request(baseUrl, "/api/tasks?type=scan&limit=30");
  assert.equal(tasksAfterRejectedScan.body.tasks.length, tasksBeforeRejectedScan.body.tasks.length);
  assert.equal(
    githubRequests.filter((item) => item.path === "/search/repositories").length,
    1,
    "the cooling scan endpoint must not reach GitHub"
  );

  const persisted = createStorage(storePath).getRuntimeState("githubCooldown");
  assert.equal(persisted.active, true);
  assert.equal(persisted.reason, "secondary");
  assert.equal(persisted.until, task.cooldown.until);
  assert.ok(Date.parse(persisted.until) > Date.now());
});
