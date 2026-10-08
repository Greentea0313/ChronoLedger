export const OFFLINE_WRITE_MESSAGE = "오프라인 상태에서는 저장할 수 없습니다. 연결이 복구된 후 다시 시도해 주세요."

/** 쓰기 핸들러 안쪽의 방어용 검사. UI 비활성화가 우회돼도 요청을 보내지 않는다. */
export function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false
}
