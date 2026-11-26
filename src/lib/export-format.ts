// R113: 데이터 내보내기 형식 정의. 열 순서·라벨·코드 매핑·수식 방지 규칙은 이 파일에만 둔다(R115가 같은 형식을 읽는다).

export const BACKUP_FORMAT = "chronoledger-backup"
export const BACKUP_VERSION = 1
export const PAGE_SIZE = 1000

export interface BackupTableConfig {
  table: string
  /** 본인 행을 고르는 열. `users`는 `id`, 나머지는 `user_id`. */
  filterColumn: "id" | "user_id"
  /** 페이지 조회가 흔들리지 않도록 고정하는 정렬 열. */
  orderColumns: readonly string[]
}

/** 본인 행만 담는 백업 대상 테이블. `push_subscriptions`·`notifications`·`account_deletion_requests`·관리자 테이블은 의도적으로 제외한다. */
export const BACKUP_TABLES: readonly BackupTableConfig[] = [
  { table: "users", filterColumn: "id", orderColumns: ["created_at", "id"] },
  { table: "user_finances", filterColumn: "user_id", orderColumns: ["id"] },
  { table: "monthly_budgets", filterColumn: "user_id", orderColumns: ["created_at", "id"] },
  { table: "incomes", filterColumn: "user_id", orderColumns: ["created_at", "id"] },
  { table: "expenses", filterColumn: "user_id", orderColumns: ["created_at", "id"] },
  { table: "store_wallets", filterColumn: "user_id", orderColumns: ["id"] },
  { table: "store_point_transactions", filterColumn: "user_id", orderColumns: ["created_at", "id"] },
  { table: "subscription_templates", filterColumn: "user_id", orderColumns: ["created_at", "id"] },
  { table: "user_expense_presets", filterColumn: "user_id", orderColumns: ["created_at", "id"] },
  { table: "user_games", filterColumn: "user_id", orderColumns: ["created_at", "id"] },
  { table: "user_favorite_schedules", filterColumn: "user_id", orderColumns: ["created_at", "id"] },
  { table: "personal_memos", filterColumn: "user_id", orderColumns: ["created_at", "id"] },
  { table: "user_characters", filterColumn: "user_id", orderColumns: ["created_at", "id"] },
  { table: "user_character_presets", filterColumn: "user_id", orderColumns: ["created_at", "id"] },
  { table: "notification_settings", filterColumn: "user_id", orderColumns: ["user_id"] },
  { table: "feedback_requests", filterColumn: "user_id", orderColumns: ["created_at", "id"] },
  { table: "game_requests", filterColumn: "user_id", orderColumns: ["created_at", "id"] },
  { table: "schedule_requests", filterColumn: "user_id", orderColumns: ["created_at", "id"] },
  { table: "character_requests", filterColumn: "user_id", orderColumns: ["created_at", "id"] },
]

export const EXPENSE_CSV_HEADERS = [
  "ID",
  "날짜",
  "항목명",
  "분류",
  "게임",
  "게임ID",
  "상태",
  "취소구분",
  "정가",
  "할인액",
  "포인트할인액",
  "사용포인트",
  "적립포인트",
  "실결제액",
  "결제수단",
  "포인트플랫폼",
  "자산차감",
  "기간시작",
  "기간종료",
  "메모",
  "생성시각",
] as const

export const INCOME_CSV_HEADERS = ["ID", "날짜", "분류", "항목명", "금액", "메모", "생성시각"] as const

export const EXPENSE_STATUS_LABELS: Record<string, string> = {
  PLANNED: "예정",
  CONFIRMED: "결제 완료",
  CANCELLED: "취소됨",
}

export const CANCELLATION_KIND_LABELS: Record<string, string> = {
  PLANNED_CANCEL: "예정 취소",
  TEMPLATE_DEACTIVATION: "구독 해지",
  PAYMENT_REFUND: "결제 환불",
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  WALLET: "내 지갑",
  NAVER_PAY: "네이버페이",
  GOOGLE_PLAY: "내 지갑 (구 Google Play)",
  GALAXY_STORE: "내 지갑 (구 Galaxy Store)",
}

