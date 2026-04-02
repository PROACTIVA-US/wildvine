---
summary: "Compatibility note for the mistakenly documented `wildvine flows` command"
read_when:
  - You encounter wildvine flows in older release notes, issue threads, or search results
  - You want to know what command replaced wildvine flows
title: "flows"
---

# `wildvine flows`

`wildvine flows` is **not** a current Wildvine CLI command.

Some older release notes and docs mistakenly documented a `flows` command surface. The supported operator surface is [`wildvine tasks`](/automation/tasks).

```bash
wildvine tasks list
wildvine tasks show <lookup>
wildvine tasks cancel <lookup>
```

## Use instead

- `wildvine tasks list` — list tracked background tasks
- `wildvine tasks show <lookup>` — inspect one task by task id, run id, or session key
- `wildvine tasks cancel <lookup>` — cancel a running background task
- `wildvine tasks notify <lookup> <policy>` — change task notification behavior
- `wildvine tasks audit` — surface stale or broken task runs

## Why this page exists

This page stays in place so existing links from older changelog entries, issue threads, and search results have a clear correction instead of a dead end.

## Related

- [Background Tasks](/automation/tasks) — detached work ledger
- [CLI reference](/cli/index) — full command tree
