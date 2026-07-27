import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/test/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      reportsDirectory: './coverage',
      cleanOnRerun: true,
      // Measure only first-party source, not tests, examples, or build output.
      include: ['packages/*/src/**/*.ts'],
      exclude: [
        '**/dist/**',
        '**/*.d.ts',
        '**/*.spec.ts',
        '**/test/**',
        '**/templates/**',
      ],
      // A regression floor rather than an aspiration. Much of the CLI is exercised by the
      // E2E suite, which spawns the built binary in a separate process and therefore does
      // not contribute to in-process coverage; the real flow coverage is higher.
      thresholds: {
        lines: 60,
        statements: 60,
        functions: 60,
        branches: 60,
      },
    },
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
});
