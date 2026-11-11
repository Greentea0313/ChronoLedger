import { beforeEach, describe, expect, it, vi } from "vitest"
import { DuplicatePickupNameError, ICON_MIGRATION_PENDING_MESSAGE, isIconRequiredByUnappliedMigration, registerPickupOnlyCharacter } from "./pickup-character-registration"

const { from, convertIconSourceToDataUrlWithUpscale } = vi.hoisted(() => ({
  from: vi.fn(),
  convertIconSourceToDataUrlWithUpscale: vi.fn(),
}))

vi.mock("@/lib/supabase/client", () => ({ supabase: { from } }))
vi.mock("@/lib/image-upscaler", () => ({ convertIconSourceToDataUrlWithUpscale }))

describe("registerPickupOnlyCharacter", () => {
  let insert: ReturnType<typeof vi.fn>
  let single: ReturnType<typeof vi.fn>

  const input = (overrides: Partial<Parameters<typeof registerPickupOnlyCharacter>[0]> = {}) => ({
    gameId: "game-1",
    name: "  신규 픽업  ",
    imageSource: null,
    existingCharacters: [{ game_id: "game-1", name: "기존" }],
    useAiUpscale: true,
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true })
    single = vi.fn().mockResolvedValue({
      data: { id: "c1", game_id: "game-1", name: "신규 픽업", rarity: null, default_icon_url: null, is_pickup_only: true },
      error: null,
    })
    const select = vi.fn().mockReturnValue({ single })
    insert = vi.fn().mockReturnValue({ select })
    from.mockReturnValue({ insert })
  })

  it("inserts a trimmed name as a pickup-only character without an icon", async () => {
    const created = await registerPickupOnlyCharacter(input())

    expect(from).toHaveBeenCalledWith("game_characters")
    expect(insert).toHaveBeenCalledWith({ game_id: "game-1", name: "신규 픽업", default_icon_url: null, is_pickup_only: true })
    expect(convertIconSourceToDataUrlWithUpscale).not.toHaveBeenCalled()
    expect(created).toEqual({ id: "c1", game_id: "game-1", name: "신규 픽업", rarity: null, attributes: {}, default_icon_url: null, is_pickup_only: true })
  })

  it("converts a file or URL source with the AI upscale flag and stores the WebP data URL", async () => {
    convertIconSourceToDataUrlWithUpscale.mockResolvedValue("data:image/webp;base64,ok")
    const file = new File(["x"], "icon.png", { type: "image/png" })

    await registerPickupOnlyCharacter(input({ imageSource: file, useAiUpscale: false }))
    await registerPickupOnlyCharacter(input({ imageSource: "  https://example.com/a.png  " }))

    expect(convertIconSourceToDataUrlWithUpscale).toHaveBeenNthCalledWith(1, file, false)
    expect(convertIconSourceToDataUrlWithUpscale).toHaveBeenNthCalledWith(2, "https://example.com/a.png", true)
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ default_icon_url: "data:image/webp;base64,ok" }))
  })

  it("treats a blank image string as no image", async () => {
    await registerPickupOnlyCharacter(input({ imageSource: "   " }))
    expect(convertIconSourceToDataUrlWithUpscale).not.toHaveBeenCalled()
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ default_icon_url: null }))
  })

  it("rejects empty and over-long names before touching the network", async () => {
    await expect(registerPickupOnlyCharacter(input({ name: "   " }))).rejects.toThrow("캐릭터 이름을 1~100자로 입력해 주세요.")
    await expect(registerPickupOnlyCharacter(input({ name: "가".repeat(101) }))).rejects.toThrow("캐릭터 이름을 1~100자로 입력해 주세요.")
    expect(insert).not.toHaveBeenCalled()
  })

  it("rejects a duplicate name in the same game only", async () => {
    await expect(registerPickupOnlyCharacter(input({ name: "기존" }))).rejects.toThrow(new DuplicatePickupNameError())
    expect(insert).not.toHaveBeenCalled()

    await expect(registerPickupOnlyCharacter(input({ name: "기존", gameId: "game-2" }))).resolves.toBeTruthy()
  })

  it("blocks writes while offline", async () => {
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true })
    await expect(registerPickupOnlyCharacter(input())).rejects.toThrow(/오프라인 상태에서는 저장할 수 없습니다/)
    expect(insert).not.toHaveBeenCalled()
  })

  it("rejects an oversized converted icon before saving", async () => {
    convertIconSourceToDataUrlWithUpscale.mockResolvedValue(`data:image/webp;base64,${"A".repeat(150_000)}`)
    await expect(registerPickupOnlyCharacter(input({ imageSource: "https://example.com/big.png" }))).rejects.toThrow(/이미지 용량이 너무 큽니다/)
    expect(insert).not.toHaveBeenCalled()
  })

  it("maps a unique-violation to the duplicate message and other errors to a generic one", async () => {
    single.mockResolvedValueOnce({ data: null, error: { code: "23505", message: "dup" } })
    await expect(registerPickupOnlyCharacter(input())).rejects.toThrow("같은 이름의 캐릭터가 이미 있습니다.")

    single.mockResolvedValueOnce({ data: null, error: { code: "42501", message: "denied" } })
    await expect(registerPickupOnlyCharacter(input())).rejects.toThrow("픽업 캐릭터를 등록하지 못했습니다: denied")

    single.mockResolvedValueOnce({ data: null, error: null })
    await expect(registerPickupOnlyCharacter(input())).rejects.toThrow("픽업 캐릭터를 등록하지 못했습니다: 알 수 없는 오류")
  })
})

describe("isIconRequiredByUnappliedMigration (R88)", () => {
  it("recognises the old icon CHECK (23514) and the old approve_character_request exception", () => {
    expect(isIconRequiredByUnappliedMigration({ code: "23514", message: 'violates check constraint "chk_game_characters_icon_or_pickup_only"' })).toBe(true)
    expect(isIconRequiredByUnappliedMigration({ message: "캐릭터 아이콘이 필요합니다." })).toBe(true)
  })

  it("ignores other errors and non-objects", () => {
    expect(isIconRequiredByUnappliedMigration({ code: "23514", message: 'violates check constraint "chk_game_characters_icon_valid"' })).toBe(false)
    expect(isIconRequiredByUnappliedMigration({ code: "23505", message: "duplicate" })).toBe(false)
    expect(isIconRequiredByUnappliedMigration(null)).toBe(false)
    expect(isIconRequiredByUnappliedMigration("캐릭터 아이콘이 필요합니다.")).toBe(false)
    expect(ICON_MIGRATION_PENDING_MESSAGE).toContain("업데이트 적용 전에는 아이콘이 필요합니다.")
  })
})
