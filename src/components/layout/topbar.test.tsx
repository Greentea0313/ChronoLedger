import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const { authState, from } = vi.hoisted(() => ({ authState: { user: null as { id: string } | null }, from: vi.fn() }))
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: authState.user, role: null, nickname: null }) }))
vi.mock("@/lib/supabase/client", () => ({ supabase: { from, rpc: vi.fn() } }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/dashboard" }))
vi.mock("@/lib/storage-upload", () => ({
  downloadProfileAvatar: vi.fn(),
  PROFILE_AVATAR_CHANGED_EVENT: "cl-profile-avatar-changed",
}))

import { Topbar, resolveProfile, TOPBAR_NAV_ITEMS } from "@/components/layout/topbar"

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

describe("Topbar notification bell (R84)", () => {
  const renderTopbar = () => render(<Topbar onLogout={vi.fn()} isLoggingOut={false} logoutError={null} />)

  it("shows no bell for guests", () => {
    authState.user = null
    renderTopbar()
    expect(screen.queryByRole("button", { name: /^알림/ })).toBeNull()
    expect(from).not.toHaveBeenCalled()
  })

  it("shows the bell for a signed-in user", () => {
    authState.user = { id: "user-1" }
    const builder = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn().mockResolvedValue({ data: [], error: null }) }
    builder.select.mockReturnValue(builder)
    builder.eq.mockReturnValue(builder)
    builder.order.mockReturnValue(builder)
    from.mockReturnValue(builder)
    renderTopbar()
    expect(screen.getByRole("button", { name: "알림" })).toBeTruthy()
  })
})
