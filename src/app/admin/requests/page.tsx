"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { useOnlineStatus } from "@/lib/use-online-status"
import { OFFLINE_WRITE_MESSAGE, isOffline } from "@/lib/offline-guard"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react"
import { convertIconSourceToDataUrl, getClipboardImageFile } from "@/lib/image-resizer"

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
  schedule_type: "VERSION" | "PICKUP" | "CONTENTS" | "BROADCAST"
  start_date: string
  end_date: string
  memo: string | null
  is_official?: boolean
  is_rerun?: boolean
  pickup_character_ids?: string[] | null
  pickup_new_characters?: Array<{ name: string; icon_url: string | null }> | null
  admin_memo?: string | null
  request_status: string
  created_at: string | null
  games?: { name: string } | null
}
type CharacterRequest = {
  id: string
  game_id: string
  target_character_id: string | null
  name: string
  rarity: string | null
  attributes: Record<string, string>
  default_icon_url: string | null
  memo: string | null
  request_status: string
  created_at: string
  games?: { name: string } | null
}

// Fallback (approve RPC missing) copy of the pickup characters; only PICKUP requests carry them and only when present.
function getPickupFallbackFields(request: ScheduleRequest) {
  if (request.schedule_type !== "PICKUP") return {}
  const ids = request.pickup_character_ids ?? []
  return ids.length > 0 ? { pickup_character_ids: ids } : {}
}

/** Defensive parse of the JSONB column: keeps only well-formed `{ name, icon_url }` entries. */
function normalizeProposals(raw: unknown): Array<{ name: string; icon_url: string | null }> {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return []
    const { name, icon_url: iconUrl } = item as { name?: unknown; icon_url?: unknown }
    return typeof name === "string" && name.trim() ? [{ name, icon_url: typeof iconUrl === "string" ? iconUrl : null }] : []
  })
}

/** The direct-write fallback is only for a deployment where the RPC does not exist (R52-REV-003). */
function isMissingRpcError(error: { code?: string } | null | undefined): boolean {
  return error?.code === "PGRST202" || error?.code === "42883"
}

