const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { IDBFactory, IDBKeyRange, IDBObjectStore, indexedDB } = require("fake-indexeddb");

const storageSource = fs.readFileSync(path.join(__dirname, "../public/indexeddb-storage.js"), "utf8");

test("T-02 recovery backup commits before cache replacement and an abort preserves every asset", async () => {
  const factory = new IDBFactory();
  const api = createStorageApi(factory);
  const fixture = snapshotFixture();
  fixture.store.observationPlans.default.userData.notes = { "acme/example": { text: "legacy local note" } };
  await api.putSnapshot(fixture);
  await api.putValue("localSecrets", { githubToken: "fixture-recovery-token" });
  await api.putTaskArtifact("local-task", "profile", { complete: true, repositories: ["acme/example"] });
  const beforeRevision = (await api.getSnapshotMeta()).localRevision;
  const server = snapshotFixture();
  const originalAdd = IDBObjectStore.prototype.add;
  let aborted = false;
  IDBObjectStore.prototype.add = function (...args) {
    if (this.name === "meta" && args[0]?.key?.startsWith("serverCacheRecovery:")) {
      aborted = true; this.transaction.abort();
    }
    return originalAdd.apply(this, args);
  };
  try { await assert.rejects(api.putSnapshot(server, { expectedRevision: beforeRevision, protectServerCache: true })); }
  finally { IDBObjectStore.prototype.add = originalAdd; }
  assert.equal(aborted, true);
  assert.equal((await api.getSnapshotMeta()).localRevision, beforeRevision);
  assert.equal((await api.getSnapshot()).store.observationPlans.default.userData.notes["acme/example"].text, "legacy local note");
  assert.equal((await api.getRecoverySnapshots()).length, 0);
  const reopened = createStorageApi(factory);
  await reopened.putSnapshot(server, { expectedRevision: beforeRevision, protectServerCache: true });
  const copies = await reopened.getRecoverySnapshots();
  assert.equal(copies.length, 1);
  assert.ok(JSON.stringify(copies[0]).includes("legacy local note"));
  assert.ok(JSON.stringify(copies[0].records.kv).includes("fixture-recovery-token"));
  assert.ok(JSON.stringify(copies[0].records.taskArtifacts).includes("local-task"));
  await reopened.protectServerCache();
  assert.equal((await reopened.getRecoverySnapshots()).length, 1, "trusted unchanged cache must not accumulate copies");
  await reopened.putProjects([{ fullName: "acme/example", description: "local project difference" }]);
  await reopened.putProjects([{ fullName: "acme/example", description: "server version" }], { serverCache: true });
  assert.ok(JSON.stringify(await reopened.getRecoverySnapshots()).includes("local project difference"));
  assert.equal((await reopened.getProject("acme/example")).description, "server version");
});

test("T-05 shared replacement abort keeps both memberships, history and revision unchanged", async () => {
  const factory = new IDBFactory();
  const api = createStorageApi(factory);
  const shared = { fullName: "fixture/shared", firstSeenAt: "2020-01-01", snapshots: [{ at: "2020-01-01", stars: 1 }],
    observationPlanMatches: { a: { planId: "a" }, b: { planId: "b" } } };
  await api.putProjects([shared]);
  const revision = (await api.getSnapshotMeta()).localRevision;
  const original = IDBObjectStore.prototype.put;
  let wrote = 0;
  IDBObjectStore.prototype.put = function (...args) {
    if (this.name === "projects" && ++wrote === 2) this.transaction.abort();
    return original.apply(this, args);
  };
  try {
    await assert.rejects(api.replaceProjectsForPlan("a", [
      { ...shared, stars: 20 }, { fullName: "fixture/new", observationPlanMatches: { a: { planId: "a" } } }
    ]));
  } finally { IDBObjectStore.prototype.put = original; }
  assert.equal(wrote, 2);
  const reopened = createStorageApi(factory);
  assert.deepEqual(JSON.parse(JSON.stringify(await reopened.getProject("fixture/shared"))), shared);
  assert.equal(await reopened.getProject("fixture/new"), null);
  assert.equal((await reopened.getSnapshotMeta()).localRevision, revision);
  await reopened.replaceProjectsForPlan("a", [shared]);
  assert.equal((await reopened.getProjectsByPlan("b")).length, 1);
});

function createStorageApi(factory = new IDBFactory()) {
  const window = { indexedDB: factory, IDBKeyRange };
  vm.runInNewContext(storageSource, {
    window,
    indexedDB: factory,
    IDBKeyRange,
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
    globalThis: { IDBKeyRange }
  });
  return window.StarVaultIndexedDB;
}

function snapshotFixture(overrides = {}) {
  const createdAt = "2026-07-18T00:00:00.000Z";
  const base = {
    schema: "starvault-indexeddb-snapshot/v1",
    exportedAt: createdAt,
    activeObservationPlanId: "default",
    settings: { activeObservationPlanId: "default" },
    counts: { projects: 1, scans: 0, observationPlans: 1 },
    store: {
      version: 1,
      createdAt,
      updatedAt: createdAt,
      projects: {
        "acme/example": {
          fullName: "acme/example",
          description: "before",
          observationPlanMatches: { default: { planId: "default" } }
        }
      },
      observationPlans: { default: { id: "default", name: "Default", memory: {}, userData: {} } },
      scans: [],
      leaderboards: { daily: {}, byPlan: {} },
      memory: {}
    }
  };
  return {
    ...base,
    ...overrides,
    store: { ...base.store, ...(overrides.store || {}) }
  };
}

function queuedLeaseTask(id = "owned", input = { observationPlanId: "default" }) {
  return { id, type: "analysis", key: "analysis:fixture", status: "queued", attempts: 0, input,
    createdAt: "2026-10-08T00:00:00.000Z", updatedAt: "2026-10-08T00:00:00.000Z" };
}

test("T-06 atomic enqueue and competing runtimes claim exactly one owner", async () => {
  const factory = new IDBFactory();
  const a = createStorageApi(factory), b = createStorageApi(factory);
  await a.putSnapshot(snapshotFixture());
  await b.getSnapshot(); // Warm the second runtime before the other writer.
  const [first, second] = await Promise.all([
    a.enqueueTask(queuedLeaseTask("first"), { sameInput: input => input.observationPlanId === "default" }),
    b.enqueueTask(queuedLeaseTask("second"), { sameInput: input => input.observationPlanId === "default" })
  ]);
  assert.equal(first.id, second.id);
  const [one, two] = await Promise.all([
    a.claimTask(first.id, { ownerId: "a" }), b.claimTask(first.id, { ownerId: "b" })
  ]);
  assert.equal(Number(one.claimed) + Number(two.claimed), 1);
  assert.equal((await b.getSnapshot()).store.tasks[first.id].attempts, 1);
  assert.equal((await a.getTaskLease(first.id)).token, (one.claimed ? one : two).lease.token);
});

test("T-06 enqueue rejects a full active queue but preserves duplicate reuse and all old owners", async () => {
  const api = createStorageApi();
  const fixture = snapshotFixture();
  fixture.store.tasks = Object.fromEntries(Array.from({ length: 60 }, (_, i) => {
    const task = queuedLeaseTask(`task-${i}`); task.key = `key-${i}`; return [task.id, task];
  }));
  await api.putSnapshot(fixture);
  await assert.rejects(api.enqueueTask({ ...queuedLeaseTask("new"), key: "new" }), error => error.code === "TASK_QUEUE_FULL");
  assert.equal((await api.enqueueTask({ ...queuedLeaseTask("duplicate"), key: "key-0" })).id, "task-0");
  assert.equal(Object.keys((await api.getSnapshot()).store.tasks).length, 60);
});

