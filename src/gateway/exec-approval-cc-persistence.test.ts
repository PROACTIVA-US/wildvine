import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isCCGovernorReachable,
  loadApprovalHistoryFromCC,
  persistApprovalToCC,
} from "./exec-approval-cc-persistence.js";

// ---------------------------------------------------------------------------
// Mock global fetch
// ---------------------------------------------------------------------------

const fetchMock = vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Utility to create a successful Response
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// persistApprovalToCC
// ---------------------------------------------------------------------------

describe("persistApprovalToCC", () => {
  it("returns true when CC accepts both referral creation and resolution", async () => {
    // First call: referral creation
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "approval-1" }));
    // Second call: approve/deny
    fetchMock.mockResolvedValueOnce(jsonResponse({ action: "approve", referral_id: "approval-1" }));

    const result = await persistApprovalToCC({
      approvalId: "approval-1",
      command: "echo hello",
      decision: "allow-once",
      agentId: "test-agent",
      sessionKey: "session-1",
      resolvedBy: "CLI",
    });

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Verify the referral creation call
    const [referralUrl, referralInit] = fetchMock.mock.calls[0];
    expect(referralUrl).toContain("/api/governor/wildvine/referrals");
    expect(referralInit?.method).toBe("POST");
    const referralBody = JSON.parse(referralInit?.body as string);
    expect(referralBody.id).toBe("approval-1");
    expect(referralBody.kind).toBe("exec-approval");

    // Verify the approve call
    const [approveUrl, approveInit] = fetchMock.mock.calls[1];
    expect(approveUrl).toContain("/api/governor/wildvine/approve");
    expect(approveInit?.method).toBe("POST");
    const approveBody = JSON.parse(approveInit?.body as string);
    expect(approveBody.referral_id).toBe("approval-1");
    const comment = JSON.parse(approveBody.comment);
    expect(comment.type).toBe("exec-approval");
    expect(comment.decision).toBe("allow-once");
  });

  it("calls deny endpoint when decision is deny", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "approval-2" }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ action: "deny", referral_id: "approval-2" }));

    const result = await persistApprovalToCC({
      approvalId: "approval-2",
      command: "rm -rf /",
      decision: "deny",
    });

    expect(result).toBe(true);
    const [denyUrl] = fetchMock.mock.calls[1];
    expect(denyUrl).toContain("/api/governor/wildvine/deny");
  });

  it("calls approve endpoint when decision is allow-always", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "approval-3" }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ action: "approve", referral_id: "approval-3" }));

    const result = await persistApprovalToCC({
      approvalId: "approval-3",
      command: "ls",
      decision: "allow-always",
    });

    expect(result).toBe(true);
    const [approveUrl] = fetchMock.mock.calls[1];
    expect(approveUrl).toContain("/api/governor/wildvine/approve");
  });

  it("returns false when CC is unreachable (fetch throws)", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));

    const result = await persistApprovalToCC({
      approvalId: "approval-4",
      command: "echo hi",
      decision: "allow-once",
    });

    expect(result).toBe(false);
  });

  it("returns false when CC returns non-ok status on resolution", async () => {
    // Referral creation succeeds
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "approval-5" }));
    // Approve call fails
    fetchMock.mockResolvedValueOnce(new Response("Internal Server Error", { status: 500 }));

    const result = await persistApprovalToCC({
      approvalId: "approval-5",
      command: "echo test",
      decision: "allow-once",
    });

    expect(result).toBe(false);
  });

  it("still tries resolve when referral creation returns non-ok", async () => {
    // Referral creation fails (e.g., endpoint not implemented yet)
    fetchMock.mockResolvedValueOnce(new Response("Not Found", { status: 404 }));
    // Approve call succeeds
    fetchMock.mockResolvedValueOnce(jsonResponse({ action: "approve", referral_id: "approval-6" }));

    const result = await persistApprovalToCC({
      approvalId: "approval-6",
      command: "echo fallback",
      decision: "allow-once",
    });

    // Should still succeed because the resolve call worked
    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("truncates long commands in referral reason", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "approval-7" }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ action: "approve", referral_id: "approval-7" }));

    const longCommand = "x".repeat(500);
    await persistApprovalToCC({
      approvalId: "approval-7",
      command: longCommand,
      decision: "allow-once",
    });

    const [, referralInit] = fetchMock.mock.calls[0];
    const body = JSON.parse(referralInit?.body as string);
    // reason should be truncated (Command: prefix + 200 chars)
    expect(body.reason.length).toBeLessThanOrEqual(210);
  });
});

