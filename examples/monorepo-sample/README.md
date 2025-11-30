# Arch-Lens 예제 모노레포

이 최소 샘플은 Arch-Lens가 기능 간 의존성 위반을 어떻게 감지하는지 보여줍니다.

- `src/features/Cart/CartService.ts`가 `src/features/Payment`를 고의로 import 하여 빌트인 규칙 `dependency/no-cross-feature-import`가 위반되도록 구성했습니다.
- `src/shared`에서 가져오는 것은 허용되므로 공용 유틸을 자유롭게 재사용할 수 있습니다.

CLI를 한 번 빌드한 뒤, 저장소 루트에서 아래 명령으로 샘플을 스캔할 수 있습니다.

```bash
pnpm build
node packages/cli/dist/index.js scan src --config examples/monorepo-sample/arch.config.ts
```
