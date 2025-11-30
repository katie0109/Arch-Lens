import type { ArchLensRule, RuleViolation } from '@arch-lens/rules';

import type { ReportFormat } from './reporter/console-reporter.js';

export interface ScanOptions {
  target?: string;
  fix?: boolean;
  verbose?: boolean;
  reportFormat?: ReportFormat;
  pretty?: boolean;
  changedFiles?: string[];
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
}

export interface ArchLensConfig {
  root?: string;
  include?: string[];
  exclude?: string[];
  rules: ArchLensRule[];
}

export type { ReportFormat };
export type { ArchLensRule, RuleViolation };
