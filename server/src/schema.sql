PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS actors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  organization TEXT NOT NULL,
  role TEXT CHECK (role IS NULL OR role IN ('analyst','authorizer','implementer','verifier','steward')),
  is_agent INTEGER NOT NULL DEFAULT 0 CHECK (is_agent IN (0,1)),
  agent_role TEXT CHECK (agent_role IS NULL OR agent_role IN ('oracle','gaia','solomon','aegis','athena','leonardo','builder')),
  created_at TEXT NOT NULL,
  CHECK (
    (is_agent = 1 AND role IS NULL AND agent_role IS NOT NULL) OR
    (is_agent = 0 AND role IS NOT NULL AND agent_role IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS accounts (
  actor_id TEXT PRIMARY KEY REFERENCES actors(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  disabled INTEGER NOT NULL DEFAULT 0 CHECK (disabled IN (0,1)),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','understanding','evaluated','authorized','executing','verified','learned')),
  place_name TEXT,
  place_geo_json TEXT,
  problem_statement TEXT,
  affected_population TEXT,
  baseline_metric TEXT,
  baseline_value REAL,
  baseline_unit TEXT,
  baseline_method TEXT,
  baseline_observed_at TEXT,
  baseline_locked_at TEXT,
  synthetic INTEGER NOT NULL DEFAULT 1 CHECK (synthetic IN (0,1)),
  created_by TEXT NOT NULL REFERENCES actors(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS observations (
  id TEXT PRIMARY KEY,
  decision_id TEXT NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  observed_at TEXT NOT NULL,
  observer_id TEXT NOT NULL REFERENCES actors(id),
  method TEXT NOT NULL,
  value_text TEXT NOT NULL,
  source_ref TEXT,
  limitations TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS evidence (
  id TEXT PRIMARY KEY,
  decision_id TEXT NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL
    CHECK (source_type IN ('dataset','report','field_measurement','interview','administrative_record','other')),
  source_ref TEXT NOT NULL,
  url TEXT,
  published_at TEXT,
  independence_note TEXT,
  limitations TEXT,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','accepted','rejected')),
  contributed_by TEXT NOT NULL REFERENCES actors(id),
  reviewed_by TEXT REFERENCES actors(id),
  reviewed_at TEXT,
  review_note TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alternatives (
  id TEXT PRIMARY KEY,
  decision_id TEXT NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  est_cost_amount REAL,
  est_cost_currency TEXT,
  expected_benefit TEXT,
  risks TEXT,
  uncertainties TEXT,
  selected INTEGER NOT NULL DEFAULT 0 CHECK (selected IN (0,1)),
  selection_rationale TEXT,
  created_by TEXT NOT NULL REFERENCES actors(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS authorizations (
  id TEXT PRIMARY KEY,
  decision_id TEXT NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  authorizer_id TEXT NOT NULL REFERENCES actors(id),
  scope TEXT NOT NULL,
  conditions TEXT NOT NULL,
  coi_declaration TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  authorized_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS resource_commitments (
  id TEXT PRIMARY KEY,
  decision_id TEXT NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  instrument TEXT NOT NULL CHECK (instrument IN ('grant','donation','loan','investment','in_kind')),
  amount REAL,
  currency TEXT,
  funder TEXT NOT NULL,
  terms_note TEXT,
  approved_by TEXT NOT NULL REFERENCES actors(id),
  approved_at TEXT NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS executions (
  id TEXT PRIMARY KEY,
  decision_id TEXT NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  implementer_id TEXT NOT NULL REFERENCES actors(id),
  started_at TEXT NOT NULL,
  ended_at TEXT,
  work_performed TEXT,
  deviations TEXT,
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned','in_progress','completed','failed','abandoned')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outcomes (
  id TEXT PRIMARY KEY,
  decision_id TEXT NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  measured_at TEXT NOT NULL,
  metric TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  classification TEXT NOT NULL
    CHECK (classification IN ('observed','estimated','attributed','uncertain')),
  method TEXT NOT NULL,
  baseline_value REAL,
  baseline_note TEXT NOT NULL,
  uncertainty_note TEXT NOT NULL,
  attribution_method TEXT,
  verifier_id TEXT NOT NULL REFERENCES actors(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS corrections (
  id TEXT PRIMARY KEY,
  decision_id TEXT NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL
    CHECK (target_type IN ('decision','observation','evidence','alternative','authorization','resource','execution','outcome','lesson')),
  target_id TEXT,
  description TEXT NOT NULL,
  raised_by TEXT NOT NULL REFERENCES actors(id),
  raised_at TEXT NOT NULL,
  resolution TEXT,
  resolved_by TEXT REFERENCES actors(id),
  resolved_at TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved'))
);

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  decision_id TEXT NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  what_worked TEXT,
  what_didnt TEXT,
  changes TEXT,
  recorded_by TEXT NOT NULL REFERENCES actors(id),
  recorded_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_contributions (
  id TEXT PRIMARY KEY,
  decision_id TEXT NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL REFERENCES actors(id),
  requested_by TEXT REFERENCES actors(id),
  kind TEXT NOT NULL CHECK (kind IN ('evidence_gap_flag','proposal','summary')),
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  reviewed_by TEXT REFERENCES actors(id),
  review_note TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  decision_id TEXT NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  actor_id TEXT NOT NULL REFERENCES actors(id),
  summary TEXT NOT NULL,
  payload_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_actor ON sessions(actor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_observations_decision ON observations(decision_id);
CREATE INDEX IF NOT EXISTS idx_evidence_decision ON evidence(decision_id);
CREATE INDEX IF NOT EXISTS idx_alternatives_decision ON alternatives(decision_id);
CREATE INDEX IF NOT EXISTS idx_authorizations_decision ON authorizations(decision_id);
CREATE INDEX IF NOT EXISTS idx_resources_decision ON resource_commitments(decision_id);
CREATE INDEX IF NOT EXISTS idx_executions_decision ON executions(decision_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_decision ON outcomes(decision_id);
CREATE INDEX IF NOT EXISTS idx_corrections_decision ON corrections(decision_id);
CREATE INDEX IF NOT EXISTS idx_lessons_decision ON lessons(decision_id);
CREATE INDEX IF NOT EXISTS idx_contributions_decision ON agent_contributions(decision_id);
CREATE INDEX IF NOT EXISTS idx_events_decision ON events(decision_id);
