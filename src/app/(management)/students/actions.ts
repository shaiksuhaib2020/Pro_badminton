'use server'

import { revalidatePath } from 'next/cache'
import { format } from 'date-fns'
import { getServerSession } from '@/lib/supabase/auth-context'
import { deriveStudentStatus } from '@/lib/utils'
import type { Database } from '@/lib/supabase/database.types'
import { getStudents } from '@/lib/queries/students'
import type { Student } from '@/lib/mock-data'

export async function getStudentsAction(): Promise<Student[]> {
  return getStudents()
}

type StudentUpdate = Database['public']['Tables']['students']['Update']

export async function createStudent(data: {
  name: string
  phone: string
  alternatePhone?: string
  guardianName?: string
  address?: string
  email?: string
  batch?: string
  fees: number
  startDate: string
  endDate: string
  joiningDate?: string
  amountPaying: number
  partialDue?: number
  paymentMethod: 'cash' | 'upi' | 'card' | 'other'
  dateOfBirth?: string
  enrollmentSource?: 'walk-in' | 'referral' | 'social-media' | 'other'
  internalNotes?: string
  note?: string
}) {
  const { supabase, academyId } = await getServerSession()

  // 1. Duplicate phone check
  const { data: existing } = await supabase
    .from('students')
    .select('id')
    .eq('phone', data.phone)
    .maybeSingle()
  if (existing) throw new Error('DUPLICATE_PHONE')

  const nextDueDate = data.endDate
  const status = deriveStudentStatus(data.endDate)

  // Resolve batch_id if provided
  let batchId: string | null = null
  if (data.batch) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.batch)
    if (isUUID) {
      batchId = data.batch
    } else {
      const { data: b } = await supabase.from('batches').select('id').eq('name', data.batch).maybeSingle()
      if (b) batchId = b.id
    }
  }

  // 3. Insert student
  const effectiveJoiningDate = data.joiningDate && data.joiningDate.trim() ? data.joiningDate.trim() : data.startDate
  const pendingAmount = data.partialDue ?? 0

  const insertPayload: any = {
    academy_id: academyId,
    name: data.name.trim(),
    phone: data.phone.trim(),
    alternate_phone: data.alternatePhone?.trim() || null,
    guardian_name: data.guardianName?.trim() || null,
    batch_id: batchId,
    fees: data.fees,
    start_date: effectiveJoiningDate,
    next_due_date: nextDueDate,
    status: status,
    date_of_birth: data.dateOfBirth || null,
    enrollment_source: data.enrollmentSource || null,
    internal_notes: data.internalNotes?.trim() || '',
    pending_amount: pendingAmount,
  }

  const { data: student, error: studentErr } = await supabase
    .from('students')
    .insert(insertPayload)
    .select('id')
    .single()

  if (studentErr) throw new Error(studentErr.message)

  // 4. Insert first payment
  const paymentType = pendingAmount > 0 ? 'partial' : 'full'

  const { error: payErr } = await supabase.from('student_payments').insert({
    student_id: student.id,
    academy_id: academyId,
    date: data.startDate,
    amount: data.amountPaying,
    remaining_amount: pendingAmount,
    payment_type: paymentType,
    months_covered: 1,
    payment_method: data.paymentMethod,
    status: 'active',
    note: data.note ?? '',
  })

  if (payErr) throw new Error(payErr.message)

  revalidatePath('/students')
  return { id: student.id }
}

