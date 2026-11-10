import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { Simulate } from "react-dom/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { ClassificationSchema, GameCharacter, UserCharacterState } from "@/lib/character-utils"
import { PresetWorkspace, UNSAVED_CHANGES_CONFIRM } from "./preset-workspace"
import type { PresetRow } from "./preset-list"

const schema: ClassificationSchema = { rarities: [], axes: [], character_label: "캐릭터" } as unknown as ClassificationSchema

function makeCharacter(id: string, name: string): GameCharacter {
  return { id, game_id: "g", name, rarity: null, attributes: {}, default_icon_url: null } as unknown as GameCharacter
}

const characters = [makeCharacter("c1", "아케론"), makeCharacter("c2", "칼리"), makeCharacter("c3", "구캐릭터"), makeCharacter("c4", "라이덴")]
const states: Record<string, UserCharacterState> = {
  c1: { is_owned: true, is_favorite: false, breakthrough_level: 0, custom_icon_path: null },
}

function preset(id: string, title: string, ids: string[], memo: string | null = null): PresetRow {
  return { id, game_id: "g", title, character_ids: ids, memo, sort_order: 0, created_at: "2026-11-01T00:00:00Z" }
}

describe("PresetWorkspace", () => {
  let container: HTMLDivElement
  let root: Root
  const onSave = vi.fn()
  const onDelete = vi.fn()
  const onDirtyChange = vi.fn()
  let confirmSpy: ReturnType<typeof vi.spyOn>

  const baseProps = { maxSlots: 3, gameName: "가나게임", characters, schema, states, customIconUrls: {}, isBusy: false }

  async function renderWorkspace(presets: PresetRow[], overrides: Partial<{ maxSlots: number }> = {}) {
    await act(async () =>
      root.render(
        <PresetWorkspace {...baseProps} {...overrides} presets={presets} onSave={onSave} onDelete={onDelete} onDirtyChange={onDirtyChange} />,
      ),
    )
  }

  const flush = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)) })
  const click = async (el: Element | null | undefined) => {
    expect(el).toBeTruthy()
    await act(async () => Simulate.click(el as Element))
  }
  const dataTransfer = () => ({ setData: vi.fn(), effectAllowed: "" })
  async function drag(source: Element | null | undefined, target: Element | null | undefined) {
    expect(source).toBeTruthy()
    expect(target).toBeTruthy()
    await act(async () => {
      Simulate.dragStart(source as Element, { dataTransfer: dataTransfer() } as never)
      Simulate.dragOver(target as Element, { dataTransfer: dataTransfer() } as never)
      Simulate.drop(target as Element, { dataTransfer: dataTransfer() } as never)
      Simulate.dragEnd(source as Element)
    })
  }

  const avatar = (name: string) =>
    Array.from(container.querySelectorAll('[data-testid="workspace-avatar-list"] button')).find((b) => b.querySelector("span.truncate")?.textContent === name) as HTMLButtonElement
  const slotEls = () => Array.from(container.querySelectorAll('[data-testid="workspace-slot"], [data-testid="workspace-slot-empty"]'))
  const slotNames = () => slotEls().map((el) => el.querySelector("span.truncate")?.textContent ?? "(빈)")
  const slotAt = (index: number) => slotEls()[index] as HTMLElement
  const slotButton = (index: number) => slotAt(index).querySelector("button") as HTMLButtonElement
  const buttonByText = (text: string) => Array.from(container.querySelectorAll("button")).find((b) => b.textContent?.trim() === text) as HTMLButtonElement
  const titleInput = () => container.querySelector("#workspace-title") as HTMLInputElement
  const presetButton = (title: string) =>
    Array.from(container.querySelectorAll('[data-testid="workspace-preset-list"] button[aria-pressed]')).find((b) => b.textContent === title) as HTMLButtonElement
  const type = async (el: Element | null, value: string) => {
    await act(async () => Simulate.change(el as Element, { target: { value } as unknown as EventTarget }))
  }

  beforeEach(() => {
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement("div")
    document.body.append(container)
    root = createRoot(container)
    onSave.mockReset().mockResolvedValue(null)
    onDelete.mockReset()
    onDirtyChange.mockReset()
    confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    vi.restoreAllMocks()
  })

  it("selects the first preset and shows its title, memo and slots", async () => {
    await renderWorkspace([preset("p1", "혼돈 파티", ["c1", "c2"], "메모"), preset("p2", "두번째", ["c3"])])

    expect(titleInput().value).toBe("혼돈 파티")
    expect((container.querySelector("#workspace-memo") as HTMLTextAreaElement).value).toBe("메모")
    expect(slotNames()).toEqual(["아케론", "칼리", "(빈)"])
    expect(presetButton("혼돈 파티").getAttribute("aria-pressed")).toBe("true")
    expect(presetButton("두번째").getAttribute("aria-pressed")).toBe("false")
    expect(buttonByText("저장").disabled).toBe(true)
    expect(buttonByText("되돌리기").disabled).toBe(true)
  })

  it("shows an empty state with the add button when no preset exists", async () => {
    await renderWorkspace([])

    expect(container.textContent).toContain("저장된 프리셋이 없습니다.")
    expect(container.querySelector("#workspace-title")).toBeNull()
    expect(buttonByText("새 프리셋 추가")).toBeTruthy()
  })

  describe("drag and drop", () => {
    it("appends an avatar dropped on an empty slot", async () => {
      await renderWorkspace([preset("p1", "혼돈 파티", ["c1", "c2"])])
      await drag(avatar("라이덴"), slotAt(2))

      expect(slotNames()).toEqual(["아케론", "칼리", "라이덴"])
    })

    it("replaces the occupant when an avatar is dropped on a filled slot", async () => {
      await renderWorkspace([preset("p1", "혼돈 파티", ["c1", "c2"])])
      await drag(avatar("라이덴"), slotAt(0))

      expect(slotNames()).toEqual(["라이덴", "칼리", "(빈)"])
    })

    it("swaps two slots when the avatar is already placed in another slot", async () => {
      await renderWorkspace([preset("p1", "혼돈 파티", ["c1", "c2"])])
      await drag(avatar("칼리"), slotAt(0))

      expect(slotNames()).toEqual(["칼리", "아케론", "(빈)"])
    })

    it("reorders slots by dragging one slot onto another and to an empty slot", async () => {
      await renderWorkspace([preset("p1", "혼돈 파티", ["c1", "c2"])])
      await drag(slotAt(0), slotAt(1))
      expect(slotNames()).toEqual(["칼리", "아케론", "(빈)"])

      await drag(slotAt(0), slotAt(2))
      expect(slotNames()).toEqual(["아케론", "칼리", "(빈)"])
    })

    it("ignores a drop without a drag source and keeps the draft clean", async () => {
      await renderWorkspace([preset("p1", "혼돈 파티", ["c1", "c2"])])
      await act(async () => Simulate.drop(slotAt(2), { dataTransfer: dataTransfer() } as never))

      expect(slotNames()).toEqual(["아케론", "칼리", "(빈)"])
      expect(buttonByText("저장").disabled).toBe(true)
    })

    it("replaces and swaps on an over-limit preset but does not grow it", async () => {
      await renderWorkspace([preset("p1", "상한 초과", ["c1", "c2", "c3", "c4"])], { maxSlots: 3 })
      expect(slotEls()).toHaveLength(4)
      expect(container.textContent).toContain("교체·이동·제거만 가능")

      await drag(avatar("라이덴"), slotAt(0))
      expect(slotNames()).toEqual(["라이덴", "칼리", "구캐릭터", "아케론"])
    })
  })

  describe("slot then avatar click", () => {
    it("marks the slot as selected and places the next clicked avatar there", async () => {
      await renderWorkspace([preset("p1", "혼돈 파티", ["c1", "c2"])])

      await click(slotButton(0))
      expect(slotButton(0).getAttribute("aria-pressed")).toBe("true")
      await click(avatar("라이덴"))

      expect(slotNames()).toEqual(["라이덴", "칼리", "(빈)"])
      expect(slotButton(0).getAttribute("aria-pressed")).toBe("false")
    })

    it("swaps with an already placed character and appends into a selected empty slot", async () => {
      await renderWorkspace([preset("p1", "혼돈 파티", ["c1", "c2"])])

      await click(slotButton(1))
      await click(avatar("아케론"))
      expect(slotNames()).toEqual(["칼리", "아케론", "(빈)"])

      await click(slotButton(2))
      await click(avatar("구캐릭터"))
      expect(slotNames()).toEqual(["칼리", "아케론", "구캐릭터"])
    })

    it("clears the selection by clicking the same slot again or pressing Escape", async () => {
      await renderWorkspace([preset("p1", "혼돈 파티", ["c1", "c2"])])

      await click(slotButton(0))
      await click(slotButton(0))
      expect(slotButton(0).getAttribute("aria-pressed")).toBe("false")

      await click(slotButton(1))
      expect(slotButton(1).getAttribute("aria-pressed")).toBe("true")
      await act(async () => Simulate.keyDown(container.querySelector('[data-testid="preset-workspace"]') as Element, { key: "Escape" }))
      expect(slotButton(1).getAttribute("aria-pressed")).toBe("false")
    })

    it("replaces in a full preset when a slot is selected", async () => {
      await renderWorkspace([preset("p1", "가득", ["c1", "c2", "c3"])])

      await click(slotButton(2))
      await click(avatar("라이덴"))
      expect(slotNames()).toEqual(["아케론", "칼리", "라이덴"])
    })
  })

  describe("avatar click without a selected slot", () => {
    it("adds to the end, removes a placed character, and reports a full preset", async () => {
      await renderWorkspace([preset("p1", "혼돈 파티", ["c1", "c2"])])

      await click(avatar("라이덴"))
      expect(slotNames()).toEqual(["아케론", "칼리", "라이덴"])
      expect(avatar("라이덴").getAttribute("aria-pressed")).toBe("true")

      await click(avatar("구캐릭터"))
      expect(slotNames()).toEqual(["아케론", "칼리", "라이덴"])
      expect(container.querySelector('[role="alert"]')?.textContent).toContain("슬롯이 가득 찼습니다")

      await click(avatar("칼리"))
      expect(slotNames()).toEqual(["아케론", "라이덴", "(빈)"])
    })

    it("keeps the arrow and remove buttons working", async () => {
      await renderWorkspace([preset("p1", "혼돈 파티", ["c1", "c2"])])

      await click(container.querySelector('button[aria-label="아케론 아래로 이동"]'))
      expect(slotNames()).toEqual(["칼리", "아케론", "(빈)"])
      await click(container.querySelector('button[aria-label="칼리 제거"]'))
      expect(slotNames()).toEqual(["아케론", "(빈)", "(빈)"])
    })
  })

  describe("saving and reverting", () => {
    it("saves the edited draft for the selected preset and clears the dirty state", async () => {
      await renderWorkspace([preset("p1", "혼돈 파티", ["c1", "c2"])])
      await type(titleInput(), "수정 파티")
      await click(avatar("라이덴"))
      expect(onDirtyChange).toHaveBeenLastCalledWith(true)

      await click(buttonByText("저장"))
      await flush()

      expect(onSave).toHaveBeenCalledWith({ title: "수정 파티", memo: "", characterIds: ["c1", "c2", "c4"] }, "p1")
      expect(onDirtyChange).toHaveBeenLastCalledWith(false)
      expect(buttonByText("저장").disabled).toBe(true)
    })

    it("keeps the draft and shows the error when saving fails", async () => {
      onSave.mockResolvedValue("프리셋 제목은 1~80자로 입력해 주세요.")
      await renderWorkspace([preset("p1", "혼돈 파티", ["c1"])])
      await type(titleInput(), "")
      await click(buttonByText("저장"))
      await flush()

      expect(container.querySelector('[role="alert"]')?.textContent).toContain("프리셋 제목은 1~80자")
      expect(buttonByText("저장").disabled).toBe(false)
    })

    it("reverts to the last saved values", async () => {
      await renderWorkspace([preset("p1", "혼돈 파티", ["c1", "c2"])])
      await type(titleInput(), "바뀜")
      await click(avatar("라이덴"))
      await click(buttonByText("되돌리기"))

      expect(titleInput().value).toBe("혼돈 파티")
      expect(slotNames()).toEqual(["아케론", "칼리", "(빈)"])
      expect(onDirtyChange).toHaveBeenLastCalledWith(false)
    })

    it("creates a new preset with a null id and selects the created row after the list refreshes", async () => {
      const existing = preset("p1", "혼돈 파티", ["c1"])
      await renderWorkspace([existing])
      await click(buttonByText("새 프리셋 추가"))
      expect(container.textContent).toContain("새 프리셋 (저장 전)")
      expect(titleInput().value).toBe("")
      expect(slotNames()).toEqual(["(빈)", "(빈)", "(빈)"])

      await type(titleInput(), "신규")
      await click(avatar("칼리"))
      await click(buttonByText("저장"))
      await flush()
      expect(onSave).toHaveBeenCalledWith({ title: "신규", memo: "", characterIds: ["c2"] }, null)

      await renderWorkspace([existing, preset("p-new", "신규", ["c2"])])
      expect(presetButton("신규").getAttribute("aria-pressed")).toBe("true")
      expect(container.textContent).not.toContain("새 프리셋 (저장 전)")
      expect(titleInput().value).toBe("신규")
      expect(onDirtyChange).toHaveBeenLastCalledWith(false)
    })

    it("does not call save for a new preset until the save button is used", async () => {
      await renderWorkspace([])
      await click(buttonByText("새 프리셋 추가"))
      expect(onSave).not.toHaveBeenCalled()
      expect(titleInput()).toBeTruthy()
    })
  })

  describe("unsaved changes", () => {
    it("asks before switching presets and stays when cancelled", async () => {
      await renderWorkspace([preset("p1", "혼돈 파티", ["c1"]), preset("p2", "두번째", ["c2"])])
      await type(titleInput(), "수정")

      confirmSpy.mockReturnValue(false)
      await click(presetButton("두번째"))
      expect(confirmSpy).toHaveBeenCalledWith(UNSAVED_CHANGES_CONFIRM)
      expect(titleInput().value).toBe("수정")

      confirmSpy.mockReturnValue(true)
      await click(presetButton("두번째"))
      expect(titleInput().value).toBe("두번째")
      expect(onDirtyChange).toHaveBeenLastCalledWith(false)
    })

    it("asks before opening a new preset and does not ask when nothing changed", async () => {
      await renderWorkspace([preset("p1", "혼돈 파티", ["c1"]), preset("p2", "두번째", ["c2"])])

      await click(presetButton("두번째"))
      expect(confirmSpy).not.toHaveBeenCalled()

      await click(avatar("라이덴"))
      confirmSpy.mockReturnValue(false)
      await click(buttonByText("새 프리셋 추가"))
      expect(confirmSpy).toHaveBeenCalledTimes(1)
      expect(container.textContent).not.toContain("새 프리셋 (저장 전)")

      confirmSpy.mockReturnValue(true)
      await click(buttonByText("새 프리셋 추가"))
      expect(container.textContent).toContain("새 프리셋 (저장 전)")
      expect(slotNames()).toEqual(["(빈)", "(빈)", "(빈)"])
    })

    it("reports a clean state when unmounted", async () => {
      await renderWorkspace([preset("p1", "혼돈 파티", ["c1"])])
      await type(titleInput(), "수정")
      expect(onDirtyChange).toHaveBeenLastCalledWith(true)

      await act(async () => root.unmount())
      expect(onDirtyChange).toHaveBeenLastCalledWith(false)
      root = createRoot(container)
    })

    it("keeps typed input when the presets prop refreshes in the background", async () => {
      const first = preset("p1", "혼돈 파티", ["c1"])
      await renderWorkspace([first])
      await type(titleInput(), "입력 중")

      await renderWorkspace([{ ...first }, preset("p2", "다른 기기", ["c3"])])
      expect(titleInput().value).toBe("입력 중")
    })
  })

  it("deletes through the callback and falls back to the first preset when the selected one disappears", async () => {
    const p1 = preset("p1", "혼돈 파티", ["c1"])
    const p2 = preset("p2", "두번째", ["c2"])
    await renderWorkspace([p1, p2])
    await click(presetButton("두번째"))

    await click(container.querySelector('button[aria-label="두번째 삭제"]'))
    expect(onDelete).toHaveBeenCalledWith(p2)

    await renderWorkspace([p1])
    expect(titleInput().value).toBe("혼돈 파티")
  })
})
