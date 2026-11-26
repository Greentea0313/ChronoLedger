# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Gemini(`Hydrogen` 기본 $\to$ `Neon`/`Carbon` 승격)·Claude(`Sonnet` 기본 $\to$ `Opus` 승격) 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 사용자 알림 대기, 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 📣 사용자 알림 대기 (User Notices)

> 무인 작업(주간 문서 감사 등)이 사용자에게 전할 내용을 남기는 곳임. 다음에 `"인수인계 문서를 확인해"`를 처리하는 모델이 답변 첫머리에서 알리고, 같은 턴에 해당 줄을 지우고 커밋함(handoff Skill §1 1단계).

- **현재 알림 없음**

### ⛽ 쿼터 상태 (Quota Status)

- **`Gemini Models` 주간 한도 소진** *(사용자 통보, 2026-11-26, 리셋 시점 미확인)*: `Gemini 4 Hydrogen`·`Gemini 4 Neon`·`Gemini 4 Carbon`은 같은 공용 한도를 쓰므로 모두 사용 불가로 봄. 새 행 배정·인계는 다른 한도 묶음(`Claude Sonnet (Medium)`·`Claude Opus (High)`·`GPT Codex`·`GitHub Copilot`)으로 바로 보냄(handoff Skill §3). 리셋되면 사용자가 알려 주거나 Antigravity `View Usage`에서 확인한 모델이 이 절을 지움.
### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **활성 Run 없음** *(직전 Run `r115-csv-import`는 `main` 병합 `35f4461`로 마감함)*

### 📌 중단 체크포인트 (Handover Checkpoint)

- **현재 기록된 중단 체크포인트 없음** *(작업 도중 `⚠️ HANDOVER_NEEDED` 발생 시 이 영역에 완료 내역·남은 작업·가정·검증 상태를 기록함)*

### 🗓️ 예약·보류·안건 요약 (자동 실행 대상 아님)

> 아래 항목은 `"인수인계 문서를 확인해"`로 자동 착수하지 않음. 사용자가 지목하면 Orchestrator가 Run으로 등록함.

