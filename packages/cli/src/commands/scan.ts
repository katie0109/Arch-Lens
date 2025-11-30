import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { createArchLensOrchestrator } from '@arch-lens/core';
import type { CAC } from 'cac';
import { watch } from 'chokidar';

import { handleCliError } from '../utils/error-handling.js';
import { gatherRules } from '../utils/rule-loader.js';

type ReportMode = 'table' | 'json' | 'list' | 'html' | 'markdown';

export interface ScanCommandOptions {
  config?: string;
  fix?: boolean;
  verbose?: boolean;
  report?: string;
  plugin?: string | string[];
  pretty?: boolean;
  watch?: boolean;
  metrics?: string;
}

function normalizeReportMode(mode: string | undefined): ReportMode {
  if (!mode) {
    return 'table';
  }

  const normalized = mode.toLowerCase();

  if (normalized === 'json' || normalized === 'table' || normalized === 'list' || normalized === 'html' || normalized === 'markdown') {
    return normalized;
  }

  throw new Error(
    `Unknown report mode: ${mode}. Supported values are 'table', 'list', 'html', 'markdown', or 'json'.`,
  );
}

function normalizePluginOption(option: string | string[] | undefined): string[] {
  if (!option) {
    return [];
  }

  const values = Array.isArray(option) ? option : [option];

  return values
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
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
    .option('--report <mode>', "Output mode for violations ('table' | 'list' | 'json' | 'html' | 'markdown')", {
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
    .action(async (target: string | undefined, options: ScanCommandOptions) => {
      try {
        const reportMode = normalizeReportMode(options.report);
        const pluginPaths = normalizePluginOption(options.plugin);
        const includeBuiltIns = !options.config;

        if (options.verbose && pluginPaths.length > 0) {
          console.log(`[arch-lens] Loading plugins: ${pluginPaths.join(', ')}`);
        }

        const loadedRules = await gatherRules({
          plugin: pluginPaths,
          includeBuiltIn: includeBuiltIns,
        });

        const orchestrator = await createArchLensOrchestrator({
          configPath: options.config,
          rules: loadedRules.length > 0 ? loadedRules : undefined,
        });

        const watchMode = Boolean(options.watch);
        const metricsPath = options.metrics ? resolve(process.cwd(), options.metrics) : undefined;

        const runScan = async (changedFiles?: string[]): Promise<void> => {
          const result = await orchestrator.scan({
            target,
            fix: Boolean(options.fix),
            verbose: Boolean(options.verbose),
            reportFormat: reportMode,
            pretty: Boolean(options.pretty),
            changedFiles,
          });

          if (metricsPath) {
            await emitMetrics(metricsPath, result);
          }

          if (!watchMode && result.violations.length > 0) {
            process.exitCode = 1;
          } else if (!watchMode) {
            process.exitCode = 0;
          } else {
            process.exitCode = result.violations.length > 0 ? 1 : 0;
          }
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

        console.log(`[arch-lens] Watching ${include.length} patterns from ${root}`);

        let pending = new Set<string>();
        let debounceTimer: NodeJS.Timeout | null = null;

        const flush = async () => {
          const changed = Array.from(pending);
          pending = new Set<string>();
          debounceTimer = null;

          if (changed.length === 0) {
            return;
          }

          console.log(`[arch-lens] Re-scanning after changes: ${changed.join(', ')}`);

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
