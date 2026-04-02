---
summary: "Compatibility note for older ClawFlow references in release notes and docs"
read_when:
  - You encounter ClawFlow or wildvine flows in older release notes or docs
  - You want to understand what ClawFlow terminology maps to in the current CLI
  - You want to translate older flow references into the supported task commands
title: "ClawFlow"
---

# ClawFlow

`ClawFlow` appears in some older Wildvine release notes and documentation as if it were a user-facing runtime with its own `wildvine flows` command surface.

That is not the current operator-facing surface in this repository.

Today, the supported CLI surface for inspecting and managing detached work is [`wildvine tasks`](/automation/tasks).

## What to use today

- `wildvine tasks list` shows tracked detached runs
- `wildvine tasks show <lookup>` shows one task by task id, run id, or session key
- `wildvine tasks cancel <lookup>` cancels a running task
- `wildvine tasks audit` surfaces stale or broken task runs

```bash
wildvine tasks list
wildvine tasks show <lookup>
wildvine tasks cancel <lookup>
```

## What this means for older references

If you see `ClawFlow` or `wildvine flows` in:

- old release notes
- issue threads
- stale search results
- outdated local notes

translate those instructions to the current task CLI:

- `wildvine flows list` -> `wildvine tasks list`
- `wildvine flows show <lookup>` -> `wildvine tasks show <lookup>`
- `wildvine flows cancel <lookup>` -> `wildvine tasks cancel <lookup>`

## Related

- [Background Tasks](/automation/tasks) — detached work ledger
- [CLI: flows](/cli/flows) — compatibility note for the mistaken command name
- [Cron Jobs](/automation/cron-jobs) — scheduled jobs that may create tasks
