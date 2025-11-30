import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { join } from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';

import {
  createNoCircularRule,
  noCircularDependencyRule,
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

describe('dependency/no-circular', () => {
  let workspace: string;

  beforeEach(async () => {
    workspace = await mkdtemp(join(tmpdir(), 'arch-lens-no-circular-'));
  });

  afterEach(async () => {
    await rm(workspace, { recursive: true, force: true });
  });

  it('detects circular dependencies', async () => {
    const entries: GraphEntry[] = [
      {
        file: 'src/a.ts',
        imports: [
          {
            specifier: './b',
            target: 'src/b.ts',
          },
        ],
      },
      {
        file: 'src/b.ts',
        imports: [
          {
            specifier: './c',
            target: 'src/c.ts',
          },
        ],
      },
      {
        file: 'src/c.ts',
        imports: [
          {
            specifier: './a',
            target: 'src/a.ts',
          },
        ],
      },
    ];

    const context = createContext(workspace, entries);
    const violations = await noCircularDependencyRule.check(context);

    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      ruleId: 'dependency/no-circular',
      message: expect.stringContaining('Circular dependency detected'),
      suggestedFix: expect.stringContaining('Break the cycle'),
    });
  });

  it('passes when dependency graph is acyclic', async () => {
    const entries: GraphEntry[] = [
      {
        file: 'src/a.ts',
        imports: [
          {
            specifier: './b',
            target: 'src/b.ts',
          },
        ],
      },
      {
        file: 'src/b.ts',
        imports: [],
      },
    ];

    const context = createContext(workspace, entries);
    const violations = await noCircularDependencyRule.check(context);

    expect(violations).toHaveLength(0);
  });

  it('reports violations when fix is invoked', async () => {
    const entries: GraphEntry[] = [
      {
        file: 'src/a.ts',
        imports: [
          {
            specifier: './b',
            target: 'src/b.ts',
          },
        ],
      },
      {
        file: 'src/b.ts',
        imports: [
          {
            specifier: './a',
            target: 'src/a.ts',
          },
        ],
      },
    ];

    const graph = createDependencyGraph(workspace, entries);
    const report = vi.fn();
    const rule = createNoCircularRule();

    await rule.fix?.({
      root: workspace,
      files: entries.map((entry) => entry.file),
      fix: true,
      verbose: false,
      dependencyGraph: graph,
      report,
    });

    expect(report).toHaveBeenCalledTimes(1);
    const reportedViolations = report.mock.calls[0][0];
    expect(reportedViolations).toHaveLength(1);
    expect(reportedViolations[0]).toMatchObject({ ruleId: 'dependency/no-circular' });
  });
});
