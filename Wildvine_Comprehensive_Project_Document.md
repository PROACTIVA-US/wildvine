# Wildvine: Comprehensive Project Document

**Grow anywhere, automate anything.**

---

| Field                  | Detail                                                            |
| ---------------------- | ----------------------------------------------------------------- |
| **Project Name**       | Wildvine                                                          |
| **Repository**         | [PROACTIVA-US/wildvine](https://github.com/PROACTIVA-US/wildvine) |
| **License**            | MIT (Copyright 2025 Peter Steinberger)                            |
| **Current Version**    | 2026.2.13 (stable) / 2026.2.14 (unreleased)                       |
| **Primary Language**   | TypeScript (ESM)                                                  |
| **Runtime**            | Node.js 22.12.0+                                                  |
| **Package Manager**    | pnpm 10.23.0                                                      |
| **Total Commits**      | 11,003                                                            |
| **Development Period** | November 24, 2025 -- February 17, 2026                            |
| **Documentation**      | [docs.wildvine.bot](https://docs.wildvine.bot)                    |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Origins & Evolution](#2-project-origins--evolution)
3. [Development Timeline & Milestones](#3-development-timeline--milestones)
4. [Architecture Overview](#4-architecture-overview)
5. [Core Systems](#5-core-systems)
6. [Channel Integrations](#6-channel-integrations)
7. [Plugin & Extension System](#7-plugin--extension-system)
8. [Agent & AI Framework](#8-agent--ai-framework)
9. [Memory & Knowledge System](#9-memory--knowledge-system)
10. [Native Applications](#10-native-applications)
11. [Swabble: Wake-Word Daemon](#11-swabble-wake-word-daemon)
12. [Skills System](#12-skills-system)
13. [Security Architecture](#13-security-architecture)
14. [Testing & Quality Assurance](#14-testing--quality-assurance)
15. [CI/CD & Deployment](#15-cicd--deployment)
16. [Documentation & Localization](#16-documentation--localization)
17. [Implementation Roadmap](#17-implementation-roadmap)
18. [Technology Stack](#18-technology-stack)
19. [Project Team & Governance](#19-project-team--governance)
20. [Project Statistics](#20-project-statistics)

---

## 1. Executive Summary

Wildvine is a production-grade, multi-channel AI gateway that unifies 30+ messaging platforms into a single AI-powered interface. It serves as a command center for Claude and other large language models (LLMs), enabling users to interact with AI agents across Telegram, Discord, Slack, WhatsApp, Signal, iMessage, and many more channels---all from a single, self-hosted system.

The project was conceived and primarily developed between November 2025 and February 2026, accumulating over 11,000 commits across that span. It features native applications for macOS, iOS, and Android, an extensible plugin architecture with 37+ built-in extensions, a semantic vector memory system, 52+ pre-configured AI skills, comprehensive security hardening, and a sophisticated multi-agent orchestration framework.

Wildvine's tagline---**"Grow anywhere, automate anything"**---captures its design philosophy: a locally-hosted AI ecosystem that provides total data ownership while enabling automation across every digital communication surface.

---

## 2. Project Origins & Evolution

### 2.1 Warelay: The Beginning (November 24, 2025)

Wildvine began life as **Warelay**, a CLI tool for relaying messages through Twilio webhooks. The very first commit on November 24, 2025 established a Node.js/TypeScript project with:

- Twilio SMS/WhatsApp webhook support
- Tailscale Funnel integration for secure tunneling
- Basic auto-reply functionality with Claude integration
- A command-line interface for setup and management

Within its first day alone, the project received dozens of commits rapidly iterating on webhook handling, verbose logging, auto-confirmation flags, and Twilio sender discovery.

### 2.2 WhatsApp Web & Provider Expansion (November 24--25, 2025)

By the end of its first day, the project had already grown beyond Twilio to include:

- **WhatsApp Web** support via the Baileys library (direct WhatsApp Web protocol)
- A modular provider architecture separating Twilio from web-based connections
- Unit testing with Vitest and coverage thresholds
- Biome-based linting and code quality tooling
- Auto-reply command execution with configurable timeouts

### 2.3 Rapid Channel Expansion (Late November -- December 2025)

The project underwent explosive growth, adding support for Signal, Discord, Slack, Telegram, iMessage, and more. Each channel integration brought its own complexity---OAuth flows, webhook verification, message formatting, media handling, and platform-specific quirks.

Key architectural decisions during this period included:

- A unified **channel abstraction** allowing any messaging platform to be treated uniformly
- A **gateway server** that manages all channel connections and routes messages to AI agents
- A **configuration system** using YAML/JSON with schema validation
- An **extension/plugin system** allowing third-party channel integrations

### 2.4 The Wildvine Identity (February 2026)

On **February 14--15, 2026**, the project was formally established under the **Wildvine** identity with dedicated branding, a logo, the "Grow anywhere, automate anything" tagline, and the PROACTIVA-US organization. The macOS app received its Wildvine branding, the WildvineKit shared framework was established for cross-platform Apple development, and the project reached its current mature form.

---

## 3. Development Timeline & Milestones

### 3.1 Commit Volume by Month

| Month                       | Commits | % of Total | Focus                                                          |
| --------------------------- | ------- | ---------- | -------------------------------------------------------------- |
| **November 2025**           | ~288    | 2.6%       | Project inception, Twilio/WhatsApp, CLI foundations            |
| **December 2025**           | ~2,151  | 19.6%      | Channel expansion, gateway architecture, session management    |
| **January 2026**            | ~6,421  | 58.4%      | Peak development: plugin SDK, agent system, security hardening |
| **February 2026** (to 17th) | ~2,143  | 19.5%      | Stability, branding, TTS, native apps, security fixes          |

### 3.2 Key Milestones

**November 24, 2025** -- Initial commit; Warelay CLI with Twilio webhook support.

**November 24, 2025** -- WhatsApp Web provider added (Baileys integration).

**November 25, 2025** -- Modular CLI architecture; auto-reply system with Claude integration.

**Late November 2025** -- Signal, Discord, Slack, and Telegram channel integrations begin.

**December 2025** -- Gateway server architecture established; session management; comprehensive test coverage; auto-recovery systems; iMessage integration.

**January 2026** -- Plugin SDK formalization; extension system maturation; protocol generation for native apps; 37 extensions stabilized; multi-agent orchestration; memory/QMD system; CI/CD pipeline with Docker E2E testing; security audit framework.

**February 6, 2026** -- Android and iOS app structures established.

**February 14, 2026** -- Version 2026.2.13 released with Podman support, Discord voice messages, Hugging Face provider, and dozens of security fixes.

**February 15, 2026** -- Wildvine branding formalized; macOS app rebranded; daily git update checker added; WildvineKit .build directories configured.

**February 16, 2026** -- Chatterbox local TTS provider integrated.

**February 17, 2026** -- Veria context-injector plugin added for proactive knowledge surfacing.

---

## 4. Architecture Overview

Wildvine follows a layered, modular architecture designed for extensibility and local-first data ownership.

```
┌─────────────────────────────────────────────────────┐
│                  Native Clients                      │
│    macOS App  ·  iOS App  ·  Android App  ·  TUI    │
│              Web UI  ·  CLI Commands                 │
└──────────────────────┬──────────────────────────────┘
                       │ WebSocket / HTTP / IPC
┌──────────────────────▼──────────────────────────────┐
│              Gateway Server (Express.js)              │
│  HTTP endpoints · WebSocket · mDNS Discovery         │
│  Session mgmt · Plugin lifecycle · Hot reload        │
│  Exec approvals · Cron scheduling · Hooks            │
└──┬───────────┬───────────┬──────────┬───────────────┘
   │           │           │          │
┌──▼──┐   ┌───▼───┐  ┌────▼────┐ ┌───▼────┐
│Chan-│   │Agent  │  │Memory  │ │Config │
│nels │   │System │  │System  │ │System │
│Layer│   │       │  │        │ │       │
└──┬──┘   └───┬───┘  └────┬───┘ └───┬───┘
   │          │           │         │
   ▼          ▼           ▼         ▼
Telegram   Claude      SQLite    YAML/JSON
Discord    OpenAI      LanceDB   Zod schemas
Slack      Ollama      QMD       Env vars
WhatsApp   Bedrock     Vectors   Profiles
Signal     Local LLM
iMessage
Matrix
+30 more
```

### 4.1 Core Design Principles

1. **Local-First**: All data stored locally; total ownership and privacy.
2. **Channel-Agnostic**: Unified message abstraction across all platforms.
3. **Extensible**: Plugin SDK for third-party channels, providers, and tools.
4. **Multi-Agent**: Parallel agent orchestration with tool approval workflows.
5. **Security-Hardened**: Defense-in-depth with SSRF guards, path traversal prevention, webhook signature verification, and more.

---

## 5. Core Systems

### 5.1 Gateway Server

The gateway is the heart of Wildvine---an Express.js-based HTTP/WebSocket server that orchestrates all communication.

**Location:** `src/gateway/` (150+ files)

**Key capabilities:**

- Multi-client WebSocket connections with real-time event broadcasting
- HTTP API with OpenAI-compatible endpoints (`openresponses-http.ts`, 28KB)
- Session management with persistence and recovery (`session-utils.ts`, 27KB)
- Device authentication and pairing via mDNS/Bonjour discovery
- Plugin lifecycle management with hot-reload
- Exec approval workflows for safe command execution
- Cron job scheduling for recurring AI tasks
- Hook system for event-driven automation
- Control UI dashboard

**Key files:**

- `server.impl.ts` (26KB) -- Core server implementation
- `session-utils.ts` (27KB) -- Session management
- `openresponses-http.ts` (28KB) -- OpenAI-compatible API
- `server-plugins.ts` -- Plugin loading and management
- `server-reload.ts` -- Hot reload capabilities
- `exec-approval-manager.ts` -- Command approval workflow
- `server-discovery.ts` -- mDNS/Bonjour device discovery
- `hooks.ts` -- Custom hook system

### 5.2 CLI System

The CLI provides comprehensive command-line control over every aspect of Wildvine.

**Location:** `src/cli/` (120+ command modules)

**Major command categories:**

- **Channel management** -- Add, configure, and monitor messaging integrations
- **Message handling** -- Send messages, list conversations, reply to threads
- **Session management** -- Create, reset, export transcripts
- **Model management** -- Switch models, manage providers, check compatibility
- **Configuration** -- Edit config, validate, migrate settings
- **Cron jobs** -- Schedule recurring tasks
- **Skills** -- Install and manage AI skills
- **Plugins** -- Manage extension lifecycle
- **Device pairing** -- Mobile node authentication
- **Diagnostics** -- Health checks (`wildvine doctor`), logging, debug output
- **Security audit** -- `wildvine security audit --deep` and `--fix`

### 5.3 Configuration System

**Location:** `src/config/` (150 files)

- YAML/JSON configuration with Zod schema validation
- Environment variable overrides
- Per-channel and per-provider configuration
- Hot-reload without gateway restarts
- Migration utilities for config format changes
- `wildvine doctor` command for auto-diagnosis and fixes
- Profile-based configuration for multiple environments

---

## 6. Channel Integrations

Wildvine supports 30+ messaging channels through built-in integrations and extensions.

### 6.1 Built-in Channels

#### Telegram

- Bot token and webhook support
- Poll creation with duration, silent delivery, and anonymity controls
- Native blockquote rendering
- Admin group support with inline keyboard buttons
- Media thumbnail handling
- 100-command menu limit management
- Webhook signature verification and retry-storm prevention

#### Discord

- Bot token authentication with guild management
- Slash command registration and forum channel support
- Voice message support with waveform previews
- Custom presence/activity/status
- Thread management and auto-threading
- Exec approval targeting (DM, channel, or both)
- Debug logging for message routing decisions

#### Slack

- Bot token OAuth with enterprise grid support
- Slash commands, app mentions, thread replies
- Rich media: images, files, reactions
- Scheduled message delivery
- Thread-ownership outbound gating via `message_sending` hooks
- DM policy controls with allowlist authorization

#### WhatsApp

- Multiple providers: Twilio, Meta API, WhatsApp Web (Baileys)
- Auto-recovery from stuck sessions
- Message status tracking
- Media handling (images, audio, documents)
- Group chat support
- Per-account `dmPolicy` overrides

#### Signal

- `signal-cli` integration with IPC to prevent session corruption
- Profile management and group support
- End-to-end encrypted messaging
- Auto-install via Homebrew on non-x64 Linux (arm64/arm)

#### iMessage

- Native macOS messaging framework integration via BlueBubbles
- Group chat support with sender identity
- DM authorization with pairing store
- Private API support with graceful degradation

### 6.2 Extension Channels

Additional channels provided as workspace extensions:

| Extension       | Platform             | Notes                                 |
| --------------- | -------------------- | ------------------------------------- |
| Matrix          | Open federation      | Encrypted rooms, user discovery       |
| Mattermost      | Team collaboration   | WebSocket reconnect with backoff      |
| Microsoft Teams | Enterprise           | OneDrive file links, mention entities |
| Google Chat     | Google Workspace     | Webhook routing, email allowlists     |
| LINE            | Japan market         | Verify request handling, bot SDK      |
| Feishu / Lark   | ByteDance            | SSRF-hardened media fetching          |
| Zalo            | Southeast Asia       | Webhook secret verification           |
| Nextcloud Talk  | Self-hosted          | Video chat integration                |
| IRC             | Classic protocol     | Traditional IRC support               |
| Twitch          | Livestream           | Chat integration                      |
| Nostr           | Decentralized        | Loopback-only mutation                |
| Tlon (Urbit)    | P2P network          | SSRF-hardened URL fetching            |
| Voice Call      | PSTN (Twilio/Telnyx) | Webhook signature verification        |

---

## 7. Plugin & Extension System

### 7.1 Architecture

**Location:** `src/plugins/`, `extensions/` (37+ extensions)

Wildvine's plugin system enables third-party extensions for channels, AI providers, memory backends, tools, and more.

**Key design features:**

- TypeScript-first plugin SDK with full type support (`src/plugin-sdk/`)
- Dynamic loading via `jiti` from workspace, config, and bundled locations
- Plugin lifecycle hooks: `gateway_start`, `gateway_stop`, config changes
- Manifest-driven discovery with validation
- Workspace packages via `pnpm-workspace.yaml`

**Plugin SDK exports:**

```
wildvine/plugin-sdk        -- Core plugin types and interfaces
wildvine/plugin-sdk/account-id  -- Account ID utilities
```

### 7.2 Extension Categories

**Communication (18+):** bluebubbles, discord, feishu, imessage, irc, line, matrix, mattermost, msteams, nextcloud-talk, signal, slack, telegram, tlon, twitch, voice-call, whatsapp, zalo

**AI/LLM:** llm-task (LLM integration helpers)

**Memory:** memory-core, memory-lancedb (vector database integration)

**Authentication:** google-antigravity-auth, google-gemini-cli-auth, minimax-portal-auth, qwen-portal-auth

**Tools & Utilities:** copilot-proxy, device-pair, diagnostics-otel, open-prose, phone-control, skill-creator, veria-context-injector, blogwatcher, session-logs, healthcheck

### 7.3 Plugin Installation

Plugins install via `npm install --omit=dev` in their directory. Runtime dependencies live in `dependencies`; `wildvine` itself goes in `devDependencies` or `peerDependencies` (runtime resolves `wildvine/plugin-sdk` via jiti alias).

---

## 8. Agent & AI Framework

### 8.1 Multi-Agent System

**Location:** `src/agents/` (348 files)

Wildvine's agent framework supports multi-model LLM orchestration with sophisticated tool execution capabilities.

**Supported LLM providers:**

- **Anthropic** (Claude models including Opus 4.6)
- **OpenAI** (GPT models, Codex Spark)
- **Ollama** (local models)
- **AWS Bedrock**
- **Hugging Face Inference**
- **MiniMax** (including China API endpoint)
- **vLLM** (self-hosted)
- **Google Gemini**
- Various other providers via extension auth modules

**Agent capabilities:**

- Streaming and non-streaming response handling
- Tool invocation with approval workflows and cooldown tracking
- Auth profile management (round-robin, cooldown, OAuth)
- Bash execution with PTY support (`exec.ts`, 36KB)
- Empty-chunk timeout handling and failover
- Approval queue management
- Session persistence and recovery
- Transcript path resolution with safe fallbacks

### 8.2 Agent Control Protocol (ACP)

Wildvine implements the Agent Control Protocol (`@agentclientprotocol/sdk` v0.14.1) for standardized agent communication, enabling:

- RPC mode for programmatic agent interaction
- Session management across multiple concurrent agents
- Structured tool invocation and result handling

### 8.3 Workspace Management

Each agent operates within a managed workspace (`~/.wildvine/`) that includes:

- Session storage and recovery
- `BOOTSTRAP.md` generation for first-run setup
- Configuration hot-reload
- Identity files (`identity.md`, `soul.md`) for persona management
- Memory files for persistent context

---

## 9. Memory & Knowledge System

### 9.1 QMD (Queryable Markdown)

**Location:** `src/memory/` (58 files)

The QMD system provides semantic memory through vector-embedded markdown documents.

**Features:**

- Vector embeddings via Voyage AI, OpenAI, or local models
- SQLite with `sqlite-vec` (alpha) for vector search
- Multi-collection support with per-collection query fallback
- Semantic search with relevance ranking
- Session file synchronization and export
- Memory compaction and synthesis
- Dirty-state tracking for status reporting
- Null-byte collection self-healing
- Result limit passthrough for efficient queries

### 9.2 Memory Backends

- **Built-in SQLite-vec** -- Default vector store with CPU-optimized search
- **LanceDB** (extension) -- Advanced vector database with auto-capture (opt-in)
- **QMD** -- Queryable Markdown with scope-based access control

### 9.3 Information Lifecycle

The memory system implements a closed-loop information lifecycle:

1. **Ingestion** -- Data pulled from conversations, meetings, emails, and web sources
2. **Sanitization** -- LLM-filtered for noise and prompt injection markers
3. **Vectorization** -- Semantic embedding via RAG pipeline
4. **Storage** -- Local SQLite/LanceDB with full data ownership
5. **Retrieval** -- Semantic search powering agent context and CRM insights
6. **Evolution** -- Weekly memory synthesis distills interactions into permanent knowledge

---

## 10. Native Applications

### 10.1 macOS Application

**Location:** `apps/macos/`

A SwiftUI menubar application providing native macOS integration.

**Swift Package components:**

- `Wildvine` -- Main app bundle
- `WildvineDiscovery` -- mDNS/Bonjour gateway discovery
- `WildvineIPC` -- Inter-process communication
- `WildvineMacCLI` -- CLI tools (`wildvine-mac`)
- `WildvineProtocol` -- Gateway protocol definitions

**Features:**

- Menubar presence with dock icon
- Daily git update checks with "Update available" indicator
- Gateway management (start/stop/restart)
- Deep link handling (`wildvine://agent`)
- Sparkle-based auto-updates (`appcast.xml`)
- Voice wake-word integration with Swabble

### 10.2 iOS Application

**Location:** `apps/ios/`

A full-featured SwiftUI app targeting iOS 17+ with XcodeGen project generation.

**Feature modules:**

- Calendar, Camera, Contacts, Reminders integration
- Chat messaging interface
- Gateway connection and device pairing
- Location and Motion services
- Media handling and Screen mirroring
- Voice recording and commands
- Onboarding first-run experience
- Settings and Status display

### 10.3 Android Application

**Location:** `apps/android/`

A Kotlin application targeting Android 12+ (API 31+) with Gradle KTS build.

**Key components:**

- `NodeRuntime` -- Embedded Node.js runtime
- `NodeForegroundService` -- Background operation
- Camera HUD, Location services, Voice wake-word
- SMS integration and Phone control
- Gateway communication with TLS and Bonjour discovery
- Screen mirroring and Canvas controller
- App update handling

### 10.4 Shared Kit (WildvineKit)

**Location:** `apps/shared/WildvineKit/`

A cross-platform Swift 6.2 library shared between iOS and macOS, providing:

- Unified protocol implementation
- Shared device APIs
- Common UI components
- Strict concurrency compliance

---

## 11. Swabble: Wake-Word Daemon

**Location:** `Swabble/`

Swabble is a specialized Swift 6.2 macOS daemon for on-device wake-word detection.

**Capabilities:**

- Speech.framework on-device models (zero network usage)
- Default wake word: "wildvine" (aliases: "claude")
- Custom hook execution with environment variables
- File transcription (TXT/SRT with time ranges)
- Services/launchd integration
- Multi-platform targets: macOS 26+, iOS 17+

**Products:**

- `Swabble` executable -- Main daemon
- `SwabbleKit` library -- Shared utilities for app integration

**Configuration:**

- Configurable cooldown, minimum characters, and timeouts
- Persistent transcript logging
- Device enumeration (microphone selection)
- Health checks and diagnostics

---

## 12. Skills System

**Location:** `skills/` (52+ pre-configured skills)

Skills are modular AI capabilities that extend Wildvine's functionality. They are discoverable via the `skill-creator` extension and installable from the [WildvineHub](https://wildvinehub.ai/) community registry.

### Skill Categories

| Category                  | Skills                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------- |
| **Organization & Notes**  | 1password, apple-notes, apple-reminders, bear-notes, notion, obsidian, things-mac       |
| **Media & Entertainment** | camsnap, gifgrep, spotify-player, songsee, sonoscli, video-frames                       |
| **Development**           | coding-agent, github, himalaya, mcporter, tmux                                          |
| **AI & LLM**              | openai-image-gen, openai-whisper, openai-whisper-api, gemini, nano-banana-pro, nano-pdf |
| **Control & Automation**  | eightctl, openhue, ordercli, wacli, trello                                              |
| **Search & Discovery**    | brave-search, blogwatcher, goplaces, peekaboo, weather                                  |
| **Voice & Audio**         | sherpa-onnx-tts, chatterbox (local TTS)                                                 |
| **Productivity**          | summarize, canvas, wildvinehub, model-usage, healthcheck                                |

Each skill is defined by a `SKILL.md` manifest and can include custom tool definitions, prompt templates, and integration logic.

---

## 13. Security Architecture

### 13.1 Security Philosophy

Wildvine employs a **defense-in-depth** strategy combining deterministic code safeguards with AI-powered auditing. The project's security lead is **Jamieson O'Reilly** (founder of Dvuln).

### 13.2 Security Layers

**Network Security:**

- SSRF (Server-Side Request Forgery) guards including IPv6-mapped IPv4 literal blocking
- Gateway defaults to loopback-only binding (`127.0.0.1` / `::1`)
- TLS certificate pinning for device discovery
- CSRF hardening on browser control routes
- Rate limiting and auth throttling

**Input Validation:**

- Webhook signature verification (Telegram, Twilio, Telnyx, LINE)
- Numeric Telegram sender ID requirement for allowlists
- Base64 payload size bounds before decoding
- Archive extraction entry/size limits
- Path traversal prevention for `apply_patch`, skills, and hooks

**Execution Security:**

- Tool approval workflows with configurable policies
- `tools.exec.applyPatch.workspaceOnly` enforcement
- `tools.fs.workspaceOnly` for file operation restriction
- PATH hardening (disabled project-local `node_modules/.bin` by default)
- Shell injection prevention (macOS keychain credentials)
- CLI process cleanup scoped to owned child PIDs

**Data Protection:**

- Secret redaction in logs and notifications
- `detect-secrets` integration for CI/CD
- Restricted write permissions (AI suggests, humans approve)
- Encrypted backups with hourly git autosyncs
- Memory scope access controls (QMD scope deny bypass prevention)

**Channel-Specific Hardening:**

- Telegram: numeric ID allowlists, webhook secret requirement
- Feishu: SSRF-hardened media URL fetching
- Tlon: private/internal host blocking
- Slack: DM slash command authorization
- Nostr: loopback-only profile mutation
- BlueBubbles: localhost-only passwordless webhooks
- Google Chat: ambiguous webhook routing rejection

### 13.3 Security Scanning & Auditing

```bash
# Automated secret detection
detect-secrets scan --baseline .secrets.baseline

# Security audit
wildvine security audit --deep
wildvine security audit --fix

# Docker hardening
docker run --read-only --cap-drop=ALL wildvine/wildvine:latest
```

---

## 14. Testing & Quality Assurance

### 14.1 Testing Framework

**Framework:** Vitest with V8 coverage
**Coverage Threshold:** 70% (lines, branches, functions, statements)
**Test Files:** 2,597+

### 14.2 Test Categories

| Category            | Config                        | Description                                   |
| ------------------- | ----------------------------- | --------------------------------------------- |
| **Unit Tests**      | `vitest.unit.config.ts`       | Component-level, colocated `*.test.ts`        |
| **E2E Tests**       | `vitest.e2e.config.ts`        | Full-stack integration (`*.e2e.test.ts`)      |
| **Live Tests**      | `vitest.live.config.ts`       | Real API credentials (`WILDVINE_LIVE_TEST=1`) |
| **Gateway Tests**   | `vitest.gateway.config.ts`    | Gateway-specific integration                  |
| **Extension Tests** | `vitest.extensions.config.ts` | Plugin/extension testing                      |
| **Docker E2E**      | Various scripts               | Containerized sandbox testing                 |
| **Install Smoke**   | `test-install-sh-docker.sh`   | Installation script validation                |

### 14.3 Test Commands

```bash
pnpm test              # Run all tests (parallel)
pnpm test:fast         # Unit tests only
pnpm test:e2e          # End-to-end tests
pnpm test:coverage     # With coverage report
pnpm test:live         # Live API tests
pnpm test:docker:all   # Full Docker E2E suite
```

### 14.4 Code Quality Tools

- **Oxlint** (v1.47.0) -- Rust-based linter with type-aware rules
- **Oxfmt** (v0.32.0) -- Rust-based code formatter
- **TypeScript** (v5.9.3) with strict mode
- **SwiftLint** / **SwiftFormat** for Swift code
- **Markdownlint** for documentation
- **ShellCheck** for shell scripts
- **Pre-commit hooks** via `git-hooks/`

---

## 15. CI/CD & Deployment

### 15.1 GitHub Actions Workflows

| Workflow                   | Purpose                                                                                         |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| `ci.yml`                   | Primary pipeline: lint, format, TypeScript, tests, coverage, builds (Windows/macOS/iOS/Android) |
| `docker-release.yml`       | Multi-arch Docker builds (amd64/arm64) to ghcr.io                                               |
| `formal-conformance.yml`   | Code conformance and schema validation                                                          |
| `install-smoke.yml`        | Installation script validation                                                                  |
| `sandbox-common-smoke.yml` | Sandbox validation                                                                              |
| `auto-response.yml`        | Issue/PR auto-labeling and triage                                                               |
| `stale.yml`                | Issue/PR lifecycle management                                                                   |
| `workflow-sanity.yml`      | Workflow self-validation                                                                        |

### 15.2 Release Strategy

**Version format:** `YYYY.M.D` (date-based semantic versioning)

| Channel    | Description                          | npm dist-tag |
| ---------- | ------------------------------------ | ------------ |
| **stable** | Tagged releases (`vYYYY.M.D`)        | `latest`     |
| **beta**   | Prerelease tags (`vYYYY.M.D-beta.N`) | `beta`       |
| **dev**    | Moving head on `main`                | --           |

**Version locations** (all must be kept in sync):

- `package.json` (CLI)
- `apps/android/app/build.gradle.kts` (versionName/versionCode)
- `apps/ios/Sources/Info.plist` (CFBundleShortVersionString/CFBundleVersion)
- `apps/macos/Sources/Wildvine/Resources/Info.plist`
- `docs/install/updating.md` (pinned npm version)

### 15.3 Deployment Options

#### Fly.io Cloud

```toml
app = "wildvine"
primary_region = "iad"
[mounts]
  source = "wildvine_data"
  destination = "/data"
[[vm]]
  memory = "2gb"
  cpu_kind = "shared"
  cpus = 1
```

#### Docker Compose

```yaml
services:
  wildvine-gateway:
    image: wildvine/wildvine:latest
    ports: ["18789:3000"]
    volumes: ["wildvine-data:/data"]
```

#### Podman (Rootless Container)

New in 2026.2.13: `setup-podman.sh` for one-time host setup with systemd Quadlet unit.

#### Standalone CLI

```bash
npm install -g wildvine@latest
wildvine gateway run --bind loopback --port 18789
```

#### Native macOS App

Distributed via Sparkle auto-update framework with `appcast.xml`.

---

## 16. Documentation & Localization

### 16.1 Documentation Structure

**Platform:** Mintlify (hosted at [docs.wildvine.bot](https://docs.wildvine.bot))

**Coverage (44 directories, 100+ guides):**

| Section                   | Content                                                        |
| ------------------------- | -------------------------------------------------------------- |
| `channels/` (31 subdirs)  | Per-channel setup and configuration                            |
| `cli/` (43 subdirs)       | CLI command reference                                          |
| `concepts/` (30 subdirs)  | Conceptual guides and architecture                             |
| `gateway/` (33 subdirs)   | Gateway configuration and management                           |
| `install/` (22 subdirs)   | Installation for all platforms                                 |
| `nodes/` (11 subdirs)     | Node/agent setup                                               |
| `platforms/` (12 subdirs) | Platform-specific guides (macOS, iOS, Android, Docker, Fly.io) |
| `plugins/`                | Plugin development guide                                       |
| `providers/` (29 subdirs) | LLM provider setup                                             |
| `reference/` (14 subdirs) | API reference                                                  |
| `security/`               | Security hardening guides                                      |
| `start/` (16 subdirs)     | Getting started tutorials                                      |
| `tools/` (26 subdirs)     | Tool documentation                                             |
| `web/`                    | Web UI documentation                                           |

### 16.2 Localization

- **English** -- Primary language
- **Chinese (zh-CN)** -- Auto-generated via `scripts/docs-i18n` pipeline with glossary (`docs/.i18n/glossary.zh-CN.json`) and translation memory (`docs/.i18n/zh-CN.tm.jsonl`)
- **Japanese (ja-JP)** -- Documentation translation

---

## 17. Implementation Roadmap

Wildvine's future development follows a phased roadmap designed to evolve the system from a single-assistant model into a self-improving AI ecosystem.

### Phase I: Unified Workflow & Custom CRM

- Natural language SQLite CRM with vector embeddings
- Fathom AI integration (5-minute polling for meeting transcripts)
- Approval queue for AI-generated actions ("Expert-in-the-Loop" logic)
- Relationship health scoring and automated follow-up reminders
- Gmail and Google Calendar ingestion with noise filtering
- Chrome session browser automation for paywalled content

### Phase II: AI-Driven Councils

- 8+ specialized agents: Financial, Marketing, Growth, Channel Strategy, and more
- Parallel debate protocol where agents discuss, negotiate, and argue
- Synthesizer role that merges findings and eliminates duplicate observations
- Ranked recommendations delivered as concise digests via Telegram

### Phase III: Knowledge Management & Content Pipelines

- Personal knowledge base with browser automation
- X/Twitter ingestion pipeline (FX Twitter -> X API -> Grok search fallback hierarchy)
- Video idea pipeline: Research -> De-duplicate -> Asana card generation
- "Humanizer" skill for natural-tone content processing

### Governance & Self-Evolution

- **Daily 3:30 AM Security Council** -- Automated review from Offensive, Defensive, Data Privacy, and Operational Realism perspectives
- **Deterministic sanitization** -- Scrub external data for prompt injection markers
- **Encrypted backups** -- Hourly git autosyncs, 7-day SQLite archive retention to Google Drive
- **Weekly memory synthesis** -- Distill interaction logs into permanent identity updates
- **Self-evolving system prompts** -- AI analyzes rejected actions and failed tasks to autonomously improve its own instructions

### Operational Calendar

| Frequency       | Task                                                               |
| --------------- | ------------------------------------------------------------------ |
| Every 5--30 min | Fathom ingestion; urgent email scans                               |
| Daily (morning) | Daily Briefing via Telegram (Calendar, CRM context, social stats)  |
| Overnight       | Security Council audit; cron reliability check; documentation sync |
| Weekly          | Memory synthesis: distilling logs into permanent identity updates  |

---

## 18. Technology Stack

### 18.1 Languages & Runtimes

| Technology           | Usage                                |
| -------------------- | ------------------------------------ |
| **TypeScript (ESM)** | Core codebase (516,000+ LOC)         |
| **Swift 6.2**        | macOS/iOS apps, WildvineKit, Swabble |
| **Kotlin**           | Android app                          |
| **Node.js 22.12+**   | Runtime environment                  |
| **Bun**              | Development/test acceleration        |

### 18.2 Key Dependencies

| Package                   | Version       | Purpose                   |
| ------------------------- | ------------- | ------------------------- |
| `express`                 | 5.2.1         | HTTP server framework     |
| `ws`                      | 8.19.0        | WebSocket server          |
| `grammy`                  | 1.40.0        | Telegram Bot API          |
| `@slack/bolt`             | 4.6.0         | Slack integration         |
| `@whiskeysockets/baileys` | 7.0.0-rc.9    | WhatsApp Web protocol     |
| `@line/bot-sdk`           | 10.6.0        | LINE messaging            |
| `@larksuiteoapi/node-sdk` | 1.59.0        | Feishu/Lark integration   |
| `sharp`                   | 0.34.5        | Image processing          |
| `pdfjs-dist`              | 5.4.624       | PDF parsing               |
| `playwright-core`         | 1.58.2        | Browser automation        |
| `sqlite-vec`              | 0.1.7-alpha.2 | Vector search             |
| `zod`                     | 4.3.6         | Runtime schema validation |
| `commander`               | 14.0.3        | CLI framework             |
| `croner`                  | 10.0.1        | Cron scheduling           |
| `chokidar`                | 5.0.0         | File watching             |

### 18.3 Build & Development Tools

| Tool                        | Version             | Purpose                      |
| --------------------------- | ------------------- | ---------------------------- |
| `pnpm`                      | 10.23.0             | Package manager              |
| `tsdown` / `rolldown`       | 0.20.3 / 1.0.0-rc.4 | Bundling                     |
| `oxfmt`                     | 0.32.0              | Code formatting              |
| `oxlint`                    | 1.47.0              | Linting (type-aware)         |
| `vitest`                    | 4.0.18              | Test framework               |
| `tsx`                       | 4.21.0              | TypeScript execution         |
| `typescript`                | 5.9.3               | Type checking                |
| `xcodegen`                  | --                  | iOS/macOS project generation |
| `swiftformat` / `swiftlint` | --                  | Swift code quality           |

---

## 19. Project Team & Governance

### 19.1 Maintainers

| Name                        | Role                | GitHub              | Focus Areas                          |
| --------------------------- | ------------------- | ------------------- | ------------------------------------ |
| **Peter Steinberger**       | Benevolent Dictator | @steipete           | Core architecture, project direction |
| **Shadow**                  | Maintainer          | @thewilloftheshadow | Discord, Slack subsystem             |
| **Vignesh**                 | Maintainer          | @vignesh07          | Memory (QMD), TUI, formal modeling   |
| **Jos**                     | Maintainer          | @joshp123           | Telegram, API, Nix mode              |
| **Christoph Nakazawa**      | Maintainer          | @cpojer             | JavaScript infrastructure            |
| **Gustavo Madeira Santana** | Maintainer          | @gumadeiras         | Multi-agents, CLI, web UI            |
| **Maximilian Nussbaumer**   | Maintainer          | @quotentiroler      | DevOps, CI, code quality             |

**Security Lead:** Jamieson O'Reilly (@theonejvo), founder of Dvuln

### 19.2 Contribution Guidelines

- **Bugs & small fixes** -- Open a PR directly
- **New features / architecture** -- Start a GitHub Discussion or ask in Discord first
- **AI/Vibe-Coded PRs** -- Welcome with transparency (mark as AI-assisted, note testing level)
- **Commit format** -- `<scope>: <message>` (e.g., `agents: fix auth profile ordering`)
- **Commit tool** -- `scripts/committer "<msg>" <file...>` for scoped commits
- **PR workflow** -- See `.agents/skills/PR_WORKFLOW.md` for full maintainer pipeline

### 19.3 Community

- **Discord:** [discord.gg/qkhbAGHRBT](https://discord.gg/qkhbAGHRBT) (setup help, discussions)
- **WildvineHub:** [wildvinehub.ai](https://wildvinehub.ai/) (community skill registry)
- **X/Twitter:** [@wildvine](https://x.com/wildvine), [@steipete](https://x.com/steipete)

---

## 20. Project Statistics

| Metric                    | Value                                                    |
| ------------------------- | -------------------------------------------------------- |
| **Total Commits**         | 11,003                                                   |
| **Development Duration**  | 2.75 months (Nov 24, 2025 -- Feb 17, 2026)               |
| **Peak Month**            | January 2026 (6,421 commits, 58% of total)               |
| **TypeScript Files**      | 2,948                                                    |
| **Lines of TypeScript**   | 516,487                                                  |
| **Test Files**            | 2,597                                                    |
| **Coverage Threshold**    | 70% (lines, branches, functions, statements)             |
| **Channel Integrations**  | 30+ (8 built-in + 22+ extensions)                        |
| **Plugin Extensions**     | 37 built-in                                              |
| **Pre-configured Skills** | 52+                                                      |
| **Documentation Pages**   | 100+ comprehensive guides                                |
| **Localized Languages**   | 3 (English, Chinese, Japanese)                           |
| **Supported Platforms**   | macOS, iOS, Android, Linux, Docker, Fly.io               |
| **LLM Providers**         | 10+ (Claude, OpenAI, Ollama, Bedrock, HuggingFace, etc.) |
| **CI/CD Workflows**       | 8 GitHub Actions pipelines                               |
| **Project Size**          | ~11 GB                                                   |

---

## Appendix A: Release History (Recent)

### 2026.2.14 (Unreleased)

**Highlights:**

- Telegram poll sending with full controls
- Discord exec approval channel targeting
- Slack/Discord unified `dmPolicy` and `allowFrom` aliases
- Sandbox browser-container bind mounts
- LINE Verify request handling
- 40+ security fixes across all channels and subsystems
- Memory QMD hardening (scope deny bypass, null-byte self-heal, result limits)
- TUI rendering fixes (concurrent streams, binary history, narrow terminals)

### 2026.2.13 (Current Stable)

**Highlights:**

- Podman-based deployment option with systemd Quadlet
- Discord voice messages with waveform previews
- Hugging Face Inference as first-class provider
- Write-ahead delivery queue for crash-recovery
- Auto-reply threading improvements
- MiniMax China API endpoint support
- vLLM onboarding provider support
- Removed legacy `.moltbot` migration (breaking change)

---

## Appendix B: Key File Locations

| Purpose               | Path                                                |
| --------------------- | --------------------------------------------------- |
| CLI entry point       | `src/entry.ts`                                      |
| Gateway server        | `src/gateway/server.impl.ts`                        |
| Agent system          | `src/agents/`                                       |
| Memory system         | `src/memory/`                                       |
| Channel integrations  | `src/telegram/`, `src/discord/`, `src/slack/`, etc. |
| Plugin SDK            | `src/plugin-sdk/`                                   |
| Extensions            | `extensions/`                                       |
| Skills                | `skills/`                                           |
| macOS app             | `apps/macos/`                                       |
| iOS app               | `apps/ios/`                                         |
| Android app           | `apps/android/`                                     |
| Shared Apple Kit      | `apps/shared/WildvineKit/`                          |
| Wake-word daemon      | `Swabble/`                                          |
| Documentation         | `docs/`                                             |
| CI/CD workflows       | `.github/workflows/`                                |
| Configuration         | `src/config/`                                       |
| Build output          | `dist/`                                             |
| Tests                 | Colocated `*.test.ts` throughout `src/`             |
| Repository guidelines | `AGENTS.md` (symlinked as `CLAUDE.md`)              |

---

_Document generated on February 21, 2026._
_Wildvine -- Grow anywhere, automate anything._
