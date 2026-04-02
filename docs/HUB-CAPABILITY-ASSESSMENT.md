# Hub Capability Assessment — 2026-04-02

Wildvine's runtime has agent management capabilities that could replace the current passive `CLAUDE.md` hub architecture at `~/Projects/wildvine-launch/`. This document inventories those capabilities and evaluates migration viability.

---

## Feature Inventory

| Capability | Status | Location | Notes |
|------------|--------|----------|-------|
| **Cron scheduling** | Production | `src/cron/` | Full cron expressions, one-time, recurring, timezone support |
| **Sub-agent spawning** | Production | `src/agents/subagent-spawn.ts` | Hierarchical spawning, lifecycle tracking, depth limits |
| **Semantic memory** | Production | `src/agents/memory-*.ts`, `extensions/memory-lancedb/` | Hybrid vector+FTS search, multiple embedding providers |
| **Process management** | Production | `src/process/` | PTY sessions, process trees, command queuing |
| **Messaging channels** | Production | `extensions/` (94 adapters) | Telegram, Discord, Slack, Signal, iMessage, Matrix, etc. |
| **Plugin/skill system** | Production | `src/plugins/`, `.agents/skills/` | Manifest-first discovery, hooks, tools, CLI commands |
| **Session persistence** | Production | `src/agents/`, `src/sessions/` | Transcript storage, resume, session keys |
| **Agent-to-agent messaging** | Production | `src/agents/tools/sessions-send-tool.a2a.ts` | Cross-session message delivery |

---

## Detailed Capability Analysis

### 1. Cron System (`src/cron/`)

**What it can schedule:**
- **One-time**: ISO 8601 absolute time (`{ kind: "at", at: "2026-04-03T09:00:00Z" }`)
- **Recurring intervals**: Fixed ms intervals (`{ kind: "every", everyMs: 3600000 }`)
- **Cron expressions**: Full cron syntax with IANA timezone (`{ kind: "cron", expr: "0 9 * * MON-FRI", tz: "America/New_York" }`)

**Delivery targets:**
- Any messaging channel (Telegram, Discord, Slack, etc.) via `announce` mode
- Webhook URLs via HTTP POST
- Specific agents, sessions, or threads
- Failure alerts with cooldown and consecutive-error thresholds

**Could it poll sub-repos?** Yes — cron jobs execute full agent turns (`agentTurn` payload) with tool access. A scheduled job could:
1. Run on a cron expression (e.g., every 30 minutes)
2. Execute git status/log commands via tools
3. Read STATUS files from sub-repos
4. Deliver summaries to Telegram/Discord

**Key API**: `service.add()`, `service.list()`, `service.run()`, `service.wake()`

### 2. Sub-Agent Spawning (`src/agents/subagent-spawn.ts`)

**How it works:**
1. Parent calls `sessions.spawn` tool with task description
2. System creates isolated agent context (model, tools, auth, sandbox)
3. Sub-agent executes with full tool access in its own session
4. On completion, parent receives results; session optionally persists

**Spawn modes:**
- `"run"` — One-shot execution, no persistence
- `"session"` — Persistent session that can be resumed

**Runtime options:**
- `"subagent"` — Native subprocess via gateway
- `"acp"` — Agent Client Protocol bridge (external coding agents)

**Can it spin up coding agents?** Yes — the `agents` tool and ACP bridge support spawning Claude Code / Codex sessions with working directories, model selection, and streaming.

**Monitoring:** Registry tracks parent-child relationships, active run counts, timing, and outcomes. `sessions.list` enumerates active sessions. Depth limit of 5 prevents runaway recursion.

**Lifecycle:** spawn → monitor (via registry) → collect results → cleanup (delete or keep session)

### 3. Semantic Memory

**Embedding providers:** Plugin-registered adapters. LanceDB extension provides local vector storage. Supports text and multimodal (images) embeddings.

**Search architecture:** Hybrid vector + full-text search with configurable weights:
- Vector similarity (embedding-based semantic search)
- FTS5/trigram full-text search (SQLite)
- Maximal Marginal Relevance (MMR) for diversity
- Configurable chunking (token size + overlap)

**Persistence:**
- Session transcripts indexed automatically (configurable sync: on-start, on-search, periodic, file-watch)
- Memory stored in SQLite with optional vector extensions
- Citations mode for source attribution

**Compared to Claude.ai project knowledge:** More flexible — supports real-time indexing, hybrid search, and cross-session retrieval. Claude.ai project knowledge is static uploads; Wildvine memory is live and searchable.

### 4. Process Management (`src/process/`)

**PTY sessions:** Full pseudo-terminal support via `@lydell/node-pty`. Interactive terminal sessions with stdin/stdout/stderr. DSR pattern stripping for clean output.