export async function renewStudent(data: {
  studentId: string
  newEndDate: string
  amountPaying: number
  renewalFee: number
  partialDue?: number
  paymentMethod: 'cash' | 'upi' | 'card' | 'other'
  note?: string
  newBatch?: string
}) {
  const { supabase, academyId } = await getServerSession()

  const { data: student, error: sErr } = await supabase
    .from('students')
    .select('id, next_due_date')
    .eq('id', data.studentId)
    .single()
  if (sErr || !student) throw new Error('Student not found')

  const prevNextDueDate = student.next_due_date
  const newNextDueDate = data.newEndDate
  const pendingAmount = data.partialDue ?? 0
  const paymentType = pendingAmount > 0 ? 'partial' : 'full'

  const { error: payErr } = await supabase.from('student_payments').insert({
    student_id: data.studentId,
    academy_id: academyId,
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: data.amountPaying,
    remaining_amount: pendingAmount,
    payment_type: paymentType,
    months_covered: 1,
    payment_method: data.paymentMethod,
    status: 'active',
    note: data.note ?? '',
  })
  if (payErr) throw new Error(payErr.message)

  let batchUpdate: { batch_id?: string | null } = {}
  if (data.newBatch) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.newBatch)
    if (isUUID) {
      batchUpdate.batch_id = data.newBatch
    } else {
      const { data: b } = await supabase.from('batches').select('id').eq('name', data.newBatch).maybeSingle()
      if (b) batchUpdate.batch_id = b.id
    }
  }

  const { error: updateErr } = await (supabase.from('students') as any).update({
    next_due_date: newNextDueDate,
    fees: data.renewalFee,
    pending_amount: pendingAmount,
    status: deriveStudentStatus(newNextDueDate),
    ...batchUpdate,
  }).eq('id', data.studentId)
  if (updateErr) throw new Error(updateErr.message)

  revalidatePath('/students')
  revalidatePath(`/students/${data.studentId}`)
}

export async function dropoutStudent(data: { studentId: string; reason: string }) {
  const { supabase } = await getServerSession()

  // Trigger skips 'dropout' — must set status explicitly
  const { error: studentErr } = await supabase.from('students').update({
    status: 'dropout',
    dropout_reason: data.reason,
    dropout_date: format(new Date(), 'yyyy-MM-dd'),
  }).eq('id', data.studentId)
  if (studentErr) throw new Error(studentErr.message)

  // Mark all active payments inactive
  const { error: payErr } = await supabase.from('student_payments')
    .update({ status: 'inactive' })
    .eq('student_id', data.studentId)
    .eq('status', 'active')
  if (payErr) throw new Error(payErr.message)

  revalidatePath('/students')
  revalidatePath(`/students/${data.studentId}`)
}

export async function reEnrollStudent(data: {
  studentId: string
  fees: number
  startDate: string
  endDate: string
  amountPaying: number
  partialDue?: number
  paymentMethod: 'cash' | 'upi' | 'card' | 'other'
  currentBatch?: string
  note?: string
}) {
  const { supabase, academyId } = await getServerSession()
  const pendingAmount = data.partialDue ?? 0
  const paymentType = pendingAmount > 0 ? 'partial' : 'full'

  let batchUpdate: { batch_id?: string | null } = {}
  if (data.currentBatch) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.currentBatch)
    if (isUUID) {
      batchUpdate.batch_id = data.currentBatch
    } else {
      const { data: b } = await supabase.from('batches').select('id').eq('name', data.currentBatch).maybeSingle()
      if (b) batchUpdate.batch_id = b.id
    }
  }

  // Update student row (start_date is immutable in DB, do not update it)
  const { error: sErr } = await (supabase.from('students') as any).update({
    status: deriveStudentStatus(data.endDate),
    next_due_date: data.endDate,
    fees: data.fees,
    pending_amount: pendingAmount,
    dropout_reason: null,
    dropout_date: null,
    ...batchUpdate,
  }).eq('id', data.studentId)
  if (sErr) throw new Error(sErr.message)

  const { error: payErr } = await supabase.from('student_payments').insert({
    student_id: data.studentId,
    academy_id: academyId,
    date: data.startDate,
    amount: data.amountPaying,
    remaining_amount: pendingAmount,
    payment_type: paymentType,
    months_covered: 1,
    payment_method: data.paymentMethod,
    status: 'active',
    note: data.note ?? '',
  })
  if (payErr) throw new Error(payErr.message)

  revalidatePath('/students')
  revalidatePath(`/students/${data.studentId}`)
}

