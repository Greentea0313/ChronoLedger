import type { KeyboardEvent } from "react"
import { describe, expect, it, vi } from "vitest"
import { insertTabOnKeyDown } from "./textarea-tab"

function setup(
  value: string,
  selection: [number, number],
  options: { key?: string; shiftKey?: boolean; ctrlKey?: boolean; isComposing?: boolean; maxLength?: number } = {},
) {
  const textarea = document.createElement("textarea")
  if (options.maxLength) textarea.maxLength = options.maxLength
  textarea.value = value
  textarea.setSelectionRange(selection[0], selection[1])
  const preventDefault = vi.fn()
  const setValue = vi.fn((next: string) => {
    textarea.value = next
  })
  const event = {
    key: options.key ?? "Tab",
    shiftKey: options.shiftKey ?? false,
    ctrlKey: options.ctrlKey ?? false,
    altKey: false,
    metaKey: false,
    nativeEvent: { isComposing: options.isComposing ?? false },
    currentTarget: textarea,
    preventDefault,
  } as unknown as KeyboardEvent<HTMLTextAreaElement>
  insertTabOnKeyDown(event, setValue)
  return { textarea, preventDefault, setValue }
}

describe("insertTabOnKeyDown", () => {
  it("inserts a tab at the caret and moves the caret right after it", async () => {
    const { textarea, preventDefault, setValue } = setup("abcd", [2, 2])
    expect(preventDefault).toHaveBeenCalled()
    expect(setValue).toHaveBeenCalledWith("ab\tcd")
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
    expect(textarea.selectionStart).toBe(3)
    expect(textarea.selectionEnd).toBe(3)
  })

  it("replaces the selected range with a tab", () => {
    const { setValue } = setup("abcd", [1, 3])
    expect(setValue).toHaveBeenCalledWith("a\td")
  })

  it("does not intercept Shift+Tab so keyboard users can leave the field", () => {
    const { preventDefault, setValue } = setup("abcd", [2, 2], { shiftKey: true })
    expect(preventDefault).not.toHaveBeenCalled()
    expect(setValue).not.toHaveBeenCalled()
  })

  it("does not intercept Ctrl+Tab", () => {
    const { preventDefault, setValue } = setup("abcd", [2, 2], { ctrlKey: true })
    expect(preventDefault).not.toHaveBeenCalled()
    expect(setValue).not.toHaveBeenCalled()
  })

  it("does not intercept while an IME composition is in progress", () => {
    const { preventDefault, setValue } = setup("한", [1, 1], { isComposing: true })
    expect(preventDefault).not.toHaveBeenCalled()
    expect(setValue).not.toHaveBeenCalled()
  })

  it("ignores other keys", () => {
    const { preventDefault, setValue } = setup("abcd", [2, 2], { key: "a" })
    expect(preventDefault).not.toHaveBeenCalled()
    expect(setValue).not.toHaveBeenCalled()
  })

  it("keeps focus but inserts nothing when maxLength would be exceeded", () => {
    const { preventDefault, setValue } = setup("abcd", [4, 4], { maxLength: 4 })
    expect(preventDefault).toHaveBeenCalled()
    expect(setValue).not.toHaveBeenCalled()
  })

  it("allows the tab when replacing a selection keeps the length within maxLength", () => {
    const { setValue } = setup("abcd", [1, 3], { maxLength: 4 })
    expect(setValue).toHaveBeenCalledWith("a\td")
  })
})
