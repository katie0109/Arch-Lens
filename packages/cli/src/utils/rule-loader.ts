import { createRequire } from 'node:module';
import { isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { ArchLensRule } from '@arch-lens/rules';

interface PluginModule<Rule extends ArchLensRule = ArchLensRule> {
  meta: {
    name: string;
    version: string;
    description?: string;
    homepage?: string;
  };
  rules: Rule[];
}

/** A bare npm specifier: not relative, absolute, or a file: URL. e.g. `@scope/pkg`, `pkg/sub`. */
function isBareSpecifier(specifier: string): boolean {
  return (
    !specifier.startsWith('.') &&
    !specifier.startsWith('/') &&
    !specifier.startsWith('file:') &&
    !isAbsolute(specifier)
  );
}

/**
 * Resolves a `--plugin` value to an importable module URL:
 *   - `file:` URLs pass through untouched,
 *   - bare specifiers (`@scope/pkg`, `pkg`, `pkg/sub`) resolve through the consumer project's
 *     node_modules, exactly as the project itself would import them,
 *   - anything else is treated as a path relative to `cwd`.
 */
export function resolvePluginUrl(specifier: string, cwd: string = process.cwd()): string {
  if (specifier.startsWith('file:')) {
    return specifier;
  }

  if (isBareSpecifier(specifier)) {
    // Anchor Node's resolver at the consumer project so a plugin installed there is found.
    const requireFromCwd = createRequire(resolve(cwd, '__arch-lens-plugin-resolver__.js'));

    try {
      return pathToFileURL(requireFromCwd.resolve(specifier)).href;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Could not resolve plugin "${specifier}" from ${cwd}. Is it installed? (${reason})`,
      );
    }
  }

  return pathToFileURL(resolve(cwd, specifier)).href;
}

async function loadPluginModule(specifier: string): Promise<ArchLensRule[]> {
  const moduleUrl = resolvePluginUrl(specifier);
  const imported = await import(moduleUrl);
  const pluginCandidate = imported.default ?? imported.plugin ?? imported;
  const plugin = pluginCandidate as Partial<PluginModule<ArchLensRule>>;

  if (!plugin || !Array.isArray(plugin.rules)) {
    throw new Error(
      `Plugin "${specifier}" does not export a valid Arch-Lens plugin module (expected { rules: [...] }).`,
    );
  }

  return plugin.rules;
}

/**
 * Loads the rules contributed by `--plugin` values (local paths, `file:` URLs, or bare npm
 * package specifiers). Built-in rules are provided by core.
 */
export async function loadPluginRules(pluginPaths: string[]): Promise<ArchLensRule[]> {
  if (pluginPaths.length === 0) {
    return [];
  }

  const pluginRuleSets = await Promise.all(pluginPaths.map(loadPluginModule));
  return pluginRuleSets.flat();
}
