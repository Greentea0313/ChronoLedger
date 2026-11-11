import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { Simulate } from "react-dom/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { RequestSubmissionModal } from "./request-submission-modal"

const { from, useAuth, insertGame, insertSchedule, insertCharacter } = vi.hoisted(() => ({
  from: vi.fn(),
  useAuth: vi.fn(),
  insertGame: vi.fn(),
  insertSchedule: vi.fn(),
  insertCharacter: vi.fn(),
}))

vi.mock("@/lib/auth-context", () => ({ useAuth }))
// jsdom has WebAssembly but cannot decode images: delegate to the real converter with AI upscaling off,
// while letting a test hold a conversion open.
const { convertWithUpscale } = vi.hoisted(() => ({ convertWithUpscale: vi.fn() }))
vi.mock("@/lib/image-upscaler", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/image-upscaler")>()
  convertWithUpscale.mockImplementation((source: File | string) => original.convertIconSourceToDataUrlWithUpscale(source, false))
  return {
    ...original,
    convertIconSourceToDataUrlWithUpscale: convertWithUpscale,
    isDesktopAiUpscaleAvailable: () => false,
    isLowResolutionFile: async () => false,
  }
})
vi.mock("@/lib/supabase/client", () => ({ supabase: { from } }))

const games = [{
  id: "game-1",
  name: "Sample RPG",
  classification_schema: {
    rarities: ["5★", "4★"],
    axes: [{ key: "element", label: "속성", options: ["불", "물"] }],
  },
}]
const characters = [
  { id: "char-1", game_id: "game-1", name: "Alice", rarity: "5★", attributes: { element: "불" } },
  { id: "char-2", game_id: "game-1", name: "Legacy", rarity: "3★", attributes: { element: "바람" } },
  { id: "char-po", game_id: "game-1", name: "Guest Star", rarity: null, attributes: {}, is_pickup_only: true },
]
const schedules = [{
  id: "schedule-1",
  game_id: "game-1",
  title: "Version 1.0",
  schedule_type: "VERSION",
  start_date: "2026-01-10",
  end_date: "2026-01-20",
  memo: "Existing memo",
  is_official: true,
}, {
  id: "schedule-2",
  game_id: "game-1",
  title: "Rerun Pickup",
  schedule_type: "PICKUP",
  is_rerun: true,
  start_date: "2026-03-01",
  end_date: "2026-03-10",
  memo: null,
  is_official: true,
}]

function createQuery(table: string) {
  const query = { select: vi.fn(), order: vi.fn(), eq: vi.fn(), insert: vi.fn() }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.order.mockResolvedValue({
    data: table === "games" ? games : table === "game_schedules" ? schedules : table === "game_characters" ? characters : [],
    error: null,
  })
  query.insert = table === "game_requests"
    ? insertGame
    : table === "schedule_requests"
      ? insertSchedule
      : table === "character_requests"
        ? insertCharacter
        : vi.fn()
  return query
}

