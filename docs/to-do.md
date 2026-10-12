# 구현 체크리스트 (to-do.md)

현재 작업 우선순위와 완료 상태의 단일 기준 문서다. [Gemini 진행 기록](to-do_Gemini.md)은 별도 작성 이력으로 보존하며, 이 체크리스트와 상태가 다르면 이 문서 및 검증 가능한 구현/테스트 증거를 우선한다.

## Phase 0. SRS 및 설계 진입 게이트
- [x] 0.1 예정 취소/복구와 환불 상태 전이를 분리하고 물리 삭제 금지 정책 및 RPC 경로를 명세했다.
- [x] 0.2 앱 예상 적립식을 `floor(final_amount * rate / 100)`으로 정하고 공식 정산 비보장 및 수동 보정 정책을 명세했다.
- [x] 0.3 일정-게임 일치, 템플릿 소유권 및 게임 일치 검증 규칙을 명세하고 SQL 트리거 초안을 추가했다.
- [x] 0.4 만료 예정 지출과 온라인 강제 처리, 오프라인 캐시 읽기 선택을 명세했다.
- [x] 0.5 가입 시 초기 재무/지갑 기본값과 멱등 초기화 트리거 초안을 추가했다.
- [x] 0.6 SRS 작성·사용자 승인 및 SQL 실행 검증 완료. 설계 단계 진입을 승인한다.
  - 참고: [SRS 초안](../md/SRS.md), [이전 준비도 검토](../md/srs-readiness-review.md), [차단 항목 설명](../md/planning-blockers.md), [결정안 검토](../md/resolved-blockers-review.md). 검토 기록은 당시 상태의 이력이며 최신 기준은 SRS/결정 보완이다.
  - 현황: SRS 검토와 사용자 승인은 완료됐다. 사용자가 확인한 전용 테스트 프로젝트의 스키마 메타데이터를 대조했고, 승인한 `user-icons` 버킷(private, 102,400 bytes, `image/webp`) 설정도 검증했다. 사용자는 [`md/TESTS.sql`](../md/TESTS.sql)을 `ON_ERROR_STOP=1`로 실행해 `PASS: all smoke-test fixtures and mutations rolled back` 최종 메시지를 확인했다. 따라서 스크립트의 선행 스모크 검증이 오류 없이 완료되고 테스트 변경이 롤백된 것으로 판정한다. Phase 0 게이트를 통과해 설계 단계 진입을 승인한다. 이 스모크 테스트는 전체 SRS 수용 기준을 모두 망라하지 않으므로 상세 케이스는 설계/테스트 계획에서 추적한다. 전체 DDL은 재실행하지 않는다.

## 구현 우선순위: Web/PWA 먼저

- 과제 제출 조건은 적용하지 않는다. 개인 프로젝트로서 승인된 SRS/SPEC/SCHEMA를 기준으로 진행하며, SQLite·별도 Node.js 웹서버·게시판 요구사항을 추가하지 않는다.
- 현재 구현 목표는 웹사이트 기능을 우선 완성하는 것이다. Android PWA 실기기 인증 검증은 사용자의 요청으로 후순위에 보류하지만 제품 범위에서 제외하지 않는다.
- Windows Tauri 지원 결정은 SRS대로 유지하되, 외부 OAuth/딥링크 및 Windows 패키징은 Web/PWA MVP 승인 뒤 진행한다. 기존 Tauri 뼈대와 작업은 보존하며, 웹 기능을 Tauri 전용 API에 직접 결합하지 않는다.
- 웹 MVP 종료 조건: 이메일/Google 브라우저 인증 및 callback, 인증된 핵심 화면, 가계부·캘린더·설정 주요 흐름, RLS 연동과 재현 가능한 기능 검증을 완료하고 필수 수용 기준을 확인한다. Android PWA 실기기 설치/인증 검증은 별도 후속 검증으로 둔다.
- 데스크톱 OAuth 구현은 별도 adapter 경계로 미룬다. 웹 callback 구현은 지금 완성하며, 이후 Tauri custom scheme callback이 같은 세션 경계에 연결되도록 설계한다.

## 상세 설계 문서

