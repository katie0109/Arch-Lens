import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';

import {
  noCrossFeatureImportRule,
  type RuleContext,
  type RuleDependencyGraph,
  type RuleImportReference,
} from '../src/index.js';

interface GraphEntry {
  file: string;
  imports: Array<{
    specifier: string;
    target?: string | null;
    isTypeOnly?: boolean;
  }>;
}

function createDependencyGraph(root: string, entries: GraphEntry[]): RuleDependencyGraph {
  const graph: RuleDependencyGraph = new Map();

  for (const entry of entries) {
    const imports: RuleImportReference[] = entry.imports.map((item) => ({
      specifier: item.specifier,
      isTypeOnly: Boolean(item.isTypeOnly),
      resolved: item.target ? join(root, item.target) : null,
    }));

    graph.set(entry.file, imports);
  }

  return graph;
}

function createContext(root: string, files: string[], graphEntries: GraphEntry[]): RuleContext {
  return {
    root,
    files,
    fix: false,
    verbose: false,
    dependencyGraph: createDependencyGraph(root, graphEntries),
  };
}

describe('noCrossFeatureImportRule', () => {
  let workspace: string;

  beforeEach(async () => {
    workspace = await mkdtemp(join(tmpdir(), 'arch-lens-rule-'));
    await mkdir(join(workspace, 'src/features/Cart'), { recursive: true });
    await mkdir(join(workspace, 'src/features/Payment'), { recursive: true });
    await mkdir(join(workspace, 'src/shared'), { recursive: true });
  });

  afterEach(async () => {
    await rm(workspace, { recursive: true, force: true });
  });

  it('flags cross-feature imports as violations', async () => {
    await writeFile(join(workspace, 'src/features/Payment/payment-service.ts'), "export const chargePayment = () => 'paid';\n", 'utf8');
    await writeFile(
      join(workspace, 'src/features/Cart/cart-service.ts'),
      "import { chargePayment } from '../Payment/payment-service';\n\nexport const checkout = () => chargePayment();\n",
      'utf8',
    );

    const context = createContext(
      workspace,
      ['src/features/Cart/cart-service.ts', 'src/features/Payment/payment-service.ts'],
      [
        {
          file: 'src/features/Cart/cart-service.ts',
          imports: [
            {
              specifier: '../Payment/payment-service',
              target: 'src/features/Payment/payment-service.ts',
            },
          ],
        },
      ],
    );

    const result = await noCrossFeatureImportRule.check(context);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      ruleId: 'dependency/no-cross-feature-import',
      file: 'src/features/Cart/cart-service.ts',
    });
  });

  it('allows imports from shared modules', async () => {
    await writeFile(
      join(workspace, 'src/features/Cart/price-utils.ts'),
      "import { formatCurrency } from '../../shared/currency';\n\nexport const format = formatCurrency;\n",
      'utf8',
    );

    const context = createContext(
      workspace,
      ['src/features/Cart/price-utils.ts'],
      [
        {
          file: 'src/features/Cart/price-utils.ts',
          imports: [
            {
              specifier: '../../shared/currency',
              target: 'src/shared/currency.ts',
            },
          ],
        },
      ],
    );

    const result = await noCrossFeatureImportRule.check(context);

    expect(result).toHaveLength(0);
  });

  it('ignores intra-feature relative imports', async () => {
    await writeFile(join(workspace, 'src/features/Cart/cart-item.ts'), "export const cartItem = () => 'item';\n", 'utf8');
    await writeFile(
      join(workspace, 'src/features/Cart/cart-service.ts'),
      "import { cartItem } from './cart-item';\n\nexport const checkout = () => cartItem();\n",
      'utf8',
    );

    const context = createContext(
      workspace,
      ['src/features/Cart/cart-service.ts', 'src/features/Cart/cart-item.ts'],
      [
        {
          file: 'src/features/Cart/cart-service.ts',
          imports: [
            {
              specifier: './cart-item',
              target: 'src/features/Cart/cart-item.ts',
            },
          ],
        },
      ],
    );

    const result = await noCrossFeatureImportRule.check(context);

    expect(result).toHaveLength(0);
  });
});
