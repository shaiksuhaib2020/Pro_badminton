import { differenceInCalendarDays, format, isValid, parseISO } from 'date-fns'
import type { Student } from '@/lib/types/students'
import { formatCurrency } from '@/lib/utils'
import type { ReceiptRow } from './types'

function parseDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = parseISO(value)
  return isValid(date) && format(date, 'yyyy-MM-dd') === value ? date : null
}

function creationTime(value: string | undefined, fallbackDate: string): number {
  const timestamp = value ? parseISO(value) : null
  if (timestamp && isValid(timestamp)) return timestamp.getTime()
  // Date-only legacy values have no issue time; use IST midnight consistently
  // when comparing them with absolute database timestamps on different clients.
  return parseDate(fallbackDate) ? parseISO(`${fallbackDate}T00:00:00+05:30`).getTime() : -Infinity
}

function compareDescending(a: number, b: number): number {
  return a === b ? 0 : a > b ? -1 : 1
}

/** Activity logs use issue time; the editable payment date still controls date filters. */
export function compareReceiptRows(a: ReceiptRow, b: ReceiptRow): number {
  return compareDescending(
    creationTime(a.receipt.createdAt, a.receipt.date),
    creationTime(b.receipt.createdAt, b.receipt.date),
  ) || compareDescending(
    parseDate(a.receipt.date)?.getTime() ?? -Infinity,
    parseDate(b.receipt.date)?.getTime() ?? -Infinity,
  ) || a.receipt.id.localeCompare(b.receipt.id)
}

function pendingReferenceTime(student: Student): number {
  if (student.membershipReceiptId) {
    // nextDueDate is mapped from the active receipt selected by student_membership.
    return parseDate(student.nextDueDate)
      ? parseISO(`${student.nextDueDate}T00:00:00+05:30`).getTime()
      : Infinity
  }
  const created = creationTime(student.createdAt, '')
  return created === -Infinity ? Infinity : created
}

function pendingActivityTime(student: Student): number {
  const receipt = student.membershipReceiptId
    ? student.paymentHistory.find(payment => payment.id === student.membershipReceiptId)
    : undefined
  const issued = creationTime(receipt?.createdAt, '')
  return issued === -Infinity ? creationTime(student.createdAt, '') : issued
}

/** One ascending timeline: active receipt due date at IST midnight, or New creation time. */
export function comparePendingStudents(a: Student, b: Student): number {
  return compareDescending(pendingReferenceTime(b), pendingReferenceTime(a))
    || compareDescending(pendingActivityTime(a), pendingActivityTime(b))
    || a.id.localeCompare(b.id)
}

export function formatTransactionDate(value: string | undefined): string {
  const date = parseDate(value)
  return date ? format(date, 'dd MMM, yyyy') : '-'
}

export function formatPaymentFor({ student, receipt }: ReceiptRow): string {
  const coverage = receipt.paymentType === 'due_clearance'
    ? student.paymentHistory.find(payment => payment.id === receipt.settlesPaymentId)
    : receipt
  if (!coverage || !parseDate(coverage.coveredFrom) || !parseDate(coverage.coveredUntil)) return '-'
  return `${formatTransactionDate(coverage.coveredFrom)} to ${formatTransactionDate(coverage.coveredUntil)}`
}

export function getDueIndicator(student: Student, today: string) {
  if (!student.membershipReceiptId) return { label: 'New', color: 'text-so-muted' }
  const due = parseDate(student.nextDueDate)
  const current = parseDate(today)
  if (!due || !current) return { label: '', color: 'text-so-muted' }
  const days = differenceInCalendarDays(due, current)
  if (days <= 0) return { label: days === 0 ? 'Overdue Today' : `Overdue ${-days}d`, color: 'text-so-red' }
  return { label: `Due in ${days}d`, color: 'text-so-yellow' }
}

export function formatOutstandingSince(date: string, today: string): string {
  const received = parseDate(date)
  const current = parseDate(today)
  if (!received || !current) return '-'
  return `${formatTransactionDate(date)} · ${Math.max(0, differenceInCalendarDays(current, received))}d`
}

export function getReminderHref(phone: string, message: string): string | null {
  // Accept local Indian mobile numbers or the same number with +91 / 91.
  const value = phone.trim()
  if (!/^[+\d\s()-]+$/.test(value)) return null
  const digits = value.replace(/\D/g, '')
  const local = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits
  if (!/^[6-9]\d{9}$/.test(local)) return null
  return `https://wa.me/91${local}?text=${encodeURIComponent(message)}`
}

export function getPendingReminder(student: Student, today: string): string {
  if (!student.membershipReceiptId) return `Hello ${student.name}, this is a reminder to arrange your first coaching fee payment. Please contact the academy to confirm the amount. Thank you.`
  const indicator = getDueIndicator(student, today)
  const timing = indicator.label.startsWith('Overdue') ? 'is overdue' : 'is upcoming'
  return `Hello ${student.name}, your coaching fee payment of ${formatCurrency(student.fees)} ${timing}. Due date: ${formatTransactionDate(student.nextDueDate)}. Please arrange payment with the academy. Thank you.`
}

export function getPartialReminder(row: ReceiptRow): string {
  return `Hello ${row.student.name}, your coaching fee receipt has an outstanding balance of ${formatCurrency(row.receipt.remainingAmount)}. Payment For: ${formatPaymentFor(row)}. Please arrange payment with the academy. Thank you.`
}
