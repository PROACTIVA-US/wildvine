import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { VoiceSession, splitSentences, type VoiceSessionConfig } from "./session.js";

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

// Mock STT — avoid real Deepgram WebSocket connections
vi.mock("./stt.js", () => {
  const MockDeepgramStt = class {
    start = vi.fn().mockResolvedValue(undefined);
    stop = vi.fn().mockResolvedValue(undefined);
    sendAudio = vi.fn();
    constructor(_opts: unknown) {
      // no-op
    }
  };
  return { DeepgramStt: MockDeepgramStt };
});

// Mock TTS — avoid real network calls
vi.mock("./tts-bridge.js", () => ({
  synthesize: vi.fn().mockResolvedValue(Buffer.from("fake-audio")),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal WebSocket stub with just enough API surface for VoiceSession. */
function createMockWs() {
  const sent: string[] = [];
  return {
    OPEN: 1 as const,
    readyState: 1,
    send: vi.fn((data: string) => sent.push(data)),
    /** All JSON messages sent over the wire. */
    get messages(): Record<string, unknown>[] {
      return sent.map((s) => JSON.parse(s) as Record<string, unknown>);
    },
  };
}

function makeConfig(overrides?: Partial<VoiceSessionConfig>): VoiceSessionConfig {
  return {
    deepgramApiKey: "test-key",
    tts: {
      provider: "chatterbox",
      chatterbox: { baseUrl: "http://localhost:8004/v1" },
    },
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests: VoiceSession state machine
// ---------------------------------------------------------------------------

describe("VoiceSession", () => {
  let ws: ReturnType<typeof createMockWs>;
  let config: VoiceSessionConfig;
  let session: VoiceSession;

  beforeEach(() => {
    ws = createMockWs();
    config = makeConfig();
    // Cast the mock WS to satisfy the WebSocket type constraint
    session = new VoiceSession(ws as never, "test-session-1", config);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── State transitions ───────────────────────────────────────

  describe("state transitions", () => {
    it("starts in idle state", () => {
      expect(session.getState()).toBe("idle");
    });

    it("transitions from idle to listening on start()", async () => {
      await session.start();
      expect(session.getState()).toBe("listening");
    });

    it("sends session_started message on start()", async () => {
      await session.start();
      const msgs = ws.messages;
      expect(msgs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: "session_started",
            session_id: "test-session-1",
          }),
        ]),
      );
    });

    it("does not restart if already listening", async () => {
      await session.start();
      await session.start(); // second call should be a no-op
      expect(session.getState()).toBe("listening");
      // Only one session_started message
      const startMsgs = ws.messages.filter((m) => m.type === "session_started");
      expect(startMsgs).toHaveLength(1);
    });

    it("transitions to closed on close()", async () => {
      await session.start();
      await session.close();
      expect(session.getState()).toBe("closed");
    });

    it("can close from idle state", async () => {
      await session.close();
      expect(session.getState()).toBe("closed");
    });

    it("closing twice is a no-op", async () => {
      await session.start();
      await session.close();
      await session.close();
      expect(session.getState()).toBe("closed");
    });
  });

  // ── Audio handling ──────────────────────────────────────────

  describe("handleAudio", () => {
    it("ignores audio when in idle state", () => {
      session.handleAudio(Buffer.from("audio-data"));
      // No error thrown, audio is silently dropped
      expect(session.getState()).toBe("idle");
    });

    it("ignores audio when in closed state", async () => {
      await session.start();
      await session.close();
      session.handleAudio(Buffer.from("audio-data"));
      expect(session.getState()).toBe("closed");
    });

    it("forwards audio to STT when listening", async () => {
      await session.start();
      session.handleAudio(Buffer.from("audio-data"));
      // No error thrown — audio is forwarded to the mocked STT
      expect(session.getState()).toBe("listening");
    });
  });

  // ── Session cleanup ─────────────────────────────────────────

  describe("cleanup", () => {
    it("stops STT on close", async () => {
      await session.start();
      await session.close();
      expect(session.getState()).toBe("closed");
    });

    it("sets STT to null after close", async () => {
      await session.start();
      await session.close();
      // After close, handleAudio should not throw even though STT is null
      session.handleAudio(Buffer.from("data"));
      expect(session.getState()).toBe("closed");
    });

    it("logs session lifecycle events", async () => {
      const logger = config.logger!;
      await session.start();
      expect(logger.info).toHaveBeenCalledWith("session started");

      await session.close();
      expect(logger.info).toHaveBeenCalledWith("session closed");
    });
  });

  // ── WebSocket error resilience ──────────────────────────────

  describe("sendJson resilience", () => {
    it("does not send when WebSocket is not open", async () => {
      ws.readyState = 3; // CLOSED
      await session.start();
      // session_started should not have been sent
      expect(ws.send).not.toHaveBeenCalled();
    });
  });

  // ── Session ID ──────────────────────────────────────────────

  describe("session id", () => {
    it("exposes the session id", () => {
      expect(session.id).toBe("test-session-1");
    });
  });

  // ── Default logger ──────────────────────────────────────────

  describe("default logger", () => {
    it("uses console-based logger when none provided", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const sessionNoLogger = new VoiceSession(
        ws as never,
        "test-no-logger",
        makeConfig({ logger: undefined }),
      );
      await sessionNoLogger.start();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: splitSentences utility
// ---------------------------------------------------------------------------

describe("splitSentences", () => {
  it("splits on period followed by space", () => {
    const result = [...splitSentences("Hello world. How are you. Fine.")];
    expect(result).toEqual(["Hello world.", "How are you.", "Fine."]);
  });

  it("splits on exclamation mark", () => {
    const result = [...splitSentences("Wow! That is great! Thanks.")];
    expect(result).toEqual(["Wow!", "That is great!", "Thanks."]);
  });

  it("splits on question mark", () => {
    const result = [...splitSentences("How? Why? Because.")];
    expect(result).toEqual(["How?", "Why?", "Because."]);
  });

  it("returns single sentence when no boundary found", () => {
    const result = [...splitSentences("Hello world")];
    expect(result).toEqual(["Hello world"]);
  });

  it("handles empty string", () => {
    const result = [...splitSentences("")];
    expect(result).toEqual([]);
  });

  it("handles whitespace-only string", () => {
    const result = [...splitSentences("   ")];
    expect(result).toEqual([]);
  });

  it("trims whitespace from sentences", () => {
    const result = [...splitSentences("  Hello.   World.  ")];
    expect(result).toEqual(["Hello.", "World."]);
  });

  it("preserves trailing sentence without punctuation", () => {
    const result = [...splitSentences("First sentence. Incomplete")];
    expect(result).toEqual(["First sentence.", "Incomplete"]);
  });

  it("handles multiple spaces between sentences", () => {
    const result = [...splitSentences("One.   Two.   Three.")];
    expect(result).toEqual(["One.", "Two.", "Three."]);
  });

  it("does not split on period without trailing space (e.g. abbreviations in mid-text)", () => {
    // The regex splits on [.!?] followed by \s+, so "Dr.Smith" won't split
    const result = [...splitSentences("Dr.Smith is here")];
    expect(result).toEqual(["Dr.Smith is here"]);
  });
});
