import { describe, expect, it } from "vitest"
import { parseCsv } from "./csv"
import { buildExpensesCsv } from "./export-format"
import {
  buildGenericCandidates,
  buildOwnFormatCandidates,
  countDataRows,
  guessColumnMapping,
  isDefaultSelected,
  isOwnExportHeader,
  parseImportAmount,
  parseImportDate,
  toImportPayload,
  type ImportContext,
} from "./expense-import"

const games = [
  { id: "game-1", name: "원신" },
  { id: "game-2", name: "Blue Archive" },
]
const ctx = (existing: ImportContext["existing"] = []): ImportContext => ({ games, existing, today: "2026-10-15" })

describe("parseImportDate (115-6, I12)", () => {
  it("accepts dash, dot and slash dates and ignores a trailing time", () => {
    expect(parseImportDate("2026-10-01")).toBe("2026-10-01")
    expect(parseImportDate("2026.10.01")).toBe("2026-10-01")
    expect(parseImportDate("2026/1/5")).toBe("2026-01-05")
    expect(parseImportDate("2026.10.01.")).toBe("2026-10-01")
    expect(parseImportDate("2026-10-01 13:45:00")).toBe("2026-10-01")
    expect(parseImportDate("2026-10-01T13:45:00+09:00")).toBe("2026-10-01")
  })

  it("rejects impossible dates and other orders", () => {
    expect(parseImportDate("2026-02-30")).toBeNull()
    expect(parseImportDate("2026-13-01")).toBeNull()
    expect(parseImportDate("01/10/2026")).toBeNull()
    expect(parseImportDate("26-10-01")).toBeNull()
    expect(parseImportDate("")).toBeNull()
  })
})

describe("parseImportAmount (115-6, I12)", () => {
  it("strips won signs, the 원 suffix, commas and spaces", () => {
    expect(parseImportAmount("₩12,000")).toBe(12000)
    expect(parseImportAmount("12,000원")).toBe(12000)
    expect(parseImportAmount(" 3 300 ")).toBe(3300)
    expect(parseImportAmount("￦0")).toBe(0)
  })

  it("rejects negatives, decimals and text", () => {
    expect(parseImportAmount("-5000")).toBeNull()
    expect(parseImportAmount("1.5")).toBeNull()
    expect(parseImportAmount("abc")).toBeNull()
    expect(parseImportAmount("")).toBeNull()
  })
})

describe("buildGenericCandidates (115-6, I11·I13·I14)", () => {
  const header = ["거래일", "상품명", "결제금액", "카테고리", "게임", "비고"]

  it("guesses the column mapping from header names", () => {
    expect(guessColumnMapping(header)).toEqual({ date: 0, amount: 2, title: 1, category: 3, game: 4, memo: 5 })
    expect(guessColumnMapping(["a", "b"])).toEqual({ date: -1, amount: -1, title: -1, category: null, game: null, memo: null })
  })

  it("marks each exclusion reason and keeps valid rows", () => {
    const rows = parseCsv(
      [
        header.join(","),
        "2026-10-01,월정액,\"5,500원\",게임,원신,",
        "2026-10-16,미래 결제,1000,게임,,",
        "1999-12-31,옛날,1000,게임,,",
        "어제,날짜 오류,1000,게임,,",
        "2026-10-02,환불,-3000,게임,,",
        "2026-10-02,무료,0,게임,,",
        "2026-10-03,,1000,게임,,",
        `2026-10-03,${"가".repeat(151)},1000,게임,,`,
        "2026-10-04,패키지,1000,쇼핑,없는 게임,첫 메모",
        "",
      ].join("\r\n"),
    )
    const mapping = guessColumnMapping(rows[0])
    const candidates = buildGenericCandidates(rows, mapping, "게임", ctx())
    expect(countDataRows(rows)).toBe(9)
    expect(candidates.map((c) => c.excludeReason)).toEqual([
      null,
      "DATE_OUT_OF_RANGE",
      "DATE_OUT_OF_RANGE",
      "INVALID_DATE",
      "INVALID_AMOUNT",
      "INVALID_AMOUNT",
      "EMPTY_TITLE",
      "TITLE_TOO_LONG",
      null,
    ])
    expect(candidates[0]).toMatchObject({ rowNumber: 2, target_date: "2026-10-01", amount: 5500, game_id: "game-1", gameUnmatched: false, memo: null })
    // Unknown category -> 기타, unmatched game kept in the memo with game_id NULL.
    expect(candidates[8]).toMatchObject({
      rowNumber: 10,
      category: "기타",
      game_id: null,
      gameUnmatched: true,
      memo: "첫 메모\n[가져오기] 게임: 없는 게임",
    })
  })

  it("uses the default category when no category column is mapped and matches game names case-insensitively", () => {
    const rows = parseCsv("날짜,항목명,금액,게임\n2026-10-05,학생 패스, 4900 , blue archive ")
    const candidates = buildGenericCandidates(rows, { ...guessColumnMapping(rows[0]), category: null }, "식비", ctx())
    expect(candidates[0]).toMatchObject({ category: "식비", game_id: "game-2", gameUnmatched: false, amount: 4900 })
  })

  it("flags duplicates by count against existing confirmed or planned rows", () => {
    const rows = parseCsv(["날짜,항목명,금액", "2026-10-05,월정액,5500", "2026-10-05, 월정액 ,5500", "2026-10-05,월정액,5500"].join("\n"))
    const existing = [
      { id: "e1", status: "CONFIRMED", target_date: "2026-10-05", final_amount: 5500, title: "월정액" },
      { id: "e2", status: "PLANNED", target_date: "2026-10-05", final_amount: 5500, title: "월정액" },
      { id: "e3", status: "CANCELLED", target_date: "2026-10-05", final_amount: 5500, title: "월정액" },
    ]
    const candidates = buildGenericCandidates(rows, guessColumnMapping(rows[0]), "게임", ctx(existing))
    // Two existing (cancelled ignored) -> only the first two file rows are suspected.
    expect(candidates.map((c) => c.suspectedDuplicate)).toEqual([true, true, false])
    expect(candidates.map(isDefaultSelected)).toEqual([false, false, true])
  })
})

