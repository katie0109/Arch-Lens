#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI_BIN="${ROOT_DIR}/../../packages/cli/dist/index.js"
CONFIG_PATH="${ROOT_DIR}/arch.config.ts"

if [ ! -f "$CLI_BIN" ]; then
  echo "[Arch-Lens] CLI build output not found. Running pnpm build..."
  pnpm build >/dev/null
fi

echo "[Arch-Lens] Running filename-case demo"
node "$CLI_BIN" scan "${ROOT_DIR}/src" --config "$CONFIG_PATH" --report table "$@"
