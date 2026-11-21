import Card from '@/components/ui/Card'
import { FEES_NOTES } from '@/lib/reports/fees'
import type { FeesSelection } from '@/lib/reports/fees'
import { FeesDonut } from './FeesCharts'

export default function PaymentModeCard({ slices }: { slices: FeesSelection['modes'] }) {
  return <Card title="Payment Mode">
    <p className="text-xs text-so-muted mb-4">{FEES_NOTES.mode}</p>
    <FeesDonut slices={slices} empty="No payments received" title="Collected fees by payment mode" />
  </Card>
}
