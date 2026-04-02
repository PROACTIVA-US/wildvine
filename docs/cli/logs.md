---
summary: "CLI reference for `wildvine logs` (tail gateway logs via RPC)"
read_when:
  - You need to tail Gateway logs remotely (without SSH)
  - You want JSON log lines for tooling
title: "logs"
---

# `wildvine logs`

Tail Gateway file logs over RPC (works in remote mode).

Related:

- Logging overview: [Logging](/logging)

## Examples

```bash
wildvine logs
wildvine logs --follow
wildvine logs --json
wildvine logs --limit 500
wildvine logs --local-time
wildvine logs --follow --local-time
```

Use `--local-time` to render timestamps in your local timezone.
