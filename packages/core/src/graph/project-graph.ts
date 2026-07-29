import type { ArchitectureGraph, GraphNodeId } from '@arch-lens/rules';

import type { ProjectDefinition } from '../types.js';

import { createGraph } from './create-graph.js';

/**
 * Aggregates the file graph into a project graph. Each file is mapped to a project by the first
 * matching definition (regex over its node id); files matching no project are excluded. A project
 * edge A→B exists when any file in A imports a file in B. Reuses the same query API, so rules can
 * ask `projectGraph.isReachable`, `shortestPath`, `stronglyConnectedComponents`, etc.
 */
export function buildProjectGraph(
  fileGraph: ArchitectureGraph,
  projects: ProjectDefinition[],
): ArchitectureGraph {
  const defs = projects.map((project) => ({ name: project.name, regexp: new RegExp(project.pattern) }));
  const projectOf = (node: GraphNodeId): string | undefined =>
    defs.find((def) => def.regexp.test(node))?.name;

  const outgoing = new Map<GraphNodeId, Set<GraphNodeId>>();
  const incoming = new Map<GraphNodeId, Set<GraphNodeId>>();

  const ensure = (id: GraphNodeId): void => {
    if (!outgoing.has(id)) {
      outgoing.set(id, new Set());
    }
    if (!incoming.has(id)) {
      incoming.set(id, new Set());
    }
  };

  // A project is a node as soon as it owns at least one file.
  for (const node of fileGraph.nodes()) {
    const project = projectOf(node);
    if (project) {
      ensure(project);
    }
  }

  for (const { from, to } of fileGraph.edges()) {
    const fromProject = projectOf(from);
    const toProject = projectOf(to);
    if (fromProject && toProject && fromProject !== toProject) {
      ensure(fromProject);
      ensure(toProject);
      outgoing.get(fromProject)!.add(toProject);
      incoming.get(toProject)!.add(fromProject);
    }
  }

  return createGraph(outgoing, incoming);
}
