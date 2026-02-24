/**
 * Governor Store — referral CRUD backed by engine.db.
 * Replaces CC hub-backend's governor queue (JSONL-based).
 */
import type { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { getEngineDb } from "./engine-store.js";

export interface GovernorReferral {
  id: string;
  instance: string;
  kind: string;
  reason: string;
  artifact_ref: string | null;
  payload: string | null;
  status: "pending" | "approved" | "denied";
  comment: string | null;
  created_at: number;
  decided_at: number | null;
}

let _db: DatabaseSync | null = null;
function db(): DatabaseSync {
  if (!_db) {
    _db = getEngineDb();
  }
  return _db;
}

export function createReferral(opts: {
  instance?: string;
  kind: string;
  reason: string;
  artifact_ref?: string;
  payload?: unknown;
}): GovernorReferral {
  const id = randomUUID();
  const now = Date.now();
  const instance = opts.instance ?? "default";
  const payloadStr = opts.payload ? JSON.stringify(opts.payload) : null;
  db()
    .prepare(
      `INSERT INTO governor_referrals (id, instance, kind, reason, artifact_ref, payload, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
    )
    .run(id, instance, opts.kind, opts.reason, opts.artifact_ref ?? null, payloadStr, now);
  return {
    id,
    instance,
    kind: opts.kind,
    reason: opts.reason,
    artifact_ref: opts.artifact_ref ?? null,
    payload: payloadStr,
    status: "pending",
    comment: null,
    created_at: now,
    decided_at: null,
  };
}

export function listPending(instance?: string, limit?: number): GovernorReferral[] {
  const inst = instance ?? "default";
  const lim = limit ?? 50;
  return db()
    .prepare(
      `SELECT * FROM governor_referrals WHERE instance = ? AND status = 'pending'
       ORDER BY created_at DESC LIMIT ?`,
    )
    .all(inst, lim) as unknown as GovernorReferral[];
}

export function approve(
  referralId: string,
  opts?: { instance?: string; comment?: string },
): GovernorReferral | null {
  const now = Date.now();
  const result = db()
    .prepare(
      `UPDATE governor_referrals SET status = 'approved', comment = ?, decided_at = ?
       WHERE id = ? AND status = 'pending'`,
    )
    .run(opts?.comment ?? null, now, referralId);
  if (result.changes === 0) {
    return null;
  }
  return db().prepare(`SELECT * FROM governor_referrals WHERE id = ?`).get(referralId) as
    | GovernorReferral
    | undefined as GovernorReferral | null;
}

export function deny(
  referralId: string,
  opts?: { instance?: string; comment?: string },
): GovernorReferral | null {
  const now = Date.now();
  const result = db()
    .prepare(
      `UPDATE governor_referrals SET status = 'denied', comment = ?, decided_at = ?
       WHERE id = ? AND status = 'pending'`,
    )
    .run(opts?.comment ?? null, now, referralId);
  if (result.changes === 0) {
    return null;
  }
  return db().prepare(`SELECT * FROM governor_referrals WHERE id = ?`).get(referralId) as
    | GovernorReferral
    | undefined as GovernorReferral | null;
}

export function history(instance?: string, limit?: number): GovernorReferral[] {
  const inst = instance ?? "default";
  const lim = limit ?? 50;
  return db()
    .prepare(
      `SELECT * FROM governor_referrals WHERE instance = ? AND status != 'pending'
       ORDER BY decided_at DESC LIMIT ?`,
    )
    .all(inst, lim) as unknown as GovernorReferral[];
}

export function getReferral(referralId: string): GovernorReferral | null {
  const row = db().prepare(`SELECT * FROM governor_referrals WHERE id = ?`).get(referralId);
  return (row as GovernorReferral | undefined) ?? null;
}
