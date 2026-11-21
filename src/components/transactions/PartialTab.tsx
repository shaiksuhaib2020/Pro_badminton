import { formatCurrency } from '@/lib/utils'
import ReminderLink from './ReminderLink'
import { formatOutstandingSince, formatPaymentFor, getPartialReminder } from './transaction-utils'
import type { PartialTabProps } from './types'

export default function PartialTab({ rows, today, onSettle }: PartialTabProps) {
  if (rows.length === 0) return <div className="py-20 flex flex-col items-center justify-center"><p className="text-so-text font-medium">No outstanding partial payments</p></div>
  return <div className="bg-so-card border border-so-border rounded-xl shadow-sm overflow-hidden min-h-[400px]"><div className="overflow-x-auto"><table className="w-full text-sm">
    <thead><tr className="bg-so-surface border-b border-so-border">{['Name', 'Phone Number', 'Amount Paid', 'Due Amount', 'Payment For', 'Outstanding Since', 'Action'].map(label => <th key={label} className={label === 'Action' ? 'text-right px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider' : 'text-left px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider'}>{label}</th>)}</tr></thead>
    <tbody className="divide-y divide-so-border">{rows.map(row => <tr key={row.receipt.id} className="hover:bg-so-surface/50 transition-colors">
      <td className="px-5 py-3 font-medium text-so-text">{row.student.name}</td>
      <td className="px-5 py-3 text-so-muted whitespace-nowrap">{row.student.phone || '-'}</td>
      <td className="px-5 py-3 font-bold text-so-emerald whitespace-nowrap">{formatCurrency(row.receipt.amount)}</td>
      <td className="px-5 py-3 font-bold text-so-yellow whitespace-nowrap">{formatCurrency(row.receipt.remainingAmount)}</td>
      <td className="px-5 py-3 text-so-muted">{formatPaymentFor(row)}</td>
      <td className="px-5 py-3 text-so-muted whitespace-nowrap">{formatOutstandingSince(row.receipt.date, today)}</td>
      <td className="px-5 py-3 text-right"><div className="flex items-center justify-end gap-2">{onSettle && <button type="button" onClick={() => onSettle(row)} className="flex items-center gap-2 bg-so-accent text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm whitespace-nowrap">Collect Remaining</button>}<ReminderLink phone={row.student.phone} name={row.student.name} message={getPartialReminder(row)} /></div></td>
    </tr>)}</tbody>
  </table></div></div>
}
