# TASK: Wildvine Branding Verification & E2E Test

> One-shot task briefing for a Claude Code session in `~/Projects/wildvine`.
> Written by Dan's strategic agent on 2026-04-02.

---

## Objective

The wildvine repo was rebranded from openclaw via `rebrand.py` + `sync_upstream.py`
on 2026-04-01 (347 commits, 1190 files, branding checks reported clean). But
**nobody has visually verified the result or run the app end-to-end.** This
session fixes that.

Three deliverables:

1. **Visual branding verification** — confirm every user-visible surface says
   "Wildvine" with the correct cyan branding, not openclaw/lobster/claw.
2. **E2E functional test** — build, launch, and walk through the app. Does
   the wizard work? Do agents launch? Does the web UI load?
3. **Hub capability assessment** — document the agent management features
   (cron, sub-agent spawning, semantic memory, process management) that
   could replace our current passive CLAUDE.md hub architecture.

---

## Phase 1: Branding Audit (No Build Required)

Scan the codebase for any surviving openclaw/lobster/claw references that
`rebrand.py` missed. Check these specific surfaces:

### Text References
```bash
# Should return ZERO results
grep -rn --include="*.ts" --include="*.tsx" --include="*.swift" \
  --include="*.kt" --include="*.md" --include="*.json" --include="*.toml" \
  --include="*.html" --include="*.css" \
  -i "openclaw\|lobster\|clawbot\|clawflow\|claw\.com" . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist
```

### Image Assets
- `apps/macos/Icon.icon/` — should contain Wildvine icon, not openclaw
- Any `.icns`, `.png`, `.svg`, `.ico` files in `apps/`, `public/`, `assets/`
- Favicon files
- Splash screens (iOS, Android)
- Check that logo files reference cyan (#00FFFF for logo, #06B6D4 for UI)

### Config/Metadata
- `package.json` — name, description, repository URL
- `apps/macos/Package.swift` — product name, bundle identifier
- `apps/ios/` and `apps/android/` — app name, bundle/package ID
- `.pi/config.toml` or any agent config — identity, name fields
- `wildvine.mjs` — entry point naming
- Any `manifest.json`, `Info.plist`, or platform config files

### Report Format
Create `docs/BRANDING-AUDIT.md` with:
- Total references found (should be 0)
- Per-file listing of any remaining openclaw references
- Image asset status (Wildvine logo present? correct colors?)
- Config/metadata status
- PASS/FAIL verdict

---

## Phase 2: Build & Launch

### macOS App
```bash
cd apps/macos
swift build
# If successful, launch and verify:
# - Dock icon is Wildvine (cyan vine), NOT openclaw/lobster
# - App title bar says "Wildvine"
# - Menu bar says "Wildvine"
# - About dialog says "Wildvine"
```

### CLI
```bash
npm install
npm run build
# Verify CLI name
./dist/cli.js --version  # or however the CLI launches
# Check that help text says Wildvine
```

### Web UI (if applicable)
```bash
# Check if there's a web/provider-web mode
# Launch it, verify branding in browser
```

### Wizard / Onboarding
- Run the first-time setup wizard
- Verify every screen says Wildvine
- Verify branding colors (cyan, not openclaw's colors)
- Screenshot or document each step

### Report
Append to `docs/BRANDING-AUDIT.md`:
- Build success/failure for each platform
- Visual verification results
- Screenshots if possible (describe what you see)
- Any runtime errors

---

## Phase 3: Agent Management Capability Assessment

This is the strategic assessment. The wildvine runtime has capabilities that
could replace our current passive CLAUDE.md hub at `~/Projects/wildvine-launch/`.
Document what exists and how it works:

### Cron System
- Where is it? (`src/cron/`)
- What can it schedule? (one-time, recurring, cron expressions?)
- Can it deliver to specific channels/agents?
- Could it poll sub-repos on a schedule?

### Sub-Agent Spawning
- `sessions_spawn` tool — how does it work?
- Can it spin up Claude Code / Codex / other coding agents?
- Can it monitor their progress and read their output?
- What's the lifecycle? (spawn → monitor → collect results → report)

### Semantic Memory
- Embedding-based search — which providers? (Gemini, OpenAI, Voyage?)
- MEMORY.md + session transcripts — how do these persist?
- SQLite vector storage — schema, capacity, search quality?
- How does this compare to Claude.ai project knowledge?

### Process Management
- Background PTY sessions — can it manage long-running processes?
- Can it monitor PM2 processes in wildvine-networks?
- Kill/restart capabilities?

### Messaging Channels
- Which channels work? (Telegram, Slack, etc.)
- Could Dan get notifications when sub-agents finish work?

### Plugin/Skill System
- WildvineHub — how does skill discovery work?
- Could room management be a skill?
- Could preflight checks be a skill?

### Report
Create `docs/HUB-CAPABILITY-ASSESSMENT.md` with:
- Feature inventory table (capability, status, location in code)
- Comparison: current passive hub vs. wildvine active hub
- Recommended migration path (if viable)
- Blockers or gaps
- Estimated effort to set up wildvine as the active hub

---

## Phase 4: Status Report

When done, write a status file that the hub can read:

```bash
cat > ~/Projects/wildvine-launch/STATUS/wildvine.md << 'EOF'
# Wildvine Status — [DATE]

## Branding Audit
- [PASS/FAIL] — [summary]

## E2E Test  
- macOS build: [PASS/FAIL]
- CLI: [PASS/FAIL]
- Wizard: [PASS/FAIL]
- Web UI: [PASS/FAIL]

## Hub Capability Assessment
- [1-2 sentence summary]
- Full report: ~/Projects/wildvine/docs/HUB-CAPABILITY-ASSESSMENT.md

## Recommended Next Steps
- [list]
EOF
```

This is the first test of the hub push model — sub-repos writing status
updates that the hub can read.

---

## Important Context

- The branding scrub was done by `rebrand.py` at `~/Projects/wildvine-labs/forge/rebrand.py`
- The upstream sync is handled by `sync_upstream.py` at `~/Projects/wildvine-labs/forge/sync_upstream.py`
- Branding spec: cyan #00FFFF (logo), #06B6D4 (UI accents), lobster→vine,
  clawbot→vinebot, clawflow→vineflow
- The previous branding assets (logos, icns) were in `~/Projects/wildvine-openclaw`
  but that directory may have been replaced. Check if replacement assets
  exist in the current repo.
- This repo has its own independent git history — NOT a fork of openclaw.
  The sovereignty decision is intentional.

---

## Do NOT

- Modify the openclaw directory
- Run rebrand.py again (the branding should already be applied)
- Make functional changes to the codebase
- Skip the visual verification — that's the whole point of this task