export default function AdminRequestsPage() {
  const { user, role, isLoading: authLoading } = useAuth()
  const { replace } = useRouter()

  const [gameRequests, setGameRequests] = useState<GameRequest[]>([])
  const [scheduleRequests, setScheduleRequests] = useState<ScheduleRequest[]>([])
  const [characterRequests, setCharacterRequests] = useState<CharacterRequest[]>([])
  const [isDataLoading, setIsDataLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const isOnline = useOnlineStatus()
  const [pickupCharacters, setPickupCharacters] = useState<Record<string, { name: string; iconUrl: string | null }>>({})
  const [defaultIconUrls, setDefaultIconUrls] = useState<Record<string, string>>({})
  const [defaultIconFiles, setDefaultIconFiles] = useState<Record<string, File>>({})

  const isAdmin = role === "admin" || user?.app_metadata?.role === "admin"

  const handleGameIconPaste = (event: React.ClipboardEvent<HTMLInputElement>, requestId: string) => {
    const file = getClipboardImageFile(event.clipboardData)
    if (!file) return

    event.preventDefault()
    setDefaultIconFiles((current) => {
      const next = { ...current }
      delete next[requestId]
      return next
    })
    setDefaultIconUrls((current) => ({ ...current, [requestId]: "" }))
    setError(null)
    void convertIconSourceToDataUrl(file)
      .then((dataUrl) => {
        setDefaultIconUrls((current) => ({ ...current, [requestId]: dataUrl }))
      })
      .catch((error: unknown) => {
        setError(error instanceof Error ? error.message : "아이콘 이미지를 변환하지 못했습니다.")
      })
  }

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

      const { data: cData, error: cError } = await supabase
        .from("character_requests")
        .select("*, games(name)")
        .eq("request_status", "PENDING")
        .order("created_at", { ascending: true })
      if (cError) throw cError
      setCharacterRequests((cData || []) as CharacterRequest[])

      // 2. 대기(PENDING) 상태인 일정 추가 요청 가져오기 (게임 이름 조인)
      const { data: sData, error: sError } = await supabase
        .from("schedule_requests")
        .select("*, games(name)")
        .eq("request_status", "PENDING")
        .order("created_at", { ascending: true })

      if (sError) throw sError
      setScheduleRequests(
        (sData ?? []).map((request) => ({
          ...request,
          pickup_new_characters: normalizeProposals(request.pickup_new_characters),
        })) as unknown as ScheduleRequest[],
      )

      // Pickup avatars are decoration: look up only the referenced characters and never block the list on failure (NR-10).
      const pickupIds = Array.from(new Set((sData ?? []).flatMap((request) => request.pickup_character_ids ?? [])))
      if (pickupIds.length > 0) {
        try {
          const { data: pickupData, error: pickupError } = await supabase
            .from("game_characters")
            .select("id, name, default_icon_url")
            .in("id", pickupIds)
          if (!pickupError && pickupData) {
            setPickupCharacters(Object.fromEntries(
              pickupData.map((character) => [character.id, { name: character.name, iconUrl: character.default_icon_url ?? null }]),
            ))
          }
        } catch {
          // Names fall back to a count in the card.
        }
      }

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
    type: "game" | "schedule" | "character",
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
        const iconFile = defaultIconFiles[id]
        const iconSource = defaultIconUrl?.trim() || defaultIconUrls[id]?.trim()
        if (!iconFile && !iconSource) {
          throw new Error("게임 기본 아이콘 파일을 업로드하거나 URL을 입력해 주세요.")
        }

        if (!iconFile && !iconSource?.startsWith("data:image/webp;base64,")) {
          let parsedUrl: URL
          try {
            parsedUrl = new URL(iconSource!)
          } catch {
            throw new Error("게임 기본 아이콘 URL은 http 또는 https 주소여야 합니다.")
          }
          if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
            throw new Error("게임 기본 아이콘 URL은 http 또는 https 주소여야 합니다.")
          }
        }
        iconUrl = await convertIconSourceToDataUrl(iconFile ?? iconSource!)
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
      } else if (type === "character") {
        let replacementIcon: string | undefined
        if (isApprove) {
          const iconFile = defaultIconFiles[id]
          const iconSource = defaultIconUrls[id]?.trim()
          if (iconFile || iconSource) {
            if (!iconFile && !iconSource!.startsWith("data:image/webp;base64,")) {
              let parsedUrl: URL
              try {
                parsedUrl = new URL(iconSource!)
              } catch {
                throw new Error("캐릭터 아이콘 URL은 http 또는 https 주소여야 합니다.")
              }
              if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
                throw new Error("캐릭터 아이콘 URL은 http 또는 https 주소여야 합니다.")
              }
            }
            replacementIcon = await convertIconSourceToDataUrl(iconFile ?? iconSource!)
          }
        }
        const { error: rpcError } = isApprove
          ? await supabase.rpc(
              "approve_character_request",
              replacementIcon
                ? { p_request_id: id, p_default_icon_url: replacementIcon }
                : { p_request_id: id },
            )
          : await supabase.rpc("reject_character_request", { p_request_id: id, p_admin_memo: null })
        if (rpcError) throw rpcError
      } else {
        // type === "schedule"
        if (isApprove) {
          const { error: rpcError } = await supabase.rpc("approve_schedule_request", {
            p_request_id: id,
          })

          if (rpcError) {
            // 폴백: 함수 부재(PGRST202/42883)일 때만 game_schedules 직접 삽입/수정 및 schedule_requests 상태 갱신
            // 그 외 RPC 오류(이미 처리됨, 픽업 캐릭터 검증 실패 등)는 그대로 표시한다 (R52-REV-003).
            const targetReq = scheduleRequests.find((r) => r.id === id)
            if (!isMissingRpcError(rpcError) || !targetReq) throw rpcError
            // New-character proposals are registered by the RPC only; a direct write would silently drop them.
            if ((targetReq.pickup_new_characters?.length ?? 0) > 0) throw rpcError

            if (targetReq.target_schedule_id) {
              const { error: updateSchedErr } = await supabase
                .from("game_schedules")
                .update({
                  title: targetReq.title,
                  schedule_type: targetReq.schedule_type,
                  start_date: targetReq.start_date,
                  end_date: targetReq.end_date,
                  memo: targetReq.memo,
                  is_official: targetReq.is_official ?? true,
                  ...getPickupFallbackFields(targetReq),
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
                  is_official: targetReq.is_official ?? true,
                  ...getPickupFallbackFields(targetReq),
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
      } else if (type === "character") {
        setCharacterRequests(prev => prev.filter(req => req.id !== id))
      } else {
        setScheduleRequests(prev => prev.filter(req => req.id !== id))
      }

      setSuccessMessage(
        type === "game"
          ? (isApprove ? "게임 추가 요청을 승인했습니다." : "게임 추가 요청을 반려했습니다.")
          : type === "character"
            ? (isApprove ? "캐릭터 요청을 승인했습니다." : "캐릭터 요청을 반려했습니다.")
            : (isApprove ? "일정 추가 요청을 승인했습니다." : "일정 추가 요청을 반려했습니다.")
      )
    } catch (err: unknown) {
      // Supabase/PostgREST errors are plain objects with a message, not Error instances.
      const message = err instanceof Error ? err.message : typeof (err as { message?: unknown } | null)?.message === "string" ? (err as { message: string }).message : "알 수 없는 오류"
      setError(`처리 중 오류가 발생했습니다: ${message}`)
    } finally {
      setProcessingId(null)
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
        <TabsList className="mb-6 flex w-full justify-start overflow-x-auto bg-surface-2 md:grid md:grid-cols-3">
          <TabsTrigger value="games" className="shrink-0 whitespace-nowrap data-[state=active]:bg-surface-3 data-[state=active]:text-content">
            게임 요청 ({gameRequests.length})
          </TabsTrigger>
          <TabsTrigger value="schedules" className="shrink-0 whitespace-nowrap data-[state=active]:bg-surface-3 data-[state=active]:text-content">
            일정 요청 ({scheduleRequests.length})
          </TabsTrigger>
          <TabsTrigger value="characters" className="shrink-0 whitespace-nowrap data-[state=active]:bg-surface-3 data-[state=active]:text-content">
            캐릭터 요청 ({characterRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="games" className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-content">
              게임 요청 대기열 ({gameRequests.length})
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
                    <label className="text-xs text-content-secondary">
                      기본 아이콘 파일
                      <Input
                        type="file"
                        aria-label={`${req.name} 기본 아이콘 파일`}
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          if (file) setDefaultIconFiles((current) => ({ ...current, [req.id]: file }))
                        }}
                        disabled={processingId === req.id || !isOnline}
                        className="mt-1 border-line bg-surface-2 text-content"
                      />
                    </label>
                    <Input
                      type="text"
                      aria-label={`${req.name} 기본 아이콘 URL`}
                      placeholder="또는 기본 아이콘 URL (https://...)"
                      value={defaultIconUrls[req.id]?.startsWith("data:image/webp;base64,")
                        ? ""
                        : defaultIconUrls[req.id] ?? ""}
                      onPaste={(event) => handleGameIconPaste(event, req.id)}
                      onChange={(event) => {
                        setDefaultIconUrls((current) => ({
                          ...current,
                          [req.id]: event.target.value,
                        }))
                        setDefaultIconFiles((current) => {
                          const next = { ...current }
                          delete next[req.id]
                          return next
                        })
                      }}
                      disabled={processingId === req.id || !isOnline}
                      className="border-line bg-surface-2 text-content truncate"
                    />
                    <p className="text-[11px] text-content-muted">
                      URL 직접 가져오기에 실패하면 wsrv.nl에 전달해 변환합니다. 이미지 복사 후 붙여넣기도 가능합니다.
                    </p>
                    {defaultIconUrls[req.id]?.startsWith("data:image/webp;base64,") && (
                      <Image
                        src={defaultIconUrls[req.id]}
                        alt={`${req.name} 아이콘 미리보기`}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded border border-line object-cover"
                      />
                    )}
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

        <TabsContent value="characters" className="space-y-4">
          <h3 className="text-sm font-semibold text-content">캐릭터 요청 대기열 ({characterRequests.length})</h3>
          {characterRequests.length === 0 ? (
            <p className="rounded-lg bg-surface-2/50 py-8 text-center text-content-secondary">대기 중인 캐릭터 요청이 없습니다.</p>
          ) : characterRequests.map((req) => {
            const replacementPreview = defaultIconUrls[req.id]?.startsWith("data:image/webp;base64,")
              ? defaultIconUrls[req.id]
              : null
            const previewSrc = replacementPreview ?? req.default_icon_url
            const hasIcon = !!(req.default_icon_url?.trim() || defaultIconFiles[req.id] || defaultIconUrls[req.id]?.trim())
            const needsIcon = !req.target_character_id && !hasIcon
            return (
              <Card key={req.id} className="bg-surface border-line">
                <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3">
                    {previewSrc && (
                      <Image
                        src={previewSrc}
                        alt={`${req.name} 아이콘 미리보기`}
                        width={40}
                        height={40}
                        className="h-10 w-10 shrink-0 rounded border border-line object-cover"
                      />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-primary/15 px-2 py-1 text-xs text-primary">{req.target_character_id ? "UPDATE" : "ADD"}</span>
                        <h3 className="text-lg font-bold text-content">{req.name}</h3>
                      </div>
                      <p className="text-sm text-content-secondary">{req.games?.name ?? "알 수 없음"} · {req.rarity ?? "레어도 없음"} · {Object.values(req.attributes ?? {}).join(", ")}</p>
                      {req.memo && <p className="mt-1 text-sm text-content-muted">메모: {req.memo}</p>}
                    </div>
                  </div>
                  <div className="flex w-full flex-col gap-2 md:w-auto">
                    <label className="text-xs text-content-secondary">
                      아이콘 교체 파일
                      <Input
                        type="file"
                        aria-label={`${req.name} 캐릭터 아이콘 파일`}
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          if (file) {
                            setDefaultIconFiles((current) => ({ ...current, [req.id]: file }))
                            setDefaultIconUrls((current) => ({ ...current, [req.id]: "" }))
                          }
                        }}
                        disabled={processingId === req.id || !isOnline}
                        className="mt-1 border-line bg-surface-2 text-content"
                      />
                    </label>
                    <Input
                      type="text"
                      aria-label={`${req.name} 캐릭터 아이콘 URL`}
                      placeholder="또는 아이콘 URL / 이미지 붙여넣기"
                      value={defaultIconUrls[req.id]?.startsWith("data:image/webp;base64,")
                        ? ""
                        : defaultIconUrls[req.id] ?? ""}
                      onPaste={(event) => handleGameIconPaste(event, req.id)}
                      onChange={(event) => {
                        setDefaultIconUrls((current) => ({ ...current, [req.id]: event.target.value }))
                        setDefaultIconFiles((current) => {
                          const next = { ...current }
                          delete next[req.id]
                          return next
                        })
                      }}
                      disabled={processingId === req.id || !isOnline}
                      className="border-line bg-surface-2 text-content truncate"
                    />
                    {needsIcon && (
                      <p role="alert" className="text-[11px] text-warning">
                        아이콘이 없는 신규 캐릭터 요청은 아이콘을 지정해야 승인할 수 있음
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button variant="outline" aria-label={`${req.name} 캐릭터 요청 승인`} className="border-success/60 text-success" onClick={() => processRequest("character", req.id, true)} disabled={processingId === req.id || !isOnline || needsIcon}>승인</Button>
                      <Button variant="outline" aria-label={`${req.name} 캐릭터 요청 반려`} className="border-danger/60 text-danger" onClick={() => processRequest("character", req.id, false)} disabled={processingId === req.id || !isOnline}>반려</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>

        <TabsContent value="schedules" className="space-y-4">
          <h3 className="text-sm font-semibold text-content">일정 요청 대기열 ({scheduleRequests.length})</h3>
          {scheduleRequests.length === 0 ? (
            <p className="text-content-secondary text-center py-8 bg-surface-2/50 rounded-lg">대기 중인 일정 요청이 없습니다.</p>
          ) : (
            scheduleRequests.map(req => (
              <Card key={req.id} className="bg-surface border-line">
                <CardContent className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-primary/15 text-primary text-xs px-2 py-1 rounded">
                        {req.schedule_type === "VERSION" ? "버전" : req.schedule_type === "CONTENTS" ? "콘텐츠" : req.schedule_type === "BROADCAST" ? "특별방송" : "픽업"}
                      </span>
                      {req.is_rerun && <span className="bg-warning/15 text-warning text-xs px-2 py-1 rounded">복각</span>}
                      {req.is_official === false && <span className="bg-warning/15 text-warning text-xs px-2 py-1 rounded">비공식</span>}
                      <h3 className="font-bold text-lg text-content">{req.title}</h3>
                    </div>
                    <p className="text-sm text-content-secondary">대상 게임: <span className="font-semibold text-content">{req.games?.name || '알 수 없음'}</span></p>
                    <p className="text-sm text-content-secondary mt-1">기간: {req.start_date || '미정'} ~ {req.end_date || '미정'}</p>
                    {req.schedule_type === "PICKUP" && (req.pickup_character_ids?.length ?? 0) > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-2" data-testid="pickup-request-characters">
                        {(req.pickup_character_ids ?? []).map((characterId) => {
                          const character = pickupCharacters[characterId]
                          return (
                            <span key={characterId} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 py-0.5 pl-0.5 pr-2 text-xs text-content">
                              {character?.iconUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={character.iconUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
                              ) : (
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface text-[10px] font-semibold text-content-secondary">
                                  {Array.from((character?.name ?? "?").trim())[0]?.toUpperCase() ?? "?"}
                                </span>
                              )}
                              {character?.name ?? "캐릭터"}
                            </span>
                          )
                        })}
                      </div>
                    )}
                    {req.schedule_type === "PICKUP" && (req.pickup_new_characters?.length ?? 0) > 0 && (
                      <ul className="mt-2 flex flex-wrap items-center gap-2" data-testid="pickup-request-proposals">
                        {(req.pickup_new_characters ?? []).map((proposal) => (
                          <li key={proposal.name} className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 py-0.5 pl-0.5 pr-2 text-xs text-primary">
                            {proposal.icon_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={proposal.icon_url} alt={`${proposal.name} 제안 이미지`} className="h-6 w-6 rounded-full object-cover" />
                            ) : (
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface text-[10px] font-semibold text-content-secondary">
                                {Array.from(proposal.name.trim())[0]?.toUpperCase() ?? "?"}
                              </span>
                            )}
                            {proposal.name}
                            <span className="rounded bg-primary/20 px-1 text-[10px]">신규</span>
                          </li>
                        ))}
                      </ul>
                    )}
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
