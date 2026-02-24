/**
 * CommandCentral Integration Plugin
 *
 * Provides agent tools that bridge to CC's Hub Backend for legacy compatibility.
 * All Gateway RPCs have been migrated to native TypeScript stores in src/gateway/.
 *
 * Agent tools: cc_kb_search, cc_pipeline_run, cc_pipeline_list, cc_run_status,
 *   cc_governor_list, cc_governor_decide, cc_arena_chat, cc_inbox_list, cc_inbox_ack,
 *   cc_vislzr_canvases, cc_skill_search, cc_knowledge_capture, memory_export,
 *   cc_skills_ingest, notes_capture
 * Hooks: before_agent_start, session_end
 */

import type { WildvinePluginApi } from "wildvine/plugin-sdk";
import { Type } from "@sinclair/typebox";
import {
  ccHealthCheck,
  ccKbSearch,
  getCCBaseUrl,
  type CCSearchResult,
  ccPipelinesList,
  ccRunCreate,
  ccRunsList,
  ccRunGet,
  ccGovernorPending,
  ccGovernorApprove,
  ccGovernorDeny,
  ccArenaCreateSession,
  ccArenaChat,
  ccInboxList,
  ccInboxAck,
  ccVislzrCanvases,
  ccVislzrCanvasGet,
  ccSkillsList,
  ccSkillGet,
  ccSkillsResolve,
  ccKnowledgeCapture,
  ccKnowledgeSessionEnd,
  ccSkillsIngest,
  ccNotesCapture,
} from "./cc-client.js";

// Cache CC reachability for 30 seconds to avoid spamming health checks
let ccReachable: boolean | null = null;
let ccReachableCheckedAt = 0;
const REACHABILITY_TTL_MS = 30_000;

async function isCCReachable(): Promise<boolean> {
  const now = Date.now();
  if (ccReachable !== null && now - ccReachableCheckedAt < REACHABILITY_TTL_MS) {
    return ccReachable;
  }
  try {
    await ccHealthCheck();
    ccReachable = true;
  } catch {
    ccReachable = false;
  }
  ccReachableCheckedAt = now;
  return ccReachable;
}

function formatSearchResults(results: CCSearchResult[]): string {
  if (results.length === 0) return "No results found.";

  return results
    .map((r, i) => {
      const parts = [`${i + 1}. **${r.title}** (${r.entity_type}, score: ${r.score.toFixed(2)})`];
      if (r.snippet) parts.push(`   ${r.snippet}`);
      if (r.url) parts.push(`   Link: ${r.url}`);
      return parts.join("\n");
    })
    .join("\n\n");
}

function ccErrorText(err: unknown, action: string): string {
  const message = err instanceof Error ? err.message : "Unknown error contacting CommandCentral";
  const hint =
    message.includes("fetch failed") || message.includes("ECONNREFUSED")
      ? ` — is CommandCentral running at ${getCCBaseUrl()}?`
      : "";
  return `${action} failed: ${message}${hint}`;
}

function textResult(text: string, details?: unknown) {
  return {
    content: [{ type: "text" as const, text }],
    details: details ?? {},
  };
}

