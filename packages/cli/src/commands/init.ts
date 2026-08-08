import { initializeProject } from '@moth-tools/arch-lens-core';
import type { CAC } from 'cac';

import { handleCliError } from '../utils/error-handling.js';

export interface InitCommandOptions {
  force?: boolean;
  config?: string;
  template?: string;
}

export function registerInitCommand(cli: CAC): void {
  cli
    .command('init', 'Bootstrap a new arch.config.ts file in the current workspace')
    .option('--config <path>', 'Custom path for the generated configuration file')
    .option('--force', 'Overwrite existing configuration if present')
    .option('--template <name>', 'Name of a configuration template to scaffold (future use)')
    .action(async (options: InitCommandOptions) => {
      try {
        const result = await initializeProject({
          configPath: options.config,
          force: Boolean(options.force),
        });

        if (result.scaffolded) {
          // eslint-disable-next-line no-console
          console.log(`[Arch-Lens] Scaffolded configuration at ${result.configPath}`);

          if (result.backupPath) {
            // eslint-disable-next-line no-console
            console.log(`[Arch-Lens] Previous configuration was backed up to ${result.backupPath}`);
          }
        } else {
          // eslint-disable-next-line no-console
          console.log(`[Arch-Lens] Configuration already exists at ${result.configPath}`);
        }
      } catch (error) {
        handleCliError(error);
      }
    });
}
