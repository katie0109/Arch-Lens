import type { PluginRuleViolation } from '../types.js';
declare const noDefaultExportRule: {
    id: string;
    meta: {
        description: string;
        severity: "warning";
        type: "structure";
    };
    check(context: import("../types.js").PluginRuleContext): Promise<PluginRuleViolation[]>;
};
declare const noDefaultExportPlugin: import("../types.js").PluginModule<{
    id: string;
    meta: {
        description: string;
        severity: "warning";
        type: "structure";
    };
    check(context: import("../types.js").PluginRuleContext): Promise<PluginRuleViolation[]>;
}>;
export default noDefaultExportPlugin;
export { noDefaultExportPlugin, noDefaultExportRule };
//# sourceMappingURL=no-default-export.d.ts.map