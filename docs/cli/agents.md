---
summary: "CLI reference for `wildvine agents` (list/add/delete/bindings/bind/unbind/set identity)"
read_when:
  - You want multiple isolated agents (workspaces + routing + auth)
title: "agents"
---

# `wildvine agents`

Manage isolated agents (workspaces + auth + routing).

Related:

- Multi-agent routing: [Multi-Agent Routing](/concepts/multi-agent)
- Agent workspace: [Agent workspace](/concepts/agent-workspace)

## Examples

```bash
wildvine agents list
wildvine agents add work --workspace ~/.wildvine/workspace-work
wildvine agents bindings
wildvine agents bind --agent work --bind telegram:ops
wildvine agents unbind --agent work --bind telegram:ops
wildvine agents set-identity --workspace ~/.wildvine/workspace --from-identity
wildvine agents set-identity --agent main --avatar avatars/wildvine.png
wildvine agents delete work
```

## Routing bindings

Use routing bindings to pin inbound channel traffic to a specific agent.

List bindings:

```bash
wildvine agents bindings
wildvine agents bindings --agent work
wildvine agents bindings --json
```

Add bindings:

```bash
wildvine agents bind --agent work --bind telegram:ops --bind discord:guild-a
```

If you omit `accountId` (`--bind <channel>`), Wildvine resolves it from channel defaults and plugin setup hooks when available.

### Binding scope behavior

- A binding without `accountId` matches the channel default account only.
- `accountId: "*"` is the channel-wide fallback (all accounts) and is less specific than an explicit account binding.
- If the same agent already has a matching channel binding without `accountId`, and you later bind with an explicit or resolved `accountId`, Wildvine upgrades that existing binding in place instead of adding a duplicate.

Example:

```bash
# initial channel-only binding
wildvine agents bind --agent work --bind telegram

# later upgrade to account-scoped binding
wildvine agents bind --agent work --bind telegram:ops
```

After the upgrade, routing for that binding is scoped to `telegram:ops`. If you also want default-account routing, add it explicitly (for example `--bind telegram:default`).

Remove bindings:

```bash
wildvine agents unbind --agent work --bind telegram:ops
wildvine agents unbind --agent work --all
```

## Identity files

Each agent workspace can include an `IDENTITY.md` at the workspace root:

- Example path: `~/.wildvine/workspace/IDENTITY.md`
- `set-identity --from-identity` reads from the workspace root (or an explicit `--identity-file`)

Avatar paths resolve relative to the workspace root.

## Set identity

`set-identity` writes fields into `agents.list[].identity`:

- `name`
- `theme`
- `emoji`
- `avatar` (workspace-relative path, http(s) URL, or data URI)

Load from `IDENTITY.md`:

```bash
wildvine agents set-identity --workspace ~/.wildvine/workspace --from-identity
```

Override fields explicitly:

```bash
wildvine agents set-identity --agent main --name "Wildvine" --emoji "🦞" --avatar avatars/wildvine.png
```

Config sample:

```json5
{
  agents: {
    list: [
      {
        id: "main",
        identity: {
          name: "Wildvine",
          theme: "space vine",
          emoji: "🦞",
          avatar: "avatars/wildvine.png",
        },
      },
    ],
  },
}
```
