import ReportsView from './_components/ReportsView'
import { readFeesWindow } from '@/lib/queries/fees-report'
import { canReadFeesReport, getFeesPeriod } from '@/lib/reports/fees'
import type { FeesWindowResult } from '@/lib/reports/fees'
import { getServerSession } from '@/lib/supabase/auth-context'
import { getTodayIST } from '@/lib/utils'
import { canReadAccountsReport } from '@/lib/reports/accounts'

export default async function ReportsPage({ searchParams }: PageProps<'/reports'>) {
  const { mode, date } = await searchParams
  const session = await getServerSession()
  const today = getTodayIST()
  const period = getFeesPeriod(mode, date, today)
  const data: Promise<FeesWindowResult> = canReadFeesReport(session.role)
    ? readFeesWindow(session, period, today).then(window => ({ window })).catch(error => {
      console.error('Could not read fees report', error)
      return { error: 'Could not load the fees report. Try again.' }
    })
    : Promise.resolve({ error: 'Fees reports are available to owners and managers.', unavailable: true })
  return <ReportsView period={period} data={data} accountsAllowed={canReadAccountsReport(session.role)} />
}