test("T-06 renewal cannot revive an expired lease and takeover fences the former token", async () => {
  const factory = new IDBFactory();
  const a = createStorageApi(factory), b = createStorageApi(factory);
  await a.putSnapshot(snapshotFixture());
  await a.enqueueTask(queuedLeaseTask());
  const first = await a.claimTask("owned", { ownerId: "a", now: 1000, leaseMs: 1000 });
  const renewed = await a.renewTaskLease(first.lease, { now: 1500, leaseMs: 1000 });
  assert.equal(renewed.expiresAt, 2500);
  assert.equal((await b.claimTask("owned", { ownerId: "b", now: 2499 })).claimed, false);
  await assert.rejects(a.renewTaskLease(first.lease, { now: 2500 }), error => error.code === "TASK_OWNERSHIP_LOST");
  const second = await b.claimTask("owned", { ownerId: "b", now: 2500 });
  assert.equal(second.claimed, true);
  assert.notEqual(second.lease.token, first.lease.token);
  assert.equal(second.task.attempts, 2);
  await assert.rejects(a.markTaskExternalRequest(first.lease, { now: 2501 }), error => error.code === "TASK_OWNERSHIP_LOST");
});

test("T-06 legacy running and expired issued AI requests are quarantined without a new claim", async () => {
  const api = createStorageApi();
  const fixture = snapshotFixture();
  fixture.store.tasks = { legacy: { ...queuedLeaseTask("legacy"), status: "running", attempts: 1 } };
  await api.putSnapshot(fixture);
  const legacy = await api.claimTask("legacy", { ownerId: "new" });
  assert.equal(legacy.claimed, false);
  assert.equal(legacy.task.status, "failed");
  assert.equal(legacy.task.errorCode, "TASK_OUTCOME_UNKNOWN");
  await api.enqueueTask(queuedLeaseTask());
  const current = await api.claimTask("owned", { ownerId: "a", now: 1000, leaseMs: 1000 });
  await api.markTaskExternalRequest(current.lease, { now: 1100 });
  const recovery = await api.claimTask("owned", { ownerId: "b", now: 2000 });
  assert.equal(recovery.claimed, false);
  assert.equal(recovery.task.status, "failed");
  assert.equal(recovery.task.recoveryRequired, true);
  assert.equal(recovery.task.attempts, 1);
  assert.match(recovery.task.error, /unknown.*charged.*automatic replay is disabled/i);
});

test("T-06 stale result, learning, project and artifact writes are rejected atomically", async () => {
  const factory = new IDBFactory();
  const a = createStorageApi(factory), b = createStorageApi(factory);
  await a.putSnapshot(snapshotFixture());
  await a.enqueueTask(queuedLeaseTask());
  const first = await a.claimTask("owned", { ownerId: "a", now: Date.now() - 60000, leaseMs: 30000 });
  const stale = a.bindTaskSnapshot(await a.getSnapshot(), first.lease);
  stale.store.observationPlans.default.userData.analysis = { "acme/example": { result: "late result" } };
  stale.store.observationPlans.default.memory.events = [{ id: "late", type: "ai_analyze" }];
  a.registerSnapshotOperations(stale, "default", [{ path: ["stats", "eventCounts", "ai_analyze"], delta: 1, min: 0 }]);
  stale.store.tasks.owned.status = "completed";
  const second = await b.claimTask("owned", { ownerId: "b" });
  await b.putTaskArtifact("owned", "profile", { owner: "b" }, { taskLease: second.lease });
  const before = await b.getSnapshot();
  const beforeRevision = (await b.getSnapshotMeta()).localRevision;
  const lost = error => error.code === "TASK_OWNERSHIP_LOST";
  await assert.rejects(a.putSnapshot(stale), lost);
  await assert.rejects(a.replaceProjectsForPlan("default", [{ fullName: "late/project" }], { taskLease: first.lease }), lost);
  await assert.rejects(a.putTaskArtifact("owned", "profile", { owner: "a" }, { taskLease: first.lease }), lost);
  await assert.rejects(a.clearTaskArtifacts("owned", { taskLease: first.lease }), lost);
  assert.deepEqual(JSON.parse(JSON.stringify((await b.getSnapshot()).store)), JSON.parse(JSON.stringify(before.store)));
  assert.equal((await b.getSnapshotMeta()).localRevision, beforeRevision);
  assert.equal((await b.getTaskArtifacts("owned")).profile.owner, "b");
});

test("T-06 terminal delivery releases the lease and only matching artifact cleanup is allowed", async () => {
  const api = createStorageApi();
  await api.putSnapshot(snapshotFixture());
  await api.enqueueTask(queuedLeaseTask());
  const claim = await api.claimTask("owned", { ownerId: "a" });
  await api.markTaskExternalRequest(claim.lease);
  await api.putTaskArtifact("owned", "profile", { saved: true }, { taskLease: claim.lease });
  const snapshot = api.bindTaskSnapshot(await api.getSnapshot(), claim.lease);
  snapshot.store.observationPlans.default.userData.analysis = { "acme/example": { result: "durable" } };
  snapshot.store.tasks.owned.status = "completed";
  snapshot.store.tasks.owned.result = { ok: true };
  await api.putSnapshot(snapshot);
  const released = await api.getTaskLease("owned");
  assert.equal(released.released, true);
  assert.equal(released.expiresAt, 0);
  assert.equal(released.nonReplayableInFlight, false);
  await assert.rejects(api.renewTaskLease(claim.lease), error => error.code === "TASK_OWNERSHIP_LOST");
  await assert.rejects(api.putSnapshot(snapshot), error => error.code === "TASK_OWNERSHIP_LOST");
  await assert.rejects(api.putTaskArtifact("owned", "late", {}, { taskLease: claim.lease }), error => error.code === "TASK_OWNERSHIP_LOST");
  assert.equal((await api.clearTaskArtifacts("owned", { taskLease: claim.lease })).deleted, 1);
  assert.equal(Object.keys(await api.getTaskArtifacts("owned")).length, 0);
  assert.equal((await api.getSnapshot()).store.observationPlans.default.userData.analysis["acme/example"].result, "durable");
});

test("T-06 an aborted terminal transaction preserves its running lease and every result", async () => {
  const api = createStorageApi();
  await api.putSnapshot(snapshotFixture());
  await api.enqueueTask(queuedLeaseTask());
  const claim = await api.claimTask("owned", { ownerId: "a" });
  await api.markTaskExternalRequest(claim.lease);
  const snapshot = api.bindTaskSnapshot(await api.getSnapshot(), claim.lease);
  snapshot.store.tasks.owned.status = "completed";
  snapshot.store.observationPlans.default.userData.analysis = { "acme/example": { result: "must roll back" } };
  const revision = (await api.getSnapshotMeta()).localRevision;
  const originalPut = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (...args) {
    const result = originalPut.apply(this, args);
    if (this.name === "plans") this.transaction.abort();
    return result;
  };
  try { await assert.rejects(api.putSnapshot(snapshot)); }
  finally { IDBObjectStore.prototype.put = originalPut; }
  const unchanged = await api.getSnapshot();
  assert.equal(unchanged.store.tasks.owned.status, "running");
  assert.equal(unchanged.store.observationPlans.default.userData.analysis, undefined);
  assert.equal((await api.getTaskLease("owned")).nonReplayableInFlight, true);
  assert.equal((await api.getTaskLease("owned")).released, false);
  assert.equal((await api.getSnapshotMeta()).localRevision, revision);
  await api.putSnapshot(snapshot);
  assert.equal((await api.getTaskLease("owned")).released, true);
});

