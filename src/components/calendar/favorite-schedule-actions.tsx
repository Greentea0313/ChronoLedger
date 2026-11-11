import { Star } from "lucide-react"

export interface FavoriteScheduleActionsProps {
  scheduleId: string
  title: string
  favoriteScheduleIds?: ReadonlySet<string>
  onToggleFavorite?: (scheduleId: string) => void
  className?: string
}

/** R35: star toggle for one schedule; renders nothing for guests (no toggle handler). */
export function FavoriteScheduleActions({
  scheduleId,
  title,
  favoriteScheduleIds,
  onToggleFavorite,
  className,
}: FavoriteScheduleActionsProps) {
  if (!onToggleFavorite) return null
  const isFavorite = favoriteScheduleIds?.has(scheduleId) ?? false
  return (
    <span className={`inline-flex items-center gap-1.5 ${className ?? ""}`} data-vaul-no-drag>
      <button
        type="button"
        aria-pressed={isFavorite}
        aria-label={`${title} ${isFavorite ? "관심 일정 해제" : "관심 일정 등록"}`}
        data-vaul-no-drag
        onClick={(event) => {
          event.stopPropagation()
          onToggleFavorite(scheduleId)
        }}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line hover:bg-surface ${isFavorite ? "text-warning" : "text-content-muted"}`}
      >
        <Star className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} aria-hidden="true" />
      </button>
    </span>
  )
}
