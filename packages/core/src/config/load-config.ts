import { constants } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';

import * as ts from 'typescript';

import type { ArchLensConfig, LoadedConfig } from '../types.js';

const CONFIG_CANDIDATES = [
  'arch.config.ts',
  'arch.config.mts',
  'arch.config.mjs',
  'arch.config.cjs',
  'arch.config.js',
  'arch.config.json',
];

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function resolveConfigPath(cwd: string, explicitPath?: string): Promise<string> {
  if (explicitPath) {
    const resolved = resolve(cwd, explicitPath);

    if (!(await fileExists(resolved))) {
      throw new Error(`Arch-Lens configuration not found at ${resolved}`);
    }

    return resolved;
  }

  for (const candidate of CONFIG_CANDIDATES) {
    const fullPath = resolve(cwd, candidate);

    if (await fileExists(fullPath)) {
      return fullPath;
    }
  }

  throw new Error(
    `Arch-Lens configuration file not found. Consider creating ${CONFIG_CANDIDATES.join(', ')}.`,
  );
}

async function loadConfigModule(configPath: string): Promise<ArchLensConfig> {
  const extension = extname(configPath);

  if (extension === '.ts' || extension === '.mts') {
    return loadTypeScriptConfig(configPath);
  }

  if (extension === '.json') {
    const raw = await readFile(configPath, 'utf8');
    return JSON.parse(raw) as ArchLensConfig;
  }

  const module = await import(pathToFileURL(configPath).href);
  const config = (module.default ?? module) as ArchLensConfig;

  if (!config) {
    throw new Error(`Configuration file at ${configPath} does not export a config object.`);
  }

  return config;
}

async function loadTypeScriptConfig(configPath: string): Promise<ArchLensConfig> {
  const source = await readFile(configPath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: configPath,
  });

  const sandboxModule = { exports: {} as Record<string, unknown> };
  const sandbox = {
    module: sandboxModule,
    exports: sandboxModule.exports,
    __dirname: dirname(configPath),
    __filename: configPath,
    require: createRequire(configPath),
    process,
    console,
    Buffer,
    global,
  };

  vm.runInNewContext(transpiled.outputText, sandbox, { filename: configPath });

  const exported = sandbox.module.exports ?? sandbox.exports;
  const config = (exported?.default ?? exported) as ArchLensConfig | undefined;

  if (!config) {
    throw new Error(`TypeScript config at ${configPath} did not export a default ArchLensConfig.`);
  }

  return config;
}

export async function loadArchLensConfig(
  cwd: string,
  explicitPath?: string,
): Promise<LoadedConfig> {
  const configPath = await resolveConfigPath(cwd, explicitPath);
  const config = await loadConfigModule(configPath);

  return { configPath, config };
}
