# R52 기능 명세서: 게임별 동적 캐릭터 템플릿 및 픽업 일정 캐릭터 이미지 연동

- **문서 ID**: `R52-SPEC-v1`
- **상태**: `APPROVED (Claude Opus 리뷰 완료, 2026-11-09) + Amendment A1 (2026-11-09, 사용자 피드백 반영)` — §8 > §7 > §2~§5 순으로 우선함. §7 NR-03·NR-04(`pickup_image_url`)는 §8 D-03에 따라 폐기됨
- **작성일**: `2026-11-09`
- **작성자**: `Gemini 4 Argon (Orchestrator & Architect)`
- **리뷰어**: `Claude Opus (Reviewer & Deep Specialist)`
- **관련 권위 문서**: [`docs/spec/SRS.md`](SRS.md), [`docs/spec/R13_Character_Roster_and_Preset_Spec.md`](R13_Character_Roster_and_Preset_Spec.md), [`sql/SCHEMA.sql`](../../sql/SCHEMA.sql), [`docs/to-do.md`](../to-do.md)

---

## 1. 개요 및 기획 확정 사항

본 명세서는 기존의 게임별 보유 캐릭터 로스터 및 프리셋 기능(`R13` / `R43`)을 구체화하여 다음 3가지 핵심 요구사항을 정의함:

1. **게임별 캐릭터 시스템 템플릿 선행 설정 및 동적 테이블/폼 재구성**:
   - 특정 게임에 캐릭터를 처음 추가할 때 해당 게임의 **캐릭터 시스템 명칭(`character_label`: 공명자, 오퍼레이터, 에이전트 등)**, **전체 등급(`character_rank`: 5성·4성 / S급·A급 등)**, **분류 기준 최대 2가지(`character_class1`, `character_class2`: 운명의 길, 원소, 속성 등 명칭과 하위 선택지 목록)**를 우선 입력하는 템플릿 생성 절차를 거침.
   - 입력된 템플릿 정보에 맞춰 해당 게임의 전용 캐릭터 테이블 뷰 및 캐릭터 추가/수정 모달 템플릿이 동적으로 재구성됨.
2. **캐릭터 등록 게임 전용 보유 체크 및 프리셋 활성화**:
   - 보유 캐릭터 체크는 어디까지나 **조합 프리셋 생성을 위한 장치**이므로, **관리자가 캐릭터를 1명 이상 추가해 놓은 게임들만** `/dashboard/characters`에서 보유 캐릭터 체크 및 프리셋 생성이 가능함.
3. **픽업(`PICKUP`) 일정 캐릭터 이미지 직관적 표시 (캐릭터 지원 게임 vs 미지원 게임 이원화)**:
   - **캐릭터가 등록된 게임(지원 게임)**: 픽업 일정 생성 시 드롭다운에서 픽업 대상 캐릭터(단일 또는 복수)를 선택하면 캐릭터 추가 시 입력된 이미지(`game_characters.default_icon_url`)를 그대로 연결하고 일정 제목도 자동 완성(수동 수정 가능)함.
   - **캐릭터가 등록되지 않은 게임(미지원 게임)**: 픽업 일정 생성 시 해당 픽업 캐릭터의 이미지를 직접 업로드/URL/클립보드 붙여넣기(`pickup_image_url`)로 넣어 일정에 직관적으로 표시함.
   - **노출 위치**: 월간 캘린더 날짜 칸(`DesktopCalendar`) 우상단은 어떤 게임 일정인지 식별할 수 있도록 **기존 '게임 아이콘'을 유지**하고, **우측 사이드바(`HeroSidebarContent`)·주차별 리스트(`WeeklyScheduleList`)·게임별 일정 모달(`ScheduleDialog`/`ScheduleTree`)**의 `PICKUP` 일정 카드에 **캐릭터 이미지**를 표시함.

### 1.1 사용자 질의응답(Q&A) 기반 확정 결정표 (2026-11-09)

| 항목 | 확정 내용 |
| :--- | :--- |
| **Q1. 픽업 일정 캐릭터 이미지 노출 위치** | 캘린더 날짜 칸 우상단은 **게임 아이콘**을 유지하고, **우측 사이드바·주차별 리스트·게임별 일정 모달**의 `PICKUP` 일정 카드에 **캐릭터 이미지**를 표시함. |
| **Q2. 캐릭터 지원 게임의 픽업 일정 등록 방식** | 캐릭터 드롭다운에서 픽업 대상 캐릭터(**단일 또는 복수**)를 선택하면 캐릭터 이미지가 자동 연결되고, 일정 제목도 자동 완성(수동 수정 가능)되도록 구성함. |
| **Q3. 분류 기준(`character_class1`, `class2`) 관리 방식** | 템플릿 최초 생성 시 **분류 기준 명칭**(예: `속성`, `운명의 길`)과 **선택지 목록**(예: `화염, 얼음` / `파멸, 수렵`)을 함께 등록해 이후 캐릭터 추가 시 드롭다운으로 선택함(오타 방지 및 필터 자동 구성). |
| **Q4. 게임별 캐릭터 테이블 생성 DB 구조** | **논리적 동적 템플릿 방식** 채택: DB는 단일 테이블(`public.games` + `public.game_characters`)을 유지해 Supabase PostgREST 스키마 캐시·RLS·타입 안정성을 보장하고, 관리자/사용자 UI가 게임별 템플릿(`character_label`, `rank`, `class1`, `class2`)에 맞춰 전용 테이블·입력폼처럼 동적 재구성되도록 구현함. |
| **Q5. 캐릭터 미지원 게임의 노출 및 사용자 요청 범위** | 구독한 게임 중 **관리자가 캐릭터를 1명 이상 등록한 게임**만 `/dashboard/characters` 상단 게임 선택 바에 노출함(0명인 게임은 숨김, 전부 0명이면 안내 문구 표시). 사용자의 `캐릭터 추가/수정 요청`도 관리자가 템플릿을 생성한 게임에만 허용함. |

---

## 2. 데이터베이스 및 스키마 설계 (논리적 동적 템플릿 & 픽업 이미지 연동)

### 2.1 `public.games.classification_schema` JSONB 확장 규격

물리적 개별 테이블(`CREATE TABLE game_characters_<id>`)을 런타임 DDL로 생성하면 Supabase PostgREST 스키마 캐시 갱신 지연, RLS 정책 누락 위험, 정적 TypeScript 타입 불일치가 발생하므로, `public.games.classification_schema` JSONB에 게임별 캐릭터 테이블 템플릿 정의를 보관하고 `public.game_characters` 행을 게임별 템플릿 스키마에 맞춰 동적 검증·렌더링함.

#### JSONB 구조 (`games.classification_schema`)

