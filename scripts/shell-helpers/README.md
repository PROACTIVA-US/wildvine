# WildvineDock <!-- omit in toc -->

Stop typing `docker-compose` commands. Just type `wildvinedock-start`.

Inspired by Simon Willison's [Running Wildvine in Docker](https://til.simonwillison.net/llms/wildvine-docker).

- [Quickstart](#quickstart)
- [Available Commands](#available-commands)
  - [Basic Operations](#basic-operations)
  - [Container Access](#container-access)
  - [Web UI \& Devices](#web-ui--devices)
  - [Setup \& Configuration](#setup--configuration)
  - [Maintenance](#maintenance)
  - [Utilities](#utilities)
- [Common Workflows](#common-workflows)
  - [Check Status and Logs](#check-status-and-logs)
  - [Set Up WhatsApp Bot](#set-up-whatsapp-bot)
  - [Troubleshooting Device Pairing](#troubleshooting-device-pairing)
  - [Fix Token Mismatch Issues](#fix-token-mismatch-issues)
  - [Permission Denied](#permission-denied)
- [Requirements](#requirements)

## Quickstart

**Install:**

```bash
mkdir -p ~/.wildvinedock && curl -sL https://raw.githubusercontent.com/wildvine/wildvine/main/scripts/shell-helpers/wildvinedock-helpers.sh -o ~/.wildvinedock/wildvinedock-helpers.sh
```

```bash
echo 'source ~/.wildvinedock/wildvinedock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

**See what you get:**

```bash
wildvinedock-help
```

On first command, WildvineDock auto-detects your Wildvine directory:

- Checks common paths (`~/wildvine`, `~/workspace/wildvine`, etc.)
- If found, asks you to confirm
- Saves to `~/.wildvinedock/config`

**First time setup:**

```bash
wildvinedock-start
```

```bash
wildvinedock-fix-token
```

```bash
wildvinedock-dashboard
```

If you see "pairing required":

```bash
wildvinedock-devices
```

And approve the request for the specific device:

```bash
wildvinedock-approve <request-id>
```

## Available Commands

### Basic Operations

| Command                | Description                     |
| ---------------------- | ------------------------------- |
| `wildvinedock-start`   | Start the gateway               |
| `wildvinedock-stop`    | Stop the gateway                |
| `wildvinedock-restart` | Restart the gateway             |
| `wildvinedock-status`  | Check container status          |
| `wildvinedock-logs`    | View live logs (follows output) |

### Container Access

| Command                       | Description                                    |
| ----------------------------- | ---------------------------------------------- |
| `wildvinedock-shell`          | Interactive shell inside the gateway container |
| `wildvinedock-cli <command>`  | Run Wildvine CLI commands                      |
| `wildvinedock-exec <command>` | Execute arbitrary commands in the container    |

### Web UI & Devices

| Command                     | Description                                |
| --------------------------- | ------------------------------------------ |
| `wildvinedock-dashboard`    | Open web UI in browser with authentication |
| `wildvinedock-devices`      | List device pairing requests               |
| `wildvinedock-approve <id>` | Approve a device pairing request           |

### Setup & Configuration

| Command                  | Description                                       |
| ------------------------ | ------------------------------------------------- |
| `wildvinedock-fix-token` | Configure gateway authentication token (run once) |

### Maintenance

| Command                | Description                                      |
| ---------------------- | ------------------------------------------------ |
| `wildvinedock-rebuild` | Rebuild the Docker image                         |
| `wildvinedock-clean`   | Remove all containers and volumes (destructive!) |

### Utilities

| Command                  | Description                               |
| ------------------------ | ----------------------------------------- |
| `wildvinedock-health`    | Run gateway health check                  |
| `wildvinedock-token`     | Display the gateway authentication token  |
| `wildvinedock-cd`        | Jump to the Wildvine project directory    |
| `wildvinedock-config`    | Open the Wildvine config directory        |
| `wildvinedock-workspace` | Open the workspace directory              |
| `wildvinedock-help`      | Show all available commands with examples |

## Common Workflows

### Check Status and Logs

**Restart the gateway:**

```bash
wildvinedock-restart
```

**Check container status:**

```bash
wildvinedock-status
```

**View live logs:**

```bash
wildvinedock-logs
```

### Set Up WhatsApp Bot

**Shell into the container:**

```bash
wildvinedock-shell
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
wildvinedock-devices
```

**Copy the Request ID from the "Pending" table, then approve:**

```bash
wildvinedock-approve <request-id>
```

Then refresh your browser.

### Fix Token Mismatch Issues

If you see "gateway token mismatch" errors:

```bash
wildvinedock-fix-token
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
- Wildvine project (from `docker-setup.sh`)

## Development

**Test with fresh config (mimics first-time install):**

```bash
unset WILDVINEDOCK_DIR && rm -f ~/.wildvinedock/config && source scripts/shell-helpers/wildvinedock-helpers.sh
```

Then run any command to trigger auto-detect:

```bash
wildvinedock-start
```
