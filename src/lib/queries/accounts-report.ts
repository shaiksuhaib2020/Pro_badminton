import 'server-only'

import { buildAccountsDaily, canReadAccountsReport } from '@/lib/reports/accounts'
import type { AccountsExpense, AccountsSale, AccountsWindow } from '@/lib/reports/accounts'
import type { ReportRange } from '@/lib/reports/period'
import type { readServerSession } from '@/lib/supabase/auth-context'
import { readAllPages } from './read-all-pages'

type AccountsSession = Pick<NonNullable<Awaited<ReturnType<typeof readServerSession>>>, 'supabase' | 'academyId' | 'role'>

export async function readAccountsRange(session: AccountsSession, range: ReportRange, today: string, signal: AbortSignal): Promise<AccountsWindow> {
  if (!canReadAccountsReport(session.role)) throw new Error('Accounts report access denied')
  const { supabase, academyId } = session
  const [expenses, sales] = await Promise.all([
    readAllPages<AccountsExpense>((from, to) => supabase.from('account_entries').select('date,amount,category')
      .eq('academy_id', academyId).eq('entry_type', 'expense').gte('date', range.start).lte('date', range.through)
      .order('id').range(from, to).abortSignal(signal), signal),
    readAllPages<AccountsSale>((from, to) => supabase.from('sales').select('date,amount,sale_type,payment_method')
      .eq('academy_id', academyId).in('sale_type', ['inventory', 'quick']).gte('date', range.start).lte('date', range.through)
      .order('id').range(from, to).abortSignal(signal), signal),
  ])
  return { range, today, refreshedAt: new Date().toISOString(), days: buildAccountsDaily(range, expenses, sales) }
}
