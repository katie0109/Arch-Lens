# arch-lens-rules

Built-in rules and the **rule authoring contract** for Arch-Lens.

This package owns the core types plugin and rule authors program against: `ArchLensRule`,
`RuleContext` (with `graph`, `projectGraph`, `owners`, `options`), `RuleViolation`,
`ArchitectureGraph`, and `Ownership`.

```ts
import { loadBuiltInRules, type ArchLensRule } from 'arch-lens-rules';

const rules = loadBuiltInRules(); // the default built-in rule set
```

Built-in rule ids include: `structure/required-feature-index`, `structure/required-files`,
`structure/filename-case`, `structure/no-loose-files`, `dependency/no-cross-feature-import`,
`dependency/no-cross-layer`, `dependency/no-circular`, `dependency/allow-list`.

See the [project README](https://github.com/katie0109/Arch-Lens#readme). MIT licensed.
