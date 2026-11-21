'use server'

import { revalidatePath } from 'next/cache'
import { format, isValid, parseISO } from 'date-fns'
import { getServerSession } from '@/lib/supabase/auth-context'
import { getTodayIST } from '@/lib/utils'
import { getStudents } from '@/lib/queries/students'
import type { Database } from '@/lib/supabase/database.types'
import type { Student, EnrollmentDay } from '@/lib/types/students'
import type { PaymentMethod } from '@/lib/types/payments'

type StudentUpdate = Database['public']['Tables']['students']['Update']
type EnrollmentSource = Database['public']['Enums']['enrollment_source']
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function paise(rupees: number): number {
  const raw = rupees * 100
  if (!Number.isFinite(rupees) || rupees < 0 || raw > 2147483647 || Math.abs(Math.round(raw) - raw) > 0.000001) {
    throw new Error('Enter a valid amount in rupees, with at most two decimal places')
  }
  return Math.round(rupees * 100)
}

function enrollmentDetails(data: { address?: string; email?: string; enrollDays?: EnrollmentDay[] }) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  if (data.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) throw new Error('Enter a valid email address')
  if (data.enrollDays?.some(day => !days.includes(day))) throw new Error('Invalid enrollment day')
  return { address: data.address?.trim() || null, email: data.email?.trim() || null, enroll_days: [...new Set(data.enrollDays ?? [])] }
}

function checkPaymentMethod(method: PaymentMethod | null) {
  if (method !== null && !['cash', 'upi', 'card', 'other'].includes(method)) throw new Error('Invalid payment mode')
}

function checkDate(date: string, label: string) {
  const parsed = parseISO(date)
  if (!DATE_PATTERN.test(date) || !isValid(parsed) || format(parsed, 'yyyy-MM-dd') !== date) {
    throw new Error(`${label} must be a valid date`)
  }
}

function revalidateStudent(studentId?: string) {
  revalidatePath('/students')
  revalidatePath('/dashboard')
  revalidatePath('/reports')
  revalidatePath('/transactions')
  revalidatePath('/batches')
  revalidatePath('/batches/[id]', 'page')
  if (studentId) revalidatePath(`/students/${studentId}`)
}

export async function getStudentsAction(): Promise<Student[]> {
  return getStudents()
}

async function resolveBatch(
  supabase: Awaited<ReturnType<typeof getServerSession>>['supabase'],
  academyId: string,
  batch: string | undefined,
): Promise<string | null> {
  if (!batch) return null
  const query = supabase.from('batches').select('id').eq('academy_id', academyId)
  const { data, error } = UUID_PATTERN.test(batch)
    ? await query.eq('id', batch).maybeSingle()
    : await query.eq('name', batch).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Selected batch was not found')
  return data.id
}

export async function createStudent(data: {
  name: string
  phone: string
  alternatePhone?: string
  guardianName?: string
  address?: string
  email?: string
  enrollDays?: EnrollmentDay[]
  batch?: string
  fees?: number
  joiningDate: string
  dateOfBirth?: string
  enrollmentSource?: EnrollmentSource
  internalNotes?: string
}) {
  const { supabase, academyId, role } = await getServerSession()
  if (!['owner', 'manager', 'receptionist'].includes(role)) throw new Error('Not authorized to enroll students')
  if (!data.name.trim()) throw new Error('Student name is required')
  if (!/^[0-9]{10}$/.test(data.phone)) throw new Error('A 10-digit phone number is required')
  checkDate(data.joiningDate, 'Joining date')
  if (data.dateOfBirth) checkDate(data.dateOfBirth, 'Date of birth')

  const { data: existing, error: duplicateError } = await supabase.from('students')
    .select('id').eq('academy_id', academyId).eq('phone', Number(data.phone)).maybeSingle()
  if (duplicateError) throw new Error(duplicateError.message)
  if (existing) throw new Error('DUPLICATE_PHONE')

  const batchId = await resolveBatch(supabase, academyId, data.batch)
  const { data: student, error } = await supabase.from('students').insert({
    academy_id: academyId,
    name: data.name.trim(),
    phone: Number(data.phone),
    alternate_phone: data.alternatePhone?.trim() || null,
    guardian_name: data.guardianName?.trim() || null,
    ...enrollmentDetails(data),
    batch_id: batchId,
    fees: paise(data.fees ?? 0),
    joining_date: data.joiningDate,
    status: 'active',
    date_of_birth: data.dateOfBirth || null,
    enrollment_source: data.enrollmentSource ?? null,
    internal_notes: data.internalNotes?.trim() ?? '',
  }).select('id').single()
  if (error) throw new Error(error.message)
  revalidateStudent(student.id)
  return { id: student.id }
}

