import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { mkdtemp, rm, writeFile, mkdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';

import {
  requiredFeatureIndexRule,
  type RuleContext,
  type RuleDependencyGraph,
} from '../src/index.js';

function createContext(root: string, files: string[]): RuleContext {
  const dependencyGraph: RuleDependencyGraph = new Map();

  return {
    root,
    files,
    fix: false,
    verbose: false,
    dependencyGraph,
  };
}

describe('requiredFeatureIndexRule', () => {
  let workspace: string;

  beforeEach(async () => {
    workspace = await mkdtemp(join(tmpdir(), 'arch-lens-structure-'));
    await mkdir(join(workspace, 'src/features/Cart'), { recursive: true });
    await mkdir(join(workspace, 'src/features/Payment'), { recursive: true });
  });

  afterEach(async () => {
    await rm(workspace, { recursive: true, force: true });
  });

  it('reports missing index.ts files per feature', async () => {
    await writeFile(
      join(workspace, 'src/features/Cart/cart-service.ts'),
      "export const checkout = () => 'ok';\n",
      'utf8',
    );

    const context = createContext(workspace, ['src/features/Cart/cart-service.ts']);
    const result = await requiredFeatureIndexRule.check(context);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      ruleId: 'structure/required-feature-index',
      file: 'src/features/Cart/index.ts',
      fixable: true,
    });
  });

  it('passes when index.ts exists', async () => {
    const files = [
      'src/features/Cart/cart-service.ts',
      'src/features/Cart/index.ts',
    ];

    await writeFile(join(workspace, files[0]), "export const checkout = () => 'ok';\n", 'utf8');
    await writeFile(join(workspace, files[1]), 'export {};\n', 'utf8');

    const context = createContext(workspace, files);
    const result = await requiredFeatureIndexRule.check(context);

    expect(result).toHaveLength(0);
  });

  it('creates missing index.ts during fix mode', async () => {
    await writeFile(
      join(workspace, 'src/features/Cart/cart-service.ts'),
      "export const checkout = () => 'ok';\n",
      'utf8',
    );

    const files = ['src/features/Cart/cart-service.ts'];
    const context: RuleContext = {
      ...createContext(workspace, files),
      fix: true,
    };

    await requiredFeatureIndexRule.fix?.(context);

    const created = await stat(join(workspace, 'src/features/Cart/index.ts'));

    expect(created.isFile()).toBe(true);
  });
});
