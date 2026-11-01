import { getServerSession } from '@/lib/supabase/auth-context'
import { toAppEnum } from '@/lib/utils'
import type { Enquiry } from '@/lib/mock-data'

export async function getEnquiries(): Promise<Enquiry[]> {
  const { supabase } = await getServerSession()

  const { data, error } = await supabase
    .from('enquiries')
    .select('id, name, phone, guardian_name, notes, status, trial_date, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map(row => ({
    id:           row.id,
    name:         row.name,
    phone:        row.phone,
    guardianName: row.guardian_name,
    notes:        row.notes ?? undefined,
    status:       toAppEnum(row.status) as Enquiry['status'],
    trialDate:    row.trial_date ?? undefined,
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,
  }))
}
