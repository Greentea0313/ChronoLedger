# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Gemini(`Hydrogen` 기본 $\to$ `Neon`/`Carbon` 승격)·Claude(`Sonnet` 기본 $\to$ `Opus` 승격) 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 사용자 알림 대기, 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 📣 사용자 알림 대기 (User Notices)

> 무인 작업(주간 문서 감사 등)이 사용자에게 전할 내용을 남기는 곳임. 다음에 `"인수인계 문서를 확인해"`를 처리하는 모델이 답변 첫머리에서 알리고, 같은 턴에 해당 줄을 지우고 커밋함(handoff Skill §1 1단계).

- **현재 알림 없음**

### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **활성 Run 없음** *(직전 Run `r75-r64-tests-readme`는 `main` 병합 `35d43b6`로 마감함. 다음 후보는 사용자 지목 시 등록: `R107C-REV-001·002`·`R109-REV-003`·`R75-REV-001·002`(P4 선택), `R107-A-CLEANUP`·`R109-CLEANUP`(관찰 후))*

### 📌 중단 체크포인트 (Handover Checkpoint)

- **현재 기록된 중단 체크포인트 없음** *(작업 도중 `⚠️ HANDOVER_NEEDED` 발생 시 이 영역에 완료 내역·남은 작업·가정·검증 상태를 기록함)*

### 🗓️ 예약·보류·안건 요약 (자동 실행 대상 아님)

> 아래 항목은 `"인수인계 문서를 확인해"`로 자동 착수하지 않음. 사용자가 지목하면 Orchestrator가 Run으로 등록함.

| ID | 상태 | 요지 | 상세 위치 |
| :--- | :--- | :--- | :--- |
| `R96` | 완료 · 운영 배포 1~5단계 완료 | 운영 DB 마이그레이션·Edge Function·시크릿·`R96-REV-07` 웹훅 설정(`set_push_webhook_config`)·`NEXT_PUBLIC_VAPID_PUBLIC_KEY` 적용 완료, Windows Chrome·안드로이드 실기기 수신 확인(`SENT`, 2026-11-25). 안드로이드 상태 표시줄 흰 사각형은 투명 배지 `badge-96.png`로 `main` 직접 수정함(배포 후 재확인 필요) | `docs/to-do.md` R96·R96-REV-07, [`docs/push-notification-research.md`](push-notification-research.md) §11.5 |
| `R107` | `R107-A·B` 운영 적용 완료 · **`R107-C` `main` 병합 (`9268bf0`)·운영 DB 적용 완료** | 정기·반복 지출 자동화: `R107-A`·`R107-B` 운영 적용 완료 → `R107-C` 자동 확정·원자 환불 롤백 `main` 병합 완료, 운영 `MIGRATION_R107C_AUTO_CONFIRM.sql` 적용·확인 쿼리 검증 완료(2026-11-26), 앱 배포·구독 모달 동작 1회 확인은 사용자 수행. 후속: `R107C-REV-001·002`(P4), `R107-A-CLEANUP`(1주 관찰 후) | [`docs/r107-recurring-expense-automation-spec.md`](r107-recurring-expense-automation-spec.md) §6, `docs/to-do.md` `R107` |
| `R109` | **운영 적용·일괄 이전 완료** | 아이콘 Storage 이전(공용 `game-assets` 버킷). 운영 적용·배포·일괄 이전 검증 완료(2026-11-25). `R109-REV-001·002`는 `p4-followups-r108-r109`(`main` 병합 `c52705c`)에서 완료, `R109-REV-003`(P4 선택)·`R109-CLEANUP`은 사용자 지목 시 | [`docs/r109-icon-storage-migration-spec.md`](r109-icon-storage-migration-spec.md) §4, `docs/to-do.md` R109 |
| `R50` | `📝 AGENDA` | 인증 보안 설정 점검(읽기 전용). 사용자 요청 시에만 착수 | 보관 문서 「병행 검토 안건: 인증 보안 설정 점검」 절 |
| `R90` | `⏸️ 잠정 보류` | 일정 후보 수집. **사용자가 직접 호출할 때만 재개, 재개 추천 금지** | `docs/dcinside-schedule-crawling-review.md` §6, 보관 문서 「보류 Run 기록」 절 |
| `R104` | `⏸️ 보류` | 단기 픽업 재화·과금 계산기 (2026-11-24 사용자 결정으로 보류, 직접 호출 시에만 재검토) | `docs/to-do.md` `R104` |
| `R40`·`R75`·`R99`·후속 | 후속 · 우선 낮음 | `R40`(다중 파티)·`R75`(①·④ 완료 `35d43b6`, `R75-REV-001·002` P4 선택)·`R99`(건의 첨부 🐳) (`R101-REV-001`·`R106-REV-001·002`는 `T1`~`T4` Run, `R108-REV-001`은 `p4-followups-r108-r109` Run에서 완료) | `docs/to-do.md` 해당 항목 |
| `T1`~`T4` | **완료** (`t1-t4-desktop-and-followups` `main` 병합 `5e63007`, `t4-rust-build-and-lock` `main` 병합 `2829bb7`) | Windows Tauri 데스크톱 통합 병합과 Rust 빌드·`Cargo.lock` 갱신 완료. **사용자 확인 대기**: `app.exe` 실행 후 구글 로그인 복귀·`single-instance`·캘린더·결제 흐름(`docs/to-do.md` T4) | 아래 직전 완료 Run 기록, [`docs/t1-t4-desktop-and-followups-spec.md`](t1-t4-desktop-and-followups-spec.md) §4 |

