# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Gemini(`Hydrogen` 기본 $\to$ `Neon`/`Argon` 승격)·Claude(`Sonnet` 기본 $\to$ `Opus` 승격) 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **활성 과제**: **`R96-REV-07` (`📐 SPEC_NEEDED`)** *(운영 Supabase DB에서 `ALTER DATABASE postgres SET app.settings.send_notifications_*` 실행 시 `42501: permission denied` 실제 발생 확인에 따른 웹훅 URL/시크릿 저장·조회 방식 전환 설계 및 Run 수용 기준 확정 — 2026-11-24 접수)*
- **전제 현황 (사용자 완료)**: R96 1~3단계(VAPID 키쌍·웹훅 시크릿 생성, Edge Function `send-notifications --no-verify-jwt` 배포, Edge Function 시크릿 4종 등록) 적용 완료됨.

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **0** | **`📐 SPEC_NEEDED`** | **Gemini 4 Argon** *(Fallback 1: Claude Opus / Gemini 4 Neon, Fallback 2: Gemini 4 Hydrogen)* | `Chief Architect` | 아래 **요구사항 접수 기록 (`R96-REV-07`)**을 검토해 설계 결정·단계별 수용 기준을 확정(`docs/push-notification-research.md` §11.5·`docs/handoff.md`, `src/**`·`sql/**` 직접 수정 금지)한 뒤 `✅ DONE` 처리하고 Run 등록용 `Gemini 4 Hydrogen`(`▶ READY`) 행을 반환함 | 대기 중 |

#### 📥 요구사항 접수 기록 (`R96-REV-07` — `Gemini 4 Hydrogen` 접수, 2026-11-24)

1. **요청 요지**:
   - 사용자가 R96 운영 배포 1~3단계(VAPID 키쌍·웹훅 시크릿 생성, `send-notifications` Edge Function 배포, Edge Function 시크릿 4종 등록)를 완료한 뒤 4단계(`ALTER DATABASE postgres SET app.settings.send_notifications_url` / `send_notifications_secret`)를 Supabase Dashboard SQL Editor에서 실행하자 `ERROR: 42501: permission denied to set parameter "app.settings.send_notifications_url"` 오류가 발생함.
   - 운영 Supabase 클라우드 DB에서 `invoke_send_notifications_webhook()`이 웹훅 URL과 시크릿을 안전하게 읽을 수 있도록 대체 저장·조회 방식을 설계하고 새 Run으로 등록해 해결해야 함.
2. **에스컬레이션 사유 (`collaboration.md` §2)**:
   - `SECURITY DEFINER` 함수·시크릿 저장소(Supabase Vault vs 비공개 테이블 등) 권한 경계 및 보안 설계 변경에 해당하며, 기존 승인 명세([`docs/push-notification-research.md`](push-notification-research.md))에 `42501` 대체 설계가 확정되어 있지 않음.
3. **검토·결정 필요 사항**:
   - ① 저장 방식 선택: Supabase Vault(`vault.decrypted_secrets`) vs 비공개 설정 테이블(예: `private` 또는 `public` 내 `REVOKE ALL` 테이블 + 관리자/SQL Editor 등록용 헬퍼 또는 직접 INSERT) vs 기타 Supabase 지원 방식.
   - ② 기존 `current_setting('app.settings.send_notifications_*', true)` 폴백 유지 여부(`sql/tests/TESTS.sql` 로컬 호환성) 및 `invoke_send_notifications_webhook()` 조회 우선순위.
   - ③ 신규 마이그레이션(`MIGRATION_R96_REV08_...sql`), `SCHEMA.sql`, `sql/README.md` B표 확인 쿼리·운영 적용 절차(§11.5 갱신), `TESTS.sql` 검증 범위.
4. **관련 파일·문서**:
   - `sql/migrations/MIGRATION_R96_WEB_PUSH.sql` (313~345행 `invoke_send_notifications_webhook`)
   - `sql/SCHEMA.sql` (2349~2350행)
   - `sql/tests/TESTS.sql` (2863행 부근 R96 블록)
   - `docs/push-notification-research.md` §11.5 (313~320행)

### 📌 중단 체크포인트 (Handover Checkpoint)

- **현재 기록된 중단 체크포인트 없음** *(작업 도중 `⚠️ HANDOVER_NEEDED` 발생 시 이 영역에 완료 내역·남은 작업·가정·검증 상태를 기록함)*

### 🗓️ 예약·보류·안건 요약 (자동 실행 대상 아님)

> 아래 항목은 `"인수인계 문서를 확인해"`로 자동 착수하지 않음. 사용자가 지목하면 Orchestrator가 Run으로 등록함.

