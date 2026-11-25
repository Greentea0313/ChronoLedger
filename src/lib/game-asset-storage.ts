import { supabase } from "@/lib/supabase/client"
import { fetchImageFile, resizeImageToWebP } from "@/lib/image-resizer"
import { convertIconSourceToDataUrlWithUpscale } from "@/lib/image-upscaler"

export const GAME_ASSETS_BUCKET = "game-assets"
export const GAME_ASSETS_PUBLIC_PREFIX = "/storage/v1/object/public/game-assets/"
export const MAX_GAME_ASSET_BYTES = 100 * 1024
export const GAME_ASSET_CACHE_CONTROL = "31536000"

export type GameAssetTarget =
  | { kind: "game" }
  | { kind: "character"; gameId: string }

function getConfiguredSupabaseOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (!raw) return null
  try {
    return new URL(raw).origin
  } catch {
    return null
  }
}

/**
 * URL이 이 프로젝트의 공개 game-assets Storage 버킷을 가리키는지 판별합니다.
 * NEXT_PUBLIC_SUPABASE_URL이 설정된 경우 정확히 해당 origin과 일치해야 합니다.
 */
export function isManagedGameAssetUrl(url: string | null | undefined): boolean {
  if (typeof url !== "string") return false
  const trimmed = url.trim()
  if (!trimmed) return false

  const configuredOrigin = getConfiguredSupabaseOrigin()
  if (configuredOrigin) {
    return trimmed.startsWith(`${configuredOrigin}${GAME_ASSETS_PUBLIC_PREFIX}`)
  }

  try {
    const parsed = new URL(trimmed)
    return (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      parsed.pathname.startsWith(GAME_ASSETS_PUBLIC_PREFIX)
    )
  } catch {
    return false
  }
}

/**
 * public/assets/games/* 정적 파일 경로인지 판별합니다.
 */
export function isLocalStaticGameAssetUrl(url: string | null | undefined): boolean {
  if (typeof url !== "string") return false
  const trimmed = url.trim()
  return trimmed.startsWith("/assets/games/") && !trimmed.includes("..")
}

/**
 * Storage 공개 버킷 이전이 필요한 아이콘 URL인지 판별합니다.
 * 비어 있거나, 이미 game-assets 공개 URL이거나, 로컬 정적 경로(/assets/games/)이면 false입니다.
 */
export function needsGameAssetMigration(url: string | null | undefined): boolean {
  if (typeof url !== "string") return false
  const trimmed = url.trim()
  if (!trimmed) return false
  return !isManagedGameAssetUrl(trimmed) && !isLocalStaticGameAssetUrl(trimmed)
}

function decodeBase64ToBytes(base64: string): Uint8Array | null {
  try {
    const normalized = base64.replace(/\s+/g, "")
    if (!normalized) return null
    const binary = atob(normalized)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  } catch {
    return null
  }
}

function hasWebpMagicHeader(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50 // P
  )
}

/**
 * 100KB 이하이며 유효한 RIFF/WEBP 헤더를 가진 WebP Data URL이면 재압축 없이 Blob으로 복원합니다.
 * 조건을 만족하지 않으면 null을 반환해 호출자가 리사이저 폴백을 타도록 합니다.
 */
export function decodeValidWebpDataUrl(dataUrl: string): Blob | null {
  const match = /^data:image\/webp;base64,([A-Za-z0-9+/=\s]+)$/i.exec(dataUrl.trim())
  if (!match) return null
  const bytes = decodeBase64ToBytes(match[1])
  if (!bytes || bytes.length === 0 || bytes.length > MAX_GAME_ASSET_BYTES) return null
  if (!hasWebpMagicHeader(bytes)) return null
  return new Blob([bytes.buffer as ArrayBuffer], { type: "image/webp" })
}

function decodeAnyDataUrlToFile(dataUrl: string): File {
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(dataUrl.trim())
  if (!match) {
    throw new Error("유효한 이미지 데이터 URL이 아닙니다.")
  }
  const mime = match[1].trim().toLowerCase()
  const bytes = decodeBase64ToBytes(match[2])
  if (!bytes || bytes.length === 0) {
    throw new Error("이미지 데이터 URL을 디코딩하지 못했습니다.")
  }
  return new File([bytes.buffer as ArrayBuffer], "icon", { type: mime })
}

async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === "function") {
    return blob.arrayBuffer()
  }
  if (typeof Response !== "undefined") {
    return new Response(blob).arrayBuffer()
  }
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result)
      else reject(new Error("이미지 바이너리를 읽지 못했습니다."))
    }
    reader.onerror = () => reject(new Error("이미지 바이너리를 읽지 못했습니다."))
    reader.readAsArrayBuffer(blob)
  })
}

