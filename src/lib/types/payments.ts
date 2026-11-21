export type PaymentMethod = 'cash' | 'upi' | 'card' | 'other'

export type PaymentEntry = {
  id: string
  createdAt?: string
  date: string
  amount: number
  remainingAmount: number
  paymentType: 'full' | 'partial' | 'advance' | 'due_clearance'
  coveredFrom?: string
  coveredUntil?: string
  settlesPaymentId?: string
  paymentMethod: PaymentMethod | null
  transactionId?: string
  status: 'active' | 'inactive' | 'deleted'
  note: string
}
