#!/usr/bin/env bash
#
# Consumer smoke test: pack every workspace package into a tarball, install those tarballs
# into a clean project the way a real user would, then run `arch-lens init` + `scan` against
# it. This is the check that the published packages actually work outside the monorepo.
#
# Requires `pnpm` (packs and rewrites workspace:* deps to real versions) and `npm` (installs
# the tarballs like an end user). Override the package manager with PNPM=... if needed.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PNPM="${PNPM:-pnpm}"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "[smoke] building workspaces"
# shellcheck disable=SC2086
$PNPM build >/dev/null

echo "[smoke] packing tarballs"
TARBALLS="$WORK/tarballs"
mkdir -p "$TARBALLS"
for pkg in rules core plugins cli; do
  ( cd "$REPO_DIR/packages/$pkg" && $PNPM pack --pack-destination "$TARBALLS" >/dev/null )
done
ls -1 "$TARBALLS"

echo "[smoke] creating a clean consumer project"
CONSUMER="$WORK/consumer"
mkdir -p "$CONSUMER/src/features/Cart"
printf 'export const cart = 1;\n' > "$CONSUMER/src/features/Cart/CartService.ts"
(
  cd "$CONSUMER"
  npm init -y >/dev/null

  echo "[smoke] installing tarballs"
  # Installing all tarballs in one command lets workspace cross-dependencies resolve to
  # each other instead of being fetched from the registry.
  npm install --no-audit --no-fund "$TARBALLS"/*.tgz >/dev/null

  BIN="./node_modules/.bin/arch-lens"
  [ -x "$BIN" ] || { echo "[smoke] arch-lens binary not linked" >&2; exit 1; }

  echo "[smoke] arch-lens init"
  "$BIN" init --config arch.config.ts

  echo "[smoke] arch-lens scan --report json"
  "$BIN" scan --report json --allow-violations > scan.json

  node -e '
    const r = require("./scan.json");
    if (!Array.isArray(r.violations)) throw new Error("report has no violations array");
    console.log("[smoke] scan produced a valid report, count =", r.count);
  '
)

echo "[smoke] OK"