test("T-06 claim abort leaves the task queued without an owner or attempt", async () => {
  const api = createStorageApi();
  await api.putSnapshot(snapshotFixture());
  await api.enqueueTask(queuedLeaseTask());
  const revision = (await api.getSnapshotMeta()).localRevision;
  const originalPut = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (...args) {
    const result = originalPut.apply(this, args);
    if (this.name === "meta" && args[0]?.key === "snapshotCore") this.transaction.abort();
    return result;
  };
  try { await assert.rejects(api.claimTask("owned", { ownerId: "a" })); }
  finally { IDBObjectStore.prototype.put = originalPut; }
  assert.equal((await api.getSnapshot()).store.tasks.owned.status, "queued");
  assert.equal((await api.getSnapshot()).store.tasks.owned.attempts, 0);
  assert.equal(await api.getTaskLease("owned"), null);
  assert.equal((await api.getSnapshotMeta()).localRevision, revision);
  assert.equal((await api.claimTask("owned", { ownerId: "b" })).claimed, true);
});

test("T-06 changed task inputs fence the old result even if its token remains current", async () => {
  const factory = new IDBFactory();
  const a = createStorageApi(factory), b = createStorageApi(factory);
  await a.putSnapshot(snapshotFixture());
  await a.enqueueTask(queuedLeaseTask());
  const claim = await a.claimTask("owned", { ownerId: "a" });
  const old = a.bindTaskSnapshot(await a.getSnapshot(), claim.lease);
  const changed = await b.getSnapshot();
  changed.store.tasks.owned.input.observationPlanId = "different-plan";
  await b.putSnapshot(changed);
  old.store.tasks.owned.status = "completed";
  old.store.observationPlans.default.userData.analysis = { "acme/example": { result: "wrong input" } };
  await assert.rejects(a.putSnapshot(old), error => error.code === "TASK_OWNERSHIP_LOST");
  assert.equal((await b.getSnapshot()).store.observationPlans.default.userData.analysis, undefined);
  assert.equal((await b.getSnapshot()).store.tasks.owned.input.observationPlanId, "different-plan");
});

test("T-06 non-finite lease clocks fail closed and finite defaults remain renewable", async () => {
  const api = createStorageApi();
  await api.putSnapshot(snapshotFixture());
  await api.enqueueTask(queuedLeaseTask());
  await assert.rejects(api.claimTask("owned", { ownerId: "a", now: NaN }), error => error.code === "TASK_OWNERSHIP_LOST");
  const claim = await api.claimTask("owned", { ownerId: "a", now: 1000, leaseMs: Infinity });
  assert.equal(claim.lease.expiresAt, 31000);
  await assert.rejects(api.renewTaskLease(claim.lease, { now: Infinity }), error => error.code === "TASK_OWNERSHIP_LOST");
  assert.equal((await api.renewTaskLease(claim.lease, { now: 2000 })).expiresAt, 32000);
});

test("T-06 a durable external artifact clears its issued marker in the same transaction", async () => {
  const api = createStorageApi();
  await api.putSnapshot(snapshotFixture());
  await api.enqueueTask({ ...queuedLeaseTask(), type: "scan", key: "scan:default" });
  const claim = await api.claimTask("owned", { ownerId: "a" });
  await api.markTaskExternalRequest(claim.lease);
  await api.putTaskArtifact("owned", "github-profile", { saved: true }, { taskLease: claim.lease });
  assert.equal((await api.getTaskLease("owned")).nonReplayableInFlight, true);
  await assert.rejects(api.putTaskArtifact("owned", "github-profile", {}, {
    taskLease: claim.lease, completeExternalRequest: true
  }), error => error.code === "TASK_OWNERSHIP_LOST");
  const artifact = { projects: [{ fullName: "fixture/external" }], errors: [] };
  await api.putTaskArtifact("owned", "external-discovery", artifact, {
    taskLease: claim.lease, completeExternalRequest: true
  });
  assert.equal((await api.getTaskLease("owned")).nonReplayableInFlight, false);
  const recovered = await api.claimTask("owned", { ownerId: "b", now: claim.lease.expiresAt });
  assert.equal(recovered.claimed, true);
  assert.equal(recovered.task.attempts, 2);
  assert.deepEqual(JSON.parse(JSON.stringify((await api.getTaskArtifacts("owned"))["external-discovery"])), artifact);
});

test("T-06 aborting external artifact delivery retains the issued marker and existing artifact", async () => {
  const api = createStorageApi();
  await api.putSnapshot(snapshotFixture());
  await api.enqueueTask({ ...queuedLeaseTask(), type: "scan", key: "scan:default" });
  const claim = await api.claimTask("owned", { ownerId: "a" });
  await api.markTaskExternalRequest(claim.lease);
  const before = (await api.getSnapshotMeta()).localRevision;
  const originalPut = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (...args) {
    const result = originalPut.apply(this, args);
    if (this.name === "meta" && args[0]?.key === "taskLease:owned" && args[0]?.value.nonReplayableInFlight === false) this.transaction.abort();
    return result;
  };
  try {
    await assert.rejects(api.putTaskArtifact("owned", "external-discovery", { projects: [] }, {
      taskLease: claim.lease, completeExternalRequest: true
    }));
  } finally { IDBObjectStore.prototype.put = originalPut; }
  assert.equal((await api.getTaskLease("owned")).nonReplayableInFlight, true);
  assert.equal((await api.getTaskArtifacts("owned"))["external-discovery"], undefined);
  assert.equal((await api.getSnapshotMeta()).localRevision, before);
});

test("T-06 an owner cannot commit different inputs, requeue itself, or alter another task", async () => {
  const api = createStorageApi();
  await api.putSnapshot(snapshotFixture());
  await api.enqueueTask(queuedLeaseTask());
  await api.enqueueTask({ ...queuedLeaseTask("other"), key: "analysis:other" });
  const claim = await api.claimTask("owned", { ownerId: "a" });
  const revision = (await api.getSnapshotMeta()).localRevision;
  const mutations = [
    snapshot => { snapshot.store.tasks.owned.input.observationPlanId = "changed"; },
    snapshot => { snapshot.store.tasks.owned.key = "analysis:changed"; },
    snapshot => { snapshot.store.tasks.owned.type = "plan-generation"; },
    snapshot => { snapshot.store.tasks.owned.status = "queued"; },
    snapshot => { snapshot.store.tasks.other.status = "completed"; }
  ];
  for (const mutate of mutations) {
    const snapshot = api.bindTaskSnapshot(await api.getSnapshot(), claim.lease);
    snapshot.store.tasks.owned.status = "completed";
    snapshot.store.observationPlans.default.userData.analysis = { "acme/example": { result: "must be rejected" } };
    snapshot.store.observationPlans.default.memory.events = [{ id: "must-be-rejected", type: "ai_analyze" }];
    mutate(snapshot);
    await assert.rejects(api.putSnapshot(snapshot), error => error.code === "TASK_OWNERSHIP_LOST");
    const unchanged = await api.getSnapshot();
    assert.equal(unchanged.store.tasks.owned.status, "running");
    assert.equal(unchanged.store.tasks.other.status, "queued");
    assert.equal(unchanged.store.observationPlans.default.userData.analysis, undefined);
    assert.equal((await api.getSnapshotMeta()).localRevision, revision);
  }
  const valid = api.bindTaskSnapshot(await api.getSnapshot(), claim.lease);
  valid.store.tasks.owned.status = "completed";
  valid.store.tasks.owned.result = { accepted: true };
  await api.putSnapshot(valid);
  assert.equal((await api.getSnapshot()).store.tasks.owned.status, "completed");
});

