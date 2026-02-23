import { html, nothing } from "lit";

export interface StrategyGoal {
  id: string;
  title: string;
  description: string | null;
  state: string;
  progress: number;
  canvas_id: string | null;
}

export interface StrategyHypothesis {
  id: string;
  goal_id: string;
  title: string;
  description: string | null;
  state: string;
  confidence: number;
}

export interface StrategyEvidence {
  id: string;
  hypothesis_id: string;
  title: string;
  description: string | null;
  kind: string;
  source: string | null;
}

export interface StrategyViewProps {
  loading: boolean;
  error: string | null;
  goals: StrategyGoal[];
  hypotheses: StrategyHypothesis[];
  evidence: StrategyEvidence[];
  // Create forms
  showGoalForm: boolean;
  goalFormTitle: string;
  goalFormDescription: string;
  showHypothesisForm: boolean;
  hypothesisFormGoalId: string;
  hypothesisFormTitle: string;
  showEvidenceForm: boolean;
  evidenceFormHypothesisId: string;
  evidenceFormTitle: string;
  evidenceFormKind: string;
  // Handlers
  onRefresh: () => void;
  onToggleGoalForm: () => void;
  onGoalFormTitleChange: (v: string) => void;
  onGoalFormDescriptionChange: (v: string) => void;
  onCreateGoal: () => void;
  onDeleteGoal: (id: string) => void;
  onUpdateGoalState: (id: string, state: string) => void;
  onToggleHypothesisForm: (goalId: string) => void;
  onHypothesisFormTitleChange: (v: string) => void;
  onCreateHypothesis: () => void;
  onDeleteHypothesis: (id: string) => void;
  onToggleEvidenceForm: (hypothesisId: string) => void;
  onEvidenceFormTitleChange: (v: string) => void;
  onEvidenceFormKindChange: (v: string) => void;
  onCreateEvidence: () => void;
  onNavigateVislzr: (canvasId: string) => void;
}

function stateColor(state: string): string {
  switch (state) {
    case "ACTIVE":
    case "TESTING":
      return "chip-ok";
    case "ACHIEVED":
    case "VALIDATED":
      return "chip-ok";
    case "ARCHIVED":
    case "INVALIDATED":
      return "chip-danger";
    default:
      return "";
  }
}

function evidenceColor(kind: string): string {
  switch (kind) {
    case "SUPPORTS":
      return "color: var(--ok)";
    case "CONTRADICTS":
      return "color: var(--danger)";
    default:
      return "color: var(--muted)";
  }
}

