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
- [ ] 실제 변경 커밋이 존재할 때 같은 Base/Target SHA를 사용해 Reviewer를 실행하고, 결과를 review JSON 스키마로 검증한다. Reviewer 권한 제한과 run 아티팩트 기록 절차도 확인한다.
- [x] 대시보드·지출·통계 반응형 시안을 만들고 주요 화면 구성과 반응형 동작을 브라우저에서 검증한다. 사용자는 대시보드 그래프 제외, 데스크톱 표/모바일 그룹 카드, 아이콘 전체 표시, 월별 세로 막대/분류별 가로 막대를 결정했다.
- [x] 시안 검토 후 글자 크기, 쿨 뉴트럴 라이트 팔레트/대비, 기존 다크 팔레트, 그림자, 빈 상태와 보조 피드백 문체를 확정해 UI 디자인 시트·상세 설계에 기록했다.
- [x] A2z 제작자 페이지의 SIL OFL 1.1 및 눈누의 상업 사용/수정/재배포 허용 안내를 확인했다. 재배포 시 저작권 고지와 OFL 전문이 필요하며, 폰트 자체 단독 판매는 허용되지 않는다.
- [x] A2Z의 내장 저작권 표기와 SIL OFL 1.1을 확인하고 9개 WOFF2 굵기를 시안 및 웹 앱에서 자체 호스팅한다. 두 배포 위치에 OFL 전문을 동봉한다.
- [x] 업데이트된 시안을 양 테마와 390/900/1280px에서 재검증해 가로 넘침과 주요 반응형 패널 위치를 확인했다.
- [ ] 제품 UI 구현 시 키보드/스크린리더와 컴포넌트별 대비를 점검한다.
  - 진행: 로그인 폼의 이름·제목 구조·키보드 초점·44px 입력/48px 버튼 및 주요 텍스트/초점 대비를 확인했다. dashboard 접근성 상태는 코드 수준으로 보완했다.
  - 남음: 실제 NVDA/VoiceOver 실행, 인증된 dashboard 동작 점검, 이후 구현될 화면의 접근성/대비 검증.
- [x] 배포 플랫폼 다각화 재평가 및 리스크 식별 완료 (2026-10-13): Netlify 무료 플랜의 빌드 시간(월 300분) 및 대역폭(월 100GB) 소진 시 신규 배포 차단 및 사이트 자동 정지(Hard Limit) 리스크를 식별하고, 플랫폼별 적합도 비교 평가(1위 Cloudflare Pages, 2위 Vercel, 3위 Netlify, 4위 GitHub Pages)를 [`Netlify_Web_Architecture_Proposal.md`](archive/Netlify_Web_Architecture_Proposal.md)에 반영했다.
- [ ] 배포 플랫폼 이관 및 최적화 검증 (Cloudflare Pages + Supabase pg_cron 권장안):
  - [x] **Cloudflare Pages 호스팅 환경 구성**: [`.nvmrc`](../.nvmrc) (Node.js 20 LTS), [`public/_headers`](../public/_headers) (불변 캐싱 및 보안 헤더), [`public/_redirects`](../public/_redirects) 설정 완료.
  - [x] **백그라운드 스케줄러 분리 이관 준비**: 5분 주기 탈퇴 워커를 Supabase PostgreSQL 내부 완결 원자적 함수(`purge_expired_account_deletion_requests`) 및 `pg_cron` 스케줄러로 이관하는 마이그레이션 스크립트([`sql/MIGRATION_PG_CRON.sql`](../sql/MIGRATION_PG_CRON.sql)) 작성 완료.
  - [x] **탈퇴 API Supabase RPC 완전 통합**: Netlify Functions 호출(`fetch`)을 제거하고 `request_account_deletion`, `get_account_deletion_status` `SECURITY DEFINER` RPC 함수로 프론트엔드 직접 연동 완료 ([`src/lib/account-deletion.ts`](../src/lib/account-deletion.ts)).
  - [ ] **웹 정적 호스팅 이관 검증**: Cloudflare Pages에 Next.js 정적 export(`out/`) 배포 설정, 도메인 연결, `/auth/callback` Google OAuth 왕복 및 PWA 자산 라우팅 검증 (트래픽 무제한, 월 500회 빌드 활용).
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

### Phase 1. Web/PWA 환경 및 테스트 기반

- [x] 1.1 Next.js 14+ (App Router) 정적 export 프로젝트 초기화
  - 대상 파일: `package.json`, `next.config.mjs`, `src/app/layout.tsx`
  - 작업: `output: 'export'` 설정, `images.unoptimized: true` 설정, Tailwind 보일러플레이트 세팅
  - verify: `npm run build` 성공 및 `out/` 생성 확인 (2026-10-08)
- [x] 1.2 Vitest 단위 테스트 환경 구성
  - 대상 파일: `vitest.config.ts`, `package.json`
  - 작업: `vitest`, `@testing-library/react` 설치 및 기본 단언문 테스트 등록
  - verify: `npm run test -- --run`에서 7개 파일/24개 테스트 통과 (2026-10-08)
- [x] 1.3 shadcn/ui 컴포넌트 라이브러리 세팅
  - 대상 파일: `components.json`, `src/components/ui/`
  - 작업: Button, Dialog, Card, Input, Select, Progress, Drawer(바텀시트) 설치
  - Dialog/Select는 기존 구현을 재사용하고 Progress/Drawer를 추가했다. `npm run build`에서 타입 검사 및 정적 export를 확인했다.
- [x] 1.4 Supabase 클라이언트 SDK 싱글톤 구성
  - 대상 파일: `.env.local`, `src/lib/supabase/client.ts`
  - 작업: 서버 쿠키 세션을 배제하고 `@supabase/supabase-js` 싱글톤 브라우저 클라이언트 유틸 작성
  - 환경변수 누락 오류 및 PKCE/Tauri flow 설정은 단위 테스트로 확인했다. 실제 Supabase 인증/조회는 미검증이며 placeholder 연결을 성공으로 간주하지 않는다.

---

### Phase 2. 데이터베이스 스키마, RPC 및 RLS 배포

- [x] 2.1 12개 핵심 테이블 DDL 마이그레이션 적용
  - 대상 파일: `md/SCHEMA.sql`
  - 작업: Supabase 대시보드 SQL 에디터에서 통합 DDL 스크립트 실행
  - verify: 12개 테이블 및 유니크 인덱스가 Table Editor에 에러 없이 생성되었는지 확인
- [x] 2.2 결제/환불, 지갑, 요청 승인 RPC 및 일정 동기화 트리거 배포
  - 대상 파일: `md/SCHEMA.sql`
  - 작업: `process_expense_payment`, `refund_expense_payment`, 지갑 설정/보정 RPC, 게임·일정 승인/반려 RPC, 트리거 등록
  - verify: 결제/환불 RPC의 금액·잔액·상태 검증과 게임/일정 승인 원자성 확인
- [x] 2.3 RLS 보안 격리 및 원장 쓰기 봉쇄 검증
  - 대상 파일: `md/SCHEMA.sql`
  - 작업: 일반 사용자 역할/JWT로 자산, 확정 지출, 지갑, 원장 및 요청 승인 상태에 직접 쓰기를 시도
  - verify: 2026-10-12 `md/TESTS.sql` psql 실행에서 RLS 격리, 교차 사용자 쓰기 차단, wallets 직접 수정 거부, expenses/구독 템플릿 물리 삭제 거부, 요청 임의 승인 차단이 모두 검증되고 전 테스트 PASS 및 롤백 완료됨을 확인했다.
- [x] 2.4 재현 가능한 DB/RPC/RLS 검증 케이스 준비 및 실행 검증
  - 대상 파일: `md/TESTS.sql`, `md/SCHEMA.sql`
  - 작업: 테스트 역할/JWT, 초기 데이터, 실행 순서, 각 케이스의 기대 성공/실패 결과를 문서화했다. 결제/환불·지갑, 구독/일정 트리거, 사용자 요청, 관리자 RPC, RLS/grants 케이스를 rollback-only SQL로 준비하고 실행했다.
  - verify: 2026-10-12 격리된 Supabase 테스트 프로젝트에서 `md/TESTS.sql`을 `ON_ERROR_STOP=1`로 psql 실행하여 결제/환불, 지갑, 트리거, RLS, 관리자 권한 등 전체 시나리오가 통과하고 `PASS: all smoke-test fixtures and mutations rolled back` 출력을 확인했다.
- [x] 2.5 TypeScript Database 타입 자동 생성
  - 대상 파일: `src/types/database.types.ts`
  - 작업: `npx.cmd supabase gen types typescript --db-url ...` 실행하여 원격 DB 기반 타입 갱신
  - verify: 2026-10-12 `src/types/database.types.ts` 생성 완료. `Database['public']['Tables']['personal_memos']['Row']` 타입 포함 12개 테이블/뷰/함수 타입 갱신 확인, `npx.cmd tsc --noEmit` 에러 0건 통과, Vitest 30개 파일 / 106개 테스트 100% 통과 확인.

---

### Phase 3. Web/PWA 인증(Auth)

