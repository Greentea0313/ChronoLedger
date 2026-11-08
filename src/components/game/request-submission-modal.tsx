"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase/client"
import { useOnlineStatus } from "@/lib/use-online-status"
import { OFFLINE_WRITE_MESSAGE, isOffline } from "@/lib/offline-guard"
import { insertTabOnKeyDown } from "@/lib/textarea-tab"
import { convertIconSourceToDataUrl, getClipboardImageFile } from "@/lib/image-resizer"
import { validateGameRequest, validateScheduleRequest } from "./request-validation"

type Game = { id: string; name: string; classification_schema?: { rarities?: string[]; axes?: Array<{ key: string; label: string; options: string[] }> } }
type Character = { id: string; game_id: string; name: string }
type Schedule = {
  id: string
  game_id: string
  title: string
  schedule_type: "VERSION" | "PICKUP" | "CONTENTS"
  is_official?: boolean
  start_date: string
  end_date: string
  memo: string | null
}
type GameRequest = {
  id: string
  name: string
  memo: string | null
  request_status: "PENDING" | "APPROVED" | "REJECTED"
  admin_memo: string | null
}
type ScheduleRequest = {
  id: string
  game_id: string
  target_schedule_id: string | null
  title: string
  schedule_type: "VERSION" | "PICKUP" | "CONTENTS"
  is_official: boolean
  start_date: string
  end_date: string
  memo: string | null
  request_status: "PENDING" | "APPROVED" | "REJECTED"
  admin_memo: string | null
}
type RequestKind = "game" | "schedule" | "character"
type RequestMode = "ADD" | "EDIT"

const selectClassName = "h-10 w-full rounded-md border border-line-control bg-surface-2 px-3 text-sm text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
const statusLabels = { PENDING: "검토 대기", APPROVED: "승인", REJECTED: "반려" }

