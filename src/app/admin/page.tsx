"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase/client"
import { getKstToday } from "@/lib/dashboard-date"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { GameIcon } from "@/components/ui/game-icon"
import { ScheduleTitleBadges } from "@/components/calendar/hero-sidebar"
import { assertIconDataUrlSize, convertIconSourceToDataUrl, getClipboardImageFile } from "@/lib/image-resizer"
import { convertIconSourceToDataUrlWithUpscale, isDesktopAiUpscaleAvailable, isLowResolutionFile } from "@/lib/image-upscaler"
import { isOffline, OFFLINE_WRITE_MESSAGE } from "@/lib/offline-guard"
import { classificationIconKey, createClassificationIconDataUrl, createClassificationIconDataUrlFromSource, loadClassificationIcons } from "@/lib/classification-icons"
import { ClassificationOptionIcon } from "@/components/character/classification-option-icon"
import { DuplicatePickupNameError, registerPickupOnlyCharacter } from "@/lib/pickup-character-registration"
import { ScheduleTypeBadge } from "@/components/calendar/schedule-type-badge"
import {
  assignAxisKey,
  isCharacterTemplateActive,
  normalizeClassificationSchema,
  normalizeMaxBreakthrough,
  splitCommaList,
  validateClassificationTemplate,
  type ClassificationAxis,
  type ClassificationSchema,
} from "@/lib/character-utils"
import {
  Plus,
  Pencil,
  Trash2,
  Copy,
  Calendar,
  Filter,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  Search,
  History,
} from "lucide-react"

const SCHEDULES_PER_PAGE = 10
const GAMES_PER_PAGE = 10
const PAST_SCHEDULES_PER_PAGE = 8

function getPaginationRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, "...", total]
  }
  if (current >= total - 3) {
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total]
  }
  return [1, "...", current - 1, current, current + 1, "...", total]
}

interface GameOption {
  id: string
  name: string
  default_icon_url?: string | null
  created_at?: string | null
  max_preset_slots: number
  max_breakthrough: number
  classification_schema: ClassificationSchema
}

const DEFAULT_MAX_PRESET_SLOTS = 4
const MAX_PICKUP_CHARACTERS = 8
const DEFAULT_CHARACTER_LABEL = "캐릭터"

const CLASSIFICATION_OPTION_CHANGED_MESSAGE = "선택지가 변경되었습니다. 창을 다시 열어 주세요."

const getCharacterLabel = (schema: ClassificationSchema | undefined) => schema?.character_label || DEFAULT_CHARACTER_LABEL

type GameFormAxis = { rowId: string; key: string; label: string; options: string }

// Stable React key for axis rows so editing `key` does not remount (and blur) the input.
let axisRowSequence = 0
const nextAxisRowId = () => `axis-row-${++axisRowSequence}`

function normalizeGameRow(row: {
  id: string
  name: string
  default_icon_url?: string | null
  created_at?: string | null
  max_preset_slots?: number | null
  max_breakthrough?: number | null
  classification_schema?: unknown
}): GameOption {
  return {
    id: row.id,
    name: row.name,
    default_icon_url: row.default_icon_url ?? null,
    created_at: row.created_at ?? null,
    max_preset_slots:
      typeof row.max_preset_slots === "number" && row.max_preset_slots >= 1
        ? row.max_preset_slots
        : DEFAULT_MAX_PRESET_SLOTS,
    max_breakthrough: normalizeMaxBreakthrough(row.max_breakthrough),
    classification_schema: normalizeClassificationSchema(row.classification_schema),
  }
}

interface CharacterItem {
  id: string
  game_id: string
  name: string
  rarity: string | null
  attributes: Record<string, string>
  default_icon_url: string | null
  /** Characters registered only to show on pickup schedules (no roster/preset use); false when the column is not migrated yet. */
  is_pickup_only: boolean
}

interface ScheduleItem {
  id: string
  game_id: string
  schedule_type: "VERSION" | "PICKUP" | "CONTENTS" | "BROADCAST"
  title: string
  start_date: string
  end_date: string
  memo: string | null
  is_official?: boolean
  is_rerun?: boolean
  pickup_character_ids?: string[] | null
  games?: { id?: string; name?: string; default_icon_url?: string | null } | null
}

