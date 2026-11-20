# 변경 이력
## 2026-11-21 (협업 파이프라인: Chief Architect 구체화 규칙)

- 범위를 넘는 요구사항은 Chief Architect(Gemini 4 Argon, 대체 Claude Opus·Gemini 4 Neon)만 구체화하도록 규칙을 추가함. 다른 모델은 `📐 SPEC_NEEDED`로 넘기고, 구체화 후 Run 등록은 Gemini 4 Hydrogen이 이어받음. `인수인계 문서를 확인해` 처리 순서는 `⚠️ HANDOVER_NEEDED` → `📐 SPEC_NEEDED` → `▶ READY`임.


## 2026-11-19 (Run `r84-feedback-and-inbox` 완료 — `main` 병합 `660c3fc`)

- **기타 건의 창구(`R84`)**: 통합 요청 모달에 `기타 건의`(기능 제안·오류 신고·기타, 제목 100자·내용 2,000자) 제출과 내 요청 내역 표시를 추가하고, 내 요청 현황 카드에 `건의` 필터·관리자 답변 표시를 연동함.
- **관리자 건의 대기열**: `/admin/requests`에 `건의` 탭을 추가해 `answer_feedback_request` RPC로 답변 등록(`ANSWERED`)·종료 처리(`CLOSED`)를 원자적으로 처리함(직접 쓰기 폴백 없음).
- **앱 내 알림함**: 로그인 사용자 상단바에 알림 벨(`NotificationBell`)·미읽음 배지(10건 이상 `9+`)·최근 30건 목록·KST 시각·개별/전체 읽음(`mark_notifications_read`)·상대 경로 이동을 추가함.
- **DB·RLS·자동 정리**: `public.feedback_requests`·`public.notifications` 테이블, 엄격한 RLS·계정 삭제 대기 차단·탈퇴 정리, 30일 보관 `pg_cron`(`chronoledger-notifications-purge`), 기존 6개 요청 승인/반려 RPC 및 건의 답변 RPC의 원자적 알림 생성을 반영함.
- **운영 반영**: 운영 Supabase SQL Editor에서 `sql/migrations/MIGRATION_R84_FEEDBACK_AND_NOTIFICATIONS.sql` 수동 적용 및 `sql/README.md` B표 R84 확인 쿼리 검증 완료(사용자, 2026-11-19).

## 2026-11-19 (Run `r84-feedback-and-inbox` iteration-03 — `71824a2`, 미병합)

- SQL 스모크 테스트 R84 블록의 테스트 코드 4건을 고쳐 로컬 DB에서 전체 통과함. 마이그레이션·화면 코드는 그대로임.

## 2026-11-19 (Run `r84-feedback-and-inbox` Step 3 iteration-02 리뷰)

- R84 마이그레이션을 로컬 DB에 2회 적용해 문제없음을 확인함. SQL 스모크 테스트의 R84 블록에서 테스트 코드 문제 4건을 찾아 수정 단계(iteration-03)로 돌려보냄. 병합은 보류함.


## 2026-11-19 (AI 협업 파이프라인 6대 개선안 반영)

- Reviewer가 `run.json` `target_sha`를 아티팩트 커밋에서 갱신하고, 워크트리 Run도 `Target..HEAD` 범위 검사를 하도록 Reviewer·Orchestrator Skill과 `New-CollaborationRun.ps1` 안내 문구를 정리함.
- Maker·SQL Skill·Copilot 지침의 인계 규칙을 Claude(`Sonnet`→`Opus`)·Gemini(`Hydrogen`→`Neon`/`Argon`) 티어 체계와 일치시킴.
- handoff Skill에 다중 PC 워크트리 복원 절차와 Docker 미설치/엔진 꺼짐 분기를 추가하고, `sql/` 변경 Run은 로컬 DB 통과 기록 없이는 `main`에 병합하지 않는 게이트를 둠.
- Orchestrator·docs-closeout Skill에 수용 기준 간결화(설계 문서 포인터 + 8줄)와 서브에이전트 위임 허용·금지 범위를 추가함. 상세: `docs/pipeline-collaboration-review.md` §4.

## 2026-11-19 (UI·코드 후속 개선 5건: `R95`·`R87`·`R75②③`·`13.2-F2`·`13.2-F3`)

