#!/usr/bin/env node
// Benchmark harness for Arch-Lens.
//
// Generates synthetic monorepo-like projects of increasing size and measures the engine on three
// scenarios: cold (empty cache), warm (repeat scan, parse cache hot), and incremental (one file
// changed, scanned with --affected). Run after `pnpm build`:
//
//   node scripts/bench.mjs            # default sizes: 1000 5000 10000
//   node scripts/bench.mjs 2000 8000  # custom sizes
//   BENCH_MD=1 node scripts/bench.mjs # also print a Markdown table
import { mkdirSync, writeFileSync, rmSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

import { createArchLensOrchestrator } from '../packages/core/dist/index.js';

const MODULES_PER_FEATURE = 8;

/** Generates ~`target` .ts files forming a connected import graph; returns the actual file count. */
function generateProject(dir, target) {
  // target ≈ features*(M+1 index) + shared;  shared = features;  => features*(M+2) ≈ target
  const features = Math.max(1, Math.round(target / (MODULES_PER_FEATURE + 2)));
  const shared = features;
  mkdirSync(join(dir, 'src/shared'), { recursive: true });

  for (let k = 0; k < shared; k += 1) {
    writeFileSync(join(dir, `src/shared/s${k}.ts`), `export const s${k} = ${k};\n`);
  }

  let count = shared;
  for (let i = 0; i < features; i += 1) {
    const featureDir = join(dir, `src/features/f${i}`);
    mkdirSync(featureDir, { recursive: true });
    writeFileSync(join(featureDir, 'index.ts'), 'export {};\n');
    count += 1;
    for (let j = 0; j < MODULES_PER_FEATURE; j += 1) {
      const a = (i + j) % shared;
      const b = (i * 7 + j) % shared;
      const chain = j > 0 ? `import './m${j - 1}';\n` : '';
      writeFileSync(
        join(featureDir, `m${j}.ts`),
        `import '../../shared/s${a}';\nimport '../../shared/s${b}';\n${chain}export const f${i}m${j} = 1;\n`,
      );
      count += 1;
    }
  }
  return count;
}

function inlineConfig(dir) {
  return {
    root: dir,
    include: ['src/**/*.ts'],
    exclude: ['**/node_modules/**'],
    rules: {
      'dependency/no-circular': 'error',
      'dependency/no-cross-feature-import': 'error',
      'structure/required-feature-index': 'warn',
    },
  };
}

async function timed(fn) {
  const start = performance.now();
  await fn();
  return performance.now() - start;
}

async function benchSize(target) {
  const dir = join(tmpdir(), `arch-lens-bench-${target}-${Date.now()}`);
  try {
    const files = generateProject(dir, target);
    const orchestrator = await createArchLensOrchestrator({ config: inlineConfig(dir), cwd: dir });

    const cold = await timed(() => orchestrator.scan({ silent: true }));
    const warm = await timed(() => orchestrator.scan({ silent: true }));

    // Change one file, then scan incrementally (only its parse is invalidated).
    const changed = 'src/features/f0/m0.ts';
    appendFileSync(join(dir, changed), '\n// touched\n');
    const incremental = await timed(() =>
      orchestrator.scan({ silent: true, changedFiles: [changed], affectedOnly: true }),
    );

    return { files, cold, warm, incremental };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const fmt = (ms) => `${ms.toFixed(0)} ms`;

const sizes = process.argv.slice(2).map(Number).filter((n) => n > 0);
const targets = sizes.length > 0 ? sizes : [1000, 5000, 10000];

const rows = [];
for (const target of targets) {
  // Warm up the module once (JIT) before measuring the smallest size.
  const r = await benchSize(target);
  rows.push(r);
  console.log(
    `files=${String(r.files).padStart(6)}  cold=${fmt(r.cold).padStart(9)}  warm=${fmt(r.warm).padStart(9)}  incremental=${fmt(r.incremental).padStart(9)}`,
  );
}

if (process.env.BENCH_MD) {
  console.log('\n| Files | Cold | Warm (cached) | Incremental (--affected) |');
  console.log('| ---: | ---: | ---: | ---: |');
  for (const r of rows) {
    console.log(`| ${r.files} | ${fmt(r.cold)} | ${fmt(r.warm)} | ${fmt(r.incremental)} |`);
  }
}
