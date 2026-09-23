'use client'

import { useState } from 'react'
import { mockStudents, mockSettings, Student, PaymentEntry, mockCourtMembers, mockCourtPlans, CourtMember, CourtPaymentEntry } from '@/lib/mock-data'
import { addMonths, addDays, isWithinInterval, parseISO, format, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from 'date-fns'
import { Search, SlidersHorizontal, X, Receipt, CheckCircle, RefreshCw, Wallet, Trash2, AlertCircle, Clock, CheckSquare, Check, CreditCard } from 'lucide-react'
import RenewModal from '@/components/coaching/RenewModal'
import CollectRemainingModal from '@/components/students/CollectRemainingModal'
import RenewCourtMemberModal from '@/components/court/RenewCourtMemberModal'

type TabType = 'recent' | 'paid' | 'pending' | 'partial'
type FilterRange = 'currentMonth' | 'lastMonth' | 'currentFY' | 'lastFY' | 'custom'

const getDaysLabel = (student: Student): string => {
  const today = new Date()
  const due = parseISO(student.nextDueDate)
  const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return `${Math.abs(diff)} day${Math.abs(diff) !== 1 ? 's' : ''} overdue`
  if (diff === 0) return 'Due today'
  return `${diff} day${diff !== 1 ? 's' : ''} remaining`
}

export default function TransactionsPage() {
  // Bulk collect  Pending tab only
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkMethod, setBulkMethod] = useState<'cash' | 'upi' | 'card' | 'other'>('cash')

  const handleBulkToggle = () => {
    setBulkMode(prev => {
      if (prev) setSelectedIds(new Set()) // clear on disable
      return !prev
    })
  }

  const handleBulkConfirm = () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const bulkStudents = pendingRows.filter(s => selectedIds.has(s.id))

    bulkStudents.forEach(student => {
      const mt = mockSettings.membershipTypes.find(m => m.id === student.membershipTypeId)

      // 1 period, chains from current nextDueDate
      const newMembershipStartDate = student.nextDueDate
      const newDueDate = mt?.durationType === 'months'
        ? format(addMonths(parseISO(student.nextDueDate), mt.duration), 'yyyy-MM-dd')
        : format(addDays(parseISO(student.nextDueDate), mt?.duration ?? 0), 'yyyy-MM-dd')

      const amt = student.pendingAmount > 0 ? student.pendingAmount : student.fees

      const entry: PaymentEntry = {
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
        date: today,
        amount: amt,
        remainingAmount: 0,
        paymentType: 'full',
        monthsCovered: mt?.duration ?? 1,
        paymentMethod: bulkMethod,
        status: 'active',
        note: 'Bulk payment'
      }

      student.paymentHistory.push(entry)
      student.nextDueDate = newDueDate
      student.membershipStartDate = newMembershipStartDate
      student.pendingAmount = 0
      student.status = 'active'
    })

    setShowBulkModal(false)
    setSelectedIds(new Set())
    setBulkMode(false)
    refresh()
  }

  const [activeTab, setActiveTab] = useState<TabType>('recent')
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    setSearch('')
  }
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

  
  // Court Segment State
  const [txSegment, setTxSegment] = useState<'coaching' | 'court'>('coaching')
  const [courtTxTab, setCourtTxTab] = useState<TabType>('recent')
  const [courtSearchQuery, setCourtSearchQuery] = useState('')
  const [courtFilterRange, setCourtFilterRange] = useState<FilterRange>('currentMonth')
  const [renewCourtTargetMember, setRenewCourtTargetMember] = useState<CourtMember | null>(null)

  const [courtCustomFrom, setCourtCustomFrom] = useState('')
  const [courtCustomTo, setCourtCustomTo] = useState('')

  const computeCourtRange = (range: FilterRange, cFrom: string, cTo: string) => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()

    switch (range) {
      case 'currentMonth':
        return { start: startOfMonth(now), end: endOfMonth(now) }
      case 'lastMonth':
        const lastMonth = subMonths(now, 1)
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) }
      case 'currentFY':
        const fyStartYear = month >= 3 ? year : year - 1
        return { start: new Date(fyStartYear, 3, 1), end: new Date(fyStartYear + 1, 2, 31, 23, 59, 59) }
      case 'lastFY':
        const lfyStartYear = month >= 3 ? year - 1 : year - 2
        return { start: new Date(lfyStartYear, 3, 1), end: new Date(lfyStartYear + 1, 2, 31, 23, 59, 59) }
      case 'custom':
        if (!cFrom || !cTo) return { start: new Date(0), end: new Date() }
        return { start: startOfDay(parseISO(cFrom)), end: endOfDay(parseISO(cTo)) }
    }
  }

  const handleCourtAction = (memberId: string, action: string) => {
    // Collect/Renew/Buy
    const member = mockCourtMembers.find(m => m.id === memberId)
    if (!member) return
    const plan = mockCourtPlans.find(p => p.id === member.planId)
    if (!plan) return
    
    const amount = prompt(`Enter amount to collect (Plan price: ₹${plan.price}):`, String(plan.price))
    if (!amount) return
    
    member.amountPaid += Number(amount)
    
    // logic based on action
    if (action === 'renew' || action === 'buy') {
      member.status = 'active'
      if (plan.planType === 'monthly' && plan.durationMonths && member.nextDueDate) {
        member.nextDueDate = format(addMonths(parseISO(member.nextDueDate), plan.durationMonths), 'yyyy-MM-dd')
      }
      if (plan.planType === 'sessions' && plan.totalSessions) {
        member.remainingSessions = plan.totalSessions
      }
    }

    member.paymentHistory.push({
      id: crypto.randomUUID(),
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: Number(amount),
      paymentMethod: 'cash',
      entryType: action === 'renew' ? 'renewal' : (plan.planType === 'sessions' ? 'session-topup' : 'new'),
      status: 'active'
    })
    
    refresh()
  }

  const handleDeleteCourtEntry = (memberId: string, entryId: string) => {
    if (!confirm("Delete this payment record?")) return
    const member = mockCourtMembers.find(m => m.id === memberId)
    if (!member) return
    const entry = member.paymentHistory.find(e => e.id === entryId)
    if (entry) {
      entry.status = 'deleted'
      refresh()
    }
  }

  // Derived Court Data
  const courtDateRange = computeCourtRange(courtFilterRange, courtCustomFrom, courtCustomTo)
  const courtRowsAll = mockCourtMembers.flatMap(m => 
    m.paymentHistory.map(tx => ({
      ...tx,
      memberId: m.id,
      memberName: m.name,
      memberPhone: m.phone
    }))
  )

  const courtRecentRows = courtRowsAll
    .filter(t => {
      const d = parseISO(t.date)
      return isWithinInterval(d, courtDateRange) && t.status !== 'deleted'
    })
    .filter(t => {
      if (!courtSearchQuery) return true
      const q = courtSearchQuery.toLowerCase()
      return t.memberName.toLowerCase().includes(q) || t.memberPhone.includes(q)
    })
    .sort((a, b) => b.date.localeCompare(a.date))

  const courtPaidRows = courtRowsAll
    .filter(t => {
      const d = parseISO(t.date)
      return isWithinInterval(d, courtDateRange) && t.status === 'active'
    })
    .filter(t => {
      if (!courtSearchQuery) return true
      const q = courtSearchQuery.toLowerCase()
      return t.memberName.toLowerCase().includes(q) || t.memberPhone.includes(q)
    })
    .sort((a, b) => b.date.localeCompare(a.date))

  const courtPendingRows = mockCourtMembers
    .filter(m => {
      if (m.planType === 'monthly' && (m.status === 'expired' || m.status === 'due-soon')) return true
      if (m.planType === 'sessions' && m.status === 'exhausted') return true
      return false
    })
    .filter(m => {
      if (!courtSearchQuery) return true
      const q = courtSearchQuery.toLowerCase()
      return m.name.toLowerCase().includes(q) || m.phone.includes(q)
    })



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

