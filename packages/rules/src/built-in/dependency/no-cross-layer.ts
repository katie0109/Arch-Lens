import path from 'node:path';

import type { ArchLensRule, RuleContext, RuleDependencyGraph, RuleViolation } from '../../index.js';

export interface LayerConfig {
  name: string;
  pattern: string; // 정규식 문자열
  canImport?: string[]; // 허용된 레이어 이름 목록
}

export interface NoCrossLayerRuleOptions {
  layers?: LayerConfig[];
}

const DEFAULT_LAYERS: LayerConfig[] = [
  { name: 'app', pattern: '^src/app/' },
  { name: 'features', pattern: '^src/features/' },
  { name: 'shared', pattern: '^src/shared/' },
];

function normaliseOptions(options?: NoCrossLayerRuleOptions): LayerConfig[] {
  const layers = options?.layers ?? DEFAULT_LAYERS;

  return layers.map((layer) => ({
    ...layer,
    canImport: layer.canImport ?? layers.map((l) => l.name).filter((name) => name !== layer.name),
  }));
}

function detectLayer(file: string, layers: LayerConfig[]): LayerConfig | undefined {
  const normalised = file.replace(/\\/g, '/');

  return layers.find((layer) => new RegExp(layer.pattern).test(normalised));
}

function collectViolations(
  graph: RuleDependencyGraph,
  layers: LayerConfig[],
  root: string,
): RuleViolation[] {
  const violations: RuleViolation[] = [];

  for (const [file, imports] of graph.entries()) {
    const sourceLayer = detectLayer(file, layers);

    if (!sourceLayer) {
      continue;
    }

    for (const reference of imports) {
      if (!reference.resolved) {
        continue;
      }

      const targetRelative = path.relative(root, reference.resolved).replace(/\\/g, '/');
      const targetLayer = detectLayer(targetRelative, layers);

      if (!targetLayer) {
        continue;
      }

      if (sourceLayer.canImport?.includes(targetLayer.name)) {
        continue;
      }

      violations.push({
        ruleId: 'dependency/no-cross-layer',
        message: `Layer "${sourceLayer.name}" cannot import from "${targetLayer.name}".`,
        file,
        fixable: false,
        suggestedFix: `Move shared logic to a permitted layer or expose a public API in the "${targetLayer.name}" layer.`,
      });
    }
  }

  return violations;
}

export function createNoCrossLayerRule(options?: NoCrossLayerRuleOptions): ArchLensRule {
  const layers = normaliseOptions(options);

  return {
    id: 'dependency/no-cross-layer',
    meta: {
      description: 'Prevent disallowed cross-layer dependencies.',
      severity: 'error',
      type: 'dependency',
    },
    async check({ dependencyGraph, root }: RuleContext): Promise<RuleViolation[]> {
      return collectViolations(dependencyGraph, layers, root);
    },
    async fix({ dependencyGraph, root, report }: RuleContext): Promise<void> {
      const violations = collectViolations(dependencyGraph, layers, root);

      if (violations.length > 0) {
        report?.(violations);
      }
    },
  };
}

export const noCrossLayerRule = createNoCrossLayerRule();
