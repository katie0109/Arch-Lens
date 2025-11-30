const fs = require('node:fs');
const path = require('node:path');

function getPackageTsconfigs() {
  const packagesDir = path.resolve(__dirname, 'packages');

  try {
    const entries = fs.readdirSync(packagesDir, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(packagesDir, entry.name, 'tsconfig.json'))
      .filter((configPath) => fs.existsSync(configPath));
  } catch {
    return [];
  }
}

const packageTsconfigs = getPackageTsconfigs();

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: [path.resolve(__dirname, 'tsconfig.base.json'), ...packageTsconfigs],
    sourceType: 'module'
  },
  env: {
    es2022: true,
    node: true
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier'
  ],
  settings: {
    'import/resolver': {
      typescript: {
        project: [path.resolve(__dirname, 'tsconfig.base.json'), ...packageTsconfigs]
      }
    }
  },
  rules: {
    '@typescript-eslint/consistent-type-imports': 'error',
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true }
      }
    ]
  }
};
