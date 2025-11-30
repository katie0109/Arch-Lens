import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { mkdtemp, rm, writeFile, mkdir, access, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';

import { createRequiredFilesRule, requiredFilesRule } from '../src/index.js';

describe('structure/required-files', () => {
  let workspace: string;

  beforeEach(async () => {
    workspace = await mkdtemp(join(tmpdir(), 'arch-lens-required-files-'));
    await mkdir(join(workspace, 'src/features/Cart'), { recursive: true });
  });

  afterEach(async () => {
    await rm(workspace, { recursive: true, force: true });
  });

  it('reports missing required files', async () => {
    const violations = await requiredFilesRule.check({
      root: workspace,
      files: [],
      fix: false,
      verbose: false,
      dependencyGraph: new Map(),
    });

    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      ruleId: 'structure/required-files',
      fixable: true,
    });
  });

  it('creates missing files during fix', async () => {
    const rule = createRequiredFilesRule({
      targets: [
        {
          directory: 'src/features/Cart',
          files: ['index.ts'],
          templates: {
            'index.ts': "export * from './CartService';\n",
          },
        },
      ],
    });

    await rule.fix({
      root: workspace,
      files: [],
      fix: true,
      verbose: false,
      dependencyGraph: new Map(),
    });

    await expect(access(join(workspace, 'src/features/Cart/index.ts'))).resolves.toBeUndefined();
    const content = await readFile(join(workspace, 'src/features/Cart/index.ts'), 'utf8');
    expect(content).toContain("export * from './CartService';");
  });

  it('skips existing files during fix', async () => {
    await writeFile(join(workspace, 'src/features/index.ts'), '// 기존 파일\n', 'utf8');

    await requiredFilesRule.fix?.({
      root: workspace,
      files: [],
      fix: true,
      verbose: false,
      dependencyGraph: new Map(),
    });

    const content = await readFile(join(workspace, 'src/features/index.ts'), 'utf8');
    expect(content).toContain('// 기존 파일');
  });
});
