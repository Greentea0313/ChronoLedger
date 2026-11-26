import { describe, expect, it } from "vitest"
import { decodeCsvBytes, parseCsv } from "./csv"
import { buildExpensesCsv, EXPENSE_CSV_HEADERS } from "./export-format"
import { restoreFormulaCell } from "./expense-import"

describe("parseCsv (115-5)", () => {
  it("handles commas, line breaks and doubled quotes inside quoted fields", () => {
    const text = 'a,"b,c","line1\r\nline2","say ""hi"""\r\n'
    expect(parseCsv(text)).toEqual([["a", "b,c", "line1\r\nline2", 'say "hi"']])
  })

  it("strips a UTF-8 BOM and accepts both CRLF and LF", () => {
    expect(parseCsv("﻿날짜,금액\r\n2026-10-01,100\n2026-10-02,200")).toEqual([
      ["날짜", "금액"],
      ["2026-10-01", "100"],
      ["2026-10-02", "200"],
    ])
  })

  it("keeps empty fields and does not add a row for the final line break", () => {
    expect(parseCsv("a,,c\r\n,,\r\n")).toEqual([
      ["a", "", "c"],
      ["", "", ""],
    ])
    expect(parseCsv("")).toEqual([])
  })

  it("round-trips the R113 expense CSV, restoring the formula guard quote", () => {
    const rows = [
      {
        id: "exp-1",
        target_date: "2026-10-01",
        title: '=SUM(A1) "패키지", 한정',
        category: "게임",
        game_id: "game-1",
        status: "CONFIRMED",
        cancellation_kind: null,
        original_price: 12000,
        discount_amount: 1000,
        point_discount_amount: 0,
        used_points: 0,
        earned_points: 12,
        final_amount: 11000,
        payment_method: "NAVER_PAY",
        point_platform: null,
        deduct_from_asset: false,
        start_date: null,
        end_date: null,
        memo: "-첫 줄\n둘째 줄",
        created_at: "2026-10-01T03:00:00Z",
      },
    ]
    const csv = buildExpensesCsv(rows, new Map([["game-1", "원신"]]))
    const parsed = parseCsv(csv)
    expect(parsed[0]).toEqual([...EXPENSE_CSV_HEADERS])
    const cells = parsed[1].map(restoreFormulaCell)
    expect(cells).toEqual([
      "exp-1",
      "2026-10-01",
      '=SUM(A1) "패키지", 한정',
      "게임",
      "원신",
      "game-1",
      "결제 완료",
      "",
      "12000",
      "1000",
      "0",
      "0",
      "12",
      "11000",
      "네이버페이",
      "",
      "N",
      "",
      "",
      "-첫 줄\n둘째 줄",
      "2026-10-01T12:00:00+09:00",
    ])
  })
})

describe("restoreFormulaCell (115-5)", () => {
  it("removes one guard quote only before a formula start character", () => {
    expect(restoreFormulaCell("'=1+1")).toBe("=1+1")
    expect(restoreFormulaCell("'+82")).toBe("+82")
    expect(restoreFormulaCell("'-5")).toBe("-5")
    expect(restoreFormulaCell("'@x")).toBe("@x")
    expect(restoreFormulaCell("'\tx")).toBe("\tx")
    expect(restoreFormulaCell("''=x")).toBe("''=x")
    expect(restoreFormulaCell("'quoted'")).toBe("'quoted'")
    expect(restoreFormulaCell("plain")).toBe("plain")
  })
})

describe("decodeCsvBytes (115-6, I8)", () => {
  it("reads UTF-8 and falls back to EUC-KR bytes from Korean Excel", () => {
    expect(decodeCsvBytes(new TextEncoder().encode("날짜,금액"))).toBe("날짜,금액")
    // "날짜,금액" encoded as EUC-KR (CP949).
    const eucKr = new Uint8Array([0xb3, 0xaf, 0xc2, 0xa5, 0x2c, 0xb1, 0xdd, 0xbe, 0xd7])
    expect(decodeCsvBytes(eucKr)).toBe("날짜,금액")
  })
})
