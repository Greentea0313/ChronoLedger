import type { KeyboardEvent } from "react"

/**
 * 메모 입력란에서 Tab 키를 포커스 이동 대신 탭 문자(\t) 입력으로 처리한다.
 * Shift/Ctrl/Alt/Meta 조합과 IME 조합 중에는 가로채지 않아 키보드 사용자가 입력란을 벗어날 수 있다.
 */
export function insertTabOnKeyDown(
  event: KeyboardEvent<HTMLTextAreaElement>,
  setValue: (value: string) => void,
): void {
  if (event.key !== "Tab") return
  if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return
  if (event.nativeEvent.isComposing) return

  event.preventDefault()

  const textarea = event.currentTarget
  const { value, selectionStart, selectionEnd, maxLength } = textarea
  const nextLength = value.length - (selectionEnd - selectionStart) + 1
  if (maxLength > 0 && nextLength > maxLength) return

  setValue(value.slice(0, selectionStart) + "\t" + value.slice(selectionEnd))

  // 제어 컴포넌트가 값을 다시 그린 뒤 커서를 삽입한 탭 바로 뒤로 옮긴다.
  const caret = selectionStart + 1
  requestAnimationFrame(() => {
    textarea.setSelectionRange(caret, caret)
  })
}
