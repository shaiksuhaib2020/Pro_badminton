import { format, parseISO, subMonths } from 'date-fns'
import type { Student } from '@/lib/types/students'
import { comparePendingStudents, compareReceiptRows } from './transaction-utils'
import type { ReceiptRow, TransactionRange, TransactionScope } from './types'

export function getScopedStudents(students: Student[], scope: TransactionScope): Student[] {
  if (scope.kind === 'batch') {
    return students.filter(student => student.currentBatchId === scope.batchId)
  }
  if (scope.kind === 'student') return students.filter(student => student.id === scope.studentId)
  return students
}

type Options = {
  today: string
  search?: string
  range?: TransactionRange
  customFrom?: string
  customTo?: string
}

/** Scope is applied before filtering, totals, and action targets are constructed. */
export function getCoachingTransactionData(students: Student[], scope: TransactionScope, {
  today, search = '', range = 'all', customFrom = '', customTo = '',
}: Options) {
  const query = search.trim().toLowerCase()
  const visibleStudents = getScopedStudents(students, scope).filter(student =>
    !query || student.name.toLowerCase().includes(query) || student.phone.includes(query))
  const previousMonth = format(subMonths(parseISO(today), 1), 'yyyy-MM')
  const inRange = (date: string) => {
    if (range === 'all') return true
    if (range === 'currentMonth') return date.startsWith(today.slice(0, 7))
    if (range === 'lastMonth') return date.startsWith(previousMonth)
    return (!customFrom || date >= customFrom) && (!customTo || date <= customTo)
  }
  const rows: ReceiptRow[] = visibleStudents.flatMap(student =>
    student.paymentHistory.map(receipt => ({ student, receipt }))).sort(compareReceiptRows)
  const isActive = (student: Student) => student.status !== 'inactive' && student.status !== 'dropout'
  const recentRows = rows.filter(row => inRange(row.receipt.date))
  const paidRows = recentRows.filter(row => row.receipt.status !== 'deleted' && row.receipt.remainingAmount === 0)
  const pendingStudents = visibleStudents.filter(student => isActive(student) && (
    student.membershipReceiptId
      ? student.status === 'due-soon' || student.status === 'expired'
      : scope.kind !== 'student'
  )).sort(comparePendingStudents)
  // Batch and individual histories retain collectible balances after deactivation/dropout.
  // The academy-wide partial work queue keeps its existing active-profile policy.
  const partialRows = rows.filter(row => (scope.kind !== 'academy' || isActive(row.student)) &&
    row.receipt.status !== 'deleted' && row.receipt.paymentType !== 'due_clearance' && row.receipt.remainingAmount > 0)
  return { recentRows, paidRows, pendingStudents, partialRows }
}
