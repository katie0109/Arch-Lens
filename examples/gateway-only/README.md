# gateway-only-access example

Demonstrates the flagship executable rule: a module may not reach a restricted zone
(`src/legacy/`) directly or transitively — every path must pass through a gateway
(`src/gateway/`). Time-boxed waivers grant temporary, auto-expiring exceptions.

This policy needs graph path-finding + options + dated exceptions, so it cannot be
expressed by plain JSON boundary configs or import DSLs.

```bash
./examples/gateway-only/scripts/run-arch-lens.sh
```

`src/app/checkout.ts` imports `src/legacy/db` directly, so the scan reports a violation
with the offending path. Route it through `src/gateway/legacy.ts`, or uncomment the dated
waiver in `arch.config.ts`, to clear it.
