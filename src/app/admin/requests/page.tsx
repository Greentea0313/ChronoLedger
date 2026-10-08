"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react"

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
  title: string
  schedule_type: "VERSION" | "PICKUP"
  start_date: string
  end_date: string
  memo: string | null
  request_status: string
  created_at: string
  games?: { name: string } | null
}

export default function AdminRequestsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { replace } = useRouter()

  const [gameRequests, setGameRequests] = useState<GameRequest[]>([])
  const [scheduleRequests, setScheduleRequests] = useState<ScheduleRequest[]>([])
  const [isDataLoading, setIsDataLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [defaultIconUrls, setDefaultIconUrls] = useState<Record<string, string>>({})

  const fetchRequests = useCallback(async () => {
    setIsDataLoading(true)
    setError(null)

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
    if (user.app_metadata.role === "admin") {
      void fetchRequests()
    }
  }, [authLoading, fetchRequests, replace, user])

  // 승인/반려 공통 처리 함수
  const processRequest = async (
    type: "game" | "schedule",
    id: string,
    isApprove: boolean,
    defaultIconUrl?: string,
  ) => {
    setProcessingId(id)
    setError(null)
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

      const rpcName = type === "game"
        ? (isApprove ? "approve_game_request" : "reject_game_request")
        : (isApprove ? "approve_schedule_request" : "reject_schedule_request")

      const rpcArgs = {
        p_request_id: id,
        ...(iconUrl ? { p_default_icon_url: iconUrl } : {}),
      }
      const { error: rpcError } = await supabase.rpc(rpcName, rpcArgs)
      if (rpcError) throw rpcError

      // 처리 완료된 항목을 화면 목록에서 즉시 제거
      if (type === "game") {
        setGameRequests(prev => prev.filter(req => req.id !== id))
      } else {
        setScheduleRequests(prev => prev.filter(req => req.id !== id))
      }

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류"
      setError(`처리 중 오류가 발생했습니다: ${message}`)
    } finally {
      setProcessingId(null)
    }
  }

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">데이터 불러오는 중...</div>
  }
  if (!user) return null
  if (user.app_metadata.role !== "admin") {
    return <div role="alert" className="flex min-h-screen items-center justify-center bg-gray-900 text-red-400">관리자 권한이 필요합니다.</div>
  }
  if (isDataLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">데이터 불러오는 중...</div>
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="pb-4 border-b border-gray-800">
          <h1 className="text-2xl font-bold text-blue-400">관리자 - 데이터 제안 대기열</h1>
          <p className="text-sm text-gray-400 mt-1">유저들이 건의한 게임 및 일정 추가 요청을 검토하고 승인합니다.</p>
        </header>

        {error && (
          <div className="p-4 bg-red-900/50 text-red-400 rounded-md flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" /> {error}
          </div>
        )}

        <Tabs defaultValue="games" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800 mb-6">
            <TabsTrigger value="games" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white">
              게임 요청 ({gameRequests.length})
            </TabsTrigger>
            <TabsTrigger value="schedules" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white">
              일정 요청 ({scheduleRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="games" className="space-y-4">
            {gameRequests.length === 0 ? (
              <p className="text-gray-500 text-center py-8 bg-gray-800/50 rounded-lg">대기 중인 게임 요청이 없습니다.</p>
            ) : (
              gameRequests.map(req => (
                <Card key={req.id} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg">{req.name}</h3>
                      </div>
                      {req.memo && <p className="text-sm text-gray-400 mt-2">메모: {req.memo}</p>}
                      <p className="text-xs text-gray-500 mt-1">요청일: {new Date(req.created_at).toLocaleDateString()}</p>
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
                        disabled={processingId === req.id}
                        className="border-gray-700 bg-gray-900 text-white"
                      />
                      <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 md:flex-none border-green-700 text-green-400 hover:bg-green-900/30"
                        onClick={() => processRequest("game", req.id, true, defaultIconUrls[req.id])}
                        disabled={processingId === req.id}
                      >
                        {processingId === req.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                        승인
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 md:flex-none border-red-700 text-red-400 hover:bg-red-900/30"
                        onClick={() => processRequest("game", req.id, false)}
                        disabled={processingId === req.id}
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
          </TabsContent>

          <TabsContent value="schedules" className="space-y-4">
            {scheduleRequests.length === 0 ? (
              <p className="text-gray-500 text-center py-8 bg-gray-800/50 rounded-lg">대기 중인 일정 요청이 없습니다.</p>
            ) : (
              scheduleRequests.map(req => (
                <Card key={req.id} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-purple-900 text-purple-300 text-xs px-2 py-1 rounded">
                          {req.schedule_type === "VERSION" ? "버전" : "픽업"}
                        </span>
                        <h3 className="font-bold text-lg">{req.title}</h3>
                      </div>
                      <p className="text-sm text-gray-300">대상 게임: <span className="font-semibold text-white">{req.games?.name || '알 수 없음'}</span></p>
                      <p className="text-sm text-gray-400 mt-1">기간: {req.start_date || '미정'} ~ {req.end_date || '미정'}</p>
                      {req.memo && <p className="text-sm text-gray-400 mt-2">메모: {req.memo}</p>}
                    </div>
                    <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                      <Button
                        variant="outline"
                        className="flex-1 md:flex-none border-green-700 text-green-400 hover:bg-green-900/30"
                        onClick={() => processRequest("schedule", req.id, true)}
                        disabled={processingId === req.id}
                      >
                        {processingId === req.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                        승인
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 md:flex-none border-red-700 text-red-400 hover:bg-red-900/30"
                        onClick={() => processRequest("schedule", req.id, false)}
                        disabled={processingId === req.id}
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
    </div>
  )
}