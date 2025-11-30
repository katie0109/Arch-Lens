import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { definePlugin, createRule } from '@arch-lens/plugins';

function isSupported(file) {
  return /\.(?:[cm]?ts|[jt]sx?)$/i.test(file);
}

const noDefaultRule = createRule({
  id: 'demo/no-default-export',
  meta: {
    description: 'Disallow `export default` in project files',
    severity: 'error',
    type: 'structure',
    docsUrl: 'https://arch-lens.dev/docs/plugin-demo/no-default-export',
  },
  async check(context) {
    const violations = [];

    for (const file of context.files) {
      if (!isSupported(file)) {
        continue;
      }

      const absolute = join(context.root, file);
      let source;
      try {
        source = await readFile(absolute, 'utf8');
      } catch {
        continue;
      }

      if (/export\s+default\s+/m.test(source)) {
        violations.push({
          ruleId: 'demo/no-default-export',
          message: '`export default` 는 금지되어 있습니다. 대신 명명된 export를 사용하세요.',
          file,
          fixable: false,
        });
      }
    }

    return violations;
  },
});

export default definePlugin({
  meta: {
    name: 'arch-lens-demo-no-default-export',
    version: '0.1.0',
    description: 'Blocks default exports via custom plugin rule.',
  },
  rules: [noDefaultRule],
});
