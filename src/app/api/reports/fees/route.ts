import { ALL_BATCHES, canReadFeesReport, getFeesPeriod, rollUpFeesPeriod, selectFeesReport, UNAVAILABLE_BATCH } from '@/lib/reports/fees'
import { readFeesRange, readFeesWindow } from '@/lib/queries/fees-report'
import { readServerSession } from '@/lib/supabase/auth-context'
import { getTodayIST } from '@/lib/utils'

const headers = { 'Cache-Control': 'private, no-store' }
const json = (body: unknown, status = 200) => Response.json(body, { headers, status })

export async function GET(request: Request) {
  const session = await readServerSession()
  if (!session) return json({ error: 'Your session has ended. Sign in to see the fees report.' }, 401)
  if (!canReadFeesReport(session.role)) return json({ error: 'Fees reports are available to owners and managers.' }, 403)

  const params = new URL(request.url).searchParams
  const mode = params.get('mode')
  const date = params.get('date')
  const view = params.get('view')
  const today = getTodayIST()
  const period = getFeesPeriod(mode, date, today)
  if ((mode !== 'week' && mode !== 'month') || (view !== 'window' && view !== 'period')
    || (date !== null && date !== period.anchor) || (view === 'period' && date === null)) {
    return json({ error: 'Choose a valid week or month.' }, 400)
  }

  try {
    if (view === 'window') return json({ window: await readFeesWindow(session, period, today, request.signal) })

    const batchId = params.get('batch') ?? ALL_BATCHES
    const snapshot = await readFeesRange(session, period, today, request.signal)
    const report = rollUpFeesPeriod(snapshot, period)
    if (batchId !== ALL_BATCHES && !report.batches.some(batch => batch.id === batchId)) {
      if (batchId !== UNAVAILABLE_BATCH) return json({ error: 'The selected batch is no longer available.' }, 404)
      const empty = selectFeesReport({ ...report, batches: [] }, ALL_BATCHES)
      return json({ period, refreshedAt: snapshot.refreshedAt,
        selection: { ...empty, batchId, batchLabel: 'Batch unavailable' } })
    }
    return json({ period, refreshedAt: snapshot.refreshedAt, selection: selectFeesReport(report, batchId) })
  } catch (error) {
    if (!request.signal.aborted) console.error('Could not read fees report', error)
    return json({ error: 'Could not load the fees report. Try again.' }, 503)
  }
}
