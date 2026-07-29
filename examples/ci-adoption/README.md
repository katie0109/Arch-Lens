# ci-adoption example

Demonstrates the Phase-3 CI/adoption features on a throwaway copy (so the committed
fixture is never mutated):

1. **baseline** — record the current (legacy) violations to `arch-lens-baseline.json`
2. **`scan --baseline`** — known violations are suppressed
3. introduce a **new** cycle → `scan --baseline` fails only on the new one
4. **SARIF** report for GitHub Code Scanning

```bash
./examples/ci-adoption/scripts/run-arch-lens.sh
```

Also try incremental scanning: `arch-lens scan --affected --since <ref>` reports only the
violations on changed files and their transitive dependents.
