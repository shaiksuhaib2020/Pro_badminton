import 'server-only'

import type { getServerSession } from '@/lib/supabase/auth-context'
import { buildFeesDaily, canReadFeesReport, getFeesWindowRange } from '@/lib/reports/fees'
import type { FeesPeriod, FeesRange, FeesWindow } from '@/lib/reports/fees'

type Query<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>

async function collect<T>(query: (from: number, to: number) => Query<T>): Promise<T[]> {
  const rows: T[] = []
  const pageSize = 1000
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await query(offset, offset + pageSize - 1)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if ((data?.length ?? 0) < pageSize) return rows
  }
}

async function collectByIds<T>(ids: string[], query: (ids: string[], from: number, to: number) => Query<T>): Promise<T[]> {
  const rows: T[] = []
  const chunkSize = 100 // Keep PostgREST URL filters small even for UUID lists.
  for (let offset = 0; offset < ids.length; offset += chunkSize) {
    const chunk = ids.slice(offset, offset + chunkSize)
    rows.push(...await collect((from, to) => query(chunk, from, to)))
  }
  return rows
}

type FeesSession = Pick<Awaited<ReturnType<typeof getServerSession>>, 'supabase' | 'academyId' | 'role'>

export async function readFeesRange(session: FeesSession, range: FeesRange, today: string, signal?: AbortSignal): Promise<FeesWindow> {
  const { supabase, academyId } = session
  if (!canReadFeesReport(session.role)) throw new Error('Fees report access denied')
  const cancellation = signal ?? new AbortController().signal
  const [receipts, batches] = await Promise.all([
    collect((from, to) => supabase.from('student_payments')
      .select('id,student_id,date,amount,remaining_amount,payment_type,payment_method,status')
      .eq('academy_id', academyId).neq('status', 'deleted')
      .gte('date', range.start).lte('date', range.through).order('id').range(from, to).abortSignal(cancellation)),
    collect((from, to) => supabase.from('batches').select('id,name,is_active')
      .eq('academy_id', academyId).order('id').range(from, to).abortSignal(cancellation)),
  ])

  const studentIds = [...new Set(receipts.map(row => row.student_id))]
  const originalIds = receipts.filter(row => row.payment_type !== 'due_clearance').map(row => row.id)
  const [students, clearances] = await Promise.all([
    collectByIds(studentIds, (ids, from, to) => supabase.from('students').select('id,batch_id')
      .eq('academy_id', academyId).in('id', ids).order('id').range(from, to).abortSignal(cancellation)),
    // A posted clearance can settle an original in this period even when its payment date is outside it.
    collectByIds(originalIds, (ids, from, to) => supabase.from('student_payments').select('settles_payment_id,amount,status')
      .eq('academy_id', academyId).eq('payment_type', 'due_clearance').neq('status', 'deleted')
      .in('settles_payment_id', ids).order('id').range(from, to).abortSignal(cancellation)),
  ])

  return { ...buildFeesDaily(range, receipts, clearances, students, batches), range, today, refreshedAt: new Date().toISOString() }
}

export function readFeesWindow(session: FeesSession, period: FeesPeriod, today: string, signal?: AbortSignal) {
  return readFeesRange(session, getFeesWindowRange(period, today), today, signal)
}