describe("RequestSubmissionModal", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement("div")
    document.body.append(container)
    root = createRoot(container)
    useAuth.mockReturnValue({ user: { id: "authenticated-user" } })
    insertGame.mockResolvedValue({ error: null })
    insertSchedule.mockResolvedValue({ error: null })
    insertCharacter.mockResolvedValue({ error: null })
    from.mockImplementation((table: string) => createQuery(table))  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    vi.clearAllMocks()
  })

  async function openModal() {
    await act(async () => root.render(<RequestSubmissionModal />))
    const trigger = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "+ 추가 요청" || button.textContent === "게임·일정 요청")
    expect(trigger).toBeDefined()
    await act(async () => {
      Simulate.click(trigger!)
      await Promise.resolve()
      await Promise.resolve()
    })
  }

  async function change(selector: string, value: string) {
    const element = document.body.querySelector(selector)
    expect(element).not.toBeNull()
    if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) {
      throw new Error(`Unsupported form control: ${selector}`)
    }
    await act(async () => {
      element.value = value
      Simulate.change(element)
    })
  }

  async function submit() {
    const form = document.body.querySelector("form")
    expect(form).not.toBeNull()
    await act(async () => {
      Simulate.submit(form!)
      await Promise.resolve()
      await Promise.resolve()
    })
  }

  // R81: icons and proposal images are registered through the shared image dialog (portal in document.body).
  const imageDialog = () => document.body.querySelector('[data-testid="image-source-dialog"]') as HTMLElement | null
  const imageDialogButton = (name: string) =>
    Array.from(imageDialog()!.closest('[role="dialog"]')!.querySelectorAll("button")).find((button) => button.textContent === name) as HTMLButtonElement
  const flushTasks = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)) })
  async function openImageDialog() {
    const open = Array.from(document.body.querySelectorAll("button")).find((button) => /^이미지 (선택|변경)$/.test(button.textContent ?? "")) as HTMLElement
    expect(open).toBeDefined()
    await act(async () => {
      Simulate.click(open)
    })
    expect(imageDialog()).not.toBeNull()
  }
  /** Registers an image whose conversion result is `converted` (the site converter is mocked). Returns whether the dialog closed. */
  async function registerImage(converted: string) {
    convertWithUpscale.mockResolvedValueOnce(converted)
    await openImageDialog()
    await change("#image-source-url", "data:image/webp;base64,source")
    await flushTasks()
    await act(async () => {
      Simulate.click(imageDialogButton("등록"))
    })
    await flushTasks()
    return imageDialog() === null
  }

  it("keeps the dialog register button disabled while an image is still converting (R60-REV-004)", async () => {
    convertWithUpscale.mockImplementationOnce(() => new Promise<string>(() => {}))
    await openModal()
    await change("#request-kind", "character")
    await change("#character-game", "game-1")
    await change("#character-name", "New Hero")
    await openImageDialog()
    const file = new File(["png"], "icon.png", { type: "image/png" })
    await act(async () => {
      Simulate.paste(document.body.querySelector("#image-source-url")!, { clipboardData: { files: [file], items: [] } as unknown as DataTransfer })
    })
    expect(imageDialogButton("등록").disabled).toBe(true)
    expect(document.body.querySelector('[role="status"]')?.textContent).toContain("이미지 변환 중")
    expect(insertCharacter).not.toHaveBeenCalled()
  })

  it("submits a game request using the authenticated user and schema fields only", async () => {
    await openModal()
    await change("#game-name", " New Game ")
    await submit()

    expect(insertGame).toHaveBeenCalledWith({
      user_id: "authenticated-user",
      name: "New Game",
      memo: null,
    })
    expect(document.body.textContent).toContain("요청을 제출했습니다.")
  })

  it("submits an add-schedule request with schema enum values and null target", async () => {
    await openModal()
    await change("#request-kind", "schedule")
    await change("#schedule-game", "game-1")
    await change("#schedule-title", "Version 2.0")
    await change("#schedule-type", "PICKUP")
    await change("#schedule-official", "unofficial")
    await change("#schedule-start-date", "2026-02-01")
    await change("#schedule-end-date", "2026-02-03")
    await submit()

    expect(insertSchedule).toHaveBeenCalledWith({
      user_id: "authenticated-user",
      game_id: "game-1",
      target_schedule_id: null,
      title: "Version 2.0",
      schedule_type: "PICKUP",
      is_official: false,
      start_date: "2026-02-01",
      end_date: "2026-02-03",
      memo: null,
    })
  })

  it("supports BROADCAST and resets the rerun flag when the type changes", async () => {
    await openModal()
    await change("#request-kind", "schedule")
    await change("#schedule-game", "game-1")
    await change("#schedule-title", "특별 방송")
    await change("#schedule-type", "PICKUP")

    const rerunCheckbox = document.body.querySelector('input[type="checkbox"]') as HTMLInputElement
    expect(rerunCheckbox).not.toBeNull()
    await act(async () => {
      rerunCheckbox.click()
    })
    await change("#schedule-type", "BROADCAST")
    expect(document.body.textContent).not.toContain("복각 일정")
    await change("#schedule-start-date", "2026-02-01")
    await change("#schedule-end-date", "2026-02-01")
    await submit()

    expect(insertSchedule).toHaveBeenCalledWith(expect.objectContaining({
      schedule_type: "BROADCAST",
      is_official: true,
    }))
    expect(insertSchedule.mock.calls[0][0]).not.toHaveProperty("is_rerun")
  })

  it("uses target_schedule_id for edits and prepopulates the selected schedule", async () => {
    await openModal()
    await change("#request-kind", "schedule")
    await change("#request-mode", "EDIT")
    await change("#schedule-game", "game-1")
    await change("#target-schedule", "schedule-1")
    await act(async () => Promise.resolve())
    await change("#schedule-title", "Version 1.1")
    await submit()

    expect(insertSchedule).toHaveBeenCalledWith(expect.objectContaining({
      user_id: "authenticated-user",
      game_id: "game-1",
      target_schedule_id: "schedule-1",
      title: "Version 1.1",
      schedule_type: "VERSION",
      is_official: true,
      start_date: "2026-01-10",
      end_date: "2026-01-20",
      memo: "Existing memo",
    }))
  })

  it("sends is_rerun: false when an edit request clears the rerun flag of the original schedule", async () => {
    await openModal()
    await change("#request-kind", "schedule")
    await change("#request-mode", "EDIT")
    await change("#schedule-game", "game-1")
    await change("#target-schedule", "schedule-2")
    await act(async () => Promise.resolve())

    const rerunCheckbox = document.body.querySelector('input[type="checkbox"]') as HTMLInputElement
    expect(rerunCheckbox.checked).toBe(true)
    await act(async () => {
      rerunCheckbox.click()
    })
    await submit()

    expect(insertSchedule).toHaveBeenCalledWith(expect.objectContaining({
      target_schedule_id: "schedule-2",
      schedule_type: "PICKUP",
      is_rerun: false,
    }))
  })

  it("keeps is_rerun: true for a rerun original in edit requests", async () => {
    await openModal()
    await change("#request-kind", "schedule")
    await change("#request-mode", "EDIT")
    await change("#schedule-game", "game-1")
    await change("#target-schedule", "schedule-2")
    await act(async () => Promise.resolve())
    await submit()

    expect(insertSchedule.mock.calls[0][0]).toMatchObject({ target_schedule_id: "schedule-2", is_rerun: true })
  })

  it("omits the is_rerun key for a non-rerun original in edit requests", async () => {
    await openModal()
    await change("#request-kind", "schedule")
    await change("#request-mode", "EDIT")
    await change("#schedule-game", "game-1")
    await change("#target-schedule", "schedule-1")
    await act(async () => Promise.resolve())
    await submit()

    expect(insertSchedule.mock.calls[0][0]).toMatchObject({ target_schedule_id: "schedule-1" })
    expect(insertSchedule.mock.calls[0][0]).not.toHaveProperty("is_rerun")
  })

  it.each(["42703", "PGRST204", "23514"])("shows the R33 migration guidance for error code %s", async (code) => {
    insertSchedule.mockResolvedValue({ error: { code, message: "boom" } })
    await openModal()
    await change("#request-kind", "schedule")
    await change("#schedule-game", "game-1")
    await change("#schedule-title", "복각 요청")
    await change("#schedule-type", "PICKUP")
    await change("#schedule-start-date", "2026-02-01")
    await change("#schedule-end-date", "2026-02-03")
    await submit()

    expect(document.body.textContent).toContain("R33 마이그레이션이 적용되지 않았거나")
    expect(document.body.textContent).not.toContain("요청을 제출했습니다.")
  })

  it("shows the generic save error for other failures", async () => {
    insertSchedule.mockResolvedValue({ error: { code: "42501", message: "denied" } })
    await openModal()
    await change("#request-kind", "schedule")
    await change("#schedule-game", "game-1")
    await change("#schedule-title", "일반 오류")
    await change("#schedule-start-date", "2026-02-01")
    await change("#schedule-end-date", "2026-02-03")
    await submit()

    expect(document.body.textContent).toContain("요청을 저장하지 못했습니다.")
    expect(document.body.textContent).not.toContain("R33 마이그레이션")
  })

  it("inserts a tab character into the schedule memo when Tab is pressed", async () => {
    await openModal()
    await change("#request-kind", "schedule")
    await change("#schedule-memo", "ab")
    const textarea = document.body.querySelector("#schedule-memo") as HTMLTextAreaElement
    textarea.setSelectionRange(1, 1)
    const preventDefault = vi.fn()

    await act(async () => {
      Simulate.keyDown(textarea, { key: "Tab", preventDefault })
    })

    expect(preventDefault).toHaveBeenCalled()
    expect(textarea.value).toBe("a	b")
  })

  it("rejects missing values and reversed schedule dates before inserting", async () => {
    await openModal()
    await submit()
    expect(document.body.textContent).toContain("게임 이름을 입력해 주세요.")
    expect(insertGame).not.toHaveBeenCalled()

    await change("#request-kind", "schedule")
    await submit()
    expect(document.body.textContent).toContain("게임을 선택해 주세요.")
    await change("#schedule-game", "game-1")
    await change("#schedule-title", "Version 2.0")
    await change("#schedule-start-date", "2026-02-03")
    await change("#schedule-end-date", "2026-02-01")
    await submit()

    expect(document.body.textContent).toContain("종료일은 시작일보다 빠를 수 없습니다.")
    expect(insertSchedule).not.toHaveBeenCalled()
  })

  it("prefills name, rarity and classification when an UPDATE target character is selected", async () => {
    await openModal()
    await change("#request-kind", "character")
    await change("#character-request-mode", "UPDATE")
    await change("#character-game", "game-1")
    await change("#target-character", "char-1")

    expect((document.body.querySelector("#character-name") as HTMLInputElement).value).toBe("Alice")
    expect((document.body.querySelector("#character-rarity") as HTMLSelectElement).value).toBe("5★")
    expect((document.body.querySelector("#character-axis-element") as HTMLSelectElement).value).toBe("불")

    await submit()

    expect(insertCharacter).toHaveBeenCalledWith({
      user_id: "authenticated-user",
      game_id: "game-1",
      target_character_id: "char-1",
      name: "Alice",
      rarity: "5★",
      attributes: { element: "불" },
      default_icon_url: null,
      memo: null,
    })
  })

  it("drops prefilled values that are no longer in the game classification schema so they must be re-selected", async () => {
    await openModal()
    await change("#request-kind", "character")
    await change("#character-request-mode", "UPDATE")
    await change("#character-game", "game-1")
    await change("#target-character", "char-2")

    expect((document.body.querySelector("#character-rarity") as HTMLSelectElement).value).toBe("")
    expect((document.body.querySelector("#character-axis-element") as HTMLSelectElement).value).toBe("")
    await submit()
    expect(document.body.querySelector('[role="alert"]')?.textContent).toContain("캐릭터 등급을 선택해 주세요.")
    expect(insertCharacter).not.toHaveBeenCalled()

    await change("#character-rarity", "4★")
    await change("#character-axis-element", "물")
    await submit()
    expect(insertCharacter).toHaveBeenCalledWith(expect.objectContaining({
      target_character_id: "char-2",
      name: "Legacy",
      rarity: "4★",
      attributes: { element: "물" },
    }))
  })

  it("submits an ADD character request without an icon (icon is optional, R88)", async () => {
    await openModal()
    await change("#request-kind", "character")
    await change("#character-game", "game-1")
    await change("#character-name", "No Icon Hero")
    await change("#character-rarity", "5★")
    await change("#character-axis-element", "불")
    expect(document.body.textContent).toContain("아이콘 (선택)")
    await submit()

    expect(insertCharacter).toHaveBeenCalledWith(expect.objectContaining({ name: "No Icon Hero", target_character_id: null, default_icon_url: null }))
  })

  it("registers a character icon through the shared image dialog and submits it as default_icon_url", async () => {
    await openModal()
    await change("#request-kind", "character")
    await change("#character-game", "game-1")
    await change("#character-name", "New Hero")
    await change("#character-rarity", "5★")
    await change("#character-axis-element", "불")
    expect(await registerImage("data:image/webp;base64,iconreg")).toBe(true)

    expect(document.body.querySelector('img[alt="캐릭터 아이콘 미리보기"]')?.getAttribute("src")).toBe("data:image/webp;base64,iconreg")
    await submit()

    expect(insertCharacter).toHaveBeenCalledWith(expect.objectContaining({ name: "New Hero", default_icon_url: "data:image/webp;base64,iconreg" }))
  })

  it("shows a dedicated message when an UPDATE request has no target character", async () => {
    await openModal()
    await change("#request-kind", "character")
    await change("#character-request-mode", "UPDATE")
    await change("#character-game", "game-1")
    await change("#character-name", "Alice")
    await submit()

    expect(document.body.querySelector('[role="alert"]')?.textContent).toContain("수정할 캐릭터를 선택해 주세요.")
    expect(insertCharacter).not.toHaveBeenCalled()
  })

  it("requires rank and every classification axis before a character request is submitted", async () => {
    await openModal()
    await change("#request-kind", "character")
    await change("#character-game", "game-1")
    await change("#character-name", "Bob")
    await submit()
    expect(document.body.querySelector('[role="alert"]')?.textContent).toContain("캐릭터 등급을 선택해 주세요.")

    await change("#character-rarity", "5★")
    await submit()
    expect(document.body.querySelector('[role="alert"]')?.textContent).toContain("속성을(를) 선택해 주세요.")

    // Resetting an axis to "no selection" blocks the submission again.
    await change("#character-axis-element", "물")
    await change("#character-axis-element", "")
    await submit()
    expect(insertCharacter).not.toHaveBeenCalled()

    await change("#character-axis-element", "물")
    await submit()
    expect(insertCharacter).toHaveBeenCalledWith(expect.objectContaining({
      target_character_id: null,
      name: "Bob",
      rarity: "5★",
      attributes: { element: "물" },
    }))
  })

  it("lists only games with an active character template in the character request form", async () => {
    from.mockImplementation((table: string) => {
      const q = createQuery(table)
      if (table === "games") {
        q.order.mockResolvedValue({
          data: [
            ...games,
            { id: "game-empty", name: "Empty RPG", classification_schema: { rarities: [], axes: [] } },
            { id: "game-legacy", name: "Legacy RPG", classification_schema: { rarities: [], axes: [] } },
          ],
          error: null,
        })
      }
      if (table === "game_characters") {
        q.order.mockResolvedValue({ data: [...characters, { id: "legacy-1", game_id: "game-legacy", name: "Old", rarity: null, attributes: {} }], error: null })
      }
      return q
    })
    await openModal()
    await change("#request-kind", "character")

    const options = Array.from(document.body.querySelectorAll("#character-game option")).map((option) => option.textContent)
    expect(options).toEqual(["게임을 선택하세요", "Sample RPG", "Legacy RPG"])
  })

  it("uses the game's character_label in the character form", async () => {
    from.mockImplementation((table: string) => {
      const q = createQuery(table)
      if (table === "games") {
        q.order.mockResolvedValue({
          data: [{ id: "game-1", name: "Sample RPG", classification_schema: { character_label: "공명자", rarities: ["5성"], axes: [] } }],
          error: null,
        })
      }
      return q
    })
    await openModal()
    await change("#request-kind", "character")
    await change("#character-game", "game-1")

    expect(document.body.querySelector('label[for="character-name"]')?.textContent).toBe("공명자 이름 *")
    expect(document.body.querySelector('label[for="character-rarity"]')?.textContent).toBe("등급 *")
  })

  describe("pickup characters and new character proposals (R52 A1)", () => {
    const click = async (el: Element) => {
      await act(async () => {
        Simulate.click(el)
      })
    }
    const pickerButton = (name: string) =>
      Array.from(document.body.querySelectorAll('[data-testid="pickup-character-picker"] button')).find((b) => b.textContent === name) as HTMLButtonElement

    async function openPickupForm(gameValue = "game-1") {
      await openModal()
      await change("#request-kind", "schedule")
      await change("#schedule-game", gameValue)
      await change("#schedule-type", "PICKUP")
    }

    it("shows the character picker for games with characters and auto-completes the title", async () => {
      await openPickupForm()

      expect(document.body.textContent).toContain("픽업 캐릭터 선택 (단일 또는 복수)")
      expect(document.body.querySelector("#pickup-image-url")).toBeNull()
      await click(pickerButton("Alice"))
      expect((document.body.querySelector("#schedule-title") as HTMLInputElement).value).toBe("Alice 픽업")
      await click(pickerButton("Legacy"))
      expect((document.body.querySelector("#schedule-title") as HTMLInputElement).value).toBe("Alice · Legacy 픽업")

      await change("#schedule-title", "내 제목")
      await click(pickerButton("Alice"))
      expect((document.body.querySelector("#schedule-title") as HTMLInputElement).value).toBe("내 제목")
    })

    it("submits the selected character ids in order and no image", async () => {
      await openPickupForm()
      await click(pickerButton("Legacy"))
      await click(pickerButton("Alice"))
      await change("#schedule-start-date", "2026-02-01")
      await change("#schedule-end-date", "2026-02-03")
      await submit()

      expect(insertSchedule.mock.calls[0][0]).toMatchObject({ schedule_type: "PICKUP", pickup_character_ids: ["char-2", "char-1"] })
      expect(insertSchedule.mock.calls[0][0]).not.toHaveProperty("pickup_image_url")
    })

    const typeProposal = async (name: string, imageSource = "") => {
      const openButton = Array.from(document.body.querySelectorAll("button")).find((b) => b.textContent === "+ 새 캐릭터 제안") as HTMLElement
      await click(openButton)
      await change("#proposal-name", name)
      if (imageSource) expect(await registerImage(imageSource)).toBe(true)
      const add = Array.from(document.body.querySelectorAll("button")).find((b) => b.textContent === "제안 추가") as HTMLElement
      await click(add)
    }

    it("lists regular and pickup-only characters together and badges the pickup-only ones", async () => {
      await openPickupForm()

      expect(pickerButton("Guest Star")).toBeUndefined()
      const guest = Array.from(document.body.querySelectorAll('[data-testid="pickup-character-picker"] button')).find((b) => b.textContent?.startsWith("Guest Star")) as HTMLElement
      expect(guest.textContent).toContain("픽업 전용")
    })

    it("offers the picker and the proposal button even for a game without any character", async () => {
      from.mockImplementation((table: string) => {
        const q = createQuery(table)
        if (table === "game_characters") q.order.mockResolvedValue({ data: [], error: null })
        return q
      })
      await openPickupForm()

      expect(document.body.textContent).toContain("등록된 캐릭터가 없습니다. 아래에서 새 캐릭터를 제안해 주세요.")
      expect(Array.from(document.body.querySelectorAll("button")).some((b) => b.textContent === "+ 새 캐릭터 제안")).toBe(true)
      expect(document.body.querySelector("#pickup-image-url")).toBeNull()
    })

    it("adds a proposal with an optional image, auto-completes the title and submits pickup_new_characters", async () => {
      await openPickupForm()
      await click(pickerButton("Alice"))
      await typeProposal("신규 캐릭터", "data:image/webp;base64,prop")
      await change("#schedule-start-date", "2026-02-01")
      await change("#schedule-end-date", "2026-02-03")

      expect(document.body.querySelector('[data-testid="pickup-proposals"]')?.textContent).toContain("신규 캐릭터")
      expect(document.body.querySelector('[data-testid="pickup-proposals"]')?.textContent).toContain("신규 제안")
      expect((document.body.querySelector("#schedule-title") as HTMLInputElement).value).toBe("Alice · 신규 캐릭터 픽업")
      expect(document.body.textContent).toContain("2 / 8")
      await submit()

      expect(insertSchedule.mock.calls[0][0]).toMatchObject({
        schedule_type: "PICKUP",
        pickup_character_ids: ["char-1"],
        pickup_new_characters: [{ name: "신규 캐릭터", icon_url: "data:image/webp;base64,prop" }],
      })
      expect(insertSchedule.mock.calls[0][0]).not.toHaveProperty("pickup_image_url")
    })

    it("accepts a proposal without an image (icon_url null)", async () => {
      await openPickupForm()
      await typeProposal("이미지 없음")
      await change("#schedule-start-date", "2026-02-01")
      await change("#schedule-end-date", "2026-02-03")
      await submit()

      expect(insertSchedule.mock.calls[0][0]).toMatchObject({ pickup_new_characters: [{ name: "이미지 없음", icon_url: null }] })
      expect(insertSchedule.mock.calls[0][0]).not.toHaveProperty("pickup_character_ids")
    })

    it("validates proposals: required name, existing name, duplicate proposal and the 8 total limit", async () => {
      await openPickupForm()
      await click(Array.from(document.body.querySelectorAll("button")).find((b) => b.textContent === "+ 새 캐릭터 제안") as HTMLElement)
      const add = () => Array.from(document.body.querySelectorAll("button")).find((b) => b.textContent === "제안 추가") as HTMLElement

      await click(add())
      expect(document.body.querySelector('[data-testid="pickup-proposal-form"] [role="alert"]')?.textContent).toBe("캐릭터 이름을 1~100자로 입력해 주세요.")

      await change("#proposal-name", "Alice")
      await click(add())
      expect(document.body.querySelector('[data-testid="pickup-proposal-form"] [role="alert"]')?.textContent).toBe("이미 등록된 캐릭터입니다. 목록에서 선택해 주세요.")

      await change("#proposal-name", "새로운")
      await click(add())
      await typeProposal("새로운")
      expect(document.body.querySelector('[data-testid="pickup-proposal-form"] [role="alert"]')?.textContent).toBe("이미 제안한 이름입니다.")
    })

    it("counts selected characters and proposals together against the 8 limit", async () => {
      from.mockImplementation((table: string) => {
        const q = createQuery(table)
        if (table === "game_characters") {
          q.order.mockResolvedValue({
            data: Array.from({ length: 8 }, (_, index) => ({ id: `m${index}`, game_id: "game-1", name: `캐릭${index}`, rarity: null, attributes: {} })),
            error: null,
          })
        }
        return q
      })
      await openPickupForm()
      for (let index = 0; index < 7; index += 1) await click(pickerButton(`캐릭${index}`))
      await typeProposal("여덟번째")

      expect(document.body.textContent).toContain("8 / 8")
      expect(pickerButton("캐릭7").disabled).toBe(true)
      expect(document.body.textContent).toContain("합쳐서 최대 8명까지 가능합니다")
      await click(Array.from(document.body.querySelectorAll("button")).find((b) => b.textContent === "+ 새 캐릭터 제안") as HTMLElement)
      await change("#proposal-name", "아홉번째")
      await click(Array.from(document.body.querySelectorAll("button")).find((b) => b.textContent === "제안 추가") as HTMLElement)
      expect(document.body.querySelector('[data-testid="pickup-proposal-form"] [role="alert"]')?.textContent).toContain("합쳐서 최대 8명")
    })

    it("lets the user remove a proposal and rolls the auto title back", async () => {
      await openPickupForm()
      await typeProposal("지울 캐릭터")
      expect((document.body.querySelector("#schedule-title") as HTMLInputElement).value).toBe("지울 캐릭터 픽업")
      await click(document.body.querySelector('button[aria-label="지울 캐릭터 제안 취소"]') as HTMLElement)

      expect(document.body.querySelector('[data-testid="pickup-proposals"]')).toBeNull()
      expect((document.body.querySelector("#schedule-title") as HTMLInputElement).value).toBe("")
    })

    it("blocks an oversized proposal image with an image-size message (R52-REV-004)", async () => {
      await openPickupForm()
      const openButton = Array.from(document.body.querySelectorAll("button")).find((b) => b.textContent === "+ 새 캐릭터 제안") as HTMLElement
      await click(openButton)
      await change("#proposal-name", "큰 이미지")
      expect(await registerImage(`data:image/webp;base64,${"A".repeat(150_000)}`)).toBe(false)

      expect(imageDialog()?.querySelector('[role="alert"]')?.textContent).toContain("이미지 용량이 너무 큽니다")
      expect(document.body.querySelector('[data-testid="pickup-proposals"]')).toBeNull()
    })

    it("excludes pickup-only characters from character UPDATE targets and from the supported-game count", async () => {
      await openModal()
      await change("#request-kind", "character")
      await change("#character-request-mode", "UPDATE")
      await change("#character-game", "game-1")

      const options = Array.from(document.body.querySelectorAll("#target-character option")).map((option) => option.textContent)
      expect(options).toEqual(["캐릭터를 선택하세요", "Alice", "Legacy"])
    })

    it("treats a game with only pickup-only characters as having no character template", async () => {
      from.mockImplementation((table: string) => {
        const q = createQuery(table)
        if (table === "games") q.order.mockResolvedValue({ data: [{ id: "game-x", name: "Pickup Only RPG", classification_schema: { rarities: [], axes: [] } }], error: null })
        if (table === "game_characters") q.order.mockResolvedValue({ data: [{ id: "x1", game_id: "game-x", name: "Guest", rarity: null, attributes: {}, is_pickup_only: true }], error: null })
        return q
      })
      await openModal()
      await change("#request-kind", "character")

      expect(Array.from(document.body.querySelectorAll("#character-game option")).map((option) => option.textContent)).toEqual(["게임을 선택하세요"])
      expect(document.body.textContent).toContain("관리자가 캐릭터 템플릿을 만든 게임이 아직 없어")
    })

    it("falls back to a catalog query without is_pickup_only when the column is missing (D-08)", async () => {
      const selects: string[] = []
      from.mockImplementation((table: string) => {
        const q = createQuery(table)
        if (table === "game_characters") {
          q.select.mockImplementation((columns: string) => {
            selects.push(columns)
            q.order.mockResolvedValue(columns.includes("is_pickup_only")
              ? { data: null, error: { code: "42703", message: "no column" } }
              : { data: characters, error: null })
            return q
          })
        }
        return q
      })
      await openPickupForm()

      expect(selects.some((columns) => columns.includes("is_pickup_only"))).toBe(true)
      expect(selects.some((columns) => !columns.includes("is_pickup_only"))).toBe(true)
      expect(pickerButton("Alice")).toBeDefined()
    })

    it("blocks an oversized character request icon before the database is called", async () => {
      await openModal()
      await change("#request-kind", "character")
      await change("#character-game", "game-1")
      await change("#character-name", "큰 아이콘")
      await change("#character-rarity", "5★")
      await change("#character-axis-element", "불")
      expect(await registerImage(`data:image/webp;base64,${"A".repeat(150_000)}`)).toBe(false)

      expect(imageDialog()?.querySelector('[role="alert"]')?.textContent).toContain("이미지 용량이 너무 큽니다")
      expect(insertCharacter).not.toHaveBeenCalled()
    })

    it("clears the original pickup characters on an edit request when the user removes them", async () => {
      await openModal()
      await change("#request-kind", "schedule")
      await change("#request-mode", "EDIT")
      await change("#schedule-game", "game-1")
      await change("#target-schedule", "schedule-2")
      await act(async () => Promise.resolve())

      expect(pickerButton("Alice")).toBeDefined()
      await submit()
      expect(insertSchedule.mock.calls[0][0]).not.toHaveProperty("pickup_character_ids")
    })

    it("shows the R52 guidance when a pickup submission fails with a migration or trigger error", async () => {
      insertSchedule.mockResolvedValue({ error: { code: "P0001", message: "픽업 캐릭터는 같은 게임의 카탈로그에 있어야 합니다." } })
      await openPickupForm()
      await click(pickerButton("Alice"))
      await change("#schedule-start-date", "2026-02-01")
      await change("#schedule-end-date", "2026-02-03")
      await submit()

      expect(document.body.textContent).toContain("R52 마이그레이션이 적용되지 않았거나 픽업 캐릭터 조건")
    })
  })

  it("surfaces database submission failures", async () => {
    await openModal()
    await change("#game-name", "New Game")
    insertGame.mockResolvedValue({ error: { message: "RLS denied" } })
    await submit()

    expect(document.body.querySelector('[role="alert"]')?.textContent).toContain("요청을 저장하지 못했습니다.")
    expect(document.body.textContent).not.toContain("요청을 제출했습니다.")
  })
})