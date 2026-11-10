import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { convertIconSourceToDataUrl } = vi.hoisted(() => ({
  convertIconSourceToDataUrl: vi.fn(async () => "fallback-data-url"),
}))

vi.mock("@/lib/image-resizer", () => ({
  convertIconSourceToDataUrl,
  resizeImageToWebP: vi.fn(),
}))

import {
  MODEL_OFFSET,
  MODEL_SCALE,
  MODEL_URL,
  buildPaddedInput,
  convertIconSourceToDataUrlWithUpscale,
  getUpscalerSessionForTests,
  isDesktopAiUpscaleAvailable,
  isLowResolutionImage,
  outputToRgba,
  setOrtLoaderForTests,
  type OrtModule,
} from "./image-upscaler"

function fakeOrt(create = vi.fn(async () => ({ inputNames: ["x"], outputNames: ["y"], run: vi.fn() }))) {
  const ort = {
    env: { wasm: {} as { wasmPaths?: string; numThreads?: number } },
    Tensor: vi.fn(),
    InferenceSession: { create },
  }
  return { ort: ort as unknown as OrtModule, create, env: ort.env }
}

describe("image-upscaler", () => {
  const originalUserAgent = navigator.userAgent

  beforeEach(() => {
    convertIconSourceToDataUrl.mockClear()
  })

  afterEach(() => {
    Object.defineProperty(window.navigator, "userAgent", { value: originalUserAgent, configurable: true })
  })

  it("detects an image as low resolution when either side is below 256px", () => {
    expect(isLowResolutionImage(255, 512)).toBe(true)
    expect(isLowResolutionImage(512, 255)).toBe(true)
    expect(isLowResolutionImage(256, 256)).toBe(false)
  })

  it("is available on desktop browsers with WebAssembly and never on mobile user agents", () => {
    Object.defineProperty(window.navigator, "userAgent", { value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", configurable: true })
    expect(isDesktopAiUpscaleAvailable()).toBe(true)
    Object.defineProperty(window.navigator, "userAgent", { value: "Mozilla/5.0 (Linux; Android 14) Mobile", configurable: true })
    expect(isDesktopAiUpscaleAvailable()).toBe(false)
  })

  it("uses the existing converter for URL sources and when AI upscaling is disabled", async () => {
    await expect(convertIconSourceToDataUrlWithUpscale("https://example.com/icon.png", true)).resolves.toBe("fallback-data-url")
    expect(convertIconSourceToDataUrl).toHaveBeenCalledWith("https://example.com/icon.png")
    const file = new File(["icon"], "icon.png", { type: "image/png" })
    await expect(convertIconSourceToDataUrlWithUpscale(file, false)).resolves.toBe("fallback-data-url")
    expect(convertIconSourceToDataUrl).toHaveBeenCalledWith(file)
  })

  it("creates one wasm-backed session from the static runtime path and reuses it", async () => {
    const { ort, create, env } = fakeOrt()
    const loader = vi.fn(async () => ort)
    setOrtLoaderForTests(loader)

    const first = await getUpscalerSessionForTests()
    const second = await getUpscalerSessionForTests()

    expect(first).toBe(second)
    expect(loader).toHaveBeenCalledTimes(1)
    expect(create).toHaveBeenCalledTimes(1)
    expect(create).toHaveBeenCalledWith(MODEL_URL, { executionProviders: ["wasm"] })
    expect(env.wasm).toEqual({ wasmPaths: "/ort/", numThreads: 1 })
  })

  it("clears the cached session after a failed model load so a later attempt can retry", async () => {
    const create = vi.fn()
      .mockRejectedValueOnce(new Error("404"))
      .mockResolvedValueOnce({ inputNames: ["x"], outputNames: ["y"], run: vi.fn() })
    const { ort } = fakeOrt(create)
    setOrtLoaderForTests(async () => ort)

    await expect(getUpscalerSessionForTests()).rejects.toThrow("404")
    await expect(getUpscalerSessionForTests()).resolves.toBeTruthy()
    expect(create).toHaveBeenCalledTimes(2)
  })

  it("pads the input by edge replication, scales to 0..1 and composites transparency onto white", () => {
    // 2x2 RGBA: red, green / blue, fully transparent black.
    const rgba = [255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 0, 0, 0, 0]
    const input = buildPaddedInput(rgba, 2, 1)
    const padded = 4
    const plane = padded * padded
    const at = (channel: number, y: number, x: number) => input[channel * plane + y * padded + x]
    expect(input).toHaveLength(plane * 3)
    // Corner replicates the nearest source pixel (red).
    expect([at(0, 0, 0), at(1, 0, 0), at(2, 0, 0)]).toEqual([1, 0, 0])
    // Right edge of row 1 replicates green.
    expect([at(0, 1, 3), at(1, 1, 3), at(2, 1, 3)]).toEqual([0, 1, 0])
    // The transparent pixel becomes white.
    expect([at(0, 2, 2), at(1, 2, 2), at(2, 2, 2)]).toEqual([1, 1, 1])
  })

  it("matches the waifu2x scale2x contract: padding offset/scale per side yields exactly twice the size", () => {
    const size = 100
    const pad = MODEL_OFFSET / MODEL_SCALE
    expect(pad).toBe(18)
    expect((size + pad * 2) * MODEL_SCALE - MODEL_OFFSET * 2).toBe(size * MODEL_SCALE)
  })

  it("converts the [1,3,H,W] output to RGBA, keeps the upscaled alpha and rejects unexpected shapes", () => {
    const output = { data: [1, 0, 0, 0.5, 0, 1, 0, 0.5, 0, 0, 1, 0.5], dims: [1, 3, 2, 2] }
    const alpha = [0, 0, 0, 255, 0, 0, 0, 128, 0, 0, 0, 0, 0, 0, 0, 64]
    const rgba = outputToRgba(output, 2, alpha)
    expect(Array.from(rgba.slice(0, 4))).toEqual([255, 0, 0, 255])
    expect(Array.from(rgba.slice(12, 16))).toEqual([128, 128, 128, 64])
    expect(() => outputToRgba({ data: [], dims: [1, 3, 4, 4] }, 2, null)).toThrow("AI 업스케일 결과 형식이 올바르지 않습니다.")
  })
})
