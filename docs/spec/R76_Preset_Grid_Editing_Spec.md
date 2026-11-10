# R76 Specification: Preset Card Grid Editing with @dnd-kit

- **Author**: Claude Opus (Architect, Run `r76-r77-preset-grid-dnd-and-icon-modal` Step 2), 2026-11-10
- **Base**: `f5807eb` (+ Step 1 `f3fdd91`)
- **Reference UX**: `https://pickupgg.com/party?game=endfield` (observed in sample mode: pointer-based sortable, whole avatar/card is the drag source, slot drops insert instead of swapping, sidebar-to-slot adds, duplicate in the same party shows a toast, cards keep vertical touch scroll).
- **Supersedes**: R62 desktop workspace (single preset editor + save button + unsaved-changes confirm), R73 drag handles, the mobile `PresetList` + `PresetEditorDialog` flow, and the HTML5 drag in the R63 favorite roster.
- **Status**: Normative for Step 3 (DB, GPT Codex) and Step 4 (UI, Claude Opus). Anything not stated here is out of scope.

## 1. Confirmed Decisions (2026-11-10 user answers)

| ID | Decision |
| :--- | :--- |
| D-01 | Drag uses `@dnd-kit` (`@dnd-kit/core` 6.3.1, `@dnd-kit/sortable` 10.0.0, `@dnd-kit/utilities` 3.2.2, exact versions). No drag handles: the whole avatar or card is the drag source. A short click/tap keeps its click action. |
| D-02 | All presets of the selected game are shown as cards on one screen and edited in place. Every change is **saved immediately** (no save button, no unsaved state). |
| D-03 | Touch drag is supported (long press). |
| D-04 | **Empty presets are allowed** (0–12 characters). `[+ 프리셋 추가]` creates an empty card; removing the last character keeps the card. |
| D-05 | Dropping a character from preset A onto preset B **moves** it (removed from A, inserted into B), saved atomically. |
| D-06 | A character is removed from a preset by dragging it out of the card (onto the sidebar or empty space) **or** with an `X` button shown on hover/focus (desktop) or on the selected avatar (touch). |
| D-07 | Below 900px the same card grid is used; tapping an empty slot (`+`) opens a bottom character picker. Reordering and cross-preset moves use long-press drag. |

## 2. Layout

| Width | Sidebar | Card grid |
| :--- | :--- | :--- |
| `>= 1280px` (`lg`) | Left, 280px, sticky, own scroll | 3 columns |
| `900–1279px` (`md`) | Left, 240px, sticky, own scroll | 2 columns |
| `< 900px` | None (picker drawer instead, §6) | 1 column (2 columns from 600px) |

### 2.1 Character sidebar (`>= 900px`)

- Reuses `CharacterFilterBar` (with R64 classification icons) and the R63 sections `즐겨찾기 / 보유 / 미보유` (`buildCharacterSections`). Unowned characters stay dimmed and are still placeable (unchanged rule).
- Each avatar shows a small `편성됨` check badge when the character is in at least one preset of the game (`aria-label` suffix `, 편성됨`).
- Click on an avatar adds it to the **active preset** (§3.3) at the end. Drag adds it at the drop position.
- The sidebar is also a drop zone: dropping a slot avatar there removes it from its preset (D-06).

### 2.2 Preset card

- Header: title (inline edit), memo line (inline edit, placeholder `메모 추가`), actions menu (`앞으로`, `뒤로`, `삭제`).
  - Title: click to edit, `Enter`/blur saves, `Esc` cancels, 1–80 chars (empty input restores the previous title). Memo: up to 300 chars, blur saves, `Esc` cancels; uses `insertTabOnKeyDown`.
- Slots: 4 per row, `max_preset_slots` slots total. Filled slots show the avatar (`CharacterIcon`, custom icon, breakthrough), name under it. Empty slots show `+`.
- Over-limit preset (more characters than the current `max_preset_slots`): all characters are shown, the extra ones with a warning ring and a `슬롯 초과` note. Adding is blocked; reordering, removing and moving out are allowed (DB trigger already blocks only growth).
- Last cell of the grid: `[+ 프리셋 추가]` card.
- Card order follows `sort_order` (ascending), then `created_at`.

### 2.3 Active preset

- The active preset receives sidebar clicks and mobile picker picks. It is the last card the user interacted with (click on card, focus inside, successful drop); default is the first card. Shown with a primary ring and `aria-current="true"`.

