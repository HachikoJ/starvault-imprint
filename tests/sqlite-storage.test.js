const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");
const { readSqliteStore, writeSqliteStore } = require("../src/lib/sqlite-store");
const { createStorage } = require("../src/lib/storage");

function repository(fullName) {
  return {
    fullName,
    owner: fullName.split("/")[0],
    name: fullName.split("/")[1],
    description: "A focused local-first project",
    language: "TypeScript",
    topics: ["local-first"],
    stars: 120,
    forks: 12,
    openIssues: 2,
    pushedAt: "2026-07-10T00:00:00.000Z",
    updatedAt: "2026-07-10T00:00:00.000Z",
    scores: { opportunity: 82, quality: 75, actionability: 70, risk: 5 }
  };
}

test("fresh settings enable the default AI provider without inventing a key", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "starvault-sqlite-defaults-"));
  const storage = createStorage(path.join(dir, "starvault.db"));
  const provider = storage.getSettings(false).llmProviders.find((item) => item.id === "deepseek");

  assert.equal(provider.enabled, true);
  assert.equal(provider.apiKeySet, false);
});

test("SQLite storage imports JSON once and persists incremental project state", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "starvault-sqlite-"));
  const jsonPath = path.join(dir, "store.json");
  const dbPath = path.join(dir, "starvault.db");
  const legacy = createStorage(jsonPath);
  legacy.upsertProjects([repository("acme/local-app")], { observationPlanId: "default" });
  const legacyBytes = fs.readFileSync(jsonPath);

  const storage = createStorage(dbPath);
  assert.equal(storage.listProjects({ limit: "all" }).total, 1);
  assert.equal(storage.getProject("acme/local-app").fullName, "acme/local-app");

  storage.setWatch("acme/local-app", true);
  assert.equal(storage.getProject("acme/local-app").watched, true);
  storage.buildLeaderboard("daily", { limit: 20 });
  const coreSnapshot = storage.exportLocalSnapshot({ includeProjects: false, includeLeaderboards: false, includeComputed: false });
  const leaderboardPage = storage.exportLocalLeaderboardPage({ limit: 25 });
  assert.deepEqual(coreSnapshot.store.projects, {});
  assert.deepEqual(coreSnapshot.store.leaderboards, { daily: {}, byPlan: {} });
  assert.equal(coreSnapshot.sync.projectsIncluded, false);
  assert.equal(coreSnapshot.sync.leaderboardsIncluded, false);
  assert.equal(leaderboardPage.total, coreSnapshot.counts.leaderboards);
  assert.equal(leaderboardPage.items.length, leaderboardPage.total);
  assert.deepEqual(fs.readFileSync(jsonPath), legacyBytes, "legacy JSON must remain an untouched migration backup");

  const db = new DatabaseSync(dbPath, { readOnly: true });
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM projects").get().count, 1);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM observation_plans").get().count, 1);
  assert.equal(db.prepare("SELECT plan_id FROM project_plans WHERE project_key = ?").get("acme/local-app").plan_id, "default");
  db.close();

  const reloaded = createStorage(dbPath);
  assert.equal(reloaded.getProject("acme/local-app").watched, true);
});

test("SQLite incremental writes persist arbitrary in-place project changes", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "starvault-sqlite-project-"));
  const dbPath = path.join(dir, "starvault.db");
  const storage = createStorage(dbPath);
  storage.upsertProjects([repository("acme/local-app")], { observationPlanId: "default" });

  const store = readSqliteStore(dbPath);
  store.projects["acme/local-app"].description = "Updated after the initial write";
  writeSqliteStore(dbPath, store);

  const db = new DatabaseSync(dbPath, { readOnly: true });
  const saved = JSON.parse(db.prepare("SELECT json FROM projects WHERE key = ?").get("acme/local-app").json);
  db.close();
  assert.equal(saved.description, "Updated after the initial write");
});
