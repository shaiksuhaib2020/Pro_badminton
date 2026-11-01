'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from '@/lib/supabase/auth-context'

export async function saveAttendance(
  batchId: string,
  date: string,
  records: Record<string, 'present' | 'absent'>
) {
  const { supabase, academyId } = await getServerSession()

  let resolvedBatchId = batchId
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(batchId)
  if (!isUuid) {
    const { data: b } = await supabase.from('batches').select('id').ilike('name', batchId).maybeSingle()
    if (b?.id) resolvedBatchId = b.id
  }

  // Contract: DB trigger validate_attendance_records checks that keys are valid UUIDs
  // and values are 'present' | 'absent'. Clean any other keys/values before submitting.
  const cleanRecords: Record<string, 'present' | 'absent'> = {}
  for (const [key, val] of Object.entries(records)) {
    if (val === 'present' || val === 'absent') {
      cleanRecords[key] = val
    }
  }

  // Upsert — saving for an existing date fully overwrites the record.
  // onConflict matches the UNIQUE constraint: (batch_id, date).
  const { error } = await supabase
    .from('attendance_records')
    .upsert(
      { batch_id: resolvedBatchId, academy_id: academyId, date, records: cleanRecords },
      { onConflict: 'batch_id,date' }
    )

  if (error) throw new Error(error.message)

  revalidatePath(`/batches/${batchId}`)
  if (resolvedBatchId !== batchId) {
    revalidatePath(`/batches/${resolvedBatchId}`)
  }
}
