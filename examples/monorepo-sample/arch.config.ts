// Arch-Lens sample configuration for the example monorepo.
import type { ArchLensConfig } from '@arch-lens/core';
import { loadBuiltInRules } from '@arch-lens/rules';

const config: ArchLensConfig = {
  root: __dirname,
  rules: loadBuiltInRules(),
};

export default config;
