/**
 * Typed HTTP client for CommandCentral's Hub Backend API.
 *
 * Uses native fetch() — CC is a trusted local service,
 * and Wildvine's SSRF guard blocks localhost.
 */

const DEFAULT_BASE_URL = "http://localhost:9011";

let baseUrl = process.env.CC_HUB_URL || DEFAULT_BASE_URL;

export function setCCBaseUrl(url: string) {
  baseUrl = url;
}

export function getCCBaseUrl(): string {
  return baseUrl;
}

// ── Types ──────────────────────────────────────────────────

export interface CCSearchResult {
  id: string;
  entity_type: string;
  source: string;
  title: string;
  snippet: string | null;
  score: number;
  metadata: Record<string, unknown> | null;
  url: string | null;
}

export interface CCSearchResponse {
  query: string;
  total: number;
  results: CCSearchResult[];
  took_ms: number;
}

export interface CCIndexStatus {
  project_id: string;
  indexed_count: number;
  last_indexed_at: string | null;
  entity_counts: Record<string, number>;
}

export interface CCHealthResponse {
  status: string;
  components: Record<string, string>;
  version: string;
}

// ── Pipeline Types ─────────────────────────────────────────

export interface CCPipelineSummary {
  name: string;
  version: string;
  owner: string;
  path: string;
  stages_count: number;
  description: string;
}

export interface CCRunSummary {
  stages_run: number;
  stages_succeeded: number;
  stages_failed: number;
  stages_skipped: number;
  handlers_called: number;
  handlers_not_found: number;
  failed_at_stage?: string;
}

export interface CCRun {
  run_id: string;
  pipeline_name: string;
  pipeline_path: string;
  project_name: string;
  project_type: string;
  started_at: string;
  finished_at: string | null;
  status: "running" | "succeeded" | "failed";
  summary: CCRunSummary;
}

// ── Governor Types ─────────────────────────────────────────

export interface CCReferral {
  id: string;
  from_instance?: string;
  to_instance?: string;
  kind?: string;
  reason?: string;
  artifact_ref?: string;
  created_at?: string;
  ack_info?: Record<string, unknown> | null;
}

// ── Arena Types ────────────────────────────────────────────

