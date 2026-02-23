import { html } from "lit";

export interface VineViewNodeData {
  id: string;
  label: string;
  type: "root" | "branch" | "leaf";
  status: "healthy" | "warning" | "error" | "unknown";
  children?: VineViewNodeData[];
}

export interface VineViewLitProps {
  loading: boolean;
  error: string | null;
  data: VineViewNodeData | null;
  reactMounted: boolean;
  onRefresh: () => void;
  onMountReact: (container: HTMLElement) => void;
}

export function renderVineView(props: VineViewLitProps) {
  if (props.loading) {
    return html`
      <div class="card"><div class="muted">Loading system health...</div></div>
    `;
  }
  if (props.error) {
    return html`
      <div class="callout danger">${props.error}</div>
      <button class="btn" @click=${props.onRefresh}>Retry</button>
    `;
  }

  return html`
    <div class="stack" style="gap: 16px;">
      <div class="row" style="justify-content: flex-end;">
        <button class="btn" @click=${props.onRefresh}>Refresh</button>
      </div>
      <div style="height: calc(100vh - 220px); min-height: 400px;">
        ${
          props.data
            ? html`
                <div id="vine-view-react-root" style="width: 100%; height: 100%"></div>
              `
            : html`
                <div class="card" style="height: 100%; display: grid; place-items: center">
                  <div class="muted">No health data available.</div>
                </div>
              `
        }
      </div>
    </div>
  `;
}