| ID | 상태 | 요지 | 상세 위치 |
| :--- | :--- | :--- | :--- |
| `R96` | 완료 · 운영 배포 1~5단계 완료 | 운영 DB 마이그레이션·Edge Function·시크릿·`R96-REV-07` 웹훅 설정(`set_push_webhook_config`)·`NEXT_PUBLIC_VAPID_PUBLIC_KEY` 적용 완료, Windows Chrome·안드로이드 실기기 수신 확인(`SENT`, 2026-11-25). 안드로이드 상태 표시줄 흰 사각형은 투명 배지 `badge-96.png`로 `main` 직접 수정함(배포 후 재확인 필요) | `docs/to-do.md` R96·R96-REV-07, [`docs/push-notification-research.md`](push-notification-research.md) §11.5 |
| `R107` | `R107-A·B` 운영 적용 완료 · **`R107-C` `main` 병합 (`9268bf0`)·운영 DB 적용 완료** | 정기·반복 지출 자동화: `R107-A`·`R107-B` 운영 적용 완료 → `R107-C` 자동 확정·원자 환불 롤백 `main` 병합 완료, 운영 `MIGRATION_R107C_AUTO_CONFIRM.sql` 적용·확인 쿼리 검증 완료(2026-11-26), 앱 배포·구독 모달 동작 1회 확인은 사용자 수행. 후속: `R107C-REV-001·002`(P4), `R107-A-CLEANUP`(1주 관찰 후) | [`docs/r107-recurring-expense-automation-spec.md`](r107-recurring-expense-automation-spec.md) §6, `docs/to-do.md` `R107` |
| `R109` | **운영 적용·일괄 이전 완료** | 아이콘 Storage 이전(공용 `game-assets` 버킷). 운영 적용·배포·일괄 이전 검증 완료(2026-11-25). `R109-REV-001·002`는 `p4-followups-r108-r109`(`main` 병합 `c52705c`)에서 완료, `R109-REV-003`(P4 선택)·`R109-CLEANUP`은 사용자 지목 시 | [`docs/r109-icon-storage-migration-spec.md`](r109-icon-storage-migration-spec.md) §4, `docs/to-do.md` R109 |
| `R110` | **완료 · 릴리스 `desktop-v0.2.1` 배포·자동 업데이트 확인** | Tauri 데스크톱 앱 자동 업데이트(GitHub Releases·서명). Run `r110-desktop-auto-update` 마감, 아이콘 교체(`0.2.2`) 배포만 남음 | 보관 문서 「이전 Run 기록 (완료): `r110-desktop-auto-update`」 절, [`docs/r110-desktop-auto-update-spec.md`](r110-desktop-auto-update-spec.md) §4 |
| `R111` | **`main` 커밋 · 운영 DB 적용·확인 쿼리 완료 · `⚠️ LOCAL_DB_DEFERRED`** | 보안 상위 3건(S1 `users` 노출 축소 마이그레이션, S2 CSP·HSTS, S3 CI) `main` 작업 트리 구현. 운영 DB `MIGRATION_USERS_PROFILE_PRIVACY.sql` 적용·README 확인 쿼리 확인(사용자, 2026-11-26). 로컬 DB 통과 전 `main` 커밋은 사용자 지시에 따른 예외임. 남음: 🐳 로컬 `TESTS.sql`(`PRIV-01`) 실행, 배포, 데스크톱 CSP 확인. 나머지 항목은 `R112` 후보 | `docs/to-do.md` `R111`·`R112`, [`docs/security-and-competitiveness-review.md`](security-and-competitiveness-review.md) |
| `R50` | `📝 AGENDA` | 인증 보안 설정 점검(읽기 전용). 사용자 요청 시에만 착수 | 보관 문서 「병행 검토 안건: 인증 보안 설정 점검」 절 |
| `R90` | `⏸️ 잠정 보류` | 일정 후보 수집. **사용자가 직접 호출할 때만 재개, 재개 추천 금지** | `docs/dcinside-schedule-crawling-review.md` §6, 보관 문서 「보류 Run 기록」 절 |
| `R104` | `⏸️ 보류` | 단기 픽업 재화·과금 계산기 (2026-11-24 사용자 결정으로 보류, 직접 호출 시에만 재검토) | `docs/to-do.md` `R104` |
| `R40`·`R75`·`R99`·후속 | 후속 · 우선 낮음 | `R40`(다중 파티)·`R75`(①·④ 완료 `35d43b6`, `R75-REV-001`은 `p4-followups-r107c-r109-r75`에서 완료, `R75-REV-002`는 비승인 게임 상태 도입 시까지 보류)·`R99`(건의 첨부 🐳) (`R101-REV-001`·`R106-REV-001·002`는 `T1`~`T4` Run, `R108-REV-001`은 `p4-followups-r108-r109` Run에서 완료) | `docs/to-do.md` 해당 항목 |
| `T1`~`T4` | **완료·종료** (`t1-t4-desktop-and-followups` `main` 병합 `5e63007`, `t4-rust-build-and-lock` `main` 병합 `2829bb7`, `R110` 자동 업데이트 `main` 병합 `a83503a`) | Windows Tauri 데스크톱 통합(PKCE 단일 콜백·딥링크·`single-instance`) 병합, Rust 빌드·`Cargo.lock` 갱신, 운영 DB·Redirect URL 등록, 사용자 Windows 실기기 확인(로그인 복귀·`single-instance`·캘린더·결제) 모두 2026-11-26까지 완료함. 남은 일 없음 | [`docs/t1-t4-desktop-and-followups-spec.md`](t1-t4-desktop-and-followups-spec.md) §4, 기록 상세는 `docs/archive/handoff-archive.md`, `docs/to-do.md` T1~T4 |


### 🗂️ 직전 완료 Run 기록: `r115-csv-import` *(`R115` CSV 결제 내역 가져오기)*

