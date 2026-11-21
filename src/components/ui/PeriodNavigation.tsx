import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Period, PeriodMode } from '@/lib/period'

const pillClass = 'px-3 py-1.5 text-xs font-semibold rounded-full transition-colors'
export const periodButtonClass = 'shrink-0 p-2 border border-so-border rounded-lg text-so-muted disabled:opacity-50'

export default function PeriodNavigation<Mode extends PeriodMode>({
  period, modes, onNavigate, pending = false, loadingLabel, filtersLabel, periodLabel = 'Selected period', children,
}: {
  period: Period<Mode>
  modes: readonly Mode[]
  onNavigate: (mode: Mode, date: string) => void
  pending?: boolean
  loadingLabel?: string
  filtersLabel: string
  periodLabel?: string
  children?: ReactNode
}) {
  const next = period.next
  return <div role="group" aria-label={filtersLabel} aria-busy={pending || !!loadingLabel} className="flex flex-wrap items-center gap-3">
    <div role="group" aria-label="Period type" className="flex items-center gap-2 flex-wrap">
      {modes.map(mode => <button key={mode} type="button" aria-pressed={period.mode === mode}
        disabled={pending} onClick={() => onNavigate(mode, period.anchor)}
        className={`${pillClass} ${period.mode === mode ? 'bg-so-accent text-so-accent-text' : 'border border-so-border text-so-muted hover:border-so-accent'}`}>
        {mode[0].toUpperCase() + mode.slice(1)}
      </button>)}
    </div>
    <div className="flex min-w-0 max-w-full items-center gap-2" role="group" aria-label={periodLabel}>
      <button type="button" disabled={pending} aria-label="Previous period" onClick={() => onNavigate(period.mode, period.previous)} className={periodButtonClass}>
        <ChevronLeft className="w-4 h-4 shrink-0" strokeWidth={1.75} />
      </button>
      <span aria-live="polite" className="text-sm font-medium text-so-text">{period.label}</span>
      <button type="button" disabled={pending || next === null} aria-label="Next period" onClick={() => next && onNavigate(period.mode, next)} className={periodButtonClass}>
        <ChevronRight className="w-4 h-4 shrink-0" strokeWidth={1.75} />
      </button>
    </div>
    {loadingLabel && <span role="status" className="flex items-center gap-2 text-xs text-so-muted">
      <Loader2 className="w-4 h-4 shrink-0 animate-spin" strokeWidth={1.75} aria-hidden="true" />{loadingLabel}
    </span>}
    {children}
  </div>
}
