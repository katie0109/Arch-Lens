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
PUBLISH_VERIFY_ATTEMPTS=${PUBLISH_VERIFY_ATTEMPTS:-24}
PUBLISH_VERIFY_DELAY_SECONDS=${PUBLISH_VERIFY_DELAY_SECONDS:-5}
EXPECTED_REPOSITORY="github.com/katie0109/Arch-Lens"
NPM_USER=""
if [[ "${1:-}" == "--publish" ]]; then
  DRY_RUN=false
fi

declare -a WORKSPACES=(
  "@moth-tools/arch-lens-rules"
  "@moth-tools/arch-lens-core"
  "@moth-tools/arch-lens-plugin-kit"
  "@moth-tools/arch-lens"
)

package_directory() {
  case "$1" in
    @moth-tools/arch-lens-rules) echo "packages/rules" ;;
    @moth-tools/arch-lens-core) echo "packages/core" ;;
    @moth-tools/arch-lens-plugin-kit) echo "packages/plugins" ;;
    @moth-tools/arch-lens) echo "packages/cli" ;;
    *)
      echo "[release] Unknown workspace package: $1" >&2
      return 1
      ;;
  esac
}

package_version() {
  local dir
  dir=$(package_directory "$1")
  node -p "require('./${dir}/package.json').version"
}

RELEASE_VERSION=$(node -p "require('./package.json').version")

validate_release_metadata() {
  local pkg
  local version

  if [[ "$RELEASE_VERSION" == *-* && "$DIST_TAG" == "latest" ]]; then
    echo "[release] Refusing to publish prerelease $RELEASE_VERSION with the latest tag." >&2
    exit 1
  fi

  for pkg in "${WORKSPACES[@]}"; do
    version=$(package_version "$pkg")
    if [[ "$version" != "$RELEASE_VERSION" ]]; then
      echo "[release] Version mismatch: $pkg is $version, root is $RELEASE_VERSION." >&2
      exit 1
    fi
  done
}

preflight_real_publish() {
  local branch
  local lookup_status
  local pkg
  local release_tag="v${RELEASE_VERSION}"

  branch=$(git branch --show-current)
  if [[ "$branch" != "main" && "$branch" != "master" ]]; then
    echo "[release] Real publishing is allowed only from main/master (current: $branch)." >&2
    exit 1
  fi

  if [[ -n "$(git status --porcelain)" ]]; then
    echo "[release] Real publishing requires a clean working tree." >&2
    exit 1
  fi

  if [[ "$(git tag --points-at HEAD --list "$release_tag")" != "$release_tag" ]]; then
    echo "[release] Tag $release_tag must point at HEAD before publishing." >&2
    exit 1
  fi

  if ! NPM_USER=$(npm whoami 2>/dev/null); then
    echo "[release] npm authentication is required. Run 'npm login' first." >&2
    exit 1
  fi

  for pkg in "${WORKSPACES[@]}"; do
    if package_is_already_published "$pkg" "$(package_version "$pkg")"; then
      echo "[release] Preflight: $pkg@$RELEASE_VERSION is already published and can be resumed."
    else
      lookup_status=$?
      if [[ $lookup_status -eq 1 ]]; then
        echo "[release] Preflight: $pkg@$RELEASE_VERSION is available for publishing."
      else
        exit "$lookup_status"
      fi
    fi
  done
}

package_is_already_published() {
  local pkg="$1"
  local version="$2"
  local spec="${pkg}@${version}"
  local output
  local status

  set +e
  output=$(npm view "$spec" version repository.url maintainers.name --json --prefer-online 2>&1)
  status=$?
  set -e

  if [[ $status -eq 0 ]]; then
    if [[ "$output" != *"$EXPECTED_REPOSITORY"* ]]; then
      echo "[release] Refusing to reuse $spec: registry metadata points to another repository." >&2
      return 2
    fi
    if [[ -n "$NPM_USER" && "$output" != *"$NPM_USER"* ]]; then
      echo "[release] Refusing to reuse $spec: npm user $NPM_USER is not a maintainer." >&2
      return 2
    fi
    return 0
  fi

  if [[ "$output" == *"E404"* ]]; then
    return 1
  fi

  echo "[release] Could not query $spec from npm:" >&2
  echo "$output" >&2
  return 2
}

