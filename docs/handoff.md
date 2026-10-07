# 프로젝트 인수인계 문서 (handoff.md)

## 최신 작업 상태 (2026-10-07)

- 협업 도구/문서는 main의 `f163157`, 대시보드·게임 UI는 `collab/phase1-setup`의 `674f741`에 분리 커밋했다. 둘 다 로컬 전용이며 push/merge하지 않았다.
- 기존 `phase1-setup` run의 Target은 `dda0cae...`이나 전용 worktree가 Phase 4 변경을 포함한 `674f741...`로 이동했다. 범위가 달라 기존 run을 review/test한 것으로 간주하지 않고 `abandoned`로 종료했다. 보고서는 `artifacts/phase1-setup/iteration-01/human-report.md`에 있다.
- `674f741`에서 앱 테스트 15개, ESLint, dummy Supabase 환경변수로 정적 build가 통과했다. 실제 Supabase/RLS/RPC, Tauri 및 요청 제출 UI는 미검증/미완료다.
- 다음 run은 고유 ID로 생성하고 BaseRef를 `collab/phase1-setup`으로 지정해 Phase 4.4 요청 제출 UI를 구현한다. Maker 커밋 후 Target SHA를 고정하고 같은 SHA에 Reviewer와 테스트를 수행한다.
- 최소 개입 협업을 위해 [ChronoLedger Orchestrator](../.github/agents/chronoledger-orchestrator.agent.md), [초보자 가이드](ChronoLedger_collaboration_guide.md), 협업 artifact Schema 검증기를 추가했다. Local harness 기반이며 실제 에이전트 인식/통합 실행은 아직 검증 전이다.
- Gemini Reviewer는 선택형 외부 리뷰로 둔다. 전체 diff에 대한 사용자 승인 없이 외부 API를 호출하지 않는다.
- Gemini Reviewer 제한 PoC를 [구현 문서](ChronoLedger_pipeline_auto.md)에 따라 추가했다. 단일 run/SHA 검증, 전체 diff의 사용자 승인, JSON Schema 검증과 no-overwrite 결과 저장이 적용됐고 오프라인 테스트 12개가 통과했다. 실제 Gemini API 실행·외부 전송·품질/비용 평가는 하지 않았으므로 도입 결정은 보류 상태다.
- 제안서의 독립 검토 의견은 [전달용 문서](ChronoLedger_pipeline_auto_review.md)에 정리했다.
- 체크리스트 기준: 현재 작업 우선순위와 상태는 [공용 `to-do.md`](to-do.md)가 단일 기준이다. [Gemini 진행 기록](to-do_Gemini.md)은 보존용 별도 이력이며, 상충하는 상태나 검증 주장은 증거 대조 전까지 기준으로 사용하지 않는다.
- Phase 4 초기 구현은 `.worktrees/phase1-setup` worktree의 `collab/phase1-setup` 브랜치에 커밋됐지만 기본 브랜치에는 통합되지 않았다.
- 관리자 요청 페이지와 게임 선택 모달의 DB 필드/RPC 인자 불일치를 해당 worktree에서 수정했다. 관리자 역할 gate, 게임 기본 아이콘 URL 입력, RPC 실패 시 비원자적 직접 갱신 제거를 반영했다.
- 앱 전체 Vitest 5개 파일·15개 테스트, ESLint, dummy Supabase 환경변수로 실행한 정적 빌드가 통과했다. 실제 Supabase/RLS/Storage 통합과 브라우저 이미지 흐름은 확인하지 않았다.
- Phase 4.4 사용자 요청 제출 모달이 빠져 있어 이 단계는 미완료다. 별도 Phase 4.4 run에서 동일 Target SHA 리뷰/테스트 흐름을 검증한다.

## 다음 작업

