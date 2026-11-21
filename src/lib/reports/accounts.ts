import type { Database } from '@/lib/supabase/database.types'
import { formatReportPaise, getReportBuckets } from './period'
import type { ReportPeriod, ReportRange } from './period'

type Tables = Database['public']['Tables']
export type AccountsExpense = Pick<Tables['account_entries']['Row'], 'date' | 'amount' | 'category'>
export type AccountsSale = Pick<Tables['sales']['Row'], 'date' | 'amount' | 'sale_type' | 'payment_method'>

const SALE_MODES = [
  { id: 'upi', label: 'UPI', color: 'so-accent' },
  { id: 'cash', label: 'Cash', color: 'so-emerald' },
  { id: 'card', label: 'Card', color: 'so-purple' },
  { id: 'other', label: 'Other', color: 'so-grey' },
  { id: 'unspecified', label: 'Unspecified', color: 'so-yellow' },
] as const
const CATEGORY_COLORS = ['so-accent', 'so-purple', 'so-emerald', 'so-yellow', 'so-blue', 'so-orange', 'so-red', 'so-grey']

export const ACCOUNTS_REPORT_LABELS = {
  income: 'Total Income', expenses: 'Total Expenses', net: 'Net Cashflow',
  trend: 'Income vs. Expenses', streams: 'Income Streams', categories: 'Expenses by Category', modes: 'Sales by Payment Mode',
}

export const NET_CASHFLOW_NOTE = 'Sales minus recorded expenses'

export function formatAccountsNet(amount: number) {
  return `${amount > 0 ? '+' : ''}${formatReportPaise(amount)}`
}

type PaymentModeId = typeof SALE_MODES[number]['id']
type DailyTotals = {
  date: string
  inventory: number
  quick: number
  expenses: number
  categories: [string, number][]
  modes: Record<PaymentModeId, number>
}
export type AccountsWindow = { range: ReportRange; today: string; refreshedAt: string; days: DailyTotals[] }

export function canReadAccountsReport(role: string) {
  return role === 'owner' || role === 'manager' || role === 'accountant'
}

function emptyModes(): DailyTotals['modes'] {
  return { upi: 0, cash: 0, card: 0, other: 0, unspecified: 0 }
}

export function buildAccountsDaily(range: ReportRange, expenses: AccountsExpense[], sales: AccountsSale[]): DailyTotals[] {
  const days = new Map<string, Omit<DailyTotals, 'categories'> & { categories: Map<string, number> }>()
  const includes = (date: string) => date >= range.start && date <= range.through
  const getDay = (date: string) => {
    const existing = days.get(date)
    if (existing) return existing
    const day = { date, inventory: 0, quick: 0, expenses: 0, categories: new Map<string, number>(), modes: emptyModes() }
    days.set(date, day)
    return day
  }

  for (const expense of expenses) {
    if (!includes(expense.date)) continue
    const day = getDay(expense.date)
    const category = expense.category.trim() || 'Uncategorized'
    day.expenses += expense.amount
    day.categories.set(category, (day.categories.get(category) ?? 0) + expense.amount)
  }

  for (const sale of sales) {
    if (!includes(sale.date) || (sale.sale_type !== 'inventory' && sale.sale_type !== 'quick')) continue
    const day = getDay(sale.date)
    day[sale.sale_type] += sale.amount
    day.modes[sale.payment_method ?? 'unspecified'] += sale.amount
  }

  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date))
    .map(day => ({ ...day, categories: [...day.categories] }))
}

export function rollUpAccountsPeriod(days: DailyTotals[], period: ReportPeriod) {
  const buckets = getReportBuckets(period).map(bucket => ({
    ...bucket,
    amounts: { income: 0, expenses: 0, inventory: 0, quick: 0 },
  }))
  const categories = new Map<string, number>()
  const modes = emptyModes()
  let inventory = 0
  let quick = 0
  let expenses = 0

  for (const day of days) {
    if (day.date < period.start || day.date > period.through) continue
    const bucket = buckets.find(item => day.date >= item.start && day.date <= item.end)
    if (!bucket) continue
    inventory += day.inventory
    quick += day.quick
    expenses += day.expenses
    bucket.amounts.income += day.inventory + day.quick
    bucket.amounts.expenses += day.expenses
    bucket.amounts.inventory += day.inventory
    bucket.amounts.quick += day.quick
    for (const [category, amount] of day.categories) categories.set(category, (categories.get(category) ?? 0) + amount)
    for (const { id } of SALE_MODES) modes[id] += day.modes[id]
  }

  const income = inventory + quick
  return {
    income, expenses, net: income - expenses, buckets,
    streams: [
      { id: 'inventory', label: 'Inventory Sales', color: 'so-accent', amount: inventory },
      { id: 'quick', label: 'Quick Sales', color: 'so-purple', amount: quick },
    ],
    categories: [...categories].sort(([categoryA, a], [categoryB, b]) => b - a || categoryA.localeCompare(categoryB))
      .map(([label, amount], index) => ({ label, amount, color: CATEGORY_COLORS[index % CATEGORY_COLORS.length] })),
    modes: SALE_MODES.filter(mode => mode.id !== 'unspecified' || modes.unspecified !== 0)
      .map(mode => ({ label: mode.label, color: mode.color, amount: modes[mode.id] })),
  }
}

export type AccountsReport = ReturnType<typeof rollUpAccountsPeriod>
