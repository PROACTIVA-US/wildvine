import type { GatewayBrowserClient } from "../gateway.js";
import type { VislzrProject } from "../storage.js";

export interface KbSearchResult {
  id: string;
  entity_type: string;
  title: string;
  snippet: string | null;
  score: number;
}

export interface KbIndexStatus {
  project_id: string;
  indexed_count: number;
  last_indexed_at: string | null;
  entity_counts: Record<string, number>;
}

export interface VislzrState {
  client: GatewayBrowserClient | null;
  connected: boolean;
  vislzrLoading: boolean;
  vislzrError: string | null;
  vislzrCanvases: {
    id: string;
    name: string;
    description: string | null;
    node_count: number;
    edge_count: number;
  }[];
  vislzrSelectedCanvasId: string | null;
  vislzrCanvasNodes: {
    id: string;
    node_type: string;
    label: string;
    position_x: number;
    position_y: number;
    data: Record<string, unknown> | null;
  }[];
  vislzrCanvasEdges: {
    id: string;
    source_node_id: string;
    target_node_id: string;
    edge_type: string;
    label: string | null;
  }[];
  // KB integration
  vislzrKbQuery: string;
  vislzrKbResults: KbSearchResult[];
  vislzrKbSearchLoading: boolean;
  vislzrKbError: string | null;
  vislzrKbIndexStatus: KbIndexStatus | null;
  vislzrKbIndexing: boolean;
  // Project isolation
  vislzrActiveProjectId: string;
  vislzrProjects: VislzrProject[];
  vislzrProjectManageOpen: boolean;
  vislzrAddProjectName: string;
  vislzrAddProjectPath: string;
}

function getProjectId(state: VislzrState): string {
  return state.vislzrActiveProjectId || "default";
}

export async function loadVislzrCanvases(state: VislzrState): Promise<void> {
  if (!state.client || !state.connected) {
    return;
  }
  state.vislzrLoading = true;
  state.vislzrError = null;
  try {
    const res = await state.client.request("cc.vislzr.canvases", {
      project_id: getProjectId(state),
    });
    state.vislzrCanvases =
      (res as {
        id: string;
        name: string;
        description: string | null;
        node_count: number;
        edge_count: number;
      }[]) ?? [];
  } catch (err) {
    state.vislzrError = err instanceof Error ? err.message : "Failed to load canvases";
  } finally {
    state.vislzrLoading = false;
  }
}

export async function loadVislzrCanvas(state: VislzrState, canvasId: string): Promise<void> {
  if (!state.client || !state.connected) {
    return;
  }
  state.vislzrSelectedCanvasId = canvasId;
  try {
    const res: {
      canvas: unknown;
      nodes: {
        id: string;
        node_type: string;
        label: string;
        position_x: number;
        position_y: number;
        data: Record<string, unknown> | null;
      }[];
      edges: {
        id: string;
        source_node_id: string;
        target_node_id: string;
        edge_type: string;
        label: string | null;
      }[];
    } = await state.client.request("cc.vislzr.canvas", {
      canvas_id: canvasId,
      project_id: getProjectId(state),
    });
    state.vislzrCanvasNodes = res.nodes ?? [];
    state.vislzrCanvasEdges = res.edges ?? [];
  } catch (err) {
    state.vislzrError = err instanceof Error ? err.message : "Failed to load canvas";
  }
}

export async function createVislzrCanvas(state: VislzrState, name: string): Promise<void> {
  if (!state.client || !state.connected) {
    return;
  }
  try {
    await state.client.request("cc.vislzr.canvas.create", {
      name,
      project_id: getProjectId(state),
    });
    await loadVislzrCanvases(state);
  } catch (err) {
    state.vislzrError = err instanceof Error ? err.message : "Failed to create canvas";
  }
}

export async function createVislzrNode(
  state: VislzrState,
  canvasId: string,
  opts: {
    node_type: string;
    label: string;
    position_x?: number;
    position_y?: number;
    linked_entity_type?: string;
    linked_entity_id?: string;
    data?: Record<string, unknown>;
  },
): Promise<void> {
  if (!state.client || !state.connected) {
    return;
  }
  try {
    await state.client.request("cc.vislzr.node.create", {
      canvas_id: canvasId,
      project_id: getProjectId(state),
      ...opts,
    });
    await loadVislzrCanvas(state, canvasId);
  } catch (err) {
    state.vislzrError = err instanceof Error ? err.message : "Failed to create node";
  }
}

