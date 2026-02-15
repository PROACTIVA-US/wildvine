---
summary: "CLI reference for `wildvine voicecall` (voice-call plugin command surface)"
read_when:
  - You use the voice-call plugin and want the CLI entry points
  - You want quick examples for `voicecall call|continue|status|tail|expose`
title: "voicecall"
---

# `wildvine voicecall`

`voicecall` is a plugin-provided command. It only appears if the voice-call plugin is installed and enabled.

Primary doc:

- Voice-call plugin: [Voice Call](/plugins/voice-call)

## Common commands

```bash
wildvine voicecall status --call-id <id>
wildvine voicecall call --to "+15555550123" --message "Hello" --mode notify
wildvine voicecall continue --call-id <id> --message "Any questions?"
wildvine voicecall end --call-id <id>
```

## Exposing webhooks (Tailscale)

```bash
wildvine voicecall expose --mode serve
wildvine voicecall expose --mode funnel
wildvine voicecall unexpose
```

Security note: only expose the webhook endpoint to networks you trust. Prefer Tailscale Serve over Funnel when possible.
