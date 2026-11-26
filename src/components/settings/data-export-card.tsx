"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  buildBackup,
  buildExpensesCsvForUser,
  buildIncomesCsvForUser,
  downloadTextFile,
} from "@/lib/data-export"
import { buildBackupFileName, buildExpensesFileName, buildIncomesFileName } from "@/lib/export-format"
import { isOffline } from "@/lib/offline-guard"

type ExportKind = "backup" | "expenses" | "incomes"

const OFFLINE_EXPORT_MESSAGE = "오프라인 상태에서는 데이터를 내보낼 수 없습니다. 연결이 복구된 후 다시 시도해 주세요."

export function DataExportCard({ userId }: { userId: string }) {
  const [busy, setBusy] = useState<ExportKind | null>(null)
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null)

  const runExport = async (kind: ExportKind) => {
    if (busy) return
    if (isOffline()) {
      setMessage({ kind: "error", text: OFFLINE_EXPORT_MESSAGE })
      return
    }
    setBusy(kind)
    setMessage(null)
    try {
      if (kind === "backup") {
        const backup = await buildBackup(userId)
        downloadTextFile(buildBackupFileName(), "application/json", JSON.stringify(backup, null, 2))
        const skipped = backup.skipped.length
        setMessage({
          kind: "ok",
          text: skipped > 0
            ? `전체 백업을 저장했습니다. 조회하지 못한 항목 ${skipped}건은 파일의 skipped에 기록했습니다.`
            : "전체 백업을 저장했습니다.",
        })
      } else if (kind === "expenses") {
        downloadTextFile(buildExpensesFileName(), "text/csv;charset=utf-8", await buildExpensesCsvForUser(userId))
        setMessage({ kind: "ok", text: "지출 CSV를 저장했습니다." })
      } else {
        downloadTextFile(buildIncomesFileName(), "text/csv;charset=utf-8", await buildIncomesCsvForUser(userId))
        setMessage({ kind: "ok", text: "수익 CSV를 저장했습니다." })
      }
    } catch (cause: unknown) {
      setMessage({
        kind: "error",
        text: cause instanceof Error ? `내보내기에 실패했습니다: ${cause.message}` : "내보내기에 실패했습니다.",
      })
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card className="border-line text-content">
      <CardHeader>
        <CardTitle>데이터 내보내기</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-content-secondary">
          내 데이터를 파일로 저장합니다. 알림 수신 정보(푸시 구독)와 이미지 파일은 포함하지 않습니다.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void runExport("backup")}>
            {busy === "backup" ? "백업 만드는 중..." : "전체 백업(JSON)"}
          </Button>
          <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void runExport("expenses")}>
            {busy === "expenses" ? "지출 내보내는 중..." : "지출 CSV"}
          </Button>
          <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void runExport("incomes")}>
            {busy === "incomes" ? "수익 내보내는 중..." : "수익 CSV"}
          </Button>
        </div>
        {message && (
          <p role={message.kind === "error" ? "alert" : "status"} className={message.kind === "error" ? "text-sm text-danger" : "text-sm text-success"}>
            {message.text}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
