# Arch-Lens Plugin Guide

Arch-Lens는 내장 규칙 외에도, 팀 고유의 컨벤션을 플러그인으로 묶어 배포할 수 있도록 **플러그인 SDK**를 제공합니다. 즉, 저장소에 포함된 규칙 조합은 데모일 뿐이며, 각 팀은 이 가이드를 따라 자신만의 규칙을 만들고 `loadBuiltInRules()` 결과와 결합해 사용할 수 있습니다. 이 문서는 SDK 개념부터 샘플 코드, CLI 연결까지 한 번에 살펴볼 수 있는 튜토리얼입니다.

---

## 1. 플러그인 SDK 한눈에 보기

| 헬퍼 | 설명 |
| --- | --- |
| `createRule(rule)` | 타입 안전한 `PluginRule`을 생성합니다. 규칙 ID/메타/체크 로직을 작성하세요. |
| `definePlugin({ meta, rules })` | 여러 규칙을 하나의 플러그인으로 묶습니다. `meta`에는 이름/버전을 기입합니다. |
| `PluginRuleContext` | `root`, `files`, `fix`, `verbose`, `dependencyGraph`, `report()`에 접근할 수 있는 컨텍스트 객체 |
| `PluginRuleViolation` | `ruleId`, `message`, `file`, `line`, `column`, `suggestedFix` 등을 담아 Reporter로 전달 |

SDK 소스는 [`packages/plugins/src`](../packages/plugins/src)에서 확인할 수 있습니다.

---

## 2. 새 플러그인 작성 튜토리얼

### 2-1. 스캐폴드 생성

```bash
mkdir -p plugins/my-team
cd plugins/my-team
pnpm init -y
pnpm add @arch-lens/plugins
```

### 2-2. 규칙 작성 (`plugins/my-team/src/no-legacy-imports.ts`)

```ts
import { createRule } from '@arch-lens/plugins';

export const noLegacyImportsRule = createRule({
  id: 'lint/no-legacy-imports',
  meta: {
    description: 'legacy/ 디렉터리에서의 import를 금지합니다.',
    severity: 'error',
    type: 'dependency',
  },
  async check(context) {
    const violations = [];

    for (const file of context.files) {
      if (!file.endsWith('.ts')) continue;

      const source = await context.readFile?.(file); // 커스텀 readFile 헬퍼를 추가할 수도 있음
      if (!source) continue;

      if (source.includes("from 'legacy/")) {
        violations.push({
          ruleId: 'lint/no-legacy-imports',
          message: 'legacy 디렉터리에서는 import 할 수 없습니다.',
          file,
          fixable: false,
          suggestedFix: 'shared 모듈로 추출하거나 최신 API를 사용하세요.',
        });
      }
    }

    return violations;
  },
});
```

> **Tip**: 샘플 프로젝트처럼 `fs.readFile`을 사용하거나, 상황에 따라 AST 파서를 붙일 수도 있습니다.

### 2-3. 플러그인 묶기 (`plugins/my-team/src/index.ts`)

```ts
import { definePlugin } from '@arch-lens/plugins';
import { noLegacyImportsRule } from './no-legacy-imports';

export default definePlugin({
  meta: {
    name: 'my-team-arch-lens-plugin',
    version: '0.1.0',
    description: '우리 팀 컨벤션을 모아둔 Arch-Lens 플러그인',
  },
  rules: [noLegacyImportsRule],
});
```

### 2-4. 번들 빌드 (선택)

ESM/TS 프로젝트라면 `tsup`, `tsc`, `vite` 등을 사용해 `dist/index.js`로 번들하세요. 간단한 CommonJS 플러그인은 `package.json`에 `type: "commonjs"`를 지정하고 직접 배포할 수도 있습니다.

---

## 3. CLI에서 플러그인 사용하기

### 3-1. `--plugin` 옵션
dist 파일을 바로 넘기면 됩니다. 여러 플러그인은 콤마 또는 복수 옵션으로 전달할 수 있습니다.

```bash
pnpm --filter @arch-lens/cli exec arch-lens scan src \
  --plugin ./plugins/my-team/dist/index.js \
  --plugin ./plugins/frontend-guidelines/index.cjs
```

### 3-2. 설정 파일에 등록

```ts
import type { ArchLensConfig } from '@arch-lens/core';
import { loadBuiltInRules } from '@arch-lens/rules';
import myTeamPlugin from '../plugins/my-team/dist/index.js';

const config: ArchLensConfig = {
  // ...
  rules: [
    ...loadBuiltInRules(),
    ...myTeamPlugin.rules,
  ],
};

export default config;
```

> **주의:** 플러그인에서 규칙 ID가 중복되면 마지막에 로드된 규칙이 우선합니다. 팀 규칙이 내장 규칙을 덮어써야 한다면 동일 ID를 사용하고, `overrides` 옵션으로 빌트인을 제외하세요.

---

## 4. 샘플 플러그인 살펴보기

Arch-Lens 저장소에는 다음 샘플이 포함되어 있습니다.

| 파일 | 규칙 | 설명 |
| --- | --- | --- |
| `packages/plugins/src/sample/no-todo-comment.ts` | `lint/no-todo-comment` | TODO 주석 감지. `suggestedFix`를 Reporter에 노출 |
| `packages/plugins/src/sample/enforce-shared-imports.ts` | `lint/enforce-shared-imports` | shared 디렉터리 alias 강제 + auto-fix(파일 수정) |
| `packages/plugins/src/sample/no-default-export.ts` | `lint/no-default-export` | default export 금지, location 정보 제공 |

각 샘플은 `createRule + definePlugin` 패턴과 `context.report()` 활용법을 보여주며, 자신만의 플러그인을 만들 때 출발점으로 사용할 수 있습니다.

---

## 5. 배포 & 버전 관리 체크리스트

1. `package.json`에 `name`, `version`, `main`, `type`(esm/cjs), `files` 필드를 정의합니다.
2. `pnpm build` 또는 `tsc`로 배포 아티팩트를 생성합니다.
3. `CONTRIBUTING.md`에서 안내한 커밋 규칙에 따라 변경사항을 기록하고 `CHANGELOG.md`를 업데이트합니다.
4. 사내 레지스트리/오픈소스 레지스트리에 배포하고, 팀 문서에 설치 명령을 공유하세요.

---

## 6. 더 알아보기

- [`packages/plugins/src`](../packages/plugins/src) – SDK 및 샘플 구현
- [`docs/rules-reference.md`](./rules-reference.md) – 빌트인 규칙 옵션
- [`docs/architecture.md`](./architecture.md) – 전체 아키텍처, 플러그인 로딩 시퀀스
- [`CONTRIBUTING.md`](../CONTRIBUTING.md) – 플러그인/규칙 기여 시 따라야 할 절차

필요한 기능이나 개선 아이디어가 있다면 Issue를 통해 공유해주세요. Arch-Lens는 플러그인 생태계를 통해 더욱 강력한 팀 컨벤션 도구로 발전하고 있습니다.
