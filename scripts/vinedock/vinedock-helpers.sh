#!/usr/bin/env bash
# ClawDock - Docker helpers for Wildvine
# Inspired by Simon Willison's "Running Wildvine in Docker"
# https://til.simonwillison.net/llms/wildvine-docker
#
# Installation:
#   mkdir -p ~/.vinedock && curl -sL https://raw.githubusercontent.com/wildvine/wildvine/main/scripts/vinedock/vinedock-helpers.sh -o ~/.vinedock/vinedock-helpers.sh
#   echo 'source ~/.vinedock/vinedock-helpers.sh' >> ~/.zshrc
#
# Usage:
#   vinedock-help    # Show all available commands

# =============================================================================
# Colors
# =============================================================================
_CLR_RESET='\033[0m'
_CLR_BOLD='\033[1m'
_CLR_DIM='\033[2m'
_CLR_GREEN='\033[0;32m'
_CLR_YELLOW='\033[1;33m'
_CLR_BLUE='\033[0;34m'
_CLR_MAGENTA='\033[0;35m'
_CLR_CYAN='\033[0;36m'
_CLR_RED='\033[0;31m'

# Styled command output (green + bold)
_clr_cmd() {
  echo -e "${_CLR_GREEN}${_CLR_BOLD}$1${_CLR_RESET}"
}

# Inline command for use in sentences
_cmd() {
  echo "${_CLR_GREEN}${_CLR_BOLD}$1${_CLR_RESET}"
}

# =============================================================================
# Config
# =============================================================================
CLAWDOCK_CONFIG="${HOME}/.vinedock/config"

# Common paths to check for Wildvine
CLAWDOCK_COMMON_PATHS=(
  "${HOME}/wildvine"
  "${HOME}/workspace/wildvine"
  "${HOME}/projects/wildvine"
  "${HOME}/dev/wildvine"
  "${HOME}/code/wildvine"
  "${HOME}/src/wildvine"
)

_vinedock_filter_warnings() {
  grep -v "^WARN\|^time="
}

_vinedock_trim_quotes() {
  local value="$1"
  value="${value#\"}"
  value="${value%\"}"
  printf "%s" "$value"
}

