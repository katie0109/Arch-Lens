# Allow List Sample

`dependency/allow-list` 규칙이 기능 간 직접 의존을 어떻게 차단하는지 보여주는 예제입니다. 기본 설정상 각 feature는 자신과 `src/shared`만 import할 수 있는데, `src/features/Cart/CartService.ts`가 `src/features/Admin/AdminService.ts`를 참조하도록 일부러 위반을 넣었습니다.

## 실행 방법

```bash
pnpm build
node packages/cli/dist/index.js scan src --config examples/allow-list/arch.config.ts
```

또는 `scripts/run-arch-lens.sh`로 한 번에 실행할 수 있습니다.
