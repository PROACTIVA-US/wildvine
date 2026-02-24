/**
 * Unified Engine Database — single SQLite DB for all native CC subsystems.
 * Pattern follows vislzr-store.ts: DatabaseSync singleton, sync operations.
 * DB path: ~/.wildvine/engine.db
 */
import type { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { requireNodeSqlite } from "../memory/sqlite.js";

const DB_PATH = path.join(
  process.env.HOME ?? process.env.USERPROFILE ?? ".",
  ".wildvine",
  "engine.db",
);

let _db: DatabaseSync | null = null;

export function getEngineDb(): DatabaseSync {
  if (_db) {
    return _db;
  }
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const { DatabaseSync } = requireNodeSqlite();
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  initAllSchemas(db);
  _db = db;
  return db;
}

/** For testing — create an in-memory DB with all schemas. */
export function createTestEngineDb(): DatabaseSync {
  const { DatabaseSync } = requireNodeSqlite();
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  initAllSchemas(db);
  return db;
}

function initAllSchemas(db: DatabaseSync): void {
  // ── Governor Referrals ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS governor_referrals (
      id TEXT PRIMARY KEY,
      instance TEXT NOT NULL DEFAULT 'default',
      kind TEXT NOT NULL,
      reason TEXT NOT NULL,
      artifact_ref TEXT,
      payload TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','denied')),
      comment TEXT,
      created_at INTEGER NOT NULL,
      decided_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_gov_instance_status ON governor_referrals(instance, status);
    CREATE INDEX IF NOT EXISTS idx_gov_created ON governor_referrals(created_at DESC);
  `);

  // ── Inbox Items ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS inbox_items (
      id TEXT PRIMARY KEY,
      instance TEXT NOT NULL DEFAULT 'default',
      agent_id TEXT,
      priority TEXT NOT NULL DEFAULT 'GREEN' CHECK(priority IN ('RED','YELLOW','GREEN')),
      status TEXT NOT NULL DEFAULT 'unread' CHECK(status IN ('unread','read','working','completed','dismissed')),
      subject TEXT NOT NULL,
      body TEXT,
      attachments TEXT,
      source TEXT,
      acked INTEGER NOT NULL DEFAULT 0,
      ack_note TEXT,
      ack_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_inbox_instance_status ON inbox_items(instance, status);
    CREATE INDEX IF NOT EXISTS idx_inbox_priority ON inbox_items(priority);
    CREATE INDEX IF NOT EXISTS idx_inbox_created ON inbox_items(created_at DESC);
  `);

  // ── IDEALZR: Goals ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL DEFAULT 'default',
      title TEXT NOT NULL,
      description TEXT,
      state TEXT NOT NULL DEFAULT 'DRAFT' CHECK(state IN ('DRAFT','ACTIVE','ACHIEVED','ARCHIVED')),
      progress REAL NOT NULL DEFAULT 0,
      canvas_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_goals_project ON goals(project_id);
    CREATE INDEX IF NOT EXISTS idx_goals_state ON goals(state);
  `);

  // ── IDEALZR: Hypotheses ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS hypotheses (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL DEFAULT 'default',
      goal_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      state TEXT NOT NULL DEFAULT 'PROPOSED' CHECK(state IN ('PROPOSED','TESTING','VALIDATED','INVALIDATED')),
      confidence REAL NOT NULL DEFAULT 0.5,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_hyp_project ON hypotheses(project_id);
    CREATE INDEX IF NOT EXISTS idx_hyp_goal ON hypotheses(goal_id);
    CREATE INDEX IF NOT EXISTS idx_hyp_state ON hypotheses(state);
  `);

  // ── IDEALZR: Evidence ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL DEFAULT 'default',
      hypothesis_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      kind TEXT NOT NULL DEFAULT 'NEUTRAL' CHECK(kind IN ('SUPPORTS','CONTRADICTS','NEUTRAL')),
      source TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (hypothesis_id) REFERENCES hypotheses(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_ev_project ON evidence(project_id);
    CREATE INDEX IF NOT EXISTS idx_ev_hypothesis ON evidence(hypothesis_id);
  `);

  // ── KB: Indexed Documents ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS kb_documents (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL DEFAULT 'default',
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      url TEXT,
      snippet TEXT,
      metadata TEXT,
      indexed_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_kb_project ON kb_documents(project_id);
    CREATE INDEX IF NOT EXISTS idx_kb_entity ON kb_documents(entity_type, entity_id);
  `);

  // ── KB: FTS5 Virtual Table ──
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS kb_fts USING fts5(
      title, content, snippet,
      content='kb_documents',
      content_rowid='rowid'
    );
  `);

  // ── KB: Triggers to keep FTS in sync ──
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS kb_fts_ai AFTER INSERT ON kb_documents BEGIN
      INSERT INTO kb_fts(rowid, title, content, snippet)
      VALUES (new.rowid, new.title, new.content, new.snippet);
    END;
    CREATE TRIGGER IF NOT EXISTS kb_fts_ad AFTER DELETE ON kb_documents BEGIN
      INSERT INTO kb_fts(kb_fts, rowid, title, content, snippet)
      VALUES ('delete', old.rowid, old.title, old.content, old.snippet);
    END;
    CREATE TRIGGER IF NOT EXISTS kb_fts_au AFTER UPDATE ON kb_documents BEGIN
      INSERT INTO kb_fts(kb_fts, rowid, title, content, snippet)
      VALUES ('delete', old.rowid, old.title, old.content, old.snippet);
      INSERT INTO kb_fts(rowid, title, content, snippet)
      VALUES (new.rowid, new.title, new.content, new.snippet);
    END;
  `);

  // ── Arena: Sessions ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS arena_sessions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL DEFAULT 'default',
      topic TEXT NOT NULL,
      description TEXT,
      agents TEXT NOT NULL DEFAULT '[]',
      mode TEXT NOT NULL DEFAULT 'open',
      message_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_arena_project ON arena_sessions(project_id);
  `);

  // ── Arena: Messages ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS arena_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      sender TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      content TEXT NOT NULL,
      target_agent TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES arena_sessions(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_arena_msg_session ON arena_messages(session_id, created_at);
  `);

  // ── Skills Registry ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS skills_registry (
      name TEXT PRIMARY KEY,
      description TEXT,
      priority TEXT DEFAULT 'P2',
      keywords TEXT,
      source TEXT NOT NULL DEFAULT 'bundled',
      path TEXT,
      content TEXT,
      eval_score REAL,
      eval_details TEXT,
      security_flags TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_skills_source ON skills_registry(source);
    CREATE INDEX IF NOT EXISTS idx_skills_priority ON skills_registry(priority);
  `);

  // ── Pipeline Definitions ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS pipelines (
      name TEXT PRIMARY KEY,
      version TEXT,
      owner TEXT,
      description TEXT,
      stage_count INTEGER NOT NULL DEFAULT 0,
      definition TEXT,
      source_path TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // ── Pipeline Runs ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS pipeline_runs (
      id TEXT PRIMARY KEY,
      pipeline_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','succeeded','failed','cancelled')),
      params TEXT,
      stages_run INTEGER NOT NULL DEFAULT 0,
      stages_succeeded INTEGER NOT NULL DEFAULT 0,
      stages_failed INTEGER NOT NULL DEFAULT 0,
      stages_skipped INTEGER NOT NULL DEFAULT 0,
      summary TEXT,
      started_at INTEGER,
      finished_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (pipeline_name) REFERENCES pipelines(name) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_runs_pipeline ON pipeline_runs(pipeline_name);
    CREATE INDEX IF NOT EXISTS idx_runs_status ON pipeline_runs(status);
    CREATE INDEX IF NOT EXISTS idx_runs_created ON pipeline_runs(created_at DESC);
  `);

  // ── Notes ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      subject TEXT NOT NULL,
      body TEXT,
      priority TEXT NOT NULL DEFAULT 'GREEN' CHECK(priority IN ('RED','YELLOW','GREEN')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','working','completed','dismissed')),
      source TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_notes_status ON notes(status);
    CREATE INDEX IF NOT EXISTS idx_notes_priority ON notes(priority);
  `);
}
