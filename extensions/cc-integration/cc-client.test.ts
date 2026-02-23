import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We mock global fetch since cc-client uses native fetch()
const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function mockFetchOk(body: unknown) {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

function mockFetchError(status: number, text: string) {
  fetchMock.mockResolvedValueOnce({
    ok: false,
    status,
    statusText: "Error",
    text: () => Promise.resolve(text),
  });
}

describe("ccKnowledgeCapture", () => {
  it("calls POST /api/knowledge/capture with request body", async () => {
    const { ccKnowledgeCapture } = await import("./cc-client.js");
    const responseBody = { id: "kc-1", status: "captured", message: "ok" };
    mockFetchOk(responseBody);

    const result = await ccKnowledgeCapture({
      content: "TypeScript ESM requires .js extensions",
      source: "wildvine-agent",
      agent_id: "agent-1",
      session_id: "sess-1",
      metadata: { tags: ["typescript"] },
    });

    expect(result).toEqual(responseBody);
    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:9011/api/knowledge/capture");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body.content).toBe("TypeScript ESM requires .js extensions");
    expect(body.source).toBe("wildvine-agent");
    expect(body.agent_id).toBe("agent-1");
    expect(body.session_id).toBe("sess-1");
    expect(body.metadata).toEqual({ tags: ["typescript"] });
  });

  it("throws on non-ok response", async () => {
    const { ccKnowledgeCapture } = await import("./cc-client.js");
    mockFetchError(500, "Internal Server Error");

    await expect(ccKnowledgeCapture({ content: "test", source: "test" })).rejects.toThrow(
      "CC API 500",
    );
  });
});

describe("ccKnowledgeSessionEnd", () => {
  it("calls POST /api/kb/memory/:agentId/session-end", async () => {
    const { ccKnowledgeSessionEnd } = await import("./cc-client.js");
    const responseBody = { id: "se-1", status: "captured" };
    mockFetchOk(responseBody);

    const result = await ccKnowledgeSessionEnd("my-agent", "Session summary text", "sess-42");

    expect(result).toEqual(responseBody);
    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:9011/api/kb/memory/my-agent/session-end");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body.summary).toBe("Session summary text");
    expect(body.session_id).toBe("sess-42");
  });

  it("encodes special characters in agentId", async () => {
    const { ccKnowledgeSessionEnd } = await import("./cc-client.js");
    mockFetchOk({ id: "se-2", status: "captured" });

    await ccKnowledgeSessionEnd("agent/special chars", "summary");

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("agent%2Fspecial%20chars");
  });

  it("works without sessionId", async () => {
    const { ccKnowledgeSessionEnd } = await import("./cc-client.js");
    mockFetchOk({ id: "se-3", status: "captured" });

    await ccKnowledgeSessionEnd("agent-x", "summary text");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.summary).toBe("summary text");
    expect(body.session_id).toBeUndefined();
  });

  it("throws on non-ok response", async () => {
    const { ccKnowledgeSessionEnd } = await import("./cc-client.js");
    mockFetchError(404, "Not found");

    await expect(ccKnowledgeSessionEnd("agent", "summary")).rejects.toThrow("CC API 404");
  });
});