- **`R95`**: 수익 내역 삭제(`delete_income`) 실패 시 RPC 오류 사유(`error.message`)를 다이얼로그에 함께 표시함.
- **`R87`**: `ImageSourceDialog`에서 오프라인 시 URL `blur`/`Enter` 변환을 건너뛰고, 관리자 분류 아이콘 모달 닫기 시 `iconError`를 초기화하며, 이미지 등록 모달 설명·안내 문구 어투(`~합니다`)를 통일함.
- **`R75` ②·③**: 관리자 분류 아이콘 삭제 시 `.delete().select("axis_key")`로 0행이면 실패 오류를 표시하고, 템플릿 저장·삭제 후 아이콘 재조회를 취소 가능한 effect(`iconRefreshTick`)로 통합함.
- **`13.2-F2`·`F3`**: `docs/spec/R13_Character_Roster_and_Preset_Spec.md` §2.4·§7.2의 `signed URL` 표현을 `Object URL`로 보정하고, `vitest.config.ts` exclude에 `.claude/worktrees/**`를 추가함.

## 2026-11-19 (`R85` 일정 시간 단위 상세 설계)

- 일정 시각 컬럼·일관성 제약·표시/종료 판정 규칙·입력 폼·게임별 서버 초기화 시각 검토를 담은 `docs/r85-schedule-time-design.md`를 추가함.

## 2026-11-19 (Gemini 4 다단계 운용 및 `Hydrogen` $\to$ `Neon` / `Argon` 승격 기준 수립)

- Gemini 계열 기본 모델을 **`Gemini 4 Hydrogen`**(단기 리셋 쿼터, 기본 Maker·Orchestrator·표준 Reviewer)으로 전환하고, **`Gemini 4 Neon`**(1차 승격: 복합 상태/생명주기·코어 수식/SQL/RPC Maker 및 다단계 Run Orchestrator; Orchestrator 호출 시 `src/**` 직접 수정 제한)과 **`Gemini 4 Argon`**(2차 최상위 승격: 주간 쿼터 보호, 오픈 아키텍처/명세·보안/원장 감사·Run 통합 리뷰 전용, `src/**` 직접 구현 금지) 승격 조건을 `.agents/rules/collaboration.md`, `docs/collaboration-guide.md`, `CLAUDE.md`, `chronoledger-orchestrator` Skill에 반영함.

## 2026-11-18 (`R89` 푸시 알림 설계 조사)

- 플랫폼별 알림 지원 범위, 서버 없는 발송 구조, 알림 DB·RLS 초안, 단계별 구현 Run 분할안을 담은 `docs/push-notification-research.md`를 추가함.

## 2026-11-18 (`skill-support-check` 마감)

- Antigravity가 `.agents/skills/`를 바로 읽는 것을 확인해 별도 사본 없이 운용함. Antigravity 상시 규칙에 `agent_rules.md`·`document_location.md`가 들어가도록 frontmatter를 추가함.

## 2026-11-18 (지침 토큰 절감)

- 운영 문서 4종의 끝난 Run·2026-11-10 이전 기록을 `docs/archive/*-archive.md`로 옮김.
- 지침을 Skill 6개(`handoff`·`chronoledger-orchestrator`·`-maker`·`-reviewer`·`-sql-migration`·`-docs-closeout`)로 나누고 Claude용 `.claude/skills/` 사본과 `scripts/collaboration/Sync-Skills.ps1`을 추가함. 6대 모델 표·Sonnet/Opus 기준은 `collaboration.md`에만 둠.
- 단계 마감 문서 규칙을 바꿈: 상세 기록은 handoff에만, progress는 짧게, changelog는 `main` 반영 때만 씀.
- `CLAUDE.md`·`AGENTS.md`의 검증 스크립트 사용법을 `--artifact`·`--schema` 형식으로 고침.
## 2026-11-16 (R93 마이그레이션 운영 적용)

- 운영 DB에 `MIGRATION_R93_INCOME_HISTORY.sql` 적용·확인 쿼리 검증 완료함(사용자). 수익 내역 기능이 운영에서 활성화됨.

## 2026-11-16 (Run `r93-income-history-db-and-ui` 완료 — `main` 병합 `a1f17e0`)

- 수익을 등록하면 수익 내역으로 남고 총 자산도 함께 늘어남. 지출 화면에 `수익 내역` 탭을 추가해 등록한 수익을 보고 삭제(삭제 시 총 자산도 함께 줄어듦)할 수 있음.
- 운영 DB에는 `MIGRATION_R93_INCOME_HISTORY.sql` 적용이 필요함. 적용 전에는 기존처럼 총 자산만 늘어남.


