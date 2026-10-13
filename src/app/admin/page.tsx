"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase/client"
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
  ArrowRight,
} from "lucide-react"

const SCHEDULES_PER_PAGE = 10
const GAMES_PER_PAGE = 10

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
}

interface ScheduleItem {
  id: string
  game_id: string
  schedule_type: "VERSION" | "PICKUP" | "CONTENTS"
  title: string
  start_date: string
  end_date: string
  memo: string | null
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
  const [adminTab, setAdminTab] = useState<"schedules" | "games">("schedules")

  // 게임 관리 탭 상태
  const [gamesSearchQuery, setGamesSearchQuery] = useState("")
  const [currentGamePage, setCurrentGamePage] = useState(1)
  const [isGameModalOpen, setIsGameModalOpen] = useState(false)
  const [editingGame, setEditingGame] = useState<GameOption | null>(null)
  const [gameFormName, setGameFormName] = useState("")
  const [gameFormIconUrl, setGameFormIconUrl] = useState("")
  const [gameFormError, setGameFormError] = useState<string | null>(null)
  const [isSubmittingGame, setIsSubmittingGame] = useState(false)
  const [deletingGame, setDeletingGame] = useState<GameOption | null>(null)
  const [isDeletingGame, setIsDeletingGame] = useState(false)

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
  const [scheduleType, setScheduleType] = useState<"VERSION" | "PICKUP" | "CONTENTS">("VERSION")
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

