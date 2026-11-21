import { mockExpenses, mockIncomeEntries } from '@/lib/mock-data'
import { formatCurrency } from '@/lib/utils'
import Card from '@/components/ui/Card'
export default function DemoMonthlySummaryCard({ today }: { today: string }) {
  const inMonth = (date: string) => date >= today.slice(0, 7) + '-01' && date <= today
  const income = mockIncomeEntries.filter(r => inMonth(r.date)).reduce((n, r) => n + r.amount, 0)
  const expenses = mockExpenses.filter(r => inMonth(r.date)).reduce((n, r) => n + r.amount, 0)
  return (
    <Card title="This Month - Demo" note="Sample accounts data">
      <p className="text-xs text-so-muted mb-4">Excluded from live dashboard totals. Accounts summary redesign is pending.
      </p>{[['Income', income], ['Expenses', expenses], ['Net', income - expenses]].map(([label, value]) =>
        <div key={label} className="flex justify-between py-3 text-sm">
          <span>{label}
          </span>
          <span className="font-semibold">{formatCurrency(Number(value))}
          </span>
        </div>)}
    </Card>)
}
