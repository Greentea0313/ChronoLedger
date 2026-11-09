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

  it("retries without is_rerun when the column is missing and still renders the requests", async () => {
    const row = {
      id: "request-2",
      game_id: "game-1",
      target_schedule_id: null,
      title: "마이그레이션 전 일정",
      schedule_type: "PICKUP",
      start_date: "2026-11-10",
      end_date: "2026-11-12",
      memo: null,
      request_status: "PENDING",
      admin_memo: null,
      created_at: "2026-11-09T00:00:00Z",
      games: { name: "게임" },
    }
    const scheduleSelects: string[] = []
    from.mockImplementation((table: string) => {
      const builder = query([])
      if (table === "schedule_requests") {
        builder.select.mockImplementation((columns: string) => {
          scheduleSelects.push(columns)
          builder.order.mockResolvedValue(
            columns.includes("is_rerun")
              ? { data: null, error: { code: "42703", message: 'column "is_rerun" does not exist' } }
              : { data: [row], error: null },
          )
          return builder
        })
      }
      return builder
    })

    render(<UserRequestsCard />)

    expect(await screen.findByText("마이그레이션 전 일정")).toBeTruthy()
    expect(screen.queryByText("요청 내역을 불러오지 못했습니다.")).toBeNull()
    expect(scheduleSelects).toHaveLength(2)
    expect(scheduleSelects[0]).toContain("is_rerun")
    expect(scheduleSelects[1]).not.toContain("is_rerun")
  })

  it("does not retry for unrelated errors and shows the load error", async () => {
    let calls = 0
    from.mockImplementation((table: string) => {
      const builder = query([])
      if (table === "schedule_requests") {
        builder.select.mockImplementation(() => {
          calls += 1
          builder.order.mockResolvedValue({ data: null, error: { code: "42501", message: "permission denied" } })
          return builder
        })
      }
      return builder
    })

    render(<UserRequestsCard />)

    expect(await screen.findByText("요청 내역을 불러오지 못했습니다.")).toBeTruthy()
    expect(calls).toBe(1)
  })
})
