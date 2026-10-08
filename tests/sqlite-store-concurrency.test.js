const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");
const { createStorage } = require("../src/lib/storage");
const { getSqliteRevision, withSqliteTransaction } = require("../src/lib/sqlite-store");

function repository(fullName) {
  return {
    fullName, owner: fullName.split("/")[0], name: fullName.split("/")[1],
    description: "A local concurrency fixture", language: "TypeScript", topics: [],
    stars: 120, forks: 12, openIssues: 2,
    scores: { opportunity: 82, quality: 75, actionability: 70, risk: 5 }
  };
}

function fixture(t, suffix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `starvault-sqlite-concurrency-${suffix}-`));
  t.diagnostic(`Retained SQLite fixture: ${dir}`);
  return path.join(dir, "store.db");
}

function persistedCore(filePath) {
  const db = new DatabaseSync(filePath, { readOnly: true });
  try {
    return JSON.parse(db.prepare("SELECT json FROM app_state WHERE key = ?").get("core").json);
  } finally {
    db.close();
  }
}

function isStorageConflict(error) {
  return /conflict/i.test(String(error?.code || "")) || /conflict/i.test(String(error?.name || ""));
}

// This worker loads the real production module in a separate Node process and
// communicates only over IPC. It has no server, provider, token, or network use.
const workerSource = `
const { createStorage } = require(process.argv[1]);
const storage = createStorage(process.argv[2]);
if (process.argv[3] !== "cold") storage.load();
process.send({ ready: true });
process.on("message", message => {
  if (message.shutdown) { process.exit(0); return; }
  try {
    if (!["getRuntimeState", "setRuntimeState", "setNote", "setWatch", "setAnalysis", "setActiveObservationPlan", "getProject", "createTask", "getTask", "upsertProjects"].includes(message.method)) {
      throw new Error("Unsupported fixture method");
    }
    const result = storage[message.method](...message.args);
    process.send({ id: message.id, result });
  } catch (error) {
    process.send({ id: message.id, error: { name: error.name, code: error.code, message: error.message } });
  }
});
`;

async function writer(t, filePath, options = {}) {
  const child = spawn(process.execPath, ["-e", workerSource, require.resolve("../src/lib/storage"), filePath, options.cold ? "cold" : "warm"], {
    stdio: ["ignore", "ignore", "pipe", "ipc"]
  });
  const pending = new Map();
  let nextId = 0;
  let stderr = "";
  let resolveReady;
  let rejectReady;
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  const readyTimeout = setTimeout(() => rejectReady(new Error("SQLite worker readiness timed out")), 10000);
  child.stderr.on("data", chunk => { stderr += chunk.toString(); });
  child.on("message", message => {
    if (message.ready) { clearTimeout(readyTimeout); resolveReady(); return; }
    const entry = pending.get(message.id);
    if (!entry) return;
    clearTimeout(entry.timeout);
    pending.delete(message.id);
    if (message.error) entry.reject(Object.assign(new Error(message.error.message), message.error));
    else entry.resolve(message.result);
  });
  function fail(error) {
    clearTimeout(readyTimeout);
    rejectReady(error);
    for (const entry of pending.values()) {
      clearTimeout(entry.timeout);
      entry.reject(error);
    }
    pending.clear();
  }
  child.on("error", fail);
  child.on("exit", (code, signal) => fail(new Error(`SQLite worker exited (${code ?? signal}): ${stderr}`)));
  t.after(async () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = once(child, "exit");
    const deadline = setTimeout(() => child.kill("SIGTERM"), 2000);
    if (child.connected) child.send({ shutdown: true });
    else child.kill("SIGTERM");
    try { await exited; } finally { clearTimeout(deadline); }
  });
  await ready;
  return {
    call(method, ...args) {
      const id = ++nextId;
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`SQLite worker ${method} timed out`));
        }, 10000);
        pending.set(id, { resolve, reject, timeout });
        child.send({ id, method, args }, error => {
          if (!error) return;
          clearTimeout(timeout);
          pending.delete(id);
          reject(error);
        });
      });
    }
  };
}