### 🗂️ 직전 완료 Run 기록: `r75-r64-tests-readme` *(`R75` ①·④ R64 SQL 회귀 테스트 보강)*

- **Run ID**: `r75-r64-tests-readme` **(완료, `main` 병합 `35d43b6`, 문서 마감 2026-11-26)** · **Orchestrator**: Claude Sonnet `Medium` *(등록·리뷰·병합·마감)*
- **Worktree 경로**: `.worktrees/r75-r64-tests-readme` (브랜치 `collab/r75-r64-tests-readme`, 매니페스트 `artifacts/r75-r64-tests-readme/run.json`, 미삭제·원격 미push)
- **Base SHA**: `2d4317b8141a5543b09b1d277cd80f54c9e0cf4a` · **Target SHA**: `d35bf3c0e513a9e80cd51098b81dc5832634d347` *(산출물 `7e4e989`, `main` 병합 `35d43b6`)*
- **DB 변경**: 없음(테스트·문서만). 운영 DB 작업 없음.

| 순서 | 상태 | 담당 모델 (Level) | 역할 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: d35bf3c)`** | **Gemini 4 Neon (`High`)** | `Maker (TESTS.sql·README)` | `TESTS.sql` R64·R80 블록에 명세 §7 시나리오 보강(관리자 CRUD·`updated_at`, 비관리자·`user_metadata` 스푸핑·`anon` 쓰기 거부, 조회 범위, CHECK·트리거 메시지 단위 검증, 순서 변경·옵션/축 제거 정리, 게임 삭제 CASCADE), `README` B표 R64 행에 upsert 안내 1줄 |
| **2** | **`✅ DONE (SHA: 7e4e989, 병합 35d43b6)`** | **Claude Sonnet (`Medium`)** | `Reviewer & Orchestrator` | 정적 리뷰 `P4` 2건 비차단(`R75-REV-001·002`), 🐳 로컬 신규 스키마에서 `TESTS.sql` 2회 실행 각 54개 PASS(R64·R80 포함, ROLLBACK), 마이그레이션 변경 없어 멱등 검증·`tsc`·`lint`·Vitest·`build`는 `skipped`(src·package 변경 없음) |

#### 📝 `r75-r64-tests-readme` 핵심 요약 (2026-11-26)

- **리뷰 `P4` (`docs/to-do.md` `R75-REV-001·002`)**: ① 잘못된 `axis_key`·빈 옵션 음성 케이스가 트리거 메시지와 CHECK 이름 둘 중 하나만 맞으면 통과해 개별 방어선 회귀를 못 잡음. ② 비승인 게임 0행 조회를 `games_status_check`(APPROVED 한정)와 정책 정의 문자열(`LIKE %APPROVED%`)로 대체 검증함(현재 비승인 게임이 존재할 수 없어 도달 불가).
- **검증 환경 메모**: 로컬 DB 재설정 시 `storage.objects` 정책 5종도 함께 제거해야 `SCHEMA.sql`이 끝까지 적용됨. `docker cp` 원본 경로는 Git Bash에서 `MSYS_NO_PATHCONV=1`과 함께 저장소 상대 경로를 써야 함.
