/**
 * CommandCentral Integration Plugin
 *
 * Connects Wildvine to CommandCentral's Hub Backend,
 * starting with knowledge base search (Phase 1, Slice 1).
 *
 * Registers:
 * - Agent tool: cc_kb_search
 * - Gateway RPC: cc.kb.search, cc.health
 * - Hook: before_agent_start (notifies agents that CC tools are available)
 */

import type { WildvinePluginApi } from "wildvine/plugin-sdk";
import { Type } from "@sinclair/typebox";
import {
  ccHealthCheck,
  ccKbSearch,
  ccKbSearchMulti,
  ccKbIndexStatus,
  getCCBaseUrl,
  type CCSearchResult,
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

export default {
  id: "cc-integration",
  name: "CommandCentral Integration",
  description: "Bridges Wildvine to CommandCentral — KB search, health checks",

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
            const message =
              err instanceof Error ? err.message : "Unknown error contacting CommandCentral";
            const hint =
              message.includes("fetch failed") || message.includes("ECONNREFUSED")
                ? ` — is CommandCentral running at ${getCCBaseUrl()}?`
                : "";

            return {
              content: [
                {
                  type: "text" as const,
                  text: `CommandCentral KB search failed: ${message}${hint}`,
                },
              ],
              details: { error: message },
            };
          }
        },
      },
      { optional: true },
    );

    // ── Gateway RPC: cc.health ────────────────────────────────

    api.registerGatewayMethod("cc.health", async ({ respond }) => {
      try {
        const health = await ccHealthCheck();
        respond(true, health);
      } catch (err) {
        respond(false, {
          error: err instanceof Error ? err.message : "CommandCentral unreachable",
          url: getCCBaseUrl(),
        });
      }
    });

    // ── Gateway RPC: cc.kb.search ─────────────────────────────

    api.registerGatewayMethod("cc.kb.search", async ({ params, respond }) => {
      const query = typeof params.query === "string" ? params.query.trim() : "";
      if (!query) {
        respond(false, { error: "query is required" });
        return;
      }

      const projectId = typeof params.project_id === "string" ? params.project_id : "default";
      const entityTypes = Array.isArray(params.entity_types)
        ? (params.entity_types as string[])
        : undefined;
      const limit = typeof params.limit === "number" ? params.limit : undefined;

      try {
        const response = await ccKbSearch(projectId, query, {
          entity_types: entityTypes,
          limit,
        });
        respond(true, response);
      } catch (err) {
        respond(false, {
          error: err instanceof Error ? err.message : "CommandCentral KB search failed",
        });
      }
    });

    // ── Hook: before_agent_start ──────────────────────────────

    api.on("before_agent_start", async () => {
      const reachable = await isCCReachable();
      if (!reachable) return;

      return {
        prependContext:
          "[CommandCentral integration active] " +
          "You have access to the `cc_kb_search` tool to search CommandCentral's knowledge base " +
          "(goals, hypotheses, evidence, canvas nodes, indexed documents).",
      };
    });

    api.logger.info(`cc-integration: registered (CC hub: ${getCCBaseUrl()})`);
  },
};
