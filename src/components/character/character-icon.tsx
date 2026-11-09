"use client"

import { GameIcon } from "@/components/ui/game-icon"
import { cn } from "@/lib/utils"
import { FAVORITE_ICON_CLASS, UNOWNED_ICON_CLASS, getNameInitial } from "@/lib/character-utils"

interface CharacterIconProps {
  name: string
  /** Object URL of the user's custom icon (tier 1). */
  customIconUrl?: string | null
  /** Catalog default icon (tier 2). */
  defaultIconUrl?: string | null
  /** Dims the icon when the character is not owned. */
  dimmed?: boolean
  /** Gold border for favorite characters. */
  favorite?: boolean
  /** Shows an `n★` badge at the bottom-left when set (owned characters only). */
  breakthroughLevel?: number | null
  className?: string
}

/** Three-tier icon fallback: custom icon -> catalog default icon -> initial avatar. */
export function CharacterIcon({ name, customIconUrl, defaultIconUrl, dimmed = false, favorite = false, breakthroughLevel = null, className }: CharacterIconProps) {
  return (
    <div
      data-testid="character-icon"
      data-dimmed={dimmed ? "true" : "false"}
      data-favorite={favorite ? "true" : "false"}
      className={cn(
        "relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-2",
        favorite && FAVORITE_ICON_CLASS,
        dimmed && UNOWNED_ICON_CLASS,
        className,
      )}
    >
      <GameIcon
        src={customIconUrl || defaultIconUrl || null}
        alt={name}
        fallbackIcon={<span aria-hidden="true" className="text-lg font-semibold text-content-secondary">{getNameInitial(name)}</span>}
      />
      {breakthroughLevel !== null && (
        <span
          data-testid="breakthrough-badge"
          className="absolute bottom-0 left-0 rounded-tr-md bg-black/70 px-1 text-[10px] font-semibold leading-4 text-amber-300"
        >
          {breakthroughLevel}★
        </span>
      )}
    </div>
  )
}
