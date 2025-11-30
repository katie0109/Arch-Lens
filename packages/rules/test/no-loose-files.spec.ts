import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { mkdtemp, rm, writeFile, mkdir, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';

import { createNoLooseFilesRule } from '../src/index.js';

describe('structure/no-loose-files', () => {
  let workspace: string;

  beforeEach(async () => {
    workspace = await mkdtemp(join(tmpdir(), 'arch-lens-no-loose-files-'));
    await mkdir(join(workspace, 'src/shared'), { recursive: true });
  });

  afterEach(async () => {
    await rm(workspace, { recursive: true, force: true });
  });

  it('flags loose files in disallowed directories', async () => {
    await writeFile(join(workspace, 'src/foo.ts'), '// TODO: 정리 필요\n');

    const rule = createNoLooseFilesRule();
    const violations = await rule.check({
      root: workspace,
      files: ['src/foo.ts'],
      fix: false,
      verbose: false,
      dependencyGraph: new Map(),
    });

    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ ruleId: 'structure/no-loose-files', fixable: true });
  });

  it('relocates loose files during fix', async () => {
    await writeFile(join(workspace, 'src/foo.ts'), '// TODO: 정리 필요\n');

    const rule = createNoLooseFilesRule({ relocationDir: 'src/shared/__loose__' });

    expect(rule.fix).toBeDefined();

    await rule.fix!({
      root: workspace,
      files: ['src/foo.ts'],
      fix: true,
      verbose: true,
      dependencyGraph: new Map(),
    });

    await expect(access(join(workspace, 'src/shared/__loose__/foo.ts'))).resolves.toBeUndefined();
  });
});
