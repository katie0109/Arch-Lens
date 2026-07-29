import { afterAll, describe, expect, it } from 'vitest';

import { cleanupSuite, makeProject, runCli, writeConfig, writeFile } from './harness.js';

interface JsonReport {
  violations: Array<{ ruleId: string; file?: string | null }>;
}

function seedCycle(dir: string, a: string, b: string): void {
  writeFile(dir, `src/${a}.ts`, `import './${b}';\nexport const ${a} = 1;\n`);
  writeFile(dir, `src/${b}.ts`, `import './${a}';\nexport const ${b} = 1;\n`);
}

/** Two independent circular-dependency violations, on {a,b} and {c,d}. */
function seedTwoCycles(dir: string): void {
  seedCycle(dir, 'a', 'b');
  seedCycle(dir, 'c', 'd');
  writeConfig(dir, ['dependency/no-circular']);
}

function files(report: JsonReport): string[] {
  return report.violations.map((v) => (v.file ?? '').replace(/^src\//, ''));
}

describe('arch-lens --affected (e2e)', () => {
  afterAll(() => {
    cleanupSuite();
  });

  it('reports both cycles in a full scan', () => {
    const dir = makeProject('affected-full');
    seedTwoCycles(dir);

    const result = runCli(['scan', '--report', 'json', '--config', 'arch.config.mjs', '--allow-violations'], dir);
    const touched = files(JSON.parse(result.stdout) as JsonReport).join(' ');

    expect(/[ab]\.ts/.test(touched)).toBe(true);
    expect(/[cd]\.ts/.test(touched)).toBe(true);
  });

  it('keeps only violations on the changed file and its dependents', () => {
    const dir = makeProject('affected-only');
    seedTwoCycles(dir);

    // Change only src/a.ts -> affected = {a, b}; the c/d cycle must be filtered out.
    const result = runCli(
      [
        'scan',
        '--report',
        'json',
        '--config',
        'arch.config.mjs',
        '--allow-violations',
        '--affected',
        '--changed',
        'src/a.ts',
      ],
      dir,
    );

    const report = JSON.parse(result.stdout) as JsonReport;
    const touched = files(report);

    expect(touched.length).toBeGreaterThan(0);
    expect(touched.every((f) => f === 'a.ts' || f === 'b.ts')).toBe(true);
    expect(touched.some((f) => f === 'c.ts' || f === 'd.ts')).toBe(false);
  });
});