## 2026-11-16 (게스트 모드 `/dashboard/games` 게임 카드 레이아웃·아이콘 크기 수정)

- `src/app/dashboard/games/page.tsx` 게스트 모드 `전체 게임` 카드를 로그인 카드와 동일한 구조(`w-14 h-14` 고정 크기 아이콘 래퍼, 상단 게임명, 하단 풀폭 `일정 보기` 버튼)로 수정하고 메모·아이콘 변경·구독 해제·순서 이동 버튼은 제외함.
- `src/app/dashboard/games/page.test.tsx` 게스트 카드 레이아웃 및 로그인 전용 버튼 미노출 검증을 보강함.

## 2026-11-16 (`r93` Step 2: 수익 내역 UI·삭제 연동 `7c8883e`)

- 수익 추가 모달이 `record_income` RPC로 수익 행과 총 자산 증액을 한 번에 처리함. 함수가 없는 DB(마이그레이션 미적용)에서만 기존 자산 직접 갱신 경로로 폴백함.
- 소비 페이지 전체 지출 내역 카드에 `[지출 내역 | 수익 내역]` 전환을 추가함. 수익 내역은 목록(표·모바일 카드)과 10건 단위 페이지 이동, 확인 후 삭제(`delete_income`, 총 자산 차감)를 지원함. 병합 전(Step 3 리뷰 대기)임.

## 2026-11-16 (`r93` Step 1: 수익 내역 DB/RPC `7e8f702`)

- 수익 내역 테이블 `incomes`와 원자 RPC `record_income`(수익 추가 + 총 자산 증액)·`delete_income`(본인 수익 삭제 + 총 자산 차감)을 추가함. 직접 쓰기 권한은 주지 않음. 계정 삭제 대기 차단·탈퇴 정리에 연결함.
- `SCHEMA.sql`·`sql/README.md` 확인 쿼리·`TESTS.sql` R93 블록·`database.types.ts`를 반영함. 로컬 DB 실행 검증 전·병합 전임.

## 2026-11-16 (Run `r93-income-history-db-and-ui` 등록 및 활성화 — `R93` 수익 내역 DB/RPC·조회/삭제 UI)

- `New-CollaborationRun.ps1`로 격리 워크트리 `.worktrees/r93-income-history-db-and-ui`(브랜치 `collab/r93-income-history-db-and-ui`, Base `0844387`)를 생성하고 `docs/handoff.md` Active Dispatch Table에 Step 1(`GPT Codex` `▶ READY`, 대체 `Claude Opus` / `Gemini 4 Hydrogen`) → Step 2(`Claude Sonnet` / `Gemini 4 Hydrogen`) → Step 3(`Claude Opus` 리뷰)을 등록함.

## 2026-11-16 (캘린더 색상 통일·주간 필터 기본값·관리자 캐릭터 페이지네이션 UI 개선)

- `BROADCAST` 색상을 `#FF4A42`로 통일하고, 우측 사이드바·주간 목록 배지(`VERSION`·`PICKUP`) 색상을 캘린더 타일(`ScheduleBanner`) 기준으로 일치시킴.
- 주차별 일정 리스트 기본 필터를 `픽업(신규)`로 설정하고, `신규`·`복각` 필터는 이전 주 이월(`carried`) 없이 `start_date` 기준으로만 출력하도록 개선함.
- `/admin` 캐릭터 관리 목록에 20개 단위 페이지네이션을 추가하고, `템플릿 설정 수정`·`템플릿 삭제` 버튼을 `${selectedCharacterLabel} 카탈로그` 제목과 같은 높이 우측 정렬로 배치함.

## 2026-11-16 (Run `r91-r94-weekly-timeline-and-template-delete` 완료 — `main` 병합 `703362e`)

