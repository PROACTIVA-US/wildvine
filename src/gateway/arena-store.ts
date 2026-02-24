/**
 * Arena Store — multi-agent deliberation sessions + messages.
 * Backed by engine.db. Replaces CC hub-backend's arena endpoints.
 */
import type { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { getEngineDb } from "./engine-store.js";

export interface ArenaSession {
  id: string;
  project_id: string;
  topic: string;
  description: string | null;
  agents: string; // JSON array
  mode: string;
  message_count: number;
  created_at: number;
  updated_at: number;
}

export interface ArenaMessage {
  id: string;
  session_id: string;
  sender: string;
  role: string;
  content: string;
  target_agent: string | null;
  created_at: number;
}

let _db: DatabaseSync | null = null;
function db(): DatabaseSync {
  if (!_db) {
    _db = getEngineDb();
  }
  return _db;
}

export function listSessions(
  projectId?: string,
  opts?: { limit?: number; offset?: number },
): ArenaSession[] {
  const pid = projectId ?? "default";
  const lim = opts?.limit ?? 50;
  const off = opts?.offset ?? 0;
  return db()
    .prepare(
      `SELECT * FROM arena_sessions WHERE project_id = ?
       ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
    )
    .all(pid, lim, off) as unknown as ArenaSession[];
}

export function getSession(sessionId: string): ArenaSession | null {
  const row = db().prepare(`SELECT * FROM arena_sessions WHERE id = ?`).get(sessionId);
  return (row as ArenaSession | undefined) ?? null;
}

export function createSession(
  projectId: string | undefined,
  opts: {
    topic: string;
    description?: string;
    agents?: string[];
    mode?: string;
  },
): ArenaSession {
  const id = randomUUID();
  const now = Date.now();
  const pid = projectId ?? "default";
  const agentsStr = JSON.stringify(opts.agents ?? []);
  db()
    .prepare(
      `INSERT INTO arena_sessions (id, project_id, topic, description, agents, mode, message_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    )
    .run(id, pid, opts.topic, opts.description ?? null, agentsStr, opts.mode ?? "open", now, now);
  return {
    id,
    project_id: pid,
    topic: opts.topic,
    description: opts.description ?? null,
    agents: agentsStr,
    mode: opts.mode ?? "open",
    message_count: 0,
    created_at: now,
    updated_at: now,
  };
}

export function listMessages(
  sessionId: string,
  opts?: { limit?: number; offset?: number },
): ArenaMessage[] {
  const lim = opts?.limit ?? 100;
  const off = opts?.offset ?? 0;
  return db()
    .prepare(
      `SELECT * FROM arena_messages WHERE session_id = ?
       ORDER BY created_at ASC LIMIT ? OFFSET ?`,
    )
    .all(sessionId, lim, off) as unknown as ArenaMessage[];
}

export function addMessage(
  sessionId: string,
  opts: {
    sender: string;
    role?: string;
    content: string;
    target_agent?: string;
  },
): ArenaMessage {
  const id = randomUUID();
  const now = Date.now();
  db()
    .prepare(
      `INSERT INTO arena_messages (id, session_id, sender, role, content, target_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      sessionId,
      opts.sender,
      opts.role ?? "user",
      opts.content,
      opts.target_agent ?? null,
      now,
    );
  // Update session message count + updated_at
  db()
    .prepare(
      `UPDATE arena_sessions SET message_count = message_count + 1, updated_at = ? WHERE id = ?`,
    )
    .run(now, sessionId);
  return {
    id,
    session_id: sessionId,
    sender: opts.sender,
    role: opts.role ?? "user",
    content: opts.content,
    target_agent: opts.target_agent ?? null,
    created_at: now,
  };
}
