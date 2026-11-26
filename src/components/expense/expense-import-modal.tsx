"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { useOnlineStatus } from "@/lib/use-online-status"
import { OFFLINE_WRITE_MESSAGE, isOffline } from "@/lib/offline-guard"
import { getKstToday } from "@/lib/dashboard-date"
import { decodeCsvBytes, parseCsv } from "@/lib/csv"
import {
  EXCLUDE_REASON_LABELS,
  IMPORT_CATEGORIES,
  IMPORT_MAX_BYTES,
  IMPORT_MAX_ROWS,
  buildGenericCandidates,
  buildOwnFormatCandidates,
  countDataRows,
  guessColumnMapping,
  isDefaultSelected,
  isOwnExportHeader,
  toImportPayload,
  type ColumnMapping,
  type ImportCandidate,
  type ImportExistingExpense,
  type ImportGame,
} from "@/lib/expense-import"
import type { Json } from "@/types/database.types"

type Step = "start" | "mapping" | "preview" | "done"

interface RecentBatch {
  batchId: string
  createdAt: string
  count: number
}

interface ImportResult {
  batchId: string
  inserted: number
  undone: number | null
}

export interface ExpenseImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 지출 페이지가 이미 읽은 본인 지출(ID·중복 의심 판정용). */
  existingExpenses: readonly ImportExistingExpense[]
  /** 가져오기·취소 뒤 지출 목록을 다시 읽게 한다. */
  onChanged: () => void
}

const PAGE_SIZE = 1000
const RECENT_BATCH_LIMIT = 5
const UNAVAILABLE_MESSAGE = "서버 DB에 가져오기 기능(R115)이 아직 적용되지 않아 사용할 수 없습니다."

/** 마이그레이션 미적용: 열 없음(42703)·RPC 없음(PGRST202/42883). */
function isMissingFeature(error: { code?: string } | null | undefined): boolean {
  return error?.code === "42703" || error?.code === "PGRST202" || error?.code === "42883"
}

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-line bg-surface-2 px-2.5 text-sm text-content focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"

const MAPPING_FIELDS: { key: keyof ColumnMapping; label: string; required: boolean }[] = [
  { key: "date", label: "날짜", required: true },
  { key: "amount", label: "금액", required: true },
  { key: "title", label: "항목명", required: true },
  { key: "category", label: "분류", required: false },
  { key: "game", label: "게임", required: false },
  { key: "memo", label: "메모", required: false },
]

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
}

