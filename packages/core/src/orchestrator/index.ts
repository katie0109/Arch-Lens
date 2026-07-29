import { stat } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

import type { ArchLensRule, RuleViolation } from '@arch-lens/rules';
import { loadBuiltInRules } from '@arch-lens/rules';

import { applyBaseline } from '../baseline/baseline.js';
import { tryLoadArchLensConfig } from '../config/load-config.js';
import { scanWorkspaceFiles } from '../fs/file-scanner.js';
import { buildArchitectureGraph } from '../graph/architecture-graph.js';
import { DependencyGraphCache } from '../parser/dependency-graph-cache.js';
import { buildDependencyGraph, createDefaultResolver } from '../parser/ts-dependency-graph.js';
import { loadPluginRules } from '../plugins/load-plugins.js';
import { reportViolations } from '../reporter/console-reporter.js';
import type {
  ArchLensConfig,
  ReportFormat,
  ScanOptions,
  ScanResult,
} from '../types.js';

import { resolveRules, type ResolvedRule } from './resolve-rules.js';

export interface ArchLensOrchestratorOptions {
  cwd?: string;
  /** Inline config object (no config file on disk). */
  config?: ArchLensConfig;
  /** Explicit config file path; a missing explicit path is an error. */
  configPath?: string;
  /** Base rules used only when no config declares rules. Defaults to the built-in rules. */
  defaultRules?: ArchLensRule[];
  /** Rules contributed by `--plugin`, always appended. */
  pluginRules?: ArchLensRule[];
}

interface InternalConfig extends Required<Omit<ArchLensConfig, 'rules' | 'plugins'>> {
  rules: ResolvedRule[];
}

interface OrchestratorInit {
  root?: string;
  include?: string[];
  exclude?: string[];
  rules: ResolvedRule[];
}

interface WorkspaceAnalysis {
  violations: RuleViolation[];
  files: string[];
  dependencyGraph: Awaited<ReturnType<typeof buildDependencyGraph>>;
  graph: ReturnType<typeof buildArchitectureGraph>;
}

const DEFAULT_TARGET_GLOB = '**/*.{ts,tsx,js,jsx}';
const GLOB_CHAR_PATTERN = /[[\]{}()!*?]/;

function hasGlobCharacters(value: string): boolean {
  return GLOB_CHAR_PATTERN.test(value);
}

function normalizeTargetPath(root: string, target: string): {
  pattern: string;
  absolute: string;
} {
  const normalizedInput = target.replace(/\\/g, '/');
  const absolutePath = isAbsolute(normalizedInput)
    ? normalizedInput
    : resolve(root, normalizedInput);
  const relativePath = relative(root, absolutePath).replace(/\\/g, '/');

  if (!relativePath.startsWith('..') && relativePath !== '') {
    return { pattern: relativePath, absolute: absolutePath };
  }

  if (!relativePath.startsWith('..') && relativePath === '') {
    return { pattern: '.', absolute: absolutePath };
  }

  return { pattern: absolutePath.replace(/\\/g, '/'), absolute: absolutePath };
}

function stripDotPrefix(pattern: string): string {
  if (pattern === '.') {
    return '.';
  }

  return pattern.replace(/^\.\/+/, '');
}

async function deriveTargetInclude(root: string, target: string): Promise<string[]> {
  const { pattern, absolute } = normalizeTargetPath(root, target);
  const cleaned = stripDotPrefix(pattern);

  if (hasGlobCharacters(cleaned)) {
    return [cleaned];
  }

  try {
    const stats = await stat(absolute);

    if (stats.isDirectory()) {
      const trimmed = cleaned === '.' ? '' : cleaned.replace(/\/+$/, '');
      const scopedPattern = trimmed.length > 0
        ? `${trimmed}/${DEFAULT_TARGET_GLOB}`
        : DEFAULT_TARGET_GLOB;
      return [scopedPattern];
    }
  } catch {
    // Treat missing paths as literal glob patterns; scanWorkspaceFiles will handle failures.
  }

  if (cleaned === '.' || cleaned.length === 0) {
    return [DEFAULT_TARGET_GLOB];
  }

  return [cleaned];
}

