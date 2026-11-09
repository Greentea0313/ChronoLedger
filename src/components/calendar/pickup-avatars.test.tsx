import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { getPickupAvatars, PickupAvatars } from "./pickup-avatars"

const characters = {
  c1: { name: "카프카", iconUrl: "data:image/webp;base64,a" },
  c2: { name: "블랙 스완", iconUrl: "data:image/webp;base64,b" },
  noicon: { name: "아이콘 없음", iconUrl: null },
}
const base = { id: "s1", title: "픽업 일정", schedule_type: "PICKUP" }

describe("getPickupAvatars", () => {
  it("returns catalog icons in the saved order and skips unknown or icon-less ids", () => {
    const avatars = getPickupAvatars({ ...base, pickup_character_ids: ["c2", "missing", "noicon", "c1"] }, characters)
    expect(avatars).toEqual([
      { id: "c2", name: "블랙 스완", iconUrl: "data:image/webp;base64,b" },
      { id: "c1", name: "카프카", iconUrl: "data:image/webp;base64,a" },
    ])
  })

  it("uses the directly uploaded image as a single avatar when no character resolves", () => {
    expect(getPickupAvatars({ ...base, pickup_character_ids: [], pickup_image_url: "data:image/webp;base64,pk" }, characters)).toEqual([
      { id: "s1", name: "픽업 일정", iconUrl: "data:image/webp;base64,pk" },
    ])
    // Every referenced character was deleted: fall back to the image, otherwise to nothing.
    expect(getPickupAvatars({ ...base, pickup_character_ids: ["missing"], pickup_image_url: "data:image/webp;base64,pk" }, characters)).toHaveLength(1)
    expect(getPickupAvatars({ ...base, pickup_character_ids: ["missing"] }, characters)).toEqual([])
  })

  it("keeps legacy PICKUP schedules and non-PICKUP schedules avatar-free", () => {
    expect(getPickupAvatars({ ...base }, characters)).toEqual([])
    expect(getPickupAvatars({ ...base, schedule_type: "CONTENTS", pickup_character_ids: ["c1"] }, characters)).toEqual([])
  })

  it("prefers catalog characters over the image", () => {
    const avatars = getPickupAvatars({ ...base, pickup_character_ids: ["c1"], pickup_image_url: "data:image/webp;base64,pk" }, characters)
    expect(avatars.map((avatar) => avatar.id)).toEqual(["c1"])
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
    render(<PickupAvatars avatars={four.slice(0, 1)} size={24} />)
    expect((screen.getByRole("img") as HTMLImageElement).style.height).toBe("24px")
  })
})
