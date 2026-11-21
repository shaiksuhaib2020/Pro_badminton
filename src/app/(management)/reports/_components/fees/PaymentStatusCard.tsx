import Card from '@/components/ui/Card'
import { FEES_NOTES } from '@/lib/reports/fees'
import type { FeesSelection } from '@/lib/reports/fees'
import { FeesDonut } from './FeesCharts'

export default function PaymentStatusCard({ slices }: { slices: FeesSelection['status'] }) {
  return <Card title="Payment Status">
    <p className="text-xs text-so-muted mb-4">{FEES_NOTES.status}</p>
    <FeesDonut slices={slices} empty="No receipt amounts or balances" title="Payment status of original receipts" />
  </Card>
}
