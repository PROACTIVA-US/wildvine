import { html, nothing } from "lit";
import type { AppViewState } from "./app-view-state.ts";
import { parseAgentSessionKey } from "../../../src/routing/session-key.js";
import { refreshChatAvatar } from "./app-chat.ts";
import { renderUsageTab } from "./app-render-usage-tab.ts";
import { renderChatControls, renderTab, renderThemeToggle } from "./app-render.helpers.ts";
import { loadAgentFileContent, loadAgentFiles, saveAgentFile } from "./controllers/agent-files.ts";
import { loadAgentIdentities, loadAgentIdentity } from "./controllers/agent-identity.ts";
import { loadAgentSkills } from "./controllers/agent-skills.ts";
import { loadAgents } from "./controllers/agents.ts";
import {
  loadCcPipelines,
  loadCcRuns,
  triggerCcRun,
  loadCcGovernor,
  approveCcReferral,
  denyCcReferral,
  loadCcKb,
  loadCcArenaSessions,
  loadCcArenaMessages,
  sendCcArenaChat,
} from "./controllers/cc-data.ts";
import { loadChannels } from "./controllers/channels.ts";
import { loadChatHistory } from "./controllers/chat.ts";
import {
  applyConfig,
  loadConfig,
  runUpdate,
  saveConfig,
  updateConfigFormValue,
  removeConfigFormValue,
} from "./controllers/config.ts";
import {
  loadCronRuns,
  toggleCronJob,
  runCronJob,
  removeCronJob,
  addCronJob,
} from "./controllers/cron.ts";
import { loadDebug, callDebugMethod } from "./controllers/debug.ts";
import {
  approveDevicePairing,
  loadDevices,
  rejectDevicePairing,
  revokeDeviceToken,
  rotateDeviceToken,
} from "./controllers/devices.ts";
import {
  loadExecApprovals,
  removeExecApprovalsFormValue,
  saveExecApprovals,
  updateExecApprovalsFormValue,
} from "./controllers/exec-approvals.ts";
import { loadLogs } from "./controllers/logs.ts";
import { loadNodes } from "./controllers/nodes.ts";
import { loadNotes, captureNote, dismissNote, searchNotes } from "./controllers/notes.ts";
import { loadPresence } from "./controllers/presence.ts";
import { deleteSession, loadSessions, patchSession } from "./controllers/sessions.ts";
import {
  installSkill,
  loadCcSkills,
  loadSkills,
  saveSkillApiKey,
  updateSkillEdit,
  updateSkillEnabled,
} from "./controllers/skills.ts";
import "./components/voice-toggle.ts";
import {
  loadVislzrCanvases,
  loadVislzrCanvas,
  createVislzrCanvas,
  searchVislzrKb,
  loadVislzrKbIndexStatus,
  addKbResultToCanvas,
  switchVislzrProject,
  addVislzrProject,
  removeVislzrProject,
  indexVislzrProject,
} from "./controllers/vislzr.ts";
import { icons } from "./icons.ts";
import {
  normalizeBasePath,
  MAIN_NAV_ITEMS,
  BOTTOM_NAV_ITEMS,
  subtitleForTab,
  titleForTab,
} from "./navigation.ts";
import { renderAgents } from "./views/agents.ts";
import { renderCcArena } from "./views/cc-arena.ts";
import { renderCcGovernor } from "./views/cc-governor.ts";
import { renderCcKb } from "./views/cc-kb.ts";
import { renderCcPipelines } from "./views/cc-pipelines.ts";
import { renderChannels } from "./views/channels.ts";
import { renderChat } from "./views/chat.ts";
import { renderConfig } from "./views/config.ts";
import { renderCron } from "./views/cron.ts";
import { renderDebug } from "./views/debug.ts";
import { renderExecApprovalPrompt } from "./views/exec-approval.ts";
import { renderGatewayUrlConfirmation } from "./views/gateway-url-confirmation.ts";
import { renderGovernance } from "./views/governance.ts";
import { renderHome } from "./views/home.ts";
import { renderInstances } from "./views/instances.ts";
import { renderLivingNote } from "./views/living-note.ts";
import { renderLogs } from "./views/logs.ts";
import { renderNodes } from "./views/nodes.ts";
import { renderNotesContext } from "./views/notes-context.ts";
import { renderNotes } from "./views/notes.ts";
import { renderOverview } from "./views/overview.ts";
import { renderProfile } from "./views/profile.ts";
import { renderSessions } from "./views/sessions.ts";
import { renderSettingsContainer } from "./views/settings-container.ts";
import { renderSkills } from "./views/skills.ts";
import { renderStrategy } from "./views/strategy.ts";
import { renderVineView } from "./views/vine-view.ts";
import { renderVislzr } from "./views/vislzr.ts";

const AVATAR_DATA_RE = /^data:/i;
const AVATAR_HTTP_RE = /^https?:\/\//i;

function resolveAssistantAvatarUrl(state: AppViewState): string | undefined {
  const list = state.agentsList?.agents ?? [];
  const parsed = parseAgentSessionKey(state.sessionKey);
  const agentId = parsed?.agentId ?? state.agentsList?.defaultId ?? "main";
  const agent = list.find((entry) => entry.id === agentId);
  const identity = agent?.identity;
  const candidate = identity?.avatarUrl ?? identity?.avatar;
  if (!candidate) {
    return undefined;
  }
  if (AVATAR_DATA_RE.test(candidate) || AVATAR_HTTP_RE.test(candidate)) {
    return candidate;
  }
  return identity?.avatarUrl;
}

