# R13 Specification: Per-Game Character Roster, Custom Taxonomy, and Party Presets

- **Document ID**: `R13-SPEC-v1`
- **Status**: `APPROVED — 2026-11-03, architectural & security review by Claude Opus (see §7 Review Resolutions; §7 is normative and overrides earlier sections where they differ)`
- **Author**: `Gemini 4 Argon (Orchestrator & Architect)`
- **Reviewer**: `Claude Opus`
- **Created**: `2026-11-03`
- **Related Authorities**: [`docs/spec/SRS.md`](SRS.md), [`sql/SCHEMA.sql`](../../sql/SCHEMA.sql), [`docs/to-do.md`](../to-do.md)

---

## 1. Purpose & Product Scope

This specification defines **R13**: enabling ChronoLedger users to track owned characters per subscribed game, customize character icons, record per-character memos, and build party/team composition presets (`조합 프리셋`) powered by an admin-curated shared catalog with user request workflows and game-specific classification filters (Rarity, Element/Attribute, Class/Weapon/Path, etc.).

### Core Product Decisions (Confirmed by User on 2026-11-03)

1. **Shared Catalog + User Request Workflow**:
   - Administrators manage the canonical character catalog per game in `/admin`.
   - Regular users can submit requests to add or update characters (via `RequestSubmissionModal`), which administrators approve or reject in `/admin/requests` using atomic `SECURITY DEFINER` RPCs—matching the existing `games` / `game_schedules` workflow.
2. **Character Icon Pipeline (Identical to Game Icon Management)**:
   - **Master Default Icon (`game_characters.default_icon_url`)**: Stored as a 256×256 WebP Data URL (`data:image/webp;base64,...`) or validated static asset path, converted on upload/URL registration just like `games.default_icon_url`.
   - **User Custom Icon (`user_characters.custom_icon_path`)**: Users can upload a custom icon per character (stored in the private `user-icons` Supabase Storage bucket under `{user_id}/characters/{character_id}.webp`), resolved via signed URL caching/preload with automatic fallback to `game_characters.default_icon_url` and `GameIcon` fallback.
3. **Per-Game Classification & Rarity Optimization**:
   - Subculture games use different terminology and axes for character classification (e.g., *Genshin*: Rarity `5★/4★` + `원소` + `무기`; *Honkai: Star Rail*: `5★/4★` + `속성` + `운명의 길`; *Arknights*: `6★~1★` + `직군` + `세부직군`; *Nikke*: `SSR/SR/R` + `버스트(I/II/III)` + `코드/무기`).
   - Each game (`public.games`) defines its own **Rarity options** and up to **3 classification axes** (`classification_schema` JSONB). Each character (`public.game_characters`) stores its `rarity` and key-value `attributes` JSONB matching the parent game's schema, enabling fast, zero-join client filtering and sorting in both the roster tab and preset builder.
4. **Per-Character Memo Field (No Badge Clutter on Presets)**:
   - Users can toggle ownership (`is_owned`) and write a free-form per-character memo (`user_characters.memo`, e.g., `"2돌 전무"`, `"육성 예정"`, up to 200 chars) in the `보유 캐릭터` tab.
   - Do **not** render memo tags as small badges on party preset cards; keep preset cards visually clean.
5. **Admin-Configured Per-Game Max Preset Slots & Unowned Dimming**:
   - Maximum party slot count varies by game (e.g., 3, 4, 5, 6, or up to 12). Administrators configure `max_preset_slots` per game on `public.games` (`DEFAULT 4`, `CHECK (max_preset_slots BETWEEN 1 AND 12)`).
   - Presets can include **both owned and unowned characters** (for future pull/team planning). Unowned characters in a preset slot are visually distinguished by **lowering image brightness/saturation** (e.g., CSS `brightness-50 saturate-50 opacity-65`) without noisy `[미보유]` text badges.