_vinedock_mask_value() {
  local value="$1"
  local length=${#value}
  if (( length == 0 )); then
    printf "%s" "<empty>"
    return 0
  fi
  if (( length == 1 )); then
    printf "%s" "<redacted:1 char>"
    return 0
  fi
  printf "%s" "<redacted:${length} chars>"
}

_vinedock_read_config_dir() {
  if [[ ! -f "$CLAWDOCK_CONFIG" ]]; then
    return 1
  fi
  local raw
  raw=$(sed -n 's/^CLAWDOCK_DIR=//p' "$CLAWDOCK_CONFIG" | head -n 1)
  if [[ -z "$raw" ]]; then
    return 1
  fi
  _vinedock_trim_quotes "$raw"
}

# Ensure CLAWDOCK_DIR is set and valid
_vinedock_ensure_dir() {
  # Already set and valid?
  if [[ -n "$CLAWDOCK_DIR" && -f "${CLAWDOCK_DIR}/docker-compose.yml" ]]; then
    return 0
  fi

  # Try loading from config
  local config_dir
  config_dir=$(_vinedock_read_config_dir)
  if [[ -n "$config_dir" && -f "${config_dir}/docker-compose.yml" ]]; then
    CLAWDOCK_DIR="$config_dir"
    return 0
  fi

  # Auto-detect from common paths
  local found_path=""
  for path in "${CLAWDOCK_COMMON_PATHS[@]}"; do
    if [[ -f "${path}/docker-compose.yml" ]]; then
      found_path="$path"
      break
    fi
  done

  if [[ -n "$found_path" ]]; then
    echo ""
    echo "🦞 Found Wildvine at: $found_path"
    echo -n "   Use this location? [Y/n] "
    read -r response
    if [[ "$response" =~ ^[Nn] ]]; then
      echo ""
      echo "Set CLAWDOCK_DIR manually:"
      echo "  export CLAWDOCK_DIR=/path/to/wildvine"
      return 1
    fi
    CLAWDOCK_DIR="$found_path"
  else
    echo ""
    echo "❌ Wildvine not found in common locations."
    echo ""
    echo "Clone it first:"
    echo ""
    echo "  git clone https://github.com/PROACTIVA-US/wildvine.git ~/wildvine"
    echo "  cd ~/wildvine && ./scripts/docker/setup.sh"
    echo ""
    echo "Or set CLAWDOCK_DIR if it's elsewhere:"
    echo ""
    echo "  export CLAWDOCK_DIR=/path/to/wildvine"
    echo ""
    return 1
  fi

  # Save to config
  if [[ ! -d "${HOME}/.vinedock" ]]; then
    /bin/mkdir -p "${HOME}/.vinedock"
  fi
  echo "CLAWDOCK_DIR=\"$CLAWDOCK_DIR\"" > "$CLAWDOCK_CONFIG"
  echo "✅ Saved to $CLAWDOCK_CONFIG"
  echo ""
  return 0
}

# Wrapper to run docker compose commands
_vinedock_compose() {
  _vinedock_ensure_dir || return 1
  local compose_args=(-f "${CLAWDOCK_DIR}/docker-compose.yml")
  if [[ -f "${CLAWDOCK_DIR}/docker-compose.extra.yml" ]]; then
    compose_args+=(-f "${CLAWDOCK_DIR}/docker-compose.extra.yml")
  fi
  command docker compose "${compose_args[@]}" "$@"
}

_vinedock_read_env_token() {
  _vinedock_ensure_dir || return 1
  if [[ ! -f "${CLAWDOCK_DIR}/.env" ]]; then
    return 1
  fi
  local raw
  raw=$(sed -n 's/^WILDVINE_GATEWAY_TOKEN=//p' "${CLAWDOCK_DIR}/.env" | head -n 1)
  if [[ -z "$raw" ]]; then
    return 1
  fi
  _vinedock_trim_quotes "$raw"
}

# Basic Operations
vinedock-start() {
  _vinedock_compose up -d wildvine-gateway
}

vinedock-stop() {
  _vinedock_compose down
}

vinedock-restart() {
  _vinedock_compose restart wildvine-gateway
}

vinedock-logs() {
  _vinedock_compose logs -f wildvine-gateway
}

vinedock-status() {
  _vinedock_compose ps
}

# Navigation
vinedock-cd() {
  _vinedock_ensure_dir || return 1
  cd "${CLAWDOCK_DIR}"
}

vinedock-config() {
  cd ~/.wildvine
}

vinedock-show-config() {
  _vinedock_ensure_dir >/dev/null 2>&1 || true
  local config_dir="${HOME}/.wildvine"
  echo -e "${_CLR_BOLD}Config directory:${_CLR_RESET} ${_CLR_CYAN}${config_dir}${_CLR_RESET}"
  echo ""

  # Show wildvine.json
  if [[ -f "${config_dir}/wildvine.json" ]]; then
    echo -e "${_CLR_BOLD}${config_dir}/wildvine.json${_CLR_RESET}"
    echo -e "${_CLR_DIM}$(cat "${config_dir}/wildvine.json")${_CLR_RESET}"
  else
    echo -e "${_CLR_YELLOW}No wildvine.json found${_CLR_RESET}"
  fi
  echo ""

  # Show .env (mask secret values)
  if [[ -f "${config_dir}/.env" ]]; then
    echo -e "${_CLR_BOLD}${config_dir}/.env${_CLR_RESET}"
    while IFS= read -r line || [[ -n "$line" ]]; do
      if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "$line" ]]; then
        echo -e "${_CLR_DIM}${line}${_CLR_RESET}"
      elif [[ "$line" == *=* ]]; then
        local key="${line%%=*}"
        local val="${line#*=}"
        echo -e "${_CLR_CYAN}${key}${_CLR_RESET}=${_CLR_DIM}$(_vinedock_mask_value "$val")${_CLR_RESET}"
      else
        echo -e "${_CLR_DIM}${line}${_CLR_RESET}"
      fi
    done < "${config_dir}/.env"
  else
    echo -e "${_CLR_YELLOW}No .env found${_CLR_RESET}"
  fi
  echo ""

  # Show project .env if available
  if [[ -n "$CLAWDOCK_DIR" && -f "${CLAWDOCK_DIR}/.env" ]]; then
    echo -e "${_CLR_BOLD}${CLAWDOCK_DIR}/.env${_CLR_RESET}"
    while IFS= read -r line || [[ -n "$line" ]]; do
      if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "$line" ]]; then
        echo -e "${_CLR_DIM}${line}${_CLR_RESET}"
      elif [[ "$line" == *=* ]]; then
        local key="${line%%=*}"
        local val="${line#*=}"
        echo -e "${_CLR_CYAN}${key}${_CLR_RESET}=${_CLR_DIM}$(_vinedock_mask_value "$val")${_CLR_RESET}"
      else
        echo -e "${_CLR_DIM}${line}${_CLR_RESET}"
      fi
    done < "${CLAWDOCK_DIR}/.env"
  fi
  echo ""
}

