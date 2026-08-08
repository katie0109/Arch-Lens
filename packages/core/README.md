# @moth-tools/arch-lens-core

Core engine for **Arch-Lens**: config loading, rule resolution, the scan orchestrator, the
dependency/architecture graph, project graph, CODEOWNERS ownership, baseline, and reporters.

Most users interact with Arch-Lens through [`@moth-tools/arch-lens`](https://www.npmjs.com/package/@moth-tools/arch-lens);
this package is the programmatic core.

```ts
import { createArchLensOrchestrator, buildArchitectureGraph } from '@moth-tools/arch-lens-core';

const orchestrator = await createArchLensOrchestrator({ configPath: 'arch.config.ts' });
const result = await orchestrator.scan({ reportFormat: 'json' });
```

Exposes: `createArchLensOrchestrator`, `loadArchLensConfig`, `initializeProject`, `resolveRules`,
`buildArchitectureGraph` / `buildProjectGraph` / `createGraph`, `loadOwnership`,
`computeBaseline` / `applyBaseline`, `computeAffected`, and the `ArchitectureGraph` / `Ownership`
contracts (re-exported from `@moth-tools/arch-lens-rules`).

See the [project README](https://github.com/katie0109/Arch-Lens#readme). MIT licensed.
