'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import PeriodNavigation, { periodButtonClass } from '@/components/ui/PeriodNavigation'
import { PERIOD_MODES } from '@/lib/period'
import type { Period, PeriodMode } from '@/lib/period'

export default function DashboardPeriodNavigation({ period }: { period: Period }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const navigate = (mode: PeriodMode, date: string) =>
    startTransition(() => router.replace('/dashboard?mode=' + mode + '&date=' + date, { scroll: false }))

  return <PeriodNavigation period={period} modes={PERIOD_MODES} onNavigate={navigate}
    pending={pending} loadingLabel={pending ? 'Loading period…' : undefined} filtersLabel="Dashboard filters">
    <button type="button" disabled={pending} aria-label="Refresh dashboard"
      onClick={() => startTransition(() => router.refresh())} className={periodButtonClass}>
      <RefreshCw className="w-4 h-4 shrink-0" strokeWidth={1.75} />
    </button>
  </PeriodNavigation>
}
