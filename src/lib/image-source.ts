import { fetchImageFile } from "@/lib/image-resizer"

export type ImageSourceInput = { kind: "file"; file: File } | { kind: "text"; text: string }

export const INVALID_IMAGE_SOURCE_MESSAGE = "이미지 URL(https://...)을 입력하거나 이미지를 붙여넣거나 파일을 선택해 주세요."

/**
 * Turns the dialog's current source into a File for the site converter (R81 §3.1).
 * Data URL text is decoded and returned as a File, never passed through: the site converter must always re-encode it.
 * http(s) URLs go through fetchImageFile (direct fetch, then the wsrv.nl proxy sized by fetchSize).
 */
export async function resolveImageSource(input: ImageSourceInput, fetchSize: number): Promise<File> {
  if (input.kind === "file") return input.file
  const text = input.text.trim()
  if (text.startsWith("data:image/")) {
    const blob = await (await fetch(text)).blob()
    return new File([blob], "image-source", { type: blob.type })
  }
  if (/^https?:\/\//i.test(text)) return fetchImageFile(text, fetchSize)
  throw new Error(INVALID_IMAGE_SOURCE_MESSAGE)
}

/**
 * Original image address of a pasted browser image (`text/html` with `<img src="http(s)://...">`).
 * The clipboard bitmap of a copied web image has no alpha channel on Windows, so a transparent PNG would turn black;
 * fetching the original address keeps the transparency. Returns null when there is no usable address.
 */
export function extractClipboardImageUrl(clipboardData: Pick<DataTransfer, "getData">): string | null {
  let html = ""
  try {
    html = clipboardData.getData("text/html")
  } catch {
    return null
  }
  if (!html) return null
  const src = new DOMParser().parseFromString(html, "text/html").querySelector("img")?.getAttribute("src")?.trim()
  return src && /^https?:\/\//i.test(src) ? src : null
}
