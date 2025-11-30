# Changelog

## [2025-11-22]

### Added
- Arch-Lens 프로젝트 개요를 정리하고 "룰 패키지 + 플러그인" 모듈 설계를 확정.
- 핵심 구성 요소 문서화: `packages/core`, `packages/rules`, `packages/plugins`, `packages/cli`, `examples/**`, `docs/**`.

### Changed
- 없음.

### Fixed
- 없음.

---

## [2025-11-23]

### Added
- CLI, Core, Rules, Registry, Docs 등 주요 이슈와 원인(A~E)을 분석한 조사 노트.

### Changed
- CLI 명령 집중, Core 책임 혼합, 규칙/Auto-fix 부족, Registry 미정비, 문서·배포 파이프라인 부재를 공식 문제 목록으로 관리.

### Fixed
- 없음 (원인 규명 단계).

---

## [2025-11-24]

### Added
- CLI 명령 구조화/옵션 확장과 Core 엔진 모듈화 & 캐싱 계획을 상세 설계로 기록.

### Changed
- `packages/cli/src/commands/scan.ts`, `init.ts`, `utils/` 분리 및 `--config`, `--report`, `--plugin`, `--pretty`, `--fix`, `--verbose` 옵션 정의.
- Core 레이어를 `config/fs/parser/reporter/orchestrator`로 분리하고 `DependencyGraphCache`, `suggestedFix`, multi-report 포맷을 설계 반영.

### Fixed
- 없음 (설계 반영 단계).

---

## [2025-11-25]

### Added
- 구조/의존성 규칙 확장안(`required-files`, `filename-case`, `no-loose-files`, `no-cross-layer`, `no-circular`, `allow-list`)과 Auto-fix 스켈레톤 구현.
- Rule Registry 재설계(Map 기반 `loadBuiltInRules`), Vitest + memfs 테스트 스위트, 플러그인 SDK/배포 절차 초안.

### Changed
- 구조 룰은 파일 생성/이동을 수행하고, 의존성 룰은 `report()`로 재구조화 가이드를 제공하도록 실행 흐름 갱신.
- 규칙 테스트가 `packages/rules/test/*.spec.ts`에 정리되고 `@arch-lens/plugins` SDK가 `createRule`/`definePlugin`/`types`로 분리.
- `scripts/release.sh`, 패키지 exports/files, CI 파이프라인 항목(build/lint/typecheck/test/coverage/scan/아티팩트) 정의.

### Fixed
- 룰 배열 기반 관리로 인한 include/exclude 한계를 해소하고 Auto-fix 스켈레톤 미비 문제 해결.

---

## [2025-11-26]

### Added
- 검증 절차(옵션별 CLI 실행, 룰 테스트, 플러그인 로딩, 문서/CI 검증) 체크리스트를 작성.
- 기본 데모 명령 세트와 CI 재사용 전략, 설계 선택/근거, 문제 해결 스토리라인(6단계)을 문서화.

### Changed
- `.github/workflows/ci.yml`가 `pnpm build/lint/typecheck/coverage`와 `arch-lens scan`을 재사용하도록 설계 문서를 업데이트.

### Fixed
- 검증·데모 흐름이 문서에 흩어져 있던 문제를 해소해 온보딩 자료가 일관되게 정리됨.

---

## [2025-11-27]

### Added
- 모든 예제(`circular-deps`, `layer-violation`, `monorepo-sample`, `plugin-demo`)에 대한 PowerShell/Node 재현 절차 문서화.

### Changed
- 예제 `arch.config.ts`의 `root`를 `process.cwd()` → `__dirname`으로 통일하고 README 명령을 `scan src --config examples/<name>/arch.config.ts` 패턴으로 정리.

### Fixed
- 예제 규칙 패턴(`^src/` 등)이 프로젝트 루트 기준으로 오동작하던 문제.

---

## [2025-11-28]

### Added
- `examples/filename-case` (PascalCase 강제)와 관련 README/스크립트.
- `bad-button.tsx` → `BadButton.tsx` 위반 사례로 `structure/filename-case` 검증.

### Changed
- 없음 (신규 예제 추가 중심).

### Fixed
- 파일명 규칙 검증용 재현 시나리오 부재 문제.

---

## [2025-11-29]

### Added
- `examples/allow-list` (Cart → Admin import 위반)와 PowerShell/Linux 실행 스크립트.

### Changed
- `docs/architecture.md`, `plugin-guide.md`, `rules-reference.md`, `getting-started.md`  수정

### Fixed
- 허용 리스트 규칙을 시연할 공식 예제가 없던 문제.

---

## [2025-11-30]

### Added
- PowerShell 기준 회귀 명령 모음(모든 예제 + 옵션 조합) 기록.

### Changed
- 없음.

### Fixed
- 없음

