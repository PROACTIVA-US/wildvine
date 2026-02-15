#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE_NAME="${WILDVINE_IMAGE:-${WILDVINE_IMAGE:-wildvine:local}}"
CONFIG_DIR="${WILDVINE_CONFIG_DIR:-${WILDVINE_CONFIG_DIR:-$HOME/.wildvine}}"
WORKSPACE_DIR="${WILDVINE_WORKSPACE_DIR:-${WILDVINE_WORKSPACE_DIR:-$HOME/.wildvine/workspace}}"
PROFILE_FILE="${WILDVINE_PROFILE_FILE:-${WILDVINE_PROFILE_FILE:-$HOME/.profile}}"

PROFILE_MOUNT=()
if [[ -f "$PROFILE_FILE" ]]; then
  PROFILE_MOUNT=(-v "$PROFILE_FILE":/home/node/.profile:ro)
fi

echo "==> Build image: $IMAGE_NAME"
docker build -t "$IMAGE_NAME" -f "$ROOT_DIR/Dockerfile" "$ROOT_DIR"

echo "==> Run gateway live model tests (profile keys)"
docker run --rm -t \
  --entrypoint bash \
  -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
  -e HOME=/home/node \
  -e NODE_OPTIONS=--disable-warning=ExperimentalWarning \
  -e WILDVINE_LIVE_TEST=1 \
  -e WILDVINE_LIVE_GATEWAY_MODELS="${WILDVINE_LIVE_GATEWAY_MODELS:-${WILDVINE_LIVE_GATEWAY_MODELS:-all}}" \
  -e WILDVINE_LIVE_GATEWAY_PROVIDERS="${WILDVINE_LIVE_GATEWAY_PROVIDERS:-${WILDVINE_LIVE_GATEWAY_PROVIDERS:-}}" \
  -e WILDVINE_LIVE_GATEWAY_MODEL_TIMEOUT_MS="${WILDVINE_LIVE_GATEWAY_MODEL_TIMEOUT_MS:-${WILDVINE_LIVE_GATEWAY_MODEL_TIMEOUT_MS:-}}" \
  -v "$CONFIG_DIR":/home/node/.wildvine \
  -v "$WORKSPACE_DIR":/home/node/.wildvine/workspace \
  "${PROFILE_MOUNT[@]}" \
  "$IMAGE_NAME" \
  -lc "set -euo pipefail; [ -f \"$HOME/.profile\" ] && source \"$HOME/.profile\" || true; cd /app && pnpm test:live"
