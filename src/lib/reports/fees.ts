import { getReportBuckets } from './period'
import type { ReportBucket as FeesBucket, ReportPeriod as FeesPeriod, ReportRange as FeesRange } from './period'
import type { Database } from '@/lib/supabase/database.types'

export type { ReportBucket as FeesBucket, ReportMode as FeesMode, ReportPeriod as FeesPeriod, ReportRange as FeesRange } from './period'
export { getReportPeriod as getFeesPeriod, getReportWindowRange as getFeesWindowRange,
  coversReportPeriod as coversFeesPeriod, formatReportPaise as formatFeePaise, formatReportRefreshTime as formatFeesRefreshTime } from './period'

type Tables = Database['public']['Tables']
export type FeesReceipt = Pick<Tables['student_payments']['Row'], 'id' | 'student_id' | 'date' | 'amount' | 'remaining_amount' | 'payment_type' | 'payment_method' | 'status'>
export type FeesClearance = Pick<Tables['student_payments']['Row'], 'settles_payment_id' | 'amount' | 'status'>
export type FeesStudent = Pick<Tables['students']['Row'], 'id' | 'batch_id'>
export type FeesBatch = Pick<Tables['batches']['Row'], 'id' | 'name' | 'is_active'>

export const ALL_BATCHES = 'all'
export const UNASSIGNED_BATCH = 'unassigned'
export const UNAVAILABLE_BATCH = 'unavailable'
const PALETTE = ['so-accent', 'so-emerald', 'so-purple', 'so-orange', 'so-blue', 'so-yellow', 'so-red', 'so-grey']

export const PAYMENT_STATUS = [
  { key: 'paid', label: 'Paid', color: 'so-emerald' },
  { key: 'partiallyPaid', label: 'Partially Paid', color: 'so-accent' },
  { key: 'partialDue', label: 'Partial Due', color: 'so-yellow' },
] as const
export const PAYMENT_MODES = [
  { key: 'cash', label: 'Cash', color: 'so-emerald' },
  { key: 'upi', label: 'UPI', color: 'so-accent' },
  { key: 'card', label: 'Card', color: 'so-purple' },
  { key: 'other', label: 'Other', color: 'so-grey' },
  { key: 'unspecified', label: 'Unspecified', color: 'so-yellow' },
] as const

export const FEES_NOTES = {
  collection: 'Money received by payment date, including balance payments.',
  outstanding: 'Still unpaid today, grouped by the original receipt date.',
  status: 'Current settlement of original receipts dated in this period, including later balance payments.',
  mode: 'Money received in this period, grouped by payment mode.',
}

type Series = { id: string; label: string; color: string; pattern: number }
type BatchSummary = Series & {
  collection: number[]
  outstanding: number[]
  status: Record<typeof PAYMENT_STATUS[number]['key'], number>
  modes: Record<typeof PAYMENT_MODES[number]['key'], number>
}
export type FeesReport = { buckets: FeesBucket[]; batches: BatchSummary[] }
type PaymentStatusTotals = BatchSummary['status']
type PaymentModeTotals = BatchSummary['modes']
type DailyTotal = {
  date: string; batchId: string; collection: number; status: PaymentStatusTotals; modes: PaymentModeTotals
}
export type FeesDailyData = { batches: Series[]; days: DailyTotal[] }
export type FeesWindow = FeesDailyData & { range: FeesRange; today: string; refreshedAt: string }
export type FeesWindowResult = { window: FeesWindow } | { error: string; unavailable?: boolean }

export function canReadFeesReport(role: string) {
  return role === 'owner' || role === 'manager'
}

const emptyStatus = (): PaymentStatusTotals => ({ paid: 0, partiallyPaid: 0, partialDue: 0 })
const emptyModes = (): PaymentModeTotals => ({ cash: 0, upi: 0, card: 0, other: 0, unspecified: 0 })