```json
{
  "character_label": "공명자",
  "rarities": ["5성", "4성"],
  "axes": [
    {
      "key": "class1",
      "label": "속성",
      "options": ["기류", "전도", "용융", "응결", "회절", "인멸"]
    },
    {
      "key": "class2",
      "label": "무기",
      "options": ["직검", "대검", "권총", "권갑", "증폭기"]
    }
  ]
}
```

#### 기획 용어 ↔ DB JSONB 필드 매핑 및 제약 조건

| 기획 용어 | JSONB 경로 (`games.classification_schema`) | 캐릭터 행 저장 위치 (`game_characters`) | 제약 조건 및 검증 규칙 |
| :--- | :--- | :--- | :--- |
| **`character_label`** *(캐릭터 시스템 명칭)* | `classification_schema.character_label` (`string`, 선택) | - (UI/모달/테이블 호칭에 사용) | 미지정 시 기본값 `"캐릭터"`. 지정 시 공백 제거 길이 `1~20자` 문자열이어야 함 (`공명자`, `오퍼레이터`, `에이전트`, `니케` 등). |
| **`character_rank`** *(전체 등급/성급)* | `classification_schema.rarities` (`string[]`, 필수 배열) | `game_characters.rarity` (`VARCHAR(30)`) | 최고 등급 → 최저 등급 순 문자열 배열 (`0~10개`, 각 `1~20자`, 중복 불가). **`rarities`가 비어 있으면(`[]`) 아직 캐릭터 템플릿이 생성되지 않은 게임으로 판정**하며, 템플릿 생성 시 **최소 1개 이상 필수**. |
| **`character_class1`** *(분류 기준 1)* | `classification_schema.axes[0]` (`{ key, label, options }`) | `game_characters.attributes[axes[0].key]` | `label`: `1~30자` 분류 명칭(예: `속성`, `원소`). `options`: `1~20개` 고유 선택지 문자열 배열. |
| **`character_class2`** *(분류 기준 2)* | `classification_schema.axes[1]` (`{ key, label, options }`) | `game_characters.attributes[axes[1].key]` | `axes` 배열 길이는 **최대 2개(`0~2개`)**로 제한함 (`character_class1`, `character_class2`). |

#### DB 검증 함수 갱신 (`public.is_valid_classification_schema(p_schema JSONB)`)

- `p_schema` 내 선택적 `character_label` 키가 존재할 경우 `jsonb_typeof(p_schema -> 'character_label') = 'string'`이고 `length(btrim(p_schema ->> 'character_label')) BETWEEN 1 AND 20`인지 검증함(키가 없으면 기존 데이터 하위 호환 통과).
- `jsonb_array_length(p_schema -> 'axes') <= 2`로 분류 기준을 최대 2개(`character_class1`, `character_class2`)로 강제함(기존에 3개 축을 가진 데이터가 있는 경우 마이그레이션 전 사전 점검 쿼리로 확인하며, 현재 운영 DB에는 3개 축 사용 게임 없음).

---

### 2.2 픽업(`PICKUP`) 일정 캐릭터 연동 컬럼 (`game_schedules` & `schedule_requests`)

`public.game_schedules`와 `public.schedule_requests` 양쪽 테이블에 다음 두 컬럼을 추가함:

```sql
ALTER TABLE public.game_schedules
    ADD COLUMN IF NOT EXISTS pickup_character_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
    ADD COLUMN IF NOT EXISTS pickup_image_url TEXT;

ALTER TABLE public.game_schedules
    DROP CONSTRAINT IF EXISTS chk_game_schedules_pickup_characters_only_pickup,
    ADD CONSTRAINT chk_game_schedules_pickup_characters_only_pickup
        CHECK (
            cardinality(pickup_character_ids) = 0
            OR (schedule_type = 'PICKUP' AND cardinality(pickup_character_ids) <= 8)
        ),
    DROP CONSTRAINT IF EXISTS chk_game_schedules_pickup_image_valid,
    ADD CONSTRAINT chk_game_schedules_pickup_image_valid
        CHECK (
            pickup_image_url IS NULL
            OR (
                schedule_type = 'PICKUP'
                AND length(pickup_image_url) <= 150000
                AND (
                    pickup_image_url LIKE 'data:image/webp;base64,%'
                    OR pickup_image_url LIKE 'https://%'
                )
            )
        );
```

- `public.schedule_requests`에도 동일한 두 컬럼(`pickup_character_ids UUID[] NOT NULL DEFAULT '{}'::uuid[]`, `pickup_image_url TEXT`)과 동일한 `CHECK` 제약 조건(`chk_schedule_requests_pickup_characters_only_pickup`, `chk_schedule_requests_pickup_image_valid`)을 추가함.
- **비로그인 게스트 모드(`anon`) 호환성**:
  - 게스트 모드에서도 공식 `PICKUP` 일정에 연결된 캐릭터 이미지(`game_characters.default_icon_url`)를 표시할 수 있도록 `public.game_characters`에 `GRANT SELECT ON public.game_characters TO anon;` 및 `CREATE POLICY "Allow anon read game characters" ON public.game_characters FOR SELECT TO anon USING (true);` 정책을 추가함(`game_characters`는 공용 마스터 카탈로그이며 개인정보가 전혀 없음).
- **캐릭터 삭제 시 정합성**:
  - `pickup_character_ids` 배열에 포함된 캐릭터가 삭제되더라도 일정 조회가 깨지지 않도록 클라이언트에서 존재하는 `game_characters` 맵과 교차 조회(없는 ID는 무시)하며, 필요 시 캐릭터 삭제 트리거 또는 정리 로직에서 `array_remove`로 정리함.
- **`public.approve_schedule_request(p_request_id UUID)` RPC 갱신**:
  - `ADD`(신규 일정 등록) 및 `EDIT`(기존 일정 수정) 승인 시 `v_request.schedule_type = 'PICKUP'`이면 `v_request.pickup_character_ids`와 `v_request.pickup_image_url`을 `public.game_schedules`에 그대로 반영하고, `PICKUP`이 아니면 `'{}'::uuid[]` 및 `NULL`로 초기화함.

---

## 3. 관리자(`/admin`) 워크플로 명세

### 3.1 캐릭터 템플릿 유무 판정 기준

- 특정 게임의 `classification_schema.rarities.length > 0`이면 **"캐릭터 템플릿이 활성화된 게임"**으로 판정함.
- `classification_schema.rarities.length === 0`이고 등록된 캐릭터 수(`game_characters` count)가 `0`이면 **"캐릭터 템플릿 미생성 게임"**으로 판정함.

### 3.2 최초 캐릭터 추가 시 2단계 템플릿 생성 플로우

1. **캐릭터 템플릿 미생성 게임 선택 시**:
   - `/admin`의 캐릭터 관리 섹션에서 아직 템플릿이 없는 게임을 선택하면, 빈 테이블 대신 **`"{게임명}의 캐릭터 테이블이 아직 생성되지 않았습니다."`** 안내 카드와 **`[+ 캐릭터 템플릿 생성]`** 버튼을 노출함.
