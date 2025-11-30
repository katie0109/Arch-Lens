# Arch-Lens 빠른 시작 (Getting Started)

Arch-Lens는 **설정 파일 하나**로 팀의 구조/의존성 규칙을 검사하고 자동 수정하는 CLI입니다. 아래 단계를 따라 하면 5분 안에 규칙 파이프라인을 돌릴 수 있습니다.

---

## 1. 설치

```bash
pnpm add -D @arch-lens/cli @arch-lens/core @arch-lens/rules
# npm 또는 yarn 환경이라면 동일 패키지를 devDependencies에 추가하세요.
```

저장소 전체를 체크아웃한 상태라면 `pnpm install`만으로 의존성이 준비됩니다.

---

## 2. 설정 파일 생성

```bash
pnpm --filter @arch-lens/cli exec arch-lens init --config arch.config.ts
```

- `arch.config.ts`가 생성되며, 기본적으로 모든 내장 규칙이 포함됩니다.
- `--force` 옵션을 주면 기존 파일을 `.bak`로 백업한 뒤 덮어씁니다.

---

## 3. 스캔 & 자동 수정

```bash
# 규칙 검사
pnpm --filter @arch-lens/cli exec arch-lens scan

# auto-fix
pnpm --filter @arch-lens/cli exec arch-lens scan --fix

# report/metrics/watch 옵션
pnpm --filter @arch-lens/cli exec arch-lens scan --report json --pretty
pnpm --filter @arch-lens/cli exec arch-lens scan --metrics ./metrics.json
pnpm --filter @arch-lens/cli exec arch-lens scan --watch
```

위반이 발견되면 exit code 1과 함께 테이블/JSON/HTML 등 원하는 리포트 형식으로 출력됩니다. 구조 규칙은 누락 파일을 실제로 생성하거나 이동시키고, 의존성 규칙은 재구조화 가이드를 제공합니다.

---

## 4. 규칙 커스터마이즈

`arch.config.ts`에서 `loadBuiltInRules({ include, exclude, overrides })`를 사용하면 필요한 규칙만 선택할 수 있습니다. 플러그인으로 새로운 규칙을 만들어 추가하는 것도 가능합니다.

```ts
import { loadBuiltInRules } from '@arch-lens/rules';
import type { ArchLensConfig } from '@arch-lens/core';
import myPlugin from './plugins/my-team-plugin.js';

const config: ArchLensConfig = {
  root: process.cwd(),
  rules: [
    ...loadBuiltInRules({
      include: ['structure/required-files', 'dependency/no-cross-layer'],
      exclude: ['structure/no-loose-files'],
    }),
    ...myPlugin.rules,
  ],
};

export default config;
```

> 저장소의 기본 규칙은 데모를 위해 임의 구성되어 있습니다. 각 팀은 위와 같이 **필요한 규칙만 골라 쓰거나, 직접 만든 플러그인을 붙여** 자신만의 정책을 만들면 됩니다.

플러그인 SDK와 튜토리얼은 [`docs/plugin-guide.md`](./plugin-guide.md)에서 확인하세요.

---

## 5. 샘플 프로젝트 실행

```bash
./examples/monorepo-sample/scripts/run-arch-lens.sh
```

- CLI 및 샘플 플러그인을 자동 빌드한 뒤, 두 번의 스캔을 실행합니다.
- `src/features/index.ts`를 일부러 비워 두었기 때문에 `structure/required-files` 위반이 출력되면 정상입니다.

---

## 6. CI 파이프라인에 연결

```yaml
- name: Architecture guard
  run: pnpm --filter @arch-lens/cli exec arch-lens scan
```

CI에서 위반이 발견되면 작업이 실패(exit code 1)하므로, 아키텍처 규칙을 PR 단계에서 강제할 수 있습니다. `--report json`과 아티팩트 업로드를 조합하면 HTML/Markdown 리포트도 배포 가능합니다.
