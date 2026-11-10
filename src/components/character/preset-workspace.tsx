"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { insertTabOnKeyDown } from "@/lib/textarea-tab"
import { cn } from "@/lib/utils"
import {
  EMPTY_CHARACTER_FILTERS,
  PRESET_MEMO_MAX,
  PRESET_TITLE_MAX,
  addCharacterToPreset,
  canAddToPreset,
  filterCharacters,
  getPresetSlotCount,
  isPresetOverLimit,
  moveCharacterInPreset,
  moveCharacterToSlot,
  placeCharacterInSlot,
  removeCharacterFromPreset,
  sortCharactersFavoriteFirst,
  type CharacterFilters,
  type ClassificationSchema,
  type GameCharacter,
  type UserCharacterState,
} from "@/lib/character-utils"
import { CharacterFilterBar } from "./character-filter-bar"
import { CharacterIcon } from "./character-icon"
import type { PresetDraft } from "./preset-editor-dialog"
import type { PresetRow } from "./preset-list"

export const UNSAVED_CHANGES_CONFIRM = "저장하지 않은 변경 사항이 있습니다. 변경 사항을 버리고 이동하시겠습니까?"

const NEW_KEY = "__new__"

interface PresetWorkspaceProps {
  presets: PresetRow[]
  maxSlots: number
  gameName: string
  characters: GameCharacter[]
  schema: ClassificationSchema
  states: Record<string, UserCharacterState>
  customIconUrls: Record<string, string>
  isBusy: boolean
  /** Returns an error message, or null on success. `presetId` is null for a new preset. */
  onSave: (draft: PresetDraft, presetId: string | null) => Promise<string | null>
  onDelete: (preset: PresetRow) => void
  /** Reports whether the editor holds unsaved changes (false again on unmount). */
  onDirtyChange?: (dirty: boolean) => void
}

type DragSource = { type: "avatar"; characterId: string } | { type: "slot"; index: number }

const EMPTY_DRAFT: PresetDraft = { title: "", memo: "", characterIds: [] }

function draftEquals(a: PresetDraft, b: PresetDraft) {
  return a.title === b.title && a.memo === b.memo && a.characterIds.join("|") === b.characterIds.join("|")
}

/**
 * Desktop (>= 900px) preset editor: owned-character sidebar on the left, preset list and inline editor on the right.
 * Remount with `key={gameId}` when the game changes. The caller owns the confirm for leaving the tab/game
 * (via `onDirtyChange`); selection changes inside the workspace are confirmed here.
 */
