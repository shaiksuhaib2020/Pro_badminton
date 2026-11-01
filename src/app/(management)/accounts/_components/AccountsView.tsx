'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { AccountEntry, SaleEntry, InventoryItem } from '@/lib/mock-data'
import {
  format, parseISO, isWithinInterval,
  startOfMonth, endOfMonth, subMonths,
  startOfDay, endOfDay,
} from 'date-fns'
import {
  TrendingDown, TrendingUp, Wallet, Plus, Trash2, Pencil,
  SlidersHorizontal, X, Search, BookOpen, MoreVertical,
  CheckCircle2, AlertCircle,
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import ExpenseModal from '@/components/accounts/ExpenseModal'
import ExpenseDetailsModal from '@/components/accounts/ExpenseDetailsModal'
import SaleModal from '@/components/accounts/SaleModal'
import SaleDetailsModal from '@/components/accounts/SaleDetailsModal'
import {
  createExpense, updateExpense, deleteExpense, createCustomCategory,
  createSale, updateSale, deleteSale,
} from '../actions'

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

  type FilterRange = 'currentMonth' | 'lastMonth' | 'custom'
  const [filterRange, setFilterRange] = useState<FilterRange>('currentMonth')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [showFilter, setShowFilter] = useState(false)

  const [expSearchQuery, setExpSearchQuery] = useState('')
  const [saleSearchQuery, setSaleSearchQuery] = useState('')

  // Expense UI interaction states
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<AccountEntry | null>(null)
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null)
  const [viewingExpense, setViewingExpense] = useState<AccountEntry | null>(null)
  const [expMenuOpenId, setExpMenuOpenId] = useState<string | null>(null)

  // Sale UI interaction states
  const [showSaleModal, setShowSaleModal] = useState(false)
  const [editingSale, setEditingSale] = useState<SaleEntry | null>(null)
  const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null)
  const [viewingSale, setViewingSale] = useState<SaleEntry | null>(null)
  const [saleMenuOpenId, setSaleMenuOpenId] = useState<string | null>(null)

  // Local categories with optimistic updates
  const [localCustomCategories, setLocalCustomCategories] = useState<string[]>(initialCustomCategories)

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [saving, setSaving] = useState(false)

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  // Sync prop changes for categories if server refetches
  useEffect(() => {
    setLocalCustomCategories(initialCustomCategories)
  }, [initialCustomCategories])

  // Date range interval
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

  const inRange = (dateStr: string) => {
    try {
      return isWithinInterval(parseISO(dateStr), range)
    } catch {
      return false
    }
  }

  // 1. Date-filtered data (used for KPI calculations)
  const dateFilteredExpenses = useMemo(() => {
    return initialExpenses.filter(e => inRange(e.date))
  }, [initialExpenses, range])

  const dateFilteredSales = useMemo(() => {
    return initialSales.filter(s => inRange(s.date))
  }, [initialSales, range])

  // 2. Summary Metrics (KPIs depend strictly on the date range, NOT on search query)
  const totalExpenses = useMemo(() => {
    return dateFilteredExpenses.reduce((s, e) => s + e.amount, 0)
  }, [dateFilteredExpenses])

  const totalSales = useMemo(() => {
    return dateFilteredSales.reduce((s, e) => s + e.amount, 0)
  }, [dateFilteredSales])

  const totalIncome = totalSales
  const netBalance = totalIncome - totalExpenses

  // 3. Displayed transaction lists (Filtered by Date Range AND Search Query)
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

  const displayedSales = useMemo(() => {
    return dateFilteredSales
      .filter(s => {
        if (!saleSearchQuery.trim()) return true
        const q = saleSearchQuery.toLowerCase().trim()
        return (
          s.itemName.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          (s.notes && s.notes.toLowerCase().includes(q))
        )
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [dateFilteredSales, saleSearchQuery])

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
    setLocalCustomCategories(prev => [...prev, name].sort())
    return { success: true }
  }

  // Handlers for Sales
  const handleAddSale = () => {
    setEditingSale(null)
    setShowSaleModal(true)
  }

  const handleEditSale = (sale: SaleEntry) => {
    setEditingSale(sale)
    setSaleMenuOpenId(null)
    setShowSaleModal(true)
  }

  const handleSaleSaved = async (data: Omit<SaleEntry, 'id'>) => {
    setSaving(true)
    const result = editingSale
      ? await updateSale(editingSale.id, data, editingSale.saleType)
      : await createSale(data)
    setSaving(false)

    if ('error' in result) {
      setToast({ message: result.error, type: 'error' })
      return
    }

    setShowSaleModal(false)
    setEditingSale(null)
    setToast({
      message: editingSale ? 'Sale updated successfully' : 'Sale recorded successfully',
      type: 'success',
    })
    router.refresh()
  }

  const handleConfirmDeleteSale = async () => {
    if (!deletingSaleId) return
    const sale = initialSales.find(s => s.id === deletingSaleId)
    if (!sale) return

    const result = await deleteSale(deletingSaleId, sale.saleType)
    if ('error' in result) {
      setToast({ message: result.error, type: 'error' })
      return
    }

    setDeletingSaleId(null)
    setToast({ message: 'Sale deleted successfully', type: 'success' })
    router.refresh()
  }

  const formatMethod = (method?: string) => {
    if (!method) return <span className="text-so-muted text-xs">—</span>
    switch (method.toLowerCase()) {
      case 'upi': return <span className="px-2 py-0.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider">UPI</span>
      case 'card': return <span className="px-2 py-0.5 rounded-full border border-purple-200 bg-purple-50 text-purple-700 text-[10px] font-bold uppercase tracking-wider">Card</span>
      case 'cash': return <span className="px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">Cash</span>
      default: return <span className="px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-gray-700 text-[10px] font-bold uppercase tracking-wider">{method}</span>
    }
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm border animate-in fade-in slide-in-from-bottom-2 ${toast.type === 'success'
              ? 'bg-white text-emerald-800 border-emerald-200'
              : 'bg-white text-red-800 border-red-200'
            }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header & Date Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-so-text flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-so-accent" />
            Accounts
          </h1>
          <p className="text-so-muted text-sm mt-1">Track income and expenses</p>
        </div>

        {/* Date Range Navigation — positioned above KPI cards, aligned to right-hand corner */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
          {(['currentMonth', 'lastMonth', 'custom'] as const).map(f => (
            <button
              key={f}
              onClick={() => {
                setFilterRange(f)
                if (f === 'custom') {
                  setShowFilter(true)
                }
              }}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap ${filterRange === f
                  ? 'bg-so-surface border border-so-border text-so-text shadow-sm'
                  : 'text-so-muted border border-transparent hover:bg-so-surface/50'
                }`}
            >
              {f === 'currentMonth' ? 'Current Month' : f === 'lastMonth' ? 'Last Month' : 'Custom'}
            </button>
          ))}
          {filterRange === 'custom' && (
            <button
              onClick={() => setShowFilter(true)}
              className="px-3 py-2 text-so-muted hover:text-so-text hover:bg-so-surface rounded-full transition-colors ml-1"
              title="Open custom date range filter"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-so-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 text-so-muted mb-2">
            <TrendingDown className="w-5 h-5 text-red-500" />
            <h3 className="text-sm font-medium">Total Expenses</h3>
          </div>
          <p className="text-2xl font-bold text-so-text">₹ {totalExpenses.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white border border-so-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 text-so-muted mb-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm font-medium">Total Income</h3>
          </div>
          <p className="text-2xl font-bold text-so-text">₹ {totalIncome.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white border border-so-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 text-so-muted mb-2">
            <Wallet className={`w-5 h-5 ${netBalance >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
            <h3 className="text-sm font-medium">Net Balance</h3>
          </div>
          <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {netBalance >= 0 ? '+' : '-'} ₹ {Math.abs(netBalance).toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-so-border mb-6">
        <button
          onClick={() => setActiveTab('expense')}
          className={`pb-3 px-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'expense'
              ? 'border-so-accent text-so-accent'
              : 'border-transparent text-so-muted hover:text-so-text'
            }`}
        >
          Expenses
        </button>
        <button
          onClick={() => setActiveTab('income')}
          className={`pb-3 px-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'income'
              ? 'border-so-accent text-so-accent'
              : 'border-transparent text-so-muted hover:text-so-text'
            }`}
        >
          Sales / Income
        </button>
      </div>

      {/* Tab Content: Expenses */}
      {activeTab === 'expense' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-so-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search expenses..."
                value={expSearchQuery}
                onChange={(e) => setExpSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-so-border rounded-lg text-sm focus:outline-none focus:border-so-accent shadow-sm"
              />
            </div>
            <button
              onClick={handleAddExpense}
              className="flex items-center justify-center gap-2 bg-so-accent text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Add Expense
            </button>
          </div>

          <div className="bg-white border border-so-border rounded-xl shadow-sm overflow-hidden min-h-[400px]">
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
                    className="flex items-center gap-2 bg-so-accent text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Add Expense
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
                        <tr key={e.id} className="bg-red-50 border-b border-red-100">
                          <td colSpan={6} className="px-5 py-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-red-800">Delete this expense?</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={handleConfirmDeleteExpense}
                                  className="bg-so-red text-white text-sm rounded px-3 py-1 font-semibold hover:opacity-90"
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
                          <td className="px-5 py-3 font-bold text-red-600 whitespace-nowrap">
                            ₹ {e.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="px-5 py-3">
                            {formatMethod(e.paymentMethod)}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="relative inline-flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleEditExpense(e)}
                                className="p-1.5 rounded-md text-so-muted hover:text-so-accent hover:bg-so-surface transition-colors cursor-pointer"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setExpMenuOpenId(id => (id === e.id ? null : e.id))}
                                className="p-1.5 rounded-md text-so-muted hover:text-so-text hover:bg-so-surface transition-colors cursor-pointer"
                                title="More options"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              {expMenuOpenId === e.id && (
                                <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-so-border rounded-lg shadow-lg z-20 py-1 text-left">
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
                                    className="w-full text-left px-4 py-2 text-xs font-medium text-so-red hover:bg-red-50"
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

      {/* Tab Content: Sales */}
      {activeTab === 'income' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-so-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search sales..."
                value={saleSearchQuery}
                onChange={(e) => setSaleSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-so-border rounded-lg text-sm focus:outline-none focus:border-so-accent shadow-sm"
              />
            </div>
            <button
              onClick={handleAddSale}
              className="flex items-center justify-center gap-2 bg-so-accent hover:bg-so-accent-hover text-white px-4 py-2 rounded-lg text-sm font-semibold transition-opacity shadow-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Add Sale
            </button>
          </div>

          <div className="bg-white border border-so-border rounded-xl shadow-sm overflow-hidden min-h-[400px]">
            {displayedSales.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <TrendingUp className="w-10 h-10 text-so-muted/40 mb-3" />
                <p className="text-so-text font-medium">
                  {saleSearchQuery.trim() ? 'No sales match your search' : 'No sales recorded yet'}
                </p>
                <p className="text-so-muted text-sm mt-1 mb-4">
                  {saleSearchQuery.trim()
                    ? `No results found for "${saleSearchQuery}"`
                    : 'Record product sales or quick walk-in payments'}
                </p>
                {!saleSearchQuery.trim() && (
                  <button
                    onClick={handleAddSale}
                    className="flex items-center gap-2 bg-so-accent hover:bg-so-accent-hover text-white font-semibold rounded-lg px-4 py-2 text-sm transition-opacity shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Add Sale
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-so-surface border-b border-so-border">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">Date</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">Item Name</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">Category</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">Payment</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">Amount</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-so-border">
                    {displayedSales.map(sale => (
                      deletingSaleId === sale.id ? (
                        <tr key={sale.id} className="bg-red-50 border-b border-red-100">
                          <td colSpan={6} className="px-5 py-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-red-800">Delete this sale?</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={handleConfirmDeleteSale}
                                  className="bg-so-red text-white text-sm rounded px-3 py-1 font-semibold hover:opacity-90"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setDeletingSaleId(null)}
                                  className="text-so-muted text-sm hover:text-so-text px-2 py-1"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={sale.id} className="hover:bg-so-surface/40 transition-colors">
                          <td className="px-5 py-3 text-so-text whitespace-nowrap">
                            {formatDate(sale.date)}
                          </td>
                          <td className="px-5 py-3 font-medium text-so-text truncate max-w-[200px]" title={sale.itemName}>
                            {sale.itemName}
                          </td>
                          <td className="px-5 py-3">
                            {sale.category === 'Quick Sale' ? (
                              <span className="bg-so-surface text-so-muted text-xs rounded-full px-2 py-0.5 border border-so-border font-medium">
                                Quick Sale
                              </span>
                            ) : (
                              <span className="text-so-text text-sm">
                                {sale.category}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-so-muted capitalize">
                            {sale.paymentMethod}
                          </td>
                          <td className="px-5 py-3 text-so-text font-medium">
                            {formatCurrency(sale.amount)}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="relative inline-flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleEditSale(sale)}
                                className="p-1.5 rounded-md text-so-muted hover:text-so-accent hover:bg-so-surface transition-colors cursor-pointer"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setSaleMenuOpenId(id => (id === sale.id ? null : sale.id))}
                                className="p-1.5 rounded-md text-so-muted hover:text-so-text hover:bg-so-surface transition-colors cursor-pointer"
                                title="More options"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              {saleMenuOpenId === sale.id && (
                                <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-so-border rounded-lg shadow-lg z-20 py-1 text-left">
                                  <button
                                    onClick={() => { setViewingSale(sale); setSaleMenuOpenId(null); }}
                                    className="w-full text-left px-4 py-2 text-xs font-medium text-so-text hover:bg-so-surface"
                                  >
                                    Details
                                  </button>
                                  <div className="border-t border-so-border my-1" />
                                  <button
                                    onClick={() => { setDeletingSaleId(sale.id); setSaleMenuOpenId(null); }}
                                    className="w-full text-left px-4 py-2 text-xs font-medium text-so-red hover:bg-red-50"
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

      {/* Custom Date Range Filter Modal/Drawer */}
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
                  <input
                    type="date"
                    value={customFrom}
                    onChange={e => setCustomFrom(e.target.value)}
                    max={customTo || format(new Date(), 'yyyy-MM-dd')}
                    className="w-full bg-white border border-so-border rounded-md px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-so-muted uppercase tracking-wider mb-1.5">To</label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={e => setCustomTo(e.target.value)}
                    min={customFrom}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full bg-white border border-so-border rounded-md px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
                  />
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
              <button
                onClick={() => setShowFilter(false)}
                className="flex-1 py-2 bg-so-accent text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

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

      {showSaleModal && (
        <SaleModal
          existingSale={editingSale}
          inventoryItems={initialInventoryItems}
          onClose={() => {
            setShowSaleModal(false)
            setEditingSale(null)
          }}
          onSave={handleSaleSaved}
        />
      )}

      {viewingSale && (
        <SaleDetailsModal
          sale={viewingSale}
          onClose={() => setViewingSale(null)}
        />
      )}
    </div>
  )
}
