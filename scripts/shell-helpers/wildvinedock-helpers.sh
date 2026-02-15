#!/usr/bin/env bash
# WildvineDock - Docker helpers for Wildvine
# Inspired by Simon Willison's "Running Wildvine in Docker"
# https://til.simonwillison.net/llms/wildvine-docker
#
# Installation:
#   mkdir -p ~/.wildvinedock && curl -sL https://raw.githubusercontent.com/wildvine/wildvine/main/scripts/shell-helpers/wildvinedock-helpers.sh -o ~/.wildvinedock/wildvinedock-helpers.sh
#   echo 'source ~/.wildvinedock/wildvinedock-helpers.sh' >> ~/.zshrc
#
# Usage:
#   wildvinedock-help    # Show all available commands

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
WILDVINEDOCK_CONFIG="${HOME}/.wildvinedock/config"

# Common paths to check for Wildvine
WILDVINEDOCK_COMMON_PATHS=(
  "${HOME}/wildvine"
  "${HOME}/workspace/wildvine"
  "${HOME}/projects/wildvine"
  "${HOME}/dev/wildvine"
  "${HOME}/code/wildvine"
  "${HOME}/src/wildvine"
)

_wildvinedock_filter_warnings() {
  grep -v "^WARN\|^time="
}

_wildvinedock_trim_quotes() {
  local value="$1"
  value="${value#\"}"
  value="${value%\"}"
  printf "%s" "$value"
}

_wildvinedock_read_config_dir() {
  if [[ ! -f "$WILDVINEDOCK_CONFIG" ]]; then
    return 1
  fi
  local raw
  raw=$(sed -n 's/^WILDVINEDOCK_DIR=//p' "$WILDVINEDOCK_CONFIG" | head -n 1)
  if [[ -z "$raw" ]]; then
    return 1
  fi
  _wildvinedock_trim_quotes "$raw"
}

# Ensure WILDVINEDOCK_DIR is set and valid
_wildvinedock_ensure_dir() {
  # Already set and valid?
  if [[ -n "$WILDVINEDOCK_DIR" && -f "${WILDVINEDOCK_DIR}/docker-compose.yml" ]]; then
    return 0
  fi

  # Try loading from config
  local config_dir
  config_dir=$(_wildvinedock_read_config_dir)
  if [[ -n "$config_dir" && -f "${config_dir}/docker-compose.yml" ]]; then
    WILDVINEDOCK_DIR="$config_dir"
    return 0
  fi

  # Auto-detect from common paths
  local found_path=""
  for path in "${WILDVINEDOCK_COMMON_PATHS[@]}"; do
    if [[ -f "${path}/docker-compose.yml" ]]; then
      found_path="$path"
      break
    fi
  done

  if [[ -n "$found_path" ]]; then
    echo ""
    echo "Found Wildvine at: $found_path"
    echo -n "   Use this location? [Y/n] "
    read -r response
    if [[ "$response" =~ ^[Nn] ]]; then
      echo ""
      echo "Set WILDVINEDOCK_DIR manually:"
      echo "  export WILDVINEDOCK_DIR=/path/to/wildvine"
      return 1
    fi
    WILDVINEDOCK_DIR="$found_path"
  else
    echo ""
    echo "❌ Wildvine not found in common locations."
    echo ""
    echo "Clone it first:"
    echo ""
    echo "  git clone https://github.com/wildvine/wildvine.git ~/wildvine"
    echo "  cd ~/wildvine && ./docker-setup.sh"
    echo ""
    echo "Or set WILDVINEDOCK_DIR if it's elsewhere:"
    echo ""
    echo "  export WILDVINEDOCK_DIR=/path/to/wildvine"
    echo ""
    return 1
  fi

  # Save to config
  if [[ ! -d "${HOME}/.wildvinedock" ]]; then
    /bin/mkdir -p "${HOME}/.wildvinedock"
  fi
  echo "WILDVINEDOCK_DIR=\"$WILDVINEDOCK_DIR\"" > "$WILDVINEDOCK_CONFIG"
  echo "✅ Saved to $WILDVINEDOCK_CONFIG"
  echo ""
  return 0
}

# Wrapper to run docker compose commands
_wildvinedock_compose() {
  _wildvinedock_ensure_dir || return 1
  command docker compose -f "${WILDVINEDOCK_DIR}/docker-compose.yml" "$@"
}