test("T-06 a quarantined owner cannot clear artifacts despite its terminal task status", async () => {
  const api = createStorageApi();
  await api.putSnapshot(snapshotFixture());
  await api.enqueueTask(queuedLeaseTask());
  const claim = await api.claimTask("owned", { ownerId: "a" });
  await api.putTaskArtifact("owned", "evidence", { keep: true }, { taskLease: claim.lease });
  await api.markTaskExternalRequest(claim.lease);
  const quarantine = await api.claimTask("owned", { ownerId: "b", now: claim.lease.expiresAt });
  assert.equal(quarantine.task.status, "failed");
  assert.equal((await api.getTaskLease("owned")).terminalDelivered, false);
  await assert.rejects(api.clearTaskArtifacts("owned", { taskLease: claim.lease }), error => error.code === "TASK_OWNERSHIP_LOST");
  assert.equal((await api.getTaskArtifacts("owned")).evidence.keep, true);
});

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function seedLegacySnapshot(snapshot) {
  const request = indexedDB.open("starvault-imprint", 1);
  request.onupgradeneeded = () => request.result.createObjectStore("kv", { keyPath: "key" });
  const db = await requestResult(request);
  const tx = db.transaction("kv", "readwrite");
  tx.objectStore("kv").put({ key: "localSnapshot", value: snapshot });
  await transactionDone(tx);
  db.close();
}

async function openCurrentDatabase() {
  return requestResult(indexedDB.open("starvault-imprint", 5));
}

test("IndexedDB v5 migrates the legacy blob and stores high-volume collections as records", async () => {
  const createdAt = "2026-07-10T00:00:00.000Z";
  const project = {
    fullName: "acme/cad-viewer",
    name: "cad-viewer",
    stars: 42,
    pushedAt: createdAt,
    scores: { opportunity: 75 },
    observationPlanMatches: { cad: { planId: "cad" } }
  };
  const snapshot = {
    schema: "starvault-indexeddb-snapshot/v1",
    exportedAt: createdAt,
    activeObservationPlanId: "cad",
    settings: { activeObservationPlanId: "cad" },
    counts: { projects: 1, scans: 1, observationPlans: 1 },
    store: {
      version: 1,
      createdAt,
      updatedAt: createdAt,
      projects: { "acme/cad-viewer": project },
      observationPlans: { cad: { id: "cad", name: "CAD", memory: {}, userData: {} } },
      scans: [{ id: "scan-1", at: createdAt, observationPlanId: "cad" }],
      leaderboards: {
        daily: {
          "2026-07-10": {
            generatedAt: createdAt,
            items: [{ fullName: project.fullName, rank: 1 }]
          }
        }
      },
      memory: {}
    }
  };
  await seedLegacySnapshot(snapshot);

  const window = { indexedDB };
  vm.runInNewContext(storageSource, { window, indexedDB, IDBKeyRange, Date, JSON, Map, Set, Promise, Error, Object, Array, String, Number, Boolean });
  const api = window.StarVaultIndexedDB;
  const migrated = await api.getSnapshot();

  assert.equal(migrated.store.projects["acme/cad-viewer"].fullName, project.fullName);
  assert.equal(migrated.store.observationPlans.cad.name, "CAD");
  assert.equal(migrated.store.scans[0].id, "scan-1");
  assert.equal(migrated.store.leaderboards.daily["2026-07-10"].items[0].fullName, project.fullName);
  assert.equal((await api.getSnapshotMeta()).storageSchema, "starvault-indexeddb/v5");

  const db = await openCurrentDatabase();
  assert.deepEqual(Array.from(db.objectStoreNames), ["kv", "leaderboards", "meta", "plans", "projects", "scans", "taskArtifacts"]);
  const tx = db.transaction(["kv", "projects", "leaderboards"], "readonly");
  const legacy = await requestResult(tx.objectStore("kv").get("localSnapshot"));
  const projectStore = tx.objectStore("projects");
  const record = await requestResult(projectStore.get("acme/cad-viewer"));
  const leaderboardRecord = await requestResult(tx.objectStore("leaderboards").get("default|2026-07-10"));
  await transactionDone(tx);
  assert.equal(legacy, undefined);
  assert.deepEqual(record.planIds, ["cad"]);
  assert.deepEqual(record.scopePlanIds, ["cad"]);
  assert.equal(record.opportunity, 75);
  assert.equal(record.stars, 42);
  assert.ok(Array.from(projectStore.indexNames).includes("planIds"));
  assert.ok(Array.from(projectStore.indexNames).includes("scopePlanIds"));
  assert.equal(leaderboardRecord.value.items[0].fullName, project.fullName);
  db.close();

  assert.equal((await api.getProject("acme/cad-viewer")).fullName, project.fullName);
  assert.deepEqual(Array.from(await api.getProjectsByPlan("cad")).map((item) => item.fullName), [project.fullName]);
  assert.deepEqual(Array.from((await api.getProjectPageByPlan("cad", { offset: 0, limit: 1 })).items, (item) => item.fullName), [project.fullName]);

  migrated.store.observationPlans.cad.name = "CAD updated";
  migrated.store.projects["acme/cad-viewer"].description = "Updated in place";
  migrated.store.projects["acme/second"] = {
    fullName: "acme/second",
    name: "second",
    stars: 5,
    scores: { opportunity: 50 },
    observationPlanMatches: { cad: { planId: "cad" } }
  };
  migrated.counts.projects = 2;
  await api.putSnapshot(migrated);
  assert.equal((await api.getProject("acme/cad-viewer")).description, "Updated in place");
  assert.equal((await api.getSnapshot()).store.projects["acme/second"].name, "second");

  const coreOnlyWindow = { indexedDB, IDBKeyRange };
  vm.runInNewContext(storageSource, { window: coreOnlyWindow, indexedDB, IDBKeyRange, Date, JSON, Map, Set, Promise, Error, Object, Array, String, Number, Boolean, globalThis: { IDBKeyRange } });
  const coreApi = coreOnlyWindow.StarVaultIndexedDB;
  const coreOnly = await coreApi.getSnapshot({ includeProjects: false });
  assert.equal(Object.keys(coreOnly.store.projects).length, 0);
  coreOnly.store.observationPlans.cad.name = "Record-level core update";
  await coreApi.putSnapshot(coreOnly, { preserveProjects: true });
  assert.equal((await coreApi.getProject("acme/cad-viewer")).fullName, project.fullName);

  await coreApi.replaceProjectsForPlan("cad", [
    {
      fullName: "acme/replacement",
      name: "replacement",
      stars: 12,
      scores: { opportunity: 62 },
      observationPlanMatches: ["cad"]
    }
  ]);
  assert.deepEqual((await coreApi.getProjectsByPlan("cad")).map((item) => item.fullName), ["acme/replacement"]);
  assert.equal(await coreApi.countProjects(), 1);
  await coreApi.putLeaderboardRecords([
    {
      id: "cad|2026-07-11",
      planId: "cad",
      date: "2026-07-11",
      generatedAt: createdAt,
      value: { generatedAt: createdAt, items: [{ fullName: "acme/replacement", rank: 1 }] }
    }
  ]);
  assert.equal(await coreApi.countLeaderboards(), 2);
  const leaderboardPrune = await coreApi.deleteLeaderboardsExcept(["cad|2026-07-11"]);
  assert.equal(leaderboardPrune.deleted, 1);
  assert.equal(await coreApi.countLeaderboards(), 1);

  const writeOnlyWindow = { indexedDB, IDBKeyRange };
  vm.runInNewContext(storageSource, {
    window: writeOnlyWindow,
    indexedDB,
    IDBKeyRange,
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
    globalThis: { IDBKeyRange }
  });
  const writeOnlyApi = writeOnlyWindow.StarVaultIndexedDB;
  const serverCore = {
    ...coreOnly,
    store: { ...coreOnly.store, projects: {}, leaderboards: { daily: {}, byPlan: {} } },
    sync: { ...coreOnly.sync, projectsIncluded: false, leaderboardsIncluded: false }
  };
  // A server replacement compares against the local revision captured before
  // the request; this fixture has deliberately performed intervening writes.
  const expectedRevision = (await writeOnlyApi.getSnapshotMeta()).localRevision;
  await writeOnlyApi.putSnapshot(serverCore, { preserveProjects: true, preserveLeaderboards: true, expectedRevision });
  assert.equal((await writeOnlyApi.getProject("acme/replacement")).fullName, "acme/replacement");
  assert.equal(await writeOnlyApi.countLeaderboards(), 1);
  await coreApi.putProjects([{ fullName: "acme/stale", name: "stale", observationPlanMatches: ["default"] }]);
  const pruned = await coreApi.deleteProjectsExcept(["acme/replacement"]);
  assert.equal(pruned.deleted, 1);
  assert.equal(await coreApi.getProject("acme/stale"), null);
  assert.equal(await coreApi.countProjects(), 1);
});

