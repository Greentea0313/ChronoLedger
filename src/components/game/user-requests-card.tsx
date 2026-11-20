"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase/client"
import { formatSchedulePeriod } from "@/lib/schedule-time"
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
  schedule_type: "VERSION" | "PICKUP" | "CONTENTS" | "BROADCAST"
  is_rerun?: boolean
  start_date: string
  end_date: string
  start_at?: string | null
  end_at?: string | null
  start_at_estimated?: boolean | null
  end_at_estimated?: boolean | null
  memo: string | null
  request_status: "PENDING" | "APPROVED" | "REJECTED"
  admin_memo: string | null
  created_at: string
  games: { name: string } | null
}

interface FeedbackRequestItem {
  id: string
  category: "기능 제안" | "오류 신고" | "기타"
  title: string
  content: string
  request_status: "PENDING" | "ANSWERED" | "CLOSED"
  admin_answer: string | null
  created_at: string
}

/** `feedback_requests` not migrated yet (R84): behave as an empty list instead of failing the card. */
function isMissingFeedbackTable(error: { code?: string } | null | undefined): boolean {
  const code = error?.code ?? ""
  return code === "42P01" || code === "PGRST205"
}

const SCHEDULE_REQUEST_COLUMNS_WITHOUT_RERUN = "id, game_id, target_schedule_id, title, schedule_type, start_date, end_date, memo, request_status, admin_memo, created_at, games(name)"
const SCHEDULE_REQUEST_COLUMNS_WITH_RERUN = SCHEDULE_REQUEST_COLUMNS_WITHOUT_RERUN.replace("schedule_type, ", "schedule_type, is_rerun, ")
// R85: optional KST times; the migration may not be applied yet, so the widest column set is tried first.
const SCHEDULE_REQUEST_COLUMNS = SCHEDULE_REQUEST_COLUMNS_WITH_RERUN.replace("end_date, ", "end_date, start_at, end_at, start_at_estimated, end_at_estimated, ")

type ScheduleRequestResult = { data: unknown; error: { code?: string; message?: string } | null }

// Tolerates an unapplied R33 migration: retries without the missing is_rerun column.
async function fetchScheduleRequests(userId: string): Promise<ScheduleRequestResult> {
  const query = (columns: string): PromiseLike<ScheduleRequestResult> =>
    supabase.from("schedule_requests").select(columns).eq("user_id", userId).order("created_at", { ascending: false })
  const first = await query(SCHEDULE_REQUEST_COLUMNS)
  if (!first.error || !isMissingRerunColumnError(first.error)) return first
  // Without the R85 columns but with is_rerun (R33), then without both.
  const withRerun = await query(SCHEDULE_REQUEST_COLUMNS_WITH_RERUN)
  if (!withRerun.error || !isMissingRerunColumnError(withRerun.error)) return withRerun
  return query(SCHEDULE_REQUEST_COLUMNS_WITHOUT_RERUN)
}

function isMissingRerunColumnError(error: { code?: string; message?: string }): boolean {
  return error.code === "42703" || error.code === "PGRST204" || (error.message ?? "").includes("is_rerun")
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

const feedbackStatusStyles = {
  PENDING: statusBadgeStyles.PENDING,
  ANSWERED: statusBadgeStyles.APPROVED,
  CLOSED: "bg-surface-3 text-content-secondary border-line",
}

const feedbackStatusText = {
  PENDING: "검토 대기",
  ANSWERED: "답변 완료",
  CLOSED: "종료",
}

export function UserRequestsCard() {
  const { user } = useAuth()
  const [gameRequests, setGameRequests] = useState<GameRequestItem[]>([])
  const [scheduleRequests, setScheduleRequests] = useState<ScheduleRequestItem[]>([])
  const [feedbackRequests, setFeedbackRequests] = useState<FeedbackRequestItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<"ALL" | "GAME" | "SCHEDULE" | "FEEDBACK">("ALL")

  const userId = user?.id
  const loadRequests = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    setError(null)

    try {
      const [gRes, sRes, fRes] = await Promise.all([
        supabase
          .from("game_requests")
          .select("id, name, memo, request_status, admin_memo, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        fetchScheduleRequests(userId),
        supabase
          .from("feedback_requests")
          .select("id, category, title, content, request_status, admin_answer, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
      ])

      if (gRes.error || sRes.error || (fRes.error && !isMissingFeedbackTable(fRes.error))) {
        setError("요청 내역을 불러오지 못했습니다.")
      } else {
        setGameRequests((gRes.data as unknown as GameRequestItem[]) || [])
        setScheduleRequests((sRes.data as unknown as ScheduleRequestItem[]) || [])
        setFeedbackRequests(fRes.error ? [] : ((fRes.data as unknown as FeedbackRequestItem[]) || []))
      }
    } catch {
      setError("요청 내역을 불러오는 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void loadRequests()
  }, [loadRequests])

  const totalCount = gameRequests.length + scheduleRequests.length + feedbackRequests.length

  return (
    <Card className="border-line bg-surface text-content">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-lg font-bold text-content">내 요청 내역</CardTitle>
          <p className="text-xs text-content-secondary mt-1">
            관리자에게 제안한 게임·일정 추가/수정 요청과 건의의 처리 상태입니다.
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
          <Button
            size="sm"
            variant={filter === "FEEDBACK" ? "default" : "outline"}
            onClick={() => setFilter("FEEDBACK")}
            className={`text-xs h-7 ${filter === "FEEDBACK" ? "bg-primary text-primary-foreground" : "border-line text-content"}`}
          >
            건의 ({feedbackRequests.length})
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
                    {req.schedule_type === "VERSION"
                      ? "버전"
                      : req.schedule_type === "PICKUP"
                        ? "픽업"
                        : req.schedule_type === "BROADCAST"
                          ? "특별방송"
                          : "콘텐츠"}{" "}
                    {req.is_rerun && <span className="font-semibold text-warning">복각</span>} · {formatSchedulePeriod(req, { style: "full" })}
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

            {/* 기타 건의 목록 */}
            {(filter === "ALL" || filter === "FEEDBACK") &&
              feedbackRequests.map((req) => (
                <div
                  key={req.id}
                  data-testid="feedback-request-item"
                  className="p-3.5 rounded-lg border border-line bg-surface-2 space-y-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 whitespace-nowrap text-xs font-semibold px-2 py-0.5 rounded bg-warning/10 text-warning border border-warning/20">
                        {req.category}
                      </span>
                      <h4 className="font-semibold text-content text-base">{req.title}</h4>
                    </div>
                    <span
                      className={`shrink-0 whitespace-nowrap text-xs font-medium px-2 py-0.5 rounded border ${
                        feedbackStatusStyles[req.request_status]
                      }`}
                    >
                      {feedbackStatusText[req.request_status]}
                    </span>
                  </div>

                  <p className="line-clamp-3 whitespace-pre-wrap text-xs text-content-secondary">{req.content}</p>

                  {req.admin_answer && (
                    <div className="p-2.5 rounded bg-surface-3 border border-line text-xs space-y-1">
                      <span className="font-semibold text-content block">관리자 답변:</span>
                      <p className="text-content-secondary whitespace-pre-wrap">{req.admin_answer}</p>
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
