import type { ArchitectureGraph, GraphNodeId } from '@arch-lens/rules';
import { describe, expect, it } from 'vitest';

import { computeAffected } from '../src/incremental/affected.js';

/** Fake graph from a dependency (out-edge) adjacency map; derives dependents (in-edges). */
function makeGraph(adjacency: Record<string, string[]>): ArchitectureGraph {
  const dependents: Record<string, string[]> = {};
  for (const [from, tos] of Object.entries(adjacency)) {
    for (const to of tos) {
      (dependents[to] ??= []).push(from);
    }
  }
  return {
    nodes: () => Object.keys(adjacency),
    hasNode: (id: GraphNodeId) => id in adjacency,
    edges: () => [],
    dependenciesOf: (id: GraphNodeId) => adjacency[id] ?? [],
    dependentsOf: (id: GraphNodeId) => dependents[id] ?? [],
    isReachable: () => false,
    shortestPath: () => null,
    stronglyConnectedComponents: () => [],
  };
}

describe('computeAffected', () => {
  const graph = makeGraph({ 'a.ts': ['b.ts'], 'b.ts': ['c.ts'], 'c.ts': [] }); // a -> b -> c

  it('includes the changed file and its transitive dependents', () => {
    // Changing c affects b (imports c) and a (imports b).
    expect([...computeAffected(graph, ['c.ts'])].sort()).toEqual(['a.ts', 'b.ts', 'c.ts']);
  });

  it('includes only the changed file when nothing depends on it', () => {
    expect([...computeAffected(graph, ['a.ts'])]).toEqual(['a.ts']);
  });

  it('keeps a changed file that is not in the graph', () => {
    expect([...computeAffected(graph, ['new.ts'])]).toEqual(['new.ts']);
  });
});
