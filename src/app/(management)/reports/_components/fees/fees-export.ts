import { format, parseISO } from 'date-fns'
import { FEES_NOTES, formatFeePaise, formatFeesRefreshTime } from '@/lib/reports/fees'
import type { FeesPeriod, FeesSelection } from '@/lib/reports/fees'
import type { ExportSection, ReportExportPayload } from '../../export'

function barSection(title: string, note: string, chart: FeesSelection['collection']): ExportSection {
  return {
    title,
    note,
    columns: ['Bucket', 'From', 'To', 'Batch', 'Amount (INR)'],
    rows: chart.buckets.filter(bucket => !bucket.future).flatMap(bucket => chart.series.map(batch =>
      [bucket.label, bucket.start, bucket.end, batch.label, (bucket.amounts[batch.id] ?? 0) / 100])),
  }
}

export function buildFeesExport(period: FeesPeriod, selection: FeesSelection, refreshedAt: string): ReportExportPayload {
  const shownDate = (date: string) => format(parseISO(date), 'dd MMM yyyy')
  const through = period.through < period.end ? ` (activity through ${shownDate(period.through)})` : ''
  return {
    title: 'Fees Report',
    dateRange: `${shownDate(period.start)} to ${shownDate(period.end)} IST${through}`,
    batch: selection.batchLabel,
    dataRefreshed: formatFeesRefreshTime(refreshedAt),
    metrics: [
      ['Fee Collection', formatFeePaise(selection.collection.total)],
      ['Outstanding Balance', formatFeePaise(selection.outstanding.total)],
    ],
    sections: [
      barSection('Fee Collection', FEES_NOTES.collection, selection.collection),
      barSection('Outstanding Balance', FEES_NOTES.outstanding, selection.outstanding),
      { title: 'Payment Status', note: FEES_NOTES.status, columns: ['Status', 'Amount (INR)'],
        rows: selection.status.map(slice => [slice.label, slice.amount / 100]) },
      { title: 'Payment Mode', note: FEES_NOTES.mode, columns: ['Payment mode', 'Amount (INR)'],
        rows: selection.modes.map(slice => [slice.label, slice.amount / 100]) },
    ],
  }
}
