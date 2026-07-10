(function () {
  const DB_NAME = "starvault-imprint";
  const DB_VERSION = 4;
  const STORES = {
    kv: "kv",
    meta: "meta",
    projects: "projects",
    plans: "plans",
    scans: "scans",
    leaderboards: "leaderboards"
  };
  const SNAPSHOT_KEY = "localSnapshot";
  const SNAPSHOT_META_KEY = "localSnapshotMeta";
  const CORE_KEY = "snapshotCore";
  const LEGACY_LEADERBOARDS_KEY = "leaderboards";

  let dbPromise = null;
  let cachedSnapshot = null;
  let persistedProjectHashes = new Map();
  let persistedPlanHashes = new Map();
  let persistedScanHashes = new Map();
  let persistedLeaderboardHashes = new Map();
  let persistedCoreHash = "";
  let cachedSnapshotHasProjects = false;
  let cachedSnapshotHasLeaderboards = false;

  function isSupported() {
    return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
  }

  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("IndexedDB request failed"));
    });
  }

  function transactionDone(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("IndexedDB transaction failed"));
      tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted"));
    });
  }

  function stableJson(value) {
    return JSON.stringify(value ?? null);
  }

  function projectPlanIds(project = {}) {
    const matches = project.observationPlanMatches || project.observationMatches || [];
    if (Array.isArray(matches)) {
      return matches
        .map((match) => String(typeof match === "string" ? match : match?.planId || match?.id || ""))
        .filter(Boolean);
    }
    return Object.keys(matches || {});
  }

  function projectRecord(key, project) {
    const planIds = projectPlanIds(project);
    return {
      key,
      fullName: String(project?.fullName || key),
      planIds,
      scopePlanIds: planIds.length ? planIds : ["default"],
      opportunity: Number(project?.scores?.opportunity || 0),
      stars: Number(project?.stars || 0),
      pushedAt: String(project?.pushedAt || project?.updatedAt || ""),
      value: project
    };
  }

  function leaderboardRecords(leaderboards = {}) {
    const records = [];
    const append = (planId, daily = {}) => {
      for (const [date, value] of Object.entries(daily || {})) {
        records.push({
          id: `${encodeURIComponent(planId)}|${date}`,
          planId,
          date,
          generatedAt: String(value?.generatedAt || ""),
          value
        });
      }
    };
    append("default", leaderboards.daily);
    for (const [planId, archive] of Object.entries(leaderboards.byPlan || {})) append(planId, archive?.daily);
    return records.sort((a, b) => a.id.localeCompare(b.id));
  }

  function assembleLeaderboards(records = []) {
    const leaderboards = { daily: {}, byPlan: {} };
    for (const record of records) {
      const planId = String(record?.planId || "default");
      const date = String(record?.date || "");
      if (!date) continue;
      if (planId === "default") leaderboards.daily[date] = record.value;
      else {
        leaderboards.byPlan[planId] = leaderboards.byPlan[planId] || { daily: {} };
        leaderboards.byPlan[planId].daily[date] = record.value;
      }
    }
    return leaderboards;
  }

  function snapshotCore(snapshot) {
    const core = { ...snapshot, store: { ...(snapshot.store || {}) } };
    delete core.store.projects;
    delete core.store.observationPlans;
    delete core.store.scans;
    delete core.store.leaderboards;
    return core;
  }

  function snapshotMeta(snapshot) {
    const store = snapshot?.store || {};
    return {
      storageSchema: "starvault-indexeddb/v4",
      schema: snapshot?.schema || "",
      exportedAt: snapshot?.exportedAt || "",
      savedAt: new Date().toISOString(),
      counts: {
        projects: Number(snapshot?.counts?.projects ?? Object.keys(store.projects || {}).length),
        scans: Number(snapshot?.counts?.scans ?? (Array.isArray(store.scans) ? store.scans.length : 0)),
        observationPlans: Number(snapshot?.counts?.observationPlans ?? Object.keys(store.observationPlans || {}).length)
      },
      activeObservationPlanId: snapshot?.activeObservationPlanId || snapshot?.settings?.activeObservationPlanId || "default",
      projectRevision: String(snapshot?.sync?.projectRevision || ""),
      leaderboardRevision: String(snapshot?.sync?.leaderboardRevision || ""),
      projectsIncluded: Boolean(snapshot?.sync?.projectsIncluded),
      leaderboardsIncluded: Boolean(snapshot?.sync?.leaderboardsIncluded),
      secretsIncluded: Boolean(snapshot?.privacy?.secretsIncluded)
    };
  }

  function ensureIndex(store, name, keyPath, options = {}) {
    if (!store.indexNames.contains(name)) store.createIndex(name, keyPath, options);
  }

  function createSchema(db, upgradeTransaction = null) {
    if (!db.objectStoreNames.contains(STORES.kv)) {
      db.createObjectStore(STORES.kv, { keyPath: "key" });
    }
    if (!db.objectStoreNames.contains(STORES.meta)) {
      db.createObjectStore(STORES.meta, { keyPath: "key" });
    }
    const projects = db.objectStoreNames.contains(STORES.projects)
      ? upgradeTransaction?.objectStore(STORES.projects)
      : db.createObjectStore(STORES.projects, { keyPath: "key" });
    if (projects) {
      ensureIndex(projects, "fullName", "fullName", { unique: true });
      ensureIndex(projects, "planIds", "planIds", { multiEntry: true });
      ensureIndex(projects, "scopePlanIds", "scopePlanIds", { multiEntry: true });
      ensureIndex(projects, "opportunity", "opportunity");
      ensureIndex(projects, "stars", "stars");
      ensureIndex(projects, "pushedAt", "pushedAt");
    }
    if (!db.objectStoreNames.contains(STORES.plans)) {
      db.createObjectStore(STORES.plans, { keyPath: "id" });
    }
    if (!db.objectStoreNames.contains(STORES.scans)) {
      const scans = db.createObjectStore(STORES.scans, { keyPath: "id" });
      scans.createIndex("at", "at");
      scans.createIndex("observationPlanId", "observationPlanId");
    }
    if (!db.objectStoreNames.contains(STORES.leaderboards)) {
      const leaderboards = db.createObjectStore(STORES.leaderboards, { keyPath: "id" });
      leaderboards.createIndex("planId", "planId");
      leaderboards.createIndex("date", "date");
    }
  }

  function backfillProjectScopes(upgradeTransaction) {
    if (!upgradeTransaction) return;
    const store = upgradeTransaction.objectStore(STORES.projects);
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      const record = cursor.value;
      const planIds = Array.isArray(record.planIds) ? record.planIds.filter(Boolean) : [];
      const scopePlanIds = planIds.length ? planIds : ["default"];
      if (!Array.isArray(record.scopePlanIds) || record.scopePlanIds.join("\u0000") !== scopePlanIds.join("\u0000")) {
        cursor.update({ ...record, scopePlanIds });
      }
      cursor.continue();
    };
  }

  function cachePersistedState(snapshot, options = {}) {
    cachedSnapshot = snapshot;
    cachedSnapshotHasProjects = options.hasProjects !== false;
    cachedSnapshotHasLeaderboards = options.hasLeaderboards !== false;
    if (cachedSnapshotHasProjects) {
      persistedProjectHashes = new Map(
        Object.entries(snapshot?.store?.projects || {}).map(([key, project]) => [key, stableJson(project)])
      );
    }
    persistedPlanHashes = new Map(
      Object.entries(snapshot?.store?.observationPlans || {}).map(([id, plan]) => [id, stableJson(plan)])
    );
    persistedScanHashes = new Map(
      (snapshot?.store?.scans || []).map((scan) => [String(scan.id || ""), stableJson(scan)])
    );
    if (cachedSnapshotHasLeaderboards) {
      persistedLeaderboardHashes = new Map(
        leaderboardRecords(snapshot?.store?.leaderboards || {}).map((record) => [record.id, stableJson(record.value)])
      );
    }
    persistedCoreHash = stableJson(snapshotCore(snapshot));
  }

  async function persistSnapshotWithDb(db, snapshot, force = false, options = {}) {
    const preserveProjects = options.preserveProjects === true;
    const preserveLeaderboards = options.preserveLeaderboards === true;
    const projects = snapshot?.store?.projects || {};
    const plans = snapshot?.store?.observationPlans || {};
    const scans = Array.isArray(snapshot?.store?.scans) ? snapshot.store.scans : [];
    const core = snapshotCore(snapshot);
    const leaderboards = leaderboardRecords(snapshot?.store?.leaderboards || {});
    const coreHash = stableJson(core);
    const nextProjectKeys = new Set(Object.keys(projects));
    const nextProjectHashes = new Map();
    const nextPlanIds = new Set(Object.keys(plans));
    const nextScanIds = new Set(scans.map((scan) => String(scan.id || "")).filter(Boolean));
    const nextLeaderboardIds = new Set(leaderboards.map((record) => record.id));
    const nextPlanHashes = new Map();
    const nextScanHashes = new Map();
    const nextLeaderboardHashes = new Map();
    const changedProjects = [];
    const changedPlans = [];
    const changedScans = [];
    const changedLeaderboards = [];

    for (const [key, project] of Object.entries(projects)) {
      const hash = stableJson(project);
      nextProjectHashes.set(key, hash);
      if (!preserveProjects && (force || persistedProjectHashes.get(key) !== hash)) changedProjects.push([key, project]);
    }
    for (const [id, plan] of Object.entries(plans)) {
      const hash = stableJson(plan);
      nextPlanHashes.set(id, hash);
      if (force || persistedPlanHashes.get(id) !== hash) changedPlans.push([id, plan]);
    }
    for (const scan of scans) {
      const id = String(scan.id || "");
      if (!id) continue;
      const hash = stableJson(scan);
      nextScanHashes.set(id, hash);
      if (force || persistedScanHashes.get(id) !== hash) changedScans.push(scan);
    }
    for (const record of leaderboards) {
      const hash = stableJson(record.value);
      nextLeaderboardHashes.set(record.id, hash);
      if (!preserveLeaderboards && (force || persistedLeaderboardHashes.get(record.id) !== hash)) changedLeaderboards.push(record);
    }

    const deletedProjects = force || preserveProjects ? [] : [...persistedProjectHashes.keys()].filter((key) => !nextProjectKeys.has(key));
    const deletedPlans = force ? [] : [...persistedPlanHashes.keys()].filter((id) => !nextPlanIds.has(id));
    const deletedScans = force ? [] : [...persistedScanHashes.keys()].filter((id) => !nextScanIds.has(id));
    const deletedLeaderboards = force || preserveLeaderboards
      ? []
      : [...persistedLeaderboardHashes.keys()].filter((id) => !nextLeaderboardIds.has(id));
    const tx = db.transaction([STORES.meta, STORES.projects, STORES.plans, STORES.scans, STORES.leaderboards], "readwrite");
    const metaStore = tx.objectStore(STORES.meta);
    const projectStore = tx.objectStore(STORES.projects);
    const planStore = tx.objectStore(STORES.plans);
    const scanStore = tx.objectStore(STORES.scans);
    const leaderboardStore = tx.objectStore(STORES.leaderboards);

    if (force || persistedCoreHash !== coreHash) metaStore.put({ key: CORE_KEY, value: core, updatedAt: new Date().toISOString() });
    metaStore.put({ key: SNAPSHOT_META_KEY, value: snapshotMeta(snapshot), updatedAt: new Date().toISOString() });
    changedProjects.forEach(([key, project]) => projectStore.put(projectRecord(key, project)));
    changedPlans.forEach(([id, plan]) => planStore.put({ id, value: plan }));
    changedScans.forEach((scan) => scanStore.put({ ...scan, id: String(scan.id), value: scan }));
    changedLeaderboards.forEach((record) => leaderboardStore.put(record));
    deletedProjects.forEach((key) => projectStore.delete(key));
    deletedPlans.forEach((id) => planStore.delete(id));
    deletedScans.forEach((id) => scanStore.delete(id));
    deletedLeaderboards.forEach((id) => leaderboardStore.delete(id));
    await transactionDone(tx);

    const previousSnapshot = cachedSnapshot;
    cachedSnapshot = snapshot;
    if (!preserveProjects) {
      persistedProjectHashes = nextProjectHashes;
      cachedSnapshotHasProjects = true;
    } else if (cachedSnapshotHasProjects && previousSnapshot?.store?.projects) {
      cachedSnapshot.store.projects = previousSnapshot.store.projects;
    } else {
      cachedSnapshotHasProjects = false;
    }
    if (!preserveLeaderboards) {
      persistedLeaderboardHashes = nextLeaderboardHashes;
      cachedSnapshotHasLeaderboards = true;
    } else if (cachedSnapshotHasLeaderboards && previousSnapshot?.store?.leaderboards) {
      cachedSnapshot.store.leaderboards = previousSnapshot.store.leaderboards;
    } else {
      cachedSnapshotHasLeaderboards = false;
    }
    persistedPlanHashes = nextPlanHashes;
    persistedScanHashes = nextScanHashes;
    persistedCoreHash = coreHash;
    return snapshotMeta(snapshot);
  }

  async function migrateLegacySnapshot(db) {
    const checkTx = db.transaction([STORES.kv, STORES.meta], "readonly");
    const [existingCore, legacyRecord] = await Promise.all([
      requestToPromise(checkTx.objectStore(STORES.meta).get(CORE_KEY)),
      requestToPromise(checkTx.objectStore(STORES.kv).get(SNAPSHOT_KEY))
    ]);
    await transactionDone(checkTx);
    if (existingCore || !legacyRecord?.value) return;
    await persistSnapshotWithDb(db, legacyRecord.value, true);
    const cleanupTx = db.transaction(STORES.kv, "readwrite");
    cleanupTx.objectStore(STORES.kv).delete(SNAPSHOT_KEY);
    cleanupTx.objectStore(STORES.kv).delete(SNAPSHOT_META_KEY);
    await transactionDone(cleanupTx);
  }

  async function migrateLegacyLeaderboards(db) {
    const checkTx = db.transaction([STORES.meta, STORES.leaderboards], "readonly");
    const [legacyRecord, currentCount] = await Promise.all([
      requestToPromise(checkTx.objectStore(STORES.meta).get(LEGACY_LEADERBOARDS_KEY)),
      requestToPromise(checkTx.objectStore(STORES.leaderboards).count())
    ]);
    await transactionDone(checkTx);
    if (!legacyRecord?.value) return;
    const tx = db.transaction([STORES.meta, STORES.leaderboards], "readwrite");
    const store = tx.objectStore(STORES.leaderboards);
    if (Number(currentCount || 0) === 0) leaderboardRecords(legacyRecord.value).forEach((record) => store.put(record));
    tx.objectStore(STORES.meta).delete(LEGACY_LEADERBOARDS_KEY);
    await transactionDone(tx);
  }

  async function openDb() {
    if (!isSupported()) throw new Error("IndexedDB is not supported in this browser");
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          createSchema(request.result, request.transaction);
          backfillProjectScopes(request.transaction);
        };
        request.onsuccess = async () => {
          const db = request.result;
          db.onversionchange = () => {
            db.close();
            dbPromise = null;
            cachedSnapshot = null;
          };
          try {
            await migrateLegacySnapshot(db);
            await migrateLegacyLeaderboards(db);
            resolve(db);
          } catch (error) {
            db.close();
            dbPromise = null;
            reject(error);
          }
        };
        request.onerror = () => reject(request.error || new Error("IndexedDB open failed"));
        request.onblocked = () => reject(new Error("IndexedDB upgrade is blocked by another tab"));
      });
    }
    return dbPromise;
  }

  async function getValue(key) {
    const db = await openDb();
    const tx = db.transaction(STORES.kv, "readonly");
    const record = await requestToPromise(tx.objectStore(STORES.kv).get(key));
    await transactionDone(tx);
    return record ? record.value : null;
  }

  async function putValue(key, value) {
    const db = await openDb();
    const updatedAt = new Date().toISOString();
    const tx = db.transaction(STORES.kv, "readwrite");
    tx.objectStore(STORES.kv).put({ key, value, updatedAt });
    await transactionDone(tx);
    return { key, updatedAt };
  }

  async function removeValue(key) {
    const db = await openDb();
    const tx = db.transaction(STORES.kv, "readwrite");
    tx.objectStore(STORES.kv).delete(key);
    await transactionDone(tx);
  }

  async function getSnapshot(options = {}) {
    const includeProjects = options.includeProjects !== false;
    const includeLeaderboards = options.includeLeaderboards !== false;
    if (
      cachedSnapshot &&
      (!includeProjects || cachedSnapshotHasProjects) &&
      (!includeLeaderboards || cachedSnapshotHasLeaderboards)
    ) {
      return cachedSnapshot;
    }
    const db = await openDb();
    const tx = db.transaction([STORES.meta, STORES.projects, STORES.plans, STORES.scans, STORES.leaderboards], "readonly");
    const metaStore = tx.objectStore(STORES.meta);
    const [coreRecord, projectRecords, planRecords, scanRecords, leaderboardEntries] = await Promise.all([
      requestToPromise(metaStore.get(CORE_KEY)),
      includeProjects ? requestToPromise(tx.objectStore(STORES.projects).getAll()) : Promise.resolve([]),
      requestToPromise(tx.objectStore(STORES.plans).getAll()),
      requestToPromise(tx.objectStore(STORES.scans).getAll()),
      includeLeaderboards ? requestToPromise(tx.objectStore(STORES.leaderboards).getAll()) : Promise.resolve([])
    ]);
    await transactionDone(tx);
    if (!coreRecord?.value) return null;
    const snapshot = coreRecord.value;
    snapshot.store = snapshot.store || {};
    snapshot.store.projects = includeProjects ? Object.fromEntries(projectRecords.map((record) => [record.key, record.value])) : {};
    snapshot.store.observationPlans = Object.fromEntries(planRecords.map((record) => [record.id, record.value]));
    snapshot.store.scans = scanRecords.map((record) => record.value).sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
    snapshot.store.leaderboards = includeLeaderboards ? assembleLeaderboards(leaderboardEntries) : { daily: {}, byPlan: {} };
    cachePersistedState(snapshot, { hasProjects: includeProjects, hasLeaderboards: includeLeaderboards });
    return snapshot;
  }

  async function putSnapshot(snapshot, options = {}) {
    if (!snapshot || snapshot.schema !== "starvault-indexeddb-snapshot/v1") {
      throw new Error("Invalid StarVault IndexedDB snapshot");
    }
    const db = await openDb();
    if (!cachedSnapshot) {
      await getSnapshot({
        includeProjects: options.preserveProjects !== true,
        includeLeaderboards: options.preserveLeaderboards !== true
      });
    }
    return persistSnapshotWithDb(db, snapshot, false, options);
  }

  async function getProject(key) {
    const db = await openDb();
    const tx = db.transaction(STORES.projects, "readonly");
    const record = await requestToPromise(tx.objectStore(STORES.projects).get(String(key || "").toLowerCase()));
    await transactionDone(tx);
    return record?.value || null;
  }

  async function getProjects(keys = []) {
    const uniqueKeys = Array.from(new Set((keys || []).map((key) => String(key || "").toLowerCase()).filter(Boolean)));
    if (!uniqueKeys.length) return [];
    const db = await openDb();
    const tx = db.transaction(STORES.projects, "readonly");
    const store = tx.objectStore(STORES.projects);
    const records = await Promise.all(uniqueKeys.map((key) => requestToPromise(store.get(key))));
    await transactionDone(tx);
    return records.filter(Boolean).map((record) => record.value);
  }

  async function getProjectsByPlan(planId = "default") {
    const db = await openDb();
    const tx = db.transaction(STORES.projects, "readonly");
    const index = tx.objectStore(STORES.projects).index("scopePlanIds");
    const keyRange = (window.IDBKeyRange || globalThis.IDBKeyRange).only(String(planId || "default"));
    const records = await requestToPromise(index.getAll(keyRange));
    await transactionDone(tx);
    return records.map((record) => record.value);
  }

  async function putProjects(projects = []) {
    const entries = Array.isArray(projects) ? projects : Object.values(projects || {});
    if (!entries.length) return { updated: 0 };
    const db = await openDb();
    const tx = db.transaction(STORES.projects, "readwrite");
    const store = tx.objectStore(STORES.projects);
    for (const project of entries) {
      const key = String(project?.fullName || project?.key || "").toLowerCase();
      if (!key) continue;
      store.put(projectRecord(key, project));
      persistedProjectHashes.set(key, stableJson(project));
      if (cachedSnapshotHasProjects && cachedSnapshot?.store?.projects) cachedSnapshot.store.projects[key] = project;
    }
    await transactionDone(tx);
    return { updated: entries.length };
  }

  async function putLeaderboardRecords(records = []) {
    const entries = Array.isArray(records) ? records.filter((record) => record?.id && record?.date) : [];
    if (!entries.length) return { updated: 0 };
    const db = await openDb();
    const tx = db.transaction(STORES.leaderboards, "readwrite");
    const store = tx.objectStore(STORES.leaderboards);
    for (const record of entries) {
      store.put({
        id: String(record.id),
        planId: String(record.planId || "default"),
        date: String(record.date),
        generatedAt: String(record.generatedAt || record.value?.generatedAt || ""),
        value: record.value
      });
      persistedLeaderboardHashes.set(String(record.id), stableJson(record.value));
    }
    await transactionDone(tx);
    cachedSnapshotHasLeaderboards = false;
    return { updated: entries.length };
  }

  async function deleteLeaderboardsExcept(ids = []) {
    const retained = new Set((ids || []).map(String).filter(Boolean));
    const db = await openDb();
    const tx = db.transaction(STORES.leaderboards, "readwrite");
    const store = tx.objectStore(STORES.leaderboards);
    let deleted = 0;
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      if (!retained.has(String(cursor.key))) {
        persistedLeaderboardHashes.delete(String(cursor.key));
        cursor.delete();
        deleted += 1;
      }
      cursor.continue();
    };
    await transactionDone(tx);
    cachedSnapshotHasLeaderboards = false;
    return { deleted, retained: retained.size };
  }

  async function countLeaderboards() {
    const db = await openDb();
    const tx = db.transaction(STORES.leaderboards, "readonly");
    const count = await requestToPromise(tx.objectStore(STORES.leaderboards).count());
    await transactionDone(tx);
    return Number(count || 0);
  }

  async function deleteProjectsExcept(keys = []) {
    const retained = new Set((keys || []).map((key) => String(key || "").toLowerCase()).filter(Boolean));
    const db = await openDb();
    const tx = db.transaction(STORES.projects, "readwrite");
    const store = tx.objectStore(STORES.projects);
    let deleted = 0;
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      if (!retained.has(String(cursor.key))) {
        persistedProjectHashes.delete(String(cursor.key));
        if (cachedSnapshotHasProjects && cachedSnapshot?.store?.projects) delete cachedSnapshot.store.projects[String(cursor.key)];
        cursor.delete();
        deleted += 1;
      }
      cursor.continue();
    };
    await transactionDone(tx);
    return { deleted, retained: retained.size };
  }

  function withoutPlanMatch(project = {}, planId = "") {
    const source = project.observationPlanMatches || project.observationMatches || [];
    if (Array.isArray(source)) {
      return source.filter((match) => String(typeof match === "string" ? match : match?.planId || match?.id || "") !== planId);
    }
    const next = { ...(source || {}) };
    delete next[planId];
    return next;
  }

  function planMatchMap(project = {}) {
    const source = project.observationPlanMatches || project.observationMatches || {};
    if (!Array.isArray(source)) return { ...(source || {}) };
    return Object.fromEntries(
      source
        .map((match) => {
          const id = String(typeof match === "string" ? match : match?.planId || match?.id || "");
          return id ? [id, typeof match === "object" ? { ...match, planId: id } : { planId: id }] : null;
        })
        .filter(Boolean)
    );
  }

  async function replaceProjectsForPlan(planId = "default", projects = []) {
    const safePlanId = String(planId || "default");
    const incoming = new Map(
      (projects || [])
        .map((project) => [String(project?.fullName || project?.key || "").toLowerCase(), project])
        .filter(([key]) => key)
    );
    const db = await openDb();
    const readTx = db.transaction(STORES.projects, "readonly");
    const index = readTx.objectStore(STORES.projects).index("scopePlanIds");
    const keyRange = (window.IDBKeyRange || globalThis.IDBKeyRange).only(safePlanId);
    const existing = await requestToPromise(index.getAll(keyRange));
    await transactionDone(readTx);
    const existingByKey = new Map(existing.map((record) => [record.key, record.value]));
    const writeTx = db.transaction(STORES.projects, "readwrite");
    const store = writeTx.objectStore(STORES.projects);

    for (const record of existing) {
      if (incoming.has(record.key)) continue;
      const remainingMatches = withoutPlanMatch(record.value, safePlanId);
      const remainingPlanIds = projectPlanIds({ observationPlanMatches: remainingMatches });
      const hadExplicitMatch = projectPlanIds(record.value).includes(safePlanId);
      if (hadExplicitMatch && remainingPlanIds.length === 0) {
        store.delete(record.key);
        persistedProjectHashes.delete(record.key);
        if (cachedSnapshotHasProjects && cachedSnapshot?.store?.projects) delete cachedSnapshot.store.projects[record.key];
      } else if (hadExplicitMatch) {
        const updated = { ...record.value, observationPlanMatches: remainingMatches };
        store.put(projectRecord(record.key, updated));
        persistedProjectHashes.set(record.key, stableJson(updated));
      }
    }

    for (const [key, project] of incoming) {
      const previous = existingByKey.get(key) || {};
      const previousMatches = planMatchMap(previous);
      const incomingMatches = planMatchMap(project);
      const nextMatches = {
        ...previousMatches,
        ...incomingMatches,
        [safePlanId]: {
          ...(previousMatches[safePlanId] || {}),
          ...(incomingMatches[safePlanId] || {}),
          planId: safePlanId
        }
      };
      const updated = {
        ...previous,
        ...project,
        firstSeenAt: previous.firstSeenAt || project.firstSeenAt,
        observationPlanMatches: nextMatches
      };
      store.put(projectRecord(key, updated));
      persistedProjectHashes.set(key, stableJson(updated));
      if (cachedSnapshotHasProjects && cachedSnapshot?.store?.projects) cachedSnapshot.store.projects[key] = updated;
    }
    await transactionDone(writeTx);
    return { updated: incoming.size };
  }

  async function countProjects() {
    const db = await openDb();
    const tx = db.transaction(STORES.projects, "readonly");
    const count = await requestToPromise(tx.objectStore(STORES.projects).count());
    await transactionDone(tx);
    return Number(count || 0);
  }

  async function getSnapshotMeta() {
    const db = await openDb();
    const tx = db.transaction(STORES.meta, "readonly");
    const record = await requestToPromise(tx.objectStore(STORES.meta).get(SNAPSHOT_META_KEY));
    await transactionDone(tx);
    return record ? record.value : null;
  }

  async function shouldSyncSnapshot(minAgeMs) {
    const meta = await getSnapshotMeta();
    if (!meta?.savedAt) return true;
    return Date.now() - new Date(meta.savedAt).getTime() > Number(minAgeMs || 0);
  }

  async function clearSnapshot() {
    const db = await openDb();
    const tx = db.transaction([STORES.meta, STORES.projects, STORES.plans, STORES.scans, STORES.leaderboards], "readwrite");
    tx.objectStore(STORES.meta).delete(CORE_KEY);
    tx.objectStore(STORES.meta).delete(LEGACY_LEADERBOARDS_KEY);
    tx.objectStore(STORES.meta).delete(SNAPSHOT_META_KEY);
    tx.objectStore(STORES.projects).clear();
    tx.objectStore(STORES.plans).clear();
    tx.objectStore(STORES.scans).clear();
    tx.objectStore(STORES.leaderboards).clear();
    await transactionDone(tx);
    cachedSnapshot = null;
    cachedSnapshotHasProjects = false;
    cachedSnapshotHasLeaderboards = false;
    persistedProjectHashes = new Map();
    persistedPlanHashes = new Map();
    persistedScanHashes = new Map();
    persistedLeaderboardHashes = new Map();
    persistedCoreHash = "";
  }

  window.StarVaultIndexedDB = {
    isSupported,
    getValue,
    putValue,
    removeValue,
    putSnapshot,
    getSnapshot,
    getSnapshotMeta,
    getProject,
    getProjects,
    getProjectsByPlan,
    putProjects,
    putLeaderboardRecords,
    deleteProjectsExcept,
    deleteLeaderboardsExcept,
    replaceProjectsForPlan,
    countProjects,
    countLeaderboards,
    shouldSyncSnapshot,
    clearSnapshot
  };
})();
