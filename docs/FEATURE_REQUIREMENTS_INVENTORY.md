# Feature Requirements Inventory: Wildvine + CommandCentral → Rust Rewrite

> Generated 2026-02-24 — Complete inventory for planning the unified Rust rewrite

---

## Overview

This document captures EVERY feature across both Wildvine (TypeScript) and CommandCentral (Python) that needs consideration for the unified Rust rewrite. Features are categorized by origin, maturity, and complexity.

---

## TIER 1: Core Wildvine (Production-Ready, Port to Rust)

These are mature, tested, production features that form the backbone.

### Gateway Server

- WebSocket + HTTP RPC server (Express 5 → Rust equivalent)
- 80+ RPC methods with dot-namespaced routing
- Client connection tracking, correlation IDs
- Auth rate limiting
- Health monitoring and state management
- Config hot-reload (watches YAML config file)
- TLS/mDNS/Tailscale exposure
- **Complexity: VERY HIGH (~164 files)**

### Agent Runtime

- Multi-model AI agent execution (Claude, OpenAI, Gemini, local)
- Tool execution framework with approval workflow
- Session management with compaction
- Memory subsystems
- Auto-reply, skills, hooks
- **Complexity: VERY HIGH (~348 files)**

### Channel Adapters (35+)

- Discord, Slack, Telegram, iMessage, Signal, WhatsApp, LINE, Matrix, IRC, Mattermost, Teams, Google Chat, Twitch, BlueBubbles, etc.
- Each implements: auth, messaging, group, directory, outbound adapters
- Channel-specific tool support
- Message routing and session tracking
- **Complexity: VERY HIGH (34 directories)**

### Plugin System

- Plugin discovery, registration, lifecycle (register → start → stop)
- Tools, gateway methods, services, hooks
- Plugin configuration injection
- Channel plugin interface
- **Complexity: HIGH (~47 files)**

### Configuration System

- Zod schema validation → Rust equivalent (serde + validation)
- YAML config with hot-reload
- Auto-migration of legacy config
- Per-channel, per-agent, per-plugin schemas
- Backup rotation
- **Complexity: HIGH (~150 files)**

### CLI

- Commander.js → Rust CLI (clap)
- Commands: gateway, agent, channels, config, wizard, cron, skills, nodes, sessions, browser, daemon, devices
- Shell completion
- Daemon management
- **Complexity: HIGH (~120 files)**

### Cron Service

- Job scheduling, execution, run history
- **Complexity: MEDIUM**

### Device/Node Pairing

- Mobile device pairing workflow (request → approve/reject → verify)
- Node invocation and events
- Token management
- **Complexity: MEDIUM**

### Voice Bridge

- Deepgram STT via WebSocket
- Multi-provider TTS (Chatterbox, OpenAI fallback)
- Audio streaming (browser mic → STT → agent → TTS → browser)
- **Complexity: HIGH**

### Control UI

- 64 Lit web component views
- 30 controllers
- WebSocket gateway connection with auto-reconnect
- All CC subsystem views (KB, pipelines, governor, arena, VISLZR, notes)
- **Complexity: HIGH (separate from Rust backend, but API contract matters)**

### Native Apps

- macOS SwiftUI menubar app (189 Swift files, fully functional)
- iOS (building, SwiftUI)
- Android (early, Gradle)
- **Complexity: SEPARATE (native code, talks to gateway via WebSocket)**

---

## TIER 2: Shared Subsystems (Exist in Both, Need Unification)

Features implemented in both codebases with different capabilities. The Rust rewrite should take the best of both.

### IDEALZR (Strategic Planning)

