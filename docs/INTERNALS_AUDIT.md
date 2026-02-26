# Wildvine — Internals Audit (Developer Reference)

> Generated 2026-02-24 from comprehensive codebase analysis
> For user-facing docs, see the Mintlify docs site (`pnpm docs:dev`)

## Status Summary

**Production-ready.** 80+ RPC methods, 42 extensions (35 channel adapters), 2,600+ tests, macOS native app, comprehensive docs.

---

## Architecture

```
wildvine/
├── src/                    # Main TypeScript source (~400+ files)
│   ├── gateway/            # Gateway server, RPC handlers, stores (164 files)
│   ├── agents/             # Agent runtime, skills, auto-reply (348 files)
│   ├── channels/           # Channel adapters (34 directories)
│   ├── config/             # Zod schema validation, migration (150 files)
│   ├── cli/                # CLI commands (120 files)
│   ├── memory/             # Session storage, memory subsystems (58 files)
│   ├── logging/            # Structured logging (20 files)
│   ├── infra/              # Ports, SSH, pairing, heartbeat (172 files)
│   ├── plugins/            # Plugin system core (47 files)
│   ├── plugin-sdk/         # Public plugin API (3 files, exported)
│   └── types/              # TypeScript type definitions (11 files)
├── ui/                     # Lit + Vite control dashboard
├── extensions/             # 42 plugin extensions
├── apps/                   # Native apps (macOS, iOS, Android)
├── docs/                   # 350+ page Mintlify docs site
├── test/                   # Test fixtures and helpers
├── dist/                   # Build output
└── scripts/                # Build and utility scripts
```

**Stack:** TypeScript (ESM), Node.js 22.12+, Express 5, Lit 3.3, Vite 7, pnpm monorepo

---

## Gateway Server (src/gateway/)

**Entry:** `server.impl.ts` (26KB)

**Responsibilities:**

- WebSocket + HTTP RPC (Express 5, ws library)
- Plugin lifecycle and service management
- Health monitoring and state management
- Config hot-reload (watches `~/.wildvine/config.yaml`)
- TLS/mDNS/Tailscale exposure
- Channel orchestration
- Cron service management
- Auth rate limiting

---

## RPC Methods (80+)

### Health & Status

| Method           | Description            |
| ---------------- | ---------------------- |
| `health`         | Gateway health check   |
| `status`         | Overall gateway status |
| `usage.status`   | Usage metrics          |
| `usage.cost`     | Cost tracking          |
| `last-heartbeat` | Last heartbeat time    |
| `set-heartbeats` | Configure heartbeats   |

### Configuration

| Method          | Description          |
| --------------- | -------------------- |
| `config.get`    | Get config value     |
| `config.set`    | Set config value     |
| `config.apply`  | Apply config changes |
| `config.patch`  | Patch config         |
| `config.schema` | Get config schema    |

### Agents

| Method               | Description             |
| -------------------- | ----------------------- |
| `agents.list`        | List all agents         |
| `agents.create`      | Create agent            |
| `agents.update`      | Update agent            |
| `agents.delete`      | Delete agent            |
| `agents.files.list`  | List agent files        |
| `agents.files.get`   | Get agent file          |
| `agents.files.set`   | Set agent file          |
| `agent`              | Chat with agent         |
| `agent.identity.get` | Get agent identity      |
| `agent.wait`         | Wait for agent response |

### Chat & Messages

| Method         | Description               |
| -------------- | ------------------------- |
| `chat.history` | Get chat history          |
| `chat.send`    | Send message              |
| `chat.abort`   | Abort generation          |
| `send`         | Outbound message delivery |

### Channels

| Method            | Description        |
| ----------------- | ------------------ |
| `channels.status` | Channel status     |
| `channels.logout` | Disconnect channel |

### Sessions

| Method             | Description     |
| ------------------ | --------------- |
| `sessions.list`    | List sessions   |
| `sessions.preview` | Preview session |
| `sessions.patch`   | Update session  |
| `sessions.reset`   | Reset session   |
| `sessions.delete`  | Delete session  |
| `sessions.compact` | Compact session |

