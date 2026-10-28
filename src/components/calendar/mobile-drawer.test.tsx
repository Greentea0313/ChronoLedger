import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useDrawerHistory } from "./mobile-drawer"

vi.mock("@/lib/supabase/client", () => ({ supabase: {} }))

function firePopState() {
  act(() => {
    window.dispatchEvent(new PopStateEvent("popstate"))
  })
}

describe("useDrawerHistory", () => {
  let pushState: ReturnType<typeof vi.spyOn>
  let back: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    window.history.replaceState({ __NA: true, tree: "app-router-tree" }, "")
    pushState = vi.spyOn(window.history, "pushState")
    back = vi.spyOn(window.history, "back").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("드로어가 열리면 Next.js App Router 상태를 보존한 히스토리 엔트리를 하나만 쌓는다", () => {
    const onOpenChange = vi.fn()
    const { rerender } = renderHook(({ open }) => useDrawerHistory(open, onOpenChange), {
      initialProps: { open: false },
    })
    expect(pushState).not.toHaveBeenCalled()

    rerender({ open: true })
    expect(pushState).toHaveBeenCalledTimes(1)
    expect(pushState.mock.calls[0][0]).toEqual({
      __NA: true,
      tree: "app-router-tree",
      chronoledgerMobileDrawer: true,
    })

    // 열린 상태에서 리렌더링되어도 추가로 쌓지 않는다.
    rerender({ open: true })
    expect(pushState).toHaveBeenCalledTimes(1)
  })

  it("스마트폰 뒤로 가기(popstate) 시 라우트 이탈 없이 드로어만 닫고 history.back()을 중복 호출하지 않는다", () => {
    const onOpenChange = vi.fn()
    const { rerender } = renderHook(({ open }) => useDrawerHistory(open, onOpenChange), {
      initialProps: { open: true },
    })

    firePopState()
    expect(onOpenChange).toHaveBeenCalledWith(false)

    rerender({ open: false })
    expect(back).not.toHaveBeenCalled()
  })

  it("딤 클릭/스와이프로 직접 닫으면 history.back()으로 엔트리를 정리하고, 그로 인한 popstate는 무시한다", () => {
    const onOpenChange = vi.fn()
    const { rerender } = renderHook(({ open }) => useDrawerHistory(open, onOpenChange), {
      initialProps: { open: true },
    })

    rerender({ open: false })
    expect(back).toHaveBeenCalledTimes(1)

    firePopState()
    expect(onOpenChange).not.toHaveBeenCalled()

    // 이후 다시 열고 뒤로 가기를 누르면 정상적으로 닫힌다.
    rerender({ open: true })
    expect(pushState).toHaveBeenCalledTimes(2)
    firePopState()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("history.back() 처리 중에 다시 열리면 popstate 도착 후에 엔트리를 쌓아 스택 순서를 보장한다", () => {
    const onOpenChange = vi.fn()
    const { rerender } = renderHook(({ open }) => useDrawerHistory(open, onOpenChange), {
      initialProps: { open: true },
    })
    expect(pushState).toHaveBeenCalledTimes(1)

    rerender({ open: false })
    rerender({ open: true })
    // back() 결과 popstate가 오기 전에는 쌓지 않는다.
    expect(pushState).toHaveBeenCalledTimes(1)

    firePopState()
    expect(pushState).toHaveBeenCalledTimes(2)
    expect(onOpenChange).not.toHaveBeenCalled()

    firePopState()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("드로어가 열리지 않은 상태의 popstate(일반 페이지 뒤로 가기)에는 관여하지 않는다", () => {
    const onOpenChange = vi.fn()
    renderHook(() => useDrawerHistory(false, onOpenChange))

    firePopState()
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(back).not.toHaveBeenCalled()
  })
})
