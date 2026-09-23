'use client'

import { useState, useMemo } from 'react'
import {
  mockExpenses, mockIncomeEntries,
  mockCustomExpenseCategories, mockCustomInventoryCategories,
  EXPENSE_CATEGORIES, INCOME_CATEGORIES,
  AccountEntry,
} from '@/lib/mock-data'
import {
  format, parseISO, isWithinInterval,
  startOfMonth, endOfMonth, subMonths,
  startOfDay, endOfDay,
} from 'date-fns'
import {
  TrendingDown, TrendingUp, Wallet, Plus, Trash2, Pencil,
  SlidersHorizontal, X, Search, BookOpen
} from 'lucide-react'
import AccountEntryModal from '@/components/accounts/AccountEntryModal'

export default function AccountsPage() {
  const [accountTab, setAccountTab] = useState<'expenses' | 'income'>('expenses')

  type FilterRange = 'currentMonth' | 'lastMonth' | 'custom'
  const [filterRange, setFilterRange] = useState<FilterRange>('currentMonth')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [showFilter, setShowFilter] = useState(false)

  const [expSearchQuery, setExpSearchQuery] = useState('')
  const [incSearchQuery, setIncSearchQuery] = useState('')

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal]   = useState(false);
  const [editingEntry,    setEditingEntry]      = useState<AccountEntry | null>(null);
  const [editingType,     setEditingType]       = useState<'expense' | 'income'>('expense');

  const [deleteExpId, setDeleteExpId] = useState<string | null>(null)
  const [deleteIncId, setDeleteIncId] = useState<string | null>(null)

  const [, forceUpdate] = useState(0)
  const refresh = () => forceUpdate(n => n + 1)

  const range = useMemo(() => {
    const now = new Date()
    if (filterRange === 'lastMonth') {
      const lm = subMonths(now, 1)
      return { start: startOfMonth(lm), end: endOfMonth(lm) }
    }
    if (filterRange === 'custom' && customFrom && customTo) {
      return { start: startOfDay(parseISO(customFrom)), end: endOfDay(parseISO(customTo)) }
    }
    return { start: startOfMonth(now), end: endOfMonth(now) }
  }, [filterRange, customFrom, customTo])

  const inRange = (e: AccountEntry) => {
    try { return isWithinInterval(parseISO(e.date), range) } catch { return false }
  }

  const filteredExpenses = mockExpenses.filter(inRange)
    .filter(e => {
      if (!expSearchQuery.trim()) return true
      const q = expSearchQuery.toLowerCase()
      return e.description.toLowerCase().includes(q) || e.category.toLowerCase().includes(q)
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    
  const filteredIncome = mockIncomeEntries.filter(inRange)
    .filter(e => {
      if (!incSearchQuery.trim()) return true
      const q = incSearchQuery.toLowerCase()
      return e.description.toLowerCase().includes(q) || e.category.toLowerCase().includes(q)
    })
    .sort((a, b) => b.date.localeCompare(a.date))

  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0)
  const totalIncome   = filteredIncome.reduce((s, e) => s + e.amount, 0)
  const netBalance    = totalIncome - totalExpenses

  const handleDeleteExpense = (id: string) => {
    const idx = mockExpenses.findIndex(i => i.id === id)
    if (idx !== -1) mockExpenses.splice(idx, 1)
    setDeleteExpId(null)
    refresh()
  }

  const handleDeleteIncome = (id: string) => {
    const idx = mockIncomeEntries.findIndex(i => i.id === id)
    if (idx !== -1) mockIncomeEntries.splice(idx, 1)
    setDeleteIncId(null)
    refresh()
  }

  const formatMethod = (method: string) => {
    switch (method) {
      case 'upi': return <span className="px-2 py-0.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider">UPI</span>
      case 'card': return <span className="px-2 py-0.5 rounded-full border border-purple-200 bg-purple-50 text-purple-700 text-[10px] font-bold uppercase tracking-wider">Card</span>
      default: return <span className="px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-gray-700 text-[10px] font-bold uppercase tracking-wider">{method}</span>
    }
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-so-text flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-so-accent" />
            Accounts
          </h1>
          <p className="text-so-muted text-sm mt-1">Track income and expenses</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-so-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 text-so-muted mb-2">
            <TrendingDown className="w-5 h-5 text-red-500" />
            <h3 className="text-sm font-medium">Total Expenses</h3>
          </div>
          <p className="text-2xl font-bold text-so-text">₹ {totalExpenses.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-so-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 text-so-muted mb-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm font-medium">Total Income</h3>
          </div>
          <p className="text-2xl font-bold text-so-text">₹ {totalIncome.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-so-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 text-so-muted mb-2">
            <Wallet className={`w-5 h-5 ${netBalance >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
            <h3 className="text-sm font-medium">Net Balance</h3>
          </div>
          <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {netBalance >= 0 ? '+' : '-'} ₹ {Math.abs(netBalance).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto">
          {(['currentMonth', 'lastMonth', 'custom'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterRange(f)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap ${
                filterRange === f
                  ? 'bg-so-surface border border-so-border text-so-text shadow-sm'
                  : 'text-so-muted border border-transparent hover:bg-so-surface/50'
              }`}
            >
              {f === 'currentMonth' ? 'Current Month' : f === 'lastMonth' ? 'Last Month' : 'Custom'}
            </button>
          ))}
          {filterRange === 'custom' && (
            <button onClick={() => setShowFilter(true)} className="px-3 py-2 text-so-muted hover:text-so-text hover:bg-so-surface rounded-full transition-colors ml-1">
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-4 border-b border-so-border mb-6">
        <button onClick={() => setAccountTab('expenses')} className={`pb-3 px-2 text-sm font-semibold border-b-2 transition-colors ${accountTab === 'expenses' ? 'border-so-accent text-so-accent' : 'border-transparent text-so-muted hover:text-so-text'}`}>Expenses</button>
        <button onClick={() => setAccountTab('income')} className={`pb-3 px-2 text-sm font-semibold border-b-2 transition-colors ${accountTab === 'income' ? 'border-so-accent text-so-accent' : 'border-transparent text-so-muted hover:text-so-text'}`}>Income</button>
      </div>

      {accountTab === 'expenses' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-so-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="Search expenses..." value={expSearchQuery} onChange={(e) => setExpSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white border border-so-border rounded-lg text-sm focus:outline-none focus:border-so-accent shadow-sm" />
            </div>
            <button onClick={() => setShowExpenseModal(true)} className="flex items-center justify-center gap-2 bg-so-accent text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm whitespace-nowrap">
              <Plus className="w-4 h-4" /> Add Expense
            </button>
          </div>

          <div className="bg-white border border-so-border rounded-xl shadow-sm overflow-hidden min-h-[400px]">
            {filteredExpenses.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <TrendingDown className="w-10 h-10 text-so-muted/40 mb-3" />
                <p className="text-so-text font-medium">No expenses found</p>
                <p className="text-so-muted text-sm mt-1">Adjust filters or add a new record</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-so-surface border-b border-so-border">
                      <th className="text-left px-5 py-3 text-xs font-medium text-so-muted uppercase tracking-wider">Date</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-so-muted uppercase tracking-wider">Description</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-so-muted uppercase tracking-wider">Category</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-so-muted uppercase tracking-wider">Method</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-so-muted uppercase tracking-wider">Amount</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-so-muted uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-so-border">
                    {filteredExpenses.map(e => (
                      <tr key={e.id} className="hover:bg-so-surface/40 transition-colors">
                        <td className="px-5 py-3 text-so-text whitespace-nowrap">{format(parseISO(e.date), 'dd MMM yyyy')}</td>
                        <td className="px-5 py-3 font-medium text-so-text">{e.description}</td>
                        <td className="px-5 py-3"><span className="px-2.5 py-1 bg-so-surface border border-so-border text-so-muted rounded-md text-[11px] font-medium uppercase tracking-wider">{e.category}</span></td>
                        <td className="px-5 py-3">{formatMethod(e.paymentMethod)}</td>
                        <td className="px-5 py-3 font-bold text-red-600">₹ {e.amount.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right">
                          {deleteExpId === e.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xs text-so-muted">Delete?</span>
                              <button onClick={() => handleDeleteExpense(e.id)} className="text-xs px-2 py-1 bg-red-600 text-white rounded-md">Yes</button>
                              <button onClick={() => setDeleteExpId(null)} className="text-xs px-2 py-1 border border-so-border rounded-md text-so-muted">No</button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => { setEditingType('expense'); setEditingEntry(e) }} className="p-1.5 rounded-md text-so-muted hover:text-so-accent hover:bg-so-surface transition-colors cursor-pointer">
                                <Pencil className="w-[15px] h-[15px]" />
                              </button>
                              <button onClick={() => setDeleteExpId(e.id)} className="p-1.5 rounded-md text-so-muted hover:text-red-500 hover:bg-red-50 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {accountTab === 'income' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-so-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="Search income..." value={incSearchQuery} onChange={(e) => setIncSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white border border-so-border rounded-lg text-sm focus:outline-none focus:border-so-accent shadow-sm" />
            </div>
            <button onClick={() => setShowIncomeModal(true)} className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm whitespace-nowrap">
              <Plus className="w-4 h-4" /> Add Income
            </button>
          </div>

          <div className="bg-white border border-so-border rounded-xl shadow-sm overflow-hidden min-h-[400px]">
            {filteredIncome.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <TrendingUp className="w-10 h-10 text-so-muted/40 mb-3" />
                <p className="text-so-text font-medium">No income found</p>
                <p className="text-so-muted text-sm mt-1">Adjust filters or add a new record</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-so-surface border-b border-so-border">
                      <th className="text-left px-5 py-3 text-xs font-medium text-so-muted uppercase tracking-wider">Date</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-so-muted uppercase tracking-wider">Description</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-so-muted uppercase tracking-wider">Category</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-so-muted uppercase tracking-wider">Method</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-so-muted uppercase tracking-wider">Amount</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-so-muted uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-so-border">
                    {filteredIncome.map(e => (
                      <tr key={e.id} className="hover:bg-so-surface/40 transition-colors">
                        <td className="px-5 py-3 text-so-text whitespace-nowrap">{format(parseISO(e.date), 'dd MMM yyyy')}</td>
                        <td className="px-5 py-3 font-medium text-so-text">{e.description}</td>
                        <td className="px-5 py-3"><span className="px-2.5 py-1 bg-so-surface border border-so-border text-so-muted rounded-md text-[11px] font-medium uppercase tracking-wider">{e.category}</span></td>
                        <td className="px-5 py-3">{formatMethod(e.paymentMethod)}</td>
                        <td className="px-5 py-3 font-bold text-emerald-600">₹ {e.amount.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right">
                          {deleteIncId === e.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xs text-so-muted">Delete?</span>
                              <button onClick={() => handleDeleteIncome(e.id)} className="text-xs px-2 py-1 bg-red-600 text-white rounded-md">Yes</button>
                              <button onClick={() => setDeleteIncId(null)} className="text-xs px-2 py-1 border border-so-border rounded-md text-so-muted">No</button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => { setEditingType('income'); setEditingEntry(e) }} className="p-1.5 rounded-md text-so-muted hover:text-so-accent hover:bg-so-surface transition-colors cursor-pointer">
                                <Pencil className="w-[15px] h-[15px]" />
                              </button>
                              <button onClick={() => setDeleteIncId(e.id)} className="p-1.5 rounded-md text-so-muted hover:text-red-500 hover:bg-red-50 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {showFilter && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilter(false)} />
          <div className="relative w-72 h-full bg-so-card border-l border-so-border flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-4 border-b border-so-border">
              <span className="font-semibold text-so-text">Custom Date Range</span>
              <button onClick={() => setShowFilter(false)} className="p-1 hover:bg-so-surface rounded">
                <X className="w-4 h-4 text-so-muted" />
              </button>
            </div>
            
            <div className="p-4 flex-1">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-so-muted uppercase tracking-wider mb-1.5">From</label>
                  <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                    max={customTo || format(new Date(), 'yyyy-MM-dd')}
                    className="w-full bg-white border border-so-border rounded-md px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-so-muted uppercase tracking-wider mb-1.5">To</label>
                  <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                    min={customFrom} max={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full bg-white border border-so-border rounded-md px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent" />
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-so-border flex gap-3 bg-so-surface">
              <button
                onClick={() => { setCustomFrom(''); setCustomTo('') }}
                className="flex-1 py-2 bg-white border border-so-border rounded-lg text-sm font-medium text-so-text hover:bg-gray-50 transition-colors"
              >
                Clear
              </button>
              <button onClick={() => setShowFilter(false)}
                className="flex-1 py-2 bg-so-accent text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm">
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {showExpenseModal && (
        <AccountEntryModal
          type="expense"
          onClose={() => setShowExpenseModal(false)}
          onSave={(e) => { mockExpenses.push(e); setShowExpenseModal(false); refresh(); }}
        />
      )}
      
      {showIncomeModal && (
        <AccountEntryModal
          type="income"
          onClose={() => setShowIncomeModal(false)}
          onSave={(e) => { mockIncomeEntries.push(e); setShowIncomeModal(false); refresh(); }}
        />
      )}
      
      {editingEntry && (
        <AccountEntryModal
          type={editingType}
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSave={(updated) => {
            const arr = editingType === 'expense' ? mockExpenses : mockIncomeEntries;
            const idx = arr.findIndex(e => e.id === updated.id);
            if (idx !== -1) arr[idx] = updated;
            setEditingEntry(null);
            refresh();
          }}
        />
      )}
    </div>
  )
}