export default {
  id: "cc-integration",
  name: "CommandCentral Integration",
  description:
    "Bridges Wildvine to CommandCentral — KB search, knowledge capture, pipelines, governor, arena, inbox, VISLZR",

  register(api: WildvinePluginApi) {
    // ── Agent Tool: cc_kb_search ──────────────────────────────

    api.registerTool(
      {
        name: "cc_kb_search",
        label: "CC KB Search",
        description:
          "Search CommandCentral's knowledge base across goals, hypotheses, evidence, " +
          "canvas nodes, and indexed documents. Use this to find information stored in " +
          "the CC hub — project goals, research hypotheses, evidence, visual canvas nodes, " +
          "and any indexed documents.",
        parameters: Type.Object({
          query: Type.String({ description: "Search query" }),
          project_id: Type.Optional(
            Type.String({
              description: "Project namespace to search. Omit to search the default project.",
            }),
          ),
          entity_types: Type.Optional(
            Type.Array(
              Type.Union([
                Type.Literal("goal"),
                Type.Literal("hypothesis"),
                Type.Literal("evidence"),
                Type.Literal("node"),
                Type.Literal("document"),
              ]),
              {
                description:
                  "Filter by entity type. Options: goal, hypothesis, evidence, node, document.",
              },
            ),
          ),
          limit: Type.Optional(
            Type.Number({
              description: "Max results to return (default 20, max 100)",
              minimum: 1,
              maximum: 100,
            }),
          ),
        }),

        async execute(_toolCallId: string, params: Record<string, unknown>) {
          const query = String(params.query || "").trim();
          if (!query) {
            return {
              content: [{ type: "text" as const, text: "Error: query is required." }],
              details: { error: "query is required" },
            };
          }

          const projectId = String(params.project_id || "default");
          const entityTypes = Array.isArray(params.entity_types)
            ? (params.entity_types as string[])
            : undefined;
          const limit =
            typeof params.limit === "number" ? Math.min(Math.max(params.limit, 1), 100) : undefined;

          try {
            const response = await ccKbSearch(projectId, query, {
              entity_types: entityTypes,
              limit,
            });

            const text = [
              `Found ${response.total} result(s) for "${response.query}" (${response.took_ms}ms):`,
              "",
              formatSearchResults(response.results),
            ].join("\n");

            return {
              content: [{ type: "text" as const, text }],
              details: response,
            };
          } catch (err) {
            return textResult(ccErrorText(err, "CC KB search"));
          }
        },
      },
      { optional: true },
    );

    // ── Agent Tool: cc_pipeline_list ──────────────────────────

    api.registerTool(
      {
        name: "cc_pipeline_list",
        label: "CC Pipelines",
        description:
          "List available pipelines in CommandCentral. Returns pipeline names, owners, " +
          "stage counts, and descriptions.",
        parameters: Type.Object({
          owner: Type.Optional(Type.String({ description: "Filter by owner role (e.g. CC_CTO)" })),
        }),

        async execute(_id: string, params: Record<string, unknown>) {
          try {
            const owner = typeof params.owner === "string" ? params.owner : undefined;
            const pipelines = await ccPipelinesList(owner);
            if (pipelines.length === 0) return textResult("No pipelines found.");

            const lines = pipelines.map(
              (p, i) =>
                `${i + 1}. **${p.name}** v${p.version} (${p.stages_count} stages, owner: ${p.owner})\n   ${p.description || "No description"}\n   Path: ${p.path}`,
            );
            return textResult(`${pipelines.length} pipeline(s):\n\n${lines.join("\n\n")}`, {
              pipelines,
            });
          } catch (err) {
            return textResult(ccErrorText(err, "CC pipeline list"));
          }
        },
      },
      { optional: true },
    );

    // ── Agent Tool: cc_pipeline_run ───────────────────────────

    api.registerTool(
      {
        name: "cc_pipeline_run",
        label: "CC Run Pipeline",
        description:
          "Trigger a pipeline run in CommandCentral. The pipeline executes asynchronously; " +
          "use cc_run_status to check progress. Use cc_pipeline_list first to find available pipelines.",
        parameters: Type.Object({
          pipeline_path: Type.String({
            description: 'Path to pipeline YAML, e.g. "pipelines/core/build.yml"',
          }),
          project_name: Type.String({ description: "Project to run the pipeline for" }),
          project_type: Type.Optional(
            Type.String({
              description: 'Project type: "core", "shared", or "isolated" (default: core)',
            }),
          ),
        }),

        async execute(_id: string, params: Record<string, unknown>) {
          const pipelinePath = String(params.pipeline_path || "").trim();
          const projectName = String(params.project_name || "").trim();
          if (!pipelinePath || !projectName) {
            return textResult("Error: pipeline_path and project_name are required.");
          }
          try {
            const result = await ccRunCreate({
              pipeline_path: pipelinePath,
              project_name: projectName,
              project_type:
                typeof params.project_type === "string" ? params.project_type : undefined,
            });
            return textResult(
              `Pipeline run started.\n- Run ID: ${result.run_id}\n- Pipeline: ${pipelinePath}\n- Project: ${projectName}\n\nUse cc_run_status with this run_id to check progress.`,
              result,
            );
          } catch (err) {
            return textResult(ccErrorText(err, "CC pipeline run"));
          }
        },
      },
      { optional: true },
    );

    // ── Agent Tool: cc_run_status ─────────────────────────────

    api.registerTool(
      {
        name: "cc_run_status",
        label: "CC Run Status",
        description:
          "Check the status of a pipeline run, or list recent runs. " +
          "Provide a run_id for a specific run, or omit to list recent runs.",
        parameters: Type.Object({
          run_id: Type.Optional(Type.String({ description: "Specific run ID to check" })),
          pipeline_name: Type.Optional(
            Type.String({ description: "Filter recent runs by pipeline name" }),
          ),
          status: Type.Optional(
            Type.String({ description: 'Filter by status: "running", "succeeded", "failed"' }),
          ),
          limit: Type.Optional(Type.Number({ description: "Max runs to return (default 10)" })),
        }),

        async execute(_id: string, params: Record<string, unknown>) {
          try {
            if (typeof params.run_id === "string" && params.run_id.trim()) {
              const run = await ccRunGet(params.run_id.trim());
              const lines = [
                `**Run ${run.run_id}** — ${run.status.toUpperCase()}`,
                `Pipeline: ${run.pipeline_name} (${run.pipeline_path})`,
                `Project: ${run.project_name} (${run.project_type})`,
                `Started: ${run.started_at}`,
                run.finished_at ? `Finished: ${run.finished_at}` : "Still running...",
                `Stages: ${run.summary.stages_succeeded}/${run.summary.stages_run} succeeded, ${run.summary.stages_failed} failed, ${run.summary.stages_skipped} skipped`,
              ];
              if (run.summary.failed_at_stage)
                lines.push(`Failed at: ${run.summary.failed_at_stage}`);
              return textResult(lines.join("\n"), run);
            }

            const runs = await ccRunsList({
              pipeline_name:
                typeof params.pipeline_name === "string" ? params.pipeline_name : undefined,
              status: typeof params.status === "string" ? params.status : undefined,
              limit: typeof params.limit === "number" ? params.limit : 10,
            });
            if (runs.length === 0) return textResult("No runs found.");

            const lines = runs.map(
              (r) => `- **${r.run_id}** ${r.pipeline_name} — ${r.status} (${r.started_at})`,
            );
            return textResult(`${runs.length} recent run(s):\n\n${lines.join("\n")}`, { runs });
          } catch (err) {
            return textResult(ccErrorText(err, "CC run status"));
          }
        },
      },
      { optional: true },
    );

    // ── Agent Tool: cc_governor_list ──────────────────────────

    api.registerTool(
      {
        name: "cc_governor_list",
        label: "CC Governor Queue",
        description:
          "List pending items in CommandCentral's governor approval queue. " +
          "These are referrals requiring human-in-the-loop approval (tech decisions, financial spend).",
        parameters: Type.Object({
          instance: Type.Optional(
            Type.String({ description: 'Instance to check (default: "hub")' }),
          ),
          limit: Type.Optional(Type.Number({ description: "Max items to return" })),
        }),

        async execute(_id: string, params: Record<string, unknown>) {
          try {
            const instance = typeof params.instance === "string" ? params.instance : "hub";
            const limit = typeof params.limit === "number" ? params.limit : undefined;
            const result = await ccGovernorPending(instance, limit);

            if (result.pending.length === 0)
              return textResult(`No pending approvals in "${instance}" governor queue.`);

            const lines = result.pending.map((r, i) => {
              const parts = [`${i + 1}. **${r.id}** (${r.kind || "referral"})`];
              if (r.reason) parts.push(`   Reason: ${r.reason}`);
              if (r.from_instance) parts.push(`   From: ${r.from_instance}`);
              if (r.artifact_ref) parts.push(`   Artifact: ${r.artifact_ref}`);
              return parts.join("\n");
            });
            return textResult(
              `${result.count} pending approval(s) in "${instance}":\n\n${lines.join("\n\n")}`,
              result,
            );
          } catch (err) {
            return textResult(ccErrorText(err, "CC governor list"));
          }
        },
      },
      { optional: true },
    );

    // ── Agent Tool: cc_governor_decide ────────────────────────

    api.registerTool(
      {
        name: "cc_governor_decide",
        label: "CC Governor Decide",
        description:
          "Approve or deny a pending item in the governor queue. " +
          "Use cc_governor_list first to see what needs approval.",
        parameters: Type.Object({
          referral_id: Type.String({ description: "ID of the referral to approve/deny" }),
          action: Type.Union([Type.Literal("approve"), Type.Literal("deny")], {
            description: '"approve" or "deny"',
          }),
          instance: Type.Optional(Type.String({ description: 'Instance (default: "hub")' })),
          comment: Type.Optional(Type.String({ description: "Optional comment for the decision" })),
        }),

        async execute(_id: string, params: Record<string, unknown>) {
          const referralId = String(params.referral_id || "").trim();
          const action = String(params.action || "").trim();
          if (!referralId || (action !== "approve" && action !== "deny")) {
            return textResult('Error: referral_id and action ("approve" or "deny") are required.');
          }

          const instance = typeof params.instance === "string" ? params.instance : "hub";
          const comment = typeof params.comment === "string" ? params.comment : undefined;

          try {
            const fn = action === "approve" ? ccGovernorApprove : ccGovernorDeny;
            const result = await fn(instance, referralId, comment);
            return textResult(
              `Referral **${result.referral_id}** has been **${result.action}**.`,
              result,
            );
          } catch (err) {
            return textResult(ccErrorText(err, `CC governor ${action}`));
          }
        },
      },
      { optional: true },
    );

    // ── Agent Tool: cc_arena_chat ─────────────────────────────

    api.registerTool(
      {
        name: "cc_arena_chat",
        label: "CC Arena",
        description:
          "Interact with CommandCentral's Arena — multi-agent deliberation sessions. " +
          "Send a message to a session and get responses from configured AI agents. " +
          "Provide a session_id to continue an existing session, or set create_session to " +
          "start a new one.",
        parameters: Type.Object({
          message: Type.String({ description: "Message to send to the arena session" }),
          project_id: Type.Optional(
            Type.String({ description: 'Project ID (default: "default")' }),
          ),
          session_id: Type.Optional(
            Type.String({ description: "Existing session ID to continue" }),
          ),
          create_session: Type.Optional(
            Type.Object(
              {
                name: Type.String({ description: "Session name" }),
                mode: Type.Optional(
                  Type.String({ description: '"group_chat", "debate", or "round_robin"' }),
                ),
                agents: Type.Array(
                  Type.Object({
                    display_name: Type.String(),
                    model: Type.String(),
                    archetype: Type.Optional(Type.String()),
                  }),
                ),
              },
              { description: "Create a new session before sending the message" },
            ),
          ),
        }),

        async execute(_id: string, params: Record<string, unknown>) {
          const message = String(params.message || "").trim();
          if (!message) return textResult("Error: message is required.");

          const projectId = typeof params.project_id === "string" ? params.project_id : "default";
          let sessionId = typeof params.session_id === "string" ? params.session_id : "";

          try {
            // Create session if requested
            if (params.create_session && typeof params.create_session === "object") {
              const cs = params.create_session as Record<string, unknown>;
              const agents = Array.isArray(cs.agents)
                ? (cs.agents as { display_name: string; model: string; archetype?: string }[])
                : [];
              if (!cs.name || agents.length === 0) {
                return textResult("Error: create_session requires name and at least one agent.");
              }
              const session = await ccArenaCreateSession(projectId, {
                name: String(cs.name),
                mode: typeof cs.mode === "string" ? cs.mode : undefined,
                agents,
              });
              sessionId = session.id;
            }

            if (!sessionId) return textResult("Error: session_id or create_session is required.");

            const result = await ccArenaChat(sessionId, projectId, message);
            const responses = Array.isArray(result.agent_responses) ? result.agent_responses : [];

            const lines = [`**Arena session ${sessionId}** (mode: ${result.mode || "unknown"})`];
            if (responses.length > 0) {
              for (const r of responses) {
                const resp = r as Record<string, unknown>;
                lines.push(`\n**${resp.agent || "Agent"}:**\n${resp.content || "(no response)"}`);
              }
            } else {
              lines.push("\nNo agent responses generated.");
            }

            return textResult(lines.join("\n"), result);
          } catch (err) {
            return textResult(ccErrorText(err, "CC arena chat"));
          }
        },
      },
      { optional: true },
    );

    // ── Agent Tool: cc_inbox_list ─────────────────────────────

    api.registerTool(
      {
        name: "cc_inbox_list",
        label: "CC Inbox",
        description:
          "List notifications and referrals in CommandCentral's inbox for an instance. " +
          "Shows unread/unacknowledged items requiring attention.",
        parameters: Type.Object({
          instance: Type.Optional(Type.String({ description: 'Instance name (default: "hub")' })),
          unread_only: Type.Optional(
            Type.Boolean({ description: "Only show unread notifications" }),
          ),
          limit: Type.Optional(Type.Number({ description: "Max items to return" })),
        }),

        async execute(_id: string, params: Record<string, unknown>) {
          try {
            const instance = typeof params.instance === "string" ? params.instance : "hub";
            const result = await ccInboxList(instance, {
              unread_only: params.unread_only === true,
              limit: typeof params.limit === "number" ? params.limit : undefined,
            });

            if (result.notifications.length === 0) {
              return textResult(
                `Inbox "${instance}" is empty. (${result.total} total, ${result.unread} unread)`,
              );
            }

            const lines = result.notifications.map((n, i) => {
              const flags = [n.is_read ? "read" : "UNREAD", n.is_acked ? "acked" : "unacked"];
              const parts = [`${i + 1}. **${n.id}** [${flags.join(", ")}]`];
              parts.push(`   From: ${n.from} → To: ${n.to}`);
              if (n.reason) parts.push(`   Reason: ${n.reason}`);
              return parts.join("\n");
            });
            return textResult(
              `Inbox "${instance}": ${result.total} total, ${result.unread} unread, ${result.unacked} unacked\n\n${lines.join("\n\n")}`,
              result,
            );
          } catch (err) {
            return textResult(ccErrorText(err, "CC inbox list"));
          }
        },
      },
      { optional: true },
    );

    // ── Agent Tool: cc_inbox_ack ──────────────────────────────

    api.registerTool(
      {
        name: "cc_inbox_ack",
        label: "CC Inbox Ack",
        description: "Acknowledge a notification in CommandCentral's inbox.",
        parameters: Type.Object({
          referral_id: Type.String({ description: "ID of the notification to acknowledge" }),
          instance: Type.Optional(Type.String({ description: 'Instance name (default: "hub")' })),
          note: Type.Optional(Type.String({ description: "Optional note" })),
        }),

        async execute(_id: string, params: Record<string, unknown>) {
          const referralId = String(params.referral_id || "").trim();
          if (!referralId) return textResult("Error: referral_id is required.");

          try {
            const instance = typeof params.instance === "string" ? params.instance : "hub";
            const note = typeof params.note === "string" ? params.note : undefined;
            const result = await ccInboxAck(instance, referralId, note);
            return textResult(`Notification **${result.referral_id}** acknowledged.`, result);
          } catch (err) {
            return textResult(ccErrorText(err, "CC inbox ack"));
          }
        },
      },
      { optional: true },
    );

    // ── Agent Tool: cc_vislzr_canvases ────────────────────────

    api.registerTool(
      {
        name: "cc_vislzr_canvases",
        label: "CC VISLZR",
        description:
          "List or view visual canvases in CommandCentral's VISLZR. " +
          "Canvases contain nodes (goals, hypotheses, tasks, notes) and edges. " +
          "Provide canvas_id to get full details with nodes and edges.",
        parameters: Type.Object({
          project_id: Type.Optional(
            Type.String({ description: 'Project ID (default: "default")' }),
          ),
          canvas_id: Type.Optional(
            Type.String({ description: "Specific canvas ID to view with nodes/edges" }),
          ),
        }),

        async execute(_id: string, params: Record<string, unknown>) {
          const projectId = typeof params.project_id === "string" ? params.project_id : "default";

          try {
            if (typeof params.canvas_id === "string" && params.canvas_id.trim()) {
              const result = await ccVislzrCanvasGet(params.canvas_id.trim(), projectId);
              const lines = [
                `**Canvas: ${result.canvas.name}** (${result.nodes.length} nodes, ${result.canvas.edge_count} edges)`,
              ];
              if (result.canvas.description)
                lines.push(`Description: ${result.canvas.description}`);
              lines.push("");
              for (const n of result.nodes) {
                lines.push(`- [${n.node_type}] **${n.label}** (${n.id})`);
              }
              return textResult(lines.join("\n"), result);
            }

            const canvases = await ccVislzrCanvases(projectId);
            if (canvases.length === 0)
              return textResult(`No canvases found for project "${projectId}".`);

            const lines = canvases.map(
              (c, i) =>
                `${i + 1}. **${c.name}** (${c.node_count} nodes, ${c.edge_count} edges)\n   ID: ${c.id}`,
            );
            return textResult(
              `${canvases.length} canvas(es) in "${projectId}":\n\n${lines.join("\n\n")}`,
              { canvases },
            );
          } catch (err) {
            return textResult(ccErrorText(err, "CC VISLZR"));
          }
        },
      },
      { optional: true },
    );

    // ── Agent Tool: cc_skill_search ──────────────────────────

    api.registerTool(
      {
        name: "cc_skill_search",
        label: "CC Skills",
        description:
          "Search CommandCentral's skill library. Skills contain institutional knowledge — " +
          "operations procedures, safety rules, execution methodology, orchestration patterns, " +
          "and lessons learned. Use 'resolve' mode to find skills matching a task description, " +
          "or 'get' mode to read a specific skill's full content.",
        parameters: Type.Object({
          mode: Type.Union([Type.Literal("list"), Type.Literal("resolve"), Type.Literal("get")], {
            description:
              '"list" shows all skills, "resolve" finds skills matching a task description, ' +
              '"get" reads a specific skill\'s content',
          }),
          query: Type.Optional(
            Type.String({
              description:
                'For "resolve": task description to match against. For "get": skill name.',
            }),
          ),
        }),

        async execute(_id: string, params: Record<string, unknown>) {
          const mode = String(params.mode || "list");

          try {
            if (mode === "list") {
              const result = await ccSkillsList();
              if (result.skills.length === 0) return textResult("No skills found in CC.");

              const lines = result.skills.map(
                (s, i) =>
                  `${i + 1}. **${s.name}** [${s.priority}]\n   ${s.description}\n   Keywords: ${s.keywords.join(", ")}`,
              );
              return textResult(
                `${result.skills.length} skill(s) available:\n\n${lines.join("\n\n")}`,
                result,
              );
            }

            if (mode === "resolve") {
              const query = String(params.query || "").trim();
              if (!query) return textResult("Error: query is required for resolve mode.");

              const result = await ccSkillsResolve(query);
              if (result.resolved_skills.length === 0) {
                return textResult(`No skills match "${query}".`);
              }

              const lines = result.resolved_skills.map((s) => `- **${s.name}** [${s.priority}]`);
              return textResult(
                `Resolved ${result.resolved_skills.length} skill(s) for "${query}":\n${lines.join("\n")}\n\n` +
                  `P0: ${result.p0_count}, P1: ${result.p1_count}, P2: ${result.p2_count}\n` +
                  "Use cc_skill_search with mode='get' to read full skill content.",
                result,
              );
            }

            if (mode === "get") {
              const skillName = String(params.query || "").trim();
              if (!skillName)
                return textResult("Error: query (skill name) is required for get mode.");

              const skill = await ccSkillGet(skillName);
              return textResult(
                `**${skill.name}** [${skill.priority}]\n${skill.description}\n\n---\n\n${skill.content}`,
                { name: skill.name, priority: skill.priority, keywords: skill.keywords },
              );
            }

            return textResult('Error: mode must be "list", "resolve", or "get".');
          } catch (err) {
            return textResult(ccErrorText(err, "CC skill search"));
          }
        },
      },
      { optional: true },
    );

    // ── Agent Tool: cc_knowledge_capture ────────────────────

    api.registerTool(
      {
        name: "cc_knowledge_capture",
        label: "CC Knowledge Capture",
        description:
          "Push knowledge, learnings, or session insights to CommandCentral's knowledge base. " +
          "Use this to persist important discoveries, decisions, or patterns that should be " +
          "available across all future sessions and agents.",
        parameters: Type.Object({
          content: Type.String({ description: "The knowledge content to capture" }),
          source: Type.Optional(
            Type.String({
              description: 'Source label, e.g. "wildvine-session", "agent-discovery"',
            }),
          ),
          agent_id: Type.Optional(
            Type.String({ description: "Agent that produced this knowledge" }),
          ),
          session_id: Type.Optional(Type.String({ description: "Session ID for attribution" })),
          metadata: Type.Optional(
            Type.Object({}, { additionalProperties: true, description: "Arbitrary metadata" }),
          ),
        }),

        async execute(_id: string, params: Record<string, unknown>) {
          const content = String(params.content || "").trim();
          if (!content) return textResult("Error: content is required.");
          try {
            const result = await ccKnowledgeCapture({
              content,
              source: typeof params.source === "string" ? params.source : "wildvine-agent",
              agent_id: typeof params.agent_id === "string" ? params.agent_id : undefined,
              session_id: typeof params.session_id === "string" ? params.session_id : undefined,
              metadata:
                params.metadata && typeof params.metadata === "object"
                  ? (params.metadata as Record<string, unknown>)
                  : undefined,
            });
            return textResult(
              `Knowledge captured (id: ${result.id}). Status: ${result.status}`,
              result,
            );
          } catch (err) {
            return textResult(ccErrorText(err, "CC knowledge capture"));
          }
        },
      },
      { optional: true },
    );

    // ── Agent Tool: memory_export ─────────────────────────────

    api.registerTool(
      {
        name: "memory_export",
        label: "Export Memory to CC",
        description:
          "Manually export a Wildvine memory entry or session summary to CommandCentral's " +
          "knowledge base. Use this when you want to explicitly push important session context, " +
          "decisions, or learnings to CC for cross-session persistence.",
        parameters: Type.Object({
          content: Type.String({ description: "Memory content to export" }),
          agent_id: Type.Optional(Type.String({ description: "Originating agent ID" })),
          session_id: Type.Optional(Type.String({ description: "Originating session ID" })),
          tags: Type.Optional(
            Type.Array(Type.String(), { description: "Tags for categorization" }),
          ),
        }),

        async execute(_id: string, params: Record<string, unknown>) {
          const content = String(params.content || "").trim();
          if (!content) return textResult("Error: content is required.");
          try {
            const result = await ccKnowledgeCapture({
              content,
              source: "wildvine-memory-export",
              agent_id: typeof params.agent_id === "string" ? params.agent_id : undefined,
              session_id: typeof params.session_id === "string" ? params.session_id : undefined,
              metadata: {
                tags: Array.isArray(params.tags) ? params.tags : undefined,
                exported_at: new Date().toISOString(),
              },
            });
            return textResult(
              `Memory exported to CC KB (id: ${result.id}). Status: ${result.status}`,
              result,
            );
          } catch (err) {
            return textResult(ccErrorText(err, "Memory export to CC"));
          }
        },
      },
      { optional: true },
    );

    // ── Agent Tool: cc_skills_ingest ─────────────────────────

    api.registerTool(
      {
        name: "cc_skills_ingest",
        label: "CC Skill Ingest",
        description:
          "Submit a Wildvine skill to CommandCentral's evaluation pipeline. " +
          "The skill goes through a 3-stage process: discover → evaluate → ingest. " +
          "Skills that pass evaluation are added to CC's skill library; those that fail " +
          "are referred to the governor queue for human review.",
        parameters: Type.Object({
          name: Type.String({ description: "Skill name" }),
          content: Type.String({ description: "Full skill content (SKILL.md body)" }),
          source: Type.Optional(
            Type.String({ description: 'Source identifier (default: "wildvine")' }),
          ),
          priority: Type.Optional(
            Type.String({ description: 'Suggested priority: "P0", "P1", or "P2"' }),
          ),
          keywords: Type.Optional(
            Type.Array(Type.String(), { description: "Keywords for task matching" }),
          ),
        }),
        async execute(_id: string, params: Record<string, unknown>) {
          const name = String(params.name || "").trim();
          const content = String(params.content || "").trim();
          if (!name || !content) {
            return textResult("Error: name and content are required.");
          }
          try {
            const result = await ccSkillsIngest({
              name,
              content,
              source: typeof params.source === "string" ? params.source : undefined,
              priority: typeof params.priority === "string" ? params.priority : undefined,
              keywords: Array.isArray(params.keywords) ? (params.keywords as string[]) : undefined,
            });
            return textResult(
              `Skill "${name}" submitted for evaluation.\n` +
                `Pipeline run ID: ${result.run_id}\n` +
                "Use cc_run_status to check evaluation progress.",
              result,
            );
          } catch (err) {
            return textResult(ccErrorText(err, "CC skill ingest"));
          }
        },
      },
      { optional: true },
    );

    // ── Gateway RPCs ──────────────────────────────────────────
    // All CC gateway methods (cc.health, cc.kb.*, cc.governor.*, cc.arena.*,
    // cc.inbox.*, cc.idealzr.*, cc.skills.*, cc.pipelines.*, cc.runs.*,
    // cc.vislzr.*, cc.knowledge.capture, notes.*) have been migrated to
    // native TypeScript stores in src/gateway/. See:
    //   engine-store.ts, governor-store.ts, inbox-store.ts, idealzr-store.ts,
    //   kb-store.ts, arena-store.ts, skills-registry-store.ts, pipeline-store.ts,
    //   notes-store.ts
    // The agent tools above still use the CC HTTP client as a fallback.
    // ─────────────────────────────────────────────────────────

    // Gateway RPCs migrated to native stores — see src/gateway/engine-store.ts

    // ── Agent Tool: notes_capture ─────────────────────────────

    api.registerTool(
      {
        name: "notes_capture",
        label: "Capture Note",
        description:
          "Capture a note, thought, or idea on behalf of the user. Use this when the user " +
          "dictates an idea, mentions something to remember, or asks you to note something down. " +
          "Notes are stored in the living notes system and surfaced contextually.",
        parameters: Type.Object({
          subject: Type.String({ description: "The note title or main thought" }),
          body: Type.Optional(
            Type.String({ description: "Additional detail or context for the note" }),
          ),
          priority: Type.Optional(
            Type.Union([Type.Literal("RED"), Type.Literal("YELLOW"), Type.Literal("GREEN")], {
              description:
                'Priority: "RED" (urgent), "YELLOW" (important), "GREEN" (normal, default)',
            }),
          ),
        }),

        async execute(_id: string, params: Record<string, unknown>) {
          const subject = String(params.subject || "").trim();
          if (!subject) {
            return textResult("Error: subject is required.");
          }
          try {
            const item = await ccNotesCapture({
              subject,
              body: typeof params.body === "string" ? params.body : undefined,
              priority:
                typeof params.priority === "string" &&
                ["RED", "YELLOW", "GREEN"].includes(params.priority)
                  ? (params.priority as "RED" | "YELLOW" | "GREEN")
                  : undefined,
            });
            return textResult(
              `Note captured: **${item.subject}** (${item.priority}, id: ${item.id})`,
              item,
            );
          } catch (err) {
            return textResult(ccErrorText(err, "Notes capture"));
          }
        },
      },
      { optional: true },
    );

    // ── Hook: before_agent_start ──────────────────────────────

    api.on("before_agent_start", async () => {
      const reachable = await isCCReachable();
      if (!reachable) return;

      return {
        prependContext:
          "[CommandCentral integration active] You have access to these CC tools:\n" +
          "- cc_kb_search: Search the knowledge base (goals, hypotheses, evidence, documents)\n" +
          "- cc_pipeline_list / cc_pipeline_run / cc_run_status: Discover and run pipelines\n" +
          "- cc_governor_list / cc_governor_decide: Review and approve/deny governor queue items\n" +
          "- cc_arena_chat: Multi-agent deliberation sessions\n" +
          "- cc_inbox_list / cc_inbox_ack: Read and acknowledge inbox notifications\n" +
          "- cc_vislzr_canvases: Browse visual canvases (mindmaps, dashboards)\n" +
          "- cc_skill_search: Search CC's skill library (operations, safety, execution patterns)\n" +
          "- cc_knowledge_capture: Push knowledge and learnings to CC's knowledge base\n" +
          "- memory_export: Export session memory to CC for cross-session persistence\n" +
          "- cc_skills_ingest: Submit skills to CC's evaluation pipeline\n" +
          "- notes_capture: Capture a note/thought/idea for the user's living notes system",
      };
    });

    // ── Hook: session_end ──────────────────────────────────────

    api.on("session_end", async (event, ctx) => {
      const reachable = await isCCReachable();
      if (!reachable) return;

      try {
        const agentId = ctx.agentId || "unknown";
        const sessionId = ctx.sessionId || event.sessionId;

        // Build a minimal summary from available data
        const content =
          `Session ended (${event.messageCount} messages` +
          (event.durationMs ? `, ${Math.round(event.durationMs / 1000)}s` : "") +
          `)`;

        if (event.messageCount < 2) return; // Skip trivial sessions

        await ccKnowledgeSessionEnd(agentId, content, sessionId);
        api.logger.debug?.(
          `cc-integration: session summary pushed to CC KB (agent=${agentId}, session=${sessionId}, msgs=${event.messageCount})`,
        );
      } catch (err) {
        // Non-fatal — don't break session teardown
        const msg = err instanceof Error ? err.message : String(err);
        api.logger.warn(`cc-integration: failed to push session summary to CC: ${msg}`);
      }
    });

    api.logger.info(`cc-integration: registered (CC hub: ${getCCBaseUrl()})`);
  },
};
