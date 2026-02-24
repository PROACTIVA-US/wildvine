import type { GatewayRequestHandlers } from "./types.js";
import * as kb from "../kb-store.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";

export const kbHandlers: GatewayRequestHandlers = {
  "cc.kb.search": async ({ params, respond }) => {
    const query = params.query as string | undefined;
    if (!query) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing query"));
      return;
    }
    try {
      const results = kb.search(query, {
        project_id: params.project_id as string | undefined,
        entity_types: params.entity_types as string[] | undefined,
        limit: params.limit as number | undefined,
      });
      respond(true, { query, results, count: results.length });
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.kb.index": async ({ params, respond }) => {
    const title = params.title as string | undefined;
    const content = params.content as string | undefined;
    const entityType = params.entity_type as string | undefined;
    if (!title || !content || !entityType) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "missing title, content, or entity_type"),
      );
      return;
    }
    try {
      const doc = kb.indexDocument({
        project_id: params.project_id as string | undefined,
        entity_type: entityType,
        entity_id: params.entity_id as string | undefined,
        title,
        content,
        url: params.url as string | undefined,
        snippet: params.snippet as string | undefined,
        metadata: params.metadata,
      });
      respond(true, doc);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.kb.index.status": async ({ params, respond }) => {
    try {
      const status = kb.getIndexStatus(params.project_id as string | undefined);
      respond(true, status);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.kb.index.clear": async ({ params, respond }) => {
    try {
      const result = kb.clearIndex(params.project_id as string | undefined);
      respond(true, result);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.knowledge.capture": async ({ params, respond }) => {
    const title = params.title as string | undefined;
    const content = params.content as string | undefined;
    if (!title || !content) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing title or content"));
      return;
    }
    try {
      const doc = kb.indexDocument({
        project_id: params.project_id as string | undefined,
        entity_type: (params.entity_type as string) ?? "knowledge",
        entity_id: params.entity_id as string | undefined,
        title,
        content,
        url: params.url as string | undefined,
        snippet: (params.snippet as string) ?? content.slice(0, 200),
        metadata: params.metadata,
      });
      respond(true, { status: "captured", document: doc });
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },
};