test("IndexedDB reads return isolated copies and a core read invalidates stale plan caches", async () => {
  const factory = new IDBFactory();
  const first = createStorageApi(factory);
  await first.putSnapshot(snapshotFixture());

  const snapshot = await first.getSnapshot();
  snapshot.store.projects["acme/example"].description = "mutated snapshot";
  snapshot.store.observationPlans.default.name = "mutated plan";
  assert.equal((await first.getSnapshot()).store.projects["acme/example"].description, "before");
  assert.equal((await first.getSnapshot()).store.observationPlans.default.name, "Default");

  const byPlan = await first.getProjectsByPlan("default");
  byPlan[0].description = "mutated list";
  assert.equal((await first.getProjectsByPlan("default"))[0].description, "before");
  const page = await first.getProjectPageByPlan("default", { limit: 1 });
  page.items[0].description = "mutated page";
  assert.equal((await first.getProjectPageByPlan("default", { limit: 1 })).items[0].description, "before");

  const second = createStorageApi(factory);
  await second.replaceProjectsForPlan("default", [
    {
      fullName: "acme/replacement",
      description: "replacement",
      observationPlanMatches: { default: { planId: "default" } }
    }
  ]);
  await first.getSnapshot({ includeProjects: false });
  assert.deepEqual((await first.getProjectsByPlan("default")).map((item) => item.fullName), ["acme/replacement"]);
});

test("core-only snapshot updates preserve record-level projects until a full replacement is explicit", async () => {
  const api = createStorageApi();
  await api.putSnapshot(snapshotFixture());

  const core = await api.getSnapshot({ includeProjects: false });
  core.store.observationPlans.default.name = "Core updated";
  await api.putSnapshot(core, { preserveProjects: true, preserveLeaderboards: true });

  const full = await api.getSnapshot();
  assert.equal(full.store.observationPlans.default.name, "Core updated");
  assert.equal(full.store.projects["acme/example"].description, "before");
  assert.equal(await api.countProjects(), 1);
});

test("deleting a plan commits projects, plan, scans and leaderboards as one consistent change", async () => {
  const api = createStorageApi();
  const fixture = snapshotFixture({
    counts: { projects: 2, scans: 1, observationPlans: 2 },
    store: {
      projects: {
        "acme/custom-only": {
          fullName: "acme/custom-only",
          observationPlanMatches: { cad: { planId: "cad" } }
        },
        "acme/shared": {
          fullName: "acme/shared",
          observationPlanMatches: { default: { planId: "default" }, cad: { planId: "cad" } }
        }
      },
      observationPlans: {
        default: { id: "default", name: "Default", memory: {}, userData: {} },
        cad: { id: "cad", name: "CAD", memory: {}, userData: {} }
      },
      scans: [{ id: "scan-cad", at: "2026-07-18T01:00:00.000Z", observationPlanId: "cad" }],
      leaderboards: {
        daily: { "2026-07-18": { items: [{ fullName: "acme/shared" }] } },
        byPlan: { cad: { daily: { "2026-07-18": { items: [{ fullName: "acme/custom-only" }] } } } }
      }
    }
  });
  await api.putSnapshot(fixture);

  await api.deletePlanData("cad");

  const remaining = await api.getSnapshot();
  assert.equal(remaining.store.observationPlans.cad, undefined);
  assert.equal(remaining.store.projects["acme/custom-only"], undefined);
  assert.deepEqual(Object.keys(remaining.store.projects["acme/shared"].observationPlanMatches), ["default"]);
  assert.equal(remaining.store.scans.some((scan) => scan.observationPlanId === "cad"), false);
  assert.equal(remaining.store.leaderboards.byPlan.cad, undefined);
  assert.equal(remaining.store.leaderboards.daily["2026-07-18"].items[0].fullName, "acme/shared");
});

test("an aborted IndexedDB write leaves persisted records and in-memory hashes unchanged", async () => {
  const api = createStorageApi();
  await api.putSnapshot(snapshotFixture());
  await api.getSnapshot();

  const originalPut = IDBObjectStore.prototype.put;
  let abortProjectWrite = true;
  IDBObjectStore.prototype.put = function patchedPut(...args) {
    const request = originalPut.apply(this, args);
    if (abortProjectWrite && this.name === "projects" && this.transaction.mode === "readwrite") {
      abortProjectWrite = false;
      this.transaction.abort();
    }
    return request;
  };

  try {
    await assert.rejects(
      api.putProjects([
        {
          fullName: "acme/example",
          description: "after",
          observationPlanMatches: { default: { planId: "default" } }
        }
      ])
    );
  } finally {
    IDBObjectStore.prototype.put = originalPut;
  }

  assert.equal((await api.getProject("acme/example")).description, "before");
  assert.equal((await api.getSnapshot()).store.projects["acme/example"].description, "before");

  const retry = await api.getSnapshot();
  retry.store.projects["acme/example"].description = "after";
  await api.putSnapshot(retry);
  assert.equal((await api.getProject("acme/example")).description, "after");
});

function concurrencyFixture() {
  return snapshotFixture({
    settings: {
      activeObservationPlanId: "default",
      language: "zh",
      llmProviders: [{ id: "deepseek", name: "DeepSeek", model: "deepseek-chat", testStatus: "unknown" }]
    },
    store: {
      tasks: {},
      observationPlans: {
        default: { id: "default", name: "Default", memory: {}, userData: { notes: {}, watchlist: {} } }
      }
    }
  });
}

