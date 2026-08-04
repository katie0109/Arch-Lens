#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$(cd "${ROOT_DIR}/../.." && pwd)"
CLI_BIN="${REPO_DIR}/packages/cli/dist/index.js"
CONFIG_PATH="${ROOT_DIR}/arch.config.ts"
PLUGIN_NO_TODO="${REPO_DIR}/packages/plugins/dist/sample/no-todo-comment.js"
PLUGIN_ENFORCE_SHARED="${REPO_DIR}/packages/plugins/dist/sample/enforce-shared-imports.js"

if [ ! -f "$CLI_BIN" ]; then
  echo "[Arch-Lens] CLI build output not found. Running pnpm build..."
  pnpm --filter arch-lens build >/dev/null
fi

if [ ! -f "$PLUGIN_NO_TODO" ] || [ ! -f "$PLUGIN_ENFORCE_SHARED" ]; then
  echo "[Arch-Lens] Building plugin samples..."
  pnpm --filter arch-lens-plugin-kit build >/dev/null
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

# 1) Detection pass driven by the sample's own config. Violations are expected in this demo,
#    so --allow-violations keeps the script going (exit 0) instead of aborting under `set -e`.
echo "[Arch-Lens] 1) scan (table) — violations are expected in this demo"
node "$CLI_BIN" scan "$ROOT_DIR/src" --config "$CONFIG_PATH" --report table --allow-violations "${PLUGIN_ARGS[@]}" "$@"

# 2) Fix pass on a throwaway copy so the committed fixture is never mutated. The copy uses
#    the built-in default rules (identical to the sample config's loadBuiltInRules()), which
#    are bundled in the CLI and need no config-file module resolution outside the repo.
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT
cp -R "$ROOT_DIR/src" "$WORK_DIR/src"

echo "[Arch-Lens] 2) scan --fix (JSON) — on a throwaway copy at $WORK_DIR"
(
  cd "$WORK_DIR"
  node "$CLI_BIN" scan src --fix --report json --pretty --allow-violations "${PLUGIN_ARGS[@]}" "$@"
)
