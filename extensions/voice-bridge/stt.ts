/**
 * Deepgram Streaming STT Client
 *
 * Opens a persistent WebSocket to Deepgram's real-time transcription API.
 * Accepts raw audio frames (Opus/WebM) and emits transcript callbacks.
 *
 * Reference: veria-talk/server/stt.py
 */

import WebSocket from "ws";

export type TranscriptCallback = (text: string, isFinal: boolean) => void | Promise<void>;

export type DeepgramSttOptions = {
  apiKey: string;
  model?: string;
  encoding?: string;
  sampleRate?: number;
  channels?: number;
  /** Milliseconds of silence before Deepgram emits UtteranceEnd (default 1200) */
  utteranceEndMs?: number;
  onTranscript: TranscriptCallback;
  onError?: (error: Error) => void;
  onClose?: () => void;
};

const DEEPGRAM_WS_URL = "wss://api.deepgram.com/v1/listen";

export class DeepgramStt {
  private ws: WebSocket | null = null;
  private connected = false;
  private readonly opts: Required<
    Pick<DeepgramSttOptions, "model" | "encoding" | "sampleRate" | "channels" | "utteranceEndMs">
  > &
    DeepgramSttOptions;

  constructor(options: DeepgramSttOptions) {
    this.opts = {
      model: "nova-3",
      encoding: "opus",
      sampleRate: 48_000,
      channels: 1,
      utteranceEndMs: 1200,
      ...options,
    };
  }

  /** Open the Deepgram WebSocket connection and start listening for results. */
  async start(): Promise<void> {
    if (this.connected) return;

    const params = new URLSearchParams({
      encoding: this.opts.encoding,
      sample_rate: String(this.opts.sampleRate),
      channels: String(this.opts.channels),
      model: this.opts.model,
      punctuate: "true",
      interim_results: "true",
      utterance_end_ms: String(this.opts.utteranceEndMs),
      vad_events: "true",
      smart_format: "true",
    });

    const url = `${DEEPGRAM_WS_URL}?${params.toString()}`;

    return new Promise<void>((resolve, reject) => {
      this.ws = new WebSocket(url, {
        headers: { Authorization: `Token ${this.opts.apiKey}` },
      });

      this.ws.on("open", () => {
        this.connected = true;
        resolve();
      });

      this.ws.on("message", (data: WebSocket.Data) => {
        this.handleMessage(data);
      });

      this.ws.on("error", (err: Error) => {
        if (!this.connected) {
          reject(err);
          return;
        }
        this.opts.onError?.(err);
      });

      this.ws.on("close", () => {
        this.connected = false;
        this.opts.onClose?.();
      });
    });
  }

  /** Send raw audio bytes to Deepgram for transcription. */
  sendAudio(audioBytes: Buffer | Uint8Array): void {
    if (!this.connected || !this.ws) return;
    this.ws.send(audioBytes);
  }

  /** Gracefully close the Deepgram connection. */
  async stop(): Promise<void> {
    if (!this.ws) return;
    if (this.connected) {
      // Send CloseStream message per Deepgram protocol
      this.ws.send(JSON.stringify({ type: "CloseStream" }));
    }
    this.ws.close();
    this.ws = null;
    this.connected = false;
  }

  get isConnected(): boolean {
    return this.connected;
  }

  private handleMessage(data: WebSocket.Data): void {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(String(data)) as Record<string, unknown>;
    } catch {
      return;
    }

    const type = msg.type as string | undefined;

    if (type === "Results") {
      const channel = msg.channel as { alternatives?: Array<{ transcript?: string }> } | undefined;
      const transcript = channel?.alternatives?.[0]?.transcript ?? "";
      const isFinal = Boolean(msg.is_final);

      if (transcript.trim()) {
        void Promise.resolve(this.opts.onTranscript(transcript, isFinal));
      }
    } else if (type === "UtteranceEnd") {
      // Deepgram detected end of speech — treat as final if we have buffered text
      // This is handled by the session layer
    } else if (type === "Error") {
      const errorMsg = (msg.message as string) ?? "Deepgram STT error";
      this.opts.onError?.(new Error(errorMsg));
    }
  }
}
