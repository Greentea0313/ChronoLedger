import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { CharacterIcon } from "./character-icon"

describe("CharacterIcon default avatar", () => {
  it("shows the person-silhouette avatar when there is no custom or catalog icon", () => {
    render(<CharacterIcon name="노이콘" customIconUrl={null} defaultIconUrl={null} />)
    expect(screen.getByTestId("default-avatar")).toBeTruthy()
  })

  it("keeps the catalog icon when one exists", () => {
    render(<CharacterIcon name="카프카" defaultIconUrl="data:image/webp;base64,a" />)
    expect(screen.queryByTestId("default-avatar")).toBeNull()
  })
})