- Step 3 리뷰 지적 4건을 iteration-02(`0d8a5b8`)로 반영하고 `main`에 병합함(`703362e`, `R91`·`R92`·`R94`).
  - `R92-REV-001`: `/admin` 템플릿 삭제 경고 문구에 등록된 픽업 일정·대기 중 일정 요청에서도 해당 캐릭터가 빠진다는 안내를 추가함.
  - `R92-REV-002`: 템플릿 삭제 시 클라이언트 목록 수와 무관하게 `game_characters` 정식 캐릭터 삭제 요청을 항상 실행하도록 보강함.
  - `R94-REV-001`: 주차별 리스트에서 유형 필터 적용 중 일정이 없을 때 `"선택한 필터에 맞는 일정이 없습니다."`로 구분 표시함.
  - `R94-REV-002`: 미사용 상태였던 `splitVersionGroups` 함수·`VersionGroupEntry` 타입·관련 테스트를 제거함.
- `iteration-02/review.json`(`clean`)·`test.json`(`passed`)·`run.json`(`completed`) 스키마 검증 완료 및 워크트리를 정리함.

## 2026-11-16 (`r91-r94` Step 3: 통합 리뷰 `75e2520`)

- Step 1·2 변경을 통합 리뷰하고 `review.json`(지적 4건, P1·P2 없음)·`test.json`(tsc·lint·Vitest·build 통과)을 작성함. 병합 전(Step 4 대기)임.

## 2026-11-16 (`r92` Step 2: 관리자 캐릭터 템플릿 삭제 `8628d5d`)

- 관리자 캐릭터 관리 탭에 `템플릿 삭제` 버튼과 확인 다이얼로그를 추가함. 확인하면 정식 캐릭터(사용자 보유 체크·프리셋 포함)를 먼저 삭제한 뒤 템플릿을 빈 기본값(슬롯 4·돌파 6)으로 초기화하며, 픽업 전용 캐릭터는 유지함.
- 중간 실패 시 오류를 표시하고 같은 버튼으로 다시 시도할 수 있음. DB 변경 없음. 병합 전(Step 3 리뷰 대기)임.

## 2026-11-16 (`r91`·`r94` Step 1: 주차별 리스트 타임라인 개편 `e79e86b`)

- 주차별 리스트에서 이미 끝난 일정(종료일이 오늘 이전)을 숨기고, 날짜순 타임라인 행으로 개편함(날짜 열·`TODAY`·`진행 중` 칩, 캐릭터/게임 아바타와 게임 아이콘 배지, 게임명·기간·`D-n`, 관심 일정 버튼).
- 상단에 `전체·픽업(신규·복각·진행 중)·버전·콘텐츠·방송` 필터 바를 추가함. 게임별 아코디언과 버전 하위 중첩은 주간 목록에서 제거함(선택일 상세의 버전 묶음은 유지). 병합 전(리뷰 대기)임.
## 2026-11-16 (R90 보류 · `R91` 통합 Run 등록)

- R90을 잠정 보류로 바꾸고, `r91-r94-weekly-timeline-and-template-delete`(R91·R94·R92)를 활성 Run으로 등록함. Step 1~4 담당·수용 기준을 `docs/handoff.md`에 기록함.

## 2026-11-16 (`R90` 디시인사이드 수집 2차 검증)

- 검토서 `docs/dcinside-schedule-crawling-review.md`에 §6(Claude Opus 2차 검증 의견)을 추가함. 자동 수집 제외 권장, 경로 A 대안, SSRF 방어용 구조화 값 저장 규칙, 후보함 UX, R90 수용 기준 확정안을 담음.
- `docs/schedule-crawling-research.md` §11에 2차 검증 결과 연계를 추가함.

## 2026-11-16 (6대 AI 협업 모델 체제 확장 — `Gemini 4 Hydrogen` 추가)

- 협업 모델 매트릭스에 **`Gemini 4 Hydrogen`**(`Maker (Feature·UI·Test) & Sub-Orchestrator/Reviewer`)을 추가해 6대 AI 모델 체제로 확장하고, `Gemini 4 Argon`·`Claude Sonnet`·`GPT Codex`·`GitHub Copilot`·`Gemini 3.8 Flash`의 1순위급 대체(Fallback 1) 모델로 연결함 (`AGENTS.md`, `CLAUDE.md`, `.agents/rules/*`, `.agents/skills/*`, `.github/copilot-instructions.md`, `docs/collaboration-guide.md`, `docs/handoff.md`).

## 2026-11-16 (디시인사이드 공식 탭 수집 1차 검토서 생성 및 `R91`~`R94` 신규 과제 등록)

