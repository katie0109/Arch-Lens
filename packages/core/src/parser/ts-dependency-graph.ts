import { existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, extname, relative, resolve } from 'node:path';

import * as ts from 'typescript';

import type { DependencyGraphCache } from './dependency-graph-cache.js';

interface CompilerOptionsCache {
  options: ts.CompilerOptions;
}

function findTsConfig(cwd: string): string | undefined {
  const primary = ts.findConfigFile(cwd, ts.sys.fileExists, 'tsconfig.json');

  if (primary && existsSync(primary)) {
    return primary;
  }

  const fallback = ts.findConfigFile(cwd, ts.sys.fileExists, 'tsconfig.base.json');

  if (fallback && existsSync(fallback)) {
    return fallback;
  }

  return undefined;
}

function loadCompilerOptions(cwd: string): CompilerOptionsCache | null {
  const configPath = findTsConfig(cwd);

  if (!configPath) {
    return null;
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

  if (configFile.error) {
    return null;
  }

  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, dirname(configPath));
  return { options: parsed.options };
}

const RELATIVE_IMPORT_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

function resolveRelativeImportPath(candidate: string): string {
  if (existsSync(candidate)) {
    try {
      const stats = statSync(candidate);

      if (stats.isDirectory()) {
        for (const ext of RELATIVE_IMPORT_EXTENSIONS) {
          const indexPath = resolve(candidate, `index${ext}`);
          if (existsSync(indexPath)) {
            return indexPath;
          }
        }
      } else {
        return candidate;
      }
    } catch {
      // Ignore filesystem errors and fall through to extension probing below.
    }
  }

  if (!extname(candidate)) {
    for (const ext of RELATIVE_IMPORT_EXTENSIONS) {
      const withExtension = `${candidate}${ext}`;
      if (existsSync(withExtension)) {
        return withExtension;
      }
    }
  }

  return candidate;
}

function createRelativeResolver(cwd: string): (specifier: string, fromFile: string) => string | null {
  return (specifier, fromFile) => {
    if (!specifier.startsWith('.')) {
      return null;
    }

    const absoluteFrom = resolve(cwd, fromFile);
    const baseDir = dirname(absoluteFrom);
    const candidate = resolve(baseDir, specifier);
    return resolveRelativeImportPath(candidate);
  };
}

export interface ImportReference {
  specifier: string;
  isTypeOnly: boolean;
  resolved?: string | null;
}

export interface FileDependencyMapEntry {
  file: string;
  imports: ImportReference[];
}

export type DependencyGraph = Map<string, ImportReference[]>;

export interface DependencyGraphOptions {
  cwd: string;
  resolveImport?: (specifier: string, fromFile: string) => string | null;
  cache?: DependencyGraphCache;
}

async function parseSourceFile(filePath: string): Promise<ts.SourceFile> {
  const content = await readFile(filePath, 'utf8');
  return ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
}

function collectImports(sourceFile: ts.SourceFile): ImportReference[] {
  const imports: ImportReference[] = [];

  sourceFile.forEachChild((node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const clause = node as ts.ImportDeclaration | ts.ExportDeclaration;
      const moduleSpecifier = clause.moduleSpecifier;

      if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
        imports.push({
          specifier: moduleSpecifier.text,
          isTypeOnly: Boolean('isTypeOnly' in clause && clause.isTypeOnly),
        });
      }
    }
  });

  return imports;
}

export async function buildDependencyGraph(
  files: string[],
  { cwd, resolveImport, cache }: DependencyGraphOptions,
): Promise<DependencyGraph> {
  const graph: DependencyGraph = new Map();

  for (const relativePath of files) {
    const absolutePath = resolve(cwd, relativePath);

    const loadImports = async (): Promise<ImportReference[]> => {
      const sourceFile = await parseSourceFile(absolutePath);
      return collectImports(sourceFile).map((reference) => ({
        ...reference,
        resolved: resolveImport?.(reference.specifier, relativePath) ?? null,
      }));
    };

    const imports = cache
      ? await cache.getImports(absolutePath, loadImports)
      : await loadImports();

    graph.set(relativePath, imports);
  }

  return graph;
}

export function createDefaultResolver(
  cwd: string,
): (specifier: string, fromFile: string) => string | null {
  const relativeResolver = createRelativeResolver(cwd);
  const compilerOptionsCache = loadCompilerOptions(cwd);

  if (!compilerOptionsCache) {
    return relativeResolver;
  }

  const compilerOptions = compilerOptionsCache.options;
  const caseSensitive = ts.sys.useCaseSensitiveFileNames ?? false;
  const getCanonicalFileName = caseSensitive
    ? (fileName: string) => fileName
    : (fileName: string) => fileName.toLowerCase();

  const moduleResolutionCache = ts.createModuleResolutionCache(
    cwd,
    getCanonicalFileName,
    compilerOptions,
  );

  const moduleResolutionHost: ts.ModuleResolutionHost = {
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
    realpath: ts.sys.realpath ? ts.sys.realpath.bind(ts.sys) : undefined,
    getCurrentDirectory: () => cwd,
    useCaseSensitiveFileNames: () => caseSensitive,
  };

  return (specifier, fromFile) => {
    const containingFile = resolve(cwd, fromFile);
    const resolution = ts.resolveModuleName(
      specifier,
      containingFile,
      compilerOptions,
      moduleResolutionHost,
      moduleResolutionCache,
    );

    const resolvedFileName = resolution.resolvedModule?.resolvedFileName;

    if (resolvedFileName) {
      const normalized = resolve(resolvedFileName);
      const relativeToRoot = relative(cwd, normalized);

      if (!relativeToRoot.startsWith('..') && !resolvedFileName.includes('node_modules')) {
        return normalized;
      }
    }

    return relativeResolver(specifier, fromFile);
  };
}