6. **UI Entry Point**:
   - Accessed via a `[캐릭터·프리셋]` button on each subscribed game card in `/dashboard/games`, opening a dedicated modal (`CharacterPresetModal`) with two tabs: `보유 캐릭터` (Owned Roster) and `조합 프리셋` (Party Presets).

---

## 2. Database Schema Design

### 2.1 Extensions to `public.games`

Add two columns to `public.games`:

```sql
ALTER TABLE public.games
    ADD COLUMN IF NOT EXISTS max_preset_slots SMALLINT NOT NULL DEFAULT 4
        CHECK (max_preset_slots BETWEEN 1 AND 12),
    ADD COLUMN IF NOT EXISTS classification_schema JSONB NOT NULL DEFAULT '{
        "rarities": [],
        "axes": []
    }'::jsonb
        CHECK (public.is_valid_classification_schema(classification_schema));
```

*(Review: the default is empty instead of `SSR/SR/R` so existing games do not silently receive a wrong rarity system; see §7.2.)*

#### Structure of `games.classification_schema` (JSONB)

```json
{
  "rarities": ["5★", "4★"],
  "axes": [
    {
      "key": "element",
      "label": "속성",
      "options": ["물리", "화염", "얼음", "번개", "바람", "양자", "허수"]
    },
    {
      "key": "role",
      "label": "운명의 길",
      "options": ["파멸", "수렵", "지식", "화합", "공허", "보존", "풍요", "기억"]
    }
  ]
}
```

- **Constraints & Validation**:
  - `rarities`: array of 0–10 unique non-empty strings (ordered from highest rarity to lowest for default sort order; empty means the game has no rarity system).
  - `axes`: array of 0–3 axis objects, each with a unique `key` (`^[a-z0-9_]{1,24}$`), `label` (1–30 chars, Korean display name), and `options` (1–20 unique non-empty strings).
  - Enforced in the database by the `IMMUTABLE` function `public.is_valid_classification_schema(jsonb)` used in the `CHECK` constraint above, and mirrored by client validation for user-friendly errors.

---

### 2.2 Master Character Catalog: `public.game_characters`

```sql
CREATE TABLE public.game_characters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    default_icon_url TEXT NOT NULL
        CHECK (length(default_icon_url) <= 150000
               AND (default_icon_url LIKE 'data:image/webp;base64,%' OR default_icon_url LIKE 'https://%')),
    rarity VARCHAR(30),
    attributes JSONB NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(attributes) = 'object'),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_game_characters_game_name UNIQUE (game_id, name)
);

CREATE INDEX idx_game_characters_game_id ON public.game_characters(game_id);
```

- `attributes` stores key-value pairs corresponding to `games.classification_schema.axes`, e.g., `{"element": "번개", "role": "공허"}`.
- `default_icon_url` follows the exact same rule as `games.default_icon_url` (256×256 WebP Data URL or approved asset URL).

---

### 2.3 User Character Requests: `public.character_requests`

```sql
CREATE TABLE public.character_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    target_character_id UUID REFERENCES public.game_characters(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    default_icon_url TEXT
        CHECK (default_icon_url IS NULL OR (length(default_icon_url) <= 150000
               AND (default_icon_url LIKE 'data:image/webp;base64,%' OR default_icon_url LIKE 'https://%'))),
    rarity VARCHAR(30),
    attributes JSONB NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(attributes) = 'object'),
    memo VARCHAR(500),
    request_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (request_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    admin_memo TEXT,
    approved_character_id UUID REFERENCES public.game_characters(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_character_requests_status ON public.character_requests(request_status);
CREATE INDEX idx_character_requests_user_id ON public.character_requests(user_id);
```

- When `target_character_id IS NULL`, the request is a **new character addition**.
- When `target_character_id IS NOT NULL`, the request is a **character metadata/classification update**.

---

### 2.4 User Owned Characters & Custom Icons: `public.user_characters`

