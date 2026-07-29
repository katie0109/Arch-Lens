import type { ArchitectureGraph, GraphNodeId, RuleContext } from '@arch-lens/rules';
import { describe, expect, it } from 'vitest';

import {
  createGatewayOnlyAccessRule,
  type GatewayOnlyAccessOptions,
} from '../src/sample/gateway-only-access.js';

/** Minimal ArchitectureGraph over an adjacency map (the rule only uses nodes()/dependenciesOf()). */
function makeGraph(adjacency: Record<string, string[]>): ArchitectureGraph {
  const nodes = Object.keys(adjacency);
  return {
    nodes: () => nodes,
    hasNode: (id: GraphNodeId) => id in adjacency,
    edges: () => [],
    dependenciesOf: (id: GraphNodeId) => adjacency[id] ?? [],
    dependentsOf: () => [],
    isReachable: () => false,
    shortestPath: () => null,
    stronglyConnectedComponents: () => [],
  };
}

function runCheck(adjacency: Record<string, string[]>, options: GatewayOnlyAccessOptions) {
  const context = {
    root: '/proj',
    files: [],
    fix: false,
    verbose: false,
    dependencyGraph: new Map(),
    graph: makeGraph(adjacency),
    options,
  } as RuleContext;

  const result = createGatewayOnlyAccessRule().check(context);
  return Array.isArray(result) ? result : [];
}

const base: GatewayOnlyAccessOptions = {
  restricted: ['^src/legacy/'],
  gateways: ['^src/gateway/'],
  now: '2026-07-29',
};

describe('gateway-only-access', () => {
  it('flags direct access to the restricted area', () => {
    const violations = runCheck(
      { 'src/app/a.ts': ['src/legacy/db.ts'], 'src/legacy/db.ts': [] },
      base,
    );
    expect(violations).toHaveLength(1);
    expect(violations[0].file).toBe('src/app/a.ts');
    expect(violations[0].message).toContain('src/legacy/db.ts');
  });

  it('flags transitive access that bypasses the gateway', () => {
    const violations = runCheck(
      {
        'src/app/a.ts': ['src/util/m.ts'],
        'src/util/m.ts': ['src/legacy/db.ts'],
        'src/legacy/db.ts': [],
      },
      base,
    );
    expect(violations.map((v) => v.file)).toContain('src/app/a.ts');
  });

  it('allows access that goes through a gateway', () => {
    const violations = runCheck(
      {
        'src/app/a.ts': ['src/gateway/legacy.ts'],
        'src/gateway/legacy.ts': ['src/legacy/db.ts'],
        'src/legacy/db.ts': [],
      },
      base,
    );
    expect(violations).toHaveLength(0);
  });

  it('suppresses a violation while a waiver is active', () => {
    const violations = runCheck(
      { 'src/app/a.ts': ['src/legacy/db.ts'], 'src/legacy/db.ts': [] },
      { ...base, waivers: [{ from: '^src/app/a\\.ts$', until: '2026-12-31' }] },
    );
    expect(violations).toHaveLength(0);
  });

  it('does not suppress once the waiver has expired', () => {
    const violations = runCheck(
      { 'src/app/a.ts': ['src/legacy/db.ts'], 'src/legacy/db.ts': [] },
      { ...base, waivers: [{ from: '^src/app/a\\.ts$', until: '2020-01-01' }] },
    );
    expect(violations).toHaveLength(1);
  });

  it('returns nothing without restricted/gateway options', () => {
    expect(runCheck({ 'src/app/a.ts': [] }, { restricted: [], gateways: [] })).toHaveLength(0);
  });
});