export function renderApp(state: AppViewState) {
  const presenceCount = state.presenceEntries.length;
  const sessionsCount = state.sessionsResult?.count ?? null;
  const cronNext = state.cronStatus?.nextWakeAtMs ?? null;
  const chatDisabledReason = state.connected ? null : "Disconnected from gateway.";
  const isChat = state.tab === "chat";
  const chatFocus = isChat && (state.settings.chatFocusMode || state.onboarding);
  const showThinking = state.onboarding ? false : state.settings.chatShowThinking;
  const assistantAvatarUrl = resolveAssistantAvatarUrl(state);
  const chatAvatarUrl = state.chatAvatarUrl ?? assistantAvatarUrl ?? null;
  const configValue =
    state.configForm ?? (state.configSnapshot?.config as Record<string, unknown> | null);
  const basePath = normalizeBasePath(state.basePath ?? "");
  const resolvedAgentId =
    state.agentsSelectedId ??
    state.agentsList?.defaultId ??
    state.agentsList?.agents?.[0]?.id ??
    null;

  return html`
    <div class="shell ${isChat ? "shell--chat" : ""} ${chatFocus ? "shell--chat-focus" : ""} ${state.settings.navCollapsed ? "shell--nav-collapsed" : ""} ${state.onboarding ? "shell--onboarding" : ""}">
      <header class="topbar">
        <div class="topbar-left">
          <button
            class="nav-collapse-toggle"
            @click=${() =>
              state.applySettings({
                ...state.settings,
                navCollapsed: !state.settings.navCollapsed,
              })}
            title="${state.settings.navCollapsed ? "Expand sidebar" : "Collapse sidebar"}"
            aria-label="${state.settings.navCollapsed ? "Expand sidebar" : "Collapse sidebar"}"
          >
            <span class="nav-collapse-toggle__icon">${icons.menu}</span>
          </button>
          <div class="brand">
            <div class="brand-logo">
              <img src=${basePath ? `${basePath}/favicon.svg` : "/favicon.svg"} alt="Wildvine" />
            </div>
            <div class="brand-text">
              <div class="brand-title"><span style="font-weight:700">wild</span><span style="font-weight:400">vine</span></div>
            </div>
          </div>
        </div>
        <div class="topbar-status">
          <voice-toggle .gatewayUrl=${state.settings.gatewayUrl}></voice-toggle>
          <input
            class="input"
            style="width: 180px; height: 28px; font-size: 12px"
            type="text"
            placeholder="Quick note..."
            @keydown=${(e: KeyboardEvent) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const input = e.target as HTMLInputElement;
                const value = input.value.trim();
                if (value && state.client && state.connected) {
                  input.value = "";
                  void state.client.request("notes.capture", { subject: value });
                }
              }
            }}
          />
          ${renderThemeToggle(state)}
        </div>
      </header>
      <aside class="nav ${state.settings.navCollapsed ? "nav--collapsed" : ""}">
        <div class="nav-group">
          <div class="nav-group__items">
            ${MAIN_NAV_ITEMS.map((item) => renderTab(state, item.tab))}
          </div>
        </div>
        <div class="nav-spacer"></div>
        <div class="nav-group nav-group--bottom">
          <div class="nav-group__items">
            ${BOTTOM_NAV_ITEMS.map((item) => renderTab(state, item.tab))}
          </div>
        </div>
      </aside>
      <main class="content ${isChat ? "content--chat" : ""}">
        <section class="content-header">
          <div>
            ${state.tab === "usage" ? nothing : html`<div class="page-title">${titleForTab(state.tab)}</div>`}
            ${state.tab === "usage" ? nothing : html`<div class="page-sub">${subtitleForTab(state.tab)}</div>`}
          </div>
          <div class="page-meta">
            ${state.lastError ? html`<div class="pill danger">${state.lastError}</div>` : nothing}
            ${isChat ? renderChatControls(state) : nothing}
          </div>
        </section>

        ${
          state.tab === "home"
            ? renderHome({
                connected: state.connected,
                agentCount: state.agentsList?.agents?.length ?? 0,
                governorCount: state.ccGovernorCount,
                recentRuns:
                  state.ccRuns?.slice(0, 5)?.map((r: Record<string, unknown>) => ({
                    run_id: typeof r.run_id === "string" ? r.run_id : "",
                    pipeline_name: typeof r.pipeline_name === "string" ? r.pipeline_name : "",
                    status: typeof r.status === "string" ? r.status : "",
                    started_at: typeof r.started_at === "string" ? r.started_at : "",
                  })) ?? [],
                ccHealthy: state.ccProcessStatus?.overall === "running",
                onNavigate: (tab) => state.setTab(tab as import("./navigation.ts").Tab),
              })
            : nothing
        }

        ${
          state.tab === "strategy"
            ? renderStrategy({
                loading:
                  ((state as unknown as Record<string, unknown>).idealzrLoading as boolean) ??
                  false,
                error:
                  ((state as unknown as Record<string, unknown>).idealzrError as string | null) ??
                  null,
                goals:
                  ((state as unknown as Record<string, unknown>)
                    .idealzrGoals as unknown[] as import("./views/strategy.ts").StrategyGoal[]) ??
                  [],
                hypotheses:
                  ((state as unknown as Record<string, unknown>)
                    .idealzrHypotheses as unknown[] as import("./views/strategy.ts").StrategyHypothesis[]) ??
                  [],
                evidence:
                  ((state as unknown as Record<string, unknown>)
                    .idealzrEvidence as unknown[] as import("./views/strategy.ts").StrategyEvidence[]) ??
                  [],
                showGoalForm:
                  (state as unknown as Record<string, boolean>).strategyShowGoalForm ?? false,
                goalFormTitle:
                  (state as unknown as Record<string, string>).strategyGoalFormTitle ?? "",
                goalFormDescription:
                  (state as unknown as Record<string, string>).strategyGoalFormDescription ?? "",
                showHypothesisForm:
                  (state as unknown as Record<string, boolean>).strategyShowHypothesisForm ?? false,
                hypothesisFormGoalId:
                  (state as unknown as Record<string, string>).strategyHypothesisFormGoalId ?? "",
                hypothesisFormTitle:
                  (state as unknown as Record<string, string>).strategyHypothesisFormTitle ?? "",
                showEvidenceForm:
                  (state as unknown as Record<string, boolean>).strategyShowEvidenceForm ?? false,
                evidenceFormHypothesisId:
                  (state as unknown as Record<string, string>).strategyEvidenceFormHypothesisId ??
                  "",
                evidenceFormTitle:
                  (state as unknown as Record<string, string>).strategyEvidenceFormTitle ?? "",
                evidenceFormKind:
                  (state as unknown as Record<string, string>).strategyEvidenceFormKind ??
                  "SUPPORTS",
                onRefresh: () => {
                  /* loadIdealzrAll will be wired in app.ts */
                },
                onToggleGoalForm: () => {
                  (state as unknown as Record<string, boolean>).strategyShowGoalForm = !(
                    state as unknown as Record<string, boolean>
                  ).strategyShowGoalForm;
                },
                onGoalFormTitleChange: (v) => {
                  (state as unknown as Record<string, string>).strategyGoalFormTitle = v;
                },
                onGoalFormDescriptionChange: (v) => {
                  (state as unknown as Record<string, string>).strategyGoalFormDescription = v;
                },
                onCreateGoal: () => {},
                onDeleteGoal: () => {},
                onUpdateGoalState: () => {},
                onToggleHypothesisForm: (goalId) => {
                  (state as unknown as Record<string, boolean>).strategyShowHypothesisForm = true;
                  (state as unknown as Record<string, string>).strategyHypothesisFormGoalId =
                    goalId;
                },
                onHypothesisFormTitleChange: (v) => {
                  (state as unknown as Record<string, string>).strategyHypothesisFormTitle = v;
                },
                onCreateHypothesis: () => {},
                onDeleteHypothesis: () => {},
                onToggleEvidenceForm: (hypothesisId) => {
                  (state as unknown as Record<string, boolean>).strategyShowEvidenceForm = true;
                  (state as unknown as Record<string, string>).strategyEvidenceFormHypothesisId =
                    hypothesisId;
                },
                onEvidenceFormTitleChange: (v) => {
                  (state as unknown as Record<string, string>).strategyEvidenceFormTitle = v;
                },
                onEvidenceFormKindChange: (v) => {
                  (state as unknown as Record<string, string>).strategyEvidenceFormKind = v;
                },
                onCreateEvidence: () => {},
                onNavigateVislzr: () => {
                  state.setTab("vislzr");
                },
              })
            : nothing
        }

        ${
          state.tab === "governance"
            ? renderGovernance({
                loading: state.ccGovernorLoading,
                pending: state.ccGovernorPending.map((r) => ({
                  id: r.id,
                  from_instance: r.from_instance,
                  to_instance: r.to_instance,
                  kind: r.kind,
                  reason: r.reason,
                  artifact_ref: r.artifact_ref,
                  created_at: r.created_at,
                  ack_info: r.ack_info,
                })),
                count: state.ccGovernorCount,
                error: state.ccGovernorError,
                historyLoading: false,
                history: [],
                activeTab:
                  ((state as unknown as Record<string, string>).governanceActiveTab as
                    | "pending"
                    | "history") ?? "pending",
                commentDraft:
                  (state as unknown as Record<string, string>).governanceCommentDraft ?? "",
                onRefresh: () => loadCcGovernor(state),
                onApprove: (id, comment) => approveCcReferral(state, id, comment),
                onDeny: (id, comment) => denyCcReferral(state, id, comment),
                onTabChange: (tab) => {
                  (state as unknown as Record<string, string>).governanceActiveTab = tab;
                },
                onCommentChange: (v) => {
                  (state as unknown as Record<string, string>).governanceCommentDraft = v;
                },
                onLoadHistory: () => {},
              })
            : nothing
        }

        ${
          state.tab === "living-note"
            ? renderLivingNote({
                loading: state.notesLoading,
                items: state.notesItems.map((item) => ({
                  id: item.id,
                  subject: item.subject,
                  body: item.body,
                  priority: item.priority,
                  status: item.status,
                  created_at: item.created_at,
                })),
                error: state.notesError,
                captureDraft: state.notesCaptureDraft,
                captureBody: "",
                capturePriority: state.notesCapturePriority,
                captureBusy: state.notesCaptureBusy,
                captureError: state.notesCaptureError,
                searchQuery: state.notesSearchQuery,
                searchResults: state.notesSearchResults.map((r) => ({
                  id: r.id,
                  title: r.title,
                  snippet: r.snippet ?? null,
                  entity_type: r.entity_type ?? "unknown",
                  score: r.score ?? 0,
                })),
                searchLoading: state.notesSearchLoading,
                filter:
                  state.notesFilter === "active"
                    ? "all"
                    : state.notesFilter === "dismissed"
                      ? "all"
                      : (state.notesFilter as "all" | "RED" | "YELLOW" | "GREEN"),
                onCaptureDraftChange: (v) => (state.notesCaptureDraft = v),
                onCaptureBodyChange: () => {},
                onCapturePriorityChange: (v) => (state.notesCapturePriority = v),
                onCapture: () => captureNote(state as Parameters<typeof captureNote>[0]),
                onSearchQueryChange: (v) => (state.notesSearchQuery = v),
                onSearch: () => searchNotes(state as Parameters<typeof searchNotes>[0]),
                onFilterChange: (v) => {
                  if (v === "all") {
                    state.notesFilter = "all";
                  } else {
                    state.notesFilter = "all";
                  }
                  void loadNotes(state as Parameters<typeof loadNotes>[0]);
                },
                onDismiss: (id) => dismissNote(state as Parameters<typeof dismissNote>[0], id),
                onRefresh: () => loadNotes(state as Parameters<typeof loadNotes>[0]),
              })
            : nothing
        }

        ${
          state.tab === "profile"
            ? renderProfile({
                connected: state.connected,
                gatewayUrl: state.settings.gatewayUrl,
                password: state.password,
                theme: state.theme,
                onPasswordChange: (v) => state.setPassword(v),
                onThemeChange: (t) => state.setTheme(t as import("./theme.ts").ThemeMode),
              })
            : nothing
        }

        ${
          state.tab === "vislzr"
            ? renderVislzr({
                loading: state.vislzrLoading,
                error: state.vislzrError,
                canvases: state.vislzrCanvases,
                selectedCanvasId: state.vislzrSelectedCanvasId,
                canvasNodes: state.vislzrCanvasNodes,
                canvasEdges: state.vislzrCanvasEdges,
                reactMounted: false,
                // KB integration
                kbQuery: state.vislzrKbQuery,
                kbResults: state.vislzrKbResults,
                kbSearchLoading: state.vislzrKbSearchLoading,
                kbIndexStatus: state.vislzrKbIndexStatus,
                kbError: state.vislzrKbError,
                kbIndexing: state.vislzrKbIndexing,
                // Project isolation
                activeProjectId: state.vislzrActiveProjectId,
                projects: state.vislzrProjects,
                projectManageOpen: state.vislzrProjectManageOpen,
                addProjectName: state.vislzrAddProjectName,
                addProjectPath: state.vislzrAddProjectPath,
                // Canvas callbacks
                onRefresh: () =>
                  loadVislzrCanvases(
                    state as unknown as import("./controllers/vislzr.ts").VislzrState,
                  ),
                onSelectCanvas: (id) =>
                  loadVislzrCanvas(
                    state as unknown as import("./controllers/vislzr.ts").VislzrState,
                    id,
                  ),
                onCreateCanvas: (name) =>
                  createVislzrCanvas(
                    state as unknown as import("./controllers/vislzr.ts").VislzrState,
                    name,
                  ),
                onDeleteCanvas: () => {},
                onNodeClick: () => {},
                onNodeDragEnd: () => {},
                onAddNode: () => {},
                onMountReact: () => {},
                // KB callbacks
                onKbQueryChange: (q) => (state.vislzrKbQuery = q),
                onKbSearch: () =>
                  searchVislzrKb(state as unknown as import("./controllers/vislzr.ts").VislzrState),
                onKbResultToNode: (result) => {
                  const canvasId = state.vislzrSelectedCanvasId;
                  if (canvasId) {
                    void addKbResultToCanvas(
                      state as unknown as import("./controllers/vislzr.ts").VislzrState,
                      canvasId,
                      result,
                    );
                  }
                },
                // Project callbacks
                onProjectChange: (projectId) => {
                  switchVislzrProject(
                    state as unknown as import("./controllers/vislzr.ts").VislzrState,
                    projectId,
                  );
                  state.applySettings({
                    ...state.settings,
                    vislzrActiveProjectId: projectId,
                    vislzrProjects: state.vislzrProjects,
                  });
                },
                onToggleManageProjects: () =>
                  (state.vislzrProjectManageOpen = !state.vislzrProjectManageOpen),
                onAddProjectNameChange: (v) => (state.vislzrAddProjectName = v),
                onAddProjectPathChange: (v) => (state.vislzrAddProjectPath = v),
                onAddProject: () => {
                  addVislzrProject(
                    state as unknown as import("./controllers/vislzr.ts").VislzrState,
                    state.vislzrAddProjectName.trim(),
                    state.vislzrAddProjectPath.trim(),
                  );
                  state.applySettings({
                    ...state.settings,
                    vislzrProjects: state.vislzrProjects,
                  });
                },
                onRemoveProject: (projectId) => {
                  void removeVislzrProject(
                    state as unknown as import("./controllers/vislzr.ts").VislzrState,
                    projectId,
                  ).then(() => {
                    state.applySettings({
                      ...state.settings,
                      vislzrActiveProjectId: state.vislzrActiveProjectId,
                      vislzrProjects: state.vislzrProjects,
                    });
                  });
                },
                onIndexProject: (projectId) =>
                  indexVislzrProject(
                    state as unknown as import("./controllers/vislzr.ts").VislzrState,
                    projectId,
                  ),
              })
            : nothing
        }

        ${
          state.tab === "vine-view"
            ? renderVineView({
                loading: (state as unknown as Record<string, boolean>).vineViewLoading ?? false,
                error: (state as unknown as Record<string, string | null>).vineViewError ?? null,
                data:
                  ((state as unknown as Record<string, unknown>).vineViewData as
                    | import("./views/vine-view.ts").VineViewNodeData
                    | null) ?? null,
                reactMounted: false,
                onRefresh: () => {},
                onMountReact: () => {},
              })
            : nothing
        }

        ${
          state.tab === "arena"
            ? html`
              ${renderNotesContext({ results: state.notesSearchResults, loading: state.notesSearchLoading })}
              ${renderCcArena({
                loading: state.ccArenaLoading,
                sessions: state.ccArenaSessions,
                error: state.ccArenaError,
                selectedId: state.ccArenaSelectedId,
                messages: state.ccArenaMessages,
                messagesLoading: state.ccArenaMessagesLoading,
                chatInput: state.ccArenaChatInput,
                onRefresh: () => loadCcArenaSessions(state),
                onSelectSession: (id) => {
                  state.ccArenaSelectedId = id;
                  void loadCcArenaMessages(state, id);
                },
                onChatInputChange: (v) => (state.ccArenaChatInput = v),
                onSendChat: () => sendCcArenaChat(state),
              })}
            `
            : nothing
        }

        ${
          state.tab === "overview"
            ? renderOverview({
                connected: state.connected,
                hello: state.hello,
                settings: state.settings,
                password: state.password,
                lastError: state.lastError,
                presenceCount,
                sessionsCount,
                cronEnabled: state.cronStatus?.enabled ?? null,
                cronNext,
                lastChannelsRefresh: state.channelsLastSuccess,
                ccProcessStatus: state.ccProcessStatus,
                ccGovernorCount: state.ccGovernorCount,
                onSettingsChange: (next) => state.applySettings(next),
                onPasswordChange: (next) => (state.password = next),
                onSessionKeyChange: (next) => {
                  state.sessionKey = next;
                  state.chatMessage = "";
                  state.resetToolStream();
                  state.applySettings({
                    ...state.settings,
                    sessionKey: next,
                    lastActiveSessionKey: next,
                  });
                  void state.loadAssistantIdentity();
                },
                onConnect: () => state.connect(),
                onRefresh: () => state.loadOverview(),
                onCcStart: () => {
                  if (state.client) {
                    void state.client.request("cc.process.start", {});
                  }
                },
                onCcStop: () => {
                  if (state.client) {
                    void state.client.request("cc.process.stop", {});
                  }
                },
              })
            : nothing
        }

        ${
          state.tab === "channels"
            ? renderChannels({
                connected: state.connected,
                loading: state.channelsLoading,
                snapshot: state.channelsSnapshot,
                lastError: state.channelsError,
                lastSuccessAt: state.channelsLastSuccess,
                whatsappMessage: state.whatsappLoginMessage,
                whatsappQrDataUrl: state.whatsappLoginQrDataUrl,
                whatsappConnected: state.whatsappLoginConnected,
                whatsappBusy: state.whatsappBusy,
                configSchema: state.configSchema,
                configSchemaLoading: state.configSchemaLoading,
                configForm: state.configForm,
                configUiHints: state.configUiHints,
                configSaving: state.configSaving,
                configFormDirty: state.configFormDirty,
                nostrProfileFormState: state.nostrProfileFormState,
                nostrProfileAccountId: state.nostrProfileAccountId,
                onRefresh: (probe) => loadChannels(state, probe),
                onWhatsAppStart: (force) => state.handleWhatsAppStart(force),
                onWhatsAppWait: () => state.handleWhatsAppWait(),
                onWhatsAppLogout: () => state.handleWhatsAppLogout(),
                onConfigPatch: (path, value) => updateConfigFormValue(state, path, value),
                onConfigSave: () => state.handleChannelConfigSave(),
                onConfigReload: () => state.handleChannelConfigReload(),
                onNostrProfileEdit: (accountId, profile) =>
                  state.handleNostrProfileEdit(accountId, profile),
                onNostrProfileCancel: () => state.handleNostrProfileCancel(),
                onNostrProfileFieldChange: (field, value) =>
                  state.handleNostrProfileFieldChange(field, value),
                onNostrProfileSave: () => state.handleNostrProfileSave(),
                onNostrProfileImport: () => state.handleNostrProfileImport(),
                onNostrProfileToggleAdvanced: () => state.handleNostrProfileToggleAdvanced(),
              })
            : nothing
        }

        ${
          state.tab === "instances"
            ? renderInstances({
                loading: state.presenceLoading,
                entries: state.presenceEntries,
                lastError: state.presenceError,
                statusMessage: state.presenceStatus,
                onRefresh: () => loadPresence(state),
              })
            : nothing
        }

        ${
          state.tab === "sessions"
            ? renderSessions({
                loading: state.sessionsLoading,
                result: state.sessionsResult,
                error: state.sessionsError,
                activeMinutes: state.sessionsFilterActive,
                limit: state.sessionsFilterLimit,
                includeGlobal: state.sessionsIncludeGlobal,
                includeUnknown: state.sessionsIncludeUnknown,
                basePath: state.basePath,
                onFiltersChange: (next) => {
                  state.sessionsFilterActive = next.activeMinutes;
                  state.sessionsFilterLimit = next.limit;
                  state.sessionsIncludeGlobal = next.includeGlobal;
                  state.sessionsIncludeUnknown = next.includeUnknown;
                },
                onRefresh: () => loadSessions(state),
                onPatch: (key, patch) => patchSession(state, key, patch),
                onDelete: (key) => deleteSession(state, key),
              })
            : nothing
        }

        ${renderUsageTab(state)}

        ${
          state.tab === "cron"
            ? renderCron({
                basePath: state.basePath,
                loading: state.cronLoading,
                status: state.cronStatus,
                jobs: state.cronJobs,
                error: state.cronError,
                busy: state.cronBusy,
                form: state.cronForm,
                channels: state.channelsSnapshot?.channelMeta?.length
                  ? state.channelsSnapshot.channelMeta.map((entry) => entry.id)
                  : (state.channelsSnapshot?.channelOrder ?? []),
                channelLabels: state.channelsSnapshot?.channelLabels ?? {},
                channelMeta: state.channelsSnapshot?.channelMeta ?? [],
                runsJobId: state.cronRunsJobId,
                runs: state.cronRuns,
                onFormChange: (patch) => (state.cronForm = { ...state.cronForm, ...patch }),
                onRefresh: () => state.loadCron(),
                onAdd: () => addCronJob(state),
                onToggle: (job, enabled) => toggleCronJob(state, job, enabled),
                onRun: (job) => runCronJob(state, job),
                onRemove: (job) => removeCronJob(state, job),
                onLoadRuns: (jobId) => loadCronRuns(state, jobId),
              })
            : nothing
        }

        ${
          state.tab === "agents"
            ? renderAgents({
                loading: state.agentsLoading,
                error: state.agentsError,
                agentsList: state.agentsList,
                selectedAgentId: resolvedAgentId,
                activePanel: state.agentsPanel,
                configForm: configValue,
                configLoading: state.configLoading,
                configSaving: state.configSaving,
                configDirty: state.configFormDirty,
                channelsLoading: state.channelsLoading,
                channelsError: state.channelsError,
                channelsSnapshot: state.channelsSnapshot,
                channelsLastSuccess: state.channelsLastSuccess,
                cronLoading: state.cronLoading,
                cronStatus: state.cronStatus,
                cronJobs: state.cronJobs,
                cronError: state.cronError,
                agentFilesLoading: state.agentFilesLoading,
                agentFilesError: state.agentFilesError,
                agentFilesList: state.agentFilesList,
                agentFileActive: state.agentFileActive,
                agentFileContents: state.agentFileContents,
                agentFileDrafts: state.agentFileDrafts,
                agentFileSaving: state.agentFileSaving,
                agentIdentityLoading: state.agentIdentityLoading,
                agentIdentityError: state.agentIdentityError,
                agentIdentityById: state.agentIdentityById,
                agentSkillsLoading: state.agentSkillsLoading,
                agentSkillsReport: state.agentSkillsReport,
                agentSkillsError: state.agentSkillsError,
                agentSkillsAgentId: state.agentSkillsAgentId,
                skillsFilter: state.skillsFilter,
                onRefresh: async () => {
                  await loadAgents(state);
                  const agentIds = state.agentsList?.agents?.map((entry) => entry.id) ?? [];
                  if (agentIds.length > 0) {
                    void loadAgentIdentities(state, agentIds);
                  }
                },
                onSelectAgent: (agentId) => {
                  if (state.agentsSelectedId === agentId) {
                    return;
                  }
                  state.agentsSelectedId = agentId;
                  state.agentFilesList = null;
                  state.agentFilesError = null;
                  state.agentFilesLoading = false;
                  state.agentFileActive = null;
                  state.agentFileContents = {};
                  state.agentFileDrafts = {};
                  state.agentSkillsReport = null;
                  state.agentSkillsError = null;
                  state.agentSkillsAgentId = null;
                  void loadAgentIdentity(state, agentId);
                  if (state.agentsPanel === "files") {
                    void loadAgentFiles(state, agentId);
                  }
                  if (state.agentsPanel === "skills") {
                    void loadAgentSkills(state, agentId);
                  }
                },
                onSelectPanel: (panel) => {
                  state.agentsPanel = panel;
                  if (panel === "files" && resolvedAgentId) {
                    if (state.agentFilesList?.agentId !== resolvedAgentId) {
                      state.agentFilesList = null;
                      state.agentFilesError = null;
                      state.agentFileActive = null;
                      state.agentFileContents = {};
                      state.agentFileDrafts = {};
                      void loadAgentFiles(state, resolvedAgentId);
                    }
                  }
                  if (panel === "skills") {
                    if (resolvedAgentId) {
                      void loadAgentSkills(state, resolvedAgentId);
                    }
                  }
                  if (panel === "channels") {
                    void loadChannels(state, false);
                  }
                  if (panel === "cron") {
                    void state.loadCron();
                  }
                },
                onLoadFiles: (agentId) => loadAgentFiles(state, agentId),
                onSelectFile: (name) => {
                  state.agentFileActive = name;
                  if (!resolvedAgentId) {
                    return;
                  }
                  void loadAgentFileContent(state, resolvedAgentId, name);
                },
                onFileDraftChange: (name, content) => {
                  state.agentFileDrafts = { ...state.agentFileDrafts, [name]: content };
                },
                onFileReset: (name) => {
                  const base = state.agentFileContents[name] ?? "";
                  state.agentFileDrafts = { ...state.agentFileDrafts, [name]: base };
                },
                onFileSave: (name) => {
                  if (!resolvedAgentId) {
                    return;
                  }
                  const content =
                    state.agentFileDrafts[name] ?? state.agentFileContents[name] ?? "";
                  void saveAgentFile(state, resolvedAgentId, name, content);
                },
                onToolsProfileChange: (agentId, profile, clearAllow) => {
                  if (!configValue) {
                    return;
                  }
                  const list = (configValue as { agents?: { list?: unknown[] } }).agents?.list;
                  if (!Array.isArray(list)) {
                    return;
                  }
                  const index = list.findIndex(
                    (entry) =>
                      entry &&
                      typeof entry === "object" &&
                      "id" in entry &&
                      (entry as { id?: string }).id === agentId,
                  );
                  if (index < 0) {
                    return;
                  }
                  const basePath = ["agents", "list", index, "tools"];
                  if (profile) {
                    updateConfigFormValue(state, [...basePath, "profile"], profile);
                  } else {
                    removeConfigFormValue(state, [...basePath, "profile"]);
                  }
                  if (clearAllow) {
                    removeConfigFormValue(state, [...basePath, "allow"]);
                  }
                },
                onToolsOverridesChange: (agentId, alsoAllow, deny) => {
                  if (!configValue) {
                    return;
                  }
                  const list = (configValue as { agents?: { list?: unknown[] } }).agents?.list;
                  if (!Array.isArray(list)) {
                    return;
                  }
                  const index = list.findIndex(
                    (entry) =>
                      entry &&
                      typeof entry === "object" &&
                      "id" in entry &&
                      (entry as { id?: string }).id === agentId,
                  );
                  if (index < 0) {
                    return;
                  }
                  const basePath = ["agents", "list", index, "tools"];
                  if (alsoAllow.length > 0) {
                    updateConfigFormValue(state, [...basePath, "alsoAllow"], alsoAllow);
                  } else {
                    removeConfigFormValue(state, [...basePath, "alsoAllow"]);
                  }
                  if (deny.length > 0) {
                    updateConfigFormValue(state, [...basePath, "deny"], deny);
                  } else {
                    removeConfigFormValue(state, [...basePath, "deny"]);
                  }
                },
                onConfigReload: () => loadConfig(state),
                onConfigSave: () => saveConfig(state),
                onChannelsRefresh: () => loadChannels(state, false),
                onCronRefresh: () => state.loadCron(),
                onSkillsFilterChange: (next) => (state.skillsFilter = next),
                onSkillsRefresh: () => {
                  if (resolvedAgentId) {
                    void loadAgentSkills(state, resolvedAgentId);
                  }
                },
                onAgentSkillToggle: (agentId, skillName, enabled) => {
                  if (!configValue) {
                    return;
                  }
                  const list = (configValue as { agents?: { list?: unknown[] } }).agents?.list;
                  if (!Array.isArray(list)) {
                    return;
                  }
                  const index = list.findIndex(
                    (entry) =>
                      entry &&
                      typeof entry === "object" &&
                      "id" in entry &&
                      (entry as { id?: string }).id === agentId,
                  );
                  if (index < 0) {
                    return;
                  }
                  const entry = list[index] as { skills?: unknown };
                  const normalizedSkill = skillName.trim();
                  if (!normalizedSkill) {
                    return;
                  }
                  const allSkills =
                    state.agentSkillsReport?.skills?.map((skill) => skill.name).filter(Boolean) ??
                    [];
                  const existing = Array.isArray(entry.skills)
                    ? entry.skills.map((name) => String(name).trim()).filter(Boolean)
                    : undefined;
                  const base = existing ?? allSkills;
                  const next = new Set(base);
                  if (enabled) {
                    next.add(normalizedSkill);
                  } else {
                    next.delete(normalizedSkill);
                  }
                  updateConfigFormValue(state, ["agents", "list", index, "skills"], [...next]);
                },
                onAgentSkillsClear: (agentId) => {
                  if (!configValue) {
                    return;
                  }
                  const list = (configValue as { agents?: { list?: unknown[] } }).agents?.list;
                  if (!Array.isArray(list)) {
                    return;
                  }
                  const index = list.findIndex(
                    (entry) =>
                      entry &&
                      typeof entry === "object" &&
                      "id" in entry &&
                      (entry as { id?: string }).id === agentId,
                  );
                  if (index < 0) {
                    return;
                  }
                  removeConfigFormValue(state, ["agents", "list", index, "skills"]);
                },
                onAgentSkillsDisableAll: (agentId) => {
                  if (!configValue) {
                    return;
                  }
                  const list = (configValue as { agents?: { list?: unknown[] } }).agents?.list;
                  if (!Array.isArray(list)) {
                    return;
                  }
                  const index = list.findIndex(
                    (entry) =>
                      entry &&
                      typeof entry === "object" &&
                      "id" in entry &&
                      (entry as { id?: string }).id === agentId,
                  );
                  if (index < 0) {
                    return;
                  }
                  updateConfigFormValue(state, ["agents", "list", index, "skills"], []);
                },
                onModelChange: (agentId, modelId) => {
                  if (!configValue) {
                    return;
                  }
                  const list = (configValue as { agents?: { list?: unknown[] } }).agents?.list;
                  if (!Array.isArray(list)) {
                    return;
                  }
                  const index = list.findIndex(
                    (entry) =>
                      entry &&
                      typeof entry === "object" &&
                      "id" in entry &&
                      (entry as { id?: string }).id === agentId,
                  );
                  if (index < 0) {
                    return;
                  }
                  const basePath = ["agents", "list", index, "model"];
                  if (!modelId) {
                    removeConfigFormValue(state, basePath);
                    return;
                  }
                  const entry = list[index] as { model?: unknown };
                  const existing = entry?.model;
                  if (existing && typeof existing === "object" && !Array.isArray(existing)) {
                    const fallbacks = (existing as { fallbacks?: unknown }).fallbacks;
                    const next = {
                      primary: modelId,
                      ...(Array.isArray(fallbacks) ? { fallbacks } : {}),
                    };
                    updateConfigFormValue(state, basePath, next);
                  } else {
                    updateConfigFormValue(state, basePath, modelId);
                  }
                },
                onModelFallbacksChange: (agentId, fallbacks) => {
                  if (!configValue) {
                    return;
                  }
                  const list = (configValue as { agents?: { list?: unknown[] } }).agents?.list;
                  if (!Array.isArray(list)) {
                    return;
                  }
                  const index = list.findIndex(
                    (entry) =>
                      entry &&
                      typeof entry === "object" &&
                      "id" in entry &&
                      (entry as { id?: string }).id === agentId,
                  );
                  if (index < 0) {
                    return;
                  }
                  const basePath = ["agents", "list", index, "model"];
                  const entry = list[index] as { model?: unknown };
                  const normalized = fallbacks.map((name) => name.trim()).filter(Boolean);
                  const existing = entry.model;
                  const resolvePrimary = () => {
                    if (typeof existing === "string") {
                      return existing.trim() || null;
                    }
                    if (existing && typeof existing === "object" && !Array.isArray(existing)) {
                      const primary = (existing as { primary?: unknown }).primary;
                      if (typeof primary === "string") {
                        const trimmed = primary.trim();
                        return trimmed || null;
                      }
                    }
                    return null;
                  };
                  const primary = resolvePrimary();
                  if (normalized.length === 0) {
                    if (primary) {
                      updateConfigFormValue(state, basePath, primary);
                    } else {
                      removeConfigFormValue(state, basePath);
                    }
                    return;
                  }
                  const next = primary
                    ? { primary, fallbacks: normalized }
                    : { fallbacks: normalized };
                  updateConfigFormValue(state, basePath, next);
                },
              })
            : nothing
        }

        ${
          state.tab === "skills"
            ? renderSkills({
                loading: state.skillsLoading,
                report: state.skillsReport,
                error: state.skillsError,
                filter: state.skillsFilter,
                edits: state.skillEdits,
                messages: state.skillMessages,
                busyKey: state.skillsBusyKey,
                ccSkills: state.ccSkills ?? [],
                ccSkillsLoading: state.ccSkillsLoading ?? false,
                ccSkillsError: state.ccSkillsError ?? null,
                onFilterChange: (next) => (state.skillsFilter = next),
                onRefresh: () => {
                  void loadSkills(state, { clearMessages: true });
                  void loadCcSkills(state);
                },
                onToggle: (key, enabled) => updateSkillEnabled(state, key, enabled),
                onEdit: (key, value) => updateSkillEdit(state, key, value),
                onSaveKey: (key) => saveSkillApiKey(state, key),
                onInstall: (skillKey, name, installId) =>
                  installSkill(state, skillKey, name, installId),
              })
            : nothing
        }

        ${
          state.tab === "notes"
            ? renderNotes({
                loading: state.notesLoading,
                items: state.notesItems,
                error: state.notesError,
                captureDraft: state.notesCaptureDraft,
                capturePriority: state.notesCapturePriority,
                captureBusy: state.notesCaptureBusy,
                captureError: state.notesCaptureError,
                searchQuery: state.notesSearchQuery,
                searchResults: state.notesSearchResults,
                searchLoading: state.notesSearchLoading,
                filter: state.notesFilter,
                onCaptureDraftChange: (v) => (state.notesCaptureDraft = v),
                onCapturePriorityChange: (v) => (state.notesCapturePriority = v),
                onCapture: () => captureNote(state as Parameters<typeof captureNote>[0]),
                onSearchQueryChange: (v) => (state.notesSearchQuery = v),
                onSearch: () => searchNotes(state as Parameters<typeof searchNotes>[0]),
                onFilterChange: (v) => {
                  state.notesFilter = v;
                  void loadNotes(state as Parameters<typeof loadNotes>[0]);
                },
                onDismiss: (id) => dismissNote(state as Parameters<typeof dismissNote>[0], id),
                onRefresh: () => loadNotes(state as Parameters<typeof loadNotes>[0]),
              })
            : nothing
        }

        ${
          state.tab === "nodes"
            ? renderNodes({
                loading: state.nodesLoading,
                nodes: state.nodes,
                devicesLoading: state.devicesLoading,
                devicesError: state.devicesError,
                devicesList: state.devicesList,
                configForm:
                  state.configForm ??
                  (state.configSnapshot?.config as Record<string, unknown> | null),
                configLoading: state.configLoading,
                configSaving: state.configSaving,
                configDirty: state.configFormDirty,
                configFormMode: state.configFormMode,
                execApprovalsLoading: state.execApprovalsLoading,
                execApprovalsSaving: state.execApprovalsSaving,
                execApprovalsDirty: state.execApprovalsDirty,
                execApprovalsSnapshot: state.execApprovalsSnapshot,
                execApprovalsForm: state.execApprovalsForm,
                execApprovalsSelectedAgent: state.execApprovalsSelectedAgent,
                execApprovalsTarget: state.execApprovalsTarget,
                execApprovalsTargetNodeId: state.execApprovalsTargetNodeId,
                onRefresh: () => loadNodes(state),
                onDevicesRefresh: () => loadDevices(state),
                onDeviceApprove: (requestId) => approveDevicePairing(state, requestId),
                onDeviceReject: (requestId) => rejectDevicePairing(state, requestId),
                onDeviceRotate: (deviceId, role, scopes) =>
                  rotateDeviceToken(state, { deviceId, role, scopes }),
                onDeviceRevoke: (deviceId, role) => revokeDeviceToken(state, { deviceId, role }),
                onLoadConfig: () => loadConfig(state),
                onLoadExecApprovals: () => {
                  const target =
                    state.execApprovalsTarget === "node" && state.execApprovalsTargetNodeId
                      ? { kind: "node" as const, nodeId: state.execApprovalsTargetNodeId }
                      : { kind: "gateway" as const };
                  return loadExecApprovals(state, target);
                },
                onBindDefault: (nodeId) => {
                  if (nodeId) {
                    updateConfigFormValue(state, ["tools", "exec", "node"], nodeId);
                  } else {
                    removeConfigFormValue(state, ["tools", "exec", "node"]);
                  }
                },
                onBindAgent: (agentIndex, nodeId) => {
                  const basePath = ["agents", "list", agentIndex, "tools", "exec", "node"];
                  if (nodeId) {
                    updateConfigFormValue(state, basePath, nodeId);
                  } else {
                    removeConfigFormValue(state, basePath);
                  }
                },
                onSaveBindings: () => saveConfig(state),
                onExecApprovalsTargetChange: (kind, nodeId) => {
                  state.execApprovalsTarget = kind;
                  state.execApprovalsTargetNodeId = nodeId;
                  state.execApprovalsSnapshot = null;
                  state.execApprovalsForm = null;
                  state.execApprovalsDirty = false;
                  state.execApprovalsSelectedAgent = null;
                },
                onExecApprovalsSelectAgent: (agentId) => {
                  state.execApprovalsSelectedAgent = agentId;
                },
                onExecApprovalsPatch: (path, value) =>
                  updateExecApprovalsFormValue(state, path, value),
                onExecApprovalsRemove: (path) => removeExecApprovalsFormValue(state, path),
                onSaveExecApprovals: () => {
                  const target =
                    state.execApprovalsTarget === "node" && state.execApprovalsTargetNodeId
                      ? { kind: "node" as const, nodeId: state.execApprovalsTargetNodeId }
                      : { kind: "gateway" as const };
                  return saveExecApprovals(state, target);
                },
              })
            : nothing
        }

        ${
          state.tab === "chat"
            ? renderChat({
                sessionKey: state.sessionKey,
                onSessionKeyChange: (next) => {
                  state.sessionKey = next;
                  state.chatMessage = "";
                  state.chatAttachments = [];
                  state.chatStream = null;
                  state.chatStreamStartedAt = null;
                  state.chatRunId = null;
                  state.chatQueue = [];
                  state.resetToolStream();
                  state.resetChatScroll();
                  state.applySettings({
                    ...state.settings,
                    sessionKey: next,
                    lastActiveSessionKey: next,
                  });
                  void state.loadAssistantIdentity();
                  void loadChatHistory(state);
                  void refreshChatAvatar(state);
                },
                thinkingLevel: state.chatThinkingLevel,
                showThinking,
                loading: state.chatLoading,
                sending: state.chatSending,
                compactionStatus: state.compactionStatus,
                assistantAvatarUrl: chatAvatarUrl,
                messages: state.chatMessages,
                toolMessages: state.chatToolMessages,
                stream: state.chatStream,
                streamStartedAt: state.chatStreamStartedAt,
                draft: state.chatMessage,
                queue: state.chatQueue,
                connected: state.connected,
                canSend: state.connected,
                disabledReason: chatDisabledReason,
                error: state.lastError,
                sessions: state.sessionsResult,
                focusMode: chatFocus,
                onRefresh: () => {
                  state.resetToolStream();
                  return Promise.all([loadChatHistory(state), refreshChatAvatar(state)]);
                },
                onToggleFocusMode: () => {
                  if (state.onboarding) {
                    return;
                  }
                  state.applySettings({
                    ...state.settings,
                    chatFocusMode: !state.settings.chatFocusMode,
                  });
                },
                onChatScroll: (event) => state.handleChatScroll(event),
                onDraftChange: (next) => (state.chatMessage = next),
                attachments: state.chatAttachments,
                onAttachmentsChange: (next) => (state.chatAttachments = next),
                onSend: () => state.handleSendChat(),
                canAbort: Boolean(state.chatRunId),
                onAbort: () => void state.handleAbortChat(),
                onQueueRemove: (id) => state.removeQueuedMessage(id),
                onNewSession: () => state.handleSendChat("/new", { restoreDraft: true }),
                showNewMessages: state.chatNewMessagesBelow && !state.chatManualRefreshInFlight,
                onScrollToBottom: () => state.scrollToBottom(),
                // Sidebar props for tool output viewing
                sidebarOpen: state.sidebarOpen,
                sidebarContent: state.sidebarContent,
                sidebarError: state.sidebarError,
                splitRatio: state.splitRatio,
                onOpenSidebar: (content: string) => state.handleOpenSidebar(content),
                onCloseSidebar: () => state.handleCloseSidebar(),
                onSplitRatioChange: (ratio: number) => state.handleSplitRatioChange(ratio),
                assistantName: state.assistantName,
                assistantAvatar: state.assistantAvatar,
              })
            : nothing
        }

        ${
          state.tab === "config"
            ? renderConfig({
                raw: state.configRaw,
                originalRaw: state.configRawOriginal,
                valid: state.configValid,
                issues: state.configIssues,
                loading: state.configLoading,
                saving: state.configSaving,
                applying: state.configApplying,
                updating: state.updateRunning,
                connected: state.connected,
                schema: state.configSchema,
                schemaLoading: state.configSchemaLoading,
                uiHints: state.configUiHints,
                formMode: state.configFormMode,
                formValue: state.configForm,
                originalValue: state.configFormOriginal,
                searchQuery: state.configSearchQuery,
                activeSection: state.configActiveSection,
                activeSubsection: state.configActiveSubsection,
                onRawChange: (next) => {
                  state.configRaw = next;
                },
                onFormModeChange: (mode) => (state.configFormMode = mode),
                onFormPatch: (path, value) => updateConfigFormValue(state, path, value),
                onSearchChange: (query) => (state.configSearchQuery = query),
                onSectionChange: (section) => {
                  state.configActiveSection = section;
                  state.configActiveSubsection = null;
                },
                onSubsectionChange: (section) => (state.configActiveSubsection = section),
                onReload: () => loadConfig(state),
                onSave: () => saveConfig(state),
                onApply: () => applyConfig(state),
                onUpdate: () => runUpdate(state),
              })
            : nothing
        }

        ${
          state.tab === "debug"
            ? renderDebug({
                loading: state.debugLoading,
                status: state.debugStatus,
                health: state.debugHealth,
                models: state.debugModels,
                heartbeat: state.debugHeartbeat,
                eventLog: state.eventLog,
                callMethod: state.debugCallMethod,
                callParams: state.debugCallParams,
                callResult: state.debugCallResult,
                callError: state.debugCallError,
                onCallMethodChange: (next) => (state.debugCallMethod = next),
                onCallParamsChange: (next) => (state.debugCallParams = next),
                onRefresh: () => loadDebug(state),
                onCall: () => callDebugMethod(state),
              })
            : nothing
        }

        ${
          state.tab === "logs"
            ? renderLogs({
                loading: state.logsLoading,
                error: state.logsError,
                file: state.logsFile,
                entries: state.logsEntries,
                filterText: state.logsFilterText,
                levelFilters: state.logsLevelFilters,
                autoFollow: state.logsAutoFollow,
                truncated: state.logsTruncated,
                onFilterTextChange: (next) => (state.logsFilterText = next),
                onLevelToggle: (level, enabled) => {
                  state.logsLevelFilters = { ...state.logsLevelFilters, [level]: enabled };
                },
                onToggleAutoFollow: (next) => (state.logsAutoFollow = next),
                onRefresh: () => loadLogs(state, { reset: true }),
                onExport: (lines, label) => state.exportLogs(lines, label),
                onScroll: (event) => state.handleLogsScroll(event),
              })
            : nothing
        }

        ${
          state.tab === "cc-pipelines"
            ? html`
              ${renderNotesContext({ results: state.notesSearchResults, loading: state.notesSearchLoading })}
              ${renderCcPipelines({
                loading: state.ccPipelinesLoading,
                pipelines: state.ccPipelines,
                error: state.ccPipelinesError,
                runsLoading: state.ccRunsLoading,
                runs: state.ccRuns,
                runsError: state.ccRunsError,
                onRefresh: () => {
                  void loadCcPipelines(state);
                  void loadCcRuns(state);
                },
                onRunPipeline: (path) => triggerCcRun(state, path, "default"),
              })}
            `
            : nothing
        }

        ${
          state.tab === "cc-governor"
            ? html`
              ${renderNotesContext({ results: state.notesSearchResults, loading: state.notesSearchLoading })}
              ${renderCcGovernor({
                loading: state.ccGovernorLoading,
                pending: state.ccGovernorPending,
                count: state.ccGovernorCount,
                error: state.ccGovernorError,
                onRefresh: () => loadCcGovernor(state),
                onApprove: (id) => approveCcReferral(state, id),
                onDeny: (id) => denyCcReferral(state, id),
              })}
            `
            : nothing
        }

        ${
          state.tab === "cc-kb"
            ? renderCcKb({
                loading: state.ccKbLoading,
                results: state.ccKbResults,
                query: state.ccKbQuery,
                error: state.ccKbError,
                onQueryChange: (q) => (state.ccKbQuery = q),
                onSearch: () => loadCcKb(state),
              })
            : nothing
        }

        ${
          state.tab === "cc-arena"
            ? html`
              ${renderNotesContext({ results: state.notesSearchResults, loading: state.notesSearchLoading })}
              ${renderCcArena({
                loading: state.ccArenaLoading,
                sessions: state.ccArenaSessions,
                error: state.ccArenaError,
                selectedId: state.ccArenaSelectedId,
                messages: state.ccArenaMessages,
                messagesLoading: state.ccArenaMessagesLoading,
                chatInput: state.ccArenaChatInput,
                onRefresh: () => loadCcArenaSessions(state),
                onSelectSession: (id) => {
                  state.ccArenaSelectedId = id;
                  void loadCcArenaMessages(state, id);
                },
                onChatInputChange: (v) => (state.ccArenaChatInput = v),
                onSendChat: () => sendCcArenaChat(state),
              })}
            `
            : nothing
        }
        ${
          state.tab === "settings"
            ? renderSettingsContainer({
                activeSubTab:
                  ((state as unknown as Record<string, string>)
                    .settingsSubTab as import("./navigation.ts").SettingsSubTab) ?? "config",
                onSubTabChange: (tab) => {
                  (state as unknown as Record<string, string>).settingsSubTab = tab;
                },
                content: nothing,
              })
            : nothing
        }
      </main>
      ${renderExecApprovalPrompt(state)}
      ${renderGatewayUrlConfirmation(state)}
    </div>
  `;
}
