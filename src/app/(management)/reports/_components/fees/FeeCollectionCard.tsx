import Card from '@/components/ui/Card'
import { FEES_NOTES, formatFeePaise } from '@/lib/reports/fees'
import type { FeesSelection } from '@/lib/reports/fees'
import { FeesBarChart } from './FeesCharts'

export default function FeeCollectionCard({ chart, stacked, month }: {
  chart: FeesSelection['collection']; stacked: boolean; month: boolean
}) {
  return <Card title="Fee Collection" note={formatFeePaise(chart.total)}>
    <p className="text-xs text-so-muted mb-4">{FEES_NOTES.collection}</p>
    <FeesBarChart chart={chart} stacked={stacked} month={month} empty="No fees collected for this selection." title="Fee collection by payment date" />
  </Card>
}