_wildvinedock_read_env_token() {
  _wildvinedock_ensure_dir || return 1
  if [[ ! -f "${WILDVINEDOCK_DIR}/.env" ]]; then
    return 1
  fi
  local raw
  raw=$(sed -n 's/^WILDVINE_GATEWAY_TOKEN=//p' "${WILDVINEDOCK_DIR}/.env" | head -n 1)
  if [[ -z "$raw" ]]; then
    return 1
  fi
  _wildvinedock_trim_quotes "$raw"
}

# Basic Operations
wildvinedock-start() {
  _wildvinedock_compose up -d wildvine-gateway
}

wildvinedock-stop() {
  _wildvinedock_compose down
}

wildvinedock-restart() {
  _wildvinedock_compose restart wildvine-gateway
}

wildvinedock-logs() {
  _wildvinedock_compose logs -f wildvine-gateway
}

wildvinedock-status() {
  _wildvinedock_compose ps
}

# Navigation
wildvinedock-cd() {
  _wildvinedock_ensure_dir || return 1
  cd "${WILDVINEDOCK_DIR}"
}

wildvinedock-config() {
  cd ~/.wildvine
}

wildvinedock-workspace() {
  cd ~/.wildvine/workspace
}

# Container Access
wildvinedock-shell() {
  _wildvinedock_compose exec wildvine-gateway \
    bash -c 'echo "alias wildvine=\"./wildvine.mjs\"" > /tmp/.bashrc_wildvine && bash --rcfile /tmp/.bashrc_wildvine'
}

wildvinedock-exec() {
  _wildvinedock_compose exec wildvine-gateway "$@"
}

wildvinedock-cli() {
  _wildvinedock_compose run --rm wildvine-cli "$@"
}

# Maintenance
wildvinedock-rebuild() {
  _wildvinedock_compose build wildvine-gateway
}

wildvinedock-clean() {
  _wildvinedock_compose down -v --remove-orphans
}

# Health check
wildvinedock-health() {
  _wildvinedock_ensure_dir || return 1
  local token
  token=$(_wildvinedock_read_env_token)
  if [[ -z "$token" ]]; then
    echo "❌ Error: Could not find gateway token"
    echo "   Check: ${WILDVINEDOCK_DIR}/.env"
    return 1
  fi
  _wildvinedock_compose exec -e "WILDVINE_GATEWAY_TOKEN=$token" wildvine-gateway \
    node dist/index.js health
}

# Show gateway token
wildvinedock-token() {
  _wildvinedock_read_env_token
}

# Fix token configuration (run this once after setup)
wildvinedock-fix-token() {
  _wildvinedock_ensure_dir || return 1

  echo "🔧 Configuring gateway token..."
  local token
  token=$(wildvinedock-token)
  if [[ -z "$token" ]]; then
    echo "❌ Error: Could not find gateway token"
    echo "   Check: ${WILDVINEDOCK_DIR}/.env"
    return 1
  fi

  echo "📝 Setting token: ${token:0:20}..."

  _wildvinedock_compose exec -e "TOKEN=$token" wildvine-gateway \
    bash -c './wildvine.mjs config set gateway.remote.token "$TOKEN" && ./wildvine.mjs config set gateway.auth.token "$TOKEN"' 2>&1 | _wildvinedock_filter_warnings

  echo "🔍 Verifying token was saved..."
  local saved_token
  saved_token=$(_wildvinedock_compose exec wildvine-gateway \
    bash -c "./wildvine.mjs config get gateway.remote.token 2>/dev/null" 2>&1 | _wildvinedock_filter_warnings | tr -d '\r\n' | head -c 64)

  if [[ "$saved_token" == "$token" ]]; then
    echo "✅ Token saved correctly!"
  else
    echo "⚠️  Token mismatch detected"
    echo "   Expected: ${token:0:20}..."
    echo "   Got: ${saved_token:0:20}..."
  fi

  echo "🔄 Restarting gateway..."
  _wildvinedock_compose restart wildvine-gateway 2>&1 | _wildvinedock_filter_warnings

  echo "⏳ Waiting for gateway to start..."
  sleep 5

  echo "✅ Configuration complete!"
  echo -e "   Try: $(_cmd wildvinedock-devices)"
}

