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
