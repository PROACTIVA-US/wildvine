import { html, nothing } from "lit";

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
  onRefresh: () => void;
  onSelectCanvas: (id: string) => void;
  onCreateCanvas: (name: string) => void;
  onDeleteCanvas: (id: string) => void;
  onNodeClick: (nodeId: string) => void;
  onNodeDragEnd: (nodeId: string, x: number, y: number) => void;
  onAddNode: () => void;
  onMountReact: (container: HTMLElement) => void;
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
    <div style="display: grid; grid-template-columns: 240px 1fr; gap: 16px; height: calc(100vh - 180px);">
      <!-- Canvas sidebar -->
      <div class="stack" style="gap: 8px; overflow-y: auto;">
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
    </div>
  `;
}
