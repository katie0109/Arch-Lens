# arch-lens

Command-line interface for **Arch-Lens** — a whole-graph, executable architecture rule engine
for TypeScript monorepos.

```bash
npm install --save-dev arch-lens@beta
npx arch-lens init            # scaffold arch.config.ts
npx arch-lens scan            # check rules
npx arch-lens scan --fix      # auto-fix fixable violations
```

## Highlights

- ESLint-style `rules` map: `{ 'id': 'off' | 'warn' | 'error' | ['warn', options] }`.
- Graph query API for rules (`isReachable` / `shortestPath` / `stronglyConnectedComponents`).
- npm plugin loading (`--plugin @scope/rules` or config `plugins`).
- CI/adoption: `--report sarif`, `baseline` + `scan --baseline`, `scan --affected`,
  CODEOWNERS ownership, project graph.

## Commands

| Command | Purpose |
| --- | --- |
| `arch-lens init [--config <path>]` | Scaffold a config file |
| `arch-lens scan [target]` | Scan against the configured rules |
| `arch-lens baseline` | Record current violations as a baseline |

Exit codes: `0` clean · `1` error-severity violations · `2` config/plugin/runtime error.

See the [project README](https://github.com/katie0109/Arch-Lens#readme) for full docs. MIT licensed.