| Feature                                                         | CC  | Wildvine            | Rust Target |
| --------------------------------------------------------------- | --- | ------------------- | ----------- |
| Goals CRUD                                                      | YES | YES                 | YES         |
| State machine (draft→active→achieved→archived)                  | YES | YES                 | YES         |
| Progress tracking (0-100%)                                      | YES | YES                 | YES         |
| Parent goal hierarchy                                           | YES | NO                  | YES         |
| Target dates                                                    | YES | NO                  | YES         |
| Tags                                                            | YES | NO                  | YES         |
| Canvas linking (goal→VISLZR node)                               | NO  | YES                 | YES         |
| Confidence scoring                                              | NO  | YES (on hypotheses) | YES         |
| Hypotheses CRUD                                                 | YES | YES                 | YES         |
| Prediction/test_criteria/conclusion fields                      | YES | NO                  | YES         |
| Evidence types (observation/data/experiment/reference/feedback) | YES | NO (just kind)      | YES         |
| Statistics endpoint                                             | YES | NO                  | YES         |

### VISLZR (Visual Canvas)

| Feature                                                    | CC  | Wildvine | Rust Target |
| ---------------------------------------------------------- | --- | -------- | ----------- |
| Canvas/Node/Edge CRUD                                      | YES | YES      | YES         |
| Node sizing (width/height)                                 | YES | NO       | YES         |
| Node/edge custom styles                                    | YES | NO       | YES         |
| Edge animation                                             | YES | NO       | YES         |
| Bulk position updates                                      | YES | NO       | YES         |
| Wander (BFS graph traversal)                               | YES | NO       | YES         |
| Entity linking (node→goal/hypothesis)                      | YES | YES      | YES         |
| Statistics                                                 | YES | NO       | YES         |
| v2 view descriptors (mindmap/timeline/boardroom/dashboard) | YES | NO       | YES         |
| Layout generation (paperbanana)                            | YES | NO       | EVALUATE    |

### Arena (Multi-Agent Deliberation)

| Feature                                           | CC  | Wildvine         | Rust Target |
| ------------------------------------------------- | --- | ---------------- | ----------- |
| Session CRUD                                      | YES | YES              | YES         |
| Session modes (GROUP/DEBATE/ROUND_ROBIN)          | YES | NO (string only) | YES         |
| Session status (active/paused/completed/archived) | YES | NO               | YES         |
| Agent archetypes (8 types with system prompts)    | YES | NO               | YES         |
| AI response generation (Claude)                   | YES | NO               | YES         |
| Message metadata (tokens, latency)                | YES | NO               | YES         |
| Round-robin agent selection                       | YES | NO               | YES         |
| Rate limit handling                               | YES | NO               | YES         |

### Knowledge Base

| Feature                                                 | CC  | Wildvine | Rust Target |
| ------------------------------------------------------- | --- | -------- | ----------- |
| FTS5 full-text search                                   | YES | YES      | YES         |
| Document indexing                                       | YES | YES      | YES         |
| Multi-namespace search                                  | YES | NO       | YES         |
| Autocomplete/suggestions                                | YES | NO       | YES         |
| File indexing from disk                                 | YES | NO       | YES         |
| Related entity discovery                                | YES | NO       | YES         |
| Agent memory (observation/interaction/decision/summary) | YES | NO       | YES         |
| Memory TTL                                              | YES | NO       | YES         |
| Cross-search (IDEALZR + VISLZR + docs)                  | NO  | YES      | YES         |
| CLI session import                                      | YES | NO       | YES         |
| ChatGPT conversation import                             | YES | NO       | EVALUATE    |

### Governor / Inbox

| Feature                      | CC      | Wildvine                                 | Rust Target |
| ---------------------------- | ------- | ---------------------------------------- | ----------- |
| Referral creation & tracking | YES     | YES                                      | YES         |
| Priority levels              | NO      | YES (RED/YELLOW/GREEN)                   | YES         |
| Status workflow              | PARTIAL | YES (unread→working→completed→dismissed) | YES         |
| Bulk acknowledgment          | YES     | NO                                       | YES         |
| Read vs ack separation       | YES     | NO                                       | EVALUATE    |
| Instance scoping             | YES     | NO                                       | EVALUATE    |
| Agent association            | NO      | YES                                      | YES         |

### Skills Registry

