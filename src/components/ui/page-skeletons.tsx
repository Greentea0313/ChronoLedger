import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function GamesPageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in" aria-busy="true" aria-label="게임 목록 불러오는 중">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-24 rounded-md" />
          <Skeleton className="h-10 w-24 rounded-md" />
        </div>
      </header>

      <Card className="border-line bg-surface">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-3.5 w-60" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col justify-between p-4 rounded-lg border border-line bg-surface-2 space-y-4"
              >
                <div className="flex items-start gap-3">
                  <Skeleton className="w-14 h-14 rounded-lg shrink-0" />
                  <div className="space-y-2 flex-1 min-w-0">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3.5 w-1/2" />
                  </div>
                </div>
                <div className="pt-3 border-t border-line flex items-center justify-between gap-2">
                  <Skeleton className="h-8 flex-1 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function ExpensesPageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in" aria-busy="true" aria-label="소비 내역 불러오는 중">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-28 rounded-md" />
        </div>
      </header>

      {/* 요약 통계 카드 3개 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border-line bg-surface p-4 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-3 w-40" />
          </Card>
        ))}
      </div>

      {/* 탭 및 목록 영역 */}
      <Card className="border-line bg-surface">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-48 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-line last:border-b-0">
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-6 rounded" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in" aria-busy="true" aria-label="대시보드 불러오는 중">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,360px] gap-6 items-start">
        {/* 좌측 캘린더 영역 */}
        <Card className="border-line bg-surface p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-line">
            <Skeleton className="h-7 w-36" />
            <div className="flex items-center gap-1">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-6 rounded" />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="min-h-[70px] sm:min-h-[90px] rounded-md" />
            ))}
          </div>
        </Card>

        {/* 우측 사이드바 영역 */}
        <div className="space-y-4">
          <Card className="border-line bg-surface p-4 space-y-3">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="flex justify-between pt-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
          </Card>
          <Card className="border-line bg-surface p-4 space-y-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-16 w-full rounded-md" />
            <Skeleton className="h-16 w-full rounded-md" />
          </Card>
        </div>
      </div>
    </div>
  )
}

