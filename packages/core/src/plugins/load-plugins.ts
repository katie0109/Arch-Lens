import { createRequire } from 'node:module';
import { isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { ArchLensRule } from 'arch-lens-rules';

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
 * Resolves a plugin specifier to an importable module URL:
 *   - `file:` URLs pass through untouched,
 *   - bare specifiers (`@scope/pkg`, `pkg`, `pkg/sub`) resolve through the project's
 *     node_modules, exactly as the project itself would import them,
 *   - anything else is treated as a path relative to `cwd`.
 */
export function resolvePluginUrl(specifier: string, cwd: string = process.cwd()): string {
  if (specifier.startsWith('file:')) {
    return specifier;
  }

  if (isBareSpecifier(specifier)) {
    // Anchor Node's resolver at the project so a plugin installed there is found.
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

async function loadPluginModule(specifier: string, cwd: string): Promise<ArchLensRule[]> {
  const moduleUrl = resolvePluginUrl(specifier, cwd);
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
 * Loads the rules contributed by a list of plugin specifiers (local paths, `file:` URLs, or
 * bare npm package specifiers). Used for both the CLI's `--plugin` flag and the config's
 * `plugins` array; the caller picks `cwd` (the invocation dir vs. the config's root).
 */
export async function loadPluginRules(
  specifiers: string[],
  cwd: string = process.cwd(),
): Promise<ArchLensRule[]> {
  if (specifiers.length === 0) {
    return [];
  }

  const pluginRuleSets = await Promise.all(
    specifiers.map((specifier) => loadPluginModule(specifier, cwd)),
  );
  return pluginRuleSets.flat();
}