export async function updateVislzrNodePosition(
  state: VislzrState,
  canvasId: string,
  nodeId: string,
  x: number,
  y: number,
): Promise<void> {
  if (!state.client || !state.connected) {
    return;
  }
  try {
    await state.client.request("cc.vislzr.node.update", {
      canvas_id: canvasId,
      node_id: nodeId,
      project_id: getProjectId(state),
      position_x: Math.round(x),
      position_y: Math.round(y),
    });
  } catch {
    // Silent — position updates are best-effort
  }
}

// ── KB Integration ──────────────────────────────────────────

export async function searchVislzrKb(state: VislzrState): Promise<void> {
  if (!state.client || !state.connected || !state.vislzrKbQuery.trim()) {
    return;
  }
  state.vislzrKbSearchLoading = true;
  state.vislzrKbError = null;
  try {
    const res = await state.client.request<{ results: KbSearchResult[] }>("cc.kb.search", {
      query: state.vislzrKbQuery.trim(),
      project_id: getProjectId(state),
      limit: 20,
    });
    state.vislzrKbResults = res?.results ?? [];
  } catch (err) {
    state.vislzrKbError = err instanceof Error ? err.message : "KB search failed";
    state.vislzrKbResults = [];
  } finally {
    state.vislzrKbSearchLoading = false;
  }
}

export async function loadVislzrKbIndexStatus(state: VislzrState): Promise<void> {
  if (!state.client || !state.connected) {
    return;
  }
  try {
    const res = await state.client.request<KbIndexStatus>("cc.kb.index.status", {
      project_id: getProjectId(state),
    });
    state.vislzrKbIndexStatus = res ?? null;
  } catch {
    state.vislzrKbIndexStatus = null;
  }
}

export async function addKbResultToCanvas(
  state: VislzrState,
  canvasId: string,
  result: KbSearchResult,
): Promise<void> {
  const nodeCount = state.vislzrCanvasNodes.length;
  const posX = 100 + (nodeCount % 5) * 180;
  const posY = 100 + Math.floor(nodeCount / 5) * 120;
  await createVislzrNode(state, canvasId, {
    node_type: result.entity_type || "document",
    label: result.title,
    position_x: posX,
    position_y: posY,
    linked_entity_type: result.entity_type,
    linked_entity_id: result.id,
    data: { snippet: result.snippet, score: result.score, source: "kb" },
  });
}

export async function indexVislzrProject(state: VislzrState, projectId: string): Promise<void> {
  if (!state.client || !state.connected) {
    return;
  }
  const project = state.vislzrProjects.find((p) => p.id === projectId);
  if (!project?.path) {
    state.vislzrKbError = "No path configured for this project";
    return;
  }
  state.vislzrKbIndexing = true;
  state.vislzrKbError = null;
  try {
    await state.client.request("cc.kb.index", {
      project_id: projectId,
      path: project.path,
    });
    await loadVislzrKbIndexStatus(state);
  } catch (err) {
    state.vislzrKbError = err instanceof Error ? err.message : "Indexing failed";
  } finally {
    state.vislzrKbIndexing = false;
  }
}

// ── Project Management ──────────────────────────────────────

export function switchVislzrProject(state: VislzrState, projectId: string): void {
  state.vislzrActiveProjectId = projectId;
  state.vislzrSelectedCanvasId = null;
  state.vislzrCanvasNodes = [];
  state.vislzrCanvasEdges = [];
  state.vislzrKbResults = [];
  state.vislzrKbIndexStatus = null;
  void loadVislzrCanvases(state);
  void loadVislzrKbIndexStatus(state);
}

export function addVislzrProject(state: VislzrState, name: string, dirPath: string): void {
  const id = name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  if (state.vislzrProjects.some((p) => p.id === id)) {
    return;
  }
  state.vislzrProjects = [...state.vislzrProjects, { id, name, path: dirPath }];
  state.vislzrAddProjectName = "";
  state.vislzrAddProjectPath = "";
}

export async function removeVislzrProject(state: VislzrState, projectId: string): Promise<void> {
  if (projectId === "default") {
    return;
  }
  // Try to clear the index
  if (state.client && state.connected) {
    try {
      await state.client.request("cc.kb.index.clear", { project_id: projectId });
    } catch {
      // Non-fatal
    }
  }
  state.vislzrProjects = state.vislzrProjects.filter((p) => p.id !== projectId);
  if (state.vislzrActiveProjectId === projectId) {
    switchVislzrProject(state, "default");
  }
}
