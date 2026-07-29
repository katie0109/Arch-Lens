import type { ArchLensRule, RuleViolation } from '@arch-lens/rules';

import type { BaselineData } from './baseline/baseline.js';
import type { ReportFormat } from './reporter/console-reporter.js';

export interface ScanOptions {
  target?: string;
  fix?: boolean;
  verbose?: boolean;
  reportFormat?: ReportFormat;
  pretty?: boolean;
  changedFiles?: string[];
  /** When set, violations recorded in the baseline are suppressed before reporting. */
  baseline?: BaselineData;
  /** Skip the reporter and just return the result (used to capture violations, e.g. for baseline). */
  silent?: boolean;
}

export interface InitOptions {
  force?: boolean;
  configPath?: string;
  template?: string;
  verbose?: boolean;
}

export interface LoadedConfig {
  configPath: string;
  config: ArchLensConfig;
}

export interface InitResult extends LoadedConfig {
  scaffolded: boolean;
  backupPath?: string;
}

export interface ScanResult {
  violations: RuleViolation[];
  files: string[];
  durationMs: number;
  /** How many violations the baseline suppressed (0 when no baseline was applied). */
  suppressedCount: number;
}

/** ESLint-style severities used in the config's `rules` map. `warn` maps to `warning`. */
export type ConfigSeverity = 'off' | 'warn' | 'error';

/** A single rule setting: a severity, or a `[severity, options]` tuple. */
export type RuleSetting = ConfigSeverity | ['error' | 'warn', unknown];

/** The ESLint-style rules map: rule id -> setting. */
export type RulesMap = Record<string, RuleSetting>;

export interface ArchLensConfig {
  root?: string;
  include?: string[];
  exclude?: string[];
  /** Plugin specifiers (local paths, `file:` URLs, or bare npm packages) to load rules from. */
  plugins?: string[];
  /**
   * Either the legacy array of rule instances, or the ESLint-style map keyed by rule id.
   * In the map form, built-in and plugin rules are the registry and the map activates them.
   */
  rules: ArchLensRule[] | RulesMap;
}

export type { ReportFormat };
export type { ArchLensRule, RuleViolation };
