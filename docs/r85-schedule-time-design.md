# R85 일정 시간 단위 관리 상세 설계 (게임별 서버 초기화 시각 검토 포함)

- **작성**: Claude Opus, 2026-11-19 (사용자 요청). 문서 전용 설계임. 코드·DB 변경 없음.
- **기준**: `main` `cb4e441`의 `sql/SCHEMA.sql`·`src/**`. `R37`은 이 설계에 흡수됨.
- **확정된 사용자 결정 (2026-11-11)**: 시각은 **분 단위**, 종료 시각을 입력하지 않으면 **날짜만 표시**, 시간대는 **KST로 입력·표시**, **달력 칸에는 시각 표시 안 함**(선택일 상세·주간 목록·게임별 일정 모달에만 표시).

## 1. 결론 요약

- **날짜는 그대로 기준으로 둠**: `start_date`·`end_date`(DATE)는 달력 배치·예산 귀속(PLANNED = 종료일 월)·예정 지출 동기화 트리거·D-n의 기준으로 유지함. 시각은 **표시·종료 판정·알림용 선택 정보**로만 더함.
- **추가 컬럼** (`game_schedules`·`schedule_requests` 공통): `start_at TIMESTAMPTZ NULL`, `end_at TIMESTAMPTZ NULL`, `start_at_estimated BOOLEAN`, `end_at_estimated BOOLEAN`.
- **일관성**: 시각이 있으면 그 시각의 KST 날짜가 해당 날짜 컬럼과 같아야 함(DB CHECK). 폼은 날짜·시각을 함께 받아 두 값을 같이 저장함.
- **게임별 서버 초기화 시각**: `games.daily_reset_time TIME NULL`(KST)로 **도입 권장**. 다만 역할은 "관리자 입력 보조(종료 시각 빠른 채우기)·게임 정보 표시"로 한정함. 일정 시각을 자동으로 바꾸거나 날짜 경계를 바꾸는 데는 쓰지 않음(3절).
- **DB 변경이 있음** → Opus 승격 조건 ①. 🐳 로컬 Supabase 검증 필요.

## 2. 현행 구조와 영향 범위

- **스키마**: `game_schedules`·`schedule_requests`는 `start_date`·`end_date DATE NOT NULL`과 `CHECK (end_date >= start_date)`만 있음. `games`에는 시각 관련 컬럼 없음.
- **날짜를 쓰는 곳 (시각 영향 검토 대상)**:

| 위치 | 현재 용도 | 시각 도입 후 |
| :--- | :--- | :--- |
| `desktop-calendar.tsx` (달력 칸) | 기간 막대 배치 | **변경 없음** (결정: 달력 칸 시각 미표시) |
| `hero-sidebar.tsx` (선택일 상세) | 기간·D-n·버전 묶음 | 시각 표시, 당일 종료 처리 |
| `weekly-schedule-list.tsx` (주차별 리스트) | 기간 `MM.DD ~ MM.DD`·D-n·종료 제외(R91) | 시각 표시, 종료 판정에 `end_at` 사용 |
| `dashboard/games/page.tsx` (게임별 일정 모달) | 진행 중/다음 예정 구분 | 시각 표시, 구분에 시각 사용 |
| `admin/page.tsx` (일정 등록·수정) | 날짜 입력 | 날짜+시각 입력, 초기화 시각 빠른 채우기 |
| `request-submission-modal.tsx`·`admin/requests/page.tsx`·`user-requests-card.tsx` | 일정 요청 입력·검토 | 선택 시각 입력·표시 |
| `budget-calculations.ts`·`expense-modal.tsx`·`overdue-planned-modal.tsx`·`subscription-sync.ts` | 지출 날짜·예산 귀속 | **변경 없음** (지출은 날짜 기준 유지) |
| `version-schedule-groups.ts` | 버전 하위 묶음(날짜 포함 관계) | 변경 없음 (날짜로 판정) |
| SQL `sync_version_expenses_trigger`, 승인 RPC | 날짜 변경 시 예정 지출 동기화, 요청 복사 | 트리거는 그대로, 승인 RPC는 새 컬럼 복사 추가 |

## 3. 게임별 서버 초기화 시각 필요성 검토

### 3.1 왜 필요한가