vinedock-workspace() {
  cd ~/.wildvine/workspace
}

# Container Access
vinedock-shell() {
  _vinedock_compose exec wildvine-gateway \
    bash -c 'echo "alias wildvine=\"./wildvine.mjs\"" > /tmp/.bashrc_wildvine && bash --rcfile /tmp/.bashrc_wildvine'
}

vinedock-exec() {
  _vinedock_compose exec wildvine-gateway "$@"
}

vinedock-cli() {
  _vinedock_compose run --rm wildvine-cli "$@"
}

# Maintenance
vinedock-update() {
  _vinedock_ensure_dir || return 1

  echo "🔄 Updating Wildvine..."

  echo ""
  echo "📥 Pulling latest source..."
  git -C "${CLAWDOCK_DIR}" pull || { echo "❌ git pull failed"; return 1; }

  echo ""
  echo "🔨 Rebuilding Docker image (this may take a few minutes)..."
  _vinedock_compose build wildvine-gateway || { echo "❌ Build failed"; return 1; }

  echo ""
  echo "♻️  Recreating container with new image..."
  _vinedock_compose down 2>&1 | _vinedock_filter_warnings
  _vinedock_compose up -d wildvine-gateway 2>&1 | _vinedock_filter_warnings

  echo ""
  echo "⏳ Waiting for gateway to start..."
  sleep 5

  echo "✅ Update complete!"
  echo -e "   Verify: $(_cmd vinedock-cli status)"
}

vinedock-rebuild() {
  _vinedock_compose build wildvine-gateway
}

vinedock-clean() {
  _vinedock_compose down -v --remove-orphans
}

# Health check
vinedock-health() {
  _vinedock_ensure_dir || return 1
  local token
  token=$(_vinedock_read_env_token)
  if [[ -z "$token" ]]; then
    echo "❌ Error: Could not find gateway token"
    echo "   Check: ${CLAWDOCK_DIR}/.env"
    return 1
  fi
  _vinedock_compose exec -e "WILDVINE_GATEWAY_TOKEN=$token" wildvine-gateway \
    node dist/index.js health
}

# Show gateway token
vinedock-token() {
  _vinedock_read_env_token
}

# Fix token configuration (run this once after setup)
vinedock-fix-token() {
  _vinedock_ensure_dir || return 1

  echo "🔧 Configuring gateway token..."
  local token
  token=$(vinedock-token)
  if [[ -z "$token" ]]; then
    echo "❌ Error: Could not find gateway token"
    echo "   Check: ${CLAWDOCK_DIR}/.env"
    return 1
  fi

  echo "📝 Setting token: ${token:0:20}..."

  _vinedock_compose exec -e "TOKEN=$token" wildvine-gateway \
    bash -c './wildvine.mjs config set gateway.remote.token "$TOKEN" && ./wildvine.mjs config set gateway.auth.token "$TOKEN"' 2>&1 | _vinedock_filter_warnings

  echo "🔍 Verifying token was saved..."
  local saved_token
  saved_token=$(_vinedock_compose exec wildvine-gateway \
    bash -c "./wildvine.mjs config get gateway.remote.token 2>/dev/null" 2>&1 | _vinedock_filter_warnings | tr -d '\r\n' | head -c 64)

  if [[ "$saved_token" == "$token" ]]; then
    echo "✅ Token saved correctly!"
  else
    echo "⚠️  Token mismatch detected"
    echo "   Expected: ${token:0:20}..."
    echo "   Got: ${saved_token:0:20}..."
  fi

  echo "🔄 Restarting gateway..."
  _vinedock_compose restart wildvine-gateway 2>&1 | _vinedock_filter_warnings

  echo "⏳ Waiting for gateway to start..."
  sleep 5

  echo "✅ Configuration complete!"
  echo -e "   Try: $(_cmd vinedock-devices)"
}

