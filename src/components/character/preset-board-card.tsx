"use client"

import { useState, type CSSProperties } from "react"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ArrowLeft, ArrowRight, Loader2, Plus, Trash2, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { insertTabOnKeyDown } from "@/lib/textarea-tab"
import { cn } from "@/lib/utils"
import { PRESET_MEMO_MAX, PRESET_TITLE_MAX, type GameCharacter, type UserCharacterState } from "@/lib/character-utils"
import { cardId, emptyId, slotId, type BoardPreset } from "@/lib/preset-board"
import { CharacterIcon } from "./character-icon"

export interface PresetBoardCardProps {
  preset: BoardPreset
  index: number
  count: number
  maxSlots: number
  characterById: ReadonlyMap<string, GameCharacter>
  states: Record<string, UserCharacterState>
  customIconUrls: Record<string, string>
  isActive: boolean
  isPending: boolean
  onActivate: () => void
  onRemove: (characterId: string) => void
  onEmptySlot: () => void
  onMove: (offset: -1 | 1) => void
  onDelete: () => void
  onRename: (title: string) => void
  onMemo: (memo: string | null) => void
}

/** A slot avatar: the whole avatar is the drag source (no handle); `X` removes it. */
function SlotAvatar({
  presetId,
  characterId,
  character,
  state,
  customIconUrl,
  overLimit,
  onRemove,
}: {
  presetId: string
  characterId: string
  character: GameCharacter | undefined
  state: UserCharacterState | undefined
  customIconUrl: string | undefined
  overLimit: boolean
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id: slotId(presetId, characterId) })
  const name = character?.name ?? "알 수 없는 캐릭터"
  const owned = state?.is_owned ?? false
  const style: CSSProperties = { transform: CSS.Transform.toString(transform), transition }
  return (
    <li className="group relative" data-testid="preset-slot" data-character-id={characterId}>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        aria-label={`${name}${overLimit ? " (슬롯 초과)" : ""}`}
        className={cn(
          "flex cursor-grab touch-manipulation select-none flex-col items-center gap-1 rounded-lg p-1 outline-none [-webkit-touch-callout:none] focus-visible:ring-2 focus-visible:ring-primary active:cursor-grabbing [&_img]:pointer-events-none",
          isDragging && "opacity-40",
          isOver && "bg-primary/10",
          overLimit && "ring-2 ring-warning",
        )}
      >
        <CharacterIcon
          name={name}
          customIconUrl={customIconUrl}
          defaultIconUrl={character?.default_icon_url}
          dimmed={!owned}
          className="h-12 w-12"
        />
        <span className="w-full truncate text-center text-[11px] text-content">{name}</span>
      </div>
      <button
        type="button"
        data-no-dnd
        aria-label={`${name} 빼기`}
        onClick={onRemove}
        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-line bg-surface text-content-secondary opacity-0 shadow-sm transition-opacity hover:text-danger focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100"
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
    </li>
  )
}

function EmptySlot({ presetId, index, onClick }: { presetId: string; index: number; onClick: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: emptyId(presetId, index) })
  return (
    <li ref={setNodeRef} data-testid="preset-empty-slot">
      <button
        type="button"
        data-no-dnd
        aria-label={`빈 슬롯 ${index + 1}에 캐릭터 추가`}
        onClick={onClick}
        className={cn(
          "flex h-full min-h-[4.5rem] w-full items-center justify-center rounded-lg border border-dashed border-line text-content-muted transition-colors hover:border-primary hover:text-primary",
          isOver && "border-primary bg-primary/10 text-primary",
        )}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </li>
  )
}

