import { beforeEach, describe, expect, it, vi } from "vitest"
import { extractClipboardImageUrl, INVALID_IMAGE_SOURCE_MESSAGE, resolveImageSource } from "./image-source"

const { fetchImageFile } = vi.hoisted(() => ({ fetchImageFile: vi.fn() }))
vi.mock("@/lib/image-resizer", () => ({ fetchImageFile }))

describe("resolveImageSource", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns a file source as is", async () => {
    const file = new File(["x"], "a.png", { type: "image/png" })
    await expect(resolveImageSource({ kind: "file", file }, 256)).resolves.toBe(file)
    expect(fetchImageFile).not.toHaveBeenCalled()
  })

  it("decodes an image data URL to a File instead of passing the string through", async () => {
    const result = await resolveImageSource({ kind: "text", text: " data:image/webp;base64,UklGRg== " }, 256)
    expect(result).toBeInstanceOf(File)
    expect(result.type).toBe("image/webp")
    expect(fetchImageFile).not.toHaveBeenCalled()
  })

  it("fetches an http(s) URL through fetchImageFile with the fetch size", async () => {
    const fetched = new File(["x"], "game-icon", { type: "image/png" })
    fetchImageFile.mockResolvedValue(fetched)
    await expect(resolveImageSource({ kind: "text", text: " https://example.com/a.png " }, 64)).resolves.toBe(fetched)
    expect(fetchImageFile).toHaveBeenCalledWith("https://example.com/a.png", 64)
  })

  it("rejects other text with the guidance message", async () => {
    await expect(resolveImageSource({ kind: "text", text: "not an url" }, 256)).rejects.toThrow(INVALID_IMAGE_SOURCE_MESSAGE)
    await expect(resolveImageSource({ kind: "text", text: "javascript:alert(1)" }, 256)).rejects.toThrow(INVALID_IMAGE_SOURCE_MESSAGE)
  })
})

describe("extractClipboardImageUrl", () => {
  const clip = (html: string) => ({ getData: (type: string) => (type === "text/html" ? html : "") })

  it("returns the original http(s) address of a pasted browser image", () => {
    expect(extractClipboardImageUrl(clip('<meta charset="utf-8"><img src="https://cdn.example.com/a.png" alt="x">'))).toBe("https://cdn.example.com/a.png")
  })

  it("ignores html without an image, non-http addresses and an empty clipboard", () => {
    expect(extractClipboardImageUrl(clip("<p>text</p>"))).toBeNull()
    expect(extractClipboardImageUrl(clip('<img src="data:image/png;base64,AAAA">'))).toBeNull()
    expect(extractClipboardImageUrl(clip('<img src="blob:https://x/1">'))).toBeNull()
    expect(extractClipboardImageUrl(clip(""))).toBeNull()
  })
})
