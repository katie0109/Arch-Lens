import type { ArchLensConfig } from 'arch-lens-core';

const config: ArchLensConfig = {
  root: __dirname,
  rules: {
    'dependency/no-circular': 'error',
  },
};

export default config;
