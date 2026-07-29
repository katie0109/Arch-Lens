import { spawnSync } from 'node:child_process';

/** Splits a `--changed` value (comma- or whitespace-separated) into file paths. */
export function parseChangedList(value: string | string[] | undefined): string[] {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];
  return values
    .flatMap((entry) => entry.split(/[,\s]+/))
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

/** Returns files changed since a git ref via `git diff --name-only <ref>`. */
export function gitChangedSince(ref: string, cwd: string = process.cwd()): string[] {
  const result = spawnSync('git', ['diff', '--name-only', ref], {
    cwd,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    const detail = (result.stderr || result.error?.message || '').trim();
    throw new Error(`Could not determine changed files with "git diff --name-only ${ref}". ${detail}`);
  }

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
