import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { cleanupSuite, makeProject, repoRoot, runCli, writeFile } from './harness.js';

interface JsonReport {
  errorCount: number;
  violations: Array<{ ruleId: string; file?: string | null; message: string }>;
}

// The built flagship plugin (loaded by absolute path, as a real config would load an npm one).
const PLUGIN = join(repoRoot, 'packages/plugins/dist/sample/gateway-only-access.js').replace(
  /\\/g,
  '/',
);

/** A project where app/ reaches legacy/ directly, bypassing the gateway/. */
function seedGatewayProject(dir: string): void {
  writeFile(dir, 'src/app/service.ts', "import '../legacy/db';\nexport const s = 1;\n");
  writeFile(dir, 'src/legacy/db.ts', 'export const db = 1;\n');
  writeFile(dir, 'src/gateway/legacy.ts', 'export const g = 1;\n');
}

function writeGatewayConfig(dir: string, ruleOptionsLiteral: string): void {
  writeFile(
    dir,
    'arch.config.mjs',
    `export default {
  include: ['src/**/*.{ts,tsx,js,jsx}'],
  exclude: ['**/node_modules/**'],
  plugins: ['${PLUGIN}'],
  rules: {
    'sample/gateway-only-access': ['error', ${ruleOptionsLiteral}],
  },
};
`,
  );
}

describe('flagship gateway-only-access plugin (e2e)', () => {
  afterAll(() => {
    cleanupSuite();
  });

  it('flags a module that reaches the restricted area bypassing the gateway', () => {
    const dir = makeProject('gateway-violation');
    seedGatewayProject(dir);
    writeGatewayConfig(
      dir,
      `{ restricted: ['^src/legacy/'], gateways: ['^src/gateway/'], now: '2026-07-29' }`,
    );

    const result = runCli(['scan', '--report', 'json', '--config', 'arch.config.mjs'], dir);
    const report = JSON.parse(result.stdout) as JsonReport;

    const violation = report.violations.find(
      (v) => v.ruleId === 'sample/gateway-only-access' && v.file === 'src/app/service.ts',
    );
    expect(violation).toBeDefined();
    expect(violation?.message).toContain('src/legacy/db.ts');
    expect(report.errorCount).toBeGreaterThan(0);
    expect(result.status).toBe(1);
  });

  it('suppresses the violation while a dated waiver is active', () => {
    const dir = makeProject('gateway-waiver');
    seedGatewayProject(dir);
    writeGatewayConfig(
      dir,
      `{
      restricted: ['^src/legacy/'],
      gateways: ['^src/gateway/'],
      now: '2026-07-29',
      waivers: [{ from: '^src/app/service\\\\.ts$', until: '2026-12-31', reason: 'migration' }],
    }`,
    );

    const result = runCli(['scan', '--report', 'json', '--config', 'arch.config.mjs'], dir);
    const report = JSON.parse(result.stdout) as JsonReport;

    expect(report.violations.some((v) => v.ruleId === 'sample/gateway-only-access')).toBe(false);
    expect(result.status).toBe(0);
  });
});
