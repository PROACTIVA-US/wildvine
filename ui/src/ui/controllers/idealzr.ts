import type { GatewayBrowserClient } from "../gateway.js";

export interface IdealzrState {
  client: GatewayBrowserClient | null;
  connected: boolean;
  idealzrLoading: boolean;
  idealzrError: string | null;
  idealzrGoals: {
    id: string;
    title: string;
    description: string | null;
    state: string;
    progress: number;
    canvas_id: string | null;
  }[];
  idealzrHypotheses: {
    id: string;
    goal_id: string;
    title: string;
    description: string | null;
    state: string;
    confidence: number;
  }[];
  idealzrEvidence: {
    id: string;
    hypothesis_id: string;
    title: string;
    description: string | null;
    kind: string;
    source: string | null;
  }[];
}

export async function loadIdealzrAll(state: IdealzrState): Promise<void> {
  if (!state.client || !state.connected) {
    return;
  }
  state.idealzrLoading = true;
  state.idealzrError = null;
  try {
    const [goals, hypotheses, evidence] = await Promise.all([
      state.client.request("cc.idealzr.goals.list", { project_id: "default" }),
      state.client.request("cc.idealzr.hypotheses.list", { project_id: "default" }),
      state.client.request("cc.idealzr.evidence.list", { project_id: "default" }),
    ]);
    state.idealzrGoals = (goals as typeof state.idealzrGoals) ?? [];
    state.idealzrHypotheses = (hypotheses as typeof state.idealzrHypotheses) ?? [];
    state.idealzrEvidence = (evidence as typeof state.idealzrEvidence) ?? [];
  } catch (err) {
    state.idealzrError = err instanceof Error ? err.message : "Failed to load strategy data";
  } finally {
    state.idealzrLoading = false;
  }
}

export async function createIdealzrGoal(
  state: IdealzrState,
  opts: { title: string; description?: string },
): Promise<void> {
  if (!state.client || !state.connected) {
    return;
  }
  try {
    await state.client.request("cc.idealzr.goals.create", { project_id: "default", ...opts });
    await loadIdealzrAll(state);
  } catch (err) {
    state.idealzrError = err instanceof Error ? err.message : "Failed to create goal";
  }
}

export async function deleteIdealzrGoal(state: IdealzrState, goalId: string): Promise<void> {
  if (!state.client || !state.connected) {
    return;
  }
  try {
    await state.client.request("cc.idealzr.goals.delete", {
      goal_id: goalId,
      project_id: "default",
    });
    await loadIdealzrAll(state);
  } catch (err) {
    state.idealzrError = err instanceof Error ? err.message : "Failed to delete goal";
  }
}

export async function updateIdealzrGoalState(
  state: IdealzrState,
  goalId: string,
  goalState: string,
): Promise<void> {
  if (!state.client || !state.connected) {
    return;
  }
  try {
    await state.client.request("cc.idealzr.goals.update", {
      goal_id: goalId,
      project_id: "default",
      state: goalState,
    });
    await loadIdealzrAll(state);
  } catch (err) {
    state.idealzrError = err instanceof Error ? err.message : "Failed to update goal";
  }
}

export async function createIdealzrHypothesis(
  state: IdealzrState,
  opts: { goal_id: string; title: string },
): Promise<void> {
  if (!state.client || !state.connected) {
    return;
  }
  try {
    await state.client.request("cc.idealzr.hypotheses.create", { project_id: "default", ...opts });
    await loadIdealzrAll(state);
  } catch (err) {
    state.idealzrError = err instanceof Error ? err.message : "Failed to create hypothesis";
  }
}

export async function deleteIdealzrHypothesis(
  state: IdealzrState,
  hypothesisId: string,
): Promise<void> {
  if (!state.client || !state.connected) {
    return;
  }
  try {
    await state.client.request("cc.idealzr.hypotheses.delete", {
      hypothesis_id: hypothesisId,
      project_id: "default",
    });
    await loadIdealzrAll(state);
  } catch (err) {
    state.idealzrError = err instanceof Error ? err.message : "Failed to delete hypothesis";
  }
}

export async function createIdealzrEvidence(
  state: IdealzrState,
  opts: { hypothesis_id: string; title: string; kind?: string },
): Promise<void> {
  if (!state.client || !state.connected) {
    return;
  }
  try {
    await state.client.request("cc.idealzr.evidence.create", { project_id: "default", ...opts });
    await loadIdealzrAll(state);
  } catch (err) {
    state.idealzrError = err instanceof Error ? err.message : "Failed to create evidence";
  }
}
