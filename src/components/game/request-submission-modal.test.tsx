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

  it("drops prefilled values that are no longer in the game classification schema", async () => {
    await openModal()
    await change("#request-kind", "character")
    await change("#character-request-mode", "UPDATE")
    await change("#character-game", "game-1")
    await change("#target-character", "char-2")
    await submit()

    expect(insertCharacter).toHaveBeenCalledWith(expect.objectContaining({
      target_character_id: "char-2",
      name: "Legacy",
      rarity: null,
      attributes: {},
    }))
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

  it("omits classification axes that were reset to 'no selection' before submitting", async () => {
    await openModal()
    await change("#request-kind", "character")
    await change("#character-game", "game-1")
    await change("#character-name", "Bob")
    await change("#character-axis-element", "물")
    await change("#character-axis-element", "")
    await submit()

    expect(insertCharacter).toHaveBeenCalledWith(expect.objectContaining({
      target_character_id: null,
      name: "Bob",
      attributes: {},
    }))
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