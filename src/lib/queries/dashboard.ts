import 'server-only'
import { addDays, format, parseISO } from 'date-fns'
import { getServerSession } from '@/lib/supabase/auth-context'
import type { DashboardInput, DashboardPeriod } from '@/lib/types/dashboard'
import { buildDashboard } from '@/lib/dashboard/metrics'
async function collect<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await query(offset, offset + 999)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? [])); if ((data?.length ?? 0) < 1000) return rows
  }
}
export async function getDashboard(period: DashboardPeriod, today: string) {
  const { supabase, academyId } = await getServerSession()
  const [students, receipts, batches, attendance, enquiries, inventory] = await Promise.all([
    collect((from, to) => supabase.from('students').select('id,name,phone,status,batch_id,fees,joining_date,dropout_date').eq('academy_id', academyId).order('id').range(from, to)),
    collect((from, to) => supabase.from('student_payments').select('id,student_id,created_at,date,amount,remaining_amount,payment_type,start_date,next_due_date,settles_payment_id,payment_method,status').eq('academy_id', academyId).neq('status', 'deleted').order('id').range(from, to)),
    collect((from, to) => supabase.from('batches').select('id,name,days,branch_id,is_active').eq('academy_id', academyId).order('id').range(from, to)),
    collect((from, to) => supabase.from('attendance_records').select('id,batch_id,date,records').eq('academy_id', academyId).gte('date', period.start).lte('date', period.through).order('id').range(from, to)),
    collect((from, to) => supabase.from('enquiries').select('created_at,id').eq('academy_id', academyId).gte('created_at', period.start + 'T00:00:00+05:30').lt('created_at', format(addDays(parseISO(period.through), 1), 'yyyy-MM-dd') + 'T00:00:00+05:30').order('id').range(from, to)),
    collect((from, to) => supabase.from('inventory_items').select('id,name,unit,quantity').eq('academy_id', academyId).lte('quantity', 7).order('id').range(from, to)),
  ])
  const input: DashboardInput = {
    students: students.map(s => ({ id: s.id, name: s.name, phone: String(s.phone ?? ''), status: s.status, currentBatchId: s.batch_id ?? undefined, fees: s.fees / 100, startDate: s.joining_date, dropoutDate: s.dropout_date ?? undefined })),
    receipts: receipts.map(r => ({ id: r.id, studentId: r.student_id, createdAt: r.created_at, date: r.date, amount: r.amount / 100, remainingAmount: r.remaining_amount / 100, paymentType: r.payment_type, coveredFrom: r.start_date ?? undefined, coveredUntil: r.next_due_date ?? undefined, settlesPaymentId: r.settles_payment_id ?? undefined, paymentMethod: r.payment_method, status: r.status, note: '' })),
    batches: batches.filter(b => b.is_active || attendance.some(a => a.batch_id === b.id)).map(b => ({ id: b.id, name: b.name, days: b.days ?? [], branchId: b.branch_id ?? '' })),
    attendance: attendance.map(a => ({ id: a.id, batchId: a.batch_id, date: a.date, records: (a.records ?? {}) as Record<string, 'present' | 'absent'> })),
    enquiries: enquiries.map(e => ({ createdAt: new Date(e.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) })), inventory,
  }
  const metrics = buildDashboard(input, period, today)
  // Historical records retain archived batch labels; today's prompts use active batches only.
  const activeBatches = new Set(batches.filter(b => b.is_active).map(b => b.id))
  metrics.prompts = metrics.prompts.filter(b => activeBatches.has(b.id))
  return metrics
}
