import { addDays, addMonths, addWeeks, endOfMonth, endOfWeek, format, isValid, parseISO, startOfMonth, startOfWeek } from 'date-fns'

export const PERIOD_MODES = ['day', 'week', 'month'] as const
export type PeriodMode = typeof PERIOD_MODES[number]
export type Period<Mode extends PeriodMode = PeriodMode> = {
  mode: Mode
  anchor: string
  start: string
  end: string
  through: string
  past: boolean
  label: string
  previous: string
  next: string | null
}

export function getPeriod<Mode extends PeriodMode>(mode: Mode, dateValue: string | undefined, today: string): Period<Mode> {
  const parsed = dateValue && /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? parseISO(dateValue) : null
  const anchor = parsed && isValid(parsed) && format(parsed, 'yyyy-MM-dd') === dateValue && dateValue <= today ? dateValue : today
  const date = parseISO(anchor)
  const start = format(mode === 'month' ? startOfMonth(date) : mode === 'week' ? startOfWeek(date, { weekStartsOn: 1 }) : date, 'yyyy-MM-dd')
  const end = format(mode === 'month' ? endOfMonth(date) : mode === 'week' ? endOfWeek(date, { weekStartsOn: 1 }) : date, 'yyyy-MM-dd')
  const shift = (n: number) => format(mode === 'month' ? addMonths(parseISO(start), n) : mode === 'week' ? addWeeks(parseISO(start), n) : addDays(date, n), 'yyyy-MM-dd')
  const label = mode === 'month' ? format(date, 'MMMM yyyy')
    : mode === 'week' ? format(parseISO(start), 'd EEE MMM yyyy') + ' - ' + format(parseISO(end), 'd EEE MMM yyyy')
    : format(date, "d EEE '·' MMMM yyyy")
  return { mode, anchor, start, end, through: end > today ? today : end, past: end < today, label, previous: shift(-1), next: end >= today ? null : shift(1) }
}