/** Loads rules from a config's own `plugins` array, resolved relative to the config root. */
async function loadConfigPluginRules(config: ArchLensConfig, root: string): Promise<ArchLensRule[]> {
  if (!config.plugins || config.plugins.length === 0) {
    return [];
  }

  return loadPluginRules(config.plugins, root);
}

export class ArchLensOrchestrator {
  private readonly cwd: string;
  private readonly config: InternalConfig;
  private readonly dependencyCache = new DependencyGraphCache();

  private constructor(cwd: string, init: OrchestratorInit) {
    this.cwd = cwd;
    this.config = {
      root: init.root ?? cwd,
      include: init.include ?? ['src/**/*.{ts,tsx,js,jsx}'],
      exclude: init.exclude ?? ['**/node_modules/**', '**/dist/**', '**/.turbo/**'],
      rules: init.rules,
    };
  }

  static fromConfig(cwd: string, config: ArchLensConfig): ArchLensOrchestrator {
    const rules = resolveRules({
      configRules: config.rules,
      defaultRules: loadBuiltInRules(),
    });
    return new ArchLensOrchestrator(cwd, {
      root: config.root,
      include: config.include,
      exclude: config.exclude,
      rules,
    });
  }

  static async bootstrap(options: ArchLensOrchestratorOptions = {}): Promise<ArchLensOrchestrator> {
    const cwd = resolve(options.cwd ?? process.cwd());
    const pluginRules = options.pluginRules ?? [];
    const defaultRules = options.defaultRules ?? loadBuiltInRules();

    // Inline config: it owns its rules; built-ins are not implicitly merged.
    if (options.config) {
      const root = options.config.root ?? cwd;
      const rules = resolveRules({
        configRules: options.config.rules,
        defaultRules,
        // CLI --plugin rules plus any declared by the config's own `plugins` array.
        pluginRules: [...pluginRules, ...(await loadConfigPluginRules(options.config, root))],
      });
      return new ArchLensOrchestrator(cwd, {
        root,
        include: options.config.include,
        exclude: options.config.exclude,
        rules,
      });
    }

    const loaded = await tryLoadArchLensConfig(cwd, options.configPath);

    // A config file (explicit or auto-discovered) owns the rule set.
    if (loaded) {
      // When a config omits `root`, anchor scanning to the config file's directory rather
      // than the current working directory, so results are stable regardless of where the
      // CLI is invoked from.
      const root = loaded.config.root ?? dirname(loaded.configPath);
      const rules = resolveRules({
        configRules: loaded.config.rules,
        defaultRules,
        pluginRules: [...pluginRules, ...(await loadConfigPluginRules(loaded.config, root))],
      });
      return new ArchLensOrchestrator(cwd, {
        root,
        include: loaded.config.include,
        exclude: loaded.config.exclude,
        rules,
      });
    }

    // No config anywhere: fall back to built-in defaults plus any plugin rules.
    const rules = resolveRules({ defaultRules, pluginRules });
    return new ArchLensOrchestrator(cwd, { root: cwd, rules });
  }

