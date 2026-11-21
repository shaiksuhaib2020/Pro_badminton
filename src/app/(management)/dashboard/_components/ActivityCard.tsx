import Link from 'next/link'
import type { DashboardMetrics } from '@/lib/dashboard/metrics'
import type { DashboardPeriod } from '@/lib/types/dashboard'
import Card from '@/components/ui/Card'
export default function ActivityCard({ metrics: m, period, today }: { metrics: DashboardMetrics; period: DashboardPeriod; today: string }) {
  const rows = [['Enrollments', m.activity.enrollments], ['Recorded dropouts', m.activity.dropouts], ['New enquiries', m.activity.enquiries], ['Payments', m.activity.payments], ['Students with Dues', period.past ? 'Unavailable' : m.pendingStudents], ['Inactive Students (now)', m.activity.inactive]]
  return (
    <Card title="Activity" note="Selected period | IST">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">{rows.map(([label, value]) =>
        <div key={label}>
          <p className="text-xs font-semibold text-so-muted">{label}
          </p>
          <p className="text-xl font-bold text-so-text mt-1">{value}
          </p>
        </div>)}
      </div>

      <p className="text-xs text-so-muted mt-4">Enrollments use original joining dates. Dropouts reflect retained dropout dates; re-enrollment clears them. Inactive students and unpaid balances are current snapshots.
      </p>
      {period.mode === 'day' && period.anchor === today &&
        <div className="border-t border-so-border mt-4 pt-4 space-y-2">{m.prompts.length ? m.prompts.map(b =>
          <div key={b.id} className="flex justify-between gap-3 text-sm">
            <span>{b.name}
            </span>
            <Link href={'/batches/' + b.id + '?tab=attendance&date=' + today + '&mode=marking'} className="text-so-accent font-medium">{b.total === 0 ? 'No active roster' : b.marked === 0 ? 'Take attendance' : b.marked < b.total ? 'Complete attendance' : 'Edit attendance'} ? {b.marked}/{b.total} marked
            </Link>
          </div>) :
          <p className="text-sm text-so-muted">No batches scheduled today.
          </p>}
        </div>}

    </Card>)
}
