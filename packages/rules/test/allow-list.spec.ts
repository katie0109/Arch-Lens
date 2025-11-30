import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { join } from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';

import {
  createDependencyAllowListRule,
  dependencyAllowListRule,
  type RuleContext,
  type RuleDependencyGraph,
  type RuleImportReference,
} from '../src/index.js';

type GraphEntry = {
  file: string;
  imports: Array<{
    specifier: string;
    target?: string | null;
    isTypeOnly?: boolean;
  }>;
};

function createDependencyGraph(root: string, entries: GraphEntry[]): RuleDependencyGraph {
  const graph: RuleDependencyGraph = new Map();

  for (const entry of entries) {
    const imports: RuleImportReference[] = entry.imports.map((item) => ({
      specifier: item.specifier,
      isTypeOnly: Boolean(item.isTypeOnly),
      resolved: item.target ? join(root, item.target) : null,
    }));

    graph.set(entry.file, imports);
  }

  return graph;
}

function createContext(root: string, graphEntries: GraphEntry[]): RuleContext {
  return {
    root,
    files: graphEntries.map((entry) => entry.file),
    fix: false,
    verbose: false,
    dependencyGraph: createDependencyGraph(root, graphEntries),
  };
}

describe('dependency/allow-list', () => {
  let workspace: string;

  beforeEach(async () => {
    workspace = await mkdtemp(join(tmpdir(), 'arch-lens-allow-list-'));
  });

  afterEach(async () => {
    await rm(workspace, { recursive: true, force: true });
  });

  it('flags imports that are not part of the allow list', async () => {
    const context = createContext(workspace, [
      {
        file: 'src/features/Cart/cart-service.ts',
        imports: [
          {
            specifier: '../Payment/payment-service',
            target: 'src/features/Payment/payment-service.ts',
          },
        ],
      },
    ]);

    const violations = await dependencyAllowListRule.check(context);

    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      ruleId: 'dependency/allow-list',
      file: 'src/features/Cart/cart-service.ts',
      message: expect.stringContaining('not allowed'),
    });
  });

  it('allows imports defined in the default allow list', async () => {
    const context = createContext(workspace, [
      {
        file: 'src/features/Cart/cart-service.ts',
        imports: [
          {
            specifier: '../../shared/utils',
            target: 'src/shared/utils.ts',
          },
        ],
      },
    ]);

    const violations = await dependencyAllowListRule.check(context);

    expect(violations).toHaveLength(0);
  });

  it('respects custom allow list configuration', async () => {
    const rule = createDependencyAllowListRule({
      entries: [
        {
          from: '^src/features/Cart/',
          allow: ['^src/features/Payment/'],
        },
      ],
    });

    const context = createContext(workspace, [
      {
        file: 'src/features/Cart/cart-service.ts',
        imports: [
          {
            specifier: '../Payment/payment-service',
            target: 'src/features/Payment/payment-service.ts',
          },
        ],
      },
    ]);

    const violations = await rule.check(context);

    expect(violations).toHaveLength(0);
  });

  it('reports violations through fix when present', async () => {
    const entries: GraphEntry[] = [
      {
        file: 'src/features/Cart/cart-service.ts',
        imports: [
          {
            specifier: '../Payment/payment-service',
            target: 'src/features/Payment/payment-service.ts',
          },
        ],
      },
    ];

    const graph = createDependencyGraph(workspace, entries);
    const report = vi.fn();

    await dependencyAllowListRule.fix?.({
      root: workspace,
      files: entries.map((entry) => entry.file),
      fix: true,
      verbose: false,
      dependencyGraph: graph,
      report,
    });

    expect(report).toHaveBeenCalledTimes(1);
    const [reportedViolations] = report.mock.calls[0];
    expect(reportedViolations).toHaveLength(1);
    expect(reportedViolations[0]).toMatchObject({ ruleId: 'dependency/allow-list' });
  });
});
