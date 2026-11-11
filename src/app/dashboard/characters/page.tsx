"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { GameIcon } from "@/components/ui/game-icon"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RequestSubmissionModal } from "@/components/game/request-submission-modal"
import { CharacterRoster } from "@/components/character/character-roster"
import { loadClassificationIcons } from "@/lib/classification-icons"
import { PresetBoard } from "@/components/character/preset-board"
import {
  isCharacterSupported,
  normalizeCharacterRow,
  normalizeClassificationSchema,
  normalizeMaxBreakthrough,
  normalizeMaxPresetSlots,
  type ClassificationSchema,
  type GameCharacter,
  type UserCharacterState,
} from "@/lib/character-utils"
import {
  deleteCustomCharacterIcon,
  downloadUserIcon,
  getCustomCharacterIconPath,
  getCustomCharacterIconUrl,
  uploadCustomCharacterIcon,
} from "@/lib/storage-upload"
import { isOffline, OFFLINE_WRITE_MESSAGE } from "@/lib/offline-guard"
import { preloadImages } from "@/lib/icon-preload"
import type { BoardPreset } from "@/lib/preset-board"
import { usePresetBoard } from "@/lib/use-preset-board"

interface UserGameRow {
  id: string
  game_id: string
  custom_icon_path: string | null
  games: {
    id: string
    name: string
    default_icon_url?: string | null
    max_preset_slots?: number | null
    max_breakthrough?: number | null
    classification_schema?: unknown
  } | null
}

interface GameEntry {
  gameId: string
  name: string
  defaultIconUrl: string | null
  maxPresetSlots: number
  maxBreakthrough: number
  schema: ClassificationSchema
  /** Character system name set by the admin template (e.g. 공명자); defaults to 캐릭터. */
  characterLabel: string
}

interface UserCharacterRow extends UserCharacterState {
  game_id: string
  character_id: string
}

type Notice = { type: "error" | "success"; text: string }

const FAVORITE_ORDER_MIGRATION_HINT =
  "즐겨찾기 순서 저장 기능이 아직 적용되지 않았습니다. MIGRATION_USER_CHARACTER_FAVORITE_ORDER.sql 적용 여부를 확인해 주세요."

/** Postgres undefined_column / PostgREST schema-cache miss: the column is not migrated yet. */
const isMissingColumnError = (error: { code?: string } | null) => error?.code === "42703" || error?.code === "PGRST204"
/** PostgREST function-not-found / Postgres undefined_function: the RPC is not migrated yet. */
const isMissingFunctionError = (error: { code?: string } | null) => error?.code === "PGRST202" || error?.code === "42883"

const MIGRATION_HINT = "캐릭터 데이터를 불러오지 못했습니다. R13 마이그레이션(MIGRATION_R13_CHARACTERS_AND_PRESETS.sql) 적용 여부를 확인해 주세요."

function CharactersPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="캐릭터 페이지 불러오는 중">
      <div className="h-16 animate-pulse rounded-lg bg-surface-2" />
      <div className="flex gap-3">
        <div className="h-16 w-56 animate-pulse rounded-lg bg-surface-2" />
        <div className="h-16 w-56 animate-pulse rounded-lg bg-surface-2" />
      </div>
      <div className="h-72 animate-pulse rounded-lg bg-surface-2" />
    </div>
  )
}

