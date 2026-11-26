import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { isTauriRuntime, check, relaunch } = vi.hoisted(() => ({
  isTauriRuntime: vi.fn(),
  check: vi.fn(),
  relaunch: vi.fn(),
}))
vi.mock("@/lib/push-notifications", () => ({ isTauriRuntime }))
vi.mock("@tauri-apps/plugin-updater", () => ({ check }))
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch }))

import { DesktopUpdateBanner } from "./desktop-update-banner"
import { OFFLINE_WRITE_MESSAGE } from "@/lib/offline-guard"

function makeUpdate(downloadAndInstall: ReturnType<typeof vi.fn>) {
  return { version: "0.2.1", downloadAndInstall }
}

describe("DesktopUpdateBanner", () => {
  beforeEach(() => {
    isTauriRuntime.mockReset().mockReturnValue(true)
    check.mockReset()
    relaunch.mockReset().mockResolvedValue(undefined)
    vi.spyOn(console, "warn").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("웹에서는 렌더링하지 않고 updater를 호출하지 않음", async () => {
    isTauriRuntime.mockReturnValue(false)
    const { container } = render(<DesktopUpdateBanner />)
    await Promise.resolve()
    expect(container.innerHTML).toBe("")
    expect(check).not.toHaveBeenCalled()
  })

  it("업데이트가 있으면 문구와 버튼을 표시함", async () => {
    check.mockResolvedValue(makeUpdate(vi.fn()))
    render(<DesktopUpdateBanner />)
    expect(
      await screen.findByText("새 버전 v0.2.1을 설치할 수 있습니다. 설치하면 앱이 다시 시작됩니다."),
    ).toBeTruthy()
    expect((screen.getByRole("button", { name: "지금 업데이트" }) as HTMLButtonElement).disabled).toBe(false)
    expect(screen.getByRole("button", { name: "나중에" })).toBeTruthy()
  })

  it("업데이트가 없으면 표시하지 않음", async () => {
    check.mockResolvedValue(null)
    const { container } = render(<DesktopUpdateBanner />)
    await waitFor(() => expect(check).toHaveBeenCalledTimes(1))
    expect(container.innerHTML).toBe("")
  })

  it("확인 실패 시 표시하지 않고 console.warn만 남김", async () => {
    check.mockRejectedValue(new Error("network"))
    const { container } = render(<DesktopUpdateBanner />)
    await waitFor(() => expect(console.warn).toHaveBeenCalled())
    expect(container.innerHTML).toBe("")
  })

  it("지금 업데이트: 진행률 표시·버튼 비활성 후 relaunch 1회", async () => {
    let finish: () => void = () => {}
    const downloadAndInstall = vi.fn(
      (cb: (e: unknown) => void) =>
        new Promise<void>((resolve) => {
          cb({ event: "Started", data: { contentLength: 200 } })
          cb({ event: "Progress", data: { chunkLength: 100 } })
          finish = resolve
        }),
    )
    check.mockResolvedValue(makeUpdate(downloadAndInstall))
    render(<DesktopUpdateBanner />)
    fireEvent.click(await screen.findByRole("button", { name: "지금 업데이트" }))

    expect(await screen.findByText("50%")).toBeTruthy()
    expect((screen.getByRole("button", { name: "지금 업데이트" }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole("button", { name: "나중에" }) as HTMLButtonElement).disabled).toBe(true)
    expect(relaunch).not.toHaveBeenCalled()

    finish()
    await waitFor(() => expect(relaunch).toHaveBeenCalledTimes(1))
  })

  it("설치 실패 시 실패 문구와 다시 시도 버튼, 재시도 가능", async () => {
    const downloadAndInstall = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce(undefined)
    check.mockResolvedValue(makeUpdate(downloadAndInstall))
    render(<DesktopUpdateBanner />)
    fireEvent.click(await screen.findByRole("button", { name: "지금 업데이트" }))

    expect(await screen.findByText("업데이트에 실패했습니다. 잠시 후 다시 시도해 주세요.")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }))
    await waitFor(() => expect(relaunch).toHaveBeenCalledTimes(1))
    expect(downloadAndInstall).toHaveBeenCalledTimes(2)
  })

  it("나중에: 숨기고 저장소에 쓰지 않음", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem")
    check.mockResolvedValue(makeUpdate(vi.fn()))
    const { container } = render(<DesktopUpdateBanner />)
    fireEvent.click(await screen.findByRole("button", { name: "나중에" }))
    expect(container.innerHTML).toBe("")
    expect(setItem).not.toHaveBeenCalled()
  })

  it("오프라인이면 설치를 시작하지 않고 안내함", async () => {
    const downloadAndInstall = vi.fn()
    check.mockResolvedValue(makeUpdate(downloadAndInstall))
    render(<DesktopUpdateBanner />)
    const button = await screen.findByRole("button", { name: "지금 업데이트" })
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false)
    fireEvent.click(button)
    expect(await screen.findByText(OFFLINE_WRITE_MESSAGE)).toBeTruthy()
    expect(downloadAndInstall).not.toHaveBeenCalled()
    expect(relaunch).not.toHaveBeenCalled()
  })
})
