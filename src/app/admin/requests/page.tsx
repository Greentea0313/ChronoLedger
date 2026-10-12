"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { useOnlineStatus } from "@/lib/use-online-status"
import { OFFLINE_WRITE_MESSAGE, isOffline } from "@/lib/offline-guard"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, XCircle, Loader2, AlertCircle, Plus } from "lucide-react"

type GameRequest = {
  id: string
  name: string
  memo: string | null
  request_status: string
  created_at: string
}

type ScheduleRequest = {
  id: string
  game_id: string
  target_schedule_id?: string | null
  title: string
  schedule_type: "VERSION" | "PICKUP" | "CONTENTS"
  start_date: string
  end_date: string
  memo: string | null
  admin_memo?: string | null
  request_status: string
  created_at: string
  games?: { name: string } | null
}

export default function AdminRequestsPage() {
  const { user, role, isLoading: authLoading } = useAuth()
  const { replace } = useRouter()

  const [gameRequests, setGameRequests] = useState<GameRequest[]>([])
  const [scheduleRequests, setScheduleRequests] = useState<ScheduleRequest[]>([])
  const [isDataLoading, setIsDataLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const isOnline = useOnlineStatus()
  const [defaultIconUrls, setDefaultIconUrls] = useState<Record<string, string>>({})

  // 관리자 직접 게임 등록 상태
  const [directGameName, setDirectGameName] = useState("")
  const [directGameIconUrl, setDirectGameIconUrl] = useState("")
  const [isCreatingGame, setIsCreatingGame] = useState(false)
  const [directCreateError, setDirectCreateError] = useState<string | null>(null)
  const [directCreateSuccess, setDirectCreateSuccess] = useState<string | null>(null)

  const isAdmin = role === "admin" || user?.app_metadata?.role === "admin"

  const fetchRequests = useCallback(async () => {
    setIsDataLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      // 1. 대기(PENDING) 상태인 게임 추가 요청 가져오기
      const { data: gData, error: gError } = await supabase
        .from("game_requests")
        .select("*")
        .eq("request_status", "PENDING")
        .order("created_at", { ascending: true })

      if (gError) throw gError
      setGameRequests(gData || [])

      // 2. 대기(PENDING) 상태인 일정 추가 요청 가져오기 (게임 이름 조인)
      const { data: sData, error: sError } = await supabase
        .from("schedule_requests")
        .select("*, games(name)")
        .eq("request_status", "PENDING")
        .order("created_at", { ascending: true })

      if (sError) throw sError
      setScheduleRequests(sData || [])

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류"
      setError(`데이터를 불러오는 중 오류가 발생했습니다: ${message}`)
    } finally {
      setIsDataLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      replace("/auth")
      return
    }
    if (isAdmin) {
      void fetchRequests()
    }
  }, [authLoading, fetchRequests, isAdmin, replace, user])

  // 승인/반려 공통 처리 함수
  const processRequest = async (
    type: "game" | "schedule",
    id: string,
    isApprove: boolean,
    defaultIconUrl?: string,
  ) => {
    if (isOffline()) {
      setError(OFFLINE_WRITE_MESSAGE)
      return
    }
    setProcessingId(id)
    setError(null)
    setSuccessMessage(null)
    try {
      let iconUrl: string | undefined
      if (type === "game" && isApprove) {
        iconUrl = defaultIconUrl?.trim()
        if (!iconUrl) {
          throw new Error("게임 기본 아이콘 URL을 입력해 주세요.")
        }

        let parsedUrl: URL
        try {
          parsedUrl = new URL(iconUrl)
        } catch {
          throw new Error("게임 기본 아이콘 URL은 http 또는 https 주소여야 합니다.")
        }
        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
          throw new Error("게임 기본 아이콘 URL은 http 또는 https 주소여야 합니다.")
        }
      }

      if (type === "game") {
        if (isApprove) {
          const { error: rpcError } = await supabase.rpc("approve_game_request", {
            p_request_id: id,
            p_default_icon_url: iconUrl!,
          })

          if (rpcError) {
            // 폴백: games 테이블 직접 삽입 및 game_requests 상태 갱신
            const targetReq = gameRequests.find((r) => r.id === id)
            const gameName = targetReq?.name?.trim()
            if (!gameName) throw rpcError

            const { data: newGame, error: insertError } = await supabase
              .from("games")
              .insert({
                name: gameName,
                default_icon_url: iconUrl!,
                status: "APPROVED",
                created_by: user?.id ?? null,
              })
              .select("id")
              .single()

            if (insertError) throw rpcError

            const { error: updateError } = await supabase
              .from("game_requests")
              .update({
                request_status: "APPROVED",
                approved_game_id: newGame?.id ?? null,
              })
              .eq("id", id)

            if (updateError) throw rpcError
          }
        } else {
          const { error: rpcError } = await supabase.rpc("reject_game_request", {
            p_request_id: id,
            p_admin_memo: null,
          })

          if (rpcError) {
            // 폴백: game_requests 테이블 직접 반려 갱신
            const { error: tableError } = await supabase
              .from("game_requests")
              .update({
                request_status: "REJECTED",
                admin_memo: null,
              })
              .eq("id", id)

            if (tableError) throw rpcError
          }
        }
      } else {
        // type === "schedule"
        if (isApprove) {
          const { error: rpcError } = await supabase.rpc("approve_schedule_request", {
            p_request_id: id,
          })

          if (rpcError) {
            // 폴백: game_schedules 테이블 직접 삽입/수정 및 schedule_requests 상태 갱신
            const targetReq = scheduleRequests.find((r) => r.id === id)
            if (!targetReq) throw rpcError

            if (targetReq.target_schedule_id) {
              const { error: updateSchedErr } = await supabase
                .from("game_schedules")
                .update({
                  title: targetReq.title,
                  schedule_type: targetReq.schedule_type,
                  start_date: targetReq.start_date,
                  end_date: targetReq.end_date,
                  memo: targetReq.memo,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", targetReq.target_schedule_id)
                .eq("game_id", targetReq.game_id)

              if (updateSchedErr) throw rpcError
            } else {
              const { error: insertSchedErr } = await supabase
                .from("game_schedules")
                .insert({
                  game_id: targetReq.game_id,
                  title: targetReq.title,
                  schedule_type: targetReq.schedule_type,
                  start_date: targetReq.start_date,
                  end_date: targetReq.end_date,
                  memo: targetReq.memo,
                })

              if (insertSchedErr) throw rpcError
            }

            const { error: updateReqErr } = await supabase
              .from("schedule_requests")
              .update({ request_status: "APPROVED" })
              .eq("id", id)

            if (updateReqErr) throw rpcError
          }
        } else {
          const { error: rpcError } = await supabase.rpc("reject_schedule_request", {
            p_request_id: id,
            p_admin_memo: null,
          })

          if (rpcError) {
            // 폴백: schedule_requests 테이블 직접 반려 갱신
            const { error: tableError } = await supabase
              .from("schedule_requests")
              .update({
                request_status: "REJECTED",
                admin_memo: null,
              })
              .eq("id", id)

            if (tableError) throw rpcError
          }
        }
      }

      // 처리 완료된 항목을 화면 목록에서 즉시 제거
      if (type === "game") {
        setGameRequests(prev => prev.filter(req => req.id !== id))
      } else {
        setScheduleRequests(prev => prev.filter(req => req.id !== id))
      }

      setSuccessMessage(
        type === "game"
          ? (isApprove ? "게임 추가 요청을 승인했습니다." : "게임 추가 요청을 반려했습니다.")
          : (isApprove ? "일정 추가 요청을 승인했습니다." : "일정 추가 요청을 반려했습니다.")
      )
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류"
      setError(`처리 중 오류가 발생했습니다: ${message}`)
    } finally {
      setProcessingId(null)
    }
  }

  const handleDirectCreateGame = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (isOffline()) {
      setDirectCreateError(OFFLINE_WRITE_MESSAGE)
      return
    }

    const trimmedName = directGameName.trim()
    const trimmedIconUrl = directGameIconUrl.trim()

    if (!trimmedName) {
      setDirectCreateError("게임 이름을 입력해 주세요.")
      return
    }

    if (!trimmedIconUrl) {
      setDirectCreateError("게임 기본 아이콘 URL을 입력해 주세요.")
      return
    }

    try {
      const parsedUrl = new URL(trimmedIconUrl)
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        setDirectCreateError("게임 기본 아이콘 URL은 http 또는 https 주소여야 합니다.")
        return
      }
    } catch {
      setDirectCreateError("게임 기본 아이콘 URL은 올바른 http 또는 https 주소여야 합니다.")
      return
    }

    setIsCreatingGame(true)
    setDirectCreateError(null)
    setDirectCreateSuccess(null)

    try {
      const { error: rpcError } = await supabase.rpc("admin_create_game", {
        p_name: trimmedName,
        p_default_icon_url: trimmedIconUrl,
      })

      if (rpcError) {
        const { error: insertError } = await supabase.from("games").insert({
          name: trimmedName,
          default_icon_url: trimmedIconUrl,
          status: "APPROVED",
          created_by: user?.id ?? null,
        })

        if (insertError) {
          if (
            insertError.code === "23505" ||
            insertError.message?.includes("unique") ||
            insertError.message?.includes("games_name_key")
          ) {
            throw new Error("이미 등록된 게임 이름입니다.")
          }
          throw insertError
        }
      }

      setDirectCreateSuccess(`'${trimmedName}' 게임이 성공적으로 등록되었습니다.`)
      setDirectGameName("")
      setDirectGameIconUrl("")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류"
      setDirectCreateError(message.startsWith("게임 등록 실패") ? message : `게임 등록 실패: ${message}`)
    } finally {
      setIsCreatingGame(false)
    }
  }

  if (authLoading) {
    return <div className="p-6 text-content">데이터 불러오는 중...</div>
  }
  if (!user) return null
  if (!isAdmin) {
    return <div role="alert" className="p-6 text-danger">관리자 권한이 필요합니다.</div>
  }
  if (isDataLoading) {
    return <div className="p-6 text-content">데이터 불러오는 중...</div>
  }

  return (
    <div className="space-y-6">
      <div className="bg-surface p-4 rounded-xl border border-line">
        <h2 className="text-lg font-semibold text-content">데이터 제안 대기열</h2>
        <p className="text-sm text-content-secondary mt-1">유저들이 건의한 게임 및 일정 추가 요청을 검토하고 승인합니다.</p>
      </div>

      {error && (
        <div className="p-4 bg-danger/15 text-danger rounded-md flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" /> {error}
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-success/15 text-success rounded-md flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" /> {successMessage}
        </div>
      )}

      <Tabs defaultValue="games" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-surface-2 mb-6">
          <TabsTrigger value="games" className="data-[state=active]:bg-surface-3 data-[state=active]:text-content">
            게임 요청 ({gameRequests.length})
          </TabsTrigger>
          <TabsTrigger value="schedules" className="data-[state=active]:bg-surface-3 data-[state=active]:text-content">
            일정 요청 ({scheduleRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="games" className="space-y-6">
          {/* 관리자 직접 게임 추가 카드 */}
          <Card className="bg-surface border-line">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base font-bold text-content flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" /> 관리자 직접 게임 추가
              </CardTitle>
              <p className="text-xs text-content-secondary mt-0.5">
                유저 건의 승인 절차 없이 관리자가 즉시 공식 게임 마스터 카탈로그에 새 게임을 등록합니다.
              </p>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <form onSubmit={handleDirectCreateGame} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="direct-game-name" className="text-xs font-medium text-content-secondary block mb-1">
                      게임 이름 <span className="text-danger">*</span>
                    </label>
                    <Input
                      id="direct-game-name"
                      type="text"
                      placeholder="게임 이름 (예: 원신, 붕괴: 스타레일)"
                      value={directGameName}
                      onChange={(e) => {
                        setDirectGameName(e.target.value)
                        if (directCreateError) setDirectCreateError(null)
                        if (directCreateSuccess) setDirectCreateSuccess(null)
                      }}
                      disabled={isCreatingGame || !isOnline}
                      className="border-line bg-surface-2 text-content"
                    />
                  </div>
                  <div>
                    <label htmlFor="direct-game-icon-url" className="text-xs font-medium text-content-secondary block mb-1">
                      기본 아이콘 URL <span className="text-danger">*</span>
                    </label>
                    <Input
                      id="direct-game-icon-url"
                      type="url"
                      placeholder="기본 아이콘 이미지 URL (https://...)"
                      value={directGameIconUrl}
                      onChange={(e) => {
                        setDirectGameIconUrl(e.target.value)
                        if (directCreateError) setDirectCreateError(null)
                        if (directCreateSuccess) setDirectCreateSuccess(null)
                      }}
                      disabled={isCreatingGame || !isOnline}
                      className="border-line bg-surface-2 text-content"
                    />
                  </div>
                </div>

                {directCreateError && (
                  <p className="text-xs text-danger font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {directCreateError}
                  </p>
                )}

                {directCreateSuccess && (
                  <p className="text-xs text-success font-medium flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" /> {directCreateSuccess}
                  </p>
                )}

                <div className="flex justify-end pt-1">
                  <Button
                    type="submit"
                    className="bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm h-9 px-4 font-medium"
                    disabled={isCreatingGame || !isOnline}
                  >
                    {isCreatingGame ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" /> 등록 중...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-1" /> 게임 등록
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-content">
              유저 추가 건의 대기열 ({gameRequests.length})
            </h3>
            {gameRequests.length === 0 ? (
              <p className="text-content-secondary text-center py-8 bg-surface-2/50 rounded-lg">대기 중인 게임 요청이 없습니다.</p>
            ) : (
              gameRequests.map(req => (
              <Card key={req.id} className="bg-surface border-line">
                <CardContent className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg text-content">{req.name}</h3>
                    </div>
                    {req.memo && <p className="text-sm text-content-secondary mt-2">메모: {req.memo}</p>}
                    <p className="text-xs text-content-secondary/70 mt-1">요청일: {new Date(req.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex flex-col gap-2 w-full md:w-auto mt-2 md:mt-0">
                    <Input
                      type="url"
                      aria-label={`${req.name} 기본 아이콘 URL`}
                      placeholder="기본 아이콘 URL (https://...)"
                      value={defaultIconUrls[req.id] ?? ""}
                      onChange={(event) =>
                        setDefaultIconUrls((current) => ({
                          ...current,
                          [req.id]: event.target.value,
                        }))
                      }
                      disabled={processingId === req.id || !isOnline}
                      className="border-line bg-surface-2 text-content"
                    />
                    <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 md:flex-none border-success/60 text-success hover:bg-success/15"
                      onClick={() => processRequest("game", req.id, true, defaultIconUrls[req.id])}
                      disabled={processingId === req.id || !isOnline}
                    >
                      {processingId === req.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                      승인
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 md:flex-none border-danger/60 text-danger hover:bg-danger/15"
                      onClick={() => processRequest("game", req.id, false)}
                      disabled={processingId === req.id || !isOnline}
                    >
                      {processingId === req.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />}
                      반려
                    </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          </div>
        </TabsContent>

        <TabsContent value="schedules" className="space-y-4">
          {scheduleRequests.length === 0 ? (
            <p className="text-content-secondary text-center py-8 bg-surface-2/50 rounded-lg">대기 중인 일정 요청이 없습니다.</p>
          ) : (
            scheduleRequests.map(req => (
              <Card key={req.id} className="bg-surface border-line">
                <CardContent className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-primary/15 text-primary text-xs px-2 py-1 rounded">
                        {req.schedule_type === "VERSION" ? "버전" : req.schedule_type === "CONTENTS" ? "콘텐츠" : "픽업"}
                      </span>
                      <h3 className="font-bold text-lg text-content">{req.title}</h3>
                    </div>
                    <p className="text-sm text-content-secondary">대상 게임: <span className="font-semibold text-content">{req.games?.name || '알 수 없음'}</span></p>
                    <p className="text-sm text-content-secondary mt-1">기간: {req.start_date || '미정'} ~ {req.end_date || '미정'}</p>
                    {req.memo && <p className="text-sm text-content-secondary mt-2">메모: {req.memo}</p>}
                  </div>
                  <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                    <Button
                      variant="outline"
                      className="flex-1 md:flex-none border-success/60 text-success hover:bg-success/15"
                      onClick={() => processRequest("schedule", req.id, true)}
                      disabled={processingId === req.id || !isOnline}
                    >
                      {processingId === req.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                      승인
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 md:flex-none border-danger/60 text-danger hover:bg-danger/15"
                      onClick={() => processRequest("schedule", req.id, false)}
                      disabled={processingId === req.id || !isOnline}
                    >
                      {processingId === req.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />}
                      반려
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}