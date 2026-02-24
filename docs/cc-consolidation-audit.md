# CC-into-Wildvine Consolidation Audit

> **Generated:** 2026-02-23
> **Purpose:** Feature-by-feature comparison of Wildvine and CommandCentral to drive consolidation decisions
> **Status:** Draft — awaiting Dan's review before implementation

---

## Table of Contents

1. [Memory & Knowledge](#1-memory--knowledge)
2. [Skills](#2-skills)
3. [Automation](#3-automation)
4. [Deliberation](#4-deliberation)
5. [Governance](#5-governance)
6. [Goal Tracking](#6-goal-tracking)
7. [Context Injection](#7-context-injection)
8. [Self-Improvement](#8-self-improvement)
9. [Redundancy Map](#9-redundancy-map)
10. [Consolidation Recommendations](#10-consolidation-recommendations)

---

## 1. Memory & Knowledge

### Wildvine Memory System

**Location:** `src/memory/` (manager.ts, hybrid.ts, memory-schema.ts, search-manager.ts, manager-embedding-ops.ts)
**Storage:** `~/.wildvine/agents/{agentId}/memory/index.sqlite`

| Capability              | Implementation                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vector search**       | Multi-provider embeddings: OpenAI (text-embedding-3-small/large), Google Gemini (embedding-001), Voyage (voyage-3/3-lite), local via memory-lancedb extension |
| **Full-text search**    | SQLite FTS5 virtual table (`chunks_fts`), BM25 ranking (`hybrid.ts:36-38`)                                                                                    |
| **Hybrid scoring**      | Weighted merge of vector + keyword scores (`mergeHybridResults()` in `hybrid.ts:41-100+`), configurable weights                                               |
| **Batch embedding**     | Per-provider batch APIs (OpenAI, Gemini, Voyage) with exponential backoff (max 3 attempts, base 500ms), 4 concurrent batches, 8000 max tokens/batch           |
| **Data model**          | 4 SQLite tables: `meta` (kv), `files` (tracking), `chunks` (text + embeddings), `embedding_cache` (provider-specific)                                         |
| **Memory sources**      | `memory/` dir (.md files) + `sessions/` dir (JSONL transcripts), per-source statistics                                                                        |
| **Embedding cache**     | Provider/model/key-specific cache enabling reuse across re-indexing                                                                                           |
| **Fallback chain**      | Auto-fallback between embedding providers with reason tracking (`fallbackFrom`, `fallbackReason`)                                                             |
| **Chunking**            | Markdown-aware via `chunkMarkdown()`, line-based tracking (start_line, end_line)                                                                              |
| **Alternative backend** | QMD integration (`qmd-manager.ts`) — spawns external qmd binary for alternative search                                                                        |

**Gaps:** No explicit recency ranking. QMD backend requires external binary. Session sync is incremental, not real-time. Batch failure auto-disables after 3 errors.

### CC Knowledge Base

**Location:** `hub-backend/routers/kb.py` (1212 lines)
**Storage:** `~/.cc/hub/kb_index.db` (SQLite with FTS5)

| Capability               | Implementation                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| **Full-text search**     | SQLite FTS5 on `documents_fts` table (`kb.py:197-203`)                                    |
| **Keyword scoring**      | `_text_search_score()` with text relevance (`kb.py:249-267`)                              |
| **Snippet generation**   | `_highlight_snippet()` extracts context around matches (`kb.py:270-299`)                  |
| **Entity types**         | GOAL, HYPOTHESIS, EVIDENCE, NODE, DOCUMENT (`kb.py:46-53`)                                |
| **Cross-DB search**      | Searches across `idealzr.db` (goals, hypotheses, evidence) and `vislzr.db` (canvas nodes) |
| **Multi-project search** | `/search/multi` endpoint (`kb.py:366`) across multiple project_ids                        |
| **Autocomplete**         | `/suggest` endpoint (`kb.py:630`)                                                         |
| **Agent memory**         | Store/retrieve per-agent memory entries (`kb.py:1085-1140`), session-end summaries        |
| **File indexing**        | Index files from path (`kb.py:721`), indexing status tracking (`kb.py:803`)               |
| **Semantic bridge**      | Optional external KnowledgeBeast API (`KNOWLEDGEBEAST_API_URL`, `kb.py:36`)               |
| **Related entities**     | Find related entities across types (`kb.py:878`)                                          |

**Gaps:** No embedding-based vector search built-in (keyword only). FTS5 limited to SQLite. No semantic similarity scoring. Memory entry TTL deletion is optional/incomplete.

### Side-by-Side Comparison

| Dimension               | Wildvine                                            | CC KB                                                               | Winner              |
| ----------------------- | --------------------------------------------------- | ------------------------------------------------------------------- | ------------------- |
| **Search quality**      | Hybrid (vector + keyword) with configurable weights | Keyword-only (FTS5 + text scoring)                                  | **Wildvine**        |
| **Embedding support**   | 4+ providers with fallback chains, batch processing | None built-in (optional external API)                               | **Wildvine**        |
| **Entity model**        | Flat chunks (text + metadata)                       | Structured entities (goals, hypotheses, evidence, nodes, documents) | **CC**              |
| **Cross-system search** | Single agent scope                                  | Cross-DB search (IDEALZR, VISLZR, KB) across projects               | **CC**              |
| **Snippet/highlight**   | Raw chunk text                                      | Context-aware snippet extraction                                    | **CC**              |
| **Autocomplete**        | None                                                | Suggest endpoint                                                    | **CC**              |
| **Storage maturity**    | SQLite with embedding cache                         | SQLite FTS5 with entity-typed indexing                              | **Tie**             |
| **Agent memory**        | Session JSONL + embedded chunks                     | Per-agent memory with session-end summaries                         | **CC** (structured) |

**Verdict:** Wildvine has superior search quality (embeddings + hybrid). CC has superior entity modeling and cross-system search. The ideal consolidation combines Wildvine's embedding infrastructure with CC's structured entity model.

---

## 2. Skills

### Wildvine Skill System

**Location:** `src/agents/skills/` (types.ts, refresh.ts, bundled-context.ts, frontmatter.ts, workspace.ts, plugin-skills.ts)

| Capability             | Implementation                                                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Skill format**       | `SKILL.md` (Markdown + YAML frontmatter) per skill directory                                                                       |
| **Frontmatter fields** | name, description, skillKey, emoji, homepage, always, os, requires (bins, anyBins, env, config), install                           |
| **Discovery paths**    | `{workspace}/skills/*/SKILL.md`, `~/.wildvine/skills/*/SKILL.md`, `~/.agents/skills/*/SKILL.md`, config extras, plugin-contributed |
| **Hot reload**         | Chokidar file watcher with 250ms debounce, version bumping on changes (`refresh.ts:132-150`)                                       |
| **Install specs**      | Declarative: brew, node, go, uv, download — with per-OS targeting (`types.ts:SkillInstallSpec`)                                    |
| **Eligibility**        | Binary checking (`hasBin()`), OS filtering, env var requirements                                                                   |
| **Invocation policy**  | `userInvocable` + `disableModelInvocation` per skill                                                                               |
| **Snapshots**          | Version-tracked snapshots with prompt text + resolved skill objects                                                                |
| **Plugin skills**      | Plugins can contribute skill directories                                                                                           |
| **RPC surface**        | `skills.status`, `skills.bins`, `skills.install`, `skills.update`                                                                  |

**Gaps:** No marketplace/remote registry. No skill evaluation/scoring. No transactional install/rollback. No per-skill versioning (only snapshot-level).

### CC Skills System

**Location:** `hub-backend/services/skill_execution_service.py` (120 lines), `hub-backend/routers/skills.py` (92 lines)
**Manifest:** `skills/manifest.yaml`

| Capability                | Implementation                                                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Skill format**          | YAML manifest with name, priority (P0/P1/P2), keywords, path                                                                  |
| **P0 enforcement**        | P0 skills are MANDATORY before task execution — preamble prepended to AI prompts (`skill_execution_service.py:40-81`)         |
| **Task-based resolution** | `resolve_skills(task)` — keyword matching to find applicable skills                                                           |
| **Preamble building**     | `build_skill_preamble(task)` for task-specific, `build_universal_preamble()` for all P0                                       |
| **Ingestion pipeline**    | 3-stage: discover → evaluate (OpenAI criteria) → ingest/governor referral (`pipelines/workflow/skill-ingestion.pipeline.yml`) |
| **API surface**           | GET `/skills/manifest`, GET `/skills/list`, GET `/skills/{name}`, POST `/skills/resolve`                                      |

**Gaps:** No hot reload. No install specs. No binary/env eligibility checking. No skill marketplace. Static registry (no dynamic loading).

### Side-by-Side Comparison

| Dimension                 | Wildvine                                               | CC                                              | Winner                    |
| ------------------------- | ------------------------------------------------------ | ----------------------------------------------- | ------------------------- |
| **Skill format richness** | SKILL.md with install specs, eligibility, OS targeting | YAML manifest with priority + keywords          | **Wildvine**              |
| **Discovery**             | Filesystem watch + plugin contributions                | Static manifest + ingestion pipeline            | **Wildvine** (hot reload) |
| **Evaluation/quality**    | None — all discovered skills are loaded                | 3-stage pipeline with OpenAI evaluation scoring | **CC**                    |
| **Priority enforcement**  | `always` flag per skill                                | P0/P1/P2 with mandatory P0 preamble             | **CC**                    |
| **Installation**          | Declarative specs (brew/node/go/uv/download)           | Manual only                                     | **Wildvine**              |
| **Task matching**         | Eligibility (binary/env checks)                        | Keyword-based resolution                        | **CC** (smarter)          |

**Verdict:** Wildvine has better skill packaging (install specs, hot reload, eligibility). CC has better skill governance (evaluation pipeline, P0 enforcement, task-based resolution). Consolidation should use Wildvine's SKILL.md format with CC's evaluation pipeline and priority enforcement.

---

## 3. Automation

### Wildvine Cron

**Location:** `src/cron/` (types.ts, service/jobs.ts, schedule.ts, isolated-agent.ts, run-log.ts)
**Storage:** `~/.wildvine/cron/jobs.json`

| Capability             | Implementation                                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Schedule types**     | `at` (one-shot ISO timestamp), `every` (interval ms + anchor), `cron` (standard expression + timezone)      |
| **Session targets**    | `main` (system event) or `isolated` (dedicated agent session)                                               |
| **Payload types**      | `systemEvent` (text) or `agentTurn` (message + model override + thinking + timeout + channel delivery)      |
| **Delivery**           | `none` or `announce` to configured channel/recipient, best-effort option                                    |
| **State tracking**     | nextRunAtMs, runningAtMs, lastRunAtMs, lastStatus (ok/error/skipped), consecutiveErrors, scheduleErrorCount |
| **Stuck detection**    | 2-hour timeout, auto-reset running state (`jobs.ts:21`)                                                     |
| **Auto-disable**       | After 3 consecutive schedule errors (`jobs.ts:91`)                                                          |
| **Isolated execution** | Creates new agent session, runs turn, logs results, delivers to channel                                     |
| **RPC surface**        | `cron.list`, `cron.status`, `cron.add`, `cron.update`, `cron.remove`, `cron.run`, `cron.runs`               |

### CC Pipeline Runner

**Location:** `pipeline-runner/cc_pipeline_runner/`
**Storage:** `~/.cc/runs/runs.db` (SQLite)

| Capability                  | Implementation                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **43 stage handlers**       | echo (3), radar (4), firmware (3), github (1), meta-orchestration (7), skills (3), validation (1), plus more              |
| **Pipeline format**         | YAML with stages, metadata, controls, budgets, security, thresholds, escalation sections                                  |
| **13 production pipelines** | tutorial, tech-radar (5 variants), firmware, meta-orchestration (2), skill-ingestion, referrals, ux-ui (2)                |
| **Execution model**         | Sequential stages, `continue_on_failure` flag per stage, retry with max_attempts + delay_seconds                          |
| **Artifact model**          | Created per stage, stored in `events` table, passed to next stage via `stage_payload["artifacts"]`                        |
| **Meta-orchestration**      | classify_work → fork_execution → execute_preferred → collect_results → compare_strategies → record_evidence → emit_output |
| **Permission gates**        | Class A (auto-allow) through Class D (forbidden), escalation triggers for governance/constitution/secrets/risk            |
| **API surface**             | GET `/pipelines`, GET `/pipelines/{name}`, POST `/runs`, GET `/runs`, GET `/runs/{id}`, GET `/runs/{id}/events`           |

### Side-by-Side Comparison

| Dimension                | Wildvine Cron                                | CC Pipeline Runner                                  | Winner       |
| ------------------------ | -------------------------------------------- | --------------------------------------------------- | ------------ |
| **Scheduling**           | Full scheduler (at/every/cron/tz)            | No built-in scheduler (triggered via API or manual) | **Wildvine** |
| **Execution complexity** | Single agent turn per job                    | Multi-stage sequential pipeline with artifacts      | **CC**       |
| **Parallelism**          | One job = one isolated session               | Meta-orchestration fork/collect pattern             | **CC**       |
| **Artifact tracking**    | None (agent output only)                     | Typed artifacts passed between stages               | **CC**       |
| **Permission/security**  | Agent-level exec approvals                   | 4-class permission system with escalation triggers  | **CC**       |
| **Error handling**       | Auto-disable after 3 errors, stuck detection | Per-stage retry, continue_on_failure                | **CC**       |
| **Extensibility**        | Agent turn with model/thinking override      | 43 pluggable stage handlers                         | **CC**       |

**Verdict:** These are complementary, not competing. Wildvine Cron = when to run. CC Pipelines = what to run. Consolidation: Wildvine cron triggers CC pipeline runs via existing `cc.runs.create` RPC.

---

## 4. Deliberation

### CC Arena (No Wildvine Equivalent)

**Location:** `hub-backend/routers/arena.py` (1082 lines)
**Storage:** `~/.cc/hub/arena.db` (SQLite)

| Capability            | Implementation                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| **Session modes**     | GROUP_CHAT (all agents see/respond), DEBATE (turn-based arguing), ROUND_ROBIN (fixed order)         |
| **Session lifecycle** | ACTIVE → PAUSED → COMPLETED → ARCHIVED                                                              |
| **Agent config**      | display_name, model, archetype (architect/legal/cto/sre/ux/adversarial), system_prompt, temperature |
| **Message model**     | USER, AGENT, SYSTEM roles with agent attribution                                                    |
| **AI response**       | Multi-archetype prompts, rate limiting, error handling (APIKeyMissing, RateLimit)                   |
| **Statistics**        | `/arena/stats` aggregate stats, `/arena/ai-status` client health                                    |
| **API surface**       | CRUD sessions, list/post messages, chat, simulate-response                                          |

**Wildvine integration status:** Proxied via `cc.arena.sessions`, `cc.arena.messages`, `cc.arena.chat` RPCs. Agent tool `cc_arena_chat` registered. UI view exists in `ui/src/ui/views/cc-arena.ts`.

**Gaps:** No Wildvine-native multi-agent deliberation. Arena is fully CC-dependent. No session creation from Wildvine UI (read + chat only). No debate/round-robin mode from Wildvine.

**Assessment:** Arena is CC-unique. Keep as CC service, deepen Wildvine proxy (add session creation, mode selection).

---

## 5. Governance

### Wildvine Exec-Approvals

**Location:** `src/infra/exec-approvals.ts`, `exec-approval-forwarder.ts`, `exec-approvals-allowlist.ts`
**Storage:** In-memory (promises) + `~/.wildvine/exec-approvals.json` (allowlist config)

| Capability           | Implementation                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| **Scope**            | Node command execution only                                                                           |
| **Security modes**   | `deny` (all blocked), `allowlist` (pattern match), `full` (unrestricted)                              |
| **Ask modes**        | `off`, `on-miss` (default), `always`                                                                  |
| **Decisions**        | `allow-once`, `allow-always` (adds to allowlist), `deny` (with reason)                                |
| **Allowlist**        | Glob/regex patterns with UUID tracking, last-used metadata                                            |
| **Forwarding**       | Approval requests forwarded to channels with agent/session filters                                    |
| **Per-agent config** | Security mode, ask mode, fallback, autoAllowSkills, custom allowlist                                  |
| **RPC surface**      | `exec.approvals.get/set`, `exec.approval.request/waitDecision/resolve`, `exec.approvals.node.get/set` |

**Critical gap:** Approval state is ephemeral (in-memory promises). Lost on gateway restart. No persistent audit trail.

### CC Governor Queue

**Location:** `hub-backend/app.py:1167-1284`, `pipeline-runner/state/referrals.py`
**Storage:** JSONL files (`~/.cc/instances/{instance}/data/inbox/referrals.jsonl`) + JSON ack state

| Capability              | Implementation                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Scope**               | Pipeline execution, financial approvals, cross-instance referrals                                                        |
| **Referral model**      | id, from_instance, to_instance, reason, artifact_ref, kind                                                               |
| **Decisions**           | approved/denied with comment + timestamp                                                                                 |
| **Financial approvals** | External-spend endpoint with amount, currency, target_wallet, agent_id                                                   |
| **Escalation policy**   | 4 classes (A=auto, B=CTO+owner, C=legal, D=forbidden), risk threshold triggers                                           |
| **Escalation triggers** | affects_governance, affects_constitution, changes_permissions, modifies_execution_runtime, touches_secrets, risk >= 0.70 |
| **Audit retention**     | 180d packets, 365d audit events, 90d idempotency keys                                                                    |
| **API surface**         | GET pending, POST approve/deny, GET history, POST external-spend                                                         |

### Side-by-Side Comparison

| Dimension              | Wildvine Exec-Approvals                         | CC Governor                                | Winner                   |
| ---------------------- | ----------------------------------------------- | ------------------------------------------ | ------------------------ |
| **Persistence**        | In-memory (lost on restart)                     | JSONL + JSON (persisted)                   | **CC**                   |
| **Scope**              | Node command execution only                     | Pipeline stages, financial, cross-instance | **CC**                   |
| **Escalation**         | None (ask → fallback only)                      | 4-class policy with risk triggers          | **CC**                   |
| **Audit trail**        | None                                            | Retention policies (180d/365d/90d)         | **CC**                   |
| **UX**                 | Interactive (real-time approval via UI/channel) | Queue-based (check and decide later)       | **Wildvine** (real-time) |
| **Allowlisting**       | Pattern-based with auto-learn                   | None (per-referral only)                   | **Wildvine**             |
| **Channel forwarding** | Forward to Discord/Slack/etc with filters       | No channel integration                     | **Wildvine**             |

**Verdict:** Different scopes, both needed. Wildvine exec-approvals handle real-time command approval (UX-focused). CC governor handles strategic/policy approval (governance-focused). Consolidation: persist Wildvine approval decisions to CC governor table for audit trail. Keep real-time UX in Wildvine, policy/escalation in CC.

---

## 6. Goal Tracking

### CC IDEALZR (No Wildvine Equivalent)

**Location:** `hub-backend/routers/idealzr.py` (999 lines)
**Storage:** `~/.cc/hub/idealzr.db` (SQLite)

#### Goals

```
id (UUID), project_id, title, description, state (DRAFT|ACTIVE|ACHIEVED|ARCHIVED),
target_date, progress (0-100), parent_goal_id, tags (JSONB)
```

#### Hypotheses

```
id (UUID), project_id, title, description, state (PROPOSED|TESTING|VALIDATED|INVALIDATED|ARCHIVED),
goal_id (FK), prediction, test_criteria, conclusion, tags, evidence_count
```

#### Evidence

```
id (UUID), project_id, hypothesis_id (FK), title, content,
evidence_type (OBSERVATION|DATA|EXPERIMENT|REFERENCE|USER_FEEDBACK),
support (SUPPORTS|CONTRADICTS|NEUTRAL), source, tags
```

**API:** Full CRUD for goals (5 endpoints), hypotheses (5 endpoints), evidence (5 endpoints), plus stats.

### CC VISLZR (No Wildvine Equivalent)

**Location:** `hub-backend/routers/vislzr.py` (1163 lines)
**Storage:** `~/.cc/hub/vislzr.db` (SQLite)

#### Canvases

```
id (UUID), project_id, name, description
```

#### Nodes

```
id (UUID), canvas_id (FK), node_type (GOAL|HYPOTHESIS|EVIDENCE|NOTE|TASK|RESOURCE|CUSTOM),
label, position_x/y, width/height, data (JSONB), linked_entity_type/id, style (JSONB)
```

#### Edges

```
id (UUID), canvas_id (FK), source_id, target_id,
edge_type (DEFAULT|DEPENDENCY|SUPPORTS|CONTRADICTS|RELATES|PARENT),
label, animated, style (JSONB)
```

**Features:** BFS graph traversal ("wander"), bulk node updates, layout generation, edge-type filtering.

**Wildvine integration status:** Read-only via `cc.vislzr.canvases` and `cc.vislzr.canvas` RPCs. No mutations exposed.

**Assessment:** IDEALZR and VISLZR are CC-unique strategic planning tools. No Wildvine equivalent exists. Keep as CC services. Expose IDEALZR mutations as Wildvine agent tools for goal-driven agent behavior.

---

## 7. Context Injection

### Veria-Context Extension

**Location:** `extensions/veria-context/index.ts` (80 lines)

| Aspect                     | Implementation                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| **Hooks**                  | `before_agent_start` (inject context), `before_tool_call` (alignment check)                      |
| **Target agents**          | veria-orchestrator, veria-ceo, veria-outreach, veria-intel, veria-marketing                      |
| **Outbound tools checked** | send_message, send_email, messaging_send, telegram_send, slack_post                              |
| **Injector**               | External Python script: `context-injector.py --agent {id} --trigger {trigger} --format markdown` |
| **Output**                 | Markdown prepended to system prompt (session start) or action context (tool call)                |
| **Timeout**                | 10s, silent failure if script missing                                                            |

### CC Knowledge Capture (Potential Source)

**Location:** `hub-backend/routers/knowledge_capture.py`

| Endpoint                         | Purpose                                   |
| -------------------------------- | ----------------------------------------- |
| `POST /knowledge/import/cli`     | Import CLI session transcripts            |
| `POST /knowledge/import/chatgpt` | Import ChatGPT exports                    |
| `POST /knowledge/import/generic` | Generic knowledge import                  |
| `GET /knowledge/learnings`       | Retrieve captured learnings               |
| `POST /knowledge/watcher/start`  | Start filesystem watcher for auto-capture |

### Analysis

The context injection flow is **one-way**: CC/veria data → Wildvine agent sessions. No feedback loop exists. Wildvine session learnings never flow back to CC's KB.

**Missing connection:** After a Wildvine agent session ends, captured session memory (stored in `~/.wildvine/agents/{id}/memory/`) is never pushed to CC's `/api/knowledge/capture` endpoint. This means CC's KB doesn't benefit from agent interactions conducted through Wildvine.

---

## 8. Self-Improvement

### Wildvine Session Memory Hook

**Location:** `src/hooks/bundled/session-memory/handler.ts` (150+ lines)

| Aspect               | Implementation                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| **Trigger**          | `/new` command (session start)                                                                 |
| **Capture**          | Last N messages from previous session (default 15, configurable via `session-memory.messages`) |
| **Slug generation**  | LLM-based (10s timeout) or ISO timestamp fallback                                              |
| **Storage**          | `{workspaceDir}/memory/{YYYY-MM-DD}/{slug}.md`                                                 |
| **Searchability**    | Memory files indexed by MemoryIndexManager (vector + FTS)                                      |
| **Self-improvement** | Implicit — new sessions search prior session memories                                          |

**Gaps:** No summarization (raw messages only). No cross-session linking. No deduplication. No reflection mechanism.

### CC Knowledge Capture

**Location:** `hub-backend/routers/knowledge_capture.py`

| Aspect                  | Implementation                                               |
| ----------------------- | ------------------------------------------------------------ |
| **In-session capture**  | Agent calls `/knowledge/capture` during execution            |
| **Session-end summary** | `/knowledge/memory/{agent_id}/session-end` generates summary |
| **Learnings retrieval** | `/knowledge/learnings` endpoint                              |
| **Filesystem watcher**  | Auto-capture from watched directories                        |
| **KB indexing**         | Captured knowledge indexed and searchable via KB search      |

### Side-by-Side Comparison

| Dimension                  | Wildvine Session Memory       | CC Knowledge Capture                   | Winner                    |
| -------------------------- | ----------------------------- | -------------------------------------- | ------------------------- |
| **Capture trigger**        | Automatic on `/new`           | Explicit API call during/after session | **Wildvine** (automatic)  |
| **Content quality**        | Raw messages (no processing)  | Structured capture with context        | **CC**                    |
| **Search integration**     | Vector + FTS via memory index | FTS via KB search                      | **Wildvine** (embeddings) |
| **Summarization**          | None                          | Session-end summary generation         | **CC**                    |
| **External import**        | None                          | CLI, ChatGPT, generic import           | **CC**                    |
| **Cross-session learning** | Search prior memories         | Unified KB across all sessions         | **CC**                    |

**Verdict:** Wildvine captures automatically but shallowly. CC captures deeper but requires explicit calls. Consolidation: keep Wildvine's auto-capture, add CC-style summarization, push summaries to CC's KB for cross-session learning.

---

## 9. Redundancy Map

### Feature Overlap Table

| Feature                      | Wildvine                                      | CC                                              | Overlap                | Recommendation                                          |
| ---------------------------- | --------------------------------------------- | ----------------------------------------------- | ---------------------- | ------------------------------------------------------- |
| **Vector search**            | Multi-provider embeddings, hybrid scoring     | None (keyword only)                             | None                   | **Keep Wildvine** — CC has no equivalent                |
| **Full-text search**         | SQLite FTS5                                   | SQLite FTS5 + entity-typed indexing             | **Redundant**          | **Absorb CC's entity model** into Wildvine's search     |
| **Skill format**             | SKILL.md + install specs + hot reload         | YAML manifest + P0/P1/P2 priority               | **Partial overlap**    | **Keep Wildvine format**, add CC's priority enforcement |
| **Skill evaluation**         | None                                          | 3-stage pipeline (discover/evaluate/ingest)     | None                   | **Keep CC** — Wildvine has no equivalent                |
| **Task scheduling**          | Full cron (at/every/cron expressions)         | None (API-triggered only)                       | None                   | **Keep Wildvine** — CC has no scheduler                 |
| **Pipeline execution**       | None                                          | 43 stage handlers, 13 pipelines, artifact model | None                   | **Keep CC** — Wildvine has no equivalent                |
| **Multi-agent deliberation** | None                                          | Arena (3 modes, archetype prompts)              | None                   | **Keep CC** — unique capability                         |
| **Command approval**         | Real-time exec-approvals (in-memory)          | None at command level                           | None                   | **Keep Wildvine** — CC handles strategic approvals      |
| **Strategic approval**       | None                                          | Governor queue (4-class escalation)             | None                   | **Keep CC** — Wildvine handles command approvals        |
| **Approval persistence**     | Ephemeral (in-memory)                         | JSONL + JSON (persisted)                        | **Conceptual overlap** | **Absorb** — persist Wildvine approvals to CC governor  |
| **Goal tracking**            | None                                          | IDEALZR (goals/hypotheses/evidence)             | None                   | **Keep CC** — unique capability                         |
| **Visual canvas**            | None                                          | VISLZR (nodes/edges/traversal)                  | None                   | **Keep CC** — unique capability                         |
| **Context injection**        | veria-context extension (Python script)       | Knowledge capture + KB indexing                 | **Partial overlap**    | **Bridge** — feed Wildvine memory → CC KB               |
| **Session memory**           | Auto-capture on `/new`, markdown files        | Explicit capture, session-end summaries         | **Partial overlap**    | **Bridge** — auto-capture + push summaries to CC        |
| **Agent memory**             | Per-agent embedded chunks                     | Per-agent memory entries with session summaries | **Redundant**          | **Absorb CC's structure** into Wildvine's storage       |
| **Process management**       | cc-process-manager extension                  | N/A (standalone)                                | N/A                    | **Keep** — needed until CC absorbed                     |
| **Channel messaging**        | 30+ platform integrations                     | None                                            | None                   | **Keep Wildvine** — unique capability                   |
| **Voice**                    | voice-bridge extension (Deepgram + multi-TTS) | N/A (veria-talk separate)                       | None                   | **Keep Wildvine** — replaces veria-talk                 |
| **Auth**                     | Device pairing + node tokens                  | JWT + user sessions                             | **Different models**   | **Evaluate** — may need both                            |
| **Configuration**            | YAML + Zod validation + hot-reload            | YAML pipelines + DB config                      | **Partial overlap**    | **Keep Wildvine's** Zod validation, extend to CC config |

### Summary Counts

| Category                  | Count | Features                                                           |
| ------------------------- | ----- | ------------------------------------------------------------------ |
| **Keep in Wildvine**      | 6     | Vector search, skill format, cron, exec-approvals, channels, voice |
| **Keep in CC**            | 5     | Skill evaluation, pipelines, arena, IDEALZR, VISLZR                |
| **Absorb CC → Wildvine**  | 3     | Entity-typed search, priority enforcement, agent memory structure  |
| **Bridge (connect both)** | 3     | Approval persistence, context injection loop, session memory sync  |
| **Delete/replace**        | 0     | No features are pure duplicates warranting deletion                |

---

## 10. Consolidation Recommendations

### Phase 1: Close the Knowledge Loop (High Impact, Medium Effort)

**Problem:** Wildvine session learnings never reach CC's KB. CC's structured knowledge never enriches Wildvine's vector search.

**Actions:**

1. Add `cc.knowledge.capture` RPC to cc-integration extension (proxy to `/api/knowledge/capture`)
2. Add `after_session_end` hook in session-memory handler → push session summary to CC KB
3. Add `memory.export` agent tool to manually push Wildvine memory entries to CC
4. Enrich Wildvine's `before_agent_start` hook to pull relevant CC KB entries (goals, hypotheses) into session context

**Files to modify:**

- `extensions/cc-integration/index.ts` — add knowledge capture RPC
- `extensions/cc-integration/cc-client.ts` — add `ccKnowledgeCapture()` HTTP method
- `src/hooks/bundled/session-memory/handler.ts` — add CC push after memory file creation

### Phase 2: Unify Governance Persistence (High Impact, Low Effort)

**Problem:** Wildvine exec-approval decisions are lost on restart. No audit trail.

**Actions:**

1. After each Wildvine approval decision, write to CC governor history via `cc.governor` RPC
2. On gateway restart, load pending approvals from CC governor table
3. Keep Wildvine's real-time UX (promise-based), add CC persistence as write-through

**Files to modify:**

- `src/infra/exec-approvals.ts` — add CC governor write-through on decision
- `src/gateway/exec-approval-manager.ts` — load pending from CC on init

### Phase 3: Skill Priority Enforcement (Medium Impact, Medium Effort)

**Problem:** Wildvine loads all eligible skills without priority ordering. CC has P0/P1/P2 but no hot reload.

**Actions:**

1. Add `priority` field to Wildvine's SKILL.md frontmatter (P0/P1/P2)
2. Enforce P0 skills as mandatory context (always injected, like CC's `build_skill_preamble`)
3. Route new Wildvine-discovered skills through CC's `skill-ingestion` pipeline for evaluation
4. Add `cc.skills.ingest` RPC to submit skills for evaluation

**Files to modify:**

- `src/agents/skills/types.ts` — add priority to SkillMetadata
- `src/agents/skills/frontmatter.ts` — parse priority from frontmatter
- `extensions/cc-integration/index.ts` — add skills.ingest RPC

### Phase 4: IDEALZR Agent Tools (Medium Impact, High Effort)

**Problem:** Agents can't create or update goals/hypotheses from Wildvine. Users must switch to CC frontend.

**Actions:**

1. Expose IDEALZR CRUD as Wildvine agent tools: `cc_goal_create`, `cc_hypothesis_create`, `cc_evidence_add`
2. Expose IDEALZR CRUD as Wildvine RPCs: `cc.idealzr.goals.create`, `cc.idealzr.hypotheses.create`, etc.
3. Add IDEALZR view to Wildvine UI (beyond current KB-search-only access)

**Files to modify:**

- `extensions/cc-integration/index.ts` — add IDEALZR tool registrations + RPCs
- `extensions/cc-integration/cc-client.ts` — add IDEALZR HTTP methods
- `ui/src/ui/views/` — new `cc-idealzr.ts` view

### Phase 5: VISLZR Write Operations (Low Impact, High Effort)

**Problem:** Canvas is read-only in Wildvine. Node/edge mutations require CC frontend.

**Actions:**

1. Expose VISLZR mutations as RPCs: `cc.vislzr.nodes.create`, `cc.vislzr.edges.create`, etc.
2. Add canvas editor to Wildvine UI (or embed CC frontend canvas view)
3. Expose bulk operations: `cc.vislzr.nodes.bulk`

**Deferred:** Lower priority since VISLZR is a specialized tool used less frequently.

### Not Recommended for Consolidation

| Feature                  | Reason to Keep Separate                                                         |
| ------------------------ | ------------------------------------------------------------------------------- |
| **Arena**                | Complex multi-agent orchestration. Proxied RPCs + UI view are sufficient.       |
| **Pipeline Runner**      | 43 stage handlers in Python. Keep as CC service, trigger via Wildvine cron/RPC. |
| **CC Auth**              | Different auth model (JWT users vs device pairing). Let them coexist.           |
| **Autonomous Execution** | Different execution model (WebSocket sessions). Keep CC-owned.                  |

### Architecture After Consolidation

```
┌──────────────────────────────────────────────────────┐
│                    WILDVINE                           │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ Memory      │  │ Skills       │  │ Cron        │ │
│  │ (vector+FTS │  │ (SKILL.md    │  │ (scheduler) │ │
│  │  +CC entity │  │  +P0 enforce │  │             │ │
│  │  model)     │  │  +CC eval)   │  │             │ │
│  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘ │
│         │                │                  │        │
│  ┌──────▼──────────────────────────────────▼──────┐ │
│  │              Gateway + RPC Layer                │ │
│  │  exec-approvals → CC governor (write-through)  │ │
│  │  session-memory → CC knowledge (push on end)   │ │
│  │  skill discovery → CC ingestion (evaluate)     │ │
│  └──────┬─────────────────────────────────────────┘ │
│         │                                            │
│  ┌──────▼──────────────────────────────────────────┐ │
│  │  CC Services (kept as backend, not absorbed)    │ │
│  │  ├── Pipelines (43 handlers, 13 pipelines)      │ │
│  │  ├── Arena (multi-agent deliberation)           │ │
│  │  ├── IDEALZR (goals/hypotheses/evidence)        │ │
│  │  ├── VISLZR (visual canvas)                     │ │
│  │  ├── Governor (strategic approvals)             │ │
│  │  └── KB (entity-typed FTS, cross-DB search)     │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### Data Flow After Consolidation

```
Agent Session Start
  → Wildvine memory search (vector + FTS)
  → CC KB search (goals, hypotheses, evidence)
  → CC skills.resolve (P0 enforcement)
  → Combined context injection

Agent Session Active
  → Wildvine exec-approvals (real-time command governance)
  → CC governor (strategic/financial approvals)
  → CC pipelines (triggered via cron or agent tools)
  → CC arena (multi-agent deliberation via tools)

Agent Session End
  → Wildvine session-memory hook (auto-capture)
  → Push summary → CC knowledge/capture
  → Push skill discoveries → CC skill-ingestion pipeline
  → Persist approval decisions → CC governor history
```

---

## Appendix: Port Map

| Port  | Service          | Owner                            |
| ----- | ---------------- | -------------------------------- |
| 18789 | Wildvine gateway | Wildvine                         |
| 9000  | CC Gateway       | CC (auto-started by Wildvine)    |
| 9011  | CC Hub Backend   | CC (auto-started by Wildvine)    |
| 9010  | CC Hub Frontend  | CC (manual, optional)            |
| 3000  | Veria-Gemini     | Veria (separate)                 |
| 8100  | Veria-Talk Voice | Veria (replaced by voice-bridge) |
| 8004  | Chatterbox TTS   | Veria (used by voice-bridge)     |

## Appendix: Data Store Map

| Store                 | Location                                          | Format                                  | Owner    |
| --------------------- | ------------------------------------------------- | --------------------------------------- | -------- |
| Memory index          | `~/.wildvine/agents/{id}/memory/index.sqlite`     | SQLite (chunks + FTS + embedding cache) | Wildvine |
| Memory files          | `{workspace}/memory/{date}/`                      | Markdown                                | Wildvine |
| Session transcripts   | `~/.wildvine/sessions/`                           | JSONL                                   | Wildvine |
| Cron jobs             | `~/.wildvine/cron/jobs.json`                      | JSON                                    | Wildvine |
| Exec approvals config | `~/.wildvine/exec-approvals.json`                 | JSON                                    | Wildvine |
| Skills                | `*/skills/*/SKILL.md`                             | Markdown + YAML                         | Wildvine |
| KB index              | `~/.cc/hub/kb_index.db`                           | SQLite FTS5                             | CC       |
| IDEALZR               | `~/.cc/hub/idealzr.db`                            | SQLite                                  | CC       |
| VISLZR                | `~/.cc/hub/vislzr.db`                             | SQLite                                  | CC       |
| Arena                 | `~/.cc/hub/arena.db`                              | SQLite                                  | CC       |
| Pipeline runs         | `~/.cc/runs/runs.db`                              | SQLite                                  | CC       |
| Governor referrals    | `~/.cc/instances/{id}/data/inbox/referrals.jsonl` | JSONL                                   | CC       |
| Skill manifest        | `~/.cc/skills/manifest.yaml`                      | YAML                                    | CC       |

## Appendix: CC API Endpoint Coverage

| CC Endpoint Category                  | Total Endpoints | Proxied in Wildvine                  | Gap     |
| ------------------------------------- | --------------- | ------------------------------------ | ------- |
| KB (search, index, memory)            | 11              | 1 (search)                           | 10      |
| Arena (sessions, chat)                | 10              | 4 (sessions, messages, chat)         | 6       |
| Skills (manifest, resolve)            | 4               | 3 (list, get, resolve)               | 1       |
| Governor (pending, approve/deny)      | 5               | 3 (pending, approve, deny)           | 2       |
| Inbox (notifications)                 | 6               | 2 (list, ack)                        | 4       |
| VISLZR (canvases, nodes, edges)       | 15+             | 2 (canvases, canvas)                 | 13+     |
| IDEALZR (goals, hypotheses, evidence) | 16              | 0 (KB search only)                   | 16      |
| Pipelines/Runs                        | 7               | 4 (list, create, list runs, get run) | 3       |
| Chat                                  | 5               | 0                                    | 5       |
| Autonomous                            | 4               | 0                                    | 4       |
| Events/Streaming                      | 4               | 0                                    | 4       |
| Knowledge Capture                     | 7               | 0                                    | 7       |
| Auth                                  | 7               | 0                                    | 7       |
| Agent Inbox                           | 6               | 4 (via notes.\*)                     | 2       |
| **Total**                             | **~107**        | **~23**                              | **~84** |
