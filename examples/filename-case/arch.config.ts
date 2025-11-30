import type { ArchLensConfig } from '@arch-lens/core';
import { loadBuiltInRules } from '@arch-lens/rules';

const config: ArchLensConfig = {
  root: __dirname,
  rules: loadBuiltInRules({ include: ['structure/filename-case'] }),
};

export default config;