```sql
CREATE TABLE public.user_characters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    character_id UUID NOT NULL REFERENCES public.game_characters(id) ON DELETE CASCADE,
    is_owned BOOLEAN NOT NULL DEFAULT true,
    custom_icon_path TEXT
        CHECK (custom_icon_path IS NULL
               OR custom_icon_path = user_id::text || '/characters/' || character_id::text || '.webp'),
    memo VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_characters_user_character UNIQUE (user_id, character_id)
);

CREATE INDEX idx_user_characters_user_game ON public.user_characters(user_id, game_id);
```

- **Integrity Trigger (`validate_user_character_game`)**:
  - `BEFORE INSERT OR UPDATE` trigger verifying that `NEW.game_id` matches `game_characters.game_id` for `NEW.character_id`.
- **Storage Path Convention**:
  - `custom_icon_path` is stored in the existing private bucket `user-icons` at exactly `{user_id}/characters/{character_id}.webp` (single convention, overwritten with `upsert`; enforced by the `CHECK` above). This satisfies the existing `storage.objects` policies `(storage.foldername(name))[1] = auth.uid()::text` and the account deletion cleanup `name LIKE v_req.user_id || '/%'` without a new bucket (verified against `sql/SCHEMA.sql`).
- **Ownership semantics**: a character with no `user_characters` row is unowned. A row with `is_owned = false` keeps a memo or custom icon for an unowned character.

---

### 2.5 User Party/Team Presets: `public.user_character_presets`

```sql
CREATE TABLE public.user_character_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    title VARCHAR(80) NOT NULL,
    character_ids UUID[] NOT NULL
        CHECK (cardinality(character_ids) >= 1 AND cardinality(character_ids) <= 12
               AND array_position(character_ids, NULL) IS NULL),
    memo VARCHAR(300),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_character_presets_user_game ON public.user_character_presets(user_id, game_id);
```

- **Integrity Trigger (`validate_user_character_preset`)**:
  - `BEFORE INSERT OR UPDATE` trigger on `public.user_character_presets`:
    1. Fetches `max_preset_slots` from `public.games WHERE id = NEW.game_id`. If the game row no longer exists (cascade in progress), return `NEW` and let the foreign key decide.
    2. Checks `cardinality(NEW.character_ids) <= v_max_slots`, **except** on `UPDATE` when `cardinality(NEW.character_ids) <= cardinality(OLD.character_ids)` (non-destructive slot reduction; see §7.3).
    3. Checks that there are no duplicate UUIDs in `NEW.character_ids`.
    4. Checks that every UUID in `NEW.character_ids` exists in `public.game_characters` with `game_id = NEW.game_id`.
- **Cascade Behavior on Character Deletion**:
  - If an admin deletes a character from `public.game_characters`, an `AFTER DELETE ON public.game_characters` trigger removes the deleted character's UUID (`array_remove(character_ids, OLD.id)`) from any `user_character_presets` rows for that game (or deletes presets that become empty), preventing dangling UUID references in `character_ids`.

---

## 3. RLS, Account Deletion, and RPC Specifications

1. **Row-Level Security (RLS)**:
   - `public.game_characters`: `SELECT` for `authenticated`; `ALL` for `admin` (`app_metadata.role = 'admin'` or `public.users.role = 'admin'`).
   - `public.character_requests`: `INSERT` with `WITH CHECK (auth.uid() = user_id AND request_status = 'PENDING' AND admin_memo IS NULL AND approved_character_id IS NULL)` and `SELECT` for own rows (`auth.uid() = user_id`); `ALL` for `admin`. Users cannot `UPDATE`/`DELETE` requests (same as `schedule_requests`).
   - `public.user_characters` & `public.user_character_presets`: `ALL` for own rows with `USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`.
   - Admin checks rely on `public.users.role`, which is protected against self-promotion by `MIGRATION_USERS_ROLE_GUARD.sql` (R18); this migration is a prerequisite.
