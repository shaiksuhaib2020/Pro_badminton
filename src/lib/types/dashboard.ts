import type { Student } from './students'
import type { PaymentEntry } from './payments'
import type { Batch } from './batches'
import type { AttendanceRecord } from './attendance'
export type DashboardStudent = Pick<Student, 'id' | 'name' | 'phone' | 'status' | 'currentBatchId' | 'fees' | 'startDate' | 'dropoutDate'>
export type DashboardReceipt = PaymentEntry & { studentId: string }
export type DashboardInput = {
  students: DashboardStudent[]; receipts: DashboardReceipt[]; batches: Batch[]; attendance: AttendanceRecord[]
  enquiries: { createdAt: string }[]
  inventory: { id: string; name: string; unit: string; quantity: number }[]
}
export type { PeriodMode as DashboardMode, Period as DashboardPeriod } from '@/lib/period'
