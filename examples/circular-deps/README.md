# Circular Dependency Sample

이 예제는 `dependency/no-circular` 규칙이 순환 의존을 어떻게 감지하는지 보여줍니다. `src/catalog/ProductRepository.ts`와 `src/pricing/PricingService.ts`가 서로를 import 하므로 규칙 위반이 발생합니다.

## 실행 방법

```bash
pnpm build
node packages/cli/dist/index.js scan src --config examples/circular-deps/arch.config.ts
```

또는 `scripts/run-arch-lens.sh`를 사용해 한 번에 실행할 수 있습니다.