2. **Step 1 — 게임 캐릭터 템플릿 생성/수정 모달**:
   - 입력 항목:
     - **캐릭터 시스템 명칭 (`character_label`)**: 텍스트 입력 (기본값 `"캐릭터"`, 예: `"공명자"`, `"오퍼레이터"`, `"에이전트"`, `"니케"`).
     - **전체 등급 (`character_rank` / `rarities`)**: 최고 등급부터 순서대로 입력 (예: `5성, 4성` 또는 `S급, A급`, **최소 1개 이상 필수**).
     - **분류 기준 1 (`character_class1`)**: 분류 명칭(예: `속성`, `원소`) + 선택지 목록(예: `화염, 얼음, 번개, 바람...`).
     - **분류 기준 2 (`character_class2`)**: 분류 명칭(예: `운명의 길`, `무기`, `직군`) + 선택지 목록(예: `파멸, 수렵, 지식...`).
     - **최대 프리셋 슬롯 (`max_preset_slots`, 1~12)** 및 **최대 돌파 단계 (`max_breakthrough`, 0~12)**.
   - 저장 시 `games.classification_schema`가 갱신되며 해당 게임의 **전용 캐릭터 테이블 뷰**가 즉시 생성(활성화)됨.
   - 최초 템플릿 생성 직후에는 바로 **Step 2 (`{character_label}` 추가 모달)**를 자동으로 열어 첫 캐릭터를 이어서 등록할 수 있게 함.

### 3.3 템플릿 기반 동적 테이블 및 `{character_label}` 추가/수정 모달 재구성

1. **동적 캐릭터 테이블 뷰 (`/admin`)**:
   - 템플릿이 생성된 게임을 선택하면:
     - 상단 액션 버튼이 **`[+ {character_label} 추가]`** (예: `+ 공명자 추가`)와 **`[템플릿 설정 수정]`**으로 표시됨.
     - **성급(`character_rank`)별 분리 표시**: 템플릿의 `rarities` 순서에 따라 성급별 필터 탭(`전체` / `5성 (N)` / `4성 (M)`) 및 성급 그룹 구분이 적용됨.
     - **동적 컬럼 헤더**: 테이블 헤더가 **`[아이콘 | {character_label} 이름 | 등급 | {class1.label} | {class2.label} | 관리]`**로 동적 구성됨(설정되지 않은 분류 기준 컬럼은 숨김).
2. **맞춤형 `{character_label}` 추가/수정 모달**:
   - 모달 제목: **`{게임명} {character_label} 추가`** (수정 시 **`{게임명} {character_label} 수정`**).
   - 입력 필드:
     - **`{character_label} 이름 *`**: 텍스트 입력.
     - **`등급 *` (`character_rank`)**: 템플릿의 `rarities` 목록이 드롭다운(`<select>`)으로 제공되며 **필수 선택**임.
     - **`{class1.label} *` (`character_class1`)**: 템플릿에 분류 기준 1이 정의된 경우 해당 `options` 목록이 드롭다운(`<select>`)으로 제공되며 **필수 선택**임.
     - **`{class2.label} *` (`character_class2`)**: 템플릿에 분류 기준 2가 정의된 경우 해당 `options` 목록이 드롭다운(`<select>`)으로 제공되며 **필수 선택**임.
     - **`{character_label} 아이콘 *`**: 파일 업로드 / 외부 이미지 URL(CORS 프록시 폴백) / 클립보드 이미지 붙여넣기(`Ctrl+V`) → 256×256 WebP Data URL.

---

## 4. 사용자 화면(`/dashboard/characters` & `RequestSubmissionModal`) 명세

### 4.1 `/dashboard/characters` — 캐릭터 추가 게임만 노출

1. **상단 게임 선택 바 필터링**:
   - 사용자가 구독 중인 게임(`user_games`) 중 **관리자가 캐릭터를 1명 이상 등록한 게임(`game_characters` count >= 1)**만 상단 게임 선택 바에 노출함.
   - 관리자가 캐릭터를 추가하지 않은 구독 게임(0명)은 보유 캐릭터 체크 및 프리셋 생성 대상이 아니므로 목록에서 제외함.
2. **지원 게임이 0개일 때의 빈 상태(Empty State)**:
   - 사용자가 게임을 구독하고 있으나 그중 관리자가 캐릭터를 등록한 게임이 하나도 없는 경우:
     - **`"현재 구독 중인 게임 중 캐릭터·프리셋 기능을 지원하는 게임이 없습니다."`**
     - 보조 문구: **`"보유 캐릭터 체크 및 조합 프리셋은 관리자가 캐릭터 카탈로그를 등록한 게임에서만 제공됩니다."`**를 표시함.
3. **게임별 `character_label` 및 성급·분류 필터 반영**:
   - 선택된 게임의 `character_label`(예: `공명자`)을 탭/안내 문구(예: `보유 공명자 N / 전체 M`, `+ 공명자 추가 요청`)에 반영함.
   - 성급(`rarities`) 필터와 최대 2개의 분류 기준(`class1.label`, `class2.label`) 필터 칩을 동적으로 렌더링함.

### 4.2 `RequestSubmissionModal` (`+ 추가 요청` → `캐릭터`)

- 사용자가 `캐릭터 추가/수정 요청`을 선택했을 때, **관리자가 캐릭터 템플릿을 활성화한 게임(`rarities.length >= 1`)**만 게임 선택 드롭다운에서 선택 가능하도록 필터링함.
- 게임 선택 시 해당 게임의 `character_label`, `등급 *` 드롭다운(`rarities`), `{class1.label} *` 드롭다운, `{class2.label} *` 드롭다운으로 입력 폼이 동적으로 재구성됨.

---

## 5. 픽업(`PICKUP`) 일정 캐릭터 이미지 연동 및 노출 명세

### 5.1 픽업 일정 생성/수정 폼 (`/admin` 일정 모달 & `RequestSubmissionModal` 일정 요청)

일정 타입이 **`PICKUP`**으로 선택되었을 때, 대상 게임(`game_id`)에 등록된 캐릭터 목록(`game_characters`) 유무에 따라 아래 두 모드 중 하나로 자동 전환됨:

1. **모드 A — 캐릭터가 등록된 게임 (`gameCharacters.length > 0`)**:
   - **`픽업 {character_label} 선택 (단일 또는 복수)`** 피커(검색 가능한 체크박스칩 목록 또는 멀티셀렉트)를 노출함.
   - 관리자가(또는 요청자가) 픽업 대상 캐릭터를 1명 이상 선택하면:
     - `pickup_character_ids`에 선택된 캐릭터 UUID 배열이 저장됨(`pickup_image_url`은 `null`).
     - 별도 이미지 입력란을 노출하지 않고 **캐릭터 추가 시 입력된 이미지(`game_characters.default_icon_url`)를 그대로 사용**함.
     - **일정 제목 자동 완성**: 일정 제목(`title`)이 비어 있거나 이전 자동 생성 제목 상태일 때, 선택한 캐릭터 이름으로 제목을 자동 완성함(예: 1명 선택 시 `"카프카 픽업"`, 2명 선택 시 `"카프카 · 블랙 스완 픽업"`). 자동 완성 후에도 사용자가 제목을 자유롭게 수정할 수 있음.
