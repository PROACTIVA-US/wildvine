import type { GatewayRequestHandlers } from "./types.js";
import * as arena from "../arena-store.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";

export const arenaHandlers: GatewayRequestHandlers = {
  "cc.arena.sessions": async ({ params, respond }) => {
    try {
      const sessions = arena.listSessions(params.project_id as string | undefined, {
        limit: params.limit as number | undefined,
        offset: params.offset as number | undefined,
      });
      // Parse agents JSON for each session
      const parsed = sessions.map((s) => ({
        ...s,
        agents: JSON.parse(s.agents),
      }));
      respond(true, parsed);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.arena.create": async ({ params, respond }) => {
    const topic = params.topic as string | undefined;
    if (!topic) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing topic"));
      return;
    }
    try {
      const session = arena.createSession(params.project_id as string | undefined, {
        topic,
        description: params.description as string | undefined,
        agents: params.agents as string[] | undefined,
        mode: params.mode as string | undefined,
      });
      respond(true, { ...session, agents: JSON.parse(session.agents) });
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.arena.messages": async ({ params, respond }) => {
    const sessionId = params.session_id as string | undefined;
    if (!sessionId) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing session_id"));
      return;
    }
    try {
      const messages = arena.listMessages(sessionId, {
        limit: params.limit as number | undefined,
        offset: params.offset as number | undefined,
      });
      respond(true, messages);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },

  "cc.arena.chat": async ({ params, respond }) => {
    const sessionId = params.session_id as string | undefined;
    const content = params.content as string | undefined;
    if (!sessionId || !content) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "missing session_id or content"),
      );
      return;
    }
    try {
      // Verify session exists
      const session = arena.getSession(sessionId);
      if (!session) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "session not found"));
        return;
      }

      // Add the user message
      const userMsg = arena.addMessage(sessionId, {
        sender: (params.sender as string) ?? "user",
        role: "user",
        content,
        target_agent: params.target_agent as string | undefined,
      });

      // If generate_response is requested, use Wildvine's model catalog
      if (params.generate_response !== false) {
        try {
          const agents: string[] = JSON.parse(session.agents);
          const targetAgent = (params.target_agent as string) ?? agents[0] ?? "assistant";

          // Build conversation context from recent messages
          const history = arena.listMessages(sessionId, { limit: 20 });
          const contextMessages = history.map((m) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: `[${m.sender}]: ${m.content}`,
          }));

          // Use model catalog if available
          const modelCatalog = await params._context?.loadGatewayModelCatalog?.();
          if (modelCatalog && modelCatalog.length > 0) {
            // For now, return the user message — AI response generation
            // will be added when model invocation is wired up
            void contextMessages;
          }

          // Add a placeholder assistant response
          const assistantMsg = arena.addMessage(sessionId, {
            sender: targetAgent,
            role: "assistant",
            content: `[Arena response from ${targetAgent}] Acknowledged: "${content.slice(0, 100)}"`,
          });
          respond(true, { user_message: userMsg, assistant_message: assistantMsg });
          return;
        } catch {
          // Fall through to returning just the user message
        }
      }

      respond(true, { user_message: userMsg });
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },
};
