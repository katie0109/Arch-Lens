import type { ArchLensConfig } from '@arch-lens/core';

const config: ArchLensConfig = {
  root: __dirname,
  rules: {
    'dependency/allow-list': 'error',
  },
};

export default config;