2. **Account Deletion Guard & Purge Integration**:
   - Add `character_requests`, `user_characters`, and `user_character_presets` to:
     - Restrictive RLS policy loop (`Block account deletion users from ...`)
     - `block_pending_account_data_mutations` trigger loop
     - `purge_expired_account_deletion_requests` deletion sequence (before `DELETE FROM public.user_games`).
3. **Admin RPCs (`SECURITY DEFINER`)**:
   - `approve_character_request(p_request_id UUID, p_default_icon_url TEXT DEFAULT NULL)`:
     - Verifies caller is admin and request is `PENDING`.
     - If `target_character_id IS NULL`: inserts into `public.game_characters` using `coalesce(nullif(btrim(p_default_icon_url), ''), v_request.default_icon_url)` (raises exception if neither is provided) and sets `approved_character_id`.
     - If `target_character_id IS NOT NULL`: updates the target row in `public.game_characters` only when it belongs to `v_request.game_id`; otherwise raises an exception and leaves the request `PENDING`.
     - Validates `v_request.rarity` and `v_request.attributes` against the game's `classification_schema` (unknown rarity, axis key, or option raises an exception).
     - Marks `character_requests.request_status = 'APPROVED'`.
   - `reject_character_request(p_request_id UUID, p_admin_memo TEXT DEFAULT NULL)`:
     - Verifies caller is admin and marks `PENDING` request as `REJECTED` with `admin_memo`.

---

## 4. UI/UX Specification

### 4.1 Admin Page (`/admin` & `/admin/requests`)

1. **Game Settings Extension (`/admin` Games Tab)**:
   - In the Game Add/Edit modal, allow configuring:
     - **최대 프리셋 슬롯 수 (`max_preset_slots`)**: Number input (`1 ~ 12`, default `4`).
     - **성급 목록 (`rarities`)**: Comma-separated or tag input (e.g., `5★, 4★` or `6★, 5★, 4★, 3★`).
     - **분류 축 설정 (`axes`, 최대 3개)**: Each axis has a `분류명` (e.g., `속성`, `운명의 길`) and comma-separated `항목 목록` (e.g., `물리, 화염, 얼음, 번개, 바람, 양자, 허수`).
2. **Character Management Tab (`/admin` $\to$ `캐릭터 관리` Tab)**:
   - Filter by Game + Rarity + Classification Axis + Search by Character Name.
   - Add/Edit Character modal:
     - Select Game, input Character Name, Rarity dropdown (from selected game's `rarities`), Classification dropdowns (from selected game's `axes`), and Icon (File upload, Clipboard Paste `Ctrl+V`, or URL converted to 256×256 WebP Data URL).
3. **Character Requests Tab (`/admin/requests` $\to$ `캐릭터 요청` Tab)**:
   - Lists pending character addition/update requests with game badge, rarity/attributes summary, and icon preview/upload before clicking `[승인]` or `[반려]`.

### 4.2 User Game Card & `CharacterPresetModal` (`/dashboard/games`)

1. **Subscribed Game Card Entry**:
   - Add a `[캐릭터·프리셋]` button next to `[일정 보기]` on each subscribed game card.
   - Display a compact summary badge/line: `보유 캐릭터 n / m명 · 프리셋 k개`.
2. **Tab 1 — `보유 캐릭터` (Character Roster)**:
   - **Filter Bar**:
     - Ownership filter: `전체` | `보유` | `미보유`
     - Rarity filter pills (from `game.classification_schema.rarities`)
     - Dynamic Axis filter pills/dropdowns (from `game.classification_schema.axes`)
     - Name search input
   - **Character Card / Row**:
     - Displays Character Icon (`user_characters.custom_icon_path` if set, else `game_characters.default_icon_url`) with `[아이콘 변경]` overlay/button (same 256×256 WebP upload to `user-icons` bucket as game custom icons).
     - Unowned characters render with dimmed icon brightness (`brightness-50 saturate-50 opacity-65`); clicking the ownership toggle switches `is_owned` immediately.
     - Displays Rarity badge and classification tags (`속성`, `직업` 등).
     - Includes a **캐릭터 메모 (`memo`)** input/inline editor (up to 200 chars, supports Tab key via `insertTabOnKeyDown`) for recording personal notes (e.g., `"2돌 전무"`, `"유물 세팅 중"`).
