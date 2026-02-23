/**
 * Voice WebSocket Handler
 *
 * Handles the /voice WebSocket endpoint on the Wildvine gateway.
 * Accepts binary audio frames and JSON control messages, routes through
 * the voice-bridge extension for STT → Agent → TTS processing.
 *
 * Protocol:
 *   Client → Server (binary):  raw audio frames (Opus/WebM from MediaRecorder)
 *   Client → Server (JSON):    {"type": "start"} | {"type": "stop"} | {"type": "config", ...}
 *   Server → Client (JSON):    {"type": "transcript", "text": "...", "is_final": bool}
 *   Server → Client (JSON):    {"type": "response", "text": "..."}
 *   Server → Client (JSON):    {"type": "audio", "data": "<base64>"}
 *   Server → Client (JSON):    {"type": "audio_end"}
 *   Server → Client (JSON):    {"type": "error", "message": "..."}
 */

import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer, WebSocket } from "ws";
import type { TtsBridgeConfig, TtsProvider } from "../../extensions/voice-bridge/tts-bridge.js";
import {
  VoiceSession,
  splitSentences,
  type VoiceSessionConfig,
} from "../../extensions/voice-bridge/session.js";
import { agentCommand } from "../commands/agent.js";

export const VOICE_WS_PATH = "/voice";

export type VoiceWsConfig = {
  deepgramApiKey: string;
  deepgramModel?: string;
  ttsProvider: TtsProvider;
  tts?: {
    openai?: { apiKey?: string; model?: string; voice?: string };
    elevenlabs?: { apiKey?: string; voiceId?: string; modelId?: string };
    chatterbox?: { baseUrl?: string; model?: string; voice?: string };
  };
  /** Agent ID for routing voice commands (defaults to default agent) */
  agentId?: string;
  /** Session key prefix for voice sessions (defaults to "voice") */
  sessionKeyPrefix?: string;
  timeoutMs?: number;
  logger?: {
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
  };
};

type VoiceWsLogger = NonNullable<VoiceWsConfig["logger"]>;

const defaultLogger: VoiceWsLogger = {
  info: (msg: string) => console.log(`[voice-ws] ${msg}`),
  warn: (msg: string) => console.warn(`[voice-ws] ${msg}`),
  error: (msg: string) => console.error(`[voice-ws] ${msg}`),
};

/** Active voice sessions indexed by WebSocket */
const sessions = new Map<WebSocket, VoiceSession>();

/** The dedicated WebSocket server for voice connections */
let voiceWss: WebSocketServer | null = null;

/**
 * Create and return the voice WebSocket server.
 * Uses noServer mode — upgrades are handled externally.
 */
export function getOrCreateVoiceWss(): WebSocketServer {
  if (!voiceWss) {
    voiceWss = new WebSocketServer({ noServer: true });
  }
  return voiceWss;
}

/**
 * Handle a WebSocket upgrade for the /voice path.
 * Called from the gateway's HTTP server upgrade handler.
 */
export function handleVoiceUpgrade(
  req: IncomingMessage,
  socket: Duplex,
  head: Buffer,
  config: VoiceWsConfig,
): void {
  const wss = getOrCreateVoiceWss();
  const log = config.logger ?? defaultLogger;

  wss.handleUpgrade(req, socket, head, (ws) => {
    log.info("voice WebSocket connected");
    handleVoiceConnection(ws, config, log);
  });
}

function buildTtsConfig(config: VoiceWsConfig): TtsBridgeConfig {
  const provider = config.ttsProvider;
  return {
    provider,
    openai: config.tts?.openai
      ? {
          apiKey: config.tts.openai.apiKey ?? process.env.OPENAI_API_KEY ?? "",
          model: config.tts.openai.model,
          voice: config.tts.openai.voice,
        }
      : undefined,
    elevenlabs: config.tts?.elevenlabs
      ? {
          apiKey: config.tts.elevenlabs.apiKey ?? process.env.ELEVENLABS_API_KEY ?? "",
          voiceId: config.tts.elevenlabs.voiceId,
          modelId: config.tts.elevenlabs.modelId,
        }
      : undefined,
    chatterbox: config.tts?.chatterbox ?? undefined,
    timeoutMs: config.timeoutMs,
  };
}

