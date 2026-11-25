import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  GAME_ASSETS_BUCKET,
  GAME_ASSET_CACHE_CONTROL,
  MAX_GAME_ASSET_BYTES,
  decodeValidWebpDataUrl,
  isLocalStaticGameAssetUrl,
  isManagedGameAssetUrl,
  needsGameAssetMigration,
  uploadGameAssetFromSource,
} from "./game-asset-storage"

const { storageFrom, upload, getPublicUrl, fetchImageFile, resizeImageToWebP, convertIconSourceToDataUrlWithUpscale } =
  vi.hoisted(() => ({
    storageFrom: vi.fn(),
    upload: vi.fn(),
    getPublicUrl: vi.fn(),
    fetchImageFile: vi.fn(),
    resizeImageToWebP: vi.fn(),
    convertIconSourceToDataUrlWithUpscale: vi.fn(),
  }))

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    storage: {
      from: storageFrom,
    },
  },
}))

vi.mock("@/lib/image-resizer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/image-resizer")>()),
  fetchImageFile,
  resizeImageToWebP,
}))

vi.mock("@/lib/image-upscaler", () => ({
  convertIconSourceToDataUrlWithUpscale,
}))

function createValidWebpBytes(extraLength = 8): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(new ArrayBuffer(12 + extraLength))
  // "RIFF"
  bytes[0] = 0x52
  bytes[1] = 0x49
  bytes[2] = 0x46
  bytes[3] = 0x46
  // payload size (little-endian)
  bytes[4] = extraLength + 4
  // "WEBP"
  bytes[8] = 0x57
  bytes[9] = 0x45
  bytes[10] = 0x42
  bytes[11] = 0x50
  for (let i = 12; i < bytes.length; i += 1) {
    bytes[i] = i % 251
  }
  return bytes
}

function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64")
}

