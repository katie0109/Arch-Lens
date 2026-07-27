import { resolve } from 'node:path';

import { loadArchLensConfig } from '../config/load-config.js';
import { scaffoldConfig } from '../config/scaffold-config.js';
import type { InitResult } from '../types.js';

export interface InitializeProjectOptions {
  /** Directory the config path is resolved against. Defaults to `process.cwd()`. */
  cwd?: string;
  /** Explicit config file path (relative to `cwd` or absolute). Defaults to `arch.config.ts`. */
  configPath?: string;
  /** Overwrite (and back up) an existing config file. */
  force?: boolean;
  /** Include globs baked into the generated config. */
  include?: string[];
  /** Exclude globs baked into the generated config. */
  exclude?: string[];
}

/**
 * Bootstraps a project: scaffolds the config file (if needed), then loads and validates it.
 *
 * Unlike a scan, init must never require a pre-existing config — so it deliberately does not
 * go through the orchestrator, which loads config during construction.
 */
export async function initializeProject(
  options: InitializeProjectOptions = {},
): Promise<InitResult> {
  const cwd = resolve(options.cwd ?? process.cwd());

  const { path: configPath, scaffolded, backupPath } = await scaffoldConfig({
    cwd,
    targetPath: options.configPath,
    force: Boolean(options.force),
    include: options.include,
    exclude: options.exclude,
  });

  // Loading validates the freshly written (or pre-existing) config and surfaces defects early.
  const loaded = await loadArchLensConfig(cwd, configPath);

  return { ...loaded, scaffolded, backupPath };
}
