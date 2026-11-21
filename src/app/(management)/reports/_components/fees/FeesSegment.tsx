'use client'

import { ALL_BATCHES, formatFeesRefreshTime } from '@/lib/reports/fees'
import type { FeesReport, FeesSelection } from '@/lib/reports/fees'
import FeeCollectionCard from './FeeCollectionCard'
import FeesFilterBar from './FeesFilterBar'
import type { FeesControls } from './FeesFilterBar'
import { feesGridClass, FeesSkeleton } from './FeesCharts'
import OutstandingBalanceCard from './OutstandingBalanceCard'
import PaymentModeCard from './PaymentModeCard'
import PaymentStatusCard from './PaymentStatusCard'

export default function FeesSegment({ report, selection, onRetry, error, pending, loadingLabel, refreshedAt, ...controls }: FeesControls & {
  report: FeesReport | null
  selection: FeesSelection | null
  error?: string
  pending: boolean
  loadingLabel?: string
  refreshedAt?: string
  onRetry?: () => void
}) {
  const stacked = selection?.batchId === ALL_BATCHES
  const month = controls.period.mode === 'month'
  return <div className="space-y-6">
    {(report || !error) && <div className="flex flex-wrap items-center justify-between gap-3">
      <FeesFilterBar {...controls} batchId={selection?.batchId ?? ALL_BATCHES} batches={report?.batches ?? []}
        pending={pending || !report} loadingLabel={loadingLabel} />
      {refreshedAt && <p className="text-xs text-so-muted">Data refreshed <time dateTime={refreshedAt}>{formatFeesRefreshTime(refreshedAt)}</time></p>}
    </div>}
    {error && <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-5 flex items-center justify-between gap-4">
      <p role="alert" className="text-sm text-so-red">{error}</p>
      {onRetry && <button type="button" onClick={onRetry} className="flex items-center justify-center gap-2 bg-so-accent text-so-accent-text px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50">Try again</button>}
    </div>}
    {selection ? <div className={feesGridClass}>
      <FeeCollectionCard chart={selection.collection} stacked={stacked} month={month} />
      <OutstandingBalanceCard chart={selection.outstanding} stacked={stacked} month={month} />
      <PaymentStatusCard slices={selection.status} />
      <PaymentModeCard slices={selection.modes} />
    </div> : !error && <FeesSkeleton />}
  </div>
}
