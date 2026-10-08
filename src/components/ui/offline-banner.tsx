"use client"

import { useOnlineStatus } from "@/lib/use-online-status"

export function OfflineBanner() {
  const isOnline = useOnlineStatus()
  if (isOnline) return null
  return (
    <div role="status" className="bg-yellow-600 px-4 py-2 text-center text-sm text-white">
      오프라인 상태입니다. 조회만 가능하며 지출 등록·결제·환불·설정 변경은 연결이 복구된 후 사용할 수 있습니다.
    </div>
  )
}
