---
summary: "CLI reference for `wildvine config` (get/set/unset config values)"
read_when:
  - You want to read or edit config non-interactively
title: "config"
---

# `wildvine config`

Config helpers: get/set/unset values by path. Run without a subcommand to open
the configure wizard (same as `wildvine configure`).

## Examples

```bash
wildvine config get browser.executablePath
wildvine config set browser.executablePath "/usr/bin/google-chrome"
wildvine config set agents.defaults.heartbeat.every "2h"
wildvine config set agents.list[0].tools.exec.node "node-id-or-name"
wildvine config unset tools.web.search.apiKey
```

## Paths

Paths use dot or bracket notation:

```bash
wildvine config get agents.defaults.workspace
wildvine config get agents.list[0].id
```

Use the agent list index to target a specific agent:

```bash
wildvine config get agents.list
wildvine config set agents.list[1].tools.exec.node "node-id-or-name"
```

## Values

Values are parsed as JSON5 when possible; otherwise they are treated as strings.
Use `--json` to require JSON5 parsing.

```bash
wildvine config set agents.defaults.heartbeat.every "0m"
wildvine config set gateway.port 19001 --json
wildvine config set channels.whatsapp.groups '["*"]' --json
```

Restart the gateway after edits.
