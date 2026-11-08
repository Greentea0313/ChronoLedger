"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ImagePlus, Loader2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Textarea } from "@/components/ui/textarea"
import { insertTabOnKeyDown } from "@/lib/textarea-tab"
import { cn } from "@/lib/utils"
import {
  CHARACTER_MEMO_MAX,
  EMPTY_CHARACTER_FILTERS,
  filterCharacters,
  type CharacterFilters,
  type ClassificationSchema,
  type GameCharacter,
  type UserCharacterState,
} from "@/lib/character-utils"
import { CharacterFilterBar } from "./character-filter-bar"
import { CharacterIcon } from "./character-icon"

interface CharacterCardProps {
  character: GameCharacter
  schema: ClassificationSchema
  state: UserCharacterState | undefined
  customIconUrl: string | undefined
  isBusy: boolean
  onToggleOwned: (character: GameCharacter) => void
  onSaveMemo: (character: GameCharacter, memo: string | null) => void
  onChangeIcon: (character: GameCharacter, file: File) => void
  onRestoreIcon: (character: GameCharacter) => void
}

function CharacterCard({
  character,
  schema,
  state,
  customIconUrl,
  isBusy,
  onToggleOwned,
  onSaveMemo,
  onChangeIcon,
  onRestoreIcon,
}: CharacterCardProps) {
  const isOwned = state?.is_owned ?? false
  const savedMemo = state?.memo ?? ""
  const [memoDraft, setMemoDraft] = useState(savedMemo)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Follow the saved value after a successful save or an external reload.
  useEffect(() => {
    setMemoDraft(savedMemo)
  }, [savedMemo])

  const handleMemoBlur = () => {
    if (memoDraft === savedMemo) return
    onSaveMemo(character, memoDraft.trim() === "" ? null : memoDraft)
  }

  const attributeTags = schema.axes
    .map((axis) => ({ label: axis.label, value: character.attributes[axis.key] }))
    .filter((tag): tag is { label: string; value: string } => !!tag.value)

  return (
    <li
      data-testid="character-card"
      data-owned={isOwned ? "true" : "false"}
      className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-3"
    >
      <div className="flex items-start gap-3">
        <CharacterIcon
          name={character.name}
          customIconUrl={customIconUrl}
          defaultIconUrl={character.default_icon_url}
          dimmed={!isOwned}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-sm font-semibold text-content">{character.name}</p>
          <div className="flex flex-wrap gap-1">
            {character.rarity && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">{character.rarity}</span>
            )}
            {attributeTags.map((tag) => (
              <span key={tag.label} className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-content-secondary">
                {tag.label}: {tag.value}
              </span>
            ))}
          </div>
        </div>
        <label className="flex min-h-[44px] shrink-0 cursor-pointer items-center gap-2 text-xs text-content-secondary md:min-h-8">
          <input
            type="checkbox"
            role="switch"
            aria-label={`${character.name} 보유`}
            checked={isOwned}
            disabled={isBusy}
            onChange={() => onToggleOwned(character)}
            className="h-4 w-4 accent-primary"
          />
          보유
        </label>
      </div>

      {isOwned && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isBusy}
            onClick={() => fileInputRef.current?.click()}
            aria-label={`${character.name} 아이콘 변경`}
          >
            {isBusy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="mr-1 h-3.5 w-3.5" />}
            아이콘 변경
          </Button>
          {state?.custom_icon_path && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isBusy}
              onClick={() => onRestoreIcon(character)}
              aria-label={`${character.name} 기본 아이콘 복원`}
            >
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              기본 복원
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            aria-label={`${character.name} 아이콘 파일`}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ""
              if (file) onChangeIcon(character, file)
            }}
          />
        </div>
      )}

      <Textarea
        aria-label={`${character.name} 메모`}
        placeholder="캐릭터 메모 (예: 2돌 전무)"
        rows={1}
        maxLength={CHARACTER_MEMO_MAX}
        value={memoDraft}
        onChange={(event) => setMemoDraft(event.target.value)}
        onKeyDown={(event) => insertTabOnKeyDown(event, setMemoDraft)}
        onBlur={handleMemoBlur}
        className={cn("min-h-[40px] resize-none py-2 text-sm")}
      />
    </li>
  )
}

interface CharacterRosterProps {
  characters: GameCharacter[]
  schema: ClassificationSchema
  states: Record<string, UserCharacterState>
  customIconUrls: Record<string, string>
  busyIds: Record<string, boolean>
  isLoading: boolean
  onToggleOwned: (character: GameCharacter) => void
  onSaveMemo: (character: GameCharacter, memo: string | null) => void
  onChangeIcon: (character: GameCharacter, file: File) => void
  onRestoreIcon: (character: GameCharacter) => void
}

export function CharacterRoster({
  characters,
  schema,
  states,
  customIconUrls,
  busyIds,
  isLoading,
  onToggleOwned,
  onSaveMemo,
  onChangeIcon,
  onRestoreIcon,
}: CharacterRosterProps) {
  const [filters, setFilters] = useState<CharacterFilters>(EMPTY_CHARACTER_FILTERS)

  const visible = useMemo(
    () => filterCharacters(characters, filters, schema, (id) => states[id]?.is_owned ?? false),
    [characters, filters, schema, states],
  )

  return (
    <div className="space-y-4">
      <CharacterFilterBar idPrefix="roster" characters={characters} schema={schema} filters={filters} onChange={setFilters} />

      {isLoading ? (
        <p className="py-6 text-center text-sm text-content-secondary">캐릭터를 불러오는 중입니다...</p>
      ) : characters.length === 0 ? (
        <EmptyState
          message="등록된 캐릭터가 없습니다."
          hint="[+ 캐릭터 추가·수정 요청]으로 관리자에게 캐릭터 등록을 요청할 수 있습니다."
        />
      ) : visible.length === 0 ? (
        <EmptyState message="조건에 맞는 캐릭터가 없습니다." />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3" data-testid="character-roster-list">
          {visible.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              schema={schema}
              state={states[character.id]}
              customIconUrl={customIconUrls[character.id]}
              isBusy={!!busyIds[character.id]}
              onToggleOwned={onToggleOwned}
              onSaveMemo={onSaveMemo}
              onChangeIcon={onChangeIcon}
              onRestoreIcon={onRestoreIcon}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
