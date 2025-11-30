import type { PluginRuleViolation } from '../types.js';
declare const noTodoCommentRule: {
    id: string;
    meta: {
        description: string;
        severity: "warning";
        type: "structure";
    };
    check(context: import("../types.js").PluginRuleContext): Promise<PluginRuleViolation[]>;
};
declare const plugin: import("../types.js").PluginModule<{
    id: string;
    meta: {
        description: string;
        severity: "warning";
        type: "structure";
    };
    check(context: import("../types.js").PluginRuleContext): Promise<PluginRuleViolation[]>;
}>;
export default plugin;
export { noTodoCommentRule };
//# sourceMappingURL=no-todo-comment.d.ts.map