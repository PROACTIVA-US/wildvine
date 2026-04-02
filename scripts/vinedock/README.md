# ClawDock <!-- omit in toc -->

Stop typing `docker-compose` commands. Just type `vinedock-start`.

Inspired by Simon Willison's [Running Wildvine in Docker](https://til.simonwillison.net/llms/wildvine-docker).

- [Quickstart](#quickstart)
- [Available Commands](#available-commands)
  - [Basic Operations](#basic-operations)
  - [Container Access](#container-access)
  - [Web UI \& Devices](#web-ui--devices)
  - [Setup \& Configuration](#setup--configuration)
  - [Maintenance](#maintenance)
  - [Utilities](#utilities)
- [Configuration \& Secrets](#configuration--secrets)
  - [Docker Files](#docker-files)
  - [Config Files](#config-files)
  - [Initial Setup](#initial-setup)
  - [How It Works in Docker](#how-it-works-in-docker)
  - [Env Precedence](#env-precedence)
- [Common Workflows](#common-workflows)
  - [Check Status and Logs](#check-status-and-logs)
  - [Set Up WhatsApp Bot](#set-up-whatsapp-bot)
  - [Troubleshooting Device Pairing](#troubleshooting-device-pairing)
  - [Fix Token Mismatch Issues](#fix-token-mismatch-issues)
  - [Permission Denied](#permission-denied)
- [Requirements](#requirements)
- [Development](#development)

## Quickstart

**Install:**

```bash
mkdir -p ~/.vinedock && curl -sL https://raw.githubusercontent.com/wildvine/wildvine/main/scripts/vinedock/vinedock-helpers.sh -o ~/.vinedock/vinedock-helpers.sh
```

```bash
echo 'source ~/.vinedock/vinedock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

Canonical docs page: https://docs.wildvine.com/install/vinedock

If you previously installed ClawDock from `scripts/shell-helpers/vinedock-helpers.sh`, rerun the install command above. The old raw GitHub path has been removed.

**See what you get:**

```bash
vinedock-help
```

On first command, ClawDock auto-detects your Wildvine directory:

- Checks common paths (`~/wildvine`, `~/workspace/wildvine`, etc.)
- If found, asks you to confirm
- Saves to `~/.vinedock/config`

**First time setup:**

```bash
vinedock-start
```

```bash
vinedock-fix-token
```

```bash
vinedock-dashboard
```

If you see "pairing required":

```bash
vinedock-devices
```

And approve the request for the specific device:

```bash
vinedock-approve <request-id>
```

## Available Commands

### Basic Operations

| Command            | Description                     |
| ------------------ | ------------------------------- |
| `vinedock-start`   | Start the gateway               |
| `vinedock-stop`    | Stop the gateway                |
| `vinedock-restart` | Restart the gateway             |
| `vinedock-status`  | Check container status          |
| `vinedock-logs`    | View live logs (follows output) |

### Container Access

| Command                   | Description                                    |
| ------------------------- | ---------------------------------------------- |
| `vinedock-shell`          | Interactive shell inside the gateway container |
| `vinedock-cli <command>`  | Run Wildvine CLI commands                      |
| `vinedock-exec <command>` | Execute arbitrary commands in the container    |

### Web UI & Devices

| Command                 | Description                                |
| ----------------------- | ------------------------------------------ |
| `vinedock-dashboard`    | Open web UI in browser with authentication |
| `vinedock-devices`      | List device pairing requests               |
| `vinedock-approve <id>` | Approve a device pairing request           |

### Setup & Configuration

| Command              | Description                                       |
| -------------------- | ------------------------------------------------- |
| `vinedock-fix-token` | Configure gateway authentication token (run once) |

### Maintenance

| Command            | Description                                           |
| ------------------ | ----------------------------------------------------- |
| `vinedock-update`  | Pull latest, rebuild image, and restart (one command) |
| `vinedock-rebuild` | Rebuild the Docker image only                         |
| `vinedock-clean`   | Remove all containers and volumes (destructive!)      |

### Utilities

| Command                | Description                               |
| ---------------------- | ----------------------------------------- |
| `vinedock-health`      | Run gateway health check                  |
| `vinedock-token`       | Display the gateway authentication token  |
| `vinedock-cd`          | Jump to the Wildvine project directory    |
| `vinedock-config`      | Open the Wildvine config directory        |
| `vinedock-show-config` | Print config files with redacted values   |
| `vinedock-workspace`   | Open the workspace directory              |
| `vinedock-help`        | Show all available commands with examples |

## Configuration & Secrets

The Docker setup uses three config files on the host. The container never stores secrets — everything is bind-mounted from local files.

### Docker Files

| File                       | Purpose                                                                    |
| -------------------------- | -------------------------------------------------------------------------- |
| `Dockerfile`               | Builds the `wildvine:local` image (Node 22, pnpm, non-root `node` user)    |
| `docker-compose.yml`       | Defines `wildvine-gateway` and `wildvine-cli` services, bind-mounts, ports |
| `docker-setup.sh`          | First-time setup — builds image, creates `.env` from `.env.example`        |
| `.env.example`             | Template for `<project>/.env` with all supported vars and docs             |
| `docker-compose.extra.yml` | Optional overrides — auto-loaded by ClawDock helpers if present            |

### Config Files

| File                        | Purpose                                          | Examples                                                            |
| --------------------------- | ------------------------------------------------ | ------------------------------------------------------------------- |
| `<project>/.env`            | **Docker infra** — image, ports, gateway token   | `WILDVINE_GATEWAY_TOKEN`, `WILDVINE_IMAGE`, `WILDVINE_GATEWAY_PORT` |
| `~/.wildvine/.env`          | **Secrets** — API keys and bot tokens            | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`         |
| `~/.wildvine/wildvine.json` | **Behavior config** — models, channels, policies | Model selection, WhatsApp allowlists, agent settings                |

**Do NOT** put API keys or bot tokens in `wildvine.json`. Use `~/.wildvine/.env` for all secrets.

### Initial Setup

`./docker-setup.sh` (in the project root) handles first-time Docker configuration:

- Builds the `wildvine:local` image from `Dockerfile`
- Creates `<project>/.env` from `.env.example` with a generated gateway token
- Sets up `~/.wildvine` directories if they don't exist

```bash
./docker-setup.sh
```

After setup, add your API keys:

```bash
vim ~/.wildvine/.env
```

See `.env.example` for all supported keys.

The `Dockerfile` supports two optional build args:

- `WILDVINE_DOCKER_APT_PACKAGES` — extra apt packages to install (e.g. `ffmpeg`)
- `WILDVINE_INSTALL_BROWSER=1` — pre-install Chromium for browser automation (adds ~300MB, but skips the 60-90s Playwright install on each container start)

### How It Works in Docker

`docker-compose.yml` bind-mounts both config and workspace from the host:

```yaml
volumes:
  - ${WILDVINE_CONFIG_DIR}:/home/node/.wildvine
  - ${WILDVINE_WORKSPACE_DIR}:/home/node/.wildvine/workspace
```

This means:

- `~/.wildvine/.env` is available inside the container at `/home/node/.wildvine/.env` — Wildvine loads it automatically as the global env fallback
- `~/.wildvine/wildvine.json` is available at `/home/node/.wildvine/wildvine.json` — the gateway watches it and hot-reloads most changes
- No need to add API keys to `docker-compose.yml` or configure anything inside the container
- Keys survive `vinedock-update`, `vinedock-rebuild`, and `vinedock-clean` because they live on the host

The project `.env` feeds Docker Compose directly (gateway token, image name, ports). The `~/.wildvine/.env` feeds the Wildvine process inside the container.

### Example `~/.wildvine/.env`

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
TELEGRAM_BOT_TOKEN=123456:ABCDEF...
```

### Example `<project>/.env`

```bash
WILDVINE_CONFIG_DIR=/Users/you/.wildvine
WILDVINE_WORKSPACE_DIR=/Users/you/.wildvine/workspace
WILDVINE_GATEWAY_PORT=18789
WILDVINE_BRIDGE_PORT=18790
WILDVINE_GATEWAY_BIND=lan
WILDVINE_GATEWAY_TOKEN=<generated-by-docker-setup>
WILDVINE_IMAGE=wildvine:local
```

### Env Precedence

Wildvine loads env vars in this order (highest wins, never overrides existing):

1. **Process environment** — `docker-compose.yml` `environment:` block (gateway token, session keys)
2. **`.env` in CWD** — project root `.env` (Docker infra vars)
3. **`~/.wildvine/.env`** — global secrets (API keys, bot tokens)
4. **`wildvine.json` `env` block** — inline vars, applied only if still missing
5. **Shell env import** — optional login-shell scrape (`WILDVINE_LOAD_SHELL_ENV=1`)

## Common Workflows

### Update Wildvine

> **Important:** `wildvine update` does not work inside Docker.
> The container runs as a non-root user with a source-built image, so `npm i -g` fails with EACCES.
> Use `vinedock-update` instead — it pulls, rebuilds, and restarts from the host.

```bash
vinedock-update
```

This runs `git pull` → `docker compose build` → `docker compose down/up` in one step.

If you only want to rebuild without pulling:

```bash
vinedock-rebuild && vinedock-stop && vinedock-start
```

### Check Status and Logs

**Restart the gateway:**

```bash
vinedock-restart
```

**Check container status:**

```bash
vinedock-status
```

**View live logs:**

```bash
vinedock-logs
```

### Set Up WhatsApp Bot

**Shell into the container:**

```bash
vinedock-shell
```

**Inside the container, login to WhatsApp:**

```bash
wildvine channels login --channel whatsapp --verbose
```

Scan the QR code with WhatsApp on your phone.

**Verify connection:**

```bash
wildvine status
```

### Troubleshooting Device Pairing

**Check for pending pairing requests:**

```bash
vinedock-devices
```

**Copy the Request ID from the "Pending" table, then approve:**

```bash
vinedock-approve <request-id>
```

Then refresh your browser.

### Fix Token Mismatch Issues

If you see "gateway token mismatch" errors:

```bash
vinedock-fix-token
```

This will:

1. Read the token from your `.env` file
2. Configure it in the Wildvine config
3. Restart the gateway
4. Verify the configuration

### Permission Denied

**Ensure Docker is running and you have permission:**

```bash
docker ps
```

## Requirements

- Docker and Docker Compose installed
- Bash or Zsh shell
- Wildvine project (run `scripts/docker/setup.sh`)

## Development

**Test with fresh config (mimics first-time install):**

```bash
unset CLAWDOCK_DIR && rm -f ~/.vinedock/config && source scripts/vinedock/vinedock-helpers.sh
```

Then run any command to trigger auto-detect:

```bash
vinedock-start
```
