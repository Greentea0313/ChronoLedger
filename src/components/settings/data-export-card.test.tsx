import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { buildBackup, buildExpensesCsvForUser, buildIncomesCsvForUser, downloadTextFile, isOffline } = vi.hoisted(() => ({
  buildBackup: vi.fn(),
  buildExpensesCsvForUser: vi.fn(),
  buildIncomesCsvForUser: vi.fn(),
  downloadTextFile: vi.fn(),
  isOffline: vi.fn(),
}))
vi.mock("@/lib/data-export", () => ({ buildBackup, buildExpensesCsvForUser, buildIncomesCsvForUser, downloadTextFile }))
vi.mock("@/lib/offline-guard", () => ({ isOffline }))

import { DataExportCard } from "./data-export-card"

function isDisabled(name: string): boolean {
  return (screen.getByRole("button", { name }) as HTMLButtonElement).disabled
}

describe("DataExportCard", () => {
  beforeEach(() => {
    buildBackup.mockReset().mockResolvedValue({ skipped: [] })
    buildExpensesCsvForUser.mockReset().mockResolvedValue("csv-e")
    buildIncomesCsvForUser.mockReset().mockResolvedValue("csv-i")
    downloadTextFile.mockReset()
    isOffline.mockReset().mockReturnValue(false)
  })

  it("버튼 3개가 각각 알맞은 파일명·형식으로 저장한다", async () => {
    render(<DataExportCard userId="u1" />)
    fireEvent.click(screen.getByRole("button", { name: "전체 백업(JSON)" }))
    await waitFor(() => expect(downloadTextFile).toHaveBeenCalledTimes(1))
    expect(downloadTextFile.mock.calls[0][0]).toMatch(/^chronoledger-backup-\d{8}\.json$/)
    expect(downloadTextFile.mock.calls[0][1]).toBe("application/json")

    fireEvent.click(screen.getByRole("button", { name: "지출 CSV" }))
    await waitFor(() => expect(downloadTextFile).toHaveBeenCalledTimes(2))
    expect(downloadTextFile.mock.calls[1][0]).toMatch(/^chronoledger-expenses-\d{8}\.csv$/)
    expect(downloadTextFile.mock.calls[1][2]).toBe("csv-e")

    fireEvent.click(screen.getByRole("button", { name: "수익 CSV" }))
    await waitFor(() => expect(downloadTextFile).toHaveBeenCalledTimes(3))
    expect(downloadTextFile.mock.calls[2][0]).toMatch(/^chronoledger-incomes-\d{8}\.csv$/)
    expect(await screen.findByText("수익 CSV를 저장했습니다.")).toBeTruthy()
  })

  it("진행 중에는 버튼 3개를 모두 비활성화하고 끝나면 풀린다", async () => {
    let finish: (value: string) => void = () => {}
    buildExpensesCsvForUser.mockReturnValue(new Promise<string>((resolve) => { finish = resolve }))
    render(<DataExportCard userId="u1" />)
    fireEvent.click(screen.getByRole("button", { name: "지출 CSV" }))
    await waitFor(() => expect(isDisabled("전체 백업(JSON)")).toBe(true))
    expect(isDisabled("수익 CSV")).toBe(true)
    finish("csv")
    await waitFor(() => expect(isDisabled("수익 CSV")).toBe(false))
    expect(isDisabled("전체 백업(JSON)")).toBe(false)
  })

  it("실패하면 오류 안내를 보이고 파일을 저장하지 않는다", async () => {
    buildIncomesCsvForUser.mockRejectedValue(new Error("boom"))
    render(<DataExportCard userId="u1" />)
    fireEvent.click(screen.getByRole("button", { name: "수익 CSV" }))
    expect(await screen.findByText("내보내기에 실패했습니다: boom")).toBeTruthy()
    expect(downloadTextFile).not.toHaveBeenCalled()
  })

  it("조회하지 못한 항목이 있으면 백업 완료 안내에 건수를 알린다", async () => {
    buildBackup.mockResolvedValue({ skipped: [{ table: "x", reason: "r" }] })
    render(<DataExportCard userId="u1" />)
    fireEvent.click(screen.getByRole("button", { name: "전체 백업(JSON)" }))
    expect(await screen.findByText(/조회하지 못한 항목 1건/)).toBeTruthy()
  })

  it("오프라인이면 조회 없이 안내만 한다", () => {
    isOffline.mockReturnValue(true)
    render(<DataExportCard userId="u1" />)
    fireEvent.click(screen.getByRole("button", { name: "전체 백업(JSON)" }))
    expect(screen.getByText(/오프라인 상태에서는 데이터를 내보낼 수 없습니다/)).toBeTruthy()
    expect(buildBackup).not.toHaveBeenCalled()
    expect(downloadTextFile).not.toHaveBeenCalled()
  })
})
