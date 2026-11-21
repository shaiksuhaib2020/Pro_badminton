import { canReadAccountsReport, rollUpAccountsPeriod } from '@/lib/reports/accounts'
import { getReportPeriod, getReportWindowRange } from '@/lib/reports/period'
import { readAccountsRange } from '@/lib/queries/accounts-report'
import { readServerSession } from '@/lib/supabase/auth-context'
import { getTodayIST } from '@/lib/utils'

const headers = { 'Cache-Control': 'private, no-store' }
const json = (body: unknown, status = 200) => Response.json(body, { headers, status })

export async function GET(request: Request) {
  const session = await readServerSession()
  if (!session) return json({ error: 'Your session has ended. Sign in to see the accounts report.' }, 401)
  if (!canReadAccountsReport(session.role)) return json({ error: 'Accounts reports are available to owners, managers, and accountants.' }, 403)

  const params = new URL(request.url).searchParams
  const mode = params.get('mode')
  const date = params.get('date')
  const view = params.get('view')
  const today = getTodayIST()
  const period = getReportPeriod(mode, date, today)
  if ((mode !== 'week' && mode !== 'month') || (view !== 'window' && view !== 'period')
    || (date !== null && date !== period.anchor) || (view === 'period' && date === null)) {
    return json({ error: 'Choose a valid week or month.' }, 400)
  }

  try {
    const range = view === 'window' ? getReportWindowRange(period, today) : period
    const snapshot = await readAccountsRange(session, range, today, request.signal)
    if (view === 'window') return json({ window: snapshot })
    return json({ period, refreshedAt: snapshot.refreshedAt, report: rollUpAccountsPeriod(snapshot.days, period) })
  } catch (error) {
    if (!request.signal.aborted) console.error('Could not read accounts report', error)
    return json({ error: 'Could not load the accounts report. Try again.' }, 503)
  }
}