- VS Code Local harness에서 run 생성→Maker→SHA 고정→Reviewer→Schema 검증까지 Phase 4.4 전체 run을 수행한다. 기존 변경을 stash/삭제하거나 과거 run을 덮어쓰지 않는다.
- 사용자가 Gemini Reviewer PoC의 외부 API 전송 및 도입 여부를 결정한다. 승인 전에는 실제 API 호출을 하지 않는다.
- 승인한다면 별도 run/SHA에서 전체 diff를 검토하고 제한된 실 API 검증을 수행한 뒤 정확성·비용·실패 동작을 기록한다.
- [Phase 5.1 ~ 5.2] 말일 보정을 포함한 날짜 연산 코어(`src/lib/calendar-utils.ts`) 작성 및 정기 구독 멱등성 보장 지연 생성 모듈(`src/lib/subscription-sync.ts`) 구현을 진행한다[cite: 4].
- [Phase 5.3 ~ 5.4] 금액 노출을 완전히 배제한 데스크톱 캘린더와 총 자산 잔고, 월 예산 진행률 바를 포함한 히어로 사이드바 컴포넌트를 작성한다[cite: 4].

## 최신 작업 상태 (2026-10-07)

- Gemini 작업은 구현과 분리해 커밋 후 동일 Target SHA의 읽기 전용 리뷰로 지정했다. 외부 자동 연결이 없어 실제 전달 및 검토는 미착수다.
- Dashboard 예정 지출 합계는 KST 현재 달의 DATE 범위(`end_date` 우선, 없으면 `target_date`)로 조회하도록 변경했다. 정상 빈 결과와 실제 0원은 0원으로 표시하고, 누락 자산 행·조회 실패는 오류 상태로 구분한다. 원격 Supabase query는 실행하지 않았다.
- 관련 두 Vitest 파일의 7개 테스트, 앱 lint, `npx tsc --noEmit`, 정적 production build가 통과했다. Vite configLoader 향후 호환성 경고가 있었고 원격 Supabase 통합 검증은 미실행이다.
- `/auth` 로그인 화면을 현재 앱에 맞는 다크 테마로 개선했다. 브라우저에서 320/390/768/1280px 레이아웃, 입력 라벨 및 44px 입력 영역을 확인했다. 키보드 탭 순서도 이메일·비밀번호·로그인·가입·Google 순으로 확인했다. callback 테스트 5개와 TypeScript 검사는 통과했으며 실제 인증은 재실행하지 않았다.
- 접근성 트리에서 H1/H2 제목 구조 및 폼/버튼 이름을 확인했다. 입력 44px, 주요 버튼 48px, 각 키보드 초점 표시를 확인했다. 주요 로그인 텍스트 대비는 최소 6.13:1, 대시보드 텍스트 조합은 최소 5.31:1, 로그인 초점 표시 대비는 5.21:1이다.
- `CardTitle`을 H2로 맞췄고 dashboard 로딩 live status, 데이터 오류 alert, 명명된 내비게이션 landmark 및 장식용 이모지 숨김을 추가했다. 보호된 dashboard 런타임과 실제 스크린리더 검증은 하지 않았다.
- 앱 worktree의 `.eslintrc.json`에 `root: true`를 설정해 상위 저장소 설정의 잘못된 해석을 막았다. `npm run lint`는 경고/오류 없이 통과했고 `npm run build`는 ESLint·타입 검사를 포함해 네 정적 경로를 생성했다.
- 앱 전체 테마 전환은 추후 모든 보호 화면과 함께 적용한다. 로그인 화면은 현재 다크 전용으로 유지한다.
- UI 디자인 제안 결정에 따라 [디자인 시안](design-preview-ko.html)을 추가했다. 기존 정적 참고 목업 [design-v1-ko.html](design-v1-ko.html)은 수정하지 않았다.
- 사용자 결정은 [상세 설계](detailed-design.md) 및 [UI Design Sheet](../md/ChronoLedger_UI_Design_Sheet.md)에 기록했다: 화면 구성에 더해 글자 크기, 쿨 뉴트럴 라이트/기존 다크 팔레트, 그림자, 빈 상태와 보조 피드백 문체를 정했다.
- 브라우저에서 대시보드·지출·통계와 반응형 390/900/1280px를 확인했다. 모바일 지출 카드와 하단 내비게이션, 768–1099px 상세 바텀시트, 저장되는 테마 전환이 동작하며 가로 넘침은 없었다.
- 선택된 타이포그래피·팔레트·그림자를 정적 시안에 반영했다. 대비 계산에서 라이트 본문/보조/약한 텍스트 17.41:1/7.85:1/5.80:1, 기본 버튼 흰 라벨 5.02:1, 라이트 상태 라벨 5.03:1 이상, 다크 상태 라벨 5.57:1 이상을 확인했다.
- 브라우저에서 다크/라이트 각 390/900/1280px를 재검증해 가로 넘침이 없음을 확인했다. 390px 바텀시트, 900px 중간 폭 상세 패널, 1280px 우측 상세 패널이 유지된다.
- A2Z 9개 WOFF2 굵기를 제품의 `public/fonts/a2z/`와 정적 시안의 `docs/assets/fonts/a2z/`에서 자체 호스팅한다. 두 위치 모두 내장 저작권 표기(`Copyright © 2026 PT&`)와 SIL OFL 1.1 전문을 동봉했다.
- 출처: [A2Z 제작자 폰트 안내](https://freesentation.blog/a2z), [눈누 라이선스 FAQ](https://noonnu.cc/font_page/1778), [SIL OFL 1.1](https://openfontlicense.org/documents/OFL.txt). 폰트 자체 단독 판매는 금지된다.
- 브라우저에서 앱 `/auth` 경로를 열어 9개 굵기 모두 로드됨을 확인했고, 정적 export의 `out/fonts/a2z/` 및 생성 CSS에서도 9개 파일과 경로 참조를 확인했다. 현재 ESLint 설정 및 production build 검증은 최신 작업 상태를 따른다.
- 다음 작업: NVDA/VoiceOver 등 실제 스크린리더로 인증 및 dashboard를 검증하고, 제품 화면이 추가될 때 같은 대비/키보드 기준을 적용한다.

## 최신 작업 상태 (2026-10-06)

- Google provider와 localhost Redirect URL을 실제 확인하고 브라우저 OAuth 왕복을 검증했다. PKCE code 교환·세션 저장·dashboard 복귀가 성공한다.
- OAuth 자동 code 교환 중복 및 React Strict Mode effect cleanup을 수정했다. callback 테스트 5개, 변경 파일 lint 및 TypeScript 검사가 통과했다.
- `/`를 `/auth`로 통합하고 dashboard layout 인증 gate를 추가했다. 비인증 직접 dashboard 접근을 브라우저에서 확인해 차단했다. Android PWA 실기기 검증은 남아 있다.

## 현재 상태

- 프로젝트 목적 결정: ChronoLedger는 과제 제출물이 아닌 개인 프로젝트다. 과제 조건(SQLite, 별도 Node.js 웹서버, 게시판)은 제품 범위에 추가하지 않는다. 기존 승인된 Supabase PostgreSQL/Next.js 정적 export, 이메일·Google 회원 기능, 사용자/관리자 구분을 유지한다. Netlify 또는 상시 Node.js 서버를 채택한 것은 아니다. 세부 결정은 [revisions_and_decisions.md](../md/revisions_and_decisions.md)에 기록했다.
- 통합 기획 및 결정 문서: [revisions_and_decisions.md](../md/revisions_and_decisions.md)
- 기능별 화면 요구사항: [SPEC.md](../md/SPEC.md)
- 소프트웨어 요구사항 명세 초안: [SRS.md](../md/SRS.md)
- DB DDL/RPC/RLS 초안: [SCHEMA.sql](../md/SCHEMA.sql)
- 이전 SRS 준비도 검토(당시 상태 기록): [srs-readiness-review.md](../md/srs-readiness-review.md)
- 결정안 검토: [resolved-blockers-review.md](../md/resolved-blockers-review.md)
- 주요 차단 항목 설명: [planning-blockers.md](../md/planning-blockers.md)
- 진행 현황: [progress.md](progress.md)
- 구현 순서와 검증 목록: [to-do.md](to-do.md)
- Gemini 작업 진행 기록: [to-do_Gemini.md](to-do_Gemini.md) (외부 배포 완료 표시는 로컬 증거와 별도로 확인 필요)
- AI 협업 초보자용 사용법: [ai-collaboration-usage.md](ai-collaboration-usage.md)
- UI 시트: [ChronoLedger_UI_Design_Sheet.md](../md/ChronoLedger_UI_Design_Sheet.md); 참고 목업 [design-v1-ko.html](design-v1-ko.html); 사용자 결정 반영 중인 반응형 시안 [design-preview-ko.html](design-preview-ko.html). 새 시안은 정적 예시이며 제품 UI 구현을 뜻하지 않는다.
- Netlify 웹 배포 제안: [Netlify_Web_Architecture_Proposal.md](Netlify_Web_Architecture_Proposal.md). 상태는 Decision Proposal이며 사용자가 승인하기 전에는 플랫폼/빌드 타깃 변경을 적용하지 않는다.
- SRS 검토/검증 체크포인트: [srs-review-checkpoint.md](srs-review-checkpoint.md). SRS 승인 및 테스트 프로젝트 rollback-only SQL 스모크 테스트가 완료되어 설계 단계 진입이 승인됐다.
- 오래된 검토 문서 정리: 미사용 상태이며 구식 입력 파일을 참조하던 `md/fix-proposals.md`, `md/revisions_and_decisions_review.md`는 삭제했다. 명시적으로 과거 이력으로 링크된 SRS/차단 항목 검토 문서는 보존했다.
- SRS 요구사항 검토·승인과 테스트 프로젝트의 SQL 스모크 테스트가 완료되어 설계 단계 진입이 승인됐다.
- `SRS.md` v1.0 요구사항은 사용자 승인됐고, `md/TESTS.sql`의 rollback-only smoke suite도 최종 PASS를 확인했다. Phase 0.6 완료 및 설계 진입이 승인됐다.
- 지원 플랫폼은 Windows용 Tauri v2 데스크톱과 Android PWA다. 성능 목표는 설계 단계에서 측정 환경과 함께 확정한다.
- Gemini의 2026-10-03 진행표를 `.worktrees/phase1-setup`과 대조했다. Tauri v2 및 shadcn 설정은 반영됐다. 다만 `/auth/callback`이 로그인 폼이고 Tauri 딥링크 처리에 PKCE 교환/cold-start 수신이 없어 OAuth 완료로 볼 수 없다. 버튼 무반응의 원인은 아직 미확정이다. [to-do.md](to-do.md)의 대조 절을 따른다.

## 확정된 주요 결정

- 캘린더 일정은 `VERSION`/`PICKUP`만 지원하고 타일에 금액을 표시하지 않는다. 픽업 전반/후반은 별도 필드 대신 날짜 범위 필터로 제공한다.
- 공용 일정은 관리자 승인 후 노출된다. 일반 사용자의 게임/일정 제안은 별도 요청 행과 관리자 승인으로 처리한다.
- 결제수단은 `WALLET`, `GOOGLE_PLAY`, `GALAXY_STORE`다. 포인트 출처는 `point_platform`에 기록하고 지갑·원장은 스토어별로 분리한다.
- 예정 취소는 복구할 수 있지만 결제 환불은 복구할 수 없다. 예정 취소 회차는 자동 재생성하지 않는다.
- 포인트 산식은 제품 예상치이며 Google 공식 정산액을 보장하지 않는다. 잔액 보정은 별도 원장 이벤트다.
- 자산 차감은 사용자가 선택하는 `deduct_from_asset`에 따른다. 오늘 결제는 기본 켬, 과거 내역은 기본 끔이며 환불은 차감된 자산을 복원한다.
- 커스텀 아이콘은 소유자 전용 비공개 Storage에 저장한다. 오프라인에서는 유효 세션의 캐시 조회를 허용하고 쓰기는 막으며, 만료 예정 항목 처리는 온라인 복귀 후 요구한다.

## 설계 진입 게이트 (완료)

- 승인된 [SRS.md](../md/SRS.md) 요구사항과 테스트 프로젝트 rollback-only SQL 스모크 검증을 완료했다.
- `md/TESTS.sql`의 핵심 DDL/RPC/RLS 동작 점검은 `ON_ERROR_STOP=1`에서 최종 PASS를 확인했다.
- Phase 0.6 완료 및 설계 단계 진입을 승인했다. 전체 SRS 수용 기준 테스트는 설계/테스트 계획에서 상세화한다.

## 다음 작업

- 사용자 우선순위는 웹사이트 개발이다. Android PWA 실기기 로그인 검증은 보류하되 제품 범위에서는 제외하지 않는다.
- Netlify는 후보이며 아직 확정 채택이 아니다. 로컬 `npm run build`에서 lint·타입 검사 포함 정적 export와 callback 테스트 5개가 통과했다. CLI Draft Deploy에서 사용자가 루트/`/auth` 로그인 표시, `/auth/callback` 안내, 비로그인 `/dashboard`가 `/auth`로 이동하는 것을 확인했다. 익명 HTTP 요청의 401은 Netlify Edge Access 제한이다. GitHub 자동 Preview, 실제 OAuth callback/허용 URL, Preview/Production 환경 변수 분리는 미검증이다. 앱에 PWA manifest/service worker가 없어 해당 경로도 아직 검증할 수 없다.
- 최신 앱 코드와 프로젝트 문서는 `main`에 통합해 `origin/main`으로 push했다. 폴더 점검에서 추적된 비밀/생성 산출물은 찾지 못했고 `.worktrees/` 및 `.env.local`은 무시된다. `artifacts/phase1-setup/run.json`은 `target_sha: null`, `in_progress`인 기존 미완료 기록이므로 종료 처리하지 않았다.
- 사용자는 2026-10-07 현재 세션을 종료했다. `.worktrees/phase1-setup/.env.local`의 Supabase URL과 Legacy `anon` 키 형식 및 프로젝트 ref 일치 확인, 그리고 대시보드 값과의 사용자 대조가 끝났다. 다음 재개 시 Draft callback URL을 Supabase Redirect URLs에 임시 등록한 뒤 OAuth 왕복을 테스트한다. 오늘은 해당 설정을 변경하지 않았다. 현재 Netlify Draft는 locally built `out` 업로드이며 site-level env variables나 GitHub continuous deployment는 구성되지 않았다.

- [상세 설계](detailed-design.md)는 승인 SRS/SPEC/SCHEMA를 흐름과 호출 경계로 연결한 초안이다. 예산 집계는 공유 클라이언트 도메인 함수, 오프라인 데이터는 계정별 IndexedDB에 고정 TTL 없이 저장하고 마지막 동기화 시각을 표시하며 네트워크 복귀 즉시 재조회하고 로그아웃/세션 만료 시 제거하기로 했다. 계정 삭제 부분 실패는 대기 상태를 유지하면서 재시도 간격을 늘려 완료까지 재시도하고, 대기 중 일반 접근은 차단하며 상태 화면만 허용한다. 데이터 정리 후 Auth 삭제 전에 주소 사본 없이 상태별 이메일을 보내며, Auth 삭제 실패 시 진행 상태를 알리고 삭제만 재시도한다. 게임 구독 해제도 Storage 정리 대기 작업과 재시도 후 행을 삭제하며, 처리 중에는 목록에 “삭제 처리 중”으로 표시하기로 했다. 성능 기준 기기는 중급 Android 실기기다. worker/메일 전달 구조와 성능 측정 세부조건은 미결정이다. Netlify 제안은 보류하며, 채택 시 계정 삭제 진입점은 Netlify 서버 함수로 하는 방향이다.
- 모바일·데스크톱 앱의 구체 릴리스 버전 번호와 시점/구성은 미결정이다. 기존 결정인 Android PWA/Windows Tauri v2, 단일 Next.js 코드베이스와 Tauri 정적 export, Web/PWA 우선 순서는 유지한다. Netlify 채택과 Web/Desktop 빌드 분리는 별도 미결정이다.
- 브라우저 Google OAuth를 실제 Supabase 설정으로 검증했다. Google provider 활성화와 `http://localhost:3000/auth/callback` 등록 후 PKCE code 교환, 세션 저장 및 dashboard 복귀가 성공했다. 중복 URL code 교환과 React Strict Mode cleanup 문제를 수정하고 관련 테스트 5개가 통과했다.
- `/`에서 단일 `/auth` 로그인 화면으로 이동하고 dashboard layout에서 비인증 접근을 막는다. 브라우저에서 로그인 상태 이동 및 로그아웃 후 직접 dashboard 접근 차단을 확인했다. 이 client gate는 RLS를 대체하지 않는다. Android PWA 실기기 왕복 검증은 남아 있다.
- 다음 구현 후보는 SRS 수용 기준별 기능 흐름과 원격 Supabase 쿼리/권한 통합 검증을 진행한다. Android PWA 실기기 인증은 사용자의 보류 결정에 따라 후순위로 둔다.
- Phase 1 run manifest는 `target_sha: null`, `in_progress`이므로 동일-SHA review/test 산출물 및 종료 조건을 확인하기 전까지 협업 run 완료로 취급하지 않는다.
- VS Code Copilot 저장소 설정은 추가했다: `.github/copilot-instructions.md`, `.github/agents/chronoledger-maker.agent.md`, `.github/agents/chronoledger-reviewer.agent.md`. 프로필 인식 및 동일-SHA 리뷰 아티팩트 절차는 사용자의 VS Code 환경에서 별도로 확인한다. 역할 설명만으로 읽기 전용 권한은 강제되지 않는다.
- 상세 설계 미결정 사항과 후속 문서 작업은 [to-do.md](to-do.md)에 추적한다.
- Netlify 플랫폼 및 Web/Desktop 이중 빌드 결정은 Deploy Preview 검증 전까지 대기 중이다. 정적 export가 충족하지 못하는 구체 요구가 확인되면 그때 서버 runtime을 재평가한다.
- 측정 환경과 함께 성능 목표를 확정한다. 상세 순서는 [to-do.md](to-do.md)를 따른다.
## 멀티 에이전트 협업 검토

- 설계안과 검토 의견은 각각 [협업 아키텍처](../md/multi_agent_collaboration_architecture.md), [검토 문서](../md/multi_agent_collaboration_architecture_review.md)에 기록했다.
- 최종 설계안 재검토에서 SHA/읽기 전용 리뷰/원자적 파일 교환/샌드박스/수정 상한/사용자 리포트 보완을 확인했다. 공유 작업 트리에서 실행하는 `git reset --hard`는 미커밋 사용자 작업을 삭제할 수 있어 차단 위험으로 기록했다.
- 아티팩트 JSON Schema, run별 산출물 규약, 사용자 보고서 템플릿과 전용 worktree 생성 스크립트를 준비했다. 상세 사용법은 [artifacts 안내](../artifacts/README.md)를 따른다.
- Maker/Reviewer/Orchestrator에게 작업을 전달하고 동일 Target SHA의 결과를 수동으로 모으는 초보자용 절차를 [AI 협업 사용 안내](ai-collaboration-usage.md)에 작성했다.
- JSON 파일 문법, PowerShell 스크립트 구문, 상대 Markdown 링크의 정적 확인은 통과했다. 스크립트의 실제 worktree 생성/manifest 동작은 아직 실행 검증하지 않았다.
- 협업 아키텍처 §5.2의 자동 `git reset --hard`를 제거하고 실패 worktree/브랜치 보존 규칙으로 바꿨다.
- 실제 run은 만들지 않았다. 현재 작업 트리가 깨끗하지 않아 생성 스크립트가 중단되며, Docker도 설치/경로 확인이 되지 않아 동적 테스트 샌드박스를 실행할 수 없다. Gemini 에이전트 자동 연동도 미설정이다.
- 다음으로 현재 문서 변경을 보존·커밋한 뒤 생성 스크립트를 깨끗한 상태에서 확인하고, Docker 및 외부 에이전트 파일 접근을 별도로 구성해야 한다.