2. **모드 B — 캐릭터 추가가 지원되지 않는 게임 (`gameCharacters.length === 0`)**:
   - **`픽업 캐릭터 이미지 (선택)`** 입력란(`pickup_image_url`)을 노출함(`pickup_character_ids`는 `[]`).
   - 이미지 파일 업로드, 외부 이미지 URL 입력(CORS 프록시 폴백), 클립보드 이미지 붙여넣기(`Ctrl+V`)를 지원하여 256×256 WebP Data URL로 변환·미리보기·저장함.

### 5.2 화면별 픽업 캐릭터 이미지 표시 규칙

픽업 일정(`schedule_type === "PICKUP"`)의 표시용 캐릭터 이미지 목록(`pickupAvatars: { id: string; name: string; iconUrl: string }[]`)은 다음과 같이 결정함:
- `pickup_character_ids.length > 0`인 경우: 해당 ID들에 매칭되는 캐릭터들의 이미지(로그인 사용자가 해당 캐릭터에 커스텀 아이콘을 설정한 경우 커스텀 아이콘 우선, 없으면 `game_characters.default_icon_url`)를 순서대로 사용함.
- `pickup_character_ids.length === 0`이고 `pickup_image_url`이 있는 경우: `[{ id: schedule.id, name: schedule.title, iconUrl: schedule.pickup_image_url }]` 단일 아바타로 사용함.
- 둘 다 없는 기존 레거시 `PICKUP` 일정은 기존 표시 방식(게임 아이콘만 표시)을 그대로 유지함.

| 화면 / 컴포넌트 | 픽업 캐릭터 이미지 표시 방식 |
| :--- | :--- |
| **1. 월간 캘린더 날짜 칸 (`DesktopCalendar`)** | 우상단 작은 아이콘은 **기존대로 '게임 아이콘'을 유지**함 (날짜별 어떤 게임 일정이 시작되는지 일관되게 식별). |
| **2. 우측 사이드바 (`HeroSidebarContent`) & 모바일 드로어 (`MobileDrawer`)** | `PICKUP` 일정 카드에서 `pickupAvatars`가 존재하면 일정 제목 좌측(또는 카드 우측/하단 썸네일 영역)에 **28×28px 원형/라운딩 캐릭터 아바타**(복수 캐릭터 시 최대 3개 나란히/겹침 표시 + `title` 툴팁)를 노출함. 묶음 일정 카드에서도 각 하위 `PICKUP` 항목 옆에 해당 캐릭터 아바타를 표시함. |
| **3. 주차별 리스트 (`WeeklyScheduleList`)** | 이미 게임별 그룹 헤더에 게임 아이콘·게임명이 표시되므로, 하위 `PICKUP` 일정 행의 배지/제목 옆에 **24×24px 픽업 캐릭터 아바타**를 표시함. |
| **4. 게임별 일정 모달 (`ScheduleDialog` / `ScheduleTree` in `/dashboard/games`)** | `ON AIR`, `다음 예정 일정`, `버전별 일정` 하위 목록, `지난 일정 기록`에 렌더링되는 모든 `PICKUP` 일정 카드 좌측에 **28×28px 픽업 캐릭터 아바타**를 표시함. |

---

## 6. 단계별 구현 및 협업 파이프라인 계획 (`Phase 13.5` — `R52`)

1. **Step 1 (현재 과제 — `Claude Opus`)**:
   - 본 명세서([`docs/spec/R52_Character_Template_and_Pickup_Avatar_Spec.md`](R52_Character_Template_and_Pickup_Avatar_Spec.md))에 대한 아키텍처·보안(RLS/게스트 `anon` 조회/제약 조건)·하위 호환성·엣지 케이스 심층 리뷰 수행.
   - 리뷰 결과를 본 명세서 하단 `## 7. Claude Opus 아키텍처 및 보안 리뷰 결과` 섹션에 추가하고 상태를 `APPROVED`(또는 보완 반영 후 `APPROVED`)로 갱신함.
2. **Step 2 (`GPT Codex` — DB/RLS/RPC/Types & Tests)**:
   - `sql/migrations/MIGRATION_R52_CHARACTER_TEMPLATE_AND_PICKUP_AVATAR.sql` 작성 (`is_valid_classification_schema` 갱신, `game_schedules`·`schedule_requests`의 `pickup_character_ids`·`pickup_image_url` 컬럼 및 CHECK 제약 추가, `approve_schedule_request` RPC 갱신, `game_characters` `anon` SELECT 정책 추가).
   - `sql/SCHEMA.sql`, `sql/TESTS.sql`, `sql/README.md` 동기화 및 `src/types/database.types.ts`·`src/lib/character-utils.ts` 헬퍼/단위 테스트 구현.
3. **Step 3 (`Claude Sonnet` — Admin & User UI / Pickup Avatar Rendering)**:
   - `/admin` 캐릭터 템플릿 2단계 생성 모달, 동적 캐릭터 테이블/추가 모달 재구성, `PICKUP` 일정 캐릭터 멀티셀렉트(지원 게임) 및 직접 이미지 첨부(미지원 게임) 구현.
   - `/dashboard/characters` 캐릭터 1명 이상 등록 게임 필터링 및 `character_label` 반영, `RequestSubmissionModal` 연동.
   - `/dashboard`(사이드바·주차별 리스트) 및 `/dashboard/games`(`ScheduleTree`) `PICKUP` 캐릭터 아바타 렌더링 및 Vitest 테스트 추가.
4. **Step 4 (`Claude Opus` / `Gemini 4 Argon` — 통합 정적 코드 리뷰 및 마감)**:
   - Base ↔ Target SHA 통합 정적 리뷰(`review.json`), 로컬 PostgreSQL 마이그레이션/스모크 테스트 검증 및 `main` 병합 마감.

---

## 7. Claude Opus 아키텍처 및 보안 리뷰 결과

- **리뷰어**: Claude Opus (Architect & Security Reviewer, Run `r52-character-template-and-pickup-avatar` Step 1)
- **리뷰 일자**: 2026-11-09
- **대조 기준**: `sql/SCHEMA.sql`(`is_valid_classification_schema`, `game_characters`, `cleanup_deleted_game_character_presets`, `approve_schedule_request`, `anon` 정책), `src/lib/image-resizer.ts`, `src/app/dashboard/page.tsx` 일정 조회, R33 리뷰 교훈(`R33-REV-002`·`R33-REV-006`)
- **판정**: 논리적 동적 템플릿 방식(Q4)과 화면 노출 규칙(Q1·Q2·Q5)은 승인함. 다만 아래 보안·무결성·성능 결함은 구현 전에 보완이 필요하여 규범 결정으로 확정함.

