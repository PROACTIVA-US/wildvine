#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_NAME="Wildvine"
APP_BUNDLE="$SCRIPT_DIR/../dist/$APP_NAME.app"

# Parse args
SIGN_MODE=""
for arg in "$@"; do
  case "$arg" in
    --no-sign) SIGN_MODE="adhoc" ;;
    --sign)    SIGN_MODE="sign" ;;
  esac
done

# Kill existing instance
echo "==> Stopping $APP_NAME..."
pkill -x "$APP_NAME" 2>/dev/null && sleep 1 || true

# Build & package
if [[ "$SIGN_MODE" == "adhoc" ]]; then
  ALLOW_ADHOC_SIGNING=1 "$SCRIPT_DIR/package-mac-app.sh"
else
  "$SCRIPT_DIR/package-mac-app.sh"
fi

# Launch
echo "==> Launching $APP_BUNDLE..."
open "$APP_BUNDLE"
echo "==> $APP_NAME is running."
