import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { loadBuiltInRules } from '@arch-lens/rules';
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

function toArray(value: string | string[] | undefined): string[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

async function loadPluginRules(pluginPath: string): Promise<ArchLensRule[]> {
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

export interface LoadRulesOptions {
  plugin?: string | string[];
  includeBuiltIn?: boolean;
}

export async function gatherRules(options: LoadRulesOptions = {}): Promise<ArchLensRule[]> {
  const { includeBuiltIn = true } = options;
  const builtIn = includeBuiltIn ? loadBuiltInRules() : [];
  const pluginPaths = toArray(options.plugin);

  if (pluginPaths.length === 0) {
    return builtIn;
  }

  const pluginRuleSets = await Promise.all(pluginPaths.map(loadPluginRules));
  return [...builtIn, ...pluginRuleSets.flat()];
}
