import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { getPickupAvatars, PickupAvatars } from "./pickup-avatars"

const characters = {
  c1: { name: "카프카", iconUrl: "data:image/webp;base64,a" },
  c2: { name: "블랙 스완", iconUrl: "data:image/webp;base64,b" },
  noicon: { name: "아이콘 없음", iconUrl: null },
}
const base = { schedule_type: "PICKUP" }

describe("getPickupAvatars", () => {
  it("returns catalog characters in the saved order and skips ids that are no longer in the catalog", () => {
    const avatars = getPickupAvatars({ ...base, pickup_character_ids: ["c2", "missing", "c1"] }, characters)
    expect(avatars).toEqual([
      { id: "c2", name: "블랙 스완", iconUrl: "data:image/webp;base64,b" },
      { id: "c1", name: "카프카", iconUrl: "data:image/webp;base64,a" },
    ])
  })

  it("keeps characters without an icon so they can render as an initial avatar", () => {
    expect(getPickupAvatars({ ...base, pickup_character_ids: ["noicon"] }, characters)).toEqual([
      { id: "noicon", name: "아이콘 없음", iconUrl: null },
    ])
  })

  it("keeps legacy PICKUP schedules and non-PICKUP schedules avatar-free", () => {
    expect(getPickupAvatars({ ...base }, characters)).toEqual([])
    expect(getPickupAvatars({ ...base, pickup_character_ids: [] }, characters)).toEqual([])
    expect(getPickupAvatars({ schedule_type: "CONTENTS", pickup_character_ids: ["c1"] }, characters)).toEqual([])
  })
})

describe("PickupAvatars", () => {
  const four = ["a", "b", "c", "d"].map((id) => ({ id, name: `캐릭터${id}`, iconUrl: `data:image/webp;base64,${id}` }))

  it("renders nothing without avatars", () => {
    const { container } = render(<PickupAvatars avatars={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it("shows at most three avatars with a +n counter and a tooltip listing every name", () => {
    render(<PickupAvatars avatars={four} size={28} />)

    expect(screen.getAllByRole("img")).toHaveLength(3)
    expect(screen.getByText("+1")).toBeTruthy()
    expect(screen.getByTestId("pickup-avatars").getAttribute("title")).toBe("캐릭터a, 캐릭터b, 캐릭터c, 캐릭터d")
    expect((screen.getAllByRole("img")[0] as HTMLImageElement).style.width).toBe("28px")
  })

  it("applies the requested size", () => {
    render(<PickupAvatars avatars={four.slice(0, 1)} size={20} />)
    expect((screen.getByRole("img") as HTMLImageElement).style.height).toBe("20px")
  })

  it("renders the default person avatar for characters without an icon", () => {
    render(<PickupAvatars avatars={[{ id: "n", name: "노이콘", iconUrl: null }]} size={20} />)

    const initial = screen.getByTestId("pickup-avatar-default")
    expect(initial.querySelector('[data-testid="default-avatar"]')).not.toBeNull()
    expect(initial.textContent).toBe("")
    expect(initial.getAttribute("aria-label")).toBe("노이콘")
    expect(initial.style.width).toBe("20px")
    expect(document.body.querySelector("img")).toBeNull()
  })
})
