---
summary: "CLI reference for `wildvine uninstall` (remove gateway service + local data)"
read_when:
  - You want to remove the gateway service and/or local state
  - You want a dry-run first
title: "uninstall"
---

# `wildvine uninstall`

Uninstall the gateway service + local data (CLI remains).

```bash
wildvine backup create
wildvine uninstall
wildvine uninstall --all --yes
wildvine uninstall --dry-run
```

Run `wildvine backup create` first if you want a restorable snapshot before removing state or workspaces.
