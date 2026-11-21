import 'server-only'

import { getServerSession } from '@/lib/supabase/auth-context'
import type { AttendanceRecord } from '@/lib/types/attendance'

// All attendance records for a batch — used on batch detail page
export async function getAttendanceByBatch(batchId: string): Promise<AttendanceRecord[]> {
  const { supabase } = await getServerSession()

  let resolvedId = batchId
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(batchId)
  if (!isUuid) {
    const { data: b } = await supabase.from('batches').select('id').ilike('name', batchId).maybeSingle()
    if (b?.id) resolvedId = b.id
  }

  const { data, error } = await supabase
    .from('attendance_records')
    .select('id, batch_id, date, records')
    .eq('batch_id', resolvedId)
    .order('date', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map(row => ({
    id:      row.id,
    batchId: row.batch_id,
    date:    row.date,
    records: (row.records ?? {}) as Record<string, 'present' | 'absent'>,
  }))
}

// Student's attendance derived from their batch's records
// Queries all records for the batch, filters for the student's entries
export async function getAttendanceByStudent(
  studentId: string,
  batchId: string
): Promise<AttendanceRecord[]> {
  if (!batchId) return []
  const { supabase } = await getServerSession()

  let resolvedId = batchId
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(batchId)
  if (!isUuid) {
    const { data: b } = await supabase.from('batches').select('id').ilike('name', batchId).maybeSingle()
    if (b?.id) {
      resolvedId = b.id
    } else {
      const { data: s } = await supabase.from('students').select('batch_id').eq('id', studentId).maybeSingle()
      if (s?.batch_id) resolvedId = s.batch_id
      else return []
    }
  }

  const { data, error } = await supabase
    .from('attendance_records')
    .select('id, batch_id, date, records')
    .eq('batch_id', resolvedId)
    .not(`records->>${studentId}`, 'is', null)  // only rows where student key exists
    .order('date', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map(row => ({
    id:      row.id,
    batchId: row.batch_id,
    date:    row.date,
    records: (row.records ?? {}) as Record<string, 'present' | 'absent'>,
  }))
}
