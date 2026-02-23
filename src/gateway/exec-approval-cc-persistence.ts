/**
 * CC Governor persistence for exec-approval decisions.
 *
 * Write-through: after each local approval decision, persist to CC governor.
 * Read-back: on gateway start, load pending approvals from CC governor history.
 * Graceful degradation: if CC is unreachable, silently skip persistence.
 */

import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("exec-approval-cc");

// CC base URL — mirrors cc-client.ts but avoids circular dependency with extension
const CC_HUB_URL = process.env.CC_HUB_URL || "http://localhost:9011";

async function ccFetchSafe<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const url = `${CC_HUB_URL}${path}`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (init?.headers) {
      const h = init.headers as Record<string, string>;
      for (const key of Object.keys(h)) {
        headers[key] = h[key];
      }
    }
    const res = await fetch(url, {
      ...init,
      headers,
      signal: init?.signal ?? AbortSignal.timeout(5_000),
    });
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export interface CCPersistedApproval {
  id: string;
  kind?: string;
  reason?: string;
  from_instance?: string;
  artifact_ref?: string;
  created_at?: string;
  ack_info?: Record<string, unknown> | null;
}

/**
 * Persist an exec-approval decision to CC governor.
 * Non-blocking, fire-and-forget. Returns true if persisted, false if CC unreachable.
 */
export async function persistApprovalToCC(params: {
  approvalId: string;
  command: string;
  decision: "allow-once" | "allow-always" | "deny";
  agentId?: string | null;
  sessionKey?: string | null;
  resolvedBy?: string | null;
}): Promise<boolean> {
  const instance = "wildvine";
  const action = params.decision === "deny" ? "deny" : "approve";
  const comment = JSON.stringify({
    type: "exec-approval",
    command: params.command,
    decision: params.decision,
    agentId: params.agentId ?? undefined,
    sessionKey: params.sessionKey ?? undefined,
    resolvedBy: params.resolvedBy ?? undefined,
    persistedAt: new Date().toISOString(),
  });

  // First create the referral in CC's governor queue so there is something to resolve.
  // If this endpoint does not exist (404), the approve/deny step below may still succeed
  // if the governor auto-creates on resolve, or it will gracefully fail.
  await ccFetchSafe<{ id: string }>(`/api/governor/${encodeURIComponent(instance)}/referrals`, {
    method: "POST",
    body: JSON.stringify({
      id: params.approvalId,
      from_instance: "wildvine",
      to_instance: instance,
      kind: "exec-approval",
      reason: `Command: ${params.command.slice(0, 200)}`,
      artifact_ref: params.command,
    }),
  });

  // Then immediately resolve it with the decision
  const endpoint = `/api/governor/${encodeURIComponent(instance)}/${action}`;
  const result = await ccFetchSafe<{ action: string; referral_id: string }>(endpoint, {
    method: "POST",
    body: JSON.stringify({
      referral_id: params.approvalId,
      comment,
    }),
  });

  if (result) {
    log.debug("Approval persisted to CC governor", {
      approvalId: params.approvalId,
      decision: params.decision,
    });
    return true;
  }

  log.debug("Failed to persist approval to CC (CC may be unreachable)", {
    approvalId: params.approvalId,
  });
  return false;
}

/**
 * Load approval history from CC governor for the wildvine instance.
 * Used on gateway restart to recover recent approval context.
 */
export async function loadApprovalHistoryFromCC(limit = 50): Promise<CCPersistedApproval[]> {
  const instance = "wildvine";
  const params = new URLSearchParams();
  if (limit) {
    params.set("limit", String(limit));
  }
  const qs = params.toString();

  const result = await ccFetchSafe<{ history: CCPersistedApproval[] }>(
    `/api/governor/${encodeURIComponent(instance)}/history${qs ? `?${qs}` : ""}`,
  );

  if (result?.history) {
    log.info("Loaded approval history from CC governor", {
      count: result.history.length,
    });
    return result.history;
  }

  log.debug("No approval history from CC (CC may be unreachable)");
  return [];
}

/**
 * Check if CC governor is reachable.
 */
export async function isCCGovernorReachable(): Promise<boolean> {
  const result = await ccFetchSafe<{ status: string }>("/api/health");
  return result?.status === "ok";
}
