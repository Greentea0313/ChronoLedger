import { beforeEach, describe, expect, it, vi } from "vitest"

const { convertIconSourceToDataUrl } = vi.hoisted(() => ({
  convertIconSourceToDataUrl: vi.fn(async () => "fallback-data-url"),
}))

vi.mock("@/lib/image-resizer", () => ({
  convertIconSourceToDataUrl,
  resizeImageToWebP: vi.fn(),
}))

import { convertIconSourceToDataUrlWithUpscale, isDesktopAiUpscaleAvailable, isLowResolutionImage } from "./image-upscaler"

describe("image-upscaler", () => {
  beforeEach(() => {
    convertIconSourceToDataUrl.mockClear()
  })

  it("detects an image as low resolution when either side is below 256px", () => {
    expect(isLowResolutionImage(255, 512)).toBe(true)
    expect(isLowResolutionImage(512, 255)).toBe(true)
    expect(isLowResolutionImage(256, 256)).toBe(false)
  })

  it("requires a desktop browser with WebAssembly and WebGL", () => {
    expect(isDesktopAiUpscaleAvailable()).toBe(false)
  })

  it("uses the existing converter for URL sources", async () => {
    await expect(convertIconSourceToDataUrlWithUpscale("https://example.com/icon.png", true)).resolves.toBe("fallback-data-url")
    expect(convertIconSourceToDataUrl).toHaveBeenCalledWith("https://example.com/icon.png")
  })

  it("uses the existing converter when AI upscaling is disabled", async () => {
    const file = new File(["icon"], "icon.png", { type: "image/png" })
    await expect(convertIconSourceToDataUrlWithUpscale(file, false)).resolves.toBe("fallback-data-url")
    expect(convertIconSourceToDataUrl).toHaveBeenCalledWith(file)
  })
})
