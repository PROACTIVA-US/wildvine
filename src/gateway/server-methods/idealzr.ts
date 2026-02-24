import type { GatewayRequestHandlers } from "./types.js";
import * as idealzr from "../idealzr-store.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";

export const idealzrHandlers: GatewayRequestHandlers = {
  // ── Goals ──
  "cc.idealzr.goals.list": async ({ params, respond }) => {
    try {
      const goals = idealzr.listGoals(params.project_id as string | undefined, {
        state: params.state as string | undefined,
        limit: params.limit as number | undefined,
      });
      respond(true, goals);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.idealzr.goals.create": async ({ params, respond }) => {
    const title = params.title as string | undefined;
    if (!title) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing title"));
      return;
    }
    try {
      const goal = idealzr.createGoal(params.project_id as string | undefined, {
        title,
        description: params.description as string | undefined,
        state: params.state as idealzr.Goal["state"] | undefined,
        progress: params.progress as number | undefined,
        canvas_id: params.canvas_id as string | undefined,
      });
      respond(true, goal);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.idealzr.goals.update": async ({ params, respond }) => {
    const goalId = params.goal_id as string | undefined;
    if (!goalId) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing goal_id"));
      return;
    }
    try {
      const goal = idealzr.updateGoal(goalId, params.project_id as string | undefined, {
        title: params.title as string | undefined,
        description: params.description as string | undefined,
        state: params.state as idealzr.Goal["state"] | undefined,
        progress: params.progress as number | undefined,
        canvas_id: params.canvas_id as string | undefined,
      });
      if (!goal) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "goal not found"));
        return;
      }
      respond(true, goal);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.idealzr.goals.delete": async ({ params, respond }) => {
    const goalId = params.goal_id as string | undefined;
    if (!goalId) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing goal_id"));
      return;
    }
    try {
      const deleted = idealzr.deleteGoal(goalId, params.project_id as string | undefined);
      respond(true, { deleted });
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  // ── Hypotheses ──
  "cc.idealzr.hypotheses.list": async ({ params, respond }) => {
    try {
      const items = idealzr.listHypotheses(params.project_id as string | undefined, {
        goal_id: params.goal_id as string | undefined,
        state: params.state as string | undefined,
        limit: params.limit as number | undefined,
      });
      respond(true, items);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.idealzr.hypotheses.create": async ({ params, respond }) => {
    const title = params.title as string | undefined;
    if (!title) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing title"));
      return;
    }
    try {
      const hypothesis = idealzr.createHypothesis(params.project_id as string | undefined, {
        goal_id: params.goal_id as string | undefined,
        title,
        description: params.description as string | undefined,
        state: params.state as idealzr.Hypothesis["state"] | undefined,
        confidence: params.confidence as number | undefined,
      });
      respond(true, hypothesis);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.idealzr.hypotheses.update": async ({ params, respond }) => {
    const hypothesisId = params.hypothesis_id as string | undefined;
    if (!hypothesisId) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing hypothesis_id"));
      return;
    }
    try {
      const hypothesis = idealzr.updateHypothesis(
        hypothesisId,
        params.project_id as string | undefined,
        {
          title: params.title as string | undefined,
          description: params.description as string | undefined,
          state: params.state as idealzr.Hypothesis["state"] | undefined,
          confidence: params.confidence as number | undefined,
          goal_id: params.goal_id as string | undefined,
        },
      );
      if (!hypothesis) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "hypothesis not found"));
        return;
      }
      respond(true, hypothesis);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.idealzr.hypotheses.delete": async ({ params, respond }) => {
    const hypothesisId = params.hypothesis_id as string | undefined;
    if (!hypothesisId) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing hypothesis_id"));
      return;
    }
    try {
      const deleted = idealzr.deleteHypothesis(
        hypothesisId,
        params.project_id as string | undefined,
      );
      respond(true, { deleted });
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  // ── Evidence ──
  "cc.idealzr.evidence.list": async ({ params, respond }) => {
    try {
      const items = idealzr.listEvidence(params.project_id as string | undefined, {
        hypothesis_id: params.hypothesis_id as string | undefined,
        kind: params.kind as string | undefined,
        limit: params.limit as number | undefined,
      });
      respond(true, items);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.idealzr.evidence.create": async ({ params, respond }) => {
    const title = params.title as string | undefined;
    if (!title) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing title"));
      return;
    }
    try {
      const evidence = idealzr.createEvidence(params.project_id as string | undefined, {
        hypothesis_id: params.hypothesis_id as string | undefined,
        title,
        description: params.description as string | undefined,
        kind: params.kind as idealzr.Evidence["kind"] | undefined,
        source: params.source as string | undefined,
      });
      respond(true, evidence);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.idealzr.evidence.update": async ({ params, respond }) => {
    const evidenceId = params.evidence_id as string | undefined;
    if (!evidenceId) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing evidence_id"));
      return;
    }
    try {
      const evidence = idealzr.updateEvidence(evidenceId, params.project_id as string | undefined, {
        title: params.title as string | undefined,
        description: params.description as string | undefined,
        kind: params.kind as idealzr.Evidence["kind"] | undefined,
        source: params.source as string | undefined,
        hypothesis_id: params.hypothesis_id as string | undefined,
      });
      if (!evidence) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "evidence not found"));
        return;
      }
      respond(true, evidence);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.idealzr.evidence.delete": async ({ params, respond }) => {
    const evidenceId = params.evidence_id as string | undefined;
    if (!evidenceId) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing evidence_id"));
      return;
    }
    try {
      const deleted = idealzr.deleteEvidence(evidenceId, params.project_id as string | undefined);
      respond(true, { deleted });
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },
};