- [x] 3.1 이메일 가입/로그인 및 구글 OAuth 연동
  - 대상 파일: `src/app/auth/page.tsx` 또는 통합 로그인 경로, `src/app/auth/callback/page.tsx`, `src/lib/auth-context.tsx`
  - 작업: 이메일 가입/로그인, Google OAuth/PKCE callback, 세션 상태 및 protected routes를 Web/PWA 기준으로 연결했다. 별도 callback route는 기존 공유 callback 흐름을 재사용한다.
  - [x] 로그인 화면을 기존 앱과 맞는 다크 테마로 정리하고, 레이블이 있는 입력과 이메일 로그인/가입/Google 액션을 배치했다. 320/390/768/1280px 화면에서 넘침이 없고 입력 높이가 44px 이상임을 확인했다.
  - [x] Google OAuth 로그인 버튼 공식 4색 SVG 아이콘 및 로딩 스피너 피드백(`Loader2` 회전 스피너, "Google 연결 중..." 문구), OAuth 콜백(`/auth/callback`) 화면 앱 전역 다크 테마 및 Card 디자인 시스템(스피너/안내 문구/에러 UI) 일원화 완료 (2026-10-19 ~ 2026-10-20).
  - 후속: 앱 전체 테마 전환은 보호 화면과 함께 적용한다. 키보드/스크린리더 심화 검증은 별도로 수행한다.
  - verify: 인증 화면/상태 단위 테스트로 검증한다. 실환경 OAuth 왕복과 Android PWA 실기기 검증은 아직 수행하지 않았다.
- [x] 3.2 사용자 계정 삭제 및 개인 데이터/Storage 정리 흐름
  - 대상 파일: 인증 설정 화면, 서버 측 계정 삭제 경로, `user-icons` Storage 정책
  - 작업: Netlify Functions 내구성 queue/worker에서 본인 확인 후 아이콘·개인 행을 정리하고 등록 이메일 알림 뒤 Auth 계정을 삭제한다. 대기 중 RLS/trigger로 개인 접근을 차단하고 공용 게임/일정은 보존한다.
  - verify: 단위 테스트에서 순서, 재시도, provider 멱등성 경계 및 Auth 최종 삭제를 확인했다. 실제 Supabase migration/RLS/Storage, Netlify 예약 실행과 Resend 전달은 배포 환경에서 검증해야 한다. Idempotency 기간 만료 전에 발송 결과를 확정할 수 없으면 `MANUAL_REVIEW`로 멈추며 운영자 조치가 필요하다.

---

### Phase 4. 게임 마스터, 256x256 아이콘 및 요청 시스템

- [x] 4.1 클라이언트 Canvas 256x256 WebP 리사이징 모듈
  - 대상 파일: `src/lib/image-resizer.ts`
  - 작업: PNG/JPG/JPEG/WebP 입력(원본 5 MiB 이하)을 1:1 중앙 크롭 후 Canvas로 256×256 WebP 변환 (Safari 폴백 포함)
- [x] 4.2 Supabase Storage `user-icons` 버킷 업로드 연동
  - 대상 파일: `src/lib/storage-upload.ts`
  - 작업: 비공개 `user-icons` 버킷 안에 `{user_id}/{game_id}.webp` 고정 객체 경로를 사용하고 소유자만 인증 조회/교체/삭제하도록 설정.
- [x] 4.3 공용 게임 카탈로그 구독 및 커스텀 아이콘 등록 UI
  - 대상 파일: `src/components/game/game-select-modal.tsx`
  - 작업: 공용 `games` 중 내 게임으로 `user_games`에 등록 및 커스텀 아이콘 교체 기능 구현.
- [x] 4.4 일반 유저 게임/일정 추가·수정 요청 모달 및 관리자 승인 UI
  - 대상 파일: `src/components/game/schedule-request-modal.tsx`, `src/app/admin/requests/page.tsx`
  - 작업: 게임 요청(`game_requests`)과 일정 요청(`schedule_requests`)을 분리하고 승인/반려 RPC 연동. 사용자 게임/일정 제안 제출 UI와 관리자 페이지를 구현했다.
  - verify: run Target `5f7cf557844f64d77e90eb67c09974bf6aab81a0`에서 Vitest 21개, lint, 정적 build, run/review/test Schema 및 동일 SHA Reviewer 검토를 통과했다. 실제 Supabase RLS/승인 RPC 통합과 sandbox 격리는 미검증이다.

---

### Phase 5. 미니멀 캘린더 코어, 개인 메모 및 Lazy Generation

- [x] 5.1 날짜 연산 코어 및 말일 보정 함수 작성
  - 대상 파일: `src/lib/calendar-utils.ts`
  - 작업: 6주 캘린더 그리드 및 `getAdjustedBillingDate(year, month, billingDay)` 구현
  - verify: `calendar-utils.test.ts`에서 31일 결제일이 2월 평년=28일, 윤년=29일, 4월=30일로 보정되는 케이스와 6주(42칸) 그리드를 검증했다.
- [x] 5.2 정기 구독 멱등성 보장 지연 생성 (Lazy Generation)
  - 대상 파일: `src/lib/subscription-sync.ts`
  - 작업: 당월 캘린더 로드 시 `is_active=true` 템플릿을 기준으로 `expenses`에 `PLANNED` 회차를 upsert하고, `template_id+billing_cycle` 충돌은 `ignoreDuplicates`로 무시한다. 취소 회차 자동 복구 로직은 추가하지 않았다.
  - verify: `subscription-sync.test.ts`에서 billing cycle 기반 삽입 파라미터와 중복 무시 옵션을 검증했다. 실제 동시 접속 중복 생성 방지는 DB 유니크 인덱스(`idx_expenses_template_billing_cycle`)에 의존하며 실DB 동시성 검증은 후속 과제다.
- [x] 5.3 미니멀 데스크톱 캘린더 (금액 완전 배제, 버전/픽업 배너 및 메모 도트)
  - 대상 파일: `src/components/calendar/desktop-calendar.tsx`, `src/components/calendar/schedule-banner.tsx`
  - 작업: 타일 내부에서 금액을 렌더링하지 않고, 일정 유형 배너(`VERSION`/`PICKUP`), 게임 아이콘, 메모 도트만 표시하도록 구현했다.
  - verify: `desktop-calendar.test.tsx`에서 배너/아이콘/메모 도트 렌더링과 타일 내 통화 텍스트 미표시를 검증했다.
- [x] 5.4 우측 히어로 사이드바 (Hero Area) 및 모바일 바텀 시트
  - 대상 파일: `src/components/calendar/hero-sidebar.tsx`, `src/components/calendar/mobile-drawer.tsx`
  - 작업: 우측 사이드바에 총 자산/예산 진행률/스토어 포인트/선택일 지출·메모를 표시하고, 모바일에서는 Drawer 바텀 시트로 동일 상세를 제공한다.
  - verify: `dashboard/page.test.tsx`에서 캘린더와 선택일 상세(지출/메모/자산) 렌더링을 확인했다.

---

### Phase 6. 가계부, 결제/환불 RPC 연동 및 포인트 지갑

- [x] 6.1 스토어 포인트 지갑 위젯 및 계정 등급 설정
  - 대상 파일: `src/components/wallet/store-wallet-widget.tsx`, `src/app/settings/page.tsx`
  - 작업: `update_store_wallet_settings` RPC 연동(구글 등급별 적립률, 갤럭시 적립률 수정) 및 잔액 수동 보정 UI 구현
  - verify: 설정 변경 시 지갑 레코드가 정상 갱신되고 수동 보정 시 원장에 `MANUAL_ADJUST`가 기록되는지 확인
- [x] 6.2 정밀 결제 모달 및 `process_expense_payment` 연동
  - 대상 파일: `src/components/expense/expense-modal.tsx`
  - 작업: 계층형 등록(카테고리 $\to$ 게임 $\to$ 버전/픽업 탭), `WALLET`/`GOOGLE_PLAY`/`GALAXY_STORE` 결제수단, 할인/포인트할인 분리 입력, 자산 차감 토글 및 RPC 호출
  - verify: 정가 119,000원, 쿠폰 5,000원(250P 소모) 입력 시 실결제액 114,000원 산출 및 잔액 차감 확인
- [x] 6.3 결제 취소/환불 UI 및 `refund_expense_payment` 연동
  - 대상 파일: `src/components/expense/expense-detail-modal.tsx`
  - 작업: 지출 상세에서 [결제 취소] 클릭 시 환불 RPC 호출 (포인트 반환, 적립 회수, 자산 복원)
  - verify: 적립 포인트를 이미 써서 잔액이 부족한 경우 환불 거부 에러 메시지가 정상 노출되는지 확인

---

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

### Phase 10. 재정리된 기획(v2) 기반 UI/UX 및 정기 구독·지갑 개편

- [x] 10.1 대시보드 캘린더 및 지출 바인딩 로직 개선
  - 대상 파일: `src/components/calendar/hero-sidebar.tsx`, `src/components/expense/expense-modal.tsx`, `src/components/calendar/mobile-drawer.tsx`
  - 작업: `[+ 지출 추가]` 버튼명 변경, 지출 모달 내 카테고리 우선 선택(게임 시에만 게임 선택 노출), 해당 날짜의 `VERSION` 일정에만 바인딩 (`PICKUP` 일정 바인딩 제외)
  - verify: 지출 추가 시 카테고리='게임'일 때만 게임 선택란이 보이고, 해당 날짜의 `VERSION` 일정이 자동 바인딩되는지 확인
- [x] 10.2 소비(`/dashboard/expenses`) 화면 UI 개편
  - 대상 파일: `src/app/dashboard/expenses/page.tsx`, `src/app/dashboard/expenses/page.test.tsx`
  - 작업: 헤더 버튼명 `[+ 지출 추가]`로 변경 및 모달 연동, 목록 액션 버튼 `[확정]`, `[취소]`, `[환불]`, `[되돌리기]`로 통일, 카테고리별 비중을 **원그래프(Pie Chart)**로 교체, 집계 기준을 `CONFIRMED` 지출만으로 한정
  - verify: 취소/예정 지출을 제외한 확정 지출만 원그래프로 비율 계산되는지 확인, 버튼 레이블 통일 및 RPC 연동 확인, 단위 테스트 4개 통과 및 정적 export 빌드 성공
