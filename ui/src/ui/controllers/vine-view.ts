import type { GatewayBrowserClient } from "../gateway.js";

export interface VineViewState {
  client: GatewayBrowserClient | null;
  connected: boolean;
  vineViewLoading: boolean;
  vineViewError: string | null;
  vineViewData: {
    id: string;
    label: string;
    type: "root" | "branch" | "leaf";
    status: "healthy" | "warning" | "error" | "unknown";
    children?: VineViewState["vineViewData"][];
  } | null;
}

export async function loadVineView(state: VineViewState): Promise<void> {
  if (!state.client || !state.connected) {
    return;
  }
  state.vineViewLoading = true;
  state.vineViewError = null;
  try {
    // Aggregate data from multiple sources
    const [agentsRes, healthRes] = await Promise.allSettled([
      state.client.request("agents.list", {}),
      state.client.request("cc.health", {}),
    ]);

    const agents =
      agentsRes.status === "fulfilled"
        ? ((agentsRes.value as { agents?: { id: string; name?: string }[] })?.agents ?? [])
        : [];
    const ccHealthy = healthRes.status === "fulfilled";

    const agentLeaves = agents.map((a) => ({
      id: `agent-${a.id}`,
      label: a.name ?? a.id,
      type: "leaf" as const,
      status: "healthy" as const,
    }));

    state.vineViewData = {
      id: "root",
      label: "Wildvine Gateway",
      type: "root",
      status: "healthy",
      children: [
        {
          id: "agents",
          label: "Agents",
          type: "branch",
          status: agentLeaves.length > 0 ? "healthy" : "warning",
          children:
            agentLeaves.length > 0
              ? agentLeaves
              : [{ id: "no-agents", label: "No agents", type: "leaf", status: "unknown" }],
        },
        {
          id: "cc",
          label: "Backend Services",
          type: "branch",
          status: ccHealthy ? "healthy" : "error",
          children: [
            {
              id: "cc-hub",
              label: "Hub Backend",
              type: "leaf",
              status: ccHealthy ? "healthy" : "error",
            },
            {
              id: "cc-pipelines",
              label: "Pipeline Runner",
              type: "leaf",
              status: ccHealthy ? "healthy" : "unknown",
            },
          ],
        },
      ],
    };
  } catch (err) {
    state.vineViewError = err instanceof Error ? err.message : "Failed to load health data";
  } finally {
    state.vineViewLoading = false;
  }
}