export function buildFeesDaily(range: FeesRange, receipts: FeesReceipt[], clearances: FeesClearance[], students: FeesStudent[], batches: FeesBatch[]): FeesDailyData {
  const byStudent = new Map(students.map(student => [student.id, student]))
  const byBatch = new Map<string, Series>()
  const byBatchAndDate = new Map<string, DailyTotal>()
  const cleared = new Map<string, number>()

  for (const row of clearances) {
    if (row.status !== 'deleted' && row.settles_payment_id) {
      cleared.set(row.settles_payment_id, (cleared.get(row.settles_payment_id) ?? 0) + row.amount)
    }
  }

  const addBatch = (series: Series) => byBatch.set(series.id, series)

  const names = new Map([['Unassigned', 1], ['Batch unavailable', 1], ['All Batches', 1]])
  for (const batch of batches) names.set(batch.name, (names.get(batch.name) ?? 0) + 1)
  const orderedBatches = [...batches].sort((a, b) => a.id.localeCompare(b.id))
  for (const [index, batch] of orderedBatches.entries()) {
    const identifier = (names.get(batch.name) ?? 0) > 1 ? ` · ${batch.id.slice(0, 8)}` : ''
    addBatch({
      id: batch.id,
      label: batch.name + identifier + (batch.is_active ? '' : ' (Archived)'),
      color: PALETTE[index % PALETTE.length],
      pattern: Math.floor(index / PALETTE.length),
    })
  }
  addBatch({ id: UNASSIGNED_BATCH, label: 'Unassigned', color: 'so-muted', pattern: 1 })

  for (const row of receipts) {
    if (row.status === 'deleted' || row.date < range.start || row.date > range.through) continue
    const student = byStudent.get(row.student_id)
    const id = student && student.batch_id === null ? UNASSIGNED_BATCH : student?.batch_id ?? UNAVAILABLE_BATCH
    const batchId = byBatch.has(id) ? id : UNAVAILABLE_BATCH
    if (!byBatch.has(batchId)) addBatch({ id: batchId, label: 'Batch unavailable', color: 'so-muted', pattern: 2 })
    const key = `${batchId}/${row.date}`
    let day = byBatchAndDate.get(key)
    if (!day) {
      day = { date: row.date, batchId, collection: 0, status: emptyStatus(), modes: emptyModes() }
      byBatchAndDate.set(key, day)
    }

    day.collection += row.amount
    day.modes[row.payment_method ?? 'unspecified'] += row.amount
    if (row.payment_type === 'due_clearance') continue

    const settled = row.amount + (cleared.get(row.id) ?? 0)
    if (row.remaining_amount > 0) {
      day.status.partialDue += row.remaining_amount
      day.status.partiallyPaid += settled
    } else {
      day.status.paid += settled
    }
  }

  return { batches: [...byBatch.values()].sort((a, b) => a.label.localeCompare(b.label)), days: [...byBatchAndDate.values()] }
}

export function rollUpFeesPeriod(data: FeesDailyData, period: FeesPeriod): FeesReport {
  const buckets = getReportBuckets(period)
  const batches = data.batches.map((batch): BatchSummary => ({
    ...batch, collection: buckets.map(() => 0), outstanding: buckets.map(() => 0), status: emptyStatus(), modes: emptyModes(),
  }))
  const byBatch = new Map(batches.map(batch => [batch.id, batch]))
  for (const day of data.days) {
    if (day.date < period.start || day.date > period.through) continue
    const index = buckets.findIndex(bucket => day.date >= bucket.start && day.date <= bucket.end)
    const batch = byBatch.get(day.batchId)
    if (!batch || index === -1) continue
    batch.collection[index] += day.collection
    batch.outstanding[index] += day.status.partialDue
    for (const { key } of PAYMENT_STATUS) batch.status[key] += day.status[key]
    for (const { key } of PAYMENT_MODES) batch.modes[key] += day.modes[key]
  }
  return { buckets, batches }
}

export function selectFeesReport(report: FeesReport, batchId: string) {
  const selected = report.batches.find(batch => batch.id === batchId)
  const batches = selected ? [selected] : report.batches
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)
  const bar = (metric: 'collection' | 'outstanding') => {
    const series = batches.map(batch => ({ id: batch.id, label: batch.label, color: batch.color,
      pattern: batch.pattern, total: sum(batch[metric]) })).filter(batch => batch.total > 0 || batch.id === selected?.id)
    return {
      total: sum(series.map(batch => batch.total)),
      series,
      buckets: report.buckets.map((bucket, index) => ({ ...bucket, amounts: Object.fromEntries(
        batches.filter(batch => batch[metric][index] > 0).map(batch => [batch.id, batch[metric][index]]),
      ) })),
    }
  }
  return {
    batchId: selected?.id ?? ALL_BATCHES,
    batchLabel: selected?.label ?? 'All Batches',
    collection: bar('collection'),
    outstanding: bar('outstanding'),
    status: PAYMENT_STATUS.map(slice => ({ ...slice, amount: sum(batches.map(batch => batch.status[slice.key])) })),
    modes: PAYMENT_MODES.map(slice => ({ ...slice, amount: sum(batches.map(batch => batch.modes[slice.key])) })),
  }
}

export type FeesSelection = ReturnType<typeof selectFeesReport>
