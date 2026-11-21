import type { PaymentEntry } from './payments'

export type EnrollmentDay = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'

export type Student = {
  id: string
  createdAt?: string
  name: string
  phone: string
  alternatePhone: string
  guardianName: string
  enrollDays?: EnrollmentDay[]
  address?: string
  email?: string

  currentBatch: string
  currentBatchId?: string
  fees: number
  startDate: string
  membershipStartDate: string
  nextDueDate: string
  status: 'active' | 'due-soon' | 'expired' | 'inactive' | 'dropout'
  dateOfBirth?: string
  enrollmentSource?: 'walk-in' | 'referral' | 'social-media' | 'other'
  dropoutReason?: string
  dropoutDate?: string
  pendingAmount: number
  internalNotes: string
  paymentHistory: PaymentEntry[]
  membershipReceiptId?: string
}
