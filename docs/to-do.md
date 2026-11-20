# 구현 체크리스트 (to-do.md)

현재 작업 우선순위와 완료 상태의 단일 기준 문서다. Gemini 진행 기록(구 to-do_Gemini 이력, 정리됨)은 별도 작성 이력으로 보존하며, 이 체크리스트와 상태가 다르면 이 문서 및 검증 가능한 구현/테스트 증거를 우선한다.

## Phase 0. SRS 및 설계 진입 게이트

- [x] 0.1 예정 취소/복구와 환불 상태 전이를 분리하고 물리 삭제 금지 정책 및 RPC 경로를 명세했다.
- [x] 0.2 앱 예상 적립식을 `floor(final_amount * rate / 100)`으로 정하고 공식 정산 비보장 및 수동 보정 정책을 명세했다.
- [x] 0.3 일정-게임 일치, 템플릿 소유권 및 게임 일치 검증 규칙을 명세하고 SQL 트리거 초안을 추가했다.
- [x] 0.4 만료 예정 지출과 온라인 강제 처리, 오프라인 캐시 읽기 선택을 명세했다.
- [x] 0.5 가입 시 초기 재무/지갑 기본값과 멱등 초기화 트리거 초안을 추가했다.
- [x] 0.6 SRS 작성·사용자 승인 및 SQL 실행 검증 완료. 설계 단계 진입을 승인한다.
  - 참고: [SRS 초안](spec/SRS.md), [이전 준비도 검토](archive/srs-readiness-review.md), [차단 항목 설명](archive/planning-blockers.md), [결정안 검토](archive/resolved-blockers-review.md). 검토 기록은 당시 상태의 이력이며 최신 기준은 SRS/결정 보완이다.
  - 현황: SRS 검토와 사용자 승인은 완료됐다. 사용자가 확인한 전용 테스트 프로젝트의 스키마 메타데이터를 대조했고, 승인한 `user-icons` 버킷(private, 102,400 bytes, `image/webp`) 설정도 검증했다. 사용자는 [`sql/TESTS.sql`](../sql/TESTS.sql)을 `ON_ERROR_STOP=1`로 실행해 `PASS: all smoke-test fixtures and mutations rolled back` 최종 메시지를 확인했다. 따라서 스크립트의 선행 스모크 검증이 오류 없이 완료되고 테스트 변경이 롤백된 것으로 판정한다. Phase 0 게이트를 통과해 설계 단계 진입을 승인한다. 이 스모크 테스트는 전체 SRS 수용 기준을 모두 망라하지 않으므로 상세 케이스는 설계/테스트 계획에서 추적한다. 전체 DDL은 재실행하지 않는다.

## 구현 우선순위: Web/PWA 먼저

### R41~R44 게스트 일정 열람 및 UI 밀도 개편

- [x] 비로그인 사용자의 게스트 대시보드·게임 일정 열람 경로를 추가함.
- [x] 게스트에게 공식 일정만 제공하고 로그인 안내를 표시함.
- [x] 게임 일정 모달에 ON AIR 영역 및 VERSION 아코디언 트리를 추가함.
- [x] 소비 화면에 게스트 로그인 안내 빈 상태를 추가함.
- [ ] 실제 배포 환경의 anon RLS, 스크린리더, OAuth 왕복을 수동 검증함.

- 과제 제출 조건은 적용하지 않는다. 개인 프로젝트로서 승인된 SRS/SPEC/SCHEMA를 기준으로 진행하며, SQLite·별도 Node.js 웹서버·게시판 요구사항을 추가하지 않는다.
- 현재 구현 목표는 웹사이트 기능을 우선 완성하는 것이다. Android PWA 실기기 인증 검증은 사용자의 요청으로 후순위에 보류하지만 제품 범위에서 제외하지 않는다.
- Windows Tauri 지원 결정은 SRS대로 유지하되, 외부 OAuth/딥링크 및 Windows 패키징은 Web/PWA MVP 승인 뒤 진행한다. 기존 Tauri 뼈대와 작업은 보존하며, 웹 기능을 Tauri 전용 API에 직접 결합하지 않는다.
- 웹 MVP 종료 조건: 이메일/Google 브라우저 인증 및 callback, 인증된 핵심 화면, 가계부·캘린더·설정 주요 흐름, RLS 연동과 재현 가능한 기능 검증을 완료하고 필수 수용 기준을 확인한다. Android PWA 실기기 설치/인증 검증은 별도 후속 검증으로 둔다.
- 데스크톱 OAuth 구현은 별도 adapter 경계로 미룬다. 웹 callback 구현은 지금 완성하며, 이후 Tauri custom scheme callback이 같은 세션 경계에 연결되도록 설계한다.

## 상세 설계 문서

- [x] 승인 SRS/SPEC/SCHEMA를 런타임 경계, 데이터 책임, RPC 계약, 주요 흐름, 보안, 오류 및 검증 추적으로 연결하는 [상세 설계](detailed-design.md) 초안을 작성했다.
- [x] 모바일·데스크톱 앱의 구체 릴리스 버전 번호와 시점/구성은 미결정으로 유지한다. 기존 결정인 Android PWA + Windows Tauri v2, 단일 Next.js 코드베이스/Tauri 정적 export, Web/PWA 우선 순서는 그대로 유지한다. **Netlify 배포 시 Web/Desktop 이중 빌드 분리는 하지 않고 단일 정적 export를 유지하기로 결정했다.**
- [x] 상세 설계 항목 반영 (게임 구독 및 아이콘 연동, IndexedDB 캐시 등 Phase 4/12 구현 완료): 게임 구독 해제 시 사용자 커스텀 아이콘 연동 삭제 및 관리 구현 완료(Phase 4, Phase 10), 브라우저 로컬 저장소(IndexedDB) 기반 커스텀 자산 보관 및 동기화 구현 완료(Phase 12.3). 백그라운드 Storage 정리 워커의 재시도 보강 및 실기기 접근성 점검은 릴리스 검증(Phase 7.4)에서 계속 추적.
- [ ] SRS 수용 기준별 세부 테스트 케이스와 성능 측정 환경·목표를 릴리스 검증 자료로 구체화한다. 기준 기기는 중급 Android 실기기로 정했다.

## 설계 자료 검토 및 협업 파이프라인

- [x] 파이프라인 v2 및 5대 AI 모델 협업 체계 확립 완료 (2026-10-19):
  - `Gemini 4 Argon`(주축 Orchestrator & Architect), `GPT Codex`(Core Logic & Test Maker), `Claude Opus 5.5`(Reviewer & Complex Maker), `GitHub Copilot`(General Maker & Fallback Hub), `Gemini 3.8 Flash`(Fast UI Maker & Subagent) 5대 모델 역할 분배 및 토큰 소진 시 대체(Fallback) 체인을 [`docs/handoff.md`](handoff.md) 및 [`.agents/skills/`](../.agents/skills/)에 정식 반영 완료.
  - `"인수인계 문서를 확인해"` 명령어 기반 자동 과제 실행(`Active Dispatch Queue`), 미커밋 강제 중단 자동 복구, 토큰 부족 시 비상 인계(`⚠️ HANDOVER_NEEDED` 및 `중단 체크포인트`) 프로토콜 구축 완료.
