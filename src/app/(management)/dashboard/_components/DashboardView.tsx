import type { DashboardMetrics } from '@/lib/dashboard/metrics'
import type { DashboardPeriod } from '@/lib/types/dashboard'
import PeriodNavigation from './PeriodNavigation'
import DashboardStats from './DashboardStats'
import ActivityCard from './ActivityCard'
import PaidStudentsCard from './PaidStudentsCard'
import FeeAlertsCard from './FeeAlertsCard'
import AttendanceAlertsCard from './AttendanceAlertsCard'
import LowStockCard from './LowStockCard'
import DemoMonthlySummaryCard from './DemoMonthlySummaryCard'
export default function DashboardView({ metrics, period, today }: { metrics: DashboardMetrics; period: DashboardPeriod; today: string }) {
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-so-text">Dashboard
          </h1>
          <p className="text-sm text-so-muted">Coaching academy | current statuses and selected-period activity
          </p>
        </div>
        <PeriodNavigation period={period} />
      </header>
      <DashboardStats metrics={metrics} />
      <ActivityCard metrics={metrics} period={period} today={today} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PaidStudentsCard metrics={metrics} />{!period.past &&
          <FeeAlertsCard metrics={metrics} />}
        <AttendanceAlertsCard metrics={metrics} period={period} />
        <LowStockCard metrics={metrics} />
        <DemoMonthlySummaryCard today={today} />
      </div>
    </div>)
}
