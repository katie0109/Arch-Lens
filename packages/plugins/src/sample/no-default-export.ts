import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createRule } from '../createRule.js';
import { definePlugin } from '../definePlugin.js';
import type { PluginRuleViolation } from '../types.js';

const noDefaultExportRule = createRule({
  id: 'lint/no-default-export',
  meta: {
    description: '각 파일은 명시적인 named export만 사용하도록 강제합니다.',
    severity: 'warning',
    type: 'structure',
  },
  async check(context) {
    const { files, root } = context;
    const violations: PluginRuleViolation[] = [];

    for (const file of files) {
      if (!file.endsWith('.ts') && !file.endsWith('.tsx') && !file.endsWith('.js') && !file.endsWith('.jsx')) {
        continue;
      }

      const source = await readFile(join(root, file), 'utf8');
      const match = /export\s+default\s+/m.exec(source);

      if (match) {
        const before = source.slice(0, match.index);
        const line = before.split(/\r?\n/).length;
        const column = match.index - before.lastIndexOf('\n');

        violations.push({
          ruleId: 'lint/no-default-export',
          message: 'default export 대신 named export를 사용하세요.',
          file,
          line,
          column,
          fixable: false,
        });
      }
    }

    return violations;
  },
});

const noDefaultExportPlugin = definePlugin({
  meta: {
    name: 'arch-lens-plugin-no-default-export',
    version: '0.1.0',
    description: 'default export 사용을 금지하는 간단한 샘플 플러그인',
  },
  rules: [noDefaultExportRule],
});

export default noDefaultExportPlugin;
export { noDefaultExportPlugin, noDefaultExportRule };
