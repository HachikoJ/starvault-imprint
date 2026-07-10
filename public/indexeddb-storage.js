(function () {
  const DB_NAME = "starvault-imprint";
  const DB_VERSION = 1;
  const STORE_NAME = "kv";
  const SNAPSHOT_KEY = "localSnapshot";
  const SNAPSHOT_META_KEY = "localSnapshotMeta";

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

  async function openDb() {
    if (!isSupported()) {
      throw new Error("IndexedDB is not supported in this browser");
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    return requestToPromise(request);
  }

  async function withStore(mode, callback) {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      const result = await callback(store);
      await transactionDone(tx);
      return result;
    } finally {
      db.close();
    }
  }

  async function get(key) {
    return withStore("readonly", async (store) => {
      const record = await requestToPromise(store.get(key));
      return record ? record.value : null;
    });
  }

  async function put(key, value) {
    const updatedAt = new Date().toISOString();
    await withStore("readwrite", async (store) => {
      store.put({ key, value, updatedAt });
    });
    return { key, updatedAt };
  }

  async function remove(key) {
    await withStore("readwrite", async (store) => {
      store.delete(key);
    });
  }

  function snapshotMeta(snapshot) {
    const store = snapshot?.store || {};
    return {
      schema: snapshot?.schema || "",
      exportedAt: snapshot?.exportedAt || "",
      savedAt: new Date().toISOString(),
      counts: {
        projects: Number(snapshot?.counts?.projects ?? Object.keys(store.projects || {}).length),
        scans: Number(snapshot?.counts?.scans ?? (Array.isArray(store.scans) ? store.scans.length : 0)),
        observationPlans: Number(snapshot?.counts?.observationPlans ?? Object.keys(store.observationPlans || {}).length)
      },
      activeObservationPlanId: snapshot?.activeObservationPlanId || snapshot?.settings?.activeObservationPlanId || "default",
      secretsIncluded: Boolean(snapshot?.privacy?.secretsIncluded)
    };
  }

  async function putSnapshot(snapshot) {
    if (!snapshot || snapshot.schema !== "starvault-indexeddb-snapshot/v1") {
      throw new Error("Invalid StarVault IndexedDB snapshot");
    }
    const meta = snapshotMeta(snapshot);
    await put(SNAPSHOT_KEY, snapshot);
    await put(SNAPSHOT_META_KEY, meta);
    return meta;
  }

  function getSnapshot() {
    return get(SNAPSHOT_KEY);
  }

  function getSnapshotMeta() {
    return get(SNAPSHOT_META_KEY);
  }

  async function shouldSyncSnapshot(minAgeMs) {
    const meta = await getSnapshotMeta();
    if (!meta?.savedAt) return true;
    return Date.now() - new Date(meta.savedAt).getTime() > Number(minAgeMs || 0);
  }

  async function clearSnapshot() {
    await remove(SNAPSHOT_KEY);
    await remove(SNAPSHOT_META_KEY);
  }

  window.StarVaultIndexedDB = {
    isSupported,
    getValue: get,
    putValue: put,
    removeValue: remove,
    putSnapshot,
    getSnapshot,
    getSnapshotMeta,
    shouldSyncSnapshot,
    clearSnapshot
  };
})();
