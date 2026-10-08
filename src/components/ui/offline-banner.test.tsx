import { act, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { OfflineBanner } from "./offline-banner"

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", { configurable: true, value })
}

describe("OfflineBanner", () => {
  it("온라인에서는 표시하지 않고 오프라인 이벤트에서 표시한다", () => {
    setOnline(true)
    render(<OfflineBanner />)
    expect(screen.queryByRole("status")).toBeNull()

    act(() => {
      setOnline(false)
      window.dispatchEvent(new Event("offline"))
    })
    expect(screen.getByRole("status").textContent).toContain("오프라인")

    act(() => {
      setOnline(true)
      window.dispatchEvent(new Event("online"))
    })
    expect(screen.queryByRole("status")).toBeNull()
  })
})