- [x] 10.3 정기 구독 탭 및 3종 주기 모델(A안) 구현
  - 대상 파일: `src/app/dashboard/expenses/page.tsx`, `src/lib/subscription-sync.ts`, `src/components/subscription/subscription-modal.tsx`, `md/SCHEMA.sql`
  - 작업: 소비 화면 내 서브 탭(`[지출 내역 및 통계 | 정기 구독]`), `[+ 구독 추가]` 버튼 및 모달(카테고리='게임'일 때만 게임 노출), `cycle_type` 3종(`MONTHLY_DAY`, `INTERVAL_30`, `VERSION_PASS`) 모델 적용 및 회차 생성 로직 확장, `is_active` 활성화/비활성화 토글
  - verify: 매월 지정일, 30일 누적 충전, 새 버전 시작일 연동에 따른 회차 생성 테스트 통과, Vitest 28개 파일/99개 테스트 통과, 정적 export 빌드 성공
- [x] 10.4 게임 관리(`/dashboard/games`) 추가 요청 모달 개선
  - 대상 파일: `src/app/dashboard/games/page.tsx`, `src/components/game/request-submission-modal.tsx`, `src/components/game/game-select-modal.tsx`, `src/app/dashboard/games/page.test.tsx`
  - 작업: `[+ 추가 요청]` 버튼으로 변경 및 모달 연동, 모달에서 [게임 요청 | 일정 요청] 선택 분기(게임은 제목만, 일정은 게임+기간+종류+내용 템플릿 제공), 내 구독 게임 그리드 카드(커스텀 아이콘 등록/변경, 구독 해제, 일정 보기), 하단 카탈로그 검색 및 `[+ 구독 추가]`, `[+ 추가 요청]` 배너 연동
  - verify: 각각의 요청이 `game_requests` 및 `schedule_requests`로 정상 분기 인입 확인, 단위 테스트 9개 통과(modal 5개 + page 4개), Vitest 29개 파일/103개 테스트 전체 통과, `npm run build` 정적 export 빌드 성공
- [x] 10.5 설정(`/dashboard/settings`) Galaxy Store 등급 개편 및 내 요청 내역
  - 대상 파일: `src/components/wallet/store-wallet-widget.tsx`, `src/app/dashboard/settings/page.tsx`, `src/components/finance/finance-settings-card.tsx`, `src/components/game/user-requests-card.tsx`, `md/SCHEMA.sql`
  - 작업: Galaxy Store 적립률 입력을 4대 공식 등급(일반 0.1%, 스타 0.1%, 프레스티지 1.1%, 로열블루 2.1%) 선택 드롭다운으로 개편하고 DB 제약 동기화, 개인 재무 설정(`total_asset`, `default_budget`) 카드 연동, 사용자 본인의 게임/일정 요청 상태(`PENDING`, `APPROVED`, `REJECTED`) 및 관리자 메모 조회 UI 추가
  - verify: Galaxy Store 등급 선택 시 올바른 적립률 저장 및 원장/지갑 갱신 확인, 내 요청 내역 정상 조회 확인, `settings/page.test.tsx` 3개 테스트 및 `store-wallet-widget.test.tsx` 3개 테스트 통과
- [x] 10.6 종합 검증 및 회귀 테스트
  - 작업: `npx tsc --noEmit`, Vitest 테스트 실행, `npm run build` 정적 export 빌드 검증
  - verify: TypeScript 타입 에러 0건, Vitest 30개 파일 / 106개 테스트 전체 통과 (100% PASS), `npm run build` 정적 13개 페이지 export 생성 성공

### Phase 11. 게임 일정 구조 다변화, 대시보드 중앙 모달 전환 및 네이버페이 충전 결제 연동

- [x] 11.1 게임 일정 스키마 확장(`CONTENTS`, 단일 목표일), 일정 모달 전환 및 대시보드/사이드바 3단 UI·정렬 일원화
  - 대상 파일: `md/SCHEMA.sql`, `md/MIGRATION_PHASE11.sql`, `src/types/database.types.ts`, `src/app/dashboard/games/page.tsx`, `src/app/dashboard/page.tsx`, `src/components/calendar/desktop-calendar.tsx`, `src/components/calendar/hero-sidebar.tsx`, `src/components/calendar/schedule-banner.tsx`, `src/components/expense/expense-modal.tsx`, `src/components/subscription/subscription-modal.tsx`
  - 작업:
    1. DB `game_schedules.schedule_type`에 `CONTENTS` 추가 (`chk_schedule_type` 제약 갱신), 단일 목표 일정(`start_date = end_date = target_date`) 지원 및 관리자 등록 UI(`AdminPage`) 확장.
    2. 게임 관리(`/dashboard/games`): 내 구독 게임 '일정 보기' 우측 Sheet를 화면 중앙 팝업 다이얼로그(`<Dialog>`)로 전환하고, `end_date >= today` 필터링으로 만료된 일정 제외.
    3. 홈 대시보드(`/dashboard`): 사이드바(`HeroSidebar`) 레이아웃 원상 복구, 캘린더 타일에서 지출 항목에 의한 아이콘 증식 제거(공식 일정 시작일에만 아이콘 노출), 개인 메모 인라인 편집/저장 UI 연동.
    4. 캘린더 타일 배지 및 내비게이션(`desktop-calendar.tsx`): 배지 겹침 시 `[VERSION]` $\to$ `[PICKUP]` $\to$ `[CONTENTS]` 우선순위 렌더링, 상/하단 수직 분리 레이아웃으로 날짜 가림 방지, `VERSION` 배지 옆 중복 아이콘 제거, `PICKUP`/`CONTENTS` 배지 시작일(`start_date`) 한정 노출, 동일 날짜 다중 게임 일정 시작 시 타일 우측 아이콘 게임명 가나다순(`localeCompare`) 정렬, 내비게이션 버튼을 `public/assets/nav/` SVG 에셋으로 교체 및 테마별 화살표 동기화.
    5. 선택일 일정(`HeroSidebar`): 3단 수직 카드 구조(`[배지] 게임명` / 기간 / 일정 제목(볼드) / 메모) 개편.
    6. 전체 화면 일정 정렬 로직 일원화: 1순위 `start_date ASC`, 2순위 `end_date ASC` (대시보드 사이드바, 게임 일정 모달, 관리자 공식 일정 목록).
    7. 지출 모달(`ExpenseModal`): `[연결된 버전 일정]` 레이블 변경, 비활성화 안내 텍스트 제거, 상시 disabled 상태로 매칭 버전 명칭만 노출(기간 텍스트 제외).
    8. 정기 구독 모달(`SubscriptionModal`): 결제수단 필드를 '내 지갑'(`WALLET`, disabled)으로 고정.
  - verify: `CONTENTS` 등록 및 캘린더/배너 정상 표시, 게임 일정 중앙 모달 동작 및 만료 일정 필터링 확인, 타일 배지 엄격한 순서 렌더링 검증, 타일 아이콘 가나다순 정렬 단위 테스트 검증, 사이드바 3단 레이아웃 및 2차 정렬 단위 테스트 검증, Vitest 32개 파일 / 119개 테스트 전체 통과 (100% PASS), `npm run build` 정적 13개 페이지 export 빌드 성공
- [x] 11.2 네이버페이 지갑 모델 및 10,000원 단위 충전 엔진 구현
  - 대상 파일: `md/SCHEMA.sql`, `md/MIGRATION_PHASE11.sql`, `src/lib/naver-pay-calculations.ts`, `src/lib/naver-pay-calculations.test.ts`, `src/lib/payment-calculations.ts`, `src/components/wallet/store-wallet-widget.tsx`, `src/components/wallet/store-wallet-widget.test.tsx`
  - 작업:
    1. `store_wallets`, `expenses`, `store_point_transactions`에 `NAVER_PAY` 플랫폼/결제수단/`RECHARGE` 트랜잭션 지원 및 DB 제약조건(`chk_wallet_platform_settings`: 네이버페이는 등급 NULL, 적립률 0%) 추가.
    2. 네이버페이 충전 및 결제 계산 순수 함수 `calculateNaverPayPayment` 모듈화 (부족액 $S$, 1만원 단위 올림 충전액 $R$, 총 자산 잔액 검증 $B_{total} \ge R$, 최종 잔액 계산).
    3. `process_expense_payment` 및 `refund_expense_payment` RPC에 네이버페이 결제 시 부족액 충전($R$ 자산 차감 + 네이버페이 머니 충전) 및 결제($P$ 차감) 원자적 단일 트랜잭션 구현, 자산 이중 차감 및 이중 환불 원천 차단.
    4. 스토어 지갑 위젯(`StoreWalletWidget`)에 네이버페이 잔액(원) 표시 및 수동 목표 잔액 보정(`adjust_wallet_balance`) 지원.
  - verify: 단위 테스트(잔액 충분, 1만원 단위 올림 충전, 총 자산 부족 차단 등 9개 시나리오) 및 위젯 렌더링/보정 테스트 통과, Vitest 34개 파일 / 138개 테스트 전체 통과 (100% PASS), `tsc --noEmit` 0 에러, Next.js 15개 정적 페이지 빌드 성공
