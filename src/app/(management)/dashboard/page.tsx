'use client'

import { useState } from 'react'
import { mockStudents, mockSettings } from '@/lib/mock-data'
import { startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO, format, startOfDay, endOfDay } from 'date-fns'
import { Wallet, AlertCircle, Users, GraduationCap } from 'lucide-react'

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

  // 2. Due
  const dueAmount = mockStudents
    .filter(s => s.status !== 'off-court')
    .reduce((sum, s) => {
      if (s.pendingAmount > 0) return sum + s.pendingAmount
      if (s.status === 'expired' || s.status === 'due-soon') return sum + s.fees
      return sum
    }, 0)

  // 3. Batches
  const batchCount = mockSettings.batches.length

  // 4. Students
  const activeStudentCount = mockStudents.filter(s =>
    s.status === 'active' || s.status === 'due-soon' || s.status === 'expired'
  ).length
  const offCourtCount = mockStudents.filter(s => s.status === 'off-court').length

  const batchStats = mockSettings.batches.map(batch => {
    const batchStudents = mockStudents.filter(s =>
      s.currentBatch === batch && s.status !== 'off-court'
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
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
            <span className="text-so-muted text-xs uppercase tracking-wider font-semibold truncate">
              {dateFilter === 'thisMonth' ? 'Collected  This Month' : dateFilter === 'lastMonth' ? 'Collected  Last Month' : 'Collected  Custom Range'}
            </span>
          </div>
          <div className="text-3xl font-bold text-so-emerald">₹ {collectedAmount.toLocaleString('en-IN')}</div>
        </div>

        {/* Card 2 */}
        <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-so-yellow-subtle flex items-center justify-center shrink-0">
              <AlertCircle className="w-3.5 h-3.5 text-so-yellow" />
            </div>
            <span className="text-so-muted text-xs uppercase tracking-wider font-semibold truncate">
              Due  Current
            </span>
          </div>
          <div className="text-3xl font-bold text-so-yellow">₹ {dueAmount.toLocaleString('en-IN')}</div>
          <p className="text-so-muted text-[11px] mt-1 italic">Not affected by date filter</p>
        </div>

        {/* Card 3 */}
        <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-white border border-so-border flex items-center justify-center shrink-0">
              <Users className="w-3.5 h-3.5 text-so-text" />
            </div>
            <span className="text-so-muted text-xs uppercase tracking-wider font-semibold truncate">
              Active Batches
            </span>
          </div>
          <div className="text-3xl font-bold text-so-text">{batchCount}</div>
        </div>

        {/* Card 4 */}
        <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-white border border-so-border flex items-center justify-center shrink-0">
              <GraduationCap className="w-3.5 h-3.5 text-so-text" />
            </div>
            <span className="text-so-muted text-xs uppercase tracking-wider font-semibold truncate">
              Total Students
            </span>
          </div>
          <div className="text-3xl font-bold text-so-text">{activeStudentCount}</div>
          <p className="text-so-muted text-[11px] mt-1">{offCourtCount} off-court</p>
        </div>
      </div>

      {/* Batch Revenue Section */}
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
