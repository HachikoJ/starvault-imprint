(function () {
  const DB_NAME = "starvault-imprint";
  const DB_VERSION = 5;
  const STORES = {
    kv: "kv",
    meta: "meta",
    projects: "projects",
    plans: "plans",
    scans: "scans",
    leaderboards: "leaderboards",
    taskArtifacts: "taskArtifacts"
  };
  const SNAPSHOT_KEY = "localSnapshot";
  const SNAPSHOT_META_KEY = "localSnapshotMeta";
  const CORE_KEY = "snapshotCore";
  const LEGACY_LEADERBOARDS_KEY = "leaderboards";
  const REVISION_KEY = "snapshotRevision";
  const SERVER_CACHE_KEY = "serverCacheBaseline";
  const RECOVERY_PREFIX = "serverCacheRecovery:";
  const snapshotBases = new WeakMap();
  const snapshotWrites = new WeakMap();
  const snapshotOperations = new WeakMap();
  const snapshotTaskLeases = new WeakMap();
  const TASK_LEASE_PREFIX = "taskLease:";

  let dbPromise = null;
  let cachedSnapshot = null;
  let persistedProjectHashes = new Map();
  let persistedPlanHashes = new Map();
  let persistedScanHashes = new Map();
  let persistedLeaderboardHashes = new Map();
  let persistedCoreHash = "";
  let cachedSnapshotHasProjects = false;
  let cachedSnapshotHasLeaderboards = false;
  let cachedProjectsByPlan = new Map();
  let persistenceRequest = null;
  let cachedRevision = -1;

  function isSupported() {
    return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
  }

  async function requestPersistentStorage() {
    if (persistenceRequest) return persistenceRequest;
    persistenceRequest = (async () => {
      const storage = window.navigator?.storage;
      if (!storage?.persisted) return { supported: false, persisted: false };
      const alreadyPersisted = await storage.persisted();
      const persisted = alreadyPersisted || (storage.persist ? await storage.persist() : false);
      const estimate = storage.estimate ? await storage.estimate() : {};
      return {
        supported: true,
        persisted: Boolean(persisted),
        usage: Number(estimate.usage || 0),
        quota: Number(estimate.quota || 0)
      };
    })().catch(() => ({ supported: true, persisted: false, usage: 0, quota: 0 }));
    return persistenceRequest;
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

  function cloneValue(value, fallback = null) {
    try {
      if (typeof structuredClone === "function") return structuredClone(value);
      return JSON.parse(JSON.stringify(value ?? fallback));
    } catch {
      return fallback;
    }
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
    delete core.localRevision;
    delete core.store.projects;
    delete core.store.observationPlans;
    delete core.store.scans;
    delete core.store.leaderboards;
    return core;
  }

  function snapshotConflict() {
    const error = new Error("工作区在操作期间已更新，请重新读取后再试");
    error.code = "SNAPSHOT_CONFLICT";
    return error;
  }

  function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function keyedArray(value) {
    return Array.isArray(value) && value.every((item) => isRecord(item) && item.id);
  }

  function isLearningPath(path) {
    return /\/memory\/(?:preferences|negativePreferences|discoveryProfiles|stats\/eventCounts)\//.test(path);
  }

  function learningValue(current, delta, path, bounds = {}) {
    const eventCount = path.includes("/stats/eventCounts/");
    const min = bounds.min ?? (path.includes("/discoveryProfiles/") ? -40 : 0);
    const max = bounds.max ?? (eventCount ? Infinity : path.includes("/negativePreferences/repositories/") ? 20 : path.includes("/negativePreferences/") ? 30 : 40);
    const value = Math.max(min, Math.min(max, Number(current || 0) + delta));
    return eventCount ? value : Number(value.toFixed(3));
  }

  function prunedLearningValue(value, path) {
    return !path.includes("/stats/eventCounts/") && Math.abs(value) < 0.005;
  }

  function memoryPathValue(memory, path) {
    return path.reduce((value, key) => value?.[key], memory);
  }

  function setMemoryPath(memory, path, value, remove = false) {
    let bucket = memory;
    for (const key of path.slice(0, -1)) {
      if (!isRecord(bucket[key])) bucket[key] = {};
      bucket = bucket[key];
    }
    if (remove) delete bucket[path[path.length - 1]];
    else bucket[path[path.length - 1]] = value;
  }

  // Register the original, unclamped operations after the local mutation.
  // They stay in memory and are consumed only after a successful transaction.
  function registerSnapshotOperations(snapshot, planId, operations = []) {
    if (!snapshot || !snapshot.store?.observationPlans?.[planId]) throw new Error("Learning operation requires an existing observation plan");
    let state = snapshotOperations.get(snapshot);
    if (!state) {
      state = { entries: [], nextSequence: 0, committedSequence: 0 };
      snapshotOperations.set(snapshot, state);
    }
    const memory = snapshot.store.observationPlans[planId].memory || {};
    let registered = 0;
    for (const operation of operations) {
      const path = Array.isArray(operation?.path) ? operation.path.map(String) : [];
      if (!path.length || !isLearningPath(`/memory/${path.join("/")}`) || !Number.isFinite(operation.delta)) throw new Error("Invalid learning operation");
      const min = operation.min === undefined ? undefined : Number(operation.min);
      const max = operation.max === undefined ? undefined : Number(operation.max);
      if ((min !== undefined && !Number.isFinite(min)) || (max !== undefined && !Number.isFinite(max)) || (min !== undefined && max !== undefined && min > max)) throw new Error("Invalid learning operation bounds");
      state.entries.push({
        sequence: ++state.nextSequence, planId: String(planId), path,
        delta: operation.delta, min, max,
        observedValue: Number(memoryPathValue(memory, path) || 0)
      });
      registered += 1;
    }
    return { registered };
  }

  function applySnapshotOperations(local, current, merged, operations) {
    const groups = new Map();
    for (const operation of operations) {
      const key = `${operation.planId}|${JSON.stringify(operation.path)}`;
      const list = groups.get(key) || [];
      list.push(operation);
      groups.set(key, list);
    }
    for (const list of groups.values()) {
      const last = list[list.length - 1];
      const plan = merged.store.observationPlans[last.planId];
      if (!plan) continue;
      const localValue = memoryPathValue(local.store?.observationPlans?.[last.planId]?.memory, last.path);
      plan.memory = plan.memory || {};
      if (Number(localValue || 0) !== last.observedValue) {
        // A later explicit setter in this caller takes precedence over its
        // earlier learning operations, retaining scalar last-commit behavior.
        setMemoryPath(plan.memory, last.path, cloneValue(localValue), localValue === undefined);
        continue;
      }
      const path = `/plans/${last.planId}/memory/${last.path.join("/")}`;
      let value = Number(memoryPathValue(current.store?.observationPlans?.[last.planId]?.memory, last.path) || 0);
      for (const operation of list) value = learningValue(value, operation.delta, path, operation);
      setMemoryPath(plan.memory, last.path, value, prunedLearningValue(value, path));
    }
  }

  // Apply only base -> local changes to the latest committed record. Scalar
  // edits to the same field use transaction commit order (last commit wins).
  // Learned counters are deltas; independent feedback must accumulate.
  function mergeChanges(base, local, current, path = "", learnedDelta = false) {
    if (stableJson(base) === stableJson(local)) return cloneValue(current, undefined);
    if (isRecord(local) && (isRecord(base) || base === undefined)) {
      if (path.endsWith("/memory")) {
        learnedDelta = stableJson(base?.events || []) !== stableJson(local.events || []);
      }
      const result = isRecord(current) ? cloneValue(current, {}) : {};
      for (const key of new Set([...Object.keys(base || {}), ...Object.keys(local)])) {
        const childPath = `${path}/${key}`;
        if (!Object.prototype.hasOwnProperty.call(local, key)) {
          if (learnedDelta && typeof base?.[key] === "number" && isLearningPath(childPath)) {
            const value = learningValue(current?.[key], -base[key], childPath);
            if (prunedLearningValue(value, childPath)) delete result[key];
            else result[key] = value;
          } else delete result[key];
        }
        else if (stableJson(base?.[key]) !== stableJson(local[key])) {
          result[key] = mergeChanges(base?.[key], local[key], current?.[key], childPath, learnedDelta);
        }
      }
      return result;
    }
    if (keyedArray(local) && keyedArray(base || []) && keyedArray(current || [])) {
      const map = (items) => Object.fromEntries((items || []).map((item) => [item.id, item]));
      const merged = mergeChanges(map(base), map(local), map(current), path, learnedDelta);
      const order = [...local.map((item) => item.id), ...(current || []).map((item) => item.id)];
      return [...new Set(order)].filter((id) => merged[id]).map((id) => merged[id]);
    }
    if (Array.isArray(local) && Array.isArray(base || []) && /\/memory\/(?:events|shortTerm|context\/chunks|harness\/runs)$/.test(path)) {
      // These append/remove logs predate event ids. Use content multiplicities
      // so equal legacy entries and concurrent additions are not collapsed.
      const counts = (items) => {
        const values = new Map();
        for (const item of items) values.set(stableJson(item), (values.get(stableJson(item)) || 0) + 1);
        return values;
      };
      const oldCounts = counts(base || []);
      const localCounts = counts(local);
      const additions = [];
      for (const item of local) {
        const key = stableJson(item);
        if (oldCounts.get(key)) oldCounts.set(key, oldCounts.get(key) - 1);
        else additions.push(cloneValue(item));
      }
      const removals = counts(base || []);
      for (const [key, count] of localCounts) removals.set(key, Math.max(0, (removals.get(key) || 0) - count));
      const retained = (current || []).filter((item) => {
        const key = stableJson(item);
        if (!removals.get(key)) return true;
        removals.set(key, removals.get(key) - 1);
        return false;
      });
      return [...additions, ...cloneValue(retained, [])];
    }
    if (learnedDelta && typeof local === "number" && (typeof current === "number" || current === undefined) && isLearningPath(path)) {
      return learningValue(current, local - Number(base || 0), path);
    }
    return cloneValue(local, local);
  }

  function bindSnapshot(snapshot, revision) {
    if (!snapshot) return null;
    snapshot.localRevision = revision;
    snapshotBases.set(snapshot, { value: cloneValue(snapshot), revision });
    return snapshot;
  }

  async function bumpSnapshotRevision(tx, options = {}) {
    const store = tx.objectStore(STORES.meta);
    const record = await requestToPromise(store.get(REVISION_KEY));
    const revision = Number(record?.value || 0) + 1;
    store.put({ key: REVISION_KEY, value: revision });
    if (!options.serverCache) store.put({ key: "serverCacheDirty", value: true });
    return revision;
  }

  function snapshotWriteDone(tx, options = {}) {
    const completion = Promise.all([transactionDone(tx), bumpSnapshotRevision(tx, options)]);
    completion.catch(() => {});
    return completion;
  }

  function taskOwnershipLost() {
    return Object.assign(new Error("Task ownership was lost; this execution cannot commit"), { code: "TASK_OWNERSHIP_LOST" });
  }

  function leaseDuration(value) {
    return Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 30000;
  }

  function leaseNow(options = {}) {
    const now = Number(options.now ?? Date.now());
    if (!Number.isFinite(now)) throw taskOwnershipLost();
    return now;
  }

  async function readTaskLease(tx, taskId) {
    return (await requestToPromise(tx.objectStore(STORES.meta).get(`${TASK_LEASE_PREFIX}${taskId}`)))?.value || null;
  }

  async function assertTaskLeaseWithinTransaction(tx, guard, options = {}) {
    if (!guard?.taskId || !guard?.token) throw taskOwnershipLost();
    const meta = tx.objectStore(STORES.meta);
    const [lease, record] = await Promise.all([
      readTaskLease(tx, guard.taskId), requestToPromise(meta.get(CORE_KEY))
    ]);
    const task = record?.value?.store?.tasks?.[guard.taskId];
    const terminalCleanup = options.allowTerminal && ["completed", "failed"].includes(task?.status) && lease?.released === true && lease?.terminalDelivered === true;
    if (!lease || lease.token !== guard.token || !task ||
      lease.inputIdentity !== stableJson([task.type, task.key || "", task.input || {}]) ||
      (!terminalCleanup && (task.status !== "running" || lease.released || !Number.isFinite(Number(lease.expiresAt)) || Number(lease.expiresAt) <= leaseNow(options)))) {
      throw taskOwnershipLost();
    }
    return { lease, task, record };
  }

  async function taskMetaMutation(mutate) {
    const db = await openDb();
    const tx = db.transaction(STORES.meta, "readwrite");
    const done = transactionDone(tx);
    done.catch(() => {});
    try {
      const result = await mutate(tx);
      await done;
      return result;
    } catch (error) {
      try { tx.abort(); } catch { /* transaction already finished */ }
      await done.catch(() => {});
      throw error;
    }
  }

  async function writeTaskCore(tx, record) {
    const revision = await bumpSnapshotRevision(tx);
    record.value.localRevision = revision;
    record.updatedAt = new Date().toISOString();
    tx.objectStore(STORES.meta).put(record);
  }

  async function enqueueTask(candidate, options = {}) {
    if (!candidate?.id || !candidate.type) throw new Error("Task requires an id and type");
    return taskMetaMutation(async (tx) => {
      const meta = tx.objectStore(STORES.meta);
      const record = await requestToPromise(meta.get(CORE_KEY));
      if (!record?.value) throw new Error("Task snapshot is unavailable");
      const core = record.value;
      core.store = core.store || {};
      const tasks = core.store.tasks || {};
      const existing = Object.values(tasks).find(task => task.type === candidate.type && task.key === candidate.key &&
        ["queued", "running"].includes(task.status) && (!options.sameInput || options.sameInput(task.input || {})));
      if (existing) return cloneValue(existing);
      if (Object.values(tasks).filter(task => ["queued", "running"].includes(task.status)).length >= 60) {
        throw Object.assign(new Error("Task queue is full; wait for active tasks to finish"), { code: "TASK_QUEUE_FULL" });
      }
      if (tasks[candidate.id]) throw new Error("Task id already exists");
      const next = cloneValue(candidate);
      const ordered = [...Object.values(tasks), next].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
      const pending = ordered.filter(task => ["queued", "running"].includes(task.status));
      const finished = ordered.filter(task => !["queued", "running"].includes(task.status)).slice(0, Math.max(0, 60 - pending.length));
      core.store.tasks = Object.fromEntries([...pending, ...finished].map(task => [task.id, task]));
      for (const id of Object.keys(tasks)) {
        if (!core.store.tasks[id]) meta.delete(`${TASK_LEASE_PREFIX}${id}`);
      }
      await writeTaskCore(tx, record);
      return cloneValue(next);
    });
  }

  async function claimTask(taskId, options = {}) {
    const ownerId = String(options.ownerId || "");
    if (!ownerId) throw new Error("Task owner id is required");
    const now = leaseNow(options);
    return taskMetaMutation(async tx => {
      const meta = tx.objectStore(STORES.meta);
      const [record, previous] = await Promise.all([requestToPromise(meta.get(CORE_KEY)), readTaskLease(tx, taskId)]);
      const task = record?.value?.store?.tasks?.[taskId];
      if (!task || !["queued", "running"].includes(task.status)) return { claimed: false, task: cloneValue(task), lease: cloneValue(previous) };
      if (task.status === "running" && previous && !previous.released && Number(previous.expiresAt) > now) {
        return { claimed: false, task: cloneValue(task), lease: cloneValue(previous) };
      }
      if ((task.status === "running" && !previous) || previous?.nonReplayableInFlight) {
        task.status = "failed";
        task.result = null;
        task.error = "Previous external request outcome is unknown; it may have executed or been charged. Submit a new request explicitly; automatic replay is disabled";
        task.recoveryRequired = true;
        task.errorCode = "TASK_OUTCOME_UNKNOWN";
        task.finishedAt = task.updatedAt = new Date(now).toISOString();
        if (previous) meta.put({ key: `${TASK_LEASE_PREFIX}${taskId}`, value: { ...previous, released: true, terminalDelivered: false, expiresAt: 0 } });
        await writeTaskCore(tx, record);
        return { claimed: false, task: cloneValue(task), lease: null };
      }
      if (Number(task.attempts || 0) >= 3) {
        task.status = "failed";
        task.error = "Task was interrupted too many times";
        task.finishedAt = task.updatedAt = new Date(now).toISOString();
        if (previous) meta.put({ key: `${TASK_LEASE_PREFIX}${taskId}`, value: { ...previous, released: true, terminalDelivered: false, expiresAt: 0 } });
        await writeTaskCore(tx, record);
        return { claimed: false, task: cloneValue(task), lease: null };
      }
      const token = window.crypto?.randomUUID?.() || `${ownerId}:${now}:${Math.random().toString(36).slice(2)}:${Math.random().toString(36).slice(2)}`;
      const lease = { taskId, token, ownerId, expiresAt: now + leaseDuration(options.leaseMs), released: false, terminalDelivered: false,
        nonReplayableInFlight: false, inputIdentity: stableJson([task.type, task.key || "", task.input || {}]) };
      task.status = "running";
      task.attempts = Number(task.attempts || 0) + 1;
      task.startedAt = task.updatedAt = new Date(now).toISOString();
      task.error = "";
      task.cooldown = null;
      meta.put({ key: `${TASK_LEASE_PREFIX}${taskId}`, value: lease });
      await writeTaskCore(tx, record);
      return { claimed: true, task: cloneValue(task), lease: cloneValue(lease) };
    });
  }

  async function renewTaskLease(guard, options = {}) {
    return taskMetaMutation(async tx => {
      const { lease } = await assertTaskLeaseWithinTransaction(tx, guard, options);
      lease.expiresAt = leaseNow(options) + leaseDuration(options.leaseMs);
      tx.objectStore(STORES.meta).put({ key: `${TASK_LEASE_PREFIX}${guard.taskId}`, value: lease });
      await bumpSnapshotRevision(tx);
      return cloneValue(lease);
    });
  }

  async function markTaskExternalRequest(guard, options = {}) {
    return taskMetaMutation(async tx => {
      const { lease } = await assertTaskLeaseWithinTransaction(tx, guard, options);
      // This marker stays set until durable terminal delivery. Receiving a
      // response alone cannot prove that its result survived a tab crash.
      lease.nonReplayableInFlight = lease.nonReplayableInFlight || options.nonReplayable !== false;
      lease.requestStartedAt = new Date(leaseNow(options)).toISOString();
      tx.objectStore(STORES.meta).put({ key: `${TASK_LEASE_PREFIX}${guard.taskId}`, value: lease });
      await bumpSnapshotRevision(tx);
      return cloneValue(lease);
    });
  }

  function bindTaskSnapshot(snapshot, guard) {
    if (!snapshot || !guard?.taskId || !guard?.token) throw taskOwnershipLost();
    snapshotTaskLeases.set(snapshot, cloneValue(guard));
    return snapshot;
  }

  async function getTaskLease(taskId) {
    const db = await openDb();
    const tx = db.transaction(STORES.meta, "readonly");
    const done = transactionDone(tx);
    const lease = await readTaskLease(tx, taskId);
    await done;
    return cloneValue(lease);
  }

  async function protectCacheWithinTransaction(tx) {
    const meta = tx.objectStore(STORES.meta);
    const [core, baseline, dirty, plans, scans] = await Promise.all([
      requestToPromise(meta.get(CORE_KEY)), requestToPromise(meta.get(SERVER_CACHE_KEY)),
      requestToPromise(meta.get("serverCacheDirty")), requestToPromise(tx.objectStore(STORES.plans).getAll()),
      requestToPromise(tx.objectStore(STORES.scans).getAll())
    ]);
    const signature = stableJson([core?.value || null, plans, scans]);
    if (!baseline || dirty?.value || baseline.value !== signature) {
      const names = Object.values(STORES).filter(name => name !== STORES.meta);
      const values = await Promise.all(names.map(name => requestToPromise(tx.objectStore(name).getAll())));
      const records = Object.fromEntries(names.map((name, i) => [name, values[i]]));
      if (core || values.some(items => items.length)) {
        const revision = Number((await requestToPromise(meta.get(REVISION_KEY)))?.value || 0);
        const id = `${RECOVERY_PREFIX}${revision}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
        // The backup and provenance marker commit together. Quota/abort means
        // the caller must stop before any cache replacement.
        meta.add({ key: id, value: { schema: "starvault-cache-recovery/v1", id,
          savedAt: new Date().toISOString(), localRevision: revision, core: core?.value || null, records } });
      }
      meta.put({ key: SERVER_CACHE_KEY, value: signature });
      meta.put({ key: "serverCacheDirty", value: false });
    }
  }

  async function prepareServerCacheWrite(tx, options) {
    if (!options.serverCache) return;
    try { await protectCacheWithinTransaction(tx); }
    catch (error) { try { tx.abort(); } catch {} throw error; }
  }

  async function protectServerCache() {
    const db = await openDb();
    const tx = db.transaction(Object.values(STORES), "readwrite");
    const done = transactionDone(tx); done.catch(() => {});
    try { await protectCacheWithinTransaction(tx); await done; }
    catch (error) { try { tx.abort(); } catch {} await done.catch(() => {}); throw error; }
  }

  async function getRecoverySnapshots() {
    const db = await openDb();
    const tx = db.transaction(STORES.meta, "readonly");
    const records = await requestToPromise(tx.objectStore(STORES.meta).getAll());
    await transactionDone(tx);
    return records.filter(record => record.key.startsWith(RECOVERY_PREFIX)).map(record => cloneValue(record.value));
  }

  async function freshCache(db) {
    const tx = db.transaction(STORES.meta, "readonly");
    const record = await requestToPromise(tx.objectStore(STORES.meta).get(REVISION_KEY));
    await transactionDone(tx);
    const revision = Number(record?.value || 0);
    if (revision !== cachedRevision) {
      cachedSnapshot = null;
      cachedSnapshotHasProjects = false;
      cachedSnapshotHasLeaderboards = false;
      cachedProjectsByPlan = new Map();
      cachedRevision = revision;
    }
    return revision;
  }

  function snapshotMeta(snapshot) {
    const store = snapshot?.store || {};
    return {
      storageSchema: "starvault-indexeddb/v5",
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
    const taskArtifacts = db.objectStoreNames.contains(STORES.taskArtifacts)
      ? upgradeTransaction?.objectStore(STORES.taskArtifacts)
      : db.createObjectStore(STORES.taskArtifacts, { keyPath: "id" });
    if (taskArtifacts) ensureIndex(taskArtifacts, "taskId", "taskId");
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
    cachedSnapshot = cloneValue(snapshot, snapshot);
    cachedSnapshotHasProjects = options.hasProjects !== false;
    cachedSnapshotHasLeaderboards = options.hasLeaderboards !== false;
    if (cachedSnapshotHasProjects) {
      persistedProjectHashes = new Map(
        Object.entries(cachedSnapshot?.store?.projects || {}).map(([key, project]) => [key, stableJson(project)])
      );
      cachedProjectsByPlan = new Map();
      for (const project of Object.values(cachedSnapshot?.store?.projects || {})) {
        const planIds = projectPlanIds(project);
        for (const planId of planIds.length ? planIds : ["default"]) {
          const list = cachedProjectsByPlan.get(planId) || [];
          list.push(project);
          cachedProjectsByPlan.set(planId, list);
        }
      }
    } else {
      // A core-only read must never reuse a project-by-plan result built from
      // an earlier full snapshot. The records remain in IndexedDB and will be
      // queried again on demand.
      cachedProjectsByPlan = new Map();
    }
    persistedPlanHashes = new Map(
      Object.entries(cachedSnapshot?.store?.observationPlans || {}).map(([id, plan]) => [id, stableJson(plan)])
    );
    persistedScanHashes = new Map(
      (cachedSnapshot?.store?.scans || []).map((scan) => [String(scan.id || ""), stableJson(scan)])
    );
    if (cachedSnapshotHasLeaderboards) {
      persistedLeaderboardHashes = new Map(
        leaderboardRecords(cachedSnapshot?.store?.leaderboards || {}).map((record) => [record.id, stableJson(record.value)])
      );
    }
    persistedCoreHash = stableJson(snapshotCore(snapshot));
  }

  async function persistSnapshotWithDb(db, snapshot, force = false, options = {}, submittedSnapshot = null, submittedOperations = []) {
    const preserveProjects = options.preserveProjects === true;
    const preserveLeaderboards = options.preserveLeaderboards === true;
    const tracked = snapshotBases.get(snapshot);
    const local = cloneValue(submittedSnapshot || snapshot);
    const base = tracked?.value;
    const operationState = snapshotOperations.get(snapshot);
    const operations = submittedOperations.filter((operation) => operation.sequence > (operationState?.committedSequence || 0));
    const replace = force || options.replace === true || options.expectedRevision !== undefined || !base;
    const expectedRevision = Number(options.expectedRevision ?? tracked?.revision ?? 0);
    const tx = db.transaction(options.protectServerCache ? Object.values(STORES) : [STORES.meta, STORES.projects, STORES.plans, STORES.scans, STORES.leaderboards], "readwrite");
    const done = transactionDone(tx);
    // Attach immediately: a request failure can abort before the reads settle.
    done.catch(() => {});
    const metaStore = tx.objectStore(STORES.meta);
    const projectStore = tx.objectStore(STORES.projects);
    const planStore = tx.objectStore(STORES.plans);
    const scanStore = tx.objectStore(STORES.scans);
    const leaderboardStore = tx.objectStore(STORES.leaderboards);
    let merged;
    let revision;
    try {
      const [coreRecord, revisionRecord, projectRecords, planRecords, scanRecords, archives, projectCount] = await Promise.all([
        requestToPromise(metaStore.get(CORE_KEY)),
        requestToPromise(metaStore.get(REVISION_KEY)),
        preserveProjects ? Promise.resolve([]) : requestToPromise(projectStore.getAll()),
        requestToPromise(planStore.getAll()),
        requestToPromise(scanStore.getAll()),
        preserveLeaderboards ? Promise.resolve([]) : requestToPromise(leaderboardStore.getAll()),
        requestToPromise(projectStore.count())
      ]);
      revision = Number(revisionRecord?.value || 0);
      const guarded = options.taskLease ? await assertTaskLeaseWithinTransaction(tx, options.taskLease) : null;
      if (!force && !base && coreRecord && options.expectedRevision === undefined) throw snapshotConflict();
      if (!force && replace && revision !== expectedRevision && (coreRecord || options.expectedRevision !== undefined)) throw snapshotConflict();
      if (!replace && base && !coreRecord) throw snapshotConflict();
      if (options.protectServerCache) await protectCacheWithinTransaction(tx);
      const current = coreRecord?.value || { store: {} };
      current.store = current.store || {};
      current.store.observationPlans = Object.fromEntries(planRecords.map((record) => [record.id, record.value]));
      current.store.scans = scanRecords.map((record) => record.value);
      current.store.projects = Object.fromEntries(projectRecords.map((record) => [record.key, record.value]));
      current.store.leaderboards = assembleLeaderboards(archives);

      if (replace) merged = local;
      else {
        // Core mirrors and collection counts are derived below. Never patch an
        // obsolete active plan's memory into the current plan's mirror.
        const coreBase = snapshotCore(base);
        const coreLocal = snapshotCore(local);
        const coreCurrent = snapshotCore(current);
        delete coreBase.store.memory;
        delete coreLocal.store.memory;
        delete coreCurrent.store.memory;
        merged = mergeChanges(coreBase, coreLocal, coreCurrent);
        merged.store = merged.store || {};
        const oldPlans = base.store?.observationPlans || {};
        const nextPlans = local.store?.observationPlans || {};
        for (const [id, plan] of Object.entries(nextPlans)) {
          if (oldPlans[id] && !current.store.observationPlans[id] && stableJson(oldPlans[id]) !== stableJson(plan)) throw snapshotConflict();
        }
        merged.store.observationPlans = mergeChanges(oldPlans, nextPlans, current.store.observationPlans, "/plans");
        const scanMap = (items) => Object.fromEntries((items || []).filter((item) => item.id).map((item) => [String(item.id), item]));
        merged.store.scans = Object.values(mergeChanges(scanMap(base.store?.scans), scanMap(local.store?.scans), scanMap(current.store.scans), "/scans"));
        merged.store.projects = preserveProjects ? {} : mergeChanges(base.store?.projects || {}, local.store?.projects || {}, current.store.projects, "/projects");
        merged.store.leaderboards = preserveLeaderboards ? { daily: {}, byPlan: {} } :
          mergeChanges(base.store?.leaderboards || { daily: {}, byPlan: {} }, local.store?.leaderboards || { daily: {}, byPlan: {} }, current.store.leaderboards, "/leaderboards");
        applySnapshotOperations(local, current, merged, operations);
      }
      merged.store = merged.store || {};
      if (guarded) {
        const taskId = options.taskLease.taskId;
        const owned = merged.store.tasks?.[taskId];
        if (!owned || owned.id !== taskId || !["running", "completed", "failed"].includes(owned.status) ||
          stableJson([owned.type, owned.key || "", owned.input || {}]) !== guarded.lease.inputIdentity) throw taskOwnershipLost();
        // A task execution may merge unrelated concurrent tasks, but cannot
        // submit its own patches to their lifecycle or input records.
        for (const id of new Set([...Object.keys(base?.store?.tasks || {}), ...Object.keys(local.store?.tasks || {})])) {
          if (id !== taskId && stableJson(base?.store?.tasks?.[id]) !== stableJson(local.store?.tasks?.[id])) throw taskOwnershipLost();
        }
      }
      if (guarded && ["completed", "failed"].includes(merged.store.tasks?.[options.taskLease.taskId]?.status)) {
        metaStore.put({ key: `${TASK_LEASE_PREFIX}${options.taskLease.taskId}`,
          value: { ...guarded.lease, released: true, terminalDelivered: true, expiresAt: 0, nonReplayableInFlight: false } });
      }
      const plans = merged.store.observationPlans || {};
      for (const plan of Object.values(plans)) {
        const memory = plan.memory;
        if (Array.isArray(memory?.events)) memory.events = memory.events.slice(0, Number(memory.context?.rawEventLimit || 300));
        if (Array.isArray(memory?.shortTerm)) memory.shortTerm = memory.shortTerm.slice(0, Number(memory.context?.shortTermLimit || 80));
      }
      const activeId = merged.activeObservationPlanId || merged.settings?.activeObservationPlanId || "default";
      merged.activeObservationPlanId = plans[activeId] ? activeId : "default";
      merged.settings = { ...(merged.settings || {}), activeObservationPlanId: merged.activeObservationPlanId };
      if (guarded?.task.type === "scan" && guarded.task.input?.observationPlanId !== merged.activeObservationPlanId) {
        // Background archives are plan-owned; these two fields mirror the
        // currently selected plan and must retain its latest concurrent view.
        for (const key of ["summary", "leaderboard"]) {
          if (Object.prototype.hasOwnProperty.call(current, key)) merged[key] = cloneValue(current[key]);
          else delete merged[key];
        }
      }
      if (plans[merged.activeObservationPlanId]) merged.store.memory = cloneValue(plans[merged.activeObservationPlanId].memory || {});
      merged.counts = {
        ...(merged.counts || {}),
        projects: preserveProjects ? Number(projectCount || 0) : Object.keys(merged.store.projects || {}).length,
        observationPlans: Object.keys(plans).length,
        scans: (merged.store.scans || []).length
      };
      const writeRecords = (store, previous, next, record) => {
        for (const key of Object.keys(previous)) if (!Object.prototype.hasOwnProperty.call(next, key)) store.delete(key);
        for (const [key, value] of Object.entries(next)) {
          if (stableJson(previous[key]) !== stableJson(value)) store.put(record(key, value));
        }
      };
      writeRecords(planStore, current.store.observationPlans, plans, (id, value) => ({ id, value }));
      const oldScans = Object.fromEntries(scanRecords.map((record) => [record.id, record.value]));
      const nextScans = Object.fromEntries((merged.store.scans || []).filter((scan) => scan.id).map((scan) => [String(scan.id), scan]));
      writeRecords(scanStore, oldScans, nextScans, (id, value) => ({ ...value, id, value }));
      if (!preserveProjects) writeRecords(projectStore, current.store.projects, merged.store.projects || {}, projectRecord);
      if (!preserveLeaderboards) {
        const nextArchives = Object.fromEntries(leaderboardRecords(merged.store.leaderboards || {}).map((record) => [record.id, record]));
        writeRecords(leaderboardStore, Object.fromEntries(archives.map((record) => [record.id, record])), nextArchives, (_id, record) => record);
      }
      revision += 1;
      merged.localRevision = revision;
      metaStore.put({ key: CORE_KEY, value: snapshotCore(merged), updatedAt: new Date().toISOString() });
      metaStore.put({ key: REVISION_KEY, value: revision });
      metaStore.put({ key: SNAPSHOT_META_KEY, value: { ...snapshotMeta(merged), localRevision: revision }, updatedAt: new Date().toISOString() });
      if (options.protectServerCache) {
        metaStore.put({ key: SERVER_CACHE_KEY, value: stableJson([
          snapshotCore(merged), Object.entries(plans).map(([id, value]) => ({ id, value })).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
          Object.values(nextScans).map(value => ({ ...value, id: String(value.id), value })).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
        ]) });
        metaStore.put({ key: "serverCacheDirty", value: false });
      } else metaStore.put({ key: "serverCacheDirty", value: true });
      await done;
    } catch (error) {
      try { tx.abort(); } catch { /* already completed or aborted */ }
      await done.catch(() => {});
      throw error;
    }
    // Caller references (including task) stay intact. Its next delta must be
    // based on what it submitted, not concurrent fields it has never read.
    snapshot.localRevision = revision;
    local.localRevision = revision;
    snapshotBases.set(snapshot, { value: local, revision });
    if (operationState && operations.length) {
      operationState.committedSequence = Math.max(operationState.committedSequence, ...operations.map((operation) => operation.sequence));
      operationState.entries = operationState.entries.filter((operation) => operation.sequence > operationState.committedSequence);
    }
    cachePersistedState(merged, { hasProjects: !preserveProjects, hasLeaderboards: !preserveLeaderboards });
    cachedRevision = revision;
    return { ...snapshotMeta(merged), localRevision: revision };
  }

  function invalidateProjectPlanCache() {
    cachedProjectsByPlan = new Map();
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
            requestPersistentStorage().catch(() => {});
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

  async function putValue(key, value, options = {}) {
    const db = await openDb();
    const updatedAt = new Date().toISOString();
    const tx = db.transaction(STORES.kv, "readwrite");
    const done = transactionDone(tx);
    done.catch(() => {});
    const store = tx.objectStore(STORES.kv);
    try {
      const previous = options.base !== undefined ? await requestToPromise(store.get(key)) : null;
      const next = options.base !== undefined ? mergeChanges(options.base, value, previous?.value || {}) : value;
      store.put({ key, value: next, updatedAt });
      await done;
    } catch (error) {
      try { tx.abort(); } catch { /* already aborted */ }
      await done.catch(() => {});
      throw error;
    }
    return { key, updatedAt };
  }

  async function removeValue(key) {
    const db = await openDb();
    const tx = db.transaction(STORES.kv, "readwrite");
    tx.objectStore(STORES.kv).delete(key);
    await transactionDone(tx);
  }

  function taskArtifactId(taskId, key) {
    return `${encodeURIComponent(String(taskId || ""))}|${encodeURIComponent(String(key || ""))}`;
  }

  async function putTaskArtifact(taskId, key, value, options = {}) {
    const safeTaskId = String(taskId || "");
    const safeKey = String(key || "");
    if (!safeTaskId || !safeKey) throw new Error("Task artifact requires a task id and key");
    const db = await openDb();
    const updatedAt = new Date().toISOString();
    const tx = db.transaction(options.taskLease ? [STORES.meta, STORES.taskArtifacts] : STORES.taskArtifacts, "readwrite");
    const done = transactionDone(tx);
    done.catch(() => {});
    try {
      let guarded;
      if (options.completeExternalRequest && (!options.taskLease || safeKey !== "external-discovery")) throw taskOwnershipLost();
      if (options.taskLease) {
        if (options.taskLease.taskId !== safeTaskId) throw taskOwnershipLost();
        guarded = await assertTaskLeaseWithinTransaction(tx, options.taskLease);
      }
      tx.objectStore(STORES.taskArtifacts).put({
        id: taskArtifactId(safeTaskId, safeKey),
        taskId: safeTaskId,
        key: safeKey,
        value,
        updatedAt
      });
      if (options.completeExternalRequest) {
        tx.objectStore(STORES.meta).put({ key: `${TASK_LEASE_PREFIX}${safeTaskId}`,
          value: { ...guarded.lease, nonReplayableInFlight: false } });
      }
      if (options.taskLease) await bumpSnapshotRevision(tx);
      await done;
    } catch (error) {
      try { tx.abort(); } catch { /* transaction already finished */ }
      await done.catch(() => {});
      throw error;
    }
    return { taskId: safeTaskId, key: safeKey, updatedAt };
  }

  async function getTaskArtifacts(taskId) {
    const safeTaskId = String(taskId || "");
    if (!safeTaskId) return {};
    const db = await openDb();
    const tx = db.transaction(STORES.taskArtifacts, "readonly");
    const keyRange = (window.IDBKeyRange || globalThis.IDBKeyRange).only(safeTaskId);
    const records = await requestToPromise(tx.objectStore(STORES.taskArtifacts).index("taskId").getAll(keyRange));
    await transactionDone(tx);
    return Object.fromEntries(records.map((record) => [record.key, cloneValue(record.value, null)]));
  }

  async function clearTaskArtifacts(taskId, options = {}) {
    const safeTaskId = String(taskId || "");
    if (!safeTaskId) return { deleted: 0 };
    const db = await openDb();
    const tx = db.transaction(options.taskLease ? [STORES.meta, STORES.taskArtifacts] : STORES.taskArtifacts, "readwrite");
    const done = transactionDone(tx);
    done.catch(() => {});
    try {
      if (options.taskLease) {
        if (options.taskLease.taskId !== safeTaskId) throw taskOwnershipLost();
        await assertTaskLeaseWithinTransaction(tx, options.taskLease, { allowTerminal: true });
      }
      const keyRange = (window.IDBKeyRange || globalThis.IDBKeyRange).only(safeTaskId);
      const request = tx.objectStore(STORES.taskArtifacts).index("taskId").openCursor(keyRange);
      let deleted = 0;
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        cursor.delete();
        deleted += 1;
        cursor.continue();
      };
      if (options.taskLease) await bumpSnapshotRevision(tx);
      await done;
      return { deleted };
    } catch (error) {
      try { tx.abort(); } catch { /* transaction already finished */ }
      await done.catch(() => {});
      throw error;
    }
  }

  async function getSnapshot(options = {}) {
    const includeProjects = options.includeProjects !== false;
    const includeLeaderboards = options.includeLeaderboards !== false;
    const db = await openDb();
    await freshCache(db);
    if (
      cachedSnapshot &&
      (!includeProjects || cachedSnapshotHasProjects) &&
      (!includeLeaderboards || cachedSnapshotHasLeaderboards)
    ) {
      if (!includeProjects) invalidateProjectPlanCache();
      const result = cloneValue(cachedSnapshot, null);
      if (result?.store && includeProjects === false) result.store.projects = {};
      if (result?.store && includeLeaderboards === false) result.store.leaderboards = { daily: {}, byPlan: {} };
      return bindSnapshot(result, cachedRevision);
    }
    const tx = db.transaction([STORES.meta, STORES.projects, STORES.plans, STORES.scans, STORES.leaderboards], "readonly");
    const metaStore = tx.objectStore(STORES.meta);
    const [coreRecord, projectRecords, planRecords, scanRecords, leaderboardEntries, revisionRecord] = await Promise.all([
      requestToPromise(metaStore.get(CORE_KEY)),
      includeProjects ? requestToPromise(tx.objectStore(STORES.projects).getAll()) : Promise.resolve([]),
      requestToPromise(tx.objectStore(STORES.plans).getAll()),
      requestToPromise(tx.objectStore(STORES.scans).getAll()),
      includeLeaderboards ? requestToPromise(tx.objectStore(STORES.leaderboards).getAll()) : Promise.resolve([]),
      requestToPromise(metaStore.get(REVISION_KEY))
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
    cachedRevision = Number(revisionRecord?.value || 0);
    return bindSnapshot(cloneValue(snapshot, snapshot), cachedRevision);
  }

  async function putSnapshot(snapshot, options = {}) {
    if (!snapshot || snapshot.schema !== "starvault-indexeddb-snapshot/v1") {
      throw new Error("Invalid StarVault IndexedDB snapshot");
    }
    options = { ...options, taskLease: snapshotTaskLeases.get(snapshot) || options.taskLease };
    const submitted = cloneValue(snapshot);
    const submittedOperations = (snapshotOperations.get(snapshot)?.entries || []).map((operation) => ({ ...operation, path: [...operation.path] }));
    const previous = snapshotWrites.get(snapshot) || Promise.resolve();
    const completion = previous.catch(() => {}).then(async () => {
      const db = await openDb();
      return persistSnapshotWithDb(db, snapshot, false, options, submitted, submittedOperations);
    });
    snapshotWrites.set(snapshot, completion);
    return completion;
  }

  async function getProject(key) {
    const db = await openDb();
    const tx = db.transaction(STORES.projects, "readonly");
    const record = await requestToPromise(tx.objectStore(STORES.projects).get(String(key || "").toLowerCase()));
    await transactionDone(tx);
    return cloneValue(record?.value, null);
  }

  async function getProjects(keys = []) {
    const uniqueKeys = Array.from(new Set((keys || []).map((key) => String(key || "").toLowerCase()).filter(Boolean)));
    if (!uniqueKeys.length) return [];
    const db = await openDb();
    const tx = db.transaction(STORES.projects, "readonly");
    const store = tx.objectStore(STORES.projects);
    const records = await Promise.all(uniqueKeys.map((key) => requestToPromise(store.get(key))));
    await transactionDone(tx);
    return records.filter(Boolean).map((record) => cloneValue(record.value, null));
  }

  async function getProjectsByPlan(planId = "default") {
    const safePlanId = String(planId || "default");
    const db = await openDb();
    await freshCache(db);
    if (cachedProjectsByPlan.has(safePlanId)) return cachedProjectsByPlan.get(safePlanId).map((project) => cloneValue(project, project));
    const tx = db.transaction(STORES.projects, "readonly");
    const index = tx.objectStore(STORES.projects).index("scopePlanIds");
    const keyRange = (window.IDBKeyRange || globalThis.IDBKeyRange).only(safePlanId);
    const records = await requestToPromise(index.getAll(keyRange));
    await transactionDone(tx);
    const projects = records.map((record) => cloneValue(record.value, null)).filter(Boolean);
    cachedProjectsByPlan.set(safePlanId, projects);
    return projects.map((project) => cloneValue(project, project));
  }

  async function getProjectPageByPlan(planId = "default", options = {}) {
    const safePlanId = String(planId || "default");
    const offset = Math.max(0, Number(options.offset || 0));
    const limit = Math.max(1, Math.min(500, Number(options.limit || 50)));
    const db = await openDb();
    const keyRange = (window.IDBKeyRange || globalThis.IDBKeyRange).only(safePlanId);
    const tx = db.transaction(STORES.projects, "readonly");
    const index = tx.objectStore(STORES.projects).index("scopePlanIds");
    const items = [];
    const request = index.openCursor(keyRange);
    let position = 0;
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      if (position >= offset && items.length < limit) items.push(cloneValue(cursor.value.value, null));
      position += 1;
      cursor.continue();
    };
    const totalRequest = index.count(keyRange);
    const [total] = await Promise.all([requestToPromise(totalRequest), transactionDone(tx)]);
    return { items, total: Number(total || 0), offset, limit };
  }

  async function putProjects(projects = [], options = {}) {
    const entries = Array.isArray(projects) ? projects : Object.values(projects || {});
    if (!entries.length) return { updated: 0 };
    const db = await openDb();
    const tx = db.transaction(options.serverCache ? Object.values(STORES) : [STORES.meta, STORES.projects], "readwrite");
    const done = snapshotWriteDone(tx, options);
    await prepareServerCacheWrite(tx, options);
    const store = tx.objectStore(STORES.projects);
    const committed = [];
    for (const project of entries) {
      const key = String(project?.fullName || project?.key || "").toLowerCase();
      if (!key) continue;
      store.put(projectRecord(key, project));
      committed.push([key, project]);
    }
    await done;
    for (const [key, project] of committed) {
      persistedProjectHashes.set(key, stableJson(project));
      if (cachedSnapshotHasProjects && cachedSnapshot?.store?.projects) cachedSnapshot.store.projects[key] = cloneValue(project, project);
    }
    invalidateProjectPlanCache();
    return { updated: committed.length };
  }

  async function putLeaderboardRecords(records = [], options = {}) {
    const entries = Array.isArray(records) ? records.filter((record) => record?.id && record?.date) : [];
    if (!entries.length) return { updated: 0 };
    const db = await openDb();
    const tx = db.transaction(options.serverCache ? Object.values(STORES) : [STORES.meta, STORES.leaderboards], "readwrite");
    const done = snapshotWriteDone(tx, options);
    await prepareServerCacheWrite(tx, options);
    const store = tx.objectStore(STORES.leaderboards);
    const committed = [];
    for (const record of entries) {
      store.put({
        id: String(record.id),
        planId: String(record.planId || "default"),
        date: String(record.date),
        generatedAt: String(record.generatedAt || record.value?.generatedAt || ""),
        value: record.value
      });
      committed.push(record);
    }
    await done;
    for (const record of committed) persistedLeaderboardHashes.set(String(record.id), stableJson(record.value));
    cachedSnapshotHasLeaderboards = false;
    return { updated: committed.length };
  }

  async function deleteLeaderboardsExcept(ids = [], options = {}) {
    const retained = new Set((ids || []).map(String).filter(Boolean));
    const db = await openDb();
    const tx = db.transaction(options.serverCache ? Object.values(STORES) : [STORES.meta, STORES.leaderboards], "readwrite");
    const done = snapshotWriteDone(tx, options);
    await prepareServerCacheWrite(tx, options);
    const store = tx.objectStore(STORES.leaderboards);
    let deleted = 0;
    const deletedIds = [];
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      if (!retained.has(String(cursor.key))) {
        deletedIds.push(String(cursor.key));
        cursor.delete();
        deleted += 1;
      }
      cursor.continue();
    };
    await done;
    deletedIds.forEach((id) => persistedLeaderboardHashes.delete(id));
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

  async function deleteProjectsExcept(keys = [], options = {}) {
    const retained = new Set((keys || []).map((key) => String(key || "").toLowerCase()).filter(Boolean));
    const db = await openDb();
    const tx = db.transaction(options.serverCache ? Object.values(STORES) : [STORES.meta, STORES.projects], "readwrite");
    const done = snapshotWriteDone(tx, options);
    await prepareServerCacheWrite(tx, options);
    const store = tx.objectStore(STORES.projects);
    let deleted = 0;
    const deletedKeys = [];
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      if (!retained.has(String(cursor.key))) {
        deletedKeys.push(String(cursor.key));
        cursor.delete();
        deleted += 1;
      }
      cursor.continue();
    };
    await done;
    for (const key of deletedKeys) {
      persistedProjectHashes.delete(key);
      if (cachedSnapshotHasProjects && cachedSnapshot?.store?.projects) delete cachedSnapshot.store.projects[key];
    }
    invalidateProjectPlanCache();
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

  async function replaceProjectsForPlan(planId = "default", projects = [], options = {}) {
    const safePlanId = String(planId || "default");
    const incoming = new Map(
      (projects || [])
        .map((project) => [String(project?.fullName || project?.key || "").toLowerCase(), project])
        .filter(([key]) => key)
    );
    const db = await openDb();
    const writeTx = db.transaction([STORES.meta, STORES.projects], "readwrite");
    const done = snapshotWriteDone(writeTx);
    const store = writeTx.objectStore(STORES.projects);
    const committed = new Map();
    try {
      if (options.taskLease) await assertTaskLeaseWithinTransaction(writeTx, options.taskLease);
      const index = store.index("scopePlanIds");
      const keyRange = (window.IDBKeyRange || globalThis.IDBKeyRange).only(safePlanId);
      // New scope matches need the global row too. Read both inputs inside
      // the writer transaction, so another tab cannot change them in between.
      const keys = [...incoming.keys()];
      const [existing, incomingRecords] = await Promise.all([
        requestToPromise(index.getAll(keyRange)),
        Promise.all(keys.map((key) => requestToPromise(store.get(key))))
      ]);
      const previousByKey = new Map(keys.map((key, index) => [key, incomingRecords[index]?.value || {}]));
      for (const record of existing) {
        if (options.replace === false) continue;
        if (incoming.has(record.key)) continue;
        const remainingMatches = withoutPlanMatch(record.value, safePlanId);
        const remainingPlanIds = projectPlanIds({ observationPlanMatches: remainingMatches });
        const hadExplicitMatch = projectPlanIds(record.value).includes(safePlanId);
        if (hadExplicitMatch && remainingPlanIds.length === 0) {
          store.delete(record.key);
          committed.set(record.key, null);
        } else if (hadExplicitMatch) {
          const updated = { ...record.value, observationPlanMatches: remainingMatches };
          store.put(projectRecord(record.key, updated));
          committed.set(record.key, updated);
        }
      }
      for (const [key, project] of incoming) {
        const previous = previousByKey.get(key) || {};
        const previousMatches = planMatchMap(previous);
        // Legacy rows without explicit matches are indexed in the default
        // scope. Preserve that existing membership when a new scope finds one.
        if (previous.fullName && !Object.keys(previousMatches).length) previousMatches.default = { planId: "default" };
        const incomingMatches = planMatchMap(project);
        const nextMatches = {
          ...incomingMatches,
          ...previousMatches,
          [safePlanId]: {
            ...(previousMatches[safePlanId] || {}),
            ...(incomingMatches[safePlanId] || {}),
            planId: safePlanId,
            ...(previousMatches[safePlanId]?.firstSeenAt ? { firstSeenAt: previousMatches[safePlanId].firstSeenAt } : {})
          }
        };
        const history = new Map();
        for (const entry of [...(previous.snapshots || []), ...(project.snapshots || [])]) history.set(stableJson(entry), entry);
        const updated = {
          ...previous,
          ...project,
          firstSeenAt: previous.firstSeenAt || project.firstSeenAt,
          ...(history.size ? { snapshots: [...history.values()].sort((a, b) => String(a.at || "").localeCompare(String(b.at || ""))).slice(-180) } : {}),
          observationPlanMatches: nextMatches
        };
        store.put(projectRecord(key, updated));
        committed.set(key, updated);
      }
      await done;
    } catch (error) {
      try { writeTx.abort(); } catch { /* already finished */ }
      await done.catch(() => {});
      throw error;
    }
    for (const [key, project] of committed) {
      if (!project) {
        persistedProjectHashes.delete(key);
        if (cachedSnapshotHasProjects && cachedSnapshot?.store?.projects) delete cachedSnapshot.store.projects[key];
        continue;
      }
      persistedProjectHashes.set(key, stableJson(project));
      if (cachedSnapshotHasProjects && cachedSnapshot?.store?.projects) cachedSnapshot.store.projects[key] = cloneValue(project, project);
    }
    invalidateProjectPlanCache();
    return { updated: incoming.size };
  }

  async function deletePlanData(planId = "") {
    const safePlanId = String(planId || "");
    if (!safePlanId || safePlanId === "default") throw new Error("Default observation plan cannot be deleted");
    const db = await openDb();
    const tx = db.transaction([STORES.meta, STORES.projects, STORES.plans, STORES.scans, STORES.leaderboards], "readwrite");
    const done = snapshotWriteDone(tx);
    const projectStore = tx.objectStore(STORES.projects);
    const index = projectStore.index("scopePlanIds");
    const keyRange = (window.IDBKeyRange || globalThis.IDBKeyRange).only(safePlanId);
    let affectedProjects = 0;
    try {
      const projectRecords = await requestToPromise(index.getAll(keyRange));
      affectedProjects = projectRecords.length;
      for (const record of projectRecords) {
        const remainingMatches = withoutPlanMatch(record.value, safePlanId);
        const remainingPlanIds = projectPlanIds({ observationPlanMatches: remainingMatches });
        if (!remainingPlanIds.length) {
          projectStore.delete(record.key);
        } else {
          const updated = { ...record.value, observationPlanMatches: remainingMatches };
          projectStore.put(projectRecord(record.key, updated));
        }
      }
      tx.objectStore(STORES.plans).delete(safePlanId);
      const scanCursor = tx.objectStore(STORES.scans).index("observationPlanId").openCursor((window.IDBKeyRange || globalThis.IDBKeyRange).only(safePlanId));
      scanCursor.onsuccess = () => {
        const cursor = scanCursor.result;
        if (!cursor) return;
        cursor.delete();
        cursor.continue();
      };
      const leaderboardCursor = tx.objectStore(STORES.leaderboards).index("planId").openCursor((window.IDBKeyRange || globalThis.IDBKeyRange).only(safePlanId));
      leaderboardCursor.onsuccess = () => {
        const cursor = leaderboardCursor.result;
        if (!cursor) return;
        cursor.delete();
        cursor.continue();
      };
      await done;
    } catch (error) {
      try { tx.abort(); } catch { /* already finished */ }
      await done.catch(() => {});
      throw error;
    }
    // The operation spans projects, plans, scans and leaderboards. Force the
    // next read to rebuild every in-memory view from the committed transaction
    // instead of exposing a partially updated cached snapshot.
    cachedSnapshot = null;
    cachedSnapshotHasProjects = false;
    cachedSnapshotHasLeaderboards = false;
    cachedProjectsByPlan = new Map();
    persistedProjectHashes = new Map();
    persistedPlanHashes = new Map();
    persistedScanHashes = new Map();
    persistedLeaderboardHashes = new Map();
    persistedCoreHash = "";
    invalidateProjectPlanCache();
    return { planId: safePlanId, affectedProjects };
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
    const [record, revision] = await Promise.all([
      requestToPromise(tx.objectStore(STORES.meta).get(SNAPSHOT_META_KEY)),
      requestToPromise(tx.objectStore(STORES.meta).get(REVISION_KEY))
    ]);
    await transactionDone(tx);
    return record || revision ? { ...(record?.value || {}), localRevision: Number(revision?.value || 0) } : null;
  }

  async function shouldSyncSnapshot(minAgeMs) {
    const meta = await getSnapshotMeta();
    if (!meta?.savedAt) return true;
    return Date.now() - new Date(meta.savedAt).getTime() > Number(minAgeMs || 0);
  }

  async function storageStatus() {
    return requestPersistentStorage();
  }

  async function clearSnapshot() {
    const db = await openDb();
    const tx = db.transaction([STORES.meta, STORES.projects, STORES.plans, STORES.scans, STORES.leaderboards, STORES.taskArtifacts], "readwrite");
    const done = snapshotWriteDone(tx);
    tx.objectStore(STORES.meta).delete(CORE_KEY);
    tx.objectStore(STORES.meta).delete(LEGACY_LEADERBOARDS_KEY);
    tx.objectStore(STORES.meta).delete(SNAPSHOT_META_KEY);
    tx.objectStore(STORES.projects).clear();
    tx.objectStore(STORES.plans).clear();
    tx.objectStore(STORES.scans).clear();
    tx.objectStore(STORES.leaderboards).clear();
    tx.objectStore(STORES.taskArtifacts).clear();
    await done;
    cachedSnapshot = null;
    cachedSnapshotHasProjects = false;
    cachedSnapshotHasLeaderboards = false;
    cachedProjectsByPlan = new Map();
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
    enqueueTask,
    claimTask,
    renewTaskLease,
    markTaskExternalRequest,
    bindTaskSnapshot,
    getTaskLease,
    putTaskArtifact,
    getTaskArtifacts,
    clearTaskArtifacts,
    registerSnapshotOperations,
    putSnapshot,
    getSnapshot,
    getSnapshotMeta,
    protectServerCache,
    getRecoverySnapshots,
    getProject,
    getProjects,
    getProjectsByPlan,
    getProjectPageByPlan,
    putProjects,
    putLeaderboardRecords,
    deleteProjectsExcept,
    deleteLeaderboardsExcept,
    replaceProjectsForPlan,
    deletePlanData,
    countProjects,
    countLeaderboards,
    shouldSyncSnapshot,
    requestPersistentStorage,
    storageStatus,
    clearSnapshot
  };
})();
