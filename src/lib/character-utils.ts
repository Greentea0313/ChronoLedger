// Pure helpers for the R13 character roster and party preset UI (/dashboard/characters).
// Spec: docs/spec/R13_Character_Roster_and_Preset_Spec.md §2.4~§2.6, §4.2, §7.3.

export const DEFAULT_MAX_PRESET_SLOTS = 4
export const PRESET_SLOT_HARD_LIMIT = 12
export const PRESET_TITLE_MAX = 80
export const PRESET_MEMO_MAX = 300
export const DEFAULT_MAX_BREAKTHROUGH = 6
export const BREAKTHROUGH_HARD_LIMIT = 12

/** Filter value that matches values missing from the current game schema (spec §7.3.4). */
export const OTHER_FILTER_VALUE = "__other__"
export const OTHER_FILTER_LABEL = "기타"

/** Dimming applied to icons of characters the user does not own. */
export const UNOWNED_ICON_CLASS = "brightness-50 saturate-50 opacity-65"

/** Gold ring marking favorite characters. */
export const FAVORITE_ICON_CLASS = "ring-2 ring-amber-400 border-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.35)]"

export type ClassificationAxis = {
  key: string
  label: string
  options: string[]
}

export type ClassificationSchema = {
  character_label?: string
  rarities: string[]
  axes: ClassificationAxis[]
}

export type GameCharacter = {
  id: string
  game_id: string
  name: string
  rarity: string | null
  attributes: Record<string, string>
  default_icon_url: string | null
}

export type UserCharacterState = {
  is_owned: boolean
  is_favorite: boolean
  favorite_sort_order?: number | null
  breakthrough_level: number
  custom_icon_path: string | null
}

export type OwnershipFilter = "all" | "owned" | "unowned"

export type CharacterFilters = {
  ownership: OwnershipFilter
  /** "" = all, OTHER_FILTER_VALUE = unmapped, otherwise a rarity label. */
  rarity: string
  /** axis key -> "" (all) | OTHER_FILTER_VALUE | option. */
  axes: Record<string, string>
  query: string
}

