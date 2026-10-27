"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase/client"
import { Clock, RefreshCw } from "lucide-react"

interface GameRequestItem {
  id: string
  name: string
  memo: string | null
  request_status: "PENDING" | "APPROVED" | "REJECTED"
  admin_memo: string | null
  created_at: string
}

interface ScheduleRequestItem {
  id: string
  game_id: string
  target_schedule_id: string | null
  title: string
  schedule_type: "VERSION" | "PICKUP"
  start_date: string
  end_date: string
  memo: string | null
  request_status: "PENDING" | "APPROVED" | "REJECTED"
  admin_memo: string | null
  created_at: string
  games: { name: string } | null
}

const statusBadgeStyles = {
  PENDING: "bg-warning/15 text-warning border-warning/30",
  APPROVED: "bg-success/15 text-success border-success/30",
  REJECTED: "bg-danger/15 text-danger border-danger/30",
}

const statusText = {
  PENDING: "검토 대기",
  APPROVED: "승인 완료",
  REJECTED: "반려됨",
}

export function UserRequestsCard() {
  const { user } = useAuth()
  const [gameRequests, setGameRequests] = useState<GameRequestItem[]>([])
  const [scheduleRequests, setScheduleRequests] = useState<ScheduleRequestItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<"ALL" | "GAME" | "SCHEDULE">("ALL")

  const loadRequests = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    setError(null)

    try {
      const [gRes, sRes] = await Promise.all([
        supabase
          .from("game_requests")
          .select("id, name, memo, request_status, admin_memo, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("schedule_requests")
          .select("id, game_id, target_schedule_id, title, schedule_type, start_date, end_date, memo, request_status, admin_memo, created_at, games(name)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ])

      if (gRes.error || sRes.error) {
        setError("요청 내역을 불러오지 못했습니다.")
      } else {
        setGameRequests((gRes.data as unknown as GameRequestItem[]) || [])
        setScheduleRequests((sRes.data as unknown as ScheduleRequestItem[]) || [])
      }
    } catch {
      setError("요청 내역을 불러오는 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    void loadRequests()
  }, [loadRequests])

  const totalCount = gameRequests.length + scheduleRequests.length

  return (
    <Card className="border-line bg-surface text-content">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-lg font-bold text-content">내 요청 내역</CardTitle>
          <p className="text-xs text-content-secondary mt-1">
            관리자에게 제안한 게임 및 일정 추가/수정 요청의 처리 상태입니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void loadRequests()}
            disabled={isLoading}
            className="text-content-secondary hover:text-content h-8 px-2"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 필터 버튼 */}
        <div className="flex gap-2 pb-2 border-b border-line">
          <Button
            size="sm"
            variant={filter === "ALL" ? "default" : "outline"}
            onClick={() => setFilter("ALL")}
            className={`text-xs h-7 ${filter === "ALL" ? "bg-primary text-primary-foreground" : "border-line text-content"}`}
          >
            전체 ({totalCount})
          </Button>
          <Button
            size="sm"
            variant={filter === "GAME" ? "default" : "outline"}
            onClick={() => setFilter("GAME")}
            className={`text-xs h-7 ${filter === "GAME" ? "bg-primary text-primary-foreground" : "border-line text-content"}`}
          >
            게임 요청 ({gameRequests.length})
          </Button>
          <Button
            size="sm"
            variant={filter === "SCHEDULE" ? "default" : "outline"}
            onClick={() => setFilter("SCHEDULE")}
            className={`text-xs h-7 ${filter === "SCHEDULE" ? "bg-primary text-primary-foreground" : "border-line text-content"}`}
          >
            일정 요청 ({scheduleRequests.length})
          </Button>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        {isLoading ? (
          <p className="text-sm text-content-secondary py-4 text-center">요청 내역을 불러오는 중...</p>
        ) : totalCount === 0 ? (
          <p className="text-sm text-content-secondary py-8 text-center">제출한 요청 내역이 없습니다.</p>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {/* 게임 요청 목록 */}
            {(filter === "ALL" || filter === "GAME") &&
              gameRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3.5 rounded-lg border border-line bg-surface-2 space-y-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 whitespace-nowrap text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        게임 요청
                      </span>
                      <h4 className="font-semibold text-content text-base">{req.name}</h4>
                    </div>
                    <span
                      className={`shrink-0 whitespace-nowrap text-xs font-medium px-2 py-0.5 rounded border ${
                        statusBadgeStyles[req.request_status]
                      }`}
                    >
                      {statusText[req.request_status]}
                    </span>
                  </div>

                  {req.memo && <p className="text-xs text-content-secondary">메모: {req.memo}</p>}

                  {/* 관리자 메모 (반려 사유 등) */}
                  {req.admin_memo && (
                    <div className="p-2.5 rounded bg-surface-3 border border-line text-xs space-y-1">
                      <span className="font-semibold text-content block">관리자 피드백:</span>
                      <p className="text-content-secondary whitespace-pre-wrap">{req.admin_memo}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-1 text-[11px] text-content-muted">
                    <Clock className="w-3 h-3" />
                    <span>요청일: {new Date(req.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}

            {/* 일정 요청 목록 */}
            {(filter === "ALL" || filter === "SCHEDULE") &&
              scheduleRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3.5 rounded-lg border border-line bg-surface-2 space-y-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 whitespace-nowrap text-xs font-semibold px-2 py-0.5 rounded bg-info/10 text-info border border-info/20">
                        일정 {req.target_schedule_id ? "수정" : "추가"}
                      </span>
                      <h4 className="font-semibold text-content text-base">{req.title}</h4>
                    </div>
                    <span
                      className={`shrink-0 whitespace-nowrap text-xs font-medium px-2 py-0.5 rounded border ${
                        statusBadgeStyles[req.request_status]
                      }`}
                    >
                      {statusText[req.request_status]}
                    </span>
                  </div>

                  <p className="text-xs text-content-secondary">
                    대상 게임: <span className="font-medium text-content">{req.games?.name || "알 수 없음"}</span> ·{" "}
                    {req.schedule_type === "VERSION" ? "버전" : "픽업"} · {req.start_date} ~ {req.end_date}
                  </p>

                  {req.memo && <p className="text-xs text-content-secondary">메모: {req.memo}</p>}

                  {/* 관리자 메모 (반려 사유 등) */}
                  {req.admin_memo && (
                    <div className="p-2.5 rounded bg-surface-3 border border-line text-xs space-y-1">
                      <span className="font-semibold text-content block">관리자 피드백:</span>
                      <p className="text-content-secondary whitespace-pre-wrap">{req.admin_memo}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-1 text-[11px] text-content-muted">
                    <Clock className="w-3 h-3" />
                    <span>요청일: {new Date(req.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