export default function AdminPage() {
  const { user, role, isLoading: authLoading } = useAuth()
  const [games, setGames] = useState<GameOption[]>([])
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false)
  const [isLoadingGames, setIsLoadingGames] = useState(false)
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>("")
  const [currentSchedulePage, setCurrentSchedulePage] = useState(1)
  const [adminTab, setAdminTab] = useState<"schedules" | "games" | "characters">("schedules")
  const [characters, setCharacters] = useState<CharacterItem[]>([])
  const [characterGameFilter, setCharacterGameFilter] = useState("")
  const [characterSearchQuery, setCharacterSearchQuery] = useState("")
  const [characterRarityFilter, setCharacterRarityFilter] = useState("")
  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState(false)
  const [editingCharacter, setEditingCharacter] = useState<CharacterItem | null>(null)
  const [characterFormGameId, setCharacterFormGameId] = useState("")
  const [characterFormName, setCharacterFormName] = useState("")
  const [characterFormRarity, setCharacterFormRarity] = useState("")
  const [characterFormAttributes, setCharacterFormAttributes] = useState<Record<string, string>>({})
  const [characterFormIconUrl, setCharacterFormIconUrl] = useState("")
  const [characterFormIconFile, setCharacterFormIconFile] = useState<File | null>(null)
  const [characterFormError, setCharacterFormError] = useState<string | null>(null)
  const [isSubmittingCharacter, setIsSubmittingCharacter] = useState(false)
  const [isAiUpscaleVisible, setIsAiUpscaleVisible] = useState(false)
  const [useAiUpscale, setUseAiUpscale] = useState(true)
  const [isProcessingIcon, setIsProcessingIcon] = useState(false)
  // The AI toggle is offered only after a selected/pasted image is detected below 256px (R60-REV-006).
  const [isAiUpscaleCandidate, setIsAiUpscaleCandidate] = useState(false)
  const noteIconCandidate = (file: File | null | undefined) => {
    if (!file) {
      setIsAiUpscaleCandidate(false)
      return
    }
    void isLowResolutionFile(file).then(setIsAiUpscaleCandidate)
  }

  // 게임 관리 탭 상태
  const [gamesSearchQuery, setGamesSearchQuery] = useState("")
  const [currentGamePage, setCurrentGamePage] = useState(1)
  const [isGameModalOpen, setIsGameModalOpen] = useState(false)
  const [editingGame, setEditingGame] = useState<GameOption | null>(null)
  const [gameFormName, setGameFormName] = useState("")
  const [gameFormIconUrl, setGameFormIconUrl] = useState("")
  const [gameFormIconFile, setGameFormIconFile] = useState<File | null>(null)
  const [gameFormError, setGameFormError] = useState<string | null>(null)
  const [gameFormMaxPresetSlots, setGameFormMaxPresetSlots] = useState("4")
  const [gameFormMaxBreakthrough, setGameFormMaxBreakthrough] = useState("6")
  const [gameFormRarities, setGameFormRarities] = useState("")
  const [gameFormCharacterLabel, setGameFormCharacterLabel] = useState("")
  // Game whose "create template" flow is open: after saving, the first character form opens automatically.
  const [templateFlowGameId, setTemplateFlowGameId] = useState<string | null>(null)
  const [gameFormAxes, setGameFormAxes] = useState<GameFormAxis[]>([])
  const [acknowledgedRemovalWarning, setAcknowledgedRemovalWarning] = useState<string | null>(null)
  const [gameFormWarning, setGameFormWarning] = useState<string | null>(null)
  const [deletingCharacter, setDeletingCharacter] = useState<CharacterItem | null>(null)
  const [isDeletingCharacter, setIsDeletingCharacter] = useState(false)
  // R64 classification option icons: `available` is false when the table is not migrated (feature hidden).
  const [classificationIcons, setClassificationIcons] = useState<{ gameId: string; available: boolean; icons: Map<string, string> } | null>(null)
  const [pendingIconKeys, setPendingIconKeys] = useState<string[]>([])
  const [iconError, setIconError] = useState<string | null>(null)
  // R77: registration modal of one option icon (URL / pasted image / file, all re-encoded to 64×64 WebP on register).
  const [iconDialog, setIconDialog] = useState<{ axisKey: string; axisLabel: string; option: string } | null>(null)
  const [iconDialogUrl, setIconDialogUrl] = useState("")
  const [iconDialogFile, setIconDialogFile] = useState<File | null>(null)
  const [iconDialogPreview, setIconDialogPreview] = useState<string | null>(null)
  const iconPreviewSeqRef = useRef(0)
  // Bumped to remount the file input, because a file input's displayed name cannot be cleared through React state.
  const [iconFileInputKey, setIconFileInputKey] = useState(0)

  useEffect(() => {
    setIsAiUpscaleVisible(isDesktopAiUpscaleAvailable())
  }, [])
  const [isSubmittingGame, setIsSubmittingGame] = useState(false)
  const [deletingGame, setDeletingGame] = useState<GameOption | null>(null)
  const [isDeletingGame, setIsDeletingGame] = useState(false)
  const [resavingGameIds, setResavingGameIds] = useState<string[]>([])

  const filteredSchedules = useMemo(() => {
    return schedules.filter((schedule) => {
      if (!selectedGameFilter) return true
      return schedule.game_id === selectedGameFilter
    })
  }, [schedules, selectedGameFilter])

  const totalSchedulePages = Math.max(1, Math.ceil(filteredSchedules.length / SCHEDULES_PER_PAGE))

  useEffect(() => {
    if (currentSchedulePage > totalSchedulePages) {
      setCurrentSchedulePage(totalSchedulePages)
    }
  }, [currentSchedulePage, totalSchedulePages])

  const filteredGames = useMemo(() => {
    const query = gamesSearchQuery.trim().toLowerCase()
    if (!query) return games
    return games.filter((g) => g.name.toLowerCase().includes(query))
  }, [games, gamesSearchQuery])

  const totalGamePages = Math.max(1, Math.ceil(filteredGames.length / GAMES_PER_PAGE))

  useEffect(() => {
    if (currentGamePage > totalGamePages) {
      setCurrentGamePage(totalGamePages)
    }
  }, [currentGamePage, totalGamePages])

  const paginatedGames = useMemo(() => {
    const start = (currentGamePage - 1) * GAMES_PER_PAGE
    return filteredGames.slice(start, start + GAMES_PER_PAGE)
  }, [filteredGames, currentGamePage])

  // 모달 상태 (추가 및 수정 공용)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [gameId, setGameId] = useState("")
  const [scheduleType, setScheduleType] = useState<"VERSION" | "PICKUP" | "CONTENTS" | "BROADCAST">("VERSION")
  const [isRerun, setIsRerun] = useState(false)
  const [pickupCharacterIds, setPickupCharacterIds] = useState<string[]>([])
  const [pickupSearch, setPickupSearch] = useState("")
  const [originalPickupIds, setOriginalPickupIds] = useState<string[]>([])
  // Inline "new pickup-only character" registration inside the schedule form (A1 U-04).
  const [isNewPickupOpen, setIsNewPickupOpen] = useState(false)
  const [newPickupName, setNewPickupName] = useState("")
  const [newPickupImageSource, setNewPickupImageSource] = useState("")
  const [newPickupImageFile, setNewPickupImageFile] = useState<File | null>(null)
  const [newPickupError, setNewPickupError] = useState<string | null>(null)
  const [isSavingNewPickup, setIsSavingNewPickup] = useState(false)
  const [characterKindFilter, setCharacterKindFilter] = useState<"" | "roster" | "pickup">("")
  // R66: pickup-only character dialog of the character tab (template-less games). Reuses the new-pickup form state above.
  const [isPickupOnlyDialogOpen, setIsPickupOnlyDialogOpen] = useState(false)
  const [characterFormPromote, setCharacterFormPromote] = useState(false)
  const [isTitleAutoFilled, setIsTitleAutoFilled] = useState(false)
  const [originalIsRerun, setOriginalIsRerun] = useState<boolean | null>(null)
  const [isOfficial, setIsOfficial] = useState(true)
  const [isSingleDate, setIsSingleDate] = useState(false)
  const [title, setTitle] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [memo, setMemo] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // 삭제 확인 모달
  const [deletingSchedule, setDeletingSchedule] = useState<ScheduleItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // 지난 일정 모달 상태
  const [isPastModalOpen, setIsPastModalOpen] = useState(false)
  const [pastSchedules, setPastSchedules] = useState<ScheduleItem[]>([])
  const [isLoadingPastSchedules, setIsLoadingPastSchedules] = useState(false)
  const [pastGameFilter, setPastGameFilter] = useState<string>("")
  const [pastSearchQuery, setPastSearchQuery] = useState("")
  const [currentPastPage, setCurrentPastPage] = useState(1)
  const [returnToPastModal, setReturnToPastModal] = useState(false)

  // 전역 알림 메시지
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null)

  const filteredPastSchedules = useMemo(() => {
    return pastSchedules.filter((schedule) => {
      if (pastGameFilter && schedule.game_id !== pastGameFilter) return false
      if (pastSearchQuery.trim()) {
        const query = pastSearchQuery.trim().toLowerCase()
        const titleMatch = schedule.title.toLowerCase().includes(query)
        const memoMatch = schedule.memo?.toLowerCase().includes(query) ?? false
        if (!titleMatch && !memoMatch) return false
      }
      return true
    })
  }, [pastSchedules, pastGameFilter, pastSearchQuery])

  const totalPastPages = Math.max(1, Math.ceil(filteredPastSchedules.length / PAST_SCHEDULES_PER_PAGE))

  useEffect(() => {
    if (currentPastPage > totalPastPages) {
      setCurrentPastPage(totalPastPages)
    }
  }, [currentPastPage, totalPastPages])

  const paginatedPastSchedules = useMemo(() => {
    const start = (currentPastPage - 1) * PAST_SCHEDULES_PER_PAGE
    return filteredPastSchedules.slice(start, start + PAST_SCHEDULES_PER_PAGE)
  }, [filteredPastSchedules, currentPastPage])

  const fetchGames = useCallback(async () => {
    setIsLoadingGames(true)
    const { data, error } = await supabase
      .from("games")
      .select("id, name, default_icon_url, created_at, max_preset_slots, max_breakthrough, classification_schema")
      .order("name")
    if (error) {
      setMessage({ type: "error", text: "게임 목록을 불러오지 못했습니다: " + error.message })
    } else if (data) {
      setGames(data.map(normalizeGameRow))
    }
    setIsLoadingGames(false)
  }, [])

  const fetchCharacters = useCallback(async () => {
    const columns = "id, game_id, name, rarity, attributes, default_icon_url"
    let result = await supabase.from("game_characters").select(`${columns}, is_pickup_only`).order("name")
    // Not migrated yet (D-08): every character is a regular roster character.
    if (result.error && (result.error.code === "42703" || result.error.code === "PGRST204")) {
      result = (await supabase.from("game_characters").select(columns).order("name")) as typeof result
    }
    const { data, error } = result
    if (error) {
      setMessage({ type: "error", text: "캐릭터 목록을 불러오지 못했습니다: " + error.message })
    } else {
      setCharacters((data ?? []).map((item) => ({
        ...item,
        is_pickup_only: (item as { is_pickup_only?: boolean }).is_pickup_only === true,
        attributes: (item.attributes && typeof item.attributes === "object" && !Array.isArray(item.attributes))
          ? item.attributes as Record<string, string>
          : {},
      })))
    }
  }, [])

  const fetchSchedules = useCallback(async () => {
    setIsLoadingSchedules(true)
    const today = getKstToday()
    const { data, error } = await supabase
      .from("game_schedules")
      .select("*, games(id, name)")
      .gte("end_date", today)
      .order("start_date", { ascending: true })

    if (error) {
      setMessage({ type: "error", text: "일정 목록을 불러오지 못했습니다: " + error.message })
    } else if (data) {
      const activeSchedules = (data as unknown as ScheduleItem[])
        .filter((s) => s.end_date >= today)
        .sort((a, b) => {
          if (a.start_date !== b.start_date) return a.start_date.localeCompare(b.start_date)
          return a.end_date.localeCompare(b.end_date)
        })
      setSchedules(activeSchedules)
    }
    setIsLoadingSchedules(false)
  }, [])

  const fetchPastSchedules = useCallback(async () => {
    setIsLoadingPastSchedules(true)
    const today = getKstToday()
    const { data, error } = await supabase
      .from("game_schedules")
      .select("*, games(id, name, default_icon_url)")
      .lt("end_date", today)
      .order("end_date", { ascending: false })

    if (error) {
      setMessage({ type: "error", text: "지난 일정 목록을 불러오지 못했습니다: " + error.message })
    } else if (data) {
      setPastSchedules(data as unknown as ScheduleItem[])
    }
    setIsLoadingPastSchedules(false)
  }, [])

  useEffect(() => {
    if (role === "admin") {
      void fetchGames()
      void fetchCharacters()
      void fetchSchedules()
    }
  }, [fetchCharacters, fetchGames, fetchSchedules, role])

  // R64: classification option icons of one game at a time: the open template editor's game, otherwise the character tab's game.
  // Hoisted above the early returns because the effect below must run unconditionally.
  const activeCharacterGameId = games.some((game) => game.id === characterGameFilter) ? characterGameFilter : (games[0]?.id ?? "")
  const iconTargetGameId = templateFlowGameId !== null && editingGame?.id === templateFlowGameId ? editingGame.id : activeCharacterGameId

  const refreshClassificationIcons = useCallback(async (targetGameId: string) => {
    const set = await loadClassificationIcons(targetGameId)
    setClassificationIcons({ gameId: targetGameId, ...set })
  }, [])

  useEffect(() => {
    if (role !== "admin" || !iconTargetGameId) return
    let cancelled = false
    void loadClassificationIcons(iconTargetGameId).then((set) => {
      if (!cancelled) setClassificationIcons({ gameId: iconTargetGameId, ...set })
    })
    return () => {
      cancelled = true
    }
  }, [role, iconTargetGameId])

  if (authLoading) return <div className="p-6">불러오는 중...</div>
  if (!user || role !== "admin") {
    return <div role="alert" className="p-6 text-danger">접근 권한이 없습니다. 관리자만 이용 가능합니다.</div>
  }

  const handleOpenPastSchedules = () => {
    setIsPastModalOpen(true)
    setCurrentPastPage(1)
    void fetchPastSchedules()
  }

  const resetPickupState = (ids: string[] = []) => {
    setPickupCharacterIds(ids)
    setPickupSearch("")
    setIsTitleAutoFilled(false)
    setIsNewPickupOpen(false)
    setNewPickupName("")
    setNewPickupImageSource("")
    setNewPickupImageFile(null)
    setNewPickupError(null)
  }

  const openAddModal = () => {
    setEditingScheduleId(null)
    setIsDuplicating(false)
    setOriginalIsRerun(null)
    setOriginalPickupIds([])
    resetPickupState()
    setGameId(selectedGameFilter || "")
    setScheduleType("VERSION")
    setIsRerun(false)
    setIsOfficial(true)
    setIsSingleDate(false)
    setTitle("")
    setStartDate("")
    setEndDate("")
    setMemo("")
    setFormError(null)
    setIsModalOpen(true)
  }

  // 기존 일정 값을 그대로 채운 상태로 '새 일정' 모달을 연다 (저장 시 insert)
  const openDuplicateModal = (schedule: ScheduleItem) => {
    setEditingScheduleId(null)
    setIsDuplicating(true)
    setOriginalIsRerun(null)
    setOriginalPickupIds([])
    resetPickupState(schedule.pickup_character_ids ?? [])
    setGameId(schedule.game_id)
    setScheduleType(schedule.schedule_type)
    setIsRerun(schedule.is_rerun === true)
    setIsOfficial(schedule.is_official ?? true)
    setIsSingleDate(schedule.start_date === schedule.end_date)
    setTitle(schedule.title)
    setStartDate(schedule.start_date)
    setEndDate(schedule.end_date)
    setMemo(schedule.memo || "")
    setFormError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (schedule: ScheduleItem) => {
    setEditingScheduleId(schedule.id)
    setIsDuplicating(false)
    setOriginalIsRerun(schedule.is_rerun === true)
    setOriginalPickupIds(schedule.pickup_character_ids ?? [])
    resetPickupState(schedule.pickup_character_ids ?? [])
    setGameId(schedule.game_id)
    setScheduleType(schedule.schedule_type)
    setIsRerun(schedule.is_rerun === true)
    setIsOfficial(schedule.is_official ?? true)
    setIsSingleDate(schedule.start_date === schedule.end_date)
    setTitle(schedule.title)
    setStartDate(schedule.start_date)
    setEndDate(schedule.end_date)
    setMemo(schedule.memo || "")
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleEditFromPast = (schedule: ScheduleItem) => {
    setReturnToPastModal(true)
    setIsPastModalOpen(false)
    openEditModal(schedule)
  }

  const handleDeleteFromPast = (schedule: ScheduleItem) => {
    setReturnToPastModal(true)
    setIsPastModalOpen(false)
    setDeletingSchedule(schedule)
  }

  const handleCloseScheduleModal = () => {
    setIsModalOpen(false)
    if (returnToPastModal) {
      setIsPastModalOpen(true)
      setReturnToPastModal(false)
    }
  }

  const handleCancelDelete = () => {
    setDeletingSchedule(null)
    if (returnToPastModal) {
      setIsPastModalOpen(true)
      setReturnToPastModal(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const finalEndDate = isSingleDate ? startDate : endDate
    if (!gameId || !title.trim() || !startDate || !finalEndDate) {
      setFormError("필수 항목(게임, 타이틀, 날짜)을 모두 입력해주세요.")
      return
    }

    if (startDate > finalEndDate) {
      setFormError("종료일은 시작일보다 이전일 수 없습니다.")
      return
    }

    setIsSubmitting(true)
    setFormError(null)

    // Pickup characters are catalog ids only (A1 D-03); write them when present and clear only what the original had (NR-11).
    const nextPickupIds = scheduleType === "PICKUP" ? pickupCharacterIds : []
    const pickupPayload: { pickup_character_ids?: string[] } =
      nextPickupIds.length > 0
        ? { pickup_character_ids: nextPickupIds }
        : editingScheduleId && originalPickupIds.length > 0
          ? { pickup_character_ids: [] as string[] }
          : {}
    const schedulePayload = {
      game_id: gameId,
      schedule_type: scheduleType,
      is_official: isOfficial,
      title: title.trim(),
      start_date: startDate,
      end_date: finalEndDate,
      memo: memo.trim() || null,
      ...(isRerun ? { is_rerun: true } : editingScheduleId && originalIsRerun ? { is_rerun: false } : {}),
      ...pickupPayload,
    }

    const describeWriteError = (error: { code?: string; message?: string }, fallback: string) => {
      const migrationError = error.code === "42703" || error.code === "PGRST204" || error.code === "23514"
      if (Object.keys(pickupPayload).length > 0 && (migrationError || (error.message ?? "").includes("픽업 캐릭터"))) {
        return "R52 마이그레이션이 적용되지 않았거나 픽업 캐릭터 조건(같은 게임의 캐릭터·최대 8명·픽업 일정 전용)을 위반했습니다. 관리자에게 DB 마이그레이션 적용을 요청해 주세요."
      }
      return migrationError
        ? "R33 마이그레이션이 적용되지 않았거나 복각 조건이 올바르지 않습니다. 관리자에게 DB 마이그레이션 적용을 요청해 주세요."
        : fallback + error.message
    }

    if (editingScheduleId) {
      // 기존 일정 수정
      const { error } = await supabase
        .from("game_schedules")
        .update({
          ...schedulePayload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingScheduleId)

      setIsSubmitting(false)

      if (error) {
        setFormError(describeWriteError(error, "일정 수정에 실패했습니다: "))
      } else {
        setMessage({ type: "success", text: "일정이 성공적으로 수정되었습니다." })
        setIsModalOpen(false)
        void fetchSchedules()
        void fetchPastSchedules()
        if (returnToPastModal) {
          setIsPastModalOpen(true)
          setReturnToPastModal(false)
        }
      }
    } else {
      // 새 일정 등록
      const { error } = await supabase.from("game_schedules").insert(schedulePayload)

      setIsSubmitting(false)

      if (error) {
        setFormError(describeWriteError(error, "일정 추가에 실패했습니다: "))
      } else {
        setMessage({ type: "success", text: "일정이 성공적으로 추가되었습니다." })
        setIsModalOpen(false)
        void fetchSchedules()
        void fetchPastSchedules()
        if (returnToPastModal) {
          setIsPastModalOpen(true)
          setReturnToPastModal(false)
        }
      }
    }
  }

  const handleDelete = async () => {
    if (!deletingSchedule) return
    setIsDeleting(true)

    const { error } = await supabase
      .from("game_schedules")
      .delete()
      .eq("id", deletingSchedule.id)

    setIsDeleting(false)

    if (error) {
      setMessage({ type: "error", text: "일정 삭제에 실패했습니다: " + error.message })
    } else {
      setMessage({ type: "success", text: "일정이 삭제되었습니다." })
      setDeletingSchedule(null)
      void fetchSchedules()
      void fetchPastSchedules()
      if (returnToPastModal) {
        setIsPastModalOpen(true)
        setReturnToPastModal(false)
      }
    }
  }

  const handleOpenAddGame = () => {
    setEditingGame(null)
    setGameFormName("")
    setGameFormIconUrl("")
    setGameFormIconFile(null)
    setGameFormError(null)
    setGameFormMaxPresetSlots("4")
    setGameFormMaxBreakthrough("6")
    setGameFormRarities("")
    setGameFormCharacterLabel("")
    setGameFormAxes([])
    setGameFormWarning(null)
    setAcknowledgedRemovalWarning(null)
    setIsGameModalOpen(true)
  }

  const handleOpenEditGame = (game: GameOption) => {
    setEditingGame(game)
    setGameFormName(game.name)
    setGameFormIconUrl(game.default_icon_url || "")
    setGameFormIconFile(null)
    setGameFormError(null)
    const schema = game.classification_schema ?? { rarities: [], axes: [] }
    setGameFormCharacterLabel(schema.character_label && schema.character_label !== DEFAULT_CHARACTER_LABEL ? schema.character_label : "")
    setGameFormMaxPresetSlots(String(game.max_preset_slots ?? 4))
    setGameFormMaxBreakthrough(String(game.max_breakthrough ?? 6))
    setGameFormRarities(schema.rarities.join(", "))
    setGameFormAxes(schema.axes.map((axis) => ({
      rowId: nextAxisRowId(),
      key: axis.key,
      label: axis.label,
      options: axis.options.join(", "),
    })))
    setGameFormWarning(null)
    setAcknowledgedRemovalWarning(null)
    setIconError(null)
    setIsGameModalOpen(true)
  }

  const getGameSchema = (gameId: string): ClassificationSchema =>
    games.find((game) => game.id === gameId)?.classification_schema ?? { rarities: [], axes: [] }

  // "Create template" / "edit template" both reuse the game form, which holds label, ranks, classes, slots and breakthrough.
  const handleOpenTemplate = (game: GameOption) => {
    handleOpenEditGame(game)
    setTemplateFlowGameId(game.id)
  }

  // R64: each option icon is saved immediately (upload = upsert, remove = delete); one write per option at a time.
  const runIconWrite = async (axisKey: string, option: string, failureText: string, write: (gameId: string) => Promise<string | null>) => {
    if (!editingGame) return false
    const targetGameId = editingGame.id
    const key = classificationIconKey(axisKey, option)
    if (pendingIconKeys.includes(key)) return false
    if (isOffline()) {
      setIconError(OFFLINE_WRITE_MESSAGE)
      return false
    }
    setIconError(null)
    setPendingIconKeys((prev) => [...prev, key])
    try {
      const errorText = await write(targetGameId)
      if (errorText) setIconError(errorText)
      return !errorText
    } catch (error: unknown) {
      setIconError(error instanceof Error ? error.message : failureText)
      return false
    } finally {
      setPendingIconKeys((prev) => prev.filter((item) => item !== key))
    }
  }

  // R80: show why an icon write failed (RLS denial, code and message) instead of a bare generic sentence.
  const iconWriteErrorText = (failureText: string, error: { code?: string; message: string }) =>
    error.code === "42501"
      ? `${failureText} 관리자 권한이 확인되지 않았습니다. (42501)`
      : `${failureText} (${error.code ?? "오류"}: ${error.message})`

  const patchClassificationIcon = (targetGameId: string, axisKey: string, option: string, dataUrl: string | null) => {
    setClassificationIcons((prev) => {
      if (!prev || prev.gameId !== targetGameId) return prev
      const icons = new Map(prev.icons)
      if (dataUrl) icons.set(classificationIconKey(axisKey, option), dataUrl)
      else icons.delete(classificationIconKey(axisKey, option))
      return { ...prev, icons }
    })
  }

  const handleUploadClassificationIcon = (axisKey: string, option: string, source: File | string) => {
    return runIconWrite(axisKey, option, "분류 아이콘을 저장하지 못했습니다.", async (targetGameId) => {
      const dataUrl = await createClassificationIconDataUrlFromSource(source)
      const { error } = await supabase
        .from("game_classification_icons")
        .upsert(
          { game_id: targetGameId, axis_key: axisKey, option_value: option, icon_data_url: dataUrl },
          { onConflict: "game_id,axis_key,option_value" },
        )
      if (error) return error.code === "23514" ? CLASSIFICATION_OPTION_CHANGED_MESSAGE : iconWriteErrorText("분류 아이콘을 저장하지 못했습니다.", error)
      patchClassificationIcon(targetGameId, axisKey, option, dataUrl)
      setMessage({ type: "success", text: `'${option}' 분류 아이콘을 저장했습니다.` })
      return null
    })
  }

  const openIconDialog = (axisKey: string, axisLabel: string, option: string) => {
    iconPreviewSeqRef.current += 1
    setIconError(null)
    setIconDialogUrl("")
    setIconDialogFile(null)
    setIconDialogPreview(null)
    setIconFileInputKey((key) => key + 1)
    setIconDialog({ axisKey, axisLabel, option })
  }

  const closeIconDialog = () => {
    iconPreviewSeqRef.current += 1
    setIconDialog(null)
  }

  // Previews the picked/pasted file as the final 64×64 icon; a stale preview from an older pick is dropped.
  const setIconDialogSelectedFile = (file: File | null) => {
    const seq = ++iconPreviewSeqRef.current
    setIconError(null)
    setIconDialogFile(file)
    setIconDialogPreview(null)
    if (!file) return
    createClassificationIconDataUrl(file)
      .then((dataUrl) => { if (seq === iconPreviewSeqRef.current) setIconDialogPreview(dataUrl) })
      .catch((error: unknown) => {
        if (seq !== iconPreviewSeqRef.current) return
        setIconDialogFile(null)
        setIconError(error instanceof Error ? error.message : "이미지를 변환하지 못했습니다.")
      })
  }

  const handleIconDialogPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const file = getClipboardImageFile(event.clipboardData)
    if (!file) return
    event.preventDefault()
    setIconDialogUrl("")
    setIconDialogSelectedFile(file)
    setIconFileInputKey((key) => key + 1)
  }

  const handleSubmitIconDialog = async () => {
    if (!iconDialog) return
    const source = iconDialogFile ?? iconDialogUrl.trim()
    if (!source) {
      setIconError("이미지 URL을 입력하거나 이미지를 붙여넣거나 파일을 선택해 주세요.")
      return
    }
    const saved = await handleUploadClassificationIcon(iconDialog.axisKey, iconDialog.option, source)
    if (saved) closeIconDialog()
  }

  const handleDeleteClassificationIcon = (axisKey: string, option: string) =>
    runIconWrite(axisKey, option, "분류 아이콘을 삭제하지 못했습니다.", async (targetGameId) => {
      const { error } = await supabase
        .from("game_classification_icons")
        .delete()
        .eq("game_id", targetGameId)
        .eq("axis_key", axisKey)
        .eq("option_value", option)
      if (error) return iconWriteErrorText("분류 아이콘을 삭제하지 못했습니다.", error)
      patchClassificationIcon(targetGameId, axisKey, option, null)
      setMessage({ type: "success", text: `'${option}' 분류 아이콘을 삭제했습니다.` })
      return null
    })

  const handleOpenAddCharacter = (targetGameId?: string) => {
    const firstGame = games[0]
    setEditingCharacter(null)
    setCharacterFormGameId(targetGameId ?? firstGame?.id ?? "")
    setCharacterFormName("")
    setCharacterFormRarity("")
    setCharacterFormAttributes({})
    setCharacterFormIconUrl("")
    setCharacterFormIconFile(null)
    setCharacterFormPromote(false)
    setCharacterFormError(null)
    setIsCharacterModalOpen(true)
  }

  const handleOpenEditCharacter = (character: CharacterItem) => {
    setEditingCharacter(character)
    setCharacterFormGameId(character.game_id)
    setCharacterFormName(character.name)
    setCharacterFormRarity(character.rarity ?? "")
    setCharacterFormAttributes(character.attributes)
    setCharacterFormIconUrl(character.default_icon_url ?? "")
    setCharacterFormIconFile(null)
    setCharacterFormPromote(false)
    setCharacterFormError(null)
    setIsCharacterModalOpen(true)
  }

  const handleCharacterIconPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const file = getClipboardImageFile(event.clipboardData)
    if (!file) return
    event.preventDefault()
    setCharacterFormIconFile(null)
    setCharacterFormIconUrl("")
    noteIconCandidate(file)
    setIsProcessingIcon(true)
    void convertIconSourceToDataUrlWithUpscale(file, useAiUpscale)
      .then(setCharacterFormIconUrl)
      .catch((error: unknown) => setCharacterFormError(error instanceof Error ? error.message : "아이콘 이미지를 변환하지 못했습니다."))
      .finally(() => setIsProcessingIcon(false))
  }

  const handleSaveCharacter = async (event: React.FormEvent) => {
    event.preventDefault()
    if (isProcessingIcon) return
    const name = characterFormName.trim()
    if (!characterFormGameId || !name || name.length > 100) {
      setCharacterFormError("대상 게임과 캐릭터 이름(1~100자)을 입력해 주세요.")
      return
    }
    // Editing a pickup-only character without promoting it changes only name and image (A1 U-05).
    const pickupOnlyEdit = editingCharacter?.is_pickup_only === true && !characterFormPromote
    const hasIconSource = !!characterFormIconFile || !!characterFormIconUrl.trim()
    if (!pickupOnlyEdit && !hasIconSource) {
      setCharacterFormError("캐릭터 기본 아이콘 파일을 업로드하거나 URL을 입력해 주세요.")
      return
    }
    if (isOffline()) {
      setCharacterFormError(OFFLINE_WRITE_MESSAGE)
      return
    }
    const schema = getGameSchema(characterFormGameId)
    const characterLabel = getCharacterLabel(schema)
    if (!pickupOnlyEdit) {
      if (characterFormRarity && !schema.rarities.includes(characterFormRarity)) {
        setCharacterFormError("선택한 등급이 해당 게임 설정에 없습니다.")
        return
      }
      // Ranks are required only once the game has a rank list (NR-09); legacy games without ranks stay editable.
      if (schema.rarities.length >= 1 && !characterFormRarity) {
        setCharacterFormError(`${characterLabel} 등급을 선택해 주세요.`)
        return
      }
      const missingAxis = schema.axes.find((axis) => !characterFormAttributes[axis.key]?.trim())
      if (missingAxis) {
        setCharacterFormError(`${missingAxis.label}을(를) 선택해 주세요.`)
        return
      }
    }
    const attributes = Object.fromEntries(
      Object.entries(characterFormAttributes).filter(([, value]) => value.trim()),
    )
    setIsSubmittingCharacter(true)
    setCharacterFormError(null)
    setIsProcessingIcon(true)
    try {
      // An oversized pasted WebP skips the resize, so check the size here for a clear message (R52-REV-004).
      const iconUrl = hasIconSource
        ? assertIconDataUrlSize(await convertIconSourceToDataUrlWithUpscale(characterFormIconFile ?? characterFormIconUrl.trim(), useAiUpscale))
        : null
      const payload = pickupOnlyEdit
        ? { game_id: characterFormGameId, name, ...(iconUrl ? { default_icon_url: iconUrl } : {}) }
        : {
            game_id: characterFormGameId,
            name,
            rarity: characterFormRarity || null,
            attributes,
            default_icon_url: iconUrl as string,
            ...(editingCharacter?.is_pickup_only ? { is_pickup_only: false } : {}),
          }
      const result = editingCharacter
        ? await supabase.from("game_characters").update(payload).eq("id", editingCharacter.id)
        : await supabase.from("game_characters").insert(payload)
      if (result.error) throw result.error
      setIsCharacterModalOpen(false)
      setMessage({
        type: "success",
        text: editingCharacter?.is_pickup_only && characterFormPromote
          ? `픽업 전용 '${name}'을(를) 정식 ${characterLabel}(으)로 승격했습니다.`
          : `${characterLabel} '${name}'을(를) 저장했습니다.`,
      })
      await fetchCharacters()
    } catch (error: unknown) {
      setCharacterFormError(error instanceof Error ? error.message : "캐릭터 저장에 실패했습니다.")
    } finally {
      setIsSubmittingCharacter(false)
      setIsProcessingIcon(false)
    }
  }

  const handleGameIconPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const file = getClipboardImageFile(event.clipboardData)
    if (!file) return

    event.preventDefault()
    setGameFormIconFile(null)
    setGameFormIconUrl("")
    setGameFormError(null)
    noteIconCandidate(file)
    setIsProcessingIcon(true)
    void convertIconSourceToDataUrlWithUpscale(file, useAiUpscale)
      .then(setGameFormIconUrl)
      .catch((error: unknown) => {
        setGameFormError(error instanceof Error ? error.message : "아이콘 이미지를 변환하지 못했습니다.")
      })
      .finally(() => setIsProcessingIcon(false))
  }

  // Lists removed rarities/axis options that existing catalog characters still use (spec §7.3.4).
  const describeRemovedOptionUsage = (game: GameOption, nextRarities: string[], nextAxes: ClassificationAxis[]) => {
    const usage: string[] = []
    const gameCharacters = characters.filter((character) => character.game_id === game.id)
    game.classification_schema.rarities.forEach((rarity) => {
      if (nextRarities.includes(rarity)) return
      const count = gameCharacters.filter((character) => character.rarity === rarity).length
      if (count > 0) usage.push(`레어도 '${rarity}' ${count}명`)
    })
    game.classification_schema.axes.forEach((axis) => {
      const nextAxis = nextAxes.find((item) => item.key === axis.key)
      axis.options.forEach((option) => {
        if (nextAxis?.options.includes(option)) return
        const count = gameCharacters.filter((character) => character.attributes[axis.key] === option).length
        if (count > 0) usage.push(`${axis.label} '${option}' ${count}명`)
      })
    })
    return usage
  }

  const handleDeleteCharacter = async () => {
    if (!deletingCharacter) return
    if (isOffline()) {
      setMessage({ type: "error", text: OFFLINE_WRITE_MESSAGE })
      setDeletingCharacter(null)
      return
    }
    setIsDeletingCharacter(true)
    const { error } = await supabase.from("game_characters").delete().eq("id", deletingCharacter.id)
    setIsDeletingCharacter(false)
    if (error) {
      setMessage({ type: "error", text: "캐릭터 삭제에 실패했습니다: " + error.message })
    } else {
      setMessage({ type: "success", text: `캐릭터 '${deletingCharacter.name}'을(를) 삭제했습니다.` })
      await fetchCharacters()
    }
    setDeletingCharacter(null)
  }

  // games_classification_schema_check (23514): show a template-specific hint instead of the raw database message.
  const describeGameSaveError = (error: { code?: string; message?: string }, fallback: string) => {
    const message = error.message ?? ""
    const isTemplateCheck =
      message.includes("games_classification_schema_check") || (error.code === "23514" && !message.includes("constraint"))
    return isTemplateCheck
      ? "캐릭터 템플릿 형식이 올바르지 않습니다(등급·분류 기준 개수와 길이를 확인해 주세요)."
      : fallback + message
  }

  const handleSaveGame = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isProcessingIcon) return
    const trimmedName = gameFormName.trim()
    const trimmedIconUrl = gameFormIconUrl.trim()

    if (!trimmedName) {
      setGameFormError("게임 이름을 입력해주세요.")
      return
    }
    const maxPresetSlots = Number(gameFormMaxPresetSlots)
    if (!Number.isInteger(maxPresetSlots) || maxPresetSlots < 1 || maxPresetSlots > 12) {
      setGameFormError("프리셋 슬롯 수는 1~12 사이의 정수여야 합니다.")
      return
    }
    const maxBreakthrough = Number(gameFormMaxBreakthrough)
    if (gameFormMaxBreakthrough.trim() === "" || !Number.isInteger(maxBreakthrough) || maxBreakthrough < 0 || maxBreakthrough > 12) {
      setGameFormError("최대 돌파 단계는 0~12 사이의 정수여야 합니다.")
      return
    }
    const characterLabel = gameFormCharacterLabel.trim()
    const rarities = splitCommaList(gameFormRarities)
    // Axis keys are managed automatically (kept for existing axes, class1/class2 for new ones); the user never types them.
    const axes: ClassificationAxis[] = gameFormAxes.map((axis) => ({
      key: axis.key,
      label: axis.label.trim(),
      options: splitCommaList(axis.options),
    }))
    // Same limits as the DB is_valid_classification_schema; the template flow additionally needs at least one rank.
    const templateError = validateClassificationTemplate(
      { characterLabel, rarities, axes },
      { requireRarities: templateFlowGameId !== null && editingGame?.id === templateFlowGameId },
    )
    if (templateError) {
      setGameFormError(templateError)
      return
    }
    const classificationSchema = { ...(characterLabel ? { character_label: characterLabel } : {}), rarities, axes }
    if (editingGame) {
      const removedUsage = describeRemovedOptionUsage(editingGame, rarities, axes)
      if (removedUsage.length > 0) {
        const warning = `제거되는 분류 값을 사용 중인 캐릭터가 있음: ${removedUsage.join(", ")}. 해당 캐릭터의 값은 그대로 남으며 로스터에서 '기타'로 표시됨. 계속하려면 [수정 저장]을 다시 누름.`
        if (acknowledgedRemovalWarning !== warning) {
          setGameFormError(null)
          setGameFormWarning(warning)
          setAcknowledgedRemovalWarning(warning)
          return
        }
      }
    }
    setGameFormWarning(null)
    // The template flow edits only template columns of an existing game; its name and icon are left untouched
    // (seed games keep relative /assets/... icons that the URL check below would reject).
    const isTemplateSave = !!editingGame && templateFlowGameId === editingGame.id
    if (!isTemplateSave && !trimmedIconUrl && !gameFormIconFile) {
      setGameFormError("게임 기본 아이콘 파일을 업로드하거나 URL을 입력해주세요.")
      return
    }
    if (!isTemplateSave && !gameFormIconFile && !trimmedIconUrl.startsWith("data:image/webp;base64,")) {
      try {
        const parsed = new URL(trimmedIconUrl)
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          setGameFormError("아이콘 URL은 http 또는 https 형식이어야 합니다.")
          return
        }
      } catch {
        setGameFormError("아이콘 URL이 올바른 주소 형식이 아닙니다.")
        return
      }
    }

    setIsSubmittingGame(true)
    setGameFormError(null)
    setIsProcessingIcon(true)
    let defaultIconUrl = ""
    if (!isTemplateSave) {
      try {
        defaultIconUrl = await convertIconSourceToDataUrl(gameFormIconFile ?? trimmedIconUrl)
      } catch (error: unknown) {
        setIsSubmittingGame(false)
        setIsProcessingIcon(false)
        setGameFormError(error instanceof Error ? error.message : "아이콘 이미지를 변환하지 못했습니다.")
        return
      }
    }

    if (editingGame) {
      // 게임 수정 (템플릿 흐름은 템플릿 컬럼만 갱신)
      const templateColumns = {
        max_preset_slots: maxPresetSlots,
        max_breakthrough: maxBreakthrough,
        classification_schema: classificationSchema,
      }
      const { error } = await supabase
        .from("games")
        .update(isTemplateSave ? templateColumns : { name: trimmedName, default_icon_url: defaultIconUrl, ...templateColumns })
        .eq("id", editingGame.id)

      setIsSubmittingGame(false)
      setIsProcessingIcon(false)

      if (error) {
        setGameFormError(describeGameSaveError(error, isTemplateSave ? "캐릭터 템플릿 저장에 실패했습니다: " : "게임 수정에 실패했습니다: "))
      } else {
        setMessage({
          type: "success",
          text: isTemplateSave ? `'${editingGame.name}' 캐릭터 템플릿이 저장되었습니다.` : `'${trimmedName}' 게임 정보가 수정되었습니다.`,
        })
        setIsGameModalOpen(false)
        const continueWithFirstCharacter = templateFlowGameId === editingGame.id && rarities.length >= 1
        // The cleanup trigger may have deleted icons of removed/renamed options: reload this game's icons.
        if (isTemplateSave) void refreshClassificationIcons(editingGame.id)
        setTemplateFlowGameId(null)
        if (continueWithFirstCharacter) {
          // Reflect the new template locally so the first character form already uses it.
          setGames((prev) => prev.map((game) => (game.id === editingGame.id
            ? { ...game, max_preset_slots: maxPresetSlots, max_breakthrough: maxBreakthrough, classification_schema: normalizeClassificationSchema(classificationSchema) }
            : game)))
          handleOpenAddCharacter(editingGame.id)
        }
        void fetchGames()
      }
    } else {
      // 새 게임 등록
      const { error } = await supabase.from("games").insert({
        name: trimmedName,
        default_icon_url: defaultIconUrl,
        max_preset_slots: maxPresetSlots,
        max_breakthrough: maxBreakthrough,
        classification_schema: classificationSchema,
        status: "APPROVED",
        created_by: user?.id ?? null,
      })

      setIsSubmittingGame(false)

      if (error) {
        if (
          error.code === "23505" ||
          error.message?.includes("unique") ||
          error.message?.includes("games_name_key")
        ) {
          setGameFormError("이미 등록된 게임 이름입니다.")
        } else {
          setGameFormError(describeGameSaveError(error, "게임 등록에 실패했습니다: "))
        }
      } else {
        setMessage({ type: "success", text: `'${trimmedName}' 게임이 성공적으로 등록되었습니다.` })
        setIsGameModalOpen(false)
        void fetchGames()
      }
    }
  }

  const isExternalIconGame = (game: GameOption) =>
    !!game.default_icon_url && /^https?:\/\//i.test(game.default_icon_url)

  // 외부 URL 아이콘을 256x256 WebP Data URL로 변환해 재저장하고 로컬 목록에 즉시 반영
  const resaveGameIcons = async (targets: GameOption[]) => {
    if (isOffline()) {
      setMessage({ type: "error", text: OFFLINE_WRITE_MESSAGE })
      return
    }
    if (targets.length === 0) return
    setResavingGameIds((prev) => [...prev, ...targets.map((g) => g.id)])
    let successCount = 0
    const failedNames: string[] = []
    for (const game of targets) {
      try {
        const dataUrl = await convertIconSourceToDataUrl(game.default_icon_url as string)
        const { error } = await supabase.from("games").update({ default_icon_url: dataUrl }).eq("id", game.id)
        if (error) throw error
        successCount += 1
        setGames((prev) => prev.map((g) => (g.id === game.id ? { ...g, default_icon_url: dataUrl } : g)))
      } catch {
        failedNames.push(game.name)
      }
      setResavingGameIds((prev) => prev.filter((id) => id !== game.id))
    }
    if (failedNames.length === 0) {
      setMessage({ type: "success", text: `${successCount}개 게임 아이콘을 Data URL로 재저장했습니다.` })
    } else {
      setMessage({
        type: "error",
        text: `아이콘 재저장 실패: ${failedNames.join(", ")} (성공 ${successCount}개). 파일 업로드나 이미지 붙여넣기로 수정해 주세요.`,
      })
    }
  }

  const handleDeleteGame = async () => {
    if (!deletingGame) return
    setIsDeletingGame(true)

    const { error } = await supabase
      .from("games")
      .delete()
      .eq("id", deletingGame.id)

    setIsDeletingGame(false)

    if (error) {
      setMessage({ type: "error", text: "게임 삭제에 실패했습니다: " + error.message })
    } else {
      setMessage({ type: "success", text: `'${deletingGame.name}' 게임이 삭제되었습니다.` })
      setDeletingGame(null)
      void fetchGames()
      void fetchSchedules()
      void fetchPastSchedules()
    }
  }

  const externalIconGames = games.filter(isExternalIconGame)
  // R65: the character tab always shows one game (no 모든 게임). Fall back to the first game while the list is still
  // loading or when the selected game was deleted; the rarity filter only offers the selected game's own ranks.
  const activeRarityFilter = getGameSchema(activeCharacterGameId).rarities.includes(characterRarityFilter) ? characterRarityFilter : ""
  const filteredCharacters = characters.filter((character) => {
    if (character.game_id !== activeCharacterGameId) return false
    if (activeRarityFilter && character.rarity !== activeRarityFilter) return false
    if (characterKindFilter === "roster" && character.is_pickup_only) return false
    if (characterKindFilter === "pickup" && !character.is_pickup_only) return false
    return !characterSearchQuery.trim() || character.name.toLowerCase().includes(characterSearchQuery.trim().toLowerCase())
  })

  const isTemplateFlow = templateFlowGameId !== null && editingGame?.id === templateFlowGameId
  const tableIcons = classificationIcons?.gameId === activeCharacterGameId ? classificationIcons.icons : undefined
  // The editor lists the SAVED template's options (not the unsaved form text); hidden when the table is not migrated.
  const editorIconSet = isTemplateFlow && editingGame && classificationIcons?.gameId === editingGame.id && classificationIcons.available ? classificationIcons : null
  const editorIconAxes = editorIconSet && editingGame ? editingGame.classification_schema.axes : []
  const rosterCountOf = (id: string) => characters.filter((character) => character.game_id === id && !character.is_pickup_only).length
  const isGameTemplateActive = (game: GameOption | undefined | null) => (game ? isCharacterTemplateActive(game, rosterCountOf(game.id)) : true)
  const selectedCharacterGame = games.find((game) => game.id === activeCharacterGameId) ?? null
  const selectedSchema = selectedCharacterGame?.classification_schema
  // Template/support checks count regular roster characters only; pickup-only ones do not activate a template (D-06).
  const selectedRosterCount = selectedCharacterGame
    ? characters.filter((character) => character.game_id === selectedCharacterGame.id && !character.is_pickup_only).length
    : 0
  const isSelectedTemplateActive = selectedCharacterGame ? isCharacterTemplateActive(selectedCharacterGame, selectedRosterCount) : false
  const selectedCharacterLabel = getCharacterLabel(selectedSchema)
  const rankOrder = (rarity: string | null) => {
    const index = rarity ? (selectedSchema?.rarities.indexOf(rarity) ?? -1) : -1
    return index < 0 ? Number.MAX_SAFE_INTEGER : index
  }
  const tableCharacters = [...filteredCharacters].sort(
    (a, b) => rankOrder(a.rarity) - rankOrder(b.rarity) || a.name.localeCompare(b.name, "ko"),
  )

  // Pickup avatar source of the schedule form: characters of the chosen game (mode A) or direct image (mode B).
  const pickupGameCharacters = characters.filter((character) => character.game_id === gameId)
  const pickupLabel = getCharacterLabel(games.find((game) => game.id === gameId)?.classification_schema)
  const visiblePickupCharacters = pickupGameCharacters.filter((character) =>
    !pickupSearch.trim() || character.name.toLowerCase().includes(pickupSearch.trim().toLowerCase()),
  )

  const togglePickupCharacter = (characterId: string, knownName?: string) => {
    const next = pickupCharacterIds.includes(characterId)
      ? pickupCharacterIds.filter((id) => id !== characterId)
      : pickupCharacterIds.length >= MAX_PICKUP_CHARACTERS ? pickupCharacterIds : [...pickupCharacterIds, characterId]
    setPickupCharacterIds(next)
    // Auto-complete the title while it is empty or still the previous auto-generated one; manual edits stop it.
    const names = next
      .map((id) => (id === characterId && knownName ? knownName : characters.find((character) => character.id === id)?.name))
      .filter((name): name is string => !!name)
    const autoTitle = names.length > 0 ? `${names.join(" · ")} 픽업` : ""
    if (!title.trim() || isTitleAutoFilled) {
      setTitle(autoTitle)
      setIsTitleAutoFilled(autoTitle !== "")
    }
  }

  const handleNewPickupImagePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const file = getClipboardImageFile(event.clipboardData)
    if (!file) return
    event.preventDefault()
    setNewPickupImageFile(null)
    setNewPickupImageSource("")
    noteIconCandidate(file)
    setIsProcessingIcon(true)
    void convertIconSourceToDataUrlWithUpscale(file, useAiUpscale)
      .then((dataUrl) => setNewPickupImageSource(assertIconDataUrlSize(dataUrl)))
      .catch((error: unknown) => setNewPickupError(error instanceof Error ? error.message : "이미지를 변환하지 못했습니다."))
      .finally(() => setIsProcessingIcon(false))
  }

  // Registers a pickup-only character for the schedule's game right away and adds it to the selection (U-04).
  const handleRegisterNewPickupCharacter = async () => {
    if (isProcessingIcon) return
    const name = newPickupName.trim()
    if (!gameId) {
      setNewPickupError("먼저 게임을 선택해 주세요.")
      return
    }
    if (!name || name.length > 100) {
      setNewPickupError("캐릭터 이름을 1~100자로 입력해 주세요.")
      return
    }
    if (pickupCharacterIds.length >= MAX_PICKUP_CHARACTERS) {
      setNewPickupError(`픽업 캐릭터는 최대 ${MAX_PICKUP_CHARACTERS}명까지 선택할 수 있습니다.`)
      return
    }
    setIsSavingNewPickup(true)
    setNewPickupError(null)
    setIsProcessingIcon(true)
    try {
      const created = await registerPickupOnlyCharacter({
        gameId,
        name,
        imageSource: newPickupImageFile ?? newPickupImageSource,
        existingCharacters: characters,
        useAiUpscale,
      })
      setCharacters((prev) => [...prev, created])
      togglePickupCharacter(created.id, created.name)
      setIsNewPickupOpen(false)
      setNewPickupName("")
      setNewPickupImageSource("")
      setNewPickupImageFile(null)
    } catch (error: unknown) {
      if (error instanceof DuplicatePickupNameError) {
        setNewPickupError(`${error.message} 목록에서 선택해 주세요.`)
      } else {
        setNewPickupError(error instanceof Error ? error.message : "픽업 캐릭터를 등록하지 못했습니다.")
      }
    } finally {
      setIsSavingNewPickup(false)
      setIsProcessingIcon(false)
    }
  }

  const resetNewPickupForm = () => {
    setNewPickupName("")
    setNewPickupImageSource("")
    setNewPickupImageFile(null)
    setNewPickupError(null)
    setIsAiUpscaleCandidate(false)
  }

  const handleOpenPickupOnlyDialog = () => {
    resetNewPickupForm()
    setIsPickupOnlyDialogOpen(true)
  }

  const handleClosePickupOnlyDialog = () => {
    if (isSavingNewPickup) return
    setIsPickupOnlyDialogOpen(false)
    resetNewPickupForm()
  }

  // Registers a pickup-only character for the game selected in the character tab (R66).
  const handleRegisterPickupOnlyCharacter = async () => {
    if (isProcessingIcon || !selectedCharacterGame) return
    setIsSavingNewPickup(true)
    setNewPickupError(null)
    setIsProcessingIcon(true)
    try {
      const created = await registerPickupOnlyCharacter({
        gameId: selectedCharacterGame.id,
        name: newPickupName,
        imageSource: newPickupImageFile ?? newPickupImageSource,
        existingCharacters: characters,
        useAiUpscale,
      })
      setCharacters((prev) => [...prev, created])
      setMessage({ type: "success", text: `'${created.name}' 픽업 전용 캐릭터를 등록했습니다.` })
      setIsPickupOnlyDialogOpen(false)
      resetNewPickupForm()
    } catch (error: unknown) {
      setNewPickupError(error instanceof Error ? error.message : "픽업 캐릭터를 등록하지 못했습니다.")
    } finally {
      setIsSavingNewPickup(false)
      setIsProcessingIcon(false)
    }
  }

  const paginatedSchedules = filteredSchedules.slice(
    (currentSchedulePage - 1) * SCHEDULES_PER_PAGE,
    currentSchedulePage * SCHEDULES_PER_PAGE,
  )

  return (
    <div className="space-y-6">
      {message && (
        <div
          role="status"
          className={`flex items-center justify-between p-4 rounded-lg text-sm ${
            message.type === "error" ? "bg-danger/20 text-danger border border-danger/30" : "bg-success/20 text-success border border-success/30"
          }`}
        >
          <span>{message.text}</span>
          <button
            type="button"
            className="text-xs underline ml-2 opacity-80 hover:opacity-100"
            onClick={() => setMessage(null)}
          >
            닫기
          </button>
        </div>
      )}

      <Tabs
        value={adminTab}
        onValueChange={(val) => setAdminTab(val as "schedules" | "games" | "characters")}
        className="w-full"
      >
        <TabsList className="mb-6 flex w-full justify-start overflow-x-auto bg-surface-2 md:grid md:grid-cols-3">
          <TabsTrigger
            value="schedules"
            onClick={() => setAdminTab("schedules")}
            className="shrink-0 whitespace-nowrap data-[state=active]:bg-surface data-[state=active]:text-content"
          >
            일정 관리 ({schedules.length})
          </TabsTrigger>
          <TabsTrigger
            value="games"
            onClick={() => setAdminTab("games")}
            className="shrink-0 whitespace-nowrap data-[state=active]:bg-surface data-[state=active]:text-content"
          >
            등록된 게임 목록 ({games.length})
          </TabsTrigger>
          <TabsTrigger
            value="characters"
            onClick={() => setAdminTab("characters")}
            className="shrink-0 whitespace-nowrap data-[state=active]:bg-surface data-[state=active]:text-content"
          >
            캐릭터 관리 ({characters.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedules" className="space-y-6">
          {/* 헤더 컨트롤 바 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-4 rounded-xl border border-line">
            <div className="flex items-center gap-3">
              <Filter className="h-4 w-4 text-content-secondary" />
              <span className="whitespace-nowrap text-sm font-medium">게임 필터:</span>
              <select
                className="bg-surface-2 border border-line rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedGameFilter}
                onChange={(e) => {
                  setSelectedGameFilter(e.target.value)
                  setCurrentSchedulePage(1)
                }}
                aria-label="게임 필터 선택"
              >
                <option value="">전체 게임 ({schedules.length})</option>
                {games.map((g) => {
                  const count = schedules.filter((s) => s.game_id === g.id).length
                  return (
                    <option key={g.id} value={g.id}>
                      {g.name} ({count})
                    </option>
                  )
                })}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleOpenPastSchedules}
                className="flex items-center gap-1.5"
                aria-label="지난 일정 모아보기"
              >
                <History className="h-4 w-4" />
                지난 일정
              </Button>
              <Button onClick={openAddModal} className="flex items-center gap-1.5">
                <Plus className="h-4 w-4" />
                새 일정 등록
              </Button>
            </div>
          </div>

          {/* 일정 목록 카드 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-semibold">등록된 일정</CardTitle>
              </div>
              <span className="text-xs text-content-secondary">
                {filteredSchedules.length}개의 일정
              </span>
            </CardHeader>
            <CardContent className="pt-4">
              {isLoadingSchedules ? (
                <div className="flex items-center justify-center py-12 text-content-secondary">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  일정 목록을 불러오는 중...
                </div>
              ) : filteredSchedules.length === 0 ? (
                <div className="text-center py-12 text-content-secondary">
                  {selectedGameFilter ? "선택한 게임에 등록된 일정이 없습니다." : "등록된 일정이 없습니다. 새 일정을 추가해주세요."}
                </div>
              ) : (
                <>
                  <div className="divide-y divide-line">
                    {paginatedSchedules.map((schedule) => {
                      const matchedGame = games.find((g) => g.id === schedule.game_id)
                      const gameName = schedule.games?.name || matchedGame?.name || "게임"
                      const iconUrl = schedule.games?.default_icon_url || matchedGame?.default_icon_url
                      const isSingleDateItem = schedule.start_date === schedule.end_date
                      return (
                        <div
                          key={schedule.id}
                          className="relative overflow-hidden py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-2/40 px-3 rounded-lg transition-colors border border-transparent hover:border-line"
                        >
                          {iconUrl && (
                            <div className="absolute left-0 top-0 bottom-0 w-28 overflow-hidden z-0 pointer-events-none">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={iconUrl}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover object-left select-none"
                                style={{
                                  maskImage: "linear-gradient(to right, black 25%, transparent 100%)",
                                  WebkitMaskImage: "linear-gradient(to right, black 25%, transparent 100%)",
                                  opacity: 0.35,
                                }}
                              />
                            </div>
                          )}
                          <div className="space-y-1 min-w-0 z-10">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="shrink-0 whitespace-nowrap text-xs font-semibold px-2 py-0.5 rounded bg-surface-2 border border-line text-content">
                                {gameName}
                              </span>
                              <ScheduleTypeBadge type={schedule.schedule_type} isRerun={schedule.is_rerun === true} size="md" />
                              {schedule.is_official === false && (
                                <span className="shrink-0 whitespace-nowrap text-xs font-semibold px-2 py-0.5 rounded bg-warning/15 text-warning border border-warning/30">
                                  비공식
                                </span>
                              )}
                              <div className="font-medium text-sm text-content flex items-center gap-1.5 flex-wrap">
                                <ScheduleTitleBadges title={schedule.title} />
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-content-secondary">
                              <span>
                                {isSingleDateItem ? `${schedule.start_date} (단일)` : `${schedule.start_date} ~ ${schedule.end_date}`}
                              </span>
                              {schedule.memo && (
                                <span className="truncate max-w-xs text-content-muted">· {schedule.memo}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDuplicateModal(schedule)}
                              className="h-8 px-2.5 text-xs flex items-center gap-1"
                              aria-label={`일정 복사: ${schedule.title}`}
                            >
                              <Copy className="h-3.5 w-3.5" />
                              복사
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditModal(schedule)}
                              className="h-8 px-2.5 text-xs flex items-center gap-1"
                              aria-label={`일정 수정: ${schedule.title}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              수정
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeletingSchedule(schedule)}
                              className="h-8 px-2.5 text-xs flex items-center gap-1"
                              aria-label={`일정 삭제: ${schedule.title}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              삭제
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {totalSchedulePages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-line mt-2">
                      <p className="text-xs text-content-secondary">
                        전체 {filteredSchedules.length}개 일정 중{" "}
                        <span className="font-semibold text-content">
                          {currentSchedulePage} / {totalSchedulePages}
                        </span>{" "}
                        페이지
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 max-w-full">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentSchedulePage((p) => Math.max(1, p - 1))}
                          disabled={currentSchedulePage === 1}
                          aria-label="이전 페이지"
                          className="h-7 sm:h-8 px-1.5 sm:px-2 text-xs border-line-control hover:bg-surface-2 disabled:opacity-40"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span className="ml-1">이전</span>
                        </Button>

                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {getPaginationRange(currentSchedulePage, totalSchedulePages).map((p, idx) =>
                            p === "..." ? (
                              <span key={`schedule-ellipsis-${idx}`} className="px-1.5 py-1 text-content-muted select-none">
                                ...
                              </span>
                            ) : (
                              <Button
                                key={`schedule-page-${p}`}
                                size="sm"
                                variant={p === currentSchedulePage ? "default" : "outline"}
                                onClick={() => setCurrentSchedulePage(p as number)}
                                aria-label={`${p} 페이지로 이동`}
                                aria-current={p === currentSchedulePage ? "page" : undefined}
                                className={`h-7 w-7 sm:h-8 sm:w-8 p-0 text-xs ${
                                  p === currentSchedulePage
                                    ? "bg-primary text-primary-foreground font-semibold hover:bg-primary-hover"
                                    : "bg-surface border-line-control text-content hover:bg-surface-2"
                                }`}
                              >
                                {p}
                              </Button>
                            ),
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentSchedulePage((p) => Math.min(totalSchedulePages, p + 1))}
                          disabled={currentSchedulePage === totalSchedulePages}
                          aria-label="다음 페이지"
                          className="h-7 sm:h-8 px-1.5 sm:px-2 text-xs border-line-control hover:bg-surface-2 disabled:opacity-40"
                        >
                          <span className="mr-1">다음</span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="games" className="space-y-6">
          {/* 게임 컨트롤 바 (검색 + 등록 버튼) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-4 rounded-xl border border-line">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-content-muted" />
              <Input
                type="text"
                placeholder="게임 이름으로 검색..."
                value={gamesSearchQuery}
                onChange={(e) => {
                  setGamesSearchQuery(e.target.value)
                  setCurrentGamePage(1)
                }}
                className="pl-9 h-9 text-xs bg-surface-2 border-line text-content"
                aria-label="게임 이름 검색"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {externalIconGames.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => void resaveGameIcons(externalIconGames)}
                  disabled={resavingGameIds.length > 0}
                  className="flex items-center gap-1.5 h-9 border-line-control bg-surface text-content hover:bg-surface-2"
                >
                  {resavingGameIds.length > 0 && <Loader2 className="h-4 w-4 animate-spin" />}
                  외부 아이콘 일괄 변환 ({externalIconGames.length})
                </Button>
              )}
              <Button onClick={handleOpenAddGame} className="flex items-center gap-1.5 h-9">
                <Plus className="h-4 w-4" />
                새 게임 등록
              </Button>
            </div>
          </div>

          {/* 등록된 게임 목록 카드 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Gamepad2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-semibold">등록된 전체 게임 목록</CardTitle>
              </div>
              <span className="text-xs text-content-secondary">
                {filteredGames.length}개의 게임
              </span>
            </CardHeader>
            <CardContent className="pt-4">
              {isLoadingGames ? (
                <div className="flex items-center justify-center py-12 text-content-secondary">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  게임 목록을 불러오는 중...
                </div>
              ) : filteredGames.length === 0 ? (
                <div className="text-center py-12 text-content-secondary">
                  {gamesSearchQuery ? "검색 결과와 일치하는 게임이 없습니다." : "등록된 게임이 없습니다. 새 게임을 등록해주세요."}
                </div>
              ) : (
                <>
                  <div className="divide-y divide-line">
                    {paginatedGames.map((game) => {
                      const scheduleCount = schedules.filter((s) => s.game_id === game.id).length
                      return (
                        <div
                          key={game.id}
                          className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-2/40 px-2 rounded-lg transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-lg overflow-hidden border border-line bg-surface-2 flex items-center justify-center shrink-0">
                              <GameIcon
                                src={game.default_icon_url}
                                alt=""
                                fallbackIcon={<span className="text-base">🎮</span>}
                              />
                            </div>
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-sm text-content truncate">{game.name}</h3>
                                <span className="text-[11px] px-2 py-0.5 rounded bg-surface-2 border border-line text-content-secondary">
                                  {scheduleCount}개 일정
                                </span>
                                {isExternalIconGame(game) && (
                                  <span className="text-[11px] px-2 py-0.5 rounded bg-warning/20 border border-warning/30 text-warning">
                                    외부 URL
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-content-muted truncate max-w-md">
                                {game.default_icon_url || "기본 아이콘 미등록"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                            {isExternalIconGame(game) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void resaveGameIcons([game])}
                                disabled={resavingGameIds.includes(game.id)}
                                className="h-8 px-2.5 text-xs flex items-center gap-1 border-line-control bg-surface text-content hover:bg-surface-2"
                                aria-label={`Data URL 재저장: ${game.name}`}
                              >
                                {resavingGameIds.includes(game.id) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                Data URL 재저장
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEditGame(game)}
                              className="h-8 px-2.5 text-xs flex items-center gap-1 border-line-control bg-surface text-content hover:bg-surface-2"
                              aria-label={`게임 수정: ${game.name}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              수정
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeletingGame(game)}
                              className="h-8 px-2.5 text-xs flex items-center gap-1"
                              aria-label={`게임 삭제: ${game.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              삭제
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {totalGamePages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-line mt-2">
                      <p className="text-xs text-content-secondary">
                        전체 {filteredGames.length}개 게임 중{" "}
                        <span className="font-semibold text-content">
                          {currentGamePage} / {totalGamePages}
                        </span>{" "}
                        페이지
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 max-w-full">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentGamePage((p) => Math.max(1, p - 1))}
                          disabled={currentGamePage === 1}
                          aria-label="이전 페이지"
                          className="h-7 sm:h-8 px-1.5 sm:px-2 text-xs border-line-control hover:bg-surface-2 disabled:opacity-40"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span className="ml-1">이전</span>
                        </Button>

                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {getPaginationRange(currentGamePage, totalGamePages).map((p, idx) =>
                            p === "..." ? (
                              <span key={`game-ellipsis-${idx}`} className="px-1.5 py-1 text-content-muted select-none">
                                ...
                              </span>
                            ) : (
                              <Button
                                key={`game-page-${p}`}
                                size="sm"
                                variant={p === currentGamePage ? "default" : "outline"}
                                onClick={() => setCurrentGamePage(p as number)}
                                aria-label={`${p} 페이지로 이동`}
                                aria-current={p === currentGamePage ? "page" : undefined}
                                className={`h-7 w-7 sm:h-8 sm:w-8 p-0 text-xs ${
                                  p === currentGamePage
                                    ? "bg-primary text-primary-foreground font-semibold hover:bg-primary-hover"
                                    : "bg-surface border-line-control text-content hover:bg-surface-2"
                                }`}
                              >
                                {p}
                              </Button>
                            ),
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentGamePage((p) => Math.min(totalGamePages, p + 1))}
                          disabled={currentGamePage === totalGamePages}
                          aria-label="다음 페이지"
                          className="h-7 sm:h-8 px-1.5 sm:px-2 text-xs border-line-control hover:bg-surface-2 disabled:opacity-40"
                        >
                          <span className="mr-1">다음</span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="characters" className="space-y-6">
          <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 sm:flex-row sm:items-center">
            <select
              className="h-9 rounded-md border border-line-control bg-surface-2 px-3 text-sm text-content"
              value={activeCharacterGameId}
              onChange={(event) => {
                setCharacterGameFilter(event.target.value)
                setCharacterRarityFilter("")
              }}
              aria-label="캐릭터 게임 필터"
            >
              {games.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}
            </select>
            <select
              className="h-9 rounded-md border border-line-control bg-surface-2 px-3 text-sm text-content"
              value={activeRarityFilter}
              onChange={(event) => setCharacterRarityFilter(event.target.value)}
              aria-label="캐릭터 레어도 필터"
            >
              <option value="">모든 레어도</option>
              {getGameSchema(activeCharacterGameId).rarities.map((rarity) => (
                <option key={rarity} value={rarity}>{rarity}</option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border border-line-control bg-surface-2 px-3 text-sm text-content"
              value={characterKindFilter}
              onChange={(event) => setCharacterKindFilter(event.target.value as "" | "roster" | "pickup")}
              aria-label="캐릭터 구분 필터"
            >
              <option value="">전체 구분</option>
              <option value="roster">정식 캐릭터</option>
              <option value="pickup">픽업 전용</option>
            </select>
            <Input
              value={characterSearchQuery}
              onChange={(event) => setCharacterSearchQuery(event.target.value)}
              placeholder="검색"
              aria-label="캐릭터 이름 검색"
              className="h-9 bg-surface-2"
            />
            <div className="flex gap-2 sm:ml-auto">
              {selectedCharacterGame && isSelectedTemplateActive && (
                <>
                  <Button variant="outline" onClick={() => handleOpenTemplate(selectedCharacterGame)}>템플릿 설정 수정</Button>
                  <Button onClick={() => handleOpenAddCharacter(selectedCharacterGame.id)}>
                    <Plus className="mr-1 h-4 w-4" />{selectedCharacterLabel} 추가
                  </Button>
                </>
              )}
              {/* R66: a game without a template can still get pickup-only characters, in the same spot as the regular add button. */}
              {selectedCharacterGame && !isSelectedTemplateActive && (
                <Button onClick={handleOpenPickupOnlyDialog}>
                  <Plus className="mr-1 h-4 w-4" />캐릭터 추가
                </Button>
              )}
            </div>
          </div>

          {!selectedCharacterGame ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-sm text-content-secondary">등록된 게임이 없습니다. 게임을 먼저 등록해 주세요.</p>
              </CardContent>
            </Card>
          ) : !isSelectedTemplateActive ? (
            <>
              <Card>
                <CardContent className="space-y-3 py-10 text-center">
                  <p className="text-sm text-content-secondary">{`${selectedCharacterGame.name}의 캐릭터 테이블이 아직 생성되지 않았습니다.`}</p>
                  <Button onClick={() => handleOpenTemplate(selectedCharacterGame)}>
                    <Plus className="mr-1 h-4 w-4" />캐릭터 템플릿 생성
                  </Button>
                </CardContent>
              </Card>
              {filteredCharacters.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">픽업 전용 캐릭터</CardTitle></CardHeader>
                  <CardContent className="space-y-2" data-testid="pickup-only-list">
                    {filteredCharacters.map((character) => (
                      <div key={character.id} className="flex items-center justify-between gap-3 rounded-lg border border-line p-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-line">
                            <GameIcon src={character.default_icon_url} alt="" fallbackIcon={<span>{character.name.slice(0, 1)}</span>} />
                          </div>
                          <p className="truncate font-semibold text-content">{character.name}</p>
                          <span className="shrink-0 rounded bg-warning/15 px-1.5 py-0.5 text-[10px] text-warning">픽업 전용</span>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button size="sm" variant="outline" aria-label={`${character.name} 수정`} onClick={() => handleOpenEditCharacter(character)}>수정</Button>
                          <Button size="sm" variant="destructive" aria-label={`${character.name} 삭제`} onClick={() => setDeletingCharacter(character)}>삭제</Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-base">{`${selectedCharacterLabel} 카탈로그`}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(selectedSchema?.rarities.length ?? 0) === 0 && (
                  <p role="status" className="rounded border border-warning/30 bg-warning/15 p-3 text-xs text-warning">
                    등급이 설정되지 않은 게임입니다. [템플릿 설정 수정]에서 등급·분류 기준을 등록하면 등급별로 정리됩니다.
                  </p>
                )}
                {filteredCharacters.length === 0 ? (
                  <p className="py-8 text-center text-sm text-content-secondary">조건에 맞는 캐릭터가 없습니다.</p>
                ) : selectedSchema ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" data-testid="character-table">
                      <thead>
                        <tr className="border-b border-line text-left text-xs text-content-secondary">
                          <th className="py-2 pr-2">아이콘</th>
                          <th className="py-2 pr-2">{`${selectedCharacterLabel} 이름`}</th>
                          <th className="py-2 pr-2">등급</th>
                          {selectedSchema.axes.map((axis) => <th key={axis.key} className="py-2 pr-2">{axis.label}</th>)}
                          <th className="py-2 text-right">관리</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableCharacters.map((character) => (
                          <tr key={character.id} className="border-b border-line/60">
                            <td className="py-2 pr-2">
                              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-line">
                                <GameIcon src={character.default_icon_url} alt="" fallbackIcon={<span>{character.name.slice(0, 1)}</span>} />
                              </div>
                            </td>
                            <td className="py-2 pr-2 font-semibold text-content">
                              {character.name}
                              {character.is_pickup_only && <span className="ml-1.5 rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-normal text-warning">픽업 전용</span>}
                            </td>
                            <td className="py-2 pr-2 text-content-secondary">{character.rarity ?? "-"}</td>
                            {selectedSchema.axes.map((axis) => (
                              <td key={axis.key} className="py-2 pr-2 text-content-secondary">
                                {character.attributes[axis.key] ? (
                                  <span className="inline-flex items-center gap-1">
                                    <ClassificationOptionIcon icons={tableIcons} axisKey={axis.key} option={character.attributes[axis.key]} />
                                    {character.attributes[axis.key]}
                                  </span>
                                ) : "-"}
                              </td>
                            ))}
                            <td className="py-2">
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" aria-label={`${character.name} 수정`} onClick={() => handleOpenEditCharacter(character)}>수정</Button>
                                <Button size="sm" variant="destructive" aria-label={`${character.name} 삭제`} onClick={() => setDeletingCharacter(character)}>삭제</Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* 지난 일정 모아보기 모달 다이얼로그 */}
      <Dialog open={isPastModalOpen} onOpenChange={setIsPastModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <DialogTitle>지난 일정 모아보기</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-content-secondary">
              종료일이 지난 이전 공식 일정을 확인하고 수정하거나 삭제할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          {/* 지난 일정 필터 컨트롤 바 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-content-secondary shrink-0" />
              <select
                className="bg-surface-2 border border-line rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary text-content"
                value={pastGameFilter}
                onChange={(e) => {
                  setPastGameFilter(e.target.value)
                  setCurrentPastPage(1)
                }}
                aria-label="지난 일정 게임 필터 선택"
              >
                <option value="">전체 게임 ({pastSchedules.length})</option>
                {games.map((g) => {
                  const count = pastSchedules.filter((s) => s.game_id === g.id).length
                  return (
                    <option key={g.id} value={g.id}>
                      {g.name} ({count})
                    </option>
                  )
                })}
              </select>
            </div>

            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-content-muted" />
              <Input
                type="text"
                placeholder="일정 제목 또는 메모 검색..."
                value={pastSearchQuery}
                onChange={(e) => {
                  setPastSearchQuery(e.target.value)
                  setCurrentPastPage(1)
                }}
                className="pl-8 h-8 text-xs bg-surface-2 border-line text-content"
                aria-label="지난 일정 검색"
              />
            </div>
          </div>

          {/* 지난 일정 목록 컨테이너 */}
          <div className="flex-1 overflow-y-auto min-h-[220px] max-h-[400px] divide-y divide-line pr-1 my-2">
            {isLoadingPastSchedules ? (
              <div className="flex items-center justify-center py-16 text-content-secondary">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                지난 일정 목록을 불러오는 중...
              </div>
            ) : filteredPastSchedules.length === 0 ? (
              <div className="text-center py-16 text-content-secondary text-sm">
                {pastSearchQuery || pastGameFilter
                  ? "검색 조건과 일치하는 지난 일정이 없습니다."
                  : "기록된 지난 일정이 없습니다."}
              </div>
            ) : (
              paginatedPastSchedules.map((schedule) => {
                const matchedGame = games.find((g) => g.id === schedule.game_id)
                const gameName = schedule.games?.name || matchedGame?.name || "게임"
                const iconUrl = schedule.games?.default_icon_url || matchedGame?.default_icon_url
                const isSingleDateItem = schedule.start_date === schedule.end_date

                return (
                  <div
                    key={schedule.id}
                    className="relative overflow-hidden py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-2/40 px-3 rounded-lg transition-colors border border-transparent hover:border-line"
                  >
                    {iconUrl && (
                      <div className="absolute left-0 top-0 bottom-0 w-24 overflow-hidden z-0 pointer-events-none opacity-20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={iconUrl}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover object-left select-none"
                        />
                      </div>
                    )}
                    <div className="space-y-1 min-w-0 z-10 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="shrink-0 whitespace-nowrap text-xs font-semibold px-2 py-0.5 rounded bg-surface-2 border border-line text-content">
                          {gameName}
                        </span>
                        <ScheduleTypeBadge type={schedule.schedule_type} isRerun={schedule.is_rerun === true} size="md" />
                        {schedule.is_official === false && (
                          <span className="shrink-0 whitespace-nowrap text-xs font-semibold px-2 py-0.5 rounded bg-warning/15 text-warning border border-warning/30">
                            비공식
                          </span>
                        )}
                        <div className="font-medium text-sm text-content flex items-center gap-1.5 flex-wrap">
                          <ScheduleTitleBadges title={schedule.title} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-content-secondary flex-wrap">
                        <span className="text-content-muted">
                          {isSingleDateItem ? `${schedule.start_date} (종료)` : `${schedule.start_date} ~ ${schedule.end_date}`}
                        </span>
                        {schedule.memo && (
                          <span className="truncate max-w-xs text-content-muted">· {schedule.memo}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 z-10">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditFromPast(schedule)}
                        className="h-7 px-2 text-xs flex items-center gap-1"
                        aria-label={`지난 일정 수정: ${schedule.title}`}
                      >
                        <Pencil className="h-3 w-3" />
                        수정
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteFromPast(schedule)}
                        className="h-7 px-2 text-xs flex items-center gap-1"
                        aria-label={`지난 일정 삭제: ${schedule.title}`}
                      >
                        <Trash2 className="h-3 w-3" />
                        삭제
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* 지난 일정 하단 페이지네이션 및 닫기 */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-line mt-auto">
            <span className="text-xs text-content-secondary">
              전체 {filteredPastSchedules.length}개의 지난 일정
              {totalPastPages > 1 && ` (${currentPastPage} / ${totalPastPages} 페이지)`}
            </span>

            <div className="flex items-center gap-2">
              {totalPastPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPastPage((p) => Math.max(1, p - 1))}
                    disabled={currentPastPage === 1}
                    aria-label="지난 일정 이전 페이지"
                    className="h-7 px-2 text-xs border-line-control hover:bg-surface-2 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPastPage((p) => Math.min(totalPastPages, p + 1))}
                    disabled={currentPastPage === totalPastPages}
                    aria-label="지난 일정 다음 페이지"
                    className="h-7 px-2 text-xs border-line-control hover:bg-surface-2 disabled:opacity-40"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPastModalOpen(false)}
                className="h-7 px-3 text-xs"
              >
                닫기
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 일정 등록 및 수정 모달 다이얼로그 */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCloseScheduleModal()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingScheduleId ? "일정 수정" : isDuplicating ? "일정 복사" : "새 일정 등록"}
            </DialogTitle>
            <DialogDescription className="text-sm text-content-secondary">
              {editingScheduleId
                ? "선택한 게임 일정을 수정합니다."
                : isDuplicating
                  ? "기존 일정을 복사해 새 게임 일정을 등록합니다."
                  : "새 게임 일정을 등록합니다."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <label htmlFor="schedule-game-select" className="block text-sm font-medium mb-1">게임 선택 *</label>
              <select
                id="schedule-game-select"
                className="w-full bg-surface-2 border border-line rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={gameId}
                onChange={(e) => {
                  setGameId(e.target.value)
                  resetPickupState()
                }}
                required
              >
                <option value="">게임을 선택하세요</option>
                {games.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="schedule-type-select" className="block text-sm font-medium mb-1">일정 타입 *</label>
              <select
                id="schedule-type-select"
                className="w-full bg-surface-2 border border-line rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={scheduleType}
                onChange={(e) => {
                  const nextType = e.target.value as "VERSION" | "PICKUP" | "CONTENTS" | "BROADCAST"
                  setScheduleType(nextType)
                  if (nextType !== "PICKUP") {
                    setIsRerun(false)
                    resetPickupState()
                  }
                }}
              >
                <option value="VERSION">버전 (VERSION)</option>
                <option value="PICKUP">픽업 (PICKUP)</option>
                <option value="CONTENTS">콘텐츠 (CONTENTS)</option>
                <option value="BROADCAST">특별방송 (BROADCAST)</option>
              </select>
            </div>
            {scheduleType === "PICKUP" && (
              <label className="flex items-center gap-2 text-sm text-content">
                <input type="checkbox" checked={isRerun} onChange={(event) => setIsRerun(event.target.checked)} />
                복각 일정
              </label>
            )}
            {scheduleType === "PICKUP" && gameId && (
              <section aria-label={`픽업 ${pickupLabel} 선택`} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{`픽업 ${pickupLabel} 선택 (단일 또는 복수)`}</p>
                  <span className="text-xs text-content-secondary">{`${pickupCharacterIds.length} / ${MAX_PICKUP_CHARACTERS}`}</span>
                </div>
                {pickupGameCharacters.length > 0 && (
                  <Input
                    aria-label="픽업 캐릭터 검색"
                    value={pickupSearch}
                    onChange={(event) => setPickupSearch(event.target.value)}
                    placeholder={`${pickupLabel} 이름 검색`}
                    className="h-8 bg-surface-2"
                  />
                )}
                <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto" data-testid="pickup-character-picker">
                  {visiblePickupCharacters.map((character) => {
                    const selected = pickupCharacterIds.includes(character.id)
                    return (
                      <button
                        key={character.id}
                        type="button"
                        aria-pressed={selected}
                        disabled={!selected && pickupCharacterIds.length >= MAX_PICKUP_CHARACTERS}
                        onClick={() => togglePickupCharacter(character.id)}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-50 ${
                          selected ? "border-primary bg-primary/15 text-primary" : "border-line bg-surface-2 text-content-secondary hover:text-content"
                        }`}
                      >
                        {character.name}
                        {character.is_pickup_only && <span className="rounded bg-warning/15 px-1 text-[10px] text-warning">픽업 전용</span>}
                      </button>
                    )
                  })}
                  {pickupGameCharacters.length === 0 && (
                    <p className="text-xs text-content-secondary">등록된 캐릭터가 없습니다. 아래에서 새 픽업 캐릭터를 등록해 주세요.</p>
                  )}
                </div>
                {!isNewPickupOpen ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => setIsNewPickupOpen(true)}>
                    + 새 픽업 캐릭터
                  </Button>
                ) : (
                  <div className="space-y-2 rounded-lg border border-line bg-surface-2 p-3" data-testid="new-pickup-character-form">
                    <label htmlFor="new-pickup-name" className="block text-xs font-medium">새 픽업 캐릭터 이름 *</label>
                    <Input id="new-pickup-name" maxLength={100} value={newPickupName} onChange={(event) => setNewPickupName(event.target.value)} />
                    <label htmlFor="new-pickup-image-url" className="block text-xs font-medium">이미지 (선택)</label>
                    <Input
                      id="new-pickup-image-url"
                      value={newPickupImageSource.startsWith("data:image/webp;base64,") ? "" : newPickupImageSource}
                      onPaste={handleNewPickupImagePaste}
                      onChange={(event) => {
                        setNewPickupImageSource(event.target.value)
                        setNewPickupImageFile(null)
                      }}
                      placeholder="https://... 또는 이미지 붙여넣기"
                    />
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      aria-label="새 픽업 캐릭터 이미지 파일"
                      onChange={(event) => { const file = event.target.files?.[0] ?? null; setNewPickupImageFile(file); noteIconCandidate(file) }}
                    />
                    {isAiUpscaleVisible && isAiUpscaleCandidate && (
                      <label className="flex items-center gap-2 text-xs text-content-secondary">
                        <input type="checkbox" checked={useAiUpscale} onChange={(event) => setUseAiUpscale(event.target.checked)} />
                        AI 고화질 업스케일 (PC 전용)
                      </label>
                    )}
                    {isProcessingIcon && <p className="text-xs text-content-muted">AI 고화질 변환 중...</p>}
                    {newPickupImageSource.startsWith("data:image/webp;base64,") && (
                      <div className="h-12 w-12 overflow-hidden rounded-lg border border-line">
                        <GameIcon src={newPickupImageSource} alt="새 픽업 캐릭터 이미지 미리보기" />
                      </div>
                    )}
                    {newPickupError && <p role="alert" className="text-xs text-danger">{newPickupError}</p>}
                    <div className="flex justify-end gap-2">
                      <Button type="button" size="sm" variant="ghost" disabled={isSavingNewPickup} onClick={() => { setIsNewPickupOpen(false); setNewPickupError(null) }}>취소</Button>
                      <Button type="button" size="sm" disabled={isSavingNewPickup || isProcessingIcon} onClick={() => void handleRegisterNewPickupCharacter()}>
                        {isSavingNewPickup ? "등록 중..." : "등록"}
                      </Button>
                    </div>
                  </div>
                )}
              </section>
            )}

            <div>
              <label htmlFor="schedule-official-select" className="block text-sm font-medium mb-1">일정 분류 *</label>
              <select
                id="schedule-official-select"
                className="w-full bg-surface-2 border border-line rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={isOfficial ? "official" : "unofficial"}
                onChange={(event) => setIsOfficial(event.target.value === "official")}
              >
                <option value="official">공식</option>
                <option value="unofficial">비공식 (테스트 서버·유출 등)</option>
              </select>
            </div>

            <div>
              <label htmlFor="schedule-title-input" className="block text-sm font-medium mb-1">타이틀 *</label>
              <Input
                id="schedule-title-input"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  setIsTitleAutoFilled(false)
                }}
                placeholder="일정 제목을 입력하세요"
                required
              />
            </div>

            <div className="flex items-center gap-2 pt-1 pb-1">
              <input
                id="schedule-is-single-date"
                type="checkbox"
                checked={isSingleDate}
                onChange={(e) => {
                  const checked = e.target.checked
                  setIsSingleDate(checked)
                  if (checked && startDate) {
                    setEndDate(startDate)
                  }
                }}
                className="h-4 w-4 rounded border-line text-primary focus:ring-primary"
              />
              <label htmlFor="schedule-is-single-date" className="text-sm font-medium text-content cursor-pointer">
                단일 목표 일정 (하루만 진행)
              </label>
            </div>

            {isSingleDate ? (
              <div>
                <label htmlFor="schedule-start-date-input" className="block text-sm font-medium mb-1">목표일 *</label>
                <Input
                  id="schedule-start-date-input"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    setEndDate(e.target.value)
                  }}
                  required
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="schedule-start-date-input" className="block text-sm font-medium mb-1">시작일 *</label>
                  <Input
                    id="schedule-start-date-input"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="schedule-end-date-input" className="block text-sm font-medium mb-1">종료일 *</label>
                  <Input
                    id="schedule-end-date-input"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="schedule-memo-input" className="block text-sm font-medium mb-1">메모 (선택)</label>
              <Input
                id="schedule-memo-input"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="추가 정보 및 참고 사항"
              />
            </div>

            {formError && (
              <div role="alert" className="p-3 rounded-lg text-sm bg-danger/20 text-danger border border-danger/30 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseScheduleModal}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    저장 중...
                  </span>
                ) : editingScheduleId ? (
                  "수정 저장"
                ) : (
                  "일정 등록"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 모달 다이얼로그 */}
      <Dialog open={deletingSchedule !== null} onOpenChange={(open) => !open && handleCancelDelete()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>일정 삭제 확인</DialogTitle>
            <DialogDescription className="text-sm text-content-secondary">
              선택한 일정은 삭제 후 복구할 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-content-secondary">
              <strong className="text-content font-medium">&apos;{deletingSchedule?.title}&apos;</strong> 일정을 정말 삭제하시겠습니까?
            </p>
            <p className="text-xs text-danger">
              삭제된 일정은 복구할 수 없습니다.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelDelete}
                disabled={isDeleting}
              >
                취소
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "삭제 중..." : "삭제"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 게임 등록 및 수정 모달 다이얼로그 */}
      <Dialog open={isGameModalOpen} onOpenChange={(open) => { setIsGameModalOpen(open); if (!open) setTemplateFlowGameId(null) }}>
        {/* No overflow override: the shared DialogContent scrolls vertically within the viewport height. */}
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle>
              {isTemplateFlow && editingGame
                ? `${editingGame.name} 캐릭터 템플릿 ${editingGame.classification_schema.rarities.length >= 1 ? "수정" : "생성"}`
                : editingGame ? "게임 정보 수정" : "새 게임 등록"}
            </DialogTitle>
            <DialogDescription className="text-xs text-content-secondary">
              {isTemplateFlow
                ? "캐릭터 시스템 명칭·등급·분류 기준(최대 2개)·최대 프리셋 슬롯·최대 돌파 단계를 설정함."
                : editingGame
                ? "게임 명칭 및 기본 대표 아이콘 URL을 변경합니다."
                : "공식 마스터 카탈로그에 새로운 게임을 등록합니다."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveGame} className="space-y-4 pt-2 w-full min-w-0">
            {/* The template flow targets an already registered game, so its name and icon are not edited here. */}
            {!isTemplateFlow && (
            <>
            <div className="w-full min-w-0">
              <label htmlFor="game-form-name" className="block text-sm font-medium mb-1">
                게임 이름 *
              </label>
              <Input
                id="game-form-name"
                type="text"
                value={gameFormName}
                onChange={(e) => setGameFormName(e.target.value)}
                placeholder="예: 원신, 붕괴: 스타레일"
                required
                className="bg-surface-2 border-line text-content truncate"
              />
            </div>

            <div className="w-full min-w-0">
              <label htmlFor="game-form-icon-url" className="block text-sm font-medium mb-1">
                기본 아이콘 URL
              </label>
              <Input
                id="game-form-icon-url"
                type="text"
                value={gameFormIconUrl.startsWith("data:image/webp;base64,") ? "" : gameFormIconUrl}
                onPaste={handleGameIconPaste}
                onChange={(e) => {
                  setGameFormIconUrl(e.target.value)
                  setGameFormIconFile(null)
                }}
                placeholder="https://... (웹 이미지 주소)"
                className="bg-surface-2 border-line text-content truncate"
              />
              <p className="text-[11px] text-content-muted mt-1">
                URL은 직접 가져오기를 우선 시도하고, 실패하면 wsrv.nl에 전달해 변환합니다. 이미지 복사 후 붙여넣기 또는 파일 업로드도 가능합니다.
              </p>
              <Input
                id="game-form-icon-file"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-label="기본 아이콘 파일"
                onChange={(event) => { const file = event.target.files?.[0] ?? null; setGameFormIconFile(file); noteIconCandidate(file) }}
                className="mt-2 bg-surface-2 border-line text-content"
              />
              {isAiUpscaleVisible && isAiUpscaleCandidate && (
                <label className="mt-2 flex items-center gap-2 text-xs text-content-secondary">
                  <input type="checkbox" checked={useAiUpscale} onChange={(event) => setUseAiUpscale(event.target.checked)} />
                  AI 고화질 업스케일 (PC 전용)
                </label>
              )}
              {isProcessingIcon && <p className="text-xs text-content-muted">AI 고화질 변환 중...</p>}
            </div>

            {/* 실시간 아이콘 미리보기 */}
            {gameFormIconUrl.trim() && (
              <div className="flex items-center gap-3 p-2.5 rounded-lg border border-line bg-surface-2 w-full min-w-0 overflow-hidden">
                <div className="h-10 w-10 rounded-lg overflow-hidden border border-line bg-surface flex items-center justify-center shrink-0">
                  <GameIcon
                    src={gameFormIconUrl.trim()}
                    alt=""
                    fallbackIcon={<span className="text-base">🎮</span>}
                  />
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="text-xs font-semibold text-content truncate">
                    {gameFormName.trim() || "아이콘 미리보기"}
                  </p>
                  <p className="text-[11px] text-content-muted truncate">
                    {gameFormIconUrl.startsWith("data:image/webp;base64,")
                      ? "클립보드 이미지 (WebP)"
                      : gameFormIconUrl.trim()}
                  </p>
                </div>
              </div>
            )}
            </>
            )}

            <div>
              <label htmlFor="game-form-character-label" className="block text-sm font-medium mb-1">캐릭터 시스템 명칭</label>
              <Input
                id="game-form-character-label"
                maxLength={20}
                value={gameFormCharacterLabel}
                onChange={(event) => setGameFormCharacterLabel(event.target.value)}
                placeholder="공명자, 오퍼레이터, 에이전트 (비우면 '캐릭터')"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="game-form-max-slots" className="block text-sm font-medium mb-1">최대 프리셋 슬롯</label>
                <Input id="game-form-max-slots" type="number" min={1} max={12} value={gameFormMaxPresetSlots} onChange={(event) => setGameFormMaxPresetSlots(event.target.value)} />
              </div>
              <div>
                <label htmlFor="game-form-max-breakthrough" className="block text-sm font-medium mb-1">최대 돌파 단계</label>
                <Input id="game-form-max-breakthrough" type="number" min={0} max={12} value={gameFormMaxBreakthrough} onChange={(event) => setGameFormMaxBreakthrough(event.target.value)} />
              </div>
              <div>
                <label htmlFor="game-form-rarities" className="block text-sm font-medium mb-1">{isTemplateFlow ? "등급 목록 (최고 등급부터) *" : "레어도 목록"}</label>
                <Input id="game-form-rarities" value={gameFormRarities} onChange={(event) => setGameFormRarities(event.target.value)} placeholder="5★, 4★ (최고 등급부터)" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium">분류 기준 (최대 2개)</label>
                <Button type="button" size="sm" variant="outline" onClick={() => setGameFormAxes((current) => current.length >= 2 ? current : [...current, { rowId: nextAxisRowId(), key: assignAxisKey(current.map((item) => item.key)), label: "", options: "" }])}>축 추가</Button>
              </div>
              {gameFormAxes.map((axis, index) => (
                <div key={axis.rowId} className="grid grid-cols-[1fr_2fr_auto] gap-2">
                  <Input aria-label={`분류 축 ${index + 1} 이름`} placeholder="표시명" value={axis.label} onChange={(event) => setGameFormAxes((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} />
                  <Input aria-label={`분류 축 ${index + 1} 옵션`} placeholder="옵션1, 옵션2" value={axis.options} onChange={(event) => setGameFormAxes((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, options: event.target.value } : item))} />
                  <Button type="button" variant="ghost" onClick={() => setGameFormAxes((current) => current.filter((_, itemIndex) => itemIndex !== index))}>삭제</Button>
                </div>
              ))}
            </div>

            {editorIconSet && editorIconAxes.length >= 1 && (
              <section aria-label="분류 아이콘" className="space-y-2" data-testid="classification-icon-editor">
                <h3 className="text-sm font-medium">분류 아이콘</h3>
                <p className="text-[11px] text-content-muted">
                  분류 기준·선택지를 바꾼 경우 먼저 [수정 저장]한 뒤 아이콘을 등록함. 이름을 바꾸거나 지운 선택지의 아이콘은 자동으로 삭제됨.
                </p>
                {editorIconAxes.map((axis) => (
                  <div key={axis.key} className="space-y-1">
                    <p className="text-xs font-semibold text-content-secondary">{axis.label}</p>
                    <ul className="space-y-1">
                      {axis.options.map((option) => {
                        const key = classificationIconKey(axis.key, option)
                        const hasIcon = editorIconSet.icons.has(key)
                        const pending = pendingIconKeys.includes(key)
                        return (
                          <li key={key} className="flex items-center gap-2" data-testid="classification-icon-row">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-line bg-surface-2">
                              <ClassificationOptionIcon icons={editorIconSet.icons} axisKey={axis.key} option={option} size={24} />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm text-content">{option}</span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={pending}
                              aria-label={`${axis.label} ${option} 아이콘 이미지 선택`}
                              onClick={() => openIconDialog(axis.key, axis.label, option)}
                            >
                              {pending ? "저장 중..." : "이미지 선택"}
                            </Button>
                            {hasIcon && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={pending}
                                aria-label={`${axis.label} ${option} 아이콘 삭제`}
                                onClick={() => void handleDeleteClassificationIcon(axis.key, option)}
                              >
                                삭제
                              </Button>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
                {iconError && !iconDialog && (
                  <p role="alert" className="rounded border border-danger/30 bg-danger/20 p-2 text-xs text-danger">{iconError}</p>
                )}
              </section>
            )}

            {gameFormWarning && (
              <div role="alert" className="p-3 bg-warning/15 text-warning rounded text-sm border border-warning/30">
                {gameFormWarning}
              </div>
            )}

            {gameFormError && (
              <div role="alert" className="p-3 bg-danger/20 text-danger rounded text-sm border border-danger/30">
                {gameFormError}
              </div>
            )}

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsGameModalOpen(false)}
                disabled={isSubmittingGame}
                className="border-line-control text-content hover:bg-surface-2"
              >
                취소
              </Button>
              <Button type="submit" disabled={isSubmittingGame || isProcessingIcon}>
                {isSubmittingGame ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    저장 중...
                  </span>
                ) : editingGame ? (
                  "수정 저장"
                ) : (
                  "게임 등록"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 게임 삭제 확인 모달 다이얼로그 */}
      <Dialog open={iconDialog !== null} onOpenChange={(open) => { if (!open) closeIconDialog() }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{iconDialog ? `${iconDialog.axisLabel} · ${iconDialog.option} 아이콘 등록` : "분류 아이콘 등록"}</DialogTitle>
            <DialogDescription className="text-xs text-content-secondary">
              이미지 URL, 붙여넣기, 파일 중 하나로 등록하면 64×64 WebP로 변환해 저장함.
            </DialogDescription>
          </DialogHeader>
          {iconDialog && (
            <div className="space-y-2" data-testid="classification-icon-dialog">
              <label htmlFor="classification-icon-url" className="block text-sm font-medium">이미지</label>
              <Input
                id="classification-icon-url"
                value={iconDialogUrl}
                onPaste={handleIconDialogPaste}
                onChange={(event) => { setIconDialogUrl(event.target.value); setIconDialogSelectedFile(null); setIconFileInputKey((key) => key + 1) }}
                placeholder="https://... 또는 이미지 붙여넣기"
              />
              <Input
                key={iconFileInputKey}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-label="분류 아이콘 이미지 파일"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null
                  setIconDialogUrl("")
                  setIconDialogSelectedFile(file)
                }}
              />
              {iconDialogPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={iconDialogPreview} alt="분류 아이콘 미리보기" width={64} height={64} className="h-16 w-16 rounded border border-line" />
              )}
              {iconError && <p role="alert" className="rounded border border-danger/30 bg-danger/20 p-2 text-xs text-danger">{iconError}</p>}
            </div>
          )}
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={closeIconDialog}>취소</Button>
            <Button
              type="button"
              disabled={!iconDialog || pendingIconKeys.includes(classificationIconKey(iconDialog.axisKey, iconDialog.option))}
              onClick={() => void handleSubmitIconDialog()}
            >
              {iconDialog && pendingIconKeys.includes(classificationIconKey(iconDialog.axisKey, iconDialog.option)) ? "등록 중..." : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deletingGame !== null} onOpenChange={(open) => !open && setDeletingGame(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>게임 삭제 확인</DialogTitle>
            <DialogDescription className="text-sm text-content-secondary">
              게임을 삭제하면 연결된 데이터도 함께 삭제되며 복구할 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-content-secondary">
              <strong className="text-content font-medium">&apos;{deletingGame?.name}&apos;</strong> 게임을 정말 삭제하시겠습니까?
            </p>
            <p className="text-xs text-danger leading-relaxed">
              게임이 삭제되면 연결된 공식 일정 및 사용자들의 게임 구독 정보가 함께 삭제됩니다. 삭제된 데이터는 복구할 수 없습니다.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeletingGame(null)}
                disabled={isDeletingGame}
                className="border-line-control text-content hover:bg-surface-2"
              >
                취소
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteGame}
                disabled={isDeletingGame}
              >
                {isDeletingGame ? "삭제 중..." : "삭제"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isPickupOnlyDialogOpen} onOpenChange={(open) => { if (!open) handleClosePickupOnlyDialog() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{`${selectedCharacterGame?.name ?? ""} 픽업 전용 캐릭터 추가`.trim()}</DialogTitle>
            <DialogDescription className="text-sm text-content-secondary">
              캐릭터 템플릿이 없는 게임에는 픽업 일정에 표시할 캐릭터 이름과 이미지(선택)만 등록할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2" data-testid="pickup-only-character-form">
            <label htmlFor="pickup-only-name" className="block text-sm font-medium">캐릭터 이름 *</label>
            <Input id="pickup-only-name" maxLength={100} value={newPickupName} onChange={(event) => setNewPickupName(event.target.value)} />
            <label htmlFor="pickup-only-image-url" className="block text-sm font-medium">이미지 (선택)</label>
            <Input
              id="pickup-only-image-url"
              value={newPickupImageSource.startsWith("data:image/webp;base64,") ? "" : newPickupImageSource}
              onPaste={handleNewPickupImagePaste}
              onChange={(event) => {
                setNewPickupImageSource(event.target.value)
                setNewPickupImageFile(null)
              }}
              placeholder="https://... 또는 이미지 붙여넣기"
            />
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-label="픽업 전용 캐릭터 이미지 파일"
              onChange={(event) => { const file = event.target.files?.[0] ?? null; setNewPickupImageFile(file); noteIconCandidate(file) }}
            />
            {isAiUpscaleVisible && isAiUpscaleCandidate && (
              <label className="flex items-center gap-2 text-xs text-content-secondary">
                <input type="checkbox" checked={useAiUpscale} onChange={(event) => setUseAiUpscale(event.target.checked)} />
                AI 고화질 업스케일 (PC 전용)
              </label>
            )}
            {isProcessingIcon && <p className="text-xs text-content-muted">AI 고화질 변환 중...</p>}
            {newPickupImageSource.startsWith("data:image/webp;base64,") && (
              <div className="h-12 w-12 overflow-hidden rounded-lg border border-line">
                <GameIcon src={newPickupImageSource} alt="픽업 전용 캐릭터 이미지 미리보기" />
              </div>
            )}
            {newPickupError && <p role="alert" className="text-xs text-danger">{newPickupError}</p>}
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" disabled={isSavingNewPickup} onClick={handleClosePickupOnlyDialog}>취소</Button>
            <Button type="button" disabled={isSavingNewPickup || isProcessingIcon} onClick={() => void handleRegisterPickupOnlyCharacter()}>
              {isSavingNewPickup ? "등록 중..." : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={deletingCharacter !== null} onOpenChange={(open) => !open && !isDeletingCharacter && setDeletingCharacter(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>캐릭터 삭제 확인</DialogTitle>
            <DialogDescription className="text-sm text-content-secondary">
              캐릭터를 삭제하면 모든 사용자의 보유 정보와 프리셋 슬롯에서도 제거되며 복구할 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-content-secondary">
            <strong className="font-medium text-content">&apos;{deletingCharacter?.name}&apos;</strong> 캐릭터를 정말 삭제하시겠습니까?
          </p>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setDeletingCharacter(null)} disabled={isDeletingCharacter}>취소</Button>
            <Button type="button" variant="destructive" onClick={() => void handleDeleteCharacter()} disabled={isDeletingCharacter}>
              {isDeletingCharacter ? "삭제 중..." : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isCharacterModalOpen} onOpenChange={setIsCharacterModalOpen}>
        <DialogContent className="max-w-lg">
          {(() => {
            const formGame = games.find((game) => game.id === characterFormGameId)
            const formSchema = formGame?.classification_schema ?? { rarities: [], axes: [] }
            const formLabel = getCharacterLabel(formSchema)
            const isPickupOnlyEdit = editingCharacter?.is_pickup_only === true
            const canPromote = isPickupOnlyEdit && isCharacterTemplateActive(formGame, characters.filter((character) => character.game_id === formGame?.id && !character.is_pickup_only).length)
            const showClassification = !isPickupOnlyEdit || characterFormPromote
            // A game without a template cannot get regular characters yet; the template step comes first (R52 §3.2, R57).
            const isGated = !editingCharacter && !!formGame && !isGameTemplateActive(formGame)
            return (
              <>
                <DialogHeader>
                  <DialogTitle>{`${formGame ? `${formGame.name} ` : ""}${formLabel} ${editingCharacter ? "수정" : "추가"}`}</DialogTitle>
                  <DialogDescription>{`게임별 ${formLabel}와 등급·분류 정보를 등록함.`}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSaveCharacter} className="space-y-4">
                  <div>
                    <label htmlFor="character-form-game" className="mb-1 block text-sm font-medium">대상 게임</label>
                    <select id="character-form-game" className="h-10 w-full rounded-md border border-line-control bg-surface-2 px-3 text-sm text-content" value={characterFormGameId} onChange={(event) => { setCharacterFormGameId(event.target.value); setCharacterFormRarity(""); setCharacterFormAttributes({}) }}>
                      <option value="">게임을 선택하세요</option>
                      {games.map((game) => <option key={game.id} value={game.id}>{!editingCharacter && !isGameTemplateActive(game) ? `${game.name} (템플릿 없음)` : game.name}</option>)}
                    </select>
                  </div>
                  {isGated && formGame ? (
                    <div className="space-y-3 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-warning" data-testid="character-template-gate">
                      <p>{`${formGame.name}은(는) 캐릭터 템플릿이 아직 없습니다. 템플릿(명칭·등급·분류 기준)을 먼저 만들어야 합니다.`}</p>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsCharacterModalOpen(false)}>취소</Button>
                        <Button
                          type="button"
                          onClick={() => {
                            setIsCharacterModalOpen(false)
                            handleOpenTemplate(formGame)
                          }}
                        >
                          캐릭터 템플릿 생성
                        </Button>
                      </DialogFooter>
                    </div>
                  ) : (
                  <>
                  <div>
                    <label htmlFor="character-form-name" className="mb-1 block text-sm font-medium">{`${formLabel} 이름 *`}</label>
                    <Input id="character-form-name" maxLength={100} value={characterFormName} onChange={(event) => setCharacterFormName(event.target.value)} />
                  </div>
                  {isPickupOnlyEdit && (
                    <div className="space-y-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                      <p>픽업 전용 캐릭터는 이름과 이미지만 수정할 수 있으며 보유 체크·프리셋에는 쓰이지 않음.</p>
                      {canPromote && (
                        <label className="flex items-center gap-2 text-sm text-content">
                          <input type="checkbox" checked={characterFormPromote} onChange={(event) => setCharacterFormPromote(event.target.checked)} />
                          정식 캐릭터로 승격 (등급·분류 입력)
                        </label>
                      )}
                    </div>
                  )}
                  {showClassification && <div>
                    <label htmlFor="character-form-rarity" className="mb-1 block text-sm font-medium">{formSchema.rarities.length >= 1 ? "등급 *" : "등급"}</label>
                    <select id="character-form-rarity" className="h-10 w-full rounded-md border border-line-control bg-surface-2 px-3 text-sm text-content" value={characterFormRarity} onChange={(event) => setCharacterFormRarity(event.target.value)}>
                      <option value="">{formSchema.rarities.length >= 1 ? "등급 선택" : "등급 없음"}</option>
                      {formSchema.rarities.map((rarity) => <option key={rarity} value={rarity}>{rarity}</option>)}
                    </select>
                  </div>}
                  {showClassification && formSchema.axes.map((axis) => (
                    <div key={axis.key}>
                      <label htmlFor={`character-form-axis-${axis.key}`} className="mb-1 block text-sm font-medium">{`${axis.label} *`}</label>
                      <select id={`character-form-axis-${axis.key}`} className="h-10 w-full rounded-md border border-line-control bg-surface-2 px-3 text-sm text-content" value={characterFormAttributes[axis.key] ?? ""} onChange={(event) => setCharacterFormAttributes((current) => ({ ...current, [axis.key]: event.target.value }))}>
                        <option value="">{`${axis.label} 선택`}</option>
                        {axis.options.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                  ))}
                  <div>
                    <label htmlFor="character-form-icon-url" className="mb-1 block text-sm font-medium">{isPickupOnlyEdit && !characterFormPromote ? `${formLabel} 아이콘 (선택)` : `${formLabel} 아이콘 *`}</label>
                    <Input id="character-form-icon-url" value={characterFormIconUrl.startsWith("data:image/webp;base64,") ? "" : characterFormIconUrl} onPaste={handleCharacterIconPaste} onChange={(event) => { setCharacterFormIconUrl(event.target.value); setCharacterFormIconFile(null) }} placeholder="https://... 또는 이미지 붙여넣기" aria-label="기본 아이콘 URL" />
                    <Input id="character-form-icon-file" type="file" accept="image/png,image/jpeg,image/webp" aria-label="캐릭터 기본 아이콘 파일" onChange={(event) => { const file = event.target.files?.[0] ?? null; setCharacterFormIconFile(file); noteIconCandidate(file) }} className="mt-2" />
                    {isAiUpscaleVisible && isAiUpscaleCandidate && (
                      <label className="mt-2 flex items-center gap-2 text-xs text-content-secondary">
                        <input type="checkbox" checked={useAiUpscale} onChange={(event) => setUseAiUpscale(event.target.checked)} />
                        AI 고화질 업스케일 (PC 전용)
                      </label>
                    )}
                    {isProcessingIcon && <p className="text-xs text-content-muted">AI 고화질 변환 중...</p>}
                  </div>
                  {characterFormError && <div role="alert" className="rounded border border-danger/30 bg-danger/20 p-3 text-sm text-danger">{characterFormError}</div>}
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCharacterModalOpen(false)}>취소</Button>
                    <Button type="submit" disabled={isSubmittingCharacter || isProcessingIcon}>{isSubmittingCharacter ? "저장 중..." : "저장"}</Button>
                  </DialogFooter>
                  </>
                  )}
                </form>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
