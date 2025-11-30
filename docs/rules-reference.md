# Arch-Lens Rules Reference

Arch-Lens는 **Structure**와 **Dependency** 두 축으로 내장 규칙을 제공합니다. 모든 규칙은 `arch.config.ts`에서 활성화/비활성화하거나 옵션을 커스터마이즈할 수 있으며, `loadBuiltInRules({ include, exclude, overrides })`를 통해 선택적으로 불러올 수 있습니다. 저장소에 포함된 규칙 구성은 데모를 위한 기본값일 뿐, 각 팀은 이 문서를 참고해 자신만의 조합을 만들면 됩니다.

---

## 🎯 어떤 규칙을 고를까?

1. **필요한 것만 include**: `include` 배열에 사용할 규칙 ID만 적어두면 나머지는 로드되지 않습니다.
2. **원치 않는 규칙은 exclude**: 데모용으로 켜 둔 규칙이라도 `exclude`에 넣으면 즉시 비활성화됩니다.
3. **overrides로 스타일 맞추기**: 파일 경로나 레이어 구성이 팀마다 다르므로, 각 규칙의 옵션을 override해서 템플릿·패턴을 바꿀 수 있습니다.
4. **플러그인 추가**: 내장 규칙으로 해결되지 않는 정책은 `@arch-lens/plugins`를 이용해 직접 작성합니다.

---

## 💡 사용 방법 요약

```ts
import { loadBuiltInRules } from '@arch-lens/rules';
import type { ArchLensConfig } from '@arch-lens/core';

const config: ArchLensConfig = {
  root: process.cwd(),
  include: ['src/**/*.{ts,tsx}'],
  exclude: ['**/dist/**', '**/__tests__/**'],
  rules: loadBuiltInRules({
    include: [
      'structure/required-files',
      'structure/filename-case',
      'dependency/no-cross-layer',
      'dependency/no-circular',
    ],
    overrides: {
      'structure/filename-case': {
        rules: [{ test: '^src/components/.+\\.tsx$', style: 'pascal-case' }],
      },
    },
  }),
};

export default config;
```

---

## 🧱 Structure Rules

### `structure/required-feature-index`
- **설명:** `src/features/<Feature>` 폴더가 `index.ts`를 반드시 포함하도록 강제합니다.
- **옵션:**
  - `featureDir` (기본값: `src/features`)
  - `template` (기본값: `export {};`)
- **Auto-fix:** 누락된 `index.ts`를 템플릿 내용으로 생성합니다.

### `structure/required-files`
- **설명:** 지정된 디렉터리 안에 필수 파일 세트가 있는지 검사합니다.
- **옵션:**
  - `root`: `arch.config.ts` 기준 루트를 재정의 (예: `apps/web`)
  - `targets[]`
    - `directory`: 상대 디렉터리 경로 (필수)
    - `files`: 필수 파일 목록 (필수)
    - `templates?`: 파일별 생성 템플릿 문자열
    - `owner?`: 담당자/팀 메모
- **Auto-fix:** 필요한 디렉터리 생성 후 템플릿 기반으로 파일 생성.

### `structure/filename-case`
- **설명:** 파일명이 지정한 케이스 규칙을 따르도록 강제합니다.
- **옵션:**
  - `rules[]`
    - `test`: 대상 파일을 선택할 정규식 문자열 (필수)
    - `style`: `kebab-case | pascal-case | camel-case | snake-case`
    - `includeExtension`: `true`면 확장자까지 케이스 적용
- **Auto-fix:** 대상 파일명을 규칙에 맞게 `rename` 처리.

### `structure/no-loose-files`
- **설명:** 특정 루트(`src/` 등)에 "떠 있는" 파일을 잡아내고 지정 폴더로 이동합니다.
- **옵션:**
  - `disallowIn`: 느슨한 파일을 허용하지 않을 상위 디렉터리 목록 (기본값: `['src']`)
  - `allowPatterns`: 예외 허용 파일 목록 (와일드카드 지원)
  - `relocationDir`: 위반 파일을 이동시킬 경로 (기본값: `src/shared/__loose__`)
  - `root`: 규칙 적용 루트 재정의
