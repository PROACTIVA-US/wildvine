import type { GatewayRequestHandlers } from "./types.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";
import * as store from "../vislzr-store.js";

export const vislzrHandlers: GatewayRequestHandlers = {
  "cc.vislzr.canvases": async ({ params, respond }) => {
    const projectId = params.project_id as string | undefined;
    if (!projectId) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing project_id"));
      return;
    }
    try {
      const canvases = store.listCanvases(projectId);
      respond(true, canvases);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.vislzr.canvas": async ({ params, respond }) => {
    const canvasId = params.canvas_id as string | undefined;
    const projectId = params.project_id as string | undefined;
    if (!canvasId || !projectId) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "missing canvas_id or project_id"),
      );
      return;
    }
    try {
      const result = store.getCanvas(canvasId, projectId);
      if (!result) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "canvas not found"));
        return;
      }
      respond(true, result);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.vislzr.canvas.create": async ({ params, respond }) => {
    const name = params.name as string | undefined;
    const projectId = params.project_id as string | undefined;
    if (!name || !projectId) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "missing name or project_id"),
      );
      return;
    }
    try {
      const canvas = store.createCanvas(name, projectId);
      respond(true, canvas);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.vislzr.canvas.delete": async ({ params, respond }) => {
    const canvasId = params.canvas_id as string | undefined;
    const projectId = params.project_id as string | undefined;
    if (!canvasId || !projectId) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "missing canvas_id or project_id"),
      );
      return;
    }
    try {
      const deleted = store.deleteCanvas(canvasId, projectId);
      respond(true, { deleted });
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.vislzr.node.create": async ({ params, respond }) => {
    const canvasId = params.canvas_id as string | undefined;
    const projectId = params.project_id as string | undefined;
    const nodeType = params.node_type as string | undefined;
    const label = params.label as string | undefined;
    if (!canvasId || !projectId || !nodeType || !label) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          "missing canvas_id, project_id, node_type, or label",
        ),
      );
      return;
    }
    try {
      const node = store.createNode(canvasId, projectId, {
        node_type: nodeType,
        label,
        position_x: params.position_x as number | undefined,
        position_y: params.position_y as number | undefined,
        linked_entity_type: params.linked_entity_type as string | undefined,
        linked_entity_id: params.linked_entity_id as string | undefined,
      });
      respond(true, node);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.vislzr.node.update": async ({ params, respond }) => {
    const canvasId = params.canvas_id as string | undefined;
    const nodeId = params.node_id as string | undefined;
    const projectId = params.project_id as string | undefined;
    const posX = params.position_x as number | undefined;
    const posY = params.position_y as number | undefined;
    if (!canvasId || !nodeId || !projectId || posX == null || posY == null) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          "missing canvas_id, node_id, project_id, position_x, or position_y",
        ),
      );
      return;
    }
    try {
      const updated = store.updateNodePosition(canvasId, nodeId, projectId, posX, posY);
      respond(true, { updated });
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.vislzr.node.delete": async ({ params, respond }) => {
    const canvasId = params.canvas_id as string | undefined;
    const nodeId = params.node_id as string | undefined;
    const projectId = params.project_id as string | undefined;
    if (!canvasId || !nodeId || !projectId) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "missing canvas_id, node_id, or project_id"),
      );
      return;
    }
    try {
      const deleted = store.deleteNode(canvasId, nodeId, projectId);
      respond(true, { deleted });
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.vislzr.edge.create": async ({ params, respond }) => {
    const canvasId = params.canvas_id as string | undefined;
    const projectId = params.project_id as string | undefined;
    const sourceNodeId = params.source_node_id as string | undefined;
    const targetNodeId = params.target_node_id as string | undefined;
    const edgeType = params.edge_type as string | undefined;
    if (!canvasId || !projectId || !sourceNodeId || !targetNodeId || !edgeType) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          "missing canvas_id, project_id, source_node_id, target_node_id, or edge_type",
        ),
      );
      return;
    }
    try {
      const edge = store.createEdge(canvasId, projectId, {
        source_node_id: sourceNodeId,
        target_node_id: targetNodeId,
        edge_type: edgeType,
        label: params.label as string | undefined,
      });
      respond(true, edge);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.vislzr.edge.delete": async ({ params, respond }) => {
    const canvasId = params.canvas_id as string | undefined;
    const edgeId = params.edge_id as string | undefined;
    const projectId = params.project_id as string | undefined;
    if (!canvasId || !edgeId || !projectId) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "missing canvas_id, edge_id, or project_id"),
      );
      return;
    }
    try {
      const deleted = store.deleteEdge(canvasId, edgeId, projectId);
      respond(true, { deleted });
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },
};
