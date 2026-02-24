import type { GatewayRequestHandlers } from "./types.js";
import * as pipelineStore from "../pipeline-store.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";

export const pipelineHandlers: GatewayRequestHandlers = {
  "cc.pipelines.list": async ({ params, respond }) => {
    try {
      const pipelines = pipelineStore.listPipelines({
        owner: params.owner as string | undefined,
        limit: params.limit as number | undefined,
      });
      // Parse definition JSON for each pipeline
      const parsed = pipelines.map((p) => ({
        ...p,
        definition: p.definition ? JSON.parse(p.definition) : null,
      }));
      respond(true, parsed);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.pipelines.get": async ({ params, respond }) => {
    const name = params.name as string | undefined;
    if (!name) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing name"));
      return;
    }
    try {
      const pipeline = pipelineStore.getPipeline(name);
      if (!pipeline) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "pipeline not found"));
        return;
      }
      respond(true, {
        ...pipeline,
        definition: pipeline.definition ? JSON.parse(pipeline.definition) : null,
      });
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.pipelines.load": async ({ params, respond }) => {
    const dirPath = params.path as string | undefined;
    if (!dirPath) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing path"));
      return;
    }
    try {
      const result = pipelineStore.loadPipelinesFromDir(dirPath);
      respond(true, result);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.runs.list": async ({ params, respond }) => {
    try {
      const runs = pipelineStore.listRuns({
        pipeline_name: params.pipeline_name as string | undefined,
        status: params.status as string | undefined,
        limit: params.limit as number | undefined,
      });
      // Parse params JSON
      const parsed = runs.map((r) => ({
        ...r,
        params: r.params ? JSON.parse(r.params) : null,
      }));
      respond(true, parsed);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.runs.create": async ({ params, respond }) => {
    const pipelineName = params.pipeline_name as string | undefined;
    if (!pipelineName) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing pipeline_name"));
      return;
    }
    try {
      const run = pipelineStore.createRun({
        pipeline_name: pipelineName,
        params: params.params,
      });
      respond(true, { ...run, params: run.params ? JSON.parse(run.params) : null });
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.runs.get": async ({ params, respond }) => {
    const runId = params.run_id as string | undefined;
    if (!runId) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing run_id"));
      return;
    }
    try {
      const run = pipelineStore.getRun(runId);
      if (!run) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "run not found"));
        return;
      }
      respond(true, { ...run, params: run.params ? JSON.parse(run.params) : null });
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },
};
