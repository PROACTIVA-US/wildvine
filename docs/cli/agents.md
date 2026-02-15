---
summary: "CLI reference for `wildvine agents` (list/add/delete/set identity)"
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
wildvine agents set-identity --workspace ~/.wildvine/workspace --from-identity
wildvine agents set-identity --agent main --avatar avatars/wildvine.png
wildvine agents delete work
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
wildvine agents set-identity --agent main --name "Wildvine" --emoji "🌿" --avatar avatars/wildvine.png
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
          theme: "space lobster",
          emoji: "🌿",
          avatar: "avatars/wildvine.png",
        },
      },
    ],
  },
}
```
