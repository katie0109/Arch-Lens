# Arch-Lens 빠른 시작 (Getting Started)

Arch-Lens는 **설정 파일 하나**로 팀의 구조/의존성 규칙을 검사하고 자동 수정하는 CLI입니다. 아래 단계를 따라 하면 5분 안에 규칙 파이프라인을 돌릴 수 있습니다.

---

## 1. 설치

```bash
pnpm add -D arch-lens-cli@beta
# npm 또는 yarn 환경이라면 동일 패키지를 devDependencies에 추가하세요.
```

저장소 전체를 체크아웃한 상태라면 `pnpm install`만으로 의존성이 준비됩니다.

---

## 2. 설정 파일 생성

```bash
pnpm exec arch-lens init --config arch.config.ts
```

- `arch.config.ts`가 **ESLint식 rules 맵** 형태로 생성됩니다(규칙 id에 `off`/`warn`/`error`).
- `--force` 옵션을 주면 기존 파일을 `.bak`로 백업한 뒤 덮어씁니다.

---

## 3. 스캔 & 자동 수정

```bash
# 규칙 검사
pnpm exec arch-lens scan

# auto-fix
pnpm exec arch-lens scan --fix

# report/metrics/watch 옵션
pnpm exec arch-lens scan --report json --pretty
pnpm exec arch-lens scan --report sarif > arch-lens.sarif
pnpm exec arch-lens scan --metrics ./metrics.json
pnpm exec arch-lens scan --watch
```

리포트 형식은 `table`·`list`·`json`·`html`·`markdown`·`sarif`(GitHub Code Scanning)를 지원합니다.

**종료 코드**: `0` 정상 · `1` **error** 심각도 위반 존재(`warning`만 있으면 통과) · `2` config/plugin/runtime 오류. `--allow-violations`를 주면 위반이 있어도 `0`으로 종료합니다. 구조 규칙은 누락 파일을 실제로 생성/이동하고, 의존성 규칙은 재구조화 가이드를 제공합니다.

---

## 4. 규칙 커스터마이즈

`arch.config.ts`의 `rules` 맵에서 규칙 id별로 심각도(`off`/`warn`/`error`)와 옵션(`[severity, options]`)을 지정합니다. `plugins` 배열로 npm/로컬 플러그인을 선언하면 그 규칙도 id로 활성화됩니다.

```ts
import type { ArchLensConfig } from 'arch-lens-cli';

const config: ArchLensConfig = {
  plugins: ['@your-scope/arch-rules'],
  rules: {
    'structure/required-files': 'error',
    'structure/no-loose-files': 'off',
    'dependency/no-cross-layer': ['error', { /* rule options */ }],
    '@your-scope/no-legacy-import': 'error',
  },
};

export default config;
```

> 배열 형식(`rules: [ruleInstance, ...]`)도 하위호환으로 지원합니다. 규칙 목록·옵션은 [`rules-reference.md`](./rules-reference.md)를 참고하세요.

플러그인 SDK와 튜토리얼은 [`docs/plugin-guide.md`](./plugin-guide.md)에서 확인하세요.

---

## 5. 샘플 프로젝트 실행

```bash
./examples/monorepo-sample/scripts/run-arch-lens.sh
```

- CLI 및 샘플 플러그인을 자동 빌드한 뒤, 표 스캔과 임시 복사본에 대한 `--fix` 스캔을 실행합니다(두 스캔 모두 `--allow-violations`).
- 여러 내장 규칙 위반을 일부러 남겨두었으니 위반 메시지가 출력되면 정상입니다.

`examples/ci-adoption`, `examples/gateway-only` 등 기능별 예제도 함께 참고하세요.

---

## 6. CI 파이프라인에 연결

```yaml
- name: Architecture guard
  run: pnpm exec arch-lens scan                  # error 위반이 있으면 실패(exit 1)

# 기존 코드베이스에 점진 도입: 신규 위반만 실패
- run: pnpm exec arch-lens scan --baseline

# PR에서 변경분만 검사 (변경 파일 + 전이 dependents)
- run: pnpm exec arch-lens scan --affected --since origin/main

# GitHub Code Scanning 업로드
- run: pnpm exec arch-lens scan --report sarif --allow-violations > arch-lens.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: arch-lens.sarif
```

CI에서 error 위반이 발견되면 작업이 실패하므로 PR 단계에서 아키텍처 규칙을 강제할 수 있습니다. 점진 도입(baseline)·증분 검사(`--affected`)·SARIF는 [메인 README의 "CI 통합·점진 도입"](../README.md#ci-통합--점진-도입)에 자세히 정리되어 있습니다.
