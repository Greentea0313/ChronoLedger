/**
 * Pure rules of the R76 preset card grid: drag ids, drop resolution and the payloads the board saves.
 * See docs/spec/R76_Preset_Grid_Editing_Spec.md §3.3.
 */

export interface BoardPreset {
  id: string
  game_id: string
  title: string
  character_ids: string[]
  memo: string | null
  sort_order: number
  created_at: string
}

/** One preset's slot change as sent to `update_character_preset_slots` (`expected` = state the change was built on). */
export interface SlotChange {
  id: string
  expected: string[]
  next: string[]
}

export const NEW_PRESET_TITLE = "새 프리셋"
export const DUPLICATE_IN_PRESET_MESSAGE = "이미 이 프리셋에 있어요."
export const slotLimitMessage = (maxSlots: number) => `슬롯은 최대 ${maxSlots}칸까지 사용할 수 있습니다.`

/** Drag/drop ids: sidebar avatar, slot avatar, card, empty slot cell and the sidebar drop zone. */
export type BoardDragId =
  | { type: "side"; characterId: string }
  | { type: "slot"; presetId: string; characterId: string }
  | { type: "card"; presetId: string }
  | { type: "empty"; presetId: string }
  | { type: "sidebar" }
  | { type: "noop" }

export const sideId = (characterId: string) => `side:${characterId}`
export const slotId = (presetId: string, characterId: string) => `slot:${presetId}:${characterId}`
export const cardId = (presetId: string) => `card:${presetId}`
export const emptyId = (presetId: string, index: number) => `empty:${presetId}:${index}`
export const SIDEBAR_DROP_ID = "sidebar"
/** A drop zone that only cancels the drag (the [+ 프리셋 추가] card). */
export const NOOP_DROP_ID = "noop"

export function parseBoardId(id: string | number | null | undefined): BoardDragId | null {
  if (typeof id !== "string") return null
  if (id === SIDEBAR_DROP_ID) return { type: "sidebar" }
  if (id === NOOP_DROP_ID) return { type: "noop" }
  const [type, first, second] = id.split(":")
  if (type === "side" && first) return { type: "side", characterId: first }
  if (type === "slot" && first && second) return { type: "slot", presetId: first, characterId: second }
  if (type === "card" && first) return { type: "card", presetId: first }
  if (type === "empty" && first) return { type: "empty", presetId: first }
  return null
}

