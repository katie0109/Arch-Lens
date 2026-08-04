import type {
  ArchLensRule,
  ArchitectureGraph,
  GraphNodeId,
  RuleContext,
  RuleViolation,
} from 'arch-lens-rules';

/**
 * Flagship sample rule.
 *
 * "A module may not reach a restricted area (another team's domain, a legacy zone, …) directly
 * OR transitively — every path must pass through a designated gateway. Time-boxed waivers grant
 * temporary exceptions that automatically expire."
 *
 * This is the kind of policy that plain JSON boundary configs / import DSLs cannot express: it
 * needs graph path-finding, gateway blocking, and dated exceptions — exactly what an executable
 * rule with a graph query API and options provides.
 */
export interface GatewayWaiver {
  /** Regex matched against a source module id (root-relative POSIX path). */
  from: string;
  /** ISO date (YYYY-MM-DD). The waiver is inactive on/after this date. */
  until: string;
  reason?: string;
}

export interface GatewayOnlyAccessOptions {
  /** Regex patterns identifying the restricted area that must only be reached via a gateway. */
  restricted: string[];
  /** Regex patterns identifying gateway modules that are allowed to reach the restricted area. */
  gateways: string[];
  /**
   * Regex patterns identifying which modules the rule applies to. Defaults to every module that
   * is neither restricted nor a gateway.
   */
  from?: string[];
  /** Time-boxed exceptions. */
  waivers?: GatewayWaiver[];
  /** Overrides "today" for deterministic runs/tests. Defaults to the current date. */
  now?: string;
}

const RULE_ID = 'sample/gateway-only-access';

function compile(patterns: string[] | undefined): RegExp[] {
  return (patterns ?? []).map((pattern) => new RegExp(pattern));
}

function matchesAny(regexes: RegExp[], id: GraphNodeId): boolean {
  return regexes.some((regex) => regex.test(id));
}

/**
 * BFS from `source` that never expands *through* a gateway (reaching a gateway is fine — it is
 * the sanctioned door). Returns the first path that arrives at a restricted node without passing
 * a gateway, or null if the restricted area is only reachable via gateways (or not at all).
 */
function findBypassPath(
  graph: ArchitectureGraph,
  source: GraphNodeId,
  isRestricted: (id: GraphNodeId) => boolean,
  isGateway: (id: GraphNodeId) => boolean,
): GraphNodeId[] | null {
  const previous = new Map<GraphNodeId, GraphNodeId>();
  const seen = new Set<GraphNodeId>([source]);
  const queue: GraphNodeId[] = [source];

  while (queue.length > 0) {
    const current = queue.shift() as GraphNodeId;

    for (const next of graph.dependenciesOf(current)) {
      if (seen.has(next)) {
        continue;
      }
      seen.add(next);
      previous.set(next, current);

      if (isRestricted(next)) {
        const path = [next];
        let step = current;
        while (step !== source) {
          path.unshift(step);
          step = previous.get(step) as GraphNodeId;
        }
        path.unshift(source);
        return path;
      }

      // A gateway is a valid door: reaching it is allowed, but we do not traverse beyond it.
      if (!isGateway(next)) {
        queue.push(next);
      }
    }
  }

  return null;
}

export function createGatewayOnlyAccessRule(): ArchLensRule {
  return {
    id: RULE_ID,
    meta: {
      description:
        'Restricted areas may only be reached through designated gateways; supports dated waivers.',
      severity: 'error',
      type: 'dependency',
    },
    check(context: RuleContext): RuleViolation[] {
      const options = context.options as GatewayOnlyAccessOptions | undefined;

      if (!options || !options.restricted?.length || !options.gateways?.length) {
        return [];
      }

      const restricted = compile(options.restricted);
      const gateways = compile(options.gateways);
      const fromFilter = compile(options.from);
      const waivers = options.waivers ?? [];
      const now = options.now ? new Date(options.now) : new Date();

      const isRestricted = (id: GraphNodeId): boolean => matchesAny(restricted, id);
      const isGateway = (id: GraphNodeId): boolean => matchesAny(gateways, id);
      const isSource = (id: GraphNodeId): boolean =>
        fromFilter.length > 0 ? matchesAny(fromFilter, id) : !isRestricted(id) && !isGateway(id);

      const activeWaiver = (id: GraphNodeId): GatewayWaiver | undefined =>
        waivers.find((waiver) => new RegExp(waiver.from).test(id) && new Date(waiver.until) > now);

      const { graph } = context;
      const violations: RuleViolation[] = [];

      for (const node of graph.nodes()) {
        if (!isSource(node) || isRestricted(node) || isGateway(node)) {
          continue;
        }
        if (activeWaiver(node)) {
          continue; // temporarily allowed
        }

        const path = findBypassPath(graph, node, isRestricted, isGateway);
        if (!path) {
          continue;
        }

        const target = path[path.length - 1];
        violations.push({
          ruleId: RULE_ID,
          message: `"${node}" reaches restricted "${target}" without passing a gateway (${path.join(
            ' → ',
          )}).`,
          file: node,
          fixable: false,
          suggestedFix: `Route access through a gateway module, or add a dated waiver for "${node}".`,
        });
      }

      return violations;
    },
  };
}

export const gatewayOnlyAccessRule = createGatewayOnlyAccessRule();

export const gatewayOnlyAccessPlugin = {
  meta: {
    name: 'arch-lens-plugin-gateway-only-access',
    version: '0.0.0',
    description: 'Enforce gateway-only access to restricted areas, with dated waivers.',
  },
  rules: [gatewayOnlyAccessRule],
};

export default gatewayOnlyAccessPlugin;
