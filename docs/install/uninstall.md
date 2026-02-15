---
summary: "Uninstall Wildvine completely (CLI, service, state, workspace)"
read_when:
  - You want to remove Wildvine from a machine
  - The gateway service is still running after uninstall
title: "Uninstall"
---

# Uninstall

Two paths:

- **Easy path** if `wildvine` is still installed.
- **Manual service removal** if the CLI is gone but the service is still running.

## Easy path (CLI still installed)

Recommended: use the built-in uninstaller:

```bash
wildvine uninstall
```

Non-interactive (automation / npx):

```bash
wildvine uninstall --all --yes --non-interactive
npx -y wildvine uninstall --all --yes --non-interactive
```

Manual steps (same result):

1. Stop the gateway service:

```bash
wildvine gateway stop
```

2. Uninstall the gateway service (launchd/systemd/schtasks):

```bash
wildvine gateway uninstall
```

3. Delete state + config:

```bash
rm -rf "${WILDVINE_STATE_DIR:-$HOME/.wildvine}"
```

If you set `WILDVINE_CONFIG_PATH` to a custom location outside the state dir, delete that file too.

4. Delete your workspace (optional, removes agent files):

```bash
rm -rf ~/.wildvine/workspace
```

5. Remove the CLI install (pick the one you used):

```bash
npm rm -g wildvine
pnpm remove -g wildvine
bun remove -g wildvine
```

6. If you installed the macOS app:

```bash
rm -rf /Applications/Wildvine.app
```

Notes:

- If you used profiles (`--profile` / `WILDVINE_PROFILE`), repeat step 3 for each state dir (defaults are `~/.wildvine-<profile>`).
- In remote mode, the state dir lives on the **gateway host**, so run steps 1-4 there too.

## Manual service removal (CLI not installed)

Use this if the gateway service keeps running but `wildvine` is missing.

### macOS (launchd)

Default label is `bot.molt.gateway` (or `bot.molt.<profile>`; legacy `com.wildvine.*` may still exist):

```bash
launchctl bootout gui/$UID/bot.molt.gateway
rm -f ~/Library/LaunchAgents/bot.molt.gateway.plist
```

If you used a profile, replace the label and plist name with `bot.molt.<profile>`. Remove any legacy `com.wildvine.*` plists if present.

### Linux (systemd user unit)

Default unit name is `wildvine-gateway.service` (or `wildvine-gateway-<profile>.service`):

```bash
systemctl --user disable --now wildvine-gateway.service
rm -f ~/.config/systemd/user/wildvine-gateway.service
systemctl --user daemon-reload
```

### Windows (Scheduled Task)

Default task name is `Wildvine Gateway` (or `Wildvine Gateway (<profile>)`).
The task script lives under your state dir.

```powershell
schtasks /Delete /F /TN "Wildvine Gateway"
Remove-Item -Force "$env:USERPROFILE\.wildvine\gateway.cmd"
```

If you used a profile, delete the matching task name and `~\.wildvine-<profile>\gateway.cmd`.

## Normal install vs source checkout

### Normal install (install.sh / npm / pnpm / bun)

If you used `https://wildvine.ai/install.sh` or `install.ps1`, the CLI was installed with `npm install -g wildvine@latest`.
Remove it with `npm rm -g wildvine` (or `pnpm remove -g` / `bun remove -g` if you installed that way).

### Source checkout (git clone)

If you run from a repo checkout (`git clone` + `wildvine ...` / `bun run wildvine ...`):

1. Uninstall the gateway service **before** deleting the repo (use the easy path above or manual service removal).
2. Delete the repo directory.
3. Remove state + workspace as shown above.
