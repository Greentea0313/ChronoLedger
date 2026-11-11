// Pickup character avatars shared by the sidebar, weekly list and game schedule tree.
import { DefaultAvatar } from "@/components/character/default-avatar"

/** Character avatar shown on PICKUP schedule cards (spec §5.2, A1 U-08). `iconUrl` is null for characters without an icon. */
export interface PickupAvatar {
  id: string
  name: string
  iconUrl: string | null
}

/**
 * Avatars of a PICKUP schedule in saved order. Ids that are no longer in the catalog (deleted) are skipped;
 * characters without an icon stay (rendered as the default avatar). Legacy PICKUP schedules return [] (NR-10).
 */
export function getPickupAvatars(
  schedule: { schedule_type: string; pickup_character_ids?: string[] | null },
  characters: Record<string, { name: string; iconUrl: string | null }>,
): PickupAvatar[] {
  if (schedule.schedule_type !== "PICKUP") return []
  return (schedule.pickup_character_ids ?? []).flatMap((characterId) => {
    const character = characters[characterId]
    return character ? [{ id: characterId, name: character.name, iconUrl: character.iconUrl }] : []
  })
}

/** Up to three overlapping round avatars with a `+n` counter and a name tooltip; no icon -> default person avatar. */
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
      {visible.map((avatar) =>
        avatar.iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={avatar.id}
            src={avatar.iconUrl}
            alt={avatar.name}
            referrerPolicy="no-referrer"
            style={{ width: size, height: size }}
            className="rounded-full border border-surface bg-surface-2 object-cover"
          />
        ) : (
          <span
            key={avatar.id}
            role="img"
            aria-label={avatar.name}
            data-testid="pickup-avatar-default"
            style={{ width: size, height: size }}
            className="flex items-center justify-center overflow-hidden rounded-full border border-surface bg-surface-2"
          >
            <DefaultAvatar />
          </span>
        ),
      )}
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