**Supervision:** Spawn with environment, monitor data/exit events, collect output, kill on timeout. Process tree termination (recursive child killing).

**Command queuing:** Serial execution per lane, task tracking with status transitions, background task runner.

**Could it manage long-running processes?** Yes — PTY adapter supports long-running interactive processes. Kill-tree handles cleanup. Could monitor PM2 or systemd processes via shell commands.

### 5. Messaging Channels (94 adapters)

**Production-ready channels include:** Telegram, Discord, Slack, WhatsApp, Signal, iMessage, Matrix, Line, Mattermost, Google Chat, Feishu, IRC, Nostr, Twitch, and many more.

**Each channel supports:** Message send/receive, reactions, typing indicators, thread binding, media attachments, rich formatting, interactive components, allowlists, and session routing.

**For hub notifications:** Dan could receive agent completion notifications via Telegram or any configured channel. Cron delivery already supports channel targeting.

### 6. Plugin/Skill System

**Plugin discovery:** Manifest-first (`wildvine.plugin.json`). Four origins: bundled, workspace, global, config-specified. Runtime loading with version checks and security scanning.

**Skill discovery:** `.agents/skills/{name}/SKILL.md` convention. Agent-accessible as slash commands. Existing skills include PR management, release management, security triage, smoke testing.

**Could room management be a skill?** Yes — a skill at `.agents/skills/room-management/SKILL.md` could define the workflow for managing wildvine-launch rooms (preflight, status checks, deployments).

**Could preflight checks be a skill?** Yes — already precedent with `wildvine-parallels-smoke` and `security-triage` skills.

---

## Comparison: Passive Hub vs. Wildvine Active Hub

| Aspect | Current Passive Hub | Wildvine Active Hub |
|--------|-------------------|-------------------|
| **Scheduling** | Manual / CLAUDE.md reminders | Full cron with timezone, delivery, failure alerts |
| **Sub-repo polling** | Human reads STATUS files | Cron job reads STATUS, summarizes, delivers to channel |
| **Agent coordination** | CLAUDE.md conventions | `sessions.spawn` with lifecycle tracking |
| **Notifications** | None (check manually) | Telegram/Discord/Slack delivery |
| **Memory** | MEMORY.md files per repo | Semantic search across sessions + transcripts |
| **Preflight checks** | Manual checklist | Skill-driven automated checks |
| **Status aggregation** | Manual file reading | Scheduled agent reads all STATUS files |
| **Process monitoring** | SSH + manual checks | PTY sessions + kill-tree + command queue |

---

## Recommended Migration Path

### Phase 1: Status Polling (Effort: ~2 hours)
1. Set up a cron job that reads `~/Projects/wildvine-launch/STATUS/*.md` files every 30 minutes
2. Delivers a summary digest to Telegram
3. Flags any FAIL states or stale status files

### Phase 2: Preflight Skills (Effort: ~4 hours)
1. Create `.agents/skills/room-preflight/SKILL.md` encoding the preflight checklist
2. Create `.agents/skills/room-status/SKILL.md` for aggregated room status
3. Wire these as CLI commands (`wildvine room preflight`, `wildvine room status`)

### Phase 3: Active Coordination (Effort: ~1 day)
1. Cron-triggered agent turns that check each sub-repo for pending work
2. Sub-agent spawning to execute tasks in sub-repos
3. Results collected and delivered to notification channel
4. Status files written automatically by agents

### Phase 4: Full Hub Migration (Effort: ~2-3 days)
1. Move hub logic from CLAUDE.md conventions to Wildvine skills + cron
2. Replace manual STATUS file checking with real-time event delivery
3. Use semantic memory for cross-repo context

---

## Blockers and Gaps

1. **Build issue**: `pnpm build` currently fails on `canvas:a2ui:bundle` (missing prebuilt bundle after fresh clone). This blocks CLI testing but not the gateway/cron system.
2. **No sub-repo git integration skill**: Would need to create a skill for git operations across wildvine-launch sub-repos.
3. **No dashboard**: Status aggregation would be CLI/channel-delivered, not a web dashboard (unless the web UI is extended).
4. **Cron requires running gateway**: The cron system runs inside the Wildvine gateway process — it needs the gateway running to execute scheduled jobs.

---

## Verdict

Wildvine has **all the infrastructure needed** to replace the passive hub. The cron system alone solves the "polling sub-repos" problem. Combined with sub-agent spawning, channel delivery, and the skill system, it can actively coordinate work across rooms rather than passively waiting for humans to check status files.

The migration is incremental — start with a single cron job for status polling (Phase 1) and expand from there.
