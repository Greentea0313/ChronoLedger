# R52 기능 명세서: 게임별 동적 캐릭터 템플릿 및 픽업 일정 캐릭터 이미지 연동

- **문서 ID**: `R52-SPEC-v1`
- **상태**: `DRAFT — Claude Opus 아키텍처·보안·정합성 리뷰 대기 (Step 1 ▶ READY)`
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
