import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  CLASSIFICATION_ICON_SIZE,
  MAX_CLASSIFICATION_ICON_DATA_URL_LENGTH,
  classificationIconKey,
  createClassificationIconDataUrl,
  isMissingClassificationIconTable,
  loadClassificationIcons,
} from "./classification-icons"

const { from, resizeImageToWebP } = vi.hoisted(() => ({ from: vi.fn(), resizeImageToWebP: vi.fn() }))

vi.mock("@/lib/supabase/client", () => ({ supabase: { from } }))
vi.mock("@/lib/image-resizer", () => ({ resizeImageToWebP }))

describe("classificationIconKey", () => {
  it("joins axis key and option with a separator that axis keys ([a-z0-9_]) cannot contain", () => {
    expect(classificationIconKey("element", "화염")).toBe("element\u0000화염")
    expect(classificationIconKey("a", "bc")).not.toBe(classificationIconKey("ab", "c"))
  })
})

describe("isMissingClassificationIconTable", () => {
  it("recognises undefined_table and the PostgREST schema-cache miss only", () => {
    expect(isMissingClassificationIconTable({ code: "42P01" })).toBe(true)
    expect(isMissingClassificationIconTable({ code: "PGRST205" })).toBe(true)
    expect(isMissingClassificationIconTable({ code: "42501" })).toBe(false)
    expect(isMissingClassificationIconTable({})).toBe(false)
    expect(isMissingClassificationIconTable(null)).toBe(false)
  })
})

describe("loadClassificationIcons", () => {
  const mockSelect = (result: unknown) => {
    const eq = vi.fn().mockResolvedValue(result)
    const select = vi.fn().mockReturnValue({ eq })
    from.mockReturnValue({ select })
    return { select, eq }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => undefined)
  })

  it("selects the icons of one game into a map keyed by axis and option", async () => {
    const { select, eq } = mockSelect({
      data: [
        { axis_key: "element", option_value: "화염", icon_data_url: "data:image/webp;base64,A" },
        { axis_key: "weapon", option_value: "직검", icon_data_url: "data:image/webp;base64,B" },
      ],
      error: null,
    })

    const result = await loadClassificationIcons("game-1")

    expect(from).toHaveBeenCalledWith("game_classification_icons")
    expect(select).toHaveBeenCalledWith("axis_key, option_value, icon_data_url")
    expect(eq).toHaveBeenCalledWith("game_id", "game-1")
    expect(result.available).toBe(true)
    expect(result.icons.get(classificationIconKey("element", "화염"))).toBe("data:image/webp;base64,A")
    expect(result.icons.get(classificationIconKey("weapon", "직검"))).toBe("data:image/webp;base64,B")
    expect(result.icons.size).toBe(2)
  })

  it("is available with an empty map when the game has no icons", async () => {
    mockSelect({ data: null, error: null })

    const result = await loadClassificationIcons("game-1")

    expect(result.available).toBe(true)
    expect(result.icons.size).toBe(0)
  })

  it("is unavailable without logging when the table is missing (42P01 / PGRST205)", async () => {
    mockSelect({ data: null, error: { code: "42P01", message: "missing" } })
    expect((await loadClassificationIcons("game-1")).available).toBe(false)
    mockSelect({ data: null, error: { code: "PGRST205", message: "missing" } })
    expect((await loadClassificationIcons("game-1")).available).toBe(false)

    expect(console.error).not.toHaveBeenCalled()
  })

  it("is unavailable and logs for any other error or a thrown rejection", async () => {
    mockSelect({ data: null, error: { code: "XX000", message: "boom" } })
    const failed = await loadClassificationIcons("game-1")
    expect(failed.available).toBe(false)
    expect(failed.icons.size).toBe(0)

    from.mockImplementation(() => {
      throw new Error("network")
    })
    expect((await loadClassificationIcons("game-1")).available).toBe(false)
    expect(console.error).toHaveBeenCalledTimes(2)
  })
})

describe("createClassificationIconDataUrl", () => {
  const file = new File(["x"], "icon.png", { type: "image/png" })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("always resizes to 64x64 and returns a WebP Data URL", async () => {
    resizeImageToWebP.mockResolvedValue(new Blob(["webp"], { type: "image/webp" }))

    const dataUrl = await createClassificationIconDataUrl(file)

    expect(CLASSIFICATION_ICON_SIZE).toBe(64)
    expect(resizeImageToWebP).toHaveBeenCalledWith(file, 64)
    expect(dataUrl.startsWith("data:image/webp;base64,")).toBe(true)
  })

  it("rejects a result longer than 20,000 characters", async () => {
    resizeImageToWebP.mockResolvedValue(new Blob([new Uint8Array(MAX_CLASSIFICATION_ICON_DATA_URL_LENGTH)], { type: "image/webp" }))

    await expect(createClassificationIconDataUrl(file)).rejects.toThrow(/용량이 너무 큽니다/)
  })

  it("passes resizer errors through", async () => {
    resizeImageToWebP.mockRejectedValue(new Error("PNG, JPG, JPEG, WebP 형식의 이미지만 지원합니다."))

    await expect(createClassificationIconDataUrl(file)).rejects.toThrow("PNG, JPG, JPEG, WebP 형식의 이미지만 지원합니다.")
  })
})
