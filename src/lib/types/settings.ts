import type { CourtPlan } from './court'

export type Event = {
  id: string
  name: string
  type: 'tournament' | 'sports-meet' | 'general'
  date: string
  description: string
}

export type StaffRole = 'owner' | 'manager' | 'coach' | 'accountant' | 'receptionist'

export type StaffStatus = 'active' | 'invited' | 'suspended'

export type AccessLevel = 'full' | 'view' | 'collect' | 'mark' | 'partial' | 'none'

export interface Branch {
  id: string
  name: string
  address: string
  phone: string
  isActive: boolean
  isPrimary: boolean
  createdAt: string
}

export interface StaffMember {
  id: string
  name: string
  email: string
  role: StaffRole
  branchIds: string[]
  status: StaffStatus
  invitedAt: string
  avatarInitials: string
}

export interface ModulePermission {
  module: string
  owner: AccessLevel
  manager: AccessLevel
  coach: AccessLevel
  accountant: AccessLevel
  receptionist: AccessLevel
}

export type Settings = {
  courtMembershipEnabled: boolean
  courtPlans: CourtPlan[]
  courtName: string
  tenantPhone?: string
  tenantAddress?: string
  tenantTimezone?: string
  multiBranchEnabled: boolean
  branches: Branch[]
  staffMembers: StaffMember[]

  batches: string[]
  feeReminderEnabled: boolean
  feeAckEnabled: boolean
  birthdayWishEnabled: boolean
}
