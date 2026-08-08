import type { ArchLensConfig } from 'arch-lens-core';

// Options are passed to the rule via the [severity, options] tuple in the map.
const config: ArchLensConfig = {
  root: __dirname,
  rules: {
    'dependency/no-cross-layer': [
      'error',
      {
        layers: [
          { name: 'core', pattern: '^src/core/', canImport: ['core'] },
          { name: 'service', pattern: '^src/service/', canImport: ['service', 'core'] },
          { name: 'ui', pattern: '^src/ui/', canImport: ['ui', 'service'] },
        ],
      },
    ],
  },
};

export default config;