describe("game-asset-storage", () => {
  const SUPABASE_ORIGIN = "https://proj.supabase.co"

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_ORIGIN)
    upload.mockResolvedValue({ data: { path: "ok" }, error: null })
    getPublicUrl.mockImplementation((path: string) => ({
      data: { publicUrl: `${SUPABASE_ORIGIN}/storage/v1/object/public/${GAME_ASSETS_BUCKET}/${path}` },
    }))
    storageFrom.mockReturnValue({ upload, getPublicUrl })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe("URL 분류 헬퍼", () => {
    it("isManagedGameAssetUrl은 설정된 Supabase origin의 game-assets 공개 URL만 true를 반환한다", () => {
      const managed = `${SUPABASE_ORIGIN}/storage/v1/object/public/game-assets/games/${"a".repeat(64)}.webp`
      expect(isManagedGameAssetUrl(managed)).toBe(true)
      expect(
        isManagedGameAssetUrl(`https://evil.example/storage/v1/object/public/game-assets/games/${"a".repeat(64)}.webp`),
      ).toBe(false)
      expect(isManagedGameAssetUrl(`${SUPABASE_ORIGIN}/storage/v1/object/authenticated/user-icons/u/x.webp`)).toBe(false)
      expect(isManagedGameAssetUrl("/assets/games/genshin.png")).toBe(false)
      expect(isManagedGameAssetUrl("data:image/webp;base64,abc")).toBe(false)
      expect(isManagedGameAssetUrl(null)).toBe(false)
      expect(isManagedGameAssetUrl("   ")).toBe(false)
    })

    it("isLocalStaticGameAssetUrl은 /assets/games/ 정적 경로만 허용하고 경로 탐색을 거부한다", () => {
      expect(isLocalStaticGameAssetUrl("/assets/games/genshin.png")).toBe(true)
      expect(isLocalStaticGameAssetUrl("  /assets/games/star_rail.png  ")).toBe(true)
      expect(isLocalStaticGameAssetUrl("/assets/games/../secret.png")).toBe(false)
      expect(isLocalStaticGameAssetUrl("https://example.com/assets/games/a.png")).toBe(false)
      expect(isLocalStaticGameAssetUrl(null)).toBe(false)
    })

    it("needsGameAssetMigration은 Data URL과 외부 URL만 이전 대상으로 판별한다", () => {
      const managed = `${SUPABASE_ORIGIN}/storage/v1/object/public/game-assets/games/${"b".repeat(64)}.webp`
      expect(needsGameAssetMigration("data:image/webp;base64,abc")).toBe(true)
      expect(needsGameAssetMigration("https://cdn.example.com/icon.png")).toBe(true)
      expect(needsGameAssetMigration(managed)).toBe(false)
      expect(needsGameAssetMigration("/assets/games/genshin.png")).toBe(false)
      expect(needsGameAssetMigration("")).toBe(false)
      expect(needsGameAssetMigration(null)).toBe(false)
    })
  })

  describe("decodeValidWebpDataUrl", () => {
    it("100KB 이하 유효 RIFF/WEBP Data URL을 재인코딩 없이 Blob으로 복원한다", () => {
      const bytes = createValidWebpBytes(16)
      const dataUrl = `data:image/webp;base64,${bytesToBase64(bytes)}`
      const blob = decodeValidWebpDataUrl(dataUrl)
      expect(blob).not.toBeNull()
      expect(blob?.type).toBe("image/webp")
      expect(blob?.size).toBe(bytes.length)
    })

    it("RIFF/WEBP 매직 헤더가 없거나 100KB 초과 또는 비-WebP Data URL은 null을 반환한다", () => {
      const invalidHeader = new Uint8Array(24)
      expect(decodeValidWebpDataUrl(`data:image/webp;base64,${bytesToBase64(invalidHeader)}`)).toBeNull()

      const oversized = createValidWebpBytes(MAX_GAME_ASSET_BYTES)
      expect(decodeValidWebpDataUrl(`data:image/webp;base64,${bytesToBase64(oversized)}`)).toBeNull()

      const validBytes = createValidWebpBytes(8)
      expect(decodeValidWebpDataUrl(`data:image/png;base64,${bytesToBase64(validBytes)}`)).toBeNull()
    })
  })

  describe("uploadGameAssetFromSource", () => {
    it("이미 game-assets 공개 URL이거나 /assets/games/ 로컬 경로이면 재업로드 없이 그대로 반환한다", async () => {
      const managed = `${SUPABASE_ORIGIN}/storage/v1/object/public/game-assets/games/${"c".repeat(64)}.webp`
      expect(await uploadGameAssetFromSource({ kind: "game" }, `  ${managed}  `)).toBe(managed)
      expect(await uploadGameAssetFromSource({ kind: "game" }, "/assets/games/genshin.png")).toBe(
        "/assets/games/genshin.png",
      )
      expect(storageFrom).not.toHaveBeenCalled()
      expect(upload).not.toHaveBeenCalled()
      expect(resizeImageToWebP).not.toHaveBeenCalled()
    })

    it("유효 WebP Data URL은 리사이저를 거치지 않고 SHA-256 내용 해시 경로와 1년 캐시 헤더로 업로드한다", async () => {
      const bytes = createValidWebpBytes(20)
      const dataUrl = `data:image/webp;base64,${bytesToBase64(bytes)}`

      const gamePublicUrl = await uploadGameAssetFromSource({ kind: "game" }, dataUrl)
      expect(resizeImageToWebP).not.toHaveBeenCalled()
      expect(storageFrom).toHaveBeenCalledWith(GAME_ASSETS_BUCKET)
      const [uploadedPath, uploadedBlob, options] = upload.mock.calls[0]
      expect(uploadedPath).toMatch(/^games\/[0-9a-f]{64}\.webp$/)
      expect(uploadedBlob).toBeInstanceOf(Blob)
      expect((uploadedBlob as Blob).size).toBe(bytes.length)
      expect(options).toEqual({
        contentType: "image/webp",
        cacheControl: GAME_ASSET_CACHE_CONTROL,
        upsert: true,
      })
      expect(gamePublicUrl).toBe(`${SUPABASE_ORIGIN}/storage/v1/object/public/game-assets/${uploadedPath}`)

      const gameUuid = "11111111-2222-3333-4444-555555555555"
      const charPublicUrl = await uploadGameAssetFromSource({ kind: "character", gameId: gameUuid }, dataUrl)
      const [charPath] = upload.mock.calls[1]
      expect(charPath).toMatch(new RegExp(`^characters/${gameUuid}/[0-9a-f]{64}\\.webp$`))
      expect(charPublicUrl).toBe(`${SUPABASE_ORIGIN}/storage/v1/object/public/game-assets/${charPath}`)
      // 같은 바이트는 항상 동일한 SHA-256 해시를 생성한다.
      expect(charPath.split("/").pop()).toBe((uploadedPath as string).split("/").pop())
    })

    it("외부 URL과 File 소스는 fetchImageFile/resizeImageToWebP를 거쳐 WebP로 업로드한다", async () => {
      const webpBlob = new Blob([createValidWebpBytes(12)], { type: "image/webp" })
      const fetchedFile = new File(["png"], "remote.png", { type: "image/png" })
      fetchImageFile.mockResolvedValueOnce(fetchedFile)
      resizeImageToWebP.mockResolvedValue(webpBlob)

      const urlResult = await uploadGameAssetFromSource({ kind: "game" }, "https://cdn.example.com/icon.png")
      expect(fetchImageFile).toHaveBeenCalledWith("https://cdn.example.com/icon.png", 256)
      expect(resizeImageToWebP).toHaveBeenCalledWith(fetchedFile, 256)
      expect(urlResult).toMatch(/^https:\/\/proj\.supabase\.co\/storage\/v1\/object\/public\/game-assets\/games\/[0-9a-f]{64}\.webp$/)

      const localFile = new File(["png"], "local.png", { type: "image/png" })
      await uploadGameAssetFromSource({ kind: "character", gameId: "game-1" }, localFile)
      expect(resizeImageToWebP).toHaveBeenCalledWith(localFile, 256)
    })

    it("100KB 초과 WebP Data URL은 직접 업로드하지 않고 리사이저 폴백을 거친다", async () => {
      const oversizedDataUrl = `data:image/webp;base64,${bytesToBase64(createValidWebpBytes(MAX_GAME_ASSET_BYTES))}`
      const resizedBlob = new Blob([createValidWebpBytes(10)], { type: "image/webp" })
      resizeImageToWebP.mockResolvedValueOnce(resizedBlob)

      await uploadGameAssetFromSource({ kind: "game" }, oversizedDataUrl)
      expect(resizeImageToWebP).toHaveBeenCalledWith(expect.any(File), 256)
      expect(upload).toHaveBeenCalledTimes(1)
    })

    it("useAiUpscale 옵션이 켜져 있으면 업스케일러 파이프라인을 경유한다", async () => {
      const validDataUrl = `data:image/webp;base64,${bytesToBase64(createValidWebpBytes(14))}`
      convertIconSourceToDataUrlWithUpscale.mockResolvedValueOnce(validDataUrl)

      const file = new File(["small"], "small.png", { type: "image/png" })
      await uploadGameAssetFromSource({ kind: "character", gameId: "game-1" }, file, { useAiUpscale: true })
      expect(convertIconSourceToDataUrlWithUpscale).toHaveBeenCalledWith(file, true)
      expect(upload).toHaveBeenCalledTimes(1)
    })

    it("Storage 업로드 실패나 잘못된 gameId 입력 시 오류를 던진다", async () => {
      const dataUrl = `data:image/webp;base64,${bytesToBase64(createValidWebpBytes(8))}`
      await expect(uploadGameAssetFromSource({ kind: "character", gameId: "../bad" }, dataUrl)).rejects.toThrow(
        "유효한 게임 ID가 필요합니다.",
      )

      upload.mockResolvedValueOnce({ data: null, error: { message: "permission denied" } })
      await expect(uploadGameAssetFromSource({ kind: "game" }, dataUrl)).rejects.toThrow(
        "아이콘 Storage 업로드에 실패했습니다: permission denied",
      )
    })
  })
})
