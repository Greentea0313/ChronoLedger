import { beforeEach, describe, expect, it, vi } from "vitest"

type Row = Record<string, unknown>

const { tableRows, failing, queried, from } = vi.hoisted(() => {
  const tableRows = new Map<string, Row[]>()
  const failing = new Set<string>()
  const queried: string[] = []
  const from = (table: string) => {
    const state: { from?: number; to?: number; ids?: string[] } = {}
    const builder = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      in: (_column: string, ids: string[]) => {
        state.ids = ids
        return builder
      },
      range: (start: number, end: number) => {
        state.from = start
        state.to = end
        return builder
      },
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => {
        queried.push(table)
        if (failing.has(table)) return Promise.resolve({ data: null, error: { message: "boom" } }).then(resolve, reject)
        let rows = tableRows.get(table) ?? []
        const ids = state.ids
        if (ids) rows = rows.filter((row) => ids.includes(String(row.id)))
        if (state.from !== undefined && state.to !== undefined) rows = rows.slice(state.from, state.to + 1)
        return Promise.resolve({ data: rows, error: null }).then(resolve, reject)
      },
    }
    return builder
  }
  return { tableRows, failing, queried, from }
})

vi.mock("@/lib/supabase/client", () => ({ supabase: { from } }))

import { buildBackup, buildExpensesCsvForUser, buildIncomesCsvForUser, downloadTextFile } from "./data-export"

describe("data-export", () => {
  beforeEach(() => {
    tableRows.clear()
    failing.clear()
    queried.length = 0
  })

  it("1,000행을 넘는 테이블을 끝까지 페이지 조회한다", async () => {
    tableRows.set("expenses", Array.from({ length: 2345 }, (_, index) => ({ id: `e${index}`, user_id: "u1" })))
    const backup = await buildBackup("u1", new Date("2026-11-26T03:00:00Z"))
    expect(backup.tables.expenses).toHaveLength(2345)
    expect(queried.filter((table) => table === "expenses")).toHaveLength(3)
  })

  it("백업 형식 필드와 KST 시각을 채우고 제외 테이블은 조회하지 않는다", async () => {
    const backup = await buildBackup("u1", new Date("2026-11-26T03:00:00Z"))
    expect(backup.format).toBe("chronoledger-backup")
    expect(backup.version).toBe(1)
    expect(backup.exported_at).toBe("2026-11-26T12:00:00+09:00")
    expect(backup.user_id).toBe("u1")
    expect(queried).not.toContain("push_subscriptions")
    expect(queried).not.toContain("notifications")
    expect(Object.keys(backup.tables)).not.toContain("push_subscriptions")
    expect(JSON.stringify(backup)).not.toContain("push_subscriptions")
  })

  it("조회에 실패한 테이블은 빼고 skipped에 사유를 남긴다", async () => {
    tableRows.set("incomes", [{ id: "i1" }])
    failing.add("personal_memos")
    const backup = await buildBackup("u1")
    expect(backup.tables.incomes).toHaveLength(1)
    expect(backup.tables.personal_memos).toBeUndefined()
    expect(backup.skipped).toEqual([{ table: "personal_memos", reason: "boom" }])
  })

  it("catalog에 참조된 게임·일정 이름만 담는다", async () => {
    tableRows.set("expenses", [{ id: "e1", game_id: "g1", schedule_id: "s1" }])
    tableRows.set("games", [
      { id: "g1", name: "게임A" },
      { id: "g2", name: "다른 게임" },
    ])
    tableRows.set("game_schedules", [
      { id: "s1", game_id: "g1", title: "픽업", start_date: "2026-11-01", end_date: "2026-11-10" },
      { id: "s2", game_id: "g2", title: "무관", start_date: null, end_date: null },
    ])
    const backup = await buildBackup("u1")
    expect(backup.catalog.games).toEqual([{ id: "g1", name: "게임A" }])
    expect(backup.catalog.schedules).toEqual([
      { id: "s1", game_id: "g1", title: "픽업", start_date: "2026-11-01", end_date: "2026-11-10" },
    ])
  })

  it("지출 CSV에 게임 이름을 채우고 1,000행을 넘는 행도 포함한다", async () => {
    tableRows.set("expenses", Array.from({ length: 1001 }, (_, index) => ({ id: `e${index}`, game_id: "g1", title: `t${index}` })))
    tableRows.set("games", [{ id: "g1", name: "게임A" }])
    const csv = await buildExpensesCsvForUser("u1")
    expect(csv.split("\r\n").filter(Boolean)).toHaveLength(1002)
    expect(csv).toContain("게임A")
  })

  it("수익 CSV 조회가 실패하면 오류를 던진다", async () => {
    failing.add("incomes")
    await expect(buildIncomesCsvForUser("u1")).rejects.toThrow("boom")
  })

  it("downloadTextFile은 앵커 다운로드를 한 번 실행하고 URL은 클릭 직후가 아니라 지연 후 해제한다 (R113-REV-001)", () => {
    vi.useFakeTimers()
    try {
      const createObjectURL = vi.fn(() => "blob:test")
      const revokeObjectURL = vi.fn()
      Object.assign(URL, { createObjectURL, revokeObjectURL })
      const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
      downloadTextFile("a.csv", "text/csv", "x")
      expect(createObjectURL).toHaveBeenCalledTimes(1)
      expect(click).toHaveBeenCalledTimes(1)
      expect(document.querySelector("a[download]")).toBeNull()
      // 클릭 직후에는 해제하지 않아 저장이 시작되기 전에 URL이 폐기되지 않음.
      expect(revokeObjectURL).not.toHaveBeenCalled()
      vi.advanceTimersByTime(10_000)
      expect(revokeObjectURL).toHaveBeenCalledTimes(1)
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:test")
      click.mockRestore()
    } finally {
      vi.useRealTimers()
    }
  })
})
