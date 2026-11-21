import PeriodNavigation from '@/components/ui/PeriodNavigation'
import type { ComponentProps } from 'react'
import type { ReportMode } from '@/lib/reports/period'

const reportModes = ['week', 'month'] as const

export default function ReportPeriodBar(props: Omit<ComponentProps<typeof PeriodNavigation<ReportMode>>, 'modes'>) {
  return <PeriodNavigation {...props} modes={reportModes} />
}
