"use client"

import { useMemo, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react"
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
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
import { useBoardSensors } from "@/lib/use-board-sensors"
import {
  CHARACTER_SECTIONS,
  EMPTY_CHARACTER_FILTERS,
  buildCharacterSections,
  filterCharacters,
  moveFavoriteCharacter,
  type CharacterFilters,
  type ClassificationSchema,
  type GameCharacter,
  type UserCharacterState,
} from "@/lib/character-utils"
import { CharacterFilterBar } from "./character-filter-bar"
import { CharacterIcon } from "./character-icon"
import { ClassificationOptionIcon, type ClassificationIconMap } from "./classification-option-icon"

/** Drag props spread on the favorite card's settings button (mouse, touch and keyboard drag start there). */
type FavoriteDragProps = ButtonHTMLAttributes<HTMLButtonElement>

/**
 * A favorite card: the whole card (its settings button) is the drag source (R76 §7, no handle, no move buttons).
 * Keyboard: Space picks up, arrows move, Space drops, Escape cancels; Enter opens the settings dialog.
 */
function SortableFavorite({
  id,
  disabled,
  owned,
  children,
}: {
  id: string
  disabled: boolean
  owned: boolean
  children: (dragProps: FavoriteDragProps) => ReactNode
}) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging, isOver } = useSortable({ id, disabled })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-testid="character-card"
      data-owned={owned ? "true" : "false"}
      data-sortable={disabled ? "false" : "true"}
      className={cn(
        "relative touch-manipulation select-none rounded-lg [-webkit-touch-callout:none]",
        !disabled && "cursor-grab active:cursor-grabbing",
        isDragging && "z-10 opacity-60",
        isOver && !isDragging && "bg-primary/10",
      )}
    >
      {children(disabled ? {} : ({ ...attributes, ...listeners } as FavoriteDragProps))}
    </li>
  )
}

/** Favorite section only: a sortable grid; other sections render their list unchanged. */
function SortableWrapper({
  enabled,
  sensors,
  ids,
  onDragStart,
  onDragEnd,
  children,
}: {
  enabled: boolean
  sensors: ReturnType<typeof useBoardSensors>
  ids: string[]
  onDragStart: () => void
  onDragEnd: (event: DragEndEvent | null) => void
  children: ReactNode
}) {
  if (!enabled) return <>{children}</>
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => onDragEnd(null)}
      accessibility={{
        screenReaderInstructions: { draggable: "스페이스로 집고 방향키로 옮긴 뒤 스페이스로 놓습니다. Esc로 취소합니다. Enter로 설정을 엽니다." },
      }}
    >
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  )
}

