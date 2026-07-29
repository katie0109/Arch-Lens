import { afterAll, describe, expect, it } from 'vitest';

import { cleanupSuite, makeProject, runCli, writeFile } from './harness.js';

interface JsonReport {
  violations: Array<{ ruleId: string; message: string }>;
}

describe('arch-lens CODEOWNERS ownership (e2e)', () => {
  afterAll(() => {
    cleanupSuite();
  });

  it('exposes CODEOWNERS ownership to rules via context.owners', () => {
    const dir = makeProject('ownership');
    writeFile(dir, 'src/legacy/db.ts', 'export const db = 1;\n');
    writeFile(dir, 'CODEOWNERS', '* @team-default\n/src/legacy/ @team-legacy\n');

    // A probe plugin that reports the owners of src/legacy/db.ts.
    writeFile(
      dir,
      'probe.mjs',
      `export default {
  meta: { name: 'probe', version: '0.0.0' },
  rules: [
    {
      id: 'probe/owners',
      meta: { description: 'probe', severity: 'error', type: 'structure' },
      check: (ctx) => [
        {
          ruleId: 'probe/owners',
          message: 'owners=' + ctx.owners.ownersOf('src/legacy/db.ts').join(','),
          file: 'src/legacy/db.ts',
        },
      ],
    },
  ],
};
`,
    );
    writeFile(
      dir,
      'arch.config.mjs',
      `export default {
  include: ['src/**/*.{ts,tsx,js,jsx}'],
  exclude: ['**/node_modules/**'],
  plugins: ['./probe.mjs'],
  rules: { 'probe/owners': 'error' },
};
`,
    );

    const result = runCli(
      ['scan', '--report', 'json', '--config', 'arch.config.mjs', '--allow-violations'],
      dir,
    );

    const report = JSON.parse(result.stdout) as JsonReport;
    const probe = report.violations.find((v) => v.ruleId === 'probe/owners');
    // Last matching CODEOWNERS entry (/src/legacy/) wins over `*`.
    expect(probe?.message).toBe('owners=@team-legacy');
  });
});
