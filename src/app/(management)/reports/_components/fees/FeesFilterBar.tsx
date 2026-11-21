import { ChevronDown, Layers } from 'lucide-react'
import { ALL_BATCHES } from '@/lib/reports/fees'
import type { FeesMode, FeesPeriod, FeesReport } from '@/lib/reports/fees'

import ReportPeriodBar from '../ReportPeriodBar'

export type FeesControls = {
  period: FeesPeriod
  batchId: string
  onBatchChange: (batchId: string) => void
  onNavigate: (mode: FeesMode, date: string) => void
}

export default function FeesFilterBar({ period, batchId, batches, onBatchChange, onNavigate, pending, loadingLabel }: FeesControls & {
  batches: FeesReport['batches']; pending: boolean; loadingLabel?: string
}) {
  return <ReportPeriodBar period={period} onNavigate={onNavigate} pending={pending} loadingLabel={loadingLabel}
    filtersLabel="Fees filters" periodLabel="Fee report period">
    <div className="relative min-w-0">
      <Layers className="w-4 h-4 shrink-0 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-so-muted" strokeWidth={1.75} />
      <select aria-label="Batch" value={batchId} disabled={pending || batches.length === 0} onChange={event => onBatchChange(event.target.value)}
        className="pl-9 pr-8 py-2 bg-so-card border border-so-border rounded-lg text-sm text-so-text focus:outline-none focus:border-so-accent shadow-sm cursor-pointer appearance-none max-w-full disabled:opacity-50">
        <option value={ALL_BATCHES}>All Batches</option>
        {pending && batchId !== ALL_BATCHES && !batches.some(batch => batch.id === batchId) && <option value={batchId}>Selected batch</option>}
        {batches.map(batch => <option key={batch.id} value={batch.id}>{batch.label}</option>)}
      </select>
      <ChevronDown className="w-4 h-4 shrink-0 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-so-muted" strokeWidth={1.75} />
    </div>
  </ReportPeriodBar>
}
