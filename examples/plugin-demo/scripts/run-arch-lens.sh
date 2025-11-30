#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI_BIN="${ROOT_DIR}/../../packages/cli/dist/index.js"
CONFIG_PATH="${ROOT_DIR}/arch.config.ts"
PLUGIN_PATH="${ROOT_DIR}/plugins/no-default-export.mjs"

if [ ! -f "$CLI_BIN" ]; then
  echo "[Arch-Lens] CLI build output not found. Running pnpm build..."
  pnpm --filter @arch-lens/cli build >/dev/null
fi

if [ ! -f "$PLUGIN_PATH" ]; then
  echo "[Arch-Lens] Plugin file not found: $PLUGIN_PATH" >&2
  exit 1
fi

echo "[Arch-Lens] Running plugin loading demo"
node "$CLI_BIN" scan "${ROOT_DIR}/src" --config "$CONFIG_PATH" --plugin "$PLUGIN_PATH" --report table "$@"
