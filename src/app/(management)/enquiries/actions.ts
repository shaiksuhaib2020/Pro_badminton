'use server'

import { revalidatePath } from 'next/cache'
import { toDbEnum } from '@/lib/utils'
import { getServerSession } from '@/lib/supabase/auth-context'
import type { EnquiryStatus } from '@/lib/types/enquiries'
import type { Database } from '@/lib/supabase/database.types'

export async function createEnquiry(data: {
  name: string
  phone: string
  guardianName: string
  notes?: string
  trialDate?: string
}) {
  const { supabase, academyId } = await getServerSession()

  // status is either 'not_scheduled' (no trial date) or 'scheduled' (trial date provided)
  const status: Database['public']['Enums']['enquiry_status'] = data.trialDate ? 'scheduled' : 'not_scheduled'

  const { data: created, error } = await supabase.from('enquiries').insert({
    academy_id:    academyId,
    name:          data.name,
    phone:         data.phone,
    guardian_name: data.guardianName,
    notes:         data.notes ?? null,
    status,
    trial_date:    data.trialDate ?? null,
  }).select('id').single()

  if (error) throw new Error(error.message)

  revalidatePath('/enquiries')
  revalidatePath('/dashboard')
  return created
}

export async function updateEnquiry(id: string, data: {
  name: string
  phone: string
  guardianName: string
  notes?: string
}) {
  const { supabase } = await getServerSession()

  const { error } = await supabase.from('enquiries').update({
    name:          data.name,
    phone:         data.phone,
    guardian_name: data.guardianName,
    notes:         data.notes ?? null,
  }).eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/enquiries')
  revalidatePath('/dashboard')
}

export async function advanceEnquiryStatus(
  id: string,
  newStatus: EnquiryStatus,
  trialDate?: string
) {
  const { supabase } = await getServerSession()

  const updateData: {
    status: Database['public']['Enums']['enquiry_status']
    trial_date?: string | null
  } = {
    status: toDbEnum(newStatus) as Database['public']['Enums']['enquiry_status'],
  }

  if (trialDate !== undefined) {
    updateData.trial_date = trialDate || null
  }

  const { error } = await supabase
    .from('enquiries')
    .update(updateData)
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/enquiries')
  revalidatePath('/dashboard')
}

export async function deleteEnquiry(id: string) {
  const { supabase } = await getServerSession()

  const { error } = await supabase.from('enquiries').delete().eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/enquiries')
  revalidatePath('/dashboard')
}
