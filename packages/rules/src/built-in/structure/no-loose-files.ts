import { mkdir, rename } from 'node:fs/promises';
import path from 'node:path';

import type { ArchLensRule, RuleContext, RuleViolation } from '../../index.js';

export interface NoLooseFilesRuleOptions {
  root?: string;
  disallowIn?: string[];
  allowPatterns?: string[];
  relocationDir?: string;
}

const DEFAULT_DISALLOW = ['src'];
const DEFAULT_ALLOW = ['src/index.ts', 'src/main.ts', 'src/main.tsx'];
const DEFAULT_RELOCATION_DIR = 'src/shared/__loose__';

function normaliseOptions(options?: NoLooseFilesRuleOptions) {
  return {
    root: options?.root,
    disallowIn: options?.disallowIn ?? DEFAULT_DISALLOW,
    allowPatterns: options?.allowPatterns ?? DEFAULT_ALLOW,
    relocationDir: options?.relocationDir ?? DEFAULT_RELOCATION_DIR,
  };
}

function matchesPattern(filePath: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern.includes('*')) {
      const regex = new RegExp(
        `^${pattern
          .replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&')
          .replace(/\\\*/g, '.*')}$`,
      );
      return regex.test(filePath);
    }

    return filePath === pattern;
  });
}

function findLooseFiles(
  files: string[],
  disallowRoots: string[],
  allowPatterns: string[],
): string[] {
  const results: string[] = [];

  for (const file of files) {
    const relative = file.replace(/\\/g, '/');
    const segments = relative.split('/');

    const disallowed = disallowRoots.some((dir) => {
      if (dir.endsWith('/')) {
        return relative.startsWith(dir);
      }

      return segments.length === 2 && segments[0] === dir;
    });

    if (!disallowed) {
      continue;
    }

    if (matchesPattern(relative, allowPatterns)) {
      continue;
    }

    results.push(relative);
  }

  return results;
}

export function createNoLooseFilesRule(options?: NoLooseFilesRuleOptions): ArchLensRule {
  const config = normaliseOptions(options);

  return {
    id: 'structure/no-loose-files',
    meta: {
      description: 'Prevent loose files from living outside designated directories.',
      severity: 'warning',
      type: 'structure',
    },
    async check(context: RuleContext): Promise<RuleViolation[]> {
      const disallowRoots = config.disallowIn.map((dir) => dir.replace(/\\/g, '/'));
      const allowPatterns = config.allowPatterns.map((pattern) => pattern.replace(/\\/g, '/'));

      const looseFiles = findLooseFiles(context.files, disallowRoots, allowPatterns);

      return looseFiles.map<RuleViolation>((relative) => ({
        ruleId: 'structure/no-loose-files',
        message: `File "${relative}" should be moved into a designated directory (e.g. features/, shared/).`,
        file: relative,
        fixable: true,
        suggestedFix: `Move the file into ${config.relocationDir} or another appropriate module directory.`,
      }));
    },
    async fix(context: RuleContext): Promise<void> {
      const disallowRoots = config.disallowIn.map((dir) => dir.replace(/\\/g, '/'));
      const allowPatterns = config.allowPatterns.map((pattern) => pattern.replace(/\\/g, '/'));
      const looseFiles = findLooseFiles(context.files, disallowRoots, allowPatterns);

      if (looseFiles.length === 0) {
        return;
      }

      const rootDir = config.root ? path.join(context.root, config.root) : context.root;
      const relocationDir = path.join(rootDir, config.relocationDir);
      await mkdir(relocationDir, { recursive: true });

      for (const relative of looseFiles) {
        const absoluteSource = path.join(context.root, relative);
        const targetPath = path.join(relocationDir, path.basename(relative));

        try {
          await rename(absoluteSource, targetPath);
        } catch (error) {
          if (context.verbose) {
            // eslint-disable-next-line no-console
            console.warn(`[Arch-Lens] Failed to relocate ${absoluteSource}: ${String(error)}`);
          }
        }
      }
    },
  };
}

export const noLooseFilesRule = createNoLooseFilesRule();
