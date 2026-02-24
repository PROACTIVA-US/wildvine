/**
 * Pipeline Store — pipeline definitions and run tracking.
 * Backed by engine.db. Replaces CC hub-backend's pipeline/run endpoints.
 * Execution is deferred — this handles tracking and YAML loading only.
 */
import type { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getEngineDb } from "./engine-store.js";

export interface Pipeline {
  name: string;
  version: string | null;
  owner: string | null;
  description: string | null;
  stage_count: number;
  definition: string | null; // JSON
  source_path: string | null;
  created_at: number;
  updated_at: number;
}

export interface PipelineRun {
  id: string;
  pipeline_name: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  params: string | null; // JSON
  stages_run: number;
  stages_succeeded: number;
  stages_failed: number;
  stages_skipped: number;
  summary: string | null;
  started_at: number | null;
  finished_at: number | null;
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

// ── Pipeline Definitions ──

export function listPipelines(opts?: { owner?: string; limit?: number }): Pipeline[] {
  const lim = opts?.limit ?? 100;
  if (opts?.owner) {
    return db()
      .prepare(`SELECT * FROM pipelines WHERE owner = ? ORDER BY name LIMIT ?`)
      .all(opts.owner, lim) as unknown as Pipeline[];
  }
  return db()
    .prepare(`SELECT * FROM pipelines ORDER BY name LIMIT ?`)
    .all(lim) as unknown as Pipeline[];
}

export function getPipeline(name: string): Pipeline | null {
  const row = db().prepare(`SELECT * FROM pipelines WHERE name = ?`).get(name);
  return (row as Pipeline | undefined) ?? null;
}

export function upsertPipeline(opts: {
  name: string;
  version?: string;
  owner?: string;
  description?: string;
  stage_count?: number;
  definition?: unknown;
  source_path?: string;
}): Pipeline {
  const now = Date.now();
  const defStr = opts.definition ? JSON.stringify(opts.definition) : null;
  const existing = getPipeline(opts.name);

  if (existing) {
    db()
      .prepare(
        `UPDATE pipelines SET
          version = COALESCE(?, version),
          owner = COALESCE(?, owner),
          description = COALESCE(?, description),
          stage_count = COALESCE(?, stage_count),
          definition = COALESCE(?, definition),
          source_path = COALESCE(?, source_path),
          updated_at = ?
         WHERE name = ?`,
      )
      .run(
        opts.version ?? null,
        opts.owner ?? null,
        opts.description ?? null,
        opts.stage_count ?? null,
        defStr,
        opts.source_path ?? null,
        now,
        opts.name,
      );
    return getPipeline(opts.name)!;
  }

  db()
    .prepare(
      `INSERT INTO pipelines (name, version, owner, description, stage_count, definition, source_path, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      opts.name,
      opts.version ?? null,
      opts.owner ?? null,
      opts.description ?? null,
      opts.stage_count ?? 0,
      defStr,
      opts.source_path ?? null,
      now,
      now,
    );
  return getPipeline(opts.name)!;
}

export function loadPipelinesFromDir(dirPath: string): {
  loaded: number;
  errors: string[];
} {
  let loaded = 0;
  const errors: string[] = [];

  if (!fs.existsSync(dirPath)) {
    return { loaded: 0, errors: [`Directory not found: ${dirPath}`] };
  }

  const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));

  for (const file of files) {
    try {
      const filePath = path.join(dirPath, file);
      const content = fs.readFileSync(filePath, "utf-8");
      const name = path.basename(file, path.extname(file));

      // Simple YAML parsing for pipeline metadata
      const versionMatch = content.match(/version:\s*['"]?([^'"\n]+)/);
      const ownerMatch = content.match(/owner:\s*['"]?([^'"\n]+)/);
      const descMatch = content.match(/description:\s*['"]?([^'"\n]+)/);
      const stageMatches = content.match(/- name:/g);

      upsertPipeline({
        name,
        version: versionMatch?.[1]?.trim(),
        owner: ownerMatch?.[1]?.trim(),
        description: descMatch?.[1]?.trim(),
        stage_count: stageMatches?.length ?? 0,
        source_path: filePath,
      });
      loaded++;
    } catch (err) {
      errors.push(`Error loading ${file}: ${err}`);
    }
  }

  return { loaded, errors };
}

// ── Pipeline Runs ──

export function createRun(opts: { pipeline_name: string; params?: unknown }): PipelineRun {
  const id = randomUUID();
  const now = Date.now();
  const paramsStr = opts.params ? JSON.stringify(opts.params) : null;
  db()
    .prepare(
      `INSERT INTO pipeline_runs (id, pipeline_name, status, params, stages_run, stages_succeeded, stages_failed, stages_skipped, created_at, updated_at)
       VALUES (?, ?, 'queued', ?, 0, 0, 0, 0, ?, ?)`,
    )
    .run(id, opts.pipeline_name, paramsStr, now, now);
  return {
    id,
    pipeline_name: opts.pipeline_name,
    status: "queued",
    params: paramsStr,
    stages_run: 0,
    stages_succeeded: 0,
    stages_failed: 0,
    stages_skipped: 0,
    summary: null,
    started_at: null,
    finished_at: null,
    created_at: now,
    updated_at: now,
  };
}

export function getRun(runId: string): PipelineRun | null {
  const row = db().prepare(`SELECT * FROM pipeline_runs WHERE id = ?`).get(runId);
  return (row as PipelineRun | undefined) ?? null;
}

export function listRuns(opts?: {
  pipeline_name?: string;
  status?: string;
  limit?: number;
}): PipelineRun[] {
  const lim = opts?.limit ?? 50;
  if (opts?.pipeline_name && opts?.status) {
    return db()
      .prepare(
        `SELECT * FROM pipeline_runs WHERE pipeline_name = ? AND status = ? ORDER BY created_at DESC LIMIT ?`,
      )
      .all(opts.pipeline_name, opts.status, lim) as unknown as PipelineRun[];
  }
  if (opts?.pipeline_name) {
    return db()
      .prepare(
        `SELECT * FROM pipeline_runs WHERE pipeline_name = ? ORDER BY created_at DESC LIMIT ?`,
      )
      .all(opts.pipeline_name, lim) as unknown as PipelineRun[];
  }
  if (opts?.status) {
    return db()
      .prepare(`SELECT * FROM pipeline_runs WHERE status = ? ORDER BY created_at DESC LIMIT ?`)
      .all(opts.status, lim) as unknown as PipelineRun[];
  }
  return db()
    .prepare(`SELECT * FROM pipeline_runs ORDER BY created_at DESC LIMIT ?`)
    .all(lim) as unknown as PipelineRun[];
}

export function updateRun(
  runId: string,
  opts: {
    status?: PipelineRun["status"];
    stages_run?: number;
    stages_succeeded?: number;
    stages_failed?: number;
    stages_skipped?: number;
    summary?: string;
    started_at?: number;
    finished_at?: number;
  },
): PipelineRun | null {
  const now = Date.now();
  const result = db()
    .prepare(
      `UPDATE pipeline_runs SET
        status = COALESCE(?, status),
        stages_run = COALESCE(?, stages_run),
        stages_succeeded = COALESCE(?, stages_succeeded),
        stages_failed = COALESCE(?, stages_failed),
        stages_skipped = COALESCE(?, stages_skipped),
        summary = COALESCE(?, summary),
        started_at = COALESCE(?, started_at),
        finished_at = COALESCE(?, finished_at),
        updated_at = ?
       WHERE id = ?`,
    )
    .run(
      opts.status ?? null,
      opts.stages_run ?? null,
      opts.stages_succeeded ?? null,
      opts.stages_failed ?? null,
      opts.stages_skipped ?? null,
      opts.summary ?? null,
      opts.started_at ?? null,
      opts.finished_at ?? null,
      now,
      runId,
    );
  if (result.changes === 0) {
    return null;
  }
  return getRun(runId);
}
