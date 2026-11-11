"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  useDraggable,
  useDroppable,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable"
import { Check, Loader2, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  CHARACTER_SECTIONS,
  EMPTY_CHARACTER_FILTERS,
  buildCharacterSections,
  filterCharacters,
  type CharacterFilters,
  type ClassificationSchema,
  type GameCharacter,
  type UserCharacterState,
} from "@/lib/character-utils"
import {
  NOOP_DROP_ID,
  SIDEBAR_DROP_ID,
  addCharacter,
  cardId,
  moveCard,
  parseBoardId,
  removeCharacter,
  resolveDrop,
  sideId,
  sortPresets,
  type BoardPreset,
  type DropResult,
} from "@/lib/preset-board"
import { useBoardSensors } from "@/lib/use-board-sensors"
import { useMediaQuery } from "@/lib/use-media-query"
import type { usePresetBoard } from "@/lib/use-preset-board"
import { CharacterFilterBar } from "./character-filter-bar"
import { CharacterIcon } from "./character-icon"
import { PresetBoardCard } from "./preset-board-card"
import { PresetCharacterPicker } from "./preset-character-picker"

type Board = ReturnType<typeof usePresetBoard>

interface PresetBoardProps {
  gameId: string
  presets: BoardPreset[]
  maxSlots: number
  characters: GameCharacter[]
  schema: ClassificationSchema
  states: Record<string, UserCharacterState>
  customIconUrls: Record<string, string>
  board: Board
  onError: (message: string) => void
}

/** Drops on slots/empty cells win over the sidebar, which wins over the card area (spec §3.1). */
const DROP_RANK: Record<string, number> = { slot: 0, empty: 0, sidebar: 1, noop: 1, card: 2 }

const collisionDetection: CollisionDetection = (args) => {
  const activeType = parseBoardId(args.active.id)?.type
  const containers = args.droppableContainers.filter((container) => {
    const type = parseBoardId(container.id)?.type
    return activeType === "card" ? type === "card" : type !== undefined && type !== "side"
  })
  const scoped = { ...args, droppableContainers: containers }
  const within = pointerWithin(scoped)
  if (within.length > 0) {
    return [...within].sort((a, b) => (DROP_RANK[parseBoardId(a.id)?.type ?? "card"] ?? 3) - (DROP_RANK[parseBoardId(b.id)?.type ?? "card"] ?? 3))
  }
  // Keyboard drags have no pointer; a pointer outside every droppable means "no target" (remove for slots).
  return args.pointerCoordinates ? [] : closestCenter(scoped)
}

function SidebarAvatar({
  character,
  state,
  customIconUrl,
  placed,
  onAdd,
}: {
  character: GameCharacter
  state: UserCharacterState | undefined
  customIconUrl: string | undefined
  placed: boolean
  onAdd: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: sideId(character.id) })
  const owned = state?.is_owned ?? false
  return (
    <li data-testid="board-sidebar-avatar" data-character-id={character.id}>
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`${character.name}${placed ? ", 편성됨" : ""}`}
        onClick={onAdd}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            onAdd()
          }
        }}
        className={cn(
          "relative flex cursor-grab touch-manipulation select-none flex-col items-center gap-1 rounded-lg p-1 text-[11px] text-content-secondary outline-none [-webkit-touch-callout:none] hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-primary active:cursor-grabbing [&_img]:pointer-events-none",
          isDragging && "opacity-40",
        )}
      >
        <CharacterIcon
          name={character.name}
          customIconUrl={customIconUrl}
          defaultIconUrl={character.default_icon_url}
          dimmed={!owned}
          favorite={owned && (state?.is_favorite ?? false)}
          breakthroughLevel={owned ? (state?.breakthrough_level ?? 0) : null}
          className="h-12 w-12"
        />
        {placed && (
          <span aria-hidden="true" data-testid="placed-badge" className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-3 w-3" />
          </span>
        )}
        <span className="w-full truncate text-center">{character.name}</span>
      </div>
    </li>
  )
}

/** The [+ 프리셋 추가] cell is a drop zone that only cancels, so a slot dropped there is not removed. */
function AddPresetCell({ children }: { children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: NOOP_DROP_ID })
  return <li ref={setNodeRef}>{children}</li>
}

function Sidebar({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: SIDEBAR_DROP_ID })
  return (
    <aside
      ref={setNodeRef}
      aria-label="캐릭터 사이드바"
      data-board-sidebar
      className={cn(
        "sticky top-4 flex max-h-[calc(100dvh-2rem)] min-h-0 touch-pan-y flex-col gap-3 overflow-y-auto rounded-lg border border-line bg-surface p-3",
        isOver && "border-danger/60 bg-danger/5",
      )}
    >
      {children}
    </aside>
  )
}

