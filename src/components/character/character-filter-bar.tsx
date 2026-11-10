"use client"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  OTHER_FILTER_LABEL,
  OTHER_FILTER_VALUE,
  hasOtherAxisValue,
  hasOtherRarity,
  type CharacterFilters,
  type ClassificationSchema,
  type GameCharacter,
  type OwnershipFilter,
} from "@/lib/character-utils"
import { ClassificationOptionIcon, type ClassificationIconMap } from "./classification-option-icon"

const OWNERSHIP_OPTIONS: { value: OwnershipFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "owned", label: "보유" },
  { value: "unowned", label: "미보유" },
]

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "min-h-[32px] rounded-full border px-3 text-xs font-medium transition-colors duration-fast",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-line-control bg-surface-2 text-content-secondary hover:text-content",
      )}
    >
      {children}
    </button>
  )
}

/**
 * One filter group: the label sits left of the chips, or on its own line above them when `stacked`
 * (narrow panels such as the preset sidebar and picker, where a left label leaves chips wrapping under it).
 */
function FilterRow({ label, stacked, testId, children }: { label: string; stacked: boolean; testId?: string; children: React.ReactNode }) {
  if (stacked) {
    return (
      <div className="space-y-1.5" data-testid={testId}>
        <span className="block truncate text-xs text-content-muted" title={label}>{label}</span>
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      </div>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid={testId}>
      <span className="w-14 shrink-0 truncate text-xs text-content-muted" title={label}>{label}</span>
      {children}
    </div>
  )
}

interface CharacterFilterBarProps {
  /** Full catalog of the selected game; used only to decide whether a `기타` chip is needed. */
  characters: GameCharacter[]
  schema: ClassificationSchema
  filters: CharacterFilters
  onChange: (next: CharacterFilters) => void
  idPrefix: string
  /** Optional option icons (R64); only the roster passes them. Missing icon = text-only chip. */
  classificationIcons?: ClassificationIconMap
  /** Put each group label on its own line above its chips (narrow panels). */
  stacked?: boolean
}

/** Ownership, rarity, classification-axis and name filters shared by the roster and the preset picker. */
export function CharacterFilterBar({ characters, schema, filters, onChange, idPrefix, classificationIcons, stacked = false }: CharacterFilterBarProps) {
  const showOtherRarity = hasOtherRarity(characters, schema)

  return (
    <div className={stacked ? "space-y-3" : "space-y-2"} data-testid={`${idPrefix}-filter-bar`}>
      <FilterRow label="보유 여부" stacked={stacked}>
        {OWNERSHIP_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            active={filters.ownership === option.value}
            onClick={() => onChange({ ...filters, ownership: option.value })}
          >
            {option.label}
          </Chip>
        ))}
      </FilterRow>

      {schema.rarities.length > 0 && (
        <FilterRow label="레어도" stacked={stacked} testId={`${idPrefix}-rarity-filter`}>
          <Chip active={filters.rarity === ""} onClick={() => onChange({ ...filters, rarity: "" })}>전체</Chip>
          {schema.rarities.map((rarity) => (
            <Chip key={rarity} active={filters.rarity === rarity} onClick={() => onChange({ ...filters, rarity })}>
              {rarity}
            </Chip>
          ))}
          {showOtherRarity && (
            <Chip
              active={filters.rarity === OTHER_FILTER_VALUE}
              onClick={() => onChange({ ...filters, rarity: OTHER_FILTER_VALUE })}
            >
              {OTHER_FILTER_LABEL}
            </Chip>
          )}
        </FilterRow>
      )}

      {schema.axes.map((axis) => {
        const selected = filters.axes[axis.key] ?? ""
        const setAxis = (value: string) => onChange({ ...filters, axes: { ...filters.axes, [axis.key]: value } })
        return (
          <FilterRow key={axis.key} label={axis.label} stacked={stacked} testId={`${idPrefix}-axis-${axis.key}`}>
            <Chip active={selected === ""} onClick={() => setAxis("")}>전체</Chip>
            {axis.options.map((option) => (
              <Chip key={option} active={selected === option} onClick={() => setAxis(option)}>
                <span className="inline-flex items-center gap-1">
                  <ClassificationOptionIcon icons={classificationIcons} axisKey={axis.key} option={option} />
                  {option}
                </span>
              </Chip>
            ))}
            {hasOtherAxisValue(characters, axis) && (
              <Chip active={selected === OTHER_FILTER_VALUE} onClick={() => setAxis(OTHER_FILTER_VALUE)}>
                {OTHER_FILTER_LABEL}
              </Chip>
            )}
          </FilterRow>
        )
      })}

      <Input
        type="search"
        aria-label="캐릭터 이름 검색"
        placeholder="검색"
        value={filters.query}
        onChange={(event) => onChange({ ...filters, query: event.target.value })}
        className="h-10 max-w-sm bg-surface-2"
      />
    </div>
  )
}
