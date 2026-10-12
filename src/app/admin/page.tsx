"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, Calendar, Filter, Loader2, AlertCircle } from "lucide-react"

interface GameOption {
  id: string
  name: string
}

interface ScheduleItem {
  id: string
  game_id: string
  schedule_type: "VERSION" | "PICKUP"
  title: string
  start_date: string
  end_date: string
  memo: string | null
  games?: { id?: string; name?: string } | null
}

export default function AdminPage() {
  const { user, role, isLoading: authLoading } = useAuth()
  const [games, setGames] = useState<GameOption[]>([])
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false)
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>("")

  // 모달 상태 (추가 및 수정 공용)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null)
  const [gameId, setGameId] = useState("")
  const [scheduleType, setScheduleType] = useState<"VERSION" | "PICKUP">("VERSION")
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
    const { data } = await supabase.from("games").select("id, name").order("name")
    if (data) setGames(data as GameOption[])
  }, [])

  const fetchSchedules = useCallback(async () => {
    setIsLoadingSchedules(true)
    const { data, error } = await supabase
      .from("game_schedules")
      .select("id, game_id, schedule_type, title, start_date, end_date, memo, games(id, name)")
      .order("start_date", { ascending: false })

    if (error) {
      setMessage({ type: "error", text: "일정 목록을 불러오지 못했습니다: " + error.message })
    } else if (data) {
      setSchedules(data as unknown as ScheduleItem[])
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
    setGameId(games.length > 0 ? games[0].id : "")
    setScheduleType("VERSION")
    setTitle("")
    setStartDate("")
    setEndDate("")
    setMemo("")
    setFormError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (schedule: ScheduleItem) => {
    setEditingScheduleId(schedule.id)
    setGameId(schedule.game_id)
    setScheduleType(schedule.schedule_type)
    setTitle(schedule.title)
    setStartDate(schedule.start_date)
    setEndDate(schedule.end_date)
    setMemo(schedule.memo || "")
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!gameId || !title.trim() || !startDate || !endDate) {
      setFormError("필수 항목(게임, 타이틀, 시작일, 종료일)을 모두 입력해주세요.")
      return
    }

    if (startDate > endDate) {
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
          end_date: endDate,
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
        end_date: endDate,
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

  const filteredSchedules = schedules.filter((schedule) => {
    if (!selectedGameFilter) return true
    return schedule.game_id === selectedGameFilter
  })

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

      {/* 헤더 컨트롤 바 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-4 rounded-xl border border-line">
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-content-secondary" />
          <span className="text-sm font-medium">게임 필터:</span>
          <select
            className="bg-surface-2 border border-line rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={selectedGameFilter}
            onChange={(e) => setSelectedGameFilter(e.target.value)}
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
            <div className="divide-y divide-line">
              {filteredSchedules.map((schedule) => {
                const gameName = schedule.games?.name || games.find((g) => g.id === schedule.game_id)?.name || "게임"
                const isVersion = schedule.schedule_type === "VERSION"
                return (
                  <div
                    key={schedule.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-2/40 px-2 rounded-lg transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-surface-2 border border-line text-content">
                          {gameName}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            isVersion
                              ? "bg-primary/20 text-primary border border-primary/30"
                              : "bg-warning/20 text-warning border border-warning/30"
                          }`}
                        >
                          {isVersion ? "버전" : "픽업"}
                        </span>
                        <h3 className="font-medium text-sm text-content truncate">{schedule.title}</h3>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-content-secondary">
                        <span>
                          {schedule.start_date} ~ {schedule.end_date}
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
          )}
        </CardContent>
      </Card>

      {/* 일정 등록 및 수정 모달 다이얼로그 */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingScheduleId ? "일정 수정" : "새 일정 등록"}
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
                onChange={(e) => setScheduleType(e.target.value as "VERSION" | "PICKUP")}
              >
                <option value="VERSION">버전 (VERSION)</option>
                <option value="PICKUP">픽업 (PICKUP)</option>
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
    </div>
  )
}
