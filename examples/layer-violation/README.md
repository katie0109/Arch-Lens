# Layer Violation Sample

`dependency/no-cross-layer` 규칙으로 UI 계층이 Core 계층을 직접 import 하면 어떻게 위반이 발생하는지 보여주는 예제입니다.

## 레이어 정책
- `core` → 자신만 import 가능
- `service` → `service`, `core` import 가능
- `ui` → `ui`, `service` import 가능 (Core 직접 접근 금지)

`src/ui/App.ts`가 `src/core/db.ts`를 바로 가져오므로 규칙이 실패하도록 구성되어 있습니다.

## 실행 방법
```bash
pnpm build
node packages/cli/dist/index.js scan src --config examples/layer-violation/arch.config.ts
```
또는 `scripts/run-arch-lens.sh`를 실행하세요.
