// @ts-nocheck

import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { buildDependencyGraph, createDefaultResolver } from '../src/parser/ts-dependency-graph.js';

describe('TypeScript path alias resolution', () => {
  let workspace: string;

  afterEach(async () => {
    if (workspace) {
      await rm(workspace, { recursive: true, force: true });
    }
  });

  it('resolves TS path aliases to absolute file paths', async () => {
    workspace = await mkdtemp(join(tmpdir(), 'arch-lens-resolver-'));

    const tsconfigPath = join(workspace, 'tsconfig.json');
    await writeFile(
      tsconfigPath,
      JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2022',
            moduleResolution: 'NodeNext',
            baseUrl: '.',
            paths: {
              '@shared/*': ['src/shared/*'],
            },
          },
        },
        null,
        2,
      ),
      'utf8',
    );

    await mkdir(join(workspace, 'src/shared'), { recursive: true });
    await mkdir(join(workspace, 'src/features/cart'), { recursive: true });

    await writeFile(
      join(workspace, 'src/shared/util.ts'),
      "export const util = () => 'ok';\n",
      'utf8',
    );

    await writeFile(
      join(workspace, 'src/features/cart/service.ts'),
      "import { util } from '@shared/util';\n\nexport const cartService = () => util();\n",
      'utf8',
    );

    const graph = await buildDependencyGraph(['src/features/cart/service.ts'], {
      cwd: workspace,
      resolveImport: createDefaultResolver(workspace),
    });

    const imports = graph.get('src/features/cart/service.ts');
    expect(imports).toBeDefined();
    expect(imports?.[0]?.resolved).toBe(join(workspace, 'src/shared/util.ts'));
  });
});
