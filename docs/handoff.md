# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Sonnet/Opus 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **활성 Run 없음** *(2026-11-18 `r89-push-notification-research` 마감 완료. 다음 착수 후보: `R84` 1차 건의 창구 + 앱 내 알림함 또는 `R85` 일정 시간 단위 설계)*

### 📌 중단 체크포인트 (Handover Checkpoint)

- **현재 기록된 중단 체크포인트 없음** *(작업 도중 `⚠️ HANDOVER_NEEDED` 발생 시 이 영역에 완료 내역·남은 작업·가정·검증 상태를 기록함)*

### 🗓️ 예약·보류·안건 요약 (자동 실행 대상 아님)

> 아래 항목은 `"인수인계 문서를 확인해"`로 자동 착수하지 않음. 사용자가 지목하면 Orchestrator가 Run으로 등록함.

| ID | 상태 | 요지 | 상세 위치 |
| :--- | :--- | :--- | :--- |
| `R84` | **결정 완료 · 1차 Run 예약** (`r84-feedback-and-inbox`) | 기타 건의 창구(`feedback_requests`: 기능 제안·오류 신고·기타, 첨부 없음) + `public.notifications` 테이블(30일 보관 `pg_cron`)·앱 내 알림함(상단 벨 아이콘·읽음 처리) + 건의 답변·요청 승인/반려 시 알림 행 생성 (DB 변경, 🐳 Docker 필요) | `docs/to-do.md` R84, [`docs/push-notification-research.md`](push-notification-research.md) §5·§8·§9 |
| `R85` | 결정 완료 · 설계 우선 | 일정 시간 단위 표시(분 단위·종료 미입력 시 날짜만·KST·달력 칸 미표시) | `docs/to-do.md` R85, 보관 문서 「다음 Run 예약 (`R83`~`R86`)」 절 |
| `R39` | 결정 완료 · 2차 Run 예약 (`r39-daily-notifications`) | `R84` 완료 후 착수. `notification_settings` + `pg_cron` 일일 알림(KST 09:00, 관심 일정 시작 당일·종료 D-1·예정 지출 결제일 D-1 3종) + 설정 화면 알림 토글 (DB 변경, 🐳 Docker 필요) | `docs/to-do.md` R39, [`docs/push-notification-research.md`](push-notification-research.md) §4.2·§5.2·§8·§9 |
| `R96` | 결정 완료 · 3차 Run 예약 (`r96-web-push`) | `R39` 완료 후 착수. VAPID·`push_subscriptions`·Edge Function `send-notifications`·`pg_net` 웹훅·SW `push` 핸들러·로그아웃 구독 해제·iOS 홈 화면 안내 (DB·Edge Function 변경, 🐳 Docker 필요) | `docs/to-do.md` R96, [`docs/push-notification-research.md`](push-notification-research.md) §3·§4·§5.1·§8 |
| `R97` | 결정 완료 · 4차 Run 예약 (`r97-tauri-notifications`) | `R84` 이후 착수 가능. Windows 데스크톱(Tauri v2) `@tauri-apps/plugin-notification` 연동 + 앱 실행 중 새 알림 OS 네이티브 표시 (DB 변경 없음) | `docs/to-do.md` R97, [`docs/push-notification-research.md`](push-notification-research.md) §3.3·§8 |
| `R50` | `📝 AGENDA` | 인증 보안 설정 점검(읽기 전용). 사용자 요청 시에만 착수 | 보관 문서 「병행 검토 안건: 인증 보안 설정 점검」 절 |
| `R90` | `⏸️ 잠정 보류` | 일정 후보 수집. **사용자가 직접 호출할 때만 재개, 재개 추천 금지** | `docs/dcinside-schedule-crawling-review.md` §6, 보관 문서 「보류 Run 기록」 절 |
| `R40`·`R75`·`R87`·`R95` | 후속 · 우선 낮음 | 리뷰 P4 이관·후속 설계 | `docs/to-do.md` 해당 항목 |

### 🗂️ 직전 완료 Run 기록: `r89-push-notification-research`

