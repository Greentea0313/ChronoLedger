import { cn } from "@/lib/utils"

export type ScheduleType = "VERSION" | "PICKUP" | "CONTENTS" | "BROADCAST"

interface ScheduleTypeBadgeProps {
  type: ScheduleType
  /** Renders the nested `[복각]` chip inside the badge (`[픽업 [복각]]`). */
  isRerun?: boolean
  /** `sm`: sidebar / weekly list, `md`: admin / games list. */
  size?: "sm" | "md"
  className?: string
}

const LABELS: Record<ScheduleType, string> = {
  VERSION: "버전",
  PICKUP: "픽업",
  CONTENTS: "콘텐츠",
  BROADCAST: "특별방송",
}

const PALETTES: Record<ScheduleType, string> = {
  VERSION: "bg-primary/20 text-primary border-primary/30",
  PICKUP: "bg-warning/20 text-warning border-warning/30",
  BROADCAST: "bg-info/15 text-info border-info/30",
  CONTENTS: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
}

export function getScheduleTypeLabel(type: ScheduleType): string {
  return LABELS[type]
}

/**
 * Schedule type badge shared by the admin list, game schedule tree, sidebar and weekly list.
 * The rerun chip has no vertical padding and `leading-none`, so the outer badge keeps the same height with or without it.
 */
export function ScheduleTypeBadge({ type, isRerun = false, size = "md", className }: ScheduleTypeBadgeProps) {
  return (
    <span
      data-testid="schedule-type-badge"
      data-size={size}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded border",
        size === "sm" ? "px-1.5 py-0.5 text-[10px] font-bold" : "px-2 py-0.5 text-xs font-semibold",
        PALETTES[type],
        // after the size class: tailwind-merge drops an earlier leading-* when a text-* size follows
        "leading-none",
        className,
      )}
    >
      {LABELS[type]}
      {isRerun && (
        <span
          data-testid="rerun-chip"
          className={cn(
            "inline-flex items-center rounded bg-warning/15 px-1 py-0 font-semibold text-warning",
            size === "sm" ? "text-[9px]" : "text-[10px]",
            "leading-none",
          )}
        >
          복각
        </span>
      )}
    </span>
  )
}
