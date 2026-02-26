# Wildvine + CommandCentral Integration Status

> Generated 2026-02-24 — The ground truth on what's connected and what's not

---

## The Dual-Storage Problem

Wildvine maintains **native SQLite stores** (`~/.wildvine/engine.db`, `~/.wildvine/vislzr.db`) that independently implement most CC subsystems. The CC hub-backend also has its own SQLite databases at `~/.cc/hub/`.

**This means the same subsystem can have data in two places with no automatic sync.**

| Subsystem      | Wildvine Store   | CC Store                      | Sync? |
| -------------- | ---------------- | ----------------------------- | ----- |
| IDEALZR        | engine.db        | idealzr.db                    | NO    |
| VISLZR         | vislzr.db        | vislzr.db                     | NO    |
| Arena          | engine.db        | arena.db                      | NO    |
| Knowledge Base | engine.db (FTS5) | kb_index.db                   | NO    |
| Governor       | engine.db        | referrals in orchestration.db | NO    |
| Inbox          | engine.db        | referrals table               | NO    |
| Skills         | engine.db        | skills table                  | NO    |
| Pipelines      | engine.db        | pipeline YAML + runs          | NO    |
| Notes          | engine.db        | N/A (Wildvine only)           | N/A   |

### How Data Flows Today

1. **Wildvine native stores** handle all `cc.*` RPC methods directly
2. **cc-integration extension** provides 13 agent tools that can call CC hub-backend via HTTP (port 9011) as fallback
3. **cc-process-manager** auto-starts CC services but doesn't sync data
4. **session_end hook** pushes session summaries to CC KB (one-way)

### Implications

- If you create a goal via Wildvine UI → it's in `~/.wildvine/engine.db` only
- If you create a goal via CC hub-frontend → it's in `~/.cc/hub/idealzr.db` only
- Neither sees the other's data unless explicitly synced

---

## What's Actually Connected (Working E2E)

### CC Process Management

- Wildvine auto-starts CC hub-backend (port 9011) and CC gateway (port 9000)
- Health monitoring with exponential backoff restart
- RPC: `cc.process.start`, `cc.process.stop`, `cc.process.status`, `cc.process.restart`
- **Status: WORKING**

### CC Health Check

- `cc.health` RPC pings CC hub-backend
- Health dot in Wildvine UI topbar
- **Status: WORKING**

### Knowledge Base (via agent tools)

- Agent tool `cc_kb_search` calls CC backend's `/api/kb/search`
- Session-end hook pushes summaries to CC KB
- Wildvine UI `cc-kb` view uses native store
- **Status: DUAL — agent tools hit CC, UI hits native store**

### Arena (via agent tools)

- Agent tool `cc_arena_chat` calls CC backend
- Wildvine UI `cc-arena` view uses native store
- **Status: DUAL — same split as KB**

### Pipelines

- UI `cc-pipelines` view uses native store for definitions
- Agent tool `cc_pipeline_run` triggers CC backend
- **Status: DUAL — definitions in native store, execution possibly via CC**

---

## What's NOT Connected

### Governor Queue

- CC backend: Data model exists, approval flow stubbed
- Wildvine: Native store + UI view, but no actual approval workflow
- **Neither side has a working human approval flow**

### Tech Radar

- CC backend: Stub handlers returning demo data
- Wildvine: No UI for tech radar
- **Not functional on either side**

### IDEALZR

- CC backend: FULLY WORKING with state machines
- Wildvine: Native store, but no dedicated UI view yet
- **No sync between the two**

### VISLZR

- CC backend: FULLY WORKING (v1 + v2 renderers)
- Wildvine: Native store + `vislzr.ts` UI view (draws nodes/edges)
- **No sync, different render capabilities**

### Autonomous Execution

- CC backend: Session-based with worktree pooling
- Wildvine: Not exposed via RPC
- **CC-only feature**

---

## CC Hub-Backend API (What's Actually Available at port 9011)

### Fully Working Endpoints

```
POST   /api/auth/register, /login, /refresh, /logout
GET    /api/auth/me

GET    /api/idealzr/goals              # List goals
POST   /api/idealzr/goals              # Create goal
GET    /api/idealzr/goals/{id}         # Get goal
PUT    /api/idealzr/goals/{id}         # Update goal
DELETE /api/idealzr/goals/{id}         # Delete goal
POST   /api/idealzr/goals/{id}/activate
# Same pattern for hypotheses and evidence (18 endpoints total)

GET    /api/vislzr/canvases            # List canvases
POST   /api/vislzr/canvases            # Create canvas
# Full CRUD for canvases, nodes, edges (23 endpoints)
POST   /api/vislzr/wander              # Graph traversal

GET    /api/arena/sessions             # List sessions
POST   /api/arena/sessions             # Create session
POST   /api/arena/sessions/{id}/chat   # Chat (Claude responds)
GET    /api/arena/sessions/{id}/messages

GET    /api/kb/search                  # Full-text search
POST   /api/kb/index                   # Index document
GET    /api/kb/memory                  # Agent memory

POST   /api/chat/stream                # SSE streaming
GET    /api/chat/history

GET    /api/inbox/referrals            # List referrals
POST   /api/inbox/referrals/{id}/ack   # Acknowledge

GET    /api/events/stream              # SSE pipeline events

GET    /api/skills/manifest            # Skill resolution

POST   /api/autonomous/sessions        # Execution sessions
POST   /api/autonomous/batches         # Batch tasks
```

### Partial / Stub Endpoints

```
/api/messaging/*    # Message bus — stub level
```

---

## Recommended Next Steps

### Option A: Single Source of Truth (Wildvine Native)

- Use Wildvine's native stores as the primary data layer
- CC hub-backend becomes optional (for its own frontend, autonomous execution)
- Simplifies architecture, eliminates sync problem
- **Tradeoff:** Loses CC's more mature implementations (IDEALZR state machines, VISLZR v2 renderers, Arena archetypes)

### Option B: Single Source of Truth (CC Backend)

- All `cc.*` RPCs proxy to CC hub-backend via HTTP
- Remove native stores or use as cache only
- CC is the authoritative data layer
- **Tradeoff:** Adds network dependency, CC must be running

### Option C: Sync Layer

- Build bidirectional sync between Wildvine stores and CC backend
- Most complex, most flexible
- **Tradeoff:** Significant engineering effort, conflict resolution needed

### Option D: Feature Split

- Decide which features live where permanently
- e.g., KB and pipelines in CC, notes and skills in Wildvine
- **Tradeoff:** Requires clear ownership boundaries

---

## Port Map

| Port  | Service          | Auto-started by Wildvine? |
| ----- | ---------------- | ------------------------- |
| 18789 | Wildvine gateway | Entry point               |
| 9000  | CC Gateway       | Yes (cc-process-manager)  |
| 9011  | CC Hub Backend   | Yes (cc-process-manager)  |
| 9010  | CC Hub Frontend  | No (manual)               |
| 3000  | Veria-Gemini     | No (manual)               |
| 8100  | Veria-Talk       | No (manual)               |
| 8004  | Chatterbox TTS   | No (manual)               |
