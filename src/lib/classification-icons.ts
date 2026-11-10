import { supabase } from "@/lib/supabase/client"
import { resizeImageToWebP } from "@/lib/image-resizer"
import { classificationIconKey } from "@/lib/classification-icon-key"

/** Output edge length of a classification option icon (R64 D-04). */
export const CLASSIFICATION_ICON_SIZE = 64
/** Same cap as the game_classification_icons CHECK (R64 D-04). */
export const MAX_CLASSIFICATION_ICON_DATA_URL_LENGTH = 20_000

export { classificationIconKey }

/** Postgres undefined_table / PostgREST schema-cache miss: the R64 migration is not applied yet. */
export function isMissingClassificationIconTable(error: { code?: string } | null | undefined): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205"
}

export interface ClassificationIconSet {
  /** False when the table does not exist yet (or could not be read): icon features stay hidden. */
  available: boolean
  icons: Map<string, string>
}

const UNAVAILABLE: () => ClassificationIconSet = () => ({ available: false, icons: new Map() })

/**
 * Loads the icons of one game. A missing table (unapplied migration) hides the feature silently;
 * any other read error logs and degrades to "no icons" so the page still works as before.
 */
export async function loadClassificationIcons(gameId: string): Promise<ClassificationIconSet> {
  try {
    const { data, error } = await supabase
      .from("game_classification_icons")
      .select("axis_key, option_value, icon_data_url")
      .eq("game_id", gameId)
    if (error) {
      if (!isMissingClassificationIconTable(error)) console.error("Failed to load classification icons:", error)
      return UNAVAILABLE()
    }
    const icons = new Map<string, string>()
    ;(data ?? []).forEach((row) => {
      if (row.icon_data_url) icons.set(classificationIconKey(row.axis_key, row.option_value), row.icon_data_url)
    })
    return { available: true, icons }
  } catch (error) {
    console.error("Failed to load classification icons:", error)
    return UNAVAILABLE()
  }
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("이미지를 읽지 못했습니다."))
    reader.readAsDataURL(blob)
  })
}

/**
 * Converts an uploaded image to a 64×64 WebP Data URL. Always goes through the resizer: an already-WebP
 * Data URL string must not be passed through, because that would skip the 64×64 resize (R64 §3.2).
 */
export async function createClassificationIconDataUrl(file: File): Promise<string> {
  const blob = await resizeImageToWebP(file, CLASSIFICATION_ICON_SIZE)
  const dataUrl = await readBlobAsDataUrl(blob)
  if (dataUrl.length > MAX_CLASSIFICATION_ICON_DATA_URL_LENGTH) {
    throw new Error("분류 아이콘 이미지 용량이 너무 큽니다. 더 단순한 이미지를 사용해 주세요.")
  }
  return dataUrl
}