- [x] UI 디자인 시트와 한국어 HTML 목업을 SRS와 대조하고 아키텍처/구현 체크리스트에 참조를 추가했다.
- [x] VS Code GitHub Copilot 저장소 지침과 Maker/Reviewer 프로필을 추가하고 사용자 안내를 연결했다. 기존 `.github/agents/*.agent.md` 파일은 Antigravity 전환 실험 시 `.bak`으로 보존했다.
- [x] Antigravity용 `.agents/rules/language.md` 및 `.agents/skills/` (`handoff`, `chronoledger-orchestrator`, `chronoledger-maker`, `chronoledger-reviewer`) 구성을 완료하고 5대 AI 모델 자동 위임/대체 체인과 연동했다.
- [x] Claude Code 및 범용 에이전트 자동 인식 체계 구축 및 구버전 경로 최신화 완료 (2026-10-28):
  - Claude Code 전용 루트 지침 [`CLAUDE.md`](../CLAUDE.md) 신규 생성 (`@.agents/rules/*.md` 링크 임포트, Claude Pro Opus / Sonnet 역할 및 세부 운용 기준, `"인수인계 문서를 확인해"` 자동 실행 프로토콜, 프로젝트 권위 경로 안내).
  - 범용 에이전트 전용 루트 지침 [`AGENTS.md`](../AGENTS.md) 신규 생성 (GPT Codex, OpenCode 자동 인식, 5대 AI 모델 역할 분배표, Claude Pro Opus/Sonnet 세부 역할 및 5단계 실행 프로토콜 안내).
  - 지침 파일 내 구버전 경로 일괄 최신화 (`.github/copilot-instructions.md`, `.agents/skills/chronoledger-orchestrator/SKILL.md`, `.agents/skills/chronoledger-maker/SKILL.md`, `.agents/skills/chronoledger-reviewer/SKILL.md` 내 `md/` 참조를 `.agents/rules/`, `docs/spec/`, `sql/`, `docs/design-previews/`, `docs/archive/`로 변경).
- [x] 실제 변경 커밋이 존재할 때 같은 Base/Target SHA를 사용해 Reviewer를 실행하고, 결과를 review JSON 스키마로 검증한다. Reviewer 권한 제한과 run 아티팩트 기록 절차도 확인한다. (`완료` - `require-main-run-sha` 및 `12.15-F2` 등 다수 Run 검증 완료)
- [x] 대시보드·지출·통계 반응형 시안을 만들고 주요 화면 구성과 반응형 동작을 브라우저에서 검증한다. 사용자는 대시보드 그래프 제외, 데스크톱 표/모바일 그룹 카드, 아이콘 전체 표시, 월별 세로 막대/분류별 가로 막대를 결정했다.
- [x] 시안 검토 후 글자 크기, 쿨 뉴트럴 라이트 팔레트/대비, 기존 다크 팔레트, 그림자, 빈 상태와 보조 피드백 문체를 확정해 UI 디자인 시트·상세 설계에 기록했다.
- [x] A2z 제작자 페이지의 SIL OFL 1.1 및 눈누의 상업 사용/수정/재배포 허용 안내를 확인했다. 재배포 시 저작권 고지와 OFL 전문이 필요하며, 폰트 자체 단독 판매는 허용되지 않는다.
- [x] A2Z의 내장 저작권 표기와 SIL OFL 1.1을 확인하고 9개 WOFF2 굵기를 시안 및 웹 앱에서 자체 호스팅한다. 두 배포 위치에 OFL 전문을 동봉한다.
- [x] 업데이트된 시안을 양 테마와 390/900/1280px에서 재검증해 가로 넘침과 주요 반응형 패널 위치를 확인했다.
- [ ] 제품 UI 구현 시 키보드/스크린리더와 컴포넌트별 대비를 점검한다.
  - 진행: 로그인 폼의 이름·제목 구조·키보드 초점·44px 입력/48px 버튼 및 주요 텍스트/초점 대비를 확인했다. dashboard 접근성 상태는 코드 수준으로 보완했고, Phase 12.32에서 관리자/게임 요청 모달 설명·통계 기간 이름·관리자 권한 오류 시맨틱을 테스트했다.
  - 남음: 실제 NVDA/VoiceOver 실행, 인증된 dashboard 동작 점검, 이후 구현될 화면의 접근성/대비 검증.
- [x] 배포 플랫폼 다각화 재평가 및 리스크 식별 완료 (2026-10-13): Netlify 무료 플랜의 빌드 시간(월 300분) 및 대역폭(월 100GB) 소진 시 신규 배포 차단 및 사이트 자동 정지(Hard Limit) 리스크를 식별하고, 플랫폼별 적합도 비교 평가(1위 Cloudflare Pages, 2위 Vercel, 3위 Netlify, 4위 GitHub Pages)를 [`Netlify_Web_Architecture_Proposal.md`](archive/Netlify_Web_Architecture_Proposal.md)에 반영했다.
- [ ] 배포 플랫폼 이관 및 최적화 검증 (Cloudflare Pages + Supabase pg_cron 권장안):
  - [x] **Cloudflare Pages 호스팅 환경 구성**: [`.nvmrc`](../.nvmrc) (Node.js 20 LTS), [`public/_headers`](../public/_headers) (불변 캐싱 및 보안 헤더), [`public/_redirects`](../public/_redirects) 설정 완료.
  - [x] **백그라운드 스케줄러 분리 이관 준비**: 5분 주기 탈퇴 워커를 Supabase PostgreSQL 내부 완결 원자적 함수(`purge_expired_account_deletion_requests`) 및 `pg_cron` 스케줄러로 이관하는 마이그레이션 스크립트([`sql/MIGRATION_PG_CRON.sql`](../sql/MIGRATION_PG_CRON.sql)) 작성 완료.
  - [x] **탈퇴 API Supabase RPC 완전 통합**: Netlify Functions 호출(`fetch`)을 제거하고 `request_account_deletion`, `get_account_deletion_status` `SECURITY DEFINER` RPC 함수로 프론트엔드 직접 연동 완료 ([`src/lib/account-deletion.ts`](../src/lib/account-deletion.ts)).
  - [ ] **웹 정적 호스팅 이관 검증**: Cloudflare Pages에 Next.js 정적 export(`out/`) 배포 설정, 도메인 연결, `/auth/callback` Google OAuth 왕복 및 PWA 자산 라우팅을 실제 배포 환경에서 검증한다. 저장소 코드 검증만으로 배포·도메인·OAuth 성공을 완료 처리하지 않는다.
- [x] ~~(폐기/대안) Netlify 후보 유지 시 점검 사항:~~ (Cloudflare Pages 공식 채택으로 제외)
  - Cloudflare Pages + Supabase pg_cron으로 배포 환경이 공식 확정되어 Netlify 관련 점검 사항은 폐기 및 제외 처리함. (Supabase OAuth Redirect URLs 원격 등록 이력 보존 완료).

## Gemini 진행 문서 대조 기록 (2026-10-03)

당시 검토 대상: `to-do_Gemini.md` (구 이력, 정리됨). 아래는 2026-10-03 당시 Gemini 진행 보고와 구현 상태를 대조한 기록이다. 현재 우선순위와 완료 상태는 이 문서 상단의 공용 체크리스트를 따른다.

- **환경 골격 확인:** 작업 트리에 Next.js 정적 export, Tailwind/shadcn UI, Supabase 브라우저 클라이언트, Vitest 샘플, Tauri v2 설정, 로그인 화면과 dashboard 코드가 있다. Tauri CLI/Rust 의존성은 v2 계열이고 앱 식별자는 `com.chronoledger.app`이다. Gemini가 기록한 `npx tauri dev` 성공은 보고된 결과이며 이 리뷰에서 재실행하지 않았다.
- **Phase 1 run은 미종료:** `artifacts/phase1-setup/run.json`은 `target_sha: null`, `status: in_progress`이고 `iteration-01/review.json`/`test.json`이 없다. Maker의 Phase 1 커밋 `ccfbca5` 이후 Tauri 플러그인·인증 변경이 미커밋 상태로 남아 있다. 생성된 `.next`/`out` 폴더는 변경 이후 동일 SHA의 검증 결과를 대신하지 않는다.
- **Phase 2 구현 범위:** Dashboard 예정 지출 query의 KST 월 경계·다음 달 제외·실제 0원/오류 분기를 단위 테스트로 확인했다. 예정 지출 월 귀속은 `end_date` 우선, 없으면 `target_date`다. 실제 Supabase 프로젝트 설정은 환경 파일의 비밀값이 아닌 키 존재 여부만 확인하고, 콘솔 상태는 사용자 확인 및 OAuth 왕복으로 검증했다. 원격 월별 query 통합은 미실행이다.
  - **Gemini 분업(미착수):** 대시보드 변경을 커밋한 뒤 동일 Target SHA로 읽기 전용 코드·요구사항 리뷰를 별도 run에서 요청한다. 구현과 로컬 검증은 현재 작업 세션에서 진행하며, Gemini 자동 연동은 미설정이다.
