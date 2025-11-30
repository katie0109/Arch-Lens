import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { ArchLensRule, RuleContext, RuleDependencyGraph, RuleViolation } from '../../index.js';

function toPosix(value: string): string {
  return value.split(path.sep).join(path.posix.sep);
}

function getFeatureNameFromRelative(relativePath: string): string | null {
  const normalized = toPosix(relativePath);
  const segments = normalized.split(path.posix.sep);
  const featureIndex = segments.indexOf('features');

  if (featureIndex === -1) {
    return null;
  }

  const candidate = segments[featureIndex + 1];
  return candidate ?? null;
}

function locateSpecifier(content: string, specifier: string): { line?: number; column?: number } {
  const index = content.indexOf(specifier);

  if (index === -1) {
    return {};
  }

  const preceding = content.slice(0, index);
  const lines = preceding.split(/\r?\n/);
  const line = lines.length;
  const column = lines[lines.length - 1]?.length ?? 0;

  return { line, column: column + 1 };
}

async function findCrossFeatureImports(
  graph: RuleDependencyGraph,
  root: string,
): Promise<RuleViolation[]> {
  const violations: RuleViolation[] = [];
  const contentCache = new Map<string, string>();

  const getFileContent = async (relativeFile: string): Promise<string> => {
    const cached = contentCache.get(relativeFile);

    if (cached) {
      return cached;
    }

    const absolutePath = path.join(root, relativeFile);
    const content = await readFile(absolutePath, 'utf8');
    contentCache.set(relativeFile, content);
    return content;
  };

  for (const [relativeFile, imports] of graph.entries()) {
    const sourceFeature = getFeatureNameFromRelative(relativeFile);

    if (!sourceFeature) {
      continue;
    }

    for (const reference of imports) {
      if (!reference.resolved) {
        continue;
      }

      const relativeTarget = toPosix(path.relative(root, reference.resolved));

      if (!relativeTarget.startsWith('src/')) {
        continue;
      }

      const targetFeature = getFeatureNameFromRelative(relativeTarget);

      if (!targetFeature || targetFeature === sourceFeature) {
        continue;
      }

      const content = await getFileContent(relativeFile);
      const location = locateSpecifier(content, reference.specifier);

      violations.push({
        ruleId: 'dependency/no-cross-feature-import',
        message: `Feature module "${sourceFeature}" cannot import from feature "${targetFeature}".`,
        file: relativeFile,
        line: location.line,
        column: location.column,
        fixable: false,
        suggestedFix:
          "Move shared code into 'src/shared' or expose a public API from the target feature instead of importing its internals.",
      });
    }
  }

  return violations;
}

export const noCrossFeatureImportRule: ArchLensRule = {
  id: 'dependency/no-cross-feature-import',
  meta: {
    description: 'Disallow direct imports across feature modules to preserve layering.',
    severity: 'error',
    type: 'dependency',
  },
  async check({ dependencyGraph, root }: RuleContext) {
    return findCrossFeatureImports(dependencyGraph, root);
  },
  async fix({ dependencyGraph, root, report }: RuleContext) {
    const violations = await findCrossFeatureImports(dependencyGraph, root);

    if (!violations.length) {
      return;
    }

    report?.(violations);
  },
};
