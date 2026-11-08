import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { upload, download, remove, from } = vi.hoisted(() => {
  const upload = vi.fn()
  const download = vi.fn()
  const remove = vi.fn()
  const from = vi.fn(() => ({ upload, download, remove }))
  return { upload, download, remove, from }
})

vi.mock("@/lib/supabase/client", () => ({ supabase: { storage: { from } } }))

import {
  clearUserIconCache,
  deleteCustomCharacterIcon,
  deleteUserIcon,
  downloadUserIcon,
  getCustomCharacterIconPath,
  getCustomCharacterIconUrl,
  uploadCustomCharacterIcon,
  uploadUserIcon,
} from "./storage-upload"

const USER_ID = "user-1"
const CHARACTER_ID = "char-1"
const CHARACTER_PATH = `${USER_ID}/characters/${CHARACTER_ID}.webp`

describe("storage-upload (R13 custom character icons)", () => {
  let objectUrlCounter = 0
  const originalCreateObjectURL = URL.createObjectURL
  const originalRevokeObjectURL = URL.revokeObjectURL

  beforeEach(() => {
    objectUrlCounter = 0
    URL.createObjectURL = vi.fn(() => `blob:mock-${++objectUrlCounter}`)
    URL.revokeObjectURL = vi.fn()
    upload.mockResolvedValue({ error: null })
    remove.mockResolvedValue({ error: null })
    download.mockResolvedValue({ data: new Blob(["x"]), error: null })
  })

  afterEach(() => {
    clearUserIconCache()
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
    vi.clearAllMocks()
  })

  it("builds the character icon path as {userId}/characters/{characterId}.webp", () => {
    expect(getCustomCharacterIconPath(USER_ID, CHARACTER_ID)).toBe(CHARACTER_PATH)
  })

  it("uploads a character icon to the private user-icons bucket with upsert", async () => {
    const blob = new Blob(["webp"], { type: "image/webp" })
    await uploadCustomCharacterIcon(USER_ID, CHARACTER_ID, blob)

    expect(from).toHaveBeenCalledWith("user-icons")
    expect(upload).toHaveBeenCalledWith(CHARACTER_PATH, blob, { contentType: "image/webp", upsert: true })
  })

  it("keeps the game icon path unchanged", async () => {
    const blob = new Blob(["webp"], { type: "image/webp" })
    await uploadUserIcon(USER_ID, "game-1", blob)

    expect(upload).toHaveBeenCalledWith(`${USER_ID}/game-1.webp`, blob, { contentType: "image/webp", upsert: true })
  })

  it("downloads a character icon by its full object path and caches the object URL", async () => {
    const first = await getCustomCharacterIconUrl(USER_ID, CHARACTER_ID)
    const second = await getCustomCharacterIconUrl(USER_ID, CHARACTER_ID)

    expect(download).toHaveBeenCalledTimes(1)
    expect(download).toHaveBeenCalledWith(CHARACTER_PATH)
    expect(first).toBe("blob:mock-1")
    expect(second).toBe(first)
  })

  it("does not share cache entries between a game icon and a character icon", async () => {
    // A game id equal to a character id must not collide because character keys use the full object path.
    const gameUrl = await downloadUserIcon(USER_ID, CHARACTER_ID)
    const characterUrl = await getCustomCharacterIconUrl(USER_ID, CHARACTER_ID)

    expect(download).toHaveBeenCalledTimes(2)
    expect(download).toHaveBeenNthCalledWith(1, `${USER_ID}/${CHARACTER_ID}.webp`)
    expect(download).toHaveBeenNthCalledWith(2, CHARACTER_PATH)
    expect(gameUrl).not.toBe(characterUrl)
  })

  it("returns null and caches the miss when the object does not exist", async () => {
    download.mockResolvedValue({ data: null, error: { name: "StorageApiError", message: "Object not found" } })

    expect(await getCustomCharacterIconUrl(USER_ID, CHARACTER_ID)).toBeNull()
    expect(await getCustomCharacterIconUrl(USER_ID, CHARACTER_ID)).toBeNull()
    expect(download).toHaveBeenCalledTimes(1)
  })

  it("throws on unexpected download errors", async () => {
    download.mockResolvedValue({ data: null, error: { name: "Other", message: "boom" } })

    await expect(getCustomCharacterIconUrl(USER_ID, CHARACTER_ID)).rejects.toThrow("이미지 다운로드에 실패했습니다")
  })

  it("replaces the cached object URL after a re-upload", async () => {
    const before = await getCustomCharacterIconUrl(USER_ID, CHARACTER_ID)
    await uploadCustomCharacterIcon(USER_ID, CHARACTER_ID, new Blob(["new"]))
    const after = await getCustomCharacterIconUrl(USER_ID, CHARACTER_ID)

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(before)
    expect(after).not.toBe(before)
    expect(download).toHaveBeenCalledTimes(1)
  })

  it("removes the character icon object and clears its cache entry", async () => {
    await getCustomCharacterIconUrl(USER_ID, CHARACTER_ID)
    await deleteCustomCharacterIcon(USER_ID, CHARACTER_ID)

    expect(remove).toHaveBeenCalledWith([CHARACTER_PATH])

    await getCustomCharacterIconUrl(USER_ID, CHARACTER_ID)
    expect(download).toHaveBeenCalledTimes(2)
  })

  it("keeps the game icon delete path unchanged", async () => {
    await deleteUserIcon(USER_ID, "game-1")

    expect(remove).toHaveBeenCalledWith([`${USER_ID}/game-1.webp`])
  })

  it("surfaces upload and delete errors", async () => {
    upload.mockResolvedValue({ error: { message: "denied" } })
    remove.mockResolvedValue({ error: { message: "denied" } })

    await expect(uploadCustomCharacterIcon(USER_ID, CHARACTER_ID, new Blob(["x"]))).rejects.toThrow("이미지 업로드에 실패했습니다")
    await expect(deleteCustomCharacterIcon(USER_ID, CHARACTER_ID)).rejects.toThrow("이미지 삭제에 실패했습니다")
  })
})
