import { constants } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { createJiti } from 'jiti';

import type { LoadedConfig } from '../types.js';

import { validateConfig } from './validate-config.js';

const CONFIG_CANDIDATES = [
  'arch.config.ts',
  'arch.config.mts',
  'arch.config.mjs',
  'arch.config.cjs',
  'arch.config.js',
  'arch.config.json',
];

/**
 * A single jiti instance handles TypeScript config files (.ts/.mts/.cts) with its own
 * bundled transpiler, so config loading never depends on the consumer's TypeScript version.
 */
const jiti = createJiti(import.meta.url, { interopDefault: true });

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/** Returns the first matching auto-discovered config path, or null when none exist. */
async function discoverConfigPath(cwd: string): Promise<string | null> {
  for (const candidate of CONFIG_CANDIDATES) {
    const fullPath = resolve(cwd, candidate);

    if (await fileExists(fullPath)) {
      return fullPath;
    }
  }

  return null;
}

async function resolveConfigPath(cwd: string, explicitPath?: string): Promise<string> {
  if (explicitPath) {
    const resolved = resolve(cwd, explicitPath);

    if (!(await fileExists(resolved))) {
      throw new Error(`Arch-Lens configuration not found at ${resolved}`);
    }

    return resolved;
  }

  const discovered = await discoverConfigPath(cwd);

  if (discovered) {
    return discovered;
  }

  throw new Error(
    `Arch-Lens configuration file not found. Consider creating ${CONFIG_CANDIDATES.join(', ')}.`,
  );
}

function unwrapConfig(value: unknown, configPath: string): unknown {
  if (value === null || value === undefined) {
    throw new Error(`Configuration file at ${configPath} does not export a config object.`);
  }

  return value;
}

async function loadConfigModule(configPath: string): Promise<unknown> {
  const extension = extname(configPath);

  if (extension === '.json') {
    const raw = await readFile(configPath, 'utf8');
    return JSON.parse(raw);
  }

  if (extension === '.ts' || extension === '.mts' || extension === '.cts') {
    // jiti transpiles + evaluates TypeScript and returns the default export (interopDefault).
    const exported = await jiti.import(configPath, { default: true });
    return unwrapConfig(exported, configPath);
  }

  // .mjs / .cjs / .js are loaded through Node's native ESM/CJS interop.
  const imported = (await import(pathToFileURL(configPath).href)) as {
    default?: unknown;
  } & Record<string, unknown>;

  return unwrapConfig(imported.default ?? imported, configPath);
}

export async function loadArchLensConfig(
  cwd: string,
  explicitPath?: string,
): Promise<LoadedConfig> {
  const configPath = await resolveConfigPath(cwd, explicitPath);
  const config = await loadConfigModule(configPath);

  validateConfig(config, configPath);

  return { configPath, config };
}

/**
 * Loads a config the way a scan does: an explicit path that is missing is an error, but a
 * plain auto-discovery miss returns null so the caller can fall back to default rules.
 */
export async function tryLoadArchLensConfig(
  cwd: string,
  explicitPath?: string,
): Promise<LoadedConfig | null> {
  if (explicitPath) {
    return loadArchLensConfig(cwd, explicitPath);
  }

  const discovered = await discoverConfigPath(cwd);

  if (!discovered) {
    return null;
  }

  return loadArchLensConfig(cwd, discovered);
}
