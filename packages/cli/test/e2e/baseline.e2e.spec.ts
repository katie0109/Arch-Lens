import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { cleanupSuite, makeProject, runCli, writeConfig, writeFile } from './harness.js';

function seedCycle(dir: string, a: string, b: string): void {
  writeFile(dir, `src/${a}.ts`, `import './${b}';\nexport const ${a} = 1;\n`);
  writeFile(dir, `src/${b}.ts`, `import './${a}';\nexport const ${b} = 1;\n`);
}

describe('arch-lens baseline (e2e)', () => {
  afterAll(() => {
    cleanupSuite();
  });

  it('records a baseline and then suppresses those known violations', () => {
    const dir = makeProject('baseline-suppress');
    seedCycle(dir, 'a', 'b');
    writeConfig(dir, ['dependency/no-circular']);

    const created = runCli(['baseline', '--config', 'arch.config.mjs'], dir);
    expect(created.status).toBe(0);
    expect(existsSync(join(dir, 'arch-lens-baseline.json'))).toBe(true);

    // Without the baseline the error fails the scan...
    expect(runCli(['scan', '--config', 'arch.config.mjs'], dir).status).toBe(1);

    // ...with the baseline it is suppressed.
    const scanned = runCli(['scan', '--baseline', '--config', 'arch.config.mjs'], dir);
    expect(scanned.status).toBe(0);
    expect(scanned.stderr).toContain('suppressed');
  });

  it('still fails when a new violation appears after the baseline', () => {
    const dir = makeProject('baseline-new');
    seedCycle(dir, 'a', 'b');
    writeConfig(dir, ['dependency/no-circular']);

    runCli(['baseline', '--config', 'arch.config.mjs'], dir);

    // Introduce a brand-new cycle that the baseline never recorded.
    seedCycle(dir, 'c', 'd');

    const scanned = runCli(['scan', '--baseline', '--config', 'arch.config.mjs'], dir);
    expect(scanned.status).toBe(1);
  });
});
