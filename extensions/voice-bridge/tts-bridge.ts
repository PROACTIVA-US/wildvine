/**
 * TTS Bridge
 *
 * Thin wrapper around Wildvine's existing TTS system (src/tts/tts-core.ts).
 * Synthesizes text to audio bytes using whatever provider is configured.
 */

import { chatterboxTTS, elevenLabsTTS, openaiTTS } from "../../src/tts/tts-core.js";

export type TtsProvider = "openai" | "elevenlabs" | "chatterbox";

export type TtsBridgeConfig = {
  provider: TtsProvider;
  openai?: {
    apiKey: string;
    model?: string;
    voice?: string;
  };
  elevenlabs?: {
    apiKey: string;
    voiceId?: string;
    modelId?: string;
  };
  chatterbox?: {
    baseUrl?: string;
    model?: string;
    voice?: string;
  };
  timeoutMs?: number;
};

/**
 * Synthesize text to audio bytes using the configured TTS provider.
 * Returns a Buffer of audio data (WAV/MP3/Opus depending on provider).
 */
export async function synthesize(text: string, config: TtsBridgeConfig): Promise<Buffer> {
  const timeoutMs = config.timeoutMs ?? 30_000;

  switch (config.provider) {
    case "openai": {
      const c = config.openai;
      if (!c?.apiKey) throw new Error("OpenAI TTS: apiKey is required");
      return openaiTTS({
        text,
        apiKey: c.apiKey,
        model: c.model ?? "tts-1",
        voice: c.voice ?? "alloy",
        responseFormat: "mp3",
        timeoutMs,
      });
    }

    case "elevenlabs": {
      const c = config.elevenlabs;
      if (!c?.apiKey) throw new Error("ElevenLabs TTS: apiKey is required");
      return elevenLabsTTS({
        text,
        apiKey: c.apiKey,
        baseUrl: "https://api.elevenlabs.io",
        voiceId: c.voiceId ?? "pMsXgVXv3BLzUgSXRplE",
        modelId: c.modelId ?? "eleven_multilingual_v2",
        outputFormat: "mp3_44100_128",
        voiceSettings: {
          stability: 0.5,
          similarityBoost: 0.75,
          style: 0.0,
          useSpeakerBoost: true,
          speed: 1.0,
        },
        timeoutMs,
      });
    }

    case "chatterbox": {
      const c = config.chatterbox;
      return chatterboxTTS({
        text,
        baseUrl: c?.baseUrl ?? "http://127.0.0.1:8004/v1",
        model: c?.model ?? "chatterbox-turbo",
        voice: c?.voice ?? "Emily.wav",
        responseFormat: "wav",
        timeoutMs,
      });
    }

    default:
      throw new Error(`Unknown TTS provider: ${config.provider}`);
  }
}

/** Result of a fallback synthesis attempt. */
export type FallbackResult = {
  audio: Buffer;
  provider: TtsProvider;
} | null;

/**
 * Synthesize text using a provider fallback chain:
 *   1. Chatterbox (local, no API key needed)
 *   2. OpenAI (requires API key in config)
 *   3. null (text-only mode — caller should still deliver text)
 *
 * Each provider is only attempted if it has the required configuration.
 * Errors from one provider are logged via `onError` and the next is tried.
 */
export async function synthesizeWithFallback(
  text: string,
  config: TtsBridgeConfig,
  onError?: (provider: TtsProvider, error: Error) => void,
): Promise<FallbackResult> {
  const timeoutMs = config.timeoutMs ?? 30_000;

  // 1. Try Chatterbox first (local, no API key)
  try {
    const c = config.chatterbox;
    const audio = await chatterboxTTS({
      text,
      baseUrl: c?.baseUrl ?? "http://127.0.0.1:8004/v1",
      model: c?.model ?? "chatterbox-turbo",
      voice: c?.voice ?? "Emily.wav",
      responseFormat: "wav",
      timeoutMs,
    });
    return { audio, provider: "chatterbox" };
  } catch (err) {
    onError?.("chatterbox", err instanceof Error ? err : new Error(String(err)));
  }

  // 2. Try OpenAI
  if (config.openai?.apiKey) {
    try {
      const c = config.openai;
      const audio = await openaiTTS({
        text,
        apiKey: c.apiKey,
        model: c.model ?? "tts-1",
        voice: c.voice ?? "alloy",
        responseFormat: "mp3",
        timeoutMs,
      });
      return { audio, provider: "openai" };
    } catch (err) {
      onError?.("openai", err instanceof Error ? err : new Error(String(err)));
    }
  }

  // 3. All providers failed — return null (text-only mode)
  return null;
}
