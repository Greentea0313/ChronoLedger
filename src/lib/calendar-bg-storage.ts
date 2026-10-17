export type CalendarBgBlurLevel = "OFF" | "LOW" | "MEDIUM"

export interface CalendarBgSettings {
  opacity: number // 10 ~ 60 (%)
  blur: CalendarBgBlurLevel
}

export interface CalendarBgRecord extends CalendarBgSettings {
  blob: Blob | null
  updatedAt: string
}

export const DEFAULT_CALENDAR_BG_SETTINGS: CalendarBgSettings = {
  opacity: 25,
  blur: "OFF",
}

export const MIN_BG_OPACITY = 10
export const MAX_BG_OPACITY = 60

const DB_NAME = "chronoledger_calendar_bg"
const DB_VERSION = 1
const STORE_NAME = "backgrounds"
const MAX_INPUT_FILE_SIZE = 15 * 1024 * 1024 // 15MB
const MAX_DIMENSION_WIDTH = 1920
const MAX_DIMENSION_HEIGHT = 1080

// IndexedDB 미지원 환경(SSR/일부 테스트 환경)을 위한 인메모리 폴백 저장소
const memoryFallbackStore = new Map<string, CalendarBgRecord>()

function getStorageKey(userId?: string | null): string {
  return userId ? `calendar_bg_${userId}` : "calendar_bg_default"
}

/**
 * 투명도 값을 10% ~ 60% 범위로 강제 클램핑합니다. (가독성 보호 상한 60%)
 */
export function clampBgOpacity(value: number): number {
  if (Number.isNaN(value)) return DEFAULT_CALENDAR_BG_SETTINGS.opacity
  const rounded = Math.round(value)
  return Math.min(MAX_BG_OPACITY, Math.max(MIN_BG_OPACITY, rounded))
}

/**
 * 블러 단계에 대응하는 CSS filter 문자열을 반환합니다.
 */
export function getBlurFilterCss(blur: CalendarBgBlurLevel): string {
  switch (blur) {
    case "LOW":
      return "blur(4px)"
    case "MEDIUM":
      return "blur(8px)"
    case "OFF":
    default:
      return "none"
  }
}

/**
 * IndexedDB 데이터베이스 연결을 엽니다.
 */
function openBgDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    return Promise.resolve(null)
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      }

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        resolve(null)
      }
    } catch {
      resolve(null)
    }
  })
}

/**
 * 사용자의 캘린더 배경 설정 및 이미지 Blob을 IndexedDB(및 폴백 메모리)에서 조회합니다.
 */
export async function loadCalendarBgRecord(userId?: string | null): Promise<CalendarBgRecord> {
  const key = getStorageKey(userId)
  const db = await openBgDatabase()

  if (db) {
    try {
      const record = await new Promise<CalendarBgRecord | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly")
        const store = tx.objectStore(STORE_NAME)
        const req = store.get(key)
        req.onsuccess = () => resolve(req.result as CalendarBgRecord | undefined)
        req.onerror = () => reject(req.error)
      })
      db.close()

      if (record) {
        const normalized: CalendarBgRecord = {
          blob: record.blob ?? null,
          opacity: clampBgOpacity(record.opacity),
          blur: record.blur === "LOW" || record.blur === "MEDIUM" ? record.blur : "OFF",
          updatedAt: record.updatedAt || new Date().toISOString(),
        }
        memoryFallbackStore.set(key, normalized)
        return normalized
      }
    } catch {
      db.close()
    }
  }

  const fallback = memoryFallbackStore.get(key)
  if (fallback) {
    return {
      ...fallback,
      opacity: clampBgOpacity(fallback.opacity),
    }
  }

  return {
    ...DEFAULT_CALENDAR_BG_SETTINGS,
    blob: null,
    updatedAt: new Date().toISOString(),
  }
}

/**
 * 사용자의 캘린더 배경 이미지 Blob 및 설정을 IndexedDB에 영구 저장합니다.
 */
export async function saveCalendarBgRecord(
  userId: string | null | undefined,
  input: {
    blob: Blob | null
    opacity: number
    blur: CalendarBgBlurLevel
  },
): Promise<CalendarBgRecord> {
  const key = getStorageKey(userId)
  const record: CalendarBgRecord = {
    blob: input.blob,
    opacity: clampBgOpacity(input.opacity),
    blur: input.blur === "LOW" || input.blur === "MEDIUM" ? input.blur : "OFF",
    updatedAt: new Date().toISOString(),
  }

  memoryFallbackStore.set(key, record)

  const db = await openBgDatabase()
  if (db) {
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite")
        const store = tx.objectStore(STORE_NAME)
        const req = store.put(record, key)
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
      })
    } finally {
      db.close()
    }
  }

  return record
}

/**
 * 사용자의 캘린더 배경 설정 및 이미지를 기본 상태로 초기화(삭제)합니다.
 */
export async function clearCalendarBgRecord(userId?: string | null): Promise<CalendarBgRecord> {
  const key = getStorageKey(userId)
  memoryFallbackStore.delete(key)

  const db = await openBgDatabase()
  if (db) {
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite")
        const store = tx.objectStore(STORE_NAME)
        const req = store.delete(key)
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
      })
    } finally {
      db.close()
    }
  }

  return {
    ...DEFAULT_CALENDAR_BG_SETTINGS,
    blob: null,
    updatedAt: new Date().toISOString(),
  }
}

/**
 * 업로드된 배경 이미지를 최대 1920x1080 비율 유지 리사이징 후 WebP로 압축합니다.
 */
export async function compressCalendarBgImage(file: File): Promise<Blob> {
  if (file.size > MAX_INPUT_FILE_SIZE) {
    throw new Error("배경 이미지는 15MB 이하 파일만 업로드할 수 있습니다.")
  }

  const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
  if (!validTypes.includes(file.type)) {
    throw new Error("PNG, JPG, JPEG, WebP 형식의 이미지만 지원합니다.")
  }

  const img = await loadImageFromFile(file)
  const { width, height } = calculateScaledDimensions(
    img.width || 1280,
    img.height || 720,
    MAX_DIMENSION_WIDTH,
    MAX_DIMENSION_HEIGHT,
  )

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")

  if (!ctx) {
    throw new Error("Canvas를 지원하지 않는 브라우저입니다.")
  }

  ctx.drawImage(img, 0, 0, width, height)

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/webp", 0.82)
  })

  if (!blob) {
    throw new Error("배경 이미지 압축 변환에 실패했습니다.")
  }

  return blob
}

export function calculateScaledDimensions(
  srcWidth: number,
  srcHeight: number,
  maxWidth = MAX_DIMENSION_WIDTH,
  maxHeight = MAX_DIMENSION_HEIGHT,
): { width: number; height: number } {
  if (srcWidth <= 0 || srcHeight <= 0) {
    return { width: maxWidth, height: maxHeight }
  }
  const widthRatio = maxWidth / srcWidth
  const heightRatio = maxHeight / srcHeight
  const scale = Math.min(1, widthRatio, heightRatio)
  return {
    width: Math.max(1, Math.round(srcWidth * scale)),
    height: Math.max(1, Math.round(srcHeight * scale)),
  }
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("이미지를 읽을 수 없습니다. 파일이 손상되었을 수 있습니다."))
    }

    img.src = url
  })
}

