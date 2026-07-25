import type { ArchLensRule } from '@arch-lens/rules';

import { ConfigValidationError } from '../config/validate-config.js';

export interface ResolveRulesInput {
  /** Rules declared by a loaded/inline config. `undefined` means no config was present. */
  configRules?: ArchLensRule[];
  /** Built-in rules, used as the base only when no config declares rules. */
  defaultRules: ArchLensRule[];
  /** Rules contributed by `--plugin`, always appended on top of the base. */
  pluginRules?: ArchLensRule[];
}

/** Throws a {@link ConfigValidationError} if any rule id appears more than once. */
export function assertUniqueRuleIds(
  rules: ArchLensRule[],
  source = 'the resolved rule set',
): void {
  const counts = new Map<string, number>();

  for (const rule of rules) {
    counts.set(rule.id, (counts.get(rule.id) ?? 0) + 1);
  }

  const duplicates = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([id]) => id);

  if (duplicates.length > 0) {
    throw new ConfigValidationError(
      `Duplicate rule id(s) in ${source}: ${duplicates.join(', ')}. Each rule id must be unique.`,
    );
  }
}

/**
 * Single source of truth for which rules run:
 *   - a config owns its rules; built-ins are NOT implicitly merged on top of it,
 *   - built-ins are the base only when no config declares rules,
 *   - `--plugin` rules are always appended.
 * The final set must have unique ids.
 */
export function resolveRules({
  configRules,
  defaultRules,
  pluginRules = [],
}: ResolveRulesInput): ArchLensRule[] {
  const base = configRules ?? defaultRules;
  const resolved = [...base, ...pluginRules];

  assertUniqueRuleIds(resolved);

  return resolved;
}