### 7.1 주요 지적 사항

| ID | 심각도 | 대상 | 지적 내용 |
| :--- | :--- | :--- | :--- |
| `R52-SR-01` | P2 | §2.2 게스트 호환성 | `game_characters`에는 관리자 계정 UUID인 `created_by` 컬럼이 있음. 테이블 단위 `GRANT SELECT ... TO anon` + `USING (true)`는 비로그인 사용자에게 관리자 식별자를 노출함. |
| `R52-SR-02` | P2 | §2.2 `pickup_character_ids` | 배열 컬럼은 FK가 없어 존재하지 않는 ID, 다른 게임 캐릭터 ID, NULL 요소, 중복 ID를 DB가 막지 못함. 일반 사용자가 `schedule_requests`에 임의 UUID를 넣을 수 있음. |
| `R52-SR-03` | P2 | §2.1 검증 함수 | `CHECK` 제약에 쓰이는 함수를 `CREATE OR REPLACE`로 강화해도 기존 행은 재검증되지 않음. 축 3개·20자 초과 등급 등 기존 데이터가 남아 있으면 해당 게임은 이후 모든 수정이 실패하는 상태가 됨. |
| `R52-SR-04` | P2 | §2.2 `pickup_image_url` | 사용자 요청 경로에 `https://` 외부 URL을 허용하면 승인 후 모든 사용자·게스트 브라우저가 외부 서버로 요청을 보내 추적·콘텐츠 변조 위험이 생김. 또한 대시보드는 `game_schedules`를 `select("*")`로 월 단위 조회하므로 일정당 최대 150,000자 이미지가 캘린더 로드 용량을 크게 늘림(표시 크기는 24~28px). |
| `R52-SR-05` | P3 | §2.2 캐릭터 삭제 | "필요 시 정리"가 선택 사항으로 남아 있음. 삭제된 ID가 배열에 남으면 편집 저장 시 재검증이 실패할 수 있음. |
| `R52-SR-06` | P3 | §2.2 승인 RPC | 요청 제출 후 승인 전에 캐릭터가 삭제되면, 승인 시 존재하지 않는 ID가 복사되어 승인 자체가 실패함. |
| `R52-SR-07` | P3 | §2.1 `axes[].key` | 예시 JSON의 `key: "class1"/"class2"`를 기존 데이터에 강제하면 `game_characters.attributes`에 저장된 기존 키와 어긋나 분류 값이 고아가 됨. |
| `R52-SR-08` | P3 | §3.1·§4 판정 기준 | "템플릿 활성"(`rarities ≥ 1`)과 "캐릭터 지원"(`캐릭터 ≥ 1`) 기준이 섹션마다 다르게 쓰이고, 등급 없이 캐릭터만 있는 R13 기존 게임의 처리 규칙이 없음. |
| `R52-SR-09` | P3 | §5.2 커스텀 아이콘 우선 | 대시보드에서 픽업 아바타마다 비공개 `user-icons` Signed URL을 발급하면 일정 수만큼 Storage 요청이 늘고, 게스트·로그인 사용자 간 표시가 달라짐. |
| `R52-SR-10` | P4 | §6·Run 블록 | 대상 경로 오기: `sql/TESTS.sql` → 실제 `sql/tests/TESTS.sql`, `hero-sidebar-content.tsx` → 실제 `src/components/calendar/hero-sidebar.tsx`. |

### 7.2 규범 결정 (Normative Resolutions)

