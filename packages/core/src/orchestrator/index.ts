import { stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

import type { ArchLensRule, RuleViolation } from '@arch-lens/rules';

import { loadArchLensConfig } from '../config/load-config.js';
import { scaffoldConfig } from '../config/scaffold-config.js';
import { scanWorkspaceFiles } from '../fs/file-scanner.js';
import { DependencyGraphCache } from '../parser/dependency-graph-cache.js';
import { buildDependencyGraph, createDefaultResolver } from '../parser/ts-dependency-graph.js';
import { reportViolations } from '../reporter/console-reporter.js';
import type {
  ArchLensConfig,
  InitOptions,
  InitResult,
  ReportFormat,
  ScanOptions,
  ScanResult,
} from '../types.js';

export interface ArchLensOrchestratorOptions {
  cwd?: string;
  rules?: ArchLensRule[];
  config?: ArchLensConfig;
  configPath?: string;
}

interface InternalConfig extends Required<Omit<ArchLensConfig, 'rules'>> {
  rules: ArchLensRule[];
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

function mergeRules(
  baseRules: ArchLensRule[] | undefined,
  extraRules: ArchLensRule[] | undefined,
): ArchLensRule[] {
  if (!extraRules || extraRules.length === 0) {
    return baseRules ?? [];
  }

  if (!baseRules || baseRules.length === 0) {
    return extraRules;
  }

  return [...baseRules, ...extraRules];
}

export class ArchLensOrchestrator {
  private readonly cwd: string;
  private readonly config: InternalConfig;
  private readonly dependencyCache = new DependencyGraphCache();

  private constructor(cwd: string, config: ArchLensConfig) {
    this.cwd = cwd;
    this.config = {
      root: config.root ?? cwd,
      include: config.include ?? ['src/**/*.{ts,tsx,js,jsx}'],
      exclude: config.exclude ?? ['**/node_modules/**', '**/dist/**', '**/.turbo/**'],
      rules: config.rules,
    };
  }

  static fromConfig(cwd: string, config: ArchLensConfig): ArchLensOrchestrator {
    return new ArchLensOrchestrator(cwd, config);
  }

  static async bootstrap(options: ArchLensOrchestratorOptions = {}): Promise<ArchLensOrchestrator> {
    const cwd = resolve(options.cwd ?? process.cwd());

    if (options.config) {
      const mergedConfig = {
        ...options.config,
        rules: mergeRules(options.config.rules, options.rules),
      };
      return new ArchLensOrchestrator(cwd, mergedConfig);
    }

    const { config } = await loadArchLensConfig(cwd, options.configPath);

    return new ArchLensOrchestrator(cwd, {
      ...config,
      rules: mergeRules(config.rules, options.rules),
    });
  }

  async scan(options: ScanOptions = {}): Promise<ScanResult> {
    const start = performance.now();
    const include = options.target
      ? await deriveTargetInclude(this.config.root, options.target)
      : this.config.include;
    const absoluteChanged = options.changedFiles?.map((file) =>
      resolve(this.config.root, file),
    );

    if (absoluteChanged && absoluteChanged.length > 0) {
      this.dependencyCache.invalidate(absoluteChanged);
    }

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

    const violations: RuleViolation[] = [];

    const reportFormat: ReportFormat = options.reportFormat ?? 'table';
    const reporter = (payload: RuleViolation | RuleViolation[]): void => {
      const items = Array.isArray(payload) ? payload : [payload];
      reportViolations(items, { format: reportFormat, pretty: options.pretty });
    };

    for (const rule of this.config.rules) {
      const context = {
        root: this.config.root,
        files,
        fix: Boolean(options.fix),
        verbose: Boolean(options.verbose),
        dependencyGraph,
        report: reporter,
      };

      const ruleViolations = await rule.check(context);
      violations.push(...ruleViolations);

      if (context.fix && typeof rule.fix === 'function') {
        await rule.fix(context);
      }
    }

    reportViolations(violations, { format: reportFormat, pretty: options.pretty });

    const durationMs = performance.now() - start;

    return {
      violations,
      files,
      durationMs,
    };
  }

  async init(options: InitOptions = {}): Promise<InitResult> {
    const { path: configPath, scaffolded, backupPath } = await scaffoldConfig({
      cwd: this.cwd,
      targetPath: options.configPath,
      force: Boolean(options.force),
      include: this.config.include,
      exclude: this.config.exclude,
      template: options.template,
    });

    const loaded = await loadArchLensConfig(this.cwd, configPath);

    return { ...loaded, scaffolded, backupPath };
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
  try {
    return await ArchLensOrchestrator.bootstrap(options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (options.config || options.configPath) {
      throw error;
    }

    if (options.rules && message.includes('configuration file not found')) {
      const cwd = resolve(options.cwd ?? process.cwd());
      return ArchLensOrchestrator.fromConfig(cwd, {
        root: cwd,
        rules: options.rules,
      });
    }

    throw error;
  }
}
