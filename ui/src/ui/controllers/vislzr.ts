import type { GatewayBrowserClient } from "../gateway.js";

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
}

export async function loadVislzrCanvases(state: VislzrState): Promise<void> {
  if (!state.client || !state.connected) {
    return;
  }
  state.vislzrLoading = true;
  state.vislzrError = null;
  try {
    const res = await state.client.request("cc.vislzr.canvases", { project_id: "default" });
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
      project_id: "default",
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
    await state.client.request("cc.vislzr.canvas.create", { name, project_id: "default" });
    await loadVislzrCanvases(state);
  } catch (err) {
    state.vislzrError = err instanceof Error ? err.message : "Failed to create canvas";
  }
}

export async function createVislzrNode(
  state: VislzrState,
  canvasId: string,
  opts: { node_type: string; label: string; position_x?: number; position_y?: number },
): Promise<void> {
  if (!state.client || !state.connected) {
    return;
  }
  try {
    await state.client.request("cc.vislzr.node.create", {
      canvas_id: canvasId,
      project_id: "default",
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
      project_id: "default",
      position_x: Math.round(x),
      position_y: Math.round(y),
    });
  } catch {
    // Silent — position updates are best-effort
  }
}