- [x] 11.3 결제 선택 2단계 계층 구조 및 게이트웨이 충전 UI 연동
  - 대상 파일: `src/components/expense/expense-modal.tsx`, `src/components/expense/expense-modal.test.tsx`, `src/components/expense/expense-detail-modal.tsx`, `src/components/expense/expense-detail-modal.test.tsx`
  - 작업:
    1. 결제 모달 내 [결제 플랫폼(구글/갤럭시/기타)] -> [결제 수단(내 지갑/스토어/네이버페이)] 2단계 종속 선택 구조 구현.
    2. 네이버페이 선택 시 실시간 잔액 비교 및 "부족 금액 안내 / 1만원 단위 자동 충전 프리뷰" 인라인 카드 노출, 사용 포인트 입력 비활성화 및 리셋 가드.
    3. 네이버페이 잔액 부족 시 `[충전 후 결제]` 원클릭 승인 버튼 라벨 전환 및 단일 트랜잭션 RPC 연동, 총 자산 부족 시 `[총 자산 부족]` 경고 및 비활성화.
    4. 자동 계산값 기본 채움 및 최종 실결제액 수동 오버라이드 지원 (수동 금액 입력 시 할인액 자동 역산 및 DB 제약조건 무결성 보장).
    5. 지출 상세 모달(`ExpenseDetailModal`) 내 네이버페이 결제 라벨 및 전액 환불 안내 메시지 적용.
  - verify: 단위 테스트(플랫폼별 수단 필터링, 네이버페이 부족액 올림 충전 프리뷰, 원클릭 결제 RPC 파라미터, 실결제액 수동 오버라이드 역산, 상세 모달 환불 문구 등 13개 케이스) 통과, Vitest 34개 파일 / 143개 테스트 전체 통과 (100% PASS), `tsc --noEmit` 0 에러, Next.js 15개 정적 페이지 빌드 성공
- [x] 11.4 픽업별 지출 바인딩 및 가챠 소비 통계/분석 구현
  - 대상 파일: `md/SCHEMA.sql`, `md/MIGRATION_PHASE11.sql`, `src/types/database.types.ts`, `src/components/expense/expense-modal.tsx`, `src/components/expense/expense-modal.test.tsx`, `src/components/expense/expense-detail-modal.tsx`, `src/components/expense/expense-detail-modal.test.tsx`, `src/app/dashboard/expenses/page.tsx`, `src/app/dashboard/expenses/page.test.tsx`
  - 작업:
    1. DB 스키마: `expenses.pickup_schedule_id UUID NULL REFERENCES public.game_schedules(id) ON DELETE SET NULL` 컬럼 및 인덱스(`idx_expenses_pickup_schedule_id`), 일정 게임 일치 트리거 검증(`validate_expense_references`) 반영, `md/MIGRATION_PHASE11.sql` 마이그레이션 DDL 추가, TypeScript 데이터베이스 타입 동기화.
    2. 지출 등록 모달(`ExpenseModal`): 카테고리가 '게임'일 때 결제일(`paymentDate`) 기준 진행 중인 픽업 일정(`schedule_type = 'PICKUP'`) 목록을 `[픽업 선택 (선택 사항)]` 드롭다운으로 조회 및 바인딩 지원 (`pickup_schedule_id` insert 반영).
    3. 지출 상세 모달(`ExpenseDetailModal`): 바인딩된 픽업 타이틀(`pickupTitle`) 항목 표시.
    4. 소비 화면(`/dashboard/expenses`) 통계 UI: 게임별 픽업 과금 통계 섹션 추가 (확정 `CONFIRMED` 지출 기준 픽업별 총 과금액 가로 막대 차트 `BarChart layout="vertical"`, 랭킹 카드, 버전 내 픽업 과금 비중(%) 표시, 게임 선택 필터 드롭다운, 미지정 지출 '버전 일반' 분리 표기로 정합성 100% 보장).
    5. 지출 목록 테이블 및 모바일 카드: 게임 지출 항목에 `[픽업명]` 뱃지 렌더링.
  - verify: 단위 테스트(ExpenseModal 픽업 드롭다운 바인딩, ExpenseDetailModal 픽업 타이틀 노출, ExpensesPage 픽업 통계 집계 및 배지 렌더링 등) 통과, Vitest 34개 파일 / 146개 테스트 전체 통과 (100% PASS), `tsc --noEmit` 0 에러, Next.js 15개 정적 페이지 빌드 성공
- [x] 11.5 반응형 모바일 튜닝 및 종합 회귀 테스트
  - 대상 파일: `src/components/expense/expense-modal.tsx`, `src/components/expense/expense-detail-modal.tsx`, `src/components/subscription/subscription-modal.tsx`, 전체 테스트 스위트
  - 작업: 모바일 뷰포트 패딩 최적화(`p-4 sm:p-6`), 중앙 모달 반응형 크기 세부 조정, 지출 목록 모바일 카드 타이틀-배지 줄바꿈 래핑, `npx tsc --noEmit`, Vitest 전체 테스트 실행, `npm run build` 정적 export 검증.
  - verify: Vitest 34개 파일 / 146개 테스트 전체 통과 (100% PASS), `tsc --noEmit` 0 에러, Next.js 15개 정적 페이지 빌드 성공.

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

### Phase 12. 지갑 편의 기능(Audit Log), 캘린더 커스터마이징 및 대시보드/모바일 고도화

- [x] 12.1 스토어 지갑·포인트 수동 보정 내역(Audit Log) 조회 모달 구현 (2026-10-14)
  - 대상 파일: `src/components/wallet/store-wallet-adjust-history-modal.tsx`, `src/components/wallet/store-wallet-widget.tsx`
  - 작업: `store_point_transactions` 테이블에서 `transaction_type = 'MANUAL_ADJUST'` 레코드 조회, 플랫폼별(전체/구글 플레이/갤럭시 스토어/네이버페이) 필터 탭, 5개 기준 페이지네이션(`ITEMS_PER_PAGE = 5`, 이전/다음/페이지 번호/범위 안내) 바, 새로고침, 증감 차액(+/-) 및 사유 메모 뷰어 제공, 지갑 잔액 수동 보정 헤더에 `[보정 내역 보기]` 버튼 배치 및 모달 연동.
  - verify: 단위 테스트 11개(모달 6개, 위젯 5개) 통과, Vitest 40개 파일 216개 테스트 통과, Next.js 14 정적 export 빌드 성공.
- [x] 12.2 누적 충전형(INTERVAL_30) 구독 조기 결제 시 잔여일수 누적 연장, 환불 시 차감(롤백) 및 카드 배지 변경 (2026-10-15)
  - 대상 파일: `src/lib/subscription-sync.ts`, `src/components/expense/expense-modal.tsx`, `src/components/expense/expense-detail-modal.tsx`, `src/app/dashboard/expenses/page.tsx`, `src/app/dashboard/page.tsx`, `src/components/expense/overdue-planned-modal.tsx`
  - 작업:
    1. 결제 예정일보다 이른 날짜에 결제 확정 시 기존 남은 잔여일수에 연장 일수(`interval_days`, 기본 30일)를 누적 가산하는 계산 로직(`calculateNextIntervalTargetDate`) 및 다음 회차 `PLANNED` 자동 생성 함수(`createNextIntervalSubscriptionExpense`) 구현.
    2. 결제 확정 모달(`ExpenseModal`) 결제 성공 시 `template_id`를 인식하여 조기 결제일 경우 기존 예정일 기준 연장된 다음 회차를 즉시 생성하도록 연동.
    3. 누적 충전형 구독 결제 환불(취소) 시 충전했던 일수만큼 다음 예정 회차(`PLANNED`)의 예정일에서 차감(롤백)하는 함수(`calculateRollbackIntervalTargetDate`, `rollbackIntervalSubscriptionExpense`) 구현 및 지출 상세/환불 모달(`ExpenseDetailModal`) 연동.
    4. 소비 페이지(`/dashboard/expenses`) 정기 구독 카드의 `[누적 충전형 n일]` 옆 잔여일수 배지 텍스트를 `[남은 n일]`에서 `[n일]`로 간결화.
  - verify: 단위 테스트(조기/당일/만료후 결제일 산출, 자동 생성, 환불 시 일수 롤백 차감, 배지 텍스트) 12개 추가 통과, Vitest 40개 파일 229개 테스트 100% 통과, Next.js 14 정적 export 빌드 15개 페이지 성공.
- [x] 12.3 사용자 지정 게임 아이콘 전역 적용, 픽업 과금 차트 다중 색상 및 캘린더 커스텀 배경·글래스모피즘 타일 구현 (2026-10-17 ~ 2026-10-19)
  - 대상 파일: `src/lib/storage-upload.ts`, `src/lib/calendar-bg-storage.ts`, `src/components/calendar/calendar-bg-customizer.tsx`, `src/components/calendar/desktop-calendar.tsx`, `src/app/dashboard/page.tsx`, `src/app/dashboard/expenses/page.tsx`
  - 작업:
    1. **사용자 지정 게임 아이콘 전역 적용 및 픽업 차트 다중 팔레트** (`2026-10-17`): `downloadUserIcon` 커스텀 아이콘을 대시보드 달력 타일, 선택일 사이드바, 소비/구독 내역 전반에 기본 아이콘보다 우선 적용하고, 픽업별 과금 분석 그래프 및 순위 리스트에 8색 다중 팔레트(`PICKUP_CHART_PALETTE`) 적용.
    2. **브라우저 로컬 저장소(IndexedDB) 기반 커스텀 배경 보관** (`2026-10-17 ~ 2026-10-18`): `chronoledger_calendar_bg`에 사용자별 이미지 Blob과 설정(`opacity`, `tileOpacity`, `blur`) 영구 보관, 원본 업로드 허용 용량 **50MB(`MAX_BG_FILE_SIZE_BYTES`)** 확대 후 최대 1920×1080 Canvas WebP 리사이징/압축 저장.
    3. **글래스모피즘 타일 및 개별 투명도 조절**: 가독성 보호용 반투명 오버레이(`bg-surface/15`), 날짜 타일 글래스모피즘(`rgb(var(--surface) / tileOpacity)` + `backdrop-blur-[1px]`), **배경 투명도 슬라이더(10%~90%)**, **날짜 타일 투명도 슬라이더(0%~90%)**, 블러 효과 단계(Off/약함/보통) 토글, 날짜/요일/일정 배지 텍스트 그림자(`drop-shadow`) 보강.
    4. **오늘 날짜 황금색(`#EFBF04`) `오늘` 배지 추가** (`2026-10-19`): 달력 타일 내 오늘(`day.isToday`) 날짜 숫자 우측에 황금색 `#EFBF04` 배경의 `오늘` 캡슐 배지(`data-testid="today-badge-..."`) 노출.
  - verify: 대용량(50MB) 이미지 리사이징/압축 및 배경(10~90%)/타일(0~90%) 투명도 클램핑 검증(`calendar-bg-storage.test.ts`), 가독성 오버레이·배경 레이어·타일 투명도·황금색 `오늘` 배지 렌더링 검증(`desktop-calendar.test.tsx`), 설정 컨트롤러 조작 검증(`calendar-bg-customizer.test.tsx`), Vitest 42개 파일 241개 테스트 100% 통과, Next.js 14 정적 export 빌드 성공.
