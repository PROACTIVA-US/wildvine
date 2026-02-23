import { html, nothing } from "lit";

export interface HomeViewProps {
  connected: boolean;
  agentCount: number;
  governorCount: number;
  recentRuns: { run_id: string; pipeline_name: string; status: string; started_at: string }[];
  ccHealthy: boolean;
  onNavigate: (tab: string) => void;
}

export function renderHome(props: HomeViewProps) {
  return html`
    <div class="grid" style="gap: 20px;">
      <!-- Status cards row -->
      <div class="stat-grid">
        <div class="stat card" style="cursor: pointer;" @click=${() => props.onNavigate("chat")}>
          <div class="stat-label">CONNECTION</div>
          <div class="stat-value ${props.connected ? "ok" : ""}">${props.connected ? "Online" : "Offline"}</div>
        </div>
        <div class="stat card" style="cursor: pointer;" @click=${() => props.onNavigate("agents")}>
          <div class="stat-label">AGENTS</div>
          <div class="stat-value">${props.agentCount}</div>
        </div>
        <div class="stat card" style="cursor: pointer;" @click=${() => props.onNavigate("governance")}>
          <div class="stat-label">GOVERNANCE</div>
          <div class="stat-value ${props.governorCount > 0 ? "warn" : ""}">${props.governorCount} pending</div>
        </div>
        <div class="stat card">
          <div class="stat-label">COMMANDCENTRAL</div>
          <div class="stat-value ${props.ccHealthy ? "ok" : ""}">${props.ccHealthy ? "Running" : "Offline"}</div>
        </div>
      </div>

      <!-- Quick actions -->
      <div class="card">
        <div class="card-title">Quick Actions</div>
        <div class="card-sub">Jump to frequently used views</div>
        <div class="row" style="margin-top: 14px; flex-wrap: wrap;">
          <button class="btn primary" @click=${() => props.onNavigate("chat")}>Open Chat</button>
          <button class="btn" @click=${() => props.onNavigate("agents")}>Manage Agents</button>
          <button class="btn" @click=${() => props.onNavigate("vislzr")}>VISLZR Canvas</button>
          <button class="btn" @click=${() => props.onNavigate("strategy")}>Strategy</button>
          ${
            props.governorCount > 0
              ? html`<button class="btn danger" @click=${() => props.onNavigate("governance")}>
                Review ${props.governorCount} Pending
              </button>`
              : nothing
          }
        </div>
      </div>

      <!-- Recent pipeline runs -->
      <div class="card">
        <div class="card-title">Recent Pipeline Runs</div>
        ${
          props.recentRuns.length === 0
            ? html`
                <div class="card-sub" style="margin-top: 8px">No recent runs.</div>
              `
            : html`
            <div class="list" style="margin-top: 12px;">
              ${props.recentRuns.slice(0, 5).map(
                (run) => html`
                  <div class="list-item" style="grid-template-columns: 1fr auto;">
                    <div class="list-main">
                      <div class="list-title">${run.pipeline_name}</div>
                      <div class="list-sub">${run.run_id}</div>
                    </div>
                    <div>
                      <span class="chip ${run.status === "succeeded" ? "chip-ok" : run.status === "failed" ? "chip-danger" : "chip-warn"}">
                        ${run.status}
                      </span>
                    </div>
                  </div>
                `,
              )}
            </div>
          `
        }
      </div>
    </div>
  `;
}
