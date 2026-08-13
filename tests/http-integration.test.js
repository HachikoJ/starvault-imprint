const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

function invoke(handle, options = {}) {
  const method = options.method || "GET";
  const host = "127.0.0.1:4173";
  const headers = { host, ...(options.headers || {}) };
  const body = options.body || "";
  if (body && headers["content-length"] === undefined) headers["content-length"] = String(Buffer.byteLength(body));
  const request = {
    method,
    url: options.path || "/",
    headers,
    socket: { remoteAddress: "127.0.0.1" },
    async *[Symbol.asyncIterator]() {
      if (body) yield Buffer.from(body);
    }
  };
  return new Promise((resolve, reject) => {
    const response = {
      status: 0,
      headers: {},
      body: "",
      writableEnded: false,
      writeHead(status, responseHeaders = {}) {
        this.status = status;
        this.headers = Object.fromEntries(Object.entries(responseHeaders).map(([key, value]) => [key.toLowerCase(), String(value)]));
      },
      end(chunk = "") {
        this.body += chunk ? String(chunk) : "";
        this.writableEnded = true;
        resolve(this);
      }
    };
    Promise.resolve(handle(request, response)).catch(reject);
  });
}

test("HTTP server exposes a lightweight core snapshot and paged IndexedDB records", async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "starvault-http-"));
  process.env.HOST = "127.0.0.1";
  process.env.PORT = "4173";
  process.env.STORE_PATH = path.join(dataDir, "starvault.db");
  process.env.RUN_SCAN_ON_BOOT = "0";
  const { handle, initializeRuntime } = require("../src/server");
  initializeRuntime();

  const health = await invoke(handle, { path: "/api/health" });
  assert.equal(health.status, 200);
  assert.equal(health.headers["x-content-type-options"], "nosniff");

  const snapshotResponse = await invoke(handle, { path: "/api/local-snapshot" });
  assert.equal(snapshotResponse.status, 200);
  const snapshot = JSON.parse(snapshotResponse.body);
  assert.equal(snapshot.schema, "starvault-indexeddb-snapshot/v1");
  assert.deepEqual(snapshot.store.projects, {});
  assert.deepEqual(snapshot.store.leaderboards, { daily: {}, byPlan: {} });
  assert.equal(snapshot.sync.projectsIncluded, false);
  assert.equal(snapshot.sync.leaderboardsIncluded, false);
  assert.equal(snapshot.counts.projects, 0);
  assert.equal(snapshot.counts.scans, 0);
  assert.equal(snapshot.counts.observationPlans, 1);

  const firstPageResponse = await invoke(handle, { path: "/api/local-projects?limit=25" });
  assert.equal(firstPageResponse.status, 200);
  const firstPage = JSON.parse(firstPageResponse.body);
  assert.equal(firstPage.schema, "starvault-indexeddb-project-page/v1");
  assert.equal(firstPage.items.length, 0);
  assert.equal(firstPage.done, true);
  assert.equal(firstPage.total, snapshot.counts.projects);
  assert.equal(firstPage.items.some((project) => Object.hasOwn(project, "analysis")), false);

  const leaderboardPageResponse = await invoke(handle, { path: "/api/local-leaderboards?limit=25" });
  assert.equal(leaderboardPageResponse.status, 200);
  const leaderboardPage = JSON.parse(leaderboardPageResponse.body);
  assert.equal(leaderboardPage.schema, "starvault-indexeddb-leaderboard-page/v1");
  assert.equal(leaderboardPage.total, snapshot.counts.leaderboards);
  assert.equal(leaderboardPage.total, 0);
  assert.equal(leaderboardPage.done, true);

  const probe = await invoke(handle, { path: "/.env" });
  assert.ok([403, 404].includes(probe.status));

  const invalidJsonType = await invoke(handle, {
    path: "/api/settings",
    method: "POST",
    headers: { "content-type": "text/plain", origin: "http://127.0.0.1:4173" },
    body: "{}"
  });
  assert.equal(invalidJsonType.status, 415);
});