- 게임 공지의 기간은 대개 **서버 기준 시각**이고, 종료는 일일 초기화 직전(예: "~ 11.27 03:59 (서버 시간)")인 경우가 많음. 서버 시간대가 KST와 다르면(예: UTC+8 서버의 04:00 = KST 05:00) 관리자가 매번 KST로 환산해야 함.
- 게임마다 초기화 시각이 달라 "종료 = 초기화 1분 전" 같은 관례를 관리자가 기억해야 함 → 입력 실수 가능성이 큼.
- 날짜만 있으면 "11.27 새벽 4:59 종료" 일정이 11.27 하루 종일 진행 중으로 보임. 이 문제는 `end_at`으로 해결하되, `end_at` 입력을 쉽게 하려면 초기화 시각이 필요함.

### 3.2 무엇에 쓰고, 무엇에 쓰지 않는가

| 용도 | 판정 | 이유 |
| :--- | :--- | :--- |
| 관리자 일정 폼 `[초기화 시각으로 종료]` 버튼: 종료일의 `초기화 시각 − 1분`을 종료 시각에 채움 | **사용** | 가장 흔한 입력을 한 번에 끝냄. 관리자가 확인 후 저장 |
| 게임 정보(게임별 일정 모달 등)에 "서버 초기화 05:00" 표시 | 사용 | 사용자가 일정 시각 해석에 참고 |
| 시작 시각 기본값 | **사용 안 함** | 시작은 점검 종료 후라 매번 다름 |
| 시각 없는 일정의 종료 시각을 자동으로 초기화 시각으로 간주 | **사용 안 함** | 결정 "종료 시각 미입력 시 날짜만 표시"와 충돌. 추정값을 사실처럼 보이게 함 |
| "게임 기준 오늘"(초기화 전까지 어제로 보는 날짜 경계) | **사용 안 함** | 달력·예산이 KST 날짜 기준이라 기준이 둘로 갈라짐 |
| 알림 발송 시각 | 이번 범위 제외 | R39 일일 알림은 KST 09:00 고정으로 확정됨. 시각 기반 알림은 후속 |

### 3.3 저장 형태

- `games.daily_reset_time TIME NULL`: **KST 기준 시:분**. NULL이면 버튼을 숨김.
- 시간대 컬럼은 두지 않음: 입력·표시가 KST로 확정됐고, KST는 서머타임이 없음. 한국 이용자가 쓰는 아시아 서버(UTC+8 등)도 서머타임이 없어 KST 환산값이 1년 내내 같음.
- **한계**: 서버별로 초기화 시각이 다른 게임(아시아·미주 서버 등)은 한국 이용자 기준 서버 1개 값만 둠. 주간 초기화(요일)는 범위 밖임.
- 관리자 `/admin` 게임 정보 수정 모달에 입력란 추가. 게임별 실제 값은 관리자가 공식 공지로 확인해 입력함(이 문서에서는 정하지 않음).

## 4. 데이터 모델

### 4.1 컬럼 (`game_schedules`, `schedule_requests` 동일)

| 컬럼 | 타입 | 의미 |
| :--- | :--- | :--- |
| `start_at` | `TIMESTAMPTZ NULL` | 시작 시각. NULL이면 시작 날짜만 표시 |
| `end_at` | `TIMESTAMPTZ NULL` | 종료 시각. NULL이면 종료 날짜만 표시(결정) |
| `start_at_estimated` | `BOOLEAN NOT NULL DEFAULT false` | 시작 시각이 예상값(예: 점검 종료 예정) |
| `end_at_estimated` | `BOOLEAN NOT NULL DEFAULT false` | 종료 시각이 예상값(예: 다음 버전 점검 예정) |

- `TIMESTAMPTZ`로 저장하고 화면은 항상 `Asia/Seoul`로 변환해 보여줌. 분 단위 입력이므로 초·밀리초는 0으로 저장함(CHECK).

### 4.2 CHECK 제약

```sql
CONSTRAINT chk_<t>_start_at_date CHECK (start_at IS NULL OR (start_at AT TIME ZONE 'Asia/Seoul')::date = start_date),
CONSTRAINT chk_<t>_end_at_date   CHECK (end_at   IS NULL OR (end_at   AT TIME ZONE 'Asia/Seoul')::date = end_date),
CONSTRAINT chk_<t>_at_order      CHECK (start_at IS NULL OR end_at IS NULL OR end_at > start_at),
CONSTRAINT chk_<t>_at_minute     CHECK ((start_at IS NULL OR date_trunc('minute', start_at) = start_at)
                                    AND (end_at   IS NULL OR date_trunc('minute', end_at)   = end_at)),
CONSTRAINT chk_<t>_estimated_needs_at CHECK ((NOT start_at_estimated OR start_at IS NOT NULL)
                                          AND (NOT end_at_estimated OR end_at IS NOT NULL))
```