- **NR-01 (게스트 노출 최소화, `R52-SR-01`)**: `anon`에는 테이블 단위가 아닌 **열 단위 권한**만 부여함 — `GRANT SELECT (id, game_id, name, default_icon_url, rarity, attributes) ON public.game_characters TO anon;` + `CREATE POLICY "Allow anon read game characters" ... FOR SELECT TO anon USING (true);`. `created_by`·`created_at`·`updated_at`은 `anon`에 노출하지 않음. 게스트 경로의 클라이언트 조회는 `select("*")` 대신 명시 컬럼(`id, game_id, name, default_icon_url`)만 사용함. `user_characters`·`user_character_presets`·`character_requests`·`schedule_requests`의 `anon` 권한은 추가하지 않음(`TESTS.sql`에 비노출 검증 포함).
- **NR-02 (배열 참조 무결성, `R52-SR-02`)**: `public.validate_schedule_pickup_characters()` `BEFORE INSERT OR UPDATE` 트리거를 `game_schedules`·`schedule_requests` 양쪽에 둠. 검증 내용: NULL 요소 없음(`array_position(ids, NULL) IS NULL`), 중복 없음, 모든 ID가 `public.game_characters`에 존재하고 `game_id = NEW.game_id`. 위반 시 한국어 예외(`픽업 캐릭터는 같은 게임의 카탈로그에 있어야 합니다.`)를 발생시킴. `SET search_path = public`을 지정함. UPDATE에서는 `pickup_character_ids` 또는 `game_id`가 바뀐 경우에만 검증해, 처리 완료 요청의 반려 메모 갱신 등 무관한 수정이 과거 ID 때문에 실패하지 않게 함. 개수 상한 8명과 `PICKUP` 전용 조건은 §2.2 `CHECK` 그대로 유지함.
- **NR-03 (모드 상호 배타)**: `CHECK (cardinality(pickup_character_ids) = 0 OR pickup_image_url IS NULL)`를 양쪽 테이블에 추가해 모드 A(캐릭터 선택)와 모드 B(직접 이미지)가 한 일정에 동시에 저장되지 않게 함.
- **NR-04 (픽업 이미지 형식·용량, `R52-SR-04`)**: `pickup_image_url`은 **`data:image/webp;base64,`만 허용**하고 `https://` 외부 URL은 두 테이블 모두 허용하지 않음(외부 URL 입력은 클라이언트에서 기존 `convertIconSourceToDataUrl` 경로로 WebP Data URL 변환 후 저장). 출력 크기는 **96×96 WebP**, `CHECK length(pickup_image_url) <= 30000`으로 제한함. 구현은 `src/lib/image-resizer.ts`에 출력 크기 인자(기본 256 유지)를 추가하는 방식으로 하고, 기존 게임·캐릭터 아이콘 동작은 바꾸지 않음.
- **NR-05 (캐릭터 삭제 정리, `R52-SR-05`)**: 기존 `public.cleanup_deleted_game_character_presets()`(SECURITY DEFINER) 함수에 `game_schedules`와 `schedule_requests`(`request_status = 'PENDING'`만)의 `pickup_character_ids = array_remove(pickup_character_ids, OLD.id)` 갱신을 추가함(`WHERE game_id = OLD.game_id AND OLD.id = ANY(pickup_character_ids)`, `game_schedules`는 `updated_at = NOW()` 포함). 날짜가 바뀌지 않으므로 `sync_version_expenses_trigger`는 무동작임. 처리 완료된 요청 이력은 보존하며 NR-02 검증은 이후 수정 시점에만 적용됨.
- **NR-06 (승인 RPC 원자적 복사, `R52-SR-06`)**: `approve_schedule_request`는 기존 관리자 판정·`FOR UPDATE`·`is_rerun` 복사·`SECURITY DEFINER SET search_path = public`을 유지함. `PICKUP`이면 `pickup_character_ids`를 **현재 존재하고 같은 게임에 속한 ID만, 요청 순서대로** 걸러서 복사함(`ARRAY(SELECT c.id FROM unnest(v_request.pickup_character_ids) WITH ORDINALITY AS u(id, ord) JOIN public.game_characters c ON c.id = u.id AND c.game_id = v_request.game_id ORDER BY u.ord)`). `pickup_image_url`도 함께 복사하며, `PICKUP`이 아니면 `'{}'::uuid[]`·`NULL`로 초기화함. INSERT(신규)와 UPDATE(대상 일정 수정) 양쪽에 동일하게 적용함.
- **NR-07 (검증 함수 강화 전 사전 점검, `R52-SR-03`)**: 마이그레이션은 함수 교체 **전에** 신규 규칙 위반 게임(축 3개 이상, 길이 1~20자 위반 등급, 잘못된 `character_label`)을 조회하고, 1건이라도 있으면 게임 ID 목록과 함께 `RAISE EXCEPTION`으로 중단함(자동 변환 금지, 운영자가 데이터 정리 후 재실행). `character_label` 검증은 키가 있을 때만 수행함(`p_schema ? 'character_label'`, `jsonb_typeof = 'string'`, `length(btrim(...)) BETWEEN 1 AND 20`). 축 선택지 개수(1~20)와 `key` 정규식(`^[a-z0-9_]{1,24}$`)은 기존 규칙을 유지함.
- **NR-08 (분류 축 키 보존, `R52-SR-07`)**: `character_class1`·`character_class2`는 `axes[0]`·`axes[1]`의 **위치 명칭**일 뿐이며, 저장 키(`axes[].key`)는 기존 값을 그대로 유지함. 마이그레이션·UI는 기존 키를 `class1`/`class2`로 바꾸지 않음. 신규 템플릿 생성 시에만 UI가 `class1`/`class2`를 기본 키로 제안함.
- **NR-09 (판정 기준 일원화, `R52-SR-08`)**: `src/lib/character-utils.ts`에 두 헬퍼를 두고 모든 화면이 이것만 사용함.
  - `isCharacterTemplateActive(game, characterCount)` = `rarities.length >= 1 || characterCount >= 1` → 관리자 동적 테이블 노출, 사용자 캐릭터 추가·수정 요청 허용 기준. 등급 없이 캐릭터만 있는 R13 기존 게임은 활성으로 보고, 관리자 화면에 `[템플릿 설정 수정]` 유도 배너를 표시함. 이 경우 등급 입력은 필수가 아님.
  - `isCharacterSupported(characterCount)` = `characterCount >= 1` → `/dashboard/characters` 게임 바 노출, 픽업 폼 모드 A 판정 기준.
  - 등급 필수 입력(§3.3)은 `rarities.length >= 1`일 때만 UI·`character-utils` 검증으로 강제하며, 기존 `rarity IS NULL` 행 보호를 위해 DB 제약으로는 강제하지 않음.
- **NR-10 (아바타 이미지 출처 단일화, `R52-SR-09`)**: 이번 Phase의 픽업 아바타는 **`game_characters.default_icon_url`만 사용**함(게스트·로그인 동일). 사용자 커스텀 아이콘 우선 표시는 후속 과제로 분리함. 대시보드·게임 일정 화면은 표시 중인 일정에서 참조하는 캐릭터 ID만 모아 `game_characters`를 `.in("id", ids)` + 명시 컬럼으로 **지연 조회**함. 조회 실패는 비차단(아바타만 생략)으로 처리함.
- **NR-11 (미적용 마이그레이션 내성, R33 교훈)**: 읽기는 기존 `select("*")`를 유지해 컬럼 부재 시 `[]`·`null`로 간주함. 신규 컬럼을 명시 컬럼 목록에 넣는 조회는 `42703`/`PGRST204` 시 해당 컬럼 없이 재조회하는 폴백을 둠. 쓰기는 `pickup_character_ids`가 비어 있지 않을 때, `pickup_image_url`이 있을 때만 페이로드에 포함함. 수정 시에는 원본 값이 있었는데 사용자가 비운 경우에만 `[]`/`null`을 보냄(`R33-REV-002` 패턴). 일정 종류를 `PICKUP` 외로 바꾸면 두 필드를 함께 비움. 오류 `42703`/`PGRST204`/`23514`/트리거 예외는 "R52 마이그레이션 미적용 또는 픽업 캐릭터 조건 위반" 안내로 표시함.
- **NR-12 (경로 정정·범위 보강, `R52-SR-10`)**: Step 2 대상에 `sql/tests/TESTS.sql`(정정)을, Step 3 대상에 `src/components/calendar/hero-sidebar.tsx`(정정)·`src/components/calendar/hero-sidebar.test.tsx`·`src/lib/image-resizer.ts`·`src/lib/image-resizer.test.ts`를 반영함.

### 7.3 Step 2 SQL 회귀 테스트 필수 시나리오 (`sql/tests/TESTS.sql`)

1. `character_label` 유효/무효(빈 문자열, 21자, 비문자열), 축 3개 거부, 키 없는 기존 스키마 통과.
2. `pickup_character_ids`: 비PICKUP 거부, 9명 거부, NULL 요소·중복·타 게임 ID·미존재 ID 거부(일정·요청 양쪽), 정상 2명 저장.
3. `pickup_image_url`: `https://` 거부, 30,000자 초과 거부, 비PICKUP 거부, 모드 A와 동시 저장 거부.
4. 승인 RPC: 신규·수정 요청 복사, 승인 전 캐릭터 1명 삭제 시 나머지만 순서대로 복사, 비PICKUP 요청은 초기화, 비관리자 거부 유지.
5. 캐릭터 삭제 시 일정·PENDING 요청 배열에서 제거, 처리 완료 요청은 보존, 연결 예정 지출 날짜 불변.
6. `anon`: `game_characters`의 `id, name, default_icon_url` 조회 성공, `created_by` 조회 `insufficient_privilege`, `user_characters`·`character_requests`·`schedule_requests` 조회 거부.
7. 마이그레이션 사전 점검: 위반 게임이 있으면 예외로 중단(픽스처 트랜잭션 내 확인 후 롤백), 2회 연속 적용 멱등.

### 7.4 승인 조건 요약

