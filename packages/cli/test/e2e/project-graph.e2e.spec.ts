import { afterAll, describe, expect, it } from 'vitest';

import { cleanupSuite, makeProject, runCli, writeFile } from './harness.js';

interface JsonReport {
  violations: Array<{ ruleId: string; message: string }>;
}

describe('arch-lens project graph (e2e)', () => {
  afterAll(() => {
    cleanupSuite();
  });

  it('exposes a config-defined project graph to rules via context.projectGraph', () => {
    const dir = makeProject('project-graph');
    // app -> legacy at the file level becomes an app -> legacy project edge.
    writeFile(dir, 'src/app/checkout.ts', "import '../legacy/db';\nexport const c = 1;\n");
    writeFile(dir, 'src/legacy/db.ts', 'export const db = 1;\n');

    writeFile(
      dir,
      'probe.mjs',
      `export default {
  meta: { name: 'probe', version: '0.0.0' },
  rules: [
    {
      id: 'probe/project-boundary',
      meta: { description: 'probe', severity: 'error', type: 'dependency' },
      check: (ctx) =>
        ctx.projectGraph.dependenciesOf('app').includes('legacy')
          ? [{ ruleId: 'probe/project-boundary', message: 'project app depends on legacy', file: 'src/app/checkout.ts' }]
          : [],
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
  projects: [
    { name: 'app', pattern: '^src/app/' },
    { name: 'legacy', pattern: '^src/legacy/' },
  ],
  plugins: ['./probe.mjs'],
  rules: { 'probe/project-boundary': 'error' },
};
`,
    );

    const result = runCli(
      ['scan', '--report', 'json', '--config', 'arch.config.mjs', '--allow-violations'],
      dir,
    );

    const report = JSON.parse(result.stdout) as JsonReport;
    expect(report.violations.some((v) => v.ruleId === 'probe/project-boundary')).toBe(true);
  });
});