  // 전역 알림 메시지
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null)

  const fetchGames = useCallback(async () => {
    setIsLoadingGames(true)
    const { data, error } = await supabase
      .from("games")
      .select("id, name, default_icon_url, created_at")
      .order("name")
    if (error) {
      setMessage({ type: "error", text: "게임 목록을 불러오지 못했습니다: " + error.message })
    } else if (data) {
      setGames(data as GameOption[])
    }
    setIsLoadingGames(false)
  }, [])

  const fetchSchedules = useCallback(async () => {
    setIsLoadingSchedules(true)
    const { data, error } = await supabase
      .from("game_schedules")
      .select("id, game_id, schedule_type, title, start_date, end_date, memo, games(id, name)")
      .order("start_date", { ascending: true })

    if (error) {
      setMessage({ type: "error", text: "일정 목록을 불러오지 못했습니다: " + error.message })
    } else if (data) {
      const sorted = (data as unknown as ScheduleItem[]).sort((a, b) => {
        if (a.start_date !== b.start_date) return a.start_date.localeCompare(b.start_date)
        return a.end_date.localeCompare(b.end_date)
      })
      setSchedules(sorted)
    }
    setIsLoadingSchedules(false)
  }, [])

  useEffect(() => {
    if (role === "admin") {
      void fetchGames()
      void fetchSchedules()
    }
  }, [fetchGames, fetchSchedules, role])

  if (authLoading) return <div className="p-6">불러오는 중...</div>
  if (!user || role !== "admin") {
    return <div className="p-6 text-red-500">접근 권한이 없습니다. 관리자만 이용 가능합니다.</div>
  }

  const openAddModal = () => {
    setEditingScheduleId(null)
    setIsDuplicating(false)
    setGameId(selectedGameFilter || "")
    setScheduleType("VERSION")
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
    setGameId(schedule.game_id)
    setScheduleType(schedule.schedule_type)
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
    setGameId(schedule.game_id)
    setScheduleType(schedule.schedule_type)
    setIsSingleDate(schedule.start_date === schedule.end_date)
    setTitle(schedule.title)
    setStartDate(schedule.start_date)
    setEndDate(schedule.end_date)
    setMemo(schedule.memo || "")
    setFormError(null)
    setIsModalOpen(true)
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

    if (editingScheduleId) {
      // 기존 일정 수정
      const { error } = await supabase
        .from("game_schedules")
        .update({
          game_id: gameId,
          schedule_type: scheduleType,
          title: title.trim(),
          start_date: startDate,
          end_date: finalEndDate,
          memo: memo.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingScheduleId)

      setIsSubmitting(false)

      if (error) {
        setFormError("일정 수정에 실패했습니다: " + error.message)
      } else {
        setMessage({ type: "success", text: "일정이 성공적으로 수정되었습니다." })
        setIsModalOpen(false)
        void fetchSchedules()
      }
    } else {
      // 새 일정 등록
      const { error } = await supabase.from("game_schedules").insert({
        game_id: gameId,
        schedule_type: scheduleType,
        title: title.trim(),
        start_date: startDate,
        end_date: finalEndDate,
        memo: memo.trim() || null,
      })

      setIsSubmitting(false)

      if (error) {
        setFormError("일정 추가에 실패했습니다: " + error.message)
      } else {
        setMessage({ type: "success", text: "일정이 성공적으로 추가되었습니다." })
        setIsModalOpen(false)
        void fetchSchedules()
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
    }
  }

  const handleOpenAddGame = () => {
    setEditingGame(null)
    setGameFormName("")
    setGameFormIconUrl("")
    setGameFormError(null)
    setIsGameModalOpen(true)
  }

  const handleOpenEditGame = (game: GameOption) => {
    setEditingGame(game)
    setGameFormName(game.name)
    setGameFormIconUrl(game.default_icon_url || "")
    setGameFormError(null)
    setIsGameModalOpen(true)
  }

  const handleSaveGame = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = gameFormName.trim()
    const trimmedIconUrl = gameFormIconUrl.trim()

    if (!trimmedName) {
      setGameFormError("게임 이름을 입력해주세요.")
      return
    }
    if (!trimmedIconUrl) {
      setGameFormError("게임 기본 아이콘 URL을 입력해주세요.")
      return
    }
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

    setIsSubmittingGame(true)
    setGameFormError(null)

    if (editingGame) {
      // 게임 수정
      const { error } = await supabase
        .from("games")
        .update({
          name: trimmedName,
          default_icon_url: trimmedIconUrl,
        })
        .eq("id", editingGame.id)

      setIsSubmittingGame(false)

      if (error) {
        setGameFormError("게임 수정에 실패했습니다: " + error.message)
      } else {
        setMessage({ type: "success", text: `'${trimmedName}' 게임 정보가 수정되었습니다.` })
        setIsGameModalOpen(false)
        void fetchGames()
      }
    } else {
      // 새 게임 등록
      const { error } = await supabase.from("games").insert({
        name: trimmedName,
        default_icon_url: trimmedIconUrl,
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
          setGameFormError("게임 등록에 실패했습니다: " + error.message)
        }
      } else {
        setMessage({ type: "success", text: `'${trimmedName}' 게임이 성공적으로 등록되었습니다.` })
        setIsGameModalOpen(false)
        void fetchGames()
      }
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

      {/* 상단 관리자 타이틀 및 요청 대기열 링크 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-xl border border-line">
        <div>
          <h1 className="text-xl font-bold text-content">관리자 콘솔</h1>
          <p className="text-xs text-content-secondary mt-0.5">공식 게임 일정 및 마스터 게임 카탈로그를 관리합니다.</p>
        </div>
        <Link
          href="/admin/requests"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-line-control bg-surface text-content hover:bg-surface-2 self-start sm:self-center transition-colors"
        >
          <span>데이터 제안 대기열</span>
          <ArrowRight className="h-3.5 w-3.5 text-primary" />
        </Link>
      </div>

      <Tabs
        value={adminTab}
        onValueChange={(val) => setAdminTab(val as "schedules" | "games")}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 bg-surface-2 mb-6">
          <TabsTrigger
            value="schedules"
            onClick={() => setAdminTab("schedules")}
            className="data-[state=active]:bg-surface data-[state=active]:text-content"
          >
            공식 일정 관리 ({schedules.length})
          </TabsTrigger>
          <TabsTrigger
            value="games"
            onClick={() => setAdminTab("games")}
            className="data-[state=active]:bg-surface data-[state=active]:text-content"
          >
            등록된 게임 목록 ({games.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedules" className="space-y-6">
          {/* 헤더 컨트롤 바 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-4 rounded-xl border border-line">
            <div className="flex items-center gap-3">
              <Filter className="h-4 w-4 text-content-secondary" />
              <span className="text-sm font-medium">게임 필터:</span>
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

            <Button onClick={openAddModal} className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              새 일정 등록
            </Button>
          </div>

          {/* 일정 목록 카드 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-semibold">등록된 공식 일정</CardTitle>
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
                      const isVersion = schedule.schedule_type === "VERSION"
                      const isPickup = schedule.schedule_type === "PICKUP"
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
                              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-surface-2 border border-line text-content">
                                {gameName}
                              </span>
                              <span
                                className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                  isVersion
                                    ? "bg-primary/20 text-primary border border-primary/30"
                                    : isPickup
                                      ? "bg-warning/20 text-warning border border-warning/30"
                                      : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                }`}
                              >
                                {isVersion ? "버전" : isPickup ? "픽업" : "콘텐츠"}
                              </span>
                              <div className="font-medium text-sm text-content flex items-center gap-1.5 flex-wrap">
                                <ScheduleTitleBadges title={schedule.title} />
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-content-secondary">
                              <span>
                                {isSingleDateItem ? `${schedule.start_date} (단일)` : `${schedule.start_date} ~ ${schedule.end_date}`}
                              </span>
                              {schedule.memo && (
                                <span className="truncate max-w-xs text-gray-400">· {schedule.memo}</span>
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
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentSchedulePage((p) => Math.max(1, p - 1))}
                          disabled={currentSchedulePage === 1}
                          aria-label="이전 페이지"
                          className="h-8 px-2 text-xs border-line-control hover:bg-surface-2 disabled:opacity-40"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span className="ml-1">이전</span>
                        </Button>

                        <div className="flex items-center gap-1">
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
                                className={`h-8 w-8 p-0 text-xs ${
                                  p === currentSchedulePage
                                    ? "bg-primary text-white font-semibold hover:bg-primary-hover"
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
                          className="h-8 px-2 text-xs border-line-control hover:bg-surface-2 disabled:opacity-40"
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
            <Button onClick={handleOpenAddGame} className="flex items-center gap-1.5 h-9">
              <Plus className="h-4 w-4" />
              새 게임 등록
            </Button>
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
                              </div>
                              <p className="text-xs text-content-muted truncate max-w-md">
                                {game.default_icon_url || "기본 아이콘 미등록"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
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
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentGamePage((p) => Math.max(1, p - 1))}
                          disabled={currentGamePage === 1}
                          aria-label="이전 페이지"
                          className="h-8 px-2 text-xs border-line-control hover:bg-surface-2 disabled:opacity-40"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span className="ml-1">이전</span>
                        </Button>

                        <div className="flex items-center gap-1">
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
                                className={`h-8 w-8 p-0 text-xs ${
                                  p === currentGamePage
                                    ? "bg-primary text-white font-semibold hover:bg-primary-hover"
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
                          className="h-8 px-2 text-xs border-line-control hover:bg-surface-2 disabled:opacity-40"
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
      </Tabs>

      {/* 일정 등록 및 수정 모달 다이얼로그 */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingScheduleId ? "일정 수정" : isDuplicating ? "일정 복사" : "새 일정 등록"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <label htmlFor="schedule-game-select" className="block text-sm font-medium mb-1">게임 선택 *</label>
              <select
                id="schedule-game-select"
                className="w-full bg-surface-2 border border-line rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
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
                onChange={(e) => setScheduleType(e.target.value as "VERSION" | "PICKUP" | "CONTENTS")}
              >
                <option value="VERSION">버전 (VERSION)</option>
                <option value="PICKUP">픽업 (PICKUP)</option>
                <option value="CONTENTS">콘텐츠 (CONTENTS)</option>
              </select>
            </div>

            <div>
              <label htmlFor="schedule-title-input" className="block text-sm font-medium mb-1">타이틀 *</label>
              <Input
                id="schedule-title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
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
                onClick={() => setIsModalOpen(false)}
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
      <Dialog open={deletingSchedule !== null} onOpenChange={(open) => !open && setDeletingSchedule(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>일정 삭제 확인</DialogTitle>
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
                onClick={() => setDeletingSchedule(null)}
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
      <Dialog open={isGameModalOpen} onOpenChange={setIsGameModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingGame ? "게임 정보 수정" : "새 게임 등록"}
            </DialogTitle>
            <DialogDescription className="text-xs text-content-secondary">
              {editingGame
                ? "게임 명칭 및 기본 대표 아이콘 URL을 변경합니다."
                : "공식 마스터 카탈로그에 새로운 게임을 등록합니다."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveGame} className="space-y-4 pt-2">
            <div>
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
                className="bg-surface-2 border-line text-content"
              />
            </div>

            <div>
              <label htmlFor="game-form-icon-url" className="block text-sm font-medium mb-1">
                기본 아이콘 URL *
              </label>
              <Input
                id="game-form-icon-url"
                type="url"
                value={gameFormIconUrl}
                onChange={(e) => setGameFormIconUrl(e.target.value)}
                placeholder="https://... (웹 이미지 주소)"
                required
                className="bg-surface-2 border-line text-content"
              />
              <p className="text-[11px] text-content-muted mt-1">
                외부 웹 호스팅 또는 CDN의 이미지 절대 URL(http/https)을 입력하세요.
              </p>
            </div>

            {/* 실시간 아이콘 미리보기 */}
            {gameFormIconUrl.trim() && (
              <div className="flex items-center gap-3 p-2.5 rounded-lg border border-line bg-surface-2">
                <div className="h-10 w-10 rounded-lg overflow-hidden border border-line bg-surface flex items-center justify-center shrink-0">
                  <GameIcon
                    src={gameFormIconUrl.trim()}
                    alt=""
                    fallbackIcon={<span className="text-base">🎮</span>}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-content truncate">
                    {gameFormName.trim() || "아이콘 미리보기"}
                  </p>
                  <p className="text-[11px] text-content-muted truncate">
                    {gameFormIconUrl.trim()}
                  </p>
                </div>
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
              <Button type="submit" disabled={isSubmittingGame}>
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
      <Dialog open={deletingGame !== null} onOpenChange={(open) => !open && setDeletingGame(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>게임 삭제 확인</DialogTitle>
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
    </div>
  )
}
