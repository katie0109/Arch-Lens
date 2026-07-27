import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { makeProject, runCli, tmpRoot, writeConfig, writeFile } from './harness.js';

/**
 * End-to-end contract for the built CLI (`packages/cli/dist/index.js`).
 *
 * These tests execute the real binary against throwaway workspaces and pin the
 * Phase-1 defects. They are expected to be RED until the corresponding fix task
 * lands:
 *   - Task 1 (Init/Config split)       -> "init --config scaffolds a new file"
 *   - Task 2 (single rule source)      -> "does not duplicate violations"
 *   - Task 3 (collector + re-scan)     -> "--report json emits a single document",
 *                                         "--fix reports only remaining violations"
 *
 * Requires `pnpm build` to have run so that dist reflects current source.
 */

const RFI = 'structure/required-feature-index';

interface JsonViolation {
  ruleId: string;
  file?: string | null;
}

interface JsonReport {
  count: number;
  violations: JsonViolation[];
}

/** Parses the single JSON document the reporter is contracted to emit. */
function parseReport(stdout: string): JsonReport {
  return JSON.parse(stdout) as JsonReport;
}

/** A feature directory with source but no index.ts -> one required-feature-index violation. */
function seedMissingFeatureIndex(dir: string): void {
  writeFile(dir, 'src/features/Cart/CartService.ts', 'export const cart = 1;\n');
}

describe('arch-lens CLI (e2e)', () => {
  afterAll(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('init --config scaffolds a new config file in an empty project', () => {
    const dir = makeProject('init-config');

    const result = runCli(['init', '--config', 'arch.config.ts'], dir);

    expect(result.status).toBe(0);
    expect(existsSync(join(dir, 'arch.config.ts'))).toBe(true);
  });

  it('scan --report json emits exactly one JSON document (even with --fix)', () => {
    const dir = makeProject('single-json');
    seedMissingFeatureIndex(dir);
    writeConfig(dir, [RFI]);

    const result = runCli(
      ['scan', '--fix', '--report', 'json', '--config', 'arch.config.mjs', '--allow-violations'],
      dir,
    );

    expect(() => JSON.parse(result.stdout)).not.toThrow();
  });

  it('scan does not duplicate violations when a config is auto-discovered', () => {
    const dir = makeProject('no-duplicates');
    seedMissingFeatureIndex(dir);
    writeConfig(dir, [RFI]);

    // No --config flag: the config is auto-discovered. Built-ins must not be merged on top.
    const result = runCli(['scan', '--report', 'json', '--allow-violations'], dir);

    const { violations } = parseReport(result.stdout);
    const cartMisses = violations.filter(
      (v) => v.ruleId === RFI && (v.file ?? '').includes('Cart'),
    );

    expect(cartMisses).toHaveLength(1);
  });

  it('scan --fix reports only the violations that remain after fixing', () => {
    const dir = makeProject('fix-rescan');
    seedMissingFeatureIndex(dir);
    writeConfig(dir, [RFI]);

    const result = runCli(
      ['scan', '--fix', '--report', 'json', '--config', 'arch.config.mjs', '--allow-violations'],
      dir,
    );

    // The fix creates the missing entry point...
    expect(existsSync(join(dir, 'src/features/Cart/index.ts'))).toBe(true);

    // ...so the reported result must no longer contain that violation.
    const { violations } = parseReport(result.stdout);
    expect(violations.filter((v) => v.ruleId === RFI)).toHaveLength(0);
  });
});

describe('arch-lens CLI output & exit-code contract (e2e)', () => {
  afterAll(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('exits 1 when violations are found', () => {
    const dir = makeProject('exit-violations');
    seedMissingFeatureIndex(dir);
    writeConfig(dir, [RFI]);

    const result = runCli(['scan', '--report', 'json', '--config', 'arch.config.mjs'], dir);

    expect(result.status).toBe(1);
  });

  it('exits 0 with --allow-violations even when violations are found', () => {
    const dir = makeProject('exit-allow');
    seedMissingFeatureIndex(dir);
    writeConfig(dir, [RFI]);

    const result = runCli(
      ['scan', '--report', 'json', '--config', 'arch.config.mjs', '--allow-violations'],
      dir,
    );

    expect(result.status).toBe(0);
  });

  it('exits 2 when an explicit --config path does not exist', () => {
    const dir = makeProject('exit-missing-config');

    const result = runCli(['scan', '--config', 'does-not-exist.mjs'], dir);

    expect(result.status).toBe(2);
  });

  it('exits 2 when the resolved rule set has duplicate ids', () => {
    const dir = makeProject('exit-duplicate');
    seedMissingFeatureIndex(dir);
    writeFile(
      dir,
      'arch.config.mjs',
      `import { loadBuiltInRules } from '@arch-lens/rules';
const rfi = loadBuiltInRules({ include: ['${RFI}'] });
export default {
  include: ['src/**/*.{ts,tsx,js,jsx}'],
  exclude: ['**/node_modules/**'],
  rules: [...rfi, ...rfi],
};
`,
    );

    const result = runCli(['scan', '--report', 'json', '--config', 'arch.config.mjs'], dir);

    expect(result.status).toBe(2);
  });

  it('keeps stdout pure JSON while logs go to stderr under --verbose', () => {
    const dir = makeProject('stdout-stderr');
    writeFile(dir, 'src/a.ts', 'export const a = 1;\n');
    writeFile(
      dir,
      'plugin.mjs',
      `export default {
  meta: { name: 'demo', version: '0.0.0' },
  rules: [
    {
      id: 'demo/always',
      meta: { description: 'd', severity: 'warning', type: 'structure' },
      check: () => [{ ruleId: 'demo/always', message: 'hi', file: 'src/a.ts' }],
    },
  ],
};
`,
    );

    const result = runCli(
      ['scan', '--report', 'json', '--allow-violations', '--verbose', '--plugin', './plugin.mjs'],
      dir,
    );

    // stdout must be a single, clean JSON document...
    expect(() => JSON.parse(result.stdout)).not.toThrow();
    const { violations } = parseReport(result.stdout);
    expect(violations.some((v) => v.ruleId === 'demo/always')).toBe(true);

    // ...and the verbose log must be on stderr, not stdout.
    expect(result.stdout).not.toContain('Loading plugins');
    expect(result.stderr).toContain('Loading plugins');
  });
});
