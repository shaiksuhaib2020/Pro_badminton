import { formatCurrency } from '@/lib/utils'
import type { DashboardMetrics } from '@/lib/dashboard/metrics'
import Card from '@/components/ui/Card'
export default function DashboardStats({ metrics: m }: { metrics: DashboardMetrics }) {
  const rows = [{ title: 'Collected', value: formatCurrency(m.collected), note: 'Coaching receipts | selected payment dates' }, { title: 'Pending Dues', value: m.pendingAmount === null ? 'Unavailable' : formatCurrency(m.pendingAmount), note: m.pendingAmount === null ? 'Historical balances are not stored' : m.pendingStudents + ' students | current balances due in period' }, { title: 'Active Members', value: m.activeCount, note: 'Live snapshot | ' + m.expiring + ' expiring soon' }, { title: 'Overdue', value: m.overdueCount === null ? 'Unavailable' : m.overdueCount, note: m.overdueCount === null ? 'Historical membership snapshots are not stored' : 'Live snapshot | coverage expired before today' }]
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{rows.map(r =>
      <Card key={r.title} title={r.title}>
        <div className="text-2xl font-bold text-so-text">{r.value}
        </div>
        <p className="text-xs text-so-muted mt-2">{r.note}
        </p>
      </Card>)}
    </div>)
}
