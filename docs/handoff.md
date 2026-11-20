# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Gemini(`Hydrogen` 기본 $\to$ `Neon`/`Argon` 승격)·Claude(`Sonnet` 기본 $\to$ `Opus` 승격) 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **활성 Run 없음** *(2026-11-21 `r98-character-icon-remove` 완료·`main` 병합 `56c26ce`. 다음 착수 후보: `R39` 일일 알림, `R85` 일정 시간 단위, `R97` Tauri 알림)*

### 📌 중단 체크포인트 (Handover Checkpoint)

- **현재 기록된 중단 체크포인트 없음** *(작업 도중 `⚠️ HANDOVER_NEEDED` 발생 시 이 영역에 완료 내역·남은 작업·가정·검증 상태를 기록함)*

### 🗓️ 예약·보류·안건 요약 (자동 실행 대상 아님)

> 아래 항목은 `"인수인계 문서를 확인해"`로 자동 착수하지 않음. 사용자가 지목하면 Orchestrator가 Run으로 등록함.

| ID | 상태 | 요지 | 상세 위치 |
| :--- | :--- | :--- | :--- |
| `R85` | 설계·결정 완료 · 구현 Run 예약 대기(🐳) | 일정 시각(`start_at`·`end_at`·예상 표시) + 게임별 서버 초기화 시각(`games.daily_reset_time`) | [`docs/r85-schedule-time-design.md`](r85-schedule-time-design.md) §10, `docs/to-do.md` R85 |
| `R39` | 결정 완료 · 2차 Run 예약 (`r39-daily-notifications`) | `R84` 완료 후 착수 가능. `notification_settings` + `pg_cron` 일일 알림(KST 09:00, 관심 일정 시작 당일·종료 D-1·예정 지출 결제일 D-1 3종) + 설정 화면 알림 토글 (DB 변경, 🐳 Docker 필요) | `docs/to-do.md` R39, [`docs/push-notification-research.md`](push-notification-research.md) §4.2·§5.2·§8·§9 |
| `R96` | 결정 완료 · 3차 Run 예약 (`r96-web-push`) | `R39` 완료 후 착수. VAPID·`push_subscriptions`·Edge Function `send-notifications`·`pg_net` 웹훅·SW `push` 핸들러·로그아웃 구독 해제·iOS 홈 화면 안내 (DB·Edge Function 변경, 🐳 Docker 필요) | `docs/to-do.md` R96, [`docs/push-notification-research.md`](push-notification-research.md) §3·§4·§5.1·§8 |
| `R97` | 결정 완료 · 4차 Run 예약 (`r97-tauri-notifications`) | `R84` 완료로 착수 가능. Windows 데스크톱(Tauri v2) `@tauri-apps/plugin-notification` 연동 + 앱 실행 중 새 알림 OS 네이티브 표시 (DB 변경 없음) | `docs/to-do.md` R97, [`docs/push-notification-research.md`](push-notification-research.md) §3.3·§8 |
| `R50` | `📝 AGENDA` | 인증 보안 설정 점검(읽기 전용). 사용자 요청 시에만 착수 | 보관 문서 「병행 검토 안건: 인증 보안 설정 점검」 절 |
| `R90` | `⏸️ 잠정 보류` | 일정 후보 수집. **사용자가 직접 호출할 때만 재개, 재개 추천 금지** | `docs/dcinside-schedule-crawling-review.md` §6, 보관 문서 「보류 Run 기록」 절 |
| `R40`·`R75` | 후속 · 우선 낮음 | 리뷰 후속·확장 설계 (`R75` ①·④ 🐳 Docker 필요) | `docs/to-do.md` 해당 항목 |

### 🗂️ 직전 완료 Run 기록: `r98-character-icon-remove`

- **Run ID**: `r98-character-icon-remove` **(완료, `main` 병합 `56c26ce`, 2026-11-21)** *(`R98`: 관리자 캐릭터 모달, 사용자 캐릭터 등록 요청 모달, 관리자 캐릭터 요청 대기열에 캐릭터 아바타/아이콘 이미지 제거 기능 추가)*
- **Orchestrator & Reviewer**: Gemini 4 Hydrogen *(2026-11-21 등록·리뷰·병합 마감)*
- **Worktree 경로**: `.worktrees/r98-character-icon-remove` (브랜치: `collab/r98-character-icon-remove`, 매니페스트: `artifacts/r98-character-icon-remove/run.json`, 미삭제·원격 미push)
- **Base SHA**: `bc9e0265abee74b71c50d2886908395ec847ae4e`
- **Target SHA**: `342067dd49346e44bbaa228c2ea9ebe26f7c4e1f` *(iteration-01 리뷰 clean, 산출물 `bfdfb59`, `main` 병합 `56c26ce`)*
- **DB 변경**: 없음. 🐳 Docker 불필요.

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: 342067d)`** | **Claude Sonnet** *(Fallback: Gemini 4 Hydrogen / GitHub Copilot)* | `Maker (R98 캐릭터 이미지 제거 UI & 테스트)` | 관리자 캐릭터 모달·요청 모달·관리자 요청 대기열에 `이미지 제거` 추가 및 Vitest 5건 보강. tsc·lint·Vitest 70파일/900개 통과 |
| **2** | **`✅ DONE (산출물 bfdfb59, main 병합 56c26ce)`** | **Gemini 4 Hydrogen** *(Fallback: Claude Sonnet / GitHub Copilot)* | `Reviewer & Orchestrator` | Base `bc9e026` ↔ Target `342067d` 정적 리뷰 **clean**(지적 0건). tsc·lint·Vitest 70파일/900개·`next build`(16페이지) 통과 후 `main` 병합 `56c26ce` 및 병합 후 검증 통과 |

#### 📝 `r98-character-icon-remove` Step 2 완료 기록 (Gemini 4 Hydrogen, 2026-11-21)

- **리뷰 범위·독립성**: Base `bc9e0265abee74b71c50d2886908395ec847ae4e` ↔ Target `342067dd49346e44bbaa228c2ea9ebe26f7c4e1f`. 범위 검사(`merge-base --is-ancestor`·`Target..HEAD`의 `src`·`sql` 변경 0건) 통과, Maker(Claude Sonnet)와 다른 모델로 독립 리뷰함.
- **정적 리뷰 (`clean`, 지적 0건)**: 6개 허용 파일 외 변경 없음. 일반/픽업 전용 캐릭터 `default_icon_url: null` 분기, 요청 모달 `null` 제출, 요청 대기열 교체 이미지 초기화 모두 수용 기준과 일치함.
- **산출물·검증**: `artifacts/r98-character-icon-remove/iteration-01/review.json`·`test.json`, `run.json` 갱신 후 워크트리 커밋 `bfdfb59` (이 PC Python에 `jsonschema` 모듈 미설치로 `json.load` + 스키마 수동 대조 검증). 워크트리 `tsc --noEmit`, `npm run lint`, Vitest 70파일/900개, `next build` 통과 후 `main` 병합(`56c26ce`), 병합 후 `main`에서 `tsc`·`lint`·Vitest 70파일/900개 재통과 확인함. 실브라우저 확인 및 워크트리/브랜치 정리는 사용자 선택 대기.
