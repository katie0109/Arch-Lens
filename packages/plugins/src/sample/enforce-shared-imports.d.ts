import type { PluginRule } from '../types.js';
interface EnforceSharedImportsOptions {
    alias?: string;
}
declare function createEnforceSharedImportsRule(options?: EnforceSharedImportsOptions): PluginRule;
declare const enforceSharedImportsRule: PluginRule;
declare const enforceSharedImportsPlugin: import("../types.js").PluginModule<PluginRule>;
export default enforceSharedImportsPlugin;
export { enforceSharedImportsPlugin, enforceSharedImportsRule, createEnforceSharedImportsRule, };
export type { EnforceSharedImportsOptions };
//# sourceMappingURL=enforce-shared-imports.d.ts.map