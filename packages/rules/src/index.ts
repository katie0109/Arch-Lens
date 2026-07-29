import { createDependencyAllowListRule, dependencyAllowListRule } from './built-in/dependency/allow-list.js';
import type { DependencyAllowListRuleOptions } from './built-in/dependency/allow-list.js';
import { createNoCircularRule, noCircularDependencyRule } from './built-in/dependency/no-circular.js';
import { noCrossFeatureImportRule } from './built-in/dependency/no-cross-feature-import.js';
import { createNoCrossLayerRule, noCrossLayerRule } from './built-in/dependency/no-cross-layer.js';
import type { NoCrossLayerRuleOptions } from './built-in/dependency/no-cross-layer.js';
import { createFilenameCaseRule, filenameCaseRule } from './built-in/structure/filename-case.js';
import type { FilenameCaseRuleOptions } from './built-in/structure/filename-case.js';
import { createNoLooseFilesRule, noLooseFilesRule } from './built-in/structure/no-loose-files.js';
import type { NoLooseFilesRuleOptions } from './built-in/structure/no-loose-files.js';
import { requiredFeatureIndexRule } from './built-in/structure/required-feature-index.js';
import { createRequiredFilesRule, requiredFilesRule } from './built-in/structure/required-files.js';
import type { RequiredFilesRuleOptions } from './built-in/structure/required-files.js';

type RuleFactory<Options = unknown> = {
  defaultInstance: ArchLensRule;
  create: (options?: Options) => ArchLensRule;
};

type RuleCreator<Rule extends ArchLensRule = ArchLensRule> = (rule: Rule) => Rule;

export interface RuleImportReference {
  specifier: string;
  isTypeOnly: boolean;
  resolved?: string | null;
}

export type RuleDependencyGraph = Map<string, RuleImportReference[]>;

/** A node in the architecture graph: a root-relative, POSIX-style file path. */
export type GraphNodeId = string;

export interface GraphEdge {
  from: GraphNodeId;
  to: GraphNodeId;
  /** True only when every import forming this edge is `import type` / type-only. */
  isTypeOnly: boolean;
}

/**
 * A queryable view over the first-party dependency graph. Nodes are root-relative file paths;
 * edges point from a file to the first-party files it imports (external/unresolved imports are
 * excluded). This is the stable contract rules program against — the underlying representation
 * can change without touching rule code.
 */
export interface ArchitectureGraph {
  /** All node ids. */
  nodes(): GraphNodeId[];
  hasNode(id: GraphNodeId): boolean;
  /** All directed edges. */
  edges(): GraphEdge[];
  /** Direct dependencies (out-neighbours) of a node. */
  dependenciesOf(id: GraphNodeId): GraphNodeId[];
  /** Direct dependents (in-neighbours) of a node. */
  dependentsOf(id: GraphNodeId): GraphNodeId[];
  /** Whether `to` is reachable from `from` following ≥1 edge (so a node reaches itself only via a cycle). */
  isReachable(from: GraphNodeId, to: GraphNodeId): boolean;
  /** A shortest inclusive path `[from, …, to]`, `[from]` when equal, or null when unreachable. */
  shortestPath(from: GraphNodeId, to: GraphNodeId): GraphNodeId[] | null;
  /** Tarjan strongly-connected components. A component of size ≥2 (or a self-loop) is a cycle. */
  stronglyConnectedComponents(): GraphNodeId[][];
}

/** Code ownership derived from a CODEOWNERS file (empty when none is present). */
export interface Ownership {
  /** Owners of a file per CODEOWNERS (last matching pattern wins), or [] when unowned. */
  ownersOf(path: GraphNodeId): string[];
  /** Whether `owner` (e.g. `@org/team`) owns `path`. */
  hasOwner(path: GraphNodeId, owner: string): boolean;
  /** The parsed CODEOWNERS entries in file order. */
  entries(): Array<{ pattern: string; owners: string[] }>;
}

export interface RuleContext {
  root: string;
  files: string[];
  fix: boolean;
  verbose: boolean;
  /** Raw per-file import references. Prefer {@link RuleContext.graph} for graph queries. */
  dependencyGraph: RuleDependencyGraph;
  /** Queryable architecture graph (dependencies, reachability, shortest path, SCCs). */
  graph: ArchitectureGraph;
  /** Project-level graph derived from config `projects`. Empty when none are defined. */
  projectGraph: ArchitectureGraph;
  /** Code ownership from CODEOWNERS. Empty when no CODEOWNERS file exists. */
  owners: Ownership;
  /** Options for this rule, from the config (`['warn', options]`). Undefined in the array form. */
  options?: unknown;
  report?: (violations: RuleViolation | RuleViolation[]) => void;
}

export interface RuleViolationLocation {
  file?: string;
  line?: number;
  column?: number;
}

export type RuleSeverity = 'error' | 'warning';

export interface RuleViolation extends RuleViolationLocation {
  ruleId: string;
  message: string;
  /** Effective severity of this violation. Defaults to the producing rule's meta severity. */
  severity?: RuleSeverity;
  fixable?: boolean;
  suggestedFix?: string;
}

export interface ArchLensRule {
  id: string;
  meta: {
    description: string;
    severity: 'error' | 'warning';
    type: 'structure' | 'dependency';
  };
  check(context: RuleContext): Promise<RuleViolation[]> | RuleViolation[];
  fix?(context: RuleContext): Promise<void> | void;
}

