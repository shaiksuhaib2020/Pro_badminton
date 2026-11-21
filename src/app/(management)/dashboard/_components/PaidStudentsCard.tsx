import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import type { DashboardMetrics } from '@/lib/dashboard/metrics'
import Card from '@/components/ui/Card'
export default function PaidStudentsCard({ metrics: m }: { metrics: DashboardMetrics }) {
  return (
    <Card title="Paid Students" note={m.paid.length + ' receipts'}>{m.paid.length === 0 ?
      <p className="text-sm text-so-muted py-8">No payments recorded for this period.
      </p> :
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-so-border text-left text-xs text-so-muted">
              <th className="py-3 pr-3">Student
              </th>
              <th className="py-3 pr-3">Amount Paid
              </th>
              <th className="py-3">Date
              </th>
            </tr>
          </thead>
          <tbody>{m.paid.map(r =>
            <tr key={r.id} className="border-b border-so-border-subtle">
              <td className="py-3 pr-3">
                <Link href={'/students/' + r.studentId} className="font-medium text-so-text">{r.student?.name ?? 'Unavailable student'}
                </Link>
                <p className="text-xs text-so-muted">{r.student?.phone || 'No phone number'}
                </p>
              </td>
              <td className="py-3 pr-3">
                <p className="font-semibold text-so-emerald">{formatCurrency(r.amount)}
                </p>{r.remainingAmount > 0 &&
                  <p className="text-xs text-so-yellow">Due {formatCurrency(r.remainingAmount)} now
                  </p>}
                <p className="text-xs text-so-muted">{r.paymentType === 'due_clearance' ? 'Due clearance | ' : ''}{r.paymentMethod ?? 'Unspecified'}
                </p>
              </td>
              <td className="py-3 whitespace-nowrap">{format(parseISO(r.date), 'd MMM')}
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>}
    </Card>)
}