/** R115: 지출 CSV 가져오기 단계형 모달(파일 선택 → 열 지정 → 미리보기 → 완료, I15·I16). */
export function ExpenseImportModal({ open, onOpenChange, existingExpenses, onChanged }: ExpenseImportModalProps) {
  const { user } = useAuth()
  const userId = user?.id
  const isOnline = useOnlineStatus()
  const [step, setStep] = useState<Step>("start")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isUnavailable, setIsUnavailable] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [games, setGames] = useState<ImportGame[]>([])
  const [recentBatches, setRecentBatches] = useState<RecentBatch[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [fileName, setFileName] = useState("")
  const [mapping, setMapping] = useState<ColumnMapping | null>(null)
  const [defaultCategory, setDefaultCategory] = useState<string>("게임")
  const [candidates, setCandidates] = useState<ImportCandidate[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [result, setResult] = useState<ImportResult | null>(null)
  const prevOpenRef = useRef(false)

  const loadRecentBatches = useCallback(async () => {
    if (!userId) return
    const groups = new Map<string, RecentBatch>()
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error: loadError } = await supabase
        .from("expenses")
        .select("import_batch_id, created_at")
        .eq("user_id", userId)
        .not("import_batch_id", "is", null)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)
      if (loadError || !data) {
        if (isMissingFeature(loadError)) setIsUnavailable(true)
        return
      }
      ;(data as { import_batch_id: string | null; created_at: string | null }[]).forEach((row) => {
        if (!row.import_batch_id) return
        const group = groups.get(row.import_batch_id)
        if (group) group.count += 1
        else groups.set(row.import_batch_id, { batchId: row.import_batch_id, createdAt: row.created_at ?? "", count: 1 })
      })
      if (data.length < PAGE_SIZE) break
    }
    setRecentBatches(Array.from(groups.values()).slice(0, RECENT_BATCH_LIMIT))
  }, [userId])

  const loadGames = useCallback(async () => {
    const all: ImportGame[] = []
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error: loadError } = await supabase
        .from("games")
        .select("id, name")
        .order("id", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1)
      if (loadError || !data) break
      all.push(...(data as ImportGame[]))
      if (data.length < PAGE_SIZE) break
    }
    setGames(all)
  }, [])

  // 열 때만 초기화한다(배경 재조회가 진행 중인 단계를 지우지 않게 함).
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setStep("start")
      setError(null)
      setNotice(null)
      setIsUnavailable(false)
      setRows([])
      setFileName("")
      setMapping(null)
      setDefaultCategory("게임")
      setCandidates([])
      setSelected(new Set())
      setResult(null)
      void loadGames()
      void loadRecentBatches()
    }
    prevOpenRef.current = open
  }, [open, loadGames, loadRecentBatches])

  const gameNames = useMemo(() => new Map(games.map((game) => [game.id, game.name])), [games])

  const showPreview = (next: ImportCandidate[]) => {
    setCandidates(next)
    setSelected(new Set(next.map((candidate, index) => (isDefaultSelected(candidate) ? index : -1)).filter((index) => index >= 0)))
    setStep("preview")
  }

  const handleFile = async (file: File | undefined) => {
    setError(null)
    setNotice(null)
    if (!file) return
    if (file.size > IMPORT_MAX_BYTES) {
      setError("파일은 2MB 이하만 가져올 수 있습니다.")
      return
    }
    const parsed = parseCsv(decodeCsvBytes(new Uint8Array(await file.arrayBuffer())))
    const dataRows = countDataRows(parsed)
    if (dataRows === 0) {
      setError("가져올 데이터 행이 없습니다. 첫 줄은 열 이름이어야 합니다.")
      return
    }
    if (dataRows > IMPORT_MAX_ROWS) {
      setError(`한 번에 ${IMPORT_MAX_ROWS.toLocaleString()}행까지 가져올 수 있습니다. 파일을 나눠 주세요.`)
      return
    }
    setRows(parsed)
    setFileName(file.name)
    const context = { games, existing: existingExpenses, today: getKstToday() }
    if (isOwnExportHeader(parsed[0])) {
      showPreview(buildOwnFormatCandidates(parsed, context))
    } else {
      setMapping(guessColumnMapping(parsed[0]))
      setStep("mapping")
    }
  }

  const isMappingReady = mapping !== null && mapping.date >= 0 && mapping.amount >= 0 && mapping.title >= 0

  const handleMappingNext = () => {
    if (!mapping || !isMappingReady) return
    showPreview(buildGenericCandidates(rows, mapping, defaultCategory, { games, existing: existingExpenses, today: getKstToday() }))
  }

  const selectedCandidates = useMemo(() => candidates.filter((_, index) => selected.has(index)), [candidates, selected])
  const selectedTotal = selectedCandidates.reduce((sum, candidate) => sum + (candidate.amount ?? 0), 0)

  const toggle = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const handleImport = async () => {
    if (isOffline()) {
      setError(OFFLINE_WRITE_MESSAGE)
      return
    }
    const payload = toImportPayload(selectedCandidates)
    if (payload.length === 0) return
    setIsBusy(true)
    setError(null)
    const { data, error: rpcError } = await supabase.rpc("import_confirmed_expenses", { p_rows: payload as unknown as Json })
    setIsBusy(false)
    if (rpcError) {
      setError(isMissingFeature(rpcError) ? UNAVAILABLE_MESSAGE : `가져오지 못했습니다: ${rpcError.message}`)
      return
    }
    const value = (data ?? {}) as { batch_id?: string; inserted?: number }
    setResult({ batchId: value.batch_id ?? "", inserted: Number(value.inserted ?? payload.length), undone: null })
    setStep("done")
    onChanged()
    void loadRecentBatches()
  }

  const handleUndo = async (batchId: string) => {
    if (isOffline()) {
      setError(OFFLINE_WRITE_MESSAGE)
      return
    }
    setIsBusy(true)
    setError(null)
    setNotice(null)
    const { data, error: rpcError } = await supabase.rpc("delete_import_batch", { p_batch_id: batchId })
    setIsBusy(false)
    if (rpcError) {
      setError(isMissingFeature(rpcError) ? UNAVAILABLE_MESSAGE : `가져오기를 취소하지 못했습니다: ${rpcError.message}`)
      return
    }
    const count = Number(data ?? 0)
    if (result?.batchId === batchId) setResult({ ...result, undone: count })
    else setNotice(`가져온 지출 ${count.toLocaleString()}건을 취소했습니다.`)
    onChanged()
    void loadRecentBatches()
  }

  const writeDisabled = !isOnline || isBusy || isUnavailable
  const header = rows[0] ?? []

  return (
    <Dialog open={open} onOpenChange={(next) => !isBusy && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-line bg-surface text-content">
        <DialogHeader>
          <DialogTitle>CSV 가져오기</DialogTitle>
          <DialogDescription className="text-content-secondary">
            결제 완료 기록으로 가져옵니다. 총자산·지갑·포인트는 바뀌지 않습니다.
          </DialogDescription>
        </DialogHeader>

        {!isOnline && (
          <p role="status" className="text-sm font-medium text-warning">
            오프라인 상태입니다. 연결이 복구되면 가져오기와 취소를 진행할 수 있습니다.
          </p>
        )}
        {isUnavailable && (
          <p role="status" className="text-sm font-medium text-warning">
            {UNAVAILABLE_MESSAGE}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm text-success">
            {notice}
          </p>
        )}

        {step === "start" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-content-secondary">
                ChronoLedger에서 내보낸 지출 CSV는 바로 미리보기로 넘어가고, 그 밖의 CSV는 열을 직접 지정합니다. 2MB·1,000행 이하, UTF-8 또는 EUC-KR 파일을 지원합니다.
              </p>
              <input
                type="file"
                accept=".csv,text/csv"
                aria-label="CSV 파일 선택"
                disabled={isUnavailable}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ""
                  void handleFile(file)
                }}
                className="block w-full text-sm text-content-secondary file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
              />
            </div>
            {recentBatches.length > 0 && (
              <div className="space-y-2 border-t border-line pt-3" data-testid="recent-import-batches">
                <p className="text-xs font-semibold text-content">최근 가져오기</p>
                {recentBatches.map((batch) => (
                  <div key={batch.batchId} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-content-secondary">
                      {formatDateTime(batch.createdAt)} · {batch.count.toLocaleString()}건
                    </span>
                    <Button type="button" variant="outline" size="sm" disabled={writeDisabled} onClick={() => void handleUndo(batch.batchId)}>
                      가져오기 취소
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === "mapping" && mapping && (
          <div className="space-y-3">
            <p className="text-sm text-content-secondary">
              {fileName}: 각 항목이 들어 있는 열을 고르세요. 날짜는 YYYY-MM-DD·YYYY.MM.DD·YYYY/MM/DD, 금액은 정수만 읽습니다.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {MAPPING_FIELDS.map((field) => (
                <label key={field.key} className="space-y-1 text-xs text-content-secondary">
                  <span>
                    {field.label} {field.required ? "(필수)" : "(선택)"}
                  </span>
                  <select
                    aria-label={`${field.label} 열`}
                    className={SELECT_CLASS}
                    value={String(mapping[field.key] ?? -1)}
                    onChange={(event) => {
                      const value = Number(event.target.value)
                      setMapping((prev) =>
                        prev ? { ...prev, [field.key]: field.required ? value : value < 0 ? null : value } : prev,
                      )
                    }}
                  >
                    <option value="-1">{field.required ? "열 선택" : "사용 안 함"}</option>
                    {header.map((name, index) => (
                      <option key={index} value={String(index)}>
                        {name || `${index + 1}번째 열`}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              {mapping.category === null && (
                <label className="space-y-1 text-xs text-content-secondary">
                  <span>기본 분류</span>
                  <select aria-label="기본 분류" className={SELECT_CLASS} value={defaultCategory} onChange={(event) => setDefaultCategory(event.target.value)}>
                    {IMPORT_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <DialogFooter className="flex flex-row justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setStep("start")}>
                다른 파일
              </Button>
              <Button type="button" size="sm" disabled={!isMappingReady} onClick={handleMappingNext}>
                미리보기
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-3">
            <div className="rounded-md border border-line bg-surface-2 p-3 text-sm" data-testid="import-summary">
              <p className="font-semibold text-content">
                가져올 {selectedCandidates.length.toLocaleString()}건 · 합계 {selectedTotal.toLocaleString()}원
              </p>
              <p className="mt-1 text-xs text-content-secondary">
                가져온 확정 지출은 해당 달 예산·통계·게임별 예산에 반영됩니다. 중복 의심 행은 기본으로 빠져 있으니 확인 후 직접 체크하세요.
              </p>
            </div>
            <ul className="max-h-[45vh] divide-y divide-line overflow-y-auto rounded-md border border-line" data-testid="import-preview">
              {candidates.map((candidate, index) => {
                const excluded = candidate.excludeReason !== null
                return (
                  <li key={candidate.rowNumber} className={`flex items-start gap-3 px-3 py-2 text-sm ${excluded ? "opacity-60" : ""}`}>
                    <input
                      type="checkbox"
                      className="mt-1"
                      aria-label={`${candidate.rowNumber}행 가져오기`}
                      checked={selected.has(index)}
                      disabled={excluded}
                      onChange={() => toggle(index)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium text-content" title={candidate.title}>
                          {candidate.title || "(항목명 없음)"}
                        </span>
                        <span className="shrink-0 text-content">{candidate.amount !== null ? `${candidate.amount.toLocaleString()}원` : "-"}</span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-content-secondary">
                        <span>{candidate.rowNumber}행</span>
                        <span>{candidate.target_date ?? "날짜 없음"}</span>
                        <span>{candidate.category}</span>
                        {candidate.game_id && <span>{gameNames.get(candidate.game_id) ?? "게임"}</span>}
                        {candidate.gameUnmatched && <span className="rounded bg-warning/15 px-1.5 py-0.5 font-semibold text-warning">게임 미매칭</span>}
                        {candidate.excludeReason && (
                          <span className="rounded bg-danger/15 px-1.5 py-0.5 font-semibold text-danger">{EXCLUDE_REASON_LABELS[candidate.excludeReason]}</span>
                        )}
                        {candidate.suspectedDuplicate && <span className="rounded bg-warning/15 px-1.5 py-0.5 font-semibold text-warning">중복 의심</span>}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
            <DialogFooter className="flex flex-row justify-end gap-2">
              <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={() => setStep("start")}>
                다른 파일
              </Button>
              <Button type="button" size="sm" disabled={writeDisabled || selectedCandidates.length === 0} onClick={() => void handleImport()}>
                {selectedCandidates.length.toLocaleString()}건 가져오기
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "done" && result && (
          <div className="space-y-3">
            <p className="text-sm text-content" data-testid="import-result">
              {result.undone === null
                ? `지출 ${result.inserted.toLocaleString()}건을 가져왔습니다.`
                : `가져온 지출 ${result.undone.toLocaleString()}건을 취소했습니다.`}
            </p>
            <DialogFooter className="flex flex-row justify-end gap-2">
              {result.undone === null && result.batchId && (
                <Button type="button" variant="outline" size="sm" disabled={writeDisabled} onClick={() => void handleUndo(result.batchId)}>
                  가져오기 취소
                </Button>
              )}
              <Button type="button" size="sm" disabled={isBusy} onClick={() => onOpenChange(false)}>
                닫기
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
