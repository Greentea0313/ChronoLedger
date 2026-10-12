interface ScheduleBannerProps {
  type: "VERSION" | "PICKUP" | "CONTENTS"
}

export function ScheduleBanner({ type }: ScheduleBannerProps) {
  const palette =
    type === "VERSION"
      ? "border-success/50 bg-success/15 text-success"
      : type === "PICKUP"
        ? "border-primary/50 bg-primary/15 text-primary"
        : "border-purple-500/50 bg-purple-500/15 text-purple-300"

  return (
    <span
      className={`inline-flex max-w-full items-center truncate rounded border px-1 py-0.5 text-[10px] font-semibold md:px-1.5 ${palette}`}
    >
      {type}
    </span>
  )
}
