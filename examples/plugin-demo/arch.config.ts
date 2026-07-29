import type { ArchLensConfig } from '@arch-lens/core';

// The plugin is declared in the config's `plugins` array (resolved from this directory),
// and its rule is activated by id in the map — no --plugin flag needed.
const config: ArchLensConfig = {
  root: __dirname,
  plugins: ['./plugins/no-default-export.mjs'],
  rules: {
    'demo/no-default-export': 'error',
  },
};

export default config;
