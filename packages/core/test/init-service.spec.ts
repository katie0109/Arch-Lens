import { existsSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { initializeProject } from '../src/init/init-service.js';

// The scaffolded config imports '@moth-tools/arch-lens', so the workspace must live inside the
// repo for Node's upward node_modules resolution to find the workspace links.
const scratchRoot = join(process.cwd(), '.e2e-workspaces');

describe('initializeProject', () => {
  let workspace: string;

  beforeEach(async () => {
    workspace = join(scratchRoot, `init-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(workspace, { recursive: true });
  });

  afterEach(async () => {
    await rm(workspace, { recursive: true, force: true });
  });

  it('scaffolds, loads and validates a fresh config', async () => {
    const result = await initializeProject({ cwd: workspace });

    expect(result.scaffolded).toBe(true);
    expect(existsSync(result.configPath)).toBe(true);
    // The scaffolded config uses the ESLint-style rules map.
    expect(Array.isArray(result.config.rules)).toBe(false);
    expect(Object.keys(result.config.rules).length).toBeGreaterThan(0);
  });

  it('does not overwrite an existing config without force', async () => {
    await initializeProject({ cwd: workspace });
    const second = await initializeProject({ cwd: workspace });

    expect(second.scaffolded).toBe(false);
  });

  it('backs up an existing config when force is set', async () => {
    await initializeProject({ cwd: workspace });
    const forced = await initializeProject({ cwd: workspace, force: true });

    expect(forced.scaffolded).toBe(true);
    expect(forced.backupPath).toBeTruthy();
    expect(existsSync(forced.backupPath as string)).toBe(true);
  });

  it('honors an explicit config path', async () => {
    const result = await initializeProject({ cwd: workspace, configPath: 'config/arch.config.ts' });

    expect(result.scaffolded).toBe(true);
    expect(result.configPath.replace(/\\/g, '/')).toContain('config/arch.config.ts');
    expect(existsSync(result.configPath)).toBe(true);
  });
});
