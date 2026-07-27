import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/** Repo root: packages/cli/test/e2e -> ../../../.. */
export const repoRoot = resolve(here, '../../../..');

/** Built CLI entry point. `pnpm build` must run before the E2E suite. */
export const cliEntry = resolve(repoRoot, 'packages/cli/dist/index.js');

/**
 * Scratch projects live *inside* the repo so that a bare `import '@arch-lens/rules'`
 * inside a generated config resolves via upward node_modules lookup to the workspace links.
 */
export const tmpRoot = resolve(repoRoot, '.e2e-workspaces');

export interface CliResult {
  status: number;
  stdout: string;
  stderr: string;
}

export function runCli(args: string[], cwd: string): CliResult {
  const result: SpawnSyncReturns<string> = spawnSync(process.execPath, [cliEntry, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  });

  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

let counter = 0;

export function makeProject(name: string): string {
  counter += 1;
  const dir = join(tmpRoot, `${name}-${process.pid}-${Date.now()}-${counter}`);
  mkdirSync(join(dir, 'src'), { recursive: true });
  return dir;
}

export function writeFile(dir: string, relativePath: string, contents: string): void {
  const target = join(dir, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents, 'utf8');
}

/**
 * Writes an `arch.config.mjs` that selects a subset of built-in rules. Using `.mjs`
 * keeps these fixtures independent of the (separately tested) TypeScript config loader.
 */
export function writeConfig(dir: string, ruleIds?: string[]): void {
  const includeArg = ruleIds ? `{ include: ${JSON.stringify(ruleIds)} }` : '';
  const root = dir.replace(/\\/g, '/');

  writeFile(
    dir,
    'arch.config.mjs',
    `import { loadBuiltInRules } from '@arch-lens/rules';

export default {
  root: ${JSON.stringify(root)},
  include: ['src/**/*.{ts,tsx,js,jsx}'],
  exclude: ['**/node_modules/**', '**/dist/**'],
  rules: loadBuiltInRules(${includeArg}),
};
`,
  );
}
