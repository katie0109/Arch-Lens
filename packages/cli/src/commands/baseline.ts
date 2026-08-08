import { writeFile } from 'node:fs/promises';

import { computeBaseline, createArchLensOrchestrator, loadPluginRules } from '@moth-tools/arch-lens-core';
import type { CAC } from 'cac';

import { DEFAULT_BASELINE_FILE, resolveBaselinePath } from '../utils/baseline-io.js';
import { handleCliError } from '../utils/error-handling.js';

import { normalizePluginOption } from './scan.js';

export interface BaselineCommandOptions {
  config?: string;
  plugin?: string | string[];
  out?: string;
}

export function registerBaselineCommand(cli: CAC): void {
  cli
    .command('baseline [target]', 'Record current violations as an accepted baseline')
    .option('--config <path>', 'Path to an arch.config file')
    .option(
      '--plugin <path>',
      'Load additional Arch-Lens plugin modules (repeat or comma-separate values)',
      { default: [] },
    )
    .option('--out <path>', `Baseline output file (default: ${DEFAULT_BASELINE_FILE})`)
    .action(async (target: string | undefined, options: BaselineCommandOptions) => {
      try {
        const pluginRules = await loadPluginRules(normalizePluginOption(options.plugin));
        const orchestrator = await createArchLensOrchestrator({
          configPath: options.config,
          pluginRules,
        });

        // Capture the current violations without printing a report.
        const result = await orchestrator.scan({ target, silent: true });
        const baseline = computeBaseline(result.violations);
        const outPath = resolveBaselinePath(options.out);

        await writeFile(outPath, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');

        // Status on stderr; stdout stays clean.
        console.error(
          `[Arch-Lens] Recorded ${result.violations.length} violation(s) as baseline at ${outPath}`,
        );
      } catch (error) {
        handleCliError(error);
      }
    });
}