// ---------------------------------------------------------------------------
// loadApprovalHistoryFromCC
// ---------------------------------------------------------------------------

describe("loadApprovalHistoryFromCC", () => {
  it("returns history when CC responds successfully", async () => {
    const history = [
      { id: "ref-1", kind: "exec-approval", reason: "Command: echo" },
      { id: "ref-2", kind: "exec-approval", reason: "Command: ls" },
    ];
    fetchMock.mockResolvedValueOnce(jsonResponse({ history }));

    const result = await loadApprovalHistoryFromCC(10);

    expect(result).toEqual(history);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/governor/wildvine/history");
    expect(url).toContain("limit=10");
  });

  it("returns empty array when CC is unreachable", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));

    const result = await loadApprovalHistoryFromCC();

    expect(result).toEqual([]);
  });

  it("returns empty array when CC returns non-ok", async () => {
    fetchMock.mockResolvedValueOnce(new Response("Bad Gateway", { status: 502 }));

    const result = await loadApprovalHistoryFromCC();

    expect(result).toEqual([]);
  });

  it("returns empty array when response has no history field", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ other: "data" }));

    const result = await loadApprovalHistoryFromCC();

    expect(result).toEqual([]);
  });

  it("uses default limit of 50", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ history: [] }));

    await loadApprovalHistoryFromCC();

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("limit=50");
  });
});

// ---------------------------------------------------------------------------
// isCCGovernorReachable
// ---------------------------------------------------------------------------

describe("isCCGovernorReachable", () => {
  it("returns true when health endpoint responds with ok", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: "ok" }));

    const result = await isCCGovernorReachable();

    expect(result).toBe(true);
  });

  it("returns false when health endpoint returns non-ok status field", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: "degraded" }));

    const result = await isCCGovernorReachable();

    expect(result).toBe(false);
  });

  it("returns false when fetch throws", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));

    const result = await isCCGovernorReachable();

    expect(result).toBe(false);
  });

  it("returns false when HTTP status is non-ok", async () => {
    fetchMock.mockResolvedValueOnce(new Response("Not Found", { status: 404 }));

    const result = await isCCGovernorReachable();

    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ExecApprovalManager integration with CC persistence
// ---------------------------------------------------------------------------

describe("ExecApprovalManager CC integration", () => {
  it("resolve() fires CC persistence in background", async () => {
    // Import the manager — persistence is called internally via the module import
    const { ExecApprovalManager } = await import("./exec-approval-manager.js");

    // Mock the persistence module
    const persistMock = vi.fn().mockResolvedValue(true);
    vi.doMock("./exec-approval-cc-persistence.js", () => ({
      persistApprovalToCC: persistMock,
      loadApprovalHistoryFromCC: vi.fn().mockResolvedValue([]),
    }));

    const manager = new ExecApprovalManager();
    const record = manager.create({ command: "echo test" }, 5000);
    void manager.register(record, 5000);

    const resolved = manager.resolve(record.id, "allow-once", "tester");
    expect(resolved).toBe(true);

    // Allow microtask queue to flush so the fire-and-forget promise settles
    await new Promise((r) => setTimeout(r, 50));
  });

  it("loadFromCC recovers gracefully when CC is unreachable", async () => {
    const { ExecApprovalManager } = await import("./exec-approval-manager.js");

    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));

    const manager = new ExecApprovalManager();
    // Should not throw
    await manager.loadFromCC();
    expect(manager.getCCHistory()).toEqual([]);
  });

  it("loadFromCC stores history when CC responds", async () => {
    const { ExecApprovalManager } = await import("./exec-approval-manager.js");

    const history = [{ id: "ref-1", kind: "exec-approval" }];
    fetchMock.mockResolvedValueOnce(jsonResponse({ history }));

    const manager = new ExecApprovalManager();
    await manager.loadFromCC();
    expect(manager.getCCHistory()).toEqual(history);
  });
});
