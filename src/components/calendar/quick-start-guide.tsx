import Link from "next/link"
import { HelpCircle, Keyboard, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface QuickStartGuideProps {
  isOpen: boolean
  isSignedIn: boolean
  onToggle: () => void
  onDismiss: () => void
}

const SHORTCUT_ITEMS = [
  { keyLabel: "[", description: "이전 달" },
  { keyLabel: "]", description: "다음 달" },
  { keyLabel: "T", description: "오늘로 이동" },
  { keyLabel: "V", description: "캘린더/주차 전환" },
  { keyLabel: "N", description: "새 지출 등록" },
  { keyLabel: "?", description: "안내 펼침/접기" },
] as const

/** FR-001 비차단 원칙을 따르는 선택형 접이식 빠른 시작 및 데스크톱 단축키 안내. */
export function QuickStartGuide({ isOpen, isSignedIn, onToggle, onDismiss }: QuickStartGuideProps) {
  return (
    <div className="space-y-2" data-testid="quick-start-guide">
      <div className="flex items-center justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-expanded={isOpen}
          onClick={onToggle}
          className="h-8 gap-1.5 text-xs text-content-secondary hover:text-content"
        >
          <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
          ? 빠른 시작 · 단축키
        </Button>
      </div>

      {isOpen && (
        <section
          aria-label="빠른 시작 및 단축키 안내"
          className="rounded-lg border border-line bg-surface p-3.5 text-xs shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-content">빠른 시작 가이드</h2>
              <p className="text-content-secondary">
                {isSignedIn
                  ? "아래 3단계로 게임 일정과 예정 지출을 간편하게 연결할 수 있습니다."
                  : "게스트 모드에서는 공식 일정을 둘러볼 수 있으며, 로그인 후 개인 지출·알림을 관리할 수 있습니다."}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="빠른 시작 닫기"
              onClick={onDismiss}
              className="h-7 shrink-0 px-2 text-xs text-content-secondary hover:text-content"
            >
              <X className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              닫기
            </Button>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-md border border-line bg-surface-2 p-2.5">
              <p className="font-semibold text-content">1. 게임 구독</p>
              <p className="mt-1 text-content-secondary">
                <Link href="/dashboard/games" className="text-primary underline-offset-2 hover:underline">
                  게임 관리
                </Link>
                에서 플레이 중인 게임을 등록합니다.
              </p>
            </div>
            <div className="rounded-md border border-line bg-surface-2 p-2.5">
              <p className="font-semibold text-content">2. 관심 일정 · 예정 지출</p>
              <p className="mt-1 text-content-secondary">
                캘린더 일정에 ★ 관심 등록 후 예정 지출을 바로 연결합니다.
              </p>
            </div>
            <div className="rounded-md border border-line bg-surface-2 p-2.5">
              <p className="font-semibold text-content">3. 예산 · 지갑 · 알림</p>
              <p className="mt-1 text-content-secondary">
                <Link href="/dashboard/expenses" className="text-primary underline-offset-2 hover:underline">
                  소비
                </Link>
                ·
                <Link href="/dashboard/settings" className="text-primary underline-offset-2 hover:underline">
                  설정
                </Link>
                에서 월 예산, 스토어 지갑, 알림을 설정합니다.
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line pt-2.5 text-content-secondary">
            <span className="inline-flex items-center gap-1 font-medium text-content">
              <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />
              데스크톱 단축키
            </span>
            {SHORTCUT_ITEMS.map((item) => (
              <span key={item.keyLabel} className="inline-flex items-center gap-1">
                <kbd className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-content">
                  {item.keyLabel}
                </kbd>
                <span>{item.description}</span>
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
