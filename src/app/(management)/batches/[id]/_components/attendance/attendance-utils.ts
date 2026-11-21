import { addDays, differenceInCalendarDays, format, parseISO, startOfMonth, subDays } from 'date-fns'
import type { AttendanceRecord } from '@/lib/types/attendance'
import type { Batch } from '@/lib/types/batches'
import type { Student } from '@/lib/types/students'

export type BatchTab = 'attendance' | 'students' | 'transactions'
export type AttInsightFilter = 'last5' | 'last10' | 'last30' | 'thisMonth'
export type AttendanceDraft = AttendanceRecord['records']
export type AttendanceStatus = AttendanceDraft[string]
export type BatchNavigation = {
  key: string
  tab: BatchTab | undefined
  shouldMark: boolean
  markingDate: string
}

export function getBatchNavigation(tab: string | undefined, date: string | undefined, mode: string | undefined, today: string): BatchNavigation {
  return {
    key: JSON.stringify([tab, date, mode]),
    tab: tab === 'attendance' || tab === 'students' || tab === 'transactions' ? tab : undefined,
    shouldMark: mode === 'marking' || (tab === 'attendance' && Boolean(date)),
    markingDate: date || today,
  }
}

export function isBatchAttendance(record: AttendanceRecord, batch: Batch): boolean {
  return record.batchId === batch.id || record.batchId === batch.name
}

export function getAttendanceDraft(records: AttendanceRecord[], batch: Batch, date: string): AttendanceDraft {
  const saved = records.find(record => isBatchAttendance(record, batch) && record.date === date)
  // Full-day saves must retain marks for hidden inactive, dropout, or transferred students.
  return { ...saved?.records }
}

export function getInsightDates(today: string, filter: AttInsightFilter): string[] {
  const now = parseISO(today)
  if (filter !== 'thisMonth') {
    const days = filter === 'last5' ? 5 : filter === 'last10' ? 10 : 30
    return Array.from({ length: days }, (_, index) => format(subDays(now, days - 1 - index), 'yyyy-MM-dd'))
  }
  const start = startOfMonth(now)
  const days = differenceInCalendarDays(now, start) + 1
  return Array.from({ length: days }, (_, index) => format(addDays(start, index), 'yyyy-MM-dd'))
}

export function getAttendanceStatus(records: AttendanceRecord[], studentId: string, date: string): AttendanceStatus | null {
  return records.find(record => record.date === date)?.records[studentId] ?? null
}

export function getAttendanceAverage(students: Student[], records: AttendanceRecord[], dates: string[]): number | null {
  if (dates.length === 0 || students.length === 0) return null
  const present = students.reduce((sum, student) =>
    sum + dates.filter(date => getAttendanceStatus(records, student.id, date) === 'present').length, 0)
  return Math.round((present / (students.length * dates.length)) * 100)
}

export function getAttendanceSummary(students: Student[], draft: AttendanceDraft) {
  const presentCount = students.filter(student => draft[student.id] === 'present').length
  const absentCount = students.filter(student => draft[student.id] === 'absent').length
  const unmarkedCount = students.length - presentCount - absentCount
  return { presentCount, absentCount, unmarkedCount, allMarked: unmarkedCount === 0 && students.length > 0 }
}

export function markAllPresent(students: Student[], draft: AttendanceDraft): AttendanceDraft {
  const next = { ...draft }
  students.forEach(student => { next[student.id] = 'present' })
  return next
}

export function updateAttendanceRecords(records: AttendanceRecord[], batch: Batch, date: string, draft: AttendanceDraft): AttendanceRecord[] {
  const index = records.findIndex(record => isBatchAttendance(record, batch) && record.date === date)
  if (index < 0) return [{ id: `${batch.id}-${date}`, batchId: batch.id, date, records: { ...draft } }, ...records]
  return records.map((record, current) => current === index ? { ...record, records: { ...draft } } : record)
}