# Open dashboard in browser
wildvinedock-dashboard() {
  _wildvinedock_ensure_dir || return 1

  echo "Getting dashboard URL..."
  local output exit_status url
  output=$(_wildvinedock_compose run --rm wildvine-cli dashboard --no-open 2>&1)
  exit_status=$?
  url=$(printf "%s\n" "$output" | _wildvinedock_filter_warnings | grep -o 'http[s]\?://[^[:space:]]*' | head -n 1)
  if [[ $exit_status -ne 0 ]]; then
    echo "❌ Failed to get dashboard URL"
    echo -e "   Try restarting: $(_cmd wildvinedock-restart)"
    return 1
  fi

  if [[ -n "$url" ]]; then
    echo "✅ Opening: $url"
    open "$url" 2>/dev/null || xdg-open "$url" 2>/dev/null || echo "   Please open manually: $url"
    echo ""
    echo -e "${_CLR_CYAN}💡 If you see 'pairing required' error:${_CLR_RESET}"
    echo -e "   1. Run: $(_cmd wildvinedock-devices)"
    echo "   2. Copy the Request ID from the Pending table"
    echo -e "   3. Run: $(_cmd 'wildvinedock-approve <request-id>')"
  else
    echo "❌ Failed to get dashboard URL"
    echo -e "   Try restarting: $(_cmd wildvinedock-restart)"
  fi
}

# List device pairings
wildvinedock-devices() {
  _wildvinedock_ensure_dir || return 1

  echo "🔍 Checking device pairings..."
  local output exit_status
  output=$(_wildvinedock_compose exec wildvine-gateway node dist/index.js devices list 2>&1)
  exit_status=$?
  printf "%s\n" "$output" | _wildvinedock_filter_warnings
  if [ $exit_status -ne 0 ]; then
    echo ""
    echo -e "${_CLR_CYAN}💡 If you see token errors above:${_CLR_RESET}"
    echo -e "   1. Verify token is set: $(_cmd wildvinedock-token)"
    echo "   2. Try manual config inside container:"
    echo -e "      $(_cmd wildvinedock-shell)"
    echo -e "      $(_cmd 'wildvine config get gateway.remote.token')"
    return 1
  fi

  echo ""
  echo -e "${_CLR_CYAN}💡 To approve a pairing request:${_CLR_RESET}"
  echo -e "   $(_cmd 'wildvinedock-approve <request-id>')"
}

# Approve device pairing request
wildvinedock-approve() {
  _wildvinedock_ensure_dir || return 1

  if [[ -z "$1" ]]; then
    echo -e "❌ Usage: $(_cmd 'wildvinedock-approve <request-id>')"
    echo ""
    echo -e "${_CLR_CYAN}💡 How to approve a device:${_CLR_RESET}"
    echo -e "   1. Run: $(_cmd wildvinedock-devices)"
    echo "   2. Find the Request ID in the Pending table (long UUID)"
    echo -e "   3. Run: $(_cmd 'wildvinedock-approve <that-request-id>')"
    echo ""
    echo "Example:"
    echo -e "   $(_cmd 'wildvinedock-approve 6f9db1bd-a1cc-4d3f-b643-2c195262464e')"
    return 1
  fi

  echo "✅ Approving device: $1"
  _wildvinedock_compose exec wildvine-gateway \
    node dist/index.js devices approve "$1" 2>&1 | _wildvinedock_filter_warnings

  echo ""
  echo "✅ Device approved! Refresh your browser."
}

