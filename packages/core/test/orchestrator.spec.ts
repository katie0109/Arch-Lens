import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ArchLensRule, RuleContext } from 'arch-lens-rules';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ArchLensOrchestrator } from '../src/orchestrator/index.js';
import * as reporter from '../src/reporter/console-reporter.js';

function makeRule(overrides: Partial<ArchLensRule> & Pick<ArchLensRule, 'id' | 'check'>): ArchLensRule {
  return {
    meta: { description: overrides.id, severity: 'error', type: 'structure' },
    ...overrides,
  } as ArchLensRule;
}

describe('ArchLensOrchestrator scan reporting', () => {
  let workspace: string;

  afterEach(async () => {
    if (workspace) {
      await rm(workspace, { recursive: true, force: true });
    }
  });

  it('collects check() violations and reports them exactly once', async () => {
    workspace = await mkdtemp(join(tmpdir(), 'arch-lens-orchestrator-'));

    const rule = makeRule({
      id: 'test/returns',
      check: () => [{ ruleId: 'test/returns', message: 'boom', file: 'a.ts' }],
    });

    const orchestrator = ArchLensOrchestrator.fromConfig(workspace, {
      root: workspace,
      include: ['**/*.ts'],
      exclude: [],
      rules: [rule],
    });

    const reportSpy = vi.spyOn(reporter, 'reportViolations').mockImplementation(() => {});

    const result = await orchestrator.scan({ reportFormat: 'json' });

    expect(result.violations).toHaveLength(1);
    expect(reportSpy).toHaveBeenCalledTimes(1);

    const [firstCall] = reportSpy.mock.calls;
    expect(Array.isArray(firstCall[0])).toBe(true);
    expect(firstCall[0]).toHaveLength(1);

    reportSpy.mockRestore();
  });

  it('collects violations emitted through context.report() during check()', async () => {
    workspace = await mkdtemp(join(tmpdir(), 'arch-lens-orchestrator-'));

    const rule = makeRule({
      id: 'test/reports',
      check: (context: RuleContext) => {
        context.report?.({ ruleId: 'test/reports', message: 'via report' });
        return [];
      },
    });

    const orchestrator = ArchLensOrchestrator.fromConfig(workspace, {
      root: workspace,
      include: ['**/*.ts'],
      exclude: [],
      rules: [rule],
    });

    const reportSpy = vi.spyOn(reporter, 'reportViolations').mockImplementation(() => {});

    const result = await orchestrator.scan({});

    expect(result.violations).toHaveLength(1);
    expect(reportSpy).toHaveBeenCalledTimes(1);

    reportSpy.mockRestore();
  });
});
