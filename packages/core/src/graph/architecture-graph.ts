import { relative } from 'node:path';

import type { ArchitectureGraph, GraphNodeId } from 'arch-lens-rules';

import type { DependencyGraph } from '../parser/ts-dependency-graph.js';

import { createGraph } from './create-graph.js';

function toPosix(value: string): string {
  return value.replace(/\\/g, '/');
}

/**
 * Wraps the raw per-file dependency map in a queryable {@link ArchitectureGraph}. Only
 * first-party file→file edges are kept: imports that don't resolve, resolve outside `root`,
 * or resolve into node_modules are dropped, since architecture rules reason about the
 * project's own module graph.
 */
export function buildArchitectureGraph(
  dependencyGraph: DependencyGraph,
  root: string,
): ArchitectureGraph {
  const outgoing = new Map<GraphNodeId, Set<GraphNodeId>>();
  const incoming = new Map<GraphNodeId, Set<GraphNodeId>>();
  const edgeTypeOnly = new Map<string, boolean>();

  const ensureNode = (id: GraphNodeId): void => {
    if (!outgoing.has(id)) {
      outgoing.set(id, new Set());
    }
    if (!incoming.has(id)) {
      incoming.set(id, new Set());
    }
  };

  for (const [file, imports] of dependencyGraph.entries()) {
    const from = toPosix(file);
    ensureNode(from);

    for (const reference of imports) {
      if (!reference.resolved) {
        continue;
      }

      const target = toPosix(relative(root, reference.resolved));

      // Skip imports that leave the project root or land in node_modules, and self-imports.
      if (target === '' || target.startsWith('..') || target.includes('node_modules')) {
        continue;
      }
      if (target === from) {
        continue;
      }

      ensureNode(target);
      outgoing.get(from)!.add(target);
      incoming.get(target)!.add(from);

      // An edge is type-only only if *every* import forming it is type-only.
      const key = `${from} ${target}`;
      const prev = edgeTypeOnly.get(key);
      const isTypeOnly = Boolean(reference.isTypeOnly);
      edgeTypeOnly.set(key, prev === undefined ? isTypeOnly : prev && isTypeOnly);
    }
  }

  return createGraph(outgoing, incoming, edgeTypeOnly);
}
