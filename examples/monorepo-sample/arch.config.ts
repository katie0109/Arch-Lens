// Arch-Lens sample configuration for the example monorepo (ESLint-style rules map).
import type { ArchLensConfig } from 'arch-lens-core';

const config: ArchLensConfig = {
  root: __dirname,
  rules: {
    'structure/required-feature-index': 'warn',
    'structure/required-files': 'error',
    'structure/filename-case': 'warn',
    'structure/no-loose-files': 'warn',
    'dependency/no-cross-feature-import': 'error',
    'dependency/no-cross-layer': 'error',
    'dependency/no-circular': 'error',
    'dependency/allow-list': 'off',
  },
};

export default config;
