import { resolve } from 'node:path';

import type { RuleImportReference } from '@moth-tools/arch-lens-rules';
import { describe, expect, it } from 'vitest';

import { buildArchitectureGraph } from '../src/graph/architecture-graph.js';
import type { DependencyGraph } from '../src/parser/ts-dependency-graph.js';

const root = resolve('/proj');

function ref(relTarget: string, isTypeOnly = false): RuleImportReference {
  return { specifier: relTarget, isTypeOnly, resolved: resolve(root, relTarget) };
}

/** Builds a graph from a compact {file: [targets]} description. */
function graphOf(edges: Record<string, Array<string | RuleImportReference>>) {
  const map: DependencyGraph = new Map();
  for (const [file, targets] of Object.entries(edges)) {
    map.set(
      file,
      targets.map((t) => (typeof t === 'string' ? ref(t) : t)),
    );
  }
  return buildArchitectureGraph(map, root);
}

describe('buildArchitectureGraph', () => {
  it('exposes first-party nodes and direct dependency/dependent edges', () => {
    const g = graphOf({
      'src/a.ts': ['src/b.ts', 'src/c.ts'],
      'src/b.ts': ['src/c.ts'],
      'src/c.ts': [],
    });

    expect(g.nodes().sort()).toEqual(['src/a.ts', 'src/b.ts', 'src/c.ts']);
    expect(g.dependenciesOf('src/a.ts').sort()).toEqual(['src/b.ts', 'src/c.ts']);
    expect(g.dependentsOf('src/c.ts').sort()).toEqual(['src/a.ts', 'src/b.ts']);
    expect(g.hasNode('src/x.ts')).toBe(false);
  });

  it('drops external, unresolved, and node_modules imports', () => {
    const map: DependencyGraph = new Map([
      [
        'src/a.ts',
        [
          ref('src/b.ts'),
          { specifier: 'lodash', isTypeOnly: false, resolved: null },
          { specifier: 'react', isTypeOnly: false, resolved: resolve(root, 'node_modules/react/index.js') },
          { specifier: '../outside.ts', isTypeOnly: false, resolved: resolve('/outside.ts') },
        ],
      ],
      ['src/b.ts', []],
    ]);
    const g = buildArchitectureGraph(map, root);

    expect(g.dependenciesOf('src/a.ts')).toEqual(['src/b.ts']);
    expect(g.nodes().sort()).toEqual(['src/a.ts', 'src/b.ts']);
  });

  it('computes reachability following at least one edge', () => {
    const g = graphOf({ 'src/a.ts': ['src/b.ts'], 'src/b.ts': ['src/c.ts'], 'src/c.ts': [] });

    expect(g.isReachable('src/a.ts', 'src/c.ts')).toBe(true);
    expect(g.isReachable('src/c.ts', 'src/a.ts')).toBe(false);
    // No self-reachability without a cycle.
    expect(g.isReachable('src/a.ts', 'src/a.ts')).toBe(false);
  });

  it('returns an inclusive shortest path or null', () => {
    const g = graphOf({
      'src/a.ts': ['src/b.ts', 'src/d.ts'],
      'src/b.ts': ['src/c.ts'],
      'src/d.ts': ['src/c.ts'],
      'src/c.ts': [],
    });

    const path = g.shortestPath('src/a.ts', 'src/c.ts');
    expect(path).not.toBeNull();
    expect(path?.[0]).toBe('src/a.ts');
    expect(path?.[path.length - 1]).toBe('src/c.ts');
    expect(path).toHaveLength(3);

    expect(g.shortestPath('src/a.ts', 'src/a.ts')).toEqual(['src/a.ts']);
    expect(g.shortestPath('src/c.ts', 'src/a.ts')).toBeNull();
  });

  it('finds strongly-connected components (cycles)', () => {
    const g = graphOf({
      'src/a.ts': ['src/b.ts'],
      'src/b.ts': ['src/c.ts'],
      'src/c.ts': ['src/a.ts'], // a -> b -> c -> a
      'src/d.ts': ['src/a.ts'],
    });

    const cyclic = g
      .stronglyConnectedComponents()
      .filter((component) => component.length >= 2)
      .map((component) => component.slice().sort());

    expect(cyclic).toHaveLength(1);
    expect(cyclic[0]).toEqual(['src/a.ts', 'src/b.ts', 'src/c.ts']);
    // a self-reaches through the cycle
    expect(g.isReachable('src/a.ts', 'src/a.ts')).toBe(true);
  });

  it('marks an edge type-only only when every import forming it is type-only', () => {
    const g = graphOf({
      'src/a.ts': [ref('src/b.ts', true)],
      'src/b.ts': [ref('src/c.ts', true), ref('src/c.ts', false)],
      'src/c.ts': [],
    });

    const edges = g.edges();
    expect(edges.find((e) => e.from === 'src/a.ts' && e.to === 'src/b.ts')?.isTypeOnly).toBe(true);
    expect(edges.find((e) => e.from === 'src/b.ts' && e.to === 'src/c.ts')?.isTypeOnly).toBe(false);
  });
});
