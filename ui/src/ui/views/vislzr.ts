import { html, nothing } from "lit";
import type { KbSearchResult, KbIndexStatus } from "../controllers/vislzr.js";
import type { VislzrProject } from "../storage.js";

export interface VislzrViewProps {
  loading: boolean;
  error: string | null;
  canvases: {
    id: string;
    name: string;
    description: string | null;
    node_count: number;
    edge_count: number;
  }[];
  selectedCanvasId: string | null;
  canvasNodes: {
    id: string;
    node_type: string;
    label: string;
    position_x: number;
    position_y: number;
    data: Record<string, unknown> | null;
  }[];
  canvasEdges: {
    id: string;
    source_node_id: string;
    target_node_id: string;
    edge_type: string;
    label: string | null;
  }[];
  reactMounted: boolean;
  // KB integration
  kbQuery: string;
  kbResults: KbSearchResult[];
  kbSearchLoading: boolean;
  kbIndexStatus: KbIndexStatus | null;
  kbError: string | null;
  kbIndexing: boolean;
  // Project isolation
  activeProjectId: string;
  projects: VislzrProject[];
  projectManageOpen: boolean;
  addProjectName: string;
  addProjectPath: string;
  // Callbacks
  onRefresh: () => void;
  onSelectCanvas: (id: string) => void;
  onCreateCanvas: (name: string) => void;
  onDeleteCanvas: (id: string) => void;
  onNodeClick: (nodeId: string) => void;
  onNodeDragEnd: (nodeId: string, x: number, y: number) => void;
  onAddNode: () => void;
  onMountReact: (container: HTMLElement) => void;
  // KB callbacks
  onKbQueryChange: (q: string) => void;
  onKbSearch: () => void;
  onKbResultToNode: (result: KbSearchResult) => void;
  // Project callbacks
  onProjectChange: (projectId: string) => void;
  onToggleManageProjects: () => void;
  onAddProjectNameChange: (v: string) => void;
  onAddProjectPathChange: (v: string) => void;
  onAddProject: () => void;
  onRemoveProject: (projectId: string) => void;
  onIndexProject: (projectId: string) => void;
}

function entityBadgeColor(type: string): string {
  switch (type) {
    case "goal":
      return "#22d3ee";
    case "hypothesis":
      return "#a78bfa";
    case "evidence":
      return "#fbbf24";
    case "document":
      return "#4ade80";
    case "node":
      return "#f472b6";
    default:
      return "#94a3b8";
  }
}

