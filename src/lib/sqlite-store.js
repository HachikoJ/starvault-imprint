const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const states = new Map();

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function isSqlitePath(filePath = "") {
  return [".db", ".sqlite", ".sqlite3"].includes(path.extname(String(filePath)).toLowerCase());
}

function json(value) {
  return JSON.stringify(value ?? null);
}

function parse(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function planIds(project = {}) {
  const matches = project.observationPlanMatches || project.observationMatches || [];
  if (Array.isArray(matches)) {
    return matches
      .map((match) => String(typeof match === "string" ? match : match?.planId || match?.id || ""))
      .filter(Boolean);
  }
  return Object.keys(matches || {});
}

function projectSignature(project = {}) {
  return json(project);
}

function leaderboardSignature(leaderboards = {}) {
  const archives = [];
  const addArchive = (scope, daily = {}) => {
    for (const [date, entry] of Object.entries(daily || {})) {
      archives.push([
        scope,
        date,
        entry?.generatedAt || "",
        (entry?.items || []).map((item) => `${item.fullName}:${item.rank || ""}:${item.leaderboardScore || ""}`).join("|")
      ]);
    }
  };
  addArchive("default", leaderboards.daily);
  for (const [planId, archive] of Object.entries(leaderboards.byPlan || {})) addArchive(planId, archive?.daily);
  return json(archives.sort((a, b) => `${a[0]}:${a[1]}`.localeCompare(`${b[0]}:${b[1]}`)));
}

function coreStore(store) {
  const core = { ...store };
  delete core.projects;
  delete core.observationPlans;
  delete core.scans;
  delete core.leaderboards;
  return core;
}

function createSchema(db) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    PRAGMA wal_autocheckpoint = 1000;

    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      key TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      opportunity REAL NOT NULL DEFAULT 0,
      stars INTEGER NOT NULL DEFAULT 0,
      pushed_at TEXT NOT NULL DEFAULT '',
      json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_projects_opportunity ON projects(opportunity DESC);
    CREATE INDEX IF NOT EXISTS idx_projects_stars ON projects(stars DESC);
    CREATE INDEX IF NOT EXISTS idx_projects_pushed_at ON projects(pushed_at DESC);

    CREATE TABLE IF NOT EXISTS project_plans (
      project_key TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      PRIMARY KEY(project_key, plan_id),
      FOREIGN KEY(project_key) REFERENCES projects(key) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_project_plans_plan ON project_plans(plan_id, project_key);

    CREATE TABLE IF NOT EXISTS observation_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scans (
      id TEXT PRIMARY KEY,
      at TEXT NOT NULL DEFAULT '',
      observation_plan_id TEXT NOT NULL DEFAULT '',
      json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_scans_at ON scans(at DESC);
    CREATE INDEX IF NOT EXISTS idx_scans_plan ON scans(observation_plan_id, at DESC);
  `);
}

function openState(filePath) {
  const resolved = path.resolve(filePath);
  if (states.has(resolved)) return states.get(resolved);
  ensureDir(resolved);
  const db = new DatabaseSync(resolved);
  createSchema(db);
  const state = {
    db,
    projectState: new Map(),
    planHashes: new Map(),
    scanHashes: new Map(),
    coreHash: "",
    leaderboardsHash: "",
    leaderboardsSignature: "",
    leaderboardsRef: null,
    initialized: false
  };
  states.set(resolved, state);
  return state;
}

function readSqliteStore(filePath) {
  const state = openState(filePath);
  const coreRow = state.db.prepare("SELECT json FROM app_state WHERE key = ?").get("core");
  if (!coreRow) return null;
  const leaderboardsRow = state.db.prepare("SELECT json FROM app_state WHERE key = ?").get("leaderboards");
  const store = parse(coreRow.json, {});
  const projects = {};
  const projectState = new Map();
  for (const row of state.db.prepare("SELECT key, json FROM projects").all()) {
    const project = parse(row.json, null);
    if (!project) continue;
    projects[row.key] = project;
    projectState.set(row.key, { ref: project, signature: projectSignature(project) });
  }
  const observationPlans = {};
  const planHashes = new Map();
  for (const row of state.db.prepare("SELECT id, json FROM observation_plans").all()) {
    const plan = parse(row.json, null);
    if (!plan) continue;
    observationPlans[row.id] = plan;
    planHashes.set(row.id, row.json);
  }
  const scans = [];
  const scanHashes = new Map();
  for (const row of state.db.prepare("SELECT id, json FROM scans ORDER BY at DESC").all()) {
    const scan = parse(row.json, null);
    if (!scan) continue;
    scans.push(scan);
    scanHashes.set(row.id, row.json);
  }
  const leaderboards = parse(leaderboardsRow?.json, { daily: {} });
  store.projects = projects;
  store.observationPlans = observationPlans;
  store.scans = scans;
  store.leaderboards = leaderboards;
  state.projectState = projectState;
  state.planHashes = planHashes;
  state.scanHashes = scanHashes;
  state.coreHash = coreRow.json;
  state.leaderboardsHash = leaderboardsRow?.json || json({ daily: {} });
  state.leaderboardsSignature = leaderboardSignature(leaderboards);
  state.leaderboardsRef = leaderboards;
  state.initialized = true;
  return store;
}

function writeSqliteStore(filePath, store, options = {}) {
  const state = openState(filePath);
  const now = new Date().toISOString();
  const next = { ...store, updatedAt: now };
  const projects = next.projects || {};
  const plans = next.observationPlans || {};
  const scans = Array.isArray(next.scans) ? next.scans : [];
  const leaderboards = next.leaderboards || { daily: {} };
  const core = coreStore(next);
  const coreJson = json(core);
  const force = options.force === true || !state.initialized;
  const nextProjectState = new Map();
  const nextPlanHashes = new Map();
  const nextScanHashes = new Map();
  const changedProjects = [];
  const changedPlans = [];
  const changedScans = [];
  const dirtyProjectKeys = Array.isArray(options.dirtyProjectKeys) ? new Set(options.dirtyProjectKeys.map(String)) : null;

  for (const [key, project] of Object.entries(projects)) {
    const previous = state.projectState.get(key);
    const canTrustUnchangedReference = !force && dirtyProjectKeys && previous && !dirtyProjectKeys.has(key);
    const signature = canTrustUnchangedReference ? previous.signature : projectSignature(project);
    nextProjectState.set(key, { ref: project, signature });
    if (force || !previous || (!canTrustUnchangedReference && previous.signature !== signature) || dirtyProjectKeys?.has(key)) {
      changedProjects.push([key, project, signature]);
    }
  }
  for (const [id, plan] of Object.entries(plans)) {
    const value = json(plan);
    nextPlanHashes.set(id, value);
    if (force || state.planHashes.get(id) !== value) changedPlans.push([id, plan, value]);
  }
  for (const scan of scans) {
    const id = String(scan.id || "");
    if (!id) continue;
    const value = json(scan);
    nextScanHashes.set(id, value);
    if (force || state.scanHashes.get(id) !== value) changedScans.push([id, scan, value]);
  }

  const deletedProjects = force ? [] : [...state.projectState.keys()].filter((key) => !nextProjectState.has(key));
  const deletedPlans = force ? [] : [...state.planHashes.keys()].filter((id) => !nextPlanHashes.has(id));
  const deletedScans = force ? [] : [...state.scanHashes.keys()].filter((id) => !nextScanHashes.has(id));
  const skipLeaderboardCheck = options.leaderboardsChanged === false && !force;
  const nextLeaderboardSignature = skipLeaderboardCheck ? state.leaderboardsSignature : leaderboardSignature(leaderboards);
  const leaderboardsChanged = !skipLeaderboardCheck && (force || state.leaderboardsRef !== leaderboards || state.leaderboardsSignature !== nextLeaderboardSignature);
  const leaderboardsJson = leaderboardsChanged ? json(leaderboards) : state.leaderboardsHash;
  const upsertState = state.db.prepare(
    "INSERT INTO app_state(key, json, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at"
  );
  const upsertProject = state.db.prepare(
    "INSERT INTO projects(key, full_name, opportunity, stars, pushed_at, json) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET full_name = excluded.full_name, opportunity = excluded.opportunity, stars = excluded.stars, pushed_at = excluded.pushed_at, json = excluded.json"
  );
  const upsertPlan = state.db.prepare(
    "INSERT INTO observation_plans(id, name, updated_at, json) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at, json = excluded.json"
  );
  const upsertScan = state.db.prepare(
    "INSERT INTO scans(id, at, observation_plan_id, json) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET at = excluded.at, observation_plan_id = excluded.observation_plan_id, json = excluded.json"
  );
  const deleteProjectPlans = state.db.prepare("DELETE FROM project_plans WHERE project_key = ?");
  const insertProjectPlan = state.db.prepare("INSERT OR IGNORE INTO project_plans(project_key, plan_id) VALUES (?, ?)");

  state.db.exec("BEGIN IMMEDIATE");
  try {
    if (force || state.coreHash !== coreJson) upsertState.run("core", coreJson, now);
    if (leaderboardsChanged) upsertState.run("leaderboards", leaderboardsJson, now);
    for (const [key, project, value] of changedProjects) {
      upsertProject.run(
        key,
        String(project.fullName || key),
        Number(project.scores?.opportunity || 0),
        Number(project.stars || 0),
        String(project.pushedAt || project.updatedAt || ""),
        value
      );
      deleteProjectPlans.run(key);
      for (const planId of planIds(project)) insertProjectPlan.run(key, planId);
    }
    for (const [id, plan, value] of changedPlans) upsertPlan.run(id, String(plan.name || ""), String(plan.updatedAt || ""), value);
    for (const [id, scan, value] of changedScans) upsertScan.run(id, String(scan.at || ""), String(scan.observationPlanId || ""), value);
    deletedProjects.forEach((key) => state.db.prepare("DELETE FROM projects WHERE key = ?").run(key));
    deletedPlans.forEach((id) => state.db.prepare("DELETE FROM observation_plans WHERE id = ?").run(id));
    deletedScans.forEach((id) => state.db.prepare("DELETE FROM scans WHERE id = ?").run(id));
    state.db.exec("COMMIT");
  } catch (error) {
    state.db.exec("ROLLBACK");
    throw error;
  }

  state.projectState = nextProjectState;
  state.planHashes = nextPlanHashes;
  state.scanHashes = nextScanHashes;
  state.coreHash = coreJson;
  state.leaderboardsHash = leaderboardsJson;
  state.leaderboardsSignature = nextLeaderboardSignature;
  state.leaderboardsRef = leaderboards;
  state.initialized = true;
  return next;
}

function sqliteStats(filePath) {
  const state = openState(filePath);
  const row = state.db
    .prepare("SELECT (SELECT COUNT(*) FROM projects) AS projects, (SELECT COUNT(*) FROM observation_plans) AS plans, (SELECT COUNT(*) FROM scans) AS scans")
    .get();
  return { projects: Number(row.projects || 0), plans: Number(row.plans || 0), scans: Number(row.scans || 0) };
}

module.exports = {
  isSqlitePath,
  readSqliteStore,
  sqliteStats,
  writeSqliteStore
};