/**
 * R76 preset card grid: every preset of the game is edited in place and saved immediately (spec §2–§6).
 * Desktop (>= 900px) drags from a character sidebar; mobile fills empty slots from a bottom picker.
 */
export function PresetBoard({ gameId, presets, maxSlots, characters, schema, states, customIconUrls, board, onError }: PresetBoardProps) {
  const isDesktop = useMediaQuery("(min-width: 900px)")
  const sensors = useBoardSensors()
  const [filters, setFilters] = useState<CharacterFilters>(EMPTY_CHARACTER_FILTERS)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dragId, setDragId] = useState<UniqueIdentifier | null>(null)
  const [pickerPresetId, setPickerPresetId] = useState<string | null>(null)
  // The drag preview is portaled to <body>: a transformed ancestor (the page's animate-fade-in keeps
  // transform after the animation) would otherwise become the containing block of its position: fixed.
  const [portalReady, setPortalReady] = useState(false)
  useEffect(() => setPortalReady(true), [])
  // A click that ends a mouse drag must not also add/open anything.
  const lastDragEndRef = useRef(0)

  const sorted = useMemo(() => sortPresets(presets), [presets])
  const characterById = useMemo(() => new Map(characters.map((character) => [character.id, character])), [characters])
  const placedIds = useMemo(() => new Set(presets.flatMap((preset) => preset.character_ids)), [presets])
  const sections = useMemo(
    () => buildCharacterSections(filterCharacters(characters, filters, schema, (id) => states[id]?.is_owned ?? false), states, schema),
    [characters, filters, schema, states],
  )
  const activePreset = sorted.find((preset) => preset.id === activeId) ?? sorted[0] ?? null
  const pickerPreset = sorted.find((preset) => preset.id === pickerPresetId) ?? null
  const nameOf = (id: string) => characterById.get(id)?.name ?? "캐릭터"
  const titleOf = (id: string) => presets.find((preset) => preset.id === id)?.title ?? "프리셋"

  const apply = (result: DropResult) => {
    if (result.kind === "reject") onError(result.message)
    else if (result.kind === "slots") {
      if (board.applySlots(result.changes)) setActiveId(result.activePresetId)
    } else if (result.kind === "cards") board.reorderCards(gameId, result.presetIds)
  }

  const recentlyDragged = () => Date.now() - lastDragEndRef.current < 300

  const addToActive = (characterId: string) => {
    if (recentlyDragged()) return
    if (!activePreset) {
      onError("먼저 [+ 프리셋 추가]로 프리셋을 만들어 주세요.")
      return
    }
    apply(addCharacter(activePreset, characterId, maxSlots))
  }

  const handleDragStart = ({ active }: DragStartEvent) => setDragId(active.id)
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setDragId(null)
    lastDragEndRef.current = Date.now()
    apply(resolveDrop(active.id, over?.id, presets, maxSlots))
  }
  const handleDragCancel = () => {
    setDragId(null)
    lastDragEndRef.current = Date.now()
  }

  const handleEmptySlot = (preset: BoardPreset) => {
    setActiveId(preset.id)
    if (!isDesktop) {
      setPickerPresetId(preset.id)
      return
    }
    document.querySelector<HTMLInputElement>("[data-board-sidebar] input[type='search']")?.focus()
  }

  const handleCreate = async () => {
    const id = await board.createPreset(gameId)
    if (id) setActiveId(id)
  }

  const handleDelete = (preset: BoardPreset) => {
    if (!confirm(`'${preset.title}' 프리셋을 삭제하시겠습니까?`)) return
    board.deletePreset(preset.id)
  }

  const describe = (id: UniqueIdentifier | null | undefined) => {
    const parsed = parseBoardId(id)
    if (!parsed) return "빈 곳"
    if (parsed.type === "side" || parsed.type === "slot") return `'${nameOf(parsed.characterId)}'`
    if (parsed.type === "card" || parsed.type === "empty") return `'${titleOf(parsed.presetId)}'`
    return "사이드바"
  }
  const announcements: Announcements = {
    onDragStart: ({ active }) => `${describe(active.id)} 끌기 시작`,
    onDragOver: ({ active, over }) => `${describe(active.id)}을(를) ${describe(over?.id)} 위로 옮김`,
    onDragEnd: ({ active, over }) => `${describe(active.id)}을(를) ${describe(over?.id)}에 놓음`,
    onDragCancel: ({ active }) => `${describe(active.id)} 끌기 취소됨`,
  }

  const dragged = parseBoardId(dragId)
  const overlay =
    dragged && (dragged.type === "side" || dragged.type === "slot") ? (
      // Same box as the source avatar (icon centered above the name) so the preview sits under the pointer.
      <div className="flex cursor-grabbing flex-col items-center gap-1 p-1 text-[11px] text-content" data-testid="board-drag-overlay">
        <CharacterIcon
          name={nameOf(dragged.characterId)}
          customIconUrl={customIconUrls[dragged.characterId]}
          defaultIconUrl={characterById.get(dragged.characterId)?.default_icon_url}
          className="h-12 w-12 shadow-lg"
        />
        <span className="w-full truncate text-center">{nameOf(dragged.characterId)}</span>
      </div>
    ) : dragged?.type === "card" ? (
      <div className="w-56 rounded-lg border border-primary bg-surface p-3 text-sm font-semibold text-content shadow-lg">{titleOf(dragged.presetId)}</div>
    ) : null

  const grid = (
    <section aria-label="조합 프리셋" className="min-w-0 space-y-3" aria-busy={board.isReloading || undefined}>
      <p className="text-xs text-content-secondary">
        {isDesktop
          ? `캐릭터를 카드로 끌어다 놓거나 눌러서 선택된 프리셋에 추가합니다. 슬롯은 최대 ${maxSlots}칸이며 변경은 바로 저장됩니다.`
          : `빈 슬롯(+)을 눌러 캐릭터를 추가하고, 길게 눌러 순서를 바꾸거나 다른 프리셋으로 옮깁니다. 변경은 바로 저장됩니다.`}
      </p>
      <SortableContext items={sorted.map((preset) => cardId(preset.id))} strategy={rectSortingStrategy}>
        <ul className="grid grid-cols-1 gap-3 min-[600px]:grid-cols-2 lg:grid-cols-3" data-testid="preset-board">
          {sorted.map((preset, index) => (
            <PresetBoardCard
              key={preset.id}
              preset={preset}
              index={index}
              count={sorted.length}
              maxSlots={maxSlots}
              characterById={characterById}
              states={states}
              customIconUrls={customIconUrls}
              isActive={activePreset?.id === preset.id}
              isPending={board.pendingIds.has(preset.id)}
              onActivate={() => setActiveId(preset.id)}
              onRemove={(characterId) => apply(removeCharacter(preset, characterId))}
              onEmptySlot={() => handleEmptySlot(preset)}
              onMove={(offset) => apply(moveCard(presets, preset.id, offset))}
              onDelete={() => handleDelete(preset)}
              onRename={(title) => board.updateText(preset.id, { title })}
              onMemo={(memo) => board.updateText(preset.id, { memo })}
            />
          ))}
          <AddPresetCell>
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={board.isCreating || board.isReloading}
              className="flex h-full min-h-[10rem] w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line text-sm text-content-secondary transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
            >
              {board.isCreating ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Plus className="h-5 w-5" aria-hidden="true" />}
              프리셋 추가
            </button>
          </AddPresetCell>
        </ul>
      </SortableContext>
    </section>
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable: "스페이스로 집고 방향키로 옮긴 뒤 스페이스로 놓습니다. Esc로 취소합니다. 캐릭터는 Enter로 선택된 프리셋에 추가합니다.",
        },
      }}
    >
      {isDesktop ? (
        <div className="grid grid-cols-[240px_minmax(0,1fr)] items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]" data-testid="preset-board-layout">
          <Sidebar>
            <h3 className="text-sm font-semibold text-content">캐릭터</h3>
            <CharacterFilterBar idPrefix="board" stacked characters={characters} schema={schema} filters={filters} onChange={setFilters} />
            {CHARACTER_SECTIONS.map(({ key, label }) => {
              const items = sections[key]
              if (items.length === 0) return null
              return (
                <section key={key} aria-label={`${label} 캐릭터`} className="space-y-1.5" data-testid={`board-avatars-${key}`}>
                  <h4 className="text-xs font-semibold text-content-secondary">
                    {label} ({items.length})
                  </h4>
                  <ul className="grid grid-cols-3 gap-1.5 lg:grid-cols-4">
                    {items.map((character) => (
                      <SidebarAvatar
                        key={character.id}
                        character={character}
                        state={states[character.id]}
                        customIconUrl={customIconUrls[character.id]}
                        placed={placedIds.has(character.id)}
                        onAdd={() => addToActive(character.id)}
                      />
                    ))}
                  </ul>
                </section>
              )
            })}
          </Sidebar>
          {grid}
        </div>
      ) : (
        grid
      )}
      {portalReady && createPortal(<DragOverlay>{overlay}</DragOverlay>, document.body)}
      <PresetCharacterPicker
        preset={isDesktop ? null : pickerPreset}
        maxSlots={maxSlots}
        characters={characters}
        schema={schema}
        states={states}
        customIconUrls={customIconUrls}
        onPick={(characterId) => pickerPreset && apply(addCharacter(pickerPreset, characterId, maxSlots))}
        onClose={() => setPickerPresetId(null)}
      />
    </DndContext>
  )
}
