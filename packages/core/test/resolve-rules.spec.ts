import { describe, expect, it } from 'vitest';

import type { ArchLensRule } from '@arch-lens/rules';

import { ConfigValidationError } from '../src/config/validate-config.js';
import { resolveRules } from '../src/orchestrator/resolve-rules.js';

function rule(id: string): ArchLensRule {
  return {
    id,
    meta: { description: id, severity: 'warning', type: 'structure' },
    check: () => [],
  };
}

const defaultRules = [rule('builtin/a'), rule('builtin/b')];

describe('resolveRules', () => {
  it('uses built-in defaults when no config declares rules', () => {
    const resolved = resolveRules({ defaultRules });
    expect(resolved.map((r) => r.id)).toEqual(['builtin/a', 'builtin/b']);
  });

  it('lets a config own its rules without merging built-ins on top', () => {
    const resolved = resolveRules({
      configRules: [rule('team/only')],
      defaultRules,
    });
    expect(resolved.map((r) => r.id)).toEqual(['team/only']);
  });

  it('always appends plugin rules after the base', () => {
    const resolved = resolveRules({
      configRules: [rule('team/only')],
      defaultRules,
      pluginRules: [rule('plugin/x')],
    });
    expect(resolved.map((r) => r.id)).toEqual(['team/only', 'plugin/x']);
  });

  it('appends plugin rules onto built-in defaults when there is no config', () => {
    const resolved = resolveRules({ defaultRules, pluginRules: [rule('plugin/x')] });
    expect(resolved.map((r) => r.id)).toEqual(['builtin/a', 'builtin/b', 'plugin/x']);
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