- 디시인사이드 게임별 갤러리 공지/공식 탭 크롤링 가능성 실측 및 약관 대조 검토서 [`docs/dcinside-schedule-crawling-review.md`](dcinside-schedule-crawling-review.md)를 작성하고, Claude Opus 2차 검증 Run(`r90-dcinside-crawling-opus-review` Step 2 `▶ READY`)을 `docs/handoff.md`에 등록함.
- 사용자 신규 요구사항 4건(`R91` 주차별 리스트 `end_date < today` 제외, `R92` 프리셋/템플릿 삭제 버튼, `R93` 수익 내역 저장·조회 경로 추가, `R94` 주차별 리스트 타임라인 UI 개편)을 검토하여 `docs/to-do.md` 및 `docs/handoff.md`에 등록함.

## 2026-11-12 (R86 후속 검토)

- 일정 수집 조사 문서에 10절(사용자 요구사항, HoYoLAB·네이버 약관 확인 결과, pickupgg.com 비교 관찰, 대안·결정 필요 사항)을 추가함.
- 3절 HoYoLAB 판정을 `제외 권장`에서 `제외`(약관상 스크래핑 금지 확인)로 바꿈.
- R90에 재검토 메모를 달고 착수를 보류함.
- 사용자가 제공한 네이버 이용약관 원문으로 라운지 자동 수집 금지를 확인하고, 조사 문서 3절·10.2절의 2차 자료 표기를 원문 확인으로 바꿈.

## 2026-11-12 (작업 트리 정리)

- 완료된 Run의 `.worktrees/` 워크트리 14개와 git 연결이 끊긴 잔여 폴더 7개를 정리함. 브랜치는 모두 유지함. 고유 파일 2개는 저장소 밖에 백업함.

## 2026-11-11 (Run `r86-schedule-crawling-research` 완료)

- 공식 일정 자동 수집 조사 문서를 검토하고 사용자 결정을 반영함.
- 후속 구현 방향을 `schedule_candidates` 별도 테이블, Steam 6개 공지 감지+버전 주기 추정, 하루 1회, Supabase Edge Function+`pg_cron`으로 확정함.
- 네이버·X·비문서화 API는 제외하고, 미확인 약관·Steam 제공 여부는 구현 전 추가 조사 대상으로 남김.

## 2026-11-11 (Run `r86-schedule-crawling-research` Step 1)

- 공식 일정 자동 수집 가능성 조사 문서 `docs/schedule-crawling-research.md`를 추가함. Steam 공식 공지 감지와 버전 주기 추정을 관리자 승인과 묶는 반자동 방식을 권장함.

## 2026-11-11 (R88 운영 적용, Run `r86-schedule-crawling-research` 등록)

- 운영 DB에 `MIGRATION_R88_OPTIONAL_CHARACTER_ICONS.sql` 적용·확인 쿼리 검증 완료함(사용자).
- 공식 일정 자동 수집 가능성 조사(`R86`)를 활성 Run으로 등록함(조사 Opus → 검토 Gemini 4 Argon).

## 2026-11-11 (Run `r88-optional-character-icons` 완료 — `main` 병합 `66d55d8`)

- 템플릿이 있는 게임에서도 캐릭터를 아이콘 없이 추가하거나 아이콘 없는 캐릭터 요청을 승인할 수 있음. 아이콘이 없으면 기본 아바타로 표시함. 운영 DB에는 `MIGRATION_R88_OPTIONAL_CHARACTER_ICONS.sql` 적용이 필요함.
- 협업 규칙: Docker Desktop이 필요한 작업은 미리 확인하고 꺼져 있으면 사용자에게 바로 요청함.


## 2026-11-11 (R88 Step 2 일반 캐릭터 아이콘 선택 사항 UI — `f30ae52`, 미병합)

- 템플릿 게임의 관리자 캐릭터 추가·수정, 신규 캐릭터 요청 승인에서 아이콘 없이도 저장·승인되게 하고 아이콘이 없으면 기본 아바타로 표시함. 마이그레이션 적용 전 DB가 거부하면 `업데이트 적용 전에는 아이콘이 필요합니다.` 안내를 표시함.

## 2026-11-11 (R88 Step 1 — optional character icons, `0be4f44`)

- 템플릿 게임의 일반 캐릭터가 아이콘 없이 등록되도록 DB 제약과 캐릭터 승인 RPC를 완화함.
- 아이콘 형식·용량 검사는 유지하고, 기존 픽업 전용 캐릭터·참조 중 캐릭터의 승격 보호 트리거는 유지함.
- 운영 DB에는 아직 적용하지 않음. UI Step 2와 통합 리뷰 후 사용자 수동 적용 예정임.

