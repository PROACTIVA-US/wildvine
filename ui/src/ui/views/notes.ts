import { html, nothing } from "lit";
import type { CCInboxItem, CCKbSearchResult } from "../controllers/notes.ts";

export type NotesProps = {
  loading: boolean;
  items: CCInboxItem[];
  error: string | null;
  captureDraft: string;
  capturePriority: "RED" | "YELLOW" | "GREEN";
  captureBusy: boolean;
  captureError: string | null;
  searchQuery: string;
  searchResults: CCKbSearchResult[];
  searchLoading: boolean;
  filter: "active" | "dismissed" | "all";
  onCaptureDraftChange: (value: string) => void;
  onCapturePriorityChange: (value: "RED" | "YELLOW" | "GREEN") => void;
  onCapture: () => void;
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
  onFilterChange: (value: "active" | "dismissed" | "all") => void;
  onDismiss: (id: string) => void;
  onRefresh: () => void;
};

function priorityDot(priority: string) {
  const color =
    priority === "RED"
      ? "var(--c-danger)"
      : priority === "YELLOW"
        ? "var(--c-warn)"
        : "var(--c-ok)";
  return html`<span
    style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"
    title="${priority}"
  ></span>`;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) {
    return "just now";
  }
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) {
    return `${mins}m ago`;
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function renderNotes(props: NotesProps) {
  const handleCaptureKeydown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      props.onCapture();
    }
  };

  const handleSearchKeydown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      props.onSearch();
    }
  };

  return html`
    <!-- Quick capture -->
    <div class="card" style="margin-bottom: 16px">
      <div class="card-header">Quick Capture</div>
      <div class="card-body">
        <div style="display: flex; gap: 8px; align-items: center">
          <input
            class="input"
            style="flex: 1"
            type="text"
            placeholder="What's on your mind?"
            .value=${props.captureDraft}
            @input=${(e: Event) => props.onCaptureDraftChange((e.target as HTMLInputElement).value)}
            @keydown=${handleCaptureKeydown}
            ?disabled=${props.captureBusy}
          />
          <select
            class="input"
            style="width: 100px"
            .value=${props.capturePriority}
            @change=${(e: Event) =>
              props.onCapturePriorityChange(
                (e.target as HTMLSelectElement).value as "RED" | "YELLOW" | "GREEN",
              )}
            ?disabled=${props.captureBusy}
          >
            <option value="GREEN">Normal</option>
            <option value="YELLOW">Important</option>
            <option value="RED">Urgent</option>
          </select>
          <button
            class="btn btn--sm btn--primary"
            @click=${props.onCapture}
            ?disabled=${props.captureBusy || !props.captureDraft.trim()}
          >
            ${props.captureBusy ? "Saving..." : "Capture"}
          </button>
        </div>
        ${props.captureError ? html`<div class="pill danger" style="margin-top: 8px">${props.captureError}</div>` : nothing}
      </div>
    </div>

    <!-- Search -->
    <div class="card" style="margin-bottom: 16px">
      <div class="card-header">Search Notes</div>
      <div class="card-body">
        <div style="display: flex; gap: 8px; align-items: center">
          <input
            class="input"
            style="flex: 1"
            type="text"
            placeholder="Search notes..."
            .value=${props.searchQuery}
            @input=${(e: Event) => props.onSearchQueryChange((e.target as HTMLInputElement).value)}
            @keydown=${handleSearchKeydown}
          />
          <button
            class="btn btn--sm"
            @click=${props.onSearch}
            ?disabled=${props.searchLoading || !props.searchQuery.trim()}
          >
            ${props.searchLoading ? "Searching..." : "Search"}
          </button>
        </div>
        ${
          props.searchResults.length > 0
            ? html`
              <div style="margin-top: 12px">
                ${props.searchResults.map(
                  (r) => html`
                    <div style="padding: 6px 0; border-bottom: 1px solid var(--c-border)">
                      <strong>${r.title}</strong>
                      <span class="badge" style="margin-left: 6px">${r.entity_type}</span>
                      ${r.snippet ? html`<div class="muted" style="font-size: 12px; margin-top: 2px">${r.snippet}</div>` : nothing}
                    </div>
                  `,
                )}
              </div>
            `
            : nothing
        }
      </div>
    </div>

    <!-- Filter toolbar -->
    <div class="toolbar" style="margin-bottom: 12px; display: flex; gap: 8px; align-items: center">
      ${(["active", "dismissed", "all"] as const).map(
        (f) => html`
          <button
            class="btn btn--sm ${props.filter === f ? "btn--primary" : ""}"
            @click=${() => props.onFilterChange(f)}
          >
            ${f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        `,
      )}
      <button
        class="btn btn--sm"
        style="margin-left: auto"
        @click=${props.onRefresh}
        ?disabled=${props.loading}
      >
        ${props.loading ? "Loading..." : "Refresh"}
      </button>
    </div>

    <!-- Error -->
    ${props.error ? html`<div class="pill danger" style="margin-bottom: 12px">${props.error}</div>` : nothing}

    <!-- Notes list -->
    ${
      props.loading && props.items.length === 0
        ? html`
            <div class="card">
              <div class="card-body"><div class="muted">Loading notes...</div></div>
            </div>
          `
        : props.items.length === 0
          ? html`
              <div class="card">
                <div class="card-body">
                  <div class="muted">No notes yet. Capture your first thought above.</div>
                </div>
              </div>
            `
          : html`
            <div class="card-list">
              ${props.items.map(
                (item) => html`
                  <div class="card" style="margin-bottom: 8px">
                    <div class="card-body" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px">
                      <div style="display: flex; gap: 8px; align-items: flex-start; min-width: 0; flex: 1">
                        <div style="padding-top: 4px">${priorityDot(item.priority)}</div>
                        <div style="min-width: 0">
                          <div><strong>${item.subject}</strong></div>
                          ${item.body ? html`<div class="muted" style="font-size: 12px; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">${item.body}</div>` : nothing}
                          <div class="muted" style="font-size: 11px; margin-top: 4px">${timeAgo(item.created_at)}</div>
                        </div>
                      </div>
                      ${
                        item.status === "pending"
                          ? html`
                            <button
                              class="btn btn--sm"
                              style="flex-shrink: 0"
                              @click=${() => props.onDismiss(item.id)}
                            >
                              Done
                            </button>
                          `
                          : html`<span class="badge">${item.status}</span>`
                      }
                    </div>
                  </div>
                `,
              )}
            </div>
          `
    }
  `;
}