# Show all available wildvinedock helper commands
wildvinedock-help() {
  echo -e "\n${_CLR_BOLD}${_CLR_CYAN}WildvineDock - Docker Helpers for Wildvine${_CLR_RESET}\n"

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}⚡ Basic Operations${_CLR_RESET}"
  echo -e "  $(_cmd wildvinedock-start)       ${_CLR_DIM}Start the gateway${_CLR_RESET}"
  echo -e "  $(_cmd wildvinedock-stop)        ${_CLR_DIM}Stop the gateway${_CLR_RESET}"
  echo -e "  $(_cmd wildvinedock-restart)     ${_CLR_DIM}Restart the gateway${_CLR_RESET}"
  echo -e "  $(_cmd wildvinedock-status)      ${_CLR_DIM}Check container status${_CLR_RESET}"
  echo -e "  $(_cmd wildvinedock-logs)        ${_CLR_DIM}View live logs (follows)${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}🐚 Container Access${_CLR_RESET}"
  echo -e "  $(_cmd wildvinedock-shell)       ${_CLR_DIM}Shell into container (wildvine alias ready)${_CLR_RESET}"
  echo -e "  $(_cmd wildvinedock-cli)         ${_CLR_DIM}Run CLI commands (e.g., wildvinedock-cli status)${_CLR_RESET}"
  echo -e "  $(_cmd wildvinedock-exec) ${_CLR_CYAN}<cmd>${_CLR_RESET}  ${_CLR_DIM}Execute command in gateway container${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}🌐 Web UI & Devices${_CLR_RESET}"
  echo -e "  $(_cmd wildvinedock-dashboard)   ${_CLR_DIM}Open web UI in browser ${_CLR_CYAN}(auto-guides you)${_CLR_RESET}"
  echo -e "  $(_cmd wildvinedock-devices)     ${_CLR_DIM}List device pairings ${_CLR_CYAN}(auto-guides you)${_CLR_RESET}"
  echo -e "  $(_cmd wildvinedock-approve) ${_CLR_CYAN}<id>${_CLR_RESET} ${_CLR_DIM}Approve device pairing ${_CLR_CYAN}(with examples)${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}⚙️  Setup & Configuration${_CLR_RESET}"
  echo -e "  $(_cmd wildvinedock-fix-token)   ${_CLR_DIM}Configure gateway token ${_CLR_CYAN}(run once)${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}🔧 Maintenance${_CLR_RESET}"
  echo -e "  $(_cmd wildvinedock-rebuild)     ${_CLR_DIM}Rebuild Docker image${_CLR_RESET}"
  echo -e "  $(_cmd wildvinedock-clean)       ${_CLR_RED}⚠️  Remove containers & volumes (nuclear)${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}🛠️  Utilities${_CLR_RESET}"
  echo -e "  $(_cmd wildvinedock-health)      ${_CLR_DIM}Run health check${_CLR_RESET}"
  echo -e "  $(_cmd wildvinedock-token)       ${_CLR_DIM}Show gateway auth token${_CLR_RESET}"
  echo -e "  $(_cmd wildvinedock-cd)          ${_CLR_DIM}Jump to wildvine project directory${_CLR_RESET}"
  echo -e "  $(_cmd wildvinedock-config)      ${_CLR_DIM}Open config directory (~/.wildvine)${_CLR_RESET}"
  echo -e "  $(_cmd wildvinedock-workspace)   ${_CLR_DIM}Open workspace directory${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${_CLR_RESET}"
  echo -e "${_CLR_BOLD}${_CLR_GREEN}🚀 First Time Setup${_CLR_RESET}"
  echo -e "${_CLR_CYAN}  1.${_CLR_RESET} $(_cmd wildvinedock-start)          ${_CLR_DIM}# Start the gateway${_CLR_RESET}"
  echo -e "${_CLR_CYAN}  2.${_CLR_RESET} $(_cmd wildvinedock-fix-token)      ${_CLR_DIM}# Configure token${_CLR_RESET}"
  echo -e "${_CLR_CYAN}  3.${_CLR_RESET} $(_cmd wildvinedock-dashboard)      ${_CLR_DIM}# Open web UI${_CLR_RESET}"
  echo -e "${_CLR_CYAN}  4.${_CLR_RESET} $(_cmd wildvinedock-devices)        ${_CLR_DIM}# If pairing needed${_CLR_RESET}"
  echo -e "${_CLR_CYAN}  5.${_CLR_RESET} $(_cmd wildvinedock-approve) ${_CLR_CYAN}<id>${_CLR_RESET}   ${_CLR_DIM}# Approve pairing${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_GREEN}💬 WhatsApp Setup${_CLR_RESET}"
  echo -e "  $(_cmd wildvinedock-shell)"
  echo -e "    ${_CLR_BLUE}>${_CLR_RESET} $(_cmd 'wildvine channels login --channel whatsapp')"
  echo -e "    ${_CLR_BLUE}>${_CLR_RESET} $(_cmd 'wildvine status')"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_CYAN}💡 All commands guide you through next steps!${_CLR_RESET}"
  echo -e "${_CLR_BLUE}📚 Docs: ${_CLR_RESET}${_CLR_CYAN}https://docs.wildvine.bot${_CLR_RESET}"
  echo ""
}
