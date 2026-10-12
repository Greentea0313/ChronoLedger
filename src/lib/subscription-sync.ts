import { supabase } from "@/lib/supabase/client"
import { getAdjustedBillingDate } from "@/lib/calendar-utils"
import { getKstToday } from "@/lib/dashboard-date"

export type SubscriptionCycleType = "MONTHLY_DAY" | "INTERVAL_30" | "VERSION_PASS"

export interface SubscriptionTemplate {
  id: string
  title: string
  category: string
  cycle_type?: SubscriptionCycleType
  billing_day: number
  default_price: number
  payment_method: "WALLET" | "GOOGLE_PLAY" | "GALAXY_STORE"
  game_id: string | null
  is_active?: boolean
}

export function toBillingCycle(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + days)
  const nextYear = date.getUTCFullYear()
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, "0")
  const nextDay = String(date.getUTCDate()).padStart(2, "0")
  return `${nextYear}-${nextMonth}-${nextDay}`
}

export async function ensureMonthlySubscriptionExpenses(
  userId: string,
  year: number,
  month: number,
  todayStr?: string,
): Promise<number> {
  const billingCycle = toBillingCycle(year, month)
  const today = todayStr || getKstToday()

  let templates: SubscriptionTemplate[] = []
  const { data: rawTemplates, error: templateError } = await supabase
    .from("subscription_templates")
    .select("id, title, category, cycle_type, billing_day, default_price, payment_method, game_id, is_active")
    .eq("user_id", userId)
    .eq("is_active", true)

  if (templateError) {
    // DB에 cycle_type 컬럼이 아직 없는 경우를 위한 하위 호환 폴백
    const fallback = await supabase
      .from("subscription_templates")
      .select("id, title, category, billing_day, default_price, payment_method, game_id, is_active")
      .eq("user_id", userId)
      .eq("is_active", true)
    if (fallback.error || !fallback.data) {
      console.warn("구독 템플릿 조회 건너뜀:", fallback.error || templateError)
      return 0
    }
    templates = (fallback.data as unknown as SubscriptionTemplate[]).map((t) => ({
      ...t,
      cycle_type: "MONTHLY_DAY",
    }))
  } else {
    templates = (rawTemplates || []) as SubscriptionTemplate[]
  }

  if (templates.length === 0) {
    return 0
  }

  let createdCount = 0

  // 1. MONTHLY_DAY 템플릿 처리 (매월 지정일형)
  const monthlyTemplates = (templates as SubscriptionTemplate[]).filter(
    (t) => !t.cycle_type || t.cycle_type === "MONTHLY_DAY",
  )
  if (monthlyTemplates.length > 0) {
    const { data: existingExpenses } = await supabase
      .from("expenses")
      .select("template_id")
      .eq("user_id", userId)
      .eq("billing_cycle", billingCycle)


    const existingTemplateIds = new Set(
      ((existingExpenses || []) as { template_id: string }[]).map((e) => e.template_id),
    )

    const rows = monthlyTemplates
      .filter((template) => !existingTemplateIds.has(template.id))
      .map((template) => {
        const targetDate = getAdjustedBillingDate(year, month, template.billing_day || 1)
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

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from("expenses").insert(rows)
      if (insertError && insertError.code !== "23505") {
        console.error("MONTHLY_DAY 구독 회차 생성 실패:", insertError)
        throw new Error("SUBSCRIPTION_LAZY_GENERATION_FAILED")
      }
      if (!insertError) {
        createdCount += rows.length
      }
    }
  }

  // 2. INTERVAL_30 템플릿 처리 (30일 누적 충전형)
  const intervalTemplates = (templates as SubscriptionTemplate[]).filter(
    (t) => t.cycle_type === "INTERVAL_30",
  )
  for (const template of intervalTemplates) {
    const { data: existingExpenses } = await supabase
      .from("expenses")
      .select("id, status, target_date")
      .eq("user_id", userId)
      .eq("template_id", template.id)
      .order("target_date", { ascending: false })

    const hasPlanned = ((existingExpenses || []) as { status: string }[]).some(
      (e) => e.status === "PLANNED",
    )
    if (hasPlanned) {
      // 이미 미결제 예정 회차가 있으면 중복 생성하지 않음
      continue
    }

    const latestConfirmed = ((existingExpenses || []) as { status: string; target_date: string }[]).find(
      (e) => e.status === "CONFIRMED",
    )
    const targetDate = latestConfirmed ? addDays(latestConfirmed.target_date, 30) : today

    const row = {
      user_id: userId,
      template_id: template.id,
      game_id: template.game_id,
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

    const { error: insertError } = await supabase.from("expenses").insert(row)
    if (!insertError) {
      createdCount += 1
    }
  }

  // 3. VERSION_PASS 템플릿 처리 (게임 버전 패스형)
  const versionPassTemplates = (templates as SubscriptionTemplate[]).filter(
    (t) => t.cycle_type === "VERSION_PASS" && Boolean(t.game_id),
  )
  for (const template of versionPassTemplates) {
    const { data: schedules, error: scheduleError } = await supabase
      .from("game_schedules")
      .select("id, title, start_date, end_date")
      .eq("game_id", template.game_id)
      .eq("schedule_type", "VERSION")

    if (scheduleError) {
      console.warn("VERSION_PASS 일정 조회 실패:", scheduleError)
      continue
    }

    if (!schedules || schedules.length === 0) continue

    const { data: existingExpenses } = await supabase
      .from("expenses")
      .select("schedule_id")
      .eq("user_id", userId)
      .eq("template_id", template.id)

    const existingScheduleIds = new Set(
      ((existingExpenses || []) as { schedule_id: string }[]).map((e) => e.schedule_id),
    )

    const newRows = (schedules as { id: string; title: string; start_date: string; end_date: string }[])
      .filter((s) => !existingScheduleIds.has(s.id))
      .map((s) => ({
        user_id: userId,
        template_id: template.id,
        game_id: template.game_id,
        schedule_id: s.id,
        title: `${template.title} (${s.title})`,
        category: template.category,
        status: "PLANNED" as const,
        start_date: s.start_date,
        end_date: s.end_date,
        target_date: s.start_date,
        original_price: template.default_price,
        discount_amount: 0,
        point_discount_amount: 0,
        used_points: 0,
        earned_points: 0,
        final_amount: template.default_price,
        payment_method: template.payment_method,
        point_platform: template.payment_method === "WALLET" ? null : template.payment_method,
        deduct_from_asset: true,
      }))

    if (newRows.length > 0) {
      const { error: insertError } = await supabase.from("expenses").insert(newRows)
      if (insertError) {
        if (insertError.code !== "23505") {
          console.error("VERSION_PASS 회차 생성 실패:", insertError)
        }
      } else {
        createdCount += newRows.length
      }
    }
  }


  return createdCount
}
