import type { GatewayRequestHandlers } from "./types.js";
import * as notesStore from "../notes-store.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";

export const notesHandlers: GatewayRequestHandlers = {
  "notes.capture": async ({ params, respond }) => {
    const subject = params.subject as string | undefined;
    if (!subject) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing subject"));
      return;
    }
    try {
      const note = notesStore.createNote({
        subject,
        body: params.body as string | undefined,
        priority: params.priority as "RED" | "YELLOW" | "GREEN" | undefined,
        source: params.source as string | undefined,
      });
      respond(true, note);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "notes.list": async ({ params, respond }) => {
    try {
      const notes = notesStore.listNotes({
        status: params.status as string | undefined,
        priority: params.priority as string | undefined,
        limit: params.limit as number | undefined,
      });
      respond(true, notes);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "notes.dismiss": async ({ params, respond }) => {
    const itemId = params.item_id as string | undefined;
    if (!itemId) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing item_id"));
      return;
    }
    try {
      const note = notesStore.dismissNote(itemId);
      if (!note) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "note not found"));
        return;
      }
      respond(true, note);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "notes.complete": async ({ params, respond }) => {
    const itemId = params.item_id as string | undefined;
    if (!itemId) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing item_id"));
      return;
    }
    try {
      const note = notesStore.completeNote(itemId);
      if (!note) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "note not found"));
        return;
      }
      respond(true, note);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "notes.search": async ({ params, respond }) => {
    const query = params.query as string | undefined;
    if (!query) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing query"));
      return;
    }
    try {
      const notes = notesStore.searchNotes(query, params.limit as number | undefined);
      respond(true, notes);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },
};
