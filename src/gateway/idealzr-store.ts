/**
 * IDEALZR Store — Goals / Hypotheses / Evidence CRUD with state machines.
 * Backed by engine.db. Replaces CC hub-backend's IDEALZR endpoints.
 */
import type { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { getEngineDb } from "./engine-store.js";

// ── Types ──

export interface Goal {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  state: "DRAFT" | "ACTIVE" | "ACHIEVED" | "ARCHIVED";
  progress: number;
  canvas_id: string | null;
  created_at: number;
  updated_at: number;
}

export interface Hypothesis {
  id: string;
  project_id: string;
  goal_id: string | null;
  title: string;
  description: string | null;
  state: "PROPOSED" | "TESTING" | "VALIDATED" | "INVALIDATED";
  confidence: number;
  created_at: number;
  updated_at: number;
}

export interface Evidence {
  id: string;
  project_id: string;
  hypothesis_id: string | null;
  title: string;
  description: string | null;
  kind: "SUPPORTS" | "CONTRADICTS" | "NEUTRAL";
  source: string | null;
  created_at: number;
  updated_at: number;
}

// ── State Transitions ──

const GOAL_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["ACTIVE", "ARCHIVED"],
  ACTIVE: ["ACHIEVED", "ARCHIVED"],
  ACHIEVED: ["ARCHIVED"],
  ARCHIVED: ["DRAFT"],
};

const HYPOTHESIS_TRANSITIONS: Record<string, string[]> = {
  PROPOSED: ["TESTING", "INVALIDATED"],
  TESTING: ["VALIDATED", "INVALIDATED"],
  VALIDATED: [],
  INVALIDATED: ["PROPOSED"],
};

function validateGoalTransition(from: string, to: string): void {
  const allowed = GOAL_TRANSITIONS[from];
  if (!allowed?.includes(to)) {
    throw new Error(`Invalid goal state transition: ${from} → ${to}`);
  }
}

function validateHypothesisTransition(from: string, to: string): void {
  const allowed = HYPOTHESIS_TRANSITIONS[from];
  if (!allowed?.includes(to)) {
    throw new Error(`Invalid hypothesis state transition: ${from} → ${to}`);
  }
}

// ── DB Accessor ──

let _db: DatabaseSync | null = null;
function db(): DatabaseSync {
  if (!_db) {
    _db = getEngineDb();
  }
  return _db;
}

// ── Goals ──

export function listGoals(projectId?: string, opts?: { state?: string; limit?: number }): Goal[] {
  const pid = projectId ?? "default";
  const lim = opts?.limit ?? 100;
  if (opts?.state) {
    return db()
      .prepare(
        `SELECT * FROM goals WHERE project_id = ? AND state = ? ORDER BY created_at DESC LIMIT ?`,
      )
      .all(pid, opts.state, lim) as unknown as Goal[];
  }
  return db()
    .prepare(`SELECT * FROM goals WHERE project_id = ? ORDER BY created_at DESC LIMIT ?`)
    .all(pid, lim) as unknown as Goal[];
}

