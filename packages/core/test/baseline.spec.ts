import type { RuleViolation } from '@moth-tools/arch-lens-rules';
import { describe, expect, it } from 'vitest';

import { applyBaseline, computeBaseline, isBaselineData } from '../src/baseline/baseline.js';

function v(ruleId: string, file?: string): RuleViolation {
  return { ruleId, message: 'msg', file, severity: 'error' };
}

describe('baseline', () => {
  it('computes counts per rule and file', () => {
    const baseline = computeBaseline([v('r/a', 'x.ts'), v('r/a', 'x.ts'), v('r/b', 'y.ts')]);
    expect(baseline.version).toBe(1);
    expect(baseline.entries).toEqual({ 'r/a': { 'x.ts': 2 }, 'r/b': { 'y.ts': 1 } });
    expect(isBaselineData(baseline)).toBe(true);
  });

  it('suppresses up to the recorded count', () => {
    const baseline = computeBaseline([v('r/a', 'x.ts')]);
    const { remaining, suppressed } = applyBaseline([v('r/a', 'x.ts')], baseline);
    expect(remaining).toHaveLength(0);
    expect(suppressed).toBe(1);
  });

  it('reports only the excess when a file accumulates new violations', () => {
    const baseline = computeBaseline([v('r/a', 'x.ts'), v('r/a', 'x.ts')]);
    const { remaining, suppressed } = applyBaseline(
      [v('r/a', 'x.ts'), v('r/a', 'x.ts'), v('r/a', 'x.ts')],
      baseline,
    );
    expect(suppressed).toBe(2);
    expect(remaining).toHaveLength(1);
  });

  it('does not suppress violations that are not in the baseline', () => {
    const baseline = computeBaseline([v('r/a', 'x.ts')]);
    const { remaining, suppressed } = applyBaseline([v('r/c', 'z.ts')], baseline);
    expect(suppressed).toBe(0);
    expect(remaining).toHaveLength(1);
  });

  it('rejects non-baseline objects', () => {
    expect(isBaselineData({ version: 2, entries: {} })).toBe(false);
    expect(isBaselineData(null)).toBe(false);
  });
});
