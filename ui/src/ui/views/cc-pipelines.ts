import { html, nothing } from "lit";
import type { CCPipelineSummary, CCRunSummary } from "../controllers/cc-data.ts";

export type CcPipelinesProps = {
  loading: boolean;
  pipelines: CCPipelineSummary[];
  error: string | null;
  runsLoading: boolean;
  runs: CCRunSummary[];
  runsError: string | null;
  onRefresh: () => void;
  onRunPipeline: (pipelinePath: string) => void;
};

function statusBadge(status: string) {
  const cls = status === "succeeded" ? "success" : status === "failed" ? "danger" : "warning";
  return html`<span class="badge badge--${cls}">${status}</span>`;
}

export function renderCcPipelines(props: CcPipelinesProps) {
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
    </div>

    <div class="card" style="margin-bottom: 16px">
      <div class="card-header">Available Pipelines</div>
      <div class="card-body">
        ${
          props.loading && props.pipelines.length === 0
            ? html`
                <div class="muted">Loading pipelines...</div>
              `
            : props.pipelines.length === 0
              ? html`
                  <div class="muted">No pipelines found</div>
                `
              : html`
                <table class="table">
                  <thead>
                    <tr>
                      <th>Pipeline</th>
                      <th>Version</th>
                      <th>Owner</th>
                      <th>Stages</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${props.pipelines.map(
                      (p) => html`
                        <tr>
                          <td>
                            <strong>${p.name}</strong>
                            ${
                              p.description
                                ? html`<div class="muted" style="font-size: 12px">${p.description}</div>`
                                : nothing
                            }
                          </td>
                          <td class="mono">${p.version}</td>
                          <td>${p.owner}</td>
                          <td>${p.stages_count}</td>
                          <td>
                            <button
                              class="btn btn--sm btn--primary"
                              @click=${() => props.onRunPipeline(p.path)}
                              title="Run this pipeline"
                            >
                              Run
                            </button>
                          </td>
                        </tr>
                      `,
                    )}
                  </tbody>
                </table>
              `
        }
      </div>
    </div>

    <div class="card">
      <div class="card-header">Recent Runs</div>
      <div class="card-body">
        ${
          props.runsLoading && props.runs.length === 0
            ? html`
                <div class="muted">Loading runs...</div>
              `
            : props.runs.length === 0
              ? html`
                  <div class="muted">No runs yet</div>
                `
              : html`
                <table class="table">
                  <thead>
                    <tr>
                      <th>Run ID</th>
                      <th>Pipeline</th>
                      <th>Status</th>
                      <th>Started</th>
                      <th>Stages</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${props.runs.map(
                      (r) => html`
                        <tr>
                          <td class="mono" style="font-size: 12px">${r.run_id.slice(0, 12)}</td>
                          <td>${r.pipeline_name}</td>
                          <td>${statusBadge(r.status)}</td>
                          <td style="font-size: 12px">${r.started_at}</td>
                          <td>
                            ${r.summary.stages_succeeded}/${r.summary.stages_run}
                            ${
                              r.summary.stages_failed > 0
                                ? html`<span class="danger"> (${r.summary.stages_failed} failed)</span>`
                                : nothing
                            }
                          </td>
                        </tr>
                      `,
                    )}
                  </tbody>
                </table>
              `
        }
        ${props.runsError ? html`<div class="pill danger" style="margin-top: 8px">${props.runsError}</div>` : nothing}
      </div>
    </div>
  `;
}
