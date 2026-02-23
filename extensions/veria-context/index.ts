/**
 * Veria Context Injection Plugin
 *
 * Proactive knowledge surfacing for Veria agents.
 * Injects alignment principles, skills, and relevant knowledge
 * into agent working memory at the right moments.
 *
 * Uses context-injector.py to build curated payloads from KB.
 */

import type { WildvinePluginApi } from "wildvine/plugin-sdk";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const INJECTOR_PATH =
  process.env.VERIA_CONTEXT_INJECTOR ||
  `${process.env.HOME}/Projects/veria-os/scripts/context-injector.py`;

// Veria agent IDs that should receive context injection
const VERIA_AGENTS = new Set([
  "veria-orchestrator",
  "veria-ceo",
  "veria-outreach",
  "veria-intel",
  "veria-marketing",
]);

// Tool names that represent outbound actions requiring alignment checks
const OUTBOUND_TOOLS = new Set([
  "send_message",
  "send_email",
  "messaging_send",
  "telegram_send",
  "slack_post",
]);

function callInjector(args: string): string | null {
  try {
    return execSync(`python3 ${INJECTOR_PATH} ${args}`, {
      encoding: "utf-8",
      timeout: 10000,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    return null;
  }
}

export default {
  id: "veria-context-injector",
  name: "Veria Context Injection",
  description: "Injects proactive knowledge into Veria agents at session start and before actions",

  register(api: WildvinePluginApi) {
    // Verify injector script exists
    if (!existsSync(INJECTOR_PATH)) {
      api.logger.warn(`veria-context: injector not found at ${INJECTOR_PATH}`);
      return;
    }

    // Session start: inject north star + alignment + skills + recent memories
    api.on("before_agent_start", async (_event, ctx) => {
      const agentId = ctx.agentId;
      if (!agentId || !VERIA_AGENTS.has(agentId)) return;

      const output = callInjector(`--agent ${agentId} --trigger session_start --format markdown`);

      if (output) {
        api.logger.debug?.(`veria-context: injected ${output.length} chars for ${agentId}`);
        return {
          prependContext: output,
        };
      }
    });

    // Before outbound actions: inject alignment check
    api.on("before_tool_call", async (event, ctx) => {
      const agentId = ctx.agentId;
      if (!agentId || !VERIA_AGENTS.has(agentId)) return;

      const toolName = (event as { toolName?: string }).toolName || "";
      if (!OUTBOUND_TOOLS.has(toolName)) return;

      const output = callInjector(
        `--agent ${agentId} --trigger before_action --action "${toolName}" --format markdown`,
      );

      if (output) {
        api.logger.debug?.(
          `veria-context: alignment check for ${toolName} (${output.length} chars)`,
        );
      }
    });
  },
};