# Open dashboard in browser
vinedock-dashboard() {
  _vinedock_ensure_dir || return 1

  echo "🦞 Getting dashboard URL..."
  local output exit_status url
  output=$(_vinedock_compose run --rm wildvine-cli dashboard --no-open 2>&1)
  exit_status=$?
  url=$(printf "%s\n" "$output" | _vinedock_filter_warnings | grep -o 'http[s]\?://[^[:space:]]*' | head -n 1)
  if [[ $exit_status -ne 0 ]]; then
    echo "❌ Failed to get dashboard URL"
    echo -e "   Try restarting: $(_cmd vinedock-restart)"
    return 1
  fi

  if [[ -n "$url" ]]; then
    echo -e "✅ Opening: ${_CLR_CYAN}${url}${_CLR_RESET}"
    open "$url" 2>/dev/null || xdg-open "$url" 2>/dev/null || echo -e "   Please open manually: ${_CLR_CYAN}${url}${_CLR_RESET}"
    echo ""
    echo -e "${_CLR_CYAN}💡 If you see ${_CLR_RED}'pairing required'${_CLR_CYAN} error:${_CLR_RESET}"
    echo -e "   1. Run: $(_cmd vinedock-devices)"
    echo "   2. Copy the Request ID from the Pending table"
    echo -e "   3. Run: $(_cmd 'vinedock-approve <request-id>')"
  else
    echo "❌ Failed to get dashboard URL"
    echo -e "   Try restarting: $(_cmd vinedock-restart)"
  fi
}

# List device pairings
vinedock-devices() {
  _vinedock_ensure_dir || return 1

  echo "🔍 Checking device pairings..."
  local output exit_status
  output=$(_vinedock_compose exec wildvine-gateway node dist/index.js devices list 2>&1)
  exit_status=$?
  printf "%s\n" "$output" | _vinedock_filter_warnings
  if [ $exit_status -ne 0 ]; then
    echo ""
    echo -e "${_CLR_CYAN}💡 If you see token errors above:${_CLR_RESET}"
    echo -e "   1. Verify token is set: $(_cmd vinedock-token)"
    echo -e "   2. Try fixing the token automatically: $(_cmd vinedock-fix-token)"
    echo "   3. If you still see errors, try manual config inside container:"
    echo -e "      $(_cmd vinedock-shell)"
    echo -e "      $(_cmd 'wildvine config get gateway.remote.token')"
    return 1
  fi

  echo ""
  echo -e "${_CLR_CYAN}💡 To approve a pairing request:${_CLR_RESET}"
  echo -e "   $(_cmd 'vinedock-approve <request-id>')"
}

# Approve device pairing request
vinedock-approve() {
  _vinedock_ensure_dir || return 1

  if [[ -z "$1" ]]; then
    echo -e "❌ Usage: $(_cmd 'vinedock-approve <request-id>')"
    echo ""
    echo -e "${_CLR_CYAN}💡 How to approve a device:${_CLR_RESET}"
    echo -e "   1. Run: $(_cmd vinedock-devices)"
    echo "   2. Find the Request ID in the Pending table (long UUID)"
    echo -e "   3. Run: $(_cmd 'vinedock-approve <that-request-id>')"
    echo ""
    echo "Example:"
    echo -e "   $(_cmd 'vinedock-approve 6f9db1bd-a1cc-4d3f-b643-2c195262464e')"
    return 1
  fi

  echo "✅ Approving device: $1"
  _vinedock_compose exec wildvine-gateway \
    node dist/index.js devices approve "$1" 2>&1 | _vinedock_filter_warnings

  echo ""
  echo "✅ Device approved! Refresh your browser."
}

