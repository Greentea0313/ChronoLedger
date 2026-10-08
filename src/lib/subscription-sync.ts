import { supabase } from "@/lib/supabase/client"
import { getAdjustedBillingDate } from "@/lib/calendar-utils"

interface SubscriptionTemplate {
  id: string
  title: string
  category: string
  billing_day: number
  default_price: number
  payment_method: "WALLET" | "GOOGLE_PLAY" | "GALAXY_STORE"
  game_id: string | null
}

function toBillingCycle(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`
}

export async function ensureMonthlySubscriptionExpenses(
  userId: string,
  year: number,
  month: number,
): Promise<number> {
  const billingCycle = toBillingCycle(year, month)
  const { data: templates, error: templateError } = await supabase
    .from("subscription_templates")
    .select("id, title, category, billing_day, default_price, payment_method, game_id")
    .eq("user_id", userId)
    .eq("is_active", true)

  if (templateError) {
    throw new Error("SUBSCRIPTION_TEMPLATE_FETCH_FAILED")
  }
  if (!templates || templates.length === 0) {
    return 0
  }

  const rows = (templates as SubscriptionTemplate[]).map((template) => {
    const targetDate = getAdjustedBillingDate(year, month, template.billing_day)
    return {
      user_id: userId,
      template_id: template.id,
      game_id: template.game_id,
      billing_cycle: billingCycle,
      title: template.title,
      category: template.category,
      status: "PLANNED" as const,
      target_date: targetDate,
      original_price: template.default_price,
      discount_amount: 0,
      point_discount_amount: 0,
      used_points: 0,
      earned_points: 0,
      final_amount: template.default_price,
      payment_method: template.payment_method,
      point_platform: template.payment_method === "WALLET" ? null : template.payment_method,
      deduct_from_asset: true,
    }
  })

  const { error: insertError } = await supabase
    .from("expenses")
    .upsert(rows, { onConflict: "template_id,billing_cycle", ignoreDuplicates: true })

  if (insertError) {
    throw new Error("SUBSCRIPTION_LAZY_GENERATION_FAILED")
  }

  return rows.length
}
