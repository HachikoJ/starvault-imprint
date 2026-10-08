const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../public/app.js"), "utf8");
function functionSource(name) {
  const match = new RegExp(`(?:async\\s+)?function ${name}\\(`).exec(source);
  assert.ok(match, name);
  const rest = source.slice(match.index + 1);
  const next = /\n(?:async\s+)?function\s+\w+\(/.exec(rest);
  return source.slice(match.index, next ? match.index + 1 + next.index : source.length);
}

function runtime(store, fetch) {
  const context = vm.createContext({
    window: {}, getAuthToken: () => "", indexedDbStore: () => store,
    state: {}, fetch, queueIndexedDbSnapshotSync: () => {},
    INDEXEDDB_SNAPSHOT_MUTATION_DELAY_MS: 1
  });
  vm.runInContext(`${functionSource("api")}\n${functionSource("handleIndexedDbApiSuccess")}`, context);
  return context;
}

test("online snapshot request succeeds when IndexedDB is unavailable and does not replace cache", async () => {
  let requests = 0;
  let writes = 0;
  const response = { schema: "starvault-indexeddb-snapshot/v1" };
  const context = runtime({
    getSnapshotMeta: async () => { throw new Error("IndexedDB denied"); },
    putSnapshot: async () => { writes += 1; }
  }, async () => { requests += 1; return { ok: true, json: async () => response }; });
  assert.equal(await context.api("/api/local-snapshot"), response);
  assert.equal(requests, 1);
  assert.equal(writes, 0);
});

test("server snapshot replacement uses the revision from before the response arrives", async () => {
  let revision = 7;
  let submitted;
  const response = { schema: "starvault-indexeddb-snapshot/v1" };
  const context = runtime({
    getSnapshotMeta: async () => ({ localRevision: revision }),
    putSnapshot: async (_, options) => { submitted = options; return {}; }
  }, async () => { revision = 8; return { ok: true, json: async () => response }; });
  await context.api("/api/local-snapshot");
  assert.equal(submitted.expectedRevision, 7);
  assert.equal(revision, 8);
});
