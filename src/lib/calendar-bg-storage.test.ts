import { describe, expect, it, vi } from "vitest"
import {
  calculateScaledDimensions,
  clampBgOpacity,
  clearCalendarBgRecord,
  compressCalendarBgImage,
  DEFAULT_CALENDAR_BG_SETTINGS,
  getBlurFilterCss,
  loadCalendarBgRecord,
  saveCalendarBgRecord,
} from "./calendar-bg-storage"

describe("calendar-bg-storage", () => {
  it("clampBgOpacity는 투명도 값을 10% ~ 60% 범위로 강제 클램핑한다", () => {
    expect(clampBgOpacity(5)).toBe(10)
    expect(clampBgOpacity(0)).toBe(10)
    expect(clampBgOpacity(25)).toBe(25)
    expect(clampBgOpacity(60)).toBe(60)
    expect(clampBgOpacity(85)).toBe(60)
    expect(clampBgOpacity(100)).toBe(60)
    expect(clampBgOpacity(Number.NaN)).toBe(DEFAULT_CALENDAR_BG_SETTINGS.opacity)
  })

  it("getBlurFilterCss는 블러 단계별 CSS 필터 문자열을 반환한다", () => {
    expect(getBlurFilterCss("OFF")).toBe("none")
    expect(getBlurFilterCss("LOW")).toBe("blur(4px)")
    expect(getBlurFilterCss("MEDIUM")).toBe("blur(8px)")
  })

  it("calculateScaledDimensions는 원본 비율을 유지하면서 최대 1920x1080 이하로 축소한다", () => {
    // 4K 해상도(3840x2160) -> 1920x1080
    expect(calculateScaledDimensions(3840, 2160)).toEqual({ width: 1920, height: 1080 })
    // 소형 해상도(1280x720) -> 확대하지 않고 원본 유지
    expect(calculateScaledDimensions(1280, 720)).toEqual({ width: 1280, height: 720 })
    // 세로형 이미지(1080x1920) -> 높이 1080에 맞춰 축소 (608x1080)
    expect(calculateScaledDimensions(1080, 1920)).toEqual({ width: 608, height: 1080 })
  })

  it("saveCalendarBgRecord, loadCalendarBgRecord, clearCalendarBgRecord가 사용자별 배경 설정 및 Blob을 영구 보존하고 초기화한다", async () => {
    const sampleBlob = new Blob(["fake-webp-data"], { type: "image/webp" })

    await saveCalendarBgRecord("user-bg-1", {
      blob: sampleBlob,
      opacity: 90, // 60% 상한으로 클램핑되어야 함
      blur: "MEDIUM",
    })

    const loaded = await loadCalendarBgRecord("user-bg-1")
    expect(loaded.blob).toBe(sampleBlob)
    expect(loaded.opacity).toBe(60)
    expect(loaded.blur).toBe("MEDIUM")

    // 다른 사용자는 기본 상태를 반환해야 함
    const otherUser = await loadCalendarBgRecord("user-bg-2")
    expect(otherUser.blob).toBeNull()
    expect(otherUser.opacity).toBe(25)
    expect(otherUser.blur).toBe("OFF")

    // 초기화 후 기본값 복귀 확인
    const cleared = await clearCalendarBgRecord("user-bg-1")
    expect(cleared.blob).toBeNull()
    expect(cleared.opacity).toBe(25)
    expect(cleared.blur).toBe("OFF")

    const afterClear = await loadCalendarBgRecord("user-bg-1")
    expect(afterClear.blob).toBeNull()
  })

  it("compressCalendarBgImage는 15MB 초과 파일이나 지원하지 않는 형식을 거부한다", async () => {
    const hugeFile = new File([new ArrayBuffer(16 * 1024 * 1024)], "huge.png", { type: "image/png" })
    await expect(compressCalendarBgImage(hugeFile)).rejects.toThrow("15MB 이하")

    const invalidTypeFile = new File(["gif"], "anim.gif", { type: "image/gif" })
    await expect(compressCalendarBgImage(invalidTypeFile)).rejects.toThrow("PNG, JPG, JPEG, WebP")

    vi.restoreAllMocks()
  })
})