- 기존 `end_date >= start_date`는 유지함. 같은 날 시작·종료도 허용(시각 순서만 검사).
- **날짜 변경과의 관계**: 관리자가 날짜만 바꾸고 시각을 그대로 두면 CHECK 위반이 남 → 폼이 날짜·시각을 하나의 입력으로 다루게 해 막음(6절). DB 쪽 자동 보정 트리거는 두지 않음(값을 조용히 바꾸지 않기 위함).
- **기존 트리거 영향 없음**: `sync_version_expenses_trigger`는 `start_date`·`end_date`가 바뀔 때만 동작함. 시각만 바뀌면 예정 지출을 건드리지 않음.

### 4.3 `games`

- `daily_reset_time TIME NULL` + `CHECK (daily_reset_time IS NULL OR date_trunc('minute', daily_reset_time) = daily_reset_time)`.
- 기존 관리자 게임 관리 RLS(JWT `app_metadata.role`)를 그대로 따름. `anon` 조회 권한에 이 컬럼 포함(게스트 화면 표시용, 민감하지 않음).

### 4.4 RPC·트리거

- `approve_schedule_request`: 신규 INSERT·대상 일정 UPDATE 모두 `start_at`·`end_at`·두 플래그를 복사함.
- 관리자 일정 등록·수정은 현재 클라이언트 `insert`/`update` + RLS 구조이므로 그대로 두고 컬럼만 추가함(금전 변경이 아님).
- 사용자 요청 INSERT 정책(`schedule_requests`)은 새 컬럼을 허용하되 CHECK로 일관성을 보장함.

### 4.5 마이그레이션·호환

- `sql/migrations/MIGRATION_R85_SCHEDULE_TIMES.sql`(재실행 안전: `ADD COLUMN IF NOT EXISTS`, 제약은 존재 확인 후 추가, 승인 RPC `CREATE OR REPLACE`) + `SCHEMA.sql`·README B표·`TESTS.sql`·`database.types.ts` 반영.
- **미적용 DB 폴백**: 일정 조회 select에 새 컬럼을 넣으면 미적용 DB에서 `42703`/`PGRST204` 오류가 남 → 기존 `user_games.memo`와 같이 새 컬럼 없이 재조회하고 시각 없음으로 처리함. 저장 시에도 같은 오류면 시각을 빼고 저장한 뒤 "DB 업데이트 후 시각 저장 가능" 안내함.

## 5. 표시 규칙

### 5.1 기간 문자열 (공용 함수 `formatSchedulePeriod`)

| 데이터 | 표시 예 |
| :--- | :--- |
| 시각 없음 | `11.13 ~ 11.27` (현행) |
| 시작·종료 시각 있음 | `11.13 11:00 ~ 11.27 04:59` |
| 종료 시각만 있음 | `11.13 ~ 11.27 04:59` |
| 예상 시각 | `11.13 11:00(예상) ~ 11.27 04:59` |
| 같은 날 | `11.20 20:00 ~ 22:00` |

- 시각은 24시간제 `HH:mm`, KST. 시간대 표기는 화면 머리말 또는 도움말에 "모든 시각은 한국 시간(KST)" 한 번만 표시함.
- 달력 칸(`desktop-calendar.tsx`, 모바일 달력 타일)은 바꾸지 않음.

### 5.2 진행 상태·종료 판정 (공용 함수 `getScheduleStatus(schedule, now)`)

- **시작 전 / 진행 중 / 종료**를 아래 순서로 판정함.
  - 종료: `end_at`이 있으면 `now >= end_at`, 없으면 `end_date < 오늘(KST)`.
  - 시작 전: `start_at`이 있으면 `now < start_at`, 없으면 `start_date > 오늘`.
  - 나머지는 진행 중.
- **적용 위치**:
  - 주차별 리스트(R91 종료 제외): `end_date < 오늘`이 아니라 위 종료 판정으로 제외함 → 새벽 종료 일정이 그날 아침부터 빠짐.
  - 게임별 일정 모달의 `진행 중`·`다음 예정` 구분, 주차별 리스트 픽업 필터 `진행 중` 칩.
  - 선택일 상세: 선택한 날이 오늘이고 이미 종료된 일정은 `종료` 배지로 흐리게 표시함(과거 날짜를 고른 경우는 현행대로 그 날의 일정으로 보여줌).
- **D-n은 날짜 기준 유지**(`getDdayLabel`): 종료 당일은 `D-Day`. 종료 당일이고 `end_at`이 있으면 `D-Day` 대신 `오늘 04:59 종료`(이미 지났으면 `종료`)로 표시함.
- 화면이 열린 채 시각이 지나는 경우: 1분 주기 재계산은 하지 않음. 화면 진입·포커스 복귀·날짜 변경 때 다시 계산함(기존 데이터 로드 패턴과 같음).