## 3. Drag and Drop (`@dnd-kit`)

### 3.1 Sensors and setup

- One `DndContext` per preset tab, wrapping sidebar and grid.
- `MouseSensor` with `activationConstraint: { distance: 6 }` (a click under 6px stays a click).
- `TouchSensor` with `activationConstraint: { delay: 200, tolerance: 6 }` (scroll stays a scroll).
- `KeyboardSensor` with `sortableKeyboardCoordinates`.
- Do not use `PointerSensor` together with the two above (double activation).
- Draggable avatars and cards: `touch-action: manipulation`; grid and sidebar scroll containers keep `pan-y`. Avatars get `user-select: none` and `-webkit-touch-callout: none`.
- `DragOverlay` renders a copy of the dragged avatar (or a compact card for card drags); the original stays in place with reduced opacity. `dropAnimation` default.
- Auto-scroll: `@dnd-kit` default auto-scroll on the window and the sidebar scroll container.
- Collision detection: `pointerWithin`, falling back to `closestCenter` when the pointer is over no droppable (keyboard). Card-level droppables are used when a slot list is empty or the pointer is over the card but not a slot.
- Screen reader announcements: Korean `announcements` (`'{name}' 끌기 시작`, `'{name}'을(를) '{preset}' {n}번째 자리로 이동`, `취소됨`) and `screenReaderInstructions`.

### 3.2 Draggable ids

- Sidebar avatar: `side:{characterId}` (not sortable).
- Slot avatar: `slot:{presetId}:{characterId}` inside a `SortableContext` per preset with `rectSortingStrategy`.
- Card: `card:{presetId}` inside a `SortableContext` of cards with `rectSortingStrategy`. A card drag starts from any non-interactive card area (header background, padding, empty area); slots, inputs and buttons are not card drag sources. The card itself is the source, not an icon handle.

### 3.3 Drop rules

| Source → Target | Result |
| :--- | :--- |
| Sidebar → slot of preset P (filled or empty) | Insert before the target slot (or at the end when dropped on an empty slot / card area). Rejected with toast when P already has the character (`이미 이 프리셋에 있어요`) or P is full/over limit (`슬롯은 최대 {n}칸까지 사용할 수 있습니다.`). |
| Slot of P → another slot of P | Reorder by insertion (`arrayMove`). |
| Slot of A → slot or card area of B | Move: remove from A, insert into B at the target index. Rejected (snap back + toast) when B has the character or B is full/over limit. |
| Slot of P → sidebar or outside any card | Remove from P. |
| Slot → `[+ 프리셋 추가]` card | Not a drop target (snap back). |
| Card → card position | Reorder presets. |
| Anything → same position | No write. |

- Every accepted drop makes P (and B) the active preset.
- A drop is applied optimistically before the write (§5).

### 3.4 Click and keyboard paths (non-drag)

- Sidebar avatar click / `Enter`: add to the active preset.
- Slot avatar: hover/focus shows `X` (remove) and keeps keyboard reordering via the `KeyboardSensor` (Space to pick up, arrows to move, Space to drop, Esc to cancel). Click on a slot avatar has no other action.
- Empty slot `+` (`>= 900px`): focuses the sidebar search field and makes that preset active. (`< 900px`: §6.)
- Card reorder keyboard alternative: the card actions menu has `앞으로` / `뒤로`.

## 4. Data Model and RPCs (Step 3)

### 4.1 Allow empty presets (D-04)

- Replace the column CHECK on `user_character_presets.character_ids` with a named constraint `chk_user_character_presets_character_ids`: `cardinality(character_ids) BETWEEN 0 AND 12 AND array_position(character_ids, NULL) IS NULL`. The migration finds the old unnamed CHECK through `pg_constraint` (definition contains `cardinality(character_ids)`) and drops it; re-runnable.
- `cleanup_deleted_game_character_presets()`: remove the `DELETE` of presets that would become empty; keep only the `array_remove` update (a preset that loses its last character stays as an empty card).
- `validate_user_character_preset()`: unchanged (an empty array passes the count check).
- Client: `validatePresetInput` no longer requires at least one character.

### 4.2 `update_character_preset_slots(p_changes JSONB) RETURNS VOID`

