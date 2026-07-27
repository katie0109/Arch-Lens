import { resolve } from 'node:path';
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

async function loadPluginModule(pluginPath: string): Promise<ArchLensRule[]> {
  // NOTE: only local file paths are supported for now. Bare npm package specifiers
  // (e.g. "@scope/my-plugin") are a v0.2 concern.
  const absolutePath = resolve(process.cwd(), pluginPath);
  const moduleUrl = pathToFileURL(absolutePath).href;
  const imported = await import(moduleUrl);
  const pluginCandidate = imported.default ?? imported.plugin ?? imported;
  const plugin = pluginCandidate as Partial<PluginModule<ArchLensRule>>;

  if (!plugin || !Array.isArray(plugin.rules)) {
    throw new Error(`Plugin at ${pluginPath} does not export a valid Arch-Lens plugin module.`);
  }

  return plugin.rules;
}

/** Loads the rules contributed by `--plugin` paths. Built-in rules are provided by core. */
export async function loadPluginRules(pluginPaths: string[]): Promise<ArchLensRule[]> {
  if (pluginPaths.length === 0) {
    return [];
  }

  const pluginRuleSets = await Promise.all(pluginPaths.map(loadPluginModule));
  return pluginRuleSets.flat();
}