## 6. 입력 폼

### 6.1 관리자 일정 등록·수정 (`/admin`)

- 시작·종료 각각 `날짜` + `시각(선택)` + `예상` 체크. 시각을 비우면 날짜만 저장.
- 시각을 입력하면 저장 시 `start_at = (날짜 + 시각) KST`로 만들고 `start_date`는 그 날짜로 둠(같은 입력에서 만들어지므로 CHECK 위반이 생기지 않음).
- 날짜를 바꾸면 입력된 시각은 유지하고 새 날짜와 합쳐 다시 계산함.
- `[초기화 시각으로 종료]` 버튼: 게임에 `daily_reset_time`이 있을 때만 표시. 종료일 + `초기화 시각 − 1분`을 종료 시각에 채움. 초기화 시각이 `00:00`이면 전날 `23:59`가 되므로 종료일도 하루 당겨지는 점을 버튼 옆에 미리 보여줌.
- 검증 문구: 종료 시각이 시작 시각보다 빠르면 저장 차단.
- 모바일: 기본 `<input type="time" step="60">` 사용.

### 6.2 사용자 일정 요청 (`request-submission-modal.tsx`)

- 관리자 폼과 같은 선택 입력을 둠(필수 아님). 관리자 검토 화면·내 요청 카드에 같은 기간 문자열로 표시함.

### 6.3 게임 정보 수정 (`/admin` 게임 정보 모달)

- `서버 초기화 시각 (KST)` 선택 입력. 도움말: "공지 시각이 서버 시간이면 한국 시간으로 바꿔 입력".

## 7. 알림(R39·R96)과의 관계

- `R39` 일일 알림(KST 09:00, 관심 일정 시작 당일·종료 D-1, 예정 지출 D-1)은 날짜 기준이라 이 설계와 독립적으로 진행 가능함.
- 시각이 생기면 가능한 후속(이번 범위 제외): "종료 N시간 전", "시작 시각 도달" 알림. 하루 1회 실행으로는 맞출 수 없어 주기 실행(예: 15분) 또는 예약 발송이 필요함 → 비용·구조 검토 후 별도 과제로 둠.

## 8. 테스트 기준

- **SQL (`TESTS.sql`)**: 시각·날짜 불일치 거부, 종료 시각이 시작 이전이면 거부, 초 단위 값 거부, 예상 플래그만 켜고 시각 없음 거부, 승인 RPC가 시각·플래그를 복사, 시각만 바꾸면 예정 지출 날짜 불변, `daily_reset_time` 초 단위 거부.
- **Vitest**: `formatSchedulePeriod` 5가지 표시, `getScheduleStatus`(시각 있음/없음·경계 시각·같은 날), 주차별 리스트가 오늘 새벽 종료 일정을 제외, 관리자 폼 날짜·시각 합성·초기화 버튼(00:00 경계 포함)·미적용 DB 폴백.

## 9. 구현 Run 분할안

| 순서 | 단계 | 범위 | 담당(안) |
| :---: | :--- | :--- | :--- |
| 1 | DB | 4절 마이그레이션·SCHEMA·README·TESTS·타입 (🐳) | GPT Codex / Claude Opus |
| 2 | 공용 로직 | `formatSchedulePeriod`·`getScheduleStatus`·조회 폴백 + 테스트 | Claude Sonnet |
| 3 | 화면 | 관리자 일정·게임 정보 폼, 요청 모달, 선택일 상세·주차별 리스트·게임별 일정 모달 표시 | Claude Sonnet / Gemini 4 Hydrogen |
| 4 | 리뷰 | Base↔Target 통합 리뷰, 로컬 DB 실행 | Claude Opus |

- 2·3단계는 같은 파일을 많이 건드리므로 한 Maker가 순서대로 진행하는 편이 충돌이 적음.

## 10. 사용자 결정 필요

1. **예상 시각 표시 단위**: 시작·종료 따로(권장) / 일정 전체에 하나.
2. **오늘 새벽에 끝난 일정**: 주차별 리스트에서 종료 시각이 지나면 바로 제외(권장) / 현행처럼 그날 하루는 표시.
3. **게임별 서버 초기화 시각**: 도입(권장, 입력 보조·표시 전용) / 보류.
4. **사용자 일정 요청에도 시각 입력 허용**: 허용(권장, 선택 입력) / 관리자만.
5. **종료 당일 표시**: `오늘 04:59 종료` 문구(권장) / 현행 `D-Day` 유지.
