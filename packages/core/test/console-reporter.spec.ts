import { afterEach, describe, expect, it, vi } from 'vitest';

import type { RuleViolation } from 'arch-lens-rules';

import { reportViolations } from '../src/reporter/console-reporter.js';

const sample: RuleViolation[] = [
  {
    ruleId: 'structure/required-feature-index',
    message: 'Missing index.ts in src/features/Cart.',
    file: 'src/features/Cart/index.ts',
    line: 1,
    column: 2,
    fixable: true,
    suggestedFix: 'Create the file',
  },
];

describe('reportViolations', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function captureLog(fn: () => void): string {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'table').mockImplementation(() => {});
    fn();
    return spy.mock.calls.map((c) => String(c[0])).join('\n');
  }

  it('emits a single JSON document with count and violations', () => {
    const out = captureLog(() => reportViolations(sample, { format: 'json' }));
    const parsed = JSON.parse(out) as { count: number; violations: unknown[] };
    expect(parsed.count).toBe(1);
    expect(parsed.violations).toHaveLength(1);
  });

  it('pretty-prints JSON when requested', () => {
    const out = captureLog(() => reportViolations(sample, { format: 'json', pretty: true }));
    expect(out).toContain('\n');
    expect(() => JSON.parse(out)).not.toThrow();
  });

  it('reports a clean state for the non-json formats when there are no violations', () => {
    const out = captureLog(() => reportViolations([], { format: 'table' }));
    expect(out).toContain('No violations');
  });

  it('renders a markdown table', () => {
    const out = captureLog(() => reportViolations(sample, { format: 'markdown' }));
    expect(out).toContain('| Rule |');
    expect(out).toContain('structure/required-feature-index');
  });

  it('renders an html table', () => {
    const out = captureLog(() => reportViolations(sample, { format: 'html' }));
    expect(out).toContain('<table>');
    expect(out).toContain('structure/required-feature-index');
  });

  it('renders a plain list', () => {
    const out = captureLog(() => reportViolations(sample, { format: 'list' }));
    expect(out).toContain('structure/required-feature-index');
    expect(out).toContain('Suggested fix');
  });
});