- §7.2 NR-01~NR-12를 Step 2(DB/RLS/RPC/Types)와 Step 3(UI)의 수용 기준에 포함함.
- RLS·`SECURITY DEFINER`·CHECK 변경이 있으므로 Step 4 통합 리뷰는 Claude Opus가 수행하고, 로컬 PostgreSQL에서 업그레이드·신규 스키마 양쪽의 마이그레이션 2회 적용과 `TESTS.sql` PASS를 확인함.
- 운영 반영 순서는 **마이그레이션 먼저 적용 후 배포**를 운영 체크리스트에 명시함.

---

## 8. 사용자 피드백 반영 보완 (Amendment A1, 2026-11-09)

- **작성**: Claude Opus (Orchestrator, Gemini 4 Argon 1순위 대체) — Step 4 iteration-01 리뷰 직후 사용자 모바일·PC 확인 피드백과 질의응답 결과를 반영함
- **우선순위**: §8은 §2~§5 및 §7보다 우선함. §8과 충돌하는 §7 NR-03·NR-04(픽업 직접 이미지 `pickup_image_url`)는 **폐기(Superseded)**함
- **배경**: R52 DB 마이그레이션은 아직 운영 DB에 적용되지 않았으므로, 같은 Run 안에서 스키마를 바꿔 운영 마이그레이션을 1회만 적용하도록 함

### 8.1 사용자 확정 결정 (2026-11-09 질의응답)

| 항목 | 확정 내용 |
| :--- | :--- |
| **A1-Q1. 캐릭터 미지원 게임의 픽업 캐릭터 저장 위치** | 기존 `public.game_characters` 테이블에 저장하고 새 구분값 `is_pickup_only`(픽업 전용)로 구분함. 별도 테이블은 만들지 않음. |
| **A1-Q2. 사용자 픽업 일정 요청의 신규 캐릭터** | 등록된 캐릭터 선택 + **새 캐릭터 제안**(이름 필수, 이미지 선택)을 함께 허용함. 관리자 승인 시 픽업 전용 캐릭터로 자동 등록·연결함. |
| **A1-Q3. 진행 방식** | R52 Run에 합쳐 진행함(운영 마이그레이션 1회). |
| **A1-UI. 화면 개선** | 관리자 모바일 탭 텍스트 겹침 해소, 요청 관리 3개 탭 모두 대기열 제목 표시, 주차별 리스트 게임별 접기/펼치기 + 작은 캐릭터 이미지 표시. |

### 8.2 데이터 모델 변경 (Step 5, DB)

- **D-01 픽업 전용 구분값**: `public.game_characters`에 `is_pickup_only BOOLEAN NOT NULL DEFAULT false`를 추가함.
  - 아이콘 필수 조건을 `CHECK (default_icon_url IS NOT NULL OR is_pickup_only)`로 바꿔, 이미지가 없는 픽업 전용 캐릭터(사용자 제안 시 이미지 생략)를 허용함. 기존 `default_icon_url` 형식·길이 CHECK(Data URL WebP 또는 `https://`, 150,000자)는 값이 있을 때만 적용함.
  - 픽업 전용 캐릭터의 `rarity`·`attributes`는 비워 둘 수 있음(템플릿이 없는 게임이므로).
  - `(game_id, name)` 고유 제약은 그대로 유지함 → 같은 게임 안에서 정식·픽업 전용 캐릭터 이름 중복 불가.
- **D-02 정식·픽업 전용 경계 (DB 강제)**:
  - `user_characters`(보유 체크·커스텀 아이콘)와 `user_character_presets`(프리셋) 검증 트리거는 `is_pickup_only = true` 캐릭터 ID를 거부함.
  - `character_requests`의 `UPDATE` 대상(`target_character_id`)은 정식 캐릭터만 허용함.
  - 정식 → 픽업 전용으로 되돌리는 변경은, 해당 캐릭터를 참조하는 `user_characters`·`user_character_presets` 행이 있으면 거부함(데이터 고아 방지). 픽업 전용 → 정식 승격은 허용함(ID 유지로 과거 픽업 일정 연결 보존).
- **D-03 픽업 직접 이미지 제거**: §2.2·§7 NR-03·NR-04의 `pickup_image_url` 컬럼과 관련 CHECK(`*_pickup_image_valid`, `*_pickup_mode_exclusive`)는 마이그레이션·`SCHEMA.sql`·타입에서 제거함. 미지원 게임의 픽업 이미지는 픽업 전용 캐릭터의 `default_icon_url`로 표현함. 운영 미적용 상태이므로 데이터 이전은 필요 없음.
- **D-04 사용자 신규 캐릭터 제안**: `public.schedule_requests`에 `pickup_new_characters JSONB NOT NULL DEFAULT '[]'::jsonb`를 추가함.
  - 형식: `[{ "name": string(1~100자, 공백 제거 후), "icon_url": string | null }]`, 배열 최대 8개, 요청 안 이름 중복 불가.
  - `icon_url`은 `NULL` 또는 `data:image/webp;base64,`로 시작하는 150,000자 이하 문자열만 허용함(사용자 입력 외부 URL 금지 — §7 R52-SR-04 원칙 유지).
  - `PICKUP`이 아니면 빈 배열이어야 함. `cardinality(pickup_character_ids) + jsonb_array_length(pickup_new_characters) <= 8`.
  - 검증은 `CHECK` + 검증 함수(`is_valid_pickup_new_characters(jsonb)`, `IMMUTABLE`, `SET search_path = public`)로 수행함.
- **D-05 승인 RPC 확장 (`approve_schedule_request`)**: 기존 NR-06 규칙(관리자 판정·`FOR UPDATE`·존재 캐릭터만 순서 유지 복사·`is_rerun` 복사·비PICKUP 초기화)을 유지하고, `PICKUP` 요청의 `pickup_new_characters` 각 항목에 대해 같은 트랜잭션 안에서 다음을 수행함.
  - 같은 게임에 같은 이름의 캐릭터가 이미 있으면 그 ID를 재사용함(정식·픽업 전용 불문).
  - 없으면 `is_pickup_only = true`, `default_icon_url = icon_url`, `created_by = auth.uid()`로 새로 등록함.
  - 얻은 ID를 기존 선택 ID 뒤에 제안 순서대로 붙이고, 중복은 제거함. 최종 8명 상한을 넘으면 예외로 승인 전체를 롤백함.
  - 관리자의 제안 이미지 교체는 승인 후 관리자 캐릭터 관리 화면에서 처리함(RPC 인자 추가 없음).
- **D-06 지원 판정 재정의 (NR-09 갱신)**:
  - `isCharacterSupported(rosterCount)`: `is_pickup_only = false`인 캐릭터 수 기준. 픽업 전용 캐릭터만 있는 게임은 캐릭터 페이지·프리셋 비대상임.
  - `isCharacterTemplateActive(game, rosterCount)`: `rarities.length >= 1 || rosterCount >= 1`.
  - 픽업 피커 대상: 해당 게임의 **모든 캐릭터**(정식 + 픽업 전용). §5.1의 모드 A/B 분기는 폐기하고, 모든 게임에서 "캐릭터 선택 + 새 픽업 캐릭터 추가" 단일 흐름으로 통합함.
