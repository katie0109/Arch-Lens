# Arch-Lens

> **Tagline:** "Conventions should be enforced by tools, not by humans."

![Coverage](https://img.shields.io/badge/coverage-ready--for--run-lightgrey?logo=vitest)

Arch-Lens는 대규모 프론트엔드 모노레포의 구조·의존성 컨벤션을 **CLI 한 번으로 점검/자동 수정**할 수 있게 만드는 Rule Engine입니다. 규칙 세트는 기본 제공하지만, 각 팀이 원하는 규칙을 자유롭게 추가·삭제하거나 플러그인으로 배포할 수 있도록 설계했습니다.

---

## 왜 Arch-Lens인가요?

- `arch-lens scan` 한 번으로 구조/의존성 위반을 탐지하고, auto-fix 가능한 항목을 즉시 수정합니다.
- **ESLint식 rules 맵**으로 규칙별 `off`/`warn`/`error`와 옵션을 지정합니다. `error`만 종료코드를 실패시키고(warning은 통과), `--report json`은 항상 단일 JSON 문서입니다.
- **그래프 질의 API**(`isReachable`/`shortestPath`/`stronglyConnectedComponents`)를 규칙에 제공해, 단순 import 금지가 아니라 전이 의존·경로 기반 정책을 코드로 표현할 수 있습니다.
- 팀 규칙을 **npm 패키지 플러그인**으로 배포하고, `--plugin @scope/rules` 또는 config의 `plugins` 배열로 로드합니다.
- 도입성·CI 통합: **SARIF**(GitHub Code Scanning), **baseline**(기존 위반 억제·신규만 실패), **`--affected`**(변경분만 검사), **CODEOWNERS ownership**, **프로젝트 그래프**를 제공합니다.
- mtime 기반 의존성 그래프 캐시와 `--watch`, `--metrics` 옵션, CI 파이프라인, 샘플 모노레포가 함께 제공됩니다.

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

# 4) 리포트/메트릭 (SARIF는 GitHub Code Scanning에 업로드)
pnpm --filter @arch-lens/cli exec arch-lens scan --report html > report.html
pnpm --filter @arch-lens/cli exec arch-lens scan --report sarif > arch-lens.sarif
pnpm --filter @arch-lens/cli exec arch-lens scan --metrics ./metrics.json

# 5) 점진 도입 & 증분 검사
pnpm --filter @arch-lens/cli exec arch-lens baseline           # 현재 위반 기록
pnpm --filter @arch-lens/cli exec arch-lens scan --baseline    # 신규 위반만 실패
pnpm --filter @arch-lens/cli exec arch-lens scan --affected --since origin/main

# 6) 샘플 프로젝트 체험
./examples/monorepo-sample/scripts/run-arch-lens.sh
```

자세한 온보딩 흐름은 [`docs/getting-started.md`](./docs/getting-started.md)에서 단계별로 정리되어 있습니다.

---

## 규칙 설정 (rules 맵)

`arch-lens init`이 생성하는 설정은 **ESLint식 rules 맵**입니다. 규칙 id에 `off`/`warn`/`error`를 지정하고, 옵션이 필요하면 `[severity, options]` 튜플로 전달합니다. 내장 규칙과 플러그인 규칙은 모두 id로 참조합니다.

```ts
// arch.config.ts 예시
import type { ArchLensConfig } from '@arch-lens/core';

const config: ArchLensConfig = {
  // root를 생략하면 이 설정 파일이 위치한 디렉터리가 기준이 됩니다.
  include: ['src/**/*.{ts,tsx}'],
  exclude: ['**/dist/**', '**/__tests__/**'],
  // npm/로컬 플러그인을 선언하면 그 규칙들을 id로 활성화할 수 있습니다.
  plugins: ['@your-scope/arch-lens-rules'],
  rules: {
    'structure/required-files': 'error',
    'structure/no-loose-files': 'off',
    'structure/filename-case': [
      'warn',
      { rules: [{ test: '^src/components/.+\\.tsx$', style: 'pascal-case' }] },
    ],
    'dependency/no-cross-layer': 'error',
    // 플러그인이 제공하는 규칙도 동일하게 id로 켭니다.
    '@your-scope/no-legacy-import': 'error',
  },
};

export default config;
```

- `error`가 하나라도 있으면 `scan`은 종료코드 1로 실패하고, `warning`만 있으면 통과(0)합니다.
- 기존 **배열 형식**(`rules: [ruleInstance, ...]`)도 그대로 지원하므로 점진적으로 옮길 수 있습니다.

### 그래프 기반 실행형 규칙 · 플러그인

규칙은 `context.graph`로 **아키텍처 그래프**를 질의할 수 있습니다 — `dependenciesOf`, `dependentsOf`, `isReachable`, `shortestPath`, `stronglyConnectedComponents`. 이 덕분에 "특정 영역에 **직접 또는 전이적으로** 접근 금지, 반드시 gateway 경유"처럼 경로 기반 정책을 코드로 표현할 수 있습니다.

대표 예제 [`examples/gateway-only`](./examples/gateway-only)는 그래프 탐색 + 옵션 + **만료일 있는 waiver**를 결합한 `sample/gateway-only-access` 규칙을 플러그인으로 로드해 시연합니다.

```ts
plugins: ['@company/arch-lens-rules'],
rules: {
  'sample/gateway-only-access': ['error', {
    restricted: ['^src/legacy/'],
    gateways: ['^src/gateway/'],
    waivers: [{ from: '^src/app/checkout\\.ts$', until: '2026-12-31', reason: 'migration' }],
  }],
},
```

플러그인 제작은 [`docs/plugin-guide.md`](./docs/plugin-guide.md)를 참고하세요. `createRule`/`definePlugin` 헬퍼가 제공되며, 샘플 플러그인은 `packages/plugins`에서 확인할 수 있습니다. `--plugin <path|@scope/pkg>` 또는 config의 `plugins` 배열로 로드합니다.

---

## CI 통합 · 점진 도입

### 기존 코드베이스에 도입 (baseline)

한 번에 모든 위반을 고치지 않고도 도입할 수 있습니다. 현재 위반을 baseline으로 기록하면, 이후 스캔은 **신규 위반만** 실패시킵니다(기록된 위반은 억제). rule+file 카운트 기반이라 라인 이동·메시지 변경에 강합니다.

```bash
arch-lens baseline                 # 현재 위반을 arch-lens-baseline.json에 기록
arch-lens scan --baseline          # 신규 위반만 실패 (기록된 위반은 억제)
```

### 변경분만 검사 (affected/incremental)

큰 모노레포에서 PR 피드백을 빠르게 받으려면 변경 파일과 그에 **전이적으로 의존하는** 파일의 위반만 검사합니다. 파싱은 mtime 캐시로 이미 증분입니다.

```bash
arch-lens scan --affected --since origin/main          # git 변경분 기준
arch-lens scan --affected --changed src/a.ts,src/b.ts  # 명시적 변경 파일
```

### GitHub Code Scanning (SARIF)

```bash
arch-lens scan --report sarif > arch-lens.sarif   # SARIF 2.1.0, github/codeql-action/upload-sarif로 업로드
```

### CODEOWNERS · 프로젝트 그래프

규칙은 컨텍스트에서 **코드 소유권**과 **프로젝트 단위 그래프**를 함께 질의할 수 있습니다.

- `context.owners` — CODEOWNERS(`ownersOf`/`hasOwner`, last-matching-wins)로 팀 경계 정책 표현
- `context.projectGraph` — config `projects`로 파일 그래프를 패키지 단위로 집계, 파일 그래프와 동일한 질의 API 제공

```ts
// arch.config.ts — 프로젝트 정의 예시
export default {
  projects: [
    { name: 'app', pattern: '^src/app/' },
    { name: 'legacy', pattern: '^src/legacy/' },
  ],
  rules: { /* ... */ },
};
```

---

## 예제 모노레포 체험하기

- `examples/monorepo-sample/scripts/run-arch-lens.sh`는 CLI와 샘플 플러그인을 한 번에 실행해 주는 스크립트입니다.
- 스크립트는 필요 시 CLI/플러그인을 빌드한 뒤 ① 표 형식 스캔과 ② `--fix` 스캔(JSON)을 실행합니다. 두 스캔 모두 `--allow-violations`로 실행되므로 위반이 있어도 스크립트는 정상 종료(exit 0)합니다.
- 데모용으로 여러 내장 규칙 위반(기능별 `index.ts` 누락 → `structure/required-feature-index`, 교차 기능 import, allow-list 위반 등)을 일부러 남겨두었으니, 위반 메시지가 출력되면 정상 동작입니다.
- `--fix`는 커밋된 예제를 건드리지 않도록 임시 디렉터리 복사본에서만 실행됩니다.

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

### 샘플 리포트(JSON) 만들기

CI와 동일한 JSON 리포트를 로컬에서도 보고 싶다면 아래 순서를 따르면 됩니다.

```bash
pnpm --filter @arch-lens/cli run build
node packages/cli/dist/index.js scan examples/monorepo-sample/src \
  --report json --allow-violations > reports/arch-lens-report.json
```

> Windows PowerShell에서는 `pnpm --filter @arch-lens/cli exec -- arch-lens ...`처럼 바로 실행하면 `arch-lens` 명령을 찾지 못할 수 있으니, 위와 같이 `node dist/index.js` 경로를 직접 실행하거나 `pnpm --filter @arch-lens/cli exec -- node dist/index.js ...` 형태로 실행해주세요.

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


