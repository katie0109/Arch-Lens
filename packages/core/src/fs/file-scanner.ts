import { resolve } from 'node:path';

import fg from 'fast-glob';

export interface FileScannerOptions {
  cwd: string;
  include?: string[];
  exclude?: string[];
}

export async function scanWorkspaceFiles({
  cwd,
  include = ['src/**/*.{ts,tsx,js,jsx}'],
  exclude = ['**/node_modules/**', '**/dist/**', '**/.turbo/**'],
}: FileScannerOptions): Promise<string[]> {
  const absoluteCwd = resolve(cwd);

  return fg(include, {
    cwd: absoluteCwd,
    ignore: exclude,
    onlyFiles: true,
    dot: false,
    unique: true,
  });
}
