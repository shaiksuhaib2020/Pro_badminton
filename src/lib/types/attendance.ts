export type AttendanceRecord = {
  id: string
  batchId: string
  date: string           // yyyy-MM-dd
  records: Record<string, 'present' | 'absent'>  // studentId → status
}