### Device/Node Pairing

| Method               | Description             |
| -------------------- | ----------------------- |
| `node.pair.request`  | Request pairing         |
| `node.pair.list`     | List pair requests      |
| `node.pair.approve`  | Approve pairing         |
| `node.pair.reject`   | Reject pairing          |
| `node.pair.verify`   | Verify pairing          |
| `node.list`          | List paired nodes       |
| `node.describe`      | Describe node           |
| `node.invoke`        | Invoke node action      |
| `node.invoke.result` | Get invoke result       |
| `node.event`         | Node event              |
| `node.rename`        | Rename node             |
| `device.pair.*`      | Device pairing variants |
| `device.token.*`     | Device token management |

### Cron

| Method        | Description      |
| ------------- | ---------------- |
| `cron.list`   | List cron jobs   |
| `cron.status` | Cron status      |
| `cron.add`    | Add cron job     |
| `cron.update` | Update cron job  |
| `cron.remove` | Remove cron job  |
| `cron.run`    | Trigger cron run |
| `cron.runs`   | List cron runs   |

### Skills

| Method           | Description     |
| ---------------- | --------------- |
| `skills.status`  | Skills status   |
| `skills.bins`    | List skill bins |
| `skills.install` | Install skill   |
| `skills.update`  | Update skill    |

### Exec Approval

| Method             | Description       |
| ------------------ | ----------------- |
| `exec.approval.*`  | Approval workflow |
| `exec.approvals.*` | Approval history  |

### Utilities

| Method              | Description         |
| ------------------- | ------------------- |
| `logs.tail`         | Stream gateway logs |
| `talk.config`       | Voice config        |
| `talk.mode`         | Voice mode          |
| `models.list`       | Available AI models |
| `voicewake.get/set` | Voice wake triggers |
| `update.check/run`  | Update management   |
| `wizard.*`          | Onboarding wizard   |
| `browser.request`   | Browser automation  |

### CommandCentral Integration (Native Stores)

| Method                | Description               |
| --------------------- | ------------------------- |
| `cc.health`           | CC health check           |
| `cc.kb.search`        | Knowledge base search     |
| `cc.kb.index`         | Index document            |
| `cc.governor.pending` | Pending approvals         |
| `cc.governor.approve` | Approve referral          |
| `cc.governor.deny`    | Deny referral             |
| `cc.arena.sessions`   | Arena sessions            |
| `cc.arena.messages`   | Session messages          |
| `cc.arena.chat`       | Chat in arena             |
| `cc.inbox.list`       | Inbox items               |
| `cc.inbox.ack`        | Acknowledge item          |
| `cc.idealzr.*`        | Goals/hypotheses/evidence |
| `cc.vislzr.*`         | Visual canvas             |
| `cc.skills.*`         | Skills registry           |
| `cc.pipelines.*`      | Pipeline definitions      |
| `cc.runs.*`           | Pipeline runs             |
| `cc.notes.*`          | Living notes              |

---

## Native CC Stores (Key Architecture Detail)

Wildvine maintains **its own SQLite databases** that mirror CC subsystems, independent of the CC hub-backend.

### engine-store.ts (unified: ~/.wildvine/engine.db)

- Governor referrals (status, decision history)
- Inbox items (notifications, priorities, ack tracking)
- IDEALZR: Goals, hypotheses, evidence
- Knowledge Base: Documents + FTS5 full-text search
- Arena: Sessions, message history
- Skills Registry: Skill definitions, eval scores
- Pipeline Definitions & Runs
- Notes: Living notes system

### vislzr-store.ts (~/.wildvine/vislzr.db)

- Canvases (mindmaps/dashboards)
- Nodes (goal, hypothesis, task, note types)
- Edges (relationships)
- Position tracking for canvas layout

### Dedicated Store Files

- `governor-store.ts` — Governor queue operations
- `kb-store.ts` — KB search & indexing
- `arena-store.ts` — Arena session management
- `inbox-store.ts` — Inbox notifications
- `idealzr-store.ts` — Goals/hypotheses/evidence
- `skills-registry-store.ts` — Skills library
- `pipeline-store.ts` — Pipeline defs & runs
- `notes-store.ts` — Living notes
- `exec-approval-cc-persistence.ts` — CC governor history

