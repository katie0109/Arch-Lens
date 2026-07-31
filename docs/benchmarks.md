# Benchmarks

Arch-Lens is designed to stay fast on large TypeScript monorepos. The mtime-based dependency-graph
cache makes repeat scans (the common CI and watch case) much cheaper than a cold run, and
`--affected` narrows reporting to what a change actually touches.

## Results

Synthetic monorepo-like projects (features × modules importing shared modules), measured on the
Arch-Lens engine (`orchestrator.scan`):

| Files | Cold (empty cache) | Warm (cache hot) | Incremental (`--affected`, 1 file changed) |
| ---: | ---: | ---: | ---: |
| 1,000 | 197 ms | 38 ms | 36 ms |
| 5,000 | 698 ms | 196 ms | 184 ms |
| 10,000 | 1,363 ms | 370 ms | 359 ms |

Measured on an Apple M4 Pro (arm64), Node.js v26. Numbers are indicative and vary by machine, rule
set, and graph shape — reproduce them on your own hardware with the harness below.

**Takeaways**

- Cold scan scales roughly linearly with file count (~0.14 ms/file here).
- The parse cache gives repeat scans a ~3.5–5× speedup — this is the typical CI/watch path.
- Incremental scans only re-parse the changed file; combined with `--affected` reporting, they keep
  per-change feedback cheap even at 10k files.

## Reproducing

```bash
pnpm build
pnpm bench                     # default sizes: 1000 5000 10000
node scripts/bench.mjs 2000    # custom sizes
BENCH_MD=1 pnpm bench          # also print a Markdown table
```

## Method

For each size the harness ([`scripts/bench.mjs`](../scripts/bench.mjs)):

1. generates a fresh synthetic project with a connected import graph (features, per-feature module
   chains, and shared leaf modules);
2. runs a rule set (`dependency/no-circular`, `dependency/no-cross-feature-import`,
   `structure/required-feature-index`) via `createArchLensOrchestrator(...).scan()`;
3. times **cold** (first scan, empty cache), **warm** (immediate second scan), and **incremental**
   (append to one file, then `scan({ changedFiles, affectedOnly: true })`).

The harness measures the engine in-process (no CLI/Node startup overhead), isolating parse + graph
build + rule execution.
