"use client"

import { useMemo, useRef, useState, useEffect } from "react"
import { ArrowDown, ArrowUp, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  removeCharacterFromPreset,
  sortCharactersFavoriteFirst,
  type CharacterFilters,
  type ClassificationSchema,
  type GameCharacter,
  type UserCharacterState,
} from "@/lib/character-utils"
import { CharacterFilterBar } from "./character-filter-bar"
import { CharacterIcon } from "./character-icon"

export interface PresetDraft {
  title: string
  memo: string
  characterIds: string[]
}

export interface PresetEditorTarget {
  id: string | null
  title: string
  memo: string | null
  characterIds: string[]
}

interface PresetEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = new preset */
  preset: PresetEditorTarget | null
  gameName: string
  characters: GameCharacter[]
  schema: ClassificationSchema
  maxSlots: number
  states: Record<string, UserCharacterState>
  customIconUrls: Record<string, string>
  /** Returns an error message, or null on success (the dialog closes on success). */
  onSave: (draft: PresetDraft) => Promise<string | null>
}

export function PresetEditorDialog({
  open,
  onOpenChange,
  preset,
  gameName,
  characters,
  schema,
  maxSlots,
  states,
  customIconUrls,
  onSave,
}: PresetEditorDialogProps) {
  const [title, setTitle] = useState("")
  const [memo, setMemo] = useState("")
  const [characterIds, setCharacterIds] = useState<string[]>([])
  const [filters, setFilters] = useState<CharacterFilters>(EMPTY_CHARACTER_FILTERS)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const prevOpenRef = useRef(false)

  // Initialize the form only on the closed -> open transition so background refetches never wipe input.
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setTitle(preset?.title ?? "")
      setMemo(preset?.memo ?? "")
      setCharacterIds(preset?.characterIds ?? [])
      setFilters(EMPTY_CHARACTER_FILTERS)
      setError(null)
      setIsSaving(false)
    }
    prevOpenRef.current = open
  }, [open, preset])

  const characterById = useMemo(() => {
    const map = new Map<string, GameCharacter>()
    characters.forEach((character) => map.set(character.id, character))
    return map
  }, [characters])

  const pickerCharacters = useMemo(
    () =>
      sortCharactersFavoriteFirst(
        filterCharacters(characters, filters, schema, (id) => states[id]?.is_owned ?? false),
        (id) => states[id]?.is_favorite ?? false,
      ),
    [characters, filters, schema, states],
  )

  const slotCount = getPresetSlotCount(maxSlots, characterIds)
  const overLimit = isPresetOverLimit(maxSlots, characterIds)
  const canAdd = canAddToPreset(maxSlots, characterIds)

  const togglePicker = (characterId: string) => {
    setError(null)
    setCharacterIds((prev) =>
      prev.includes(characterId) ? removeCharacterFromPreset(prev, characterId) : addCharacterToPreset(prev, characterId, maxSlots),
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    try {
      const message = await onSave({ title, memo, characterIds })
      if (message) setError(message)
      else onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{preset?.id ? "프리셋 수정" : "새 프리셋 추가"}</DialogTitle>
          <DialogDescription>
            {gameName}의 조합 프리셋을 편집합니다. 슬롯은 최대 {maxSlots}칸이며 같은 캐릭터를 중복 배치할 수 없습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="preset-title" className="text-sm font-medium text-content">프리셋 제목</label>
            <Input
              id="preset-title"
              value={title}
              maxLength={PRESET_TITLE_MAX}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="preset-memo" className="text-sm font-medium text-content">프리셋 메모</label>
            <Textarea
              id="preset-memo"
              value={memo}
              maxLength={PRESET_MEMO_MAX}
              rows={3}
              onChange={(event) => setMemo(event.target.value)}
              onKeyDown={(event) => insertTabOnKeyDown(event, setMemo)}
              placeholder="공략 메모 (최대 300자)"
              className="whitespace-pre-wrap"
            />
          </div>

          <section aria-label="슬롯 배치" className="space-y-2">
            <h3 className="text-sm font-semibold text-content">
              슬롯 배치 <span className="font-normal text-content-secondary">({characterIds.length} / {maxSlots})</span>
            </h3>
            {overLimit && (
              <p role="status" className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
                관리자가 슬롯 상한을 {maxSlots}칸으로 줄였습니다. 인원을 상한 이하로 줄이기 전에는 캐릭터를 추가할 수 없습니다.
              </p>
            )}
            <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2" data-testid="preset-editor-slots">
              {Array.from({ length: slotCount }, (_, index) => {
                const characterId = characterIds[index]
                const character = characterId ? characterById.get(characterId) : undefined
                if (!characterId) {
                  return (
                    <li key={`empty-${index}`} className="flex h-16 items-center rounded-lg border border-dashed border-line px-3 text-xs text-content-muted">
                      {index + 1}. 빈 슬롯
                    </li>
                  )
                }
                const isOwned = states[characterId]?.is_owned ?? false
                return (
                  <li key={characterId} className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 p-2">
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
                    <span className="min-w-0 flex-1 truncate text-sm text-content">{character?.name ?? "알 수 없는 캐릭터"}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={index === 0}
                      aria-label={`${character?.name ?? "캐릭터"} 위로 이동`}
                      onClick={() => setCharacterIds((prev) => moveCharacterInPreset(prev, index, -1))}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={index === characterIds.length - 1}
                      aria-label={`${character?.name ?? "캐릭터"} 아래로 이동`}
                      onClick={() => setCharacterIds((prev) => moveCharacterInPreset(prev, index, 1))}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={`${character?.name ?? "캐릭터"} 제거`}
                      onClick={() => setCharacterIds((prev) => removeCharacterFromPreset(prev, characterId))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                )
              })}
            </ol>
          </section>

          <section aria-label="캐릭터 선택" className="space-y-3">
            <h3 className="text-sm font-semibold text-content">캐릭터 선택</h3>
            <CharacterFilterBar idPrefix="picker" characters={characters} schema={schema} filters={filters} onChange={setFilters} />
            {pickerCharacters.length === 0 ? (
              <p className="py-4 text-center text-sm text-content-secondary">조건에 맞는 캐릭터가 없습니다.</p>
            ) : (
              <ul className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4 md:grid-cols-5" data-testid="preset-picker-list">
                {pickerCharacters.map((character) => {
                  const selected = characterIds.includes(character.id)
                  const disabled = !selected && !canAdd
                  return (
                    <li key={character.id}>
                      <button
                        type="button"
                        aria-pressed={selected}
                        disabled={disabled}
                        title={disabled ? "슬롯이 가득 찼습니다." : undefined}
                        onClick={() => togglePicker(character.id)}
                        className={cn(
                          "flex w-full flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-50",
                          selected ? "border-primary bg-primary/10 text-content" : "border-line bg-surface-2 text-content-secondary hover:text-content",
                        )}
                      >
                        <CharacterIcon
                          name={character.name}
                          customIconUrl={customIconUrls[character.id]}
                          defaultIconUrl={character.default_icon_url}
                          dimmed={!(states[character.id]?.is_owned ?? false)}
                          favorite={states[character.id]?.is_favorite ?? false}
                          breakthroughLevel={states[character.id]?.is_owned ? (states[character.id]?.breakthrough_level ?? 0) : null}
                          className="h-12 w-12"
                        />
                        <span className="w-full truncate text-center">{character.name}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>취소</Button>
          <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
