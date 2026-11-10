import { convertIconSourceToDataUrl, resizeImageToWebP } from "@/lib/image-resizer"

// R60: desktop-only waifu2x upscaling for low-resolution icons, with the canvas resizer as the fallback.
// Model contract (docs/upscaler-model.md): waifu2x cunet/art scale2x, input "x" [1,3,H,W] float 0..1 (RGB, NCHW),
// output "y" [1,3,2H-72,2W-72]; replicating 18px (offset 36 / scale 2) on each side yields exactly 2H x 2W.
const UPSCALE_SIZE = 256
export const MODEL_URL = "/models/waifu2x/cunet_art_scale2x.onnx"
export const MODEL_SCALE = 2
export const MODEL_OFFSET = 36
const INPUT_PAD = MODEL_OFFSET / MODEL_SCALE
// Wasm-only ONNX Runtime copied to public/ort/ by next.config.mjs; loaded at runtime so webpack never bundles it.
const ORT_SCRIPT_URL = "/ort/ort.wasm.bundle.min.mjs"
const ORT_WASM_PATH = "/ort/"
export const ORT_EXECUTION_PROVIDERS = ["wasm"] as const

type OrtTensor = {
  data: ArrayLike<number>
  dims: readonly number[]
}

type OrtSession = {
  inputNames: readonly string[]
  outputNames: readonly string[]
  run(feeds: Record<string, OrtTensor>): Promise<Record<string, OrtTensor>>
}

export type OrtModule = {
  env: { wasm: { wasmPaths?: string; numThreads?: number } }
  Tensor: new (type: "float32", data: Float32Array, dims: number[]) => OrtTensor
  InferenceSession: { create(modelUrl: string, options: { executionProviders: string[] }): Promise<OrtSession> }
}

let loadOrt: () => Promise<OrtModule> = () =>
  import(/* webpackIgnore: true */ /* @vite-ignore */ ORT_SCRIPT_URL) as Promise<OrtModule>
let runtimePromise: Promise<{ ort: OrtModule; session: OrtSession }> | null = null

/** Test seam: replaces the runtime loader and clears the cached session. */
export function setOrtLoaderForTests(loader: () => Promise<OrtModule>): void {
  loadOrt = loader
  runtimePromise = null
}

export function isLowResolutionImage(width: number, height: number): boolean {
  return width < UPSCALE_SIZE || height < UPSCALE_SIZE
}

export function isDesktopAiUpscaleAvailable(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false
  if (/Android|webOS|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) return false
  if (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent)) return false
  return typeof WebAssembly !== "undefined"
}

/** True when the selected file decodes to an image smaller than 256px on either side (drives the toggle). */
export async function isLowResolutionFile(file: File): Promise<boolean> {
  try {
    const image = await loadImage(file)
    return isLowResolutionImage(image.naturalWidth || image.width, image.naturalHeight || image.height)
  } catch {
    return false
  }
}

export async function convertIconSourceToDataUrlWithUpscale(
  source: File | string,
  useAiUpscale: boolean,
): Promise<string> {
  if (!useAiUpscale || typeof source === "string" || !isDesktopAiUpscaleAvailable()) {
    return convertIconSourceToDataUrl(source)
  }

  try {
    const image = await loadImage(source)
    if (!isLowResolutionImage(image.naturalWidth || image.width, image.naturalHeight || image.height)) {
      return convertIconSourceToDataUrl(source)
    }
    const upscaled = await upscaleWithWaifu2x(image)
    // The existing pipeline produces the final 256x256 WebP (size cap included).
    return await convertIconSourceToDataUrl(new File([upscaled], "upscaled.png", { type: "image/png" }))
  } catch {
    return convertIconSourceToDataUrl(source)
  }
}

function getRuntime(): Promise<{ ort: OrtModule; session: OrtSession }> {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      const ort = await loadOrt()
      ort.env.wasm.wasmPaths = ORT_WASM_PATH
      ort.env.wasm.numThreads = 1
      const session = await ort.InferenceSession.create(MODEL_URL, { executionProviders: [...ORT_EXECUTION_PROVIDERS] })
      return { ort, session }
    })().catch((error: unknown) => {
      runtimePromise = null
      throw error
    })
  }
  return runtimePromise
}

