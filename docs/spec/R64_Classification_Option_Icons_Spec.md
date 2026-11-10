# R64 Specification: Classification Option Icons

- **Author**: Claude Opus (Architect, Run `r64-r72-r73-classification-icons-followups` Step 2), 2026-11-10
- **Base**: `bc7fbad` (+ Step 1 `e17e960`)
- **Inputs**: [`docs/character-preset-ux-review.md`](../character-preset-ux-review.md) §4 and the 2026-11-10 user decisions; R52 spec [`R52_Character_Template_and_Pickup_Avatar_Spec.md`](R52_Character_Template_and_Pickup_Avatar_Spec.md) §2.1.
- **Status**: Normative for Step 3 (DB, GPT Codex) and Step 4 (UI, Claude Sonnet). Anything not stated here is out of scope.

## 1. Confirmed Decisions

| ID | Decision |
| :--- | :--- |
| D-01 | Icons are attached to **classification axis options only** (`classification_schema.axes[*].options[*]`). Rarities get no icon. |
| D-02 | Icons are shown in three places: **user filter chips**, **user character settings dialog**, **admin character list**. Nowhere else (no character card corner, no preset UI, no request modal). |
| D-03 | Icons are stored in a **separate table** `public.game_classification_icons`. `games.classification_schema` and `is_valid_classification_schema` are **not changed**. |
| D-04 | Icon format is a **64×64 WebP Data URL**, at most **20,000 characters**. External `https://` URLs are not allowed. |
| D-05 | Icons are written **directly by the admin client** under RLS (no RPC). No money, ledger or points are involved, and every write is a single-row statement. |
| D-06 | Each icon is **saved immediately** per option (upload = upsert, remove = delete). It is not batched with the template `[수정 저장]` button. |
| D-07 | Cleanup is **trigger-based in the DB**: when an option or axis disappears from `classification_schema`, its icon row is deleted. A rename is a remove + add (the admin form edits options as a comma list, so renames cannot be detected); the icon of a renamed option is dropped and must be uploaded again. |
| D-08 | Icon rows can only reference an axis key and option that **currently exist** in the game's schema (insert/update validation trigger). |

## 2. Data Model

### 2.1 Table

```sql
CREATE TABLE IF NOT EXISTS public.game_classification_icons (
    game_id       UUID        NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    axis_key      TEXT        NOT NULL,
    option_value  TEXT        NOT NULL,
    icon_data_url TEXT        NOT NULL,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (game_id, axis_key, option_value),
    CONSTRAINT chk_game_classification_icons_axis_key CHECK (axis_key ~ '^[a-z0-9_]{1,24}$'),
    CONSTRAINT chk_game_classification_icons_option CHECK (length(btrim(option_value)) >= 1 AND length(option_value) <= 100),
    CONSTRAINT chk_game_classification_icons_icon CHECK (
        length(icon_data_url) <= 20000 AND icon_data_url LIKE 'data:image/webp;base64,%'
    )
);
```

- `games.id` is `UUID` (same as `game_characters.game_id`).
- `option_value` stores the option string exactly as in the schema (no trimming or case folding), so lookups are exact matches.
- The `axis_key` pattern copies `is_valid_classification_schema`. The `option_value` 100-character cap is a safety bound only (the admin form limits options to 30 characters).
- The PK covers lookups by `game_id`; no extra index.

### 2.2 Validation trigger (D-08)

`BEFORE INSERT OR UPDATE` on `game_classification_icons`, function `public.validate_game_classification_icon()`:

