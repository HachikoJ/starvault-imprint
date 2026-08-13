-- StarVault Imprint desktop storage schema draft.
-- This file is documentation/scaffold only. It is not loaded by the current Node server.

PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
PRAGMA wal_autocheckpoint = 1000;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  language TEXT NOT NULL DEFAULT 'zh',
  daily_brief_size INTEGER NOT NULL DEFAULT 120,
  default_sort TEXT NOT NULL DEFAULT 'opportunity',
  active_observation_plan_id TEXT NOT NULL DEFAULT 'default',
  active_provider TEXT NOT NULL DEFAULT 'deepseek',
  provider_catalog_json TEXT NOT NULL DEFAULT '{"updatedAt":"","endpoints":[]}',
  llm_providers_json TEXT NOT NULL DEFAULT '[]',
  flags_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Only Keychain references are stored here. Secret values must never be stored in SQLite.
CREATE TABLE IF NOT EXISTS secret_refs (
  key TEXT PRIMARY KEY,
  keychain_service TEXT NOT NULL DEFAULT 'StarVault Imprint',
  keychain_account TEXT NOT NULL,
  configured INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unknown',
  checked_at TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS observation_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  built_in INTEGER NOT NULL DEFAULT 0,
  strategy_json TEXT NOT NULL DEFAULT '{}',
  search_logic_json TEXT NOT NULL DEFAULT '{}',
  user_data_json TEXT NOT NULL DEFAULT '{}',
  memory_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS plan_requirements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id TEXT NOT NULL REFERENCES observation_plans(id) ON DELETE CASCADE,
  requirement TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS projects (
  full_name TEXT PRIMARY KEY,
  owner TEXT NOT NULL DEFAULT '',
  repo TEXT NOT NULL DEFAULT '',
  html_url TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  description_zh TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT '',
  license_key TEXT NOT NULL DEFAULT '',
  stars INTEGER NOT NULL DEFAULT 0,
  forks INTEGER NOT NULL DEFAULT 0,
  open_issues INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  mirror INTEGER NOT NULL DEFAULT 0,
  pushed_at TEXT NOT NULL DEFAULT '',
  repo_updated_at TEXT NOT NULL DEFAULT '',
  discovered_at TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  use_case TEXT NOT NULL DEFAULT '',
  shape TEXT NOT NULL DEFAULT '',
  risk_level TEXT NOT NULL DEFAULT '',
  opportunity_score REAL NOT NULL DEFAULT 0,
  quality_score REAL NOT NULL DEFAULT 0,
  growth_score REAL NOT NULL DEFAULT 0,
  scores_json TEXT NOT NULL DEFAULT '{}',
  tags_json TEXT NOT NULL DEFAULT '[]',
  raw_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_projects_language ON projects(language);
CREATE INDEX IF NOT EXISTS idx_projects_license ON projects(license_key);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_use_case ON projects(use_case);
CREATE INDEX IF NOT EXISTS idx_projects_shape ON projects(shape);
CREATE INDEX IF NOT EXISTS idx_projects_scores ON projects(opportunity_score DESC, quality_score DESC, growth_score DESC);
CREATE INDEX IF NOT EXISTS idx_projects_stars ON projects(stars DESC);
CREATE INDEX IF NOT EXISTS idx_projects_pushed_at ON projects(pushed_at DESC);

-- Per-plan user state. The same repository can have different notes, analysis, and hidden state per observation plan.
CREATE TABLE IF NOT EXISTS plan_project_state (
  plan_id TEXT NOT NULL REFERENCES observation_plans(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL REFERENCES projects(full_name) ON DELETE CASCADE,
  watched INTEGER NOT NULL DEFAULT 0,
  watch_json TEXT NOT NULL DEFAULT '{}',
  note_json TEXT NOT NULL DEFAULT '{}',
  analysis_json TEXT NOT NULL DEFAULT '{}',
  dismissed_json TEXT NOT NULL DEFAULT '{}',
  github_action_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (plan_id, full_name)
);

CREATE INDEX IF NOT EXISTS idx_plan_project_state_watched ON plan_project_state(plan_id, watched);
CREATE INDEX IF NOT EXISTS idx_plan_project_state_updated ON plan_project_state(plan_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS memory_events (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES observation_plans(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT '',
  event_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_memory_events_plan_time ON memory_events(plan_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_events_type ON memory_events(plan_id, event_type);
CREATE INDEX IF NOT EXISTS idx_memory_events_project ON memory_events(plan_id, full_name);

CREATE TABLE IF NOT EXISTS scans (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES observation_plans(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'completed',
  started_at TEXT NOT NULL DEFAULT '',
  finished_at TEXT NOT NULL DEFAULT '',
  duration_ms INTEGER NOT NULL DEFAULT 0,
  query_count INTEGER NOT NULL DEFAULT 0,
  result_count INTEGER NOT NULL DEFAULT 0,
  error TEXT NOT NULL DEFAULT '',
  scan_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_scans_plan_time ON scans(plan_id, started_at DESC);

CREATE TABLE IF NOT EXISTS scan_items (
  scan_id TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL REFERENCES projects(full_name) ON DELETE CASCADE,
  rank INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT '',
  query_label TEXT NOT NULL DEFAULT '',
  matched_json TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (scan_id, full_name)
);

CREATE INDEX IF NOT EXISTS idx_scan_items_project ON scan_items(full_name);

CREATE TABLE IF NOT EXISTS leaderboards (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES observation_plans(id) ON DELETE CASCADE,
  period TEXT NOT NULL DEFAULT 'daily',
  archive_key TEXT NOT NULL DEFAULT '',
  generated_at TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL DEFAULT '{}'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboards_unique_archive
ON leaderboards(plan_id, period, archive_key);

CREATE TABLE IF NOT EXISTS leaderboard_items (
  leaderboard_id TEXT NOT NULL REFERENCES leaderboards(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL REFERENCES projects(full_name) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  trend TEXT NOT NULL DEFAULT 'stable',
  score REAL NOT NULL DEFAULT 0,
  item_json TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (leaderboard_id, rank)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_items_project ON leaderboard_items(full_name);

CREATE TABLE IF NOT EXISTS summary_cache (
  cache_key TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_summary_cache_plan ON summary_cache(plan_id);

INSERT OR IGNORE INTO schema_migrations(version, name)
VALUES (1, 'desktop-storage-initial-schema');
