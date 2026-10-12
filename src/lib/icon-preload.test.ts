import { describe, expect, it, vi, beforeEach } from "vitest"
import { preloadImage, preloadImages } from "./icon-preload"

describe("icon-preload", () => {
  let createdImages: { src: string; decoding?: string }[]

  beforeEach(() => {
    createdImages = []
    vi.stubGlobal(
      "Image",
      class {
        src = ""
        decoding = ""
        constructor() {
          createdImages.push(this)
        }
      },
    )
  })

  it("유효한 이미지 URL이 전달되면 Image 객체를 생성하여 사전 로드한다", () => {
    preloadImage("/assets/games/arknights.png")
    expect(createdImages.length).toBe(1)
    expect(createdImages[0].src).toBe("/assets/games/arknights.png")
    expect(createdImages[0].decoding).toBe("async")
  })

  it("동일한 URL은 중복하여 Image 객체를 생성하지 않는다", () => {
    preloadImage("/assets/games/arknights.png")
    preloadImage("/assets/games/arknights.png")
    expect(createdImages.length).toBe(0) // 이미 위 테스트에서 preloadUrls에 등록됨
  })

  it("null, undefined, 빈 문자열은 무시한다", () => {
    preloadImage(null)
    preloadImage(undefined)
    preloadImage("")
    expect(createdImages.length).toBe(0)
  })

  it("preloadImages는 여러 URL을 순회하며 사전 로드한다", () => {
    preloadImages(["/assets/games/unique-1.png", "/assets/games/unique-2.png", null])
    expect(createdImages.length).toBe(2)
    expect(createdImages[0].src).toBe("/assets/games/unique-1.png")
    expect(createdImages[1].src).toBe("/assets/games/unique-2.png")
  })
})