export interface CCArenaSession {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  mode: string;
  status: string;
  agents: Record<string, unknown>[];
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface CCArenaMessage {
  id: string;
  session_id: string;
  role: string;
  sender: string;
  content: string;
  target_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ── Inbox Types ────────────────────────────────────────────

export interface CCNotification {
  id: string;
  from: string;
  to: string;
  reason: string;
  artifact_ref: string;
  created_at: string | null;
  is_read: boolean;
  is_acked: boolean;
  ack_info: Record<string, unknown> | null;
}

// ── VISLZR Types ───────────────────────────────────────────

export interface CCCanvas {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  node_count: number;
  edge_count: number;
  created_at: string;
  updated_at: string;
}

export interface CCNode {
  id: string;
  project_id: string;
  canvas_id: string;
  node_type: string;
  label: string;
  position_x: number;
  position_y: number;
  data: Record<string, unknown> | null;
  linked_entity_type: string | null;
  linked_entity_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CCEdge {
  id: string;
  project_id: string;
  canvas_id: string;
  source_node_id: string;
  target_node_id: string;
  edge_type: string;
  label: string | null;
  weight: number;
  data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// ── Helpers ────────────────────────────────────────────────

async function ccFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    signal: init?.signal ?? AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`CC API ${res.status}: ${text || res.statusText}`);
  }

  return res.json() as Promise<T>;
}

// ── API Functions ──────────────────────────────────────────

export async function ccHealthCheck(): Promise<CCHealthResponse> {
  return ccFetch<CCHealthResponse>("/api/health");
}

/**
 * Poll /api/health until CC responds with 200, or timeout.
 * Useful when waiting for CC to start via cc-process-manager.
 */
export async function waitForCC(timeoutMs = 30_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await ccHealthCheck();
      return true;
    } catch {
      // Not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

export async function ccKbSearch(
  projectId: string,
  query: string,
  opts?: { entity_types?: string[]; limit?: number },
): Promise<CCSearchResponse> {
  const params = new URLSearchParams({ project_id: projectId });
  return ccFetch<CCSearchResponse>(`/api/kb/search?${params}`, {
    method: "POST",
    body: JSON.stringify({
      query,
      entity_types: opts?.entity_types ?? null,
      limit: opts?.limit ?? 20,
    }),
  });
}

export async function ccKbSearchMulti(
  projectIds: string[],
  query: string,
  opts?: { entity_types?: string[]; limit?: number },
): Promise<CCSearchResponse> {
  return ccFetch<CCSearchResponse>("/api/kb/search/multi", {
    method: "POST",
    body: JSON.stringify({
      query,
      project_ids: projectIds,
      entity_types: opts?.entity_types ?? null,
      limit: opts?.limit ?? 20,
    }),
  });
}

export async function ccKbIndexStatus(projectId: string): Promise<CCIndexStatus> {
  const params = new URLSearchParams({ project_id: projectId });
  return ccFetch<CCIndexStatus>(`/api/kb/index/status?${params}`);
}

// ── Pipelines ──────────────────────────────────────────────

export async function ccPipelinesList(owner?: string): Promise<CCPipelineSummary[]> {
  const params = owner ? `?owner=${encodeURIComponent(owner)}` : "";
  const res = await ccFetch<{ pipelines: CCPipelineSummary[] }>(`/api/pipelines${params}`);
  return res.pipelines;
}

export async function ccPipelineGet(
  pipelineName: string,
): Promise<{ pipeline: Record<string, unknown>; path: string }> {
  return ccFetch(`/api/pipelines/${encodeURIComponent(pipelineName)}`);
}

export async function ccRunCreate(opts: {
  pipeline_path: string;
  project_name: string;
  project_type?: string;
}): Promise<{ run_id: string }> {
  return ccFetch("/api/runs", {
    method: "POST",
    body: JSON.stringify({
      pipeline_path: opts.pipeline_path,
      project_name: opts.project_name,
      project_type: opts.project_type ?? "core",
    }),
  });
}

export async function ccRunsList(opts?: {
  pipeline_name?: string;
  status?: string;
  limit?: number;
}): Promise<CCRun[]> {
  const params = new URLSearchParams();
  if (opts?.pipeline_name) params.set("pipeline_name", opts.pipeline_name);
  if (opts?.status) params.set("status", opts.status);
  if (opts?.limit) params.set("limit", String(opts.limit));
  const qs = params.toString();
  const res = await ccFetch<{ runs: CCRun[] }>(`/api/runs${qs ? `?${qs}` : ""}`);
  return res.runs;
}

export async function ccRunGet(runId: string): Promise<CCRun> {
  const res = await ccFetch<{ run: CCRun }>(`/api/runs/${encodeURIComponent(runId)}`);
  return res.run;
}

// ── Governor Queue ─────────────────────────────────────────

export async function ccGovernorPending(
  instance: string,
  limit?: number,
): Promise<{ pending: CCReferral[]; count: number }> {
  const params = new URLSearchParams({ instance });
  if (limit) params.set("limit", String(limit));
  return ccFetch(`/api/governor/pending?${params}`);
}

export async function ccGovernorApprove(
  instance: string,
  referralId: string,
  comment?: string,
): Promise<{ action: string; referral_id: string }> {
  return ccFetch(`/api/governor/${encodeURIComponent(instance)}/approve`, {
    method: "POST",
    body: JSON.stringify({ referral_id: referralId, comment: comment ?? "" }),
  });
}

export async function ccGovernorDeny(
  instance: string,
  referralId: string,
  comment?: string,
): Promise<{ action: string; referral_id: string }> {
  return ccFetch(`/api/governor/${encodeURIComponent(instance)}/deny`, {
    method: "POST",
    body: JSON.stringify({ referral_id: referralId, comment: comment ?? "" }),
  });
}

export async function ccGovernorHistory(
  instance: string,
  limit?: number,
): Promise<{ history: CCReferral[] }> {
  const params = new URLSearchParams();
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  return ccFetch(`/api/governor/${encodeURIComponent(instance)}/history${qs ? `?${qs}` : ""}`);
}

// ── Arena ──────────────────────────────────────────────────

export async function ccArenaSessions(
  projectId: string,
  opts?: { status?: string; limit?: number },
): Promise<CCArenaSession[]> {
  const params = new URLSearchParams({ project_id: projectId });
  if (opts?.status) params.set("status", opts.status);
  if (opts?.limit) params.set("limit", String(opts.limit));
  return ccFetch<CCArenaSession[]>(`/api/arena/sessions?${params}`);
}

export async function ccArenaCreateSession(
  projectId: string,
  opts: {
    name: string;
    description?: string;
    mode?: string;
    agents: { display_name: string; model: string; archetype?: string; temperature?: number }[];
    context?: string;
  },
): Promise<CCArenaSession> {
  const params = new URLSearchParams({ project_id: projectId });
  return ccFetch<CCArenaSession>(`/api/arena/sessions?${params}`, {
    method: "POST",
    body: JSON.stringify(opts),
  });
}

export async function ccArenaChat(
  sessionId: string,
  projectId: string,
  content: string,
  opts?: { target_agent?: string; generate_responses?: boolean },
): Promise<Record<string, unknown>> {
  const params = new URLSearchParams({ project_id: projectId });
  if (opts?.generate_responses === false) params.set("generate_responses", "false");
  return ccFetch(`/api/arena/sessions/${encodeURIComponent(sessionId)}/chat?${params}`, {
    method: "POST",
    body: JSON.stringify({ content, target_agent: opts?.target_agent }),
  });
}

export async function ccArenaMessages(
  sessionId: string,
  projectId: string,
  opts?: { limit?: number },
): Promise<CCArenaMessage[]> {
  const params = new URLSearchParams({ project_id: projectId });
  if (opts?.limit) params.set("limit", String(opts.limit));
  return ccFetch<CCArenaMessage[]>(
    `/api/arena/sessions/${encodeURIComponent(sessionId)}/messages?${params}`,
  );
}

// ── Inbox ──────────────────────────────────────────────────

export async function ccInboxList(
  instance: string,
  opts?: { unread_only?: boolean; unacked_only?: boolean; limit?: number },
): Promise<{ notifications: CCNotification[]; total: number; unread: number; unacked: number }> {
  const params = new URLSearchParams();
  if (opts?.unread_only) params.set("unread_only", "true");
  if (opts?.unacked_only) params.set("unacked_only", "true");
  if (opts?.limit) params.set("limit", String(opts.limit));
  const qs = params.toString();
  return ccFetch(`/api/inbox/${encodeURIComponent(instance)}${qs ? `?${qs}` : ""}`);
}

export async function ccInboxAck(
  instance: string,
  referralId: string,
  note?: string,
): Promise<{ referral_id: string; action: string }> {
  return ccFetch(`/api/inbox/${encodeURIComponent(instance)}/ack`, {
    method: "POST",
    body: JSON.stringify({ referral_id: referralId, note: note ?? "" }),
  });
}

export async function ccInboxCounts(
  instance: string,
): Promise<{ total: number; read: number; unread: number; acked: number; unacked: number }> {
  return ccFetch(`/api/inbox/${encodeURIComponent(instance)}/counts`);
}

// ── VISLZR ─────────────────────────────────────────────────

export async function ccVislzrCanvases(
  projectId: string,
  opts?: { limit?: number },
): Promise<CCCanvas[]> {
  const params = new URLSearchParams({ project_id: projectId });
  if (opts?.limit) params.set("limit", String(opts.limit));
  return ccFetch<CCCanvas[]>(`/api/vislzr/canvases?${params}`);
}

export async function ccVislzrCanvasGet(
  canvasId: string,
  projectId: string,
): Promise<{ canvas: CCCanvas; nodes: CCNode[]; edges: Record<string, unknown>[] }> {
  const params = new URLSearchParams({ project_id: projectId });
  return ccFetch(`/api/vislzr/canvases/${encodeURIComponent(canvasId)}?${params}`);
}

export async function ccVislzrStats(projectId: string): Promise<{
  canvases: number;
  nodes: Record<string, number>;
  edges: Record<string, number>;
  linked_entities: Record<string, number>;
}> {
  const params = new URLSearchParams({ project_id: projectId });
  return ccFetch(`/api/vislzr/stats?${params}`);
}

export async function ccVislzrCanvasCreate(
  projectId: string,
  opts: { name: string; description?: string },
): Promise<CCCanvas> {
  const params = new URLSearchParams({ project_id: projectId });
  return ccFetch<CCCanvas>(`/api/vislzr/canvases?${params}`, {
    method: "POST",
    body: JSON.stringify(opts),
  });
}

export async function ccVislzrCanvasUpdate(
  canvasId: string,
  projectId: string,
  opts: { name?: string; description?: string },
): Promise<CCCanvas> {
  const params = new URLSearchParams({ project_id: projectId });
  return ccFetch<CCCanvas>(`/api/vislzr/canvases/${encodeURIComponent(canvasId)}?${params}`, {
    method: "PATCH",
    body: JSON.stringify(opts),
  });
}

export async function ccVislzrCanvasDelete(
  canvasId: string,
  projectId: string,
): Promise<{ deleted: boolean }> {
  const params = new URLSearchParams({ project_id: projectId });
  return ccFetch(`/api/vislzr/canvases/${encodeURIComponent(canvasId)}?${params}`, {
    method: "DELETE",
  });
}

export async function ccVislzrNodeCreate(
  canvasId: string,
  projectId: string,
  opts: {
    node_type: string;
    label: string;
    position_x?: number;
    position_y?: number;
    data?: Record<string, unknown>;
    linked_entity_type?: string;
    linked_entity_id?: string;
  },
): Promise<CCNode> {
  const params = new URLSearchParams({ project_id: projectId });
  return ccFetch<CCNode>(`/api/vislzr/canvases/${encodeURIComponent(canvasId)}/nodes?${params}`, {
    method: "POST",
    body: JSON.stringify(opts),
  });
}

export async function ccVislzrNodeUpdate(
  canvasId: string,
  nodeId: string,
  projectId: string,
  opts: {
    label?: string;
    position_x?: number;
    position_y?: number;
    data?: Record<string, unknown>;
  },
): Promise<CCNode> {
  const params = new URLSearchParams({ project_id: projectId });
  return ccFetch<CCNode>(
    `/api/vislzr/canvases/${encodeURIComponent(canvasId)}/nodes/${encodeURIComponent(nodeId)}?${params}`,
    { method: "PATCH", body: JSON.stringify(opts) },
  );
}

export async function ccVislzrNodeBulkUpdate(
  canvasId: string,
  projectId: string,
  updates: {
    id: string;
    position_x?: number;
    position_y?: number;
    data?: Record<string, unknown>;
  }[],
): Promise<{ updated: number }> {
  const params = new URLSearchParams({ project_id: projectId });
  return ccFetch(`/api/vislzr/canvases/${encodeURIComponent(canvasId)}/nodes/bulk?${params}`, {
    method: "PATCH",
    body: JSON.stringify({ updates }),
  });
}

export async function ccVislzrNodeDelete(
  canvasId: string,
  nodeId: string,
  projectId: string,
): Promise<{ deleted: boolean }> {
  const params = new URLSearchParams({ project_id: projectId });
  return ccFetch(
    `/api/vislzr/canvases/${encodeURIComponent(canvasId)}/nodes/${encodeURIComponent(nodeId)}?${params}`,
    { method: "DELETE" },
  );
}

export async function ccVislzrEdgeCreate(
  canvasId: string,
  projectId: string,
  opts: {
    source_node_id: string;
    target_node_id: string;
    edge_type: string;
    label?: string;
    weight?: number;
    data?: Record<string, unknown>;
  },
): Promise<CCEdge> {
  const params = new URLSearchParams({ project_id: projectId });
  return ccFetch<CCEdge>(`/api/vislzr/canvases/${encodeURIComponent(canvasId)}/edges?${params}`, {
    method: "POST",
    body: JSON.stringify(opts),
  });
}

export async function ccVislzrEdgeUpdate(
  canvasId: string,
  edgeId: string,
  projectId: string,
  opts: { label?: string; weight?: number; data?: Record<string, unknown> },
): Promise<CCEdge> {
  const params = new URLSearchParams({ project_id: projectId });
  return ccFetch<CCEdge>(
    `/api/vislzr/canvases/${encodeURIComponent(canvasId)}/edges/${encodeURIComponent(edgeId)}?${params}`,
    { method: "PATCH", body: JSON.stringify(opts) },
  );
}

export async function ccVislzrEdgeDelete(
  canvasId: string,
  edgeId: string,
  projectId: string,
): Promise<{ deleted: boolean }> {
  const params = new URLSearchParams({ project_id: projectId });
  return ccFetch(
    `/api/vislzr/canvases/${encodeURIComponent(canvasId)}/edges/${encodeURIComponent(edgeId)}?${params}`,
    { method: "DELETE" },
  );
}

export async function ccVislzrWander(
  canvasId: string,
  projectId: string,
  startNodeId: string,
  opts?: { depth?: number; edge_types?: string[] },
): Promise<{ nodes: CCNode[]; edges: CCEdge[] }> {
  const params = new URLSearchParams({ project_id: projectId });
  return ccFetch(`/api/vislzr/canvases/${encodeURIComponent(canvasId)}/wander?${params}`, {
    method: "POST",
    body: JSON.stringify({
      start_node_id: startNodeId,
      depth: opts?.depth ?? 2,
      edge_types: opts?.edge_types,
    }),
  });
}

export async function ccVislzrGenerateLayout(
  canvasId: string,
  projectId: string,
  opts?: { algorithm?: string },
): Promise<{ positions: Record<string, { x: number; y: number }> }> {
  const params = new URLSearchParams({ project_id: projectId });
  return ccFetch(`/api/vislzr/canvases/${encodeURIComponent(canvasId)}/layout?${params}`, {
    method: "POST",
    body: JSON.stringify({ algorithm: opts?.algorithm ?? "force" }),
  });
}

// ── IDEALZR Types ─────────────────────────────────────────

export interface CCGoal {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  state: "DRAFT" | "ACTIVE" | "ACHIEVED" | "ARCHIVED";
  progress: number;
  canvas_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CCHypothesis {
  id: string;
  project_id: string;
  goal_id: string;
  title: string;
  description: string | null;
  state: "PROPOSED" | "TESTING" | "VALIDATED" | "INVALIDATED";
  confidence: number;
  created_at: string;
  updated_at: string;
}

export interface CCEvidence {
  id: string;
  project_id: string;
  hypothesis_id: string;
  title: string;
  description: string | null;
  kind: "SUPPORTS" | "CONTRADICTS" | "NEUTRAL";
  source: string | null;
  created_at: string;
  updated_at: string;
}

// ── IDEALZR API Functions ─────────────────────────────────

export async function ccIdealzrGoals(
  projectId: string,
  opts?: { state?: string; limit?: number },
): Promise<CCGoal[]> {
  const params = new URLSearchParams({ project_id: projectId });
  if (opts?.state) params.set("state", opts.state);
  if (opts?.limit) params.set("limit", String(opts.limit));
  return ccFetch<CCGoal[]>(`/api/idealzr/goals?${params}`);
}

export async function ccIdealzrGoalCreate(
  projectId: string,
  opts: {
    title: string;
    description?: string;
    state?: string;
    progress?: number;
    canvas_id?: string;
  },
): Promise<CCGoal> {
  const params = new URLSearchParams({ project_id: projectId });
  return ccFetch<CCGoal>(`/api/idealzr/goals?${params}`, {
    method: "POST",
    body: JSON.stringify(opts),
  });
}

export async function ccIdealzrGoalUpdate(
  goalId: string,
  projectId: string,
  opts: {
    title?: string;
    description?: string;
    state?: string;
    progress?: number;
    canvas_id?: string;
  },
): Promise<CCGoal> {
  const params = new URLSearchParams({ project_id: projectId });
  return ccFetch<CCGoal>(`/api/idealzr/goals/${encodeURIComponent(goalId)}?${params}`, {
    method: "PATCH",
    body: JSON.stringify(opts),
  });
}

export async function ccIdealzrGoalDelete(
  goalId: string,
  projectId: string,
): Promise<{ deleted: boolean }> {
  const params = new URLSearchParams({ project_id: projectId });
  return ccFetch(`/api/idealzr/goals/${encodeURIComponent(goalId)}?${params}`, {
    method: "DELETE",
  });
}

export async function ccIdealzrHypotheses(
  projectId: string,
  opts?: { goal_id?: string; state?: string; limit?: number },
): Promise<CCHypothesis[]> {
  const params = new URLSearchParams({ project_id: projectId });
  if (opts?.goal_id) params.set("goal_id", opts.goal_id);
  if (opts?.state) params.set("state", opts.state);
  if (opts?.limit) params.set("limit", String(opts.limit));
  return ccFetch<CCHypothesis[]>(`/api/idealzr/hypotheses?${params}`);
}

export async function ccIdealzrHypothesisCreate(
  projectId: string,
  opts: {
    goal_id: string;
    title: string;
    description?: string;
    state?: string;
    confidence?: number;
  },
): Promise<CCHypothesis> {
  const params = new URLSearchParams({ project_id: projectId });
  return ccFetch<CCHypothesis>(`/api/idealzr/hypotheses?${params}`, {
    method: "POST",
    body: JSON.stringify(opts),
  });
}

export async function ccIdealzrHypothesisUpdate(
  hypothesisId: string,
  projectId: string,
  opts: { title?: string; description?: string; state?: string; confidence?: number },
): Promise<CCHypothesis> {
  const params = new URLSearchParams({ project_id: projectId });
  return ccFetch<CCHypothesis>(
    `/api/idealzr/hypotheses/${encodeURIComponent(hypothesisId)}?${params}`,
    {
      method: "PATCH",
      body: JSON.stringify(opts),
    },
  );
}

export async function ccIdealzrHypothesisDelete(
  hypothesisId: string,
  projectId: string,
): Promise<{ deleted: boolean }> {
  const params = new URLSearchParams({ project_id: projectId });
  return ccFetch(`/api/idealzr/hypotheses/${encodeURIComponent(hypothesisId)}?${params}`, {
    method: "DELETE",
  });
}

export async function ccIdealzrEvidence(
  projectId: string,
  opts?: { hypothesis_id?: string; kind?: string; limit?: number },
): Promise<CCEvidence[]> {
  const params = new URLSearchParams({ project_id: projectId });
  if (opts?.hypothesis_id) params.set("hypothesis_id", opts.hypothesis_id);
  if (opts?.kind) params.set("kind", opts.kind);
  if (opts?.limit) params.set("limit", String(opts.limit));
  return ccFetch<CCEvidence[]>(`/api/idealzr/evidence?${params}`);
}

export async function ccIdealzrEvidenceCreate(
  projectId: string,
  opts: {
    hypothesis_id: string;
    title: string;
    description?: string;
    kind?: string;
    source?: string;
  },
): Promise<CCEvidence> {
  const params = new URLSearchParams({ project_id: projectId });
  return ccFetch<CCEvidence>(`/api/idealzr/evidence?${params}`, {
    method: "POST",
    body: JSON.stringify(opts),
  });
}

export async function ccIdealzrEvidenceUpdate(
  evidenceId: string,
  projectId: string,
  opts: { title?: string; description?: string; kind?: string; source?: string },
): Promise<CCEvidence> {
  const params = new URLSearchParams({ project_id: projectId });
  return ccFetch<CCEvidence>(`/api/idealzr/evidence/${encodeURIComponent(evidenceId)}?${params}`, {
    method: "PATCH",
    body: JSON.stringify(opts),
  });
}

export async function ccIdealzrEvidenceDelete(
  evidenceId: string,
  projectId: string,
): Promise<{ deleted: boolean }> {
  const params = new URLSearchParams({ project_id: projectId });
  return ccFetch(`/api/idealzr/evidence/${encodeURIComponent(evidenceId)}?${params}`, {
    method: "DELETE",
  });
}

// ── Skills ────────────────────────────────────────────────

export interface CCSkillSummary {
  name: string;
  description: string;
  priority: string;
  keywords: string[];
}

export interface CCSkillFull extends CCSkillSummary {
  path: string;
  content: string;
}

export interface CCSkillResolution {
  task_description: string;
  resolved_skills: { name: string; priority: string; path: string }[];
  p0_count: number;
  p1_count: number;
  p2_count: number;
}

export async function ccSkillsList(): Promise<{ skills: CCSkillSummary[] }> {
  return ccFetch("/api/skills/list");
}

export async function ccSkillGet(skillName: string): Promise<CCSkillFull> {
  return ccFetch(`/api/skills/${encodeURIComponent(skillName)}`);
}

export async function ccSkillsResolve(taskDescription: string): Promise<CCSkillResolution> {
  return ccFetch("/api/skills/resolve", {
    method: "POST",
    body: JSON.stringify({ task_description: taskDescription }),
  });
}

// ── Knowledge Capture ─────────────────────────────────────

export interface CCKnowledgeCaptureRequest {
  content: string;
  source: string;
  agent_id?: string;
  session_id?: string;
  metadata?: Record<string, unknown>;
}

export interface CCKnowledgeCaptureResponse {
  id: string;
  status: string;
  message?: string;
}

export async function ccKnowledgeCapture(
  request: CCKnowledgeCaptureRequest,
): Promise<CCKnowledgeCaptureResponse> {
  return ccFetch<CCKnowledgeCaptureResponse>("/api/knowledge/capture", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function ccKnowledgeSessionEnd(
  agentId: string,
  summary: string,
  sessionId?: string,
): Promise<CCKnowledgeCaptureResponse> {
  return ccFetch<CCKnowledgeCaptureResponse>(
    `/api/kb/memory/${encodeURIComponent(agentId)}/session-end`,
    {
      method: "POST",
      body: JSON.stringify({ summary, session_id: sessionId }),
    },
  );
}

export async function ccSkillsIngest(skill: {
  name: string;
  content: string;
  source?: string;
  priority?: string;
  keywords?: string[];
}): Promise<{ run_id: string }> {
  return ccFetch<{ run_id: string }>("/api/runs", {
    method: "POST",
    body: JSON.stringify({
      pipeline_path: "pipelines/workflow/skill-ingestion.pipeline.yml",
      project_name: "wildvine",
      project_type: "core",
      stage_payload: {
        skill_name: skill.name,
        skill_content: skill.content,
        skill_source: skill.source ?? "wildvine",
        skill_priority: skill.priority,
        skill_keywords: skill.keywords,
      },
    }),
  });
}
// ── Notes (via Agent Inbox) ───────────────────────────────

export interface CCInboxItem {
  id: string;
  agent_id: string;
  source: string;
  created_at: string;
  updated_at: string;
  priority: "RED" | "YELLOW" | "GREEN";
  status: "pending" | "working" | "input-required" | "suspended" | "completed" | "failed";
  subject: string;
  body: string;
  attachments: string[];
  deliberation: Record<string, unknown>;
  escalation: Record<string, unknown> | null;
  execution_log: { timestamp: string; entry: string }[];
  resolved_at: string | null;
  resolved_by: string | null;
}

export interface CCInboxListResponse {
  items: CCInboxItem[];
  count: number;
}

export async function ccNotesCapture(opts: {
  subject: string;
  body?: string;
  priority?: "RED" | "YELLOW" | "GREEN";
}): Promise<CCInboxItem> {
  return ccFetch<CCInboxItem>("/api/agent-inbox/items", {
    method: "POST",
    body: JSON.stringify({
      agent_id: "notes",
      source: "living-note",
      subject: opts.subject,
      body: opts.body ?? "",
      priority: opts.priority ?? "GREEN",
    }),
  });
}

export async function ccNotesList(opts?: {
  status?: string;
  priority?: string;
  limit?: number;
}): Promise<CCInboxListResponse> {
  const params = new URLSearchParams({ agent_id: "notes" });
  if (opts?.status) params.set("status", opts.status);
  if (opts?.priority) params.set("priority", opts.priority);
  if (opts?.limit) params.set("limit", String(opts.limit));
  return ccFetch<CCInboxListResponse>(`/api/agent-inbox/items?${params}`);
}

export async function ccNotesDismiss(itemId: string): Promise<CCInboxItem> {
  return ccFetch<CCInboxItem>(`/api/agent-inbox/items/${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "working" }),
  });
}

export async function ccNotesComplete(itemId: string): Promise<CCInboxItem> {
  return ccFetch<CCInboxItem>(`/api/agent-inbox/items/${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "completed" }),
  });
}

export async function ccNotesSearch(query: string, limit?: number): Promise<CCSearchResponse> {
  return ccKbSearchMulti(["veria:inbox:notes"], query, { limit: limit ?? 20 });
}