- `LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Reads the game row with `SELECT classification_schema FROM public.games WHERE id = NEW.game_id FOR SHARE`. The row lock serialises the check with a concurrent template update, so an icon can never be written for an option that a committed template edit has just removed.
- Raises `check_violation` (SQLSTATE `23514`, message `classification option not found`) unless some element `a` of `classification_schema -> 'axes'` has `a ->> 'key' = NEW.axis_key` and `(a -> 'options') ? NEW.option_value`.
- Sets `NEW.updated_at := now()`.
- `REVOKE ALL ON FUNCTION ... FROM PUBLIC, anon, authenticated` (trigger functions do not need EXECUTE grants).

### 2.3 Cleanup trigger (D-07)

`AFTER UPDATE OF classification_schema ON public.games FOR EACH ROW WHEN (OLD.classification_schema IS DISTINCT FROM NEW.classification_schema)`, function `public.cleanup_game_classification_icons()`:

- `LANGUAGE plpgsql SECURITY DEFINER SET search_path = public` (cleanup must not depend on the caller's RLS).
- Deletes rows of `NEW.id` whose `(axis_key, option_value)` no longer matches any axis/option of `NEW.classification_schema` (same match rule as §2.2). Rows still matching are kept, including when options are only reordered.
- Returns `NULL`. `REVOKE ALL ... FROM PUBLIC, anon, authenticated`.
- Game delete is covered by `ON DELETE CASCADE`.

Relation to R57: the admin save flow only **warns** when a removed option is still used by characters (`describeRemovedOptionUsage`); it does not block. That stays as is. Character `attributes` values are not touched, and the removed option's icon is deleted by this trigger, so such characters show `기타` without an icon.

### 2.4 RLS and grants

```sql
ALTER TABLE public.game_classification_icons ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.game_classification_icons FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.game_classification_icons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.game_classification_icons TO authenticated;
```

| Policy | Role | Command | Rule |
| :--- | :--- | :--- | :--- |
| `Read icons of approved games` | `anon`, `authenticated` | `SELECT` | `EXISTS (SELECT 1 FROM public.games g WHERE g.id = game_id AND g.status = 'APPROVED')` (same scope as `games` public read) |
| `Admin manage classification icons` | `authenticated` | `ALL` | `USING` and `WITH CHECK`: `coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)` |

- Admin check uses **only** the JWT `app_metadata.role` claim. No `user_metadata`, and no `public.users.role` fallback (unlike older policies; the approval RPCs already rely on the JWT claim only).
- Admins read all rows through the `ALL` policy, including icons of non-approved games.
- All policies use `DROP POLICY IF EXISTS` first so the migration is re-runnable.

### 2.5 Migration file

`sql/migrations/MIGRATION_R64_CLASSIFICATION_OPTION_ICONS.sql`:

- Re-runnable: `CREATE TABLE IF NOT EXISTS`, constraint creation guarded by `pg_constraint` lookups if added separately, `CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER`, `DROP POLICY IF EXISTS` + `CREATE POLICY`.
- No data backfill (no icons exist yet).
- Reflect the same DDL into `sql/SCHEMA.sql` next to the `game_characters` section; add execution order and verification queries (table exists, RLS enabled, two policies, two triggers, grants) to `sql/README.md`.
- Not applied to production by Step 3. The user applies it manually after Step 5.

### 2.6 Types

Add `game_classification_icons` (`Row` / `Insert` / `Update`, `Relationships` to `games`) to `src/types/database.types.ts`, matching §2.1. `updated_at` is optional on `Insert`/`Update`.

## 3. Admin UI (`src/app/admin/page.tsx`)

### 3.1 Location

- Inside the **template edit** flow (`템플릿 설정 수정`, the game modal opened with `templateFlowGameId === editingGame.id`), add a section `분류 아이콘` below the axis inputs.
- Shown only when the game's **saved** template has at least one axis (`editingGame.classification_schema.axes.length >= 1`) and the icon table is available (§5).
- The section lists the **saved** axes and options (from `editingGame.classification_schema`, not the unsaved form text). Help text: `분류 기준·선택지를 바꾼 경우 먼저 [수정 저장]한 뒤 아이콘을 등록함. 이름을 바꾸거나 지운 선택지의 아이콘은 자동으로 삭제됨.`

### 3.2 Per-option row

- Each option: current icon preview (24px) or empty placeholder, option text, `[이미지 선택]` (opens the registration modal, R77 revision), and `[삭제]` when an icon exists.
- **Registration modal (R77 revision)**: title `{axis} · {option} 아이콘 등록`; an input `https://... 또는 이미지 붙여넣기` (pasting an image uses `getClipboardImageFile` and is handled as a file), a file input (`accept="image/png,image/jpeg,image/webp"`), a 64×64 preview, `취소` and `등록`. Errors are shown inside the modal; the modal closes only after a successful save.
- Conversion: **always** `resizeImageToWebP(file, 64)` then read the blob as a Data URL. Do **not** call `convertIconSourceToDataUrl` with a string source: it returns existing WebP Data URLs unchanged, which would bypass the 64×64 resize. URL input (R77) reuses `fetchImageFile` (direct fetch, then proxy fallback) and any image Data URL string is also re-encoded through the resizer (`createClassificationIconDataUrlFromSource`). The database still stores only the resulting 64×64 WebP Data URL, never an external URL. The AI upscaler is not used (64px output does not need it).
- Reject results longer than 20,000 characters before the write with a size message (export a constant `MAX_CLASSIFICATION_ICON_DATA_URL_LENGTH = 20_000`).
- Write: `upsert({ game_id, axis_key, option_value, icon_data_url }, { onConflict: "game_id,axis_key,option_value" })`; delete: `delete().eq(game_id).eq(axis_key).eq(option_value)`.
- Guard every write with `isOffline()`. One write per option at a time (disable that row's buttons while pending).
- On success, update local state and show the existing success message; on failure show the existing error toast/message (`분류 아이콘을 저장하지 못했습니다.` / `분류 아이콘을 삭제하지 못했습니다.`). A `23514` from the validation trigger means the template changed elsewhere: show `선택지가 변경되었습니다. 창을 다시 열어 주세요.`
- Saving the template itself is unchanged. After a template save, the in-memory icon map for that game is reloaded (rows may have been removed by the cleanup trigger).

### 3.3 Admin character list

- In the character table attribute cells (`character.attributes[axis.key]`), render the option icon (16px) before the text when an icon exists for `(axis.key, value)`. `-` and unknown values stay text-only.

## 4. User UI (`/dashboard/characters`)

- The page loads icons of the **selected game** once per game change: `select("axis_key, option_value, icon_data_url").eq("game_id", gameId)`. Dependency is the game id primitive, not objects. Guests read the same rows (anon policy).
- **Filter chips** (`character-filter-bar.tsx`): each axis option chip shows the icon (16px, `alt=""`, `aria-hidden`) before the option text. `전체` and `기타` chips have no icon. The accessible name stays the option text.
- **Character settings dialog** (`CharacterSettingsDialog` in `character-roster.tsx`): the current description line `속성: 기류 · 무기: 직검` becomes an element list where each axis value is preceded by its icon (16px). Rarity stays text-only.
- Icons are passed down as a prop: `ReadonlyMap<string, string>` keyed by `classificationIconKey(axisKey, option)` (e.g. `` `${axisKey}\u0000${option}` ``). Missing key = text only.
- Image element: plain `<img>` with `width`/`height` 16, `object-contain`, `loading="lazy"` not needed (data URL). No `next/image`.

## 5. Unapplied Migration Fallback

- If the icon `select` fails with `42P01` or `PGRST205` (table missing), treat icons as unavailable: empty map, admin `분류 아이콘` section hidden, no error shown. Any other error: empty map, log only, page still works.
- Pages must render exactly as today when the map is empty.

## 6. Out of Scope

- Rarity icons, character card icons, preset/request modal icons.
- Renaming an option while keeping its icon.
- Storage bucket usage (Data URL only).
- Changing R57 removal warning, `is_valid_classification_schema`, or existing `games` policies.
- Regressions not allowed: R62 preset workspace, R63 three sections and reorder, R65 single-game admin filter, R66 pickup-only add, R72/R73 Step 1 changes.

## 7. SQL Regression Tests (`sql/tests/TESTS.sql`, Step 3)

1. Admin (JWT `app_metadata.role = admin`) inserts, updates (upsert) and deletes an icon of an existing option; `updated_at` advances on update.
2. Regular authenticated user insert/update/delete is rejected (RLS; insert raises `42501`, update/delete affect 0 rows).
3. A user with `public.users.role = 'admin'` but **no** JWT claim cannot write (no fallback).
4. `anon` and authenticated non-admin can read icons of an `APPROVED` game and see 0 rows for a non-approved game; admin sees both.
5. CHECK rejects: non-WebP Data URL, `https://` URL, 20,001-character value, bad `axis_key`, blank option.
6. Validation trigger rejects an unknown axis key and an unknown option (`23514`).
7. Cleanup: removing an option deletes only that option's icon; removing an axis deletes all its icons; reordering options keeps icons; deleting the game cascades.
8. Each negative check catches only the intended SQLSTATE/message (`R52-REV-001` pattern).

## 8. Step Scope (allowed files)

- **Step 3 (GPT Codex, DB)**: new `sql/migrations/MIGRATION_R64_CLASSIFICATION_OPTION_ICONS.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, `src/types/database.types.ts`. No `src/lib` changes needed.
- **Step 4 (Claude Sonnet, UI)**:
  - New `src/lib/classification-icons.ts` (+ `.test.ts`): `classificationIconKey`, `MAX_CLASSIFICATION_ICON_DATA_URL_LENGTH`, `isMissingClassificationIconTable`, `loadClassificationIcons(gameId)` returning `{ available: boolean; icons: Map<string, string> }`, `createClassificationIconDataUrl(file)` (64×64 resize + length check).
  - New `src/components/character/classification-option-icon.tsx` (small `<img>` renderer, + test optional).
  - `src/app/admin/page.tsx` (+ `page.test.tsx`), `src/components/character/character-filter-bar.tsx`, `src/components/character/character-roster.tsx`, `src/app/dashboard/characters/page.tsx` (+ `page.test.tsx`).
  - Tests: icon shown/omitted in filter chips, settings dialog and admin list; missing-table fallback hides the admin section; upsert/delete payloads; offline guard; size rejection; `23514` message.
