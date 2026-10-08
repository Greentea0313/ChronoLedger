import * as React from "react"
import { cn } from "@/lib/utils"

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  message: string
  hint?: string
}

export function EmptyState({ message, hint, className, ...props }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg border border-dashed border-line px-4 py-5 text-center",
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className="text-lg text-content-muted">□</span>
      <p className="text-sm text-content-secondary">{message}</p>
      {hint && <p className="text-xs text-content-muted">{hint}</p>}
    </div>
  )
}
