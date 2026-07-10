const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { indexedDB, IDBKeyRange } = require("fake-indexeddb");

const storageSource = fs.readFileSync(path.join(__dirname, "../public/indexeddb-storage.js"), "utf8");

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
  return requestResult(indexedDB.open("starvault-imprint", 4));
}

test("IndexedDB v4 migrates the legacy blob and stores high-volume collections as records", async () => {
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
  assert.equal((await api.getSnapshotMeta()).storageSchema, "starvault-indexeddb/v4");

  const db = await openCurrentDatabase();
  assert.deepEqual(Array.from(db.objectStoreNames), ["kv", "leaderboards", "meta", "plans", "projects", "scans"]);
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
  assert.deepEqual((await api.getProjectsByPlan("cad")).map((item) => item.fullName), [project.fullName]);

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
  await writeOnlyApi.putSnapshot(serverCore, { preserveProjects: true, preserveLeaderboards: true });
  assert.equal((await writeOnlyApi.getProject("acme/replacement")).fullName, "acme/replacement");
  assert.equal(await writeOnlyApi.countLeaderboards(), 1);
  await coreApi.putProjects([{ fullName: "acme/stale", name: "stale", observationPlanMatches: ["default"] }]);
  const pruned = await coreApi.deleteProjectsExcept(["acme/replacement"]);
  assert.equal(pruned.deleted, 1);
  assert.equal(await coreApi.getProject("acme/stale"), null);
  assert.equal(await coreApi.countProjects(), 1);
});
