import type { PluginModule, PluginRule } from './types.js';

export function definePlugin<T extends PluginRule>(plugin: PluginModule<T>): PluginModule<T> {
  return plugin;
}
