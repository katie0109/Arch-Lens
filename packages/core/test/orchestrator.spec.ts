// @ts-nocheck

import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import type { ArchLensRule, RuleContext } from '@arch-lens/rules';

import { ArchLensOrchestrator } from '../src/orchestrator/index.js';
import * as reporter from '../src/reporter/console-reporter.js';

describe('ArchLensOrchestrator report adapter', () => {
  let workspace: string;

  afterEach(async () => {
    if (workspace) {
      await rm(workspace, { recursive: true, force: true });
    }
  });

  it('normalises single violations passed to context.report()', async () => {
    workspace = await mkdtemp(join(tmpdir(), 'arch-lens-orchestrator-'));

    const rule: ArchLensRule = {
      id: 'test/single-report',
      meta: {
        description: 'Ensure report adapter accepts single violations.',
        severity: 'error',
        type: 'structure',
      },
      async check() {
        return [];
      },
      async fix(context: RuleContext) {
        context.report?.({
          ruleId: 'test/single-report',
          message: 'Single violation passed from fix()',
        });
      },
    };

    const orchestrator = ArchLensOrchestrator.fromConfig(workspace, {
      root: workspace,
      include: ['**/*.ts'],
      exclude: [],
      rules: [rule],
    });

    const reportSpy = vi
      .spyOn(reporter, 'reportViolations')
      .mockImplementation(() => {
        /* 테스트용: 별도 동작 없음 */
      });

    const result = await orchestrator.scan({ fix: true, reportFormat: 'json' });

    expect(result).toEqual([]);
    expect(reportSpy).toHaveBeenCalled();

    const [firstCall] = reportSpy.mock.calls;
    expect(Array.isArray(firstCall[0])).toBe(true);

    reportSpy.mockRestore();
  });
});
