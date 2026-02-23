import { html, nothing } from "lit";
import type { CCKbResult } from "../controllers/cc-data.ts";

export type CcKbProps = {
  loading: boolean;
  results: CCKbResult[];
  query: string;
  error: string | null;
  onQueryChange: (query: string) => void;
  onSearch: () => void;
};

function typeBadge(entityType: string) {
  const colors: Record<string, string> = {
    goal: "var(--color-success, #22c55e)",
    hypothesis: "var(--color-warning, #eab308)",
    evidence: "var(--color-info, #3b82f6)",
    node: "var(--color-accent, #8b5cf6)",
    document: "var(--color-muted, #6b7280)",
  };
  const color = colors[entityType] ?? colors.document;
  return html`<span class="badge" style="background: ${color}; color: #fff; font-size: 11px">${entityType}</span>`;
}

export function renderCcKb(props: CcKbProps) {
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
    <div style="display: flex; gap: 8px; margin-bottom: 16px">
      <input
        class="input"
        type="text"
        placeholder="Search knowledge base..."
        .value=${props.query}
        @input=${(e: InputEvent) => props.onQueryChange((e.target as HTMLInputElement).value)}
        @keydown=${(e: KeyboardEvent) => {
          if (e.key === "Enter") {
            props.onSearch();
          }
        }}
        style="flex: 1"
      />
      <button class="btn btn--primary" @click=${props.onSearch} ?disabled=${props.loading}>
        ${props.loading ? "Searching..." : "Search"}
      </button>
    </div>

    ${
      props.results.length > 0
        ? html`
          <div class="card">
            <div class="card-header">${props.results.length} result${props.results.length !== 1 ? "s" : ""}</div>
            <div class="card-body">
              ${props.results.map(
                (r) => html`
                  <div style="padding: 8px 0; border-bottom: 1px solid var(--color-border, #333)">
                    <div style="display: flex; align-items: center; gap: 8px">
                      ${typeBadge(r.entity_type)}
                      <strong>${r.title}</strong>
                      <span class="muted" style="font-size: 12px">Score: ${r.score.toFixed(2)}</span>
                    </div>
                    ${
                      r.snippet
                        ? html`<div class="muted" style="margin-top: 4px; font-size: 13px">${r.snippet}</div>`
                        : nothing
                    }
                  </div>
                `,
              )}
            </div>
          </div>
        `
        : props.query && !props.loading
          ? html`<div class="muted">No results found for "${props.query}"</div>`
          : html`
              <div class="muted">Enter a query to search the knowledge base</div>
            `
    }
  `;
}