describe("own export format (115-6·115-7, I10)", () => {
  const exported = [
    {
      id: "exp-confirmed",
      target_date: "2026-10-01",
      title: "-연차 패키지",
      category: "게임",
      game_id: "game-1",
      status: "CONFIRMED",
      original_price: 33000,
      discount_amount: 0,
      point_discount_amount: 3000,
      used_points: 3000,
      earned_points: 0,
      final_amount: 30000,
      payment_method: "NAVER_PAY",
      point_platform: "GOOGLE_PLAY",
      deduct_from_asset: false,
      memo: "메모",
      created_at: "2026-10-01T00:00:00Z",
    },
    {
      id: "exp-wallet",
      target_date: "2026-10-02",
      title: "점심",
      category: "식비",
      game_id: null,
      status: "CONFIRMED",
      original_price: 9000,
      discount_amount: 0,
      point_discount_amount: 0,
      used_points: 0,
      earned_points: 0,
      final_amount: 9000,
      payment_method: "WALLET",
      deduct_from_asset: true,
      created_at: "2026-10-02T00:00:00Z",
    },
    {
      id: "exp-planned",
      target_date: "2026-10-20",
      title: "예정",
      category: "게임",
      game_id: "game-gone",
      status: "PLANNED",
      original_price: 1000,
      final_amount: 1000,
      payment_method: "WALLET",
      created_at: "2026-10-02T00:00:00Z",
    },
  ]
  const rows = parseCsv(buildExpensesCsv(exported, new Map([["game-1", "원신"], ["game-gone", "삭제된 게임"]])))

  it("is detected by its exact header and imports only confirmed rows with the paid amount", () => {
    expect(isOwnExportHeader(rows[0])).toBe(true)
    expect(isOwnExportHeader(["ID", "날짜"])).toBe(false)
    const candidates = buildOwnFormatCandidates(rows, ctx())
    expect(candidates.map((c) => c.excludeReason)).toEqual([null, null, "NOT_CONFIRMED"])
    expect(candidates[0]).toMatchObject({
      title: "-연차 패키지",
      amount: 30000,
      game_id: "game-1",
      memo: "메모\n[가져오기] 결제수단: 네이버페이 · 정가: 33,000원",
    })
    expect(candidates[1]).toMatchObject({ title: "점심", category: "식비", amount: 9000, game_id: null, memo: null })
    expect(toImportPayload(candidates.filter(isDefaultSelected))).toEqual([
      { target_date: "2026-10-01", title: "-연차 패키지", category: "게임", amount: 30000, game_id: "game-1", memo: "메모\n[가져오기] 결제수단: 네이버페이 · 정가: 33,000원" },
      { target_date: "2026-10-02", title: "점심", category: "식비", amount: 9000, game_id: null, memo: null },
    ])
  })

  it("excludes every row as already existing when re-imported into the same account", () => {
    const existing = exported.map((e) => ({ id: e.id, status: e.status, target_date: e.target_date, final_amount: e.final_amount, title: e.title }))
    const candidates = buildOwnFormatCandidates(rows, ctx(existing))
    expect(candidates.map((c) => c.excludeReason)).toEqual(["ALREADY_EXISTS", "ALREADY_EXISTS", "ALREADY_EXISTS"])
    expect(toImportPayload(candidates)).toEqual([])
  })

  it("keeps memos within 500 characters", () => {
    const long = buildOwnFormatCandidates(
      parseCsv(buildExpensesCsv([{ ...exported[0], id: "x", memo: "가".repeat(600) }], new Map())),
      ctx(),
    )
    expect(Array.from(long[0].memo ?? "").length).toBe(500)
    expect(long[0].memo?.endsWith("[가져오기] 결제수단: 네이버페이 · 정가: 33,000원")).toBe(true)
  })
})
