import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  addDays,
  calculateNextIntervalTargetDate,
  calculateRollbackIntervalTargetDate,
  createNextIntervalSubscriptionExpense,
  rollbackIntervalSubscriptionExpense,
  ensureMonthlySubscriptionExpenses,
} from "./subscription-sync"

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

  describe("calculateNextIntervalTargetDate", () => {
    it("결제 예정일보다 이른 날짜에 조기 결제 시 기존 예정일에 interval_days를 더해 잔여일수를 온전히 누적한다", () => {
      // 예정일: 2026-10-25, 실제 결제일: 2026-10-15, interval: 30일
      // 기존 잔여일수 10일 + 연장 30일 = 총 40일 연장 (2026-10-25 + 30일 = 2026-11-24)
      const nextDate = calculateNextIntervalTargetDate("2026-10-25", "2026-10-15", 30)
      expect(nextDate).toBe("2026-11-24")
    })

    it("결제 예정일 당일에 결제 시 결제일 기준 +30일 날짜를 반환한다", () => {
      const nextDate = calculateNextIntervalTargetDate("2026-10-15", "2026-10-15", 30)
      expect(nextDate).toBe("2026-11-14")
    })

    it("결제 예정일이 지난 후(만료 후) 결제 시 결제일 기준 +30일 날짜를 반환한다", () => {
      const nextDate = calculateNextIntervalTargetDate("2026-10-10", "2026-10-15", 30)
      expect(nextDate).toBe("2026-11-14")
    })

    it("기존 예정일이 없는 경우 결제일 기준 +30일 날짜를 반환한다", () => {
      const nextDate = calculateNextIntervalTargetDate(null, "2026-10-15", 30)
      expect(nextDate).toBe("2026-11-14")
    })

    it("커스텀 interval_days(예: 15일)도 기존 예정일에 정확히 가산된다", () => {
      const nextDate = calculateNextIntervalTargetDate("2026-10-25", "2026-10-15", 15)
      expect(nextDate).toBe("2026-11-09")
    })
  })

  describe("createNextIntervalSubscriptionExpense", () => {
    it("조기 결제 시 기존 예정일에 30일을 가산하여 다음 회차 PLANNED 지출을 등록한다", async () => {
      const tplSingle = vi.fn().mockResolvedValue({
        data: {
          id: "tpl-1",
          title: "공월 축복",
          category: "게임",
          cycle_type: "INTERVAL_30",
          interval_days: 30,
          default_price: 5900,
          payment_method: "GOOGLE_PLAY",
          game_id: "game-1",
          is_active: true,
        },
        error: null,
      })
      const tplQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue({ single: tplSingle }),
      }

      const plannedMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
      const existingPlannedQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: plannedMaybeSingle,
      }

      const insert = vi.fn().mockResolvedValue({ error: null })

      from.mockImplementation((table: string) => {
        if (table === "subscription_templates") return tplQuery
        if (table === "expenses") {
          return {
            ...existingPlannedQuery,
            insert,
          }
        }
        return {}
      })

      const success = await createNextIntervalSubscriptionExpense({
        userId: "user-1",
        templateId: "tpl-1",
        originalTargetDate: "2026-10-25",
        paymentDate: "2026-10-15",
      })

      expect(success).toBe(true)
      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-1",
          template_id: "tpl-1",
          status: "PLANNED",
          target_date: "2026-11-24", // 10/25 + 30일
          final_amount: 5900,
        }),
      )
    })

    it("이미 PLANNED 회차가 존재하면 중복 생성하지 않고 false를 반환한다", async () => {
      const tplSingle = vi.fn().mockResolvedValue({
        data: {
          id: "tpl-1",
          cycle_type: "INTERVAL_30",
          is_active: true,
        },
        error: null,
      })
      const tplQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue({ single: tplSingle }),
      }

      const plannedMaybeSingle = vi.fn().mockResolvedValue({ data: { id: "existing-plan" }, error: null })
      const existingPlannedQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: plannedMaybeSingle,
      }

      from.mockImplementation((table: string) => {
        if (table === "subscription_templates") return tplQuery
        if (table === "expenses") return existingPlannedQuery
        return {}
      })

      const success = await createNextIntervalSubscriptionExpense({
        userId: "user-1",
        templateId: "tpl-1",
        originalTargetDate: "2026-10-25",
        paymentDate: "2026-10-15",
      })

      expect(success).toBe(false)
    })
  })

  describe("calculateRollbackIntervalTargetDate", () => {
    it("환불 시 현재 예정일에서 interval_days를 차감하여 결제 전 원래 예정일로 복원한다", () => {
      // 10/25 예정일에서 30일 조기 충전되어 11/24가 되었던 상태에서 환불 시 -> 10/25로 원복
      const rolledBackDate = calculateRollbackIntervalTargetDate("2026-11-24", 30)
      expect(rolledBackDate).toBe("2026-10-25")
    })

    it("15일 충전형 구독 환불 시 15일이 정확히 차감된다", () => {
      const rolledBackDate = calculateRollbackIntervalTargetDate("2026-11-09", 15)
      expect(rolledBackDate).toBe("2026-10-25")
    })
  })

  describe("rollbackIntervalSubscriptionExpense", () => {
    it("누적 충전형 결제 환불 시 다음 PLANNED 지출의 예정일에서 충전 일수를 차감한다", async () => {
      const tplSingle = vi.fn().mockResolvedValue({
        data: {
          id: "tpl-1",
          cycle_type: "INTERVAL_30",
          interval_days: 30,
        },
        error: null,
      })
      const tplQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue({ maybeSingle: tplSingle }),
      }

      const plannedMaybeSingle = vi.fn().mockResolvedValue({
        data: {
          id: "exp-planned-next",
          target_date: "2026-11-24", // 40일 남았던 상태
        },
        error: null,
      })
      const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
      const expensesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: plannedMaybeSingle,
        update,
      }

      from.mockImplementation((table: string) => {
        if (table === "subscription_templates") return tplQuery
        if (table === "expenses") return expensesQuery
        return {}
      })

      const success = await rollbackIntervalSubscriptionExpense({
        userId: "user-1",
        expenseId: "exp-refunded-1",
        templateId: "tpl-1",
      })

      expect(success).toBe(true)
      expect(update).toHaveBeenCalledWith({
        target_date: "2026-10-25", // 2026-11-24에서 30일 차감
      })
    })

    it("INTERVAL_30이 아닌 일반 템플릿 환불 시 차감하지 않고 false를 반환한다", async () => {
      const tplSingle = vi.fn().mockResolvedValue({
        data: {
          id: "tpl-monthly",
          cycle_type: "MONTHLY_DAY",
        },
        error: null,
      })
      const tplQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue({ maybeSingle: tplSingle }),
      }

      from.mockImplementation((table: string) => {
        if (table === "subscription_templates") return tplQuery
        return {}
      })

      const success = await rollbackIntervalSubscriptionExpense({
        userId: "user-1",
        expenseId: "exp-1",
        templateId: "tpl-monthly",
      })

      expect(success).toBe(false)
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

    it("INTERVAL_30: interval_days가 설정되어 있으면 기본 30일 대신 설정된 일수만큼 연장하여 다음 회차를 생성한다", async () => {
      const templateQuery = createTemplateQuery([
        {
          id: "template-interval-7",
          title: "주간 패키지",
          category: "게임",
          cycle_type: "INTERVAL_30",
          interval_days: 7,
          billing_day: 1,
          default_price: 3300,
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
          template_id: "template-interval-7",
          target_date: "2026-10-08", // 2026-10-01 + 7일
          status: "PLANNED",
          final_amount: 3300,
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