const searchPlaceholders: Record<TabType, string> = {
    recent: 'Search in recent...',
    paid: 'Search in paid...',
    pending: 'Search in pending...',
    partial: 'Search in partially paid...',
  }

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
    .filter(s => s.status !== 'dropout' && s.status !== 'inactive')
    .filter(s => matchesSearch(s.name, s.phone))
    .sort((a, b) => parseISO(a.nextDueDate).getTime() - parseISO(b.nextDueDate).getTime())

  const partialRows = mockStudents
    .filter(s => s.pendingAmount > 0)
    .filter(s => s.status !== 'dropout' && s.status !== 'inactive')
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
      {mockSettings.courtMembershipEnabled && (
        <div className="flex bg-so-surface border border-so-border rounded-xl p-1 w-fit mb-6 shadow-sm">
          <button
            onClick={() => setTxSegment('coaching')}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
              txSegment === 'coaching'
                ? 'bg-white text-so-text shadow-sm border border-so-border'
                : 'text-so-muted hover:text-so-text'
            }`}
          >
            Coaching
          </button>
          <button
            onClick={() => setTxSegment('court')}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
              txSegment === 'court'
                ? 'bg-white text-so-text shadow-sm border border-so-border'
                : 'text-so-muted hover:text-so-text'
            }`}
          >
            Court
          </button>
        </div>
      )}

      {txSegment === 'court' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-so-text">Court Transactions</h1>
              <p className="text-so-muted text-sm mt-0.5">Manage payments for court plans</p>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-so-muted" />
              <input
                type="text"
                placeholder="Search..."
                value={courtSearchQuery}
                onChange={e => setCourtSearchQuery(e.target.value)}
                className="w-full bg-white border border-so-border rounded-lg pl-9 pr-4 py-2 text-sm text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-accent"
              />
            </div>
            <button
              onClick={() => setShowFilter(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-so-border rounded-lg text-sm text-so-muted hover:border-so-accent hover:text-so-text transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filter
              {courtFilterRange !== 'currentMonth' && (
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
                  onClick={() => { setCourtTxTab(tab); setCourtSearchQuery(''); }}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    courtTxTab === tab
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
            {courtTxTab === 'recent' && (
              <div>
                {courtRecentRows.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center">
                    <Receipt className="w-12 h-12 text-so-muted mb-4" strokeWidth={1.5} />
                    <p className="text-so-text font-semibold">No transactions in this period</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-so-surface border-b border-so-border">
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Member</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Phone</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Date</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Amount</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Method</th>
                          <th className="text-right px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-so-border">
                        {courtRecentRows.map(t => (
                          <tr key={t.id} className="bg-so-card hover:bg-so-surface/60 border-b border-so-border transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-so-text font-medium">{t.memberName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-so-muted">{t.memberPhone}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-so-text">{formatDateLabel(t.date)}</td>
                            <td className="px-6 py-4 whitespace-nowrap font-semibold text-so-emerald">
                              ₹ {t.amount.toLocaleString('en-IN')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-so-muted capitalize">{t.paymentMethod}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              {voidConfirmId === t.id ? (
                                <div className="flex items-center justify-end gap-2">
                                  <span className="text-xs text-so-muted">Void transaction?</span>
                                  <button onClick={() => {
                                    const m = mockCourtMembers.find(x => x.id === t.memberId);
                                    if (m) {
                                      const e = m.paymentHistory.find(e => e.id === t.id);
                                      if (e) e.status = 'deleted';
                                    }
                                    setVoidConfirmId(null);
                                    refresh();
                                  }} className="text-xs px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">Yes</button>
                                  <button onClick={() => setVoidConfirmId(null)} className="text-xs px-2 py-1 border border-so-border rounded-md text-so-muted hover:text-so-text transition-colors">No</button>
                                </div>
                              ) : (
                                <button onClick={() => setVoidConfirmId(t.id)} className="p-1.5 rounded-md text-so-muted hover:text-so-red hover:bg-so-surface transition-colors cursor-pointer">
                                  <Trash2 className="w-4 h-4" />
                                </button>
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

            {courtTxTab === 'paid' && (
              <div>
                {courtPaidRows.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center">
                    <CheckCircle className="w-12 h-12 text-so-emerald mb-4" strokeWidth={1.5} />
                    <p className="text-so-text font-semibold">No paid records in this period</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-so-surface border-b border-so-border">
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Member</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Phone</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Date</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Amount</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Method</th>
                          <th className="text-right px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-so-border">
                        {courtPaidRows.map(t => (
                          <tr key={t.id} className="bg-so-card hover:bg-so-surface/60 border-b border-so-border transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-so-text font-medium">{t.memberName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-so-muted">{t.memberPhone}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-so-text">{formatDateLabel(t.date)}</td>
                            <td className="px-6 py-4 whitespace-nowrap font-semibold text-so-emerald">₹ {t.amount.toLocaleString('en-IN')}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-so-muted capitalize">{t.paymentMethod}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              {voidConfirmId === t.id ? (
                                <div className="flex items-center justify-end gap-2">
                                  <span className="text-xs text-so-muted">Void transaction?</span>
                                  <button onClick={() => {
                                    const m = mockCourtMembers.find(x => x.id === t.memberId);
                                    if (m) {
                                      const e = m.paymentHistory.find(e => e.id === t.id);
                                      if (e) e.status = 'deleted';
                                    }
                                    setVoidConfirmId(null);
                                    refresh();
                                  }} className="text-xs px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">Yes</button>
                                  <button onClick={() => setVoidConfirmId(null)} className="text-xs px-2 py-1 border border-so-border rounded-md text-so-muted hover:text-so-text transition-colors">No</button>
                                </div>
                              ) : (
                                <button onClick={() => setVoidConfirmId(t.id)} className="p-1.5 rounded-md text-so-muted hover:text-so-red hover:bg-so-surface transition-colors cursor-pointer">
                                  <Trash2 className="w-4 h-4" />
                                </button>
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

            {courtTxTab === 'pending' && (
              <div>
                {courtPendingRows.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center">
                    <CheckCircle className="w-12 h-12 text-so-emerald mb-4" strokeWidth={1.5} />
                    <p className="text-so-text font-semibold">No pending court members</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-so-surface border-b border-so-border">
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Member</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Phone</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Plan Details</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Amount Due</th>
                          <th className="text-right px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-so-border">
                        {courtPendingRows.map(m => {
                          const plan = mockCourtPlans.find(p => p.id === m.planId)
                          return (
                            <tr key={m.id} className="bg-so-card hover:bg-so-surface/60 border-b border-so-border transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-so-text font-medium">
                                {m.name}
                                <span className={`ml-2 text-xs ${m.status === 'expired' || m.status === 'exhausted' ? 'text-red-500' : 'text-amber-500'}`}>
                                  ({m.status.replace('-', ' ')})
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-so-muted">{m.phone}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-so-text">
                                {plan?.name}
                                {m.planType === 'monthly' ? (
                                  <span className="ml-2 text-xs text-so-muted">Due {m.nextDueDate ? formatDateLabel(m.nextDueDate) : '-'}</span>
                                ) : (
                                  <span className="ml-2 text-xs text-so-muted">0 / {m.totalSessions} Sessions left</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-so-red font-semibold">₹ {plan?.price.toLocaleString('en-IN')}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <button onClick={() => setRenewCourtTargetMember(m)} className="px-3 py-1.5 bg-so-accent text-so-accent-text rounded-lg text-xs font-semibold shadow-sm">Renew</button>
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

            {courtTxTab === 'partial' && (
              <div className="py-20 flex flex-col items-center justify-center text-so-muted">
                <Receipt className="w-12 h-12 text-so-muted mb-4" strokeWidth={1.5} />
                <p className="text-so-text font-medium">Partial payment tracking for court members coming soon.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
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
            placeholder={searchPlaceholders[activeTab]}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white border border-so-border rounded-lg pl-9 pr-4 py-2 text-sm text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-accent"
          />
        </div>
        {activeTab === 'pending' && (
          <button
            onClick={handleBulkToggle}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              bulkMode
                ? 'bg-so-accent text-white border-so-accent'
                : 'bg-so-surface border-so-border text-so-muted hover:border-so-accent hover:text-so-text'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Quick Collect
          </button>
        )}
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
              onClick={() => handleTabChange(tab)}
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
                      {bulkMode && (
                        <th className="w-10 px-4 py-3">
                          <input
                            type="checkbox"
                            checked={
                              pendingRows.length > 0 &&
                              pendingRows.every(s => selectedIds.has(s.id))
                            }
                            ref={el => {
                              if (el) {
                                el.indeterminate =
                                  selectedIds.size > 0 &&
                                  !pendingRows.every(s => selectedIds.has(s.id))
                              }
                            }}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedIds(new Set(pendingRows.map(s => s.id)))
                              } else {
                                setSelectedIds(new Set())
                              }
                            }}
                            className="w-4 h-4 accent-so-accent cursor-pointer"
                          />
                        </th>
                      )}
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Student</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Phone</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Due Date</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Amount</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-so-border">
                    {pendingRows.map(s => (
                      <tr key={s.id} 
                        onClick={() => {
                          if (!bulkMode) return
                          const next = new Set(selectedIds)
                          if (next.has(s.id)) next.delete(s.id)
                          else next.add(s.id)
                          setSelectedIds(next)
                        }}
                        className={`border-b border-so-border transition-colors ${
                          bulkMode
                            ? selectedIds.has(s.id)
                              ? 'bg-so-accent/5 cursor-pointer'
                              : 'hover:bg-so-surface/60 cursor-pointer'
                            : 'bg-so-card hover:bg-so-surface/60'
                        }`}>
                        {bulkMode && (
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(s.id)}
                              onChange={e => {
                                const next = new Set(selectedIds)
                                if (e.target.checked) next.add(s.id)
                                else next.delete(s.id)
                                setSelectedIds(next)
                              }}
                              className="w-4 h-4 accent-so-accent cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-so-text">{s.name}</span>
                            {s.status === 'expired' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
                                <AlertCircle className="w-3 h-3" />
                                Overdue
                              </span>
                            ) : s.status === 'due-soon' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200">
                                <Clock className="w-3 h-3" />
                                Due Soon
                              </span>
                            ) : null}
                          </div>
                          <p className={`text-xs mt-0.5 font-medium ${
                            s.status === 'expired' ? 'text-red-500' : 'text-amber-500'
                          }`}>
                            {getDaysLabel(s)}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-so-muted">
                          {s.phone}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap font-medium ${s.status === 'expired' ? 'text-so-red' : 'text-so-yellow'}`}>
                          {formatDateLabel(s.nextDueDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-so-emerald font-semibold">
                          ₹ {s.fees.toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end">
                            <button
                              onClick={(e) => { e.stopPropagation(); setRenewTarget(s); }}
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

        
          {bulkMode && selectedIds.size > 0 && (
            <div className="mt-3 flex items-center gap-3 bg-[#1E2A3A] rounded-xl px-4 py-3 sticky bottom-4 shadow-xl z-20">
              <div className="w-7 h-7 rounded-full bg-so-accent/30 flex items-center justify-center flex-shrink-0">
                <Check className="w-3.5 h-3.5 text-so-accent" />
              </div>
              <span className="text-sm font-medium text-white">
                {selectedIds.size} student{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
              <span className="text-white/30">|</span>
              <span className="text-sm text-white/70">
                ₹ {pendingRows
                    .filter(s => selectedIds.has(s.id))
                    .reduce((sum, s) => sum + (s.pendingAmount > 0 ? s.pendingAmount : s.fees), 0)
                    .toLocaleString('en-IN')}
              </span>

              <div className="flex-1" />

              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-white/60 border border-white/20 rounded-lg px-3 py-1.5 hover:text-white transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => { setBulkMethod('cash'); setShowBulkModal(true) }}
                className="flex items-center gap-2 bg-so-accent text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-so-accent-hover transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                Collect Payment
              </button>
            </div>
          )}{activeTab === 'partial' && (
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
              <button
                onClick={() => {
                  setFilterRange('currentMonth')
                  setCustomFrom('')
                  setCustomTo('')
                  // Do NOT close the panel  let user see the reset state before applying
                }}
                className="flex-1 py-2 border border-so-border rounded-lg text-sm text-so-muted hover:text-so-text transition-colors"
              >
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
      {renewTarget && (
        <RenewModal
          student={renewTarget}
          onClose={() => setRenewTarget(null)}
          onConfirm={(entry, newDueDate, newMembershipStartDate, newPendingAmount, newBatch) => {
            const student = mockStudents.find(s => s.id === renewTarget.id)
            if (!student) return
            student.paymentHistory.push(entry)
            student.nextDueDate = newDueDate
            student.membershipStartDate = newMembershipStartDate
            student.pendingAmount = newPendingAmount
            student.currentBatch = newBatch
            student.status = newPendingAmount > 0 ? 'due-soon' : 'active'
            setRenewTarget(null)
            refresh()
          }}
        />
      )}
      
      {collectRemainingTarget && (
        <CollectRemainingModal
          student={collectRemainingTarget}
          onClose={() => setCollectRemainingTarget(null)}
          onConfirm={(entry) => {
            const student = mockStudents.find(s => s.id === collectRemainingTarget.id)
            if (!student) return
            student.paymentHistory.push(entry)
            student.pendingAmount = 0
            if (student.status === 'due-soon' || student.status === 'expired') {
              student.status = 'active'
            }
            setCollectRemainingTarget(null)
            refresh()
          }}
        />
      )}

      {showBulkModal && (() => {
        const bulkStudents = pendingRows.filter(s => selectedIds.has(s.id))
        const grandTotal = bulkStudents.reduce(
          (sum, s) => sum + (s.pendingAmount > 0 ? s.pendingAmount : s.fees), 0
        )

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-so-card rounded-2xl shadow-2xl border border-so-border w-full max-w-md mx-4">

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-so-border">
                <div>
                  <h2 className="text-base font-semibold text-so-text">Collect Payments</h2>
                  <p className="text-xs text-so-muted mt-0.5">
                    {bulkStudents.length} student{bulkStudents.length !== 1 ? 's' : ''} • ₹ {grandTotal.toLocaleString('en-IN')} total
                  </p>
                </div>
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="text-so-muted hover:text-so-text transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Student list */}
              <div className="px-5 py-3 max-h-56 overflow-y-auto divide-y divide-so-border">
                {bulkStudents.map(student => {
                  const amt = student.pendingAmount > 0 ? student.pendingAmount : student.fees
                  const initials = student.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                  return (
                    <div key={student.id} className="flex items-center gap-3 py-2.5">
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-so-accent/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-so-accent">{initials}</span>
                      </div>
                      {/* Name + type */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-so-text truncate">{student.name}</p>
                        <p className="text-xs text-so-muted">
                          {mockSettings.membershipTypes.find(m => m.id === student.membershipTypeId)?.name ?? ''}
                          {' • '}{student.currentBatch}
                        </p>
                      </div>
                      {/* Amount */}
                      <span className="text-sm font-semibold text-so-emerald flex-shrink-0">
                        ₹ {amt.toLocaleString('en-IN')}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Payment method */}
              <div className="px-5 py-4 border-t border-so-border">
                <p className="text-xs text-so-muted uppercase tracking-wider mb-3">Payment Method</p>
                <div className="grid grid-cols-4 gap-2">
                  {(['cash', 'upi', 'card', 'other'] as const).map(method => (
                    <button
                      key={method}
                      onClick={() => setBulkMethod(method)}
                      className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                        bulkMethod === method
                          ? 'bg-so-accent text-white'
                          : 'border border-so-border text-so-muted hover:border-so-accent hover:text-so-text'
                      }`}
                    >
                      {method === 'upi' ? 'UPI' : method.charAt(0).toUpperCase() + method.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-so-border flex gap-3">
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="flex-1 py-2.5 border border-so-border rounded-lg text-sm text-so-muted hover:text-so-text hover:border-so-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkConfirm}
                  className="flex-1 py-2.5 bg-so-accent text-white rounded-lg text-sm font-bold hover:bg-so-accent-hover transition-colors"
                >
                  Confirm ₹ {grandTotal.toLocaleString('en-IN')}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
        </div>
      )}

      {renewCourtTargetMember && (
        <RenewCourtMemberModal
          member={renewCourtTargetMember}
          onClose={() => setRenewCourtTargetMember(null)}
          onSuccess={() => { setRenewCourtTargetMember(null); refresh(); }}
        />
      )}

    </div>
  )
}
