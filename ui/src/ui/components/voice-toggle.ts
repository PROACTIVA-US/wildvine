/**
 * Voice Toggle Component
 *
 * A persistent mic toggle for the Wildvine control dashboard topbar.
 * When active: captures audio via MediaRecorder, streams to /voice WebSocket,
 * displays live transcript, plays TTS audio response.
 *
 * Usage: <voice-toggle .gatewayUrl=${wsUrl}></voice-toggle>
 */

import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";

type VoiceState = "idle" | "connecting" | "listening" | "processing" | "error";

@customElement("voice-toggle")
export class VoiceToggle extends LitElement {
  /** WebSocket URL base for the gateway (e.g., ws://localhost:8080) */
  @property({ type: String }) gatewayUrl = "";

  @state() private voiceState: VoiceState = "idle";
  @state() private transcript = "";
  @state() private lastResponse = "";
  @state() private errorMessage = "";

  private ws: WebSocket | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private audioQueue: ArrayBuffer[] = [];
  private isPlayingAudio = false;

  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .voice-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 1px solid var(--border, #333);
      background: var(--bg-secondary, #1a1a2e);
      color: var(--text-secondary, #888);
      cursor: pointer;
      transition: all 150ms ease-out;
      padding: 0;
      position: relative;
    }

    .voice-btn:hover {
      background: var(--bg-hover, #252540);
      color: var(--text-primary, #eee);
    }

    .voice-btn.active {
      background: var(--accent, #007bff);
      color: #fff;
      border-color: var(--accent, #007bff);
    }

    .voice-btn.active .pulse {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      border: 2px solid var(--accent, #007bff);
      animation: pulse 1.5s ease-out infinite;
    }

    .voice-btn.error {
      border-color: var(--error, #e53935);
      color: var(--error, #e53935);
    }

    .voice-btn.processing {
      background: var(--warning, #ff9800);
      color: #fff;
      border-color: var(--warning, #ff9800);
    }

    @keyframes pulse {
      0% {
        transform: scale(1);
        opacity: 0.6;
      }
      100% {
        transform: scale(1.8);
        opacity: 0;
      }
    }

    .mic-icon {
      width: 16px;
      height: 16px;
    }

    .transcript-bar {
      font-size: 12px;
      color: var(--text-secondary, #888);
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: var(--font-mono, monospace);
    }

    .transcript-bar.final {
      color: var(--text-primary, #eee);
    }
  `;

  render() {
    const isActive = this.voiceState === "listening" || this.voiceState === "processing";
    const btnClass = isActive
      ? this.voiceState === "processing"
        ? "voice-btn processing"
        : "voice-btn active"
      : this.voiceState === "error"
        ? "voice-btn error"
        : "voice-btn";

    return html`
      <button
        class=${btnClass}
        @click=${() => this.toggleVoice()}
        title=${this.voiceState === "idle" ? "Start voice" : this.voiceState === "error" ? this.errorMessage : "Stop voice"}
        aria-label="Voice toggle"
      >
        ${
          isActive
            ? html`
                <span class="pulse"></span>
              `
            : nothing
        }
        <svg class="mic-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
          <line x1="12" y1="19" x2="12" y2="23"></line>
          <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
      </button>
      ${this.transcript ? html`<span class="transcript-bar">${this.transcript}</span>` : nothing}
    `;
  }

  private async toggleVoice(): Promise<void> {
    if (this.voiceState === "idle" || this.voiceState === "error") {
      await this.startVoice();
    } else {
      await this.stopVoice();
    }
  }

  private async startVoice(): Promise<void> {
    this.voiceState = "connecting";
    this.errorMessage = "";
    this.transcript = "";
    this.lastResponse = "";

    try {
      // Request mic access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        },
      });

      // Connect WebSocket
      const wsBase = this.gatewayUrl || this.inferGatewayWsUrl();
      this.ws = new WebSocket(`${wsBase}/voice`);

      this.ws.addEventListener("open", () => {
        // Send start signal
        this.ws?.send(JSON.stringify({ type: "start" }));
        this.startRecording();
        this.voiceState = "listening";
      });

      this.ws.addEventListener("message", (event) => {
        this.handleServerMessage(event.data as string);
      });

      this.ws.addEventListener("error", () => {
        this.voiceState = "error";
        this.errorMessage = "WebSocket connection failed";
        this.cleanup();
      });

      this.ws.addEventListener("close", () => {
        if (this.voiceState !== "idle" && this.voiceState !== "error") {
          this.voiceState = "idle";
          this.cleanup();
        }
      });
    } catch (err) {
      this.voiceState = "error";
      this.errorMessage = err instanceof Error ? err.message : "Failed to start voice";
      this.cleanup();
    }
  }

  private async stopVoice(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "stop" }));
    }
    this.voiceState = "idle";
    this.cleanup();
  }

  private startRecording(): void {
    if (!this.mediaStream) {
      return;
    }

    // Use Opus codec via WebM container — widely supported
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    this.mediaRecorder = new MediaRecorder(this.mediaStream, {
      mimeType,
      audioBitsPerSecond: 64000,
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(event.data);
      }
    };

    // Send audio chunks every 250ms for low-latency streaming
    this.mediaRecorder.start(250);
  }

  private handleServerMessage(data: string): void {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(data) as Record<string, unknown>;
    } catch {
      return;
    }

    switch (msg.type) {
      case "session_started":
        this.voiceState = "listening";
        break;

      case "transcript":
        this.transcript = msg.text as string;
        if (msg.is_final) {
          this.voiceState = "processing";
        }
        break;

      case "response":
        this.lastResponse = msg.text as string;
        this.transcript = this.lastResponse;
        break;

      case "audio":
        this.queueAudio(msg.data as string);
        break;

      case "audio_end":
        this.voiceState = "listening";
        // Clear transcript after a delay so user can read the response
        setTimeout(() => {
          if (this.voiceState === "listening") {
            this.transcript = "";
          }
        }, 3000);
        break;

      case "session_ended":
        this.voiceState = "idle";
        this.transcript = "";
        break;

      case "error":
        this.errorMessage = msg.message as string;
        // Don't stop the session for non-fatal errors
        break;
    }
  }

  private queueAudio(base64Data: string): void {
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    this.audioQueue.push(bytes.buffer);
    if (!this.isPlayingAudio) {
      void this.playNextAudio();
    }
  }

  private async playNextAudio(): Promise<void> {
    if (this.audioQueue.length === 0) {
      this.isPlayingAudio = false;
      return;
    }

    this.isPlayingAudio = true;
    const buffer = this.audioQueue.shift()!;

    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }
      const audioBuffer = await this.audioContext.decodeAudioData(buffer);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.addEventListener("ended", () => {
        void this.playNextAudio();
      });
      source.start(0);
    } catch {
      // If audio decode fails (e.g., wrong format), skip and continue
      void this.playNextAudio();
    }
  }

  private cleanup(): void {
    this.mediaRecorder?.stop();
    this.mediaRecorder = null;

    this.mediaStream?.getTracks().forEach((track) => track.stop());
    this.mediaStream = null;

    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      this.ws.close();
    }
    this.ws = null;

    this.audioQueue = [];
    this.isPlayingAudio = false;
  }

  private inferGatewayWsUrl(): string {
    // Derive WebSocket URL from current page location
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${location.host}`;
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.cleanup();
    void this.audioContext?.close();
    this.audioContext = null;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "voice-toggle": VoiceToggle;
  }
}
