import { classificationIconKey } from "@/lib/classification-icon-key"
import { cn } from "@/lib/utils"

/** Option icons of one game keyed by `classificationIconKey(axisKey, option)`. Missing key = text only. */
export type ClassificationIconMap = ReadonlyMap<string, string>

interface ClassificationOptionIconProps {
  icons: ClassificationIconMap | undefined
  axisKey: string
  option: string
  /** Edge length in px (16 in chips/dialogs/lists, 24 in the admin editor). */
  size?: number
  className?: string
}

/** Small decorative icon before an axis option; renders nothing when the option has no icon. */
export function ClassificationOptionIcon({ icons, axisKey, option, size = 16, className }: ClassificationOptionIconProps) {
  const src = icons?.get(classificationIconKey(axisKey, option))
  if (!src) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Data URL icon in a static export; next/image adds nothing here.
    <img
      src={src}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      data-testid="classification-option-icon"
      className={cn("shrink-0 object-contain", className)}
    />
  )
}