- **Run ID**: `r89-push-notification-research` **(완료, 2026-11-18)** *(`R89` · `R39` 연계: 웹 푸시(PWA)·Tauri 데스크톱 알림 지원 범위, 서버리스 발송 구조, 구독 저장·RLS, 게임 일정·예정 지출 알림 및 `R84` 건의 답변 알림 통합 설계 조사)*
- **Orchestrator**: Gemini 4 Argon *(2026-11-18 사용자 지시로 활성화)*
- **Worktree 경로**: `main` (문서 전용 조사이므로 격리 워크트리·`run.json` 없이 `main`에서 수행함. 코드·SQL 변경 없음)
- **Base SHA**: `d5b9b74312fe271b8e5f38c04a21023efbc156fb`
- **DB 변경**: 없음. 🐳 Docker 불필요.

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (2026-11-18)`** | **Claude Opus** *(Gemini 4 Hydrogen / Gemini 4 Argon 1순위 대체, GitHub Copilot 2순위 대체)* | `Researcher & Architect (R89)` | 아래 **Step 1 수용 기준** 수행. 허용 파일: 신규 `docs/push-notification-research.md`, `docs/handoff.md`, `docs/to-do.md`, `docs/progress.md` | `✅` [`docs/push-notification-research.md`](push-notification-research.md) 작성. 권장: 앱 내 알림함 먼저 → 일일 알림 → 웹 푸시. Tauri(WebView2) 웹 푸시는 미지원으로 판정. 사용자 결정 6건(§9) |
| **2** | **`✅ DONE (2026-11-18)`** | **Gemini 4 Argon** *(Gemini 4 Hydrogen / Claude Opus 1순위 대체, GitHub Copilot 2순위 대체)* | `Reviewer & Orchestrator` | 조사 문서 검토, 사용자 결정 사항을 질문 카드로 확인, `R84` 및 알림 구현 후속 Run 예약 반영, `docs/` 마감 | `✅` 기술·보안 경계 검토 완료, 질문 카드 6건 확정(1차 `R84`+알림함 30일 보관 → 2차 `R39` 일일 3종 KST 09:00 → 3차 `R96` Web Push → 4차 `R97` Tauri OS 알림), 예약 목록 갱신 및 마감 |

#### 📝 `r89-push-notification-research` Step 1 완료 기록 (Claude Opus, 2026-11-18)

- **산출물**: [`docs/push-notification-research.md`](push-notification-research.md). 문서 전용, 코드·DB 변경 없음.
- **결론**: 알림을 DB `notifications` 행으로 먼저 만들고 앱 내 알림함으로 보여준 뒤, 같은 행을 Edge Function이 웹 푸시로 보내는 구조를 권장함. `R84` 답변 알림은 앱 내 알림만으로 먼저 출시 가능함.
- **플랫폼**: Android·데스크톱 브라우저 지원, iOS는 홈 화면 웹 앱(16.4+)에서만, Tauri(WebView2)는 웹 푸시 미지원으로 판정(구독 오류 보고·공식 문서 없음) → 앱 내 알림 + 실행 중 OS 알림만.
- **발송**: `pg_cron` 하루 1회(KST 09:00 안) + 알림 행 INSERT DB 웹훅(`pg_net`) 즉시 호출. 실패 행은 다음 실행이 다시 처리함. VAPID 개인키는 Edge Function Secrets에만 둠.
- **DB 초안**: `push_subscriptions`(endpoint 소유자 교체·로그아웃 시 해제), `notification_settings`, `notifications`(발송 상태·읽음). 모두 본인 조회만, 쓰기는 RPC·DB 함수 전용, 삭제 대기 차단·탈퇴 정리 연결.

#### 📝 `r89-push-notification-research` Step 2 완료 기록 (Gemini 4 Argon, 2026-11-18)

- **검토 결과**: `notifications` 테이블 기반 Outbox 구조, 클라이언트 직접 쓰기 차단(DB 함수·RPC 전용 생성/읽음 처리), 공용 기기 `endpoint` 소유자 교체 및 로그아웃 시 구독 해제, `link_path` 상대 경로(`^/`) 강제, 잠금 화면 민감 정보 배제 설계가 모두 기존 보안·RLS 원칙과 부합함을 확인함. `R39` 예정 지출 알림 기준일은 `expenses.target_date`로 명시함.
- **사용자 결정 확정 (2026-11-18 질문 카드)**:
  1. **단계별 도입 순서**: 1차 `R84`(기타 건의 창구 + 앱 내 알림함) → 2차 `R39`(관심 일정·예정 지출 일일 알림) → 3차 `R96`(Web Push 외부 발송) → 4차 `R97`(Tauri 실행 중 OS 네이티브 알림).
  2. **일일 알림(`R39`) 종류**: 관심 일정 시작 당일(`FAVORITE_START`), 관심 일정 종료 1일 전(`FAVORITE_END_D1`), 예정 지출 결제 예정일 1일 전(`EXPENSE_D1`) 3종(건의 답변·요청 승인/반려 알림은 1차 기본 포함).
  3. **발송 시각·보관 기간·Tauri 범위**: KST 09:00(`0 0 * * *` UTC) 발송, 알림 보관 기간 **30일**(`pg_cron` 자동 정리), Windows Tauri는 앱 내 알림함 + 실행 중 OS 네이티브 알림(`@tauri-apps/plugin-notification`)까지 포함.
- **후속 조치**: `docs/push-notification-research.md` §8·§9에 확정안 반영, `docs/to-do.md` 및 본 문서 예약 요약표에 `R84`·`R39`·`R96`·`R97` 등록, 완료된 `R89` 및 직전 Run `skill-support-check` 기록을 `docs/archive/`로 이관함.
