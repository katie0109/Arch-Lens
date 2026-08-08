import type { ArchLensConfig } from '@moth-tools/arch-lens-core';

const config: ArchLensConfig = {
  root: __dirname,
  rules: {
    'dependency/allow-list': 'error',
  },
};

export default config;
