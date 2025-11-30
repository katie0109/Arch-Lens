# Plugin Loading Sample

사용자 정의 플러그인을 `--plugin` 옵션으로 주입해 `export default` 구문을 금지하는 간단한 규칙을 시연합니다.

## 포함 내용
- `plugins/no-default-export.mjs`: `@arch-lens/plugins`의 `definePlugin`을 사용해 기본 내보내기를 감지하는 규칙을 구현
- `src/ui/Button.ts`: 기본 내보내기를 가진 예시 파일 (규칙 위반 발생)
- `arch.config.ts`: 빌트인 규칙을 비활성화한 최소 설정

## 실행 방법
```bash
pnpm build
examples/plugin-demo/scripts/run-arch-lens.sh
```
또는 직접 명령을 실행하려면:

**macOS/Linux (bash/zsh 등)**
```bash
pnpm build
node packages/cli/dist/index.js scan src \
  --config examples/plugin-demo/arch.config.ts \
  --plugin examples/plugin-demo/plugins/no-default-export.mjs
```

**Windows PowerShell** 
```powershell
pnpm build
node packages/cli/dist/index.js scan src `
  --config examples/plugin-demo/arch.config.ts `
  --plugin examples/plugin-demo/plugins/no-default-export.mjs
```
