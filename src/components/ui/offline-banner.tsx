"use client"

import { useOnlineStatus } from "@/lib/use-online-status"

export function OfflineBanner() {
  const isOnline = useOnlineStatus()
  if (isOnline) return null
  return (
    <div role="status" className="bg-warning px-4 py-2 text-center text-sm font-medium text-primary-foreground">
      오프라인 상태입니다. 지출 등록·결제·환불·지갑 설정·요청 제출 등 저장 작업은 연결이 복구된 후 사용할 수 있으며, 최신 데이터는 불러오지 못할 수 있습니다.
    </div>
  )
}
