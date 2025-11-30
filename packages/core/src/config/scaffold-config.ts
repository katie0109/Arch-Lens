import { constants } from 'node:fs';
import { access, copyFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { renderDefaultConfigTemplate } from './templates/default-config-template.js';

export interface ScaffoldConfigOptions {
  cwd: string;
  targetPath?: string;
  force?: boolean;
  include?: string[];
  exclude?: string[];
  template?: string;
}

export interface ScaffoldConfigResult {
  path: string;
  scaffolded: boolean;
  backupPath?: string;
}

const DEFAULT_INCLUDE = ['src/**/*.{ts,tsx,js,jsx}'];
const DEFAULT_EXCLUDE = ['**/node_modules/**', '**/dist/**', '**/.turbo/**'];

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function ensureParentDirectory(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
}

async function backupExistingFile(filePath: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${filePath}.${timestamp}.bak`;
  await copyFile(filePath, backupPath);
  return backupPath;
}

export async function scaffoldConfig({
  cwd,
  targetPath,
  force = false,
  include = DEFAULT_INCLUDE,
  exclude = DEFAULT_EXCLUDE,
  template,
}: ScaffoldConfigOptions): Promise<ScaffoldConfigResult> {
  const resolvedPath = resolve(cwd, targetPath ?? 'arch.config.ts');
  const exists = await pathExists(resolvedPath);

  if (exists && !force) {
    return { path: resolvedPath, scaffolded: false };
  }

  let backupPath: string | undefined;

  if (exists && force) {
    backupPath = await backupExistingFile(resolvedPath);
  }

  await ensureParentDirectory(resolvedPath);

  const content = template ?? renderDefaultConfigTemplate({ include, exclude });
  await writeFile(resolvedPath, content, 'utf8');

  return { path: resolvedPath, scaffolded: true, backupPath };
}
