import type { ArchitectureGraph, GraphNodeId } from 'arch-lens-rules';

/**
 * The affected set for an incremental scan: the changed files plus every file that (transitively)
 * depends on them. A change to X can only break rules touching X or something downstream of X, so
 * violations outside this set are unrelated to the change and can be filtered out.
 */
export function computeAffected(graph: ArchitectureGraph, changed: GraphNodeId[]): Set<GraphNodeId> {
  const affected = new Set<GraphNodeId>(changed);

  // BFS upward over dependents, seeded by the changed files that exist in the graph.
  const queue = changed.filter((id) => graph.hasNode(id));
  const visited = new Set<GraphNodeId>(queue);

  while (queue.length > 0) {
    const current = queue.shift() as GraphNodeId;
    for (const dependent of graph.dependentsOf(current)) {
      affected.add(dependent);
      if (!visited.has(dependent)) {
        visited.add(dependent);
        queue.push(dependent);
      }
    }
  }

  return affected;
}
