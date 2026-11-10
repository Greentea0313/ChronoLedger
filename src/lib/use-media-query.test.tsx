import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useMediaQuery } from "./use-media-query"

function Probe({ query }: { query: string }) {
  return <span data-testid="probe">{String(useMediaQuery(query))}</span>
}

describe("useMediaQuery", () => {
  let container: HTMLDivElement
  let root: Root
  const original = Object.getOwnPropertyDescriptor(window, "matchMedia")

  beforeEach(() => {
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement("div")
    document.body.append(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    if (original) Object.defineProperty(window, "matchMedia", original)
    else delete (window as { matchMedia?: unknown }).matchMedia
  })

  const text = () => container.querySelector('[data-testid="probe"]')?.textContent

  it("returns false when matchMedia is unavailable", async () => {
    delete (window as { matchMedia?: unknown }).matchMedia
    await act(async () => root.render(<Probe query="(min-width: 900px)" />))
    expect(text()).toBe("false")
  })

  it("reflects the current match and follows change events", async () => {
    let matches = true
    const listeners = new Set<() => void>()
    const matchMedia = vi.fn((query: string) => ({
      get matches() {
        return matches
      },
      media: query,
      addEventListener: (_: string, cb: () => void) => listeners.add(cb),
      removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
    }))
    Object.defineProperty(window, "matchMedia", { writable: true, configurable: true, value: matchMedia })

    await act(async () => root.render(<Probe query="(min-width: 900px)" />))
    expect(matchMedia).toHaveBeenCalledWith("(min-width: 900px)")
    expect(text()).toBe("true")

    matches = false
    await act(async () => listeners.forEach((cb) => cb()))
    expect(text()).toBe("false")

    await act(async () => root.unmount())
    expect(listeners.size).toBe(0)
    root = createRoot(container)
  })
})