- [x] 12.4 개인 메모 저장 안정화(Update/Insert 분기 및 Unique 제약 보강) (2026-10-19)
  - 대상 파일: `src/app/dashboard/page.tsx`, `src/app/dashboard/page.test.tsx`, `md/SCHEMA.sql`, `md/MIGRATION_PHASE12_MEMO_FIX.sql`
  - 작업:
    1. 원격 Supabase DB에 `(user_id, target_date)` 복합 유니크 제약이 누락된 경우 `.upsert(..., { onConflict: "user_id,target_date" })` 호출 시 발생하던 `42P10` 에러를 해결하기 위해, 기존 메모 `id` 유무에 따라 명시적 `.update()` 또는 `.insert()`로 분기하고 `23505` 충돌 시 `.update()` 폴백 처리.
    2. 중복 행 자동 정리 및 `uq_personal_memos_user_target_date` 고유 제약 조건을 보강하는 마이그레이션 스크립트(`md/MIGRATION_PHASE12_MEMO_FIX.sql`) 추가.
  - verify: 신규 메모 `.insert()` 및 기존 메모 `.update()` 분기 단위 테스트 통과, Vitest 42개 파일 242개 테스트 100% 통과.
- [x] 12.5 대시보드 요약 카드 진행률 개편, 100% 포인트 할인(방식 A), 사이드바 드롭다운 탭 및 모바일 바텀시트 터치 개선 (2026-10-19)
  - 대상 파일: `src/lib/budget-calculations.ts`, `src/lib/payment-calculations.ts`, `src/components/expense/expense-modal.tsx`, `src/components/calendar/hero-sidebar.tsx`, `src/components/calendar/mobile-drawer.tsx`, `src/components/calendar/calendar-bg-customizer.tsx`, `src/app/dashboard/page.tsx`
  - 작업:
    1. **요약 카드 진행률 및 잔여 예정 지출 표시**: 당월 예상 지출 대비 확정 지출 비율(`(confirmedExpense / expectedExpense) * 100`)로 진행률 바를 개편하고, 좌측 `진행률 n%`, 우측 잔여 예정 지출(`expectedExpense - confirmedExpense`)원 표시 (`calculateConfirmedExpense` 함수 추가).
    2. **100% 포인트 할인 허용(방식 A) 및 플랫폼별 포인트 지갑 강제 동기화**: `할인 (원)`을 총 원화 할인액, `사용 포인트 (P)`를 차감 포인트 수량으로 취급하여 정가 100% 할인(실결제액 0원) 결제를 허용하고, 결제 플랫폼(`GOOGLE_PLAY`/`GALAXY_STORE`)과 포인트 지갑을 1:1 고정(`disabled`) 동기화하며 `OTHER` 선택 시 포인트 입력을 비활성화.
    3. **사이드바 카드 배치 순서 및 선택일 드롭다운 탭 추가**: 사이드바 순서를 `요약` $\to$ `선택일 상세` $\to$ `스토어 포인트`로 재배치하고, 선택일 상세 카드 내 `[게임 일정 | 지출 내역 | 메모]` 드롭다운 선택기를 추가하여 선택한 섹션만 깔끔하게 노출.
    4. **모바일 바텀시트(`MobileDrawer`) 메모 작성/저장 터치 버그 해결 및 배경 설정기 모바일 반응형 개선**: Vaul 드래그 가로채기 방지를 위해 `data-vaul-no-drag` 속성과 `onPointerDown`/`onMouseDown` 포커스 유지 가드를 적용하고, `CalendarBgCustomizer` 팝오버 폭(`max-w-[calc(100vw-2rem)]`) 및 슬라이더 터치 영역을 개선.
  - verify: 단위 테스트(`budget-calculations.test.ts`, `payment-calculations.test.ts`, `expense-modal.test.tsx`, `hero-sidebar.test.tsx`, `dashboard/page.test.tsx`) 전체 갱신 및 추가 검증 완료, `npx tsc --noEmit` 0 에러, Vitest 42개 파일 / 247개 테스트 100% 통과, `npm run build` 정적 15개 페이지 빌드 성공.
- [x] 12.6 모바일 초소형 뷰포트(360px 이하) 타일·배지 세부 최적화 및 바텀시트 즉시 연동 (2026-10-19)
  - 대상 파일: `src/components/calendar/desktop-calendar.tsx`, `src/components/calendar/calendar-game-filter.tsx`, `src/components/calendar/mobile-drawer.tsx`, `src/app/dashboard/page.tsx`
  - 작업:
    1. **모바일 일정 유형별 컬러 도트 분리 표시**: 모바일(`< md`) 달력 타일 우측 상단에 게임 일정 시작일(`is_start_date`)을 유형별 색상 점(`VERSION` 초록 `bg-success`, `PICKUP` 파랑 `bg-primary`, `CONTENTS` 보라 `bg-purple-500`)과 메모 회색 점(`bg-content-muted`)으로 나란히 분리 표시하고 360px 이하 초소형 타일 간격(`gap-0.5 sm:gap-1`) 최적화.
    2. **모바일 당일(Today) 타일 금색 테두리 강조 및 데스크톱 전용 배지 처리**: 360px 이하 초소형 화면에서 두 자리 날짜 숫자와 `'오늘'` 글자 배지 및 도트가 겹치는 현상을 방지하기 위해 모바일(`< md`)에서는 오늘 타일 테두리만 금색(`#EFBF04`, `max-md:border-[#EFBF04] max-md:ring-1 max-md:ring-[#EFBF04]/70`)으로 강조하고, `'오늘'` 텍스트 배지는 데스크톱(`hidden md:inline-flex`)에서만 표시.
    3. **모바일 달력 날짜 타일 터치 시 바텀시트(`MobileDrawer`) 즉시 오픈**: 모바일 뷰포트(`< 900px`)에서 달력 날짜 타일을 터치/클릭하면 해당 날짜 선택과 동시에 `'선택일 상세'` 바텀시트(`MobileDrawer`)가 즉시 열리도록 `open`/`onOpenChange` 제어 상태 연동(하단 `'선택일 상세'` 버튼도 함께 유지).
    4. **초소형 뷰포트 팝오버 가로 넘침 방지**: `CalendarGameFilter` 드롭다운 팝오버에 `max-w-[calc(100vw-2rem)]`을 적용하여 320px~360px 화면에서 좌우 넘침 차단.
  - verify: 모바일 일정 유형별 도트/오늘 금색 테두리/데스크톱 전용 배지 단위 테스트(`desktop-calendar.test.tsx`) 및 모바일(360px) 날짜 타일 클릭 시 바텀시트 오픈 테스트(`dashboard/page.test.tsx`) 통과, Vitest 42개 파일 252개 테스트 100% 통과, Next.js 14 정적 export 빌드 성공. *(남은 실기기 점검은 Phase 7.4 Android PWA 실기기 검증과 함께 수행)*
- [x] 12.7 관리자 공식 일정 목록 만료 일정(`end_date < today`) 표시 제외 및 필터링 강화 (2026-10-19)
  - 대상 파일: `src/app/admin/page.tsx`, `src/app/admin/page.test.tsx`
  - 작업:
    1. `fetchSchedules`에서 `getKstToday`로 KST 오늘 날짜를 구하고 Supabase 조회에 `.gte("end_date", today)` 필터 적용.
    2. 응답 데이터에 대해 클라이언트 측 `.filter((s) => s.end_date >= today)` 방어 로직을 적용하여 공식 일정 목록, 탭 배지 카운트, 게임 필터 카운트, 페이지네이션에서 만료된 일정 제외.
    3. `src/app/admin/page.test.tsx`에 `gte` 모의 메서드 지원 및 만료 일정 제외/카운트 단위 테스트 추가.
  - verify: `src/app/admin/page.test.tsx` 단위 테스트(12개) 통과, `npx tsc --noEmit` 0 에러, Vitest 42개 파일 253개 테스트 100% 통과.