- **D-07 게스트 권한 (NR-01 갱신)**: `anon` 열 단위 권한에 `is_pickup_only`를 추가함. iteration-01 지적 `R52-REV-002`에 따라 `user_characters`·`user_character_presets`·`character_requests`·`schedule_requests`의 `anon` 권한을 명시적으로 `REVOKE`함.
- **D-08 미적용 마이그레이션 내성 (NR-11 갱신)**: `is_pickup_only` 컬럼이 없으면 모든 캐릭터를 정식으로 간주함. 명시 컬럼 조회에 `is_pickup_only`를 넣는 경우 `42703`/`PGRST204` 시 해당 컬럼 없이 재조회함. 요청 쓰기는 `pickup_new_characters`가 비어 있지 않을 때만 페이로드에 포함함.

### 8.3 화면 변경 (Step 6, UI)

- **U-01 관리자 탭 겹침 해소**: `/admin`(일정 관리·등록된 게임 목록·캐릭터 관리)과 `/admin/requests`(게임·일정·캐릭터 요청) 탭은 고정 3열 그리드 대신, 모바일(`< md`)에서 가로 스크롤(`overflow-x-auto`, 탭 `shrink-0 whitespace-nowrap`) 또는 줄바꿈 없는 짧은 라벨로 표시해 360px 폭에서도 글자가 겹치지 않게 함. `게임 필터:` 라벨은 `whitespace-nowrap`으로 한 줄 유지함.
- **U-02 요청 대기열 제목 일관화**: `/admin/requests` 3개 탭 모두 같은 형식의 제목을 표시함 — `게임 요청 대기열 (n)`, `일정 요청 대기열 (n)`, `캐릭터 요청 대기열 (n)`. 빈 상태 문구도 탭별로 맞춤.
- **U-03 주차별 리스트 게임별 접기/펼치기**: 주차 카드 안의 게임 그룹 헤더를 버튼(`aria-expanded`)으로 바꿔 클릭 시 하위 일정을 펼침.
  - 헤더 표시: 게임 아이콘·게임명·일정 개수·해당 그룹 픽업 캐릭터 아바타(최대 3개, 20px, `+n` 표시).
  - 기본 상태: **이번 주** 카드의 게임 그룹은 펼침, 다른 주는 접힘. 펼침 상태는 화면 내 상태로만 유지함(저장 안 함).
  - 하위 일정 행의 픽업 아바타는 20px로 축소하고, 주간 소계·이번 주 강조·선택일 연동·`aria-pressed`는 기존대로 유지함.
  - **지출 섹션 접기/펼치기 (2026-11-09 사용자 결정)**: 지출은 게임별 그룹에 섞지 않고 주차 카드 하단의 단일 `지출` 섹션으로 유지하되, 섹션 머리를 버튼(`aria-expanded`)으로 바꿔 접고 펼칠 수 있게 함. 머리에는 `지출 n건 · 예정 x원 · 확정 y원`을 표시함. 기본 상태는 게임 그룹과 같음(이번 주 펼침, 다른 주 접힘). 게스트(`expenses = null`)는 섹션 자체를 표시하지 않음. 지출 항목 클릭 시 상세 모달 연동은 유지함.
- **U-04 관리자 픽업 입력**: 일정 종류가 `PICKUP`이면 해당 게임의 모든 캐릭터(정식 + 픽업 전용, 픽업 전용은 `픽업 전용` 배지)를 검색·다중 선택(최대 8명)하는 피커와 `[+ 새 픽업 캐릭터]` 인라인 입력(이름 + 이미지 업로드/URL/붙여넣기 → 256×256 WebP)을 제공함. 저장 즉시 `is_pickup_only = true` 캐릭터로 등록하고 선택 목록에 추가함. 일정 제목 자동 완성(§5.1)은 유지함.
- **U-05 관리자 캐릭터 관리**: 게임별 캐릭터 화면에 `픽업 전용` 필터·배지를 추가함. 픽업 전용 캐릭터는 이름·아이콘 수정과 삭제를 지원하고, 템플릿이 활성화된 게임에서는 등급·분류를 채워 **정식 캐릭터로 승격**할 수 있음. 템플릿이 없는 게임도 픽업 전용 캐릭터 목록 화면은 표시함(§3.2 안내 카드 아래).
- **U-06 사용자 요청 모달**: `PICKUP` 일정 요청에서 해당 게임의 모든 캐릭터 선택 + `[+ 새 캐릭터 제안]`(이름 필수, 이미지 선택 → 256×256 WebP, 150,000자 초과 시 크기 안내)을 제공함. 합계 8명 상한을 화면에서도 안내함. 수정 요청은 원본 일정의 캐릭터를 기본 선택으로 불러옴.
- **U-07 관리자 요청 검토**: 일정 요청 카드에 선택 캐릭터 아바타와 제안 캐릭터(이름·이미지 미리보기, `신규` 배지)를 표시함. 승인은 RPC만 사용함(`R52-REV-003`: 폴백은 함수 부재 `PGRST202`/`42883`일 때만).
- **U-08 캐릭터 페이지·아바타**: `/dashboard/characters`는 정식 캐릭터만 표시함. 사이드바·주차별 리스트·게임 일정 트리 아바타는 정식·픽업 전용 구분 없이 표시하며, 아이콘이 없는 캐릭터는 이름 첫 글자 원형 아바타로 대체함.

### 8.4 Step 5 SQL 회귀 테스트 추가 시나리오 (§7.3에 추가)

8. `is_pickup_only` 캐릭터: 아이콘 없이 등록 성공, `user_characters`·`user_character_presets` 등록 거부, `character_requests` `UPDATE` 대상 거부, 참조가 있는 정식 캐릭터의 픽업 전용 전환 거부, 픽업 전용 → 정식 승격 성공.
9. `pickup_new_characters`: 비PICKUP 거부, 이름 공백·101자·중복 거부, `https://` 이미지 거부, 선택 + 제안 합계 9명 거부.
10. 승인 RPC: 제안 캐릭터 신규 등록(`is_pickup_only = true`)과 순서 유지 연결, 같은 이름 기존 캐릭터 재사용, 상한 초과 시 전체 롤백(일정·캐릭터 미생성).
11. 픽스처: 계정 삭제 대기 사용자가 아닌 사용자로 요청을 생성하고, 각 음성 검증은 의도한 SQLSTATE·메시지만 잡음(`R52-REV-001`).
12. `anon`: `is_pickup_only` 조회 가능, `user_characters`·`user_character_presets`·`character_requests`·`schedule_requests` 조회 시 `insufficient_privilege`(`R52-REV-002`).
