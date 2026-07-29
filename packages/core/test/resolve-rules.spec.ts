import type { ArchLensRule, RuleSeverity } from '@arch-lens/rules';
import { describe, expect, it } from 'vitest';

import { ConfigValidationError } from '../src/config/validate-config.js';
import { resolveRules } from '../src/orchestrator/resolve-rules.js';

function rule(id: string, severity: RuleSeverity = 'warning'): ArchLensRule {
  return {
    id,
    meta: { description: id, severity, type: 'structure' },
    check: () => [],
  };
}

const defaultRules = [rule('builtin/a', 'error'), rule('builtin/b')];

const ids = (resolved: ReturnType<typeof resolveRules>) => resolved.map((r) => r.rule.id);

describe('resolveRules (array form)', () => {
  it('uses built-in defaults when no config declares rules', () => {
    expect(ids(resolveRules({ defaultRules }))).toEqual(['builtin/a', 'builtin/b']);
  });

  it('lets a config own its rules without merging built-ins on top', () => {
    expect(ids(resolveRules({ configRules: [rule('team/only')], defaultRules }))).toEqual([
      'team/only',
    ]);
  });

  it('always appends plugin rules after the base', () => {
    const resolved = resolveRules({
      configRules: [rule('team/only')],
      defaultRules,
      pluginRules: [rule('plugin/x')],
    });
    expect(ids(resolved)).toEqual(['team/only', 'plugin/x']);
  });

  it('carries each rule meta severity and no options in array form', () => {
    const resolved = resolveRules({ defaultRules });
    expect(resolved[0]).toMatchObject({ severity: 'error', options: undefined });
    expect(resolved[1]).toMatchObject({ severity: 'warning', options: undefined });
  });

  it('rejects duplicate rule ids across sources as a config error', () => {
    expect(() =>
      resolveRules({
        configRules: [rule('team/dup')],
        defaultRules,
        pluginRules: [rule('team/dup')],
      }),
    ).toThrow(ConfigValidationError);
  });
});

describe('resolveRules (map form)', () => {
  it('activates only the mapped rules from the registry, with config severity/options', () => {
    const resolved = resolveRules({
      configRules: {
        'builtin/a': 'warn',
        'plugin/x': ['error', { threshold: 3 }],
        'builtin/b': 'off',
      },
      defaultRules,
      pluginRules: [rule('plugin/x')],
    });

    expect(ids(resolved).sort()).toEqual(['builtin/a', 'plugin/x']);
    const a = resolved.find((r) => r.rule.id === 'builtin/a');
    const x = resolved.find((r) => r.rule.id === 'plugin/x');
    expect(a).toMatchObject({ severity: 'warning', options: undefined });
    expect(x).toMatchObject({ severity: 'error', options: { threshold: 3 } });
  });

  it('throws for an unknown rule id', () => {
    expect(() =>
      resolveRules({ configRules: { 'nope/missing': 'error' }, defaultRules }),
    ).toThrow(ConfigValidationError);
  });

  it('throws for an invalid severity', () => {
    expect(() =>
      resolveRules({
        configRules: { 'builtin/a': 'boom' as unknown as 'error' },
        defaultRules,
      }),
    ).toThrow(ConfigValidationError);
  });
});
