import { html, nothing } from "lit";

export interface GovernanceReferral {
  id: string;
  from_instance?: string;
  to_instance?: string;
  kind?: string;
  reason?: string;
  artifact_ref?: string;
  created_at?: string;
  ack_info?: Record<string, unknown> | null;
}

export interface GovernanceViewProps {
  loading: boolean;
  pending: GovernanceReferral[];
  count: number;
  error: string | null;
  historyLoading: boolean;
  history: GovernanceReferral[];
  activeTab: "pending" | "history";
  commentDraft: string;
  onRefresh: () => void;
  onApprove: (id: string, comment?: string) => void;
  onDeny: (id: string, comment?: string) => void;
  onTabChange: (tab: "pending" | "history") => void;
  onCommentChange: (v: string) => void;
  onLoadHistory: () => void;
}

function riskClass(kind?: string): { label: string; cls: string } {
  if (!kind) {
    return { label: "Unknown", cls: "" };
  }
  const k = kind.toLowerCase();
  if (k.includes("auto") || k === "a") {
    return { label: "A \u2014 Auto", cls: "chip-ok" };
  }
  if (k.includes("cto") || k === "b") {
    return { label: "B \u2014 CTO", cls: "chip-warn" };
  }
  if (k.includes("legal") || k === "c") {
    return { label: "C \u2014 Legal", cls: "chip-danger" };
  }
  if (k.includes("forbidden") || k === "d") {
    return { label: "D \u2014 Forbidden", cls: "chip-danger" };
  }
  return { label: kind, cls: "" };
}

export function renderGovernance(props: GovernanceViewProps) {
  return html`
    <div class="stack" style="gap: 16px;">
      <!-- Tabs -->
      <div class="row" style="justify-content: space-between;">
        <div class="row" style="gap: 6px;">
          <button class="btn ${props.activeTab === "pending" ? "active" : ""}"
            @click=${() => props.onTabChange("pending")}>
            Pending ${props.count > 0 ? html`<span class="nav-badge">${props.count}</span>` : nothing}
          </button>
          <button class="btn ${props.activeTab === "history" ? "active" : ""}"
            @click=${() => {
              props.onTabChange("history");
              props.onLoadHistory();
            }}>
            History
          </button>
        </div>
        <button class="btn" @click=${props.onRefresh}>Refresh</button>
      </div>

      ${props.error ? html`<div class="callout danger">${props.error}</div>` : nothing}

      ${
        props.activeTab === "pending"
          ? html`
          ${
            props.loading
              ? html`
                  <div class="card"><div class="muted">Loading governance queue...</div></div>
                `
              : props.pending.length === 0
                ? html`
                    <div class="card"><div class="muted">No pending items. All clear.</div></div>
                  `
                : html`
                <div class="list">
                  ${props.pending.map((item) => {
                    const risk = riskClass(item.kind);
                    return html`
                        <div class="card" style="animation: rise 0.3s var(--ease-out) backwards;">
                          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
                            <div style="flex: 1;">
                              <div style="display: flex; align-items: center; gap: 8px;">
                                <span class="card-title" style="font-family: var(--mono); font-size: 13px;">${item.id}</span>
                                <span class="chip ${risk.cls}" style="font-size: 10px; padding: 2px 8px;">${risk.label}</span>
                              </div>
                              ${item.reason ? html`<div class="card-sub" style="margin-top: 6px;">${item.reason}</div>` : nothing}
                              <div style="margin-top: 6px; display: flex; gap: 12px; font-size: 12px; color: var(--muted);">
                                ${item.from_instance ? html`<span>From: ${item.from_instance}</span>` : nothing}
                                ${item.artifact_ref ? html`<span>Artifact: ${item.artifact_ref}</span>` : nothing}
                                ${item.created_at ? html`<span>${new Date(item.created_at).toLocaleString()}</span>` : nothing}
                              </div>
                            </div>
                          </div>
                          <div style="margin-top: 12px; display: flex; gap: 8px; align-items: center;">
                            <input type="text" placeholder="Comment (optional)..." style="flex: 1; padding: 6px 10px; font-size: 12px; border: 1px solid var(--input); border-radius: var(--radius-md); background: var(--card);"
                              .value=${props.commentDraft}
                              @input=${(e: InputEvent) => props.onCommentChange((e.target as HTMLInputElement).value)} />
                            <button class="btn primary btn--sm" @click=${() => props.onApprove(item.id, props.commentDraft || undefined)}>Approve</button>
                            <button class="btn danger btn--sm" @click=${() => props.onDeny(item.id, props.commentDraft || undefined)}>Deny</button>
                          </div>
                        </div>
                      `;
                  })}
                </div>
              `
          }
        `
          : html`
          ${
            props.historyLoading
              ? html`
                  <div class="card"><div class="muted">Loading history...</div></div>
                `
              : props.history.length === 0
                ? html`
                    <div class="card"><div class="muted">No decision history.</div></div>
                  `
                : html`
                <div class="list">
                  ${props.history.map(
                    (item) => html`
                      <div class="list-item" style="grid-template-columns: 1fr auto;">
                        <div class="list-main">
                          <div class="list-title mono">${item.id}</div>
                          <div class="list-sub">${item.reason ?? "No reason"}</div>
                        </div>
                        <div class="list-meta" style="min-width: auto;">
                          ${item.ack_info?.action ? html`<span class="chip ${item.ack_info.action === "approve" ? "chip-ok" : "chip-danger"}">${item.ack_info.action}</span>` : nothing}
                        </div>
                      </div>
                    `,
                  )}
                </div>
              `
          }
        `
      }
    </div>
  `;
}
