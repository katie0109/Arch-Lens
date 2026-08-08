#!/usr/bin/env bash
# Demonstrates Phase-3 CI/adoption features (baseline, --baseline, SARIF) on a throwaway copy
# so the committed fixture is never mutated (baseline writes arch-lens-baseline.json).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$(cd "${ROOT_DIR}/../.." && pwd)"
CLI_BIN="${REPO_DIR}/packages/cli/dist/index.js"

if [ ! -f "$CLI_BIN" ]; then
  echo "[Arch-Lens] Building CLI..."
  pnpm --filter arch-lens build >/dev/null
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
cp -R "$ROOT_DIR/src" "$WORK/src"
cp "$ROOT_DIR/arch.config.ts" "$WORK/arch.config.ts"

# Run from the throwaway copy so `baseline` writes arch-lens-baseline.json there, not in the repo.
cd "$WORK"

echo "[Arch-Lens] 1) baseline — record the current (legacy) violations"
node "$CLI_BIN" baseline --config arch.config.ts

echo "[Arch-Lens] 2) scan --baseline — known violations are suppressed"
node "$CLI_BIN" scan src --config arch.config.ts --baseline --allow-violations

echo "[Arch-Lens] 3) introduce a NEW cycle, then scan --baseline surfaces only the new one"
printf "import './d';\nexport const c = 1;\n" > src/orders/c.ts
printf "import './c';\nexport const d = 1;\n" > src/orders/d.ts
node "$CLI_BIN" scan src --config arch.config.ts --baseline --report json --allow-violations

echo "[Arch-Lens] 4) SARIF report (upload to GitHub Code Scanning)"
node "$CLI_BIN" scan src --config arch.config.ts --report sarif --allow-violations | head -c 160
echo
