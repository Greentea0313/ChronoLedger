"use client"

import { GameIcon } from "@/components/ui/game-icon"
import { cn } from "@/lib/utils"
import { UNOWNED_ICON_CLASS, getNameInitial } from "@/lib/character-utils"

interface CharacterIconProps {
  name: string
  /** Object URL of the user's custom icon (tier 1). */
  customIconUrl?: string | null
  /** Catalog default icon (tier 2). */
  defaultIconUrl?: string | null
  /** Dims the icon when the character is not owned. */
  dimmed?: boolean
  className?: string
}

/** Three-tier icon fallback: custom icon -> catalog default icon -> initial avatar. */
export function CharacterIcon({ name, customIconUrl, defaultIconUrl, dimmed = false, className }: CharacterIconProps) {
  return (
    <div
      data-testid="character-icon"
      data-dimmed={dimmed ? "true" : "false"}
      className={cn("h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-2", dimmed && UNOWNED_ICON_CLASS, className)}
    >
      <GameIcon
        src={customIconUrl || defaultIconUrl || null}
        alt={name}
        fallbackIcon={<span aria-hidden="true" className="text-lg font-semibold text-content-secondary">{getNameInitial(name)}</span>}
      />
    </div>
  )
}
