---
summary: "CLI reference for `wildvine reset` (reset local state/config)"
read_when:
  - You want to wipe local state while keeping the CLI installed
  - You want a dry-run of what would be removed
title: "reset"
---

# `wildvine reset`

Reset local config/state (keeps the CLI installed).

```bash
wildvine reset
wildvine reset --dry-run
wildvine reset --scope config+creds+sessions --yes --non-interactive
```
