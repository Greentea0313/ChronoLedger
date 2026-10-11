import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { Simulate } from "react-dom/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { RequestSubmissionModal } from "./request-submission-modal"

const { from, useAuth, insertGame, insertSchedule } = vi.hoisted(() => ({ from: vi.fn(), useAuth: vi.fn(), insertGame: vi.fn(), insertSchedule: vi.fn() }))

vi.mock("@/lib/auth-context", () => ({ useAuth }))
vi.mock("@/lib/supabase/client", () => ({ supabase: { from } }))

const games = [{ id: "game-1", name: "Sample RPG" }]
const schedules = [{
  id: "schedule-1",
  game_id: "game-1",
  title: "Version 1.0",
  schedule_type: "VERSION",
  start_date: "2026-01-10",
  end_date: "2026-01-20",
  memo: "Existing memo",
}]

function createQuery(table: string) {
  const query = { select: vi.fn(), order: vi.fn(), eq: vi.fn(), insert: vi.fn() }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.order.mockResolvedValue({
    data: table === "games" ? games : table === "game_schedules" ? schedules : [],
    error: null,
  })
  query.insert = table === "game_requests" ? insertGame : table === "schedule_requests" ? insertSchedule : vi.fn()
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
    await change("#schedule-start-date", "2026-02-01")
    await change("#schedule-end-date", "2026-02-03")
    await submit()

    expect(insertSchedule).toHaveBeenCalledWith({
      user_id: "authenticated-user",
      game_id: "game-1",
      target_schedule_id: null,
      title: "Version 2.0",
      schedule_type: "PICKUP",
      start_date: "2026-02-01",
      end_date: "2026-02-03",
      memo: null,
    })
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
      start_date: "2026-01-10",
      end_date: "2026-01-20",
      memo: "Existing memo",
    }))
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

  it("surfaces database submission failures", async () => {
    await openModal()
    await change("#game-name", "New Game")
    insertGame.mockResolvedValue({ error: { message: "RLS denied" } })
    await submit()

    expect(document.body.querySelector('[role="alert"]')?.textContent).toContain("요청을 저장하지 못했습니다.")
    expect(document.body.textContent).not.toContain("요청을 제출했습니다.")
  })
})