- **Auto-fix:** 대상 파일을 `relocationDir`로 이동하고, 실패 시 verbose 로그 출력.

---

## 🔗 Dependency Rules

### `dependency/no-cross-feature-import`
- **설명:** 서로 다른 feature 디렉터리 간 직접 import를 금지합니다.
- **옵션:**
  - `featuresRoot` (기본값: `src/features`)
  - `sharedDirs`: 공용 허용 디렉터리 목록 (예: `['src/shared', 'src/entities']`)
- **Auto-fix:** 제공하지 않음. Reporter를 통해 재구조화 안내.

### `dependency/no-cross-layer`
- **설명:** 레이어 간 허용된 방향으로만 의존성을 허용합니다.
- **옵션:**
  - `layers[]`
    - `name`: 레이어명 (예: `app`, `features`, `shared`)
    - `pattern`: 레이어를 식별할 정규식 문자열
    - `canImport`: 허용되는 타겟 레이어 배열 (미지정 시 자기 자신 제외 전체 허용)
- **Auto-fix:** 제공하지 않음. `context.report()`로 위반 목록을 전달.

### `dependency/no-circular`
- **설명:** TypeScript import 그래프에서 순환 의존성을 탐지합니다.
- **옵션:** 없음.
- **Auto-fix:** 제공하지 않음. 사이클 경로를 함께 출력하여 수동 조치 가이드 제공.

### `dependency/allow-list`
- **설명:** 정규식 기반 허용 리스트(allow-list)로 import를 화이트리스트 방식으로 제한합니다.
- **옵션:**
  - `entries[]`
    - `from`: 소스 파일 매칭 정규식 (캡처 그룹 지원)
    - `allow`: 허용 타겟 정규식 배열. `$1` 같은 캡처 그룹 치환 가능
- **Auto-fix:** 제공하지 않음. 위반 항목을 모아 reporter로 전달.

---

## 🧩 Rule 인터페이스 & 컨텍스트

```ts
export interface RuleContext {
  root: string;
  files: string[];
  fix: boolean;
  verbose: boolean;
  dependencyGraph: RuleDependencyGraph;
  report?: (violations: RuleViolation[]) => void;
}

export interface RuleViolation {
  ruleId: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  fixable?: boolean;
  suggestedFix?: string;
  data?: Record<string, unknown>;
}
```

- `dependencyGraph`는 `Map<string, RuleImportReference[]>` 형태이며, TypeScript AST 분석 결과가 담깁니다.
- `report()`는 `fix()` 단계에서 사용자/CI에게 추가 정보를 전달할 때 사용합니다.
- 모든 규칙은 `Promise` 또는 동기 로직을 반환할 수 있습니다.

---

## 🔌 플러그인과의 연동

- `loadBuiltInRules()`는 `include`, `exclude`, `overrides` 옵션을 받아 규칙을 선택적으로 로드합니다.
- 플러그인을 사용하려면 `@arch-lens/plugins`의 `definePlugin()`을 통해 규칙 묶음을 export하고, CLI의 `--plugin` 옵션이나 `arch.config.ts`의 `plugins` 필드에 등록하세요.

```ts
import myTeamPlugin from './plugins/my-team-plugin.js';

const config: ArchLensConfig = {
  // ...
  rules: [
    ...loadBuiltInRules(),
    ...myTeamPlugin.rules,
  ],
};
```

플러그인 제작 튜토리얼과 샘플 코드는 [`docs/plugin-guide.md`](./plugin-guide.md)에서 확인할 수 있습니다.

---

## 📚 추가 자료

- [`docs/architecture.md`](./architecture.md) – 의존성 그래프 캐시, 오케스트레이션 흐름
- [`docs/getting-started.md`](./getting-started.md) – 초기 세팅과 명령어 예시
- [`docs/plugin-guide.md`](./plugin-guide.md) – 플러그인 작성 및 배포 가이드
