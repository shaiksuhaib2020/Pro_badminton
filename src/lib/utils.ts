/**
 * Format a number as Indian Rupees
 * e.g. 1500  "1,500"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format a Date or ISO string as DD/MM/YYYY
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  })
}

/**
 * Format a TIME string (HH:MM:SS or HH:MM) as "6:00 AM"
 */
export function formatTime(time: string): string {
  const [hourStr, minuteStr] = time.split(':')
  const hour = parseInt(hourStr, 10)
  const minute = minuteStr || '00'
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minute} ${period}`
}

/**
 * Format a slot as "6:00 AM  7:00 AM"
 */
export function formatSlot(startTime: string, endTime: string): string {
  return `${formatTime(startTime)}  ${formatTime(endTime)}`
}

/**
 * Get today's date in IST as a YYYY-MM-DD string
 * Use this for all "today" DB comparisons
 */
export function getTodayIST(): string {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Kolkata',
  })
}

/**
 * Get date N days ago in IST as YYYY-MM-DD
 */
export function getDateDaysAgoIST(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toLocaleDateString('en-CA', {
    timeZone: 'Asia/Kolkata',
  })
}

/**
 * Get the first day of the current month in IST as YYYY-MM-DD
 */
export function getFirstDayOfMonthIST(): string {
  const now = new Date()
  const istDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  return `${istDate.getFullYear()}-${String(istDate.getMonth() + 1).padStart(2, '0')}-01`
}

import { parseISO } from 'date-fns'

export const calcAge = (dob: string): number => {
  if (!dob) return 0;
  const birth = parseISO(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}
