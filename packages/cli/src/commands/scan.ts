import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { createArchLensOrchestrator, loadPluginRules } from 'arch-lens-core';
import type { BaselineData } from 'arch-lens-core';
import type { CAC } from 'cac';
import { watch } from 'chokidar';

import { loadBaselineFile, resolveBaselinePath } from '../utils/baseline-io.js';
import { gitChangedSince, parseChangedList } from '../utils/changed-files.js';
import { EXIT_CODE, handleCliError } from '../utils/error-handling.js';

type ReportMode = 'table' | 'json' | 'list' | 'html' | 'markdown' | 'sarif';

export interface ScanCommandOptions {
  config?: string;
  fix?: boolean;
  verbose?: boolean;
  report?: string;
  plugin?: string | string[];
  pretty?: boolean;
  watch?: boolean;
  metrics?: string;
  allowViolations?: boolean;
  baseline?: string | boolean;
  affected?: boolean;
  changed?: string | string[];
  since?: string;
}

export function normalizeReportMode(mode: string | undefined): ReportMode {
  if (!mode) {
    return 'table';
  }

  const normalized = mode.toLowerCase();

  if (
    normalized === 'json' ||
    normalized === 'table' ||
    normalized === 'list' ||
    normalized === 'html' ||
    normalized === 'markdown' ||
    normalized === 'sarif'
  ) {
    return normalized;
  }

  throw new Error(
    `Unknown report mode: ${mode}. Supported values are 'table', 'list', 'html', 'markdown', 'sarif', or 'json'.`,
  );
}

export function normalizePluginOption(option: string | string[] | undefined): string[] {
  if (!option) {
    return [];
  }

  const values = Array.isArray(option) ? option : [option];

  return values
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export function shouldFailScan({
  watchMode,
  failOnViolations,
  errorCount,
}: {
  watchMode: boolean;
  failOnViolations: boolean;
  /** Number of error-severity violations. Warnings are reported but never fail the scan. */
  errorCount: number;
}): boolean {
  if (watchMode) {
    return errorCount > 0;
  }

  if (!failOnViolations) {
    return false;
  }

  return errorCount > 0;
}

async function emitMetrics(path: string, result: {
  violations: { ruleId: string }[];
  files: string[];
  durationMs: number;
}): Promise<void> {
  const summary = {
    timestamp: new Date().toISOString(),
    durationMs: result.durationMs,
    filesScanned: result.files.length,
    violationCount: result.violations.length,
    byRule: result.violations.reduce<Record<string, number>>((acc, violation) => {
      acc[violation.ruleId] = (acc[violation.ruleId] ?? 0) + 1;
      return acc;
    }, {}),
  };

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(summary, null, 2), 'utf8');
}

