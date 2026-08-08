import type { RuleViolation } from 'arch-lens-rules';
import { describe, expect, it } from 'vitest';

import { buildSarif } from '../src/reporter/sarif.js';

const violations: RuleViolation[] = [
  {
    ruleId: 'dependency/no-circular',
    severity: 'error',
    message: 'Circular dependency detected.',
    file: 'src/a.ts',
    line: 3,
    column: 1,
  },
  {
    ruleId: 'structure/filename-case',
    severity: 'warning',
    message: 'Bad filename.',
    file: 'src/b.ts',
  },
  {
    ruleId: 'dependency/no-circular',
    severity: 'error',
    message: 'Another cycle.',
    // no file
  },
];

describe('buildSarif', () => {
  it('produces a valid SARIF 2.1.0 shell', () => {
    const sarif = buildSarif(violations);
    expect(sarif.version).toBe('2.1.0');
    expect(sarif.runs).toHaveLength(1);
    expect(sarif.runs[0].tool.driver.name).toBe('Arch-Lens');
  });

  it('lists each unique rule id once in the driver', () => {
    const sarif = buildSarif(violations);
    const ids = sarif.runs[0].tool.driver.rules.map((r) => r.id);
    expect(ids).toEqual(['dependency/no-circular', 'structure/filename-case']);
  });

  it('maps severity to SARIF level and carries locations', () => {
    const [first, second, third] = buildSarif(violations).runs[0].results;
    expect(first.level).toBe('error');
    expect(first.locations?.[0].physicalLocation.artifactLocation.uri).toBe('src/a.ts');
    expect(first.locations?.[0].physicalLocation.region?.startLine).toBe(3);
    expect(second.level).toBe('warning');
    // A violation without a file has no locations.
    expect(third.locations).toBeUndefined();
  });
});
