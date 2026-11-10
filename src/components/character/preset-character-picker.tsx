"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
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
import type { BoardPreset } from "@/lib/preset-board"
import { CharacterFilterBar } from "./character-filter-bar"
import { CharacterIcon } from "./character-icon"

interface PresetCharacterPickerProps {
  /** The preset being filled; the drawer is closed while null. */
  preset: BoardPreset | null
  maxSlots: number
  characters: GameCharacter[]
  schema: ClassificationSchema
  states: Record<string, UserCharacterState>
  customIconUrls: Record<string, string>
  onPick: (characterId: string) => void
  onClose: () => void
}

/** Mobile (< 900px) bottom picker opened from an empty slot; stays open for further picks (spec §6). */
export function PresetCharacterPicker({ preset, maxSlots, characters, schema, states, customIconUrls, onPick, onClose }: PresetCharacterPickerProps) {
  const [filters, setFilters] = useState<CharacterFilters>(EMPTY_CHARACTER_FILTERS)
  const sections = useMemo(
    () => buildCharacterSections(filterCharacters(characters, filters, schema, (id) => states[id]?.is_owned ?? false), states),
    [characters, filters, schema, states],
  )
  const ids = preset?.character_ids ?? []
  const isFull = ids.length >= maxSlots

  return (
    <Drawer open={!!preset} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[85dvh]">
        <DrawerHeader>
          <DrawerTitle>{preset ? `${preset.title} 캐릭터 추가` : "캐릭터 추가"}</DrawerTitle>
          <DrawerDescription>
            {isFull ? `슬롯이 가득 찼습니다 (최대 ${maxSlots}칸).` : `${ids.length} / ${maxSlots}칸 · 캐릭터를 누르면 빈 슬롯에 추가됩니다.`}
          </DrawerDescription>
        </DrawerHeader>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4" data-testid="preset-picker">
          <CharacterFilterBar idPrefix="picker" characters={characters} schema={schema} filters={filters} onChange={setFilters} />
          {CHARACTER_SECTIONS.map(({ key, label }) => {
            const items = sections[key]
            if (items.length === 0) return null
            return (
              <section key={key} aria-label={`${label} 캐릭터`} className="space-y-1.5" data-testid={`preset-picker-${key}`}>
                <h4 className="text-xs font-semibold text-content-secondary">
                  {label} ({items.length})
                </h4>
                <ul className="grid grid-cols-4 gap-2 min-[480px]:grid-cols-6">
                  {items.map((character) => {
                    const placed = ids.includes(character.id)
                    const owned = states[character.id]?.is_owned ?? false
                    return (
                      <li key={character.id}>
                        <button
                          type="button"
                          disabled={placed || isFull}
                          aria-label={`${character.name}${placed ? ", 편성됨" : ""}`}
                          onClick={() => onPick(character.id)}
                          className={cn(
                            "flex w-full flex-col items-center gap-1 rounded-lg p-1 text-[11px] disabled:cursor-not-allowed [&_img]:pointer-events-none",
                            placed ? "text-primary" : "text-content-secondary",
                            !placed && isFull && "opacity-50",
                          )}
                        >
                          <CharacterIcon
                            name={character.name}
                            customIconUrl={customIconUrls[character.id]}
                            defaultIconUrl={character.default_icon_url}
                            dimmed={!owned || placed}
                            favorite={owned && (states[character.id]?.is_favorite ?? false)}
                            className="h-12 w-12"
                          />
                          <span className="w-full truncate text-center">{placed ? "편성됨" : character.name}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
        <DrawerFooter>
          <Button type="button" onClick={onClose}>
            완료
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