test("same-connection storage instances observe and preserve each other's WAL commits", t => {
  const filePath = fixture(t, "shared");
  const a = createStorage(filePath);
  const b = createStorage(filePath);
  a.load();
  b.load();

  a.setRuntimeState("writerA", { marker: "A" });
  assert.equal(b.getRuntimeState("writerA")?.marker, "A", "another createStorage must invalidate its warmed cache");
  b.setRuntimeState("writerB", { marker: "B" });
  assert.equal(a.getRuntimeState("writerB")?.marker, "B");
  const core = persistedCore(filePath);
  assert.equal(core.runtime.writerA?.marker, "A");
  assert.equal(core.runtime.writerB?.marker, "B");
});

test("independent process writers read committed WAL data and retain disjoint updates", { timeout: 30000 }, async t => {
  const filePath = fixture(t, "process");
  createStorage(filePath).load();
  const a = await writer(t, filePath);
  const b = await writer(t, filePath);

  // ready is the first barrier: both independent connections have warmed caches.
  // Each awaited IPC acknowledgement is a commit barrier, not a timing sleep.
  await a.call("setRuntimeState", "writerA", { marker: "parent-gate-A" });
  assert.ok(fs.statSync(`${filePath}-wal`).size > 0, "fixture must contain uncheckpointed WAL data");
  assert.equal((await b.call("getRuntimeState", "writerA"))?.marker, "parent-gate-A");
  await b.call("setRuntimeState", "writerB", { marker: "parent-gate-B" });
  assert.equal((await a.call("getRuntimeState", "writerB"))?.marker, "parent-gate-B");

  for (let round = 0; round < 4; round += 1) {
    await Promise.all([
      a.call("setRuntimeState", `left${round}`, { round, side: "left" }),
      b.call("setRuntimeState", `right${round}`, { round, side: "right" })
    ]);
  }
  const runtime = persistedCore(filePath).runtime;
  assert.equal(runtime.writerA?.marker, "parent-gate-A");
  assert.equal(runtime.writerB?.marker, "parent-gate-B");
  for (let round = 0; round < 4; round += 1) {
    assert.equal(runtime[`left${round}`]?.side, "left", `left${round} must survive another writer's update`);
    assert.equal(runtime[`right${round}`]?.side, "right", `right${round} must survive another writer's update`);
  }
});

test("an old load/save snapshot is rejected without partial overwrite and a fresh save succeeds", t => {
  const filePath = fixture(t, "stale");
  const a = createStorage(filePath);
  const b = createStorage(filePath);
  const stale = a.load();
  b.setRuntimeState("shared", { marker: "newer-writer" });
  stale.runtime.shared = { marker: "stale-intent" };
  stale.runtime.staleOnly = { marker: "must-not-partially-save" };

  assert.throws(() => a.save(stale), isStorageConflict, "stale snapshots need an identifiable conflict, not a successful whole-core overwrite");
  const afterConflict = persistedCore(filePath).runtime;
  assert.equal(afterConflict.shared?.marker, "newer-writer");
  assert.equal(afterConflict.staleOnly, undefined);

  const fresh = a.load();
  fresh.runtime.confirmed = { marker: "fresh-intent" };
  a.save(fresh);
  const afterFresh = persistedCore(filePath).runtime;
  assert.equal(afterFresh.shared?.marker, "newer-writer");
  assert.equal(afterFresh.confirmed?.marker, "fresh-intent");
  b.setRuntimeState("afterConflict", { marker: "normal-mutator" });
  assert.equal(a.getRuntimeState("afterConflict")?.marker, "normal-mutator");
});