- Purpose: atomic save of one or two presets' `character_ids` with optimistic concurrency. Used for every slot change (add, reorder, remove, cross-preset move).
- `LANGUAGE plpgsql SECURITY INVOKER SET search_path = public`. `REVOKE ALL ... FROM PUBLIC, anon`; `GRANT EXECUTE ... TO authenticated`.
- Input: JSON array of 1–2 objects `{ "id": uuid, "expected": uuid[], "next": uuid[] }`. Distinct ids. When 2 objects, both presets must have the same `game_id`.
- Steps:
  1. `auth.uid()` must not be NULL.
  2. Lock target rows `SELECT ... FROM user_character_presets WHERE id = ANY(ids) AND user_id = auth.uid() ORDER BY id FOR UPDATE` (fixed order prevents deadlocks).
  3. If fewer rows than ids, or any `character_ids IS DISTINCT FROM expected`: `RAISE EXCEPTION 'preset changed' USING ERRCODE = '40001'`.
  4. `UPDATE ... SET character_ids = next, updated_at = now()` per row (the existing validation trigger enforces slots, duplicates, same game, regular characters).
  5. For two rows, the union of characters must be preserved for a move: `next` arrays together must contain exactly the characters of the `expected` arrays (multiset). Otherwise raise `22023` (`invalid move`).
- All in one transaction: any failure rolls back both presets.

### 4.3 `reorder_character_presets(p_game_id UUID, p_preset_ids UUID[]) RETURNS VOID`

- Same pattern as `reorder_favorite_characters`: `SECURITY INVOKER`, requested id set must equal the user's presets of that game (else raise `40001` `preset list changed`), then `sort_order = ordinality` (1-based).
- Grants as §4.2.

### 4.4 Other writes (plain table calls, RLS)

- Create: `insert({ user_id, game_id, title: '새 프리셋', memo: null, character_ids: [], sort_order: max+1 })` → `select()` the new row. If the user already has a preset titled `새 프리셋`, use `새 프리셋 2`, `3`, … (client side, no DB uniqueness).
- Title/memo: `update({ title } | { memo })` on one row (last write wins; no concurrency check).
- Delete: existing `delete()` with confirm `'{title}' 프리셋을 삭제하시겠습니까?`.

### 4.5 Migration, schema, tests

- New `sql/migrations/MIGRATION_R76_PRESET_GRID_EDITING.sql` (re-runnable), reflected in `SCHEMA.sql`, `sql/README.md` (order and verification queries), `database.types.ts` (two `Functions`).
- `sql/tests/TESTS.sql` R76 block:
  1. Empty preset insert succeeds; null member and 13 members still rejected.
  2. Deleting a game character that is the only member keeps the preset with `{}`.
  3. `update_character_preset_slots`: single change ok; stale `expected` → `40001`; another user's preset → `40001` (row not visible); two-preset move ok and atomic (second change invalid → first not applied); duplicate in target → trigger error, both unchanged; non-move two-row change (character lost or invented) → `22023`; different games → error; 3 objects → error.
  4. `reorder_character_presets`: ok; missing/extra id → `40001`; another user's ids → `40001`.
  5. `anon` cannot execute either function; a pending-deletion user is blocked as for direct writes.
  6. Existing R13 tests that expected an empty preset to be rejected are updated.

### 4.6 Unapplied migration fallback

- Detect once per page load from the first failing call: RPC missing (`PGRST202` / `42883`) or empty-array CHECK violation (`23514` on create).
- When RPCs are missing: single-preset slot changes fall back to `update({ character_ids }).eq(id).eq(user_id)` (no concurrency check); cross-preset moves and card reorder are rejected with toast `업데이트 적용 전에는 프리셋 간 이동과 순서 변경을 할 수 없습니다.`; removing the last character is rejected with the same style toast (`최소 1명은 남겨야 합니다.`).
- When empty presets are not allowed: `[+ 프리셋 추가]` shows toast `업데이트 적용 전에는 빈 프리셋을 만들 수 없습니다.` and does nothing.

## 5. Immediate Save Semantics