- **Run ID**: `r115-csv-import` **(완료, `main` 병합 `35f446188b4971059e83c492b03d9b46949e4e05`, 문서 마감 2026-11-27)** · **Orchestrator**: Claude Sonnet `Medium` *(등록·마감)*
- **Worktree 경로**: `.worktrees/r115-csv-import` (브랜치 `collab/r115-csv-import`, 매니페스트 `artifacts/r115-csv-import/run.json`, 미삭제·원격 미push)
- **Base SHA**: `a04237f3da787e33dd37a6ca80e4d97322c575cc` · **Target SHA**: `a01d312dbaf835d33c27b21beb3bd0c32094240e` *(Iteration 02, `main` 병합 `35f4461`)*
- **명세**: [`docs/r113-r116-data-budget-public-spec.md`](r113-r116-data-budget-public-spec.md) §5. Step 1~2 상세 완료·검토 기록은 `docs/archive/handoff-archive.md`로 옮김.
- **DB 변경**: 있음 (`sql/migrations/MIGRATION_R115_EXPENSE_IMPORT.sql`, `SCHEMA.sql`). **운영 DB 적용·확인 쿼리·배포·실제 가져오기·취소 확인 완료(사용자, 2026-11-27)**.

| 순서 | 상태 | 담당 모델 (Level) (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (Iteration 02, SHA: a01d312dbaf835d33c27b21beb3bd0c32094240e)`** | **Claude Opus (`High` — 도구에서 High 선택)** *(Fallback: GPT Codex)* | `Maker (R115 SQL RPC·CSV 파서·가져오기 UI)` | 🐳 **Docker Desktop 필요**. `delete_import_batch`가 편집된 가져오기 행을 지우지 않도록 I1 전체 불변 확인·회귀 테스트 추가, `TESTS.sql` psql 출력 경고 수정. 기존 합의 범위만 보완 | `R115-REV-001`·`002` 수정함 |
| **2** | **`✅ DONE (artifact 4f162821ba59ced29e27c30c18d22b3eb09acc3f; main 병합 35f446188b4971059e83c492b03d9b46949e4e05)`** | **GPT Codex** *(Fallback: Claude Sonnet `Medium` — Maker인 Opus 제외, 불가 시 다른 세션의 Claude Opus)* | `Reviewer & Local DB Gate` | Iteration 02 정적 리뷰·격리 DB 두 경로·병합 후 전체 검증 통과 | review `clean`, DB 2경로 PASS |
| **3** | **`✅ DONE (2026-11-27, 사용자 확인)`** | **사용자** | 운영 DB 마이그레이션 적용·확인 쿼리, 배포, 실제 CSV 가져오기·취소 확인 | 운영 DB `MIGRATION_R115_EXPENSE_IMPORT.sql` 적용·확인 쿼리·배포 완료. 더미 CSV 2종(자체 형식 6건·35,700원, 일반 EUC-KR 5건·50,900원)으로 열 자동 추측·제외 사유·중복 의심·게임 미매칭 배지·`'` 복원을 확인하고 실제 가져오기 5건 → 총자산·지갑·포인트 전후 동일(예상 지출만 변경, I16 설계대로) → `가져오기 취소` 5건 정상 확인 |

#### 📝 `r115-csv-import` 핵심 요약 (2026-11-27)

- **구현**: `expenses.import_batch_id`, SECURITY DEFINER RPC `import_confirmed_expenses`·`delete_import_batch`(가져온 행은 `CONFIRMED`·`WALLET`·자산 미차감·포인트 0이라 총자산·지갑·포인트 원장 불변, 가져온 행 환불도 불변), `src/lib/csv.ts` 파서(UTF-8/EUC-KR), 가져오기 해석(`expense-import.ts`), 지출 페이지 `CSV 가져오기` 단계형 모달(열 자동 추측·제외 사유·중복 의심·게임 미매칭·일괄 취소).
- **리뷰**: Iteration 01에서 `R115-REV-001`(P2, `delete_import_batch` 삭제 조건에 `original_price = final_amount` 누락)·`R115-REV-002`(P4) 확인 → Iteration 02에서 수정, 재리뷰 clean. 🐳 격리 DB 업그레이드·신규 경로 각 2회 멱등·`TESTS.sql` 62개 PASS.
- **사용자 확인**: 열 지정 화면 자동 선택은 구버전 번들·드롭다운 조작 문제로 보였으며 새로 고친 뒤 정상. 회귀 테스트 `1c1ba89`로 열 추측을 고정함.
