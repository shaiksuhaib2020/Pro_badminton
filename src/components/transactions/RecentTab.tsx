import { Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { formatPaymentFor, formatTransactionDate } from './transaction-utils'
import type { TransactionTabProps } from './types'

export default function RecentTab({ rows, onVoid }: TransactionTabProps) {
  if (rows.length === 0) return <div className="py-20 flex flex-col items-center justify-center"><p className="text-so-text font-medium">No receipts found</p></div>
  return <div className="bg-so-card border border-so-border rounded-xl shadow-sm overflow-hidden min-h-[400px]"><div className="overflow-x-auto"><table className="w-full text-sm">
    <thead><tr className="bg-so-surface border-b border-so-border">{['Name', 'Phone Number', 'Amount Paid', 'Date', 'Payment For', 'Mode', 'Action'].map(label => <th key={label} className={label === 'Action' ? 'text-right px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider' : 'text-left px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider'}>{label}</th>)}</tr></thead>
    <tbody className="divide-y divide-so-border">{rows.map(row => <tr key={row.receipt.id} className="hover:bg-so-surface/50 transition-colors">
      <td className="px-5 py-3 font-medium text-so-text">{row.student.name}</td>
      <td className="px-5 py-3 text-so-muted whitespace-nowrap">{row.student.phone || '-'}</td>
      <td className="px-5 py-3 font-bold text-so-emerald whitespace-nowrap">{formatCurrency(row.receipt.amount)}{row.receipt.remainingAmount > 0 && <span className="block text-xs font-medium text-so-yellow">Due {formatCurrency(row.receipt.remainingAmount)}</span>}</td>
      <td className="px-5 py-3 text-so-muted whitespace-nowrap">{formatTransactionDate(row.receipt.date)}</td>
      <td className="px-5 py-3 text-so-muted">{formatPaymentFor(row)}</td>
      <td className="px-5 py-3 text-so-muted capitalize">{row.receipt.paymentMethod || 'Unspecified'}</td>
      <td className="px-5 py-3 text-right">{row.receipt.status !== 'deleted' && onVoid && <button type="button" onClick={() => onVoid(row)} title="Void receipt" aria-label={`Void receipt for ${row.student.name}`} className="p-1.5 rounded-md text-so-muted hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4 shrink-0" strokeWidth={1.75} /></button>}</td>
    </tr>)}</tbody>
  </table></div></div>
}
