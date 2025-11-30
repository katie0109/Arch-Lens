import type { PluginRule } from './types.js';

export function createRule<T extends PluginRule>(rule: T): T {
  return rule;
}