function handleVoiceConnection(ws: WebSocket, config: VoiceWsConfig, log: VoiceWsLogger): void {
  let session: VoiceSession | null = null;

  ws.on("message", (data: Buffer | string, isBinary: boolean) => {
    if (isBinary) {
      // Binary frame = audio data from MediaRecorder
      const audioBytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
      if (session) {
        session.handleAudio(audioBytes);
      }
      return;
    }

    // Text frame = JSON control message (ws library delivers as Buffer by default)
    const text = typeof data === "string" ? data : data.toString("utf8");
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(text) as Record<string, unknown>;
    } catch {
      sendJson(ws, { type: "error", message: "Invalid JSON" });
      return;
    }

    void handleControlMessage(ws, msg, config, log);
  });

  ws.on("close", () => {
    log.info("voice WebSocket disconnected");
    if (session) {
      void session.close();
      sessions.delete(ws);
      session = null;
    }
  });

  ws.on("error", (err) => {
    log.error(`voice WebSocket error: ${err.message}`);
  });

  // Helper to manage session reference from closure
  async function handleControlMessage(
    ws: WebSocket,
    msg: Record<string, unknown>,
    config: VoiceWsConfig,
    log: VoiceWsLogger,
  ): Promise<void> {
    const type = msg.type as string;

    switch (type) {
      case "start": {
        if (session) {
          sendJson(ws, { type: "error", message: "Session already active" });
          return;
        }

        if (!config.deepgramApiKey) {
          sendJson(ws, {
            type: "error",
            message: "Deepgram API key not configured",
          });
          return;
        }

        const sessionId = `voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const sessionKeyPrefix = config.sessionKeyPrefix ?? "voice";
        const agentId = config.agentId;
        const sessionKey = agentId ? `${agentId}:${sessionKeyPrefix}` : sessionKeyPrefix;

        const sessionConfig: VoiceSessionConfig = {
          deepgramApiKey: config.deepgramApiKey,
          deepgramModel: config.deepgramModel,
          tts: buildTtsConfig(config),
          logger: log,
          getAgentResponse: createAgentResponseGenerator(sessionKey, agentId, log),
        };

        session = new VoiceSession(ws, sessionId, sessionConfig);
        sessions.set(ws, session);

        try {
          await session.start();
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          log.error(`Failed to start voice session: ${errMsg}`);
          sendJson(ws, { type: "error", message: `Failed to start: ${errMsg}` });
          sessions.delete(ws);
          session = null;
        }
        break;
      }

      case "stop": {
        if (session) {
          await session.close();
          sessions.delete(ws);
          session = null;
          sendJson(ws, { type: "session_ended" });
        }
        break;
      }

      case "config": {
        // Allow runtime config changes (e.g., switch TTS provider)
        if (typeof msg.ttsProvider === "string") {
          config.ttsProvider = msg.ttsProvider as TtsProvider;
        }
        sendJson(ws, {
          type: "config_updated",
          ttsProvider: config.ttsProvider,
        });
        break;
      }

      default:
        sendJson(ws, { type: "error", message: `Unknown message type: ${type}` });
    }
  }
}

/**
 * Create an async generator that sends transcript text to the Wildvine agent
 * and yields the response split into sentences for streaming TTS.
 */
function createAgentResponseGenerator(
  sessionKey: string,
  agentId: string | undefined,
  log: VoiceWsLogger,
): (transcript: string) => AsyncGenerator<string, void, unknown> {
  return async function* (transcript: string) {
    log.info(`agent request: "${transcript.substring(0, 80)}..."`);

    try {
      const result = await agentCommand({
        message: transcript,
        sessionKey,
        agentId,
        messageChannel: "voice-bridge",
        timeout: "60",
      });

      const responseText = result.payloads.map((p) => p.text).join("\n");
      log.info(`agent response: "${responseText.substring(0, 80)}..."`);

      // Split into sentences and yield each for TTS
      for (const sentence of splitSentences(responseText)) {
        yield sentence;
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      log.error(`agent error: ${errMsg}`);
      yield `Sorry, I encountered an error: ${errMsg}`;
    }
  };
}

function sendJson(ws: WebSocket, msg: Record<string, unknown>): void {
  if (ws.readyState !== WebSocket.OPEN) {
    return;
  }
  ws.send(JSON.stringify(msg));
}

/** Get count of active voice sessions (for status/health). */
export function getActiveVoiceSessionCount(): number {
  return sessions.size;
}