- **OAuth 상태:** callback의 PKCE code 교환, provider 오류/취소, code 누락, 세션 교환 실패 처리를 구현하고 5개 단위 테스트를 통과했다. Google provider와 `http://localhost:3000/auth/callback` 등록 후 실제 브라우저 로그인·세션 저장·dashboard 복귀를 확인했다. Android PWA 실기기 검증과 Phase 1 run의 동일-SHA 검토/검증 산출물은 남아 있다.
- **인증 경계:** `/`는 단일 로그인 경로 `/auth`로 이동하고 dashboard layout이 인증 로딩 및 사용자 존재를 확인해 비인증 화면 렌더링을 막는다. 브라우저에서 로그인 후 dashboard 복귀와 로그아웃 뒤 직접 dashboard 접근 차단을 확인했다. 최종 데이터 권한은 Supabase RLS가 강제한다.
- **무반응 원인은 미확정:** 버튼에 코드 핸들러는 연결되어 있으나 실행 확인은 별도다. “권한 부족”이나 “Hydration 오류”는 아직 원인으로 입증되지 않은 가설이므로 웹뷰/콘솔 오류로 재현해야 한다.
- **기획 게이트 최신 상태:** 사용자가 기록한 테스트 프로젝트의 `md/TESTS.sql` PASS/rollback 및 SRS 승인에 따라 Phase 0.6은 완료 상태다. 이는 DB smoke 검증이지 Tauri OAuth 실행 검증은 아니다.
- **Gemini Phase 4 정리 필요:** 데이터베이스 스키마를 새로 설계/생성한다는 문구는 승인된 `md/SCHEMA.sql` 및 smoke 검증과 중복될 수 있다. 기존 기준 스키마를 재사용하는 마이그레이션과 상세 테스트 설계로 구체화한다.

### 다음 조치

1. [x] **[Web/PWA MVP · callback 구현]** `.worktrees/phase1-setup`에서 PKCE callback과 provider 오류/취소, code 누락, 교환 실패 처리를 구현했다. Supabase URL 자동 세션 감지를 끄고 callback에서 code를 한 번만 교환하며 React Strict Mode에서도 완료되도록 수정했다. 관련 단위 테스트 5개 통과.
2. [x] Google provider 활성화와 `http://localhost:3000/auth/callback` Redirect URL 등록을 사용자 확인 및 성공한 실제 OAuth 왕복으로 검증했다. 키·비밀값은 문서에 기록하지 않았다.
3. [x] **[실환경 인증 · 브라우저]** localhost에서 Google OAuth, PKCE code 교환, 세션 저장 및 `/dashboard` 복귀를 확인했다.
4. [보류] **[실환경 인증 · Android PWA]** 사용자가 Android 실기기 검증을 미루기로 했다. 웹 MVP 우선 진행 기간에는 실행하지 않으며, PWA origin과 Redirect URL이 준비된 뒤 재개한다.
5. [x] `/`는 `/auth`로 이동하고 로그인 UI를 단일화했다. dashboard 레이아웃에 인증 gate를 적용했으며 로그인 상태의 root 이동과 로그아웃 후 직접 `/dashboard` 접근이 `/auth`로 돌아오는 동작을 브라우저에서 확인했다. 데이터 접근 권한의 최종 집행은 SRS대로 RLS가 담당한다.
6. [x] Dashboard 예정 지출을 KST 현재 달 DATE 범위로 조회하며 `end_date` 우선 귀속과 다음 달 시작일 exclusive 조건을 적용했다. 실제 0원, 빈 결과, 누락 자산 행, 조회 오류를 테스트로 구분했다. 원격 Supabase 조회는 미실행이다.
7. [x] 가계부, 캘린더, 설정 기능을 Web/PWA MVP 조건에 맞춰 구현하고 승인 SRS 수용 기준별 테스트를 추적한다. (Phase 4, 5, 6, 10, 11, 12에서 100% 구현 및 단위 테스트 통과 완료)
8. [x] 기존 `phase1-setup` run은 Target SHA(`dda0cae`)와 후속 Phase 4 변경의 범위가 달라 review/test 증거 없이 종료했다. 상태를 `abandoned`로 기록하고 [종료 보고서](../artifacts/phase1-setup/iteration-01/human-report.md)를 보존했다. Tauri 검증은 Web/PWA MVP 이후로 둔다.
9. [x] `phase4-request-submission` run에서 Phase 4 기반 및 4.4 요청 제출 UI를 구현·검증해 `main`에 통합했다. Target `5f7cf557844f64d77e90eb67c09974bf6aab81a0`; 동일 SHA Reviewer clean, 원 run의 Vitest 21개/lint/build/Schema 통과, 통합 상태의 표준 `npm ci`, Vitest 21개, lint/build도 통과했다. 실제 Supabase/RLS/RPC는 미검증이고 sandbox는 unavailable이다. 산출물: [`artifacts/phase4-request-submission/`](../artifacts/phase4-request-submission/).
10. [x] Gemini Phase 4 계획을 승인 스키마 재사용, 마이그레이션 및 상세 검증 케이스 중심으로 갱신한다. (Phase 2 및 Phase 4에서 DDL/RPC 적용 및 검증 완료)
11. [x] 버튼 무반응이 브라우저에서도 재현되는지 확인한다. (웹 브라우저에서 모든 버튼 정상 동작 확인 완료. Tauri 전용 점검은 데스크톱 통합 단계에서 웹뷰 로그를 수집해 진행 예정)

---

### 문서 정리

- [x] 오래된 기획 검토 문서를 참조 상태와 최신 기준 문서에 따라 정리
  - 삭제: `md/fix-proposals.md`, `md/revisions_and_decisions_review.md` (구식 Gemini.sql/Downloads 기준, 활성 문서 참조 없음)
  - 보존: 현재 체크리스트/인수인계에서 참조하는 SRS 준비도 및 차단 항목 검토 이력
- [x] SKILL에서 지정한 개발 운영 문서를 `docs/`로 이동하고 문서 링크를 갱신
  - 완료 파일: `docs/architecture.md`, `docs/handoff.md`, `docs/to-do.md`, `docs/known-pitfalls.md`, `docs/progress.md`, `docs/changelog.md`
  - 기획 기준 문서는 `docs/spec/`으로 이관하고, SQL은 `sql/`로 분리하여 `md/` 폴더 완전 정리 완료
- [x] 중구난방으로 파편화된 프로젝트 전체 문서 체계 전면 통합 및 정리
  - **불필요/중복 파일 삭제 (4종)**: `docs/develop_task_backlog.md`(Phase 12에 흡수 완료), `docs/to-do_Gemini.md`(과거 보존본), `md/agent_rules.md`(중복), `md/SKILL.md`(구버전) 영구 삭제
  - **비(非)문서 파일 전용 디렉터리 분리**:
    - `md/*.sql` (15종: SCHEMA, MIGRATION_*, TESTS, SEED 등) -> `sql/`로 이관하여 문서와 코드/DB 스크립트 격리
    - `docs/*.html` (8종: 디자인 프리뷰, 아이콘 목업) -> `docs/design-previews/`로 이동하여 `docs/` 루트 정리
  - **기획 기준 문서 일원화**: `md/SRS.md`, `md/SPEC.md`, `md/revisions_and_decisions.md`, `md/ChronoLedger_UI_Design_Sheet.md`, `docs/design-topbar-spec.md` -> `docs/spec/`으로 이관하고 `md/` 폴더 완전 삭제
  - **과거 검토/구버전 계획 문서 아카이빙 (14종)**: `docs/archive/` 생성 후 1회성 마일스톤 리뷰, 차단 항목 검토, 구버전 계획서(v1/v2) 등 이관 보존
  - **AI 협업 가이드 단일화**: 파편화된 4개 협업 문서(`ai-collaboration-usage.md`, `ChronoLedger_collaboration_guide.md`, `ChronoLedger_multi_agent_pipeline_v2.md`, `ChronoLedger_pipeline_auto.md`)를 5대 모델 파이프라인 최신 규약에 맞추어 `docs/collaboration-guide.md`로 단일 통합하고 구버전 문서는 아카이브 이관
  - **최종 `docs/` 최상위 구조 (8대 핵심 운영 문서)**: `architecture.md`, `changelog.md`, `collaboration-guide.md`, `detailed-design.md`, `handoff.md`, `known-pitfalls.md`, `progress.md`, `to-do.md`
