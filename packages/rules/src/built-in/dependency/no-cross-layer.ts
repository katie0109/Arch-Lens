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

// Classic layered architecture: a layer may import its own layer and the layers "below" it.
const DEFAULT_LAYERS: LayerConfig[] = [
  { name: 'app', pattern: '^src/app/', canImport: ['app', 'features', 'shared'] },
  { name: 'features', pattern: '^src/features/', canImport: ['features', 'shared'] },
  { name: 'shared', pattern: '^src/shared/', canImport: ['shared'] },
];

function normaliseOptions(options?: NoCrossLayerRuleOptions): LayerConfig[] {
  const layers = options?.layers ?? DEFAULT_LAYERS;

  // When a layer omits canImport, default to "own layer only". The previous default was
  // "every other layer except self", which inverted the intent: it blocked same-layer
  // imports and allowed all cross-layer imports.
  return layers.map((layer) => ({
    ...layer,
    canImport: layer.canImport ?? [layer.name],
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
  const bakedLayers = normaliseOptions(options);

  // Prefer config-provided options (map form) over options baked in at creation (array form).
  const layersFor = (context: RuleContext): LayerConfig[] =>
    context.options ? normaliseOptions(context.options as NoCrossLayerRuleOptions) : bakedLayers;

  return {
    id: 'dependency/no-cross-layer',
    meta: {
      description: 'Prevent disallowed cross-layer dependencies.',
      severity: 'error',
      type: 'dependency',
    },
    async check(context: RuleContext): Promise<RuleViolation[]> {
      return collectViolations(context.dependencyGraph, layersFor(context), context.root);
    },
    async fix(context: RuleContext): Promise<void> {
      const violations = collectViolations(context.dependencyGraph, layersFor(context), context.root);

      if (violations.length > 0) {
        context.report?.(violations);
      }
    },
  };
}

export const noCrossLayerRule = createNoCrossLayerRule();
