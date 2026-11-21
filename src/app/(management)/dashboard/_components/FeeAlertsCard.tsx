import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import type { DashboardMetrics } from '@/lib/dashboard/metrics'
import Card from '@/components/ui/Card'
export default function FeeAlertsCard({ metrics: m }: { metrics: DashboardMetrics }) {
  return (
    <Card title="Fee Alerts" note="Due dates in selected period">
      <p className="text-xs text-so-muted mb-3">Unpaid receipt balances include all profiles. Renewal reminders apply to active profiles and do not create debt.
      </p>{m.alerts.length === 0 ?
        <p className="text-sm text-so-muted py-8">No fee alerts due in this period.
        </p> :
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-so-border text-left text-xs text-so-muted">{['Student', 'Status', 'Amount', 'Due Date'].map(t =>
                <th key={t} className="py-3 pr-3">{t}
                </th>)}
              </tr>
            </thead>
            <tbody>{m.alerts.map(a =>
              <tr key={a.key} className="border-b border-so-border-subtle">
                <td className="py-3 pr-3">
                  <Link href={'/students/' + a.studentId} className="font-medium">{a.student?.name ?? 'Unavailable student'}
                  </Link>
                  <p className="text-xs text-so-muted">{a.student?.phone || 'No phone number'}
                  </p>
                </td>
                <td className="py-3 pr-3">
                  <span className={a.status === 'Overdue' ? 'text-so-red font-semibold' : 'text-so-yellow font-semibold'}>{a.status}
                  </span>
                  <p className="text-xs text-so-muted">{a.kind}
                  </p>
                </td>
                <td className="py-3 pr-3">{a.kind === 'Unpaid receipt' ? formatCurrency(a.amount) : 'Not yet charged'}
                </td>
                <td className="py-3 whitespace-nowrap">{format(parseISO(a.dueDate), 'd MMM')}
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>}{m.undatedBalances > 0 &&
          <p className="text-xs text-so-yellow mt-3">{m.undatedBalances} legacy unpaid receipts have no due date and cannot be assigned to a period. Open individual transaction histories to collect them.
          </p>}
    </Card>)
}
