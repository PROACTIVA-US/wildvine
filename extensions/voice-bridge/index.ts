/**
 * Voice Bridge Extension
 *
 * Embeds voice interaction directly into Wildvine's gateway — replacing the
 * standalone veria-talk server. Provides:
 *
 * - Deepgram streaming STT (Nova-3)
 * - Response via Wildvine's agent (with full CC tool access)
 * - TTS via Wildvine's existing multi-provider system (OpenAI/ElevenLabs/Chatterbox)
 *
 * Gateway RPCs: voice.start, voice.stop, voice.status, voice.config
 * Service: voicebridge (lifecycle management)
 *
 * The actual audio WebSocket is handled at the gateway level (/voice endpoint)
 * — see src/gateway/voice-ws.ts. This extension registers the RPC methods
 * and manages configuration.
 */

import type { WildvinePluginApi } from "wildvine/plugin-sdk";
import type { TtsProvider } from "./tts-bridge.js";

export type VoiceBridgeConfig = {
  enabled: boolean;
  deepgramApiKey?: string;
  deepgramModel?: string;
  ttsProvider: TtsProvider;
  tts?: {
    openai?: { apiKey?: string; model?: string; voice?: string };
    elevenlabs?: { apiKey?: string; voiceId?: string; modelId?: string };
    chatterbox?: { baseUrl?: string; model?: string; voice?: string };
  };
  timeoutMs?: number;
};

type ActiveSession = {
  sessionId: string;
  startedAt: number;
  state: string;
};

// Track active voice sessions globally
const activeSessions = new Map<string, ActiveSession>();

function resolveConfig(pluginConfig: Record<string, unknown> | undefined): VoiceBridgeConfig {
  const raw = pluginConfig ?? {};
  return {
    enabled: raw.enabled !== false,
    deepgramApiKey:
      (raw.deepgramApiKey as string) ??
      (raw.deepgram_api_key as string) ??
      process.env.DEEPGRAM_API_KEY ??
      "",
    deepgramModel: (raw.deepgramModel as string) ?? "nova-3",
    ttsProvider: ((raw.ttsProvider as string) ?? "chatterbox") as TtsProvider,
    tts: (raw.tts as VoiceBridgeConfig["tts"]) ?? {},
    timeoutMs: (raw.timeoutMs as number) ?? 30_000,
  };
}

function resolveTtsApiKey(config: VoiceBridgeConfig, provider: TtsProvider): string {
  switch (provider) {
    case "openai":
      return config.tts?.openai?.apiKey ?? process.env.OPENAI_API_KEY ?? "";
    case "elevenlabs":
      return config.tts?.elevenlabs?.apiKey ?? process.env.ELEVENLABS_API_KEY ?? "";
    case "chatterbox":
      return ""; // Chatterbox is local, no API key needed
  }
}