- [x] 12.8 관리자 페이지 중복 네비게이션 정리 및 [지난 일정] 조회·관리 모달 구현 (2026-10-19)
  - 대상 파일: `src/app/admin/page.tsx`, `src/app/admin/requests/page.tsx`, `src/app/admin/page.test.tsx`
  - 작업:
    1. **중복 네비게이션 배너 정리**: `AdminLayout` 상단 헤더 탭([일정 관리] / [요청 관리])과의 중복을 해소하기 위해 `/admin` 및 `/admin/requests` 본문 상단 배너 박스(데이터 제안 대기열/관리자 콘솔 바로가기) 제거.
    2. **[지난 일정] 조회 및 관리 모달(`Dialog`) 신설**: 공식 일정 관리 툴바에 [지난 일정] 버튼(`History` 아이콘)을 추가하고, 클릭 시 Supabase `.lt("end_date", today)` 쿼리로 만료된 과거 일정 목록 로드.
    3. **다이얼로그 내 탐색 및 관리 연동**: 게임별 필터링, 검색, 8개 단위 페이지네이션(`PAST_SCHEDULES_PER_PAGE = 8`) 지원 및 카드별 [수정]·[삭제] 버튼을 기존 수정 폼 모달 및 삭제 확인 모달과 안전하게 연동(`returnToPastModal` 플래그로 완료/취소 시 지난 일정 모달 복귀 및 목록 자동 갱신).
    4. **테스트 및 검증**: `src/app/admin/page.test.tsx`에 `lt` 쿼리 모킹 및 지난 일정 모달 오픈/필터링/수정/삭제 단위 테스트 추가.
  - verify: `src/app/admin/page.test.tsx` 15개 단위 테스트 통과, Vitest 42개 파일 / 256개 테스트 전체 통과 (100% PASS), `npm run build` 정적 15개 페이지 export 빌드 성공.
- [x] 12.9 Google OAuth 로그인 버튼 디자인 개선 및 OAuth 콜백 화면 디자인 시스템 통일 (2026-10-19 ~ 2026-10-20)
  - 대상 파일: `src/app/auth/page.tsx`, `src/app/auth/callback/page.tsx`, `src/app/auth/page.test.tsx`, `src/app/auth/callback/page.test.tsx`
  - 작업:
    1. **Google OAuth 로그인 버튼 디자인 및 UI 피드백 개선**: Google 공식 브랜드 가이드라인에 부합하는 4색(Blue, Green, Yellow, Red) 'G' 멀티컬러 SVG 아이콘 적용, 로그인 진행 시 회전 스피너(`Loader2 animate-spin`) 및 `"Google 연결 중..."` 텍스트 노출과 `disabled` 처리로 중복 클릭 방지.
    2. **OAuth 콜백 화면 디자인 시스템 통일 및 카드 레이아웃 개선**: `/auth/callback` 페이지를 앱 전역 다크 테마(`data-theme="dark"`, `bg-app`, `text-content`) 및 `Card` 중앙 레이아웃으로 일원화. "ChronoLedger" 브랜드 타이틀/서브카피, `Loader2` 회전 스피너, 진행 상태 문구(`role="status"`, "Google 인증을 확인하고 있습니다..."), 에러 발생 시 경고 카드(`role="alert"`, `AlertCircle`) 및 [로그인 화면으로 돌아가기] 버튼 제공.
  - verify: 단위 테스트 보강 (`auth/page.test.tsx`, `auth/callback/page.test.tsx`), Vitest 42개 파일 / 260개 테스트 전체 통과 (100% PASS), `npm run build` 정적 15개 페이지 export 빌드 성공.
- [x] 12.10 모바일 달력 타일 도트 아이콘 우측 상단 세로 정렬 개선 (2026-10-20)
  - 대상 파일: `src/components/calendar/desktop-calendar.tsx`, `src/components/calendar/desktop-calendar.test.tsx`
  - 작업: 모바일 달력 타일 우측 상단 도트 컨테이너 클래스를 기존 가로 정렬(`flex md:hidden items-center gap-0.5 sm:gap-1 shrink-0 pt-0.5`)에서 데스크톱과 일치하는 세로 정렬(`flex md:hidden flex-col items-end gap-1 shrink-0 pt-0.5`)로 변경하여 버전/픽업/콘텐츠/메모 도트가 우측 상단에 수직으로 깔끔하게 나열되도록 설정.
  - verify: 모바일 도트 컨테이너 클래스(`flex-col`, `items-end`, `gap-1`) 단위 테스트 보강(`desktop-calendar.test.tsx`), Vitest 42개 파일 260개 테스트 100% PASS, Next.js 14 정적 빌드(`npm run build`) 성공.
- [x] 12.11 모바일 화면 UI 오버플로우 해결 (수동 보정 내역 모달, 관리자 페이지네이션, 소비 페이지 픽업 과금 분석 카드) (2026-10-26)
  - 대상 파일: `src/components/ui/dialog.tsx`, `src/components/wallet/store-wallet-adjust-history-modal.tsx`, `src/app/admin/page.tsx`, `src/app/dashboard/expenses/page.tsx`
  - 작업:
    1. **모달(`DialogContent` & `StoreWalletAdjustHistoryModal`) 모바일 화면 이탈 해결**:
       - `DialogContent`의 grid 직계 자식 `min-width: auto` 팽창 방지를 위해 `grid-cols-1 overflow-x-hidden p-4 sm:p-6` 적용.
       - `StoreWalletAdjustHistoryModal`의 `DialogContent`에 `w-[calc(100%-1.5rem)] sm:max-w-2xl overflow-x-hidden` 보강, 헤더 텍스트 래퍼에 `pr-7 min-w-0` 및 `break-words` 적용으로 우측 상단 닫기(`X`) 버튼 겹침 방지.
       - 플랫폼 필터 바 컨테이너를 `flex-wrap min-w-0`으로 변경하여 모바일에서 '네이버페이' 버튼 잘림 해결.
       - 내역 리스트 영역과 개별 레코드 카드에 `min-w-0`, 사유 텍스트 `break-words`, 보정 후 잔액 영역 `shrink-0` 적용.
    2. **관리자 페이지(`/admin`) 공식 일정 및 게임 목록 페이지네이션 반응형 개선**:
       - 페이지네이션 래퍼를 `flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 max-w-full`로 변경.
       - 페이지 번호 버튼 컨테이너를 `flex flex-wrap items-center justify-center gap-1`로 변경하고, 번호 버튼 크기를 모바일 `h-7 w-7 sm:h-8 sm:w-8 p-0 text-xs`, 이전/다음 버튼을 `h-7 sm:h-8 px-1.5 sm:px-2 text-xs`로 최적화.
    3. **소비 페이지(`/dashboard/expenses`) 픽업별 과금 분석 & 순위 카드 반응형 개선**:
       - 페이지 최상위 컨테이너에 `w-full overflow-x-hidden` 추가로 모바일 가로 스크롤/쏠림 원천 차단.
       - `게임 픽업별 과금 분석` 카드 내부 좌측 차트 영역(`lg:col-span-7`) 및 우측 순위 카드 영역(`lg:col-span-5`)에 `min-w-0 w-full overflow-hidden` 적용.
       - 픽업 순위 리스트 행 좌측 영역을 `flex items-center gap-2 min-w-0 flex-1 overflow-hidden`으로 수정하여 긴 픽업 이름과 `동시 픽업` 배지가 카드 우측을 밀어내지 않고 말줄임(`truncate`)되도록 보완.
       - 지출 내역 및 구독 탭 하단 페이지네이션 컨테이너에 `flex-wrap justify-center` 추가.
  - verify: 단위 테스트(`store-wallet-adjust-history-modal.test.tsx`, `dashboard/expenses/page.test.tsx`) 통과.

- [x] 12.12 구글 플레이 포인트 적립 누락 해결 및 1포인트당 n배(0.1% × n) 고정 부스트 수식 재설계 (2026-10-26)
  - 대상 파일: `src/lib/payment-calculations.ts`, `src/lib/payment-calculations.test.ts`, `src/components/expense/expense-modal.tsx`, `src/components/expense/expense-modal.test.tsx`, `src/app/dashboard/expenses/page.tsx`, `sql/SCHEMA.sql`, `sql/MIGRATION_STORE_EVENT_EARN.sql`
  - 작업:
    1. **포인트 미사용 결제 시 스토어 포인트 적립 누락 버그 해결**: `ExpenseModal`에서 `usedPoints === 0`일 때도 `pointPlatform: activePointPlatform`을 정상 전달하여 `process_expense_payment` RPC 적립 누락 차단. 예정 지출 등록/수정 시 `point_platform` 보존 및 모달 재오픈 복원 연동.
    2. **구글 플레이 부스트 고정 적립률(`0.1% × n배`) 재설계**: 등급 무관 기본 1,000원당 `n`P(`0.1% × n배`)로 고정 계산하도록 `calculateStoreEventEarn` 수식 재설계 및 안내 UI 문구 명확화.
    3. **스토어 지갑 미생성 안전망 보강**: `process_expense_payment` RPC에서 스토어 지갑 미생성 시 기본 등급(`BRONZE` / `GENERAL`)으로 자동 생성(`ON CONFLICT DO NOTHING`) 후 적립 처리.
    4. **단위 테스트 및 빌드 검증**: 변경 수식 및 모달 전달 파라미터 단위 테스트 보강.
  - verify: Vitest 42개 파일 262개 테스트 통과, 정적 빌드(`npm run build`) 성공 (커밋 `7307b99`, Gemini 4 Argon 코드 리뷰 통과).

