'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { AccountEntry, SaleEntry, SaleType } from '@/lib/types/accounts'
import type { InventoryItem } from '@/lib/types/inventory'
import PeriodNavigation from '@/components/ui/PeriodNavigation'
import { getPeriod, PERIOD_MODES } from '@/lib/period'
import type { PeriodMode } from '@/lib/period'
import {
  TrendingDown, Plus, Pencil,
  Search, BookOpen, MoreVertical,
  CheckCircle2, AlertCircle,
} from 'lucide-react'
import { formatDate, formatCurrency, getTodayIST } from '@/lib/utils'
import ExpenseModal from '@/app/(management)/accounts/_components/expenses/ExpenseModal'
import ExpenseDetailsModal from '@/app/(management)/accounts/_components/expenses/ExpenseDetailsModal'
import InventorySalesTab from '@/app/(management)/accounts/_components/income/InventorySalesTab'
import QuickSalesTab from '@/app/(management)/accounts/_components/income/QuickSalesTab'
import AccountsSummary from './AccountsSummary'
import {
  createExpense, updateExpense, deleteExpense, createCustomCategory,
} from '../actions'

type AccountModule = 'expense' | SaleType
type PeriodSelection = { mode: PeriodMode; anchor: string }

interface Props {
  initialExpenses: AccountEntry[]
  initialCustomCategories: string[]
  initialSales: SaleEntry[]
  initialInventoryItems: InventoryItem[]
}

