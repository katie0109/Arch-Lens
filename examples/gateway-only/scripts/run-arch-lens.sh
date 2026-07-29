#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$(cd "${ROOT_DIR}/../.." && pwd)"
CLI_BIN="${REPO_DIR}/packages/cli/dist/index.js"
CONFIG_PATH="${ROOT_DIR}/arch.config.ts"
PLUGIN_BIN="${REPO_DIR}/packages/plugins/dist/sample/gateway-only-access.js"

if [ ! -f "$CLI_BIN" ] || [ ! -f "$PLUGIN_BIN" ]; then
  echo "[Arch-Lens] Build output not found. Running pnpm build..."
  pnpm build >/dev/null
fi

echo "[Arch-Lens] gateway-only-access demo — app/ reaches legacy/ bypassing the gateway"
node "$CLI_BIN" scan "${ROOT_DIR}/src" --config "$CONFIG_PATH" --report table --allow-violations "$@"
