import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { GameIcon } from "./game-icon"

describe("GameIcon", () => {
  it("src가 없으면 기본 fallback(Gamepad2)을 렌더링한다", () => {
    const { container } = render(<GameIcon src={null} />)
    expect(container.querySelector("svg")).toBeTruthy()
  })

  it("src가 제공되면 img 태그를 렌더링하고 로드 완료 시 opacity-100 클래스가 적용된다", () => {
    render(<GameIcon src="/assets/games/arknights.png" alt="명일방주" />)
    const img = screen.getByAltText("명일방주")
    expect(img).toBeTruthy()
    expect(img.className).toContain("opacity-0")

    fireEvent.load(img)
    expect(img.className).toContain("opacity-100")
  })

  it("이미지 로드 실패 시 fallback으로 전환된다", () => {
    const { container } = render(<GameIcon src="/invalid-image.png" alt="오류 이미지" />)
    const img = screen.getByAltText("오류 이미지")
    fireEvent.error(img)

    expect(screen.queryByAltText("오류 이미지")).toBeNull()
    expect(container.querySelector("svg")).toBeTruthy()
  })

  it("커스텀 fallbackIcon이 지정되면 로드 실패 시 해당 컴포넌트를 렌더링한다", () => {
    const { container } = render(
      <GameIcon
        src="/invalid-image.png"
        fallbackIcon={<span data-testid="custom-fallback">대체 아이콘</span>}
      />,
    )
    const img = container.querySelector("img")
    expect(img).not.toBeNull()
    fireEvent.error(img!)

    expect(screen.getByTestId("custom-fallback")).toBeTruthy()
  })
})
