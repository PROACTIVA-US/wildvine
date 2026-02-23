import type { GatewayBrowserClient } from "../gateway.ts";

// ── Types ──────────────────────────────────────────────────

export type CCInboxItem = {
  id: string;
  agent_id: string;
  source: string;
  created_at: string;
  updated_at: string;
  priority: "RED" | "YELLOW" | "GREEN";
  status: "pending" | "working" | "input-required" | "suspended" | "completed" | "failed";
  subject: string;
  body: string;
};

export type CCKbSearchResult = {
  id: string;
  entity_type: string;
  title: string;
  snippet: string | null;
  score: number;
};

// ── State type ─────────────────────────────────────────────

export type NotesState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  notesLoading: boolean;
  notesItems: CCInboxItem[];
  notesError: string | null;
  notesCaptureDraft: string;
  notesCapturePriority: "RED" | "YELLOW" | "GREEN";
  notesCaptureBusy: boolean;
  notesCaptureError: string | null;
  notesSearchQuery: string;
  notesSearchResults: CCKbSearchResult[];
  notesSearchLoading: boolean;
  notesFilter: "active" | "dismissed" | "all";
};

// ── Loaders ────────────────────────────────────────────────

export async function loadNotes(state: NotesState) {
  if (!state.client || !state.connected) {
    return;
  }
  state.notesLoading = true;
  state.notesError = null;
  try {
    const statusFilter =
      state.notesFilter === "active"
        ? "pending"
        : state.notesFilter === "dismissed"
          ? "completed"
          : undefined;
    const res = await state.client.request<{ items: CCInboxItem[]; count: number }>("notes.list", {
      status: statusFilter,
      limit: 50,
    });
    state.notesItems = res?.items ?? [];
  } catch (err) {
    state.notesError = String(err);
    state.notesItems = [];
  } finally {
    state.notesLoading = false;
  }
}

export async function captureNote(state: NotesState) {
  if (!state.client || !state.connected || !state.notesCaptureDraft.trim()) {
    return;
  }
  state.notesCaptureBusy = true;
  state.notesCaptureError = null;
  try {
    await state.client.request("notes.capture", {
      subject: state.notesCaptureDraft.trim(),
      priority: state.notesCapturePriority,
    });
    state.notesCaptureDraft = "";
    state.notesCapturePriority = "GREEN";
    await loadNotes(state);
  } catch (err) {
    state.notesCaptureError = String(err);
  } finally {
    state.notesCaptureBusy = false;
  }
}

export async function dismissNote(state: NotesState, id: string) {
  if (!state.client || !state.connected) {
    return;
  }
  try {
    await state.client.request("notes.dismiss", { id });
    state.notesItems = state.notesItems.filter((item) => item.id !== id);
  } catch (err) {
    state.notesError = String(err);
  }
}

export async function searchNotes(state: NotesState) {
  if (!state.client || !state.connected || !state.notesSearchQuery.trim()) {
    state.notesSearchResults = [];
    return;
  }
  state.notesSearchLoading = true;
  try {
    const res = await state.client.request<{ results: CCKbSearchResult[] }>("notes.search", {
      query: state.notesSearchQuery.trim(),
      limit: 10,
    });
    state.notesSearchResults = res?.results ?? [];
  } catch {
    state.notesSearchResults = [];
  } finally {
    state.notesSearchLoading = false;
  }
}
