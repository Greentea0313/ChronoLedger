import { describe, expect, it } from "vitest"
import { validateScheduleRequest } from "./request-validation"

const valid = { requestMode: "ADD" as const, gameId: "game", targetScheduleId: "", title: "Schedule", scheduleType: "BROADCAST", startDate: "2026-11-10", endDate: "2026-11-11" }

describe("validateScheduleRequest schedule kinds", () => {
  it("accepts BROADCAST", () => expect(validateScheduleRequest(valid)).toBeNull())
  it("accepts rerun PICKUP", () => expect(validateScheduleRequest({ ...valid, scheduleType: "PICKUP", isRerun: true })).toBeNull())
  it("rejects rerun outside PICKUP", () => expect(validateScheduleRequest({ ...valid, isRerun: true })).toBe("복각은 픽업 일정에만 설정할 수 있습니다."))
})
