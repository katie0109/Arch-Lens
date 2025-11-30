# Filename Case Sample

`structure/filename-case` 규칙이 컴포넌트 파일 이름을 PascalCase 로 강제하는 방법을 보여 주는 예제입니다. `src/components/bad-button.tsx` 파일명이 규칙을 위반하도록 일부러 작성되어 있습니다.

## 실행 방법

```bash
pnpm build
node packages/cli/dist/index.js scan src --config examples/filename-case/arch.config.ts
```

또는 `scripts/run-arch-lens.sh`를 사용하면 빌드 체크와 실행을 한 번에 수행할 수 있습니다.
