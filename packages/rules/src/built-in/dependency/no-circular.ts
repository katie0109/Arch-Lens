import path from 'node:path';

import type {
  ArchLensRule,
  RuleContext,
  RuleDependencyGraph,
  RuleViolation,
} from '../../index.js';

function buildAdjacency(graph: RuleDependencyGraph, root: string): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>();

  for (const [file, imports] of graph.entries()) {
    const normalizedFile = file.replace(/\\/g, '/');
    const edges = adjacency.get(normalizedFile) ?? new Set<string>();

    for (const reference of imports) {
      if (!reference.resolved) {
        continue;
      }

      const targetRelative = path.relative(root, reference.resolved).replace(/\\/g, '/');

      if (targetRelative === normalizedFile) {
        continue;
      }

      edges.add(targetRelative);
    }

    adjacency.set(normalizedFile, edges);
  }

  return adjacency;
}

function findCycles(graph: Map<string, Set<string>>): string[][] {
  const cycles: string[][] = [];
  const stack: string[] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();

  const dfs = (node: string) => {
    if (inStack.has(node)) {
      const cycleStart = stack.indexOf(node);
      if (cycleStart !== -1) {
        cycles.push([...stack.slice(cycleStart), node]);
      }
      return;
    }

    if (visited.has(node)) {
      return;
    }

    visited.add(node);
    inStack.add(node);
    stack.push(node);

    for (const neighbour of graph.get(node) ?? []) {
      dfs(neighbour);
    }

    stack.pop();
    inStack.delete(node);
  };

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return cycles;
}

export function createNoCircularRule(): ArchLensRule {
  return {
    id: 'dependency/no-circular',
    meta: {
      description: 'Detect circular dependencies between modules.',
      severity: 'error',
      type: 'dependency',
    },
    async check({ dependencyGraph, root }: RuleContext): Promise<RuleViolation[]> {
      const adjacency = buildAdjacency(dependencyGraph, root);
      const cycles = findCycles(adjacency);
      const violations: RuleViolation[] = [];

      for (const cycle of cycles) {
        const readableCycle = cycle.join(' -> ');
        const file = cycle[0];

        violations.push({
          ruleId: 'dependency/no-circular',
          message: `Circular dependency detected: ${readableCycle}.`,
          file,
          fixable: false,
          suggestedFix:
            'Break the cycle by extracting shared logic into a lower layer or introducing an interface abstraction.',
        });
      }

      return violations;
    },
    async fix({ dependencyGraph, root, report }: RuleContext): Promise<void> {
      const adjacency = buildAdjacency(dependencyGraph, root);
      const cycles = findCycles(adjacency);

      if (!cycles.length) {
        return;
      }

      const violations = cycles.map((cycle) => ({
        ruleId: 'dependency/no-circular',
        message: `Circular dependency detected: ${cycle.join(' -> ')}.`,
        file: cycle[0],
        fixable: false,
        suggestedFix:
          'Break the cycle by extracting shared logic into a lower layer or introducing an interface abstraction.',
      }));

      report?.(violations);
    },
  };
}

export const noCircularDependencyRule = createNoCircularRule();
