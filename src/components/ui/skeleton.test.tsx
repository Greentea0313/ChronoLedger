import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Skeleton } from "./skeleton"

describe("Skeleton", () => {
  it("기본 animate-pulse 및 bg-surface-2 클래스를 포함하여 렌더링한다", () => {
    const { container } = render(<Skeleton className="h-4 w-20" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain("animate-pulse")
    expect(el.className).toContain("bg-surface-2")
    expect(el.className).toContain("h-4")
    expect(el.className).toContain("w-20")
  })
})

