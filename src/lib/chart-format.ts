export function formatAmountAxisTick(value: number): string {
  if (!Number.isFinite(value)) return String(value)
  if (value === 0) return "0"

  const absoluteValue = Math.abs(value)
  if (Number.isInteger(value) && absoluteValue >= 10_000 && value % 1_000 === 0) {
    return `${Number((value / 10_000).toFixed(1))}만`
  }
  if (Number.isInteger(value) && absoluteValue >= 1_000 && value % 1_000 === 0) {
    return `${value / 1_000}천`
  }

  return value.toLocaleString("ko-KR")
}

export function getGameTooltipLabel(label: unknown, games: ReadonlyArray<{ key: string; name: string }>): string {
  return games.find((game) => game.key === String(label))?.name ?? "게임 미연결"
}