/** One preset card of the R76 grid: inline title/memo, sortable slots, card actions (spec §2.2). */
export function PresetBoardCard({
  preset,
  index,
  count,
  maxSlots,
  characterById,
  states,
  customIconUrls,
  isActive,
  isPending,
  onActivate,
  onRemove,
  onEmptySlot,
  onMove,
  onDelete,
  onRename,
  onMemo,
}: PresetBoardCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id: cardId(preset.id) })
  const [titleDraft, setTitleDraft] = useState<string | null>(null)
  const [memoDraft, setMemoDraft] = useState<string | null>(null)
  const ids = preset.character_ids
  const overLimit = ids.length > maxSlots
  const emptyCount = Math.max(0, maxSlots - ids.length)

  const commitTitle = () => {
    if (titleDraft === null) return
    const title = titleDraft.trim()
    setTitleDraft(null)
    if (title && title !== preset.title) onRename(title.slice(0, PRESET_TITLE_MAX))
  }
  const commitMemo = () => {
    if (memoDraft === null) return
    const memo = memoDraft.trim() === "" ? null : memoDraft
    setMemoDraft(null)
    if (memo !== preset.memo) onMemo(memo)
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      role="group"
      tabIndex={-1}
      aria-roledescription="프리셋 카드"
      aria-label={preset.title}
      aria-current={isActive ? "true" : undefined}
      aria-busy={isPending || undefined}
      data-testid="preset-card"
      data-preset-id={preset.id}
      onMouseDownCapture={onActivate}
      onTouchStartCapture={onActivate}
      onFocusCapture={onActivate}
      className={cn(
        "flex min-w-0 touch-pan-y flex-col gap-3 rounded-lg border bg-surface p-3",
        isActive ? "border-primary ring-1 ring-primary" : "border-line",
        isDragging && "opacity-40",
        isOver && !isDragging && "bg-primary/5",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          {titleDraft !== null ? (
            <Input
              autoFocus
              aria-label="프리셋 제목"
              value={titleDraft}
              maxLength={PRESET_TITLE_MAX}
              onChange={(event) => setTitleDraft(event.target.value)}
              onBlur={commitTitle}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitTitle()
                if (event.key === "Escape") setTitleDraft(null)
              }}
              className="h-8 text-sm"
            />
          ) : (
            <button
              type="button"
              data-no-dnd
              aria-label={`${preset.title} 제목 수정`}
              onClick={() => setTitleDraft(preset.title)}
              className="block max-w-full truncate text-left text-sm font-semibold text-content hover:text-primary"
            >
              {preset.title}
            </button>
          )}
          {memoDraft !== null ? (
            <Textarea
              autoFocus
              aria-label="프리셋 메모"
              value={memoDraft}
              maxLength={PRESET_MEMO_MAX}
              rows={3}
              onChange={(event) => setMemoDraft(event.target.value)}
              onBlur={commitMemo}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault()
                  setMemoDraft(null)
                  return
                }
                insertTabOnKeyDown(event, setMemoDraft)
              }}
              className="text-xs"
            />
          ) : (
            <button
              type="button"
              data-no-dnd
              aria-label={`${preset.title} 메모 수정`}
              onClick={() => setMemoDraft(preset.memo ?? "")}
              className={cn("block max-w-full whitespace-pre-line text-left text-xs line-clamp-2 hover:text-primary", preset.memo ? "text-content-secondary" : "text-content-muted")}
            >
              {preset.memo || "메모 추가"}
            </button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-content-muted" aria-label="저장 중" />}
          <button type="button" data-no-dnd aria-label={`${preset.title} 앞으로`} disabled={index === 0} onClick={() => onMove(-1)} className="rounded p-1 text-content-muted hover:text-content disabled:opacity-30">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button type="button" data-no-dnd aria-label={`${preset.title} 뒤로`} disabled={index === count - 1} onClick={() => onMove(1)} className="rounded p-1 text-content-muted hover:text-content disabled:opacity-30">
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button type="button" data-no-dnd aria-label={`${preset.title} 삭제`} onClick={onDelete} className="rounded p-1 text-content-muted hover:text-danger">
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <SortableContext items={ids.map((id) => slotId(preset.id, id))} strategy={rectSortingStrategy}>
        <ul className="grid grid-cols-4 gap-2" aria-label={`${preset.title} 슬롯`}>
          {ids.map((characterId, slotIndex) => (
            <SlotAvatar
              key={characterId}
              presetId={preset.id}
              characterId={characterId}
              character={characterById.get(characterId)}
              state={states[characterId]}
              customIconUrl={customIconUrls[characterId]}
              overLimit={slotIndex >= maxSlots}
              onRemove={() => onRemove(characterId)}
            />
          ))}
          {Array.from({ length: emptyCount }, (_, offset) => (
            <EmptySlot key={`empty-${offset}`} presetId={preset.id} index={ids.length + offset} onClick={onEmptySlot} />
          ))}
        </ul>
      </SortableContext>
      {overLimit && (
        <p className="text-[11px] text-warning">슬롯 초과: 최대 {maxSlots}칸입니다. 캐릭터를 빼거나 옮길 수만 있습니다.</p>
      )}
    </li>
  )
}