- [x] 승인 SRS/SPEC/SCHEMA를 런타임 경계, 데이터 책임, RPC 계약, 주요 흐름, 보안, 오류 및 검증 추적으로 연결하는 [상세 설계](detailed-design.md) 초안을 작성했다.
- [x] 모바일·데스크톱 앱의 구체 릴리스 버전 번호와 시점/구성은 미결정으로 유지한다. 기존 결정인 Android PWA + Windows Tauri v2, 단일 Next.js 코드베이스/Tauri 정적 export, Web/PWA 우선 순서는 그대로 유지한다. **Netlify 배포 시 Web/Desktop 이중 빌드 분리는 하지 않고 단일 정적 export를 유지하기로 결정했다.**
- [ ] 남은 상세 설계 항목: 게임 구독 해제의 내구성 있는 Storage 정리 worker, UI/접근성 제안 검증. 실패 시 재시도 간격을 늘리고 Storage 정리 후에만 `user_games` 행을 제거한다. 게임 정리 중에는 목록에 “삭제 처리 중”으로 표시한다. 계정별 IndexedDB 캐시는 고정 TTL 없이 마지막 동기화 시각을 표시하고, 네트워크 복귀 때 즉시 재조회하며 로그아웃/세션 만료 때 삭제한다.
- [ ] SRS 수용 기준별 세부 테스트 케이스와 성능 측정 환경·목표를 릴리스 검증 자료로 구체화한다. 기준 기기는 중급 Android 실기기로 정했다.

## 설계 자료 검토 및 협업 파이프라인

- [ ] 파이프라인 v2 이식 결정: (1) 설계 단계 Antigravity/Gemini 사용과 전송 승인 정책, (2) Codex/OpenCode 정식 역할 여부, (3) 참고 문서로만 둘지 가이드·Orchestrator에 반영할지, (4) Docker/VM 격리 환경 준비 여부. 상세는 [이식 검토](ChronoLedger_pipeline_v2_porting_review.md).

- [x] UI 디자인 시트와 한국어 HTML 목업을 SRS와 대조하고 아키텍처/구현 체크리스트에 참조를 추가했다.
- [x] VS Code GitHub Copilot 저장소 지침과 Maker/Reviewer 프로필을 추가하고 사용자 안내를 연결했다. 기존 `.github/agents/*.agent.md` 파일은 Antigravity 전환 실험 시 `.bak`으로 보존했다.
- [ ] Antigravity가 `.agents/rules/language.md` 및 Maker/Reviewer/Orchestrator skills를 인식하고 호출하는지 확인한다. 실제 도구 권한·격리 동작도 별도로 점검한다.
- [ ] 실제 변경 커밋이 존재할 때 같은 Base/Target SHA를 사용해 Copilot Reviewer를 실행하고, 결과를 review JSON 스키마로 검증한다. Reviewer 권한 제한과 run 아티팩트 기록 절차도 확인한다.
- [x] 대시보드·지출·통계 반응형 시안을 만들고 주요 화면 구성과 반응형 동작을 브라우저에서 검증한다. 사용자는 대시보드 그래프 제외, 데스크톱 표/모바일 그룹 카드, 아이콘 전체 표시, 월별 세로 막대/분류별 가로 막대를 결정했다.
- [x] 시안 검토 후 글자 크기, 쿨 뉴트럴 라이트 팔레트/대비, 기존 다크 팔레트, 그림자, 빈 상태와 보조 피드백 문체를 확정해 UI 디자인 시트·상세 설계에 기록했다.
- [x] A2z 제작자 페이지의 SIL OFL 1.1 및 눈누의 상업 사용/수정/재배포 허용 안내를 확인했다. 재배포 시 저작권 고지와 OFL 전문이 필요하며, 폰트 자체 단독 판매는 허용되지 않는다.
- [x] A2Z의 내장 저작권 표기와 SIL OFL 1.1을 확인하고 9개 WOFF2 굵기를 시안 및 웹 앱에서 자체 호스팅한다. 두 배포 위치에 OFL 전문을 동봉한다.
- [x] 업데이트된 시안을 양 테마와 390/900/1280px에서 재검증해 가로 넘침과 주요 반응형 패널 위치를 확인했다.
- [ ] 제품 UI 구현 시 키보드/스크린리더와 컴포넌트별 대비를 점검한다.
  - 진행: 로그인 폼의 이름·제목 구조·키보드 초점·44px 입력/48px 버튼 및 주요 텍스트/초점 대비를 확인했다. dashboard 접근성 상태는 코드 수준으로 보완했다.
  - 남음: 실제 NVDA/VoiceOver 실행, 인증된 dashboard 동작 점검, 이후 구현될 화면의 접근성/대비 검증.
