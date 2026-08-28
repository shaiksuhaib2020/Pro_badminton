'use client'

import { useState } from 'react'
import { mockStudents, mockSettings, Student, PaymentEntry } from '@/lib/mock-data'
import { isWithinInterval, parseISO, format, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from 'date-fns'
import { Search, SlidersHorizontal, X, Receipt, CheckCircle, RefreshCw, Wallet, Trash2 } from 'lucide-react'
import RenewModal from '@/components/coaching/RenewModal'

type TabType = 'recent' | 'paid' | 'pending' | 'partial'
type FilterRange = 'currentMonth' | 'lastMonth' | 'currentFY' | 'lastFY' | 'custom'

export default function TransactionsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('recent')
  const [search, setSearch] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [filterRange, setFilterRange] = useState<FilterRange>('currentMonth')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [pendingFilterRange, setPendingFilterRange] = useState<FilterRange>('currentMonth')
  const [renewTarget, setRenewTarget] = useState<Student | null>(null)
  const [collectRemainingTarget, setCollectRemainingTarget] = useState<Student | null>(null)
  const [voidConfirmId, setVoidConfirmId] = useState<string | null>(null)
  const [, forceUpdate] = useState(0)
  const refresh = () => forceUpdate(n => n + 1)

  const computeRange = (range: FilterRange, cFrom: string, cTo: string) => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()

    switch (range) {
      case 'currentMonth':
        return { start: startOfMonth(now), end: endOfMonth(now) }
      case 'lastMonth':
        const lm = subMonths(now, 1)
        return { start: startOfMonth(lm), end: endOfMonth(lm) }
      case 'currentFY': {
        const fyStart = month >= 3 ? year : year - 1
        return { start: new Date(fyStart, 3, 1), end: new Date(fyStart + 1, 2, 31, 23, 59, 59) }
      }
      case 'lastFY': {
        const fyStart = (month >= 3 ? year : year - 1) - 1
        return { start: new Date(fyStart, 3, 1), end: new Date(fyStart + 1, 2, 31, 23, 59, 59) }
      }
      case 'custom':
        if (!cFrom || !cTo) return { start: startOfMonth(now), end: endOfMonth(now) }
        return { start: startOfDay(parseISO(cFrom)), end: endOfDay(parseISO(cTo)) }
    }
  }
  const range = computeRange(filterRange, customFrom, customTo)

  const matchesSearch = (name: string, phone: string) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return name.toLowerCase().includes(q) || phone.includes(q)
  }

  const allTransactions = mockStudents
    .flatMap(s => s.paymentHistory.map(p => ({
      ...p,
      studentId: s.id,
      studentName: s.name,
      studentPhone: s.phone,
      studentStatus: s.status,
      studentCurrentBatch: s.currentBatch,
      studentFees: s.fees,
      studentNextDueDate: s.nextDueDate,
      membershipTypeId: s.membershipTypeId,
    })))
    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())



  const recentRows = allTransactions
    .filter(t => {
      try { return isWithinInterval(parseISO(t.date), range) } catch { return false }
    })
    .filter(t => matchesSearch(t.studentName, t.studentPhone))

  const paidRows = allTransactions
    .filter(t => {
      try { return isWithinInterval(parseISO(t.date), range) } catch { return false }
    })
    .filter(t => t.paymentType === 'full' || t.paymentType === 'advance')
    .filter(t => matchesSearch(t.studentName, t.studentPhone))

  const pendingRows = mockStudents
    .filter(s => s.status === 'expired' || s.status === 'due-soon')
    .filter(s => s.status !== 'off-court')
    .filter(s => matchesSearch(s.name, s.phone))
    .sort((a, b) => parseISO(a.nextDueDate).getTime() - parseISO(b.nextDueDate).getTime())

  const partialRows = mockStudents
    .filter(s => s.pendingAmount > 0)
    .filter(s => s.status !== 'off-court')
    .filter(s => matchesSearch(s.name, s.phone))

  const handleVoid = (entryId: string, studentId: string) => {
    const student = mockStudents.find(s => s.id === studentId)
    if (!student) return
    const entry = student.paymentHistory.find(p => p.id === entryId)
    if (!entry) return
    entry.status = 'deleted'
    setVoidConfirmId(null)
    refresh()
  }

  const formatDateLabel = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd MMM yyyy')
    } catch {
      return dateStr
    }
  }

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-so-text">Fee Transactions</h1>
        <p className="text-sm text-so-muted mt-1">Manage and track all student payments</p>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-so-muted" />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white border border-so-border rounded-lg pl-9 pr-4 py-2 text-sm text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-accent"
          />
        </div>
        <button
          onClick={() => setShowFilter(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-so-border rounded-lg text-sm text-so-muted hover:border-so-accent hover:text-so-text transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filter
          {filterRange !== 'currentMonth' && (
            <span className="w-1.5 h-1.5 rounded-full bg-so-accent" />
          )}
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-2 border-b border-so-border mb-6">
        {(['recent', 'paid', 'pending', 'partial'] as TabType[]).map(tab => {
          const labels = { recent: 'Recent', paid: 'Paid', pending: 'Pending', partial: 'Partially Paid' }
          return (
            <button key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-so-accent text-so-accent'
                  : 'border-transparent text-so-muted hover:text-so-text'
              }`}
            >
              {labels[tab]}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-so-card border border-so-border rounded-xl shadow-sm overflow-hidden min-h-[400px]">
        {activeTab === 'recent' && (
          <div>
            {recentRows.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <Receipt className="w-12 h-12 text-so-muted mb-4" strokeWidth={1.5} />
                <p className="text-so-text font-semibold">No transactions in this period</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-so-surface border-b border-so-border">
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Name</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Phone</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Date</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Amount</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Type</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Method</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-so-border">
                    {recentRows.map(t => (
                      <tr key={t.id} className="bg-so-card hover:bg-so-surface/60 border-b border-so-border transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-so-text font-medium">{t.studentName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-so-muted">{t.studentPhone}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-so-text">{formatDateLabel(t.date)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`font-semibold ${t.status === 'deleted' ? 'text-so-muted line-through' : 'text-so-emerald'}`}>
                            ₹ {t.amount.toLocaleString('en-IN')}
                          </div>
                          {t.paymentType === 'partial' && t.remainingAmount > 0 && t.status !== 'deleted' && (
                            <div className="text-amber-600 text-xs mt-0.5">{t.remainingAmount.toLocaleString('en-IN')} remaining</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {t.paymentType === 'full' && <span className="text-xs font-medium text-so-emerald">Full</span>}
                          {t.paymentType === 'partial' && <span className="text-xs font-medium text-amber-500">Partial</span>}
                          {t.paymentType === 'advance' && <span className="text-xs font-medium text-blue-600">Advance</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-so-muted capitalize">{t.paymentMethod}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {t.status === 'active' && <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-so-emerald-subtle text-so-emerald">Active</span>}
                          {t.status === 'inactive' && <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-so-surface text-so-muted">Inactive</span>}
                          {t.status === 'deleted' && <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-so-red-subtle text-so-red">Voided</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'paid' && (
          <div>
            <div className="px-6 py-3 border-b border-so-border bg-so-surface flex items-center gap-4 text-sm text-so-muted">
              <span>{paidRows.filter(t => t.status !== 'deleted').length} transactions</span>
              <span>•</span>
              <span className="text-so-emerald font-medium">
                ₹ {paidRows.filter(t => t.status !== 'deleted').reduce((s, t) => s + t.amount, 0).toLocaleString('en-IN')} collected
              </span>
              <span>•</span>
              <span className="text-so-red">
                {paidRows.filter(t => t.status === 'deleted').length} voided
              </span>
            </div>
            {paidRows.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <CheckCircle className="w-12 h-12 text-so-muted mb-4" strokeWidth={1.5} />
                <p className="text-so-text font-semibold">No paid transactions in this period</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-so-surface border-b border-so-border">
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Name</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Phone</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Date</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Amount</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Mode</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Status</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-so-border">
                    {paidRows.map(t => (
                      <tr key={t.id} className="bg-so-card hover:bg-so-surface/60 border-b border-so-border transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-so-text font-medium">{t.studentName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-so-muted">{t.studentPhone}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-so-text">{formatDateLabel(t.date)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`font-semibold ${t.status === 'deleted' ? 'text-so-muted line-through' : 'text-so-emerald'}`}>
                            ₹ {t.amount.toLocaleString('en-IN')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-so-muted capitalize">{t.paymentMethod}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {t.status === 'active' && <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-so-emerald-subtle text-so-emerald">Active</span>}
                          {t.status === 'inactive' && <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-so-surface text-so-muted">Inactive</span>}
                          {t.status === 'deleted' && <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-so-red-subtle text-so-red">Voided</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {t.status !== 'deleted' ? (
                            voidConfirmId === t.id ? (
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-xs text-so-muted">Void this?</span>
                                <button onClick={() => handleVoid(t.id, t.studentId)}
                                  className="text-xs px-2 py-1 bg-so-red text-white rounded-md hover:bg-red-600 transition-colors">Yes</button>
                                <button onClick={() => setVoidConfirmId(null)}
                                  className="text-xs px-2 py-1 border border-so-border rounded-md text-so-muted hover:text-so-text transition-colors">No</button>
                              </div>
                            ) : (
                              <button onClick={() => setVoidConfirmId(t.id)}
                                className="p-1.5 inline-flex rounded-md text-so-muted hover:text-so-red hover:bg-so-surface transition-colors" title="Void Payment">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )
                          ) : (
                            <span className="text-xs text-so-red italic">Voided</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'pending' && (
          <div>
            <div className="px-6 py-3 border-b border-so-border bg-so-surface">
              <span className="text-sm text-so-muted">Showing all students with pending or overdue payments</span>
            </div>
            {pendingRows.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <CheckCircle className="w-12 h-12 text-so-emerald mb-4" strokeWidth={1.5} />
                <p className="text-so-text font-semibold">No pending payments — all students are up to date</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-so-surface border-b border-so-border">
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Name</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Phone</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Due Date</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Amount</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-so-border">
                    {pendingRows.map(s => (
                      <tr key={s.id} className="bg-so-card hover:bg-so-surface/60 border-b border-so-border transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-so-text font-medium">{s.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-so-muted">{s.phone}</td>
                        <td className={`px-6 py-4 whitespace-nowrap font-medium ${s.status === 'expired' ? 'text-so-red' : 'text-so-yellow'}`}>
                          {formatDateLabel(s.nextDueDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-so-emerald font-semibold">
                          ₹ {s.fees.toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end">
                            <button
                              onClick={() => setRenewTarget(s)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-so-accent text-white rounded-md text-xs font-medium hover:opacity-90 transition-opacity"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Collect Payment
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'partial' && (
          <div>
            {partialRows.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <CheckCircle className="w-12 h-12 text-so-emerald mb-4" strokeWidth={1.5} />
                <p className="text-so-text font-semibold">No partial payments outstanding</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-so-surface border-b border-so-border">
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Name</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Phone</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Date</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Paid</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Remaining</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Mode</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-so-border">
                    {partialRows.map(s => {
                      const latestPartial = s.paymentHistory
                        .filter(p => p.paymentType === 'partial' && p.status !== 'deleted')
                        .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())[0]

                      return (
                        <tr key={s.id} className="bg-so-card hover:bg-so-surface/60 border-b border-so-border transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-so-text font-medium">{s.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-so-muted">{s.phone}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-so-text">
                            {latestPartial ? formatDateLabel(latestPartial.date) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-so-emerald font-semibold">
                            {latestPartial ? `₹ ${latestPartial.amount.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-amber-600 font-semibold">
                            ₹ {s.pendingAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-so-muted capitalize">
                            {latestPartial?.paymentMethod || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex justify-end">
                              <button
                                onClick={() => setCollectRemainingTarget(s)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 border border-amber-500/30 rounded-md text-xs font-medium hover:bg-amber-500/30 transition-colors"
                              >
                                <Wallet className="w-3 h-3" />
                                Collect Remaining
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter Overlay */}
      {showFilter && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilter(false)} />
          <div className="relative w-80 h-full bg-so-card border-l border-so-border flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-so-border">
              <span className="font-semibold text-so-text">Filters</span>
              <button onClick={() => setShowFilter(false)} className="p-1 hover:bg-so-surface rounded">
                <X className="w-4 h-4 text-so-muted" />
              </button>
            </div>

            <div className="p-4 flex-1">
              <p className="text-xs text-so-muted uppercase tracking-wider mb-3">Date Range</p>
              {[
                { value: 'currentMonth', label: 'Current Month' },
                { value: 'lastMonth', label: 'Last Month' },
                { value: 'currentFY', label: 'Current Financial Year' },
                { value: 'lastFY', label: 'Last Financial Year' },
                { value: 'custom', label: 'Custom Date Range' },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-3 py-2 cursor-pointer group">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                    filterRange === opt.value ? 'border-so-accent' : 'border-so-border'
                  }`}>
                    {filterRange === opt.value && (
                      <div className="w-2 h-2 rounded-full bg-so-accent" />
                    )}
                  </div>
                  <span className={`text-sm transition-colors ${filterRange === opt.value ? 'text-so-text' : 'text-so-muted group-hover:text-so-text'}`}>
                    {opt.label}
                  </span>
                  <input
                    type="radio"
                    className="sr-only"
                    checked={filterRange === opt.value}
                    onChange={() => setFilterRange(opt.value as FilterRange)}
                  />
                </label>
              ))}

              {filterRange === 'custom' && (
                <div className="mt-3 space-y-2">
                  <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                    max={customTo || format(new Date(), 'yyyy-MM-dd')}
                    className="w-full bg-white border border-so-border rounded-md px-3 py-1.5 text-sm text-so-text" />
                  <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                    min={customFrom} max={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full bg-white border border-so-border rounded-md px-3 py-1.5 text-sm text-so-text" />
                </div>
              )}
            </div>

            <div className="p-4 border-t border-so-border flex gap-3">
              <button onClick={() => { setFilterRange('currentMonth'); setCustomFrom(''); setCustomTo('') }}
                className="flex-1 py-2 border border-so-border rounded-lg text-sm text-so-muted hover:text-so-text transition-colors">
                Clear
              </button>
              <button onClick={() => setShowFilter(false)}
                className="flex-1 py-2 bg-so-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                Apply Filter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {(renewTarget || collectRemainingTarget) && (
        <RenewModal
          student={(renewTarget || collectRemainingTarget)!}
          isCollectingRemaining={!!collectRemainingTarget}
          onClose={() => { setRenewTarget(null); setCollectRemainingTarget(null) }}
          onConfirm={(entry, newDueDate, newMembershipStartDate, newPendingAmount, newBatch) => {
            const student = mockStudents.find(s => s.id === (renewTarget || collectRemainingTarget)!.id)
            if (!student) return
            student.paymentHistory.push(entry)
            student.nextDueDate = newDueDate
            student.membershipStartDate = newMembershipStartDate
            student.pendingAmount = newPendingAmount
            student.currentBatch = newBatch
            student.status = newPendingAmount > 0 ? 'due-soon' : 'active'
            setRenewTarget(null)
            setCollectRemainingTarget(null)
            refresh()
          }}
        />
      )}
    </div>
  )
}
