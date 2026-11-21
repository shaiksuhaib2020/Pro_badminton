import type { ReactNode } from 'react'
import { Layers, Package, TrendingDown, TrendingUp, Wallet, Zap } from 'lucide-react'
import type { AccountEntry, SaleEntry } from '@/lib/types/accounts'
import { formatCurrency } from '@/lib/utils'
import { getAccountsSummary } from '../_lib/accounts-summary'

function SummaryCard({ title, icon, children, caption }: {
  title: string; icon: ReactNode; children: ReactNode; caption?: string
}) {
  return <div className="bg-so-card border border-so-border rounded-xl p-5 shadow-sm">
    <div className="flex items-center gap-3 text-so-muted mb-2">
      {icon}<h3 className="text-sm font-medium">{title}</h3>
    </div>
    {children}
    {caption && <p className="text-xs text-so-muted mt-2">{caption}</p>}
  </div>
}

export default function AccountsSummary({ segment, expenses, sales }: {
  segment: 'expense' | 'income'; expenses: AccountEntry[]; sales: SaleEntry[]
}) {
  const summary = getAccountsSummary(expenses, sales)
  const valueClass = 'text-2xl font-bold text-so-text'
  return <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    {segment === 'expense' ? <>
      <SummaryCard title="Total Expenses" icon={<TrendingDown className="w-5 h-5 shrink-0 text-so-red" strokeWidth={1.75} />}>
        <p className={valueClass}>{formatCurrency(summary.totalExpenses)}</p>
      </SummaryCard>
      <SummaryCard title="Top Category" icon={<Layers className="w-5 h-5 shrink-0 text-so-yellow" strokeWidth={1.75} />} caption={summary.topCategory ? formatCurrency(summary.topCategory.amount) : undefined}>
        <p className="text-lg font-bold text-so-text">{summary.topCategory?.name ?? '-'}</p>
      </SummaryCard>
      <SummaryCard title="Net Balance" icon={<Wallet className={`w-5 h-5 shrink-0 ${summary.netBalance >= 0 ? 'text-so-emerald' : 'text-so-red'}`} strokeWidth={1.75} />} caption="Income - Expenses">
        <p className={`text-2xl font-bold ${summary.netBalance >= 0 ? 'text-so-emerald' : 'text-so-red'}`}>
          {summary.netBalance >= 0 ? '+' : '-'} {formatCurrency(Math.abs(summary.netBalance))}
        </p>
      </SummaryCard>
    </> : <>
      <SummaryCard title="Total Income" icon={<TrendingUp className="w-5 h-5 shrink-0 text-so-emerald" strokeWidth={1.75} />}>
        <p className={valueClass}>{formatCurrency(summary.totalIncome)}</p>
      </SummaryCard>
      <SummaryCard title="Inventory Sales" icon={<Package className="w-5 h-5 shrink-0 text-so-accent" strokeWidth={1.75} />} caption={`${summary.inventoryCount} ${summary.inventoryCount === 1 ? 'sale' : 'sales'}`}>
        <p className={valueClass}>{formatCurrency(summary.inventoryTotal)}</p>
      </SummaryCard>
      <SummaryCard title="Quick Sales" icon={<Zap className="w-5 h-5 shrink-0 text-so-yellow" strokeWidth={1.75} />} caption={`${summary.quickCount} ${summary.quickCount === 1 ? 'sale' : 'sales'}`}>
        <p className={valueClass}>{formatCurrency(summary.quickTotal)}</p>
      </SummaryCard>
    </>}
  </div>
}
