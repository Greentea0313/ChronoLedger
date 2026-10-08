interface ScheduleBannerProps {
  type: "VERSION" | "PICKUP"
}

export function ScheduleBanner({ type }: ScheduleBannerProps) {
  const palette =
    type === "VERSION"
      ? "border-green-500/50 bg-green-500/15 text-green-300"
      : "border-indigo-500/50 bg-indigo-500/15 text-indigo-300"

  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${palette}`}
    >
      {type}
    </span>
  )
}
