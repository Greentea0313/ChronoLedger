import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { UserRequestsCard } from "./user-requests-card"

const { from } = vi.hoisted(() => ({ from: vi.fn() }))

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}))
vi.mock("@/lib/supabase/client", () => ({ supabase: { from } }))

function query(data: unknown[]) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
  }
  builder.select.mockReturnValue(builder)
  builder.eq.mockReturnValue(builder)
  builder.order.mockResolvedValue({ data, error: null })
  return builder
}

describe("UserRequestsCard schedule type labels", () => {
  it("renders BROADCAST and rerun labels from the request row", async () => {
    from.mockImplementation((table: string) => query(table === "schedule_requests"
      ? [{
          id: "request-1",
          game_id: "game-1",
          target_schedule_id: null,
          title: "특별 방송",
          schedule_type: "BROADCAST",
          is_rerun: true,
          start_date: "2026-11-10",
          end_date: "2026-11-10",
          memo: null,
          request_status: "PENDING",
          admin_memo: null,
          created_at: "2026-11-09T00:00:00Z",
          games: { name: "게임" },
        }]
      : []))

    render(<UserRequestsCard />)

    expect(await screen.findByText("특별 방송")).toBeTruthy()
  })
})