confirm_package_is_published() {
  local pkg="$1"
  local version="$2"
  local attempt
  local lookup_status

  for ((attempt = 1; attempt <= PUBLISH_VERIFY_ATTEMPTS; attempt++)); do
    if package_is_already_published "$pkg" "$version"; then
      return 0
    else
      lookup_status=$?
    fi

    if [[ $lookup_status -ne 1 ]]; then
      return "$lookup_status"
    fi

    if [[ $attempt -lt $PUBLISH_VERIFY_ATTEMPTS ]]; then
      echo "[release] Waiting for npm registry propagation: $pkg@$version ($attempt/$PUBLISH_VERIFY_ATTEMPTS)"
      sleep "$PUBLISH_VERIFY_DELAY_SECONDS"
    fi
  done

  return 1
}

registry_dist_tag() {
  local pkg="$1"
  local tag="$2"
  local output

  if ! output=$(npm view "$pkg" "dist-tags.${tag}" --json 2>/dev/null); then
    return 1
  fi

  if [[ -z "$output" || "$output" == "null" ]]; then
    return 1
  fi

  node -e '
    const value = JSON.parse(process.argv[1]);
    if (typeof value !== "string" || value.length === 0) process.exit(1);
    process.stdout.write(value);
  ' "$output"
}

normalize_dist_tags() {
  local pkg="$1"
  local version="$2"
  local tagged_version=""
  local latest_version=""

  tagged_version=$(registry_dist_tag "$pkg" "$DIST_TAG") || true
  if [[ "$tagged_version" != "$version" ]]; then
    echo "[release] Setting $pkg@$version as dist-tag $DIST_TAG"
    npm dist-tag add "${pkg}@${version}" "$DIST_TAG"
  fi

  if [[ "$version" == *-* && "$DIST_TAG" != "latest" ]]; then
    latest_version=$(registry_dist_tag "$pkg" latest) || true
    if [[ "$latest_version" == "$version" ]]; then
      echo "[release] Warning: npm assigned latest to first prerelease $pkg@$version; consumers must install @$DIST_TAG explicitly." >&2
    elif [[ -n "$latest_version" ]]; then
      echo "[release] Preserving existing latest tag for $pkg at $latest_version."
    fi
  fi
}

verify_dist_tags() {
  local pkg="$1"
  local version="$2"
  local tagged_version=""

  tagged_version=$(registry_dist_tag "$pkg" "$DIST_TAG") || true
  if [[ "$tagged_version" != "$version" ]]; then
    echo "[release] Verification failed: $pkg dist-tag $DIST_TAG is '${tagged_version:-missing}', expected $version." >&2
    return 1
  fi
}

validate_release_metadata
if [[ "$DRY_RUN" == false ]]; then
  preflight_real_publish
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
  local version
  local lookup_status

  version=$(package_version "$pkg")
  if [[ "$DRY_RUN" == true ]]; then
    echo "[release] Dry-run publish for $pkg with dist-tag $DIST_TAG"
    pnpm publish --filter "$pkg" --access public --tag "$DIST_TAG" --dry-run --no-git-checks
  else
    if package_is_already_published "$pkg" "$version"; then
      echo "[release] Skipping $pkg@$version; it is already published from this repository."
      return 0
    else
      lookup_status=$?
      if [[ $lookup_status -ne 1 ]]; then
        return "$lookup_status"
      fi
    fi

    echo "[release] Publishing $pkg with dist-tag $DIST_TAG"
    pnpm publish --filter "$pkg" --access public --tag "$DIST_TAG"
  fi
}

for ws in "${WORKSPACES[@]}"; do
  publish_package "$ws"

  if [[ "$DRY_RUN" == false ]]; then
    if ! confirm_package_is_published "$ws" "$(package_version "$ws")"; then
      echo "[release] Verification failed: $ws was not confirmed in the npm registry." >&2
      exit 1
    fi
    normalize_dist_tags "$ws" "$(package_version "$ws")"
    verify_dist_tags "$ws" "$(package_version "$ws")"
  fi

  echo
done

if [[ "$DRY_RUN" == false ]]; then
  for ws in "${WORKSPACES[@]}"; do
    if ! confirm_package_is_published "$ws" "$(package_version "$ws")"; then
      echo "[release] Verification failed: $ws was not confirmed in the npm registry." >&2
      exit 1
    fi
    verify_dist_tags "$ws" "$(package_version "$ws")"
  done
fi

echo "[release] Completed for dist-tag $DIST_TAG. Use '--publish' to run without --dry-run."
