import 'server-only'

import { getServerSession } from '@/lib/supabase/auth-context'
import type { Database } from '@/lib/supabase/database.types'
import type { Student } from '@/lib/types/students'
import type { PaymentEntry } from '@/lib/types/payments'
import { deriveStudentStatus } from '@/lib/utils'

type StudentRow = Database['public']['Tables']['students']['Row'] & {
  batches: { id: string; name: string } | null
}
type PaymentRow = Database['public']['Tables']['student_payments']['Row']
type MembershipRow = Database['public']['Views']['student_membership']['Row']

const STUDENT_FIELDS = '*, batches:batch_id(id, name)'

function mapPaymentRow(row: PaymentRow): PaymentEntry {
  return {
    id: row.id,
    createdAt: row.created_at,
    date: row.date,
    amount: row.amount / 100,
    remainingAmount: row.remaining_amount / 100,
    paymentType: row.payment_type,
    coveredFrom: row.start_date ?? undefined,
    coveredUntil: row.next_due_date ?? undefined,
    settlesPaymentId: row.settles_payment_id ?? undefined,
    paymentMethod: row.payment_method,
    transactionId: row.transaction_id ?? undefined,
    status: row.status,
    note: row.note,
  }
}

function mapStudentRow(row: StudentRow, membership: MembershipRow | undefined, payments: PaymentRow[]): Student {
  const nextDueDate = membership?.next_due_date ?? ''
  const status = row.status === 'dropout' || row.status === 'inactive'
    ? row.status
    : deriveStudentStatus(nextDueDate)

  return {
    id: row.id,
    createdAt: row.created_at,
    name: row.name,
    phone: row.phone === null ? '' : String(row.phone),
    alternatePhone: row.alternate_phone ?? '',
    guardianName: row.guardian_name ?? '',
    address: row.address ?? '',
    email: row.email ?? '',
    enrollDays: row.enroll_days ?? [],
    currentBatch: row.batches?.name ?? row.batch_id ?? '',
    currentBatchId: row.batch_id ?? undefined,
    fees: row.fees / 100,
    startDate: row.joining_date,
    membershipStartDate: membership?.start_date ?? '',
    nextDueDate,
    membershipReceiptId: membership?.receipt_id ?? undefined,
    status,
    dateOfBirth: row.date_of_birth ?? undefined,
    enrollmentSource: row.enrollment_source ?? undefined,
    dropoutReason: row.dropout_reason ?? undefined,
    dropoutDate: row.dropout_date ?? undefined,
    pendingAmount: row.pending_amount / 100,
    internalNotes: row.internal_notes,
    paymentHistory: payments.map(mapPaymentRow),
  }
}

export async function getStudents(): Promise<Student[]> {
  const { supabase, academyId } = await getServerSession()
  const PAGE_SIZE = 1000
  const loadStudents = async () => {
    const rows: StudentRow[] = []
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase.from('students').select(STUDENT_FIELDS)
        .eq('academy_id', academyId).order('name').order('id').range(offset, offset + PAGE_SIZE - 1)
      if (error) throw new Error(error.message)
      rows.push(...(data ?? []).map(row => row as StudentRow))
      if ((data?.length ?? 0) < PAGE_SIZE) break
    }
    return rows
  }
  const loadMemberships = async () => {
    const rows: MembershipRow[] = []
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase.from('student_membership').select('*')
        .order('student_id').range(offset, offset + PAGE_SIZE - 1)
      if (error) throw new Error(error.message)
      rows.push(...(data ?? []))
      if ((data?.length ?? 0) < PAGE_SIZE) break
    }
    return rows
  }
  const loadPayments = async () => {
    const rows: PaymentRow[] = []
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase.from('student_payments').select('*')
        .eq('academy_id', academyId).order('date', { ascending: false }).order('id')
        .range(offset, offset + PAGE_SIZE - 1)
      if (error) throw new Error(error.message)
      rows.push(...(data ?? []))
      if ((data?.length ?? 0) < PAGE_SIZE) break
    }
    return rows
  }
  const [studentRows, membershipRows, paymentRows] = await Promise.all([
    loadStudents(), loadMemberships(), loadPayments(),
  ])

  const memberships = new Map(membershipRows.map(row => [row.student_id, row]))
  const paymentsByStudent = new Map<string, PaymentRow[]>()
  for (const payment of paymentRows) {
    const list = paymentsByStudent.get(payment.student_id) ?? []
    list.push(payment)
    paymentsByStudent.set(payment.student_id, list)
  }

  return studentRows.map(row =>
    mapStudentRow(row, memberships.get(row.id), paymentsByStudent.get(row.id) ?? [])
  )
}

export async function getStudentById(id: string): Promise<Student | null> {
  const { supabase, academyId } = await getServerSession()
  const [studentResult, membershipResult, paymentsResult] = await Promise.all([
    supabase.from('students').select(STUDENT_FIELDS).eq('academy_id', academyId).eq('id', id).maybeSingle(),
    supabase.from('student_membership').select('*').eq('student_id', id).maybeSingle(),
    supabase.from('student_payments').select('*').eq('academy_id', academyId).eq('student_id', id).order('date', { ascending: false }),
  ])
  if (studentResult.error) throw new Error(studentResult.error.message)
  if (membershipResult.error) throw new Error(membershipResult.error.message)
  if (paymentsResult.error) throw new Error(paymentsResult.error.message)
  if (!studentResult.data) return null
  return mapStudentRow(studentResult.data as StudentRow, membershipResult.data ?? undefined, paymentsResult.data ?? [])
}

export type BatchStudentRosters = {
  attendanceStudents: Student[]
  historyStudents: Student[]
}

export async function getStudentsByBatch(batchId: string): Promise<BatchStudentRosters> {
  const { supabase, academyId } = await getServerSession()
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(batchId)
  const query = supabase.from('batches').select('id').eq('academy_id', academyId)
  const { data: batch, error } = isUuid
    ? await query.eq('id', batchId).maybeSingle()
    : await query.eq('name', batchId).maybeSingle()
  if (error) throw new Error(error.message)
  if (!batch) return { attendanceStudents: [], historyStudents: [] }
  const students = await getStudents()
  const historyStudents = students.filter(student => student.currentBatchId === batch.id)
  const attendanceStudents = historyStudents.filter(student =>
    student.status === 'active' || student.status === 'due-soon' || student.status === 'expired')
  return { attendanceStudents, historyStudents }
}