export async function reEnrollStudent(data: {
  studentId: string
  name: string
  phone: string
  alternatePhone?: string
  guardianName?: string
  address?: string
  email?: string
  enrollDays?: EnrollmentDay[]
  currentBatch?: string
  fees?: number
  dateOfBirth?: string
  enrollmentSource?: EnrollmentSource
  internalNotes?: string
}) {
  const { supabase, academyId, role } = await getServerSession()
  if (!['owner', 'manager', 'receptionist'].includes(role)) throw new Error('Not authorized to re-enroll students')
  if (!data.name.trim() || !/^[0-9]{10}$/.test(data.phone)) throw new Error('Name and 10-digit phone are required')
  if (data.dateOfBirth) checkDate(data.dateOfBirth, 'Date of birth')
  const batchId = await resolveBatch(supabase, academyId, data.currentBatch)
  const { data: student, error: readError } = await supabase.from('students')
    .select('status').eq('academy_id', academyId).eq('id', data.studentId).single()
  if (readError || !student) throw new Error('Student not found')
  if (student.status !== 'inactive' && student.status !== 'dropout') throw new Error('Only inactive students can be re-enrolled')

  const { error } = await supabase.from('students').update({
    name: data.name.trim(),
    phone: Number(data.phone),
    alternate_phone: data.alternatePhone?.trim() || null,
    guardian_name: data.guardianName?.trim() || null,
    ...enrollmentDetails(data),
    batch_id: batchId,
    fees: paise(data.fees ?? 0),
    date_of_birth: data.dateOfBirth || null,
    enrollment_source: data.enrollmentSource ?? null,
    internal_notes: data.internalNotes?.trim() ?? '',
    status: 'active',
    dropout_reason: null,
    dropout_date: null,
  }).eq('academy_id', academyId).eq('id', data.studentId)
  if (error) throw new Error(error.message)
  revalidateStudent(data.studentId)
}

export async function createFeeReceipt(data: {
  studentId: string
  totalFee: number
  amountPaying: number
  startDate: string
  nextDueDate: string
  paymentDate: string
  paymentMethod: PaymentMethod | null
  transactionId?: string
  note?: string
}) {
  const { supabase, academyId, role } = await getServerSession()
  if (!['owner', 'manager', 'accountant', 'receptionist'].includes(role)) throw new Error('Not authorized to collect fees')
  checkDate(data.startDate, 'Coverage start date')
  checkDate(data.nextDueDate, 'Next due date')
  checkDate(data.paymentDate, 'Payment date')
  checkPaymentMethod(data.paymentMethod)
  if (data.nextDueDate <= data.startDate) throw new Error('Next due date must be after coverage start')
  const total = paise(data.totalFee)
  const paying = paise(data.amountPaying)
  if (total <= 0 || paying <= 0 || paying > total) throw new Error('Amount received must be greater than zero and no more than the fee')
  const { data: student, error: studentError } = await supabase.from('students')
    .select('status').eq('academy_id', academyId).eq('id', data.studentId).single()
  if (studentError || !student) throw new Error('Student not found')
  if (student.status === 'inactive' || student.status === 'dropout') throw new Error('Re-enroll the student before collecting a fee')

  const { error } = await supabase.from('student_payments').insert({
    academy_id: academyId,
    student_id: data.studentId,
    date: data.paymentDate,
    amount: paying,
    remaining_amount: total - paying,
    payment_type: paying < total ? 'partial' : 'full',
    start_date: data.startDate,
    next_due_date: data.nextDueDate,
    payment_method: data.paymentMethod,
    transaction_id: data.transactionId?.trim() || null,
    status: 'active',
    note: data.note?.trim() ?? '',
  })
  if (error) throw new Error(error.message)
  revalidateStudent(data.studentId)
}

export async function settlePendingDue(data: {
  studentId: string
  receiptId: string
  amount: number
  paymentDate: string
  paymentMethod: PaymentMethod
  transactionId?: string
  note?: string
}) {
  const { supabase, academyId, role } = await getServerSession()
  if (!['owner', 'manager', 'accountant', 'receptionist'].includes(role)) throw new Error('Not authorized to collect fees')
  checkDate(data.paymentDate, 'Payment date')
  checkPaymentMethod(data.paymentMethod)
  const amount = paise(data.amount)
  if (amount <= 0) throw new Error('Clearance amount must be greater than zero')
  const { data: target, error: targetError } = await supabase.from('student_payments')
    .select('remaining_amount, status, payment_type')
    .eq('academy_id', academyId).eq('student_id', data.studentId).eq('id', data.receiptId).single()
  if (targetError || !target) throw new Error('Original receipt not found')
  if (target.status === 'deleted' || target.payment_type === 'due_clearance' || amount !== target.remaining_amount) {
    throw new Error('Outstanding balance changed. Refresh and try again.')
  }
  const { error } = await supabase.rpc('record_student_due_clearance', {
    p_student_id: data.studentId,
    p_receipt_id: data.receiptId,
    p_amount: amount,
    p_date: data.paymentDate,
    p_payment_method: data.paymentMethod,
    p_note: data.note?.trim() ?? '',
    p_transaction_id: data.transactionId?.trim() || null,
  })
  if (error) throw new Error(error.message)
  revalidateStudent(data.studentId)
}