export function createGoal(
  projectId: string | undefined,
  opts: {
    title: string;
    description?: string;
    state?: Goal["state"];
    progress?: number;
    canvas_id?: string;
  },
): Goal {
  const id = randomUUID();
  const now = Date.now();
  const pid = projectId ?? "default";
  db()
    .prepare(
      `INSERT INTO goals (id, project_id, title, description, state, progress, canvas_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      pid,
      opts.title,
      opts.description ?? null,
      opts.state ?? "DRAFT",
      opts.progress ?? 0,
      opts.canvas_id ?? null,
      now,
      now,
    );
  return {
    id,
    project_id: pid,
    title: opts.title,
    description: opts.description ?? null,
    state: opts.state ?? "DRAFT",
    progress: opts.progress ?? 0,
    canvas_id: opts.canvas_id ?? null,
    created_at: now,
    updated_at: now,
  };
}

export function updateGoal(
  goalId: string,
  projectId: string | undefined,
  opts: {
    title?: string;
    description?: string;
    state?: Goal["state"];
    progress?: number;
    canvas_id?: string;
  },
): Goal | null {
  const pid = projectId ?? "default";
  const existing = db()
    .prepare(`SELECT * FROM goals WHERE id = ? AND project_id = ?`)
    .get(goalId, pid) as Goal | undefined;
  if (!existing) {
    return null;
  }
  if (opts.state && opts.state !== existing.state) {
    validateGoalTransition(existing.state, opts.state);
  }
  const now = Date.now();
  db()
    .prepare(
      `UPDATE goals SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        state = COALESCE(?, state),
        progress = COALESCE(?, progress),
        canvas_id = COALESCE(?, canvas_id),
        updated_at = ?
       WHERE id = ? AND project_id = ?`,
    )
    .run(
      opts.title ?? null,
      opts.description ?? null,
      opts.state ?? null,
      opts.progress ?? null,
      opts.canvas_id ?? null,
      now,
      goalId,
      pid,
    );
  return db().prepare(`SELECT * FROM goals WHERE id = ?`).get(goalId) as unknown as Goal;
}

export function deleteGoal(goalId: string, projectId?: string): boolean {
  const pid = projectId ?? "default";
  const result = db().prepare(`DELETE FROM goals WHERE id = ? AND project_id = ?`).run(goalId, pid);
  return result.changes > 0;
}

// ── Hypotheses ──

export function listHypotheses(
  projectId?: string,
  opts?: { goal_id?: string; state?: string; limit?: number },
): Hypothesis[] {
  const pid = projectId ?? "default";
  const lim = opts?.limit ?? 100;
  if (opts?.goal_id) {
    return db()
      .prepare(
        `SELECT * FROM hypotheses WHERE project_id = ? AND goal_id = ? ORDER BY created_at DESC LIMIT ?`,
      )
      .all(pid, opts.goal_id, lim) as unknown as Hypothesis[];
  }
  if (opts?.state) {
    return db()
      .prepare(
        `SELECT * FROM hypotheses WHERE project_id = ? AND state = ? ORDER BY created_at DESC LIMIT ?`,
      )
      .all(pid, opts.state, lim) as unknown as Hypothesis[];
  }
  return db()
    .prepare(`SELECT * FROM hypotheses WHERE project_id = ? ORDER BY created_at DESC LIMIT ?`)
    .all(pid, lim) as unknown as Hypothesis[];
}

export function createHypothesis(
  projectId: string | undefined,
  opts: {
    goal_id?: string;
    title: string;
    description?: string;
    state?: Hypothesis["state"];
    confidence?: number;
  },
): Hypothesis {
  const id = randomUUID();
  const now = Date.now();
  const pid = projectId ?? "default";
  db()
    .prepare(
      `INSERT INTO hypotheses (id, project_id, goal_id, title, description, state, confidence, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      pid,
      opts.goal_id ?? null,
      opts.title,
      opts.description ?? null,
      opts.state ?? "PROPOSED",
      opts.confidence ?? 0.5,
      now,
      now,
    );
  return {
    id,
    project_id: pid,
    goal_id: opts.goal_id ?? null,
    title: opts.title,
    description: opts.description ?? null,
    state: opts.state ?? "PROPOSED",
    confidence: opts.confidence ?? 0.5,
    created_at: now,
    updated_at: now,
  };
}

export function updateHypothesis(
  hypothesisId: string,
  projectId: string | undefined,
  opts: {
    title?: string;
    description?: string;
    state?: Hypothesis["state"];
    confidence?: number;
    goal_id?: string;
  },
): Hypothesis | null {
  const pid = projectId ?? "default";
  const existing = db()
    .prepare(`SELECT * FROM hypotheses WHERE id = ? AND project_id = ?`)
    .get(hypothesisId, pid) as Hypothesis | undefined;
  if (!existing) {
    return null;
  }
  if (opts.state && opts.state !== existing.state) {
    validateHypothesisTransition(existing.state, opts.state);
  }
  const now = Date.now();
  db()
    .prepare(
      `UPDATE hypotheses SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        state = COALESCE(?, state),
        confidence = COALESCE(?, confidence),
        goal_id = COALESCE(?, goal_id),
        updated_at = ?
       WHERE id = ? AND project_id = ?`,
    )
    .run(
      opts.title ?? null,
      opts.description ?? null,
      opts.state ?? null,
      opts.confidence ?? null,
      opts.goal_id ?? null,
      now,
      hypothesisId,
      pid,
    );
  return db()
    .prepare(`SELECT * FROM hypotheses WHERE id = ?`)
    .get(hypothesisId) as unknown as Hypothesis;
}

export function deleteHypothesis(hypothesisId: string, projectId?: string): boolean {
  const pid = projectId ?? "default";
  const result = db()
    .prepare(`DELETE FROM hypotheses WHERE id = ? AND project_id = ?`)
    .run(hypothesisId, pid);
  return result.changes > 0;
}

// ── Evidence ──

export function listEvidence(
  projectId?: string,
  opts?: { hypothesis_id?: string; kind?: string; limit?: number },
): Evidence[] {
  const pid = projectId ?? "default";
  const lim = opts?.limit ?? 100;
  if (opts?.hypothesis_id) {
    return db()
      .prepare(
        `SELECT * FROM evidence WHERE project_id = ? AND hypothesis_id = ? ORDER BY created_at DESC LIMIT ?`,
      )
      .all(pid, opts.hypothesis_id, lim) as unknown as Evidence[];
  }
  if (opts?.kind) {
    return db()
      .prepare(
        `SELECT * FROM evidence WHERE project_id = ? AND kind = ? ORDER BY created_at DESC LIMIT ?`,
      )
      .all(pid, opts.kind, lim) as unknown as Evidence[];
  }
  return db()
    .prepare(`SELECT * FROM evidence WHERE project_id = ? ORDER BY created_at DESC LIMIT ?`)
    .all(pid, lim) as unknown as Evidence[];
}

export function createEvidence(
  projectId: string | undefined,
  opts: {
    hypothesis_id?: string;
    title: string;
    description?: string;
    kind?: Evidence["kind"];
    source?: string;
  },
): Evidence {
  const id = randomUUID();
  const now = Date.now();
  const pid = projectId ?? "default";
  db()
    .prepare(
      `INSERT INTO evidence (id, project_id, hypothesis_id, title, description, kind, source, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      pid,
      opts.hypothesis_id ?? null,
      opts.title,
      opts.description ?? null,
      opts.kind ?? "NEUTRAL",
      opts.source ?? null,
      now,
      now,
    );
  return {
    id,
    project_id: pid,
    hypothesis_id: opts.hypothesis_id ?? null,
    title: opts.title,
    description: opts.description ?? null,
    kind: opts.kind ?? "NEUTRAL",
    source: opts.source ?? null,
    created_at: now,
    updated_at: now,
  };
}

export function updateEvidence(
  evidenceId: string,
  projectId: string | undefined,
  opts: {
    title?: string;
    description?: string;
    kind?: Evidence["kind"];
    source?: string;
    hypothesis_id?: string;
  },
): Evidence | null {
  const pid = projectId ?? "default";
  const existing = db()
    .prepare(`SELECT * FROM evidence WHERE id = ? AND project_id = ?`)
    .get(evidenceId, pid) as Evidence | undefined;
  if (!existing) {
    return null;
  }
  const now = Date.now();
  db()
    .prepare(
      `UPDATE evidence SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        kind = COALESCE(?, kind),
        source = COALESCE(?, source),
        hypothesis_id = COALESCE(?, hypothesis_id),
        updated_at = ?
       WHERE id = ? AND project_id = ?`,
    )
    .run(
      opts.title ?? null,
      opts.description ?? null,
      opts.kind ?? null,
      opts.source ?? null,
      opts.hypothesis_id ?? null,
      now,
      evidenceId,
      pid,
    );
  return db().prepare(`SELECT * FROM evidence WHERE id = ?`).get(evidenceId) as unknown as Evidence;
}

export function deleteEvidence(evidenceId: string, projectId?: string): boolean {
  const pid = projectId ?? "default";
  const result = db()
    .prepare(`DELETE FROM evidence WHERE id = ? AND project_id = ?`)
    .run(evidenceId, pid);
  return result.changes > 0;
}