export default function CharactersPage() {
  const { user } = useAuth()
  const userId = user?.id

  const [userGameRows, setUserGameRows] = useState<UserGameRow[]>([])
  const [gameIcons, setGameIcons] = useState<Record<string, string>>({})
  const [catalogCounts, setCatalogCounts] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)

  const [loadedCatalog, setLoadedCatalog] = useState<{ gameId: string; items: GameCharacter[] } | null>(null)
  const [userCharacterRows, setUserCharacterRows] = useState<UserCharacterRow[]>([])
  const [presets, setPresets] = useState<BoardPreset[]>([])
  const [characterIcons, setCharacterIcons] = useState<Record<string, string>>({})
  const [busyCharacterIds, setBusyCharacterIds] = useState<Record<string, boolean>>({})
  // Favorite order needs the favorite_sort_order column and reorder_favorite_characters RPC (R63 migration).
  const [favoriteOrderSupported, setFavoriteOrderSupported] = useState(true)
  const [isReordering, setIsReordering] = useState(false)
  const reorderingRef = useRef(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [activeTab, setActiveTab] = useState("roster")

  const hasLoadedInitialRef = useRef(false)
  // The optional `?gameId=` query selects a game on first render (static export: read it on the client).
  useEffect(() => {
    const queryGameId = new URLSearchParams(window.location.search).get("gameId")
    if (queryGameId) setSelectedGameId(queryGameId)
  }, [])

  const gameEntries = useMemo<GameEntry[]>(() => {
    const entries: GameEntry[] = []
    userGameRows.forEach((row) => {
      if (!row.games) return
      // Roster and presets exist only for games whose admin catalog has at least one character (spec §4.1).
      // A failed count query leaves the key unset; such games stay visible rather than disappearing.
      const knownCount = catalogCounts[row.game_id]
      if (knownCount !== undefined && !isCharacterSupported(knownCount)) return
      entries.push({
        gameId: row.game_id,
        name: row.games.name,
        defaultIconUrl: row.games.default_icon_url ?? null,
        maxPresetSlots: normalizeMaxPresetSlots(row.games.max_preset_slots),
        maxBreakthrough: normalizeMaxBreakthrough(row.games.max_breakthrough),
        schema: normalizeClassificationSchema(row.games.classification_schema),
        characterLabel: normalizeClassificationSchema(row.games.classification_schema).character_label || "캐릭터",
      })
    })
    return entries.sort((a, b) => a.name.localeCompare(b.name, "ko"))
  }, [catalogCounts, userGameRows])

  const selectedGame = useMemo(
    () => gameEntries.find((entry) => entry.gameId === selectedGameId) ?? gameEntries[0] ?? null,
    [gameEntries, selectedGameId],
  )
  const activeGameId = selectedGame?.gameId ?? null
  // Never show another game's catalog while the selected game's catalog is still loading.
  const isCatalogLoading = !!activeGameId && loadedCatalog?.gameId !== activeGameId
  const characters = useMemo(
    () => (loadedCatalog && loadedCatalog.gameId === activeGameId ? loadedCatalog.items : []),
    [loadedCatalog, activeGameId],
  )

  const loadSubscribedGames = useCallback(async () => {
    if (!userId) return
    const { data, error } = await supabase
      .from("user_games")
      .select("id, game_id, custom_icon_path, games(id, name, default_icon_url, max_preset_slots, max_breakthrough, classification_schema)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
    if (error) {
      setNotice({ type: "error", text: `구독 게임을 불러오지 못했습니다: ${error.message}` })
      return
    }
    const rows = (data as unknown as UserGameRow[]) ?? []
    preloadImages(rows.map((row) => row.games?.default_icon_url))

    // Header counts: one cheap count query per game keeps the totals exact beyond the PostgREST row limit.
    const counts: Record<string, number> = {}
    await Promise.all(
      rows.map(async (row) => {
        // Pickup-only characters are not part of the roster (A1 D-02/D-06); an unmigrated DB (D-08) counts everything.
        let result = await supabase
          .from("game_characters")
          .select("id", { count: "exact", head: true })
          .eq("game_id", row.game_id)
          .eq("is_pickup_only", false)
        if (result.error && (result.error.code === "42703" || result.error.code === "PGRST204")) {
          result = await supabase.from("game_characters").select("id", { count: "exact", head: true }).eq("game_id", row.game_id)
        }
        if (!result.error) counts[row.game_id] = result.count ?? 0
      }),
    )
    // Set together so the supported-game filter never runs against missing counts.
    setCatalogCounts(counts)
    setUserGameRows(rows)

    const iconMap: Record<string, string> = {}
    await Promise.all(
      rows
        .filter((row) => !!row.custom_icon_path)
        .map(async (row) => {
          try {
            const url = await downloadUserIcon(userId, row.game_id)
            if (url) iconMap[row.game_id] = url
          } catch {
            // Keep the default game icon.
          }
        }),
    )
    setGameIcons(iconMap)
  }, [userId])

  const loadUserCharacterData = useCallback(async () => {
    if (!userId) return
    const ownedColumns = "character_id, game_id, is_owned, is_favorite, breakthrough_level, custom_icon_path"
    const [initialOwnedResult, presetResult] = await Promise.all([
      supabase.from("user_characters").select(`${ownedColumns}, favorite_sort_order`).eq("user_id", userId),
      supabase
        .from("user_character_presets")
        .select("id, game_id, title, character_ids, memo, sort_order, created_at")
        .eq("user_id", userId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ])
    let ownedResult = initialOwnedResult
    // Not migrated yet: load without the order column and show favorites by name.
    if (isMissingColumnError(ownedResult.error)) {
      ownedResult = (await supabase.from("user_characters").select(ownedColumns).eq("user_id", userId)) as typeof ownedResult
      setFavoriteOrderSupported(false)
    }
    if (ownedResult.error || presetResult.error) {
      setNotice({ type: "error", text: MIGRATION_HINT })
      return
    }
    setUserCharacterRows((ownedResult.data as UserCharacterRow[]) ?? [])
    setPresets((presetResult.data as BoardPreset[]) ?? [])
  }, [userId])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    const load = async () => {
      if (!hasLoadedInitialRef.current) setIsLoading(true)
      await Promise.all([loadSubscribedGames(), loadUserCharacterData()])
      if (cancelled) return
      hasLoadedInitialRef.current = true
      setIsLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [userId, loadSubscribedGames, loadUserCharacterData])

  // Catalog of the selected game only; icons are base64 so other games are not fetched.
  useEffect(() => {
    if (!activeGameId) return
    let cancelled = false
    const loadCatalog = async () => {
      const columns = "id, game_id, name, rarity, attributes, default_icon_url"
      let result = await supabase.from("game_characters").select(`${columns}, is_pickup_only`).eq("game_id", activeGameId).order("name")
      // Not migrated yet (D-08): every character is a regular roster character.
      if (result.error && (result.error.code === "42703" || result.error.code === "PGRST204")) {
        result = (await supabase.from("game_characters").select(columns).eq("game_id", activeGameId).order("name")) as typeof result
      }
      const { data, error } = result
      if (cancelled) return
      if (error) {
        setNotice({ type: "error", text: `캐릭터 목록을 불러오지 못했습니다: ${error.message}` })
        setLoadedCatalog({ gameId: activeGameId, items: [] })
        return
      }
      // Pickup-only characters exist for schedule avatars only: no ownership check, no presets (U-08).
      const items = (data ?? [])
        .filter((row) => (row as { is_pickup_only?: boolean }).is_pickup_only !== true)
        .map(normalizeCharacterRow)
      preloadImages(items.map((character) => character.default_icon_url))
      setLoadedCatalog({ gameId: activeGameId, items })
    }
    void loadCatalog()
    return () => {
      cancelled = true
    }
  }, [activeGameId])

  // Classification option icons of the selected game (R64). Loaded once per game change; failures or an
  // unapplied migration leave the map empty so every screen renders exactly as before.
  const [loadedIcons, setLoadedIcons] = useState<{ gameId: string; icons: Map<string, string> } | null>(null)
  useEffect(() => {
    if (!activeGameId) return
    let cancelled = false
    void loadClassificationIcons(activeGameId).then(({ icons }) => {
      if (!cancelled) setLoadedIcons({ gameId: activeGameId, icons })
    })
    return () => {
      cancelled = true
    }
  }, [activeGameId])
  const classificationIcons = useMemo(
    () => (loadedIcons && loadedIcons.gameId === activeGameId ? loadedIcons.icons : undefined),
    [loadedIcons, activeGameId],
  )

  const rowsForGame = useMemo(
    () => userCharacterRows.filter((row) => row.game_id === activeGameId),
    [userCharacterRows, activeGameId],
  )

  const characterStates = useMemo(() => {
    const map: Record<string, UserCharacterState> = {}
    rowsForGame.forEach((row) => {
      map[row.character_id] = {
        is_owned: row.is_owned,
        is_favorite: row.is_favorite,
        favorite_sort_order: row.favorite_sort_order ?? null,
        breakthrough_level: row.breakthrough_level,
        custom_icon_path: row.custom_icon_path,
      }
    })
    return map
  }, [rowsForGame])

  const presetsForGame = useMemo(() => presets.filter((preset) => preset.game_id === activeGameId), [presets, activeGameId])
  // R76: every preset change is applied at once and saved through one write queue.
  const presetBoard = usePresetBoard({ userId, presets, setPresets, reload: loadUserCharacterData, onNotice: setNotice })

  // Download the user's custom icons for the selected game (cached per full object path).
  const customIconKey = rowsForGame
    .filter((row) => !!row.custom_icon_path)
    .map((row) => row.character_id)
    .join(",")
  useEffect(() => {
    if (!userId || !customIconKey) return
    let cancelled = false
    const loadIcons = async () => {
      const next: Record<string, string> = {}
      await Promise.all(
        customIconKey.split(",").map(async (characterId) => {
          try {
            const url = await getCustomCharacterIconUrl(userId, characterId)
            if (url) next[characterId] = url
          } catch {
            // Fall back to the catalog default icon.
          }
        }),
      )
      if (!cancelled) setCharacterIcons((prev) => ({ ...prev, ...next }))
    }
    void loadIcons()
    return () => {
      cancelled = true
    }
  }, [userId, customIconKey])

  const summaryFor = (entry: GameEntry) => {
    const ownedCount = userCharacterRows.filter((row) => row.game_id === entry.gameId && row.is_owned).length
    const total = catalogCounts[entry.gameId] ?? 0
    const presetCount = presets.filter((preset) => preset.game_id === entry.gameId).length
    return `보유 ${entry.characterLabel} ${ownedCount} / ${total}명 · 프리셋 ${presetCount}개`
  }

  const setBusy = (characterId: string, busy: boolean) =>
    setBusyCharacterIds((prev) => ({ ...prev, [characterId]: busy }))

  const applyRowLocally = (row: UserCharacterRow) =>
    setUserCharacterRows((prev) => [...prev.filter((item) => item.character_id !== row.character_id), row])

  // Writes one user_characters row. A missing row is created unowned unless the patch says otherwise,
  // so saving a favorite for an unowned character never flips it to owned (DB default is_owned = true).
  const saveUserCharacter = async (character: GameCharacter, patch: Partial<UserCharacterState>): Promise<boolean> => {
    if (!userId || !activeGameId || reorderingRef.current) return false
    if (isOffline()) {
      setNotice({ type: "error", text: OFFLINE_WRITE_MESSAGE })
      return false
    }
    const current = characterStates[character.id]
    const next: UserCharacterState = {
      is_owned: current?.is_owned ?? false,
      is_favorite: current?.is_favorite ?? false,
      favorite_sort_order: current?.favorite_sort_order ?? null,
      breakthrough_level: current?.breakthrough_level ?? 0,
      custom_icon_path: current?.custom_icon_path ?? null,
      ...patch,
    }
    // Mirror the DB trigger: only owned characters can be favorites; a new favorite goes to the end of the order.
    const clearsFavorite = !next.is_owned && !!current?.is_favorite
    if (!next.is_owned || !next.is_favorite) {
      next.is_favorite = next.is_owned && next.is_favorite
      next.favorite_sort_order = null
    } else if (!current?.is_favorite) {
      next.favorite_sort_order =
        Object.values(characterStates).reduce((max, state) => (state.is_favorite && state.is_owned ? Math.max(max, state.favorite_sort_order ?? 0) : max), 0) + 1
    }
    setBusy(character.id, true)
    try {
      const { error } = await supabase.from("user_characters").upsert(
        {
          user_id: userId,
          game_id: activeGameId,
          character_id: character.id,
          is_owned: next.is_owned,
          ...patch,
          ...(clearsFavorite ? { is_favorite: false } : {}),
        },
        { onConflict: "user_id,character_id" },
      )
      if (error) {
        setNotice({ type: "error", text: `저장하지 못했습니다: ${error.message}` })
        return false
      }
      applyRowLocally({ game_id: activeGameId, character_id: character.id, ...next })
      return true
    } finally {
      setBusy(character.id, false)
    }
  }

  const handleToggleOwned = async (character: GameCharacter) => {
    setNotice(null)
    await saveUserCharacter(character, { is_owned: !(characterStates[character.id]?.is_owned ?? false) })
  }

  const handleToggleFavorite = async (character: GameCharacter) => {
    // Only owned characters can be favorites (R63).
    if (!(characterStates[character.id]?.is_owned ?? false)) return
    setNotice(null)
    await saveUserCharacter(character, { is_favorite: !(characterStates[character.id]?.is_favorite ?? false) })
  }

  // Saves the complete favorite order with one RPC call; rolls back to the previous order on failure.
  const handleReorderFavorites = async (orderedIds: string[]) => {
    if (!userId || !activeGameId || reorderingRef.current || Object.values(busyCharacterIds).some(Boolean)) return
    if (isOffline()) {
      setNotice({ type: "error", text: OFFLINE_WRITE_MESSAGE })
      return
    }
    setNotice(null)
    const gameId = activeGameId
    const previousRows = userCharacterRows
    reorderingRef.current = true
    setIsReordering(true)
    setUserCharacterRows((prev) =>
      prev.map((row) => {
        const index = orderedIds.indexOf(row.character_id)
        return row.game_id === gameId && index >= 0 ? { ...row, favorite_sort_order: index + 1 } : row
      }),
    )
    try {
      const { error } = await supabase.rpc("reorder_favorite_characters", { p_game_id: gameId, p_character_ids: orderedIds })
      if (error) {
        setUserCharacterRows(previousRows)
        if (isMissingFunctionError(error)) {
          setFavoriteOrderSupported(false)
          setNotice({ type: "error", text: FAVORITE_ORDER_MIGRATION_HINT })
        } else {
          setNotice({ type: "error", text: `즐겨찾기 순서를 저장하지 못했습니다: ${error.message}` })
        }
      }
    } finally {
      reorderingRef.current = false
      setIsReordering(false)
    }
  }

  const handleSetBreakthrough = async (character: GameCharacter, level: number) => {
    setNotice(null)
    await saveUserCharacter(character, { breakthrough_level: level })
  }

  // R81: the blob is already a 256x256 WebP from the shared image dialog; returns the dialog error text (null = saved).
  const handleChangeIcon = async (character: GameCharacter, webpBlob: Blob): Promise<string | null> => {
    if (!userId) return "로그인이 필요합니다."
    if (isOffline()) return OFFLINE_WRITE_MESSAGE
    setNotice(null)
    setBusy(character.id, true)
    try {
      await uploadCustomCharacterIcon(userId, character.id, webpBlob)
    } catch (cause) {
      setBusy(character.id, false)
      return `아이콘 업로드에 실패했습니다: ${cause instanceof Error ? cause.message : "알 수 없는 오류"}`
    }
    setBusy(character.id, false)
    const saved = await saveUserCharacter(character, { custom_icon_path: getCustomCharacterIconPath(userId, character.id) })
    if (!saved) return "아이콘 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요."
    try {
      const url = await getCustomCharacterIconUrl(userId, character.id)
      if (url) setCharacterIcons((prev) => ({ ...prev, [character.id]: url }))
    } catch {
      // The row is saved; the icon appears on the next load.
    }
    setNotice({ type: "success", text: `${character.name} 아이콘을 변경했습니다.` })
    return null
  }

  const handleRestoreIcon = async (character: GameCharacter) => {
    if (!userId) return
    setNotice(null)
    const saved = await saveUserCharacter(character, { custom_icon_path: null })
    if (!saved) return
    setCharacterIcons((prev) => {
      const next = { ...prev }
      delete next[character.id]
      return next
    })
    try {
      await deleteCustomCharacterIcon(userId, character.id)
    } catch {
      // The orphaned object stays private and is overwritten on the next upload.
    }
  }

  const handleSelectGame = (gameId: string) => {
    if (gameId === activeGameId) return
    setSelectedGameId(gameId)
  }

  if (isLoading && !hasLoadedInitialRef.current) return <CharactersPageSkeleton />
  if (!user) return <div className="p-6 text-content">로그인이 필요합니다.</div>

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col gap-4 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">캐릭터</h1>
          <p className="mt-1 text-sm text-content-secondary">구독 게임별 보유 캐릭터와 조합 프리셋을 관리합니다.</p>
        </div>
        <RequestSubmissionModal
          initialKind="character"
          triggerText={
            <>
              {/* Mobile keeps the generic label; the admin character_label is shown from md (900px) up. */}
              <span className="md:hidden">+ 캐릭터 추가·수정 요청</span>
              <span className="hidden md:inline">{`+ ${selectedGame?.characterLabel ?? "캐릭터"} 추가·수정 요청`}</span>
            </>
          }
          className="h-10 border-line font-medium text-content hover:bg-surface-2"
        />
      </header>

      {notice && (
        <p
          role={notice.type === "error" ? "alert" : "status"}
          className={notice.type === "error" ? "text-sm text-danger" : "text-sm text-success"}
        >
          {notice.text}
        </p>
      )}

      {gameEntries.length === 0 ? (
        userGameRows.length > 0 ? (
          <EmptyState
            message="현재 구독 중인 게임 중 캐릭터·프리셋 기능을 지원하는 게임이 없습니다."
            hint="보유 캐릭터 체크 및 조합 프리셋은 관리자가 캐릭터 카탈로그를 등록한 게임에서만 제공됩니다."
          />
        ) : (
          <div className="space-y-3 text-center">
            <EmptyState message="구독 중인 게임이 없습니다." hint="게임을 구독하면 캐릭터와 프리셋을 관리할 수 있습니다." />
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/games">게임 구독하러 가기</Link>
            </Button>
          </div>
        )
      ) : (
        <>
          <nav aria-label="구독 게임 선택" className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
            {gameEntries.map((entry) => {
              const isSelected = entry.gameId === activeGameId
              return (
                <button
                  key={entry.gameId}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleSelectGame(entry.gameId)}
                  className={`flex min-w-[220px] shrink-0 items-center gap-3 rounded-lg border p-3 text-left transition-colors duration-fast ${
                    isSelected ? "border-primary bg-primary/10" : "border-line bg-surface hover:bg-surface-2"
                  }`}
                >
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-line">
                    <GameIcon src={gameIcons[entry.gameId] || entry.defaultIconUrl} alt={entry.name} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-content">{entry.name}</p>
                    <p className="text-xs text-content-secondary">{summaryFor(entry)}</p>
                  </div>
                </button>
              )
            })}
          </nav>

          {selectedGame && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full max-w-sm grid-cols-2 border border-line bg-surface-2">
                <TabsTrigger value="roster">{`보유 ${selectedGame.characterLabel}`}</TabsTrigger>
                <TabsTrigger value="presets">조합 프리셋</TabsTrigger>
              </TabsList>

              <TabsContent value="roster" className="mt-4">
                <CharacterRoster
                  key={selectedGame.gameId}
                  characters={characters}
                  schema={selectedGame.schema}
                  states={characterStates}
                  customIconUrls={characterIcons}
                  busyIds={busyCharacterIds}
                  maxBreakthrough={selectedGame.maxBreakthrough}
                  isLoading={isCatalogLoading}
                  favoriteOrderSupported={favoriteOrderSupported}
                  isReordering={isReordering}
                  classificationIcons={classificationIcons}
                  onReorderFavorites={(ids) => void handleReorderFavorites(ids)}
                  onToggleOwned={(character) => void handleToggleOwned(character)}
                  onToggleFavorite={(character) => void handleToggleFavorite(character)}
                  onSetBreakthrough={(character, level) => void handleSetBreakthrough(character, level)}
                  onChangeIcon={handleChangeIcon}
                  onRestoreIcon={(character) => void handleRestoreIcon(character)}
                />
              </TabsContent>

              <TabsContent value="presets" className="mt-4">
                <PresetBoard
                  key={selectedGame.gameId}
                  gameId={selectedGame.gameId}
                  presets={presetsForGame}
                  maxSlots={selectedGame.maxPresetSlots}
                  characters={characters}
                  schema={selectedGame.schema}
                  states={characterStates}
                  customIconUrls={characterIcons}
                  board={presetBoard}
                  onError={(text) => setNotice({ type: "error", text })}
                />
              </TabsContent>
            </Tabs>
          )}

        </>
      )}
    </div>
  )
}
