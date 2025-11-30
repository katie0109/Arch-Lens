import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';

import { createNoCrossLayerRule } from '../src/index.js';

describe('dependency/no-cross-layer', () => {
  let workspace: string;

  beforeEach(async () => {
    workspace = await mkdtemp(join(tmpdir(), 'arch-lens-no-cross-layer-'));
    await mkdir(join(workspace, 'src/app'), { recursive: true });
    await mkdir(join(workspace, 'src/features/Cart'), { recursive: true });
    await mkdir(join(workspace, 'src/shared'), { recursive: true });
  });

  afterEach(async () => {
    await rm(workspace, { recursive: true, force: true });
  });

  it('warns when disallowed layer imports occur', async () => {
    const file = join(workspace, 'src/features/Cart/service.ts');
    await writeFile(file, "import '../shared/util';\n");

    const rule = createNoCrossLayerRule({
      layers: [
        { name: 'app', pattern: '^src/app/' },
        { name: 'features', pattern: '^src/features/', canImport: [] },
        { name: 'shared', pattern: '^src/shared/', canImport: ['shared'] },
      ],
    });

    const violations = await rule.check({
      root: workspace,
      files: ['src/features/Cart/service.ts', 'src/shared/util.ts'],
      fix: false,
      verbose: false,
      dependencyGraph: new Map([
        [
          'src/features/Cart/service.ts',
          [
            {
              specifier: '../shared/util',
              isTypeOnly: false,
              resolved: join(workspace, 'src/shared/util.ts'),
            },
          ],
        ],
      ]),
    });

    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe('dependency/no-cross-layer');
  });
});
