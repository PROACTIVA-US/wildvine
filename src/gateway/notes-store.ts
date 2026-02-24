/**
 * Notes Store — note capture and management.
 * Backed by engine.db. Replaces CC hub-backend's notes endpoints.
 */
import type { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { getEngineDb } from "./engine-store.js";

export interface Note {
  id: string;
  subject: string;
  body: string | null;
  priority: "RED" | "YELLOW" | "GREEN";
  status: "active" | "working" | "completed" | "dismissed";
  source: string | null;
  created_at: number;
  updated_at: number;
}

let _db: DatabaseSync | null = null;
function db(): DatabaseSync {
  if (!_db) {
    _db = getEngineDb();
  }
  return _db;
}

export function createNote(opts: {
  subject: string;
  body?: string;
  priority?: Note["priority"];
  source?: string;
}): Note {
  const id = randomUUID();
  const now = Date.now();
  db()
    .prepare(
      `INSERT INTO notes (id, subject, body, priority, status, source, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?, ?)`,
    )
    .run(
      id,
      opts.subject,
      opts.body ?? null,
      opts.priority ?? "GREEN",
      opts.source ?? null,
      now,
      now,
    );
  return {
    id,
    subject: opts.subject,
    body: opts.body ?? null,
    priority: opts.priority ?? "GREEN",
    status: "active",
    source: opts.source ?? null,
    created_at: now,
    updated_at: now,
  };
}

export function listNotes(opts?: { status?: string; priority?: string; limit?: number }): Note[] {
  const lim = opts?.limit ?? 50;
  let sql = "SELECT * FROM notes";
  const conditions: string[] = [];
  const binds: (string | number)[] = [];
  if (opts?.status) {
    conditions.push("status = ?");
    binds.push(opts.status);
  }
  if (opts?.priority) {
    conditions.push("priority = ?");
    binds.push(opts.priority);
  }
  if (conditions.length) {
    sql += ` WHERE ${conditions.join(" AND ")}`;
  }
  sql += " ORDER BY created_at DESC LIMIT ?";
  binds.push(lim);
  return db()
    .prepare(sql)
    .all(...binds) as unknown as Note[];
}

export function dismissNote(noteId: string): Note | null {
  const now = Date.now();
  const result = db()
    .prepare(`UPDATE notes SET status = 'working', updated_at = ? WHERE id = ?`)
    .run(now, noteId);
  if (result.changes === 0) {
    return null;
  }
  return db().prepare(`SELECT * FROM notes WHERE id = ?`).get(noteId) as
    | Note
    | undefined as Note | null;
}

export function completeNote(noteId: string): Note | null {
  const now = Date.now();
  const result = db()
    .prepare(`UPDATE notes SET status = 'completed', updated_at = ? WHERE id = ?`)
    .run(now, noteId);
  if (result.changes === 0) {
    return null;
  }
  return db().prepare(`SELECT * FROM notes WHERE id = ?`).get(noteId) as
    | Note
    | undefined as Note | null;
}

export function searchNotes(query: string, limit?: number): Note[] {
  const lim = limit ?? 20;
  const likeQ = `%${query}%`;
  return db()
    .prepare(
      `SELECT * FROM notes WHERE subject LIKE ? OR body LIKE ? ORDER BY created_at DESC LIMIT ?`,
    )
    .all(likeQ, likeQ, lim) as unknown as Note[];
}
