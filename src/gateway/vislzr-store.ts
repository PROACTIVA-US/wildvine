import type { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { requireNodeSqlite } from "../memory/sqlite.js";

const DB_PATH = path.join(
  process.env.HOME ?? process.env.USERPROFILE ?? ".",
  ".wildvine",
  "vislzr.db",
);

let _db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (_db) {
    return _db;
  }
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const { DatabaseSync } = requireNodeSqlite();
  const db = new DatabaseSync(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS canvases (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY,
      canvas_id TEXT NOT NULL,
      node_type TEXT NOT NULL,
      label TEXT NOT NULL,
      position_x REAL NOT NULL DEFAULT 0,
      position_y REAL NOT NULL DEFAULT 0,
      data TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (canvas_id) REFERENCES canvases(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS edges (
      id TEXT PRIMARY KEY,
      canvas_id TEXT NOT NULL,
      source_node_id TEXT NOT NULL,
      target_node_id TEXT NOT NULL,
      edge_type TEXT NOT NULL,
      label TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (canvas_id) REFERENCES canvases(id) ON DELETE CASCADE,
      FOREIGN KEY (source_node_id) REFERENCES nodes(id) ON DELETE CASCADE,
      FOREIGN KEY (target_node_id) REFERENCES nodes(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_canvases_project ON canvases(project_id);
    CREATE INDEX IF NOT EXISTS idx_nodes_canvas ON nodes(canvas_id);
    CREATE INDEX IF NOT EXISTS idx_edges_canvas ON edges(canvas_id);
  `);
  _db = db;
  return db;
}

export interface CanvasSummary {
  id: string;
  name: string;
  description: string | null;
  node_count: number;
  edge_count: number;
}

export interface CanvasRow {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  created_at: number;
  updated_at: number;
}

export interface NodeRow {
  id: string;
  canvas_id: string;
  node_type: string;
  label: string;
  position_x: number;
  position_y: number;
  data: string | null;
  created_at: number;
}

export interface EdgeRow {
  id: string;
  canvas_id: string;
  source_node_id: string;
  target_node_id: string;
  edge_type: string;
  label: string | null;
  created_at: number;
}

export function listCanvases(projectId: string): CanvasSummary[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT
      c.id, c.name, c.description,
      (SELECT COUNT(*) FROM nodes n WHERE n.canvas_id = c.id) AS node_count,
      (SELECT COUNT(*) FROM edges e WHERE e.canvas_id = c.id) AS edge_count
    FROM canvases c
    WHERE c.project_id = ?
    ORDER BY c.updated_at DESC
  `);
  return stmt.all(projectId) as unknown as CanvasSummary[];
}

export function getCanvas(
  canvasId: string,
  projectId: string,
): { canvas: CanvasRow; nodes: NodeRow[]; edges: EdgeRow[] } | null {
  const db = getDb();
  const canvasStmt = db.prepare(`SELECT * FROM canvases WHERE id = ? AND project_id = ?`);
  const canvas = canvasStmt.get(canvasId, projectId) as CanvasRow | undefined;
  if (!canvas) {
    return null;
  }
  const nodesStmt = db.prepare(`SELECT * FROM nodes WHERE canvas_id = ? ORDER BY created_at ASC`);
  const edgesStmt = db.prepare(`SELECT * FROM edges WHERE canvas_id = ? ORDER BY created_at ASC`);
  return {
    canvas,
    nodes: nodesStmt.all(canvasId) as unknown as NodeRow[],
    edges: edgesStmt.all(canvasId) as unknown as EdgeRow[],
  };
}

export function createCanvas(name: string, projectId: string): CanvasRow {
  const db = getDb();
  const id = randomUUID();
  const now = Date.now();
  const stmt = db.prepare(
    `INSERT INTO canvases (id, project_id, name, description, created_at, updated_at) VALUES (?, ?, ?, NULL, ?, ?)`,
  );
  stmt.run(id, projectId, name, now, now);
  return { id, project_id: projectId, name, description: null, created_at: now, updated_at: now };
}

export function createNode(
  canvasId: string,
  projectId: string,
  opts: {
    node_type: string;
    label: string;
    position_x?: number;
    position_y?: number;
    data?: Record<string, unknown>;
  },
): NodeRow {
  const db = getDb();
  // Verify canvas exists and belongs to project
  const canvasCheck = db.prepare(`SELECT id FROM canvases WHERE id = ? AND project_id = ?`);
  if (!canvasCheck.get(canvasId, projectId)) {
    throw new Error("Canvas not found");
  }
  const id = randomUUID();
  const now = Date.now();
  const posX = opts.position_x ?? 0;
  const posY = opts.position_y ?? 0;
  const dataStr = opts.data ? JSON.stringify(opts.data) : null;
  const stmt = db.prepare(
    `INSERT INTO nodes (id, canvas_id, node_type, label, position_x, position_y, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  stmt.run(id, canvasId, opts.node_type, opts.label, posX, posY, dataStr, now);
  // Update canvas updated_at
  db.prepare(`UPDATE canvases SET updated_at = ? WHERE id = ?`).run(now, canvasId);
  return {
    id,
    canvas_id: canvasId,
    node_type: opts.node_type,
    label: opts.label,
    position_x: posX,
    position_y: posY,
    data: dataStr,
    created_at: now,
  };
}

export function updateNodePosition(
  canvasId: string,
  nodeId: string,
  projectId: string,
  x: number,
  y: number,
): boolean {
  const db = getDb();
  // Verify canvas belongs to project
  const canvasCheck = db.prepare(`SELECT id FROM canvases WHERE id = ? AND project_id = ?`);
  if (!canvasCheck.get(canvasId, projectId)) {
    return false;
  }
  const stmt = db.prepare(
    `UPDATE nodes SET position_x = ?, position_y = ? WHERE id = ? AND canvas_id = ?`,
  );
  const result = stmt.run(x, y, nodeId, canvasId);
  if (result.changes > 0) {
    db.prepare(`UPDATE canvases SET updated_at = ? WHERE id = ?`).run(Date.now(), canvasId);
    return true;
  }
  return false;
}

export function createEdge(
  canvasId: string,
  projectId: string,
  opts: { source_node_id: string; target_node_id: string; edge_type: string; label?: string },
): EdgeRow {
  const db = getDb();
  // Verify canvas exists and belongs to project
  const canvasCheck = db.prepare(`SELECT id FROM canvases WHERE id = ? AND project_id = ?`);
  if (!canvasCheck.get(canvasId, projectId)) {
    throw new Error("Canvas not found");
  }
  const id = randomUUID();
  const now = Date.now();
  const stmt = db.prepare(
    `INSERT INTO edges (id, canvas_id, source_node_id, target_node_id, edge_type, label, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  stmt.run(
    id,
    canvasId,
    opts.source_node_id,
    opts.target_node_id,
    opts.edge_type,
    opts.label ?? null,
    now,
  );
  db.prepare(`UPDATE canvases SET updated_at = ? WHERE id = ?`).run(now, canvasId);
  return {
    id,
    canvas_id: canvasId,
    source_node_id: opts.source_node_id,
    target_node_id: opts.target_node_id,
    edge_type: opts.edge_type,
    label: opts.label ?? null,
    created_at: now,
  };
}

export function deleteCanvas(canvasId: string, projectId: string): boolean {
  const db = getDb();
  // Delete edges and nodes first (in case FK not enforced)
  db.prepare(`DELETE FROM edges WHERE canvas_id = ?`).run(canvasId);
  db.prepare(`DELETE FROM nodes WHERE canvas_id = ?`).run(canvasId);
  const result = db
    .prepare(`DELETE FROM canvases WHERE id = ? AND project_id = ?`)
    .run(canvasId, projectId);
  return result.changes > 0;
}

export function deleteNode(canvasId: string, nodeId: string, projectId: string): boolean {
  const db = getDb();
  // Verify canvas belongs to project
  const canvasCheck = db.prepare(`SELECT id FROM canvases WHERE id = ? AND project_id = ?`);
  if (!canvasCheck.get(canvasId, projectId)) {
    return false;
  }
  // Delete edges referencing this node
  db.prepare(
    `DELETE FROM edges WHERE canvas_id = ? AND (source_node_id = ? OR target_node_id = ?)`,
  ).run(canvasId, nodeId, nodeId);
  const result = db
    .prepare(`DELETE FROM nodes WHERE id = ? AND canvas_id = ?`)
    .run(nodeId, canvasId);
  if (result.changes > 0) {
    db.prepare(`UPDATE canvases SET updated_at = ? WHERE id = ?`).run(Date.now(), canvasId);
    return true;
  }
  return false;
}

export function deleteEdge(canvasId: string, edgeId: string, projectId: string): boolean {
  const db = getDb();
  // Verify canvas belongs to project
  const canvasCheck = db.prepare(`SELECT id FROM canvases WHERE id = ? AND project_id = ?`);
  if (!canvasCheck.get(canvasId, projectId)) {
    return false;
  }
  const result = db
    .prepare(`DELETE FROM edges WHERE id = ? AND canvas_id = ?`)
    .run(edgeId, canvasId);
  if (result.changes > 0) {
    db.prepare(`UPDATE canvases SET updated_at = ? WHERE id = ?`).run(Date.now(), canvasId);
    return true;
  }
  return false;
}