| ID | 상태 | 요지 | 상세 위치 |
| :--- | :--- | :--- | :--- |
| `R96` | 완료 · 1~3단계 배포 완료 / 4단계 DB 설정 보완 대기 | 운영 DB 마이그레이션 + 1~3단계(VAPID·Edge Function 배포·시크릿 4종) 완료(2026-11-24). 4단계 `ALTER DATABASE` `42501` 차단에 따른 `R96-REV-07`(`📐 SPEC_NEEDED`) 후속 처리 및 5단계(`NEXT_PUBLIC_VAPID_PUBLIC_KEY`) 대기 | `docs/to-do.md` R96·R96-REV-07, [`docs/push-notification-research.md`](push-notification-research.md) §11.5 |
| `R50` | `📝 AGENDA` | 인증 보안 설정 점검(읽기 전용). 사용자 요청 시에만 착수 | 보관 문서 「병행 검토 안건: 인증 보안 설정 점검」 절 |
| `R90` | `⏸️ 잠정 보류` | 일정 후보 수집. **사용자가 직접 호출할 때만 재개, 재개 추천 금지** | `docs/dcinside-schedule-crawling-review.md` §6, 보관 문서 「보류 Run 기록」 절 |
| `R104` | `⏸️ 보류` | 단기 픽업 재화·과금 계산기 (2026-11-24 사용자 결정으로 보류, 직접 호출 시에만 재검토) | `docs/to-do.md` `R104` |
| `R40`·`R75`·`R99`·후속 | 후속 · 우선 낮음 | `R40`(다중 파티)·`R75`(①·④ 🐳)·`R99`(건의 첨부 🐳)·`R96-REV-07`·`R101-REV-001` | `docs/to-do.md` 해당 항목 |

### 🗂️ 직전 완료 Run 기록: `r105-dashboard-summary-bar`

- **Run ID**: `r105-dashboard-summary-bar` **(완료, `main` 병합 `fe5bf77`, 2026-11-24)** *(`R105`: 대시보드 홈 상단 상태바를 컴팩트 KPI + 월간 예산 페이스 연동 바로 개편)*
- **Orchestrator & Reviewer**: Gemini 4 Hydrogen *(2026-11-24 등록·리뷰·병합 마감)*
- **Worktree 경로**: `.worktrees/r105-dashboard-summary-bar` (브랜치: `collab/r105-dashboard-summary-bar`, 매니페스트: `artifacts/r105-dashboard-summary-bar/run.json`, 미삭제·원격 미push)
- **Base SHA**: `d1e18b42e021d8eeefe4dc0795be421d0a450a29`
- **Target SHA**: `3271d5d0e6c0ed00dfa8b3a7deca8cf4b11d20c1` *(iteration-01 리뷰 clean, 산출물 `e363cc4`, `main` 병합 `fe5bf77`)*
- **DB 변경**: 없음. 🐳 Docker 불필요.

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: 3271d5d)`** | **Claude Sonnet** *(Fallback: Gemini 4 Hydrogen / GitHub Copilot)* | `Maker (R105 대시보드 상태바 개편 & Vitest)` | 상태바 4칸 인터랙티브 카드·월간 예산 페이스 바·클릭 연계 구현 및 Vitest 8건 보강. tsc·lint·Vitest 76파일/1021개 통과 |
| **2** | **`✅ DONE (산출물 e363cc4, main 병합 fe5bf77)`** | **Gemini 4 Hydrogen** *(Fallback: Claude Sonnet / GitHub Copilot)* | `Reviewer & Orchestrator` | Base `d1e18b4` ↔ Target `3271d5d` 정적 리뷰 **clean**(지적 0건). tsc·lint·Vitest 76파일/1021개·`next build`(16페이지) 통과 후 `main` 병합 `fe5bf77` 및 병합 후 검증 통과 |

#### 📝 `r105-dashboard-summary-bar` Step 2 완료 기록 (Gemini 4 Hydrogen, 2026-11-24)

- **리뷰 범위·독립성**: Base `d1e18b42e021d8eeefe4dc0795be421d0a450a29` ↔ Target `3271d5d0e6c0ed00dfa8b3a7deca8cf4b11d20c1`. 범위 검사(`merge-base --is-ancestor`·`Target..HEAD`의 `src`·`sql` 변경 0건) 통과, Maker(Claude Sonnet)와 다른 모델로 독립 리뷰함.
- **정적 리뷰 (`clean`, 지적 0건)**: `src/app/dashboard/page.tsx`·`page.test.tsx` 2개 허용 파일만 변경. 4칸 카드(오늘 일정·이번 주 관심/진행 일정·이번 주 예정 지출·월 예산 잔여 페이스 바), 80%/100% 초과 색·폭 상한, 비로그인/미설정 폴백, 접근성(`aria-label`, `<button>`/`<Link>`, `progressbar`) 모두 수용 기준과 일치함.
- **산출물·검증**: `artifacts/r105-dashboard-summary-bar/iteration-01/review.json`·`test.json`, `run.json` 갱신 후 워크트리 커밋 `e363cc4` (이 PC Python에 `jsonschema` 모듈 미설치로 `json.load` + 스키마 대조 검증). 워크트리 `tsc`·`lint`·Vitest 76파일/1021개·`next build` 통과 후 `main` 병합(`fe5bf77`), 병합 후 `main`에서 `tsc`·`lint`·Vitest 76파일/1021개 재통과 확인함. 실브라우저(모바일 드로어·반응형) 확인 및 워크트리 정리는 사용자 선택 대기.
