import type { GatewayRequestHandlers } from "./types.js";
import * as gov from "../governor-store.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";
import * as skillsStore from "../skills-registry-store.js";

export const skillsCcHandlers: GatewayRequestHandlers = {
  "cc.skills.list": async ({ params, respond }) => {
    try {
      const skills = skillsStore.listSkills({
        source: params.source as string | undefined,
        limit: params.limit as number | undefined,
      });
      // Return summary view (without full content)
      const summaries = skills.map(({ content: _content, ...rest }) => ({
        ...rest,
        keywords: rest.keywords ? JSON.parse(rest.keywords) : [],
      }));
      respond(true, summaries);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.skills.get": async ({ params, respond }) => {
    const name = params.name as string | undefined;
    if (!name) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing name"));
      return;
    }
    try {
      const skill = skillsStore.getSkill(name);
      if (!skill) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "skill not found"));
        return;
      }
      respond(true, {
        ...skill,
        keywords: skill.keywords ? JSON.parse(skill.keywords) : [],
      });
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.skills.resolve": async ({ params, respond }) => {
    const task = params.task as string | undefined;
    if (!task) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing task"));
      return;
    }
    try {
      const resolution = skillsStore.resolveSkills(task);
      respond(true, resolution);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.skills.ingest": async ({ params, respond }) => {
    const name = params.name as string | undefined;
    const content = params.content as string | undefined;
    if (!name || !content) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing name or content"));
      return;
    }
    try {
      // Evaluate the skill
      const evaluation = skillsStore.evaluateSkill(content);

      // If security flags are present, create a governor referral
      if (evaluation.security_flags.length > 0) {
        gov.createReferral({
          kind: "skill-ingestion",
          reason: `Skill "${name}" has security flags: ${evaluation.security_flags.join(", ")}`,
          artifact_ref: name,
          payload: {
            name,
            security_flags: evaluation.security_flags,
            eval_score: evaluation.score,
          },
        });
        respond(true, {
          status: "referred_to_governor",
          name,
          eval_score: evaluation.score,
          security_flags: evaluation.security_flags,
        });
        return;
      }

      // Ingest the skill
      const skill = skillsStore.upsertSkill({
        name,
        description: params.description as string | undefined,
        priority: params.priority as string | undefined,
        keywords: params.keywords as string[] | undefined,
        source: "ingested",
        content,
        eval_score: evaluation.score,
        eval_details: evaluation.details,
        security_flags: evaluation.security_flags,
      });

      respond(true, {
        status: "ingested",
        skill: { ...skill, keywords: skill.keywords ? JSON.parse(skill.keywords) : [] },
        evaluation,
      });
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.skills.scan": async ({ params, respond }) => {
    const dirPath = params.path as string | undefined;
    const source = params.source as string | undefined;
    if (!dirPath || !source) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing path or source"));
      return;
    }
    try {
      const result = skillsStore.scanDirectory(dirPath, source);
      respond(true, result);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },
};
