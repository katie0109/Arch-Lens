import path from 'node:path';

import type {
  ArchLensRule,
  RuleContext,
  RuleDependencyGraph,
  RuleViolation,
} from '../../index.js';

interface AllowListRuleEntry {
  from: string; // 정규식
  allow: string[]; // 정규식 목록
}

export interface DependencyAllowListRuleOptions {
  entries?: AllowListRuleEntry[];
}

const DEFAULT_ENTRIES: AllowListRuleEntry[] = [
  {
    from: '^src/features/([a-zA-Z0-9-]+)/',
    allow: ['^src/shared/', '^src/features/$1/'],
  },
];

function normaliseEntries(options?: DependencyAllowListRuleOptions): AllowListRuleEntry[] {
  return options?.entries && options.entries.length > 0 ? options.entries : DEFAULT_ENTRIES;
}

function resolveAllowPatterns(entry: AllowListRuleEntry, match: RegExpExecArray | null): RegExp[] {
  return entry.allow.map((pattern) => {
    if (match) {
      const resolvedPattern = pattern.replace(/\$([0-9]+)/g, (_, index: string) => {
        const groupIndex = Number.parseInt(index, 10);
        return match[groupIndex] ?? '';
      });
      return new RegExp(resolvedPattern);
    }

    return new RegExp(pattern);
  });
}

function collectViolations(
  graph: RuleDependencyGraph,
  entries: AllowListRuleEntry[],
  root: string,
): RuleViolation[] {
  const violations: RuleViolation[] = [];

  for (const [file, imports] of graph.entries()) {
    const normalizedFile = file.replace(/\\/g, '/');

    for (const entry of entries) {
      const fromRegex = new RegExp(entry.from);
      const match = fromRegex.exec(normalizedFile);

      if (!match) {
        continue;
      }

      const allowPatterns = resolveAllowPatterns(entry, match);

      for (const reference of imports) {
        if (!reference.resolved) {
          continue;
        }

        const target = path.relative(root, reference.resolved).replace(/\\/g, '/');

        if (allowPatterns.some((regex) => regex.test(target))) {
          continue;
        }

        violations.push({
          ruleId: 'dependency/allow-list',
          message: `Import from "${target}" is not allowed for module "${normalizedFile}".`,
          file: normalizedFile,
          fixable: false,
          suggestedFix: 'Move shared logic to an allowed module or expose a public API in the allowed list.',
        });
      }
    }
  }

  return violations;
}

export function createDependencyAllowListRule(
  options?: DependencyAllowListRuleOptions,
): ArchLensRule {
  const entries = normaliseEntries(options);

  return {
    id: 'dependency/allow-list',
    meta: {
      description: 'Restrict dependency edges using an allow-list.',
      severity: 'error',
      type: 'dependency',
    },
    async check({ dependencyGraph, root }: RuleContext): Promise<RuleViolation[]> {
      return collectViolations(dependencyGraph, entries, root);
    },
    async fix({ dependencyGraph, root, report }: RuleContext): Promise<void> {
      const violations = collectViolations(dependencyGraph, entries, root);

      if (violations.length) {
        report?.(violations);
      }
    },
  };
}

export const dependencyAllowListRule = createDependencyAllowListRule();
