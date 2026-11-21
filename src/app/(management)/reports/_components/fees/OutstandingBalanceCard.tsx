import Card from '@/components/ui/Card'
import { FEES_NOTES, formatFeePaise } from '@/lib/reports/fees'
import type { FeesSelection } from '@/lib/reports/fees'
import { FeesBarChart } from './FeesCharts'

export default function OutstandingBalanceCard({ chart, stacked, month }: {
  chart: FeesSelection['outstanding']; stacked: boolean; month: boolean
}) {
  return <Card title="Outstanding Balance" note={formatFeePaise(chart.total)}>
    <p className="text-xs text-so-muted mb-4">{FEES_NOTES.outstanding}</p>
    <FeesBarChart chart={chart} stacked={stacked} month={month} empty="No outstanding balances for this selection." title="Outstanding balances by original receipt date" />
  </Card>
}