- [x] 12.13 게임별 상시 메모 기능 추가 (/dashboard/games 구독 게임 카드 연동 및 user_games.memo 확장) (2026-10-27)
  - 대상 파일: `sql/SCHEMA.sql`, `sql/MIGRATION_USER_GAME_MEMO.sql`, `src/app/dashboard/games/page.tsx`, `src/app/dashboard/games/page.test.tsx`
  - 작업:
    1. **DB 스키마 확장 및 마이그레이션**: `user_games` 테이블에 `memo TEXT` 컬럼 추가 (`sql/MIGRATION_USER_GAME_MEMO.sql` 및 `sql/SCHEMA.sql` 반영).
    2. **구독 게임 상시 메모 다이얼로그(`Dialog`) UI 구현 및 카드 높이 균일화**: `UserGameRow`에 `memo` 필드 추가, 상시 메모 작성/수정 방식을 `[일정 보기]`와 일관된 중앙 팝업 다이얼로그로 개편(`h-56` 세로 스크롤 `Textarea`), 카드 내부 메모 영역 `h-20 overflow-y-auto` 적용으로 그리드 카드 높이 균일 유지, `trim` 후 빈 문자열은 `null` 저장, 본인 소유(`eq("id", ug.id).eq("user_id", user.id)`) 안전 갱신 및 로컬 상태 동기화.
    3. **모바일 반응형 보강**: 구독 게임 목록 하단 페이지네이션에 `flex-wrap justify-center` 적용.
    4. **단위 테스트 보강**: 상시 메모 표시, 신규 작성 및 trim 저장, 비우기(null) 저장, 취소 시 미호출, 저장 실패 시 안내 및 편집 유지 등 5개 단위 테스트 케이스 추가.
  - verify: Vitest 42개 파일 267개 테스트 100% 통과, 정적 빌드(`npm run build`) 성공 (커밋 `53fbd26`, `d75310d`, Gemini 4 Argon 코드 리뷰 통과).

- [x] 12.14 모바일 캘린더 배경 커스터마이징 팝오버 화면 이탈 해결 및 모바일 배경 이미지 리사이징 최적화 (2026-10-28, `f272bfd`)
  - 대상 파일: `src/components/calendar/calendar-bg-customizer.tsx`, `src/components/calendar/desktop-calendar.tsx`, `src/lib/calendar-bg-storage.ts`
  - 작업:
    1. 모바일에서 캘린더 헤더 줄바꿈(flex-wrap) 시 좌측 끝에 위치한 [배경 설정] 버튼의 팝오버(absolute right-0)가 화면 좌측 바깥으로 잘리는(overflow-hidden 클리핑) 문제를 해결 (모바일 좌측 기준 정렬 left-0 sm:left-auto sm:right-0 또는 모바일 중앙 모달/고정 위치 적용).
    2. 현재 데스크톱 가로형 고정 해상도(1920×1080)로만 동작하는 compressCalendarBgImage / calculateScaledDimensions 리사이징 로직을 점검하여, 모바일 뷰포트 및 세로형 이미지 비율에 맞춘 리사이징·표시 최적화 적용.
  - verify: 모바일(360px~412px) 및 데스크톱 뷰포트에서 배경 설정 패널 위치·리사이징 단위 테스트 통과.
  - 결과: 팝오버 `left-0 sm:left-auto sm:right-0` 적용, `calculateScaledDimensions`가 세로형 이미지는 1080×1920 상자로 축소(예: 1080×1920 원본 유지, 1440×3200 → 864×1920). 팝오버 정렬·리사이징 단위 테스트 추가. 실기기 시각 확인은 미수행.