test("an asynchronous caller's old snapshot cannot erase a later same-instance update", async t => {
  const filePath = fixture(t, "same-instance-stale");
  const storage = createStorage(filePath);
  const beforeNetwork = storage.load();
  let releaseResponse;
  const responseGate = new Promise(resolve => { releaseResponse = resolve; });
  const delayedSave = (async () => {
    await responseGate;
    beforeNetwork.runtime.networkResult = { marker: "old-snapshot-result" };
    storage.save(beforeNetwork);
  })();
  storage.setRuntimeState("duringNetwork", { marker: "newer-local-update" });
  releaseResponse();
  await assert.rejects(delayedSave, isStorageConflict);
  const runtime = persistedCore(filePath).runtime;
  assert.equal(runtime.duringNetwork?.marker, "newer-local-update");
  assert.equal(runtime.networkResult, undefined);
  assert.equal(storage.getRuntimeState("networkResult"), null, "a rejected old snapshot must not leak into the live cache");
  storage.setRuntimeState("networkResult", { marker: "committed-with-current-state" });
  const final = persistedCore(filePath).runtime;
  assert.equal(final.duringNetwork?.marker, "newer-local-update");
  assert.equal(final.networkResult?.marker, "committed-with-current-state");
});

test("process writers preserve per-plan notes, tasks and edits made during a delayed analysis", { timeout: 30000 }, async t => {
  const filePath = fixture(t, "plan-assets");
  const seed = createStorage(filePath);
  seed.saveObservationPlan({ id: "other", name: "Other plan" });
  seed.upsertProjects([repository("acme/shared")], { observationPlanId: "default" });
  seed.upsertProjects([repository("acme/shared")], { observationPlanId: "other" });
  const a = await writer(t, filePath);
  const b = await writer(t, filePath);
  const requestProject = await a.call("getProject", "acme/shared", { observationPlanId: "default" });
  assert.equal(requestProject.analysis, null);

  await Promise.all([
    a.call("setNote", "acme/shared", "note-A", "review", { observationPlanId: "default" }),
    b.call("setNote", "acme/shared", "note-B", "review", { observationPlanId: "other" })
  ]);
  await Promise.all([
    a.call("createTask", { id: "task-A", type: "analysis", input: { observationPlanId: "default" } }),
    b.call("createTask", { id: "task-B", type: "analysis", input: { observationPlanId: "other" } })
  ]);
  await b.call("setWatch", "acme/shared", true, { observationPlanId: "other" });
  await b.call("setActiveObservationPlan", "other");
  await a.call("setAnalysis", "acme/shared", { summary: "Response for the captured default plan", recommendation: "validate", riskLevel: "low" }, { observationPlanId: "default", provider: "fixture" });

  const defaultProject = await b.call("getProject", "acme/shared", { observationPlanId: "default" });
  const otherProject = await a.call("getProject", "acme/shared", { observationPlanId: "other" });
  assert.equal(defaultProject.note, "note-A");
  assert.equal(defaultProject.analysis.result.recommendation, "validate");
  assert.equal(otherProject.note, "note-B");
  assert.equal(otherProject.watched, true);
  assert.equal(otherProject.analysis, null);
  const core = persistedCore(filePath);
  assert.equal(core.settings.activeObservationPlanId, "other");
  assert.equal(core.tasks["task-A"].input.observationPlanId, "default");
  assert.equal(core.tasks["task-B"].input.observationPlanId, "other");
});

test("external project and leaderboard writes survive a warmed writer's core-only update", { timeout: 30000 }, async t => {
  const filePath = fixture(t, "incremental-hashes");
  const local = createStorage(filePath);
  local.load();
  local.summary({});
  const external = await writer(t, filePath);
  await external.call("upsertProjects", [repository("acme/external")], { observationPlanId: "default" });
  local.setRuntimeState("coreOnly", { marker: "does-not-touch-projects-or-leaderboards" });
  assert.equal(local.getProject("acme/external").fullName, "acme/external");
  assert.equal(local.summary({}).poolTotal, 1);
  assert.equal(local.exportLocalLeaderboardPage({ limit: 25 }).items[0].value.items[0].fullName, "acme/external");
  const db = new DatabaseSync(filePath, { readOnly: true });
  try {
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM projects").get().count, 1);
    assert.equal(db.prepare("SELECT plan_id FROM project_plans WHERE project_key = ?").get("acme/external").plan_id, "default");
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM scans").get().count, 1);
  } finally { db.close(); }
});

