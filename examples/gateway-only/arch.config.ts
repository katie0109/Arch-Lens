import type { ArchLensConfig } from '@moth-tools/arch-lens-core';

// The flagship plugin is declared in `plugins` (path relative to this file) and activated
// by id in the rules map, with options (restricted/gateways) and a dated waiver.
const config: ArchLensConfig = {
  root: __dirname,
  plugins: ['../../packages/plugins/dist/sample/gateway-only-access.js'],
  rules: {
    'sample/gateway-only-access': [
      'error',
      {
        restricted: ['^src/legacy/'],
        gateways: ['^src/gateway/'],
        // Grant src/app/checkout.ts a temporary, auto-expiring exception by setting a future date:
        // waivers: [{ from: '^src/app/checkout\\.ts$', until: '2026-12-31', reason: 'migration' }],
      },
    ],
  },
};

export default config;
