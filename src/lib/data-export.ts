// R113: 본인 데이터를 Supabase에서 조회해 브라우저에서 파일로 만든다. DB·RPC 변경 없이 RLS가 본인 행만 돌려준다는 전제로 동작한다.
import { supabase } from "@/lib/supabase/client"
import {
  BACKUP_FORMAT,
  BACKUP_TABLES,
  BACKUP_VERSION,
  PAGE_SIZE,
  buildExpensesCsv,
  buildIncomesCsv,
  toKstIso,
} from "@/lib/export-format"

type Row = Record<string, unknown>

interface PageResult {
  data: Row[] | null
  error: { message: string } | null
}

export interface SkippedTable {
  table: string
  reason: string
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT
  version: typeof BACKUP_VERSION
  exported_at: string
  user_id: string
  tables: Record<string, Row[]>
  catalog: {
    games: { id: string; name: string }[]
    schedules: { id: string; game_id: string | null; title: string; start_date: string | null; end_date: string | null }[]
  }
  skipped: SkippedTable[]
}

/** `.range()`로 1,000행씩 끝까지 읽는다. 한 페이지라도 실패하면 오류를 던진다. */
async function fetchAllPages(fetchPage: (from: number, to: number) => PromiseLike<PageResult>): Promise<Row[]> {
  const all: Row[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    const rows = data ?? []
    all.push(...rows)
    if (rows.length < PAGE_SIZE) return all
  }
}

// 동적 테이블·열 이름이라 생성 타입의 오버로드를 쓸 수 없어 필요한 메서드만 구조 타입으로 좁힌다.
interface RowQuery extends PromiseLike<PageResult> {
  eq: (column: string, value: string) => RowQuery
  in: (column: string, values: string[]) => RowQuery
  order: (column: string, options: { ascending: boolean }) => RowQuery
  range: (from: number, to: number) => RowQuery
}

function selectFrom(table: string, columns: string): RowQuery {
  return (supabase.from(table as never) as unknown as { select: (columns: string) => RowQuery }).select(columns)
}

function fetchOwnRows(
  table: string,
  filterColumn: string,
  userId: string,
  orderColumns: readonly string[],
): Promise<Row[]> {
  return fetchAllPages((from, to) => {
    let query = selectFrom(table, "*").eq(filterColumn, userId)
    orderColumns.forEach((column) => {
      query = query.order(column, { ascending: true })
    })
    return query.range(from, to)
  })
}

async function fetchByIds(table: string, columns: string, ids: readonly string[]): Promise<Row[]> {
  const CHUNK = 100
  const rows: Row[] = []
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { data, error } = await selectFrom(table, columns).in("id", ids.slice(i, i + CHUNK) as string[])
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
  }
  return rows
}

function collectIds(rows: readonly Row[], column: string, into: Set<string>) {
  rows.forEach((row) => {
    const value = row[column]
    if (typeof value === "string" && value) into.add(value)
  })
}

/** 지출·템플릿·관심 일정 등이 참조하는 게임·일정의 이름만 모아 파일 단독으로도 읽히게 한다. */
async function buildCatalog(tables: Record<string, Row[]>, skipped: SkippedTable[]): Promise<BackupFile["catalog"]> {
  const gameIds = new Set<string>()
  const scheduleIds = new Set<string>()
  Object.values(tables).forEach((rows) => collectIds(rows, "game_id", gameIds))
  collectIds(tables.expenses ?? [], "schedule_id", scheduleIds)
  collectIds(tables.expenses ?? [], "pickup_schedule_id", scheduleIds)
  collectIds(tables.user_favorite_schedules ?? [], "schedule_id", scheduleIds)

  const catalog: BackupFile["catalog"] = { games: [], schedules: [] }
  try {
    const schedules = await fetchByIds("game_schedules", "id, game_id, title, start_date, end_date", Array.from(scheduleIds))
    schedules.forEach((row) => collectIds([row], "game_id", gameIds))
    catalog.schedules = schedules.map((row) => ({
      id: String(row.id),
      game_id: (row.game_id as string | null) ?? null,
      title: String(row.title ?? ""),
      start_date: (row.start_date as string | null) ?? null,
      end_date: (row.end_date as string | null) ?? null,
    }))
    const games = await fetchByIds("games", "id, name", Array.from(gameIds))
    catalog.games = games.map((row) => ({ id: String(row.id), name: String(row.name ?? "") }))
  } catch (cause) {
    skipped.push({ table: "catalog", reason: cause instanceof Error ? cause.message : "조회 실패" })
  }
  return catalog
}

/** 전체 백업 JSON 객체를 만든다. 조회에 실패한 테이블은 빼고 `skipped`에 사유를 남긴다. */
export async function buildBackup(userId: string, now: Date = new Date()): Promise<BackupFile> {
  const tables: Record<string, Row[]> = {}
  const skipped: SkippedTable[] = []
  for (const config of BACKUP_TABLES) {
    try {
      tables[config.table] = await fetchOwnRows(config.table, config.filterColumn, userId, config.orderColumns)
    } catch (cause) {
      skipped.push({ table: config.table, reason: cause instanceof Error ? cause.message : "조회 실패" })
    }
  }
  const catalog = await buildCatalog(tables, skipped)
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exported_at: toKstIso(now),
    user_id: userId,
    tables,
    catalog,
    skipped,
  }
}

// CSV는 사람이 읽는 파일이라 '날짜' 열 오름차순으로 낸다. 같은 날짜는 생성시각·ID 순이며 ID가 있어 페이지 조회 순서도 안정적이다.
export async function buildExpensesCsvForUser(userId: string): Promise<string> {
  const rows = await fetchOwnRows("expenses", "user_id", userId, ["target_date", "created_at", "id"])
  const gameIds = new Set<string>()
  collectIds(rows, "game_id", gameIds)
  const games = await fetchByIds("games", "id, name", Array.from(gameIds))
  const names = new Map<string, string>()
  games.forEach((game) => names.set(String(game.id), String(game.name ?? "")))
  return buildExpensesCsv(rows, names)
}

export async function buildIncomesCsvForUser(userId: string): Promise<string> {
  const rows = await fetchOwnRows("incomes", "user_id", userId, ["income_date", "created_at", "id"])
  return buildIncomesCsv(rows)
}

/** 저장 시작 전에 Blob URL이 폐기되지 않도록 클릭 후 일정 시간 뒤에 해제한다(R113-REV-001). */
const BLOB_URL_REVOKE_DELAY_MS = 10_000

/** `Blob` + `<a download>`로 파일을 저장한다(웹·Tauri WebView2 공통). */
export function downloadTextFile(fileName: string, mimeType: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }))
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), BLOB_URL_REVOKE_DELAY_MS)
}
