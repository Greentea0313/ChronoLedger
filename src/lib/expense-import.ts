// R115: CSV 결제 내역 가져오기 해석(명세 docs/r113-r116-data-budget-public-spec.md §5, I9~I14).
// 서버 RPC import_confirmed_expenses가 같은 범위를 다시 검사하므로, 여기서는 미리보기에서 걸러 낼 행을 정한다.

import { EXPENSE_CSV_HEADERS, EXPENSE_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/export-format"

export const IMPORT_MAX_BYTES = 2 * 1024 * 1024
export const IMPORT_MAX_ROWS = 1000
export const IMPORT_MAX_AMOUNT = 10_000_000_000
export const IMPORT_MIN_DATE = "2000-01-01"
export const IMPORT_CATEGORIES = ["게임", "정기 구독", "식비", "교통", "생활", "기타"] as const
const TITLE_MAX = 150
const MEMO_MAX = 500

export type ExcludeReason =
  | "ALREADY_EXISTS"
  | "NOT_CONFIRMED"
  | "INVALID_DATE"
  | "DATE_OUT_OF_RANGE"
  | "INVALID_AMOUNT"
  | "EMPTY_TITLE"
  | "TITLE_TOO_LONG"

export const EXCLUDE_REASON_LABELS: Record<ExcludeReason, string> = {
  ALREADY_EXISTS: "이미 있는 지출",
  NOT_CONFIRMED: "결제 완료 외 상태",
  INVALID_DATE: "날짜 해석 불가",
  DATE_OUT_OF_RANGE: "날짜 범위 밖(미래·2000년 이전)",
  INVALID_AMOUNT: "금액 0 이하·해석 불가(환불 행일 수 있음)",
  EMPTY_TITLE: "항목명 없음",
  TITLE_TOO_LONG: "항목명 150자 초과",
}

export interface ImportGame {
  id: string
  name: string
}

export interface ImportExistingExpense {
  id: string
  status: string
  target_date: string
  final_amount: number
  title: string
}

export interface ImportContext {
  games: readonly ImportGame[]
  existing: readonly ImportExistingExpense[]
  /** KST 오늘(YYYY-MM-DD). 이후 날짜는 제외한다. */
  today: string
}

/** 일반 CSV의 열 번호 지정. 필수 3개, 선택 3개(null이면 사용 안 함). */
export interface ColumnMapping {
  date: number
  amount: number
  title: number
  category: number | null
  game: number | null
  memo: number | null
}

export interface ImportCandidate {
  /** 헤더를 1행으로 센 CSV 행 번호. */
  rowNumber: number
  target_date: string | null
  title: string
  category: string
  amount: number | null
  game_id: string | null
  /** 파일에 게임 이름이 있지만 카탈로그와 정확히 일치하지 않음. */
  gameUnmatched: boolean
  memo: string | null
  excludeReason: ExcludeReason | null
  /** 같은 날짜·금액·제목의 기존 지출이 있음(기본 체크 해제, I14). */
  suspectedDuplicate: boolean
}

export interface ImportRowPayload {
  target_date: string
  title: string
  category: string
  amount: number
  game_id: string | null
  memo: string | null
}

const FORMULA_ESCAPED = /^'[=+\-@\t\r]/

/** R113이 수식 방지로 붙인 `'`만 지운다(`'` 뒤에 `=`·`+`·`-`·`@`·탭·CR이 올 때). */
export function restoreFormulaCell(cell: string): string {
  return FORMULA_ESCAPED.test(cell) ? cell.slice(1) : cell
}

/** 첫 줄이 R113 지출 CSV 헤더와 정확히 같으면 자체 형식이다(I10). */
export function isOwnExportHeader(header: readonly string[]): boolean {
  return header.length === EXPENSE_CSV_HEADERS.length && EXPENSE_CSV_HEADERS.every((name, i) => header[i] === name)
}

/** `YYYY-MM-DD`·`YYYY.MM.DD`·`YYYY/MM/DD`(월·일 한 자리 허용, 뒤 시각은 무시). 실제 없는 날짜면 null(I12). */
export function parseImportDate(text: string): string | null {
  const match = /^\s*(\d{4})[-./](\d{1,2})[-./](\d{1,2})\.?(?:[\sT].*)?$/.exec(text)
  if (!match) return null
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return `${match[1]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

/** `₩`·`￦`·`원`·쉼표·공백을 지운 뒤 0 이상 정수만 받는다. 음수·소수·그 밖의 문자는 null(I12). */
export function parseImportAmount(text: string): number | null {
  const normalized = text.replace(/[₩￦원,\s]/g, "")
  if (!/^\d+$/.test(normalized) || normalized.length > 15) return null
  return Number(normalized)
}

/** 중복 비교용 제목: 앞뒤 공백 제거·공백 압축·소문자. */
export function normalizeImportTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLowerCase()
}

function charLength(text: string): number {
  return Array.from(text).length
}

/** 원래 메모 뒤에 `[가져오기] …` 줄을 붙이고, 500자를 넘으면 원래 메모를 줄인다(I2). */
function buildMemo(original: string, extras: readonly string[]): string | null {
  const base = original.trim()
  if (extras.length === 0) return base === "" ? null : Array.from(base).slice(0, MEMO_MAX).join("")
  const suffix = `[가져오기] ${extras.join(" · ")}`
  if (base === "") return Array.from(suffix).slice(0, MEMO_MAX).join("")
  const room = MEMO_MAX - charLength(suffix) - 1
  if (room <= 0) return Array.from(suffix).slice(0, MEMO_MAX).join("")
  return `${Array.from(base).slice(0, room).join("")}\n${suffix}`
}

interface RawRow {
  rowNumber: number
  existingId: string | null
  notConfirmed: boolean
  dateText: string
  amountText: string
  title: string
  category: string
  gameIdText: string
  gameName: string
  memo: string
  memoExtras: string[]
}

function isBlankRow(row: readonly string[]): boolean {
  return row.every((cell) => cell.trim() === "")
}

/** 헤더를 뺀 데이터 행(빈 줄 제외) 수. 1,000행을 넘으면 파일을 나눠야 한다(I9). */
export function countDataRows(rows: readonly (readonly string[])[]): number {
  return rows.slice(1).filter((row) => !isBlankRow(row)).length
}

function resolveGame(gameIdText: string, gameName: string, games: readonly ImportGame[]) {
  const byId = games.find((game) => game.id === gameIdText.trim())
  if (byId) return { game_id: byId.id, unmatched: false }
  const name = gameName.trim().toLowerCase()
  if (name === "") return { game_id: null, unmatched: false }
  const byName = games.find((game) => game.name.trim().toLowerCase() === name)
  return byName ? { game_id: byName.id, unmatched: false } : { game_id: null, unmatched: true }
}

function finalize(raws: readonly RawRow[], ctx: ImportContext): ImportCandidate[] {
  const candidates = raws.map((raw): ImportCandidate => {
    const target_date = parseImportDate(raw.dateText)
    const amount = parseImportAmount(raw.amountText)
    const title = raw.title.trim()
    const game = resolveGame(raw.gameIdText, raw.gameName, ctx.games)
    const extras = [...raw.memoExtras]
    if (game.unmatched) extras.push(`게임: ${raw.gameName.trim()}`)

    let excludeReason: ExcludeReason | null = null
    if (raw.existingId) excludeReason = "ALREADY_EXISTS"
    else if (raw.notConfirmed) excludeReason = "NOT_CONFIRMED"
    else if (!target_date) excludeReason = "INVALID_DATE"
    else if (target_date < IMPORT_MIN_DATE || target_date > ctx.today) excludeReason = "DATE_OUT_OF_RANGE"
    else if (amount === null || amount < 1 || amount > IMPORT_MAX_AMOUNT) excludeReason = "INVALID_AMOUNT"
    else if (title === "") excludeReason = "EMPTY_TITLE"
    else if (charLength(title) > TITLE_MAX) excludeReason = "TITLE_TOO_LONG"

    return {
      rowNumber: raw.rowNumber,
      target_date,
      title,
      category: raw.category,
      amount,
      game_id: game.game_id,
      gameUnmatched: game.unmatched,
      memo: buildMemo(raw.memo, extras),
      excludeReason,
      suspectedDuplicate: false,
    }
  })

  // I14: 기존 CONFIRMED·PLANNED와 같은 날짜·금액·정규화 제목이면 기존 건수만큼만 의심으로 표시한다.
  const remaining = new Map<string, number>()
  ctx.existing.forEach((expense) => {
    if (expense.status !== "CONFIRMED" && expense.status !== "PLANNED") return
    const key = `${expense.target_date}|${expense.final_amount}|${normalizeImportTitle(expense.title)}`
    remaining.set(key, (remaining.get(key) ?? 0) + 1)
  })
  candidates.forEach((candidate) => {
    if (candidate.excludeReason) return
    const key = `${candidate.target_date}|${candidate.amount}|${normalizeImportTitle(candidate.title)}`
    const left = remaining.get(key) ?? 0
    if (left > 0) {
      candidate.suspectedDuplicate = true
      remaining.set(key, left - 1)
    }
  })
  return candidates
}

/** 자체 형식(R113 지출 CSV): `결제 완료` 행만, 금액은 `실결제액`, 이미 있는 `ID`는 제외(I10). */
export function buildOwnFormatCandidates(rows: readonly (readonly string[])[], ctx: ImportContext): ImportCandidate[] {
  const column = (name: (typeof EXPENSE_CSV_HEADERS)[number]) => EXPENSE_CSV_HEADERS.indexOf(name)
  const existingIds = new Set(ctx.existing.map((expense) => expense.id))
  const raws: RawRow[] = []
  rows.slice(1).forEach((row, index) => {
    if (isBlankRow(row)) return
    const cell = (name: (typeof EXPENSE_CSV_HEADERS)[number]) => restoreFormulaCell(row[column(name)] ?? "")
    const id = cell("ID").trim()
    const category = cell("분류").trim()
    const paymentLabel = cell("결제수단").trim()
    const originalPrice = parseImportAmount(cell("정가"))
    const finalAmount = parseImportAmount(cell("실결제액"))
    const memoExtras: string[] = []
    if (paymentLabel !== "" && paymentLabel !== PAYMENT_METHOD_LABELS.WALLET) memoExtras.push(`결제수단: ${paymentLabel}`)
    if (originalPrice !== null && finalAmount !== null && originalPrice !== finalAmount) {
      memoExtras.push(`정가: ${originalPrice.toLocaleString("ko-KR")}원`)
    }
    raws.push({
      rowNumber: index + 2,
      existingId: id !== "" && existingIds.has(id) ? id : null,
      notConfirmed: cell("상태").trim() !== EXPENSE_STATUS_LABELS.CONFIRMED,
      dateText: cell("날짜"),
      amountText: cell("실결제액"),
      title: cell("항목명"),
      category: (IMPORT_CATEGORIES as readonly string[]).includes(category) ? category : "기타",
      gameIdText: cell("게임ID"),
      gameName: cell("게임"),
      memo: cell("메모"),
      memoExtras,
    })
  })
  return finalize(raws, ctx)
}

/** 일반 CSV: 지정한 열로 해석한다. 분류 열이 없으면 기본 분류, 허용 목록 밖 값은 `기타`(I11). */
export function buildGenericCandidates(
  rows: readonly (readonly string[])[],
  mapping: ColumnMapping,
  defaultCategory: string,
  ctx: ImportContext,
): ImportCandidate[] {
  const raws: RawRow[] = []
  rows.slice(1).forEach((row, index) => {
    if (isBlankRow(row)) return
    const cell = (column: number | null) => (column === null ? "" : (row[column] ?? ""))
    const category = mapping.category === null ? defaultCategory : cell(mapping.category).trim()
    raws.push({
      rowNumber: index + 2,
      existingId: null,
      notConfirmed: false,
      dateText: cell(mapping.date),
      amountText: cell(mapping.amount),
      title: cell(mapping.title),
      category: (IMPORT_CATEGORIES as readonly string[]).includes(category) ? category : "기타",
      gameIdText: "",
      gameName: cell(mapping.game),
      memo: cell(mapping.memo),
      memoExtras: [],
    })
  })
  return finalize(raws, ctx)
}

const MAPPING_GUESSES: Record<"date" | "amount" | "title" | "category" | "game" | "memo", readonly string[]> = {
  date: ["날짜", "일자", "결제일", "거래일", "date"],
  amount: ["금액", "결제금액", "실결제액", "amount"],
  title: ["항목명", "상품명", "내용", "제목", "title"],
  category: ["분류", "카테고리", "category"],
  game: ["게임", "game"],
  memo: ["메모", "비고", "memo"],
}

/** 헤더 이름으로 열 지정 기본값을 추측한다. 필수 열을 못 찾으면 -1. */
export function guessColumnMapping(header: readonly string[]): ColumnMapping {
  const normalized = header.map((name) => name.trim().toLowerCase())
  const find = (key: keyof typeof MAPPING_GUESSES) => normalized.findIndex((name) => MAPPING_GUESSES[key].includes(name))
  const optional = (key: keyof typeof MAPPING_GUESSES) => {
    const index = find(key)
    return index >= 0 ? index : null
  }
  return {
    date: find("date"),
    amount: find("amount"),
    title: find("title"),
    category: optional("category"),
    game: optional("game"),
    memo: optional("memo"),
  }
}

/** 기본으로 체크할 행: 제외 사유가 없고 중복 의심이 아닌 행. */
export function isDefaultSelected(candidate: ImportCandidate): boolean {
  return candidate.excludeReason === null && !candidate.suspectedDuplicate
}

export function toImportPayload(candidates: readonly ImportCandidate[]): ImportRowPayload[] {
  return candidates
    .filter((candidate) => candidate.excludeReason === null && candidate.target_date !== null && candidate.amount !== null)
    .map((candidate) => ({
      target_date: candidate.target_date as string,
      title: candidate.title,
      category: candidate.category,
      amount: candidate.amount as number,
      game_id: candidate.game_id,
      memo: candidate.memo,
    }))
}
