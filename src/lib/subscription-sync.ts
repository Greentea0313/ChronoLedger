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
  interval_days?: number
  default_price: number
  payment_method: "WALLET" | "GOOGLE_PLAY" | "GALAXY_STORE"
  game_id: string | null
  is_active?: boolean
}

function isMissingRpcFunction(error: unknown): boolean {
  const value = error as { code?: string } | null
  const code = value?.code ?? ""
  return code === "PGRST202" || code === "42883"
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

/**
 * 누적 충전형(INTERVAL_30) 구독 상품 결제 확정 시 다음 회차 예정(PLANNED) 지출을 생성합니다.
 * R107-A: 서버 RPC(`advance_interval_subscription`)를 호출하고, 마이그레이션 미적용(PGRST202/42883) 시에만 Legacy 폴백을 실행합니다.
 */
export async function createNextIntervalSubscriptionExpense({
  userId,
  templateId,
  originalTargetDate,
  paymentDate,
}: {
  userId: string
  templateId: string
  originalTargetDate?: string | null
  paymentDate: string
}): Promise<boolean> {
  const { data, error } = await supabase.rpc("advance_interval_subscription", {
    p_template_id: templateId,
    p_original_target_date: originalTargetDate ?? null,
    p_payment_date: paymentDate,
  })

  if (!error) {
    return Boolean(data)
  }

  if (isMissingRpcFunction(error)) {
    return createNextIntervalSubscriptionExpenseLegacy({
      userId,
      templateId,
      originalTargetDate,
      paymentDate,
    })
  }

  console.warn("누적 충전형 다음 회차 생성 RPC 실패 (비차단):", error)
  return false
}

/**
 * 누적 충전형(INTERVAL_30) 구독 지출 환불 시 다음 회차 예정(PLANNED) 지출의 예정일을 충전 일수만큼 차감(롤백)합니다.
 * R107-A: 서버 RPC(`rollback_interval_subscription`)를 호출하고, 마이그레이션 미적용(PGRST202/42883) 시에만 Legacy 폴백을 실행합니다.
 */
export async function rollbackIntervalSubscriptionExpense({
  userId,
  expenseId,
  templateId,
}: {
  userId: string
  expenseId: string
  templateId?: string | null
}): Promise<boolean> {
  const { data, error } = await supabase.rpc("rollback_interval_subscription", {
    p_expense_id: expenseId,
  })

  if (!error) {
    return Boolean(data)
  }

  if (isMissingRpcFunction(error)) {
    return rollbackIntervalSubscriptionExpenseLegacy({
      userId,
      expenseId,
      templateId,
    })
  }

  console.warn("누적 충전형 환불 롤백 RPC 실패 (비차단):", error)
  return false
}

/**
 * 활성 정기 구독 템플릿의 누락된 예정(PLANNED) 회차를 생성합니다.
 * R107-A: 서버 RPC(`ensure_subscription_expenses`, 서버 KST 기준)를 호출하고, 마이그레이션 미적용(PGRST202/42883) 시에만 Legacy 폴백을 실행합니다.
 */
export async function ensureMonthlySubscriptionExpenses(
  userId: string,
  year: number,
  month: number,
  todayStr?: string,
): Promise<number> {
  const { data, error } = await supabase.rpc("ensure_subscription_expenses")

  if (!error) {
    return typeof data === "number" ? data : 0
  }

  if (isMissingRpcFunction(error)) {
    return ensureMonthlySubscriptionExpensesLegacy(userId, year, month, todayStr)
  }

  console.warn("구독 자동 생성 RPC 실패 (비차단):", error)
  return 0
}

// ============================================================================
// R107-A-CLEANUP: 운영 DB에 MIGRATION_R107A_SERVER_SUBSCRIPTION_GENERATION.sql 적용·관찰 후
// 아래 Legacy 폴백 구현 일체를 제거합니다 (docs/r107-recurring-expense-automation-spec.md D15·§3.2).
// ============================================================================

function isMissingIsOfficialColumn(error: unknown): boolean {
  const value = error as { code?: string; message?: string; details?: string } | null
  const code = value?.code ?? ""
  const message = `${value?.message ?? ""} ${value?.details ?? ""}`.toLowerCase()
  return code === "42703" || code === "PGRST204" || (
    message.includes("is_official") &&
    (message.includes("column") || message.includes("schema cache") || message.includes("field"))
  )
}

function toBillingCycleLegacy(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`
}

function calculateNextIntervalTargetDateLegacy(
  originalTargetDate: string | null | undefined,
  paymentDate: string,
  intervalDays: number = 30,
): string {
  const stepDays = intervalDays > 0 ? intervalDays : 30
  if (originalTargetDate && originalTargetDate > paymentDate) {
    return addDays(originalTargetDate, stepDays)
  }
  return addDays(paymentDate, stepDays)
}

function calculateRollbackIntervalTargetDateLegacy(
  currentTargetDate: string,
  intervalDays: number = 30,
): string {
  const stepDays = intervalDays > 0 ? intervalDays : 30
  return addDays(currentTargetDate, -stepDays)
}

async function createNextIntervalSubscriptionExpenseLegacy({
  userId,
  templateId,
  originalTargetDate,
  paymentDate,
}: {
  userId: string
  templateId: string
  originalTargetDate?: string | null
  paymentDate: string
}): Promise<boolean> {
  const { data: template, error: tplError } = await supabase
    .from("subscription_templates")
    .select("id, title, category, cycle_type, interval_days, default_price, payment_method, game_id, is_active")
    .eq("id", templateId)
    .single()

  if (tplError || !template || template.cycle_type !== "INTERVAL_30" || !template.is_active) {
    return false
  }

  const { data: existingPlanned } = await supabase
    .from("expenses")
    .select("id")
    .eq("user_id", userId)
    .eq("template_id", templateId)
    .eq("status", "PLANNED")
    .maybeSingle()

  if (existingPlanned) {
    return false
  }

  const stepDays = template.interval_days || 30
  const nextTargetDate = calculateNextIntervalTargetDateLegacy(originalTargetDate, paymentDate, stepDays)

  const row = {
    user_id: userId,
    template_id: template.id,
    game_id: template.game_id,
    title: template.title,
    category: template.category,
    status: "PLANNED" as const,
    target_date: nextTargetDate,
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
  if (insertError) {
    console.error("누적 충전형 다음 회차 생성 실패:", insertError)
    return false
  }

  return true
}

async function rollbackIntervalSubscriptionExpenseLegacy({
  userId,
  expenseId,
  templateId,
}: {
  userId: string
  expenseId: string
  templateId?: string | null
}): Promise<boolean> {
  let targetTemplateId = templateId

  if (!targetTemplateId) {
    const { data: refundedExpense } = await supabase
      .from("expenses")
      .select("template_id")
      .eq("id", expenseId)
      .maybeSingle()

    targetTemplateId = refundedExpense?.template_id
  }

  if (!targetTemplateId) return false

  const { data: template } = await supabase
    .from("subscription_templates")
    .select("id, cycle_type, interval_days")
    .eq("id", targetTemplateId)
    .maybeSingle()

  if (!template || template.cycle_type !== "INTERVAL_30") return false

  const stepDays = template.interval_days || 30

  const { data: plannedExpense } = await supabase
    .from("expenses")
    .select("id, target_date")
    .eq("user_id", userId)
    .eq("template_id", targetTemplateId)
    .eq("status", "PLANNED")
    .maybeSingle()

  if (!plannedExpense) return false

  const newTargetDate = calculateRollbackIntervalTargetDateLegacy(plannedExpense.target_date, stepDays)

  const { error: updateError } = await supabase
    .from("expenses")
    .update({ target_date: newTargetDate })
    .eq("id", plannedExpense.id)

  if (updateError) {
    console.error("누적 충전형 환불 차감 실패:", updateError)
    return false
  }

  return true
}

async function ensureMonthlySubscriptionExpensesLegacy(
  userId: string,
  year: number,
  month: number,
  todayStr?: string,
): Promise<number> {
  const today = todayStr || getKstToday()
  // Keep the view-month arguments for callers, but monthly plans follow KST today.
  void year
  void month

  let templates: SubscriptionTemplate[] = []
  const { data: rawTemplates, error: templateError } = await supabase
    .from("subscription_templates")
    .select("id, title, category, cycle_type, billing_day, interval_days, default_price, payment_method, game_id, is_active")
    .eq("user_id", userId)
    .eq("is_active", true)

  if (templateError) {
    const fallbackWithCycle = await supabase
      .from("subscription_templates")
      .select("id, title, category, cycle_type, billing_day, default_price, payment_method, game_id, is_active")
      .eq("user_id", userId)
      .eq("is_active", true)

    if (!fallbackWithCycle.error && fallbackWithCycle.data) {
      templates = (fallbackWithCycle.data as unknown as SubscriptionTemplate[]).map((t) => ({
        ...t,
        interval_days: 30,
      }))
    } else {
      const fallbackOld = await supabase
        .from("subscription_templates")
        .select("id, title, category, billing_day, default_price, payment_method, game_id, is_active")
        .eq("user_id", userId)
        .eq("is_active", true)

      if (fallbackOld.error || !fallbackOld.data) {
        console.warn("구독 템플릿 조회 건너뜀:", fallbackOld.error || templateError)
        return 0
      }
      templates = (fallbackOld.data as unknown as SubscriptionTemplate[]).map((t) => ({
        ...t,
        cycle_type: "MONTHLY_DAY",
        interval_days: 30,
      }))
    }
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
    for (const template of monthlyTemplates) {
      const { error: dedupeError } = await supabase.rpc("dedupe_monthly_planned_expenses", {
        p_template_id: template.id,
      })
      if (dedupeError) {
        console.error("MONTHLY_DAY 중복 예정 회차 정리 실패:", dedupeError)
        throw new Error("SUBSCRIPTION_LAZY_GENERATION_FAILED")
      }

      const { data: existingExpenses, error: expenseError } = await supabase
        .from("expenses")
        .select("id, billing_cycle, status, target_date")
        .eq("user_id", userId)
        .eq("template_id", template.id)
        .order("target_date", { ascending: true })

      if (expenseError) {
        console.error("MONTHLY_DAY 기존 회차 조회 실패:", expenseError)
        throw new Error("SUBSCRIPTION_LAZY_GENERATION_FAILED")
      }

      const templateExpenses = (existingExpenses || []) as {
        id: string
        billing_cycle: string | null
        status: string
        target_date: string
      }[]
      const plannedExpenses = templateExpenses.filter((expense) => expense.status === "PLANNED")
      const nextPlanned = plannedExpenses[0]
      if (nextPlanned) continue

      let nextDate = getAdjustedBillingDate(
        Number(today.slice(0, 4)),
        Number(today.slice(5, 7)),
        template.billing_day || 1,
      )
      let nextCycle = toBillingCycleLegacy(Number(today.slice(0, 4)), Number(today.slice(5, 7)))

      if (nextDate < today) {
        const nextMonthDate = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 1))
        nextDate = getAdjustedBillingDate(
          nextMonthDate.getUTCFullYear(),
          nextMonthDate.getUTCMonth() + 1,
          template.billing_day || 1,
        )
        nextCycle = toBillingCycleLegacy(nextMonthDate.getUTCFullYear(), nextMonthDate.getUTCMonth() + 1)
      }

      while (templateExpenses.some((expense) => expense.billing_cycle === nextCycle)) {
        const nextMonthDate = new Date(Date.UTC(Number(nextCycle.slice(0, 4)), Number(nextCycle.slice(5, 7)), 1))
        nextCycle = toBillingCycleLegacy(nextMonthDate.getUTCFullYear(), nextMonthDate.getUTCMonth() + 1)
        nextDate = getAdjustedBillingDate(
          nextMonthDate.getUTCFullYear(),
          nextMonthDate.getUTCMonth() + 1,
          template.billing_day || 1,
        )
      }

      const row = {
        user_id: userId,
        template_id: template.id,
        game_id: template.game_id,
        billing_cycle: nextCycle,
        title: template.title,
        category: template.category,
        status: "PLANNED" as const,
        target_date: nextDate,
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
      if (insertError && insertError.code !== "23505") {
        console.error("MONTHLY_DAY 구독 회차 생성 실패:", insertError)
        throw new Error("SUBSCRIPTION_LAZY_GENERATION_FAILED")
      }
      if (!insertError) {
        createdCount += 1
      }
    }
  }

  // 2. INTERVAL_30 템플릿 처리 (누적 충전형)
  const intervalTemplates = (templates as SubscriptionTemplate[]).filter(
    (t) => t.cycle_type === "INTERVAL_30",
  )
  for (const template of intervalTemplates) {
    const stepDays = template.interval_days || 30
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
      continue
    }

    const latestConfirmed = ((existingExpenses || []) as { status: string; target_date: string }[]).find(
      (e) => e.status === "CONFIRMED",
    )
    const targetDate = latestConfirmed ? addDays(latestConfirmed.target_date, stepDays) : today

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
    const gameId = template.game_id
    if (!gameId) continue
    const { data: officialSchedules, error: officialScheduleError } = await supabase
      .from("game_schedules")
      .select("id, title, start_date, end_date, is_official")
      .eq("game_id", gameId)
      .eq("schedule_type", "VERSION")
      .gte("end_date", today)
      .eq("is_official", true)

    let schedules = officialSchedules as {
      id: string
      title: string
      start_date: string
      end_date: string
      is_official?: boolean
    }[] | null
    let scheduleError = officialScheduleError

    if (isMissingIsOfficialColumn(officialScheduleError)) {
      const legacyResult = await supabase
        .from("game_schedules")
        .select("id, title, start_date, end_date")
        .eq("game_id", gameId)
        .eq("schedule_type", "VERSION")
        .gte("end_date", today)
      schedules = (legacyResult.data || []).map((schedule) => ({
        ...(schedule as { id: string; title: string; start_date: string; end_date: string }),
        is_official: true,
      }))
      scheduleError = legacyResult.error
    }

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

    const newRows = (schedules || [])
      .filter((s) => s.is_official !== false && !existingScheduleIds.has(s.id))
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
