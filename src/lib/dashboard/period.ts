import { getPeriod } from '@/lib/period'

export function getDashboardPeriod(modeValue: string | undefined, dateValue: string | undefined, today: string) {
  return getPeriod(modeValue === 'week' || modeValue === 'month' ? modeValue : 'day', dateValue, today)
}
