import type { ArchitectureGraph, GraphEdge, GraphNodeId } from '@arch-lens/rules';

/**
 * Builds an {@link ArchitectureGraph} over pre-computed adjacency maps. Shared by the file graph
 * and the project graph so the query algorithms (reachability, shortest path, SCCs) live in one
 * place. `edgeTypeOnly` is keyed by `"${from} ${to}"`; missing entries default to false.
 */
export function createGraph(
  outgoing: Map<GraphNodeId, Set<GraphNodeId>>,
  incoming: Map<GraphNodeId, Set<GraphNodeId>>,
  edgeTypeOnly: Map<string, boolean> = new Map(),
): ArchitectureGraph {
  const neighbours = (map: Map<GraphNodeId, Set<GraphNodeId>>, id: GraphNodeId): GraphNodeId[] =>
    [...(map.get(id) ?? [])];

  function hasNode(id: GraphNodeId): boolean {
    return outgoing.has(id);
  }

  function edges(): GraphEdge[] {
    const result: GraphEdge[] = [];
    for (const [from, targets] of outgoing) {
      for (const to of targets) {
        result.push({ from, to, isTypeOnly: edgeTypeOnly.get(`${from} ${to}`) ?? false });
      }
    }
    return result;
  }

  function isReachable(from: GraphNodeId, to: GraphNodeId): boolean {
    if (!hasNode(from) || !hasNode(to)) {
      return false;
    }

    const seen = new Set<GraphNodeId>();
    const queue: GraphNodeId[] = [...(outgoing.get(from) ?? [])];
    queue.forEach((n) => seen.add(n));

    while (queue.length > 0) {
      const current = queue.shift() as GraphNodeId;
      if (current === to) {
        return true;
      }
      for (const next of outgoing.get(current) ?? []) {
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }

    return false;
  }

  function shortestPath(from: GraphNodeId, to: GraphNodeId): GraphNodeId[] | null {
    if (!hasNode(from) || !hasNode(to)) {
      return null;
    }
    if (from === to) {
      return [from];
    }

    const previous = new Map<GraphNodeId, GraphNodeId>();
    const seen = new Set<GraphNodeId>([from]);
    const queue: GraphNodeId[] = [from];

    while (queue.length > 0) {
      const current = queue.shift() as GraphNodeId;
      for (const next of outgoing.get(current) ?? []) {
        if (seen.has(next)) {
          continue;
        }
        seen.add(next);
        previous.set(next, current);
        if (next === to) {
          const path = [to];
          let step = current;
          while (step !== from) {
            path.unshift(step);
            step = previous.get(step) as GraphNodeId;
          }
          path.unshift(from);
          return path;
        }
        queue.push(next);
      }
    }

    return null;
  }

  function stronglyConnectedComponents(): GraphNodeId[][] {
    // Iterative Tarjan to avoid deep recursion on large graphs.
    const indexOf = new Map<GraphNodeId, number>();
    const lowlink = new Map<GraphNodeId, number>();
    const onStack = new Set<GraphNodeId>();
    const stack: GraphNodeId[] = [];
    const components: GraphNodeId[][] = [];
    let index = 0;

    for (const start of outgoing.keys()) {
      if (indexOf.has(start)) {
        continue;
      }

      const work: Array<{ node: GraphNodeId; neighbours: GraphNodeId[]; i: number }> = [
        { node: start, neighbours: [...(outgoing.get(start) ?? [])], i: 0 },
      ];
      indexOf.set(start, index);
      lowlink.set(start, index);
      index += 1;
      stack.push(start);
      onStack.add(start);

      while (work.length > 0) {
        const frame = work[work.length - 1] as {
          node: GraphNodeId;
          neighbours: GraphNodeId[];
          i: number;
        };

        if (frame.i < frame.neighbours.length) {
          const next = frame.neighbours[frame.i] as GraphNodeId;
          frame.i += 1;

          if (!indexOf.has(next)) {
            indexOf.set(next, index);
            lowlink.set(next, index);
            index += 1;
            stack.push(next);
            onStack.add(next);
            work.push({ node: next, neighbours: [...(outgoing.get(next) ?? [])], i: 0 });
          } else if (onStack.has(next)) {
            lowlink.set(frame.node, Math.min(lowlink.get(frame.node)!, indexOf.get(next)!));
          }
        } else {
          if (lowlink.get(frame.node) === indexOf.get(frame.node)) {
            const component: GraphNodeId[] = [];
            let popped: GraphNodeId;
            do {
              popped = stack.pop() as GraphNodeId;
              onStack.delete(popped);
              component.push(popped);
            } while (popped !== frame.node);
            components.push(component);
          }

          work.pop();
          const parent = work[work.length - 1];
          if (parent) {
            lowlink.set(parent.node, Math.min(lowlink.get(parent.node)!, lowlink.get(frame.node)!));
          }
        }
      }
    }

    return components;
  }

  return {
    nodes: () => [...outgoing.keys()],
    hasNode,
    edges,
    dependenciesOf: (id) => neighbours(outgoing, id),
    dependentsOf: (id) => neighbours(incoming, id),
    isReachable,
    shortestPath,
    stronglyConnectedComponents,
  };
}