3. **Tab 2 — `조합 프리셋` (Party Presets)**:
   - Displays saved presets for the game + `[+ 새 프리셋 추가]` button.
   - **Preset Card**:
     - Shows **Preset Title** (e.g., `"혼돈 전반 아케론 파티"`), **Slot Grid** (`1 .. game.max_preset_slots`), and **Preset Memo**.
     - Each slot shows the character's icon and name:
       - **Owned character (`is_owned = true`)**: Normal full brightness and primary border.
       - **Unowned character (`is_owned = false`)**: Lowered brightness (`brightness-50 saturate-50 opacity-65`) so the user can immediately distinguish missing target characters without extra badge clutter.
       - Character memos are **not** shown as badges on preset cards.
   - **Preset Editor Modal / Drawer**:
     - Filterable character picker (using the same Rarity & Axis filters) to assign/reorder characters into slots `1 .. max_preset_slots`.

---

## 5. Implementation Phasing Plan

- **Phase 13.1 (Database & Types — `GPT Codex`)**:
  - `sql/migrations/MIGRATION_R13_CHARACTERS_AND_PRESETS.sql`, `sql/SCHEMA.sql`, `sql/tests/TESTS.sql`, `src/types/database.types.ts`.
- **Phase 13.2 (Admin Catalog, Taxonomy Config & Character Requests — `GitHub Copilot` / `Claude Sonnet`)**:
  - `/admin` game taxonomy config & `캐릭터 관리` tab, `RequestSubmissionModal` character requests, `/admin/requests` approval tab.
- **Phase 13.3 (User Roster, Custom Character Icons & Party Presets — `Claude Sonnet`)**:
  - `CharacterPresetModal` (`보유 캐릭터` & `조합 프리셋` tabs), custom character icon upload (`user-icons` bucket), `/dashboard/games` integration, and unit tests.

---

## 6. Review Checklist for Reviewer (`Claude Opus`)

When reviewing this specification, verify and report on:

1. **Schema & RLS Soundness**: Are all foreign keys, `ON DELETE` behaviors, trigger checks (`validate_user_character_game`, `validate_user_character_preset`, and array cleanup on character deletion), and `account_deletion_requests` purge hooks complete?
2. **Storage RLS Compatibility**: Does storing custom character icons at `{user_id}/characters/{character_id}.webp` in `user-icons` work seamlessly with the existing `storage.objects` policies and `storage-upload.ts` helper without requiring new buckets?
3. **Classification Schema Ergonomics**: Is `games.classification_schema` (`rarities` + up to 3 `axes`) sufficient and ergonomic for both Admin input and User filtering across major subculture games?
4. **Edge Cases**: What happens when an admin reduces `games.max_preset_slots` after users already saved presets with more slots, or renames a classification option? (Recommend non-destructive handling: existing presets remain viewable and only enforce the new `max_preset_slots` ceiling when edited, or `CHECK` in trigger allows existing cardinality if unchanged).

---

## 7. Review Resolutions (Claude Opus, 2026-11-03)

This section records the outcome of the §6 checklist. It is normative: Phase 13.1–13.3 implement these rules, and they override earlier sections where they differ.

### 7.1 Schema, RLS, and Account Deletion (Checklist 1)

