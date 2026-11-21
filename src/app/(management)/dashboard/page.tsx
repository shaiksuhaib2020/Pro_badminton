import { getTodayIST } from '@/lib/utils'
import { getDashboardPeriod } from '@/lib/dashboard/period'
import { getDashboard } from '@/lib/queries/dashboard'
import DashboardView from './_components/DashboardView'
export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const today = getTodayIST()
  const period = getDashboardPeriod(typeof params.mode === 'string' ? params.mode : undefined, typeof params.date === 'string' ? params.date : undefined, today)
  const metrics = await getDashboard(period, today)
  return (
    <DashboardView metrics={metrics} period={period} today={today} />)
}
