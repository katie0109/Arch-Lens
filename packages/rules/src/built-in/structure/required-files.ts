import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { ArchLensRule, RuleContext, RuleViolation } from '../../index.js';

interface RequiredFilesTarget {
  directory: string;
  files: string[];
  templates?: Record<string, string>;
  owner?: string;
}

export interface RequiredFilesRuleOptions {
  root?: string;
  targets?: RequiredFilesTarget[];
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function getTargets(options?: RequiredFilesRuleOptions): RequiredFilesTarget[] {
  if (!options?.targets || options.targets.length === 0) {
    return [
      {
        directory: 'src/features',
        files: ['index.ts'],
      },
    ];
  }

  return options.targets;
}

export function createRequiredFilesRule(
  options?: RequiredFilesRuleOptions,
): ArchLensRule {
  const targets = getTargets(options);
  const rootOverride = options?.root;

  return {
    id: 'structure/required-files',
    meta: {
      description: 'Ensure required files exist within target directories.',
      severity: 'error',
      type: 'structure',
    },
    async check(context: RuleContext): Promise<RuleViolation[]> {
      const violations: RuleViolation[] = [];
      const rootDir = rootOverride ? path.join(context.root, rootOverride) : context.root;

      for (const target of targets) {
        for (const file of target.files) {
          const fullPath = path.join(rootDir, target.directory, file);
          if (!(await fileExists(fullPath))) {
            const relativePath = path.relative(context.root, fullPath);
            violations.push({
              ruleId: 'structure/required-files',
              message: `Required file "${file}" is missing in "${target.directory}".`,
              file: relativePath,
              fixable: true,
              suggestedFix: `Create ${relativePath} or run arch-lens scan --fix to scaffold it.`,
            });
          }
        }
      }

      return violations;
    },
    async fix(context: RuleContext): Promise<void> {
      const rootDir = rootOverride ? path.join(context.root, rootOverride) : context.root;

      for (const target of targets) {
        for (const file of target.files) {
          const fullPath = path.join(rootDir, target.directory, file);

          if (await fileExists(fullPath)) {
            continue;
          }

          await mkdir(path.dirname(fullPath), { recursive: true });
          const template = target.templates?.[file] ?? '';
          await writeFile(fullPath, template, 'utf8');
        }
      }
    },
  };
}

export const requiredFilesRule = createRequiredFilesRule();
