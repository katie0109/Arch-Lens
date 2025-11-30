import { stat } from 'node:fs/promises';

import type { ImportReference } from './ts-dependency-graph.js';

interface CacheEntry {
  mtimeMs: number;
  imports: ImportReference[];
}

export class DependencyGraphCache {
  private readonly cache = new Map<string, CacheEntry>();

  async getImports(
    absolutePath: string,
    loader: () => Promise<ImportReference[]>,
  ): Promise<ImportReference[]> {
    const stats = await stat(absolutePath);
    const cached = this.cache.get(absolutePath);

    if (cached && cached.mtimeMs === stats.mtimeMs) {
      return cached.imports;
    }

    const imports = await loader();
    this.cache.set(absolutePath, { mtimeMs: stats.mtimeMs, imports });
    return imports;
  }

  invalidate(paths?: string[]): void {
    if (!paths) {
      this.cache.clear();
      return;
    }

    for (const path of paths) {
      this.cache.delete(path);
    }
  }
}
