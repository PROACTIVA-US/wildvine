import { html, nothing } from "lit";
import type { CCKbSearchResult } from "../controllers/notes.ts";

export type NotesContextProps = {
  results: CCKbSearchResult[];
  loading: boolean;
};

export function renderNotesContext(props: NotesContextProps) {
  if (props.loading || props.results.length === 0) {
    return nothing;
  }

  return html`
    <details open style="margin-bottom: 16px">
      <summary
        style="cursor: pointer; font-size: 13px; font-weight: 600; color: var(--c-text-muted); user-select: none"
      >
        Related Notes (${props.results.length})
      </summary>
      <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 6px">
        ${props.results.map(
          (r) => html`
            <div
              style="padding: 6px 10px; border-radius: 6px; background: var(--c-surface-alt, var(--c-bg-alt)); border: 1px solid var(--c-border); font-size: 12px"
            >
              <strong>${r.title}</strong>
              ${r.snippet ? html`<span class="muted" style="margin-left: 6px">${r.snippet}</span>` : nothing}
            </div>
          `,
        )}
      </div>
    </details>
  `;
}
