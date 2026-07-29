import { afterAll, describe, expect, it } from 'vitest';

import { cleanupSuite, makeProject, runCli, writeConfig, writeFile } from './harness.js';

interface SarifLog {
  version: string;
  runs: Array<{
    tool: { driver: { name: string } };
    results: Array<{ ruleId: string; level: string; locations?: unknown[] }>;
  }>;
}

describe('arch-lens --report sarif (e2e)', () => {
  afterAll(() => {
    cleanupSuite();
  });

  it('emits a single SARIF 2.1.0 document', () => {
    const dir = makeProject('sarif');
    writeFile(dir, 'src/a.ts', "import './b';\nexport const a = 1;\n");
    writeFile(dir, 'src/b.ts', "import './a';\nexport const b = 1;\n");
    writeConfig(dir, ['dependency/no-circular']);

    const result = runCli(
      ['scan', '--report', 'sarif', '--config', 'arch.config.mjs', '--allow-violations'],
      dir,
    );

    const sarif = JSON.parse(result.stdout) as SarifLog;
    expect(sarif.version).toBe('2.1.0');
    expect(sarif.runs[0].tool.driver.name).toBe('Arch-Lens');
    expect(sarif.runs[0].results.some((r) => r.ruleId === 'dependency/no-circular')).toBe(true);
    expect(sarif.runs[0].results[0].level).toBe('error');
  });
});
