/**
 * KB Store — FTS5 document index and cross-entity search.
 * Backed by engine.db. Replaces CC hub-backend's KB endpoints.
 * Searches across indexed documents + IDEALZR entities + VISLZR nodes.
 */
import type { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { getEngineDb } from "./engine-store.js";

export interface KbDocument {
  id: string;
  project_id: string;
  entity_type: string;
  entity_id: string | null;
  title: string;
  content: string;
  url: string | null;
  snippet: string | null;
  metadata: string | null;
  indexed_at: number;
}

export interface SearchResult {
  id: string;
  entity_type: string;
  entity_id: string | null;
  title: string;
  snippet: string | null;
  url: string | null;
  score: number;
  project_id: string;
}

let _db: DatabaseSync | null = null;
function db(): DatabaseSync {
  if (!_db) {
    _db = getEngineDb();
  }
  return _db;
}

export function indexDocument(opts: {
  project_id?: string;
  entity_type: string;
  entity_id?: string;
  title: string;
  content: string;
  url?: string;
  snippet?: string;
  metadata?: unknown;
}): KbDocument {
  const id = randomUUID();
  const now = Date.now();
  const pid = opts.project_id ?? "default";
  const metaStr = opts.metadata ? JSON.stringify(opts.metadata) : null;
  // Upsert: if same entity_type + entity_id exists, replace it
  if (opts.entity_id) {
    const existing = db()
      .prepare(
        `SELECT id FROM kb_documents WHERE project_id = ? AND entity_type = ? AND entity_id = ?`,
      )
      .get(pid, opts.entity_type, opts.entity_id) as { id: string } | undefined;
    if (existing) {
      db()
        .prepare(
          `UPDATE kb_documents SET title = ?, content = ?, url = ?, snippet = ?, metadata = ?, indexed_at = ?
           WHERE id = ?`,
        )
        .run(
          opts.title,
          opts.content,
          opts.url ?? null,
          opts.snippet ?? null,
          metaStr,
          now,
          existing.id,
        );
      return {
        id: existing.id,
        project_id: pid,
        entity_type: opts.entity_type,
        entity_id: opts.entity_id,
        title: opts.title,
        content: opts.content,
        url: opts.url ?? null,
        snippet: opts.snippet ?? null,
        metadata: metaStr,
        indexed_at: now,
      };
    }
  }
  db()
    .prepare(
      `INSERT INTO kb_documents (id, project_id, entity_type, entity_id, title, content, url, snippet, metadata, indexed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      pid,
      opts.entity_type,
      opts.entity_id ?? null,
      opts.title,
      opts.content,
      opts.url ?? null,
      opts.snippet ?? null,
      metaStr,
      now,
    );
  return {
    id,
    project_id: pid,
    entity_type: opts.entity_type,
    entity_id: opts.entity_id ?? null,
    title: opts.title,
    content: opts.content,
    url: opts.url ?? null,
    snippet: opts.snippet ?? null,
    metadata: metaStr,
    indexed_at: now,
  };
}

export function search(
  query: string,
  opts?: {
    project_id?: string;
    entity_types?: string[];
    limit?: number;
  },
): SearchResult[] {
  const pid = opts?.project_id ?? "default";
  const lim = opts?.limit ?? 20;
  const results: SearchResult[] = [];

  // 1. FTS5 search on indexed documents
  const ftsQuery = query.replace(/[^\w\s]/g, " ").trim();
  if (ftsQuery) {
    let docSql = `
      SELECT d.id, d.entity_type, d.entity_id, d.title, d.snippet, d.url, d.project_id,
             rank * -1.0 AS score
      FROM kb_fts f
      JOIN kb_documents d ON d.rowid = f.rowid
      WHERE kb_fts MATCH ? AND d.project_id = ?`;
    const binds: unknown[] = [ftsQuery, pid];

    if (opts?.entity_types?.length) {
      const placeholders = opts.entity_types.map(() => "?").join(",");
      docSql += ` AND d.entity_type IN (${placeholders})`;
      binds.push(...opts.entity_types);
    }
    docSql += ` ORDER BY rank LIMIT ?`;
    binds.push(lim);

    const rows = db()
      .prepare(docSql)
      .all(...binds) as unknown as SearchResult[];
    results.push(...rows);
  }

  // 2. Cross-search IDEALZR entities (goals, hypotheses, evidence)
  if (!opts?.entity_types?.length || opts.entity_types.includes("goal")) {
    const likeQ = `%${query}%`;
    const goals = db()
      .prepare(
        `SELECT id, 'goal' AS entity_type, id AS entity_id, title, description AS snippet, NULL AS url, project_id, 0.5 AS score
         FROM goals WHERE project_id = ? AND (title LIKE ? OR description LIKE ?)
         LIMIT ?`,
      )
      .all(pid, likeQ, likeQ, lim) as unknown as SearchResult[];
    results.push(...goals);
  }

  if (!opts?.entity_types?.length || opts.entity_types.includes("hypothesis")) {
    const likeQ = `%${query}%`;
    const hyps = db()
      .prepare(
        `SELECT id, 'hypothesis' AS entity_type, id AS entity_id, title, description AS snippet, NULL AS url, project_id, 0.5 AS score
         FROM hypotheses WHERE project_id = ? AND (title LIKE ? OR description LIKE ?)
         LIMIT ?`,
      )
      .all(pid, likeQ, likeQ, lim) as unknown as SearchResult[];
    results.push(...hyps);
  }

  if (!opts?.entity_types?.length || opts.entity_types.includes("evidence")) {
    const likeQ = `%${query}%`;
    const evs = db()
      .prepare(
        `SELECT id, 'evidence' AS entity_type, id AS entity_id, title, description AS snippet, NULL AS url, project_id, 0.5 AS score
         FROM evidence WHERE project_id = ? AND (title LIKE ? OR description LIKE ?)
         LIMIT ?`,
      )
      .all(pid, likeQ, likeQ, lim) as unknown as SearchResult[];
    results.push(...evs);
  }

  // VISLZR nodes live in their own DB — they're included if indexed into kb_documents

  // Sort by score descending, deduplicate, and limit
  results.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const deduped: SearchResult[] = [];
  for (const r of results) {
    const key = `${r.entity_type}:${r.entity_id ?? r.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(r);
    }
    if (deduped.length >= lim) {
      break;
    }
  }
  return deduped;
}

export function clearIndex(projectId?: string): { deleted: number } {
  const pid = projectId ?? "default";
  const result = db().prepare(`DELETE FROM kb_documents WHERE project_id = ?`).run(pid);
  return { deleted: result.changes };
}

export function getIndexStatus(projectId?: string): {
  project_id: string;
  document_count: number;
  entity_types: Record<string, number>;
} {
  const pid = projectId ?? "default";
  const total = db()
    .prepare(`SELECT COUNT(*) AS cnt FROM kb_documents WHERE project_id = ?`)
    .get(pid) as { cnt: number };
  const types = db()
    .prepare(
      `SELECT entity_type, COUNT(*) AS cnt FROM kb_documents WHERE project_id = ? GROUP BY entity_type`,
    )
    .all(pid) as unknown as { entity_type: string; cnt: number }[];
  const entityTypes: Record<string, number> = {};
  for (const t of types) {
    entityTypes[t.entity_type] = t.cnt;
  }
  return {
    project_id: pid,
    document_count: total.cnt,
    entity_types: entityTypes,
  };
}