### Dual-Storage Implications

The CC integration extension (`cc-integration`) provides HTTP fallback to CC hub-backend (port 9011) when available. Native stores operate independently. **This means data can exist in two places** — Wildvine's SQLite and CC's SQLite/PostgreSQL — unless sync is explicitly managed.

---

## Extensions (42 total)

### Channel Adapters (35, all working)

discord, slack, telegram, imessage, signal, whatsapp, googlechat, line, matrix, bluebubbles, irc, mattermost, teams, twitch, zalo, nextcloud-talk, and more

### CC Integration Extensions

| Extension            | Purpose                                                                                                 | Status  |
| -------------------- | ------------------------------------------------------------------------------------------------------- | ------- |
| `cc-integration`     | 13 agent tools for CC (KB search, pipeline run, governor, arena, inbox, VISLZR, skills) + HTTP fallback | WORKING |
| `cc-process-manager` | Auto-start CC services, health check, exponential backoff restart                                       | WORKING |

### Infrastructure Extensions

| Extension          | Purpose                                                 | Status  |
| ------------------ | ------------------------------------------------------- | ------- |
| `voice-bridge`     | Deepgram STT + multi-provider TTS (WebSocket at /voice) | WORKING |
| `veria-context`    | Inject alignment principles (calls Python script)       | WORKING |
| `memory-core`      | Memory backend                                          | WORKING |
| `memory-lancedb`   | LanceDB memory backend                                  | WORKING |
| `diagnostics-otel` | OpenTelemetry diagnostics                               | WORKING |
| `device-pair`      | Device pairing support                                  | WORKING |
| `thread-ownership` | Thread management                                       | WORKING |
| `talk-voice`       | Voice integration                                       | WORKING |
| `phone-control`    | Phone integration                                       | WORKING |

### CC Integration Agent Tools (13)

Registered by `cc-integration` extension:

- `cc_kb_search` — Search knowledge base
- `cc_pipeline_run` — Trigger pipeline
- `cc_governor_list` — List pending approvals
- `cc_arena_chat` — Chat in arena session
- `cc_inbox_list` — List inbox items
- `cc_vislzr_canvases` — List canvases
- `cc_skill_search` — Search skills
- `cc_knowledge_capture` — Capture knowledge
- `memory_export` — Export memory
- `cc_skills_ingest` — Ingest skills
- `notes_capture` — Capture notes
- Plus hooks: before_agent_start (injects CC tools), session_end (pushes to CC KB)

---

## Control UI (ui/)

**Framework:** Lit 3.3 Web Components + Vite 7
**Entry:** `ui/src/ui/app.ts`

### Views (64 view files)

| View              | Purpose                | Status  |
| ----------------- | ---------------------- | ------- |
| `home.ts`         | Dashboard overview     | WORKING |
| `chat.ts`         | Chat interface         | WORKING |
| `agents.ts`       | Agent management       | WORKING |
| `channels.ts`     | Channel config         | WORKING |
| `config.ts`       | Config editor          | WORKING |
| `sessions.ts`     | Session history        | WORKING |
| `nodes.ts`        | Mobile node management | WORKING |
| `cron.ts`         | Cron scheduler         | WORKING |
| `skills.ts`       | Skills management      | WORKING |
| `usage.ts`        | Usage metrics          | WORKING |
| `overview.ts`     | Health & status        | WORKING |
| `cc-kb.ts`        | CC KB search           | WORKING |
| `cc-pipelines.ts` | CC pipeline management | WORKING |
| `cc-governor.ts`  | CC governor queue      | WORKING |
| `cc-arena.ts`     | CC arena sessions      | WORKING |
| `vislzr.ts`       | VISLZR canvas          | WORKING |
| `living-note.ts`  | Living notes           | WORKING |
| `strategy.ts`     | Strategy documents     | WORKING |
| `governance.ts`   | Governance settings    | WORKING |

### Controllers (30)

