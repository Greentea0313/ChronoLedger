import { describe, expect, it, vi } from "vitest"
import { ensureMonthlySubscriptionExpenses } from "./subscription-sync"

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

describe("ensureMonthlySubscriptionExpenses", () => {
  it("creates planned rows for active templates with billing-cycle conflict ignore", async () => {
    const templateQuery = createTemplateQuery([
      {
        id: "template-1",
        title: "월정액",
        category: "정기 구독",
        billing_day: 31,
        default_price: 15000,
        payment_method: "WALLET",
        game_id: "game-1",
      },
    ])
    const upsert = vi.fn().mockResolvedValue({ error: null })
    from.mockImplementation((table: string) => {
      if (table === "subscription_templates") return templateQuery
      return { upsert }
    })

    const createdCount = await ensureMonthlySubscriptionExpenses("user-1", 2026, 2)

    expect(createdCount).toBe(1)
    expect(upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          billing_cycle: "2026-02",
          target_date: "2026-02-28",
          status: "PLANNED",
          final_amount: 15000,
        }),
      ],
      { onConflict: "template_id,billing_cycle", ignoreDuplicates: true },
    )
  })

  it("returns zero when no active templates exist", async () => {
    const templateQuery = createTemplateQuery([])
    from.mockImplementation((table: string) => {
      if (table === "subscription_templates") return templateQuery
      return { upsert: vi.fn() }
    })

    const createdCount = await ensureMonthlySubscriptionExpenses("user-1", 2026, 10)
    expect(createdCount).toBe(0)
  })
})
