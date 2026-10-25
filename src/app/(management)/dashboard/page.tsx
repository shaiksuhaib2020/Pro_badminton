'use client'

import { useState } from 'react'
import { mockStudents, mockSettings, mockBatches, mockAttendance, mockInventoryItems, mockExpenses, mockIncomeEntries } from '@/lib/mock-data'
import { getTodayIST, getFirstDayOfMonthIST, formatCurrency, getDateDaysAgoIST, formatDate } from '@/lib/utils'
import { startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO, format, startOfDay, endOfDay, isAfter, isBefore, subDays } from 'date-fns'
import { Wallet, AlertCircle, Users, GraduationCap, AlertTriangle, TrendingDown, ShoppingBag, UserX, CalendarCheck, Clock, Receipt, BookOpen } from 'lucide-react'

type DateFilter = 'thisMonth' | 'lastMonth' | 'custom'

export default function DashboardPage() {
  const [dateFilter, setDateFilter] = useState<DateFilter>('thisMonth')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const getDateRange = () => {
    const now = new Date()
    switch (dateFilter) {
      case 'thisMonth':
        return { start: startOfMonth(now), end: endOfMonth(now) }
      case 'lastMonth':
        const lm = subMonths(now, 1)
        return { start: startOfMonth(lm), end: endOfMonth(lm) }
      case 'custom':
        if (!customFrom || !customTo) return { start: startOfMonth(now), end: endOfMonth(now) }
        return {
          start: startOfDay(parseISO(customFrom)),
          end: endOfDay(parseISO(customTo))
        }
    }
  }
  const range = getDateRange()
  
  const todayStr = getTodayIST()

  // 1. Collected
  const collectedAmount = mockStudents
    .flatMap(s => s.paymentHistory)
    .filter(p => p.status !== 'deleted')
    .filter(p => {
      try {
        return isWithinInterval(parseISO(p.date), range)
      } catch (e) {
        return false
      }
    })
    .reduce((sum, p) => sum + p.amount, 0)

  // 2. Pending Dues
  const pendingDuesStudents = mockStudents.filter(s =>
    s.status !== 'dropout' && s.status !== 'inactive'
  )

  const pendingDuesAmount = pendingDuesStudents.reduce((sum, s) => {
    if (s.pendingAmount > 0) return sum + s.pendingAmount
    if (s.nextDueDate < todayStr) return sum + s.fees
    return sum
  }, 0)

  const pendingDuesCount = pendingDuesStudents.filter(s =>
    s.pendingAmount > 0 || s.nextDueDate < todayStr
  ).length

  // 3. Active Students
  const activeStudentCount = mockStudents.filter(s =>
    s.status === 'active' || s.status === 'due-soon'
  ).length
  const expiringSoonCount = mockStudents.filter(s => s.status === 'due-soon').length

  // 4. Overdue
  const overdueCount = mockStudents.filter(s =>
    s.status !== 'dropout' &&
    s.status !== 'inactive' &&
    s.nextDueDate < todayStr
  ).length

  // Today at a Glance
  const enrollmentsToday = mockStudents.filter(s => s.startDate === todayStr).length
  const dropoutsToday = mockStudents.filter(s => s.dropoutDate === todayStr).length
  const paymentsToday = mockStudents.reduce((count, s) =>
    count + s.paymentHistory.filter(p => p.date === todayStr && p.status !== 'deleted').length
  , 0)
  const studentsWithDues = pendingDuesStudents.filter(s =>
    s.pendingAmount > 0 || s.nextDueDate < todayStr
  ).length

  const getAttendanceForBatch = (batch: typeof mockBatches[0]) => {
    const record = mockAttendance.find(r => r.batchId === batch.id && r.date === todayStr)
    if (!record) return null
    const batchStudents = mockStudents.filter(s =>
      s.currentBatch === batch.name &&
      s.status !== 'dropout' &&
      s.status !== 'inactive'
    )
    if (batchStudents.length === 0) return null
    const presentCount = batchStudents.filter(s => record.records[s.id] === 'present').length
    return Math.round((presentCount / batchStudents.length) * 100)
  }

  const morningBatch = mockBatches.find(b => b.name.toLowerCase().includes('morning'))
  const eveningBatch = mockBatches.find(b => b.name.toLowerCase().includes('evening'))
  const morningAttPct = morningBatch ? getAttendanceForBatch(morningBatch) : null
  const eveningAttPct = eveningBatch ? getAttendanceForBatch(eveningBatch) : null

  // Recent Collections
  const recentCollections = mockStudents
    .flatMap(s =>
      s.paymentHistory
        .filter(p =>
          p.status !== 'deleted' &&
          p.date >= getDateDaysAgoIST(2)
        )
        .map(p => ({ studentName: s.name, amount: p.amount, method: p.paymentMethod, date: p.date }))
    )
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)

  // Low Stock
  const lowStockItems = mockInventoryItems
    .filter(item => item.quantity <= 7)
    .sort((a, b) => a.quantity - b.quantity)

  // Irregular Students & Month Net Balance
  const monthStart = getFirstDayOfMonthIST()
  
  const monthRecords = mockAttendance.filter(r => r.date >= monthStart && r.date <= todayStr)
  
  const irregularStudents = mockStudents
    .filter(s => s.status !== 'dropout' && s.status !== 'inactive')
    .map(s => {
      const studentBatch = mockBatches.find(b => b.name === s.currentBatch)
      const relevantRecords = studentBatch
        ? monthRecords.filter(r => r.batchId === studentBatch.id && s.id in r.records)
        : []
      const totalDays = relevantRecords.length
      const presentDays = relevantRecords.filter(r => r.records[s.id] === 'present').length
      const pct = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : null
      return { name: s.name, batch: s.currentBatch, pct, totalDays }
    })
    .filter(s => s.totalDays >= 3 && s.pct !== null && s.pct < 60)
    .sort((a, b) => (a.pct ?? 100) - (b.pct ?? 100))
    .slice(0, 5)

  const monthIncome = mockIncomeEntries
    .filter(e => e.date >= monthStart && e.date <= todayStr)
    .reduce((sum, e) => sum + e.amount, 0)

  const monthExpenses = mockExpenses
    .filter(e => e.date >= monthStart && e.date <= todayStr)
    .reduce((sum, e) => sum + e.amount, 0)

  const netBalance = monthIncome - monthExpenses

  // Batch Stats
  const batchStats = mockSettings.batches.map(batch => {
    const batchStudents = mockStudents.filter(s =>
      s.currentBatch === batch && s.status !== 'dropout'
    )

    const expected = batchStudents.reduce((sum, s) => sum + s.fees, 0)

    const collected = batchStudents
      .flatMap(s => s.paymentHistory)
      .filter(p => p.status !== 'deleted')
      .filter(p => {
        try {
          return isWithinInterval(parseISO(p.date), range)
        } catch (e) {
          return false
        }
      })
      .reduce((sum, p) => sum + p.amount, 0)

    const remaining = Math.max(0, expected - collected)
    const percentage = expected > 0 ? Math.round((collected / expected) * 100) : 0

    return { batch, expected, collected, remaining, percentage, studentCount: batchStudents.length }
  })

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Top bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-so-text">Dashboard</h1>
          <p className="text-so-muted text-sm mt-0.5">
            {activeStudentCount} students actively training
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => setDateFilter('thisMonth')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                dateFilter === 'thisMonth' 
                  ? 'bg-so-accent text-white' 
                  : 'border border-so-border text-so-muted hover:border-so-accent'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setDateFilter('lastMonth')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                dateFilter === 'lastMonth' 
                  ? 'bg-so-accent text-white' 
                  : 'border border-so-border text-so-muted hover:border-so-accent'
              }`}
            >
              Last Month
            </button>
            <button
              onClick={() => setDateFilter('custom')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                dateFilter === 'custom' 
                  ? 'bg-so-accent text-white' 
                  : 'border border-so-border text-so-muted hover:border-so-accent'
              }`}
            >
              Custom
            </button>
          </div>

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 mt-2">
              <input 
                type="date" 
                value={customFrom} 
                onChange={(e) => setCustomFrom(e.target.value)} 
                max={customTo || undefined} 
                className="bg-white border border-so-border rounded-md px-3 py-1.5 text-sm text-so-text"
              />
              <span className="text-so-muted text-sm">to</span>
              <input 
                type="date" 
                value={customTo} 
                onChange={(e) => setCustomTo(e.target.value)} 
                min={customFrom} 
                max={format(new Date(), 'yyyy-MM-dd')}
                className="bg-white border border-so-border rounded-md px-3 py-1.5 text-sm text-so-text"
              />
            </div>
          )}
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-so-emerald-subtle flex items-center justify-center shrink-0">
              <Wallet className="w-3.5 h-3.5 text-so-emerald" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-so-muted truncate">
              {dateFilter === 'thisMonth' ? 'Collected  This Month' : dateFilter === 'lastMonth' ? 'Collected  Last Month' : 'Collected  Custom Range'}
            </span>
          </div>
          <div className="text-2xl font-bold text-so-emerald">₹ {collectedAmount.toLocaleString('en-IN')}</div>
        </div>

        {/* Card 2 */}
        <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-so-yellow-subtle flex items-center justify-center shrink-0">
              <AlertCircle className="w-3.5 h-3.5 text-so-yellow" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-so-muted truncate">
              Pending Dues
            </span>
          </div>
          <div className="text-2xl font-bold text-so-yellow">{formatCurrency(pendingDuesAmount)}</div>
          <p className="text-sm text-so-muted mt-0.5">{pendingDuesCount} student{pendingDuesCount !== 1 ? 's' : ''}</p>
        </div>

        {/* Card 3 */}
        <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-white border border-so-border flex items-center justify-center shrink-0">
              <Users className="w-3.5 h-3.5 text-so-text" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-so-muted truncate">
              Active Members
            </span>
          </div>
          <div className="text-2xl font-bold text-so-text">{activeStudentCount}</div>
          <p className="text-sm text-so-muted mt-0.5">{expiringSoonCount} expiring soon</p>
        </div>

        {/* Card 4 */}
        <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-so-red-subtle flex items-center justify-center shrink-0">
              <UserX className="w-3.5 h-3.5 text-so-red" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-so-muted truncate">
              Overdue
            </span>
          </div>
          <div className="text-2xl font-bold text-so-red">{overdueCount}</div>
          <p className="text-sm text-so-muted mt-0.5">fee not renewed</p>
        </div>
      </div>

      {/* Today at a Glance */}
      <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-so-muted stroke-[1.75] shrink-0" />
            <h2 className="text-sm font-semibold text-so-text">Today at a Glance</h2>
          </div>
          <span className="text-xs text-so-muted">
            {format(parseISO(todayStr), 'dd MMM')}
          </span>
        </div>
        
        <div className="grid grid-cols-3 gap-x-6 gap-y-4 mt-4">
          <div>
            <div className="text-[11px] font-medium text-so-muted uppercase tracking-wide">ENROLLMENTS</div>
            <div className={`text-xl font-bold ${enrollmentsToday > 0 ? 'text-so-emerald' : 'text-so-text'}`}>{enrollmentsToday}</div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-so-muted uppercase tracking-wide">DROPOUTS</div>
            <div className={`text-xl font-bold ${dropoutsToday > 0 ? 'text-so-red' : 'text-so-text'}`}>{dropoutsToday}</div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-so-muted uppercase tracking-wide">ENQUIRIES</div>
            <div className="text-xl font-bold text-so-muted">—</div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-so-muted uppercase tracking-wide">PAYMENTS TODAY</div>
            <div className={`text-xl font-bold ${paymentsToday > 0 ? 'text-so-emerald' : 'text-so-text'}`}>{paymentsToday}</div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-so-muted uppercase tracking-wide">STUDENTS WITH DUES</div>
            <div className={`text-xl font-bold ${studentsWithDues > 0 ? 'text-so-yellow' : 'text-so-text'}`}>{studentsWithDues}</div>
          </div>
          <div>
            {/* Blank */}
          </div>
        </div>

        <div className="border-t border-so-border-subtle mt-4 pt-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-so-text">Morning batch</span>
            {morningAttPct !== null ? (
              <span className={`text-sm font-semibold ${morningAttPct >= 75 ? 'text-so-emerald' : morningAttPct >= 50 ? 'text-so-yellow' : 'text-so-red'}`}>
                {morningAttPct}%
              </span>
            ) : (
              <span className="text-xs text-so-muted bg-so-surface px-2 py-0.5 rounded-full">Not marked yet</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-so-text">Evening batch</span>
            {eveningAttPct !== null ? (
              <span className={`text-sm font-semibold ${eveningAttPct >= 75 ? 'text-so-emerald' : eveningAttPct >= 50 ? 'text-so-yellow' : 'text-so-red'}`}>
                {eveningAttPct}%
              </span>
            ) : (
              <span className="text-xs text-so-muted bg-so-surface px-2 py-0.5 rounded-full">Not marked yet</span>
            )}
          </div>
        </div>
      </div>

      {/* 2 Data Module Rows */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent Collections */}
        <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-so-muted stroke-[1.75] shrink-0" />
              <h2 className="text-sm font-semibold text-so-text">Recent Collections</h2>
            </div>
            <span className="text-so-muted text-xs">Last 48 hours</span>
          </div>
          {recentCollections.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-10">
              <Receipt className="w-10 h-10 text-so-muted/40 mb-3" strokeWidth={1.5} />
              <p className="text-so-text font-medium text-sm">No payments in the last 48 hours</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              {recentCollections.map((rc, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-so-border-subtle last:border-0">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-so-text">{rc.studentName}</span>
                    <span className="text-xs text-so-muted">{formatDate(rc.date)}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-semibold text-so-text">{formatCurrency(rc.amount)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mt-0.5 ${
                      rc.method === 'cash' ? 'bg-emerald-50 text-emerald-600' :
                      rc.method === 'upi' ? 'bg-amber-50 text-amber-600' :
                      rc.method === 'card' ? 'bg-blue-50 text-blue-600' :
                      'bg-slate-50 text-slate-600'
                    }`}>
                      {rc.method}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alert */}
        <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-so-muted stroke-[1.75] shrink-0" />
              <h2 className="text-sm font-semibold text-so-text">Low Stock</h2>
            </div>
            <span className="text-so-muted text-xs">
              {lowStockItems.length === 0 ? 'All items well stocked' : `${lowStockItems.length} items need attention`}
            </span>
          </div>
          {lowStockItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-10">
              <ShoppingBag className="w-10 h-10 text-so-muted/40 mb-3" strokeWidth={1.5} />
              <p className="text-so-text font-medium text-sm">All items well stocked</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              {lowStockItems.map((item, i) => (
                <div key={item.id} className="flex items-center justify-between py-3 border-b border-so-border-subtle last:border-0">
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-medium text-so-text truncate">{item.name}</span>
                    <span className="text-xs text-so-muted">{item.quantity} {item.unit}</span>
                  </div>
                  <div className="ml-3 shrink-0">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${
                      item.quantity === 0 ? 'bg-red-50 text-red-700 border-red-200' :
                      item.quantity <= 3 ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        item.quantity === 0 ? 'bg-red-500' : item.quantity <= 3 ? 'bg-red-500' : 'bg-amber-500'
                      }`} />
                      {item.quantity === 0 ? 'Out of Stock' : item.quantity <= 3 ? 'Critical' : 'Low'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Irregular Students */}
        <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-so-muted stroke-[1.75] shrink-0" />
              <h2 className="text-sm font-semibold text-so-text">Low Attendance</h2>
            </div>
            <span className="text-so-muted text-xs">Below 60% this month</span>
          </div>
          {irregularStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-10">
              <CalendarCheck className="w-10 h-10 text-so-muted/40 mb-3" strokeWidth={1.5} />
              <p className="text-so-emerald font-medium text-sm">All students attending regularly</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              {irregularStudents.map((s, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-so-border-subtle last:border-0">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-so-text">{s.name}</span>
                    <span className="text-xs text-so-muted">{s.batch}</span>
                  </div>
                  <span className="text-sm font-bold text-so-red">{s.pct}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Month Net Balance */}
        <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-so-muted stroke-[1.75] shrink-0" />
            <h2 className="text-sm font-semibold text-so-text">This Month</h2>
          </div>
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between py-2.5 border-b border-so-border-subtle">
              <span className="text-sm text-so-muted">Income</span>
              <span className="text-sm font-semibold text-so-emerald">{formatCurrency(monthIncome)}</span>
            </div>
            <div className="flex items-center justify-between py-2.5 border-b border-so-border-subtle">
              <span className="text-sm text-so-muted">Expenses</span>
              <span className="text-sm font-semibold text-so-red">{formatCurrency(monthExpenses)}</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm font-semibold text-so-text">Net</span>
              <span className={`text-base font-bold ${netBalance >= 0 ? 'text-so-emerald' : 'text-so-red'}`}>
                {netBalance >= 0 ? '+' : '−'} {formatCurrency(Math.abs(netBalance))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Batch Revenue Section (Moved here) */}
      <div>
        <div className="flex items-center justify-between mb-4 mt-6">
          <h2 className="text-lg font-semibold text-so-text">Batch Revenue</h2>
          <span className="text-so-muted text-xs">
            Based on {dateFilter === 'thisMonth' ? 'This Month' : dateFilter === 'lastMonth' ? 'Last Month' : 'Custom Range'}
          </span>
        </div>

        <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-6">
          {mockSettings.batches.length === 0 ? (
            <div className="text-center py-8 text-so-muted text-sm">
              No batches configured. Add batches in Settings.
            </div>
          ) : (
            batchStats.map(stat => (
              <div key={stat.batch} className="mb-6 last:mb-0">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-so-text font-medium">{stat.batch} Batch</span>
                    <span className="text-so-muted text-xs">{stat.studentCount} students</span>
                  </div>
                  {stat.studentCount > 0 && (
                    <span className={`text-sm font-semibold ${
                      stat.percentage >= 80 ? 'text-so-emerald' :
                      stat.percentage >= 50 ? 'text-so-yellow' :
                      'text-so-red'
                    }`}>
                      {stat.percentage}%
                    </span>
                  )}
                </div>

                {stat.studentCount === 0 ? (
                  <span className="text-so-muted text-xs italic">No students assigned to this batch</span>
                ) : (
                  <>
                    <div className="h-2.5 bg-so-surface rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${Math.min(100, stat.percentage)}%`,
                          backgroundColor: stat.percentage >= 80 ? '#10B981' :
                                           stat.percentage >= 50 ? '#F59E0B' : '#EF4444'
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-so-emerald text-xs font-medium">
                        ₹ {stat.collected.toLocaleString('en-IN')} collected
                      </span>
                      <span className="text-so-muted text-xs">
                        ₹ {stat.remaining.toLocaleString('en-IN')} remaining
                      </span>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