app-gateway, app-chat, app-channels, app-settings, app-render, app-view-state, app-polling, etc.

### State Management

- Lit signals (Zustand-like pattern)
- Central state in `app-view-state.ts`
- Gateway polling via `app-polling.ts`
- WebSocket via `app-gateway.ts` with auto-reconnect

---

## Plugin SDK (src/plugin-sdk/)

**File:** `index.ts` (14KB)

### Plugin Registration Pattern

```typescript
export default {
  id: "plugin-id",
  name: "Display Name",
  description: "...",
  register(api: WildvinePluginApi) {
    api.registerTool(...);
    api.registerGatewayMethod(...);
    api.registerService(...);
    api.on("hook_name", handler);
  }
}
```

### API Surface

- **Gateway Handlers:** GatewayRequestHandler, RespondFn
- **Plugin Types:** WildvinePluginApi, WildvinePluginService, WildvinePluginServiceContext
- **Channel Types:** 50+ types for ChannelPlugin adapters
- **Configuration:** WildvineConfig, Zod schemas
- **Utilities:** HTTP routing, logging, SSRF protection
- **Hooks:** before/after agent, session lifecycle, gateway lifecycle

---

## Native Apps

### macOS (apps/macos/) — FULLY FUNCTIONAL

- SwiftUI menubar app (189 Swift files)
- Menubar icon with status indicator
- Settings window, WebChat view (WKWebView)
- Device pairing UI, Launchd manager
- IPC to gateway via localhost WebSocket
- Dock icon manager, voice wake sync
- Skills/Cron/Agent event stores, Canvas window

### iOS (apps/ios/) — BUILDING

- SwiftUI, xcodegen build system
- Shared WildvineKit framework

### Android (apps/android/) — IN DEVELOPMENT

- Gradle build system
- assembleDebug, installDebug targets

---

## CLI (src/cli/)

**Entry:** `entry.ts`
**Framework:** Commander.js

### Commands

- `gateway` — Start gateway server
- `agent` — Run agent (RPC/TUI mode)
- `channels` — Manage integrations
- `config` — Edit configuration
- `wizard` — Onboarding
- `cron` — Schedule tasks
- `skills` — Manage skills
- `nodes` — Mobile device management
- `exec-approvals` — Approval workflow
- `sessions` — Session management
- `browser` — Browser automation
- `daemon` — Background mode
- `devices` — Device pairing

---

## Configuration (src/config/)

**File:** `~/.wildvine/config.yaml`
**Validation:** Zod schemas (150+ files)

### Config Sections

```yaml
agents: # Agent definitions (model, tools, identity)
channels: # Channel configs (discord, slack, telegram, etc.)
gateway: # Server config (bind, TLS, auth, controlUi)
plugins: # Plugin enable/config (cc-integration, voice-bridge, etc.)
cron: # Scheduled jobs
skills: # Skill installations
hooks: # Lifecycle hooks
```

### Features

- Auto-migration of legacy config
- Plugin auto-enable detection
- Hot-reload on file change
- Backup rotation

---

## Build & Development

```bash
pnpm gateway:dev      # Start gateway (port 18789)
pnpm ui:dev           # Start control UI (port 5173 → /control)
pnpm build            # Full build
pnpm test             # Unit tests (2,600+ files)
pnpm test:e2e         # E2E tests (Docker)
pnpm test:live        # Live API tests
pnpm check            # Format + lint + typecheck
pnpm docs:dev         # Docs site
pnpm mac:open         # Open macOS app
```

---

## Dependencies

### Runtime

- Express 5, ws — HTTP/WebSocket
- Zod 4.3.6 — Schema validation
- Playwright Core 1.58.2 — Browser automation
- Sharp 0.34.5 — Image processing
- Deepgram SDK — STT (via voice-bridge)
- Slack/Discord/Telegram SDKs — Channels
- node:sqlite — Native SQLite
- Node PTY — Terminal management

### Dev

- TypeScript 5.9.3, Oxlint 1.47.0, Vitest 4.0.18
- Tsdown 0.20.3 (ESM bundler), TSX 4.21.0
- Lit 3.3.2 (UI web components)