export function registerScanCommand(cli: CAC): void {
  cli
    .command('scan [target]', 'Scan the project against architecture rules')
    .option('--config <path>', 'Path to an arch.config.ts file')
    .option('--fix', 'Attempt to automatically fix structural violations')
    .option('--verbose', 'Print verbose logs while scanning')
    .option('--report <mode>', "Output mode for violations ('table' | 'list' | 'json' | 'html' | 'markdown' | 'sarif')", {
      default: 'table',
    })
    .option(
      '--plugin <path>',
      'Load additional Arch-Lens plugin modules (repeat or comma-separate values)',
      { default: [] },
    )
    .option('--pretty', 'Pretty-print JSON output')
    .option('--watch', 'Watch for file changes and re-run the scan')
    .option('--metrics <path>', 'Write scan metrics summary JSON to the provided file path')
    .option('--allow-violations', 'Exit with code 0 even if violations are found (non-watch mode)')
    .option('--baseline [path]', 'Suppress violations recorded in a baseline file; fail only on new ones')
    .option('--affected', 'Only report violations on changed files and their transitive dependents')
    .option('--changed <files>', 'Changed files for --affected (comma/space separated)')
    .option('--since <ref>', 'Derive changed files for --affected from `git diff --name-only <ref>`')
    .action(async (target: string | undefined, options: ScanCommandOptions) => {
      try {
        const reportMode = normalizeReportMode(options.report);
        const pluginPaths = normalizePluginOption(options.plugin);

        const affectedOnly = Boolean(options.affected);
        const affectedChangedFiles = affectedOnly
          ? options.changed
            ? parseChangedList(options.changed)
            : options.since
              ? gitChangedSince(options.since)
              : []
          : undefined;

        if (options.verbose && pluginPaths.length > 0) {
          // Logs go to stderr so stdout carries only the report (critical for --report json).
          console.error(`[arch-lens] Loading plugins: ${pluginPaths.join(', ')}`);
        }

        const baseline: BaselineData | undefined = options.baseline
          ? await loadBaselineFile(resolveBaselinePath(options.baseline))
          : undefined;

        const pluginRules = await loadPluginRules(pluginPaths);

        // Rule-source policy lives in core: a config (explicit or auto-discovered) owns its
        // rules, built-ins are the default only when no config exists, and plugin rules are
        // always appended. The CLI just forwards the config path and the plugin rules.
        const orchestrator = await createArchLensOrchestrator({
          configPath: options.config,
          pluginRules,
        });

        const watchMode = Boolean(options.watch);
        const failOnViolations = !options.allowViolations;
        const metricsPath = options.metrics ? resolve(process.cwd(), options.metrics) : undefined;

        const runScan = async (changedFiles?: string[]): Promise<void> => {
          const result = await orchestrator.scan({
            target,
            fix: Boolean(options.fix),
            verbose: Boolean(options.verbose),
            reportFormat: reportMode,
            pretty: Boolean(options.pretty),
            changedFiles: changedFiles ?? affectedChangedFiles,
            affectedOnly,
            baseline,
          });

          if (metricsPath) {
            await emitMetrics(metricsPath, result);
          }

          if (result.suppressedCount > 0) {
            console.error(`[arch-lens] Baseline suppressed ${result.suppressedCount} known violation(s).`);
          }

          const errorCount = result.violations.filter((v) => v.severity !== 'warning').length;
          const failScan = shouldFailScan({ watchMode, failOnViolations, errorCount });

          process.exitCode = failScan ? EXIT_CODE.VIOLATIONS : EXIT_CODE.OK;
        };

        await runScan();

        if (!watchMode) {
          return;
        }

        const { root, include, exclude } = orchestrator.getScanPatterns();
        const normalizedRoot = root.replace(/\\/g, '/');
        const watcher = watch(include, {
          cwd: root,
          ignored: exclude,
          ignoreInitial: true,
        });

        console.error(`[arch-lens] Watching ${include.length} patterns from ${root}`);

        let pending = new Set<string>();
        let debounceTimer: NodeJS.Timeout | null = null;

        const flush = async () => {
          const changed = Array.from(pending);
          pending = new Set<string>();
          debounceTimer = null;

          if (changed.length === 0) {
            return;
          }

          console.error(`[arch-lens] Re-scanning after changes: ${changed.join(', ')}`);

          try {
            await runScan(changed);
          } catch (error) {
            handleCliError(error);
          }
        };

        watcher.on('all', (_event, filePath) => {
          const normalizedPath = filePath.replace(/\\/g, '/');
          const absolutePath = normalizedPath.startsWith(normalizedRoot)
            ? normalizedPath
            : `${normalizedRoot}/${normalizedPath}`.replace(/\/+/g, '/');
          const relativePath = absolutePath.startsWith(`${normalizedRoot}/`)
            ? absolutePath.slice(normalizedRoot.length + 1)
            : normalizedPath;

          pending.add(relativePath);

          if (debounceTimer) {
            clearTimeout(debounceTimer);
          }

          debounceTimer = setTimeout(() => {
            void flush();
          }, 200);
        });

        watcher.on('error', (error) => {
          handleCliError(error);
        });

        process.on('SIGINT', () => {
          void watcher.close();
          process.exit();
        });
      } catch (error) {
        handleCliError(error);
      }
    });
}
