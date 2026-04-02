#!/usr/bin/env bash
set -euo pipefail

cd /repo

export WILDVINE_STATE_DIR="/tmp/wildvine-test"
export WILDVINE_CONFIG_PATH="${WILDVINE_STATE_DIR}/wildvine.json"

echo "==> Build"
pnpm build

echo "==> Seed state"
mkdir -p "${WILDVINE_STATE_DIR}/credentials"
mkdir -p "${WILDVINE_STATE_DIR}/agents/main/sessions"
echo '{}' >"${WILDVINE_CONFIG_PATH}"
echo 'creds' >"${WILDVINE_STATE_DIR}/credentials/marker.txt"
echo 'session' >"${WILDVINE_STATE_DIR}/agents/main/sessions/sessions.json"

echo "==> Reset (config+creds+sessions)"
pnpm wildvine reset --scope config+creds+sessions --yes --non-interactive

test ! -f "${WILDVINE_CONFIG_PATH}"
test ! -d "${WILDVINE_STATE_DIR}/credentials"
test ! -d "${WILDVINE_STATE_DIR}/agents/main/sessions"

echo "==> Recreate minimal config"
mkdir -p "${WILDVINE_STATE_DIR}/credentials"
echo '{}' >"${WILDVINE_CONFIG_PATH}"

echo "==> Uninstall (state only)"
pnpm wildvine uninstall --state --yes --non-interactive

test ! -d "${WILDVINE_STATE_DIR}"

echo "OK"