export function RequestSubmissionModal({
  triggerText = "+ 추가 요청",
  className,
}: {
  triggerText?: string
  className?: string
} = {}) {
  const { user } = useAuth()
  const isOnline = useOnlineStatus()
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("submit")
  const [requestKind, setRequestKind] = useState<RequestKind>("game")
  const [requestMode, setRequestMode] = useState<RequestMode>("ADD")
  const [games, setGames] = useState<Game[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [gameRequests, setGameRequests] = useState<GameRequest[]>([])
  const [scheduleRequests, setScheduleRequests] = useState<ScheduleRequest[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [gameId, setGameId] = useState("")
  const [targetScheduleId, setTargetScheduleId] = useState("")
  const [title, setTitle] = useState("")
  const [scheduleType, setScheduleType] = useState<"VERSION" | "PICKUP" | "CONTENTS">("VERSION")
  const [isOfficial, setIsOfficial] = useState(true)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [scheduleMemo, setScheduleMemo] = useState("")
  const [characterRequestMode, setCharacterRequestMode] = useState<"ADD" | "UPDATE">("ADD")
  const [targetCharacterId, setTargetCharacterId] = useState("")
  const [characterName, setCharacterName] = useState("")
  const [characterRarity, setCharacterRarity] = useState("")
  const [characterAttributes, setCharacterAttributes] = useState<Record<string, string>>({})
  const [characterIconUrl, setCharacterIconUrl] = useState("")
  const [characterIconFile, setCharacterIconFile] = useState<File | null>(null)
  const [characterMemo, setCharacterMemo] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const schedulesForGame = useMemo(() => schedules.filter((item) => item.game_id === gameId), [gameId, schedules])
  const gameNames = useMemo(() => new Map(games.map((game) => [game.id, game.name])), [games])
  const handleCharacterIconPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const file = getClipboardImageFile(event.clipboardData)
    if (!file) return
    event.preventDefault()
    setCharacterIconFile(null)
    void convertIconSourceToDataUrl(file)
      .then(setCharacterIconUrl)
      .catch((error: unknown) => setSubmitError(error instanceof Error ? error.message : "아이콘 이미지를 변환하지 못했습니다."))
  }

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true)
    setCatalogError(null)
    setGames([])
    setSchedules([])
    try {
      const [gamesResult, schedulesResult, charactersResult] = await Promise.all([
        supabase.from("games").select("id, name, classification_schema").order("name"),
        supabase.from("game_schedules").select("*").order("start_date"),
        supabase.from("game_characters").select("id, game_id, name").order("name"),
      ])
      if (gamesResult.error) setCatalogError("게임 카탈로그를 불러오지 못했습니다.")
      else setGames((gamesResult.data ?? []).map((game) => {
        const schema = game.classification_schema
        if (!schema || typeof schema !== "object" || Array.isArray(schema)) return { id: game.id, name: game.name }
        const value = schema as { rarities?: unknown; axes?: unknown }
        return {
          id: game.id,
          name: game.name,
          classification_schema: {
            rarities: Array.isArray(value.rarities) ? value.rarities.filter((item): item is string => typeof item === "string") : [],
            axes: Array.isArray(value.axes) ? value.axes.filter((item): item is { key: string; label: string; options: string[] } => (
              !!item && typeof item === "object" && !Array.isArray(item) &&
              typeof (item as { key?: unknown }).key === "string" &&
              typeof (item as { label?: unknown }).label === "string" &&
              Array.isArray((item as { options?: unknown }).options) &&
              (item as { options: unknown[] }).options.every((option) => typeof option === "string")
            )) : [],
          },
        }
      }))
      setCharacters(charactersResult.data ?? [])
      if (schedulesResult.error) setCatalogError("일정 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.")
      else setSchedules(schedulesResult.data ?? [])
    } catch {
      setCatalogError("게임 및 일정 정보를 불러오지 못했습니다. 연결 상태를 확인해 주세요.")
    } finally {
      setCatalogLoading(false)
    }
  }, [])

  const loadRequests = useCallback(async () => {
    setGameRequests([])
    setScheduleRequests([])
    setHistoryError(null)
    if (!user) {
      setHistoryLoading(false)
      setHistoryError("요청 내역을 보려면 로그인해 주세요.")
      return
    }
    setHistoryLoading(true)
    try {
      const [gamesResult, schedulesResult] = await Promise.all([
        supabase.from("game_requests").select("id, name, memo, request_status, admin_memo")
          .eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("schedule_requests").select("*")
          .eq("user_id", user.id).order("created_at", { ascending: false }),
      ])
      if (gamesResult.error) setHistoryError("내 게임 요청을 불러오지 못했습니다.")
      else setGameRequests(gamesResult.data ?? [])
      if (schedulesResult.error) setHistoryError("내 일정 요청을 불러오지 못했습니다.")
      else setScheduleRequests(schedulesResult.data ?? [])
    } catch {
      setHistoryError("요청 내역을 불러오지 못했습니다. 연결 상태를 확인해 주세요.")
    } finally {
      setHistoryLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!isOpen) return
    setActiveTab("submit")
    setSubmitError(null)
    setSuccessMessage(null)
    void loadCatalog()
    void loadRequests()
  }, [isOpen, loadCatalog, loadRequests])

  useEffect(() => {
    if (requestKind !== "schedule" || requestMode !== "EDIT" || !targetScheduleId) return
    const schedule = schedulesForGame.find((item) => item.id === targetScheduleId)
    if (!schedule) return
    setTitle(schedule.title)
    setScheduleType(schedule.schedule_type)
    setIsOfficial(schedule.is_official ?? true)
    setStartDate(schedule.start_date)
    setEndDate(schedule.end_date)
    setScheduleMemo(schedule.memo ?? "")
  }, [requestKind, requestMode, schedulesForGame, targetScheduleId])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)
    setSuccessMessage(null)
    if (!user) {
      setSubmitError("요청을 제출하려면 로그인해 주세요.")
      return
    }
    if (isOffline()) {
      setSubmitError(OFFLINE_WRITE_MESSAGE)
      return
    }
    const validationError = requestKind === "game"
      ? validateGameRequest(name)
      : requestKind === "schedule"
        ? validateScheduleRequest({ requestMode, gameId, targetScheduleId, title, scheduleType, startDate, endDate })
        : (!gameId ? "게임을 선택해 주세요." : !characterName.trim() || characterName.trim().length > 100 ? "캐릭터 이름을 1~100자로 입력해 주세요." : characterMemo.length > 500 ? "메모는 500자 이내로 입력해 주세요." : null)
    if (validationError) {
      setSubmitError(validationError)
      return
    }

    setIsSubmitting(true)
    try {
      const result = requestKind === "game"
        ? await supabase.from("game_requests").insert({ user_id: user.id, name: name.trim(), memo: null })
        : requestKind === "schedule"
        ? await supabase.from("schedule_requests").insert({
            user_id: user.id,
            game_id: gameId,
            target_schedule_id: requestMode === "EDIT" ? targetScheduleId : null,
            title: title.trim(),
            schedule_type: scheduleType,
            is_official: isOfficial,
            start_date: startDate,
            end_date: endDate,
            memo: scheduleMemo.trim() || null,
          })
        : await supabase.from("character_requests").insert({
            user_id: user.id,
            game_id: gameId,
            target_character_id: characterRequestMode === "UPDATE" ? targetCharacterId : null,
            name: characterName.trim(),
            rarity: characterRarity || null,
            attributes: characterAttributes,
            default_icon_url: characterIconFile || characterIconUrl
              ? await convertIconSourceToDataUrl(characterIconFile ?? characterIconUrl)
              : null,
            memo: characterMemo.trim() || null,
          })
      if (result.error) {
        setSubmitError("요청을 저장하지 못했습니다. 입력값과 로그인 상태를 확인한 뒤 다시 시도해 주세요.")
        return
      }
      setSuccessMessage("요청을 제출했습니다. 관리자 검토 후 처리됩니다.")
      if (requestKind === "game") {
        setName("")
      } else if (requestKind === "schedule") {
        setTargetScheduleId("")
        setTitle("")
        setStartDate("")
        setEndDate("")
        setScheduleMemo("")
        setIsOfficial(true)
        setRequestMode("ADD")
      } else {
        setTargetCharacterId("")
        setCharacterName("")
        setCharacterRarity("")
        setCharacterAttributes({})
        setCharacterIconUrl("")
        setCharacterIconFile(null)
        setCharacterMemo("")
        setCharacterRequestMode("ADD")
      }
      await loadRequests()
    } catch {
      setSubmitError("요청을 저장하지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={className ?? "border-line text-content hover:bg-surface-2"}>
          {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-line bg-surface text-content sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>추가 요청</DialogTitle>
          <DialogDescription className="text-sm text-content-secondary">
            게임이나 일정의 추가·수정을 요청하고 이전 요청 상태를 확인합니다.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 bg-surface-2 border border-line">
            <TabsTrigger value="submit" className="data-[state=active]:bg-surface data-[state=active]:text-content">요청 등록</TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-surface data-[state=active]:text-content">내 요청</TabsTrigger>
          </TabsList>
          <TabsContent value="submit" className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="request-kind" className="text-sm font-medium text-content">요청 종류</label>
                <select id="request-kind" className={selectClassName} value={requestKind} onChange={(event) => {
                  setRequestKind(event.target.value as RequestKind)
                  setSubmitError(null)
                  setSuccessMessage(null)
                }}>
                  <option value="game">게임 요청</option>
                  <option value="schedule">일정 요청</option>
                  <option value="character">캐릭터 요청</option>
                </select>
              </div>
              {requestKind === "game" ? (
                <div className="space-y-2">
                  <label htmlFor="game-name" className="text-sm font-medium text-content">게임 제목</label>
                  <Input
                    id="game-name"
                    placeholder="추가 요청할 게임 제목을 입력해 주세요"
                    value={name}
                    maxLength={100}
                    onChange={(event) => setName(event.target.value)}
                    className="border-line-control bg-surface-2 text-content"
                  />
                  <p className="text-xs text-content-secondary">
                    관리자가 확인 후 공용 게임 카탈로그에 등록합니다.
                  </p>
                </div>
              ) : requestKind === "character" ? (
                <>
                  <div className="space-y-2">
                    <label htmlFor="character-request-mode" className="text-sm font-medium text-content">요청 유형</label>
                    <select id="character-request-mode" className={selectClassName} value={characterRequestMode} onChange={(event) => setCharacterRequestMode(event.target.value as "ADD" | "UPDATE")}>
                      <option value="ADD">신규 캐릭터 추가</option>
                      <option value="UPDATE">기존 캐릭터 수정</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="character-game" className="text-sm font-medium text-content">대상 게임</label>
                    <select id="character-game" className={selectClassName} value={gameId} onChange={(event) => { setGameId(event.target.value); setTargetCharacterId(""); setCharacterRarity(""); setCharacterAttributes({}) }}>
                      <option value="">게임을 선택하세요</option>
                      {games.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}
                    </select>
                  </div>
                  {characterRequestMode === "UPDATE" && (
                    <div className="space-y-2">
                      <label htmlFor="target-character" className="text-sm font-medium text-content">수정할 캐릭터</label>
                      <select id="target-character" className={selectClassName} value={targetCharacterId} onChange={(event) => setTargetCharacterId(event.target.value)}>
                        <option value="">캐릭터를 선택하세요</option>
                        {characters.filter((character) => character.game_id === gameId).map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label htmlFor="character-name" className="text-sm font-medium text-content">캐릭터 이름</label>
                    <Input id="character-name" value={characterName} maxLength={100} onChange={(event) => setCharacterName(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="character-rarity" className="text-sm font-medium text-content">성급</label>
                    <select id="character-rarity" className={selectClassName} value={characterRarity} onChange={(event) => setCharacterRarity(event.target.value)}>
                      <option value="">선택하지 않음</option>
                      {(games.find((game) => game.id === gameId)?.classification_schema?.rarities ?? []).map((rarity) => <option key={rarity} value={rarity}>{rarity}</option>)}
                    </select>
                  </div>
                  {(games.find((game) => game.id === gameId)?.classification_schema?.axes ?? []).map((axis) => (
                    <div className="space-y-2" key={axis.key}>
                      <label htmlFor={`character-axis-${axis.key}`} className="text-sm font-medium text-content">{axis.label}</label>
                      <select id={`character-axis-${axis.key}`} className={selectClassName} value={characterAttributes[axis.key] ?? ""} onChange={(event) => setCharacterAttributes((current) => ({ ...current, [axis.key]: event.target.value }))}>
                        <option value="">선택하지 않음</option>
                        {axis.options.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                  ))}
                  <div className="space-y-2">
                    <label htmlFor="character-icon-url" className="text-sm font-medium text-content">아이콘 (선택)</label>
                    <Input id="character-icon-url" value={characterIconUrl.startsWith("data:image/webp;base64,") ? "" : characterIconUrl} onPaste={handleCharacterIconPaste} onChange={(event) => { setCharacterIconUrl(event.target.value); setCharacterIconFile(null) }} placeholder="https://... 또는 이미지 붙여넣기" />
                    <Input id="character-icon-file" type="file" accept="image/png,image/jpeg,image/webp" aria-label="캐릭터 아이콘 파일" onChange={(event) => setCharacterIconFile(event.target.files?.[0] ?? null)} />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="character-memo" className="text-sm font-medium text-content">메모 (선택)</label>
                    <Textarea id="character-memo" maxLength={500} value={characterMemo} onChange={(event) => setCharacterMemo(event.target.value)} onKeyDown={(event) => insertTabOnKeyDown(event, setCharacterMemo)} />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label htmlFor="request-mode" className="text-sm font-medium text-content">요청 유형</label>
                    <select id="request-mode" className={selectClassName} value={requestMode} onChange={(event) => {
                      const mode = event.target.value as RequestMode
                      setRequestMode(mode)
                      setTargetScheduleId("")
                      if (mode === "ADD") {
                        setTitle("")
                        setStartDate("")
                        setEndDate("")
                        setScheduleMemo("")
                        setIsOfficial(true)
                      }
                      setSubmitError(null)
                    }}>
                      <option value="ADD">일정 추가</option>
                      <option value="EDIT">기존 일정 수정 제안</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="schedule-official" className="text-sm font-medium text-content">일정 분류</label>
                    <select
                      id="schedule-official"
                      className={selectClassName}
                      value={isOfficial ? "official" : "unofficial"}
                      onChange={(event) => setIsOfficial(event.target.value === "official")}
                    >
                      <option value="official">공식</option>
                      <option value="unofficial">비공식 (테스트 서버·유출 등)</option>
                    </select>
                  </div>
                  {catalogLoading && <p role="status" className="text-sm text-content-secondary">게임 및 일정을 불러오는 중입니다.</p>}
                  {catalogError && <p role="alert" className="text-sm text-danger">{catalogError}</p>}
                  <div className="space-y-2">
                    <label htmlFor="schedule-game" className="text-sm font-medium text-content">게임 선택</label>
                    <select id="schedule-game" className={selectClassName} value={gameId} onChange={(event) => {
                      setGameId(event.target.value)
                      setTargetScheduleId("")
                      setTitle("")
                      setStartDate("")
                      setEndDate("")
                      setScheduleMemo("")
                      setSubmitError(null)
                    }}>
                      <option value="">게임을 선택하세요</option>
                      {games.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}
                    </select>
                  </div>
                  {requestMode === "EDIT" && (
                    <div className="space-y-2">
                      <label htmlFor="target-schedule" className="text-sm font-medium text-content">수정할 일정</label>
                      <select id="target-schedule" className={selectClassName} value={targetScheduleId} onChange={(event) => setTargetScheduleId(event.target.value)}>
                        <option value="">기존 일정을 선택하세요</option>
                        {schedulesForGame.map((schedule) => (
                          <option key={schedule.id} value={schedule.id}>
                            {schedule.title} ({schedule.start_date} ~ {schedule.end_date})
                          </option>
                        ))}
                      </select>
                      {gameId && schedulesForGame.length === 0 && <p className="text-sm text-content-secondary">선택한 게임에 수정 가능한 일정이 없습니다.</p>}
                    </div>
                  )}
                  <div className="space-y-2">
                    <label htmlFor="schedule-title" className="text-sm font-medium text-content">일정 제목</label>
                    <Input
                      id="schedule-title"
                      placeholder="예: 2.1 버전 업데이트, 신규 캐릭터 픽업"
                      value={title}
                      maxLength={150}
                      onChange={(event) => setTitle(event.target.value)}
                      className="border-line-control bg-surface-2 text-content"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="schedule-type" className="text-sm font-medium text-content">일정 종류</label>
                    <select id="schedule-type" className={selectClassName} value={scheduleType} onChange={(event) => setScheduleType(event.target.value as "VERSION" | "PICKUP" | "CONTENTS")}>
                      <option value="VERSION">VERSION (버전)</option>
                      <option value="PICKUP">PICKUP (픽업)</option>
                      <option value="CONTENTS">CONTENTS (콘텐츠)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="schedule-start-date" className="text-sm font-medium text-content">시작일</label>
                      <Input
                        id="schedule-start-date"
                        type="date"
                        value={startDate}
                        onChange={(event) => setStartDate(event.target.value)}
                        className="border-line-control bg-surface-2 text-content"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="schedule-end-date" className="text-sm font-medium text-content">종료일</label>
                      <Input
                        id="schedule-end-date"
                        type="date"
                        value={endDate}
                        onChange={(event) => setEndDate(event.target.value)}
                        className="border-line-control bg-surface-2 text-content"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="schedule-memo" className="text-sm font-medium text-content">일정 내용 및 메모 (선택)</label>
                    <Textarea
                      id="schedule-memo"
                      placeholder="일정에 관한 추가 설명이나 출처를 적어주세요."
                      value={scheduleMemo}
                      onChange={(event) => setScheduleMemo(event.target.value)}
                      onKeyDown={(event) => insertTabOnKeyDown(event, setScheduleMemo)}
                      className="border-line-control bg-surface-2 text-content"
                    />
                  </div>
                </>
              )}
              {submitError && <p role="alert" className="text-sm text-danger">{submitError}</p>}
              {successMessage && <p role="status" className="text-sm text-success">{successMessage}</p>}
              <Button type="submit" disabled={isSubmitting || !user || !isOnline} className="w-full bg-primary hover:bg-primary-hover text-primary-foreground">
                {isSubmitting ? "제출 중..." : "요청 제출"}
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="history" className="space-y-4">
            {historyLoading && <p role="status" className="text-sm text-content-secondary">내 요청을 불러오는 중입니다.</p>}
            {historyError && <p role="alert" className="text-sm text-danger">{historyError}</p>}
            {!historyLoading && !historyError && gameRequests.length === 0 && scheduleRequests.length === 0 && (
              <p className="text-center text-sm text-content-secondary py-6">제출한 요청이 없습니다.</p>
            )}
            {gameRequests.map((request) => (
              <section key={request.id} className="space-y-1 rounded-md border border-line bg-surface-2 p-3">
                <div className="flex justify-between gap-3">
                  <h3 className="font-medium text-content">게임: {request.name}</h3>
                  <span className="text-sm text-content-secondary">{statusLabels[request.request_status]}</span>
                </div>
                {request.admin_memo && <p className="text-sm text-content-muted">관리자 메모: {request.admin_memo}</p>}
              </section>
            ))}
            {scheduleRequests.map((request) => (
              <section key={request.id} className="space-y-1 rounded-md border border-line bg-surface-2 p-3">
                <div className="flex justify-between gap-3">
                  <h3 className="font-medium text-content">일정 {request.target_schedule_id ? "수정" : "추가"}: {request.title}</h3>
                  <span className="text-sm text-content-secondary">{statusLabels[request.request_status]}</span>
                </div>
                <p className="text-sm text-content-secondary">
                  {gameNames.get(request.game_id) ?? "게임"} · {request.schedule_type} · {request.start_date} ~ {request.end_date}
                  {request.is_official === false ? " · [비공식]" : ""}
                </p>
                {request.memo && <p className="text-sm text-content-muted">{request.memo}</p>}
                {request.admin_memo && <p className="text-sm text-content-muted">관리자 메모: {request.admin_memo}</p>}
              </section>
            ))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}