export const POINT_PLATFORM_LABELS: Record<string, string> = {
  GOOGLE_PLAY: "Google Play",
  GALAXY_STORE: "Galaxy Store",
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/** UTC 시각을 `YYYY-MM-DDTHH:mm:ss+09:00` 형식으로 바꾼다. 해석할 수 없으면 원문을 그대로 돌려준다. */
export function toKstIso(value: string | Date | null | undefined): string {
  if (value === null || value === undefined || value === "") return ""
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return `${new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 19)}+09:00`
}

/** 파일명에 쓰는 KST 날짜(`YYYYMMDD`). */
export function formatKstDateStamp(now: Date = new Date()): string {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10).replace(/-/g, "")
}

export function buildBackupFileName(now?: Date): string {
  return `chronoledger-backup-${formatKstDateStamp(now)}.json`
}

export function buildExpensesFileName(now?: Date): string {
  return `chronoledger-expenses-${formatKstDateStamp(now)}.csv`
}

export function buildIncomesFileName(now?: Date): string {
  return `chronoledger-incomes-${formatKstDateStamp(now)}.csv`
}

const FORMULA_PREFIX = /^[=+\-@\t\r]/

/** 문자열 셀 하나를 CSV 규칙에 맞게 바꾼다. 수식으로 읽힐 수 있는 시작 문자 앞에는 `'`를 붙인다. */
export function toCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return ""
  let text = typeof value === "string" ? value : String(value)
  if (typeof value === "string" && FORMULA_PREFIX.test(text)) text = `'${text}`
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`
  return text
}

/** UTF-8 BOM + CRLF 줄바꿈 CSV 본문을 만든다. */
export function buildCsv(
  headers: readonly string[],
  rows: readonly (readonly (string | number | boolean | null | undefined)[])[],
): string {
  const lines = [headers, ...rows].map((row) => row.map(toCsvCell).join(","))
  return `﻿${lines.join("\r\n")}\r\n`
}

type Row = Record<string, unknown>

function text(value: unknown): string {
  return value === null || value === undefined ? "" : String(value)
}

function num(value: unknown): number | "" {
  if (value === null || value === undefined || value === "") return ""
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : ""
}

function label(map: Record<string, string>, code: unknown): string {
  const key = text(code)
  return map[key] ?? key
}

export function buildExpensesCsv(rows: readonly Row[], gameNames: ReadonlyMap<string, string>): string {
  return buildCsv(
    EXPENSE_CSV_HEADERS,
    rows.map((row) => [
      text(row.id),
      text(row.target_date),
      text(row.title),
      text(row.category),
      gameNames.get(text(row.game_id)) ?? "",
      text(row.game_id),
      label(EXPENSE_STATUS_LABELS, row.status),
      row.cancellation_kind ? label(CANCELLATION_KIND_LABELS, row.cancellation_kind) : "",
      num(row.original_price),
      num(row.discount_amount),
      num(row.point_discount_amount),
      num(row.used_points),
      num(row.earned_points),
      num(row.final_amount),
      label(PAYMENT_METHOD_LABELS, row.payment_method),
      row.point_platform ? label(POINT_PLATFORM_LABELS, row.point_platform) : "",
      row.deduct_from_asset ? "Y" : "N",
      text(row.start_date),
      text(row.end_date),
      text(row.memo),
      toKstIso(row.created_at as string | null | undefined),
    ]),
  )
}

export function buildIncomesCsv(rows: readonly Row[]): string {
  return buildCsv(
    INCOME_CSV_HEADERS,
    rows.map((row) => [
      text(row.id),
      text(row.income_date),
      text(row.category),
      text(row.title),
      num(row.amount),
      text(row.memo),
      toKstIso(row.created_at as string | null | undefined),
    ]),
  )
}
