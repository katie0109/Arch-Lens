#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

cat <<'BANNER'
╭────────────────────────────────────────────╮
│        Arch-Lens Release Helper            │
│  Pre-flight checks & (dry-run) publish     │
╰────────────────────────────────────────────╯
BANNER

if ! command -v pnpm >/dev/null 2>&1; then
  echo "[release] pnpm is required." >&2
  exit 1
fi

DRY_RUN=${DRY_RUN:-true}
if [[ "${1:-}" == "--publish" ]]; then
  DRY_RUN=false
fi

echo "[release] Installing dependencies"
pnpm install --frozen-lockfile

echo "[release] Running lint/typecheck/test (with coverage)"
pnpm lint
pnpm typecheck
pnpm test -- --coverage

echo "[release] Building workspaces"
pnpm build

if command -v changeset >/dev/null 2>&1; then
  echo "[release] Changeset status"
  pnpm changeset status --verbose || true
else
  echo "[release] Tip: install Changesets with 'pnpm dlx changeset init' for automated versioning"
fi

publish_package() {
  local pkg="$1"
  if [[ "$DRY_RUN" == true ]]; then
    echo "[release] Dry-run publish for $pkg"
    pnpm publish --filter "$pkg" --access public --dry-run
  else
    echo "[release] Publishing $pkg"
    pnpm publish --filter "$pkg" --access public
  fi
}

declare -a WORKSPACES=(
  "@arch-lens/plugins"
  "@arch-lens/rules"
  "@arch-lens/core"
  "@arch-lens/cli"
)

for ws in "${WORKSPACES[@]}"; do
  publish_package "$ws"
  echo
done

echo "[release] Completed. Use '--publish' to run without --dry-run."