## 2026-11-11 (Run `r88-optional-character-icons` 등록, R84·R85 결정, `R89` 예약)

- 템플릿 게임 캐릭터 아이콘을 선택 사항으로 바꾸는 Run을 등록함. R84·R85 착수 전 결정사항을 기록하고 푸시 알림 설계 조사(`R89`)를 예약함.

## 2026-11-11 (Run `r83-schedule-dialog-and-character-sort` 완료 — `main` 병합 `6af6780`)

- 게임별 일정 모달에서 같은 일정이 `기타 일정`에 한 번 더 나오던 문제를 없앰.
- 캐릭터 목록 기본 순서를 첫 번째 분류(예: 속성) 순서 → 이름 가나다순으로 바꿈. 보유 캐릭터 화면, 프리셋 사이드바·선택 창, 관리자 캐릭터 표에 적용함. 즐겨찾기는 사용자가 정한 순서 그대로임.


## 2026-11-11 (R83 기타 일정 제거·캐릭터 기본 정렬 — `bc33d83`, 미병합)

- 게임별 일정 모달에서 `진행 중`·`다음 예정`과 중복되던 `기타 일정` 영역을 제거함.
- 캐릭터 기본 정렬을 첫 번째 분류 축 선택지 순서 → 가나다순 → id로 바꿈(`sortCharactersByClassification`). 보유 캐릭터 화면·프리셋 사이드바·모바일 선택 창·관리자 캐릭터 표에 적용하고 즐겨찾기는 사용자 지정 순서를 유지함. 값이 없거나 템플릿에 없는 분류는 맨 뒤로 보냄.

## 2026-11-11 (Run `r83-schedule-dialog-and-character-sort` 등록)

- 예약 `R83`(게임별 일정 모달 `기타 일정` 중복 제거, 캐릭터 첫 번째 분류 축 + 가나다순 정렬)을 활성 Run으로 등록함(구현 Sonnet → 리뷰 Gemini 4 Argon).

## 2026-11-11 (Run `r79-sql-tests-local-run` 완료 — `main` 병합 `b38d65e`)

- `sql/README.md`의 로컬 `psql` 예시를 유효한 `-h/-p/-U/-d` 연결 인자와 `PGPASSWORD` 방식으로 수정함.
- Base `a580d1d` ↔ Target `270f2c7` 재리뷰에서 `R79-REV-001` 해소 및 findings 없음 확인함. 리뷰·테스트 산출물 `50b26ce` 추가함.
- 기존 로컬 Supabase 실행의 38개 블록 PASS·최종 rollback PASS를 유지함. 이번 재실행은 Docker 엔진 미실행으로 보류함.

## 2026-11-11 (Run `r81-image-input-unification` 완료 — `main` 병합 `3c87917`)

- 게임·캐릭터 커스텀 아이콘, 프로필 사진, 관리자·요청 화면의 모든 이미지 입력을 하나의 등록 모달로 통일함. 이미지 주소 입력, 이미지 붙여넣기(웹 이미지는 원본 주소를 우선 사용해 투명 배경 유지), 파일 선택을 모두 지원하고 미리보기 후 등록함. 캘린더 배경은 기존 방식 유지함.


## 2026-11-11 (R81 Step 3 관리자·요청 화면 이미지 입력 통일 — `c266232`, 미병합)

- 관리자 일정 폼·픽업 전용 캐릭터·캐릭터 폼·게임 폼·분류 아이콘, 요청 승인 화면(게임·캐릭터), 요청 모달(캐릭터 아이콘·제안 이미지)의 인라인 URL·파일 입력을 공용 이미지 등록 모달로 교체함. 저장·승인·제출 경로와 150,000자 검사·AI 업스케일 옵션은 유지함. 게임 폼 아이콘은 명세대로 AI 업스케일 없이 변환함.


## 2026-11-11 (R81 Step 2 공용 이미지 입력 모달 — `77edee9`, 미병합)

- 공용 이미지 등록 모달(URL·붙여넣기·파일·미리보기)과 변환 helper(`image-source.ts`)를 추가하고 사용자 화면 4곳(게임 아이콘·게임 추가 아이콘·보유 캐릭터 아이콘·프로필 사진)에 적용함.
- 붙여넣기는 브라우저 이미지의 원본 주소(`text/html`)를 우선 사용해 투명 배경을 보존하고, 실패할 때만 클립보드 비트맵을 사용함. 투명 배경 이미지는 파일 업로드 권장 안내를 표시함.