export function PresetWorkspace({
  presets,
  maxSlots,
  gameName,
  characters,
  schema,
  states,
  customIconUrls,
  isBusy,
  onSave,
  onDelete,
  onDirtyChange,
}: PresetWorkspaceProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [draft, setDraft] = useState<PresetDraft>(EMPTY_DRAFT)
  const [baseline, setBaseline] = useState<PresetDraft>(EMPTY_DRAFT)
  const [filters, setFilters] = useState<CharacterFilters>(EMPTY_CHARACTER_FILTERS)
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const dragRef = useRef<DragSource | null>(null)
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null)
  const pendingNewRef = useRef<Set<string> | null>(null)
  const presetsRef = useRef(presets)
  presetsRef.current = presets

  // A deleted (or not yet loaded) selection falls back to the first preset; "new" stays until saved or abandoned.
  const effectiveKey =
    selectedKey === NEW_KEY || (selectedKey && presets.some((preset) => preset.id === selectedKey))
      ? selectedKey
      : (presets[0]?.id ?? null)
  const selectedPreset = effectiveKey && effectiveKey !== NEW_KEY ? presets.find((preset) => preset.id === effectiveKey) : undefined

  // Load the form only when the selected preset changes, so background refetches never wipe user input.
  useEffect(() => {
    const preset = effectiveKey && effectiveKey !== NEW_KEY ? presetsRef.current.find((row) => row.id === effectiveKey) : undefined
    const next: PresetDraft = preset
      ? { title: preset.title, memo: preset.memo ?? "", characterIds: [...preset.character_ids] }
      : EMPTY_DRAFT
    setDraft(next)
    setBaseline(next)
    setSelectedSlot(null)
    setError(null)
  }, [effectiveKey])

  // After saving a new preset, select the row that appeared in the refreshed list.
  useEffect(() => {
    const known = pendingNewRef.current
    if (!known) return
    const created = presets.find((preset) => !known.has(preset.id))
    if (!created) return
    pendingNewRef.current = null
    setSelectedKey(created.id)
  }, [presets])

  const dirty = effectiveKey !== null && !draftEquals(draft, baseline)
  useEffect(() => {
    onDirtyChange?.(dirty)
  }, [dirty, onDirtyChange])
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange])

  const characterById = useMemo(() => {
    const map = new Map<string, GameCharacter>()
    characters.forEach((character) => map.set(character.id, character))
    return map
  }, [characters])

  const sidebarCharacters = useMemo(
    () =>
      sortCharactersFavoriteFirst(
        filterCharacters(characters, filters, schema, (id) => states[id]?.is_owned ?? false),
        (id) => states[id]?.is_favorite ?? false,
      ),
    [characters, filters, schema, states],
  )

  const ids = draft.characterIds
  const slotCount = getPresetSlotCount(maxSlots, ids)
  const overLimit = isPresetOverLimit(maxSlots, ids)
  const canAdd = canAddToPreset(maxSlots, ids)
  const locked = isSaving || isBusy

  const confirmDiscard = () => !dirty || confirm(UNSAVED_CHANGES_CONFIRM)

  const updateIds = (update: (prev: string[]) => string[]) => {
    if (isSaving) return
    setError(null)
    setDraft((prev) => ({ ...prev, characterIds: update(prev.characterIds) }))
  }

  const handleSelectPreset = (key: string) => {
    if (locked || key === effectiveKey) return
    if (!confirmDiscard()) return
    setSelectedKey(key)
  }

  const handleAddPreset = () => {
    if (locked) return
    if (effectiveKey === NEW_KEY && !dirty) return
    if (!confirmDiscard()) return
    setSelectedKey(NEW_KEY)
    // Re-selecting "new" while another new draft is open must still reset the form.
    if (effectiveKey === NEW_KEY) {
      setDraft(EMPTY_DRAFT)
      setBaseline(EMPTY_DRAFT)
      setSelectedSlot(null)
      setError(null)
    }
  }

  const handleRevert = () => {
    if (isSaving) return
    setDraft(baseline)
    setSelectedSlot(null)
    setError(null)
  }

  const handleSave = async () => {
    if (isSaving || effectiveKey === null) return
    const submitted = draft
    const presetId = selectedPreset?.id ?? null
    setIsSaving(true)
    setError(null)
    if (!presetId) pendingNewRef.current = new Set(presets.map((preset) => preset.id))
    try {
      const message = await onSave(submitted, presetId)
      if (message) {
        pendingNewRef.current = null
        setError(message)
      } else {
        setBaseline(submitted)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const applyAvatar = (characterId: string) => {
    if (isSaving) return
    if (selectedSlot !== null) {
      updateIds((prev) => placeCharacterInSlot(prev, selectedSlot, characterId, maxSlots))
      setSelectedSlot(null)
      return
    }
    if (ids.includes(characterId)) {
      updateIds((prev) => removeCharacterFromPreset(prev, characterId))
    } else if (canAdd) {
      updateIds((prev) => addCharacterToPreset(prev, characterId, maxSlots))
    } else {
      setError("슬롯이 가득 찼습니다. 슬롯을 선택해 캐릭터를 교체해 주세요.")
    }
  }

  const handleSlotClick = (index: number) => {
    if (isSaving) return
    setSelectedSlot((prev) => (prev === index ? null : index))
  }

  const handleDrop = (slotIndex: number) => {
    const source = dragRef.current
    dragRef.current = null
    setDragOverSlot(null)
    if (!source || isSaving) return
    setSelectedSlot(null)
    if (source.type === "avatar") updateIds((prev) => placeCharacterInSlot(prev, slotIndex, source.characterId, maxSlots))
    else updateIds((prev) => moveCharacterToSlot(prev, source.index, slotIndex))
  }

  const beginDrag = (event: React.DragEvent, source: DragSource) => {
    if (isSaving) {
      event.preventDefault()
      return
    }
    dragRef.current = source
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move"
      // Firefox only starts a drag when some data is set.
      event.dataTransfer.setData("text/plain", source.type === "avatar" ? source.characterId : String(source.index))
    }
  }

  const endDrag = () => {
    dragRef.current = null
    setDragOverSlot(null)
  }

  return (
    <div
      className="grid grid-cols-[minmax(260px,320px)_minmax(0,1fr)] gap-4"
      data-testid="preset-workspace"
      onKeyDown={(event) => {
        if (event.key === "Escape" && selectedSlot !== null) setSelectedSlot(null)
      }}
    >
      <aside aria-label="보유 캐릭터 사이드바" className="flex max-h-[75dvh] min-h-0 flex-col gap-3 overflow-y-auto rounded-lg border border-line bg-surface p-3">
        <h3 className="text-sm font-semibold text-content">캐릭터 선택</h3>
        <CharacterFilterBar idPrefix="workspace" characters={characters} schema={schema} filters={filters} onChange={setFilters} />
        {sidebarCharacters.length === 0 ? (
          <p className="py-4 text-center text-sm text-content-secondary">조건에 맞는 캐릭터가 없습니다.</p>
        ) : (
          <ul className="grid grid-cols-3 gap-2" data-testid="workspace-avatar-list">
            {sidebarCharacters.map((character) => {
              const placed = ids.includes(character.id)
              const owned = states[character.id]?.is_owned ?? false
              return (
                <li key={character.id}>
                  <button
                    type="button"
                    draggable={!isSaving}
                    aria-pressed={placed}
                    title={!placed && !canAdd && selectedSlot === null ? "슬롯이 가득 찼습니다." : undefined}
                    onClick={() => applyAvatar(character.id)}
                    onDragStart={(event) => beginDrag(event, { type: "avatar", characterId: character.id })}
                    onDragEnd={endDrag}
                    className={cn(
                      "flex w-full cursor-grab flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-colors duration-fast active:cursor-grabbing [&_img]:pointer-events-none",
                      placed ? "border-primary bg-primary/10 text-content" : "border-line bg-surface-2 text-content-secondary hover:text-content",
                    )}
                  >
                    <CharacterIcon
                      name={character.name}
                      customIconUrl={customIconUrls[character.id]}
                      defaultIconUrl={character.default_icon_url}
                      dimmed={!owned}
                      favorite={states[character.id]?.is_favorite ?? false}
                      breakthroughLevel={owned ? (states[character.id]?.breakthrough_level ?? 0) : null}
                      className="h-12 w-12"
                    />
                    <span className="w-full truncate text-center">{character.name}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </aside>

      <section aria-label="프리셋 편집" className="min-w-0 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-content-secondary">
            {gameName} · 슬롯은 최대 {maxSlots}칸입니다. 캐릭터를 슬롯으로 끌어다 놓거나, 슬롯을 선택한 뒤 캐릭터를 눌러 배치합니다.
          </p>
          <Button type="button" onClick={handleAddPreset} disabled={locked}>
            <Plus className="mr-1 h-4 w-4" />
            새 프리셋 추가
          </Button>
        </div>

        {presets.length > 0 || effectiveKey === NEW_KEY ? (
          <ul className="flex flex-wrap gap-2" data-testid="workspace-preset-list">
            {presets.map((preset) => (
              <li key={preset.id} className="flex items-center rounded-lg border border-line bg-surface">
                <button
                  type="button"
                  aria-pressed={preset.id === effectiveKey}
                  disabled={locked}
                  onClick={() => handleSelectPreset(preset.id)}
                  className={cn(
                    "max-w-[200px] truncate rounded-l-lg px-3 py-2 text-sm",
                    preset.id === effectiveKey ? "bg-primary/10 font-semibold text-content" : "text-content-secondary hover:text-content",
                  )}
                >
                  {preset.title}
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={locked}
                  aria-label={`${preset.title} 삭제`}
                  onClick={() => onDelete(preset)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
            {effectiveKey === NEW_KEY && (
              <li className="flex items-center rounded-lg border border-primary bg-primary/10 px-3 py-2 text-sm font-semibold text-content">
                새 프리셋 (저장 전)
              </li>
            )}
          </ul>
        ) : null}

        {effectiveKey === null ? (
          <div className="rounded-lg border border-dashed border-line p-8 text-center">
            <p className="text-sm text-content">저장된 프리셋이 없습니다.</p>
            <p className="mt-1 text-xs text-content-secondary">[+ 새 프리셋 추가]로 파티 조합을 저장해 보세요.</p>
          </div>
        ) : (
          <div className="space-y-4 rounded-lg border border-line bg-surface p-4">
            <div className="space-y-1.5">
              <label htmlFor="workspace-title" className="text-sm font-medium text-content">프리셋 제목</label>
              <Input
                id="workspace-title"
                value={draft.title}
                maxLength={PRESET_TITLE_MAX}
                disabled={isSaving}
                onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="workspace-memo" className="text-sm font-medium text-content">프리셋 메모</label>
              <Textarea
                id="workspace-memo"
                value={draft.memo}
                maxLength={PRESET_MEMO_MAX}
                rows={3}
                disabled={isSaving}
                onChange={(event) => setDraft((prev) => ({ ...prev, memo: event.target.value }))}
                onKeyDown={(event) => insertTabOnKeyDown(event, (value) => setDraft((prev) => ({ ...prev, memo: value })))}
                placeholder="공략 메모 (최대 300자)"
                className="whitespace-pre-wrap"
              />
            </div>

            <section aria-label="슬롯 배치" className="space-y-2">
              <h3 className="text-sm font-semibold text-content">
                슬롯 배치 <span className="font-normal text-content-secondary">({ids.length} / {maxSlots})</span>
              </h3>
              {overLimit && (
                <p role="status" className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
                  관리자가 슬롯 상한을 {maxSlots}칸으로 줄였습니다. 인원을 상한 이하로 줄이기 전에는 캐릭터를 추가할 수 없으며, 교체·이동·제거만 가능합니다.
                </p>
              )}
              <ol className="grid grid-cols-2 gap-2 xl:grid-cols-3" data-testid="workspace-slots">
                {Array.from({ length: slotCount }, (_, index) => {
                  const characterId = ids[index]
                  const character = characterId ? characterById.get(characterId) : undefined
                  const isSelected = selectedSlot === index
                  const dropProps = {
                    onDragOver: (event: React.DragEvent) => {
                      if (!dragRef.current) return
                      event.preventDefault()
                      if (dragOverSlot !== index) setDragOverSlot(index)
                    },
                    onDragLeave: () => setDragOverSlot((prev) => (prev === index ? null : prev)),
                    onDrop: (event: React.DragEvent) => {
                      event.preventDefault()
                      handleDrop(index)
                    },
                  }
                  const frame = cn(
                    "flex items-center gap-2 rounded-lg border p-2",
                    isSelected ? "border-primary ring-2 ring-primary/40" : "border-line",
                    dragOverSlot === index && "bg-primary/10",
                  )
                  if (!characterId) {
                    return (
                      <li key={`empty-${index}`} data-testid="workspace-slot-empty" data-index={index} className={cn(frame, "h-16 border-dashed")} {...dropProps}>
                        <button
                          type="button"
                          aria-pressed={isSelected}
                          aria-label={`${index + 1}번 빈 슬롯`}
                          onClick={() => handleSlotClick(index)}
                          className="h-full w-full text-left text-xs text-content-muted"
                        >
                          {index + 1}. 빈 슬롯
                        </button>
                      </li>
                    )
                  }
                  const isOwned = states[characterId]?.is_owned ?? false
                  const name = character?.name ?? "알 수 없는 캐릭터"
                  return (
                    <li
                      key={characterId}
                      data-testid="workspace-slot"
                      data-index={index}
                      draggable={!isSaving}
                      onDragStart={(event) => beginDrag(event, { type: "slot", index })}
                      onDragEnd={endDrag}
                      className={cn(frame, "bg-surface-2")}
                      {...dropProps}
                    >
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        aria-label={`${index + 1}번 슬롯 ${name}`}
                        onClick={() => handleSlotClick(index)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left [&_img]:pointer-events-none"
                      >
                        <span className="w-4 shrink-0 text-xs text-content-muted">{index + 1}</span>
                        <CharacterIcon
                          name={character?.name ?? "?"}
                          customIconUrl={customIconUrls[characterId]}
                          defaultIconUrl={character?.default_icon_url}
                          dimmed={!isOwned}
                          favorite={states[characterId]?.is_favorite ?? false}
                          breakthroughLevel={isOwned ? (states[characterId]?.breakthrough_level ?? 0) : null}
                          className="h-10 w-10"
                        />
                        <span className="min-w-0 flex-1 truncate text-sm text-content">{name}</span>
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={index === 0}
                        aria-label={`${name} 위로 이동`}
                        onClick={() => {
                          setSelectedSlot(null)
                          updateIds((prev) => moveCharacterInPreset(prev, index, -1))
                        }}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={index === ids.length - 1}
                        aria-label={`${name} 아래로 이동`}
                        onClick={() => {
                          setSelectedSlot(null)
                          updateIds((prev) => moveCharacterInPreset(prev, index, 1))
                        }}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={`${name} 제거`}
                        onClick={() => {
                          setSelectedSlot(null)
                          updateIds((prev) => removeCharacterFromPreset(prev, characterId))
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  )
                })}
              </ol>
            </section>

            {error && <p role="alert" className="text-sm text-danger">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleRevert} disabled={!dirty || isSaving}>
                되돌리기
              </Button>
              <Button type="button" onClick={() => void handleSave()} disabled={!dirty || locked}>
                {isSaving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                저장
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
