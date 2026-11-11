import { cn } from "@/lib/utils"

/**
 * Default character avatar (person silhouette) shown when a character has neither a custom nor a catalog icon.
 * Fills its parent and inherits the text colour for the outline.
 */
export function DefaultAvatar({ className }: { className?: string }) {
  return (
    <svg
      data-testid="default-avatar"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("h-full w-full bg-surface-2 p-[12%] text-content-muted", className)}
    >
      <circle cx="12" cy="8.5" r="3.6" />
      <path d="M4.5 20.5c0-4.1 3.4-6.6 7.5-6.6s7.5 2.5 7.5 6.6" />
    </svg>
  )
}