| Feature                                      | CC  | Wildvine | Rust Target |
| -------------------------------------------- | --- | -------- | ----------- |
| Skill definitions                            | YES | YES      | YES         |
| Evaluation scoring (weighted criteria)       | NO  | YES      | YES         |
| Security flags                               | NO  | YES      | YES         |
| Task resolution scoring                      | NO  | YES      | YES         |
| Dynamic loading from filesystem              | YES | NO       | YES         |
| Manifest parsing                             | YES | NO       | YES         |
| Content serving                              | YES | NO       | YES         |
| Source tracking (bundled/managed/project/cc) | NO  | YES      | YES         |

---

## TIER 3: CC-Unique Features (Need Fresh Design for Rust)

These exist only in CC's Python codebase. ~35,000 lines of production code.

### Pipeline Execution Engine — VERY HIGH complexity

The core CC differentiator. Executes YAML-defined multi-stage pipelines.

**Components:**

- YAML pipeline loader and validator
- Stage handler registry (decorator-based plugin system)
- InProcessExecutor (sequential stage execution)
- Artifact passing between stages (typed JSON blobs with producer metadata)
- Conditional execution based on artifact state
- Per-stage telemetry (wall-clock time, tokens, retries, gate results)
- Progress protocol for real-time updates
- Pipeline validation CLI

**Working Pipelines (4 of 16):**

- hello-world (echo stages — tutorial)
- skill-ingestion (discover → evaluate → ingest)
- meta-orchestration-strategy (7 stages — A/B strategy comparison)
- firmware (store → apply → propose PR → publish)

**Stub Pipelines (12):** tech-radar variants, ux-ui, orchestrated-task, referrals

### Security Enforcement System — VERY HIGH complexity

Pre/post-flight security validation wrapping all pipeline execution.

**Guards:**

- Secret scanning (regex for API keys, tokens, SSH keys in outputs)
- Network guard (domain allowlists, DNS exfiltration prevention)
- Repository write guard (write-back authorization)
- Egress filtering (for isolated instances)

### Meta-Orchestration — VERY HIGH complexity

A/B testing of execution strategies.

- Fork execution: runs same objective through two parallel strategies
  - Strategy A: per-stage handler dispatch
  - Strategy B: single LLM owns entire pipeline
- Compare strategies: weighted scoring on correctness, cost, speed
- Classify work: categorize into types (feature, bugfix, refactor)
- Collect and merge parallel results
- Record evidence for audit trail

### Autonomous Execution with Worktree Pool — VERY HIGH complexity

Session-based parallel task execution in isolated git worktrees.

- WorktreePool: manages N git worktrees (create, acquire, release, cleanup)
- AutonomousTaskWorker: poll tasks → acquire worktree → execute → release
- ParallelExecutionRunner: coordinates multiple workers per session
- Task timeout and graceful shutdown
- PR tracking per task

### Idempotency & Artifact Persistence — MEDIUM complexity

- IdempotencyStore: prevents duplicate handler execution (JSON key-value)
- ArtifactStore: persists handler outputs to disk by type
- Deduplication key generation

### Hybrid Spawner (Instance Lifecycle) — MEDIUM complexity

- Shared vs isolated instance modes
- Port allocation from ranges (no collisions)
- Lease system with heartbeat (orphan detection)
- Instance status lifecycle (creating → ready → stopped → error → orphaned)
- JSON-based project registry

### Hybrid Gateway with Circuit Breaker — MEDIUM complexity

- Registry-based routing (project slug → instance)
- Circuit breaker (CLOSED → OPEN after 3 failures → HALF_OPEN after 30s)
- Per-instance isolation

### Firmware Distribution — HIGH complexity

- Firmware packet schema (source, version, scope, actions, checksums)
- Firmware policy (storage root, apply mode, allowlists)
- Pipeline: store → apply in worktree → propose PR → publish

### Promotion Packet System — MEDIUM complexity

- CTO verdict (pass/fail/defer) with agent votes and rationale
- Provenance summary, attachments (diff.patch, verification.md, logs)
- Classification flags (human/legal review requirements)
- Stored in artifact store, referenced in referrals

