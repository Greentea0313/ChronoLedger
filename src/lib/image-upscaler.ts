import { convertIconSourceToDataUrl, resizeImageToWebP } from "@/lib/image-resizer"

const UPSCALE_SIZE = 256
const MODEL_URL = "/models/waifu2x.onnx"

type OrtTensor = {
  data: ArrayLike<number>
  dims: readonly number[]
}

type OrtSession = {
  inputNames: readonly string[]
  outputNames: readonly string[]
  run(feeds: Record<string, OrtTensor>): Promise<Record<string, OrtTensor>>
}

type OrtModule = {
  Tensor: new (type: "float32", data: Float32Array, dims: number[]) => OrtTensor
  InferenceSession: { create(modelUrl: string, options: { executionProviders: string[] }): Promise<OrtSession> }
}

export function isLowResolutionImage(width: number, height: number): boolean {
  return width < UPSCALE_SIZE || height < UPSCALE_SIZE
}

export function isDesktopAiUpscaleAvailable(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined" || typeof document === "undefined") return false
  if (/Android|webOS|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) return false
  if (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent)) return false
  if (typeof WebAssembly === "undefined") return false
  const canvas = document.createElement("canvas")
  return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"))
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
    if (!isLowResolutionImage(image.width, image.height)) {
      return convertIconSourceToDataUrl(source)
    }

    const upscaled = await runWaifu2x(image)
    return readBlobAsDataUrl(upscaled)
  } catch {
    return convertIconSourceToDataUrl(source)
  }
}

async function loadOrt(): Promise<OrtModule> {
  return import("onnxruntime-web") as Promise<OrtModule>
}

async function runWaifu2x(image: HTMLImageElement): Promise<Blob> {
  const ort = await loadOrt()
  const inputSize = Math.min(image.naturalWidth || image.width, image.naturalHeight || image.height)
  const sourceCanvas = document.createElement("canvas")
  sourceCanvas.width = inputSize
  sourceCanvas.height = inputSize
  const sourceContext = sourceCanvas.getContext("2d")
  if (!sourceContext) throw new Error("Canvas를 지원하지 않는 브라우저입니다.")
  sourceContext.drawImage(
    image,
    ((image.naturalWidth || image.width) - inputSize) / 2,
    ((image.naturalHeight || image.height) - inputSize) / 2,
    inputSize,
    inputSize,
    0,
    0,
    inputSize,
    inputSize,
  )
  const pixels = sourceContext.getImageData(0, 0, inputSize, inputSize).data
  const input = new Float32Array(3 * inputSize * inputSize)
  for (let index = 0; index < inputSize * inputSize; index += 1) {
    input[index] = pixels[index * 4] / 255
    input[inputSize * inputSize + index] = pixels[index * 4 + 1] / 255
    input[inputSize * inputSize * 2 + index] = pixels[index * 4 + 2] / 255
  }

  const session = await ort.InferenceSession.create(MODEL_URL, { executionProviders: ["webgl"] })
  const output = (await session.run({
    [session.inputNames[0]]: new ort.Tensor("float32", input, [1, 3, inputSize, inputSize]),
  }))[session.outputNames[0]]
  return outputToWebP(output)
}

function outputToWebP(output: OrtTensor): Promise<Blob> {
  const dims = output.dims
  const channelsFirst = dims.length === 4 && dims[1] === 3
  const height = channelsFirst ? dims[2] : dims[1]
  const width = channelsFirst ? dims[3] : dims[2]
  if (!width || !height || dims.length !== 4) throw new Error("AI 업스케일 결과 형식이 올바르지 않습니다.")

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Canvas를 지원하지 않는 브라우저입니다.")
  const pixels = context.createImageData(width, height)
  for (let index = 0; index < width * height; index += 1) {
    const red = channelsFirst ? output.data[index] : output.data[index * 3]
    const green = channelsFirst ? output.data[width * height + index] : output.data[index * 3 + 1]
    const blue = channelsFirst ? output.data[width * height * 2 + index] : output.data[index * 3 + 2]
    pixels.data[index * 4] = clampChannel(red)
    pixels.data[index * 4 + 1] = clampChannel(green)
    pixels.data[index * 4 + 2] = clampChannel(blue)
    pixels.data[index * 4 + 3] = 255
  }
  context.putImageData(pixels, 0, 0)
  const outputCanvas = document.createElement("canvas")
  outputCanvas.width = UPSCALE_SIZE
  outputCanvas.height = UPSCALE_SIZE
  const outputContext = outputCanvas.getContext("2d")
  if (!outputContext) throw new Error("Canvas를 지원하지 않는 브라우저입니다.")
  outputContext.drawImage(canvas, 0, 0, width, height, 0, 0, UPSCALE_SIZE, UPSCALE_SIZE)
  return new Promise((resolve, reject) => {
    outputCanvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("WebP 이미지 변환에 실패했습니다."))), "image/webp", 0.85)
  })
}

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value <= 1 ? value * 255 : value)))
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

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("이미지 Data URL 생성에 실패했습니다."))
    reader.onerror = () => reject(new Error("이미지 Data URL 생성에 실패했습니다."))
    reader.readAsDataURL(blob)
  })
}

export { resizeImageToWebP }