/** Cards in display order: `sort_order`, then creation time, then id. */
export function sortPresets<T extends Pick<BoardPreset, "id" | "sort_order" | "created_at">>(presets: readonly T[]): T[] {
  return [...presets].sort(
    (a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
  )
}

/** `새 프리셋`, then `새 프리셋 2`, `새 프리셋 3`, ... for the first title not used yet. */
export function nextPresetTitle(titles: readonly string[]): string {
  if (!titles.includes(NEW_PRESET_TITLE)) return NEW_PRESET_TITLE
  let index = 2
  while (titles.includes(`${NEW_PRESET_TITLE} ${index}`)) index += 1
  return `${NEW_PRESET_TITLE} ${index}`
}

export type DropResult =
  | { kind: "none" }
  | { kind: "reject"; message: string }
  | { kind: "slots"; changes: SlotChange[]; activePresetId: string }
  | { kind: "cards"; presetIds: string[] }

const NONE: DropResult = { kind: "none" }

function insertAt(ids: readonly string[], characterId: string, index: number): string[] {
  const next = [...ids]
  next.splice(Math.min(Math.max(index, 0), next.length), 0, characterId)
  return next
}

/** Adds a character to a preset (`index` = insert position, end when omitted); rejects duplicates and full presets. */
export function addCharacter(preset: BoardPreset, characterId: string, maxSlots: number, index?: number): DropResult {
  if (preset.character_ids.includes(characterId)) return { kind: "reject", message: DUPLICATE_IN_PRESET_MESSAGE }
  if (preset.character_ids.length >= maxSlots) return { kind: "reject", message: slotLimitMessage(maxSlots) }
  return {
    kind: "slots",
    activePresetId: preset.id,
    changes: [{ id: preset.id, expected: preset.character_ids, next: insertAt(preset.character_ids, characterId, index ?? preset.character_ids.length) }],
  }
}

export function removeCharacter(preset: BoardPreset, characterId: string): DropResult {
  if (!preset.character_ids.includes(characterId)) return NONE
  return {
    kind: "slots",
    activePresetId: preset.id,
    changes: [{ id: preset.id, expected: preset.character_ids, next: preset.character_ids.filter((id) => id !== characterId) }],
  }
}

/** Moves a card one step forward (-1) or backward (+1) in the display order. */
export function moveCard(presets: readonly BoardPreset[], presetId: string, offset: -1 | 1): DropResult {
  const ids = sortPresets(presets).map((preset) => preset.id)
  const from = ids.indexOf(presetId)
  const to = from + offset
  if (from < 0 || to < 0 || to >= ids.length) return NONE
  const next = [...ids]
  next.splice(from, 1)
  next.splice(to, 0, presetId)
  return { kind: "cards", presetIds: next }
}

/**
 * Resolves a finished drag (`active` = dragged id, `over` = id under the pointer) for the presets of one game.
 * Implements the drop table of spec §3.3; the result is applied optimistically and saved by the board hook.
 */
export function resolveDrop(
  activeRaw: string | number,
  overRaw: string | number | null | undefined,
  presets: readonly BoardPreset[],
  maxSlots: number,
): DropResult {
  const active = parseBoardId(activeRaw)
  const over = parseBoardId(overRaw)
  if (!active || over?.type === "noop") return NONE
  const byId = (id: string) => presets.find((preset) => preset.id === id)

  if (active.type === "card") {
    if (!over || over.type !== "card" || over.presetId === active.presetId) return NONE
    const ids = sortPresets(presets).map((preset) => preset.id)
    const from = ids.indexOf(active.presetId)
    const to = ids.indexOf(over.presetId)
    if (from < 0 || to < 0) return NONE
    const next = [...ids]
    next.splice(from, 1)
    next.splice(to, 0, active.presetId)
    return { kind: "cards", presetIds: next }
  }

  if (active.type === "side") {
    if (!over || over.type === "sidebar" || over.type === "side") return NONE
    const target = byId(over.presetId)
    if (!target) return NONE
    const index = over.type === "slot" ? target.character_ids.indexOf(over.characterId) : undefined
    return addCharacter(target, active.characterId, maxSlots, index !== undefined && index >= 0 ? index : undefined)
  }

  if (active.type !== "slot") return NONE
  const source = byId(active.presetId)
  if (!source || !source.character_ids.includes(active.characterId)) return NONE

  // Outside every card (no target) or onto the sidebar: remove from the preset.
  if (!over || over.type === "sidebar" || over.type === "side") return removeCharacter(source, active.characterId)

  const target = byId(over.presetId)
  if (!target) return NONE

  if (target.id === source.id) {
    const from = source.character_ids.indexOf(active.characterId)
    const to = over.type === "slot" ? source.character_ids.indexOf(over.characterId) : source.character_ids.length - 1
    if (to < 0 || from === to) return NONE
    const next = [...source.character_ids]
    next.splice(from, 1)
    next.splice(to, 0, active.characterId)
    return { kind: "slots", activePresetId: source.id, changes: [{ id: source.id, expected: source.character_ids, next }] }
  }

  // Cross-preset move (D-05): removed from the source, inserted into the target in one atomic save.
  if (target.character_ids.includes(active.characterId)) return { kind: "reject", message: DUPLICATE_IN_PRESET_MESSAGE }
  if (target.character_ids.length >= maxSlots) return { kind: "reject", message: slotLimitMessage(maxSlots) }
  const insertIndex = over.type === "slot" ? target.character_ids.indexOf(over.characterId) : target.character_ids.length
  return {
    kind: "slots",
    activePresetId: target.id,
    changes: [
      { id: source.id, expected: source.character_ids, next: source.character_ids.filter((id) => id !== active.characterId) },
      { id: target.id, expected: target.character_ids, next: insertAt(target.character_ids, active.characterId, insertIndex < 0 ? target.character_ids.length : insertIndex) },
    ],
  }
}

/** Applies slot changes to a preset list (unchanged presets keep their identity). */
export function applySlotChanges<T extends Pick<BoardPreset, "id" | "character_ids">>(presets: readonly T[], changes: readonly SlotChange[]): T[] {
  return presets.map((preset) => {
    const change = changes.find((item) => item.id === preset.id)
    return change ? { ...preset, character_ids: change.next } : preset
  })
}

/** Applies a new card order as 1-based `sort_order` values (as `reorder_character_presets` stores them). */
export function applyCardOrder<T extends Pick<BoardPreset, "id" | "sort_order">>(presets: readonly T[], presetIds: readonly string[]): T[] {
  return presets.map((preset) => {
    const index = presetIds.indexOf(preset.id)
    return index >= 0 ? { ...preset, sort_order: index + 1 } : preset
  })
}
