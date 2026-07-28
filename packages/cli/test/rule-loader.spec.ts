import { isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

import { resolvePluginUrl } from '../src/utils/rule-loader.js';

describe('resolvePluginUrl', () => {
  const cwd = process.cwd();

  it('passes file: URLs through unchanged', () => {
    const url = 'file:///tmp/my-plugin.mjs';
    expect(resolvePluginUrl(url, cwd)).toBe(url);
  });

  it('treats a relative path as relative to cwd', () => {
    const expected = pathToFileURL(resolve(cwd, './plugins/local.mjs')).href;
    expect(resolvePluginUrl('./plugins/local.mjs', cwd)).toBe(expected);
  });

  it('treats an absolute path as a file URL', () => {
    const abs = resolve(cwd, 'plugins/abs.mjs');
    expect(isAbsolute(abs)).toBe(true);
    expect(resolvePluginUrl(abs, cwd)).toBe(pathToFileURL(abs).href);
  });

  it('throws a helpful error when a bare specifier cannot be resolved', () => {
    expect(() => resolvePluginUrl('@no-such-scope/definitely-missing', cwd)).toThrow(
      /Could not resolve plugin "@no-such-scope\/definitely-missing"/,
    );
  });
});