async function sha256Hex(blob: Blob): Promise<string> {
  const buffer = await blobToArrayBuffer(blob)
  const digest = await crypto.subtle.digest("SHA-256", buffer)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

async function convertWithUpscaleToWebpBlob(source: File | string): Promise<Blob> {
  const dataUrl = await convertIconSourceToDataUrlWithUpscale(source, true)
  const validDirect = decodeValidWebpDataUrl(dataUrl)
  if (validDirect) return validDirect
  const fallbackFile = decodeAnyDataUrlToFile(dataUrl)
  if (fallbackFile.type === "image/webp" && fallbackFile.size <= MAX_GAME_ASSET_BYTES) {
    return fallbackFile
  }
  return resizeImageToWebP(fallbackFile, 256)
}

async function prepareWebpBlob(source: File | Blob | string, useAiUpscale: boolean): Promise<Blob> {
  if (typeof source === "string") {
    const trimmed = source.trim()
    if (trimmed.toLowerCase().startsWith("data:")) {
      const directBlob = decodeValidWebpDataUrl(trimmed)
      if (directBlob) return directBlob
      const decodedFile = decodeAnyDataUrlToFile(trimmed)
      return useAiUpscale
        ? convertWithUpscaleToWebpBlob(decodedFile)
        : resizeImageToWebP(decodedFile, 256)
    }

    if (/^https?:\/\//i.test(trimmed)) {
      if (useAiUpscale) {
        return convertWithUpscaleToWebpBlob(trimmed)
      }
      const fetchedFile = await fetchImageFile(trimmed, 256)
      return resizeImageToWebP(fetchedFile, 256)
    }

    throw new Error("아이콘 주소는 http/https, WebP Data URL 또는 /assets/games/ 경로여야 합니다.")
  }

  const file =
    source instanceof File
      ? source
      : new File([source], "icon.webp", { type: source.type || "image/webp" })

  return useAiUpscale
    ? convertWithUpscaleToWebpBlob(file)
    : resizeImageToWebP(file, 256)
}

/**
 * 게임/캐릭터 아이콘 소스(File, Blob, Data URL, 외부 URL)를 256x256 WebP(≤100KB)로 정규화해
 * 공개 game-assets 버킷에 내용 해시(SHA-256) 경로로 업로드하고 공개 URL을 반환합니다.
 * 이미 game-assets 공개 URL이거나 /assets/games/ 로컬 정적 경로인 문자열은 재업로드 없이 그대로 반환합니다.
 */
export async function uploadGameAssetFromSource(
  target: GameAssetTarget,
  source: File | Blob | string,
  options?: { useAiUpscale?: boolean },
): Promise<string> {
  if (typeof source === "string") {
    const trimmed = source.trim()
    if (!trimmed) {
      throw new Error("아이콘 소스가 비어 있습니다.")
    }
    if (isManagedGameAssetUrl(trimmed) || isLocalStaticGameAssetUrl(trimmed)) {
      return trimmed
    }
  }

  let objectPathPrefix: string
  if (target.kind === "game") {
    objectPathPrefix = "games"
  } else {
    const gameId = target.gameId.trim()
    if (!gameId || gameId.includes("/") || gameId.includes("..")) {
      throw new Error("유효한 게임 ID가 필요합니다.")
    }
    objectPathPrefix = `characters/${gameId}`
  }

  const webpBlob = await prepareWebpBlob(source, options?.useAiUpscale ?? false)
  if (webpBlob.size <= 0) {
    throw new Error("WebP 이미지 변환에 실패했습니다.")
  }
  if (webpBlob.size > MAX_GAME_ASSET_BYTES) {
    throw new Error(
      `변환된 이미지 용량이 100KB를 초과합니다. (현재: ${Math.round(webpBlob.size / 1024)}KB)`,
    )
  }

  const hash = await sha256Hex(webpBlob)
  const objectPath = `${objectPathPrefix}/${hash}.webp`

  const { error: uploadError } = await supabase.storage
    .from(GAME_ASSETS_BUCKET)
    .upload(objectPath, webpBlob, {
      contentType: "image/webp",
      cacheControl: GAME_ASSET_CACHE_CONTROL,
      upsert: true,
    })

  if (uploadError) {
    throw new Error(`아이콘 Storage 업로드에 실패했습니다: ${uploadError.message}`)
  }

  const { data } = supabase.storage.from(GAME_ASSETS_BUCKET).getPublicUrl(objectPath)
  if (!data?.publicUrl) {
    throw new Error("업로드된 아이콘의 공개 URL을 가져오지 못했습니다.")
  }

  return data.publicUrl
}