export async function voidPayment(paymentId: string, studentId?: string) {
  const { supabase, academyId, role } = await getServerSession()
  if (!['owner', 'manager', 'accountant'].includes(role)) throw new Error('Not authorized to void receipts')
  const { data, error } = await supabase.from('student_payments')
    .update({ status: 'deleted' })
    .eq('academy_id', academyId).eq('id', paymentId).neq('status', 'deleted')
    .select('student_id').single()
  if (error || !data) throw new Error(error?.message ?? 'Receipt not found')
  revalidateStudent(studentId ?? data.student_id)
}

export async function adjustDueDate(data: { studentId: string; nextDueDate: string; reason: string }) {
  const { supabase, role } = await getServerSession()
  if (role !== 'owner' && role !== 'manager') throw new Error('Only owners and managers can adjust due dates')
  checkDate(data.nextDueDate, 'Next due date')
  if (!data.reason.trim()) throw new Error('A reason is required')
  // The migration creates this RPC. It locks and validates the latest receipt before changing its date.
  const { error } = await supabase.rpc('adjust_student_receipt_due_date' as never, {
    p_student_id: data.studentId,
    p_next_due_date: data.nextDueDate,
    p_reason: data.reason.trim(),
  } as never)
  if (error) throw new Error(error.message)
  revalidateStudent(data.studentId)
}

export async function dropoutStudent(data: { studentId: string; reason: string }) {
  const { supabase, academyId, role } = await getServerSession()
  if (role !== 'owner' && role !== 'manager') throw new Error('Not authorized to mark dropouts')
  if (!data.reason.trim()) throw new Error('A dropout reason is required')
  const { error } = await supabase.from('students').update({
    status: 'dropout', dropout_reason: data.reason.trim(), dropout_date: getTodayIST(),
  }).eq('academy_id', academyId).eq('id', data.studentId)
  if (error) throw new Error(error.message)
  const { error: paymentsError } = await supabase.from('student_payments').update({ status: 'inactive' })
    .eq('academy_id', academyId).eq('student_id', data.studentId).eq('status', 'active')
  if (paymentsError) throw new Error(paymentsError.message)
  revalidateStudent(data.studentId)
}

export async function deactivateStudent(studentId: string) {
  const { supabase, academyId } = await getServerSession()
  const { error } = await supabase.from('students').update({ status: 'inactive' }).eq('academy_id', academyId).eq('id', studentId)
  if (error) throw new Error(error.message)
  revalidateStudent(studentId)
}

export async function activateStudent(studentId: string) {
  const { supabase, academyId } = await getServerSession()
  const { error } = await supabase.from('students').update({ status: 'active' }).eq('academy_id', academyId).eq('id', studentId)
  if (error) throw new Error(error.message)
  revalidateStudent(studentId)
}

export async function updateStudent(id: string, data: {
  name?: string
  phone?: string
  alternatePhone?: string
  guardianName?: string
  batchId?: string
  dateOfBirth?: string
  enrollmentSource?: EnrollmentSource
  internalNotes?: string
  fees?: number
}) {
  const { supabase, academyId } = await getServerSession()
  const payload: StudentUpdate = {}
  if (data.name !== undefined) payload.name = data.name.trim()
  if (data.phone !== undefined) {
    if (!/^[0-9]{10}$/.test(data.phone)) throw new Error('A 10-digit phone number is required')
    payload.phone = Number(data.phone)
  }
  if (data.alternatePhone !== undefined) payload.alternate_phone = data.alternatePhone.trim() || null
  if (data.guardianName !== undefined) payload.guardian_name = data.guardianName.trim() || null
  if (data.dateOfBirth !== undefined) payload.date_of_birth = data.dateOfBirth || null
  if (data.enrollmentSource !== undefined) payload.enrollment_source = data.enrollmentSource
  if (data.internalNotes !== undefined) payload.internal_notes = data.internalNotes.trim()
  if (data.fees !== undefined) payload.fees = paise(data.fees)
  if (data.batchId !== undefined) payload.batch_id = await resolveBatch(supabase, academyId, data.batchId)
  const { error } = await supabase.from('students').update(payload).eq('academy_id', academyId).eq('id', id)
  if (error) throw new Error(error.message)
  revalidateStudent(id)
}

export async function deleteStudentPermanently(id: string) {
  const { supabase, academyId } = await getServerSession()
  const { error } = await supabase.from('students').delete().eq('academy_id', academyId).eq('id', id)
  if (error) {
    const { error: softError } = await supabase.from('students').update({ status: 'inactive' })
      .eq('academy_id', academyId).eq('id', id)
    if (softError) throw new Error(softError.message)
  }
  revalidateStudent(id)
}
