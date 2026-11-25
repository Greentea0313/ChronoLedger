import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  addDays,
  createNextIntervalSubscriptionExpense,
  rollbackIntervalSubscriptionExpense,
  ensureMonthlySubscriptionExpenses,
} from "./subscription-sync"

const { from, rpc } = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock("@/lib/supabase/client", () => ({
  supabase: { from, rpc },
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

const MISSING_RPC_PGRST202 = {
  code: "PGRST202",
  message: "Could not find the function in the schema cache",
}

const MISSING_RPC_42883 = {
  code: "42883",
  message: "function does not exist",
}

describe("subscription-sync", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rpc.mockResolvedValue({ data: 0, error: null })
  })

  describe("addDays", () => {
    it("정확히 30일을 더한 날짜 문자열을 반환한다", () => {
      expect(addDays("2026-10-01", 30)).toBe("2026-10-31")
      expect(addDays("2026-10-15", 30)).toBe("2026-11-14")
      expect(addDays("2026-02-01", 30)).toBe("2026-03-03")
    })
  })

  describe("createNextIntervalSubscriptionExpense (RPC 전환 및 Legacy 폴백)", () => {
    it("RPC 정상 시 advance_interval_subscription만 호출하고 from()을 건드리지 않는다", async () => {
      rpc.mockResolvedValueOnce({ data: true, error: null })

      const success = await createNextIntervalSubscriptionExpense({
        userId: "user-1",
        templateId: "tpl-1",
        originalTargetDate: "2026-10-25",
        paymentDate: "2026-10-15",
      })

      expect(success).toBe(true)
      expect(rpc).toHaveBeenCalledWith("advance_interval_subscription", {
        p_template_id: "tpl-1",
        p_original_target_date: "2026-10-25",
        p_payment_date: "2026-10-15",
      })
      expect(from).not.toHaveBeenCalled()
    })

    it("originalTargetDate가 없으면 p_original_target_date로 null을 전달하고 RPC false를 반환한다", async () => {
      rpc.mockResolvedValueOnce({ data: false, error: null })

      const success = await createNextIntervalSubscriptionExpense({
        userId: "user-1",
        templateId: "tpl-1",
        paymentDate: "2026-10-15",
      })

      expect(success).toBe(false)
      expect(rpc).toHaveBeenCalledWith("advance_interval_subscription", {
        p_template_id: "tpl-1",
        p_original_target_date: null,
        p_payment_date: "2026-10-15",
      })
      expect(from).not.toHaveBeenCalled()
    })

    it.each([MISSING_RPC_PGRST202, MISSING_RPC_42883])(
      "RPC 부재 오류($code) 시 Legacy 폴백으로 조기 결제 누적 회차를 생성한다",
      async (missingError) => {
        rpc.mockResolvedValueOnce({ data: null, error: missingError })
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
        const existingPlannedQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
        const insert = vi.fn().mockResolvedValue({ error: null })

        from.mockImplementation((table: string) => {
          if (table === "subscription_templates") return tplQuery
          if (table === "expenses") return { ...existingPlannedQuery, insert }
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
            target_date: "2026-11-24",
            final_amount: 5900,
          }),
        )
      },
    )

    it("Legacy 폴백: 이미 PLANNED 회차가 존재하면 중복 생성하지 않고 false를 반환한다", async () => {
      rpc.mockResolvedValueOnce({ data: null, error: MISSING_RPC_PGRST202 })
      const tplQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "tpl-1", cycle_type: "INTERVAL_30", is_active: true },
            error: null,
          }),
        }),
      }
      const existingPlannedQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: "existing-plan" }, error: null }),
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

    it("RPC 부재 외 오류(예: 42501)는 Legacy 폴백 없이 비차단 false를 반환한다", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined)
      rpc.mockResolvedValueOnce({ data: null, error: { code: "42501", message: "permission denied" } })

      try {
        const success = await createNextIntervalSubscriptionExpense({
          userId: "user-1",
          templateId: "tpl-1",
          originalTargetDate: "2026-10-25",
          paymentDate: "2026-10-15",
        })
        expect(success).toBe(false)
        expect(from).not.toHaveBeenCalled()
      } finally {
        warnSpy.mockRestore()
      }
    })
  })

  describe("rollbackIntervalSubscriptionExpense (RPC 전환 및 Legacy 폴백)", () => {
    it("RPC 정상 시 rollback_interval_subscription만 호출하고 from()을 건드리지 않는다", async () => {
      rpc.mockResolvedValueOnce({ data: true, error: null })

      const success = await rollbackIntervalSubscriptionExpense({
        userId: "user-1",
        expenseId: "exp-refunded-1",
        templateId: "tpl-1",
      })

      expect(success).toBe(true)
      expect(rpc).toHaveBeenCalledWith("rollback_interval_subscription", {
        p_expense_id: "exp-refunded-1",
      })
      expect(from).not.toHaveBeenCalled()
    })

    it.each([MISSING_RPC_PGRST202, MISSING_RPC_42883])(
      "RPC 부재 오류($code) 시 Legacy 폴백으로 다음 PLANNED 예정일을 차감한다",
      async (missingError) => {
        rpc.mockResolvedValueOnce({ data: null, error: missingError })
        const tplQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: "tpl-1", cycle_type: "INTERVAL_30", interval_days: 30 },
              error: null,
            }),
          }),
        }
        const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
        const expensesQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: "exp-planned-next", target_date: "2026-11-24" },
            error: null,
          }),
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
        expect(update).toHaveBeenCalledWith({ target_date: "2026-10-25" })
      },
    )

    it("Legacy 폴백: INTERVAL_30이 아닌 템플릿 환불 시 false를 반환한다", async () => {
      rpc.mockResolvedValueOnce({ data: null, error: MISSING_RPC_PGRST202 })
      const tplQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: "tpl-monthly", cycle_type: "MONTHLY_DAY" },
            error: null,
          }),
        }),
      }
      from.mockImplementation((table: string) => (table === "subscription_templates" ? tplQuery : {}))

      const success = await rollbackIntervalSubscriptionExpense({
        userId: "user-1",
        expenseId: "exp-1",
        templateId: "tpl-monthly",
      })

      expect(success).toBe(false)
    })

    it("RPC 부재 외 오류는 Legacy 폴백 없이 비차단 false를 반환한다", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined)
      rpc.mockResolvedValueOnce({ data: null, error: { code: "42501", message: "denied" } })

      try {
        const success = await rollbackIntervalSubscriptionExpense({
          userId: "user-1",
          expenseId: "exp-1",
          templateId: "tpl-1",
        })
        expect(success).toBe(false)
        expect(from).not.toHaveBeenCalled()
      } finally {
        warnSpy.mockRestore()
      }
    })
  })

  describe("ensureMonthlySubscriptionExpenses (RPC 전환 및 Legacy 폴백)", () => {
    it("RPC 정상 시 ensure_subscription_expenses만 호출하고 생성 건수를 반환한다", async () => {
      rpc.mockResolvedValueOnce({ data: 3, error: null })

      const createdCount = await ensureMonthlySubscriptionExpenses("user-1", 2026, 11, "2026-11-25")

      expect(createdCount).toBe(3)
      expect(rpc).toHaveBeenCalledTimes(1)
      expect(rpc).toHaveBeenCalledWith("ensure_subscription_expenses")
      expect(from).not.toHaveBeenCalled()
    })

    it("RPC 부재 외 오류(예: 42501/네트워크)는 Legacy 폴백 없이 비차단 0을 반환한다", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined)
      rpc.mockResolvedValueOnce({ data: null, error: { code: "42501", message: "insufficient privilege" } })

      try {
        const createdCount = await ensureMonthlySubscriptionExpenses("user-1", 2026, 11, "2026-11-25")
        expect(createdCount).toBe(0)
        expect(from).not.toHaveBeenCalled()
      } finally {
        warnSpy.mockRestore()
      }
    })

    it.each([MISSING_RPC_PGRST202, MISSING_RPC_42883])(
      "RPC 부재 오류($code) 시 Legacy 폴백으로 MONTHLY_DAY 당월 회차를 생성한다",
      async (missingError) => {
        rpc
          .mockResolvedValueOnce({ data: null, error: missingError })
          .mockResolvedValueOnce({ data: 0, error: null })
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
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
        const insert = vi.fn().mockResolvedValue({ error: null })
        from.mockImplementation((table: string) => {
          if (table === "subscription_templates") return templateQuery
          if (table === "expenses") return { ...expenseQuery, insert }
          return {}
        })

        const createdCount = await ensureMonthlySubscriptionExpenses("user-1", 2026, 12, "2026-02-01")

        expect(createdCount).toBe(1)
        expect(rpc).toHaveBeenNthCalledWith(1, "ensure_subscription_expenses")
        expect(rpc).toHaveBeenNthCalledWith(2, "dedupe_monthly_planned_expenses", { p_template_id: "template-1" })
        expect(insert).toHaveBeenCalledWith(
          expect.objectContaining({
            template_id: "template-1",
            billing_cycle: "2026-02",
            target_date: "2026-02-28",
            status: "PLANNED",
            final_amount: 17000,
          }),
        )
      },
    )

    it("Legacy 폴백 MONTHLY_DAY: 당월 회차가 이미 확정됐으면 다음 달 한 건만 생성한다", async () => {
      rpc
        .mockResolvedValueOnce({ data: null, error: MISSING_RPC_PGRST202 })
        .mockResolvedValueOnce({ data: 0, error: null })
      const templateQuery = createTemplateQuery([
        {
          id: "template-monthly",
          title: "정기 구독",
          category: "정기 구독",
          cycle_type: "MONTHLY_DAY",
          billing_day: 15,
          default_price: 10000,
          payment_method: "WALLET",
          game_id: null,
        },
      ])
      const expensesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [{ id: "confirmed", billing_cycle: "2026-02", status: "CONFIRMED", target_date: "2026-02-15" }],
          error: null,
        }),
      }
      const insert = vi.fn().mockResolvedValue({ error: null })
      from.mockImplementation((table: string) =>
        table === "subscription_templates" ? templateQuery : { ...expensesQuery, insert },
      )

      await ensureMonthlySubscriptionExpenses("user-1", 2026, 12, "2026-02-15")

      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({
          billing_cycle: "2026-03",
          target_date: "2026-03-15",
        }),
      )
    })

    it("Legacy 폴백 MONTHLY_DAY: 정리 RPC 오류 시 추가 회차 생성을 중단한다", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
      rpc
        .mockResolvedValueOnce({ data: null, error: MISSING_RPC_PGRST202 })
        .mockResolvedValueOnce({ data: null, error: { message: "not authorized" } })
      const templateQuery = createTemplateQuery([
        {
          id: "template-monthly",
          title: "정기 구독",
          category: "정기 구독",
          cycle_type: "MONTHLY_DAY",
          billing_day: 15,
          default_price: 10000,
          payment_method: "WALLET",
          game_id: null,
        },
      ])
      const insert = vi.fn()
      from.mockImplementation((table: string) =>
        table === "subscription_templates" ? templateQuery : { insert },
      )

      try {
        await expect(ensureMonthlySubscriptionExpenses("user-1", 2026, 10, "2026-10-05")).rejects.toThrow(
          "SUBSCRIPTION_LAZY_GENERATION_FAILED",
        )
        expect(insert).not.toHaveBeenCalled()
      } finally {
        errorSpy.mockRestore()
      }
    })

    it("Legacy 폴백 INTERVAL_30: 이전 CONFIRMED 지출 + interval_days로 다음 회차를 생성한다", async () => {
      rpc.mockResolvedValueOnce({ data: null, error: MISSING_RPC_PGRST202 })
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
          data: [{ id: "e1", status: "CONFIRMED", target_date: "2026-10-01" }],
          error: null,
        }),
      }
      const insert = vi.fn().mockResolvedValue({ error: null })
      from.mockImplementation((table: string) => {
        if (table === "subscription_templates") return templateQuery
        if (table === "expenses") return { ...expenseQuery, insert }
        return {}
      })

      const createdCount = await ensureMonthlySubscriptionExpenses("user-1", 2026, 10, "2026-10-05")

      expect(createdCount).toBe(1)
      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({
          template_id: "template-interval-7",
          target_date: "2026-10-08",
          status: "PLANNED",
          final_amount: 3300,
        }),
      )
    })

    it("Legacy 폴백 VERSION_PASS: 공식 VERSION 일정만 PLANNED로 생성한다", async () => {
      rpc.mockResolvedValueOnce({ data: null, error: MISSING_RPC_PGRST202 })
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
      scheduleQuery.eq = vi.fn().mockImplementation((column: string) => {
        if (column === "is_official") {
          return Promise.resolve({
            data: [
              { id: "ver-5.1", title: "5.1 버전", start_date: "2026-10-09", end_date: "2026-11-19", is_official: true },
              { id: "unofficial", title: "테스트 버전", start_date: "2026-10-09", end_date: "2026-11-19", is_official: false },
            ],
            error: null,
          })
        }
        return scheduleQuery
      })
      scheduleQuery.gte = vi.fn().mockReturnValue(scheduleQuery)

      const expenseQuery: Record<string, unknown> = {}
      expenseQuery.select = vi.fn().mockReturnValue(expenseQuery)
      expenseQuery.eq = vi.fn().mockImplementation((col: string) =>
        col === "template_id" ? Promise.resolve({ data: [], error: null }) : expenseQuery,
      )
      const insert = vi.fn().mockResolvedValue({ error: null })

      from.mockImplementation((table: string) => {
        if (table === "subscription_templates") return templateQuery
        if (table === "game_schedules") return scheduleQuery
        if (table === "expenses") return { ...expenseQuery, insert }
        return {}
      })

      const createdCount = await ensureMonthlySubscriptionExpenses("user-1", 2026, 10, "2026-10-05")

      expect(createdCount).toBe(1)
      expect(insert).toHaveBeenCalledWith([
        expect.objectContaining({
          template_id: "template-pass",
          schedule_id: "ver-5.1",
          title: "진주 기행 (5.1 버전)",
          target_date: "2026-10-09",
        }),
      ])
    })

    it("Legacy 폴백: 활성 템플릿이 없으면 0을 반환한다", async () => {
      rpc.mockResolvedValueOnce({ data: null, error: MISSING_RPC_PGRST202 })
      const templateQuery = createTemplateQuery([])
      from.mockImplementation((table: string) =>
        table === "subscription_templates" ? templateQuery : { insert: vi.fn() },
      )

      const createdCount = await ensureMonthlySubscriptionExpenses("user-1", 2026, 10)
      expect(createdCount).toBe(0)
    })
  })
})
