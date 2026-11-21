import type { PaymentEntry } from '@/lib/types/payments'
import type { Student } from '@/lib/types/students'

export type ReceiptRow = { student: Student; receipt: PaymentEntry }
export type TransactionTabProps = {
  rows: ReceiptRow[]
  onVoid?: (row: ReceiptRow) => void
  onSettle?: (row: ReceiptRow) => void
}

export type PartialTabProps = TransactionTabProps & { today: string }

export type TransactionScope =
  | { kind: 'academy' }
  | { kind: 'batch'; batchId: string }
  | { kind: 'student'; studentId: string }

export type TransactionRange = 'all' | 'currentMonth' | 'lastMonth' | 'custom'