test("tracked snapshots merge disjoint settings and user records across two storage instances", async () => {
  const factory = new IDBFactory();
  const first = createStorageApi(factory);
  const second = createStorageApi(factory);
  await first.putSnapshot(concurrencyFixture());
  const left = await first.getSnapshot();
  const right = await second.getSnapshot();
  left.settings.language = "en";
  left.store.observationPlans.default.userData.notes["acme/left"] = { text: "left note" };
  right.settings.scanMaxRepos = 40;
  right.store.observationPlans.default.userData.watchlist["acme/right"] = { fullName: "acme/right" };
  await first.putSnapshot(left);
  await second.putSnapshot(right);

  const committed = await createStorageApi(factory).getSnapshot();
  assert.equal(committed.settings.language, "en");
  assert.equal(committed.settings.scanMaxRepos, 40);
  assert.equal(committed.store.observationPlans.default.userData.notes["acme/left"].text, "left note");
  assert.equal(committed.store.observationPlans.default.userData.watchlist["acme/right"].fullName, "acme/right");
});

test("tracked snapshots use last commit wins for conflicting fields without overwriting untouched fields", async () => {
  const factory = new IDBFactory();
  const first = createStorageApi(factory);
  const second = createStorageApi(factory);
  await first.putSnapshot(concurrencyFixture());
  const left = await first.getSnapshot();
  const right = await second.getSnapshot();
  left.settings.language = "en";
  left.store.observationPlans.default.name = "Renamed by first";
  right.settings.language = "ja";
  await first.putSnapshot(left);
  await second.putSnapshot(right);
  const committed = await createStorageApi(factory).getSnapshot();
  assert.equal(committed.settings.language, "ja");
  assert.equal(committed.store.observationPlans.default.name, "Renamed by first");
});

test("provider settings merge by provider id and field across stale snapshots", async () => {
  const factory = new IDBFactory();
  const first = createStorageApi(factory);
  const second = createStorageApi(factory);
  await first.putSnapshot(concurrencyFixture());
  const left = await first.getSnapshot();
  const right = await second.getSnapshot();
  left.settings.llmProviders[0].model = "deepseek-reasoner";
  right.settings.llmProviders[0].testStatus = "ok";
  await first.putSnapshot(left);
  await second.putSnapshot(right);
  const provider = (await createStorageApi(factory).getSnapshot()).settings.llmProviders.find((item) => item.id === "deepseek");
  assert.equal(provider.model, "deepseek-reasoner");
  assert.equal(provider.testStatus, "ok");
});

test("a stale task checkpoint preserves another tab's new plan, task, and scan", async () => {
  const factory = new IDBFactory();
  const first = createStorageApi(factory);
  const second = createStorageApi(factory);
  const fixture = concurrencyFixture();
  fixture.store.tasks.worker = { id: "worker", status: "running", checkpoint: { stage: "prepare", completedProfiles: [] } };
  await first.putSnapshot(fixture);
  const checkpoint = await first.getSnapshot();
  const edit = await second.getSnapshot();
  edit.store.observationPlans.cad = { id: "cad", name: "CAD", memory: {}, userData: {} };
  edit.store.tasks.other = { id: "other", status: "queued", input: { observationPlanId: "cad" } };
  edit.store.scans.push({ id: "scan-other", observationPlanId: "cad", at: "2026-07-19T00:00:00.000Z" });
  await second.putSnapshot(edit);
  checkpoint.store.tasks.worker.checkpoint.stage = "github";
  checkpoint.store.tasks.worker.checkpoint.completedProfiles = ["alpha"];
  await first.putSnapshot(checkpoint);
  const committed = await createStorageApi(factory).getSnapshot();
  assert.equal(committed.store.observationPlans.cad.name, "CAD");
  assert.equal(committed.store.tasks.other.status, "queued");
  assert.equal(committed.store.tasks.worker.checkpoint.stage, "github");
  assert.deepEqual(Array.from(committed.store.tasks.worker.checkpoint.completedProfiles), ["alpha"]);
  assert.equal(committed.store.scans.some((scan) => scan.id === "scan-other"), true);
});

test("repeated saves of the same old caller do not delete records merged from another tab", async () => {
  const factory = new IDBFactory();
  const first = createStorageApi(factory);
  const second = createStorageApi(factory);
  await first.putSnapshot(concurrencyFixture());
  const caller = await first.getSnapshot();
  const other = await second.getSnapshot();
  other.store.observationPlans.cad = { id: "cad", name: "CAD", memory: {}, userData: {} };
  other.store.tasks.other = { id: "other", status: "queued" };
  await second.putSnapshot(other);
  caller.settings.language = "en";
  await first.putSnapshot(caller);
  caller.store.observationPlans.default.name = "Edited again";
  await first.putSnapshot(caller);
  const committed = await createStorageApi(factory).getSnapshot();
  assert.equal(committed.store.observationPlans.cad.name, "CAD");
  assert.equal(committed.store.tasks.other.status, "queued");
  assert.equal(committed.store.observationPlans.default.name, "Edited again");
});

test("project and leaderboard writes in another instance invalidate snapshot and plan caches", async () => {
  const factory = new IDBFactory();
  const first = createStorageApi(factory);
  const second = createStorageApi(factory);
  await first.putSnapshot(concurrencyFixture());
  await first.getSnapshot();
  await first.getProjectsByPlan("default");
  await second.putProjects([{ fullName: "acme/example", description: "updated externally", observationPlanMatches: { default: { planId: "default" } } }]);
  await second.putLeaderboardRecords([{ id: "default|2026-07-19", planId: "default", date: "2026-07-19", value: { generatedAt: "2026-07-19T00:00:00.000Z", items: [{ fullName: "acme/example" }] } }]);
  const committed = await first.getSnapshot();
  assert.equal(committed.store.projects["acme/example"].description, "updated externally");
  assert.equal(committed.store.leaderboards.daily["2026-07-19"].items[0].fullName, "acme/example");
  assert.equal((await first.getProjectsByPlan("default"))[0].description, "updated externally");
});

test("untracked full replacements require a current revision and reject stale CAS", async () => {
  const factory = new IDBFactory();
  const first = createStorageApi(factory);
  const second = createStorageApi(factory);
  await first.putSnapshot(concurrencyFixture());
  const before = await first.getSnapshot();
  assert.notEqual(before.localRevision, undefined, "snapshots expose the local transaction revision");
  const edit = await second.getSnapshot();
  edit.store.observationPlans.default.userData.notes["acme/example"] = { text: "must survive" };
  await second.putSnapshot(edit);
  await assert.rejects(first.putSnapshot(concurrencyFixture(), { expectedRevision: before.localRevision }), (error) => error.code === "SNAPSHOT_CONFLICT");
  await assert.rejects(first.putSnapshot(concurrencyFixture()), (error) => error.code === "SNAPSHOT_CONFLICT");
  const current = await first.getSnapshot();
  assert.equal(current.store.observationPlans.default.userData.notes["acme/example"].text, "must survive");
  const replacement = concurrencyFixture();
  replacement.store.observationPlans.default.name = "Intentional replacement";
  await first.putSnapshot(replacement, { expectedRevision: current.localRevision });
  assert.equal((await second.getSnapshot()).store.observationPlans.default.name, "Intentional replacement");
});

