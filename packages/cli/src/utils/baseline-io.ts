import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { isBaselineData } from '@moth-tools/arch-lens-core';
import type { BaselineData } from '@moth-tools/arch-lens-core';

export const DEFAULT_BASELINE_FILE = 'arch-lens-baseline.json';

/** Resolves a `--baseline`/`--out` flag value to an absolute path (default file when just `true`). */
export function resolveBaselinePath(flag: string | boolean | undefined): string {
  const relative = typeof flag === 'string' && flag.length > 0 ? flag : DEFAULT_BASELINE_FILE;
  return resolve(process.cwd(), relative);
}

/** Reads and validates a baseline file. Throws a clear error for missing/invalid files. */
export async function loadBaselineFile(path: string): Promise<BaselineData> {
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch {
    throw new Error(
      `Baseline file not found at ${path}. Run "arch-lens baseline" to create one first.`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Baseline file at ${path} is not valid JSON.`);
  }

  if (!isBaselineData(parsed)) {
    throw new Error(`Baseline file at ${path} is not a valid Arch-Lens baseline (version 1).`);
  }

  return parsed;
}
