/**
 * Inbox Store — notification items with state machine backed by engine.db.
 * Replaces CC hub-backend's inbox endpoints.
 */
import type { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { getEngineDb } from "./engine-store.js";

export interface InboxItem {
  id: string;
  instance: string;
  agent_id: string | null;
  priority: "RED" | "YELLOW" | "GREEN";
  status: "unread" | "read" | "working" | "completed" | "dismissed";
  subject: string;
  body: string | null;
  attachments: string | null;
  source: string | null;
  acked: number;
  ack_note: string | null;
  ack_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface InboxCounts {
  total: number;
  unread: number;
  read: number;
  acked: number;
  unacked: number;
}

let _db: DatabaseSync | null = null;
function db(): DatabaseSync {
  if (!_db) {
    _db = getEngineDb();
  }
  return _db;
}

export function createItem(opts: {
  instance?: string;
  agent_id?: string;
  priority?: "RED" | "YELLOW" | "GREEN";
  subject: string;
  body?: string;
  attachments?: unknown[];
  source?: string;
}): InboxItem {
  const id = randomUUID();
  const now = Date.now();
  const instance = opts.instance ?? "default";
  const attachStr = opts.attachments ? JSON.stringify(opts.attachments) : null;
  db()
    .prepare(
      `INSERT INTO inbox_items (id, instance, agent_id, priority, status, subject, body, attachments, source, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'unread', ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      instance,
      opts.agent_id ?? null,
      opts.priority ?? "GREEN",
      opts.subject,
      opts.body ?? null,
      attachStr,
      opts.source ?? null,
      now,
      now,
    );
  return {
    id,
    instance,
    agent_id: opts.agent_id ?? null,
    priority: opts.priority ?? "GREEN",
    status: "unread",
    subject: opts.subject,
    body: opts.body ?? null,
    attachments: attachStr,
    source: opts.source ?? null,
    acked: 0,
    ack_note: null,
    ack_at: null,
    created_at: now,
    updated_at: now,
  };
}

export function listItems(
  instance?: string,
  opts?: { unread_only?: boolean; unacked_only?: boolean; limit?: number; status?: string },
): InboxItem[] {
  const inst = instance ?? "default";
  const lim = opts?.limit ?? 50;
  let where = "instance = ?";
  const binds: unknown[] = [inst];
  if (opts?.unread_only) {
    where += " AND status = 'unread'";
  }
  if (opts?.unacked_only) {
    where += " AND acked = 0";
  }
  if (opts?.status) {
    where += " AND status = ?";
    binds.push(opts.status);
  }
  binds.push(lim);
  return db()
    .prepare(`SELECT * FROM inbox_items WHERE ${where} ORDER BY created_at DESC LIMIT ?`)
    .all(...binds) as unknown as InboxItem[];
}

export function ackItem(itemId: string, opts?: { note?: string }): InboxItem | null {
  const now = Date.now();
  const result = db()
    .prepare(
      `UPDATE inbox_items SET acked = 1, ack_note = ?, ack_at = ?, status = CASE WHEN status = 'unread' THEN 'read' ELSE status END, updated_at = ?
       WHERE id = ?`,
    )
    .run(opts?.note ?? null, now, now, itemId);
  if (result.changes === 0) {
    return null;
  }
  return db().prepare(`SELECT * FROM inbox_items WHERE id = ?`).get(itemId) as
    | InboxItem
    | undefined as InboxItem | null;
}

export function updateStatus(itemId: string, status: InboxItem["status"]): InboxItem | null {
  const now = Date.now();
  const result = db()
    .prepare(`UPDATE inbox_items SET status = ?, updated_at = ? WHERE id = ?`)
    .run(status, now, itemId);
  if (result.changes === 0) {
    return null;
  }
  return db().prepare(`SELECT * FROM inbox_items WHERE id = ?`).get(itemId) as
    | InboxItem
    | undefined as InboxItem | null;
}

export function counts(instance?: string): InboxCounts {
  const inst = instance ?? "default";
  const row = db()
    .prepare(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'unread' THEN 1 ELSE 0 END) AS unread,
        SUM(CASE WHEN status != 'unread' THEN 1 ELSE 0 END) AS "read",
        SUM(CASE WHEN acked = 1 THEN 1 ELSE 0 END) AS acked,
        SUM(CASE WHEN acked = 0 THEN 1 ELSE 0 END) AS unacked
       FROM inbox_items WHERE instance = ?`,
    )
    .get(inst) as Record<string, number>;
  return {
    total: row.total ?? 0,
    unread: row.unread ?? 0,
    read: row.read ?? 0,
    acked: row.acked ?? 0,
    unacked: row.unacked ?? 0,
  };
}
