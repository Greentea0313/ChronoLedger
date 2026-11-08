import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: null }) }))
vi.mock("@/lib/storage-upload", () => ({
  downloadProfileAvatar: vi.fn(),
  PROFILE_AVATAR_CHANGED_EVENT: "cl-profile-avatar-changed",
}))

import { resolveProfile, TOPBAR_NAV_ITEMS } from "@/components/layout/topbar"

describe("TOPBAR_NAV_ITEMS", () => {
  it("exposes 홈, 소비, 게임 and 캐릭터 in order", () => {
    expect(TOPBAR_NAV_ITEMS.map((item) => item.label)).toEqual(["홈", "소비", "게임", "캐릭터"])
    expect(TOPBAR_NAV_ITEMS[3].href).toBe("/dashboard/characters")
  })
})

describe("resolveProfile", () => {
  it("uses the Google name and picture", () => {
    expect(
      resolveProfile({ email: "a@b.com", user_metadata: { full_name: "홍길동", avatar_url: "https://g/p.png" } }),
    ).toEqual({ name: "홍길동", avatarUrl: "https://g/p.png" })
  })

  it("accepts the picture metadata key", () => {
    expect(resolveProfile({ user_metadata: { name: "Kim", picture: "https://g/q.png" } })).toEqual({
      name: "Kim",
      avatarUrl: "https://g/q.png",
    })
  })

  it("falls back to the email local part and no avatar", () => {
    expect(resolveProfile({ email: "player1@example.com" })).toEqual({ name: "player1", avatarUrl: null })
    expect(resolveProfile(null).name).toBe("사용자")
  })
})
