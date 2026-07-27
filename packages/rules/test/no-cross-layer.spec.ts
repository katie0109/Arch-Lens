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

  it('uses layered defaults: lower layers cannot import higher ones', async () => {
    const rule = createNoCrossLayerRule(); // default app -> features -> shared
    const root = '/proj';

    const violations = await rule.check({
      root,
      files: [],
      fix: false,
      verbose: false,
      dependencyGraph: new Map([
        // features -> app is forbidden (features may not reach up into app)
        [
          'src/features/Cart/service.ts',
          [{ specifier: '@/app/x', isTypeOnly: false, resolved: '/proj/src/app/x.ts' }],
        ],
        // features -> shared is allowed
        [
          'src/features/Cart/util.ts',
          [{ specifier: '@/shared/u', isTypeOnly: false, resolved: '/proj/src/shared/u.ts' }],
        ],
        // app -> features is allowed, and same-layer imports are always allowed
        [
          'src/app/main.ts',
          [
            { specifier: '@/features/Cart', isTypeOnly: false, resolved: '/proj/src/features/Cart/index.ts' },
            { specifier: '@/app/other', isTypeOnly: false, resolved: '/proj/src/app/other.ts' },
          ],
        ],
      ]),
    });

    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain('features');
    expect(violations[0].message).toContain('app');
  });
});
