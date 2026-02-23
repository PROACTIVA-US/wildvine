import type { GatewayBrowserClient } from "../gateway.ts";

// ── Types ──────────────────────────────────────────────────

export type CCPipelineSummary = {
  name: string;
  version: string;
  owner: string;
  path: string;
  stages_count: number;
  description: string;
};

export type CCRunSummary = {
  run_id: string;
  pipeline_name: string;
  pipeline_path: string;
  project_name: string;
  project_type: string;
  started_at: string;
  finished_at: string | null;
  status: "running" | "succeeded" | "failed";
  summary: {
    stages_run: number;
    stages_succeeded: number;
    stages_failed: number;
    stages_skipped: number;
  };
};

export type CCReferral = {
  id: string;
  from_instance?: string;
  to_instance?: string;
  kind?: string;
  reason?: string;
  artifact_ref?: string;
  created_at?: string;
};

export type CCKbResult = {
  id: string;
  entity_type: string;
  title: string;
  snippet: string | null;
  score: number;
};

export type CCArenaSession = {
  id: string;
  project_id: string;
  name: string;
  mode: string;
  status: string;
  message_count: number;
  created_at: string;
};

export type CCArenaMessage = {
  id: string;
  role: string;
  sender: string;
  content: string;
  created_at: string;
};

export type CCProcessStatus = {
  overall: "running" | "partial" | "stopped";
  services: Record<
    string,
    {
      id: string;
      running: boolean;
      pid: number | null;
      port: number;
      uptimeMs: number | null;
      healthy: boolean;
    }
  >;
};

// ── State types ────────────────────────────────────────────

export type CcDataState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  ccPipelinesLoading: boolean;
  ccPipelines: CCPipelineSummary[];
  ccPipelinesError: string | null;
  ccRunsLoading: boolean;
  ccRuns: CCRunSummary[];
  ccRunsError: string | null;
  ccGovernorLoading: boolean;
  ccGovernorPending: CCReferral[];
  ccGovernorCount: number;
  ccGovernorError: string | null;
  ccKbLoading: boolean;
  ccKbResults: CCKbResult[];
  ccKbQuery: string;
  ccKbError: string | null;
  ccArenaLoading: boolean;
  ccArenaSessions: CCArenaSession[];
  ccArenaError: string | null;
  ccArenaSelectedId: string | null;
  ccArenaMessages: CCArenaMessage[];
  ccArenaMessagesLoading: boolean;
  ccArenaChatInput: string;
  ccProcessStatus: CCProcessStatus | null;
};

// ── Loaders ────────────────────────────────────────────────

export async function loadCcPipelines(state: CcDataState) {
  if (!state.client || !state.connected) {
    return;
  }
  state.ccPipelinesLoading = true;
  state.ccPipelinesError = null;
  try {
    const res = await state.client.request<{ pipelines: CCPipelineSummary[] }>(
      "cc.pipelines.list",
      {},
    );
    state.ccPipelines = res?.pipelines ?? [];
  } catch (err) {
    state.ccPipelinesError = String(err);
    state.ccPipelines = [];
  } finally {
    state.ccPipelinesLoading = false;
  }
}

export async function loadCcRuns(state: CcDataState) {
  if (!state.client || !state.connected) {
    return;
  }
  state.ccRunsLoading = true;
  state.ccRunsError = null;
  try {
    const res = await state.client.request<{ runs: CCRunSummary[] }>("cc.runs.list", {
      limit: 20,
    });
    state.ccRuns = res?.runs ?? [];
  } catch (err) {
    state.ccRunsError = String(err);
    state.ccRuns = [];
  } finally {
    state.ccRunsLoading = false;
  }
}

export async function triggerCcRun(state: CcDataState, pipelinePath: string, projectName: string) {
  if (!state.client || !state.connected) {
    return;
  }
  try {
    await state.client.request("cc.runs.create", {
      pipeline_path: pipelinePath,
      project_name: projectName,
    });
    // Refresh runs list
    await loadCcRuns(state);
  } catch (err) {
    state.ccRunsError = String(err);
  }
}

