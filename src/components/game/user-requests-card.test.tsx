import { fireEvent, render, screen, within } from "@testing-library/react"
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
    // R85: widest columns first (is_rerun + times), then is_rerun only, then neither.
    expect(scheduleSelects).toHaveLength(3)
    expect(scheduleSelects[0]).toContain("is_rerun")
    expect(scheduleSelects[0]).toContain("start_at")
    expect(scheduleSelects[1]).toContain("is_rerun")
    expect(scheduleSelects[1]).not.toContain("start_at")
    expect(scheduleSelects[2]).not.toContain("is_rerun")
    expect(scheduleSelects[2]).not.toContain("start_at")
  })

  it("falls back to the is_rerun-only column set when only the R85 time columns are missing", async () => {
    const row = {
      id: "request-3",
      game_id: "game-1",
      target_schedule_id: null,
      title: "R85 전 복각 일정",
      schedule_type: "PICKUP",
      is_rerun: true,
      start_date: "2026-11-10",
      end_date: "2026-11-12",
      memo: null,
      request_status: "PENDING",
      admin_memo: null,
      created_at: "2026-11-09T00:00:00Z",
      games: { name: "게임" },
    }
    from.mockImplementation((table: string) => {
      const builder = query([])
      if (table === "schedule_requests") {
        builder.select.mockImplementation((columns: string) => {
          builder.order.mockResolvedValue(
            columns.includes("start_at")
              ? { data: null, error: { code: "42703", message: 'column "start_at" does not exist' } }
              : { data: [row], error: null },
          )
          return builder
        })
      }
      return builder
    })

    render(<UserRequestsCard />)

    expect(await screen.findByText("R85 전 복각 일정")).toBeTruthy()
    expect(screen.getByText("복각")).toBeTruthy()
  })

  it("shows request times in the period text (R85)", async () => {
    const row = {
      id: "request-4",
      game_id: "game-1",
      target_schedule_id: null,
      title: "시각 있는 일정",
      schedule_type: "PICKUP",
      is_rerun: false,
      start_date: "2026-11-13",
      end_date: "2026-11-27",
      start_at: "2026-11-13T02:00:00.000Z",
      end_at: "2026-11-26T19:59:00.000Z",
      start_at_estimated: true,
      end_at_estimated: false,
      memo: null,
      request_status: "PENDING",
      admin_memo: null,
      created_at: "2026-11-09T00:00:00Z",
      games: { name: "게임" },
    }
    from.mockImplementation((table: string) => {
      const builder = query([])
      if (table === "schedule_requests") {
        builder.select.mockImplementation(() => {
          builder.order.mockResolvedValue({ data: [row], error: null })
          return builder
        })
      }
      return builder
    })

    render(<UserRequestsCard />)

    await screen.findByText("시각 있는 일정")
    expect(document.body.textContent).toContain("2026-11-13 11:00(예상) ~ 2026-11-27 04:59")
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

describe("UserRequestsCard feedback requests (R84)", () => {
  const feedback = [
    { id: "f1", category: "기능 제안", title: "다크 모드", content: "다크 모드가 필요함", request_status: "ANSWERED", admin_answer: "다음 버전에 반영함", created_at: "2026-11-17T00:00:00Z" },
    { id: "f2", category: "오류 신고", title: "달력 오류", content: "모바일에서 안 열림", request_status: "PENDING", admin_answer: null, created_at: "2026-11-16T00:00:00Z" },
    { id: "f3", category: "기타", title: "문의", content: "종료된 건의", request_status: "CLOSED", admin_answer: null, created_at: "2026-11-15T00:00:00Z" },
  ]
  const gameRow = { id: "g1", name: "신규 게임", memo: null, request_status: "PENDING", admin_memo: null, created_at: "2026-11-14T00:00:00Z" }

  it("lists feedback with category, status badge and the admin answer, and counts it in 전체", async () => {
    const tables: string[] = []
    from.mockImplementation((table: string) => {
      tables.push(table)
      return query(table === "feedback_requests" ? feedback : table === "game_requests" ? [gameRow] : [])
    })
    render(<UserRequestsCard />)

    const items = await screen.findAllByTestId("feedback-request-item")
    expect(tables).toContain("feedback_requests")
    expect(items).toHaveLength(3)
    expect(within(items[0]).getByText("기능 제안")).toBeTruthy()
    expect(within(items[0]).getByText("답변 완료")).toBeTruthy()
    expect(within(items[0]).getByText("다음 버전에 반영함")).toBeTruthy()
    expect(within(items[1]).getByText("검토 대기")).toBeTruthy()
    expect(within(items[1]).queryByText("관리자 답변:")).toBeNull()
    expect(within(items[2]).getByText("종료")).toBeTruthy()
    expect(screen.getByRole("button", { name: "전체 (4)" })).toBeTruthy()
  })

  it("filters to feedback with the 건의 tab and hides it under the other tabs", async () => {
    from.mockImplementation((table: string) => query(table === "feedback_requests" ? feedback : table === "game_requests" ? [gameRow] : []))
    render(<UserRequestsCard />)
    await screen.findAllByTestId("feedback-request-item")

    fireEvent.click(screen.getByRole("button", { name: "건의 (3)" }))
    expect(screen.getAllByTestId("feedback-request-item")).toHaveLength(3)
    expect(screen.queryByText("신규 게임")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "게임 요청 (1)" }))
    expect(screen.queryAllByTestId("feedback-request-item")).toHaveLength(0)
    expect(screen.getByText("신규 게임")).toBeTruthy()
  })

  it.each(["42P01", "PGRST205"])("treats a missing feedback table (%s) as an empty list without an error", async (code) => {
    from.mockImplementation((table: string) => {
      const builder = query(table === "game_requests" ? [gameRow] : [])
      if (table === "feedback_requests") builder.order.mockResolvedValue({ data: null, error: { code, message: "missing" } })
      return builder
    })
    render(<UserRequestsCard />)

    expect(await screen.findByText("신규 게임")).toBeTruthy()
    expect(screen.queryByText("요청 내역을 불러오지 못했습니다.")).toBeNull()
    expect(screen.getByRole("button", { name: "건의 (0)" })).toBeTruthy()
  })

  it("shows the load error for other feedback failures", async () => {
    from.mockImplementation((table: string) => {
      const builder = query([])
      if (table === "feedback_requests") builder.order.mockResolvedValue({ data: null, error: { code: "42501", message: "denied" } })
      return builder
    })
    render(<UserRequestsCard />)

    expect(await screen.findByText("요청 내역을 불러오지 못했습니다.")).toBeTruthy()
  })
})