export function renderVislzr(props: VislzrViewProps) {
  if (props.loading) {
    return html`
      <div class="card"><div class="muted">Loading canvases...</div></div>
    `;
  }
  if (props.error) {
    return html`
      <div class="callout danger">${props.error}</div>
      <button class="btn" @click=${props.onRefresh}>Retry</button>
    `;
  }

  return html`
    <div style="display: grid; grid-template-columns: 240px 1fr 280px; gap: 16px; height: calc(100vh - 180px);">
      <!-- Left sidebar: project selector + canvas list -->
      <div class="stack" style="gap: 8px; overflow-y: auto;">
        <!-- Project selector -->
        <div style="display: flex; gap: 4px; align-items: center;">
          <select
            class="input"
            style="flex: 1; height: 30px; font-size: 12px;"
            .value=${props.activeProjectId}
            @change=${(e: Event) => props.onProjectChange((e.target as HTMLSelectElement).value)}
          >
            ${props.projects.map(
              (p) =>
                html`<option value=${p.id} ?selected=${p.id === props.activeProjectId}>${p.name}</option>`,
            )}
          </select>
          <button
            class="btn"
            style="height: 30px; padding: 0 8px; font-size: 11px;"
            title="Manage projects"
            @click=${props.onToggleManageProjects}
          >⚙</button>
        </div>

        ${props.projectManageOpen ? renderProjectManagement(props) : nothing}

        <button class="btn primary" @click=${() => {
          const name = prompt("Canvas name:");
          if (name) {
            props.onCreateCanvas(name);
          }
        }}>+ New Canvas</button>
        <button class="btn" @click=${props.onRefresh}>Refresh</button>
        ${props.canvases.map(
          (c) => html`
            <button class="agent-row ${props.selectedCanvasId === c.id ? "active" : ""}"
              @click=${() => props.onSelectCanvas(c.id)}>
              <div class="agent-info">
                <div class="agent-title">${c.name}</div>
                <div class="agent-sub">${c.node_count} nodes · ${c.edge_count} edges</div>
              </div>
            </button>
          `,
        )}
        ${
          props.canvases.length === 0
            ? html`
                <div class="muted" style="padding: 8px">No canvases yet.</div>
              `
            : nothing
        }
      </div>

      <!-- Canvas area -->
      <div style="min-height: 400px; position: relative;">
        ${
          props.selectedCanvasId
            ? html`<div id="vislzr-react-root" style="width: 100%; height: 100%;"
              ${/* Mount React on first render */ ""}
              @slotchange=${(e: Event) => props.onMountReact(e.target as HTMLElement)}
            ></div>
            ${
              !props.reactMounted
                ? html`
                    <div style="position: absolute; inset: 0; display: grid; place-items: center">
                      <div class="muted">Loading canvas...</div>
                    </div>
                  `
                : nothing
            }`
            : html`
                <div class="card" style="height: 100%; display: grid; place-items: center">
                  <div style="text-align: center">
                    <div class="muted">Select a canvas from the sidebar or create a new one.</div>
                  </div>
                </div>
              `
        }
      </div>

      <!-- Right sidebar: KB search panel -->
      <div class="stack" style="gap: 8px; overflow-y: auto;">
        <div style="font-weight: 600; font-size: 13px; color: var(--text);">Knowledge Base</div>

        <!-- Index status -->
        ${
          props.kbIndexStatus
            ? html`
              <div style="font-size: 11px; color: var(--text-muted); padding: 4px 0;">
                ${props.kbIndexStatus.indexed_count} indexed
                ${
                  Object.entries(props.kbIndexStatus.entity_counts).length > 0
                    ? html` · ${Object.entries(props.kbIndexStatus.entity_counts)
                        .map(([k, v]) => `${v} ${k}`)
                        .join(", ")}`
                    : nothing
                }
              </div>
            `
            : html`
                <div style="font-size: 11px; color: var(--text-muted)">No index data</div>
              `
        }

        <!-- Search input -->
        <div style="display: flex; gap: 4px;">
          <input
            class="input"
            style="flex: 1; height: 28px; font-size: 12px;"
            type="text"
            placeholder="Search KB..."
            .value=${props.kbQuery}
            @input=${(e: Event) => props.onKbQueryChange((e.target as HTMLInputElement).value)}
            @keydown=${(e: KeyboardEvent) => {
              if (e.key === "Enter") {
                props.onKbSearch();
              }
            }}
          />
          <button
            class="btn primary"
            style="height: 28px; padding: 0 10px; font-size: 12px;"
            ?disabled=${props.kbSearchLoading}
            @click=${props.onKbSearch}
          >${props.kbSearchLoading ? "..." : "Search"}</button>
        </div>

        ${
          props.kbError
            ? html`<div style="font-size: 11px; color: var(--danger);">${props.kbError}</div>`
            : nothing
        }

        <!-- Search results -->
        ${
          props.kbResults.length > 0
            ? html`
              <div style="font-size: 11px; color: var(--text-muted); padding: 2px 0;">
                ${props.kbResults.length} result(s)
              </div>
              ${props.kbResults.map(
                (r) => html`
                  <div
                    class="card"
                    style="padding: 8px; font-size: 12px; cursor: default;"
                  >
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                      <span style="
                        background: ${entityBadgeColor(r.entity_type)};
                        color: #000;
                        padding: 1px 5px;
                        border-radius: 3px;
                        font-size: 10px;
                        font-weight: 600;
                        text-transform: uppercase;
                      ">${r.entity_type}</span>
                      <span style="font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">
                        ${r.title}
                      </span>
                    </div>
                    ${
                      r.snippet
                        ? html`<div style="font-size: 11px; color: var(--text-muted); margin-bottom: 6px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${r.snippet}</div>`
                        : nothing
                    }
                    ${
                      props.selectedCanvasId
                        ? html`
                          <button
                            class="btn"
                            style="height: 22px; padding: 0 8px; font-size: 10px;"
                            @click=${() => props.onKbResultToNode(r)}
                          >+ Add to Canvas</button>
                        `
                        : nothing
                    }
                  </div>
                `,
              )}
            `
            : nothing
        }

        ${
          props.kbResults.length === 0 && props.kbQuery && !props.kbSearchLoading
            ? html`
                <div style="font-size: 11px; color: var(--text-muted); padding: 8px">
                  No results. Try indexing a project first.
                </div>
              `
            : nothing
        }
      </div>
    </div>
  `;
}

function renderProjectManagement(props: VislzrViewProps) {
  return html`
    <div class="card" style="padding: 8px; font-size: 12px;">
      <div style="font-weight: 600; margin-bottom: 6px;">Projects</div>
      ${props.projects.map(
        (p) => html`
          <div style="display: flex; align-items: center; gap: 4px; padding: 3px 0; border-bottom: 1px solid var(--border);">
            <div style="flex: 1; min-width: 0;">
              <div style="font-weight: 500;">${p.name}</div>
              ${
                p.path
                  ? html`<div style="font-size: 10px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.path}</div>`
                  : html`
                      <div style="font-size: 10px; color: var(--text-muted)">No path</div>
                    `
              }
            </div>
            ${
              p.path
                ? html`<button
                  class="btn"
                  style="height: 22px; padding: 0 6px; font-size: 10px; white-space: nowrap;"
                  ?disabled=${props.kbIndexing}
                  @click=${() => props.onIndexProject(p.id)}
                >${props.kbIndexing ? "..." : "Index"}</button>`
                : nothing
            }
            ${
              p.id !== "default"
                ? html`<button
                  class="btn danger"
                  style="height: 22px; padding: 0 6px; font-size: 10px;"
                  @click=${() => props.onRemoveProject(p.id)}
                >×</button>`
                : nothing
            }
          </div>
        `,
      )}
      <!-- Add project form -->
      <div style="margin-top: 6px; display: flex; flex-direction: column; gap: 4px;">
        <input
          class="input"
          style="height: 24px; font-size: 11px;"
          type="text"
          placeholder="Project name"
          .value=${props.addProjectName}
          @input=${(e: Event) => props.onAddProjectNameChange((e.target as HTMLInputElement).value)}
        />
        <input
          class="input"
          style="height: 24px; font-size: 11px;"
          type="text"
          placeholder="Directory path"
          .value=${props.addProjectPath}
          @input=${(e: Event) => props.onAddProjectPathChange((e.target as HTMLInputElement).value)}
        />
        <button
          class="btn primary"
          style="height: 24px; font-size: 11px;"
          ?disabled=${!props.addProjectName.trim() || !props.addProjectPath.trim()}
          @click=${props.onAddProject}
        >Add Project</button>
      </div>
    </div>
  `;
}
