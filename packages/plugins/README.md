# @moth-tools/arch-lens-plugin-kit

Plugin helpers and sample plugins for **Arch-Lens**.

```ts
import { definePlugin, createRule } from '@moth-tools/arch-lens-plugin-kit';

export default definePlugin({
  meta: { name: '@your-scope/arch-rules', version: '1.0.0' },
  rules: [
    createRule({
      id: 'your-scope/no-legacy-import',
      meta: { description: '...', severity: 'error', type: 'dependency' },
      check(context) {
        // context.graph, context.projectGraph, context.owners, context.options are available
        return [];
      },
    }),
  ],
});
```

A plugin is a module exporting `{ meta, rules }`. Load it with the CLI's `--plugin <path|@scope/pkg>`
flag or the config's `plugins` array.

Includes a flagship sample, `sample/gateway-only-access`: restricted areas may only be reached via a
gateway (direct **or** transitive), with dated waivers — using the graph query API + options.

See the [project README](https://github.com/katie0109/Arch-Lens#readme). MIT licensed.