export async function deactivateStudent(studentId: string) {
  const { supabase } = await getServerSession()
  const { error } = await supabase.from('students').update({ status: 'inactive' }).eq('id', studentId)
  if (error) throw new Error(error.message)
  revalidatePath('/students')
  revalidatePath(`/students/${studentId}`)
}

export async function activateStudent(studentId: string) {
  const { supabase } = await getServerSession()
  const { error } = await supabase.from('students').update({ status: 'active' }).eq('id', studentId)
  if (error) throw new Error(error.message)
  revalidatePath('/students')
  revalidatePath(`/students/${studentId}`)
}

export async function collectRemaining(studentId: string, data: {
  amount: number
  paymentMethod: 'cash' | 'upi' | 'card' | 'other'
  note?: string
}) {
  const { supabase, academyId } = await getServerSession()
  const { error } = await supabase.from('student_payments').insert({
    student_id: studentId,
    academy_id: academyId,
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: data.amount,
    remaining_amount: 0,
    payment_type: 'full',
    months_covered: 1,
    payment_method: data.paymentMethod,
    status: 'active',
    note: data.note ?? '',
  })
  if (error) throw new Error(error.message)
  revalidatePath('/students')
  revalidatePath(`/students/${studentId}`)
}

export async function voidPayment(paymentId: string, studentId?: string) {
  const { supabase } = await getServerSession()
  const { error } = await supabase
    .from('student_payments')
    .update({ status: 'deleted' })
    .eq('id', paymentId)
  if (error) throw new Error(error.message)
  revalidatePath('/students')
  if (studentId) revalidatePath(`/students/${studentId}`)
}

export async function updateStudent(id: string, data: {
  name?: string
  phone?: string
  alternatePhone?: string
  guardianName?: string
  batchId?: string
  dateOfBirth?: string
  enrollmentSource?: 'walk-in' | 'referral' | 'social-media' | 'other'
  internalNotes?: string
  fees?: number
  membershipStartDate?: string
  nextDueDate?: string
}) {
  const { supabase } = await getServerSession()

  let batchUpdate: { batch_id?: string | null } = {}
  if (data.batchId !== undefined) {
    if (!data.batchId) {
      batchUpdate.batch_id = null
    } else {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.batchId)
      if (isUUID) {
        batchUpdate.batch_id = data.batchId
      } else {
        const { data: b } = await supabase.from('batches').select('id').eq('name', data.batchId).maybeSingle()
        if (b) batchUpdate.batch_id = b.id
      }
    }
  }

  const updatePayload: StudentUpdate = {
    ...batchUpdate,
  }
  if (data.name !== undefined) updatePayload.name = data.name.trim()
  if (data.phone !== undefined) updatePayload.phone = data.phone.trim()
  if (data.alternatePhone !== undefined) updatePayload.alternate_phone = data.alternatePhone.trim() || null
  if (data.guardianName !== undefined) updatePayload.guardian_name = data.guardianName.trim() || null
  if (data.dateOfBirth !== undefined) updatePayload.date_of_birth = data.dateOfBirth || null
  if (data.enrollmentSource !== undefined) updatePayload.enrollment_source = data.enrollmentSource || null
  if (data.internalNotes !== undefined) updatePayload.internal_notes = data.internalNotes.trim()
  if (data.fees !== undefined) updatePayload.fees = data.fees
  if (data.nextDueDate !== undefined) {
    updatePayload.next_due_date = data.nextDueDate
    updatePayload.status = deriveStudentStatus(data.nextDueDate)
  }

  // Note: NEVER update start_date — it is immutable.

  const { error } = await supabase.from('students').update(updatePayload).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/students')
  revalidatePath(`/students/${id}`)
}

export async function deleteStudentPermanently(id: string) {
  const { supabase } = await getServerSession()
  const { error } = await supabase.from('students').delete().eq('id', id)
  if (error) {
    // Soft-delete if foreign key constraint blocks hard delete
    const { error: softErr } = await supabase.from('students').update({ status: 'inactive' }).eq('id', id)
    if (softErr) throw new Error(softErr.message)
  }
  revalidatePath('/students')
}
