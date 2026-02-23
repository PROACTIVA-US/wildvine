import { html, nothing } from "lit";
import type { CCReferral } from "../controllers/cc-data.ts";

export type CcGovernorProps = {
  loading: boolean;
  pending: CCReferral[];
  count: number;
  error: string | null;
  onRefresh: () => void;
  onApprove: (referralId: string) => void;
  onDeny: (referralId: string) => void;
};

export function renderCcGovernor(props: CcGovernorProps) {
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
  `;
}
