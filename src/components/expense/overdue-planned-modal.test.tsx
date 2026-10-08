import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const rpc = vi.fn()
vi.mock("@/lib/supabase/client", () => ({ supabase: { rpc: (...args: unknown[]) => rpc(...args) } }))

import { OverduePlannedModal } from "./overdue-planned-modal"

const expenses = [
  { id: "e1", title: "픽업 A", original_price: 30000, final_amount: 30000, target_date: "2026-10-01", end_date: "2026-10-01" },
]

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", { configurable: true, value })
}

describe("OverduePlannedModal", () => {
  beforeEach(() => {
    rpc.mockReset()
    setOnline(true)
  })

  it("만료 항목에서 결제하기를 누르면 onPay가 호출된다", () => {
    const onPay = vi.fn()
    render(<OverduePlannedModal open expenses={expenses} onOpenChange={() => {}} onPay={onPay} />)
    fireEvent.click(screen.getByRole("button", { name: "결제하기" }))
    expect(onPay).toHaveBeenCalledWith(expenses[0])
  })

  it("예정 취소는 cancel_planned_expense RPC를 호출하고 onChanged를 알린다", async () => {
    rpc.mockResolvedValue({ error: null })
    const onChanged = vi.fn()
    render(<OverduePlannedModal open expenses={expenses} onOpenChange={() => {}} onPay={() => {}} onChanged={onChanged} />)
    fireEvent.click(screen.getByRole("button", { name: "예정 취소" }))
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
    expect(rpc).toHaveBeenCalledWith("cancel_planned_expense", { p_expense_id: "e1" })
  })

  it("RPC 실패 시 오류를 표시하고 onChanged를 호출하지 않는다", async () => {
    rpc.mockResolvedValue({ error: { message: "x" } })
    const onChanged = vi.fn()
    render(<OverduePlannedModal open expenses={expenses} onOpenChange={() => {}} onPay={() => {}} onChanged={onChanged} />)
    fireEvent.click(screen.getByRole("button", { name: "예정 취소" }))
    expect((await screen.findByRole("alert")).textContent).toContain("취소하지 못했습니다")
    expect(onChanged).not.toHaveBeenCalled()
  })

  it("오프라인에서는 쓰기 버튼이 잠기고 RPC가 호출되지 않는다", () => {
    setOnline(false)
    render(<OverduePlannedModal open expenses={expenses} onOpenChange={() => {}} onPay={() => {}} />)
    const cancel = screen.getByRole("button", { name: "예정 취소" }) as HTMLButtonElement
    expect(cancel.disabled).toBe(true)
    expect((screen.getByRole("button", { name: "결제하기" }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(cancel)
    expect(rpc).not.toHaveBeenCalled()
  })
})
