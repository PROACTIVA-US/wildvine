import type { GatewayRequestHandlers } from "./types.js";
import * as inbox from "../inbox-store.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";

export const inboxHandlers: GatewayRequestHandlers = {
  "cc.inbox.list": async ({ params, respond }) => {
    try {
      const items = inbox.listItems(params.instance as string | undefined, {
        unread_only: params.unread_only as boolean | undefined,
        unacked_only: params.unacked_only as boolean | undefined,
        limit: params.limit as number | undefined,
        status: params.status as string | undefined,
      });
      respond(true, items);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.inbox.ack": async ({ params, respond }) => {
    const itemId = params.item_id as string | undefined;
    if (!itemId) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing item_id"));
      return;
    }
    try {
      const result = inbox.ackItem(itemId, {
        note: params.note as string | undefined,
      });
      if (!result) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "item not found"));
        return;
      }
      respond(true, result);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.inbox.counts": async ({ params, respond }) => {
    try {
      const result = inbox.counts(params.instance as string | undefined);
      respond(true, result);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.inbox.create": async ({ params, respond }) => {
    const subject = params.subject as string | undefined;
    if (!subject) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing subject"));
      return;
    }
    try {
      const item = inbox.createItem({
        instance: params.instance as string | undefined,
        agent_id: params.agent_id as string | undefined,
        priority: params.priority as "RED" | "YELLOW" | "GREEN" | undefined,
        subject,
        body: params.body as string | undefined,
        attachments: params.attachments as unknown[] | undefined,
        source: params.source as string | undefined,
      });
      respond(true, item);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },
};
