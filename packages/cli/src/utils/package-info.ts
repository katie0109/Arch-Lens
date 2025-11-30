import { createRequire } from 'node:module';

interface PackageJsonLike {
  name?: string;
  version?: string;
  description?: string;
}

const require = createRequire(import.meta.url);
const pkg = require('../../package.json') as PackageJsonLike;

export function getPackageInfo(): PackageJsonLike {
  return pkg;
}
