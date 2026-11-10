import { supabase } from "@/lib/supabase/client"
import { assertIconDataUrlSize } from "@/lib/image-resizer"
import { convertIconSourceToDataUrlWithUpscale } from "@/lib/image-upscaler"
import { isOffline, OFFLINE_WRITE_MESSAGE } from "@/lib/offline-guard"

export interface RegisteredPickupCharacter {
  id: string
  game_id: string
  name: string
  rarity: string | null
  attributes: Record<string, string>
  default_icon_url: string | null
  is_pickup_only: true
}

export interface RegisterPickupCharacterInput {
  gameId: string
  name: string
  /** Optional image: an uploaded file, an image URL or a pasted data URL. Empty means no icon. */
  imageSource: File | string | null
  /** Characters already known for the admin session; used to reject same-game duplicate names early. */
  existingCharacters: ReadonlyArray<{ game_id: string; name: string }>
  useAiUpscale: boolean
}

/** Thrown when the name already exists for the game, before anything is saved. Callers with a selectable list may append guidance. */
export class DuplicatePickupNameError extends Error {
  constructor() {
    super("같은 이름의 캐릭터가 이미 있습니다.")
    this.name = "DuplicatePickupNameError"
  }
}

/**
 * Registers a pickup-only character (`is_pickup_only = true`, no rarity/attributes) for a game.
 * Shared by the schedule form's "new pickup character" and the character tab's template-less game flow.
 * Throws an Error carrying a user-facing Korean message on any validation or save failure.
 */
export async function registerPickupOnlyCharacter(input: RegisterPickupCharacterInput): Promise<RegisteredPickupCharacter> {
  const name = input.name.trim()
  if (!name || name.length > 100) {
    throw new Error("캐릭터 이름을 1~100자로 입력해 주세요.")
  }
  if (input.existingCharacters.some((character) => character.game_id === input.gameId && character.name === name)) {
    throw new DuplicatePickupNameError()
  }
  if (isOffline()) {
    throw new Error(OFFLINE_WRITE_MESSAGE)
  }

  const source = typeof input.imageSource === "string" ? input.imageSource.trim() : input.imageSource
  const iconUrl = source ? assertIconDataUrlSize(await convertIconSourceToDataUrlWithUpscale(source, input.useAiUpscale)) : null

  const { data, error } = await supabase
    .from("game_characters")
    .insert({ game_id: input.gameId, name, default_icon_url: iconUrl, is_pickup_only: true })
    .select("id, game_id, name, rarity, attributes, default_icon_url, is_pickup_only")
    .single()
  if (error || !data) {
    const duplicate = error?.code === "23505"
    throw new Error(duplicate ? "같은 이름의 캐릭터가 이미 있습니다." : `픽업 캐릭터를 등록하지 못했습니다: ${error?.message ?? "알 수 없는 오류"}`)
  }
  return {
    id: data.id,
    game_id: data.game_id,
    name: data.name,
    rarity: data.rarity ?? null,
    attributes: {},
    default_icon_url: data.default_icon_url ?? null,
    is_pickup_only: true,
  }
}