- [ ] 사용자는 Netlify를 우선 후보로 고려한다. [`Netlify_Web_Architecture_Proposal.md`](Netlify_Web_Architecture_Proposal.md)의 2026-10-07 재검토 권고에 따라 우선 현재 `output: 'export'` 산출물을 Deploy Preview에서 검증한다. 정적 경로가 웹 요구를 막는 증거가 나오기 전에는 Web/Desktop 이중 빌드나 SRS 변경을 하지 않는다.
- [ ] Netlify 후보 확인: 정적 export 산출물과 `/auth` 하위 경로, Google OAuth callback/Redirect URL, PWA service worker 및 Preview/Production 환경 변수 분리를 작은 검증 브랜치에서 확인한다. 결과가 확인되기 전까지 Netlify는 채택 확정이 아니다.
  - 로컬 검증: 앱 브랜치에서 일반 `npm run build` 성공, `/`, `/auth`, `/auth/callback`, `/dashboard` 정적 HTML 및 참조 자산 생성 확인, OAuth callback 테스트 5개 통과.
  - 원격 정적 경로 검증: `chronoledger-validation-20261007` Draft Deploy(Production 아님)에서 사용자가 로그인 화면, `/auth`, callback 안내, 비로그인 `/dashboard` → `/auth` 보호 동작을 확인했다. 비인증 HTTP 요청은 Netlify Edge Access에 의해 401이며 예상된 사이트 접근 제한이다.
  - Draft Deploy는 GitHub 자동 배포에 연결되지 않았다. 추후 Git 연동/PR Deploy Preview 설정은 Production branch 배포를 시작하지 않는 방식으로 별도 검토한다. CLI가 만든 루트 `.netlify/`는 Git에서 무시한다.
  - 다음 검증 단계: Supabase Authentication → URL Configuration → Redirect URLs에 `https://6ac51bafa812ad0b6d62149b--chronoledger-validation-20261007.netlify.app/auth/callback`을 임시 추가하고 Draft URL에서 Google OAuth 왕복을 검증한 뒤 임시 허용 URL 정리 여부를 확인한다. 오늘은 사용자가 중단을 요청해 미실행이다.
  - GitHub PR Deploy Preview와 Netlify site-level Preview/Production 환경 변수 분리는 미검증이다. 현재 Draft는 로컬 `.env.local`로 빌드한 `out`을 업로드했으며 Netlify Git 빌드 설정은 연결하지 않았다.
  - 현재 앱과 문서는 `main`에 통합되어 원격에 push됐다.
  - 현재 앱 worktree에는 `public/`, PWA manifest, service worker가 없으므로 PWA 자산 경로 점검은 해당 산출물이 추가된 뒤 수행한다.
  - 검토 메모: 공식 Netlify 문서는 OpenNext 어댑터를 통한 Next.js 서버 기능을 지원한다고 설명하며, Next.js static export 문서는 Server Actions·cookies·동적 Route Handler 등 서버 기능이 export 대상에서 제외된다고 명시한다. Tauri의 Next.js 안내도 `output: 'export'`와 `out` 디렉터리를 요구한다. 그러므로 제안의 Web 일반 Next 빌드와 Tauri 정적 빌드는 별도 설정/빌드 증명이 필요하다. 현재 Next.js 설정에서 전환이 쉬운지, PWA 서비스워커가 각 산출물과 공존하는지는 구현 확인 전 미정이다. ([Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/), [Next.js static exports](https://nextjs.org/docs/app/guides/static-exports), [Tauri + Next.js](https://v2.tauri.app/start/frontend/nextjs/))
  - 제안서의 예시 폴더는 `app/`, `components/` 루트를 제안하지만 architecture 문서의 현행 앱 경로는 `src/app/`, `src/components/`다. 이 제안 구조는 현재 저장소 구조를 설명하는 것으로 취급하지 않는다.

## Gemini 진행 문서 대조 기록 (2026-10-03)

당시 검토 대상: [`to-do_Gemini.md`](to-do_Gemini.md). 아래는 2026-10-03 당시 Gemini 진행 보고와 구현 상태를 대조한 기록이다. 현재 우선순위와 완료 상태는 이 문서 상단의 공용 체크리스트를 따른다.

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
7. [ ] 가계부, 캘린더, 설정 기능을 Web/PWA MVP 조건에 맞춰 구현하고 승인 SRS 수용 기준별 테스트를 추적한다.
8. [x] 기존 `phase1-setup` run은 Target SHA(`dda0cae`)와 후속 Phase 4 변경의 범위가 달라 review/test 증거 없이 종료했다. 상태를 `abandoned`로 기록하고 [종료 보고서](../artifacts/phase1-setup/iteration-01/human-report.md)를 보존했다. Tauri 검증은 Web/PWA MVP 이후로 둔다.
9. [x] `phase4-request-submission` run에서 Phase 4 기반 및 4.4 요청 제출 UI를 구현·검증해 `main`에 통합했다. Target `5f7cf557844f64d77e90eb67c09974bf6aab81a0`; 동일 SHA Reviewer clean, 원 run의 Vitest 21개/lint/build/Schema 통과, 통합 상태의 표준 `npm ci`, Vitest 21개, lint/build도 통과했다. 실제 Supabase/RLS/RPC는 미검증이고 sandbox는 unavailable이다. 산출물: [`artifacts/phase4-request-submission/`](../artifacts/phase4-request-submission/).
10. [ ] Gemini Phase 4 계획을 승인 스키마 재사용, 마이그레이션 및 상세 검증 케이스 중심으로 갱신한다.
11. [ ] 버튼 무반응이 브라우저에서도 재현되는지 확인한다. Tauri 전용 무반응 분석은 데스크톱 통합 단계에서 웹뷰 로그를 수집해 진행하고, 원인 확인 전 권한/Hydration 문제로 단정하지 않는다.

---

### 문서 정리
- [x] 오래된 기획 검토 문서를 참조 상태와 최신 기준 문서에 따라 정리
  - 삭제: `md/fix-proposals.md`, `md/revisions_and_decisions_review.md` (구식 Gemini.sql/Downloads 기준, 활성 문서 참조 없음)
  - 보존: 현재 체크리스트/인수인계에서 참조하는 SRS 준비도 및 차단 항목 검토 이력
- [x] SKILL에서 지정한 개발 운영 문서를 `docs/`로 이동하고 문서 링크를 갱신
  - 완료 파일: `docs/architecture.md`, `docs/handoff.md`, `docs/to-do.md`, `docs/known-pitfalls.md`, `docs/progress.md`, `docs/changelog.md`
  - 기획 기준 문서와 SQL은 `md/`에 유지
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
- [ ] VS Code Local harness에서 Orchestrator, Maker, Reviewer 인식 및 동일-SHA 전체 run 통합 검증
  - 현황(2026-10-08): Phase 2~6 run은 Antigravity Orchestrator가 run 생성·SHA 기록·동일-SHA Reviewer 위임·test/review JSON 검증·병합까지 수행했고, Maker(구현)는 사용자가 VS Code Copilot에 Handoff Packet을 직접 전달했다. VS Code Local harness의 자동 하위 에이전트 위임은 사용하지 않았으므로 미검증이다.
  - 관찰: 이 환경의 Reviewer 하위 에이전트는 터미널/`git diff` 도구가 없어, Orchestrator가 exact diff(또는 diff 파일 경로)를 전달해야 검토할 수 있었다. 첫 위임 때 diff가 없어 한 차례 되묻기가 발생했다.
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
- [x] Phase 4.4 변경에 대해 [Gemini 수동 리뷰 패킷](Gemini_phase4_manual_review.md)과 exact Target diff를 Gemini에 직접 제공하고 결과를 기존 Copilot 리뷰와 분리해 기록했다. Gemini 판정은 `clean`/발견 없음이며, 실제 Supabase RLS·관리자 RPC 원자성은 미검증이다. API 호출은 하지 않았다.
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
- [ ] 11.2 네이버페이 지갑 모델 및 10,000원 단위 충전 엔진 구현
  - 대상 파일: `md/SCHEMA.sql`, `src/lib/naver-pay-calculations.ts`, `src/lib/naver-pay-calculations.test.ts`, `src/components/wallet/store-wallet-widget.tsx`
  - 작업:
    1. `store_wallets`에 `NAVER_PAY` 플랫폼 지원 (`chk_wallet_platform_settings`).
    2. 네이버페이 충전 및 결제 계산 순수 함수 `calculateNaverPayPayment` 모듈화 (부족액 $S$, 1만원 단위 올림 충전액 $R$, 총 자산 잔액 검증 $B_{total} \ge R$, 최종 잔액 계산).
    3. `process_expense_payment` RPC에 네이버페이 결제 시 부족액 충전($R$ 자산 차감 + 지갑 충전) 및 결제($P$ 차감) 원자적 단일 트랜잭션 구현.
  - verify: 단위 테스트(잔액 충분, 1만원 단위 올림 충전, 총 자산 부족 차단) 작성 및 RPC 트랜잭션 정합성 검증
- [ ] 11.3 결제 선택 2단계 계층 구조 및 게이트웨이 충전 UI 연동
  - 대상 파일: `src/components/expense/expense-modal.tsx`, `src/components/expense/expense-detail-modal.tsx`
  - 작업:
    1. 결제 모달 내 [결제 플랫폼(구글/갤럭시/기타)] -> [결제 수단(기본 지갑/네이버페이)] 2단계 종속 선택 구조 구현.
    2. 네이버페이 선택 시 실시간 잔액 비교 및 "부족 금액 안내 / 1만원 단위 충전 프리뷰" 인라인 카드 노출.
    3. 잔액 부족 시 `[충전 후 결제]` 원클릭 승인 플로우 제공.
    4. 자동 계산값 기본 채움 및 최종 실결제액 수동 오버라이드 지원.
  - verify: 결제 수단별 잔액 차감 및 충전 게이트웨이 모달 동작 확인, 수동 수정값 유지 검증
- [ ] 11.4 반응형 모바일 튜닝 및 종합 회귀 테스트
  - 대상 파일: 전체 변경 화면 및 테스트 스위트
  - 작업: 모바일 뷰포트 패딩, 중앙 모달 크기 반응형 세부 조정, `npx tsc --noEmit`, Vitest 전체 테스트 실행, `npm run build` 정적 export 검증.

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
  - 후속(비차단): 아이콘은 기본 브랜드 마크(시계 "C")를 코드로 생성한 것이다. 최종 브랜드 아트가 확정되면 교체한다.
- [ ] 7.4 Web/PWA MVP 회귀 및 배포 빌드 검증
  - 대상 파일: Next.js 앱 및 Web/PWA 테스트 설정
  - 작업: 승인 SRS 수용 기준과 모바일 주요 흐름을 점검하고 정적 export 산출물을 배포 환경에서 검증
  - verify: 브라우저 빌드/테스트 통과, Android PWA 설치·인증 세션·오프라인 읽기와 쓰기 차단 확인

---

## 후속 단계: Windows Tauri 데스크톱 통합 (Web/PWA MVP 완료 후)

- [ ] T1. 웹/Tauri 플랫폼 차이를 auth adapter로 분리하고 공통 callback/session 계약을 고정한다.
- [ ] T2. Tauri v2 custom scheme 및 외부 브라우저 OAuth를 연결한다. cold-start URL은 `getCurrent()`로 처리하고 Windows 실행 중 링크 전달을 위해 single-instance plugin을 구성한다.
- [ ] T3. OAuth 성공·취소·만료 세션 및 로그아웃 복귀를 Windows 데스크톱에서 검증한다.
- [ ] T4. Tauri v2 Windows production build를 만들고 단독 실행해 로그인, 캘린더, 결제 흐름을 검증한다.
- 완료 게이트: Web/PWA MVP 조건이 통과되고, 동일 기능의 데스크톱 인증/핵심 흐름 테스트가 통과한 뒤 Windows 앱 배포를 승인한다.
