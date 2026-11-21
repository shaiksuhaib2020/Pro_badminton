'use client'

import Card from '@/components/ui/Card'
import { ACCOUNTS_REPORT_LABELS as labels } from '@/lib/reports/accounts'
import type { AccountsReport } from '@/lib/reports/accounts'
import { formatReportPaise, formatReportRefreshTime } from '@/lib/reports/period'
import type { ReportMode, ReportPeriod } from '@/lib/reports/period'
import ReportPeriodBar from '../ReportPeriodBar'
import { ReportBarChart, ReportCategoryBars, ReportChartSkeleton, ReportDonut, reportGridClass } from '../ReportCharts'

const chartTitles = [labels.trend, labels.streams, labels.categories, labels.modes]

function AccountsCharts({ report, month }: { report: AccountsReport; month: boolean }) {
  const comparison = {
    total: report.income + report.expenses,
    buckets: report.buckets,
    series: [
      { id: 'income', label: 'Income', color: 'so-emerald', pattern: 0, total: report.income },
      { id: 'expenses', label: 'Expenses', color: 'so-red', pattern: 0, total: report.expenses },
    ],
  }
  const streams = {
    total: report.income,
    buckets: report.buckets,
    series: report.streams.map(({ id, label, color, amount }) => ({ id, label, color, pattern: 0, total: amount })),
  }
  return <div className={reportGridClass}>
    <Card title={labels.trend}>
      <ReportBarChart chart={comparison} month={month} empty="No sales or expenses in this period." title={labels.trend} />
    </Card>
    <Card title={labels.streams} note={formatReportPaise(report.income)}>
      <ReportBarChart chart={streams} stacked month={month} empty="No sales recorded" title={labels.streams} />
    </Card>
    <Card title={labels.categories} note={formatReportPaise(report.expenses)}>
      <ReportCategoryBars slices={report.categories} empty="No expenses recorded" title={labels.categories} />
    </Card>
    <Card title={labels.modes}>
      <ReportDonut slices={report.modes} empty="No sales recorded" title={labels.modes} showShare />
    </Card>
  </div>
}

export default function AccountsSegment({ period, report, loadingLabel, pending, refreshedAt, error, onNavigate, onRetry }: {
  period: ReportPeriod
  report: AccountsReport | null
  loadingLabel?: string
  pending: boolean
  refreshedAt?: string
  error?: string
  onNavigate: (mode: ReportMode, date: string) => void
  onRetry?: () => void
}) {
  return <div className="space-y-6">
    {(report || !error) && <div className="flex flex-wrap items-center justify-between gap-3">
      <ReportPeriodBar period={period} onNavigate={onNavigate} pending={pending || !report} loadingLabel={loadingLabel}
        filtersLabel="Accounts filters" periodLabel="Accounts report period" />
      {refreshedAt && <p className="text-xs text-so-muted">Data refreshed <time dateTime={refreshedAt}>{formatReportRefreshTime(refreshedAt)}</time></p>}
    </div>}
    {error && <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-5 flex items-center justify-between gap-4">
      <p role="alert" className="text-sm text-so-red">{error}</p>
      {onRetry && <button type="button" onClick={onRetry} className="flex items-center justify-center gap-2 bg-so-accent text-so-accent-text px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50">Try again</button>}
    </div>}
    {report ? <AccountsCharts report={report} month={period.mode === 'month'} />
      : !error && <ReportChartSkeleton label="Loading accounts charts" titles={chartTitles} />}
  </div>
}
