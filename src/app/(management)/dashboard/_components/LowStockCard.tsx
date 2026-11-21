import type { DashboardMetrics } from '@/lib/dashboard/metrics'
import Card from '@/components/ui/Card'
export default function LowStockCard({ metrics: m }: { metrics: DashboardMetrics }) {
  return (
    <Card title="Low Stock" note="Live inventory snapshot">{m.lowStock.length ? m.lowStock.map(i =>
      <div key={i.id} className="flex justify-between gap-3 border-b border-so-border-subtle py-3 text-sm">
        <span className="font-medium">{i.name}
          <span className="block text-xs text-so-muted">{i.quantity} {i.unit}
          </span>
        </span>
        <span className={i.quantity <= 3 ? 'text-so-red font-semibold' : 'text-so-yellow font-semibold'}>{i.quantity === 0 ? 'Out of stock' : i.quantity <= 3 ? 'Critical' : 'Low'}
        </span>
      </div>) :
      <p className="text-sm text-so-muted py-8">No low-stock items.
      </p>}
    </Card>)
}
