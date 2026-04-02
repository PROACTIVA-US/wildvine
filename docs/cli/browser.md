---
summary: "CLI reference for `wildvine browser` (profiles, tabs, actions, Chrome MCP, and CDP)"
read_when:
  - You use `wildvine browser` and want examples for common tasks
  - You want to control a browser running on another machine via a node host
  - You want to attach to your local signed-in Chrome via Chrome MCP
title: "browser"
---

# `wildvine browser`

Manage Wildvine’s browser control server and run browser actions (tabs, snapshots, screenshots, navigation, clicks, typing).

Related:

- Browser tool + API: [Browser tool](/tools/browser)

## Common flags

- `--url <gatewayWsUrl>`: Gateway WebSocket URL (defaults to config).
- `--token <token>`: Gateway token (if required).
- `--timeout <ms>`: request timeout (ms).
- `--browser-profile <name>`: choose a browser profile (default from config).
- `--json`: machine-readable output (where supported).

## Quick start (local)

```bash
wildvine browser profiles
wildvine browser --browser-profile wildvine start
wildvine browser --browser-profile wildvine open https://example.com
wildvine browser --browser-profile wildvine snapshot
```

## If the command is missing

If `wildvine browser` is an unknown command, check `plugins.allow` in
`~/.wildvine/wildvine.json`.

When `plugins.allow` is present, the bundled browser plugin must be listed
explicitly:

```json5
{
  plugins: {
    allow: ["telegram", "browser"],
  },
}
```

`browser.enabled=true` does not restore the CLI subcommand when the plugin
allowlist excludes `browser`.

Related: [Browser tool](/tools/browser#missing-browser-command-or-tool)

## Profiles

Profiles are named browser routing configs. In practice:

- `wildvine`: launches or attaches to a dedicated Wildvine-managed Chrome instance (isolated user data dir).
- `user`: controls your existing signed-in Chrome session via Chrome DevTools MCP.
- custom CDP profiles: point at a local or remote CDP endpoint.

```bash
wildvine browser profiles
wildvine browser create-profile --name work --color "#06B6D4"
wildvine browser create-profile --name chrome-live --driver existing-session
wildvine browser delete-profile --name work
```

Use a specific profile:

```bash
wildvine browser --browser-profile work tabs
```

## Tabs

```bash
wildvine browser tabs
wildvine browser open https://docs.wildvine.com
wildvine browser focus <targetId>
wildvine browser close <targetId>
```

## Snapshot / screenshot / actions

Snapshot:

```bash
wildvine browser snapshot
```

Screenshot:

```bash
wildvine browser screenshot
```

Navigate/click/type (ref-based UI automation):

```bash
wildvine browser navigate https://example.com
wildvine browser click <ref>
wildvine browser type <ref> "hello"
```

## Existing Chrome via MCP

Use the built-in `user` profile, or create your own `existing-session` profile:

```bash
wildvine browser --browser-profile user tabs
wildvine browser create-profile --name chrome-live --driver existing-session
wildvine browser create-profile --name brave-live --driver existing-session --user-data-dir "~/Library/Application Support/BraveSoftware/Brave-Browser"
wildvine browser --browser-profile chrome-live tabs
```

This path is host-only. For Docker, headless servers, Browserless, or other remote setups, use a CDP profile instead.

## Remote browser control (node host proxy)

If the Gateway runs on a different machine than the browser, run a **node host** on the machine that has Chrome/Brave/Edge/Chromium. The Gateway will proxy browser actions to that node (no separate browser control server required).

Use `gateway.nodes.browser.mode` to control auto-routing and `gateway.nodes.browser.node` to pin a specific node if multiple are connected.

Security + remote setup: [Browser tool](/tools/browser), [Remote access](/gateway/remote), [Tailscale](/gateway/tailscale), [Security](/gateway/security)
