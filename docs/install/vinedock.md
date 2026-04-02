---
summary: "ClawDock shell helpers for Docker-based Wildvine installs"
read_when:
  - You run Wildvine with Docker often and want shorter day-to-day commands
  - You want a helper layer for dashboard, logs, token setup, and pairing flows
title: "ClawDock"
---

# ClawDock

ClawDock is a small shell-helper layer for Docker-based Wildvine installs.

It gives you short commands like `vinedock-start`, `vinedock-dashboard`, and `vinedock-fix-token` instead of longer `docker compose ...` invocations.

If you have not set up Docker yet, start with [Docker](/install/docker).

## Install

Use the canonical helper path:

```bash
mkdir -p ~/.vinedock && curl -sL https://raw.githubusercontent.com/wildvine/wildvine/main/scripts/vinedock/vinedock-helpers.sh -o ~/.vinedock/vinedock-helpers.sh
echo 'source ~/.vinedock/vinedock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

If you previously installed ClawDock from `scripts/shell-helpers/vinedock-helpers.sh`, reinstall from the new `scripts/vinedock/vinedock-helpers.sh` path. The old raw GitHub path was removed.

## What you get

### Basic operations

| Command            | Description            |
| ------------------ | ---------------------- |
| `vinedock-start`   | Start the gateway      |
| `vinedock-stop`    | Stop the gateway       |
| `vinedock-restart` | Restart the gateway    |
| `vinedock-status`  | Check container status |
| `vinedock-logs`    | Follow gateway logs    |

### Container access

| Command                   | Description                                   |
| ------------------------- | --------------------------------------------- |
| `vinedock-shell`          | Open a shell inside the gateway container     |
| `vinedock-cli <command>`  | Run Wildvine CLI commands in Docker           |
| `vinedock-exec <command>` | Execute an arbitrary command in the container |

### Web UI and pairing

| Command                 | Description                  |
| ----------------------- | ---------------------------- |
| `vinedock-dashboard`    | Open the Control UI URL      |
| `vinedock-devices`      | List pending device pairings |
| `vinedock-approve <id>` | Approve a pairing request    |

### Setup and maintenance

| Command              | Description                                      |
| -------------------- | ------------------------------------------------ |
| `vinedock-fix-token` | Configure the gateway token inside the container |
| `vinedock-update`    | Pull, rebuild, and restart                       |
| `vinedock-rebuild`   | Rebuild the Docker image only                    |
| `vinedock-clean`     | Remove containers and volumes                    |

### Utilities

| Command                | Description                             |
| ---------------------- | --------------------------------------- |
| `vinedock-health`      | Run a gateway health check              |
| `vinedock-token`       | Print the gateway token                 |
| `vinedock-cd`          | Jump to the Wildvine project directory  |
| `vinedock-config`      | Open `~/.wildvine`                      |
| `vinedock-show-config` | Print config files with redacted values |
| `vinedock-workspace`   | Open the workspace directory            |

## First-time flow

```bash
vinedock-start
vinedock-fix-token
vinedock-dashboard
```

If the browser says pairing is required:

```bash
vinedock-devices
vinedock-approve <request-id>
```

## Config and secrets

ClawDock works with the same Docker config split described in [Docker](/install/docker):

- `<project>/.env` for Docker-specific values like image name, ports, and the gateway token
- `~/.wildvine/.env` for provider keys and bot tokens
- `~/.wildvine/wildvine.json` for behavior config

Use `vinedock-show-config` when you want to inspect those files quickly. It redacts `.env` values in its printed output.

## Related pages

- [Docker](/install/docker)
- [Docker VM Runtime](/install/docker-vm-runtime)
- [Updating](/install/updating)
