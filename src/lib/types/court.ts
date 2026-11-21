import type { PaymentMethod } from './payments'

export type CourtPlan = {
  id: string
  name: string
  planType: 'monthly' | 'sessions'
  price: number
  // Monthly-specific
  durationMonths?: number         // how many months the plan covers
  // Sessions-specific
  totalSessions?: number          // sessions in this pack
  validityDays?: number           // days before unused sessions expire
}

export type CourtPlanType = 'monthly' | 'sessions'

export type CourtMembershipStatus =
  | 'active' | 'due-soon' | 'expired'
  | 'sessions-low' | 'exhausted' | 'inactive' | 'dropout'

export type CourtPaymentEntryType = 'new' | 'renewal' | 'session-topup'

export type CourtPaymentEntryStatus = 'active' | 'deleted'

export type CourtPaymentEntry = {
  id: string
  membershipId: string
  date: string
  amount: number
  payingNow?: number
  partialDue?: number
  paymentMethod: PaymentMethod
  entryType: CourtPaymentEntryType
  status: CourtPaymentEntryStatus
  note?: string
}

export type CourtMembershipPerson = {
  id: string
  membershipId: string
  name: string
}

export type CourtCheckIn = {
  id: string
  membershipId: string
  checkedInAt: string
  sessionsAfter?: number
  peopleCheckedIn: number
}

export type CourtMembership = {
  id: string
  contactName: string
  contactPhone: string
  address?: string
  email?: string
  people: CourtMembershipPerson[]
  planId?: string
  planType: CourtPlanType
  startDate: string
  endDate: string
  totalSessions?: number
  remainingSessions?: number
  status: CourtMembershipStatus
  amountPaid: number
  pendingAmount: number
  notes?: string
  paymentHistory: CourtPaymentEntry[]
  checkInHistory: CourtCheckIn[]
}
