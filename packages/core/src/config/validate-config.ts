import type { ArchLensConfig } from '../types.js';

/** A structural error in a loaded configuration. Surfaced to the CLI as an exit-code-2 failure. */
export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Validates the shape of a loaded config object. Rule-source merge policy and cross-source
 * duplicate handling live in the rule resolver; this only guards a single config's own shape.
 */
export function validateConfig(
  config: unknown,
  source: string,
): asserts config is ArchLensConfig {
  if (!isRecord(config)) {
    throw new ConfigValidationError(
      `Arch-Lens config at ${source} must export an object, received ${typeof config}.`,
    );
  }

  if (!isRecord(config.rules) && !Array.isArray(config.rules)) {
    throw new ConfigValidationError(
      `Arch-Lens config at ${source} must define "rules" as an array or an id→severity map.`,
    );
  }

  if (
    config.plugins !== undefined &&
    (!Array.isArray(config.plugins) || config.plugins.some((p) => typeof p !== 'string'))
  ) {
    throw new ConfigValidationError(
      `Arch-Lens config at ${source} has a "plugins" field that must be an array of strings.`,
    );
  }

  if (config.projects !== undefined) {
    if (
      !Array.isArray(config.projects) ||
      config.projects.some(
        (p) => !isRecord(p) || typeof p.name !== 'string' || typeof p.pattern !== 'string',
      )
    ) {
      throw new ConfigValidationError(
        `Arch-Lens config at ${source} has a "projects" field that must be an array of { name, pattern }.`,
      );
    }
  }

  if (Array.isArray(config.rules)) {
    validateRuleArray(config.rules, source);
  } else {
    validateRulesMap(config.rules, source);
  }
}

function validateRuleArray(rules: unknown[], source: string): void {
  rules.forEach((rule, index) => {
    if (!isRecord(rule) || typeof rule.id !== 'string' || rule.id.length === 0) {
      throw new ConfigValidationError(
        `Arch-Lens config at ${source} has a rule at index ${index} without a non-empty string "id".`,
      );
    }

    if (typeof rule.check !== 'function') {
      throw new ConfigValidationError(
        `Rule "${rule.id}" in ${source} must implement a check() function.`,
      );
    }
  });
}

const VALID_LEVELS = new Set(['off', 'warn', 'error']);

function validateRulesMap(rules: Record<string, unknown>, source: string): void {
  for (const [id, setting] of Object.entries(rules)) {
    const level = Array.isArray(setting) ? setting[0] : setting;

    if (typeof level !== 'string' || !VALID_LEVELS.has(level)) {
      throw new ConfigValidationError(
        `Rule "${id}" in ${source} has an invalid setting. Use 'off', 'warn', 'error', or [level, options].`,
      );
    }
  }
}
