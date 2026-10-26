"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState } from "@/components/ui/empty-state"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { GameSelectModal } from "@/components/game/game-select-modal"
import { RequestSubmissionModal } from "@/components/game/request-submission-modal"
import { downloadUserIcon, uploadUserIcon, deleteUserIcon } from "@/lib/storage-upload"
import { resizeImageToWebP } from "@/lib/image-resizer"
import { getKstToday } from "@/lib/dashboard-date"
import { GameIcon } from "@/components/ui/game-icon"
import { GamesPageSkeleton } from "@/components/ui/page-skeletons"
import { preloadImages } from "@/lib/icon-preload"
import { Calendar, Check, ChevronLeft, ChevronRight, Edit3, FileText, Gamepad2, ImagePlus, Loader2, Trash2, X } from "lucide-react"

const GAMES_PER_PAGE = 12

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

interface UserGameRow {
  id: string
  game_id: string
  custom_icon_path: string | null
  memo?: string | null
  games: {
    id: string
    name: string
    default_icon_url?: string | null
  } | null
}

interface GameScheduleRow {
  id: string
  game_id: string
  title: string
  schedule_type: "VERSION" | "PICKUP" | "CONTENTS"
  start_date: string
  end_date: string
  memo: string | null
}

export default function GamesPage() {
  const { user, role } = useAuth()
  const isAdmin = role === "admin" || user?.app_metadata?.role === "admin"
  const [userGames, setUserGames] = useState<UserGameRow[]>([])
  const [gameIcons, setGameIcons] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [uploadingGameId, setUploadingGameId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [editingGameId, setEditingGameId] = useState<string | null>(null)
  const [memoInput, setMemoInput] = useState("")
  const [isSavingMemo, setIsSavingMemo] = useState(false)

  const [selectedGame, setSelectedGame] = useState<{ id: string; name: string } | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [schedules, setSchedules] = useState<GameScheduleRow[]>([])
  const [isSchedulesLoading, setIsSchedulesLoading] = useState(false)

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const hasLoadedInitialRef = useRef(false)
  const userId = user?.id

  // 게임 이름 기준 가나다순 정렬
  const sortedUserGames = useMemo(() => {
    return [...userGames].sort((a, b) => {
      const nameA = a.games?.name || ""
      const nameB = b.games?.name || ""
      return nameA.localeCompare(nameB, "ko")
    })
  }, [userGames])

  const totalGamePages = Math.max(1, Math.ceil(sortedUserGames.length / GAMES_PER_PAGE))

  useEffect(() => {
    if (currentPage > totalGamePages) {
      setCurrentPage(totalGamePages)
    }
  }, [currentPage, totalGamePages])

  const paginatedUserGames = useMemo(() => {
    const start = (currentPage - 1) * GAMES_PER_PAGE
    return sortedUserGames.slice(start, start + GAMES_PER_PAGE)
  }, [sortedUserGames, currentPage])

  const loadGames = useCallback(async () => {
    if (!userId) return
    if (!hasLoadedInitialRef.current) {
      setIsLoading(true)
    }
    const { data } = await supabase
      .from("user_games")
      .select("id, game_id, custom_icon_path, memo, games(id, name, default_icon_url)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    const rows = (data as unknown as UserGameRow[]) || []
    setUserGames(rows)
    hasLoadedInitialRef.current = true
    setIsLoading(false)

    // 기본 아이콘 즉시 사전 로드
    const defaultIcons = rows.map((r) => r.games?.default_icon_url).filter(Boolean) as string[]
    preloadImages(defaultIcons)

    // 비동기로 유저 커스텀 아이콘 다운로드
    const iconMap: Record<string, string> = {}
    await Promise.all(
      rows.map(async (ug) => {
        try {
          const url = await downloadUserIcon(userId, ug.game_id)
          if (url) iconMap[ug.game_id] = url
        } catch {
          // 커스텀 아이콘 없으면 기본 아이콘 유지
        }
      })
    )
    setGameIcons(iconMap)
  }, [userId])

  useEffect(() => {
    void loadGames()
  }, [loadGames])

  useEffect(() => {
    if (!selectedGame || !isSheetOpen) return
    const fetchSchedules = async () => {
      setIsSchedulesLoading(true)
      const today = getKstToday()
      const { data } = await supabase
        .from("game_schedules")
        .select("*")
        .eq("game_id", selectedGame.id)
        .gte("end_date", today)
        .order("start_date", { ascending: true })
      if (data) {
        const sorted = (data as GameScheduleRow[]).sort((a, b) => {
          if (a.start_date !== b.start_date) return a.start_date.localeCompare(b.start_date)
          return a.end_date.localeCompare(b.end_date)
        })
        setSchedules(sorted)
      }
      setIsSchedulesLoading(false)
    }
    void fetchSchedules()
  }, [selectedGame, isSheetOpen])

  const handleIconUpload = async (gameId: string, file: File) => {
    if (!user) return
    setUploadingGameId(gameId)
    try {
      const webpBlob = await resizeImageToWebP(file)
      await uploadUserIcon(user.id, gameId, webpBlob)
      await supabase
        .from("user_games")
        .update({ custom_icon_path: `${user.id}/${gameId}.webp` })
        .eq("user_id", user.id)
        .eq("game_id", gameId)
      const newUrl = (await downloadUserIcon(user.id, gameId)) ?? URL.createObjectURL(webpBlob)
      setGameIcons((prev) => ({ ...prev, [gameId]: newUrl }))
      alert("게임 아이콘이 성공적으로 변경되었습니다.")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류"
      alert(`아이콘 업로드에 실패했습니다: ${message}`)
    } finally {
      setUploadingGameId(null)
    }
  }

  const handleUnsubscribe = async (userGameId: string, gameId: string, gameName: string) => {
    if (!confirm(`'${gameName}' 게임 구독을 해제하시겠습니까?\n\n(안내: 기존 지출 및 정기 구독 내역은 삭제되지 않고 안전하게 보존됩니다)`)) {
      return
    }
    try {
      const { error } = await supabase.from("user_games").delete().eq("id", userGameId)
      if (error) throw error
      try {
        if (user) await deleteUserIcon(user.id, gameId)
      } catch {
        // 아이콘 삭제 실패는 무시
      }
      await loadGames()
    } catch {
      alert("게임 구독 해제 중 오류가 발생했습니다.")
    }
  }

  const handleStartEditMemo = (ug: UserGameRow) => {
    setEditingGameId(ug.id)
    setMemoInput(ug.memo || "")
  }

  const handleCancelEditMemo = () => {
    setEditingGameId(null)
    setMemoInput("")
  }

  const handleSaveMemo = async (ug: UserGameRow) => {
    if (!user) return
    const trimmed = memoInput.trim()
    const nextMemo = trimmed ? trimmed : null
    setIsSavingMemo(true)
    try {
      const { error } = await supabase
        .from("user_games")
        .update({ memo: nextMemo })
        .eq("id", ug.id)
        .eq("user_id", user.id)

      if (error) throw error

      setUserGames((prev) =>
        prev.map((item) => (item.id === ug.id ? { ...item, memo: nextMemo } : item))
      )
      setEditingGameId(null)
      setMemoInput("")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류"
      alert(`메모 저장에 실패했습니다: ${message}`)
    } finally {
      setIsSavingMemo(false)
    }
  }

  if (isLoading && !hasLoadedInitialRef.current) return <GamesPageSkeleton />
  if (!user) return <div className="p-6 text-content">로그인이 필요합니다.</div>

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 상단 헤더 */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">게임</h1>
          <p className="mt-1 text-sm text-content-secondary">
            {isAdmin
              ? "내가 구독 중인 게임을 관리합니다."
              : "내가 구독 중인 게임을 관리하고, 새로운 게임 및 일정을 요청합니다."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GameSelectModal onGameAdded={() => void loadGames()} triggerText="구독 추가" className="h-10 bg-primary hover:bg-primary-hover text-primary-foreground font-medium" />
          {!isAdmin && <RequestSubmissionModal triggerText="+ 추가 요청" className="h-10 border-line text-content hover:bg-surface-2 font-medium" />}
        </div>
      </header>

      {/* 내 구독 게임 그리드 섹션 */}
      <Card className="border-line bg-surface">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg font-bold text-content">내 구독 게임</CardTitle>
            <p className="text-xs text-content-secondary mt-1">
              구독 중인 게임의 일정을 확인하거나 커스텀 아이콘을 등록할 수 있습니다.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
            {userGames.length}개 구독 중
          </span>
        </CardHeader>
        <CardContent className="pt-4">
          {userGames.length === 0 ? (
            <EmptyState
              message="구독 중인 게임이 없습니다."
              hint="상단의 '+ 구독 추가' 버튼으로 카탈로그에서 게임을 구독해보세요."
            />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedUserGames.map((ug) => {
                  const gameName = ug.games?.name || "알 수 없는 게임"
                  const iconSrc = gameIcons[ug.game_id] || ug.games?.default_icon_url || null
                  const isUploading = uploadingGameId === ug.game_id

                  return (
                    <div
                      key={ug.id}
                      className="flex flex-col justify-between p-4 rounded-lg border border-line bg-surface-2 hover:border-line-control transition-all"
                    >
                      <div>
                        <div className="flex items-start gap-3">
                        {/* 게임 아이콘 */}
                        <div className="relative w-14 h-14 rounded-lg border border-line bg-surface-3 flex items-center justify-center overflow-hidden shrink-0">
                          <GameIcon
                            src={iconSrc}
                            alt={gameName}
                            fallbackIcon={<Gamepad2 className="w-7 h-7 text-content-secondary" />}
                            priority
                          />
                          {isUploading && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" />
                            </div>
                          )}
                        </div>

                        {/* 게임 명칭 및 구독 정보 */}
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-content text-base truncate">{gameName}</h3>
                          <p className="text-xs text-content-secondary mt-0.5">공용 일정 연동 중</p>
                        </div>
                      </div>

                        {/* 게임별 상시 메모 영역 */}
                        <div className="mt-3 pt-3 border-t border-line/60">
                          {editingGameId === ug.id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={memoInput}
                                onChange={(e) => setMemoInput(e.target.value)}
                                placeholder="상시 메모를 입력하세요 (예: 육성 목표, 과금 계획 등)"
                                className="text-xs min-h-[64px] bg-surface border-line-control resize-none"
                                autoFocus
                                aria-label={`${gameName} 메모 입력`}
                              />
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs border-line-control hover:bg-surface-3 text-content"
                                  onClick={handleCancelEditMemo}
                                  disabled={isSavingMemo}
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  취소
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-7 px-2.5 text-xs bg-primary hover:bg-primary-hover text-primary-foreground font-medium"
                                  onClick={() => void handleSaveMemo(ug)}
                                  disabled={isSavingMemo}
                                >
                                  {isSavingMemo ? (
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  ) : (
                                    <Check className="w-3 h-3 mr-1" />
                                  )}
                                  저장
                                </Button>
                              </div>
                            </div>
                          ) : ug.memo ? (
                            <div className="rounded-md bg-surface/60 border border-line/70 p-2.5 relative">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-1.5 text-[11px] font-medium text-primary shrink-0">
                                  <FileText className="w-3 h-3" />
                                  <span>상시 메모</span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 px-1.5 text-[11px] text-content-secondary hover:text-content hover:bg-surface-3 -mr-1 -mt-0.5"
                                  onClick={() => handleStartEditMemo(ug)}
                                  title="메모 수정"
                                >
                                  <Edit3 className="w-3 h-3 mr-1" />
                                  메모 수정
                                </Button>
                              </div>
                              <p className="mt-1 text-xs text-content break-words whitespace-pre-wrap leading-relaxed">
                                {ug.memo}
                              </p>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleStartEditMemo(ug)}
                              className="w-full h-8 text-xs border-dashed border-line/80 text-content-muted hover:text-content-secondary hover:border-line-control hover:bg-surface/50 font-normal"
                            >
                              <FileText className="w-3.5 h-3.5 mr-1" />
                              메모 작성
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* 액션 버튼 그룹 */}
                      <div className="mt-4 pt-3 border-t border-line flex items-center justify-between gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs border-line-control hover:bg-surface-3 text-content"
                          onClick={() => {
                            setSelectedGame({ id: ug.game_id, name: gameName })
                            setIsSheetOpen(true)
                          }}
                        >
                          <Calendar className="w-3.5 h-3.5 mr-1 text-primary" />
                          일정 보기
                        </Button>

                        {/* 커스텀 아이콘 등록/변경 */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs border-line-control hover:bg-surface-3 text-content px-2.5"
                          disabled={isUploading}
                          onClick={() => fileInputRefs.current[ug.game_id]?.click()}
                          title="아이콘 등록/변경"
                        >
                          <ImagePlus className="w-3.5 h-3.5" />
                        </Button>
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/jpg, image/webp"
                          className="hidden"
                          ref={(el) => {
                            fileInputRefs.current[ug.game_id] = el
                          }}
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              void handleIconUpload(ug.game_id, e.target.files[0])
                            }
                          }}
                        />

                        {/* 구독 해제 버튼 */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs border-danger/40 text-danger hover:bg-danger/10 px-2.5"
                          onClick={() => void handleUnsubscribe(ug.id, ug.game_id, gameName)}
                          title="구독 해제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* 페이지네이션 바 */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-line text-xs text-content-secondary mt-4">
                <div data-testid="pagination-info">
                  총 <span className="font-semibold text-content">{sortedUserGames.length.toLocaleString()}</span>개 중{" "}
                  <span className="font-semibold text-content">
                    {(currentPage - 1) * GAMES_PER_PAGE + 1} - {Math.min(currentPage * GAMES_PER_PAGE, sortedUserGames.length)}
                  </span>
                  개 표시 (페이지 <span className="font-semibold text-content">{currentPage}</span> / {totalGamePages})
                </div>

                {totalGamePages > 1 && (
                  <div className="flex items-center gap-1 flex-wrap justify-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      aria-label="이전 페이지"
                      className="h-8 px-2 text-xs border-line-control hover:bg-surface-2 disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline ml-1">이전</span>
                    </Button>

                    <div className="flex items-center gap-1 flex-wrap justify-center">
                      {getPaginationRange(currentPage, totalGamePages).map((p, idx) =>
                        p === "..." ? (
                          <span key={`ellipsis-${idx}`} className="px-1.5 py-1 text-content-muted select-none">
                            ...
                          </span>
                        ) : (
                          <Button
                            key={`page-${p}`}
                            size="sm"
                            variant={p === currentPage ? "default" : "outline"}
                            onClick={() => setCurrentPage(p as number)}
                            aria-label={`${p} 페이지로 이동`}
                            aria-current={p === currentPage ? "page" : undefined}
                            className={`h-8 w-8 p-0 text-xs ${
                              p === currentPage
                                ? "bg-primary text-primary-foreground font-semibold hover:bg-primary-hover"
                                : "bg-surface border-line-control text-content hover:bg-surface-2"
                            }`}
                          >
                            {p}
                          </Button>
                        )
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage((p) => Math.min(totalGamePages, p + 1))}
                      disabled={currentPage === totalGamePages}
                      aria-label="다음 페이지"
                      className="h-8 px-2 text-xs border-line-control hover:bg-surface-2 disabled:opacity-40"
                    >
                      <span className="hidden sm:inline mr-1">다음</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>



      {/* 공식 일정 중앙 팝업 다이얼로그 */}
      <Dialog
        open={isSheetOpen}
        onOpenChange={(open) => {
          setIsSheetOpen(open)
          if (!open) setSelectedGame(null)
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-surface text-content border-line">
          <DialogHeader>
            <DialogTitle className="text-content">{selectedGame?.name || "게임"} 공식 일정</DialogTitle>
            <DialogDescription className="text-content-secondary">
              관리자가 등록한 공식 픽업, 버전 및 콘텐츠 업데이트 일정입니다.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            {isSchedulesLoading ? (
              <p className="text-sm text-content-secondary">불러오는 중...</p>
            ) : schedules.length === 0 ? (
              <p className="text-sm text-content-secondary py-8 text-center">등록된 공식 일정이 없습니다.</p>
            ) : (
              schedules.map((sch) => {
                const isSingle = sch.start_date === sch.end_date
                return (
                  <div key={sch.id} className="p-3 border border-line rounded-lg bg-surface-2 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm text-content">{sch.title}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium ${
                          sch.schedule_type === "VERSION"
                            ? "bg-primary/15 text-primary"
                            : sch.schedule_type === "PICKUP"
                              ? "bg-warning/15 text-warning"
                              : "bg-purple-500/15 text-purple-700 dark:text-purple-300"
                        }`}
                      >
                        {sch.schedule_type === "VERSION" ? "버전" : sch.schedule_type === "PICKUP" ? "픽업" : "콘텐츠"}
                      </span>
                    </div>
                    <p className="text-xs text-content-secondary">
                      {isSingle ? `${sch.start_date} (단일)` : `${sch.start_date} ~ ${sch.end_date}`}
                    </p>
                    {sch.memo && <p className="text-xs text-content-muted mt-1">{sch.memo}</p>}
                  </div>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
