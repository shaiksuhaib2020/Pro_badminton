import { format, parseISO } from 'date-fns'
import { ACCOUNTS_REPORT_LABELS as labels, formatAccountsNet, NET_CASHFLOW_NOTE } from '@/lib/reports/accounts'
import type { AccountsReport } from '@/lib/reports/accounts'
import { formatReportPaise, formatReportRefreshTime, formatReportShare } from '@/lib/reports/period'
import type { ReportPeriod } from '@/lib/reports/period'
import type { ExportSection, ReportExportPayload } from '../../export'

function breakdown(title: string, column: string, slices: { label: string; amount: number }[], total: number): ExportSection {
  return {
    title,
    columns: [column, 'Amount (INR)', 'Share'],
    rows: slices.map(slice => [slice.label, slice.amount / 100, formatReportShare(slice.amount, total)]),
  }
}

export function buildAccountsExport(period: ReportPeriod, report: AccountsReport, refreshedAt: string): ReportExportPayload {
  const displayDate = (date: string) => format(parseISO(date), 'dd MMM yyyy')
  const through = period.through < period.end ? ` (activity through ${displayDate(period.through)})` : ''
  return {
    title: 'Accounts Report',
    dateRange: `${displayDate(period.start)} to ${displayDate(period.end)} IST${through}`,
    dataRefreshed: formatReportRefreshTime(refreshedAt),
    metrics: [
      [labels.income, formatReportPaise(report.income)],
      [labels.expenses, formatReportPaise(report.expenses)],
      [labels.net, formatAccountsNet(report.net)],
    ],
    sections: [
      {
        title: labels.trend,
        note: NET_CASHFLOW_NOTE + ' gives net cashflow.',
        columns: ['Period', 'From', 'To', 'Income (INR)', 'Expenses (INR)', 'Net Cashflow (INR)'],
        rows: report.buckets.filter(bucket => !bucket.future).map(bucket => [
          bucket.label, bucket.start, bucket.end, bucket.amounts.income / 100, bucket.amounts.expenses / 100,
          (bucket.amounts.income - bucket.amounts.expenses) / 100,
        ]),
      },
      breakdown(labels.streams, 'Income stream', report.streams, report.income),
      breakdown(labels.categories, 'Category', report.categories, report.expenses),
      breakdown(labels.modes, 'Payment mode', report.modes, report.income),
    ],
  }
}
