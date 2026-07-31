# Changelog

All notable changes to Arch-Lens are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-beta.1] - 2026-07-29

First pre-release. Published packages: `@arch-lens/cli`, `@arch-lens/core`, `@arch-lens/rules`,
`@arch-lens/plugins`.

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

- Requires Node.js >= 20. `typescript` is a direct dependency of `@arch-lens/core`.
- This is a beta: APIs may change before `0.1.0`.
