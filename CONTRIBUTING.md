# Contributing to Arch-Lens

---

## 1. 개발 환경 준비

1. 저장소를 포크하고 로컬에 클론합니다.
2. pnpm을 설치한 뒤 워크스페이스 의존성을 내려받습니다.
   ```bash
   pnpm install
   ```
3. 변경 사항 전 `pnpm lint`, `pnpm typecheck`, `pnpm test`가 모두 성공하는지 확인하세요.

---

## 2. 브랜치 & 커밋 규칙

- **브랜치 네이밍**: `feature/<topic>`, `fix/<topic>`, `docs/<topic>` 등 목적이 드러나게 작성합니다.
- **커밋 규칙**: [Conventional Commits](https://www.conventionalcommits.org/ko/v1.0.0/)을 따릅니다.
  - 예: `feat(rules): add structure/no-loose-files rule`
  - 예: `fix(cli): normalize --plugin argument parsing`
- 여러 변경을 한 커밋에 몰아 넣기보다는, 기능/수정 단위로 세분화하고 충분한 설명을 작성합니다.

---

## 3. Pull Request 체크리스트

- [ ] PR 제목은 `type(scope): description` 형식을 따릅니다.
- [ ] 관련된 Issue 번호가 있다면 `Fixes #123` 형태로 본문에 링크합니다.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`를 로컬에서 실행하고 결과를 첨부합니다.
- [ ] 새로운 규칙/플러그인을 추가했다면 필수 문서를 업데이트합니다.
  - `docs/rules-reference.md`
  - `docs/plugin-guide.md`
  - 필요 시 README/Architecture 문서
- [ ] Auto-fix 로직을 추가했다면 side-effect에 대한 테스트 또는 수동 검증 결과를 남겨 주세요.
- [ ] Reporter 출력에 영향을 주는 변경은 스크린샷 또는 로그 캡처를 첨부하면 리뷰가 빠릅니다.

---

## 4. 테스트 & 커버리지

- 유닛 테스트: `pnpm test` (Vitest 기반)
- 린트: `pnpm lint`
- 타입 검사: `pnpm typecheck`
- 필요한 경우 특정 패키지만 테스트하려면 `pnpm --filter @arch-lens/rules test` 같은 workspace 필터를 사용하세요.
- 규칙 관련 테스트는 `packages/rules/test` 폴더에 저장하며, `memfs` 또는 샘플 그래프를 활용해 재현성을 확보합니다.

---

## 5. 릴리즈 프로세스

1. 모든 변경은 `CHANGELOG.md`에 기록합니다. (임시로 수동 관리, 향후 [Changesets](https://github.com/changesets/changesets) 도입 예정)
2. 버전 업이 필요한 경우 `package.json`의 버전을 업데이트하고 관련 패키지를 동기화합니다.
3. 태그는 `v<major>.<minor>.<patch>` 형식으로 작성합니다. 예: `v0.2.0`
4. 릴리즈 시 GitHub Releases에 주요 변경 사항을 요약하고, CLI/규칙/플러그인에 영향이 있다면 업그레이드 가이드를 함께 제공합니다.

---

## 6. 코드 스타일

- 프로젝트는 ESM 기반 TypeScript를 사용합니다. `tsconfig.base.json`을 참고하세요.
- eslint/prettier 설정은 루트에 존재하며, `pnpm lint --fix`로 자동 포맷을 적용할 수 있습니다.
- Node 18 이상에서 동작하도록 작성해 주세요.

---

## 7. 문서 기여

- 새로운 기능을 추가했다면 `docs/` 하위 문서를 갱신하거나 새 문서를 추가하세요.
- README에는 **주요 기능**, **명령어**, **규칙 요약**, **아키텍처 흐름** 등 핵심 정보가 포함되어야 합니다.
- 예제 코드/스크린샷/다이어그램 등의 에셋은 `docs/assets`(필요 시 생성)에 저장합니다.

---

