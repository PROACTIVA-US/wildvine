import { html, nothing } from "lit";
import type { CCReferral, CCGovernorHistoryItem } from "../controllers/cc-data.ts";

export type CcGovernorProps = {
  loading: boolean;
  pending: CCReferral[];
  count: number;
  error: string | null;
  onRefresh: () => void;
  onApprove: (referralId: string) => void;
  onDeny: (referralId: string) => void;
  history: CCGovernorHistoryItem[];
  historyLoading: boolean;
  onLoadHistory: () => void;
};

export function renderCcGovernor(props: CcGovernorProps) {
  if (props.error) {
    return html`
      <div class="card">
        <div class="card-body">
          <div class="pill danger">${props.error}</div>
          <p class="muted">Backend services may not be running. Start them from Settings > Gateway.</p>
        </div>
      </div>
    `;
  }

  return html`
    <div class="toolbar" style="margin-bottom: 12px">
      <button class="btn btn--sm" @click=${props.onRefresh} ?disabled=${props.loading}>
        ${props.loading ? "Loading..." : "Refresh"}
      </button>
      <span class="muted" style="margin-left: 8px">
        ${props.count} pending approval${props.count !== 1 ? "s" : ""}
      </span>
    </div>

    ${
      props.pending.length === 0
        ? html`
            <div class="card">
              <div class="card-body">
                <div class="muted">No pending approvals. Governor queue is clear.</div>
              </div>
            </div>
          `
        : html`
          <div class="card-list">
            ${props.pending.map(
              (r) => html`
                <div class="card" style="margin-bottom: 8px">
                  <div class="card-body" style="display: flex; justify-content: space-between; align-items: flex-start">
                    <div>
                      <div>
                        <strong class="mono">${r.id}</strong>
                        ${r.kind ? html`<span class="badge">${r.kind}</span>` : nothing}
                      </div>
                      ${r.reason ? html`<div class="muted" style="margin-top: 4px">${r.reason}</div>` : nothing}
                      <div class="muted" style="font-size: 12px; margin-top: 4px">
                        ${r.from_instance ? html`From: ${r.from_instance}` : nothing}
                        ${r.artifact_ref ? html` · Artifact: ${r.artifact_ref}` : nothing}
                        ${r.created_at ? html` · ${r.created_at}` : nothing}
                      </div>
                    </div>
                    <div style="display: flex; gap: 6px; flex-shrink: 0">
                      <button
                        class="btn btn--sm btn--primary"
                        @click=${() => props.onApprove(r.id)}
                      >
                        Approve
                      </button>
                      <button
                        class="btn btn--sm btn--danger"
                        @click=${() => props.onDeny(r.id)}
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                </div>
              `,
            )}
          </div>
        `
    }

    ${
      props.history.length > 0 || props.historyLoading
        ? html`
          <div style="margin-top: 24px">
            <div class="toolbar" style="margin-bottom: 12px">
              <strong>Decision History</strong>
              <button
                class="btn btn--sm"
                style="margin-left: 8px"
                @click=${props.onLoadHistory}
                ?disabled=${props.historyLoading}
              >
                ${props.historyLoading ? "Loading..." : "Refresh History"}
              </button>
            </div>
            ${props.history.map(
              (h) => html`
                <div class="card" style="margin-bottom: 6px; opacity: 0.85">
                  <div class="card-body" style="padding: 8px 12px">
                    <div style="display: flex; justify-content: space-between; align-items: center">
                      <div>
                        <span class="mono" style="font-size: 12px">${h.referral_id}</span>
                        <span class="badge" style="margin-left: 6px">${h.referral_kind}</span>
                        <span
                          class="badge"
                          style="margin-left: 4px; background: ${h.status === "approved" ? "#22c55e" : h.status === "denied" ? "#ef4444" : "#a3a3a3"}"
                        >
                          ${h.status}
                        </span>
                      </div>
                      ${
                        h.decision
                          ? html`<span class="muted" style="font-size: 11px">
                            ${h.decision.decided_by} · ${h.decision.decided_at}
                          </span>`
                          : nothing
                      }
                    </div>
                    <div class="muted" style="font-size: 12px; margin-top: 2px">
                      ${h.referral_reason}
                    </div>
                  </div>
                </div>
              `,
            )}
          </div>
        `
        : html`
          <div style="margin-top: 16px">
            <button class="btn btn--sm" @click=${props.onLoadHistory}>
              Load Decision History
            </button>
          </div>
        `
    }
  `;
}
