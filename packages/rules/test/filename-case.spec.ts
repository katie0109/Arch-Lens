import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { mkdtemp, rm, writeFile, mkdir, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';

import { createFilenameCaseRule, filenameCaseRule } from '../src/index.js';

describe('structure/filename-case', () => {
  let workspace: string;

  beforeEach(async () => {
    workspace = await mkdtemp(join(tmpdir(), 'arch-lens-filename-case-'));
    await mkdir(join(workspace, 'src/components'), { recursive: true });
    await mkdir(join(workspace, 'src/hooks'), { recursive: true });
  });

  afterEach(async () => {
    await rm(workspace, { recursive: true, force: true });
  });

  it('detects files with wrong casing', async () => {
    const filePath = join(workspace, 'src/components/cart-card.tsx');
    await writeFile(filePath, 'export const CartCard = () => null;\n', 'utf8');

    const violations = await filenameCaseRule.check({
      root: workspace,
      files: ['src/components/cart-card.tsx'],
      fix: false,
      verbose: false,
      dependencyGraph: new Map(),
    });

    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain('should be');
  });

  it('renames files during fix', async () => {
    const filePath = join(workspace, 'src/components/cart-card.tsx');
    await writeFile(filePath, 'export const CartCard = () => null;\n', 'utf8');

    const rule = createFilenameCaseRule();

    await rule.fix({
      root: workspace,
      files: ['src/components/cart-card.tsx'],
      fix: true,
      verbose: true,
      dependencyGraph: new Map(),
    });

    await expect(access(join(workspace, 'src/components/CartCard.tsx'))).resolves.toBeUndefined();
  });

  it('supports custom casing rules', async () => {
    const filePath = join(workspace, 'src/hooks/useCart.ts');
    await writeFile(filePath, 'export const useCart = () => null;\n', 'utf8');

    const rule = createFilenameCaseRule({
      rules: [
        {
          test: '^src/hooks/.+\\.ts$',
          style: 'kebab-case',
        },
      ],
    });

    const violations = await rule.check({
      root: workspace,
      files: ['src/hooks/useCart.ts'],
      fix: false,
      verbose: false,
      dependencyGraph: new Map(),
    });

    expect(violations).toHaveLength(1);
    expect(violations[0].suggestedFix).toContain('kebab');
  });
});
