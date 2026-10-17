import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { CalendarBgCustomizer } from "./calendar-bg-customizer"

describe("CalendarBgCustomizer", () => {
  it("배경 커스텀 설정 버튼 클릭 시 컨트롤 패널이 열리고 투명도/블러/초기화 동작이 정상 호출된다", () => {
    const onUploadBlob = vi.fn()
    const onChangeOpacity = vi.fn()
    const onChangeBlur = vi.fn()
    const onReset = vi.fn()

    render(
      <CalendarBgCustomizer
        hasCustomImage={true}
        opacity={30}
        blur="LOW"
        onUploadBlob={onUploadBlob}
        onChangeOpacity={onChangeOpacity}
        onChangeBlur={onChangeBlur}
        onReset={onReset}
      />,
    )

    // 커스텀 이미지 활성화 표시 점 확인
    expect(screen.getByTestId("calendar-bg-active-dot")).toBeTruthy()

    const triggerBtn = screen.getByRole("button", { name: "배경 커스텀 설정" })
    fireEvent.click(triggerBtn)

    // 패널 오픈 확인
    expect(screen.getByRole("dialog", { name: "배경 커스텀 설정 패널" })).toBeTruthy()
    expect(screen.getByText("배경 이미지 변경")).toBeTruthy()

    // 투명도 슬라이더 (10% ~ 60% 상한 검증)
    const slider = screen.getByLabelText("배경 투명도 조절") as HTMLInputElement
    expect(slider.min).toBe("10")
    expect(slider.max).toBe("60")
    expect(slider.value).toBe("30")

    fireEvent.change(slider, { target: { value: "45" } })
    expect(onChangeOpacity).toHaveBeenCalledWith(45)

    // 블러 단계 토글 버튼 검증 (Off / 약함 / 보통)
    const mediumBlurBtn = screen.getByRole("button", { name: "보통" })
    fireEvent.click(mediumBlurBtn)
    expect(onChangeBlur).toHaveBeenCalledWith("MEDIUM")

    // 기본 배경 초기화 버튼 클릭
    const resetBtn = screen.getByRole("button", { name: "기본 배경 초기화" })
    fireEvent.click(resetBtn)
    expect(onReset).toHaveBeenCalledTimes(1)

    // Escape 키로 패널 닫기
    fireEvent.keyDown(document, { key: "Escape" })
    expect(screen.queryByRole("dialog", { name: "배경 커스텀 설정 패널" })).toBeNull()
  })
})
