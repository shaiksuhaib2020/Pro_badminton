import { addDays, format, parseISO } from 'date-fns'
import type { DashboardInput, DashboardPeriod, DashboardReceipt } from '@/lib/types/dashboard'
export const ATTENDANCE_THRESHOLD = 60
export const MIN_ATTENDANCE_SESSIONS = 3
function sumMoney(values: number[]): number {
  return values.reduce((paise, rupees) => paise + Math.round(rupees * 100), 0) / 100
}
export function buildDashboard(input: DashboardInput, period: DashboardPeriod, today: string) {
  const { students, receipts, batches, attendance } = input
  const byStudent = new Map(students.map(s => [s.id, s]))
  const byBatch = new Map(batches.map(b => [b.id, b]))
  const inPeriod = (date: string | undefined) => Boolean(date && date >= period.start && date <= period.end)
  const live = receipts.filter(r => r.status !== 'deleted')
  const paid = live.filter(r => inPeriod(r.date) && r.date <= today).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '') || b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
  const originals = live.filter(r => r.paymentType !== 'due_clearance')
  const coverage = new Map<string, DashboardReceipt>()
  for (const r of [...originals].sort((a, b) => (b.coveredFrom ?? '').localeCompare(a.coveredFrom ?? '') || (b.createdAt ?? '').localeCompare(a.createdAt ?? '') || a.id.localeCompare(b.id))) {
    if (r.status === 'active' && r.coveredFrom && r.coveredUntil && !coverage.has(r.studentId)) coverage.set(r.studentId, r)
  }
  const active = students.filter(s => s.status !== 'inactive' && s.status !== 'dropout')
  const partials = originals.filter(r => r.remainingAmount > 0)
  const datedPartials = partials.filter(r => inPeriod(r.coveredUntil))
  const partialIds = new Set(datedPartials.map(r => r.id))
  const soon = format(addDays(parseISO(today), 3), 'yyyy-MM-dd')
  const alerts = datedPartials.map(r => ({ key: r.id, studentId: r.studentId, dueDate: r.coveredUntil!, status: r.coveredUntil! < today ? 'Overdue' : 'Pending', amount: r.remainingAmount, kind: 'Unpaid receipt' }))
  for (const s of active) {
    const r = coverage.get(s.id)
    if (r && inPeriod(r.coveredUntil) && !partialIds.has(r.id)) alerts.push({ key: 'renewal-' + r.id, studentId: s.id, dueDate: r.coveredUntil!, status: r.coveredUntil! < today ? 'Overdue' : r.coveredUntil! <= soon ? 'Due Soon' : 'Upcoming', amount: 0, kind: 'Renewal reminder' })
  }
  alerts.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.key.localeCompare(b.key))
  const batchAttendance = batches.map(batch => {
    const records = attendance.filter(r => r.batchId === batch.id && inPeriod(r.date) && r.date <= today)
    const marks = records.flatMap(r => Object.entries(r.records).filter(([, status]) => status === 'present' || status === 'absent').map(([id, status]) => ({ id, status })))
    const present = marks.filter(m => m.status === 'present').length
    return { id: batch.id, name: batch.name, present, total: marks.length, rate: marks.length ? Math.round(present / marks.length * 100) : null }
  })
  const studentSessions = new Map<string, { studentId: string; batchId: string; present: number; total: number }>()
  const absent: { key: string; studentId: string; batchId: string }[] = []
  for (const record of attendance.filter(r => inPeriod(r.date) && r.date <= today)) for (const [id, status] of Object.entries(record.records)) {
    if (status !== 'present' && status !== 'absent') continue
    const key = record.batchId + ':' + id
    const summary = studentSessions.get(key) ?? { studentId: id, batchId: record.batchId, present: 0, total: 0 }
    summary.total++; if (status === 'present') summary.present++
    studentSessions.set(key, summary)
    if (status === 'absent') absent.push({ key: record.id + ':' + id, studentId: id, batchId: record.batchId })
  }
  const rated = [...studentSessions.values()].map(s => ({ ...s, rate: Math.round(s.present / s.total * 100) }))
  const flagged = rated.filter(s => s.total >= MIN_ATTENDANCE_SESSIONS && s.present * 100 < ATTENDANCE_THRESHOLD * s.total).sort((a, b) => a.rate - b.rate || a.studentId.localeCompare(b.studentId))
  return {
    paid: paid.map(r => ({ ...r, student: byStudent.get(r.studentId) })),
    collected: sumMoney(paid.map(r => r.amount)),
    pendingAmount: period.past ? null : sumMoney(datedPartials.map(r => r.remainingAmount)),
    pendingStudents: new Set(datedPartials.map(r => r.studentId)).size,
    undatedBalances: partials.filter(r => !r.coveredUntil).length,
    activeCount: active.length,
    overdueCount: period.past ? null : active.filter(s => { const r = coverage.get(s.id); return Boolean(r?.coveredUntil && r.coveredUntil < today) }).length,
    expiring: active.filter(s => { const r = coverage.get(s.id); return Boolean(r?.coveredUntil && r.coveredUntil >= today && r.coveredUntil <= soon) }).length,
    activity: { enrollments: students.filter(s => inPeriod(s.startDate) && s.startDate <= today).length, dropouts: students.filter(s => inPeriod(s.dropoutDate) && s.dropoutDate! <= today).length, enquiries: input.enquiries.filter(e => inPeriod(e.createdAt) && e.createdAt <= today).length, payments: paid.length, inactive: students.filter(s => s.status === 'inactive').length },
    alerts: period.past ? [] : alerts.map(a => ({ ...a, student: byStudent.get(a.studentId) })),
    batchAttendance,
    absent: absent.sort((a, b) => a.batchId.localeCompare(b.batchId) || a.studentId.localeCompare(b.studentId)).map(a => ({ ...a, student: byStudent.get(a.studentId), batch: byBatch.get(a.batchId) })),
    flagged: flagged.map(a => ({ ...a, student: byStudent.get(a.studentId), batch: byBatch.get(a.batchId) })),
    markedSessions: rated.reduce((sum, s) => sum + s.total, 0),
    insufficient: rated.filter(s => s.total < MIN_ATTENDANCE_SESSIONS).length,
    prompts: batches.filter(b => b.days.includes(format(parseISO(today), 'EEEE'))).map(b => {
      const roster = active.filter(s => s.currentBatchId === b.id)
      const saved = attendance.find(r => r.batchId === b.id && r.date === today)
      return { ...b, total: roster.length, marked: roster.filter(s => saved?.records[s.id] === 'present' || saved?.records[s.id] === 'absent').length }
    }),
    lowStock: input.inventory.filter(i => i.quantity <= 7).sort((a, b) => a.quantity - b.quantity || a.name.localeCompare(b.name)),
  }
}
export type DashboardMetrics = ReturnType<typeof buildDashboard>