export default {
  id: "voice-bridge",
  name: "Voice Bridge",
  description:
    "Persistent voice interface for Wildvine — Deepgram STT, agent routing, multi-provider TTS",

  register(api: WildvinePluginApi) {
    const config = resolveConfig(api.pluginConfig);

    if (!config.enabled) {
      api.logger.info("voice-bridge: disabled in config");
      return;
    }

    // ── Gateway RPC: voice.status ──────────────────────────────

    api.registerGatewayMethod("voice.status", async ({ respond }) => {
      const sessions = Array.from(activeSessions.values());
      respond(true, {
        enabled: config.enabled,
        hasDeepgramKey: Boolean(config.deepgramApiKey),
        ttsProvider: config.ttsProvider,
        activeSessions: sessions.length,
        sessions,
      });
    });

    // ── Gateway RPC: voice.config ──────────────────────────────

    api.registerGatewayMethod("voice.config", async ({ params, respond }) => {
      // Allow querying or updating voice config
      if (Object.keys(params).length === 0) {
        // Query mode — return current config (masking keys)
        respond(true, {
          enabled: config.enabled,
          deepgramModel: config.deepgramModel,
          ttsProvider: config.ttsProvider,
          hasDeepgramKey: Boolean(config.deepgramApiKey),
          hasTtsKey: Boolean(resolveTtsApiKey(config, config.ttsProvider)),
          tts: {
            openai: {
              model: config.tts?.openai?.model ?? "tts-1",
              voice: config.tts?.openai?.voice ?? "alloy",
            },
            elevenlabs: {
              voiceId: config.tts?.elevenlabs?.voiceId ?? "pMsXgVXv3BLzUgSXRplE",
              modelId: config.tts?.elevenlabs?.modelId ?? "eleven_multilingual_v2",
            },
            chatterbox: {
              baseUrl: config.tts?.chatterbox?.baseUrl ?? "http://127.0.0.1:8004/v1",
              model: config.tts?.chatterbox?.model ?? "chatterbox-turbo",
              voice: config.tts?.chatterbox?.voice ?? "Emily.wav",
            },
          },
        });
        return;
      }

      // Update mode — apply config changes for this session
      if (typeof params.ttsProvider === "string") {
        config.ttsProvider = params.ttsProvider as TtsProvider;
      }
      if (typeof params.deepgramModel === "string") {
        config.deepgramModel = params.deepgramModel;
      }

      respond(true, {
        updated: true,
        ttsProvider: config.ttsProvider,
        deepgramModel: config.deepgramModel,
      });
    });

    // ── Gateway RPC: voice.start ───────────────────────────────

    api.registerGatewayMethod("voice.start", async ({ params, respond }) => {
      const sessionId = (params.sessionId as string) ?? `voice-${Date.now()}`;

      if (!config.deepgramApiKey) {
        respond(false, {
          error: "Deepgram API key not configured. Set DEEPGRAM_API_KEY or plugin config.",
        });
        return;
      }

      activeSessions.set(sessionId, {
        sessionId,
        startedAt: Date.now(),
        state: "started",
      });

      respond(true, {
        sessionId,
        message: "Voice session registered. Connect via WebSocket at /voice to stream audio.",
        wsPath: "/voice",
      });
    });

    // ── Gateway RPC: voice.stop ────────────────────────────────

    api.registerGatewayMethod("voice.stop", async ({ params, respond }) => {
      const sessionId = params.sessionId as string;
      if (!sessionId) {
        respond(false, { error: "sessionId is required" });
        return;
      }

      const removed = activeSessions.delete(sessionId);
      respond(true, { sessionId, stopped: removed });
    });

    // ── Service lifecycle ──────────────────────────────────────

    api.registerService({
      id: "voicebridge",
      start: async () => {
        if (!config.enabled) return;
        api.logger.info(
          `voice-bridge: ready (STT: Deepgram ${config.deepgramModel}, TTS: ${config.ttsProvider})`,
        );
      },
      stop: async () => {
        // Clean up any active sessions
        activeSessions.clear();
        api.logger.info("voice-bridge: stopped");
      },
    });

    // ── Hook: before_agent_start ──────────────────────────────

    api.on("before_agent_start", async () => {
      if (!config.enabled || !config.deepgramApiKey) return;
      return {
        prependContext:
          "[Voice Bridge active] Voice interaction is available. " +
          "Users can speak commands which will be transcribed and routed through you. " +
          "You have access to all CC tools (KB, pipelines, governor, arena) via voice.",
      };
    });

    api.logger.info(
      `voice-bridge: registered (STT: Deepgram ${config.deepgramModel}, TTS: ${config.ttsProvider})`,
    );
  },
};

/** Exported for use by voice-ws.ts gateway handler */
export { VoiceSession, type VoiceSessionConfig } from "./session.js";
export { DeepgramStt } from "./stt.js";
export {
  synthesize,
  synthesizeWithFallback,
  type TtsBridgeConfig,
  type FallbackResult,
} from "./tts-bridge.js";
