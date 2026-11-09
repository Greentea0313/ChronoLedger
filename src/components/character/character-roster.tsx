"use client"

import { useMemo, useRef, useState } from "react"
import { ImagePlus, Loader2, RotateCcw, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"
import {
  EMPTY_CHARACTER_FILTERS,
  filterCharacters,
  sortCharactersFavoriteFirst,
  type CharacterFilters,
  type ClassificationSchema,
  type GameCharacter,
  type UserCharacterState,
} from "@/lib/character-utils"
import { CharacterFilterBar } from "./character-filter-bar"
import { CharacterIcon } from "./character-icon"

interface CharacterSettingsDialogProps {
  character: GameCharacter | null
  schema: ClassificationSchema
  state: UserCharacterState | undefined
  customIconUrl: string | undefined
  maxBreakthrough: number
  isBusy: boolean
  onClose: () => void
  onToggleOwned: (character: GameCharacter) => void
  onToggleFavorite: (character: GameCharacter) => void
  onSetBreakthrough: (character: GameCharacter, level: number) => void
  onChangeIcon: (character: GameCharacter, file: File) => void
  onRestoreIcon: (character: GameCharacter) => void
}

function CharacterSettingsDialog({
  character,
  schema,
  state,
  customIconUrl,
  maxBreakthrough,
  isBusy,
  onClose,
  onToggleOwned,
  onToggleFavorite,
  onSetBreakthrough,
  onChangeIcon,
  onRestoreIcon,
}: CharacterSettingsDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isOwned = state?.is_owned ?? false
  const isFavorite = state?.is_favorite ?? false
  const level = state?.breakthrough_level ?? 0

  const description = character
    ? [
        character.rarity,
        ...schema.axes.map((axis) => (character.attributes[axis.key] ? `${axis.label}: ${character.attributes[axis.key]}` : null)),
      ]
        .filter(Boolean)
        .join(" · ")
    : ""

  return (
    <Dialog open={!!character} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {character && (
          <>
            <DialogHeader>
              <DialogTitle>{character.name}</DialogTitle>
              <DialogDescription>{description || "보유 여부, 즐겨찾기, 돌파 단계를 설정합니다."}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <CharacterIcon
                  name={character.name}
                  customIconUrl={customIconUrl}
                  defaultIconUrl={character.default_icon_url}
                  dimmed={!isOwned}
                  favorite={isFavorite}
                  breakthroughLevel={isOwned ? level : null}
                  className="h-16 w-16"
                />
                <div className="flex flex-col gap-2">
                  <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-content md:min-h-8">
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-pressed={isFavorite}
                    aria-label={`${character.name} 즐겨찾기`}
                    disabled={isBusy}
                    onClick={() => onToggleFavorite(character)}
                  >
                    <Star className={cn("mr-1 h-3.5 w-3.5", isFavorite && "fill-amber-400 text-amber-400")} />
                    즐겨찾기
                  </Button>
                </div>
              </div>

              {isOwned && (
                <section aria-label="돌파 단계" className="space-y-2">
                  <h3 className="text-sm font-semibold text-content">돌파 단계</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: maxBreakthrough + 1 }, (_, value) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={level === value}
                        aria-label={`돌파 ${value}★`}
                        disabled={isBusy}
                        onClick={() => onSetBreakthrough(character, value)}
                        className={cn(
                          "min-h-8 min-w-10 rounded-md border px-2 text-sm transition-colors duration-fast",
                          level === value ? "border-primary bg-primary/15 text-primary" : "border-line bg-surface-2 text-content-secondary hover:text-content",
                        )}
                      >
                        {value}★
                      </button>
                    ))}
                  </div>
                </section>
              )}

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
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

interface CharacterRosterProps {
  characters: GameCharacter[]
  schema: ClassificationSchema
  states: Record<string, UserCharacterState>
  customIconUrls: Record<string, string>
  busyIds: Record<string, boolean>
  maxBreakthrough: number
  isLoading: boolean
  onToggleOwned: (character: GameCharacter) => void
  onToggleFavorite: (character: GameCharacter) => void
  onSetBreakthrough: (character: GameCharacter, level: number) => void
  onChangeIcon: (character: GameCharacter, file: File) => void
  onRestoreIcon: (character: GameCharacter) => void
}

export function CharacterRoster({
  characters,
  schema,
  states,
  customIconUrls,
  busyIds,
  maxBreakthrough,
  isLoading,
  onToggleOwned,
  onToggleFavorite,
  onSetBreakthrough,
  onChangeIcon,
  onRestoreIcon,
}: CharacterRosterProps) {
  const [filters, setFilters] = useState<CharacterFilters>(EMPTY_CHARACTER_FILTERS)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const visible = useMemo(
    () =>
      sortCharactersFavoriteFirst(
        filterCharacters(characters, filters, schema, (id) => states[id]?.is_owned ?? false),
        (id) => states[id]?.is_favorite ?? false,
      ),
    [characters, filters, schema, states],
  )
  const selected = useMemo(() => characters.find((character) => character.id === selectedId) ?? null, [characters, selectedId])

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
        <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8" data-testid="character-roster-list">
          {visible.map((character) => {
            const state = states[character.id]
            const isOwned = state?.is_owned ?? false
            return (
              <li key={character.id} data-testid="character-card" data-owned={isOwned ? "true" : "false"}>
                <button
                  type="button"
                  aria-label={`${character.name} 설정`}
                  onClick={() => setSelectedId(character.id)}
                  className="flex w-full flex-col items-center gap-1 rounded-lg p-1 transition-colors duration-fast hover:bg-surface-2"
                >
                  <CharacterIcon
                    name={character.name}
                    customIconUrl={customIconUrls[character.id]}
                    defaultIconUrl={character.default_icon_url}
                    dimmed={!isOwned}
                    favorite={state?.is_favorite ?? false}
                    breakthroughLevel={isOwned ? (state?.breakthrough_level ?? 0) : null}
                    className="h-14 w-14"
                  />
                  <span className="w-full truncate text-center text-xs text-content">{character.name}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <CharacterSettingsDialog
        character={selected}
        schema={schema}
        state={selected ? states[selected.id] : undefined}
        customIconUrl={selected ? customIconUrls[selected.id] : undefined}
        maxBreakthrough={maxBreakthrough}
        isBusy={selected ? !!busyIds[selected.id] : false}
        onClose={() => setSelectedId(null)}
        onToggleOwned={onToggleOwned}
        onToggleFavorite={onToggleFavorite}
        onSetBreakthrough={onSetBreakthrough}
        onChangeIcon={onChangeIcon}
        onRestoreIcon={onRestoreIcon}
      />
    </div>
  )
}
