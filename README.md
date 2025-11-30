# Arch-Lens

> **Tagline:** "Conventions should be enforced by tools, not by humans."

![Coverage](https://img.shields.io/badge/coverage-ready--for--run-lightgrey?logo=vitest)

Arch-Lens는 대규모 프론트엔드 모노레포의 구조·의존성 컨벤션을 **CLI 한 번으로 점검/자동 수정**할 수 있게 만드는 Rule Engine입니다. 규칙 세트는 기본 제공하지만, 각 팀이 원하는 규칙을 자유롭게 추가·삭제하거나 플러그인으로 배포할 수 있도록 설계했습니다.

---

## 왜 Arch-Lens인가요?

- `arch-lens scan` 한 번으로 구조/의존성 위반을 탐지하고, auto-fix 가능한 항목을 즉시 수정합니다.
- mtime 기반 의존성 그래프 캐시와 `--watch`, `--metrics` 옵션으로 대형 모노레포에서도 빠르게 반복 실행할 수 있습니다.
- 내장 규칙 외에도 `@arch-lens/plugins` SDK로 팀 전용 규칙을 플러그인 형태로 배포할 수 있습니다.
- CI 파이프라인, 샘플 모노레포, 상세 문서 세트가 함께 제공되어 곧바로 팀 규칙을 자동화할 수 있습니다.

---

## 빠른 시작

```bash
pnpm install

# 프로젝트에 CLI만 추가하고 싶다면
pnpm add -D @arch-lens/cli @arch-lens/core @arch-lens/rules
```

```bash
# 1) 설정 파일 생성
pnpm --filter @arch-lens/cli exec arch-lens init --config arch.config.ts

# 2) 규칙 검사
pnpm --filter @arch-lens/cli exec arch-lens scan

# 3) 자동 수정 & Watch 모드
pnpm --filter @arch-lens/cli exec arch-lens scan --fix
pnpm --filter @arch-lens/cli exec arch-lens scan --watch

# 4) 리포트/메트릭
pnpm --filter @arch-lens/cli exec arch-lens scan --report html > report.html
pnpm --filter @arch-lens/cli exec arch-lens scan --metrics ./metrics.json

# 5) 샘플 프로젝트 체험
./examples/monorepo-sample/scripts/run-arch-lens.sh
```

자세한 온보딩 흐름은 [`docs/getting-started.md`](./docs/getting-started.md)에서 단계별로 정리되어 있습니다.

---

## 내 규칙 세트를 어떻게 꾸미나요?

Arch-Lens는 **기본 규칙을 그대로 사용해도 되고**, `loadBuiltInRules({ include, exclude, overrides })`를 통해 원하는 규칙만 로드할 수도 있습니다. 여기에 플러그인으로 정의한 규칙을 이어 붙이면 팀 고유의 정책을 완성할 수 있습니다.

```ts
// arch.config.ts 예시
import { loadBuiltInRules } from '@arch-lens/rules';
import type { ArchLensConfig } from '@arch-lens/core';
import myTeamPlugin from './plugins/my-team-plugin.js';

const config: ArchLensConfig = {
  root: process.cwd(),
  include: ['src/**/*.{ts,tsx}'],
  exclude: ['**/dist/**', '**/__tests__/**'],
  rules: [
    ...loadBuiltInRules({
      include: [
        'structure/required-files',
        'structure/filename-case',
        'dependency/no-cross-layer',
      ],
      overrides: {
        'structure/filename-case': {
          rules: [{ test: '^src/components/.+\\.tsx$', style: 'pascal-case' }],
        },
      },
      exclude: ['structure/no-loose-files'],
    }),
    ...myTeamPlugin.rules,
  ],
};

export default config;
```

>  위 예시처럼 **필요한 규칙만 고르고**, 언제든 새 플러그인을 추가/삭제할 수 있습니다. 저장소의 기본 규칙 셋은 데모를 위해 임의로 구성되어 있으며, 실제 팀에서는 자유롭게 커스터마이즈하면 됩니다.

플러그인 제작 방법과 샘플은 [`docs/plugin-guide.md`](./docs/plugin-guide.md)를 참고하세요. `createRule`/`definePlugin` 헬퍼와 `PluginRuleContext` 타입이 제공되며, 샘플 플러그인 3종도 `packages/plugins`에서 확인할 수 있습니다.

---

## 예제 모노레포 체험하기

- `examples/monorepo-sample/scripts/run-arch-lens.sh`는 CLI와 샘플 플러그인을 한 번에 실행해 주는 스크립트입니다.
- 스크립트는 CLI/플러그인을 자동으로 빌드한 뒤, 두 번의 스캔을 실행합니다.
- 데모를 위해 `structure/required-files` 위반(`src/features/index.ts` 없음)을 일부러 남겨두었으니, 위반 메시지가 출력되면 정상 동작입니다.

```bash
./examples/monorepo-sample/scripts/run-arch-lens.sh
```

---

## 문서 & 자료 모음

| 문서 | 설명 |
| --- | --- |
| [docs/getting-started.md](./docs/getting-started.md) | 설치, init/scan, CI 연동까지의 빠른 흐름 |
| [docs/rules-reference.md](./docs/rules-reference.md) | 내장 구조/의존성 규칙 옵션과 override 전략 |
| [docs/plugin-guide.md](./docs/plugin-guide.md) | 팀 전용 규칙을 플러그인으로 만드는 튜토리얼 |
| [docs/architecture.md](./docs/architecture.md) | 오케스트레이션, 캐싱, watch 모드 아키텍처 |

---

## 개발자 노트

- `pnpm lint`, `pnpm typecheck`, `pnpm test`로 품질 게이트를 통과한 뒤 PR을 제출해주세요.
- 샘플 규칙/플러그인을 수정했다면 반드시 README·Docs·CHANGELOG를 함께 업데이트합니다.
- 저장소 전체 빌드: `pnpm build`. 특정 패키지 빌드: `pnpm --filter <pkg> run build`.

워크플로 구조는 아래와 같으며, 세부 사항은 [`docs/architecture.md`](./docs/architecture.md)를 참고하세요.

```
packages/
  cli/ core/ rules/ plugins/
examples/
  monorepo-sample/
docs/
```

---