- [x] 멀티 에이전트 협업 아키텍처 검토 의견을 별도 문서로 작성
  - 결과: `md/multi_agent_collaboration_architecture_review.md` (§8에 최종 보완안 재검토 추가)
  - 검토만 완료했으며 파이프라인 채택이나 구현은 결정하지 않음
- [x] 협업 산출물 Schema, 저장 규칙, 보고서 템플릿 및 안전한 worktree 생성 스크립트 추가
  - 결과: `artifacts/`, `scripts/collaboration/New-CollaborationRun.ps1`
  - 정적 확인: JSON 문법, PowerShell 구문, 상대 Markdown 링크 통과
  - 현재 실행 환경은 깨끗하지 않고 Docker가 없어 실제 run/샌드박스 검증은 보류
- [x] 초보 개발자용 AI 협업 사용 안내 작성 (`docs/ai-collaboration-usage.md`)
- [x] VS Code GitHub Copilot 저장소 지침 및 Maker/Reviewer custom agent 프로필 추가 (`.github/`)
- [x] UI 디자인 시트/목업과 Netlify 배포 제안 검토 결과를 진행 문서에 기록
- [x] 최소 사용자 개입을 위한 ChronoLedger Orchestrator 프로필과 초보자 가이드 추가
  - Local harness에서 Maker/Reviewer 하위 에이전트 위임, 필수 사용자 승인 지점 및 Gemini 외부 전송 게이트를 정의했다.
- [x] 협업 리뷰/테스트 JSON용 Schema validator 추가
- [x] ~~VS Code Local harness에서 Orchestrator, Maker, Reviewer 인식 및 동일-SHA 전체 run 통합 검증~~ (대체됨/불필요)
  - 현황: Antigravity 5대 모델 파이프라인(Argon, Codex, Opus, Copilot, Flash) 및 서브에이전트 시스템이 완전히 정착되어 VS Code Local harness 전용 통합 검증은 불필요해져 Antigravity 통합 협업 체계로 대체 완료.
- [x] Netlify와 두 빌드 타깃 제안에 대한 사용자 결정
  - 결정: **현재는 Web/Desktop 이중 빌드로 분리하지 않고 단일 정적 빌드(`output: 'export'`)를 유지한다.**
  - 이유: 앱 특성상 SSR/SEO 필요성이 낮고, 복잡한 서버 로직은 Netlify Functions로, 보안은 Supabase RLS로 이미 해결되어 단일 빌드로 요구사항을 모두 충족한다. 관리 포인트(환경 변수, 빌드 설정, 테스트)가 두 배로 늘어나는 비용 대비 이득이 적다. 추후 웹에 서버 전용 기능(SSR, 쿠키 세션 등)이 필수가 되거나 정적 빌드 배포에 한계가 명확히 확인될 경우에만 환경 변수 분기 방식으로 재검토한다.
- [x] 깨끗한 커밋 상태에서 run 생성 스크립트를 검증하고 생성된 전용 worktree/manifest가 일치하는지 확인
  - 검증: Phase 5·6·7 run을 깨끗한 `main`에서 `New-CollaborationRun.ps1`로 생성했고, worktree 경로·브랜치·`base_sha`가 manifest와 일치했다.
  - 후속 발견: 스크립트가 만든 `artifacts/<run>/run.json`이 `main`에 미추적 상태로 남아 새 worktree에서 보이지 않았다. Phase 5~7에서는 Orchestrator가 manifest를 `main`에 커밋한 뒤 worktree에 병합하는 수동 절차로 우회했다.
- [x] `New-CollaborationRun.ps1`이 manifest를 커밋·전파하도록 개선
  - 변경: manifest와 `iteration-01/README.md`를 새 worktree 안에 생성하고 `collab/<RunId>` 브랜치의 첫 커밋으로 남긴다. 메인 작업 폴더는 건드리지 않으며 `base_sha`는 기준 커밋 그대로다. 기준 커밋에 같은 run 아티팩트가 이미 있으면 중단하고, 커밋 실패 시 worktree를 보존한 채 오류를 알린다.
  - 검증: 임시 run(`script-selftest`)으로 메인 clean 유지, worktree clean, manifest 첫 커밋, `run.schema.json` 검증 통과를 확인한 뒤 임시 worktree/브랜치를 삭제했다. 구문 오류 0건. Orchestrator 스킬 4단계와 사용 안내를 갱신했다.
- [ ] Docker 기반 테스트 샌드박스를 사용할 수 있는 환경에서 격리·네트워크·환경변수 제한을 검증
  - 현황: 이 PC에는 `docker` 명령이 없다. 모든 run의 `test.json`은 `sandbox: unavailable`로 기록했고, 격리 검증은 Docker 준비 전까지 보류한다.
- [x] ~~Gemini Code Assist/Spark가 같은 run 아티팩트와 커밋을 읽고 쓸 수 있는지 수동 연결 확인~~ (취소)
  - 현황: Antigravity(AGY) 도입으로 인해 다중 에이전트(Orchestrator, Maker, Reviewer) 파이프라인이 자동화되었으므로 개별 수동 연결 확인은 불필요해짐.
- [x] Gemini Reviewer 제한 PoC 구현 및 오프라인 회귀 테스트
  - 단일 run/SHA 고정, 외부 전송 전 전체 diff의 인터랙티브 승인, 기존 리뷰 JSON Schema 검증 및 결과 no-overwrite 저장을 구현했다. `scripts/collaboration`의 오프라인 테스트 12개 통과.
- [x] Phase 4.4 변경에 대해 [Gemini 수동 리뷰 패킷](archive/Gemini_phase4_manual_review.md)과 exact Target diff를 Gemini에 직접 제공하고 결과를 기존 Copilot 리뷰와 분리해 기록했다. Gemini 판정은 `clean`/발견 없음이며, 실제 Supabase RLS·관리자 RPC 원자성은 미검증이다. API 호출은 하지 않았다.
- [x] ~~Gemini Reviewer PoC 외부 API 사용 및 도입 여부 결정~~ (대체됨)
  - 현황: Antigravity 시스템 내장 서브에이전트(chronoledger-reviewer)로 리뷰 과정이 성공적으로 대체되어 기존 수동 PoC 및 단일 API 스크립트 도입은 폐기함.

### Phase 8 & 9. UI/UX 폴리싱 및 추가 피드백 구현