test("rollback keeps revision, rows and subsequent writer caches coherent", t => {
  const filePath = fixture(t, "rollback");
  const storage = createStorage(filePath);
  storage.setRuntimeState("existing", { marker: "committed" });
  const revision = getSqliteRevision(filePath);
  assert.throws(() => withSqliteTransaction(filePath, () => {
    storage.setRuntimeState("partial", { marker: "must-roll-back" });
    storage.upsertProjects([repository("acme/rolled-back")], { observationPlanId: "default" });
    throw new Error("Injected transaction failure");
  }), /Injected transaction failure/);
  assert.equal(getSqliteRevision(filePath), revision);
  assert.equal(storage.getRuntimeState("partial"), null);
  assert.equal(storage.getProject("acme/rolled-back"), null);
  assert.equal(storage.exportLocalLeaderboardPage({ limit: 25 }).total, 0);
  storage.setRuntimeState("afterRollback", { marker: "committed-after-rollback" });
  const core = persistedCore(filePath);
  assert.equal(core.runtime.existing.marker, "committed");
  assert.equal(core.runtime.partial, undefined);
  assert.equal(core.runtime.afterRollback.marker, "committed-after-rollback");
  assert.equal(storage.listProjects({ limit: "all" }).total, 0);
});

test("a legacy SQLite store without revision metadata preserves assets on first write", t => {
  const filePath = fixture(t, "legacy-revision");
  const storage = createStorage(filePath);
  storage.upsertProjects([repository("acme/legacy")], { observationPlanId: "default" });
  storage.setNote("acme/legacy", "keep this legacy note", "review");
  storage.setWatch("acme/legacy", true);
  const db = new DatabaseSync(filePath);
  try { db.prepare("DELETE FROM app_state WHERE key = ?").run("revision"); }
  finally { db.close(); }

  const upgraded = createStorage(filePath);
  assert.equal(getSqliteRevision(filePath), 0);
  assert.equal(upgraded.getProject("acme/legacy").note, "keep this legacy note");
  assert.equal(upgraded.getProject("acme/legacy").watched, true);
  upgraded.setRuntimeState("metadataUpgrade", { marker: "first-write" });
  assert.equal(getSqliteRevision(filePath), 1);
  const reopened = createStorage(filePath);
  assert.equal(reopened.getProject("acme/legacy").note, "keep this legacy note");
  assert.equal(reopened.getProject("acme/legacy").watched, true);
  assert.equal(reopened.getRuntimeState("metadataUpgrade").marker, "first-write");
});

test("cold process writers initialize legacy JSON once and retain both first commits", { timeout: 30000 }, async t => {
  const filePath = fixture(t, "cold-initialize");
  const legacyPath = path.join(path.dirname(filePath), "store.json");
  const legacy = createStorage(legacyPath);
  legacy.upsertProjects([repository("acme/imported")], { observationPlanId: "default" });
  legacy.setNote("acme/imported", "keep imported note", "review");
  legacy.setWatch("acme/imported", true);
  const original = fs.readFileSync(legacyPath);
  const [a, b] = await Promise.all([writer(t, filePath, { cold: true }), writer(t, filePath, { cold: true })]);
  await Promise.all([a.call("setRuntimeState", "firstA", { marker: "a" }), b.call("setRuntimeState", "firstB", { marker: "b" })]);
  const reopened = createStorage(filePath);
  assert.equal(reopened.getRuntimeState("firstA").marker, "a");
  assert.equal(reopened.getRuntimeState("firstB").marker, "b");
  assert.equal(reopened.getProject("acme/imported").note, "keep imported note");
  assert.equal(reopened.getProject("acme/imported").watched, true);
  assert.deepEqual(fs.readFileSync(legacyPath), original);
});
