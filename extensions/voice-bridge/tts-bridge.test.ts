import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { TtsBridgeConfig, TtsProvider } from "./tts-bridge.js";

// ---------------------------------------------------------------------------
// Mock the upstream TTS providers from tts-core
// ---------------------------------------------------------------------------

const mockChatterboxTTS = vi.fn();
const mockOpenaiTTS = vi.fn();
const mockElevenLabsTTS = vi.fn();

vi.mock("../../src/tts/tts-core.js", () => ({
  chatterboxTTS: (...args: unknown[]) => mockChatterboxTTS(...args),
  openaiTTS: (...args: unknown[]) => mockOpenaiTTS(...args),
  elevenLabsTTS: (...args: unknown[]) => mockElevenLabsTTS(...args),
}));

// Import after mock setup
const { synthesize, synthesizeWithFallback } = await import("./tts-bridge.js");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides?: Partial<TtsBridgeConfig>): TtsBridgeConfig {
  return {
    provider: "chatterbox",
    chatterbox: { baseUrl: "http://localhost:8004/v1" },
    openai: { apiKey: "test-openai-key", model: "tts-1", voice: "alloy" },
    timeoutMs: 5000,
    ...overrides,
  };
}

const FAKE_AUDIO = Buffer.from("fake-audio-data");

// ---------------------------------------------------------------------------
// Tests: synthesize (single provider)
// ---------------------------------------------------------------------------

