/**
 * Map key of a classification option icon: `(axis key, option)` joined by a NUL so no axis key/option text can collide.
 * Kept free of Supabase imports so presentational components can use it without needing the client env.
 */
export function classificationIconKey(axisKey: string, option: string): string {
  return `${axisKey}\u0000${option}`
}
