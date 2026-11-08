"use client"

import { Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import {
  getPresetSlotCount,
  isPresetOverLimit,
  type GameCharacter,
  type UserCharacterState,
} from "@/lib/character-utils"
import { CharacterIcon } from "./character-icon"

export interface PresetRow {
  id: string
  game_id: string
  title: string
  character_ids: string[]
  memo: string | null
  sort_order: number
  created_at: string
}

interface PresetListProps {
  presets: PresetRow[]
  maxSlots: number
  characters: GameCharacter[]
  states: Record<string, UserCharacterState>
  customIconUrls: Record<string, string>
  isBusy: boolean
  onAdd: () => void
  onEdit: (preset: PresetRow) => void
  onDelete: (preset: PresetRow) => void
}

export function PresetList({
  presets,
  maxSlots,
  characters,
  states,
  customIconUrls,
  isBusy,
  onAdd,
  onEdit,
  onDelete,
}: PresetListProps) {
  const characterById = new Map<string, GameCharacter>()
  characters.forEach((character) => characterById.set(character.id, character))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-content-secondary">슬롯은 최대 {maxSlots}칸입니다. 미보유 캐릭터도 배치할 수 있습니다.</p>
        <Button type="button" onClick={onAdd} disabled={isBusy}>
          <Plus className="mr-1 h-4 w-4" />
          새 프리셋 추가
        </Button>
      </div>

      {presets.length === 0 ? (
        <EmptyState message="저장된 프리셋이 없습니다." hint="[+ 새 프리셋 추가]로 파티 조합을 저장해 보세요." />
      ) : (
        <ul className="space-y-3" data-testid="preset-list">
          {presets.map((preset) => {
            const slotCount = getPresetSlotCount(maxSlots, preset.character_ids)
            const overLimit = isPresetOverLimit(maxSlots, preset.character_ids)
            return (
              <li key={preset.id} data-testid="preset-card" className="space-y-3 rounded-lg border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 break-words text-base font-semibold text-content">{preset.title}</h3>
                  <div className="flex shrink-0 gap-1">
                    <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={() => onEdit(preset)} aria-label={`${preset.title} 수정`}>
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      수정
                    </Button>
                    <Button type="button" variant="ghost" size="sm" disabled={isBusy} onClick={() => onDelete(preset)} aria-label={`${preset.title} 삭제`}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      삭제
                    </Button>
                  </div>
                </div>

                {overLimit && (
                  <p role="status" className="text-xs text-warning">
                    슬롯 상한({maxSlots}칸)을 초과한 프리셋입니다. 인원을 줄이기 전에는 캐릭터를 추가할 수 없습니다.
                  </p>
                )}

                <ol className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6" data-testid="preset-slot-grid">
                  {Array.from({ length: slotCount }, (_, index) => {
                    const characterId = preset.character_ids[index]
                    const character = characterId ? characterById.get(characterId) : undefined
                    if (!characterId) {
                      return (
                        <li key={`empty-${index}`} data-testid="preset-slot-empty" className="flex h-[88px] items-center justify-center rounded-lg border border-dashed border-line text-xs text-content-muted">
                          {index + 1}
                        </li>
                      )
                    }
                    const isOwned = states[characterId]?.is_owned ?? false
                    return (
                      <li
                        key={characterId}
                        data-testid="preset-slot"
                        data-owned={isOwned ? "true" : "false"}
                        className={`flex flex-col items-center gap-1 rounded-lg border p-2 ${isOwned ? "border-primary/60" : "border-line"}`}
                      >
                        <CharacterIcon
                          name={character?.name ?? "?"}
                          customIconUrl={customIconUrls[characterId]}
                          defaultIconUrl={character?.default_icon_url}
                          dimmed={!isOwned}
                          className="h-12 w-12"
                        />
                        <span className="w-full truncate text-center text-xs text-content">{character?.name ?? "알 수 없음"}</span>
                      </li>
                    )
                  })}
                </ol>

                {preset.memo && <p className="whitespace-pre-wrap text-sm text-content-secondary">{preset.memo}</p>}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