describe("synthesize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("chatterbox provider", () => {
    it("calls chatterboxTTS with correct params", async () => {
      mockChatterboxTTS.mockResolvedValue(FAKE_AUDIO);
      const config = makeConfig({ provider: "chatterbox" });

      const result = await synthesize("Hello", config);

      expect(result).toBe(FAKE_AUDIO);
      expect(mockChatterboxTTS).toHaveBeenCalledWith({
        text: "Hello",
        baseUrl: "http://localhost:8004/v1",
        model: "chatterbox-turbo",
        voice: "Emily.wav",
        responseFormat: "wav",
        timeoutMs: 5000,
      });
    });

    it("uses default chatterbox config when none specified", async () => {
      mockChatterboxTTS.mockResolvedValue(FAKE_AUDIO);
      const config = makeConfig({ provider: "chatterbox", chatterbox: undefined });

      await synthesize("Hello", config);

      expect(mockChatterboxTTS).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: "http://127.0.0.1:8004/v1",
          model: "chatterbox-turbo",
          voice: "Emily.wav",
        }),
      );
    });
  });

  describe("openai provider", () => {
    it("calls openaiTTS with correct params", async () => {
      mockOpenaiTTS.mockResolvedValue(FAKE_AUDIO);
      const config = makeConfig({ provider: "openai" });

      const result = await synthesize("Hello", config);

      expect(result).toBe(FAKE_AUDIO);
      expect(mockOpenaiTTS).toHaveBeenCalledWith({
        text: "Hello",
        apiKey: "test-openai-key",
        model: "tts-1",
        voice: "alloy",
        responseFormat: "mp3",
        timeoutMs: 5000,
      });
    });

    it("throws when openai apiKey is missing", async () => {
      const config = makeConfig({
        provider: "openai",
        openai: undefined,
      });

      await expect(synthesize("Hello", config)).rejects.toThrow("OpenAI TTS: apiKey is required");
    });

    it("uses default model and voice when not specified", async () => {
      mockOpenaiTTS.mockResolvedValue(FAKE_AUDIO);
      const config = makeConfig({
        provider: "openai",
        openai: { apiKey: "key" },
      });

      await synthesize("Hello", config);

      expect(mockOpenaiTTS).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "tts-1",
          voice: "alloy",
        }),
      );
    });
  });

  describe("elevenlabs provider", () => {
    it("calls elevenLabsTTS with correct params", async () => {
      mockElevenLabsTTS.mockResolvedValue(FAKE_AUDIO);
      const config = makeConfig({
        provider: "elevenlabs",
        elevenlabs: { apiKey: "test-el-key" },
      });

      const result = await synthesize("Hello", config);

      expect(result).toBe(FAKE_AUDIO);
      expect(mockElevenLabsTTS).toHaveBeenCalledWith(
        expect.objectContaining({
          text: "Hello",
          apiKey: "test-el-key",
          baseUrl: "https://api.elevenlabs.io",
          voiceId: "pMsXgVXv3BLzUgSXRplE",
          modelId: "eleven_multilingual_v2",
          outputFormat: "mp3_44100_128",
          timeoutMs: 5000,
        }),
      );
    });

    it("throws when elevenlabs apiKey is missing", async () => {
      const config = makeConfig({
        provider: "elevenlabs",
        elevenlabs: undefined,
      });

      await expect(synthesize("Hello", config)).rejects.toThrow(
        "ElevenLabs TTS: apiKey is required",
      );
    });
  });

  describe("unknown provider", () => {
    it("throws for unknown provider", async () => {
      const config = makeConfig({ provider: "unknown" as TtsProvider });

      await expect(synthesize("Hello", config)).rejects.toThrow("Unknown TTS provider: unknown");
    });
  });

  describe("timeout defaults", () => {
    it("uses 30s default timeout when not configured", async () => {
      mockChatterboxTTS.mockResolvedValue(FAKE_AUDIO);
      const config = makeConfig({
        provider: "chatterbox",
        timeoutMs: undefined,
      });

      await synthesize("Hello", config);

      expect(mockChatterboxTTS).toHaveBeenCalledWith(
        expect.objectContaining({ timeoutMs: 30_000 }),
      );
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: synthesizeWithFallback
// ---------------------------------------------------------------------------

describe("synthesizeWithFallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns chatterbox audio when chatterbox succeeds", async () => {
    mockChatterboxTTS.mockResolvedValue(FAKE_AUDIO);
    const config = makeConfig();

    const result = await synthesizeWithFallback("Hello", config);

    expect(result).not.toBeNull();
    expect(result!.provider).toBe("chatterbox");
    expect(result!.audio).toBe(FAKE_AUDIO);
    // OpenAI should not have been called
    expect(mockOpenaiTTS).not.toHaveBeenCalled();
  });

  it("falls back to openai when chatterbox fails", async () => {
    mockChatterboxTTS.mockRejectedValue(new Error("Chatterbox connection refused"));
    const openaiAudio = Buffer.from("openai-audio");
    mockOpenaiTTS.mockResolvedValue(openaiAudio);
    const config = makeConfig();

    const result = await synthesizeWithFallback("Hello", config);

    expect(result).not.toBeNull();
    expect(result!.provider).toBe("openai");
    expect(result!.audio).toBe(openaiAudio);
  });

  it("returns null when all providers fail", async () => {
    mockChatterboxTTS.mockRejectedValue(new Error("Chatterbox down"));
    mockOpenaiTTS.mockRejectedValue(new Error("OpenAI rate limited"));
    const config = makeConfig();

    const result = await synthesizeWithFallback("Hello", config);

    expect(result).toBeNull();
  });

  it("returns null when chatterbox fails and openai has no apiKey", async () => {
    mockChatterboxTTS.mockRejectedValue(new Error("Chatterbox down"));
    const config = makeConfig({ openai: undefined });

    const result = await synthesizeWithFallback("Hello", config);

    expect(result).toBeNull();
    // OpenAI should not have been attempted without an API key
    expect(mockOpenaiTTS).not.toHaveBeenCalled();
  });

  it("skips openai when apiKey is empty string", async () => {
    mockChatterboxTTS.mockRejectedValue(new Error("Chatterbox down"));
    const config = makeConfig({ openai: { apiKey: "" } });

    const result = await synthesizeWithFallback("Hello", config);

    expect(result).toBeNull();
    expect(mockOpenaiTTS).not.toHaveBeenCalled();
  });

  it("calls onError for each failed provider", async () => {
    const chatterboxError = new Error("Chatterbox timeout");
    const openaiError = new Error("OpenAI 500");
    mockChatterboxTTS.mockRejectedValue(chatterboxError);
    mockOpenaiTTS.mockRejectedValue(openaiError);
    const onError = vi.fn();
    const config = makeConfig();

    await synthesizeWithFallback("Hello", config, onError);

    expect(onError).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledWith("chatterbox", chatterboxError);
    expect(onError).toHaveBeenCalledWith("openai", openaiError);
  });

  it("does not call onError when chatterbox succeeds", async () => {
    mockChatterboxTTS.mockResolvedValue(FAKE_AUDIO);
    const onError = vi.fn();
    const config = makeConfig();

    await synthesizeWithFallback("Hello", config, onError);

    expect(onError).not.toHaveBeenCalled();
  });

  it("wraps non-Error throws in Error objects for onError", async () => {
    mockChatterboxTTS.mockRejectedValue("string error");
    const onError = vi.fn();
    const config = makeConfig({ openai: undefined });

    await synthesizeWithFallback("Hello", config, onError);

    expect(onError).toHaveBeenCalledWith(
      "chatterbox",
      expect.objectContaining({ message: "string error" }),
    );
  });

  it("uses custom chatterbox config in fallback", async () => {
    mockChatterboxTTS.mockResolvedValue(FAKE_AUDIO);
    const config = makeConfig({
      chatterbox: {
        baseUrl: "http://custom:9999/v1",
        model: "custom-model",
        voice: "CustomVoice.wav",
      },
    });

    await synthesizeWithFallback("Hello", config);

    expect(mockChatterboxTTS).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "http://custom:9999/v1",
        model: "custom-model",
        voice: "CustomVoice.wav",
      }),
    );
  });

  it("respects configured timeout in fallback", async () => {
    mockChatterboxTTS.mockResolvedValue(FAKE_AUDIO);
    const config = makeConfig({ timeoutMs: 10_000 });

    await synthesizeWithFallback("Hello", config);

    expect(mockChatterboxTTS).toHaveBeenCalledWith(expect.objectContaining({ timeoutMs: 10_000 }));
  });

  it("uses 30s default timeout in fallback when not configured", async () => {
    mockChatterboxTTS.mockResolvedValue(FAKE_AUDIO);
    const config = makeConfig({ timeoutMs: undefined });

    await synthesizeWithFallback("Hello", config);

    expect(mockChatterboxTTS).toHaveBeenCalledWith(expect.objectContaining({ timeoutMs: 30_000 }));
  });
});
