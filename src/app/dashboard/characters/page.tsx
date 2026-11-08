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
import { PresetEditorDialog, type PresetDraft, type PresetEditorTarget } from "@/components/character/preset-editor-dialog"
import { PresetList, type PresetRow } from "@/components/character/preset-list"
import {
  PRESET_SLOT_HARD_LIMIT,
  normalizeCharacterRow,
  normalizeClassificationSchema,
  normalizeMaxPresetSlots,
  validatePresetInput,
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
import { resizeImageToWebP } from "@/lib/image-resizer"
import { isOffline, OFFLINE_WRITE_MESSAGE } from "@/lib/offline-guard"
import { preloadImages } from "@/lib/icon-preload"

interface UserGameRow {
  id: string
  game_id: string
  custom_icon_path: string | null
  games: {
    id: string
    name: string
    default_icon_url?: string | null
    max_preset_slots?: number | null
    classification_schema?: unknown
  } | null
}

interface GameEntry {
  gameId: string
  name: string
  defaultIconUrl: string | null
  maxPresetSlots: number
  schema: ClassificationSchema
}

interface UserCharacterRow extends UserCharacterState {
  game_id: string
  character_id: string
}

type Notice = { type: "error" | "success"; text: string }

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
  const [presets, setPresets] = useState<PresetRow[]>([])
  const [characterIcons, setCharacterIcons] = useState<Record<string, string>>({})
  const [busyCharacterIds, setBusyCharacterIds] = useState<Record<string, boolean>>({})
  const [isPresetBusy, setIsPresetBusy] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [activeTab, setActiveTab] = useState("roster")

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorTarget, setEditorTarget] = useState<PresetEditorTarget | null>(null)

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
      entries.push({
        gameId: row.game_id,
        name: row.games.name,
        defaultIconUrl: row.games.default_icon_url ?? null,
        maxPresetSlots: normalizeMaxPresetSlots(row.games.max_preset_slots),
        schema: normalizeClassificationSchema(row.games.classification_schema),
      })
    })
    return entries.sort((a, b) => a.name.localeCompare(b.name, "ko"))
  }, [userGameRows])

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
      .select("id, game_id, custom_icon_path, games(id, name, default_icon_url, max_preset_slots, classification_schema)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
    if (error) {
      setNotice({ type: "error", text: `구독 게임을 불러오지 못했습니다: ${error.message}` })
      return
    }
    const rows = (data as unknown as UserGameRow[]) ?? []
    setUserGameRows(rows)
    preloadImages(rows.map((row) => row.games?.default_icon_url))

    // Header counts: one cheap count query per game keeps the totals exact beyond the PostgREST row limit.
    const counts: Record<string, number> = {}
    await Promise.all(
      rows.map(async (row) => {
        const result = await supabase
          .from("game_characters")
          .select("id", { count: "exact", head: true })
          .eq("game_id", row.game_id)
        counts[row.game_id] = result.count ?? 0
      }),
    )
    setCatalogCounts(counts)

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
    const [ownedResult, presetResult] = await Promise.all([
      supabase
        .from("user_characters")
        .select("character_id, game_id, is_owned, memo, custom_icon_path")
        .eq("user_id", userId),
      supabase
        .from("user_character_presets")
        .select("id, game_id, title, character_ids, memo, sort_order, created_at")
        .eq("user_id", userId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ])
    if (ownedResult.error || presetResult.error) {
      setNotice({ type: "error", text: MIGRATION_HINT })
      return
    }
    setUserCharacterRows((ownedResult.data as UserCharacterRow[]) ?? [])
    setPresets((presetResult.data as PresetRow[]) ?? [])
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
      const { data, error } = await supabase
        .from("game_characters")
        .select("id, game_id, name, rarity, attributes, default_icon_url")
        .eq("game_id", activeGameId)
        .order("name")
      if (cancelled) return
      if (error) {
        setNotice({ type: "error", text: `캐릭터 목록을 불러오지 못했습니다: ${error.message}` })
        setLoadedCatalog({ gameId: activeGameId, items: [] })
        return
      }
      const items = (data ?? []).map(normalizeCharacterRow)
      preloadImages(items.map((character) => character.default_icon_url))
      setLoadedCatalog({ gameId: activeGameId, items })
    }
    void loadCatalog()
    return () => {
      cancelled = true
    }
  }, [activeGameId])

  const rowsForGame = useMemo(
    () => userCharacterRows.filter((row) => row.game_id === activeGameId),
    [userCharacterRows, activeGameId],
  )

  const characterStates = useMemo(() => {
    const map: Record<string, UserCharacterState> = {}
    rowsForGame.forEach((row) => {
      map[row.character_id] = { is_owned: row.is_owned, memo: row.memo, custom_icon_path: row.custom_icon_path }
    })
    return map
  }, [rowsForGame])

  const presetsForGame = useMemo(() => presets.filter((preset) => preset.game_id === activeGameId), [presets, activeGameId])

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
    return `보유 캐릭터 ${ownedCount} / ${total}명 · 프리셋 ${presetCount}개`
  }

  const setBusy = (characterId: string, busy: boolean) =>
    setBusyCharacterIds((prev) => ({ ...prev, [characterId]: busy }))

  const applyRowLocally = (row: UserCharacterRow) =>
    setUserCharacterRows((prev) => [...prev.filter((item) => item.character_id !== row.character_id), row])

  // Writes one user_characters row. A missing row is created unowned unless the patch says otherwise,
  // so saving a memo for an unowned character never flips it to owned (DB default is_owned = true).
  const saveUserCharacter = async (character: GameCharacter, patch: Partial<UserCharacterState>): Promise<boolean> => {
    if (!userId || !activeGameId) return false
    if (isOffline()) {
      setNotice({ type: "error", text: OFFLINE_WRITE_MESSAGE })
      return false
    }
    const current = characterStates[character.id]
    const next: UserCharacterState = {
      is_owned: current?.is_owned ?? false,
      memo: current?.memo ?? null,
      custom_icon_path: current?.custom_icon_path ?? null,
      ...patch,
    }
    setBusy(character.id, true)
    try {
      const { error } = await supabase.from("user_characters").upsert(
        { user_id: userId, game_id: activeGameId, character_id: character.id, is_owned: next.is_owned, ...patch },
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

  const handleSaveMemo = async (character: GameCharacter, memo: string | null) => {
    setNotice(null)
    await saveUserCharacter(character, { memo })
  }

  const handleChangeIcon = async (character: GameCharacter, file: File) => {
    if (!userId) return
    if (isOffline()) {
      setNotice({ type: "error", text: OFFLINE_WRITE_MESSAGE })
      return
    }
    setNotice(null)
    setBusy(character.id, true)
    try {
      const webpBlob = await resizeImageToWebP(file)
      await uploadCustomCharacterIcon(userId, character.id, webpBlob)
    } catch (cause) {
      setNotice({ type: "error", text: `아이콘 업로드에 실패했습니다: ${cause instanceof Error ? cause.message : "알 수 없는 오류"}` })
      setBusy(character.id, false)
      return
    }
    setBusy(character.id, false)
    const saved = await saveUserCharacter(character, { custom_icon_path: getCustomCharacterIconPath(userId, character.id) })
    if (!saved) return
    try {
      const url = await getCustomCharacterIconUrl(userId, character.id)
      if (url) setCharacterIcons((prev) => ({ ...prev, [character.id]: url }))
    } catch {
      // The row is saved; the icon appears on the next load.
    }
    setNotice({ type: "success", text: `${character.name} 아이콘을 변경했습니다.` })
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

  const openPresetEditor = (preset: PresetRow | null) => {
    setNotice(null)
    setEditorTarget(
      preset
        ? { id: preset.id, title: preset.title, memo: preset.memo, characterIds: preset.character_ids }
        : { id: null, title: "", memo: null, characterIds: [] },
    )
    setEditorOpen(true)
  }

  const handleSavePreset = async (draft: PresetDraft): Promise<string | null> => {
    if (!userId || !activeGameId || !selectedGame) return "로그인이 필요합니다."
    if (isOffline()) return OFFLINE_WRITE_MESSAGE
    const validationError = validatePresetInput(draft)
    if (validationError) return validationError

    const existing = editorTarget?.id ? presetsForGame.find((preset) => preset.id === editorTarget.id) : undefined
    // Non-destructive shrink (spec §7.3.1): an over-limit preset may be saved only if it does not grow.
    const allowed = Math.min(PRESET_SLOT_HARD_LIMIT, Math.max(selectedGame.maxPresetSlots, existing?.character_ids.length ?? 0))
    if (draft.characterIds.length > allowed) return `슬롯은 최대 ${selectedGame.maxPresetSlots}칸까지 사용할 수 있습니다.`

    const title = draft.title.trim()
    const memo = draft.memo.trim() === "" ? null : draft.memo
    setIsPresetBusy(true)
    try {
      const result = existing
        ? await supabase
            .from("user_character_presets")
            .update({ title, memo, character_ids: draft.characterIds })
            .eq("id", existing.id)
            .eq("user_id", userId)
        : await supabase.from("user_character_presets").insert({
            user_id: userId,
            game_id: activeGameId,
            title,
            memo,
            character_ids: draft.characterIds,
            sort_order: presetsForGame.reduce((max, preset) => Math.max(max, preset.sort_order + 1), 0),
          })
      if (result.error) return `프리셋을 저장하지 못했습니다: ${result.error.message}`
      await loadUserCharacterData()
      setNotice({ type: "success", text: "프리셋을 저장했습니다." })
      return null
    } finally {
      setIsPresetBusy(false)
    }
  }

  const handleDeletePreset = async (preset: PresetRow) => {
    if (!userId) return
    if (isOffline()) {
      setNotice({ type: "error", text: OFFLINE_WRITE_MESSAGE })
      return
    }
    if (!confirm(`'${preset.title}' 프리셋을 삭제하시겠습니까?`)) return
    setNotice(null)
    setIsPresetBusy(true)
    try {
      const { error } = await supabase.from("user_character_presets").delete().eq("id", preset.id).eq("user_id", userId)
      if (error) {
        setNotice({ type: "error", text: `프리셋을 삭제하지 못했습니다: ${error.message}` })
        return
      }
      await loadUserCharacterData()
    } finally {
      setIsPresetBusy(false)
    }
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
          triggerText="+ 캐릭터 추가·수정 요청"
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
        <div className="space-y-3 text-center">
          <EmptyState message="구독 중인 게임이 없습니다." hint="게임을 구독하면 캐릭터와 프리셋을 관리할 수 있습니다." />
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/games">게임 구독하러 가기</Link>
          </Button>
        </div>
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
                  onClick={() => setSelectedGameId(entry.gameId)}
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
                <TabsTrigger value="roster">보유 캐릭터</TabsTrigger>
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
                  isLoading={isCatalogLoading}
                  onToggleOwned={(character) => void handleToggleOwned(character)}
                  onSaveMemo={(character, memo) => void handleSaveMemo(character, memo)}
                  onChangeIcon={(character, file) => void handleChangeIcon(character, file)}
                  onRestoreIcon={(character) => void handleRestoreIcon(character)}
                />
              </TabsContent>

              <TabsContent value="presets" className="mt-4">
                <PresetList
                  presets={presetsForGame}
                  maxSlots={selectedGame.maxPresetSlots}
                  characters={characters}
                  states={characterStates}
                  customIconUrls={characterIcons}
                  isBusy={isPresetBusy}
                  onAdd={() => openPresetEditor(null)}
                  onEdit={(preset) => openPresetEditor(preset)}
                  onDelete={(preset) => void handleDeletePreset(preset)}
                />
              </TabsContent>
            </Tabs>
          )}

          {selectedGame && (
            <PresetEditorDialog
              open={editorOpen}
              onOpenChange={setEditorOpen}
              preset={editorTarget}
              gameName={selectedGame.name}
              characters={characters}
              schema={selectedGame.schema}
              maxSlots={selectedGame.maxPresetSlots}
              states={characterStates}
              customIconUrls={characterIcons}
              onSave={handleSavePreset}
            />
          )}
        </>
      )}
    </div>
  )
}