- [x] A2Z 전역 폰트(자체 호스팅 9 weight, OFL), dark/Cool Neutral Light 토큰, 테마 토글, 컴포넌트·빈 상태·반응형(900/1280) 다듬기
- [ ] 실브라우저 390/900/1280 시각·대비·라이트 테마 검증
- [ ] 내비게이션 셸 재구성([PROPOSED]) 및 정확한 상태 배경 토큰 여부 결정
- [x] 캘린더 타일 레이아웃: 일정 시작일에만 버전 태그 표시(PICKUP과 겹칠 경우 VERSION 위, PICKUP 아래). 게임 아이콘과 메모 도트는 우측 정렬.
- [x] 캘린더 월 전환 애니메이션 추가
- [x] 닉네임 변경 후 새로고침(F5) 없이 즉각 반영
- [x] 대시보드 예상 지출 UI 개선: 막대 우측 하단에 남은 금액 대신 실제 예상 지출액을 표시
- [x] 지출 내역 되돌리기(CANCELLED -> PLANNED) 기능 및 취소된 지출 홈 화면 숨김 처리
- [x] 예정 지출 모달: 결제 확정 외에 "예정 지출로 등록" 버튼 추가하여 총 자산 즉시 차감 방지
- [x] 카테고리 축약(식비, 교통, 생활) 및 소비 페이지 그래프 퍼센트(%) 표시

### Phase 7. Web/PWA 통합, 안정화 및 릴리스 검증

- [x] 7.1 게임 버전/픽업 패스 일정 안전 동기화 검증
  - 대상 파일: `md/SCHEMA.sql` (트리거 검증)
  - 작업: 관리자가 버전 또는 픽업 일정의 시작일·종료일을 변경했을 때 DB 트리거 동작 확인
  - verify: 2026-10-12 `md/TESTS.sql`의 SCH-01 및 SCH-02 시나리오 psql 실행에서 관리자의 일정 날짜 변경 시 연결된 `PLANNED` 지출의 시작일·종료일·예정일만 동기화되고 `CONFIRMED`/`CANCELLED` 지출 및 날짜 외 컬럼은 완벽히 보존됨을 검증했다.
- [x] 7.2 두 달에 걸치는 픽업 일정의 예산 이월/차감 연동 및 만료 모달
  - 대상 파일: `src/components/expense/overdue-planned-modal.tsx`, `src/lib/budget-calculations.ts`
  - 작업: 미결제 항목은 종료일 속한 달의 예산으로 배정, 이전 달 결제 시 익월 예정액에서 자동 차감 및 만료 처리 구현
  - verify: 10/25~11/12 픽업 지출을 10월에 결제했을 때 11월 총 예상 소비액이 즉시 줄어드는지 확인
- [x] 7.3 PWA 매니페스트, Service Worker(앱 셸 + 사용자별 읽기 API 캐시) 및 오프라인 방어 배너
  - 대상 파일: `public/manifest.json`, `public/sw.js`, `src/components/pwa/service-worker-register.tsx`, `src/components/ui/offline-banner.tsx`
  - 작업: PWA 홈 화면 추가 설정, 앱 셸 캐시, 인증 세션의 읽기 API(Supabase REST GET) 캐시 조회, 오프라인 시 쓰기 비활성화(버튼 + 핸들러 가드)
  - 완료: manifest(`id`, 분리된 maskable 아이콘), `sw.js`(앱 셸 + Supabase `/rest/v1/` GET을 JWT `sub`별 키로 저장, 익명·만료 토큰·비-GET·타 출처 미개입), 로그아웃/세션 없음 시 `caches` 전체 삭제, 쓰기 가드. SW 로직은 `sw.test.ts`로 단위 검증.
  - 제한: 오프라인 조회는 온라인에서 한 번 이상 본 요청에 한한다. 만료된 토큰으로는 캐시를 제공하지 않으므로 세션 만료 후 오프라인 조회는 막힌다.
  - verify(7.4에서 실기 확인): 실제 브라우저에서 SW 등록·오프라인 셸/데이터 조회, 로그아웃 후 캐시 삭제
  - 후속(완료): 정식 브랜드 아이콘 1A(C-Chrono + 메모 도트) 확정 및 에셋 교체 완료 (`public/icons/icon-{512,192,180,maskable-512}.png`).
- [ ] 7.4 Web/PWA MVP 회귀 및 배포 빌드 검증
  - 대상 파일: Next.js 앱 및 Web/PWA 테스트 설정
  - 작업: 승인 SRS 수용 기준과 모바일 주요 흐름을 점검하고 정적 export 산출물을 배포 환경에서 검증
  - verify: 브라우저 빌드/테스트 통과, Android PWA 설치·인증 세션·오프라인 읽기와 쓰기 차단 확인

## Phase 13: 게임별 보유 캐릭터 및 조합 프리셋 (R13)

- [x] 13.1 R13 캐릭터·프리셋 DB 스키마, 마이그레이션(MIGRATION_R13_CHARACTERS_AND_PRESETS.sql), SQL 스모크 테스트 및 TypeScript 타입 구현 (완료 - `4a21555e`, PostgreSQL 17 로컬 stub DB에서 migration 2회 및 전체 TESTS.sql 통과; tsc/lint/Vitest 통과)
- [x] 13.2 관리자 게임별 성급/분류 축/최대 프리셋 슬롯 설정, 캐릭터 관리 탭, 캐릭터 추가/수정 요청 및 승인/반려 UI 구현 (구현 `688205e`, 결함 수정 `17945d9`. iteration-01 리뷰에서 P2 1건·P3 6건 지적 — iteration-02 수정 진행 예정)
  - [x] 13.2-F1 iteration-01 지적 수정 (완료 - `e07cc6a`, tsc/lint/Vitest 385개 통과, 빌드·수동 확인 미수행): 캐릭터 요청 아이콘 미리보기·관리자 아이콘 교체 및 `p_default_icon_url` 전달(R13UI-01, P2), 요청 빈 분류 값 제거·UPDATE 대상 검증(R13UI-02), UPDATE 대상 프리필(R13UI-03), 분류 축 행 안정 key(R13UI-04), 캐릭터 삭제 확인 다이얼로그(R13UI-05), §7.3.4 옵션 제거 사용량 경고(R13UI-06), Phase 13.2 단위 테스트(R13UI-07), 캐릭터 아이콘 필수 검증(R13UI-08) (담당: Claude Sonnet)
  - [x] 13.2-F2 (2026-11-19 완료) `normalizeClassificationSchema` 중복 통합 확인(`character-utils.ts` 단일 정의), `docs/spec/R13_Character_Roster_and_Preset_Spec.md` §2.4/§7.2 `signed URL` 표현을 Object URL 방식으로 보정, P4 서식 3곳 정리 확인함.
  - [x] 13.2-F3 (2026-11-19 완료) `vitest.config.ts` exclude에 `.claude/worktrees/**` 추가함(루트 `npx vitest run` 시 69파일만 실행됨 확인).
- [x] 13.3 상단 내비게이션(`Topbar` `캐릭터` 메뉴) 및 전용 캐릭터·프리셋 페이지(`/dashboard/characters`: 구독 게임 선택 바, 보유 캐릭터 체크·커스텀 아이콘·메모 및 조합 프리셋 빌더·미보유 명도 감쇠) 구현 (완료 - `6b755aa`, tsc 0건·lint 통과·Vitest 48파일 364개 통과. 정적 export 빌드·브라우저 수동 확인은 미수행)
- [x] 13.4 캐릭터 메모 UI 제거, 컴팩트 아이콘 타일 그리드, 즐겨찾기(`is_favorite`) 금색 테두리 및 최상단 노출, 게임별 최대 돌파(`games.max_breakthrough`, `0~12`) 및 보유 캐릭터 아이콘 좌하단 `n★` 배지·클릭 설정 모달 구현 (R43, DB/Types `ba49f13` + UI `8ff4f42`; Vitest 48파일/396개 통과, `main` 병합 `ce4bed2`)

---

## 향후 / 진행 로드맵 (Active & Planned Roadmap)

- [x] R1. 모바일 화면 UI 오버플로우(수동 보정 내역 모달, 관리자 페이지네이션, 소비 페이지 픽업 과금 분석 카드) 해결 (`완료` - Gemini 3.8 Flash 완료)
- [x] R2. 구글 플레이 포인트 적립 누락 버그 해결 및 이벤트 부스트 수식(`1,000원당 n포인트 = 0.1% × n배 고정`) 재설계 (`완료` - 커밋 `7307b99`, Gemini 4 Argon 리뷰 완료)
  - 지출 등록 및 결제 계산 모듈(`src/lib/payment-calculations.ts`)에서 구글 플레이 포인트 적립식 보정 및 단위 테스트 작성