export type BuiltInRuleId =
  | 'structure/required-feature-index'
  | 'structure/required-files'
  | 'structure/filename-case'
  | 'structure/no-loose-files'
  | 'dependency/no-cross-feature-import'
  | 'dependency/no-cross-layer'
  | 'dependency/no-circular'
  | 'dependency/allow-list';

export interface BuiltInRuleOverrides {
  'structure/required-files'?: RequiredFilesRuleOptions;
  'structure/filename-case'?: FilenameCaseRuleOptions;
  'structure/no-loose-files'?: NoLooseFilesRuleOptions;
  'dependency/no-cross-layer'?: NoCrossLayerRuleOptions;
  'dependency/allow-list'?: DependencyAllowListRuleOptions;
}

export interface LoadBuiltInRulesOptions {
  include?: BuiltInRuleId[];
  exclude?: BuiltInRuleId[];
  overrides?: BuiltInRuleOverrides;
}

const BUILT_IN_RULE_ORDER: BuiltInRuleId[] = [
  'structure/required-feature-index',
  'structure/required-files',
  'structure/filename-case',
  'structure/no-loose-files',
  'dependency/no-cross-feature-import',
  'dependency/no-cross-layer',
  'dependency/no-circular',
  'dependency/allow-list',
];

type RuleFactoryRegistry = {
  'structure/required-feature-index': RuleFactory;
  'structure/required-files': RuleFactory<RequiredFilesRuleOptions>;
  'structure/filename-case': RuleFactory<FilenameCaseRuleOptions>;
  'structure/no-loose-files': RuleFactory<NoLooseFilesRuleOptions>;
  'dependency/no-cross-feature-import': RuleFactory;
  'dependency/no-cross-layer': RuleFactory<NoCrossLayerRuleOptions>;
  'dependency/no-circular': RuleFactory;
  'dependency/allow-list': RuleFactory<DependencyAllowListRuleOptions>;
};

const RULE_FACTORIES: RuleFactoryRegistry = {
  'structure/required-feature-index': {
    defaultInstance: requiredFeatureIndexRule,
    create: () => requiredFeatureIndexRule,
  },
  'structure/required-files': {
    defaultInstance: requiredFilesRule,
    create: (options?: RequiredFilesRuleOptions) => createRequiredFilesRule(options),
  },
  'structure/filename-case': {
    defaultInstance: filenameCaseRule,
    create: (options?: FilenameCaseRuleOptions) => createFilenameCaseRule(options),
  },
  'structure/no-loose-files': {
    defaultInstance: noLooseFilesRule,
    create: (options?: NoLooseFilesRuleOptions) => createNoLooseFilesRule(options),
  },
  'dependency/no-cross-feature-import': {
    defaultInstance: noCrossFeatureImportRule,
    create: () => noCrossFeatureImportRule,
  },
  'dependency/no-cross-layer': {
    defaultInstance: noCrossLayerRule,
    create: (options?: NoCrossLayerRuleOptions) => createNoCrossLayerRule(options),
  },
  'dependency/no-circular': {
    defaultInstance: noCircularDependencyRule,
    create: () => createNoCircularRule(),
  },
  'dependency/allow-list': {
    defaultInstance: dependencyAllowListRule,
    create: (options?: DependencyAllowListRuleOptions) =>
      createDependencyAllowListRule(options),
  },
};

const RULE_REGISTRY = new Map<BuiltInRuleId, ArchLensRule>(
  BUILT_IN_RULE_ORDER.map((id) => [id, RULE_FACTORIES[id].defaultInstance]),
);

export function getRuleRegistry(): Map<BuiltInRuleId, ArchLensRule> {
  return new Map(RULE_REGISTRY);
}

export function getBuiltInRule(id: BuiltInRuleId): ArchLensRule | undefined {
  return RULE_REGISTRY.get(id);
}

export function loadBuiltInRules(options: LoadBuiltInRulesOptions = {}): ArchLensRule[] {
  const include = options.include ?? BUILT_IN_RULE_ORDER;
  const exclude = new Set(options.exclude ?? []);
  const overrides = options.overrides ?? {};

  const rules: ArchLensRule[] = [];

  for (const id of include) {
    if (exclude.has(id)) {
      continue;
    }

    const factory = RULE_FACTORIES[id];

    if (!factory) {
      continue;
    }

    const overrideOptions = overrides[id as keyof BuiltInRuleOverrides];

    if (overrideOptions !== undefined) {
      rules.push(factory.create(overrideOptions));
    } else {
      rules.push(factory.defaultInstance);
    }
  }

  return rules;
}

export {
  noCrossFeatureImportRule,
  createNoCrossLayerRule,
  noCrossLayerRule,
  createNoCircularRule,
  noCircularDependencyRule,
  createDependencyAllowListRule,
  dependencyAllowListRule,
  requiredFeatureIndexRule,
  requiredFilesRule,
  createRequiredFilesRule,
  filenameCaseRule,
  createFilenameCaseRule,
  noLooseFilesRule,
  createNoLooseFilesRule,
};

export const createRule: RuleCreator<ArchLensRule> = (rule) => rule;
