import { afterAll, describe, expect, it } from 'vitest';

import { cleanupSuite, makeProject, runCli, writeFile } from './harness.js';

interface JsonReport {
  count: number;
  violations: Array<{ ruleId: string }>;
}

/**
 * Installs a fake plugin into a project's node_modules and loads it by its bare package name,
 * proving the npm-style plugin loading path (not just local file paths).
 */
function installBarePlugin(dir: string, pkgName: string): void {
  writeFile(
    dir,
    `node_modules/${pkgName}/package.json`,
    JSON.stringify({ name: pkgName, version: '1.0.0', type: 'module', main: 'index.mjs' }, null, 2),
  );
  writeFile(
    dir,
    `node_modules/${pkgName}/index.mjs`,
    `export default {
  meta: { name: '${pkgName}', version: '1.0.0' },
  rules: [
    {
      id: 'demo/bare-loaded',
      meta: { description: 'loaded from a bare specifier', severity: 'warning', type: 'structure' },
      check: () => [{ ruleId: 'demo/bare-loaded', message: 'hello from npm plugin', file: 'src/a.ts' }],
    },
  ],
};
`,
  );
}

describe('arch-lens plugin loading (e2e)', () => {
  afterAll(() => {
    cleanupSuite();
  });

  it('loads a plugin referenced by its bare npm package name', () => {
    const dir = makeProject('bare-plugin');
    writeFile(dir, 'src/a.ts', 'export const a = 1;\n');
    installBarePlugin(dir, 'arch-lens-plugin-demo');

    const result = runCli(
      ['scan', '--report', 'json', '--allow-violations', '--plugin', 'arch-lens-plugin-demo'],
      dir,
    );

    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout) as JsonReport;
    expect(report.violations.some((v) => v.ruleId === 'demo/bare-loaded')).toBe(true);
  });
});