## 2026-11-11 (Excalidraw 통합 ERD 및 서비스 기능 상호작용 지도 추가)

- `docs/diagrams/chronoledger-erd.excalidraw` 추가: 5개 영역 20개 테이블·2개 인프라 박스·RPC/트리거/pg_cron/Storage 경계를 포함한 통합 ERD 다이어그램(158개 요소)을 작성함.
- `docs/diagrams/chronoledger-functional-map.excalidraw` 추가: 비개발자·기획 관점의 자연어 기반 6개 기능 영역·목적 콜아웃·상호작용 화살표·3대 핵심 루프를 담은 기능 지도 다이어그램(147개 요소)을 작성함.
- `docs/architecture.md` 수정: 아키텍처 개요 하단에 신규 Excalidraw ERD 및 기능 지도 파일 참조 링크를 추가함.

## 2026-11-11 (캐릭터 기본 아바타 적용)

- 사용자 지정·카탈로그 아이콘이 모두 없는 캐릭터에 사람 실루엣 기본 아바타(`DefaultAvatar`)를 표시함. 기존에는 이름 첫 글자를 보여줌.
- 적용 위치: 캐릭터 아이콘(`CharacterIcon`: 명단·프리셋 보드·선택기), 픽업 아바타(달력 목록·상세·게임 일정), 관리자 캐릭터 목록·표. 업로드한 이미지가 있으면 그대로 그 이미지를 보여줌.

## 2026-11-11 (관심 일정 `+ 예정 지출 추가` 버튼 제거)

- 관심 일정을 눌렀을 때 나오던 `+ 예정 지출 추가` 버튼을 주간 목록·선택일 상세·게임별 일정 모달에서 모두 제거함. 별 버튼(관심 등록/해제)은 그대로임.
- 연결 코드(`onAddPlannedExpense` 전달, 대시보드·게임 페이지의 사전 입력 핸들러, 게임 페이지의 지출 모달)와 관련 테스트도 함께 정리함. 대시보드의 `+ 지출 추가` 버튼은 그대로임.

## 2026-11-11 (R82 버전별 일정 묶음 병합)

- 주간 목록과 선택일 상세에서 같은 게임의 픽업·콘텐츠 일정을 시작일이 속한 버전 아래에 접어 묶어 표시함(요약 `픽업 n · 콘텐츠 n`과 캐릭터 아바타, 누르면 펼침). 달력 칸과 방송 일정은 그대로임. `main` 병합 `2c1f5c5`.

## 2026-11-11 (`r82` Step 1: 버전 아래 일정 묶음 UI `58aa956`)

- 주간 일정 목록과 선택일 상세에서 같은 게임의 픽업·콘텐츠를 시작일이 속한 버전 아래로 접어 표시함(유형별 개수·픽업 아바타 요약, 기본 접힘). 달력 칸·방송 일정은 그대로임.
- 버전 카드가 안 보이는 날의 하위 일정은 단독 카드에 `소속: 버전명` 라벨을 붙임. 소속 판정은 순수 함수 `version-schedule-groups.ts`로 분리함. 병합 전(Step 2 리뷰 대기)임.

## 2026-11-11 (모바일 대시보드 폭·필터 칩 줄바꿈 수정)

- 모바일에서 주차별 리스트를 열면 화면 전체가 넓어지던 문제를 고침(대시보드 본문 열을 화면 폭에 맞춤, `8eaeaf9`).
- 캐릭터 필터의 칩이 라벨 아래로 줄바꿈되던 문제를 고쳐 칩만 라벨 오른쪽 영역에서 줄바꿈되도록 함.
- 붙여넣기 시 투명 배경이 검게 되는 문제는 원인(Windows 클립보드) 확인 후 `r81` 공용 이미지 입력 모달 과제에 개선 기준을 추가함.

## 2026-11-11 (사용자 요청 5건 과제 등록 `R83`~`R86`)

- 일정 모달 중복 표시·캐릭터 기본 정렬(`R83`), 기타 건의 창구(`R84`), 시간 단위 일정 설계(`R85`, `R37` 흡수), 공식 일정 수집 조사(`R86`)를 다음 Run 예약으로 등록함.

