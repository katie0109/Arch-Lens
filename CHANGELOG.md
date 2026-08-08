# Changelog

All notable changes to Arch-Lens are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-beta.3] - 2026-08-08

Recovery release that completes the first public npm beta. npm rejected the original CLI package
name because it was too similar to an existing package, so the installable CLI package is now
`arch-lens-cli` while its executable remains `arch-lens`.

### Changed

- Renamed the CLI npm package from `arch-lens` to `arch-lens-cli` across workspace filters,
  generated configuration, documentation, examples, and CI.
- Aligned all four public packages at `0.1.0-beta.3` so consumers can install a complete,
  consistent prerelease after the partial beta.2 publication.
- Hardened the release helper to normalize and verify npm dist-tags after publication. Prerelease
  packages retain `beta` and must not expose an unintended `latest` tag.

## [0.1.0-beta.2] - 2026-08-04

Partial first npm publication. `arch-lens-rules`, `arch-lens-core`, and `arch-lens-plugin-kit`
were published, but npm rejected the planned `arch-lens` CLI name because it was too similar to an
existing package. No CLI package was published at this version.

### Changed

- Renamed every workspace package and internal import to the official unscoped npm names.
- Added the npm `beta` dist-tag to package metadata and the release helper so prereleases do not
  become `latest`.
- Ordered publication by dependency: rules → core → plugin kit → CLI.
- Added main-branch, clean-tree, release-tag, npm-authentication, and registry-source preflight
  checks. Re-running a partial release now skips versions already published from this repository.
- Updated package docs, examples, generated config, and consumer smoke tests for the new names.

## [0.1.0-beta.1] - 2026-07-29

First internal pre-release candidate. It was tagged in Git, but no npm package was published from
this project.

### Added

- **CLI**: `init`, `scan`, and `baseline` commands. Exit codes `0` (clean) / `1` (error-severity
  violations) / `2` (config/plugin/runtime error); stdout carries only the report.
- **Config**: TypeScript config loading via jiti; ESLint-style `rules` map
  (`'off' | 'warn' | 'error' | [severity, options]`) alongside the legacy array form; `plugins`
  and `projects` fields.
- **Rules**: per-violation severity wired to exit codes and reporting; `context.options` injection.
- **Graph query API** (`context.graph`): `dependenciesOf`, `dependentsOf`, `isReachable`,
  `shortestPath`, `stronglyConnectedComponents`.
- **Project graph** (`context.projectGraph`) derived from config `projects`.
- **CODEOWNERS ownership** (`context.owners`): gitignore-style matching, last-match-wins.
- **npm plugin loading**: bare specifiers (`@scope/rules`), `file:` URLs, and local paths, via
  `--plugin` or config `plugins`.
- **Reporters**: `table`, `list`, `json`, `html`, `markdown`, and **`sarif`** (GitHub Code Scanning).
- **Adoption/CI**: `baseline` + `scan --baseline` (suppress known violations, fail only on new ones);
  `scan --affected` with `--changed`/`--since` (changed files + transitive dependents).
- Flagship sample plugin `sample/gateway-only-access` (gateway-only access with dated waivers).

### Notes

- Requires Node.js >= 20. `typescript` is a direct dependency of `arch-lens-core`.
- This is a beta: APIs may change before `0.1.0`.
