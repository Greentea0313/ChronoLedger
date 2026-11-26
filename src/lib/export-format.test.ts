import { describe, expect, it } from "vitest"
import {
  BACKUP_TABLES,
  EXPENSE_CSV_HEADERS,
  INCOME_CSV_HEADERS,
  buildBackupFileName,
  buildCsv,
  buildExpensesCsv,
  buildExpensesFileName,
  buildIncomesCsv,
  buildIncomesFileName,
  formatKstDateStamp,
  toCsvCell,
  toKstIso,
} from "./export-format"

describe("export-format", () => {
  it("파일명은 KST 날짜를 쓴다 (UTC 15:00 이후는 다음 날)", () => {
    const now = new Date("2026-11-26T16:00:00Z")
    expect(formatKstDateStamp(now)).toBe("20261127")
    expect(buildBackupFileName(now)).toBe("chronoledger-backup-20261127.json")
    expect(buildExpensesFileName(now)).toBe("chronoledger-expenses-20261127.csv")
    expect(buildIncomesFileName(now)).toBe("chronoledger-incomes-20261127.csv")
  })

  it("시각을 KST 오프셋 ISO로 바꾸고 해석 불가 값은 원문을 유지한다", () => {
    expect(toKstIso("2026-11-26T03:00:00.123Z")).toBe("2026-11-26T12:00:00+09:00")
    expect(toKstIso(null)).toBe("")
    expect(toKstIso("not-a-date")).toBe("not-a-date")
  })

  it("쉼표·따옴표·줄바꿈이 있는 셀을 따옴표로 감싸고 따옴표를 두 배로 한다", () => {
    expect(toCsvCell("a,b")).toBe('"a,b"')
    expect(toCsvCell('say "hi"')).toBe('"say ""hi"""')
    expect(toCsvCell("line1\nline2")).toBe('"line1\nline2"')
    expect(toCsvCell(null)).toBe("")
    expect(toCsvCell(1200)).toBe("1200")
  })

  it("수식으로 읽힐 수 있는 문자열 앞에 작은따옴표를 붙이고 숫자는 건드리지 않는다", () => {
    expect(toCsvCell("=SUM(A1:A2)")).toBe("'=SUM(A1:A2)")
    expect(toCsvCell("+1")).toBe("'+1")
    expect(toCsvCell("-1")).toBe("'-1")
    expect(toCsvCell("@cmd")).toBe("'@cmd")
    expect(toCsvCell("\tTab")).toBe("'\tTab")
    expect(toCsvCell("=1,2")).toBe('"\'=1,2"')
    expect(toCsvCell(-500)).toBe("-500")
  })

  it("CSV는 UTF-8 BOM으로 시작하고 CRLF로 줄을 나눈다", () => {
    expect(buildCsv(["A", "B"], [["1", "2"]])).toBe("﻿A,B\r\n1,2\r\n")
  })

  it("지출 CSV는 고정 열 순서·한국어 라벨·Y/N·KST 시각을 쓴다", () => {
    const csv = buildExpensesCsv(
      [
        {
          id: "e1",
          target_date: "2026-11-20",
          title: "=월정액, 패스",
          category: "게임",
          game_id: "g1",
          status: "CANCELLED",
          cancellation_kind: "PAYMENT_REFUND",
          original_price: 11000,
          discount_amount: 1000,
          point_discount_amount: 500,
          used_points: 500,
          earned_points: 0,
          final_amount: 9500,
          payment_method: "NAVER_PAY",
          point_platform: null,
          deduct_from_asset: true,
          start_date: null,
          end_date: "2026-12-01",
          memo: "첫 줄\n둘째 줄",
          created_at: "2026-11-20T00:00:00Z",
        },
      ],
      new Map([["g1", "게임A"]]),
    )
    const lines = csv.replace("﻿", "").split("\r\n")
    expect(lines[0]).toBe(EXPENSE_CSV_HEADERS.join(","))
    expect(lines[0].split(",")).toHaveLength(21)
    expect(csv).toContain(
      "e1,2026-11-20,\"'=월정액, 패스\",게임,게임A,g1,취소됨,결제 환불,11000,1000,500,500,0,9500,네이버페이,,Y,,2026-12-01,\"첫 줄\n둘째 줄\",2026-11-20T09:00:00+09:00",
    )
  })

  it("알 수 없는 코드는 원문 코드를 그대로 내보낸다", () => {
    const csv = buildExpensesCsv([{ id: "e2", status: "NEW_STATUS", payment_method: "X_PAY" }], new Map())
    expect(csv).toContain("NEW_STATUS")
    expect(csv).toContain("X_PAY")
  })

  it("수익 CSV는 고정 열 순서를 쓴다", () => {
    const csv = buildIncomesCsv([
      { id: "i1", income_date: "2026-11-01", category: "월급", title: "급여", amount: 3000000, memo: null, created_at: "2026-11-01T00:00:00Z" },
    ])
    expect(csv.replace("﻿", "").split("\r\n")[0]).toBe(INCOME_CSV_HEADERS.join(","))
    expect(csv).toContain("i1,2026-11-01,월급,급여,3000000,,2026-11-01T09:00:00+09:00")
  })

  it("백업 대상에서 자격 증명·일시 데이터 테이블을 제외한다", () => {
    const names = BACKUP_TABLES.map((config) => config.table)
    expect(names).not.toContain("push_subscriptions")
    expect(names).not.toContain("notifications")
    expect(names).not.toContain("account_deletion_requests")
    expect(names).toContain("expenses")
    expect(BACKUP_TABLES.find((config) => config.table === "users")?.filterColumn).toBe("id")
  })
})