## 2026-11-11 (Run `r82-version-grouped-schedules` 등록)

- 버전 일정 기준 일정 묶음 표시 Run을 등록함(구현 Sonnet → 리뷰 Opus). 주간 일정 목록과 선택일 상세만 대상이며 달력 칸은 유지함.

## 2026-11-11 (Run `r81-image-input-unification` Step 1 — `96d4b3d`)

- R81 명세서 `docs/spec/R81_Image_Input_Unification_Spec.md` 추가함. 이미지 입력을 공용 등록 모달 하나로 통일하는 설계(대상 13곳, 캘린더 배경 제외)를 확정함.
- Step 2(`Claude Sonnet`)를 `▶ READY`로 전환함.

## 2026-11-11 (Run `r81-image-input-unification` 등록)

- 이미지 입력 공용 등록 모달 통일 Run을 등록함(명세 Opus → 공용 모달·사용자 화면 Sonnet → 관리자·요청 화면 Sonnet → 리뷰 Opus). Run `r79` Step 2 리뷰는 보류함.

## 2026-11-11 (Run `r79-sql-tests-local-run` Step 2 리뷰 보류)

- Base `a580d1d` ↔ Target `f13087d` 정적 리뷰에서 `R79-REV-001`(P3)을 발견함. `sql/README.md`의 로컬 `psql` 명령이 유효하지 않아 실행 절차대로 재현할 수 없음.
- Docker 컨테이너에서 `TESTS.sql` 자체는 38개 블록 전체 PASS·최종 rollback PASS함. README 명령 수정 후 `main` 병합 필요함.

## 2026-11-11 (보유 캐릭터 목록 확대)

- 보유 캐릭터 목록 아바타 64→80px, 이름 `text-sm`→`text-base`, 열 수 md 6→5·lg 8→6으로 키움. 돌파 배지(10px)·캐릭터 설정 창·프리셋 선택 창은 변경 없음. 게임과 무관하게 동일 크기이며 열 수만 창 폭에 따라 달라짐.

## 2026-11-11 (Run `r79-sql-tests-local-run` Step 1 — `f13087d`, 미병합)

- `sql/tests/TESTS.sql`이 로컬 Supabase에서 처음으로 끝까지 통과함(38개 블록). 사용자 전환 누락, 삭제 대기 상태 잔존, `\gset` 오타 등 테스트 버그 3건을 고침.
- `sql/README.md`에 Docker·Supabase CLI로 로컬에서 테스트를 반복 실행하는 절차를 추가함.

## 2026-11-11 (R80 마이그레이션 운영 적용)

- 운영 DB에 `MIGRATION_R80_CLASSIFICATION_ICON_ADMIN_POLICY.sql` 적용·확인 쿼리 검증 완료함(사용자). 분류 아이콘 쓰기 정책이 다른 관리자 기능과 같은 조건으로 운영에 반영됨.

## 2026-11-11 (Run `r80-classification-icon-admin-policy` Step 2 — `main` 병합 `dbded69`)

- Base `103dbf5` ↔ Target `c6ddd4d` 정적 리뷰에서 findings 없음으로 확인하고 `main`에 병합함.
- `review.json`·`test.json`을 추가함. tsc·lint·diff-check·Vitest 64파일/783개 통과함.
- 운영 DB에는 R80 마이그레이션이 아직 미적용 상태이며, 사용자 적용·아이콘 저장 재시험이 남아 있음.

## 2026-11-11 (Run `r80-classification-icon-admin-policy` Step 1 — `a2c2f47`·`c6ddd4d`, 미병합)

- 분류 아이콘 쓰기 정책을 다른 관리자 테이블처럼 JWT `app_metadata.role` 또는 `users.role = 'admin'`이면 허용하도록 바꾸는 마이그레이션 `MIGRATION_R80_CLASSIFICATION_ICON_ADMIN_POLICY.sql`을 추가함(운영 미적용).
- 관리자 분류 아이콘 저장·삭제 실패 시 권한 문제(`42501`)나 오류 코드·메시지를 함께 표시함.
- 보유 캐릭터 화면 아바타를 64px, 이름을 한 단계 큰 글자로 키움. 모든 게임에서 같은 크기임.

> 2026-11-10 이전 기록은 [`docs/archive/changelog-archive.md`](archive/changelog-archive.md)로 옮김.