test("revision commits preserve the existing v5 object stores and schema metadata", async () => {
  const factory = new IDBFactory();
  const api = createStorageApi(factory);
  await api.putSnapshot(concurrencyFixture());
  const old = await api.getSnapshot();
  old.settings.language = "en";
  await api.putSnapshot(old);
  const current = await api.getSnapshot();
  assert.notEqual(old.localRevision, undefined);
  assert.notEqual(current.localRevision, undefined);
  assert.equal((await api.getSnapshotMeta()).storageSchema, "starvault-indexeddb/v5");
  const db = await requestResult(factory.open("starvault-imprint", 5));
  assert.equal(db.version, 5);
  assert.deepEqual(Array.from(db.objectStoreNames), ["kv", "leaderboards", "meta", "plans", "projects", "scans", "taskArtifacts"]);
  db.close();
});

test("an aborted snapshot patch does not commit core or plan fields and remains retryable", async () => {
  const factory = new IDBFactory();
  const api = createStorageApi(factory);
  await api.putSnapshot(concurrencyFixture());
  const change = await api.getSnapshot();
  change.settings.language = "en";
  change.store.observationPlans.default.name = "After abort retry";
  const originalPut = IDBObjectStore.prototype.put;
  let aborted = false;
  IDBObjectStore.prototype.put = function abortPlanWrite(...args) {
    const request = originalPut.apply(this, args);
    if (!aborted && this.name === "plans" && this.transaction.mode === "readwrite") {
      aborted = true;
      this.transaction.abort();
    }
    return request;
  };
  try {
    await assert.rejects(api.putSnapshot(change));
    assert.equal(aborted, true, "the exercised snapshot transaction wrote the changed plan");
  } finally {
    IDBObjectStore.prototype.put = originalPut;
  }
  const afterAbort = await createStorageApi(factory).getSnapshot();
  assert.equal(afterAbort.settings.language, "zh");
  assert.equal(afterAbort.store.observationPlans.default.name, "Default");
  await api.putSnapshot(change);
  const retried = await createStorageApi(factory).getSnapshot();
  assert.equal(retried.settings.language, "en");
  assert.equal(retried.store.observationPlans.default.name, "After abort retry");
});

test("concurrent learning events merge their counters while explicit numeric preferences use commit order", async () => {
  const factory = new IDBFactory();
  const first = createStorageApi(factory);
  const second = createStorageApi(factory);
  const initial = concurrencyFixture();
  initial.store.observationPlans.default.memory = { events: [], shortTerm: [], preferences: { categories: { tools: 2 } }, stats: { eventCounts: { favorite: 0 } } };
  await first.putSnapshot(initial);
  const left = await first.getSnapshot();
  const right = await second.getSnapshot();
  for (const [snapshot, id] of [[left, "left"], [right, "right"]]) {
    const memory = snapshot.store.observationPlans.default.memory;
    memory.events.push({ id, type: "favorite" });
    memory.shortTerm.push({ id, type: "favorite" });
    memory.stats.eventCounts.favorite = 1;
    memory.preferences.categories.tools = 5;
  }
  await first.putSnapshot(left);
  await second.putSnapshot(right);
  const merged = await first.getSnapshot();
  assert.equal(merged.store.observationPlans.default.memory.events.length, 2);
  assert.equal(merged.store.observationPlans.default.memory.stats.eventCounts.favorite, 2);
  assert.equal(merged.store.observationPlans.default.memory.preferences.categories.tools, 8);
  const manual = await second.getSnapshot();
  const competing = await first.getSnapshot();
  manual.store.observationPlans.default.memory.preferences.categories.tools = 12;
  competing.store.observationPlans.default.memory.preferences.categories.tools = 20;
  await first.putSnapshot(competing);
  await second.putSnapshot(manual);
  assert.equal((await first.getSnapshot()).store.observationPlans.default.memory.preferences.categories.tools, 12);
});

test("overlapping saves of one caller apply each learning delta once", async () => {
  const api = createStorageApi();
  const fixture = concurrencyFixture();
  fixture.store.observationPlans.default.memory = { events: [], stats: { eventCounts: { favorite: 0 } } };
  await api.putSnapshot(fixture);
  const caller = await api.getSnapshot();
  caller.store.observationPlans.default.memory.events = [{ id: "once", type: "favorite" }];
  caller.store.observationPlans.default.memory.stats.eventCounts.favorite = 1;
  const first = api.putSnapshot(caller);
  caller.settings.language = "en";
  const second = api.putSnapshot(caller);
  await Promise.all([first, second]);
  const committed = await api.getSnapshot();
  assert.equal(committed.store.observationPlans.default.memory.events.length, 1);
  assert.equal(committed.store.observationPlans.default.memory.stats.eventCounts.favorite, 1);
  assert.equal(committed.settings.language, "en");
});

test("an obsolete task result cannot resurrect a plan deleted after its read", async () => {
  const factory = new IDBFactory();
  const first = createStorageApi(factory);
  const second = createStorageApi(factory);
  const fixture = concurrencyFixture();
  fixture.store.observationPlans.other = { id: "other", memory: {}, userData: { analysis: {} } };
  await first.putSnapshot(fixture);
  const task = await first.getSnapshot();
  const deletion = await second.getSnapshot();
  delete deletion.store.observationPlans.other;
  await second.putSnapshot(deletion);
  task.store.observationPlans.other.userData.analysis["acme/example"] = { summary: "obsolete" };
  await assert.rejects(first.putSnapshot(task), (error) => error.code === "SNAPSHOT_CONFLICT");
  assert.equal((await second.getSnapshot()).store.observationPlans.other, undefined);
});

test("settings credentials commit only the changed key from their read baseline", async () => {
  const factory = new IDBFactory();
  const first = createStorageApi(factory);
  const second = createStorageApi(factory);
  await first.putValue("localSecrets", { githubToken: "fixture-before", llmProviders: {} });
  const left = await first.getValue("localSecrets");
  const right = await second.getValue("localSecrets");
  await first.putValue("localSecrets", { ...left, githubToken: "fixture-after" }, { base: left });
  await second.putValue("localSecrets", { ...right, llmProviders: { deepseek: { apiKey: "fixture-model" } } }, { base: right });
  const committed = await first.getValue("localSecrets");
  assert.equal(committed.githubToken, "fixture-after");
  assert.equal(committed.llmProviders.deepseek.apiKey, "fixture-model");
});

test("a learning bucket deletion preserves another caller's independent contribution", async () => {
  const factory = new IDBFactory();
  const first = createStorageApi(factory);
  const second = createStorageApi(factory);
  const fixture = concurrencyFixture();
  fixture.store.observationPlans.default.memory = {
    events: [{ id: "old", type: "favorite", weight: 3 }],
    preferences: { categories: { tools: 3 } },
    stats: { eventCounts: { favorite: 1 } }
  };
  await first.putSnapshot(fixture);
  const addition = await first.getSnapshot();
  const removal = await second.getSnapshot();
  const addMemory = addition.store.observationPlans.default.memory;
  addMemory.events.unshift({ id: "new", type: "favorite", weight: 3 });
  addMemory.preferences.categories.tools = 6;
  addMemory.stats.eventCounts.favorite = 2;
  const removeMemory = removal.store.observationPlans.default.memory;
  removeMemory.events = [];
  delete removeMemory.preferences.categories.tools;
  removeMemory.stats.eventCounts.favorite = 0;
  await first.putSnapshot(addition);
  await second.putSnapshot(removal);
  const memory = (await first.getSnapshot()).store.observationPlans.default.memory;
  assert.equal(memory.events.length, 1);
  assert.equal(memory.events[0].id, "new");
  assert.equal(memory.stats.eventCounts.favorite, 1);
  assert.equal(memory.preferences.categories.tools, 3);
});