export async function loadCcGovernor(state: CcDataState) {
  if (!state.client || !state.connected) {
    return;
  }
  state.ccGovernorLoading = true;
  state.ccGovernorError = null;
  try {
    const res = await state.client.request<{ pending: CCReferral[]; count: number }>(
      "cc.governor.pending",
      {},
    );
    state.ccGovernorPending = res?.pending ?? [];
    state.ccGovernorCount = res?.count ?? 0;
  } catch (err) {
    state.ccGovernorError = String(err);
    state.ccGovernorPending = [];
    state.ccGovernorCount = 0;
  } finally {
    state.ccGovernorLoading = false;
  }
}

export async function approveCcReferral(state: CcDataState, referralId: string, comment?: string) {
  if (!state.client || !state.connected) {
    return;
  }
  try {
    await state.client.request("cc.governor.approve", { referral_id: referralId, comment });
    await loadCcGovernor(state);
  } catch (err) {
    state.ccGovernorError = String(err);
  }
}

export async function denyCcReferral(state: CcDataState, referralId: string, comment?: string) {
  if (!state.client || !state.connected) {
    return;
  }
  try {
    await state.client.request("cc.governor.deny", { referral_id: referralId, comment });
    await loadCcGovernor(state);
  } catch (err) {
    state.ccGovernorError = String(err);
  }
}

export async function loadCcKb(state: CcDataState) {
  if (!state.client || !state.connected || !state.ccKbQuery.trim()) {
    return;
  }
  state.ccKbLoading = true;
  state.ccKbError = null;
  try {
    const res = await state.client.request<{ results: CCKbResult[] }>("cc.kb.search", {
      query: state.ccKbQuery.trim(),
      limit: 20,
    });
    state.ccKbResults = res?.results ?? [];
  } catch (err) {
    state.ccKbError = String(err);
    state.ccKbResults = [];
  } finally {
    state.ccKbLoading = false;
  }
}

export async function loadCcArenaSessions(state: CcDataState) {
  if (!state.client || !state.connected) {
    return;
  }
  state.ccArenaLoading = true;
  state.ccArenaError = null;
  try {
    const res = await state.client.request<CCArenaSession[]>("cc.arena.sessions", {});
    state.ccArenaSessions = Array.isArray(res) ? res : [];
  } catch (err) {
    state.ccArenaError = String(err);
    state.ccArenaSessions = [];
  } finally {
    state.ccArenaLoading = false;
  }
}

export async function loadCcArenaMessages(state: CcDataState, sessionId: string) {
  if (!state.client || !state.connected) {
    return;
  }
  state.ccArenaMessagesLoading = true;
  try {
    const res = await state.client.request<CCArenaMessage[]>("cc.arena.messages", {
      session_id: sessionId,
    });
    state.ccArenaMessages = Array.isArray(res) ? res : [];
  } catch {
    state.ccArenaMessages = [];
  } finally {
    state.ccArenaMessagesLoading = false;
  }
}

export async function sendCcArenaChat(state: CcDataState) {
  if (
    !state.client ||
    !state.connected ||
    !state.ccArenaSelectedId ||
    !state.ccArenaChatInput.trim()
  ) {
    return;
  }
  try {
    await state.client.request("cc.arena.chat", {
      session_id: state.ccArenaSelectedId,
      content: state.ccArenaChatInput.trim(),
    });
    state.ccArenaChatInput = "";
    await loadCcArenaMessages(state, state.ccArenaSelectedId);
  } catch (err) {
    state.ccArenaError = String(err);
  }
}

export async function loadCcProcessStatus(state: CcDataState) {
  if (!state.client || !state.connected) {
    return;
  }
  try {
    const res = await state.client.request<CCProcessStatus>("cc.process.status", {});
    state.ccProcessStatus = res ?? null;
  } catch {
    state.ccProcessStatus = null;
  }
}
