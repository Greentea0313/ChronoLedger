import { beforeEach, describe, expect, it, vi } from "vitest"
import { addDays, ensureMonthlySubscriptionExpenses } from "./subscription-sync"

const { from } = vi.hoisted(() => ({
  from: vi.fn(),
}))

vi.mock("@/lib/supabase/client", () => ({
  supabase: { from },
}))

function createTemplateQuery(data: unknown, error: unknown = null) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
  }
  query.select.mockReturnValue(query)
  query.eq
    .mockReturnValueOnce(query)
    .mockResolvedValueOnce({ data, error })
  return query
}

describe("subscription-sync", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("addDays", () => {
    it("정확히 30일을 더한 날짜 문자열을 반환한다", () => {
      expect(addDays("2026-10-01", 30)).toBe("2026-10-31")
      expect(addDays("2026-10-15", 30)).toBe("2026-11-14")
      expect(addDays("2026-02-01", 30)).toBe("2026-03-03")
    })
  })

  describe("ensureMonthlySubscriptionExpenses", () => {
    it("MONTHLY_DAY: 당월 회차 예정 지출을 생성하고 billing_cycle 충돌을 무시한다", async () => {
      const templateQuery = createTemplateQuery([
        {
          id: "template-1",
          title: "넷플릭스",
          category: "정기 구독",
          cycle_type: "MONTHLY_DAY",
          billing_day: 31,
          default_price: 17000,
          payment_method: "WALLET",
          game_id: null,
        },
      ])
      const expenseQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }

      const insert = vi.fn().mockResolvedValue({ error: null })
      from.mockImplementation((table: string) => {
        if (table === "subscription_templates") return templateQuery
        if (table === "expenses") {
          return {
            ...expenseQuery,
            insert,
          }
        }
        return {}
      })

      const createdCount = await ensureMonthlySubscriptionExpenses("user-1", 2026, 2)

      expect(createdCount).toBe(1)
      expect(insert).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            template_id: "template-1",
            billing_cycle: "2026-02",
            target_date: "2026-02-28",
            status: "PLANNED",
            final_amount: 17000,
          }),
        ],
      )
    })


    it("INTERVAL_30: 이전 CONFIRMED 지출이 있으면 +30일 뒤 날짜로 다음 회차를 생성한다", async () => {
      const templateQuery = createTemplateQuery([
        {
          id: "template-interval",
          title: "공월 축복",
          category: "게임",
          cycle_type: "INTERVAL_30",
          billing_day: 1,
          default_price: 5900,
          payment_method: "GOOGLE_PLAY",
          game_id: "game-1",
        },
      ])

      const expenseQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: "e1", status: "CONFIRMED", target_date: "2026-10-01" },
          ],
          error: null,
        }),
      }

      const insert = vi.fn().mockResolvedValue({ error: null })

      from.mockImplementation((table: string) => {
        if (table === "subscription_templates") return templateQuery
        if (table === "expenses") {
          return {
            ...expenseQuery,
            insert,
          }
        }
        return {}
      })

      const createdCount = await ensureMonthlySubscriptionExpenses("user-1", 2026, 10, "2026-10-05")

      expect(createdCount).toBe(1)
      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({
          template_id: "template-interval",
          target_date: "2026-10-31", // 2026-10-01 + 30일
          status: "PLANNED",
          final_amount: 5900,
          payment_method: "GOOGLE_PLAY",
          point_platform: "GOOGLE_PLAY",
        }),
      )
    })

    it("INTERVAL_30: 이미 미결제 PLANNED 회차가 존재하면 중복 생성하지 않는다", async () => {
      const templateQuery = createTemplateQuery([
        {
          id: "template-interval",
          title: "공월 축복",
          category: "게임",
          cycle_type: "INTERVAL_30",
          billing_day: 1,
          default_price: 5900,
          payment_method: "GOOGLE_PLAY",
          game_id: "game-1",
        },
      ])

      const expenseQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: "e2", status: "PLANNED", target_date: "2026-10-31" },
          ],
          error: null,
        }),
      }

      const insert = vi.fn().mockResolvedValue({ error: null })

      from.mockImplementation((table: string) => {
        if (table === "subscription_templates") return templateQuery
        if (table === "expenses") {
          return {
            ...expenseQuery,
            insert,
          }
        }
        return {}
      })

      const createdCount = await ensureMonthlySubscriptionExpenses("user-1", 2026, 10)

      expect(createdCount).toBe(0)
      expect(insert).not.toHaveBeenCalled()
    })

    it("VERSION_PASS: 게임의 VERSION 일정을 조회하여 해당 버전의 PLANNED 회차를 생성한다", async () => {
      const templateQuery = createTemplateQuery([
        {
          id: "template-pass",
          title: "진주 기행",
          category: "게임",
          cycle_type: "VERSION_PASS",
          billing_day: 1,
          default_price: 12000,
          payment_method: "GOOGLE_PLAY",
          game_id: "game-genshin",
        },
      ])

      const scheduleQuery: Record<string, unknown> = {}
      scheduleQuery.select = vi.fn().mockReturnValue(scheduleQuery)
      scheduleQuery.eq = vi.fn().mockImplementation((col: string) => {
        if (col === "schedule_type") {
          return Promise.resolve({
            data: [
              { id: "ver-5.1", title: "5.1 버전", start_date: "2026-10-09", end_date: "2026-11-19" },
            ],
            error: null,
          })
        }
        return scheduleQuery
      })

      const expenseQuery: Record<string, unknown> = {}
      expenseQuery.select = vi.fn().mockReturnValue(expenseQuery)
      expenseQuery.eq = vi.fn().mockImplementation((col: string) => {
        if (col === "template_id") {
          return Promise.resolve({
            data: [], // 기존 생성된 회차 없음
            error: null,
          })
        }
        return expenseQuery
      })

      const insert = vi.fn().mockResolvedValue({ error: null })

      from.mockImplementation((table: string) => {
        if (table === "subscription_templates") return templateQuery
        if (table === "game_schedules") return scheduleQuery
        if (table === "expenses") {
          return {
            ...expenseQuery,
            insert,
          }
        }
        return {}
      })

      const createdCount = await ensureMonthlySubscriptionExpenses("user-1", 2026, 10)

      expect(createdCount).toBe(1)
      expect(insert).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            template_id: "template-pass",
            schedule_id: "ver-5.1",
            title: "진주 기행 (5.1 버전)",
            start_date: "2026-10-09",
            end_date: "2026-11-19",
            target_date: "2026-10-09",
            status: "PLANNED",
            final_amount: 12000,
          }),
        ],
      )
    })

    it("returns zero when no active templates exist", async () => {
      const templateQuery = createTemplateQuery([])
      from.mockImplementation((table: string) => {
        if (table === "subscription_templates") return templateQuery
        return { insert: vi.fn() }
      })

      const createdCount = await ensureMonthlySubscriptionExpenses("user-1", 2026, 10)
      expect(createdCount).toBe(0)
    })

  })
})