test("registered learning operations preserve raw deltas across clamps and consume each operation once", async () => {
  const factory = new IDBFactory();
  const first = createStorageApi(factory);
  const second = createStorageApi(factory);
  const fixture = concurrencyFixture();
  fixture.store.observationPlans.default.memory = {
    events: [{ id: "old", type: "favorite", weight: 3 }],
    preferences: { categories: { tools: 1 } },
    stats: { eventCounts: { favorite: 1 } }
  };
  await first.putSnapshot(fixture);
  const addition = await first.getSnapshot();
  const removal = await second.getSnapshot();
  const addMemory = addition.store.observationPlans.default.memory;
  addMemory.events.unshift({ id: "new", type: "favorite", weight: 3 });
  addMemory.preferences.categories.tools = 4;
  addMemory.stats.eventCounts.favorite = 2;
  first.registerSnapshotOperations(addition, "default", [
    { path: ["preferences", "categories", "tools"], delta: 3, min: 0, max: 40 },
    { path: ["stats", "eventCounts", "favorite"], delta: 1, min: 0 }
  ]);
  const removeMemory = removal.store.observationPlans.default.memory;
  removeMemory.events = [];
  delete removeMemory.preferences.categories.tools;
  removeMemory.stats.eventCounts.favorite = 0;
  second.registerSnapshotOperations(removal, "default", [
    { path: ["preferences", "categories", "tools"], delta: -3, min: 0, max: 40 },
    { path: ["stats", "eventCounts", "favorite"], delta: -1, min: 0 }
  ]);
  await first.putSnapshot(addition);
  const save = second.putSnapshot(removal);
  removal.settings.language = "en";
  const checkpoint = second.putSnapshot(removal);
  await Promise.all([save, checkpoint]);
  await second.putSnapshot(removal);
  const memory = (await first.getSnapshot()).store.observationPlans.default.memory;
  assert.equal(memory.events.length, 1);
  assert.equal(memory.stats.eventCounts.favorite, 1);
  assert.equal(memory.preferences.categories.tools, 1, "undo subtracts raw weight 3 from the latest value 4");
  assert.equal((await first.getSnapshot()).settings.language, "en");
});

test("an untracked serialized snapshot cannot replace an existing workspace without explicit CAS options", async () => {
  const api = createStorageApi();
  await api.putSnapshot(concurrencyFixture());
  const serialized = JSON.parse(JSON.stringify(await api.getSnapshot()));
  serialized.settings.language = "en";
  await assert.rejects(api.putSnapshot(serialized), (error) => error.code === "SNAPSHOT_CONFLICT");
  assert.equal((await api.getSnapshot()).settings.language, "zh");
  await api.putSnapshot(serialized, { expectedRevision: serialized.localRevision });
  assert.equal((await api.getSnapshot()).settings.language, "en");
});

test("a failed transaction retains registered learning operations for retry", async () => {
  const factory = new IDBFactory();
  const first = createStorageApi(factory);
  const second = createStorageApi(factory);
  const fixture = concurrencyFixture();
  fixture.store.observationPlans.default.memory = {
    events: [{ id: "old", type: "favorite", weight: 3 }],
    preferences: { categories: { tools: 1 } },
    stats: { eventCounts: { favorite: 1 } }
  };
  await first.putSnapshot(fixture);
  const removal = await first.getSnapshot();
  const addition = await second.getSnapshot();
  addition.store.observationPlans.default.memory.events.unshift({ id: "new", type: "favorite", weight: 3 });
  addition.store.observationPlans.default.memory.preferences.categories.tools = 4;
  addition.store.observationPlans.default.memory.stats.eventCounts.favorite = 2;
  await second.putSnapshot(addition);
  removal.store.observationPlans.default.memory.events = [];
  delete removal.store.observationPlans.default.memory.preferences.categories.tools;
  removal.store.observationPlans.default.memory.stats.eventCounts.favorite = 0;
  first.registerSnapshotOperations(removal, "default", [
    { path: ["preferences", "categories", "tools"], delta: -3, min: 0, max: 40 },
    { path: ["stats", "eventCounts", "favorite"], delta: -1, min: 0 }
  ]);
  const originalPut = IDBObjectStore.prototype.put;
  let aborted = false;
  IDBObjectStore.prototype.put = function abortRegisteredOperation(...args) {
    const request = originalPut.apply(this, args);
    if (!aborted && this.name === "plans" && this.transaction.mode === "readwrite") {
      aborted = true;
      this.transaction.abort();
    }
    return request;
  };
  try {
    await assert.rejects(first.putSnapshot(removal));
    assert.equal(aborted, true);
  } finally {
    IDBObjectStore.prototype.put = originalPut;
  }
  assert.equal((await second.getSnapshot()).store.observationPlans.default.memory.preferences.categories.tools, 4);
  await first.putSnapshot(removal);
  await first.putSnapshot(removal);
  const memory = (await second.getSnapshot()).store.observationPlans.default.memory;
  assert.equal(memory.preferences.categories.tools, 1);
  assert.equal(memory.stats.eventCounts.favorite, 1);
  assert.equal(memory.events.length, 1);
});

test("new registered operations on an overlapping save apply after the prior caller checkpoint", async () => {
  const api = createStorageApi();
  const fixture = concurrencyFixture();
  fixture.store.observationPlans.default.memory = { events: [], preferences: { categories: { tools: 2 } }, stats: { eventCounts: { favorite: 0 } } };
  await api.putSnapshot(fixture);
  const caller = await api.getSnapshot();
  const memory = caller.store.observationPlans.default.memory;
  const mutate = (id) => {
    memory.events.unshift({ id, type: "favorite", weight: 3 });
    memory.preferences.categories.tools += 3;
    memory.stats.eventCounts.favorite += 1;
    api.registerSnapshotOperations(caller, "default", [
      { path: ["preferences", "categories", "tools"], delta: 3, min: 0, max: 40 },
      { path: ["stats", "eventCounts", "favorite"], delta: 1, min: 0 }
    ]);
  };
  mutate("first");
  const first = api.putSnapshot(caller);
  mutate("second");
  const second = api.putSnapshot(caller);
  await Promise.all([first, second]);
  await api.putSnapshot(caller);
  const persisted = (await api.getSnapshot()).store.observationPlans.default.memory;
  assert.equal(persisted.preferences.categories.tools, 8);
  assert.equal(persisted.stats.eventCounts.favorite, 2);
  assert.equal(persisted.events.length, 2);
});

test("a later explicit numeric setter in a caller is not replaced by its earlier registered delta", async () => {
  const factory = new IDBFactory();
  const first = createStorageApi(factory);
  const second = createStorageApi(factory);
  const fixture = concurrencyFixture();
  fixture.store.observationPlans.default.memory = { events: [], preferences: { categories: { tools: 2 } } };
  await first.putSnapshot(fixture);
  const caller = await first.getSnapshot();
  const competing = await second.getSnapshot();
  caller.store.observationPlans.default.memory.events = [{ id: "favorite", type: "favorite" }];
  caller.store.observationPlans.default.memory.preferences.categories.tools = 5;
  first.registerSnapshotOperations(caller, "default", [{ path: ["preferences", "categories", "tools"], delta: 3, min: 0, max: 40 }]);
  caller.store.observationPlans.default.memory.preferences.categories.tools = 12;
  competing.store.observationPlans.default.memory.preferences.categories.tools = 20;
  await second.putSnapshot(competing);
  await first.putSnapshot(caller);
  assert.equal((await second.getSnapshot()).store.observationPlans.default.memory.preferences.categories.tools, 12);
});