interface CharacterSettingsDialogProps {
  character: GameCharacter | null
  schema: ClassificationSchema
  state: UserCharacterState | undefined
  customIconUrl: string | undefined
  maxBreakthrough: number
  isBusy: boolean
  classificationIcons?: ClassificationIconMap
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
  classificationIcons,
  onClose,
  onToggleOwned,
  onToggleFavorite,
  onSetBreakthrough,
  onChangeIcon,
  onRestoreIcon,
}: CharacterSettingsDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isOwned = state?.is_owned ?? false
  // Only owned characters can be favorites (R63); a stale unowned favorite is shown as not favorite.
  const isFavorite = isOwned && (state?.is_favorite ?? false)
  const level = state?.breakthrough_level ?? 0

  // Rarity stays text-only; each axis value is preceded by its option icon when one exists (R64).
  const descriptionParts: React.ReactNode[] = character
    ? [
        character.rarity ? <span key="rarity">{character.rarity}</span> : null,
        ...schema.axes.map((axis) => {
          const value = character.attributes[axis.key]
          if (!value) return null
          return (
            <span key={axis.key} className="inline-flex items-center gap-1 align-middle">
              {`${axis.label}: `}
              <ClassificationOptionIcon icons={classificationIcons} axisKey={axis.key} option={value} />
              {value}
            </span>
          )
        }),
      ].filter(Boolean)
    : []
  const description = descriptionParts.length
    ? descriptionParts.map((part, index) => (
        <span key={index}>
          {index > 0 && " · "}
          {part}
        </span>
      ))
    : null

  return (
    <Dialog open={!!character} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {character && (
          <>
            <DialogHeader>
              <DialogTitle>{character.name}</DialogTitle>
              <DialogDescription>{description ?? "보유 여부, 즐겨찾기, 돌파 단계를 설정합니다."}</DialogDescription>
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
                    disabled={isBusy || !isOwned}
                    title={isOwned ? undefined : "보유 중인 캐릭터만 즐겨찾기할 수 있습니다."}
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
  /** False when the favorite-order migration/RPC is not applied: ordering controls are hidden. */
  favoriteOrderSupported?: boolean
  /** True while a reorder is being saved; ordering controls are locked. */
  isReordering?: boolean
  /** Classification option icons of the game (R64); empty/undefined renders text only. */
  classificationIcons?: ClassificationIconMap
  /** Receives the complete new favorite order (all favorites of the game). */
  onReorderFavorites?: (orderedIds: string[]) => void
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
  favoriteOrderSupported = true,
  isReordering = false,
  classificationIcons,
  onReorderFavorites,
  onToggleOwned,
  onToggleFavorite,
  onSetBreakthrough,
  onChangeIcon,
  onRestoreIcon,
}: CharacterRosterProps) {
  const [filters, setFilters] = useState<CharacterFilters>(EMPTY_CHARACTER_FILTERS)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const sensors = useBoardSensors()
  // A click that ends a drag (mouse up, or the keyup after a Space pick-up/drop) must not open the settings dialog.
  const draggingRef = useRef(false)
  const lastDragEndRef = useRef(0)

  const sections = useMemo(
    () => buildCharacterSections(filterCharacters(characters, filters, schema, (id) => states[id]?.is_owned ?? false), states),
    [characters, filters, schema, states],
  )
  const visibleCount = sections.favorites.length + sections.owned.length + sections.unowned.length
  // Reordering works on the complete favorite order even while filters hide some favorites.
  const allFavoriteIds = useMemo(() => buildCharacterSections(characters, states).favorites.map((character) => character.id), [characters, states])
  const canReorder = favoriteOrderSupported && !!onReorderFavorites && !isReordering
  const showOrderUnavailable = !favoriteOrderSupported && allFavoriteIds.length > 1

  const moveFavorite = (characterId: string, targetId: string) => {
    const from = allFavoriteIds.indexOf(characterId)
    const to = allFavoriteIds.indexOf(targetId)
    if (!canReorder || from < 0 || to < 0 || from === to) return
    onReorderFavorites?.(moveFavoriteCharacter(allFavoriteIds, from, to))
  }
  const handleFavoriteDragStart = () => {
    draggingRef.current = true
  }
  const handleFavoriteDragEnd = (event: DragEndEvent | null) => {
    draggingRef.current = false
    lastDragEndRef.current = Date.now()
    if (event?.over) moveFavorite(String(event.active.id), String(event.over.id))
  }
  const openSettings = (characterId: string) => {
    if (draggingRef.current || Date.now() - lastDragEndRef.current < 300) return
    setSelectedId(characterId)
  }
  const selected = useMemo(() => characters.find((character) => character.id === selectedId) ?? null, [characters, selectedId])

  return (
    <div className="space-y-4">
      <CharacterFilterBar
        idPrefix="roster"
        characters={characters}
        schema={schema}
        filters={filters}
        onChange={setFilters}
        classificationIcons={classificationIcons}
      />

      {isLoading ? (
        <p className="py-6 text-center text-sm text-content-secondary">캐릭터를 불러오는 중입니다...</p>
      ) : characters.length === 0 ? (
        <EmptyState
          message="등록된 캐릭터가 없습니다."
          hint="[+ 캐릭터 추가·수정 요청]으로 관리자에게 캐릭터 등록을 요청할 수 있습니다."
        />
      ) : visibleCount === 0 ? (
        <EmptyState message="조건에 맞는 캐릭터가 없습니다." />
      ) : (
        <div className="space-y-5" data-testid="character-roster-sections">
          {showOrderUnavailable && (
            <p role="status" className="text-xs text-content-secondary">
              즐겨찾기 순서 저장 기능이 아직 적용되지 않아 순서를 변경할 수 없습니다. (이름순으로 표시됩니다.)
            </p>
          )}
          {CHARACTER_SECTIONS.map(({ key, label }) => {
            const items = sections[key]
            if (items.length === 0) return null
            const reorderable = key === "favorites" && favoriteOrderSupported && !!onReorderFavorites
            return (
              <section key={key} aria-label={label} data-testid={`roster-section-${key}`} className="space-y-2">
                <h3 className="text-sm font-semibold text-content">
                  {label} <span className="font-normal text-content-secondary">({items.length})</span>
                </h3>
                <SortableWrapper
                  enabled={reorderable}
                  sensors={sensors}
                  ids={items.map((character) => character.id)}
                  onDragStart={handleFavoriteDragStart}
                  onDragEnd={handleFavoriteDragEnd}
                >
                <ul
                  className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8"
                  data-testid={`roster-list-${key}`}
                >
                  {items.map((character) => {
                    const state = states[character.id]
                    const isOwned = state?.is_owned ?? false
                    const renderCard = (dragProps: FavoriteDragProps = {}) => (
                      <button
                        type="button"
                        {...dragProps}
                        aria-label={`${character.name} 설정`}
                        onClick={() => openSettings(character.id)}
                        className="flex w-full flex-col items-center gap-1 rounded-lg p-1 outline-none transition-colors duration-fast hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-primary [&_img]:pointer-events-none"
                      >
                        <CharacterIcon
                          name={character.name}
                          customIconUrl={customIconUrls[character.id]}
                          defaultIconUrl={character.default_icon_url}
                          dimmed={!isOwned}
                          favorite={isOwned && (state?.is_favorite ?? false)}
                          breakthroughLevel={isOwned ? (state?.breakthrough_level ?? 0) : null}
                          className="h-14 w-14"
                        />
                        <span className="w-full truncate text-center text-xs text-content">{character.name}</span>
                      </button>
                    )
                    return reorderable ? (
                      <SortableFavorite key={character.id} id={character.id} disabled={!canReorder} owned={isOwned}>
                        {renderCard}
                      </SortableFavorite>
                    ) : (
                      <li key={character.id} data-testid="character-card" data-owned={isOwned ? "true" : "false"} className="relative rounded-lg">
                        {renderCard()}
                      </li>
                    )
                  })}
                </ul>
                </SortableWrapper>
              </section>
            )
          })}
        </div>
      )}

      <CharacterSettingsDialog
        character={selected}
        schema={schema}
        state={selected ? states[selected.id] : undefined}
        customIconUrl={selected ? customIconUrls[selected.id] : undefined}
        maxBreakthrough={maxBreakthrough}
        isBusy={selected ? !!busyIds[selected.id] : false}
        classificationIcons={classificationIcons}
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
