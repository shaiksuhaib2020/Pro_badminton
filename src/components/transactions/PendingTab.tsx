import type { Student } from '@/lib/types/students'
import { formatCurrency } from '@/lib/utils'
import ReminderLink from './ReminderLink'
import { formatTransactionDate, getDueIndicator, getPendingReminder } from './transaction-utils'

type Props = { students: Student[]; today: string; onCollect: (student: Student) => void }

export default function PendingTab({ students, today, onCollect }: Props) {
  if (students.length === 0) return <div className="py-20 flex flex-col items-center justify-center"><p className="text-so-text font-medium">No upcoming or overdue fees</p></div>
  return <div className="bg-so-card border border-so-border rounded-xl shadow-sm overflow-hidden min-h-[400px]"><div className="overflow-x-auto"><table className="w-full text-sm">
    <thead><tr className="bg-so-surface border-b border-so-border">{['Name', 'Phone Number', 'Amount', 'Due Date', 'Action'].map(label => <th key={label} className={label === 'Action' ? 'text-right px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider' : 'text-left px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider'}>{label}</th>)}</tr></thead>
    <tbody className="divide-y divide-so-border">{students.map(student => {
      const indicator = getDueIndicator(student, today)
      return <tr key={student.id} className="hover:bg-so-surface/50 transition-colors">
        <td className="px-5 py-3 font-medium text-so-text">{student.name}</td>
        <td className="px-5 py-3 text-so-muted whitespace-nowrap">{student.phone || '-'}</td>
        <td className="px-5 py-3 text-so-text whitespace-nowrap">{student.membershipReceiptId ? formatCurrency(student.fees) : '-'}</td>
        <td className="px-5 py-3 text-so-muted"><div className="flex items-center gap-2 flex-wrap"><span className="whitespace-nowrap">{student.membershipReceiptId ? formatTransactionDate(student.nextDueDate) : '-'}</span>{indicator.label && <span className={`text-xs font-medium whitespace-nowrap ${indicator.color}`}>{indicator.label}</span>}</div></td>
        <td className="px-5 py-3 text-right"><div className="flex items-center justify-end gap-2"><button type="button" onClick={() => onCollect(student)} className="flex items-center gap-2 bg-so-accent text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm whitespace-nowrap">Collect Fee</button><ReminderLink phone={student.phone} name={student.name} message={getPendingReminder(student, today)} /></div></td>
      </tr>
    })}</tbody>
  </table></div></div>
}