- [x] 12.15 Supabase SQL Editor 실행용 SQL 문서(sql/*.sql) 분류 및 통합·정리 (`완료` - 커밋 `cee2b76`, Claude Opus)
  - 대상 파일: `sql/*.sql` (현재 `SCHEMA.sql`, `MIGRATION_*.sql` 등 16개 파일), `supabase/migrations/`
  - 작업: SQL Editor 입력을 위해 생성했던 산재된 마이그레이션·패치·시드·더미·테스트 SQL 문서들을 역할별(① 최신 통합 마스터 스키마, ② 미적용/운영 마이그레이션, ③ 시드·더미·스모크 테스트, ④ 아카이브)로 분류·통합하고 실행 순서 가이드를 정리.
  - verify: 통합된 SQL 스크립트의 문법·멱등성 점검 및 문서 참조 경로 동기화.
  - 결과: `sql/{migrations,seed,tests,archive}/` 분류, [`sql/README.md`](../sql/README.md) 작성. PGlite 빈 DB에서 SCHEMA 적용·migrations 2회 멱등·seed PASS. SCHEMA 신규 설치 결함 3건 수정. `supabase/migrations/`는 CLI 이력 때문에 유지.
- [ ] 12.15-F1 `sql/tests/TESTS.sql` WAL-01 이후 단언을 현행 결제/적립 RPC에 맞게 갱신
  - 현재 WAL-01이 "WALLET 결제 무적립"을 기대하나 현행 `process_expense_payment`는 포인트 플랫폼 지정 시 적립. 적립 규칙(SRS) 확정 후 기대값 수정, 이후 단계도 순차 점검. 담당 후보: GPT Codex (대체: Claude Opus).
- [ ] 12.15-F2 원격 DB 정합성 점검: `sql/README.md` B표 확인 쿼리 실행(특히 9개 인자 `process_expense_payment` 잔존 여부), 필요 시 `migrations/` 적용 후 `src/types/database.types.ts` 재생성

- [x] 12.16 공식 일정 보기에서 "/" 구분자 입력 시 자동 줄바꿈 표시 (2026-10-28)
  - 대상 파일: `src/app/dashboard/games/page.tsx`, `src/app/dashboard/games/page.test.tsx`
  - 작업: 게임 페이지([일정 보기] 공식 일정 중앙 팝업 다이얼로그)에서 `sch.title` 및 `sch.memo`에 "/"가 포함된 경우 `split("/").map(part => part.trim()).filter(Boolean)`으로 분리하여 각 줄 단위 블록(`span className="block"`)으로 줄바꿈 렌더링하도록 개선.
  - verify: `src/app/dashboard/games/page.test.tsx` 단위 테스트 통과 (13개 테스트 PASS).

- [x] 12.17 모바일 PWA 설치 시 홈 화면 및 Android WebAPK 앱 표시 이름 `ChroLog` 단축 및 SW v5 갱신 (2026-10-28 ~ 2026-10-29)
  - 대상 파일: `public/manifest.json`, `public/sw.js`, `src/app/layout.tsx`, `src/components/pwa/sw.test.ts`
  - 작업: 모바일 Chrome 및 Android WebAPK 설치 창/홈 화면에서 `ChronoLedger`가 `ChronoLe...`로 끊어지는 문제를 원천 해결하기 위해 `manifest.json`의 `name`과 `short_name`을 모두 `"ChroLog"`로 동기화하고 `description`은 `"ChronoLedger - 게임 일정 및 지출 관리 매니저"`로 보완. `layout.tsx`의 `appleWebApp.title`도 `"ChroLog"` 유지. 모바일 브라우저의 서비스 워커 및 캐시된 `manifest.json`을 강제 갱신하기 위해 `public/sw.js`의 `SHELL_CACHE` 버전을 `"chronoledger-shell-v5"`로 증가.
  - verify: `src/components/pwa/sw.test.ts` 단위 테스트(SHELL_CACHE v5 및 manifest name/short_name 단언) 추가 및 통과, 정적 빌드(`npm run build`) 통과.

- [x] 12.18 모바일 대시보드(`/dashboard`) 선택일 상세 드로어(`MobileDrawer`) 오픈 시 스마트폰 내장 뒤로 가기 연동 (2026-10-28, `f272bfd`)
  - 대상 파일: `src/components/calendar/mobile-drawer.tsx`, `src/app/dashboard/page.tsx`, `src/components/calendar/mobile-drawer.test.tsx`
  - 작업: 모바일 환경에서 선택일 상세 드로어(`MobileDrawer`)가 열린 상태에서 스마트폰 내장(하드웨어/제스처) 뒤로 가기 실행 시, 이전 페이지(소비, 게임, 관리자 등)로 라우트가 이탈하지 않고 선택일 상세 드로어만 닫혀 달력 타일 화면으로 돌아가도록 브라우저 History API(`window.history.pushState` 및 `popstate` 이벤트) 연동. 사용자가 드로어를 딤 클릭/스와이프로 직접 닫을 때는 푸시된 히스토리 엔트리를 정리(`history.back()`)하여 히스토리 정합성 보장.
  - verify: 드로어 오픈 후 `popstate` 발생 시 페이지 이동 없이 드로어 닫힘 동작 단위 테스트 통과.
  - 결과: `mobile-drawer.tsx`에 `useDrawerHistory` 훅 추가(`dashboard/page.tsx` 변경 불필요). Next.js App Router `history.state`(`__NA`) 보존, 직접 닫기 시 `history.back()` 후 popstate 1회 무시, back 처리 중 재오픈 시 popstate 도착 후 push. 단위 테스트 5건 추가. 실기기 Android 뒤로 가기 확인은 미수행.

- [x] 12.19 소비 페이지(`/dashboard/expenses`) 카테고리별 지출 비중 클릭 시 카드 내부 하단에 해당 카테고리 확정 지출 내역 펼침 표시 (`완료` - 커밋 `dd01401`, Claude Sonnet)
  - 대상 파일: `src/app/dashboard/expenses/page.tsx`, `src/app/dashboard/expenses/page.test.tsx`
  - 작업 (구체화 확정안):
    1. **클릭 및 토글 인터랙션**: `[카테고리별 지출 비중]` 카드 내 원그래프 조각(`Pie` `Cell`) 또는 하단 `["카테고리 이름" n%]` 범례 버튼을 클릭하면 `selectedCategory` 상태가 활성화되며, 선택된 카테고리를 재클릭하거나 닫기 버튼을 누르면 펼쳐진 목록이 접힘(토글).
    2. **카드 내부 하단 아코디언 리스트 표시**: `[카테고리별 지출 비중]` 카드 내부 하단(`["카테고리 이름" n%]` 그리드 아래)에 선택된 카테고리의 지출 내역 리스트 섹션을 즉시 펼쳐서 표시 (카테고리명, 총 건수·합계 금액 헤더, 닫기 버튼, 내부 스크롤 리스트 `max-h-60 overflow-y-auto`, 개별 항목 클릭 시 `ExpenseDetailModal` 상세 모달 연동).
    3. **집계 기준 일치**: 원그래프 통계 집계 기준과 동일하게 최근/과거 7일 구분 없이 **`status === "CONFIRMED"`(확정 지출)** 상태인 해당 카테고리 내역만 최신순(`target_date` 내림차순)으로 모아 표시.
  - verify: 원그래프/범례 버튼 클릭 시 카드 내부 하단에 해당 카테고리의 `CONFIRMED` 지출 내역만 펼쳐지고 재클릭 시 닫히는 단위 테스트 통과.
  - 결과: `selectedCategory` 상태 관리, 원그래프 조각 및 범례 클릭 토글, 카드 내부 하단 아코디언 내역(헤더 건수/합계/닫기, `max-h-60` 스크롤, `CONFIRMED`만 `target_date` 내림차순), `ExpenseDetailModal` 연동 완료. 접근성(`aria-pressed`, `aria-label`) 적용 및 신규 단위 테스트 2건 추가(`dashboard/expenses/page.test.tsx`, 전체 270개 테스트 통과).

- [x] 12.20 대시보드 홈(`/dashboard`) 선택일 게임 일정 표시 조건(`start_date`/`end_date` 일치) 및 전체 진행 일정 토글 + 정렬 변경
  - 대상 파일: `src/components/calendar/hero-sidebar.tsx`, `src/app/dashboard/page.tsx`, `src/components/calendar/hero-sidebar.test.tsx`
  - 작업 (세부 확정 사양):
    1. **기본 표시 조건 (토글 OFF)**:
       - `VERSION` 일정: `s.start_date === selectedDateLabel`일 때만 표시 (`end_date`에는 표시하지 않음).
       - 그 외 일정(`PICKUP`, `CONTENTS` 등): `s.start_date === selectedDateLabel || s.end_date === selectedDateLabel` (선택일과 시작일 또는 종료일이 일치하는 일정)만 표시.
    2. **진행 중 전체 보기 토글 (토글 ON)**:
       - 선택일 상세 카드 내 `게임 일정` 탭 상단에 토글 버튼을 추가하고, 활성화 시 `VERSION` 일정을 포함한 모든 일정(`VERSION`, `PICKUP`, `CONTENTS`)에 대해 `s.start_date <= selectedDateLabel && selectedDateLabel <= s.end_date`인 진행 중 일정을 모두 표시.
    3. **정렬 기준 변경**:
       - 기본 1차 정렬을 `start_date` **내림차순**(`b.start_date.localeCompare(a.start_date)`)으로 변경하고, 동일 `start_date` 내에서는 `end_date` **오름차순**(`a.end_date.localeCompare(b.end_date)`)으로 정렬.
  - verify: `src/components/calendar/hero-sidebar.test.tsx`에 기본 표시(`VERSION` 시작일만, 타 일정 시작/종료일만), 토글 활성화 시 `VERSION` 포함 전체 진행 일정 표시, `start_date DESC` + 동일 시작일 `end_date ASC` 정렬 단위 테스트 통과.

- [x] 12.21 소비 페이지 `게임 픽업별 과금 분석`을 `게임 카테고리별(게임별) 과금 분석`으로 변경 및 픽업 배너 연결 제거(경량화)
  - 대상 파일: `src/app/dashboard/expenses/page.tsx`, `src/components/expense/expense-modal.tsx`, `src/components/expense/expense-detail-modal.tsx`, `src/app/dashboard/expenses/page.test.tsx`, `src/components/expense/expense-modal.test.tsx`
  - 작업 (세부 확정 사양):
    1. **지출 모달(`expense-modal.tsx`) 픽업 배너 연결 제거 및 버전 일정 유지**:
       - `연결된 버전 일정` 및 `버전 패스형(버전 종료일까지 결제 유예)` 기능은 그대로 유지.
       - `연결된 픽업 일정` UI 및 픽업 배너 연결 관련 상태·로직(`pickupSchedules`, `pickupScheduleId`, `manualPickupId`, `availablePickups`, `versionPickups`, `ALL_CURRENT`, `[PICKUPS:...]` 메모 태그 합성 등)을 전면 제거하고 `pickup_schedule_id`는 `null`로 처리(DB 스키마 하위 호환 유지).
       - `expense-detail-modal.tsx`에서도 `pickupTitle` 표시 줄 제거.
    2. **소비 페이지(`expenses/page.tsx`) `게임별 과금 분석` 전환 및 쿼리 경량화**:
       - 기존 `게임 픽업별 과금 분석` 카드를 `게임별 과금 분석`(게임 카테고리 과금 통계)으로 변경하여, `status === "CONFIRMED"`이고 `category === "게임"`인 확정 지출을 게임별(`game_id` / `games.name`, 미지정 시 `'미지정(기타)'`)로 합산·내림차순 정렬해 가로 막대 차트 및 과금 순위·비중 카드로 표시.
       - 불필요해진 `loadSchedules()`(`game_schedules` 조회), `schedulesMap`, `getExpensePickupIds` 로직을 제거하여 초기 로딩 경량화.
  - verify: 지출 모달 및 소비 페이지 단위 테스트(`expense-modal.test.tsx`, `expenses/page.test.tsx`) 갱신 및 100% 통과.

- [x] 12.22 AI 전용 지침 문서 영문화(토큰 절감) 및 한국어 원본(`*-ko.md`) `docs/archive/agent-rules-ko/` 분리 보관 (`완료` - Gemini 3.8 Flash)
  - 대상 파일: `CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md`, `.agents/rules/*.md` (5종), `.agents/skills/*/SKILL.md` (4종), `docs/archive/agent-rules-ko/*-ko.md`
  - 작업 (세부 확정 사양):
    1. **한국어 원본 아카이빙**: 에이전트 자동 스캔 경로(`.agents/`) 바깥인 `docs/archive/agent-rules-ko/` 폴더를 생성하고, 기존 한국어 지침 문서 8종의 원본을 `*-ko.md` 이름으로 일괄 보관하여 중복 로드를 원천 차단 (`README.md` 작성).
    2. **AI 전용 지침 영문 재작성**: `CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md`, `.agents/rules/*.md`, `.agents/skills/*/SKILL.md`를 의미 손실 없이 간결한 영문(English)으로 작성하여 매 턴 시스템 프롬프트 토큰 소모량을 절감.
    3. **사용자 소통 및 운영 문서 한국어 유지**: `.agents/rules/language.md`에 사용자 대면 응답·보고 및 `ask_question` 질의/선택지는 반드시 한국어(`Korean`)로 작성하도록 명시하고, 사용자가 직접 열람하는 `docs/` 운영 문서(`handoff.md`, `to-do.md`, `progress.md`, `changelog.md`, `collaboration-guide.md`, `docs/spec/*`)는 한국어를 유지.
  - verify: `docs/archive/agent-rules-ko/` 원본 보존 확인, 영문 지침 링크 및 `markdownlint-cli` 0 errors 통과.
  - 결과: `docs/archive/agent-rules-ko/`에 한국어 원본 8종 및 `README.md` 보관, 활성 지침 영문 전환(`CLAUDE.md` 7~11행 un-backticked `@.agents/rules/...` 임포트 준수), `markdownlint-cli` 0건 통과.

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
- [ ] R10. 대시보드 홈(/dashboard) 선택일 게임 일정 표시 조건(start_date/end_date 일치, VERSION은 end_date 제외) 및 전체 진행 일정 토글 + 정렬(start_date 내림차순, 동일 시작일 end_date 오름차순) 변경
- [ ] R11. 소비 페이지 게임 픽업별 과금 분석을 게임별 과금 분석으로 변경 및 지출 모달 내 픽업 배너 연결 제거(버전 일정/패스 유예는 유지)
- [x] R12. AI 전용 지침 문서(CLAUDE.md, AGENTS.md, .agents/**, .github/**) 영문화 및 한국어 원본(*-ko.md) docs/archive/agent-rules-ko/ 분리 보관 (`완료` - Gemini 3.8 Flash 완료)
- [ ] R13. 게임별 보유 캐릭터 체크 및 캐릭터 조합 프리셋 저장 기능 (장기 백로그 / 기획 검토)

---

## 후속 단계: Windows Tauri 데스크톱 통합 (Web/PWA MVP 완료 후)

- [ ] T1. 웹/Tauri 플랫폼 차이를 auth adapter로 분리하고 공통 callback/session 계약을 고정한다.
- [ ] T2. Tauri v2 custom scheme 및 외부 브라우저 OAuth를 연결한다. cold-start URL은 `getCurrent()`로 처리하고 Windows 실행 중 링크 전달을 위해 single-instance plugin을 구성한다.
- [ ] T3. OAuth 성공·취소·만료 세션 및 로그아웃 복귀를 Windows 데스크톱에서 검증한다.
- [ ] T4. Tauri v2 Windows production build를 만들고 단독 실행해 로그인, 캘린더, 결제 흐름을 검증한다.
- 완료 게이트: Web/PWA MVP 조건이 통과되고, 동일 기능의 데스크톱 인증/핵심 흐름 테스트가 통과한 뒤 Windows 앱 배포를 승인한다.
