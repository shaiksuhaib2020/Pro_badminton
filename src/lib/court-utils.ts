import type { CourtMembership } from './types/court'

export const getMembershipPeopleCount = (m: CourtMembership) => 1 + m.people.length

export const getMembershipDisplayLabel = (m: CourtMembership) => m.contactName
