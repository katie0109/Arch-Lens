#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI_BIN="${ROOT_DIR}/../../packages/cli/dist/index.js"
PLUGIN_NO_TODO="${ROOT_DIR}/../../packages/plugins/dist/sample/no-todo-comment.js"
PLUGIN_ENFORCE_SHARED="${ROOT_DIR}/../../packages/plugins/dist/sample/enforce-shared-imports.js"

if [ ! -f "$CLI_BIN" ]; then
  echo "[Arch-Lens] CLI build output not found. Running pnpm build..."
  pnpm --filter @arch-lens/cli build >/dev/null
fi

if [ ! -f "$PLUGIN_NO_TODO" ] || [ ! -f "$PLUGIN_ENFORCE_SHARED" ]; then
  echo "[Arch-Lens] Building plugin samples..."
  pnpm --filter @arch-lens/plugins build >/dev/null
fi

PLUGIN_ARGS=()
if [ -f "$PLUGIN_NO_TODO" ]; then
  PLUGIN_ARGS+=(--plugin "$PLUGIN_NO_TODO")
fi
if [ -f "$PLUGIN_ENFORCE_SHARED" ]; then
  PLUGIN_ARGS+=(--plugin "$PLUGIN_ENFORCE_SHARED")
fi

if [ ${#PLUGIN_ARGS[@]} -gt 0 ]; then
  echo "[Arch-Lens] Including sample plugins: ${PLUGIN_ARGS[*]}"
fi

echo "[Arch-Lens] Running scan against sample project (table report)"
node "$CLI_BIN" scan "$ROOT_DIR/src" --report table "${PLUGIN_ARGS[@]}" "$@"

echo "[Arch-Lens] Running scan with --fix (JSON report)"
node "$CLI_BIN" scan "$ROOT_DIR/src" --fix --report json --pretty "${PLUGIN_ARGS[@]}" "$@"
