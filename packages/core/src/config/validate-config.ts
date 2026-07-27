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

  if (!Array.isArray(config.rules)) {
    throw new ConfigValidationError(
      `Arch-Lens config at ${source} must define a "rules" array.`,
    );
  }

  config.rules.forEach((rule, index) => {
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
