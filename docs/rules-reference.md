# Arch-Lens Rules Reference

Arch-Lens는 **Structure**와 **Dependency** 두 축으로 내장 규칙을 제공합니다. 규칙은 `arch.config.ts`의 `rules` 맵에서 id별로 심각도(`off`/`warn`/`error`)와 옵션을 지정해 활성화합니다. 저장소에 포함된 규칙 구성은 데모를 위한 기본값일 뿐, 각 팀은 이 문서를 참고해 자신만의 조합을 만들면 됩니다.

---

## 🎯 어떤 규칙을 고를까?

1. **필요한 규칙만 맵에 추가**: `rules` 맵에 넣은 id만 활성화되고, 넣지 않으면 비활성입니다. 잠깐 끄려면 `'id': 'off'`.
2. **심각도로 강도 조절**: CI를 실패시킬 규칙은 `'error'`, 안내만 할 규칙은 `'warn'`으로 둡니다(warning은 exit 0).
3. **옵션으로 팀에 맞추기**: 파일 경로·레이어 구성은 팀마다 다르므로 `['error', options]` 튜플로 각 규칙 동작을 조정합니다.
4. **플러그인 추가**: 내장 규칙으로 부족한 정책은 `arch-lens-plugin-kit`으로 직접 작성해 `plugins`+`rules`로 활성화합니다.

---

## 💡 사용 방법 요약

```ts
import type { ArchLensConfig } from 'arch-lens';

const config: ArchLensConfig = {
  include: ['src/**/*.{ts,tsx}'],
  exclude: ['**/dist/**', '**/__tests__/**'],
  rules: {
    // 심각도만: 'off' | 'warn' | 'error'
    'structure/required-files': 'error',
    'dependency/no-circular': 'error',
    // 옵션이 필요하면 [severity, options] 튜플
    'structure/filename-case': [
      'warn',
      { rules: [{ test: '^src/components/.+\\.tsx$', style: 'pascal-case' }] },
    ],
    'dependency/no-cross-layer': 'error',
  },
};

export default config;
```

> 규칙 id를 맵에 넣지 않으면 비활성 상태입니다. 배열 형식(`rules: [ruleInstance, ...]`)도 하위호환으로 지원합니다.

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
  dependencyGraph: RuleDependencyGraph; // 원시 Map; 아래 graph 사용 권장
  graph: ArchitectureGraph;             // dependenciesOf/dependentsOf/isReachable/shortestPath/SCC
  projectGraph: ArchitectureGraph;      // config projects로 집계된 프로젝트 그래프
  owners: Ownership;                    // CODEOWNERS (ownersOf/hasOwner/entries)
  options?: unknown;                    // config의 [severity, options] 튜플로 전달된 옵션
  report?: (violations: RuleViolation | RuleViolation[]) => void;
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

- `graph`/`projectGraph`는 안정적인 질의 API(`isReachable`, `shortestPath`, `stronglyConnectedComponents` 등)를 제공합니다. 원시 `dependencyGraph` 대신 이걸 사용하세요.
- `owners`로 CODEOWNERS 소유권을, `options`로 config에서 전달된 규칙 옵션을 읽습니다.
- `report()`는 위반을 수집하며, 리포터는 스캔 종료 시 한 번만 출력합니다. 모든 규칙은 `Promise` 또는 동기 로직을 반환할 수 있습니다.

---

## 🔌 플러그인과의 연동

- 플러그인은 `arch-lens-plugin-kit`의 `definePlugin()`으로 규칙 묶음을 export하고, config의 `plugins` 배열(또는 CLI `--plugin`)에 등록합니다. bare 패키지 지정자(`@scope/rules`)도 지원합니다.
- 등록된 플러그인의 규칙은 내장 규칙과 동일하게 `rules` 맵에서 **id로 활성화**합니다.

```ts
const config: ArchLensConfig = {
  plugins: ['@your-scope/arch-rules'],
  rules: {
    'dependency/no-circular': 'error',
    '@your-scope/no-legacy-import': 'error',
  },
};
```

플러그인 제작 튜토리얼과 샘플 코드는 [`docs/plugin-guide.md`](./plugin-guide.md)에서 확인할 수 있습니다.

---

## 📚 추가 자료

- [`docs/architecture.md`](./architecture.md) – 그래프·ownership·baseline·캐싱 아키텍처
- [`docs/getting-started.md`](./getting-started.md) – 초기 세팅과 명령어 예시
- [`docs/plugin-guide.md`](./plugin-guide.md) – 플러그인 작성 및 배포 가이드
- [`docs/benchmarks.md`](./benchmarks.md) – 성능 벤치마크
