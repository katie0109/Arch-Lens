import type { ArchLensConfig } from '@arch-lens/core';
import { loadBuiltInRules } from '@arch-lens/rules';

const config: ArchLensConfig = {
  root: __dirname,
  rules: loadBuiltInRules({
    include: ['dependency/no-cross-layer'],
    overrides: {
      'dependency/no-cross-layer': {
        layers: [
          { name: 'core', pattern: '^src/core/', canImport: ['core'] },
          { name: 'service', pattern: '^src/service/', canImport: ['service', 'core'] },
          { name: 'ui', pattern: '^src/ui/', canImport: ['ui', 'service'] },
        ],
      },
    },
  }),
};

export default config;