- **Verdict**: Sound with the amendments applied inline above.
- **Amendments made**:
  - `character_requests` user `INSERT` policy now requires `auth.uid() = user_id` (it was missing; without it a user could file requests under another user's ID).
  - Icon text columns (`game_characters.default_icon_url`, `character_requests.default_icon_url`) are capped at 150,000 characters and limited to `data:image/webp;base64,` or `https://` values. A 256×256 WebP under 100 KiB encodes to at most ~137,000 characters. Without this cap, any user could store arbitrarily large text through requests.
  - `character_requests.memo` is `VARCHAR(500)` instead of unbounded `TEXT`.
  - `approve_character_request` verifies the update target belongs to the request's game and validates rarity/attributes against `classification_schema`.
  - Users get `USING` and `WITH CHECK` on `user_characters` and `user_character_presets`.
- **Account deletion**: The three user-owned tables cascade from `auth.users`, and the explicit purge, restrictive policy, and mutation-block hooks listed in §3.2 are still required so pending-deletion users cannot write. Approved catalog rows stay (`created_by ON DELETE SET NULL`), matching `games`.

### 7.2 Storage Compatibility (Checklist 2)

- **Verdict**: Compatible without a new bucket. Verified in `sql/SCHEMA.sql`: the `user-icons` policies check `(storage.foldername(name))[1] = auth.uid()::text`, and the purge deletes `name LIKE user_id || '/%'`; both cover `{user_id}/characters/{character_id}.webp`.
- **Required code change**: `src/lib/storage-upload.ts` hard-codes `${userId}/${gameId}.webp` and caches by `${userId}/${gameId}`. Phase 13.3 must add character-specific helpers (upload, download with signed URL cache, delete) keyed by the full object path so game and character caches cannot collide.
- **Orphaned files**: When an admin deletes a character, `user_characters` rows cascade but Storage objects are not removed by SQL. Accepted: files remain private, are overwritten on re-upload, and are removed at account deletion. The client deletes the object when a user resets a custom icon.

### 7.3 Edge Cases (Checklist 4)

1. **Reducing `max_preset_slots`**: Non-destructive. Existing presets stay viewable with all characters. The validation trigger only rejects inserts or updates that add characters beyond the new ceiling (rule in §2.5). The editor shows an over-limit preset as read-only until the user removes characters down to the ceiling.
2. **Deleting a character**: The `AFTER DELETE` cleanup on `game_characters` first deletes presets whose `character_ids` would become empty, then applies `array_remove` to the rest. Because the slot rule allows shrinking arrays, cleanup never fails on presets that exceed a reduced ceiling.
3. **Deleting a game**: Cascades to characters and presets in an unspecified order. The validation trigger returns `NEW` when the game row is gone, so the cleanup trigger cannot block game deletion.
4. **Renaming or removing a classification option or rarity**: Stored character values are not rewritten. Values no longer in the schema render as their raw text and are grouped under a `기타` filter option in both roster and picker. The admin game modal warns how many characters use a removed value. Bulk rename is out of scope for R13.
5. **Slot positions**: `character_ids` has no gaps or `NULL` elements; array order is slot order.

### 7.4 Classification Ergonomics (Checklist 3)

- **Verdict**: Sufficient for the listed games (Genshin, Star Rail, Arknights, Nikke) with single-valued axes. Multi-valued tags (for example several roles per character) are out of scope; such a game uses its most useful single axis.
- **Indexing**: Per-game catalogs are small (hundreds of rows) and filtered on the client after one `game_id` query, so no JSONB GIN index is needed. `idx_game_characters_game_id` is sufficient.
- **Database validation**: `is_valid_classification_schema(jsonb)` enforces the §2.1 shape so a malformed admin edit cannot break every client.

### 7.5 Required SQL Smoke Tests for Phase 13.1 (`sql/tests/TESTS.sql`)

- A user cannot insert a `character_requests` row with another `user_id`, or with an oversized or non-WebP/non-HTTPS icon value.
- A preset rejects duplicates, `NULL` elements, characters from another game, and counts above `max_preset_slots`.
- After `max_preset_slots` is reduced, an over-limit preset can still be read and shrunk, and deleting one of its characters succeeds.
- Deleting a character removes it from presets and deletes presets that become empty.
- Deleting a game with characters and presets succeeds.
- `custom_icon_path` rejects paths outside `{user_id}/characters/{character_id}.webp`.
- A pending-deletion user cannot write to the three new user tables.
