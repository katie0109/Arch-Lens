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
DIST_TAG=${DIST_TAG:-beta}
if [[ "${1:-}" == "--publish" ]]; then
  DRY_RUN=false
fi

echo "[release] Installing dependencies"
pnpm install --frozen-lockfile

echo "[release] Cleaning and building workspaces"
pnpm clean
pnpm build

echo "[release] Running lint/typecheck/test (with coverage)"
pnpm lint
pnpm typecheck
pnpm test -- --coverage

echo "[release] Verifying packed packages in a clean consumer project"
bash scripts/consumer-smoke.sh

if command -v changeset >/dev/null 2>&1; then
  echo "[release] Changeset status"
  pnpm changeset status --verbose || true
else
  echo "[release] Tip: install Changesets with 'pnpm dlx changeset init' for automated versioning"
fi

publish_package() {
  local pkg="$1"
  if [[ "$DRY_RUN" == true ]]; then
    echo "[release] Dry-run publish for $pkg with dist-tag $DIST_TAG"
    pnpm publish --filter "$pkg" --access public --tag "$DIST_TAG" --dry-run --no-git-checks
  else
    echo "[release] Publishing $pkg with dist-tag $DIST_TAG"
    pnpm publish --filter "$pkg" --access public --tag "$DIST_TAG"
  fi
}

declare -a WORKSPACES=(
  "arch-lens-rules"
  "arch-lens-core"
  "arch-lens-plugin-kit"
  "arch-lens"
)

for ws in "${WORKSPACES[@]}"; do
  publish_package "$ws"
  echo
done

echo "[release] Completed for dist-tag $DIST_TAG. Use '--publish' to run without --dry-run."
