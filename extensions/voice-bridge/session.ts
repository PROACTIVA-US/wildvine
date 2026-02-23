/**
 * Voice Session
 *
 * Manages a single voice conversation session:
 * - Receives transcript from STT
 * - Routes through Wildvine's agent for response (with CC tool access)
 * - Splits response into sentences for streaming TTS
 * - Sends audio back to client
 *
 * Reference: veria-talk/server/ws_handler.py
 */

import type WebSocket from "ws";
import { DeepgramStt } from "./stt.js";
import { synthesize, type TtsBridgeConfig } from "./tts-bridge.js";

/** Regex to split on sentence boundaries (period, exclamation, question mark followed by space) */
const SENTENCE_END = /(?<=[.!?])\s+/;

export type VoiceSessionConfig = {
  deepgramApiKey: string;
  deepgramModel?: string;
  tts: TtsBridgeConfig;
  /** If provided, called to get agent response text (streaming sentences). */
  getAgentResponse?: (transcript: string) => AsyncGenerator<string, void, unknown>;
  logger?: {
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
  };
};

export type VoiceSessionState = "idle" | "listening" | "processing" | "closed";

export class VoiceSession {
  readonly id: string;
  private ws: WebSocket;
  private stt: DeepgramStt | null = null;
  private state: VoiceSessionState = "idle";
  private processing = false;
  private transcriptBuffer = "";
  private config: VoiceSessionConfig;
  private log: NonNullable<VoiceSessionConfig["logger"]>;

  constructor(ws: WebSocket, sessionId: string, config: VoiceSessionConfig) {
    this.ws = ws;
    this.id = sessionId;
    this.config = config;
    this.log = config.logger ?? {
      info: (msg: string) => console.log(`[voice-session:${sessionId}] ${msg}`),
      warn: (msg: string) => console.warn(`[voice-session:${sessionId}] ${msg}`),
      error: (msg: string) => console.error(`[voice-session:${sessionId}] ${msg}`),
    };
  }

  /** Start the STT stream and begin listening for audio. */
  async start(): Promise<void> {
    if (this.state !== "idle") return;

    this.stt = new DeepgramStt({
      apiKey: this.config.deepgramApiKey,
      model: this.config.deepgramModel,
      onTranscript: (text, isFinal) => this.onTranscript(text, isFinal),
      onError: (err) => {
        this.log.error(`STT error: ${err.message}`);
        this.sendJson({ type: "error", message: `STT error: ${err.message}` });
      },
      onClose: () => {
        this.log.info("STT connection closed");
      },
    });

    await this.stt.start();
    this.state = "listening";
    this.sendJson({ type: "session_started", session_id: this.id });
    this.log.info("session started");
  }

  /** Handle incoming audio bytes from the client. */
  handleAudio(audioBytes: Buffer | Uint8Array): void {
    if (this.state !== "listening" && this.state !== "processing") return;
    this.stt?.sendAudio(audioBytes);
  }

  /** Close the session and clean up resources. */
  async close(): Promise<void> {
    if (this.state === "closed") return;
    this.state = "closed";
    await this.stt?.stop();
    this.stt = null;
    this.log.info("session closed");
  }

  getState(): VoiceSessionState {
    return this.state;
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private onTranscript(text: string, isFinal: boolean): void {
    // Send transcript to client for live display
    this.sendJson({ type: "transcript", text, is_final: isFinal });

    if (isFinal && text.trim()) {
      if (this.processing) {
        // Queue the utterance — don't start overlapping responses
        this.transcriptBuffer = text;
        return;
      }
      void this.processUtterance(text);
    }
  }

  private async processUtterance(text: string): Promise<void> {
    this.processing = true;
    this.state = "processing";

    try {
      if (this.config.getAgentResponse) {
        // Stream agent response sentence-by-sentence
        let fullResponse = "";
        for await (const sentence of this.config.getAgentResponse(text)) {
          fullResponse += (fullResponse ? " " : "") + sentence;
          this.sendJson({ type: "response", text: sentence, is_final: false });
          await this.synthesizeAndSend(sentence);
        }
        // Send final complete response
        if (fullResponse) {
          this.sendJson({ type: "response", text: fullResponse, is_final: true });
        }
      } else {
        // No agent configured — echo back the transcript as a placeholder
        const response = `I heard: "${text}"`;
        this.sendJson({ type: "response", text: response, is_final: true });
        await this.synthesizeAndSend(response);
      }

      this.sendJson({ type: "audio_end" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log.error(`Processing error: ${msg}`);
      this.sendJson({ type: "error", message: `Processing error: ${msg}` });
    } finally {
      this.processing = false;
      this.state = (this.state as VoiceSessionState) === "closed" ? "closed" : "listening";

      // Process queued utterance if any
      if (this.transcriptBuffer) {
        const queued = this.transcriptBuffer;
        this.transcriptBuffer = "";
        void this.processUtterance(queued);
      }
    }
  }

  private async synthesizeAndSend(text: string): Promise<void> {
    try {
      const audioBuffer = await synthesize(text, this.config.tts);
      const base64 = audioBuffer.toString("base64");
      this.sendJson({ type: "audio", data: base64 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log.warn(`TTS error: ${msg}`);
      // Don't fail the whole response if TTS fails — text still gets through
    }
  }

  private sendJson(msg: Record<string, unknown>): void {
    if (this.ws.readyState !== this.ws.OPEN) return;
    this.ws.send(JSON.stringify(msg));
  }
}

/**
 * Split text into sentences for streaming TTS.
 * Yields complete sentences as they're found in a streaming text buffer.
 */
export function* splitSentences(text: string): Generator<string> {
  let buffer = text;
  while (true) {
    const match = SENTENCE_END.exec(buffer);
    if (!match) break;

    const sentence = buffer.slice(0, match.index + 1).trim();
    buffer = buffer.slice(match.index + match[0].length);
    if (sentence) yield sentence;
  }
  // Flush remaining
  if (buffer.trim()) yield buffer.trim();
}
