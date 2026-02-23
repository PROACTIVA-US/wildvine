import { html, nothing } from "lit";
import type { CCArenaSession, CCArenaMessage } from "../controllers/cc-data.ts";

export type CcArenaProps = {
  loading: boolean;
  sessions: CCArenaSession[];
  error: string | null;
  selectedId: string | null;
  messages: CCArenaMessage[];
  messagesLoading: boolean;
  chatInput: string;
  onRefresh: () => void;
  onSelectSession: (id: string) => void;
  onChatInputChange: (value: string) => void;
  onSendChat: () => void;
};

export function renderCcArena(props: CcArenaProps) {
  if (props.error) {
    return html`
      <div class="card">
        <div class="card-body">
          <div class="pill danger">${props.error}</div>
          <p class="muted">CommandCentral may not be running.</p>
        </div>
      </div>
    `;
  }

  const selected = props.sessions.find((s) => s.id === props.selectedId);

  return html`
    <div style="display: flex; gap: 16px; height: calc(100vh - 200px); min-height: 400px">
      <!-- Sessions sidebar -->
      <div style="width: 280px; flex-shrink: 0; overflow-y: auto">
        <div class="toolbar" style="margin-bottom: 8px">
          <button class="btn btn--sm" @click=${props.onRefresh} ?disabled=${props.loading}>
            ${props.loading ? "Loading..." : "Refresh"}
          </button>
        </div>
        ${
          props.sessions.length === 0
            ? html`
                <div class="muted">No arena sessions</div>
              `
            : props.sessions.map(
                (s) => html`
                <div
                  class="card ${s.id === props.selectedId ? "card--active" : ""}"
                  style="margin-bottom: 6px; cursor: pointer; ${s.id === props.selectedId ? "border-color: var(--color-primary, #3b82f6)" : ""}"
                  @click=${() => props.onSelectSession(s.id)}
                >
                  <div class="card-body" style="padding: 8px 12px">
                    <div><strong>${s.name}</strong></div>
                    <div class="muted" style="font-size: 12px">
                      ${s.mode} · ${s.message_count} msg${s.message_count !== 1 ? "s" : ""} · ${s.status}
                    </div>
                  </div>
                </div>
              `,
              )
        }
      </div>

      <!-- Chat area -->
      <div style="flex: 1; display: flex; flex-direction: column; min-width: 0">
        ${
          selected
            ? html`
              <div class="card-header" style="padding: 8px 12px; border-bottom: 1px solid var(--color-border, #333)">
                <strong>${selected.name}</strong>
                <span class="muted"> · ${selected.mode} · ${selected.status}</span>
              </div>

              <div style="flex: 1; overflow-y: auto; padding: 12px">
                ${
                  props.messagesLoading
                    ? html`
                        <div class="muted">Loading messages...</div>
                      `
                    : props.messages.length === 0
                      ? html`
                          <div class="muted">No messages yet</div>
                        `
                      : props.messages.map(
                          (m) => html`
                          <div style="margin-bottom: 12px">
                            <div style="display: flex; gap: 8px; align-items: baseline">
                              <strong style="font-size: 13px">${m.sender || m.role}</strong>
                              <span class="muted" style="font-size: 11px">${m.created_at}</span>
                            </div>
                            <div style="margin-top: 2px; white-space: pre-wrap">${m.content}</div>
                          </div>
                        `,
                        )
                }
              </div>

              <div style="display: flex; gap: 8px; padding: 8px 0">
                <input
                  class="input"
                  type="text"
                  placeholder="Send a message..."
                  .value=${props.chatInput}
                  @input=${(e: InputEvent) =>
                    props.onChatInputChange((e.target as HTMLInputElement).value)}
                  @keydown=${(e: KeyboardEvent) => {
                    if (e.key === "Enter") {
                      props.onSendChat();
                    }
                  }}
                  style="flex: 1"
                />
                <button
                  class="btn btn--primary"
                  @click=${props.onSendChat}
                  ?disabled=${!props.chatInput.trim()}
                >
                  Send
                </button>
              </div>
            `
            : html`
                <div class="muted" style="padding: 24px; text-align: center">Select a session to view messages</div>
              `
        }
      </div>
    </div>
  `;
}
