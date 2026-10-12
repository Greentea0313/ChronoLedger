export type ScheduleRequestValues = {
  requestMode: "ADD" | "EDIT"
  gameId: string
  targetScheduleId: string
  title: string
  scheduleType: string
  startDate: string
  endDate: string
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
}

export function validateGameRequest(name: string) {
  const trimmedName = name.trim()
  if (!trimmedName) return "게임 이름을 입력해 주세요."
  if (trimmedName.length > 100) return "게임 이름은 100자 이하여야 합니다."
  return null
}

export function validateScheduleRequest(values: ScheduleRequestValues) {
  if (!values.gameId) return "게임을 선택해 주세요."
  if (values.requestMode !== "ADD" && values.requestMode !== "EDIT") return "요청 유형을 선택해 주세요."
  if (values.requestMode === "EDIT" && !values.targetScheduleId) return "수정할 기존 일정을 선택해 주세요."
  if (!values.title.trim()) return "일정 제목을 입력해 주세요."
  if (values.title.trim().length > 150) return "일정 제목은 150자 이하여야 합니다."
  if (values.scheduleType !== "VERSION" && values.scheduleType !== "PICKUP" && values.scheduleType !== "CONTENTS") return "일정 종류를 선택해 주세요."
  if (!isValidDate(values.startDate) || !isValidDate(values.endDate)) return "시작일과 종료일을 올바르게 입력해 주세요."
  if (values.endDate < values.startDate) return "종료일은 시작일보다 빠를 수 없습니다."
  return null
}