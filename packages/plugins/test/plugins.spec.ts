import { describe, expect, it } from 'vitest';

import {
  createRule,
  definePlugin,
  noTodoCommentRule,
  enforceSharedImportsRule,
  noDefaultExportRule,
} from '../src/index.js';
import type { PluginRule } from '../src/index.js';

describe('plugin SDK', () => {
  it('createRule returns the rule unchanged while narrowing its type', () => {
    const rule = createRule({
      id: 'sample/no-op',
      meta: { description: 'no-op', type: 'structure', severity: 'warning' },
      check: () => [],
    });

    expect(rule.id).toBe('sample/no-op');
    expect(rule.check({ root: '.', files: [], fix: false, verbose: false })).toEqual([]);
  });

  it('definePlugin preserves meta and rules', () => {
    const rule: PluginRule = {
      id: 'sample/no-op',
      meta: { description: 'no-op', type: 'structure', severity: 'warning' },
      check: () => [],
    };

    const plugin = definePlugin({
      meta: { name: 'arch-lens-sample', version: '0.0.0' },
      rules: [rule],
    });

    expect(plugin.meta.name).toBe('arch-lens-sample');
    expect(plugin.rules).toHaveLength(1);
  });

  it('exports well-formed sample rules', () => {
    for (const rule of [noTodoCommentRule, enforceSharedImportsRule, noDefaultExportRule]) {
      expect(typeof rule.id).toBe('string');
      expect(rule.id.length).toBeGreaterThan(0);
      expect(['structure', 'dependency']).toContain(rule.meta.type);
      expect(['error', 'warning']).toContain(rule.meta.severity);
      expect(typeof rule.check).toBe('function');
    }
  });
});
