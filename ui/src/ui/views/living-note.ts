import { html, nothing } from "lit";

export interface LivingNoteItem {
  id: string;
  subject: string;
  body: string;
  priority: "RED" | "YELLOW" | "GREEN";
  status: string;
  created_at: string;
}

export interface LivingNoteSearchResult {
  id: string;
  title: string;
  snippet: string | null;
  entity_type: string;
  score: number;
}

export interface LivingNoteViewProps {
  loading: boolean;
  items: LivingNoteItem[];
  error: string | null;
  captureDraft: string;
  captureBody: string;
  capturePriority: "RED" | "YELLOW" | "GREEN";
  captureBusy: boolean;
  captureError: string | null;
  searchQuery: string;
  searchResults: LivingNoteSearchResult[];
  searchLoading: boolean;
  filter: "all" | "RED" | "YELLOW" | "GREEN";
  onCaptureDraftChange: (v: string) => void;
  onCaptureBodyChange: (v: string) => void;
  onCapturePriorityChange: (v: "RED" | "YELLOW" | "GREEN") => void;
  onCapture: () => void;
  onSearchQueryChange: (v: string) => void;
  onSearch: () => void;
  onFilterChange: (v: "all" | "RED" | "YELLOW" | "GREEN") => void;
  onDismiss: (id: string) => void;
  onRefresh: () => void;
}

function priorityDot(priority: string) {
  const colors: Record<string, string> = {
    RED: "var(--danger)",
    YELLOW: "var(--warn)",
    GREEN: "var(--ok)",
  };
  return html`<span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${colors[priority] ?? "var(--muted)"}; flex-shrink: 0;"></span>`;
}

export function renderLivingNote(props: LivingNoteViewProps) {
  const filtered =
    props.filter === "all" ? props.items : props.items.filter((n) => n.priority === props.filter);

  return html`
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; min-height: 400px;">
      <!-- Left: Notes list -->
      <div class="stack" style="gap: 12px;">
        <!-- Capture form -->
        <div class="card">
          <div class="field">
            <span>New Note</span>
            <input type="text" placeholder="What's on your mind?" .value=${props.captureDraft}
              @input=${(e: InputEvent) => props.onCaptureDraftChange((e.target as HTMLInputElement).value)}
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  props.onCapture();
                }
              }} />
          </div>
          <div class="field" style="margin-top: 8px;">
            <textarea placeholder="Details (optional)..." style="min-height: 60px; font-family: var(--font-body);" .value=${props.captureBody}
              @input=${(e: InputEvent) => props.onCaptureBodyChange((e.target as HTMLTextAreaElement).value)}></textarea>
          </div>
          <div class="row" style="margin-top: 8px; justify-content: space-between;">
            <div class="row" style="gap: 4px;">
              ${(["GREEN", "YELLOW", "RED"] as const).map(
                (p) => html`
                  <button class="btn btn--sm ${props.capturePriority === p ? "active" : ""}"
                    style="${props.capturePriority === p ? `border-color: ${p === "RED" ? "var(--danger)" : p === "YELLOW" ? "var(--warn)" : "var(--ok)"}` : ""}"
                    @click=${() => props.onCapturePriorityChange(p)}>
                    ${priorityDot(p)} ${p}
                  </button>
                `,
              )}
            </div>
            <button class="btn primary btn--sm" ?disabled=${!props.captureDraft.trim() || props.captureBusy}
              @click=${props.onCapture}>${props.captureBusy ? "Saving..." : "Capture"}</button>
          </div>
          ${props.captureError ? html`<div style="margin-top: 6px; color: var(--danger); font-size: 12px;">${props.captureError}</div>` : nothing}
        </div>

        <!-- Filter chips -->
        <div class="chip-row">
          ${(["all", "RED", "YELLOW", "GREEN"] as const).map(
            (f) => html`
              <button class="chip ${props.filter === f ? "chip-ok" : ""}" @click=${() => props.onFilterChange(f)}>
                ${f === "all" ? "All" : f}
              </button>
            `,
          )}
          <button class="btn btn--sm" style="margin-left: auto;" @click=${props.onRefresh}>Refresh</button>
        </div>

        <!-- Notes list -->
        ${
          props.loading
            ? html`
                <div class="muted">Loading notes...</div>
              `
            : filtered.length === 0
              ? html`
                  <div class="muted">No notes.</div>
                `
              : html`
              <div class="list">
                ${filtered.map(
                  (note) => html`
                    <div class="list-item" style="grid-template-columns: auto 1fr auto; gap: 10px; cursor: default;">
                      ${priorityDot(note.priority)}
                      <div class="list-main">
                        <div class="list-title">${note.subject}</div>
                        ${note.body ? html`<div class="list-sub" style="margin-top: 2px;">${note.body.slice(0, 100)}${note.body.length > 100 ? "..." : ""}</div>` : nothing}
                        <div class="list-sub">${new Date(note.created_at).toLocaleString()} \u00B7 ${note.status}</div>
                      </div>
                      <button class="btn btn--sm" @click=${() => props.onDismiss(note.id)}>Dismiss</button>
                    </div>
                  `,
                )}
              </div>
            `
        }
      </div>

      <!-- Right: KB Search -->
      <div class="stack" style="gap: 12px;">
        <div class="card">
          <div class="card-title">Knowledge Search</div>
          <div class="card-sub">Search across Wildvine knowledge</div>
          <div class="row" style="margin-top: 12px;">
            <input type="text" style="flex: 1;" placeholder="Search knowledge base..." .value=${props.searchQuery}
              @input=${(e: InputEvent) => props.onSearchQueryChange((e.target as HTMLInputElement).value)}
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === "Enter") {
                  props.onSearch();
                }
              }} />
            <button class="btn primary btn--sm" @click=${props.onSearch} ?disabled=${props.searchLoading}>Search</button>
          </div>
        </div>

        ${
          props.searchLoading
            ? html`
                <div class="muted">Searching...</div>
              `
            : props.searchResults.length > 0
              ? html`
              <div class="list">
                ${props.searchResults.map(
                  (r) => html`
                    <div class="list-item" style="grid-template-columns: 1fr auto;">
                      <div class="list-main">
                        <div class="list-title">${r.title}</div>
                        ${r.snippet ? html`<div class="list-sub">${r.snippet}</div>` : nothing}
                      </div>
                      <span class="chip" style="font-size: 10px;">${r.entity_type}</span>
                    </div>
                  `,
                )}
              </div>
            `
              : nothing
        }
      </div>
    </div>
  `;
}
