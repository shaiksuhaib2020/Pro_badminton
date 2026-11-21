import { addDays, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek, subMonths } from 'date-fns'
import { getPeriod } from '@/lib/period'
import type { Period } from '@/lib/period'
import { formatCurrency } from '@/lib/utils'

export type ReportMode = 'week' | 'month'
export type ReportPeriod = Period<ReportMode>
export type ReportRange = { start: string; end: string; through: string }
export type ReportBucket = { label: string; start: string; end: string; rangeLabel: string; future: boolean }

export function getReportPeriod(modeValue: unknown, dateValue: unknown, today: string): ReportPeriod {
  const mode = modeValue === 'week' ? 'week' : 'month'
  return getPeriod(mode, typeof dateValue === 'string' ? dateValue : undefined, today)
}

export function getReportWindowRange(period: ReportPeriod, today: string): ReportRange {
  const month = parseISO(period.anchor)
  const start = format(startOfWeek(startOfMonth(subMonths(month, 2)), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const end = format(endOfWeek(endOfMonth(month), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  return { start, end, through: end < today ? end : today }
}

export function coversReportPeriod(range: ReportRange, period: ReportPeriod) {
  return range.start <= period.start && range.end >= period.end && range.through >= period.through
}

export function formatReportPaise(paise: number): string {
  return formatCurrency(paise / 100, { fractionDigits: paise % 100 === 0 ? 0 : 2 })
}

const percentFormatter = new Intl.NumberFormat('en-IN', { style: 'percent', maximumFractionDigits: 1 })
export function formatReportShare(amount: number, total: number) {
  return percentFormatter.format(total > 0 ? amount / total : 0)
}

export function formatReportRefreshTime(timestamp: string) {
  return `${new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(timestamp))} IST`
}

export function getReportBuckets(period: ReportPeriod): ReportBucket[] {
  const first = parseISO(period.start)
  if (period.mode === 'week') {
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(first, index)
      const day = format(date, 'yyyy-MM-dd')
      return { label: format(date, 'EEE'), start: day, end: day, rangeLabel: format(date, 'd MMM yyyy'), future: day > period.through }
    })
  }

  const lastDay = parseISO(period.end).getDate()
  return Array.from({ length: Math.ceil(lastDay / 7) }, (_, index) => {
    const firstDay = index * 7 + 1
    const endDay = Math.min(firstDay + 6, lastDay)
    const start = format(addDays(first, firstDay - 1), 'yyyy-MM-dd')
    return {
      label: index === 4 ? 'Partial week' : `Week ${index + 1}`,
      start,
      end: format(addDays(first, endDay - 1), 'yyyy-MM-dd'),
      rangeLabel: firstDay === endDay ? String(firstDay) : `${firstDay}–${endDay}`,
      future: start > period.through,
    }
  })
}
