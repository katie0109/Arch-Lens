import { afterAll, describe, expect, it } from 'vitest';

import { cleanupSuite, makeProject, runCli, writeFile } from './harness.js';

interface JsonReport {
  errorCount: number;
  warningCount: number;
  violations: Array<{ ruleId: string; file?: string | null }>;
}

function writeMapConfig(dir: string, rulesLiteral: string): void {
  writeFile(
    dir,
    'arch.config.mjs',
    `export default {
  include: ['src/**/*.{ts,tsx,js,jsx}'],
  exclude: ['**/node_modules/**'],
  rules: ${rulesLiteral},
};
`,
  );
}

describe('arch-lens ESLint-style rules map (e2e)', () => {
  afterAll(() => {
    cleanupSuite();
  });

  it('honours per-rule severity and `off` from the map', () => {
    const dir = makeProject('map-severity');
    // A warning-severity violation (missing feature index)...
    writeFile(dir, 'src/features/Cart/CartService.ts', 'export const cart = 1;\n');
    // ...and a would-be error (circular dependency) that we disable via `off`.
    writeFile(dir, 'src/a.ts', "import './b';\nexport const a = 1;\n");
    writeFile(dir, 'src/b.ts', "import './a';\nexport const b = 1;\n");
    writeMapConfig(
      dir,
      `{
    'structure/required-feature-index': 'warn',
    'dependency/no-circular': 'off',
  }`,
    );

    const result = runCli(['scan', '--report', 'json', '--config', 'arch.config.mjs'], dir);
    const report = JSON.parse(result.stdout) as JsonReport;

    expect(report.warningCount).toBeGreaterThan(0);
    expect(report.errorCount).toBe(0); // no-circular is off
    expect(report.violations.some((v) => v.ruleId === 'dependency/no-circular')).toBe(false);
    expect(result.status).toBe(0); // warnings only
  });

  it('passes options from the map tuple to the rule (context.options)', () => {
    const dir = makeProject('map-options');
    writeFile(dir, 'src/api/client.ts', 'export const client = 1;\n');
    writeMapConfig(
      dir,
      `{
    'structure/required-files': ['error', { targets: [{ directory: 'src/api', files: ['README.md'] }] }],
  }`,
    );

    const result = runCli(['scan', '--report', 'json', '--config', 'arch.config.mjs'], dir);
    const report = JSON.parse(result.stdout) as JsonReport;

    // The custom target (from options) must drive the check.
    expect(
      report.violations.some(
        (v) => v.ruleId === 'structure/required-files' && (v.file ?? '').includes('src/api/README.md'),
      ),
    ).toBe(true);
    expect(report.errorCount).toBeGreaterThan(0);
    expect(result.status).toBe(1);
  });

  it('exits 2 when the map references an unknown rule id', () => {
    const dir = makeProject('map-unknown');
    writeFile(dir, 'src/a.ts', 'export const a = 1;\n');
    writeMapConfig(dir, `{ 'nope/does-not-exist': 'error' }`);

    const result = runCli(['scan', '--config', 'arch.config.mjs'], dir);

    expect(result.status).toBe(2);
  });
});