export function renderStrategy(props: StrategyViewProps) {
  if (props.loading) {
    return html`
      <div class="card"><div class="muted">Loading strategy data...</div></div>
    `;
  }
  if (props.error) {
    return html`
      <div class="callout danger">${props.error}</div>
      <button class="btn" @click=${props.onRefresh}>Retry</button>
    `;
  }

  return html`
    <div class="stack" style="gap: 20px;">
      <!-- Header -->
      <div class="row" style="justify-content: space-between;">
        <button class="btn primary" @click=${props.onToggleGoalForm}>+ New Goal</button>
        <button class="btn" @click=${props.onRefresh}>Refresh</button>
      </div>

      <!-- Goal creation form -->
      ${
        props.showGoalForm
          ? html`
          <div class="card">
            <div class="card-title">Create Goal</div>
            <div class="form-grid" style="margin-top: 12px;">
              <div class="field full">
                <span>Title</span>
                <input type="text" .value=${props.goalFormTitle}
                  @input=${(e: InputEvent) => props.onGoalFormTitleChange((e.target as HTMLInputElement).value)} />
              </div>
              <div class="field full">
                <span>Description</span>
                <textarea style="min-height: 80px;" .value=${props.goalFormDescription}
                  @input=${(e: InputEvent) => props.onGoalFormDescriptionChange((e.target as HTMLTextAreaElement).value)}></textarea>
              </div>
            </div>
            <div class="row" style="margin-top: 12px;">
              <button class="btn primary" @click=${props.onCreateGoal}>Create</button>
              <button class="btn" @click=${props.onToggleGoalForm}>Cancel</button>
            </div>
          </div>
        `
          : nothing
      }

      <!-- Goals list -->
      ${
        props.goals.length === 0
          ? html`
              <div class="card"><div class="muted">No goals yet. Create one to get started.</div></div>
            `
          : props.goals.map((goal) => {
              const goalHypotheses = props.hypotheses.filter((h) => h.goal_id === goal.id);
              return html`
              <div class="card" style="animation-delay: 50ms;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
                  <div style="flex: 1;">
                    <div class="card-title">${goal.title}</div>
                    ${goal.description ? html`<div class="card-sub">${goal.description}</div>` : nothing}
                  </div>
                  <div class="row" style="gap: 6px;">
                    <span class="chip ${stateColor(goal.state)}">${goal.state}</span>
                    ${
                      goal.canvas_id
                        ? html`<button class="btn btn--sm" @click=${() => props.onNavigateVislzr(goal.canvas_id!)}>Canvas</button>`
                        : nothing
                    }
                    <button class="btn btn--sm danger" @click=${() => props.onDeleteGoal(goal.id)}>Delete</button>
                  </div>
                </div>
                <!-- Progress bar -->
                <div style="margin-top: 12px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span class="label">Progress</span>
                    <span class="label">${goal.progress}%</span>
                  </div>
                  <div style="height: 6px; border-radius: 3px; background: var(--border); overflow: hidden;">
                    <div style="height: 100%; width: ${goal.progress}%; border-radius: 3px; background: linear-gradient(90deg, var(--accent), var(--accent-2, var(--accent))); transition: width 0.3s ease;"></div>
                  </div>
                </div>
                <!-- State buttons -->
                <div class="row" style="margin-top: 10px; gap: 6px;">
                  ${["DRAFT", "ACTIVE", "ACHIEVED", "ARCHIVED"].map(
                    (s) => html`
                      <button class="btn btn--sm ${goal.state === s ? "active" : ""}"
                        @click=${() => props.onUpdateGoalState(goal.id, s)}>${s}</button>
                    `,
                  )}
                </div>
                <!-- Hypotheses -->
                <div style="margin-top: 16px; border-top: 1px solid var(--border); padding-top: 12px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span class="label" style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em;">Hypotheses</span>
                    <button class="btn btn--sm" @click=${() => props.onToggleHypothesisForm(goal.id)}>+ Add</button>
                  </div>
                  ${
                    props.showHypothesisForm && props.hypothesisFormGoalId === goal.id
                      ? html`
                      <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                        <input type="text" style="flex: 1; padding: 6px 10px; border: 1px solid var(--input); border-radius: var(--radius-md); background: var(--card);"
                          placeholder="Hypothesis title..." .value=${props.hypothesisFormTitle}
                          @input=${(e: InputEvent) => props.onHypothesisFormTitleChange((e.target as HTMLInputElement).value)}
                          @keydown=${(e: KeyboardEvent) => {
                            if (e.key === "Enter") {
                              props.onCreateHypothesis();
                            }
                          }} />
                        <button class="btn primary btn--sm" @click=${props.onCreateHypothesis}>Add</button>
                      </div>
                    `
                      : nothing
                  }
                  ${
                    goalHypotheses.length === 0
                      ? html`
                          <div class="muted" style="font-size: 12px">No hypotheses yet.</div>
                        `
                      : goalHypotheses.map((hyp) => {
                          const hypEvidence = props.evidence.filter(
                            (e) => e.hypothesis_id === hyp.id,
                          );
                          return html`
                          <div style="padding: 10px; margin-bottom: 6px; border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--bg-elevated);">
                            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                              <span style="font-weight: 500; font-size: 13px;">${hyp.title}</span>
                              <div class="row" style="gap: 4px;">
                                <span class="chip ${stateColor(hyp.state)}" style="font-size: 10px; padding: 2px 8px;">${hyp.state}</span>
                                <button class="btn btn--sm" style="padding: 3px 6px; font-size: 11px;" @click=${() => props.onToggleEvidenceForm(hyp.id)}>+ev</button>
                                <button class="btn btn--sm danger" style="padding: 3px 6px; font-size: 11px;" @click=${() => props.onDeleteHypothesis(hyp.id)}>x</button>
                              </div>
                            </div>
                            ${
                              props.showEvidenceForm && props.evidenceFormHypothesisId === hyp.id
                                ? html`
                                <div style="display: flex; gap: 6px; margin-top: 8px;">
                                  <input type="text" style="flex: 1; padding: 4px 8px; font-size: 12px; border: 1px solid var(--input); border-radius: var(--radius-sm); background: var(--card);"
                                    placeholder="Evidence title..." .value=${props.evidenceFormTitle}
                                    @input=${(e: InputEvent) => props.onEvidenceFormTitleChange((e.target as HTMLInputElement).value)} />
                                  <select style="padding: 4px 8px; font-size: 12px; border: 1px solid var(--input); border-radius: var(--radius-sm); background: var(--card);"
                                    .value=${props.evidenceFormKind}
                                    @change=${(e: Event) => props.onEvidenceFormKindChange((e.target as HTMLSelectElement).value)}>
                                    <option value="SUPPORTS">Supports</option>
                                    <option value="CONTRADICTS">Contradicts</option>
                                    <option value="NEUTRAL">Neutral</option>
                                  </select>
                                  <button class="btn primary btn--sm" style="font-size: 11px;" @click=${props.onCreateEvidence}>Add</button>
                                </div>
                              `
                                : nothing
                            }
                            ${
                              hypEvidence.length > 0
                                ? html`
                                <div style="margin-top: 8px; display: grid; gap: 4px;">
                                  ${hypEvidence.map(
                                    (ev) => html`
                                      <div style="display: flex; align-items: center; gap: 6px; font-size: 12px;">
                                        <span style="${evidenceColor(ev.kind)}; font-weight: 600;">${ev.kind === "SUPPORTS" ? "+" : ev.kind === "CONTRADICTS" ? "\u2212" : "\u25CB"}</span>
                                        <span>${ev.title}</span>
                                        ${ev.source ? html`<span class="muted" style="font-size: 11px;">(${ev.source})</span>` : nothing}
                                      </div>
                                    `,
                                  )}
                                </div>
                              `
                                : nothing
                            }
                          </div>
                        `;
                        })
                  }
                </div>
              </div>
            `;
            })
      }
    </div>
  `;
}