### Referral Routing — MEDIUM complexity

- Derive referrals from promotion packets
- Role-based routing (legal, governor, CTO)
- Scope-based rules (core_firmware → governor)

### Roles Registry & Escalation Policy — MEDIUM complexity

- Role definitions: CC_CTO, CC_LEGAL, CC_GOVERNOR
- Escalation policy with approval classes (A-D)
- Triggers, evidence requirements, audit retention rules
- Cross-instance safety constraints

### Scanners (Intelligence Gathering) — MEDIUM complexity

- ArXiv paper search by keywords
- GitHub repository metadata fetching
- RSS feed polling with caching
- Returns typed "base signals" for tech radar

### Scheduler (launchd Cron) — MEDIUM complexity

- RRULE (RFC 5545) → macOS launchd .plist generation
- Persistent schedules in JSON
- Log rotation per schedule

### Document Clustering — LOW complexity

- Groups documents into clusters for VISLZR mindmap display
- Strategies: numeric prefix, path-based, keyword, chunking

### Execution Context & Budgeting — MEDIUM complexity

- Per-stage context: pipeline, project, controls, budgets, security, time
- Token budgets, compute limits, timeout control
- Fail-loud vs silent failure modes

---

## TIER 4: Wildvine-Unique Features (No CC Equivalent)

### WildvineHub (Public Skill Registry)

- Skill discovery, install, update, publish, sync
- Versioning with semver
- Security moderation
- Telemetry and download tracking
- **Complexity: MEDIUM**

### Living Notes

- Persistent notes system
- Native store + UI view
- **Complexity: LOW**

### Exec Approval Workflow

- Tool execution approval (allow/deny/always-allow)
- Approval history and persistence
- **Complexity: MEDIUM**

### OpenAI API Compatibility

- Chat completions endpoint compatibility
- Responses endpoint
- **Complexity: MEDIUM**

### Browser Automation

- Playwright-based browser control
- Agent-triggered browser actions
- **Complexity: MEDIUM**

---

## Complexity Summary

| Tier                      | Features     | Est. Lines (Source) | Notes                         |
| ------------------------- | ------------ | ------------------- | ----------------------------- |
| T1: Core Wildvine         | 11 systems   | ~50,000+ TS         | Production-ready, direct port |
| T2: Shared (best of both) | 7 subsystems | ~10,000 combined    | Merge CC+WV features          |
| T3: CC-Unique             | 15 systems   | ~35,000 Python      | Fresh Rust design needed      |
| T4: WV-Unique             | 5 features   | ~5,000 TS           | Direct port                   |

**Total feature surface: ~100,000 lines of source across 38 distinct systems.**

---

## Decision Points for Rust Rewrite

1. **Pipeline execution model** — CC's Python executor is tightly coupled to its handler registry. Rust rewrite needs to decide: compiled handlers? WASM plugins? Subprocess spawning?

2. **Multi-instance vs single-instance** — CC supports shared/isolated instances with spawner and gateway routing. Does the Rust version need this, or is single-instance sufficient?

3. **Security enforcement** — CC's guard system is valuable but Python-specific (regex scanning, subprocess wrapping). Rust can do this more efficiently and securely.

4. **Worktree pool** — Git worktree management for parallel execution. Rust has good git libraries (gitoxide). Worth keeping.

5. **Channel adapter architecture** — 35 adapters is a lot of code. Consider: compiled-in vs dynamic loading vs subprocess adapters?

6. **UI strategy** — Keep Lit web components? Port to something else? The UI is separate from the backend rewrite but the API contract matters.

7. **Native apps** — macOS/iOS Swift code stays Swift. Android stays Kotlin/Java. They talk to gateway via WebSocket regardless of backend language.

8. **SQLite** — Both use SQLite heavily. Rust has excellent SQLite support (rusqlite, sqlx). This ports cleanly.

9. **Stub features** — 12 stub pipelines, tech radar demo data, partial governor workflow. Include in Rust or skip?