  async scan(options: ScanOptions = {}): Promise<ScanResult> {
    const start = performance.now();
    const reportFormat: ReportFormat = options.reportFormat ?? 'table';

    // Watch mode passes the files that changed since the last run.
    const absoluteChanged = options.changedFiles?.map((file) =>
      resolve(this.config.root, file),
    );

    if (absoluteChanged && absoluteChanged.length > 0) {
      this.dependencyCache.invalidate(absoluteChanged);
    }

    // Detection pass: collect violations without printing anything.
    let analysis = await this.analyze(options);

    if (options.fix) {
      await this.applyFixes(analysis, options);
      // Fixes may create or modify files, so drop the whole cache and re-analyze. The
      // reported result must reflect what remains AFTER fixing, not the pre-fix state.
      this.dependencyCache.invalidate();
      analysis = await this.analyze(options);
    }

    // Suppress baselined violations before anything is reported or counted.
    let violations = analysis.violations;
    let suppressedCount = 0;
    if (options.baseline) {
      const applied = applyBaseline(violations, options.baseline);
      violations = applied.remaining;
      suppressedCount = applied.suppressed;
    }

    // Reporter runs exactly once, at the very end, on stdout (unless silenced).
    if (!options.silent) {
      reportViolations(violations, { format: reportFormat, pretty: options.pretty });
    }

    return {
      violations,
      files: analysis.files,
      durationMs: performance.now() - start,
      suppressedCount,
    };
  }

  /**
   * Runs every rule's `check()` and gathers violations into a collector. Nothing is printed
   * here; `context.report()` appends to the same collector so a single reporter call at the
   * end of {@link scan} owns all output.
   */
  private async analyze(options: ScanOptions): Promise<WorkspaceAnalysis> {
    const include = options.target
      ? await deriveTargetInclude(this.config.root, options.target)
      : this.config.include;

    const files = await scanWorkspaceFiles({
      cwd: this.config.root,
      include,
      exclude: this.config.exclude,
    });

    const dependencyGraph = await buildDependencyGraph(files, {
      cwd: this.config.root,
      resolveImport: createDefaultResolver(this.config.root),
      cache: this.dependencyCache,
    });

    const graph = buildArchitectureGraph(dependencyGraph, this.config.root);

    const violations: RuleViolation[] = [];

    for (const { rule, options: ruleOptions, severity } of this.config.rules) {
      // Each violation takes the config-resolved severity unless the rule set its own.
      const tag = (violation: RuleViolation): RuleViolation => ({
        ...violation,
        severity: violation.severity ?? severity,
      });
      const collect = (payload: RuleViolation | RuleViolation[]): void => {
        violations.push(...(Array.isArray(payload) ? payload : [payload]).map(tag));
      };

      const context = {
        root: this.config.root,
        files,
        fix: false,
        verbose: Boolean(options.verbose),
        dependencyGraph,
        graph,
        options: ruleOptions,
        report: collect,
      };

      violations.push(...(await rule.check(context)).map(tag));
    }

    return { violations, files, dependencyGraph, graph };
  }

  /**
   * Applies each fixable rule's `fix()`. Any `context.report()` calls made during fixing are
   * intentionally discarded: the post-fix re-analysis is the single source of truth for the
   * violations that actually remain.
   */
  private async applyFixes(analysis: WorkspaceAnalysis, options: ScanOptions): Promise<void> {
    const discard = (): void => {
      /* fix-phase diagnostics are superseded by the re-analysis */
    };

    for (const { rule, options: ruleOptions } of this.config.rules) {
      if (typeof rule.fix !== 'function') {
        continue;
      }

      await rule.fix({
        root: this.config.root,
        files: analysis.files,
        fix: true,
        verbose: Boolean(options.verbose),
        dependencyGraph: analysis.dependencyGraph,
        graph: analysis.graph,
        options: ruleOptions,
        report: discard,
      });
    }
  }

  getScanPatterns(): { root: string; include: string[]; exclude: string[] } {
    return {
      root: this.config.root,
      include: [...this.config.include],
      exclude: [...this.config.exclude],
    };
  }
}

export async function createArchLensOrchestrator(
  options: ArchLensOrchestratorOptions = {},
): Promise<ArchLensOrchestrator> {
  // Bootstrap now handles the no-config case directly (falling back to built-in defaults),
  // so no special-case error recovery is needed here.
  return ArchLensOrchestrator.bootstrap(options);
}
