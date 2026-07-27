import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { repoRoot } from './harness.js';

// The demo script is bash; skip on Windows CI runners.
const isWindows = process.platform === 'win32';

describe.skipIf(isWindows)('monorepo-sample demo script (e2e)', () => {
  it('runs to completion with exit 0 without mutating the committed fixture', () => {
    const script = join(repoRoot, 'examples/monorepo-sample/scripts/run-arch-lens.sh');
    // The old --fix pass would have created this inside the committed fixture.
    const fixtureIndex = join(repoRoot, 'examples/monorepo-sample/src/features/Cart/index.ts');

    const before = existsSync(fixtureIndex);
    const result = spawnSync('bash', [script], { cwd: repoRoot, encoding: 'utf8' });
    const after = existsSync(fixtureIndex);

    // Violations are expected, but --allow-violations means the demo still exits clean.
    expect(result.status).toBe(0);
    // --fix must run on a throwaway copy, never on the committed fixture.
    expect(after).toBe(before);
  });
});