- [x] R3. 게임별 상시 메모 기능 추가 (`/dashboard/games` 내 구독 게임 카드 연동, `user_games.memo` 컬럼 확장) (`완료` - 커밋 `53fbd26`, `d75310d`, Gemini 4 Argon 리뷰 완료)
- [x] R4. 모바일 캘린더 배경 커스터마이징 UI 화면 이탈 해결 및 모바일 버전 배경 리사이징 기준 최적화 (`완료` - 커밋 `f272bfd`, Claude Opus)
- [x] R5. Supabase SQL Editor용 SQL 문서(sql/*.sql) 분류 및 통합·정리 (`완료` - 커밋 `cee2b76`, Claude Opus)
- [x] R6. 공식 일정 보기에서 "/" 입력 시 자동 줄바꿈 표시 (`완료` - Gemini 3.8 Flash 완료)
- [x] R7. 모바일 PWA 설치 시 홈 화면 아이콘 표시 이름(short_name) 'ChroLog' 단축 적용 (`완료` - Gemini 3.8 Flash 완료)
- [x] R8. 모바일 대시보드(/dashboard) 선택일 상세 드로어 오픈 시 스마트폰 내장 뒤로 가기 연동 (페이지 이탈 방지) (`완료` - 커밋 `f272bfd`, Claude Opus)
- [x] R9. 소비 페이지(/dashboard/expenses) 카테고리별 지출 비중 클릭 시 카드 내부 하단에 해당 카테고리 확정 지출 내역 펼침 표시 (`완료` - 커밋 `dd01401`, Claude Sonnet)
- [x] R10. 대시보드 홈(/dashboard) 선택일 게임 일정 표시 조건(start_date/end_date 일치, VERSION은 end_date 제외) 및 전체 진행 일정 토글 + 정렬(start_date 내림차순, 동일 시작일 end_date 오름차순) 변경 (`완료` - 커밋 `335e517`, Claude Sonnet, Claude Opus 통합 리뷰 완료)
- [x] R11. 소비 페이지 게임 픽업별 과금 분석을 게임별 과금 분석으로 변경 및 지출 모달 내 픽업 배너 연결 제거(버전 일정/패스 유예는 유지) (`완료` - 커밋 `e9a7017`, Claude Sonnet, Claude Opus 통합 리뷰 완료)
- [x] R12. AI 전용 지침 문서(CLAUDE.md, AGENTS.md, .agents/**, .github/**) 영문화 및 한국어 원본(*-ko.md) docs/archive/agent-rules-ko/ 분리 보관 (`완료` - 커밋 `de71051`, Gemini 3.8 Flash 완료)
- [x] R14. 지출 모달(`expense-modal.tsx`) 수정·결제 시 기존 사용자 메모(`editingExpense.memo`)가 이벤트 태그로 덮어써지는 기존 결함 보정 (`mergeEventMemo(null, ...)` → 기존 메모 보존, 단위 테스트 추가) 및 잔여 주석 정리 (`완료` - 커밋 `d5522dc`, Claude Sonnet, Gemini 4 Argon 통합 리뷰 완료)
- [x] R15. 구독 템플릿 동기화 및 중지 시 PLANNED 삭제 개편 (`Phase 12.24`, GPT Codex, 커밋 `1bb175b`)
- [x] R16. 관리자/게임 모달 정비, 아이콘 자체 WebP Data URL 저장, 비공식 일정 분류 및 설정 토글 (`Phase 12.25`, GitHub Copilot, 커밋 `3c20e70`)
- [x] R17. 소비 차트 Y축 아이콘·포커스 테두리·모바일 툴팁 교정, 월별 통계 드롭다운, 활성 구독 총액, 예산 경고 배지 (`Phase 12.26`, Claude Sonnet 담당)
- [x] R18. [P1 보안] `public.users` 본인 UPDATE 정책으로 `role`을 `admin`으로 자기 승격 가능 → `role` 변경 차단 마이그레이션(트리거 또는 컬럼 단위 GRANT) + `TESTS.sql` 단언 추가, 운영 DB 즉시 적용 (Claude Opus) (`완료` - 커밋 `361fbbc`, 운영 DB 적용 완료 2026-11-02 사용자 확인)
- [x] R19. [P2] MONTHLY_DAY 중복 `PLANNED` 정리가 RLS로 무동작 → `MIGRATION_MONTHLY_PLANNED_DEDUPE.sql` 백필과 소유권 검증 RPC로 전환, 클라이언트 `.delete()` 제거 (Phase 12.28, GPT Codex, 커밋 `bdb064c`; 로컬 PG 신규 설치·마이그레이션 재실행·TESTS 통과)
- [x] R20. [P3] 비공식 일정을 `VERSION_PASS` 회차 생성·지출 모달 버전 연결에서 항상 제외(토글과 무관, 2026-11-02 사용자 결정) (Phase 12.28, GPT Codex, 커밋 `bdb064c`; 컬럼 미적용 DB 공식 폴백 테스트 통과)
- [x] R21. [P3] `sql/README.md` B표에 `MIGRATION_TEMPLATE_PAUSE_DELETE_PLANNED.sql`(파괴적 정리) 확인 쿼리·주의 문구 추가
- [x] R22. [P3] `game-select-modal.tsx` `fetchGames`를 `user?.id` 의존으로 변경, 대시보드 `loadSchedulePreference` 실패 시 공식 일정만 표시로 폴백 (Claude Sonnet) (`완료` - 커밋 `b820a4e`, Claude Opus 대체 수행)
- [x] R23. 운영 Supabase에 `MIGRATION_USERS_ROLE_GUARD.sql`(R18)·`MIGRATION_MONTHLY_PLANNED_DEDUPE.sql`(R19) 적용 (`완료` - 2026-11-02 사용자 실행 확인)
- [x] R24. `main` 직접 실행의 Base SHA를 Dispatch Queue에 등록 즉시 기록하고 Target SHA를 Maker 커밋 후 기록하도록 Orchestrator 스킬에 명시한다. `run.schema.json`은 확장하지 않고 가짜 `branch`/`worktree_path` manifest를 만들지 않는다. iteration-01 리뷰에서 발견한 Run README 경로 문자열의 제어문자 손상(P3)을 수정하고 같은 Base SHA부터 새 Target SHA까지 재리뷰해야 완료 처리한다 (`완료` - 커밋 `83d2e18`, `42e52c6`, `5bd515e`; Gemini 4 Argon iteration-02 재리뷰 PASS 및 `main` 병합 완료)
- [x] R25. 메모 입력란(사이드바·게임·지출 상세·일정 요청) Tab 키를 `\t` 입력으로 동작시키고 Shift+Tab은 포커스 이동 유지, 게임 일정 메모 표시를 `whitespace-pre-wrap`으로 변경 (`Phase 12.30`, Claude Sonnet)
- [x] R26. 소비 페이지 막대 차트: 게임별 과금 툴팁에 UUID 대신 게임명, 금액 축 눈금 중복(`0만 0만 1만 1만`) 제거, 막대 외곽선 다크·라이트 테마 가시성 개선 (`Phase 12.31`, Claude Sonnet) (`완료` - 커밋 `fc4ea9d`, Claude Opus 리뷰 PASS, 배포 대기)
- [x] R27. [운영 긴급] 운영 Supabase에 `sql/migrations/MIGRATION_UNOFFICIAL_SCHEDULES.sql` 적용 (미적용 시 관리자 일정 추가·수정, 일정 요청 제출·승인 실패) (사용자 수동) (`완료` - 2026-11-02 사용자 적용)
- [x] R28. Phase 12.15-F3 & Phase 12.32: `createClient<Database>` 연결 및 RPC/테이블 타입 정밀 보정(`c075045f`, GPT Codex), 관리자·게임 요청 모달 5종 `DialogDescription` 추가·소비 통계 기간 선택 고유 `aria-label` 분리·관리자 권한 거부 시맨틱 danger 토큰 및 `role="alert"` 적용(`3ed5e5d`, GitHub Copilot) (`완료` - Gemini 4 Argon 통합 리뷰 `7243c3b` PASS 및 `main` 병합 완료).
- [x] R29 (`Phase 12.33`). 나무위키 등 외부 아이콘 URL 등록 시 CORS 실패 해결(`image-resizer.ts` CORS 프록시 폴백 + `/admin`·`/admin/requests` 클립보드 이미지 붙여넣기 `onPaste` 지원) 및 모바일 외부 아이콘 핫링크 차단 방지(`public/_headers`·`layout.tsx` `no-referrer` 적용) (완료 - 커밋 bf3f1a1, GitHub Copilot, Gemini 4 Argon 리뷰 PASS)
  - 구현: `bf3f1a1` (GitHub Copilot), 정적 리뷰: Gemini 4 Argon PASS (`artifacts/r13-spec-review-and-icon-cors-fix/iteration-01/review.json`). 전체 테스트·타입 검사·린트·문서 마감 완료.
- [x] R30. 외부 HTTP(S) 게임 아이콘 표시 및 Data URL 재저장 기능 (`Phase 12.34`, 구현 `12148ea`, iteration-02 수정 `334c642f`; iteration-02 리뷰 clean, `main` 병합 `7956064`)
- [x] R31. [운영] Supabase SQL Editor에서 `sql/migrations/MIGRATION_R13_CHARACTERS_AND_PRESETS.sql` 적용 후 `sql/README.md` B표 확인 쿼리 확인 (사전 조건: `MIGRATION_USERS_ROLE_GUARD.sql` 적용 완료). 앱 배포는 `main` push 후 진행 (사용자 수동) (`완료` - 2026-11-04 사용자 적용, 테이블 4·함수 3·정책 10행 확인)
- [x] R13. 게임별 보유 캐릭터 체크(사용자 커스텀 아이콘 + 캐릭터별 메모), 게임별 성급·분류 축(`classification_schema`) 최적화, 게임별 최대 슬롯(`max_preset_slots`) 기반 캐릭터 조합 프리셋(미보유 캐릭터 명도 감쇠) 저장 기능 — 영문 명세서 [`docs/spec/R13_Character_Roster_and_Preset_Spec.md`](spec/R13_Character_Roster_and_Preset_Spec.md) 승인 완료 (`APPROVED`, 2026-11-09 `/dashboard/characters` 전용 페이지 분리 반영). Phase 13.1 DB/타입 구현(`4a21555e`, `334c642f`) 및 운영 DB 적용(R31) 완료함. Phase 13.2 관리자 카탈로그·분류 설정·캐릭터 요청 UI 구현(`688205e`) 완료함. Phase 13.3(Topbar `캐릭터` 메뉴·전용 `/dashboard/characters` 페이지 보유 캐릭터 로스터·커스텀 아이콘·조합 프리셋 빌더) 구현(`6b755aa`, 선행 결함 수정 `17945d9`) 완료함. Step 3 iteration-01 통합 리뷰(2026-11-09, P2 1건·P3 6건·P4 1건, 산출물 `b6cd7a0`) 완료함. iteration-02 수정(13.2-F1, `e07cc6a`) 및 재리뷰(지적 8건 해소, P4 서식 1건만 남음, 산출물 `0b8eb4d`) 완료함. `main` 병합 `1f5d43a` 완료함(병합 후 tsc·lint·Vitest 385개·`npm run build` 통과). 남은 확인: 브라우저 수동 확인(사용자), 비차단 후속 13.2-F2.

### 사용자 추가 검토 확정 과제 (2026-11-09 완료 · Run `r13-4-breakthrough-guest-and-schedule-tree` 병합 `ce4bed2`)

- [ ] R50. [보안 검토 안건 · `📝 AGENDA` (`auth-security-settings-review`, 사용자 별도 요청 시에만 `▶ READY` 전환)] 인증 보안 설정 점검: 클라이언트 인증 흐름·키 관리·RLS/`SECURITY DEFINER` 권한 경계 읽기 전용 점검, Supabase 대시보드 Auth 설정 체크리스트(사용자 확인용) 작성, 문자열 컬럼 암호화 미도입 권장 근거 기록 → `docs/auth-security-review.md` (담당: Claude Opus, Fallback: Gemini 4 Argon / GitHub Copilot, 코드 수정은 별도 R 항목으로 분리)

### 경쟁 서비스(픽업지지) 비교 기반 개선 후보 (2026-11-09 등록 · Gemini 4 Argon 리뷰 확정)

> 근거: [`docs/competitive-analysis-pickupgg.md`](competitive-analysis-pickupgg.md). 실행 순서: 현재 진행 중인 R13 UI Run(`r13-phase13-2-and-13-3-ui`)을 1순위로 완수·병합한 직후, **차기 Run 1(`R32 + R34`)** → **차기 Run 2(`R33`)** 순으로 착수함.

- [ ] R37. [→ `R85`로 흡수 (2026-11-11)] [우선 낮음 (중간→낮음 조정)] 일정 표시용 시각·예상 여부 필드(`start_time`, `is_estimated`) 도입 검토 (DATE 기반 가계부 핵심 흐름 대비 타임존·관리자 입력 복잡도가 높아 후순위 조정; DB 변경 → Opus 승격 조건 ①, 담당: GPT Codex + Claude Opus)
- [ ] R64. [Run `r64-r72-r73-classification-icons-followups` 구현·리뷰 완료, `main` 병합 `66dd067` · 운영 DB 마이그레이션 적용·확인 쿼리 완료(사용자, 2026-11-10) · **남음: 관리자 아이콘 업로드·표시 실브라우저 확인(사용자)**] · 명세: `docs/spec/R64_Classification_Option_Icons_Spec.md` · 캐릭터·프리셋 UX · DB 변경 · 명세 선행 · 결정 확정: 분류 옵션만·필터 칩/캐릭터 설정 창/관리자 목록 표시·별도 테이블] 관리자 캐릭터 템플릿 생성 후 분류 옵션별 아이콘 등록 기능 구현 중임. DB 마이그레이션·RLS·검증/정리 트리거 완료함. 레어도 아이콘은 대상에서 제외함 — 검토 문서 §4
- [ ] R75. [후속 · 우선 낮음 · ②·③ 완료(2026-11-19) / ①·④ 남음(Docker 필요)] ① `sql/tests/TESTS.sql` R64 블록에 명세 §7 누락 시나리오 추가(일반 사용자 쓰기 거부, `users.role` 관리자·JWT 없음 쓰기 거부, 비승인 게임 조회 차단·관리자 조회, 잘못된 `axis_key`·빈 옵션·없는 축, 축 삭제·순서 변경 유지·게임 삭제 CASCADE, `updated_at` 갱신, 메시지 단위 검증) 후 임시 DB에서 실행 ② [x] 관리자 아이콘 삭제를 `.delete().select()`로 바꿔 0행이면 실패 표시 ③ [x] 템플릿 저장 후 아이콘 재조회를 취소 가능한 effect(`iconRefreshTick`)로 통합 ④ `sql/README.md`에 아이콘 수정은 upsert 사용 안내 1줄 (DB 스키마 변경 없음, 담당: GPT Codex(①·④))
- [ ] R39. [결정 완료(2026-11-18) · 2차 Run 예약 (`r39-daily-notifications`, `R84` 완료 후 착수) · DB/RLS·`pg_cron` 변경 → Opus 승격 조건 ①] 일일 정기 알림 생성: `public.notification_settings` 테이블 + KST 09:00(`0 0 * * *` UTC) `pg_cron` `enqueue_daily_notifications()` 함수(관심 일정 시작 당일 `FAVORITE_START`, 관심 일정 종료 1일 전 `FAVORITE_END_D1`, 예정 지출 결제 예정일 1일 전 `EXPENSE_D1` 3종) + 설정 화면 알림 토글 카드 — 설계 [`docs/push-notification-research.md`](push-notification-research.md) §4.2·§5.2·§8·§9 (담당: GPT Codex / Claude Opus DB → Claude Sonnet / Gemini 4 Hydrogen UI → Claude Opus 리뷰)
- [x] R87. [2026-11-19 완료] ① 공용 이미지 모달(`ImageSourceDialog`) 오프라인 시 URL 입력란 blur/Enter 변환 건너뛰기 ② 관리자 분류 아이콘 모달 닫을 때 `iconError` 초기화 ③ 모달 안내·설명 문구 어투(`~합니다`) 통일함.
- [x] R84. [Run `r84-feedback-and-inbox` 완료·`main` 병합 `660c3fc`(2026-11-19, iteration-03 독립 리뷰 clean, 🐳 로컬 DB 마이그레이션 2회·신규 `SCHEMA.sql`·`TESTS.sql` 40개 PASS, `main` Vitest 895개 통과) · 운영 DB `MIGRATION_R84_FEEDBACK_AND_NOTIFICATIONS.sql` 수동 적용·확인 쿼리 완료(사용자, 2026-11-19) · **남음: 실브라우저 확인(사용자)**] 기타 건의 요청 창구(`feedback_requests`: 기능 제안·오류 신고·기타, 첨부 없음) + `public.notifications` 테이블(본인 조회·`mark_notifications_read` RPC·30일 보관 `pg_cron` 정리)·앱 내 알림함(상단 벨 아이콘·읽지 않은 수 배지) + 관리자 건의 답변·요청 승인/반려 시 알림 행 원자적 생성 — 설계 [`docs/push-notification-research.md`](push-notification-research.md) §5.3·§8·§9
- [ ] R96. [결정 완료(2026-11-18) · 3차 Run 예약 (`r96-web-push`, `R39` 완료 후 착수) · DB/Edge Function/SW 변경 → Opus 승격 조건 ①] Web Push 외부 발송: VAPID 키·`public.push_subscriptions`(공용 기기 `endpoint` 소유자 교체·로그아웃 시 구독 해제)·Edge Function `send-notifications`·`pg_net` DB 웹훅·`public/sw.js` `push`/`notificationclick` 핸들러·iOS 홈 화면 추가 안내 — 설계 [`docs/push-notification-research.md`](push-notification-research.md) §3·§4·§5.1·§8 (담당: Claude Opus 설계·Edge Function → Claude Sonnet / Gemini 4 Hydrogen UI → Claude Opus 리뷰)
- [ ] R97. [결정 완료(2026-11-18) · 4차 Run 예약 (`r97-tauri-notifications`, `R84` 이후 착수 가능) · DB 변경 없음] Windows 데스크톱(Tauri v2) `@tauri-apps/plugin-notification` 연동 및 앱 실행 중 새 알림 OS 네이티브 표시 — 설계 [`docs/push-notification-research.md`](push-notification-research.md) §3.3·§8 (담당: Claude Sonnet / Gemini 4 Hydrogen / GitHub Copilot)
- [ ] R85. [상세 설계·사용자 결정 완료(2026-11-19, [`docs/r85-schedule-time-design.md`](r85-schedule-time-design.md) §10 권장안 확정) · 구현 Run 예약 대기(🐳) · 게임별 서버 초기화 시각 `games.daily_reset_time` 포함 · DB 변경 → Opus 승격 조건 ①] [결정 완료(2026-11-11): 분 단위·종료 미입력 시 날짜만·KST·달력 칸 미표시] [`R37` 흡수] 일정 시간 단위 관리: 날짜 기준은 유지하고 표시·알림용 `start_at`·`end_at TIMESTAMPTZ NULL`·시각 예상 여부 추가안 명세화(서버 시간대 차이·점검 후 시작·일관성 CHECK·승인 RPC·폼·표시 범위) — 착수 전 입력 단위·종료 시각 기본값·달력 표시 여부 결정 필요 (담당: Claude Opus 설계)
- [ ] R90. [⏸️ 잠정 보류 (2026-11-16 사용자 지시, 사용자가 직접 호출할 때만 재개) · `r90-dcinside-crawling-opus-review` 검증 완료] 디시인사이드 게임별 갤러리 공식 탭(`gall.dcinside.com/.../board/lists/?id=...&search_head=...`) 기반 일정 후보 반자동 수집(`schedule_candidates`) 및 관리자 후보 검토 UI 구현:
  - [x] Gemini 4 Argon 1차 기술·약관 실측 검토서 [`docs/dcinside-schedule-crawling-review.md`](dcinside-schedule-crawling-review.md) 작성 완료 (2026-11-16, HTTP 200 SSR `tr.ub-content` 파싱 확인, `robots.txt` `Allow: /` 및 2026-10-07 약관 제11조·제16조 대조, 작성자 식별정보/본문 미수집 완화 설계)
  - [x] Claude Opus 2차 검증 완료 (2026-11-16, §6 작성: 디시인사이드 자동 수집 제외 권장, 경로 A 바로가기+링크 붙여넣기 대안, 구조화 값 저장, R90 Step 1~4 수용 기준 확정안)
  - [ ] (보류) 경로 A/B·R90 범위 결정 (§6.7) — 사용자 호출 시에만 진행
  - [x] 네이버 이용약관 원문(`policy.naver.com/rules/service.html`)의 자동 수집 금지 문구 확인 (2026-11-12 사용자 제공 본문: 사전 허락 없는 자동 수단 게시물 수집 금지, 예외 없음)
- [x] R95. [2026-11-19 완료] ① 수익 삭제 실패 시 RPC 사유(`error.message`)를 화면에 표시함 ② README 표 위치 정정 완료됨.
- [ ] R98. [Run `r98-character-icon-remove` 등록(2026-11-21) · DB 변경 없음] 캐릭터 아바타/아이콘 이미지 제거 기능 추가: 관리자 캐릭터 추가/수정 모달(픽업 전용 기존 아이콘 제거 포함), 사용자 캐릭터 등록 요청 모달, 관리자 캐릭터 요청 대기열에 `이미지 제거` 버튼 및 `default_icon_url: null` 반영
- [ ] R40. [우선 낮음] R13 후속: 엔드 콘텐츠별 다중 파티 편성(콘텐츠별 팀 수 제한·캐릭터 중복 금지) 확장 검토 (R13 Phase 13.3 완료 후, 담당: Claude Opus 설계 → GPT Codex / Claude Sonnet)

---

## 후속 단계: Windows Tauri 데스크톱 통합 (Web/PWA MVP 완료 후)

- [ ] T1. 웹/Tauri 플랫폼 차이를 auth adapter로 분리하고 공통 callback/session 계약을 고정한다.
- [ ] T2. Tauri v2 custom scheme 및 외부 브라우저 OAuth를 연결한다. cold-start URL은 `getCurrent()`로 처리하고 Windows 실행 중 링크 전달을 위해 single-instance plugin을 구성한다.
- [ ] T3. OAuth 성공·취소·만료 세션 및 로그아웃 복귀를 Windows 데스크톱에서 검증한다.
- [ ] T4. Tauri v2 Windows production build를 만들고 단독 실행해 로그인, 캘린더, 결제 흐름을 검증한다.
- 완료 게이트: Web/PWA MVP 조건이 통과되고, 동일 기능의 데스크톱 인증/핵심 흐름 테스트가 통과한 뒤 Windows 앱 배포를 승인한다.

> 열린 항목이 없는 완료 구간과 완료된 `R` 항목은 [`docs/archive/to-do-archive.md`](archive/to-do-archive.md)로 옮김.
