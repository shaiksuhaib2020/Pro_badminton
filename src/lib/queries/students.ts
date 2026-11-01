import { getServerSession } from '@/lib/supabase/auth-context'
import type { Student, PaymentEntry } from '@/lib/mock-data'

const STUDENT_FIELDS = `
  id, name, phone, alternate_phone, guardian_name,
  batch_id, fees,
  start_date, next_due_date,
  status, date_of_birth, enrollment_source,
  dropout_reason, dropout_date,
  pending_amount, internal_notes,
  batches:batch_id (
    id,
    name
  )
`

export async function getStudents(): Promise<Student[]> {
  const { supabase } = await getServerSession()
  const { data, error } = await supabase
    .from('students')
    .select(STUDENT_FIELDS)
    .order('name')
  if (error) throw new Error(error.message)
  return (data ?? []).map(row => mapStudentRow(row, []))
}

export async function getStudentById(id: string): Promise<Student | null> {
  const { supabase } = await getServerSession()
  const { data, error } = await supabase
    .from('students')
    .select(`${STUDENT_FIELDS}, student_payments(*)`)
    .eq('id', id)
    .single()
  if (error || !data) return null
  const payments = (data.student_payments ?? []).map(mapPaymentRow)
  return mapStudentRow(data, payments)
}

function mapStudentRow(row: any, paymentHistory: PaymentEntry[]): Student {
  const batchName = Array.isArray(row.batches)
    ? row.batches[0]?.name
    : row.batches?.name

  return {
    id:                   row.id,
    name:                 row.name,
    phone:                row.phone,
    alternatePhone:       row.alternate_phone ?? '',
    guardianName:         row.guardian_name ?? '',
    currentBatch:         batchName || row.batch_id || '',
    fees:                 row.fees,
    startDate:            row.start_date,
    membershipStartDate:  row.start_date,
    nextDueDate:          row.next_due_date,
    status:               row.status,            // DB uses hyphens for student_status — no conversion needed
    dateOfBirth:          row.date_of_birth ?? undefined,
    enrollmentSource:     row.enrollment_source ?? undefined,
    dropoutReason:        row.dropout_reason ?? undefined,
    dropoutDate:          row.dropout_date ?? undefined,
    pendingAmount:        row.pending_amount,
    internalNotes:        row.internal_notes ?? '',
    paymentHistory,
  }
}

function mapPaymentRow(row: any): PaymentEntry {
  return {
    id:              row.id,
    date:            row.date,
    amount:          row.amount,
    remainingAmount: row.remaining_amount,
    paymentType:     row.payment_type,
    coveredFrom:     row.covered_from ?? undefined,
    coveredUntil:    row.covered_until ?? undefined,
    paymentMethod:   row.payment_method,
    status:          row.status,
    note:            row.note ?? '',
  }
}

export async function getStudentsByBatch(batchId: string): Promise<Student[]> {
  const { supabase } = await getServerSession()

  let resolvedId = batchId
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(batchId)
  if (!isUuid) {
    const { data: b } = await supabase.from('batches').select('id').ilike('name', batchId).maybeSingle()
    if (b?.id) resolvedId = b.id
  }

  const { data, error } = await supabase
    .from('students')
    .select(`${STUDENT_FIELDS}, student_payments(*)`)
    .eq('batch_id', resolvedId)
    .not('status', 'eq', 'dropout')
    .order('name')

  if (error) throw new Error(error.message)
  return (data ?? []).map(row => {
    const payments = (row.student_payments ?? []).map(mapPaymentRow)
    return mapStudentRow(row, payments)
  })
}

