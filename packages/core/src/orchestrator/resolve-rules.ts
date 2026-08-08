import type { ArchLensRule, RuleSeverity } from '@moth-tools/arch-lens-rules';

import { ConfigValidationError } from '../config/validate-config.js';
import type { RuleSetting, RulesMap } from '../types.js';

/** A rule selected to run, with its config-resolved options and severity. */
export interface ResolvedRule {
  rule: ArchLensRule;
  options: unknown;
  severity: RuleSeverity;
}

export interface ResolveRulesInput {
  /** Rules from a loaded/inline config: the legacy array, the map, or `undefined` (no config). */
  configRules?: ArchLensRule[] | RulesMap;
  /** Built-in rules — the base for the array form, and part of the registry for the map form. */
  defaultRules: ArchLensRule[];
  /** Rules from `--plugin`/`config.plugins` — appended in array form, registry in map form. */
  pluginRules?: ArchLensRule[];
}

/** Throws a {@link ConfigValidationError} if any rule id appears more than once. */
export function assertUniqueRuleIds(rules: ArchLensRule[], source = 'the resolved rule set'): void {
  const counts = new Map<string, number>();

  for (const rule of rules) {
    counts.set(rule.id, (counts.get(rule.id) ?? 0) + 1);
  }

  const duplicates = [...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id);

  if (duplicates.length > 0) {
    throw new ConfigValidationError(
      `Duplicate rule id(s) in ${source}: ${duplicates.join(', ')}. Each rule id must be unique.`,
    );
  }
}

/** Parses a rule setting into severity + options, or null when the rule is turned off. */
function parseSetting(
  id: string,
  setting: RuleSetting,
): { severity: RuleSeverity; options: unknown } | null {
  const [level, options] = Array.isArray(setting) ? setting : [setting, undefined];

  if (level === 'off') {
    return null;
  }
  if (level === 'error') {
    return { severity: 'error', options };
  }
  if (level === 'warn') {
    return { severity: 'warning', options };
  }

  throw new ConfigValidationError(
    `Rule "${id}" has an invalid severity "${String(level)}". Use 'off', 'warn', or 'error'.`,
  );
}

function resolveFromArray(base: ArchLensRule[], pluginRules: ArchLensRule[]): ResolvedRule[] {
  const all = [...base, ...pluginRules];
  assertUniqueRuleIds(all);
  return all.map((rule) => ({ rule, options: undefined, severity: rule.meta.severity }));
}

function resolveFromMap(
  map: RulesMap,
  defaultRules: ArchLensRule[],
  pluginRules: ArchLensRule[],
): ResolvedRule[] {
  // The registry is every available rule (built-ins + plugins); the map activates a subset.
  const registry = new Map<string, ArchLensRule>();
  for (const rule of [...defaultRules, ...pluginRules]) {
    registry.set(rule.id, rule);
  }

  const resolved: ResolvedRule[] = [];

  for (const [id, setting] of Object.entries(map)) {
    const parsed = parseSetting(id, setting);
    if (!parsed) {
      continue; // 'off'
    }

    const rule = registry.get(id);
    if (!rule) {
      throw new ConfigValidationError(
        `Unknown rule "${id}". It is not a built-in rule and no loaded plugin provides it.`,
      );
    }

    resolved.push({ rule, options: parsed.options, severity: parsed.severity });
  }

  return resolved;
}

/**
 * Single source of truth for which rules run and how:
 *   - array form: the config's rule instances (or built-in defaults when absent) plus plugin
 *     rules, each run at its own meta severity;
 *   - map form: built-ins and plugins form a registry, and the `{ id: severity | [severity,
 *     options] }` map activates a subset with config-driven severity and options.
 */
export function resolveRules({
  configRules,
  defaultRules,
  pluginRules = [],
}: ResolveRulesInput): ResolvedRule[] {
  if (configRules && !Array.isArray(configRules)) {
    return resolveFromMap(configRules, defaultRules, pluginRules);
  }

  const base = configRules ?? defaultRules;
  return resolveFromArray(base, pluginRules);
}
