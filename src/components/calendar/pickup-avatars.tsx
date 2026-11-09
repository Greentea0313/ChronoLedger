// Pickup character avatars shared by the sidebar, weekly list and game schedule tree.

/** Character image shown on PICKUP schedule cards (spec §5.2). */
export interface PickupAvatar {
  id: string
  name: string
  iconUrl: string
}

/**
 * Avatars of a PICKUP schedule: catalog character icons in saved order (unknown/deleted ids are skipped),
 * otherwise the directly uploaded pickup image. Legacy PICKUP schedules without either return [] (NR-10).
 */
export function getPickupAvatars(
  schedule: {
    id: string
    title: string
    schedule_type: string
    pickup_character_ids?: string[] | null
    pickup_image_url?: string | null
  },
  characters: Record<string, { name: string; iconUrl: string | null }>,
): PickupAvatar[] {
  if (schedule.schedule_type !== "PICKUP") return []
  const fromCharacters = (schedule.pickup_character_ids ?? []).flatMap((characterId) => {
    const character = characters[characterId]
    return character?.iconUrl ? [{ id: characterId, name: character.name, iconUrl: character.iconUrl }] : []
  })
  if (fromCharacters.length > 0) return fromCharacters
  return schedule.pickup_image_url ? [{ id: schedule.id, name: schedule.title, iconUrl: schedule.pickup_image_url }] : []
}

/** Up to three overlapping round avatars with a `+n` counter and a name tooltip. */
export function PickupAvatars({ avatars, size = 28, className }: { avatars?: PickupAvatar[]; size?: number; className?: string }) {
  if (!avatars || avatars.length === 0) return null
  const visible = avatars.slice(0, 3)
  const extra = avatars.length - visible.length
  return (
    <span
      data-testid="pickup-avatars"
      title={avatars.map((avatar) => avatar.name).join(", ")}
      className={`relative z-10 inline-flex shrink-0 items-center -space-x-1.5 ${className ?? ""}`}
    >
      {visible.map((avatar) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={avatar.id}
          src={avatar.iconUrl}
          alt={avatar.name}
          referrerPolicy="no-referrer"
          style={{ width: size, height: size }}
          className="rounded-full border border-surface bg-surface-2 object-cover"
        />
      ))}
      {extra > 0 && (
        <span
          style={{ width: size, height: size }}
          className="flex items-center justify-center rounded-full border border-surface bg-surface-2 text-[10px] font-semibold text-content-secondary"
        >
          {`+${extra}`}
        </span>
      )}
    </span>
  )
}
