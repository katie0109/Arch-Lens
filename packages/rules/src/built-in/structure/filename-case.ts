import { rename } from 'node:fs/promises';
import path from 'node:path';

import type { ArchLensRule, RuleContext, RuleViolation } from '../../index.js';

export type CaseStyle = 'kebab-case' | 'pascal-case' | 'camel-case' | 'snake-case';

interface FilenameCaseRuleEntry {
  test: string;
  style: CaseStyle;
  includeExtension?: boolean;
}

export interface FilenameCaseRuleOptions {
  rules?: FilenameCaseRuleEntry[];
}

const DEFAULT_RULES: FilenameCaseRuleEntry[] = [
  {
    test: '^src/components/.+\\.(tsx?|jsx?)$',
    style: 'pascal-case',
  },
];

function normaliseOptions(options?: FilenameCaseRuleOptions): FilenameCaseRuleEntry[] {
  if (!options?.rules || options.rules.length === 0) {
    return DEFAULT_RULES;
  }

  return options.rules;
}

function toDesiredCase(name: string, style: CaseStyle): string {
  const parts = name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase()
    .split('-')
    .filter(Boolean);

  switch (style) {
    case 'kebab-case':
      return parts.join('-');
    case 'snake-case':
      return parts.join('_');
    case 'camel-case':
      return parts
        .map((segment, index) =>
          index === 0 ? segment : segment.charAt(0).toUpperCase() + segment.slice(1),
        )
        .join('');
    case 'pascal-case':
    default:
      return parts.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1)).join('');
  }
}

export function createFilenameCaseRule(options?: FilenameCaseRuleOptions): ArchLensRule {
  const rules = normaliseOptions(options);

  return {
    id: 'structure/filename-case',
    meta: {
      description: 'Ensure file names follow the specified casing conventions.',
      severity: 'warning',
      type: 'structure',
    },
    async check(context: RuleContext): Promise<RuleViolation[]> {
      const violations: RuleViolation[] = [];

      for (const file of context.files) {
        const filePath = file.replace(/\\/g, '/');

        for (const entry of rules) {
          const regex = new RegExp(entry.test);

          if (!regex.test(filePath)) {
            continue;
          }

          const parsed = path.parse(filePath);
          const targetName = entry.includeExtension
            ? `${toDesiredCase(parsed.base, entry.style)}`
            : `${toDesiredCase(parsed.name, entry.style)}${parsed.ext}`;

          if (targetName === parsed.base) {
            continue;
          }

          violations.push({
            ruleId: 'structure/filename-case',
            message: `Filename "${parsed.base}" should be "${targetName}" (${entry.style}).`,
            file: filePath,
            fixable: true,
            suggestedFix: `Rename the file to ${targetName} (${entry.style}).`,
          });
        }
      }

      return violations;
    },
    async fix(context: RuleContext): Promise<void> {
      for (const file of context.files) {
        const normalized = file.replace(/\\/g, '/');

        for (const entry of rules) {
          const regex = new RegExp(entry.test);

          if (!regex.test(normalized)) {
            continue;
          }

          const absolutePath = path.join(context.root, normalized);
          const parsed = path.parse(absolutePath);
          const expectedBase = entry.includeExtension
            ? toDesiredCase(parsed.base, entry.style)
            : `${toDesiredCase(parsed.name, entry.style)}${parsed.ext}`;

          if (expectedBase === parsed.base) {
            continue;
          }

          const targetPath = path.join(parsed.dir, expectedBase);

          try {
            await rename(absolutePath, targetPath);
          } catch (error) {
            if (context.verbose) {
              // eslint-disable-next-line no-console
              console.warn(`[Arch-Lens] Failed to rename ${absolutePath}: ${String(error)}`);
            }
          }
        }
      }
    },
  };
}

export const filenameCaseRule = createFilenameCaseRule();