export default function AccountsView({
  initialExpenses,
  initialCustomCategories,
  initialSales,
  initialInventoryItems,
}: Props) {
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense')
  const [incomeTab, setIncomeTab] = useState<'inventory' | 'quick'>('inventory')
  const incomeTabsRef = useRef<HTMLDivElement>(null)
  const [today, setToday] = useState(getTodayIST)
  const [selections, setSelections] = useState<Partial<Record<AccountModule, PeriodSelection>>>({})

  const periodFor = (module: AccountModule) => getPeriod(selections[module]?.mode ?? 'month', selections[module]?.anchor, today)
  const selectPeriod = (module: AccountModule, mode: PeriodMode, anchor: string) => {
    setSelections(previous => ({ ...previous, [module]: { mode, anchor } }))
  }

  useEffect(() => {
    const updateToday = () => setToday(getTodayIST())
    window.addEventListener('focus', updateToday)
    return () => window.removeEventListener('focus', updateToday)
  }, [])

  const [expSearchQuery, setExpSearchQuery] = useState('')

  // Expense UI interaction states
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<AccountEntry | null>(null)
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null)
  const [viewingExpense, setViewingExpense] = useState<AccountEntry | null>(null)
  const [expMenuOpenId, setExpMenuOpenId] = useState<string | null>(null)

  const [createdCategories, setCreatedCategories] = useState<string[]>([])
  const localCustomCategories = [...new Set([...initialCustomCategories, ...createdCategories])].sort()

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [saving, setSaving] = useState(false)

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  const expensePeriod = periodFor('expense')
  const inventoryPeriod = periodFor('inventory')
  const quickPeriod = periodFor('quick')
  const summaryPeriod = activeTab === 'expense' ? expensePeriod : incomeTab === 'inventory' ? inventoryPeriod : quickPeriod
  const { start: expenseStart, end: expenseEnd } = expensePeriod
  const { start: summaryStart, end: summaryEnd } = summaryPeriod

  const dateFilteredExpenses = useMemo(() => initialExpenses.filter(expense =>
    expense.date >= expenseStart && expense.date <= expenseEnd), [initialExpenses, expenseStart, expenseEnd])
  const summarySales = useMemo(() => initialSales.filter(sale =>
    sale.date >= summaryStart && sale.date <= summaryEnd), [initialSales, summaryStart, summaryEnd])

  const displayedExpenses = useMemo(() => {
    return dateFilteredExpenses
      .filter(e => {
        if (!expSearchQuery.trim()) return true
        const q = expSearchQuery.toLowerCase().trim()
        return (
          e.description.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          (e.vendor && e.vendor.toLowerCase().includes(q))
        )
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [dateFilteredExpenses, expSearchQuery])

  // Handlers for Expenses
  const handleAddExpense = () => {
    setEditingExpense(null)
    setShowExpenseModal(true)
  }

  const handleEditExpense = (expense: AccountEntry) => {
    setEditingExpense(expense)
    setExpMenuOpenId(null)
    setShowExpenseModal(true)
  }

  const handleExpenseSaved = async (data: Omit<AccountEntry, 'id'>) => {
    setSaving(true)
    const result = editingExpense
      ? await updateExpense(editingExpense.id, data)
      : await createExpense(data)
    setSaving(false)

    if ('error' in result) {
      setToast({ message: result.error, type: 'error' })
      return
    }

    setShowExpenseModal(false)
    setEditingExpense(null)
    setToast({
      message: editingExpense ? 'Expense updated successfully' : 'Expense recorded successfully',
      type: 'success',
    })
    router.refresh()
  }

  const handleConfirmDeleteExpense = async () => {
    if (!deletingExpenseId) return
    const result = await deleteExpense(deletingExpenseId)

    if ('error' in result) {
      setToast({ message: result.error, type: 'error' })
      return
    }

    setDeletingExpenseId(null)
    setToast({ message: 'Expense deleted successfully', type: 'success' })
    router.refresh()
  }

  const handleCategoryCreated = async (name: string) => {
    const result = await createCustomCategory(name)
    if ('error' in result) {
      setToast({ message: result.error, type: 'error' })
      return { success: false, error: result.error }
    }

    // Optimistically add to local list so modal sees it immediately
    setCreatedCategories(prev => [...prev, name])
    return { success: true }
  }

  const formatMethod = (method?: string) => {
    if (!method) return <span className="text-so-muted text-xs">—</span>
    switch (method.toLowerCase()) {
      case 'upi': return <span className="px-2 py-0.5 rounded-full border border-so-accent/20 bg-so-accent-subtle text-so-accent text-[10px] font-bold uppercase tracking-wider">UPI</span>
      case 'card': return <span className="px-2 py-0.5 rounded-full border border-so-purple/20 bg-so-purple/10 text-so-purple text-[10px] font-bold uppercase tracking-wider">Card</span>
      case 'cash': return <span className="px-2 py-0.5 rounded-full border border-so-emerald/20 bg-so-emerald-subtle text-so-emerald text-[10px] font-bold uppercase tracking-wider">Cash</span>
      default: return <span className="px-2 py-0.5 rounded-full border border-so-border bg-so-surface text-so-muted text-[10px] font-bold uppercase tracking-wider">{method}</span>
    }
  }

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toast && (
        <div
          role={toast.type === 'error' ? 'alert' : 'status'}
          className="fixed bottom-6 right-6 z-[60] bg-so-text text-so-accent-text px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm"
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-so-emerald" strokeWidth={1.75} />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-so-red" strokeWidth={1.75} />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-so-text flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-so-accent shrink-0" strokeWidth={1.75} />
          Accounts
        </h1>
        <p className="text-so-muted text-sm mt-1">Track income and expenses</p>
      </div>

      <div className="flex bg-so-surface border border-so-border rounded-xl p-1 w-fit mb-6 shadow-sm" role="group" aria-label="Accounts segment">
        {([{ key: 'income', label: 'Income' }, { key: 'expense', label: 'Expenses' }] as const).map(segment => (
          <button key={segment.key} type="button" aria-pressed={activeTab === segment.key} onClick={() => setActiveTab(segment.key)}
            className={'px-6 py-2 rounded-lg text-sm font-semibold transition-all ' + (activeTab === segment.key
              ? 'bg-so-card text-so-text shadow-sm border border-so-border' : 'text-so-muted hover:text-so-text')}>
            {segment.label}
          </button>
        ))}
      </div>

      <AccountsSummary segment={activeTab} expenses={activeTab === 'expense' ? dateFilteredExpenses : []} sales={summarySales} />

      {/* Tab Content: Expenses */}
      {activeTab === 'expense' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full md:w-56 xl:w-64">
              <Search className="w-4 h-4 text-so-muted absolute left-3 top-1/2 -translate-y-1/2 shrink-0" strokeWidth={1.75} />
              <input
                type="text"
                aria-label="Search expenses"
                placeholder="Search expenses..."
                value={expSearchQuery}
                onChange={(e) => setExpSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-so-card border border-so-border rounded-lg text-sm focus:outline-none focus:border-so-accent shadow-sm"
              />
            </div>
            <PeriodNavigation period={expensePeriod} modes={PERIOD_MODES} filtersLabel="Expenses date filter"
              onNavigate={(mode, anchor) => selectPeriod('expense', mode, anchor)} />
            <button
              type="button"
              onClick={handleAddExpense}
              className="ml-auto shrink-0 flex items-center justify-center gap-2 bg-so-accent text-so-accent-text px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4 shrink-0" strokeWidth={1.75} /> Add Expense
            </button>
          </div>

          <div className="bg-so-card border border-so-border rounded-xl shadow-sm overflow-hidden min-h-[400px]">
            {displayedExpenses.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <TrendingDown className="w-10 h-10 text-so-muted/40 mb-3" />
                <p className="text-so-text font-medium">
                  {expSearchQuery.trim() ? 'No expenses match your search' : 'No expenses found'}
                </p>
                <p className="text-so-muted text-sm mt-1 mb-4">
                  {expSearchQuery.trim()
                    ? `No results found for "${expSearchQuery}"`
                    : 'Adjust filters or add a new record'}
                </p>
                {!expSearchQuery.trim() && (
                  <button
                    onClick={handleAddExpense}
                    className="flex items-center gap-2 bg-so-accent text-so-accent-text px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
                  >
                    <Plus className="w-4 h-4 shrink-0" strokeWidth={1.75} /> Add Expense
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-so-surface border-b border-so-border">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">Expense Name</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">Date</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">Category</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">Amount</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">Mode</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-so-border">
                    {displayedExpenses.map(e => (
                      deletingExpenseId === e.id ? (
                        <tr key={e.id} className="bg-so-red-subtle border-b border-so-red/20">
                          <td colSpan={6} className="px-5 py-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-so-red">Delete this expense?</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={handleConfirmDeleteExpense}
                                  className="bg-so-red text-so-accent-text text-sm rounded px-3 py-1 font-semibold hover:opacity-90"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setDeletingExpenseId(null)}
                                  className="text-so-muted text-sm hover:text-so-text px-2 py-1"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={e.id} className="hover:bg-so-surface/40 transition-colors">
                          <td className="px-5 py-3 font-medium text-so-text truncate max-w-[220px]" title={e.description}>
                            {e.description}
                          </td>
                          <td className="px-5 py-3 text-so-text whitespace-nowrap">
                            {formatDate(e.date)}
                          </td>
                          <td className="px-5 py-3">
                            <span className="px-2.5 py-1 bg-so-surface border border-so-border text-so-muted rounded-md text-[11px] font-medium uppercase tracking-wider">
                              {e.category}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-bold text-so-red whitespace-nowrap">
                            {formatCurrency(e.amount)}
                          </td>
                          <td className="px-5 py-3">
                            {formatMethod(e.paymentMethod)}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="relative inline-flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleEditExpense(e)}
                                className="p-1.5 rounded-md text-so-muted hover:text-so-accent hover:bg-so-surface transition-colors cursor-pointer"
                                title="Edit" aria-label="Edit expense"
                              >
                                <Pencil className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                              </button>
                              <button
                                onClick={() => setExpMenuOpenId(id => (id === e.id ? null : e.id))}
                                className="p-1.5 rounded-md text-so-muted hover:text-so-text hover:bg-so-surface transition-colors cursor-pointer"
                                title="More options" aria-label="More expense options"
                              >
                                <MoreVertical className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                              </button>
                              {expMenuOpenId === e.id && (
                                <div className="absolute right-0 top-full mt-1 w-32 bg-so-card border border-so-border rounded-lg shadow-lg z-20 py-1 text-left">
                                  <button
                                    onClick={() => {
                                      setViewingExpense(e)
                                      setExpMenuOpenId(null)
                                    }}
                                    className="w-full text-left px-4 py-2 text-xs font-medium text-so-text hover:bg-so-surface"
                                  >
                                    Details
                                  </button>
                                  <div className="border-t border-so-border my-1" />
                                  <button
                                    onClick={() => {
                                      setDeletingExpenseId(e.id)
                                      setExpMenuOpenId(null)
                                    }}
                                    className="w-full text-left px-4 py-2 text-xs font-medium text-so-red hover:bg-so-red-subtle"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Keep tab controllers mounted so searches and selection survive refreshes. */}
      <div hidden={activeTab !== 'income'}>
        <div ref={incomeTabsRef} role="tablist" aria-label="Income type" className="flex items-center gap-2 border-b border-so-border mb-6">
          {([{ key: 'inventory', label: 'Inventory Sales' }, { key: 'quick', label: 'Quick Sales' }] as const).map((tab, index, tabs) => (
            <button key={tab.key} type="button" role="tab" id={'income-tab-' + tab.key} aria-controls={'income-panel-' + tab.key}
              aria-selected={incomeTab === tab.key} tabIndex={incomeTab === tab.key ? 0 : -1} onClick={() => setIncomeTab(tab.key)}
              onKeyDown={event => {
                const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length
                  : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length
                  : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null
                if (next === null) return
                event.preventDefault()
                setIncomeTab(tabs[next].key)
                incomeTabsRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
              }}
              className={'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ' + (incomeTab === tab.key
                ? 'border-so-accent text-so-accent' : 'border-transparent text-so-muted hover:text-so-text')}>
              {tab.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" id="income-panel-inventory" aria-labelledby="income-tab-inventory" hidden={incomeTab !== 'inventory'}>
          <InventorySalesTab sales={initialSales} inventoryItems={initialInventoryItems} period={inventoryPeriod}
            onNavigate={(mode, anchor) => selectPeriod('inventory', mode, anchor)} onNotify={setToast} />
        </div>
        <div role="tabpanel" id="income-panel-quick" aria-labelledby="income-tab-quick" hidden={incomeTab !== 'quick'}>
          <QuickSalesTab sales={initialSales} period={quickPeriod}
            onNavigate={(mode, anchor) => selectPeriod('quick', mode, anchor)} onNotify={setToast} />
        </div>
      </div>

      {/* Modals */}
      {showExpenseModal && (
        <ExpenseModal
          entry={editingExpense}
          customCategories={localCustomCategories}
          onAddCategory={handleCategoryCreated}
          onClose={() => {
            setShowExpenseModal(false)
            setEditingExpense(null)
          }}
          onSave={handleExpenseSaved}
          isSaving={saving}
        />
      )}

      {viewingExpense && (
        <ExpenseDetailsModal
          expense={viewingExpense}
          onClose={() => setViewingExpense(null)}
        />
      )}

    </div>
  )
}