# Show all available vinedock helper commands
vinedock-help() {
  echo -e "\n${_CLR_BOLD}${_CLR_CYAN}🦞 ClawDock - Docker Helpers for Wildvine${_CLR_RESET}\n"

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}⚡ Basic Operations${_CLR_RESET}"
  echo -e "  $(_cmd vinedock-start)       ${_CLR_DIM}Start the gateway${_CLR_RESET}"
  echo -e "  $(_cmd vinedock-stop)        ${_CLR_DIM}Stop the gateway${_CLR_RESET}"
  echo -e "  $(_cmd vinedock-restart)     ${_CLR_DIM}Restart the gateway${_CLR_RESET}"
  echo -e "  $(_cmd vinedock-status)      ${_CLR_DIM}Check container status${_CLR_RESET}"
  echo -e "  $(_cmd vinedock-logs)        ${_CLR_DIM}View live logs (follows)${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}🐚 Container Access${_CLR_RESET}"
  echo -e "  $(_cmd vinedock-shell)       ${_CLR_DIM}Shell into container (wildvine alias ready)${_CLR_RESET}"
  echo -e "  $(_cmd vinedock-cli)         ${_CLR_DIM}Run CLI commands (e.g., vinedock-cli status)${_CLR_RESET}"
  echo -e "  $(_cmd vinedock-exec) ${_CLR_CYAN}<cmd>${_CLR_RESET}  ${_CLR_DIM}Execute command in gateway container${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}🌐 Web UI & Devices${_CLR_RESET}"
  echo -e "  $(_cmd vinedock-dashboard)   ${_CLR_DIM}Open web UI in browser ${_CLR_CYAN}(auto-guides you)${_CLR_RESET}"
  echo -e "  $(_cmd vinedock-devices)     ${_CLR_DIM}List device pairings ${_CLR_CYAN}(auto-guides you)${_CLR_RESET}"
  echo -e "  $(_cmd vinedock-approve) ${_CLR_CYAN}<id>${_CLR_RESET} ${_CLR_DIM}Approve device pairing ${_CLR_CYAN}(with examples)${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}⚙️  Setup & Configuration${_CLR_RESET}"
  echo -e "  $(_cmd vinedock-fix-token)   ${_CLR_DIM}Configure gateway token ${_CLR_CYAN}(run once)${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}🔧 Maintenance${_CLR_RESET}"
  echo -e "  $(_cmd vinedock-update)      ${_CLR_DIM}Pull, rebuild, and restart ${_CLR_CYAN}(one-command update)${_CLR_RESET}"
  echo -e "  $(_cmd vinedock-rebuild)     ${_CLR_DIM}Rebuild Docker image only${_CLR_RESET}"
  echo -e "  $(_cmd vinedock-clean)       ${_CLR_RED}⚠️  Remove containers & volumes (nuclear)${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}🛠️  Utilities${_CLR_RESET}"
  echo -e "  $(_cmd vinedock-health)      ${_CLR_DIM}Run health check${_CLR_RESET}"
  echo -e "  $(_cmd vinedock-token)       ${_CLR_DIM}Show gateway auth token${_CLR_RESET}"
  echo -e "  $(_cmd vinedock-cd)          ${_CLR_DIM}Jump to wildvine project directory${_CLR_RESET}"
  echo -e "  $(_cmd vinedock-config)      ${_CLR_DIM}Open config directory (~/.wildvine)${_CLR_RESET}"
  echo -e "  $(_cmd vinedock-show-config) ${_CLR_DIM}Print config files with redacted values${_CLR_RESET}"
  echo -e "  $(_cmd vinedock-workspace)   ${_CLR_DIM}Open workspace directory${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${_CLR_RESET}"
  echo -e "${_CLR_BOLD}${_CLR_GREEN}🚀 First Time Setup${_CLR_RESET}"
  echo -e "${_CLR_CYAN}  1.${_CLR_RESET} $(_cmd vinedock-start)          ${_CLR_DIM}# Start the gateway${_CLR_RESET}"
  echo -e "${_CLR_CYAN}  2.${_CLR_RESET} $(_cmd vinedock-fix-token)      ${_CLR_DIM}# Configure token${_CLR_RESET}"
  echo -e "${_CLR_CYAN}  3.${_CLR_RESET} $(_cmd vinedock-dashboard)      ${_CLR_DIM}# Open web UI${_CLR_RESET}"
  echo -e "${_CLR_CYAN}  4.${_CLR_RESET} $(_cmd vinedock-devices)        ${_CLR_DIM}# If pairing needed${_CLR_RESET}"
  echo -e "${_CLR_CYAN}  5.${_CLR_RESET} $(_cmd vinedock-approve) ${_CLR_CYAN}<id>${_CLR_RESET}   ${_CLR_DIM}# Approve pairing${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_GREEN}💬 WhatsApp Setup${_CLR_RESET}"
  echo -e "  $(_cmd vinedock-shell)"
  echo -e "    ${_CLR_BLUE}>${_CLR_RESET} $(_cmd 'wildvine channels login --channel whatsapp')"
  echo -e "    ${_CLR_BLUE}>${_CLR_RESET} $(_cmd 'wildvine status')"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_CYAN}💡 All commands guide you through next steps!${_CLR_RESET}"
  echo -e "${_CLR_BLUE}📚 Docs: ${_CLR_RESET}${_CLR_CYAN}https://docs.wildvine.com${_CLR_RESET}"
  echo ""
}