- **Write queue**: all preset writes of the page go through one FIFO queue (`usePresetBoard` hook). Each operation is applied to local state immediately (optimistic) and enqueued with its RPC payload computed from the local state at enqueue time.
- The `expected` arrays are taken from the optimistic state at enqueue time. Because writes run in order, each write's `expected` equals the state left by the previous successful write.
- **Failure**: on any failed write, drop all pending operations, reload presets from the server, and show a toast. `40001` → `다른 곳에서 프리셋이 변경되어 다시 불러왔습니다.`; others → `프리셋을 저장하지 못했습니다.` (+ message).
- **Offline**: `isOffline()` is checked before applying a drop; offline drops snap back with `OFFLINE_WRITE_MESSAGE`.
- No full reload after success (no `loadUserCharacterData()` per drop); the queue result is authoritative. A background reload (tab focus, game switch) must not overwrite local state while the queue is non-empty: such reloads are skipped and retried after the queue drains.
- While a write is pending, further drags remain allowed (they queue). A spinner dot on the card shows pending writes; `aria-busy` on that card.
- Title/memo edits go through the same queue.
- Game switch: allowed any time; pending writes for the old game finish in the background, their failures still trigger the reload/toast for that game only if it is still selected.
- Leaving the page with pending writes: `beforeunload` prompt only while the queue is non-empty.

## 6. Mobile (`< 900px`)

- Card grid as §2.2. Long-press (200ms) drag for slot reorder, cross-preset move, remove (drop outside the cards) and card reorder.
- Tap on an empty slot `+`: opens a bottom drawer (`vaul` `Drawer`, already used in the project) titled `{preset} 캐릭터 추가` with the filter bar and the three sections. Tapping a character adds it at that slot index and keeps the drawer open for further picks (until full); a `완료` button closes it. Characters already in that preset are shown disabled with `편성됨`.
- Tap on a filled slot selects it (ring) and shows its `X` remove button; tapping elsewhere clears the selection.

## 7. Favorite Roster (R63) Migration to @dnd-kit

- The favorites section of `CharacterRoster` becomes a `SortableContext` (`rectSortingStrategy`) with whole-card drag (no handle), same sensors as §3.1, saved through the existing `reorder_favorite_characters` RPC (unchanged).
- Click/tap on a card still opens the settings dialog; the existing move buttons in the dialog (keyboard alternative) remain.
- R73 `GripVertical` handles and HTML5 drag code are removed from `character-roster.tsx`.

## 8. Removed / Replaced Code

- Remove `src/components/character/preset-workspace.tsx`, `preset-list.tsx`, `preset-editor-dialog.tsx` and their tests, the `isDesktop` branch, `UNSAVED_CHANGES_CONFIRM`, `presetDirtyRef` and `confirmDiscardPresetDraft` in the characters page.
- Keep pure helpers in `character-utils.ts` that the new board uses; remove helpers that become unused (and their tests).

## 9. Testing (Step 4)

- Pure functions (`src/lib/preset-board.ts` or similar): drop resolution for every row of §3.3, over-limit rules, move payload (`expected`/`next`), card reorder, new title numbering.
- Hook: optimistic apply, FIFO ordering, failure → reload + pending drop, `40001` message, fallback paths (§4.6), reload deferral while the queue is busy.
- Components: render grid, active preset, sidebar click add, `X` remove, inline title/memo save/cancel, mobile picker add, keyboard menu `앞으로`/`뒤로`. Drag itself is covered by calling the `onDragEnd` handler with synthetic `active`/`over` ids (jsdom has no real pointer drag).
- Favorite roster: reorder via `onDragEnd`, click still opens dialog, no `draggable` attributes remain.
- `tsc --noEmit`, `npm run lint`, `git diff --check`, full Vitest, `next build`.
- Manual (Step 5, user): Chrome, Firefox, a touch device; 900px and 1280px boundaries.

## 10. Step Scope (allowed files)

- **Step 3 (GPT Codex, DB)**: new `sql/migrations/MIGRATION_R76_PRESET_GRID_EDITING.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, `src/types/database.types.ts`. Not applied to production.
- **Step 4 (Claude Opus, UI)**: `package.json`, `package-lock.json`, `src/app/dashboard/characters/page.tsx` (+ `page.test.tsx`), `src/components/character/character-roster.tsx`, `src/components/character/preset-workspace.tsx` / `preset-list.tsx` / `preset-editor-dialog.tsx` (+ tests, removal), `src/lib/character-utils.ts` (+ test), new `src/components/character/preset-board*.tsx`, `src/components/character/preset-character-picker.tsx`, `src/lib/preset-board.ts`, `src/lib/use-preset-board.ts` (+ tests).
