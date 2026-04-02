# Wildvine Branding Audit — 2026-04-02

## Summary

**Verdict: CONDITIONAL PASS** — All user-visible product surfaces (app names, bundle IDs, UI strings, logos, icons) are correctly branded as **Wildvine**. However, **35 internal code references** to the old `openClaw` naming survive as variable/function names in source code. These are not user-visible but should be cleaned up for code hygiene.

---

## 1. Text Reference Scan

### User-Visible Strings: PASS

All user-facing surfaces use "Wildvine":
- `package.json`: name=`wildvine`, homepage/repo point to `PROACTIVA-US/wildvine`
- iOS `Info.plist`: `CFBundleDisplayName` = "Wildvine", bundle ID = `ai.wildvine.ios.*`
- Android `AndroidManifest.xml`: label=`@string/app_name`, theme=`Theme.WildvineNode`
- macOS `Package.swift`: product name "Wildvine", executable "Wildvine", CLI "wildvine-mac"
- CLI entry: `wildvine.mjs`, bin name `wildvine`

### Surviving Old-Name References (Internal Code Only)

**35 non-user-visible references** found across source code — these are variable names, function names, and type brands that survived the rebrand. None are displayed to users.

| File | Type | Reference |
|------|------|-----------|
| `apps/android/.../GatewayDiagnostics.kt` | function | `openClawAndroidVersionLabel()` |
| `apps/android/.../ConnectTabScreen.kt` | call | `openClawAndroidVersionLabel()` |
| `apps/android/.../OnboardingFlow.kt` | call | `openClawAndroidVersionLabel()` |
| `apps/ios/.../DeviceInfoHelper.swift` | function | `openClawVersionString()` |
| `apps/ios/.../SettingsTab.swift` | call | `openClawVersionString()` (label shows "Wildvine") |
| `apps/macos/.../SelectableRow.swift` | function | `openClawSelectableRowChrome()`, `openClawRowBackground()` |
| `apps/macos/.../OnboardingView+Pages.swift` | call | `.openClawSelectableRowChrome()` |
| `apps/macos/.../GatewayDiscoveryMenu.swift` | call | `.openClawSelectableRowChrome()` |
| `src/config/types.wildvine.ts` | symbol | `openClawConfigStateBrand` |
| `src/cli/vinebot-cli.ts` | function | `registerClawbotCli()` |
| `src/cli/program/register.subclis.ts` | call | `registerClawbotCli()` |
| `src/agents/wildvine-tools.ts` | variable | `openClawToolsDeps` (4 refs) |
| `src/agents/sandbox-paths.ts` | variable | `openClawTmpDir` (3 refs) |
| `src/agents/sandbox-paths.test.ts` | variable | `openClawTmpDir` (~15 refs) |
| `src/agents/wildvine-tools.sessions.test.ts` | import | `openClawToolsTesting` |
| `src/infra/exec-allowlist-pattern.test.ts` | variable | `openClawHome` |
| `src/plugins/marketplace.test.ts` | variable | `openClawHome` |
| `extensions/acpx/src/config.ts` | variable | `openClawRoot` |
| `extensions/matrix/src/matrix/device-health.ts` | variable | `openClawDevices` |
| `scripts/dev/discord-acp-plain-language-smoke.ts` | function | `readMessagesWithOpenclaw()` |

### ClawFlow / ClawBot References (Intentional Legacy)

These are **intentional compatibility references** in docs that explain the old naming:
- `docs/automation/vineflow.md` — Compatibility note mapping ClawFlow → `wildvine tasks`
- `docs/automation/tasks.md` — References ClawFlow as historical naming
- `docs/automation/index.md` — Links to compatibility note
- `docs/tools/vine.md` — Mentions ClawFlow as historical
- `skills/vineflow/SKILL.md` — ClawFlow skill (legacy name preserved as feature name)
- `skills/vineflow-inbox-triage/SKILL.md` — ClawFlow example pattern

### One User-Visible Legacy Reference

- `README.md:445` — "Requires the WeChat **ClawBot** plugin" — This is the name of a **third-party Tencent plugin** that Wildvine does not control, so it is correct as-is.

---

## 2. Image Asset Status: PASS

| Asset | Location | Status |
|-------|----------|--------|
| macOS icon (PNG) | `apps/macos/Icon.icon/Assets/wildvine-mac.png` | 1024x1024 RGBA, named "wildvine-mac" |
| macOS icon (ICNS) | `apps/macos/Sources/Wildvine/Resources/Wildvine.icns` | 162KB, named "Wildvine.icns" |
| Logo SVG | `assets/wildvine-logo.svg` | Present, uses `fill:#00FFFF` (cyan) |
| Logo SVG (UI) | `ui/public/wildvine-logo.svg` | Present, uses `fill:#00FFFF` (cyan) |
| Logo text SVG | `docs/assets/wildvine-logo-text.svg` | Present |
| Logo text dark SVG | `docs/assets/wildvine-logo-text-dark.svg` | Present |
| Favicon ICO | `ui/public/favicon.ico` | Present |
| Favicon SVG | `ui/public/favicon.svg` | Present |

**Color verification**: Logo SVG uses `#00FFFF` (cyan) as specified. CLI palette (`src/terminal/palette.ts`) uses `#FF5A2D` (orange-red accent) — this is the CLI theme, separate from the logo color. Both are intentional.

No `openclaw`, `lobster`, or old branding image files found.

---

## 3. Config/Metadata Status: PASS

| Config | Field | Value | Status |
|--------|-------|-------|--------|
| `package.json` | name | `wildvine` | OK |
| `package.json` | homepage | `github.com/PROACTIVA-US/wildvine` | OK |
| `package.json` | bin | `wildvine` → `wildvine.mjs` | OK |
| `apps/macos/Package.swift` | product name | `Wildvine` | OK |
| `apps/macos/Package.swift` | executable | `Wildvine` | OK |
| `apps/macos/Package.swift` | CLI | `wildvine-mac` | OK |
| `apps/ios/Info.plist` | CFBundleDisplayName | `Wildvine` | OK |
| `apps/ios/Info.plist` | BGTask ID | `ai.wildvine.ios.bgrefresh` | OK |
| `apps/android/AndroidManifest.xml` | theme | `Theme.WildvineNode` | OK |

---

## 4. Recommendations

1. **Low priority**: Rename ~35 internal `openClaw*` variables/functions to `wildvine*` equivalents. These are invisible to users but create confusion for contributors.
2. **No action needed**: ClawFlow/ClawBot doc references are intentional compatibility notes.
3. **No action needed**: WeChat "ClawBot plugin" reference is a third-party product name.
