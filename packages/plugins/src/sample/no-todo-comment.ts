import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createRule } from '../createRule.js';
import { definePlugin } from '../definePlugin.js';
import type { PluginRuleViolation } from '../types.js';

const noTodoCommentRule = createRule({
  id: 'lint/no-todo-comment',
  meta: {
    description: 'Prevent TODO comments from landing in production code.',
    severity: 'warning',
    type: 'structure',
  },
  async check(context) {
    const { files, root } = context;
    const violations: PluginRuleViolation[] = [];

    for (const file of files) {
      if (!file.endsWith('.ts') && !file.endsWith('.tsx')) {
        continue;
      }

      const content = await readFile(join(root, file), 'utf8');
      const todoIndex = content.indexOf('TODO');

      if (todoIndex !== -1) {
        const prefix = content.slice(0, todoIndex);
        const line = prefix.split(/\r?\n/).length;
        const column = todoIndex - prefix.lastIndexOf('\n');

        violations.push({
          ruleId: 'lint/no-todo-comment',
          message: 'TODO comments are not allowed. Please resolve or remove them.',
          file,
          line,
          column,
          fixable: false,
          suggestedFix: 'Remove or resolve the TODO comment before merging.',
        });
      }
    }

    return violations;
  },
});

const plugin = definePlugin({
  meta: {
    name: 'arch-lens-plugin-no-todo',
    version: '0.1.0',
  },
  rules: [noTodoCommentRule],
});

export default plugin;
export { noTodoCommentRule };
