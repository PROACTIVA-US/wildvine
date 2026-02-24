import type { GatewayRequestHandlers } from "./types.js";
import * as gov from "../governor-store.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";

export const governorHandlers: GatewayRequestHandlers = {
  "cc.governor.pending": async ({ params, respond }) => {
    try {
      const items = gov.listPending(
        params.instance as string | undefined,
        params.limit as number | undefined,
      );
      respond(true, items);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.governor.approve": async ({ params, respond }) => {
    const referralId = params.referral_id as string | undefined;
    if (!referralId) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing referral_id"));
      return;
    }
    try {
      const result = gov.approve(referralId, {
        instance: params.instance as string | undefined,
        comment: params.comment as string | undefined,
      });
      if (!result) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "referral not found or already decided"),
        );
        return;
      }
      respond(true, result);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.governor.deny": async ({ params, respond }) => {
    const referralId = params.referral_id as string | undefined;
    if (!referralId) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing referral_id"));
      return;
    }
    try {
      const result = gov.deny(referralId, {
        instance: params.instance as string | undefined,
        comment: params.comment as string | undefined,
      });
      if (!result) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "referral not found or already decided"),
        );
        return;
      }
      respond(true, result);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.governor.history": async ({ params, respond }) => {
    try {
      const items = gov.history(
        params.instance as string | undefined,
        params.limit as number | undefined,
      );
      respond(true, items);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.governor.create": async ({ params, respond }) => {
    const kind = params.kind as string | undefined;
    const reason = params.reason as string | undefined;
    if (!kind || !reason) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing kind or reason"));
      return;
    }
    try {
      const referral = gov.createReferral({
        instance: params.instance as string | undefined,
        kind,
        reason,
        artifact_ref: params.artifact_ref as string | undefined,
        payload: params.payload,
      });
      respond(true, referral);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },
};
