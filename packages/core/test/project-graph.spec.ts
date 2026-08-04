import type { ArchitectureGraph } from 'arch-lens-rules';
import { describe, expect, it } from 'vitest';

import { buildProjectGraph } from '../src/graph/project-graph.js';

/** Minimal file graph exposing just what buildProjectGraph reads (nodes + edges). */
function fileGraph(nodes: string[], edges: Array<[string, string]>): ArchitectureGraph {
  return {
    nodes: () => nodes,
    hasNode: (id) => nodes.includes(id),
    edges: () => edges.map(([from, to]) => ({ from, to, isTypeOnly: false })),
    dependenciesOf: () => [],
    dependentsOf: () => [],
    isReachable: () => false,
    shortestPath: () => null,
    stronglyConnectedComponents: () => [],
  };
}

const projects = [
  { name: 'a', pattern: '^packages/a/' },
  { name: 'b', pattern: '^packages/b/' },
  { name: 'c', pattern: '^packages/c/' },
];

describe('buildProjectGraph', () => {
  it('aggregates files into projects and cross-project edges', () => {
    const pg = buildProjectGraph(
      fileGraph(
        ['packages/a/x.ts', 'packages/b/y.ts', 'packages/c/z.ts', 'misc/other.ts'],
        [
          ['packages/a/x.ts', 'packages/b/y.ts'],
          ['packages/b/y.ts', 'packages/c/z.ts'],
          ['packages/a/x.ts', 'misc/other.ts'], // misc is unmapped -> no project edge
        ],
      ),
      projects,
    );

    expect(pg.nodes().sort()).toEqual(['a', 'b', 'c']);
    expect(pg.dependenciesOf('a')).toEqual(['b']);
    expect(pg.dependenciesOf('b')).toEqual(['c']);
    expect(pg.isReachable('a', 'c')).toBe(true); // transitive through b
    expect(pg.shortestPath('a', 'c')).toEqual(['a', 'b', 'c']);
  });

  it('ignores edges within the same project', () => {
    const pg = buildProjectGraph(
      fileGraph(
        ['packages/a/x.ts', 'packages/a/y.ts'],
        [['packages/a/x.ts', 'packages/a/y.ts']],
      ),
      projects,
    );
    expect(pg.nodes()).toEqual(['a']);
    expect(pg.dependenciesOf('a')).toEqual([]);
  });

  it('detects project-level cycles as SCCs', () => {
    const pg = buildProjectGraph(
      fileGraph(
        ['packages/a/x.ts', 'packages/b/y.ts'],
        [
          ['packages/a/x.ts', 'packages/b/y.ts'],
          ['packages/b/y.ts', 'packages/a/x.ts'],
        ],
      ),
      projects,
    );
    const cyclic = pg.stronglyConnectedComponents().filter((c) => c.length >= 2);
    expect(cyclic).toHaveLength(1);
    expect(cyclic[0]!.sort()).toEqual(['a', 'b']);
  });
});