/**
 * RGBA (size x size) -> model input [3, size+2*pad, size+2*pad] in 0..1 with edge replication.
 * Transparent pixels are composited onto white like the official waifu2x web app; alpha is restored separately.
 */
export function buildPaddedInput(rgba: ArrayLike<number>, size: number, pad: number): Float32Array {
  const padded = size + pad * 2
  const plane = padded * padded
  const input = new Float32Array(plane * 3)
  for (let y = 0; y < padded; y += 1) {
    const sourceY = Math.min(size - 1, Math.max(0, y - pad))
    for (let x = 0; x < padded; x += 1) {
      const sourceX = Math.min(size - 1, Math.max(0, x - pad))
      const source = (sourceY * size + sourceX) * 4
      const alpha = rgba[source + 3] / 255
      const target = y * padded + x
      for (let channel = 0; channel < 3; channel += 1) {
        input[channel * plane + target] = alpha * (rgba[source + channel] / 255) + (1 - alpha)
      }
    }
  }
  return input
}

/** Model output [1,3,size,size] (0..1) + upscaled alpha -> RGBA bytes. */
export function outputToRgba(output: OrtTensor, size: number, alpha: ArrayLike<number> | null): Uint8ClampedArray {
  const [batch, channels, height, width] = output.dims
  if (output.dims.length !== 4 || batch !== 1 || channels !== 3 || height !== size || width !== size) {
    throw new Error("AI 업스케일 결과 형식이 올바르지 않습니다.")
  }
  const plane = size * size
  const rgba = new Uint8ClampedArray(plane * 4)
  for (let index = 0; index < plane; index += 1) {
    rgba[index * 4] = Math.round(output.data[index] * 255)
    rgba[index * 4 + 1] = Math.round(output.data[plane + index] * 255)
    rgba[index * 4 + 2] = Math.round(output.data[plane * 2 + index] * 255)
    rgba[index * 4 + 3] = alpha ? alpha[index * 4 + 3] : 255
  }
  return rgba
}

async function upscaleWithWaifu2x(image: HTMLImageElement): Promise<Blob> {
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height
  const size = Math.min(width, height)
  const source = createCanvas(size)
  source.context.drawImage(image, (width - size) / 2, (height - size) / 2, size, size, 0, 0, size, size)
  const rgba = source.context.getImageData(0, 0, size, size).data

  const { ort, session } = await getRuntime()
  const padded = size + INPUT_PAD * 2
  const feeds = { [session.inputNames[0]]: new ort.Tensor("float32", buildPaddedInput(rgba, size, INPUT_PAD), [1, 3, padded, padded]) }
  const output = (await session.run(feeds))[session.outputNames[0]]

  const outputSize = size * MODEL_SCALE
  // Alpha is upscaled with the browser's bilinear filter and recombined, so transparent icons stay transparent.
  const alphaCanvas = createCanvas(outputSize)
  alphaCanvas.context.imageSmoothingEnabled = true
  alphaCanvas.context.drawImage(source.canvas, 0, 0, size, size, 0, 0, outputSize, outputSize)
  const alpha = alphaCanvas.context.getImageData(0, 0, outputSize, outputSize).data

  const result = createCanvas(outputSize)
  const imageData = result.context.createImageData(outputSize, outputSize)
  imageData.data.set(outputToRgba(output, outputSize, alpha))
  result.context.putImageData(imageData, 0, 0)
  return new Promise((resolve, reject) => {
    result.canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("이미지 변환에 실패했습니다."))), "image/png")
  })
}

function createCanvas(size: number): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Canvas를 지원하지 않는 브라우저입니다.")
  return { canvas, context }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("이미지를 읽을 수 없습니다."))
    }
    image.src = url
  })
}

/** Exposed for tests: runs the cached session once (creates it on first use). */
export async function getUpscalerSessionForTests(): Promise<unknown> {
  return (await getRuntime()).session
}

export { resizeImageToWebP }