export const EMPTY_CHARACTER_FILTERS: CharacterFilters = {
  ownership: "all",
  rarity: "",
  axes: {},
  query: "",
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

/** Converts a raw JSONB value to a safe schema; malformed values become an empty schema. */
export function normalizeClassificationSchema(raw: unknown): ClassificationSchema {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { character_label: "캐릭터", rarities: [], axes: [] }
  const source = raw as { character_label?: unknown; rarities?: unknown; axes?: unknown }
  const axes: ClassificationAxis[] = []
  if (Array.isArray(source.axes)) {
    source.axes.forEach((axis) => {
      if (!axis || typeof axis !== "object") return
      const { key, label, options } = axis as { key?: unknown; label?: unknown; options?: unknown }
      if (typeof key !== "string" || typeof label !== "string") return
      axes.push({ key, label, options: toStringArray(options) })
    })
  }
  const characterLabel = typeof source.character_label === "string" && source.character_label.trim() ? source.character_label.trim() : "캐릭터"
  return { character_label: characterLabel, rarities: toStringArray(source.rarities), axes: axes.slice(0, 2) }
}

export function isCharacterTemplateActive(game: { classification_schema?: unknown } | null | undefined, characterCount: number): boolean {
  return normalizeClassificationSchema(game?.classification_schema).rarities.length >= 1 || characterCount >= 1
}

export function isCharacterSupported(characterCount: number): boolean {
  return characterCount >= 1
}

export function normalizeMaxPresetSlots(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= PRESET_SLOT_HARD_LIMIT
    ? value
    : DEFAULT_MAX_PRESET_SLOTS
}

export function normalizeMaxBreakthrough(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= BREAKTHROUGH_HARD_LIMIT
    ? value
    : DEFAULT_MAX_BREAKTHROUGH
}

/** Favorites first, then name ascending (ko). Returns a new array. */
export function sortCharactersFavoriteFirst(
  characters: GameCharacter[],
  isFavorite: (characterId: string) => boolean,
): GameCharacter[] {
  return [...characters].sort((a, b) => {
    const favoriteDiff = Number(isFavorite(b.id)) - Number(isFavorite(a.id))
    return favoriteDiff !== 0 ? favoriteDiff : a.name.localeCompare(b.name, "ko")
  })
}

export type CharacterRosterEntry = GameCharacter & {
  isOwned: boolean
  isFavorite: boolean
  favoriteSortOrder: number | null
}

export type CharacterRosterSections = {
  favorites: CharacterRosterEntry[]
  owned: CharacterRosterEntry[]
  unowned: CharacterRosterEntry[]
}

/** Splits the filtered roster into mutually exclusive favorite, owned, and unowned sections. */
export function splitCharacterRosterSections(entries: readonly CharacterRosterEntry[]): CharacterRosterSections {
  const favorites: CharacterRosterEntry[] = []
  const owned: CharacterRosterEntry[] = []
  const unowned: CharacterRosterEntry[] = []
  entries.forEach((entry) => {
    if (entry.isOwned && entry.isFavorite) {
      favorites.push(entry)
    } else if (entry.isOwned) {
      owned.push(entry)
    } else {
      unowned.push(entry)
    }
  })
  favorites.sort((a, b) => {
    const orderA = a.favoriteSortOrder ?? Number.MAX_SAFE_INTEGER
    const orderB = b.favoriteSortOrder ?? Number.MAX_SAFE_INTEGER
    return orderA - orderB || a.name.localeCompare(b.name, "ko") || a.id.localeCompare(b.id)
  })
  return { favorites, owned, unowned }
}

/** Moves a favorite from one position to another without mutating the input. */
export function moveFavoriteCharacter(characterIds: readonly string[], from: number, to: number): string[] {
  const next = [...characterIds]
  if (from < 0 || from >= next.length || to < 0 || to >= next.length || from === to) return next
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

export function normalizeAttributes(raw: unknown): Record<string, string> {
  const result: Record<string, string> = {}
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return result
  Object.entries(raw as Record<string, unknown>).forEach(([key, value]) => {
    if (typeof value === "string") result[key] = value
  })
  return result
}

export function normalizeCharacterRow(row: {
  id: string
  game_id: string
  name: string
  rarity?: string | null
  attributes?: unknown
  default_icon_url?: string | null
}): GameCharacter {
  return {
    id: row.id,
    game_id: row.game_id,
    name: row.name,
    rarity: row.rarity ?? null,
    attributes: normalizeAttributes(row.attributes),
    default_icon_url: row.default_icon_url ?? null,
  }
}

/** First visible character of a name, used by the initial avatar fallback. */
export function getNameInitial(name: string): string {
  const first = Array.from(name.trim())[0]
  return first ? first.toUpperCase() : "?"
}

function isRarityUnmapped(character: GameCharacter, schema: ClassificationSchema): boolean {
  return !character.rarity || !schema.rarities.includes(character.rarity)
}

function isAxisUnmapped(character: GameCharacter, axis: ClassificationAxis): boolean {
  const value = character.attributes[axis.key]
  return !value || !axis.options.includes(value)
}

/** True when the rarity chip group needs a `기타` chip. */
export function hasOtherRarity(characters: GameCharacter[], schema: ClassificationSchema): boolean {
  return schema.rarities.length > 0 && characters.some((character) => isRarityUnmapped(character, schema))
}

/** True when the given axis chip group needs a `기타` chip. */
export function hasOtherAxisValue(characters: GameCharacter[], axis: ClassificationAxis): boolean {
  return axis.options.length > 0 && characters.some((character) => isAxisUnmapped(character, axis))
}

export function filterCharacters(
  characters: GameCharacter[],
  filters: CharacterFilters,
  schema: ClassificationSchema,
  isOwned: (characterId: string) => boolean,
): GameCharacter[] {
  const query = filters.query.trim().toLowerCase()
  return characters.filter((character) => {
    if (filters.ownership === "owned" && !isOwned(character.id)) return false
    if (filters.ownership === "unowned" && isOwned(character.id)) return false
    if (query && !character.name.toLowerCase().includes(query)) return false
    if (filters.rarity) {
      if (filters.rarity === OTHER_FILTER_VALUE) {
        if (!isRarityUnmapped(character, schema)) return false
      } else if (character.rarity !== filters.rarity) {
        return false
      }
    }
    for (const axis of schema.axes) {
      const selected = filters.axes[axis.key]
      if (!selected) continue
      if (selected === OTHER_FILTER_VALUE) {
        if (!isAxisUnmapped(character, axis)) return false
      } else if (character.attributes[axis.key] !== selected) {
        return false
      }
    }
    return true
  })
}

// ---------------------------------------------------------------------------
// Party presets
// ---------------------------------------------------------------------------

/** Number of slots to render: never fewer than the saved characters (spec §4.2, §7.3.1). */
export function getPresetSlotCount(maxSlots: number, characterIds: readonly string[]): number {
  return Math.max(maxSlots, characterIds.length)
}

/** A preset saved before an admin reduced `max_preset_slots`. */
export function isPresetOverLimit(maxSlots: number, characterIds: readonly string[]): boolean {
  return characterIds.length > maxSlots
}

/** New characters may only be added while the preset is below the current ceiling. */
export function canAddToPreset(maxSlots: number, characterIds: readonly string[]): boolean {
  return characterIds.length < maxSlots
}

/** Adds a character without duplicates and without exceeding the ceiling; otherwise returns the same ids. */
export function addCharacterToPreset(characterIds: readonly string[], characterId: string, maxSlots: number): string[] {
  if (characterIds.includes(characterId) || !canAddToPreset(maxSlots, characterIds)) return [...characterIds]
  return [...characterIds, characterId]
}

export function removeCharacterFromPreset(characterIds: readonly string[], characterId: string): string[] {
  return characterIds.filter((id) => id !== characterId)
}

/** Moves the slot at `index` by `delta` positions (clamped); returns a new array. */
export function moveCharacterInPreset(characterIds: readonly string[], index: number, delta: number): string[] {
  const next = [...characterIds]
  const target = index + delta
  if (index < 0 || index >= next.length || target < 0 || target >= next.length) return next
  const [moved] = next.splice(index, 1)
  next.splice(target, 0, moved)
  return next
}

/**
 * Places a character into a specific slot (desktop workspace drag/drop and slot-then-avatar click).
 * - Empty slot (index >= length): appends; an already placed character is moved to the end instead.
 * - Filled slot: replaces the occupant, or swaps both slots when the character is already placed elsewhere.
 * Never creates duplicates or gaps; only appending is limited by the ceiling, so an over-limit preset can
 * still replace/swap but never grows (spec §7.3.1).
 */
export function placeCharacterInSlot(
  characterIds: readonly string[],
  slotIndex: number,
  characterId: string,
  maxSlots: number,
): string[] {
  const next = [...characterIds]
  if (slotIndex < 0) return next
  const existingIndex = next.indexOf(characterId)

  if (slotIndex >= next.length) {
    if (existingIndex >= 0) {
      next.splice(existingIndex, 1)
      next.push(characterId)
      return next
    }
    return canAddToPreset(maxSlots, next) ? [...next, characterId] : next
  }

  if (existingIndex === slotIndex) return next
  if (existingIndex >= 0) {
    next[existingIndex] = next[slotIndex]
    next[slotIndex] = characterId
    return next
  }
  next[slotIndex] = characterId
  return next
}

/** Moves the character at `from` to slot `to` (clamped to the last filled slot, so an empty slot means "end"). */
export function moveCharacterToSlot(characterIds: readonly string[], from: number, to: number): string[] {
  const next = [...characterIds]
  if (from < 0 || from >= next.length) return next
  const target = Math.min(Math.max(to, 0), next.length - 1)
  if (target === from) return next
  const [moved] = next.splice(from, 1)
  next.splice(target, 0, moved)
  return next
}

export function validatePresetInput(input: {
  title: string
  memo: string
  characterIds: readonly string[]
}): string | null {
  const title = input.title.trim()
  if (title.length < 1 || title.length > PRESET_TITLE_MAX) return `프리셋 제목은 1~${PRESET_TITLE_MAX}자로 입력해 주세요.`
  if (input.memo.length > PRESET_MEMO_MAX) return `프리셋 메모는 ${PRESET_MEMO_MAX}자 이내로 입력해 주세요.`
  if (input.characterIds.length < 1) return "캐릭터를 1명 이상 배치해 주세요."
  if (input.characterIds.length > PRESET_SLOT_HARD_LIMIT) return `캐릭터는 최대 ${PRESET_SLOT_HARD_LIMIT}명까지 배치할 수 있습니다.`
  if (new Set(input.characterIds).size !== input.characterIds.length) return "같은 캐릭터를 중복 배치할 수 없습니다."
  return null
}

// ---------------------------------------------------------------------------
// Classification template (admin form) - mirrors the DB is_valid_classification_schema (R52 / R57)
// ---------------------------------------------------------------------------

export const CHARACTER_LABEL_MAX = 20
export const TEMPLATE_RARITY_MAX_COUNT = 10
export const TEMPLATE_RARITY_MAX_LENGTH = 20
export const TEMPLATE_AXIS_MAX_COUNT = 2
export const TEMPLATE_AXIS_LABEL_MAX = 30
export const TEMPLATE_AXIS_OPTION_MAX_COUNT = 20
export const TEMPLATE_AXIS_OPTION_MAX_LENGTH = 30
const AXIS_KEY_PATTERN = /^[a-z0-9_]{1,24}$/
const DEFAULT_AXIS_KEYS = ["class1", "class2"]

/** `a, b ,, c` -> `["a", "b", "c"]` (trimmed, blanks dropped; duplicates are kept so validation can report them). */
export function splitCommaList(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean)
}

/** First unused default axis key (`class1`, `class2`, ...), so deleting then adding an axis never repeats a key. */
export function assignAxisKey(usedKeys: readonly string[]): string {
  const free = DEFAULT_AXIS_KEYS.find((key) => !usedKeys.includes(key))
  if (free) return free
  let index = DEFAULT_AXIS_KEYS.length + 1
  while (usedKeys.includes(`class${index}`)) index += 1
  return `class${index}`
}

export type ClassificationTemplateInput = {
  characterLabel: string
  rarities: string[]
  axes: ClassificationAxis[]
}

function findDuplicate(values: readonly string[]): string | undefined {
  return values.find((value, index) => values.indexOf(value) !== index)
}

/**
 * Validates the admin template form with the same limits as the database CHECK, returning a Korean error for the first
 * violation or null. `requireRarities` is set in the template create/edit flow, where a rank list is mandatory.
 */
export function validateClassificationTemplate(
  input: ClassificationTemplateInput,
  options: { requireRarities?: boolean } = {},
): string | null {
  if (input.characterLabel.trim().length > CHARACTER_LABEL_MAX) {
    return `캐릭터 시스템 명칭은 ${CHARACTER_LABEL_MAX}자 이내로 입력해 주세요.`
  }
  if (options.requireRarities && input.rarities.length < 1) return "등급 목록을 1개 이상 입력해 주세요."
  if (input.rarities.length > TEMPLATE_RARITY_MAX_COUNT) {
    return `레어도는 비어 있지 않은 문자열을 최대 ${TEMPLATE_RARITY_MAX_COUNT}개까지 입력할 수 있습니다.`
  }
  if (input.rarities.some((rarity) => rarity.length > TEMPLATE_RARITY_MAX_LENGTH)) {
    return `등급 이름은 각 ${TEMPLATE_RARITY_MAX_LENGTH}자 이내로 입력해 주세요.`
  }
  const duplicateRarity = findDuplicate(input.rarities)
  if (duplicateRarity) return `등급 '${duplicateRarity}'이(가) 중복되었습니다.`

  if (input.axes.length > TEMPLATE_AXIS_MAX_COUNT) return `분류 기준은 최대 ${TEMPLATE_AXIS_MAX_COUNT}개까지 설정할 수 있습니다.`
  for (let index = 0; index < input.axes.length; index += 1) {
    const axis = input.axes[index]
    const name = `분류 기준 ${index + 1}`
    const label = axis.label.trim()
    if (label.length < 1 || label.length > TEMPLATE_AXIS_LABEL_MAX) return `${name}의 이름을 1~${TEMPLATE_AXIS_LABEL_MAX}자로 입력해 주세요.`
    if (!AXIS_KEY_PATTERN.test(axis.key) || input.axes.findIndex((other) => other.key === axis.key) !== index) {
      return `${name}의 내부 키가 올바르지 않거나 중복되었습니다. 분류 기준을 삭제한 뒤 다시 추가해 주세요.`
    }
    if (axis.options.length < 1) return `${name}(${label})의 선택지를 1개 이상 입력해 주세요.`
    if (axis.options.length > TEMPLATE_AXIS_OPTION_MAX_COUNT) {
      return `${name}(${label})의 선택지는 최대 ${TEMPLATE_AXIS_OPTION_MAX_COUNT}개까지 입력할 수 있습니다.`
    }
    if (axis.options.some((option) => option.length > TEMPLATE_AXIS_OPTION_MAX_LENGTH)) {
      return `${name}(${label})의 선택지는 각 ${TEMPLATE_AXIS_OPTION_MAX_LENGTH}자 이내로 입력해 주세요.`
    }
    const duplicateOption = findDuplicate(axis.options)
    if (duplicateOption) return `${name}(${label})의 선택지 '${duplicateOption}'이(가) 중복되었습니다.`
  }
  return null
}
