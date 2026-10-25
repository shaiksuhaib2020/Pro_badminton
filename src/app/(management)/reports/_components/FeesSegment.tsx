'use client'

import React, { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { mockStudents, mockBatches } from '@/lib/mock-data'
import {
  subMonths, format, startOfMonth, endOfMonth,
  parseISO, isWithinInterval, differenceInMonths
} from 'date-fns'

// Shared dropdown style used across all filter selects in this segment
const selectCls =
  'bg-so-surface border border-so-border rounded-lg px-3 py-1.5 text-xs font-medium text-so-text focus:outline-none focus:ring-1 focus:ring-so-accent cursor-pointer'

export default function FeesSegment() {

  // Card A: Monthly Revenue filter
  const [revenueRange, setRevenueRange] = useState('6m')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd]     = useState('')

  // Shared monthly navigator (Batch Revenue + Payment Mode)
  // monthOffset = 0 means current month; 1 = last month, etc.
  const [monthOffset, setMonthOffset] = useState(0)
  const navigatorDate  = subMonths(new Date(), monthOffset)
  const navigatorStart = startOfMonth(navigatorDate)
  const navigatorEnd   = endOfMonth(navigatorDate)
  const navigatorLabel = format(navigatorDate, 'MMMM yyyy')

  // Card B: Paid vs Pending batch dropdown
  const [pvpBatch, setPvpBatch] = useState('all')

  // Card D: Payment Mode batch dropdown
  const [pmBatch, setPmBatch] = useState('all')

  // Card A — Monthly Revenue data
  const getRevenueMonths = () => {
    let months: { start: Date; end: Date; label: string }[] = []
    if (revenueRange === '3m' || revenueRange === '6m') {
      const count = revenueRange === '3m' ? 3 : 6
      months = Array.from({ length: count }, (_, i) => {
        const d = subMonths(new Date(), count - 1 - i)
        return { start: startOfMonth(d), end: endOfMonth(d), label: format(d, 'MMM yy') }
      })
    } else if (revenueRange === 'custom' && customStart && customEnd) {
      const s = parseISO(customStart), e = parseISO(customEnd)
      const diffM   = differenceInMonths(e, s)
      const clamped = Math.min(diffM, 5)
      months = Array.from({ length: clamped + 1 }, (_, i) => {
        const d = subMonths(e, clamped - i)
        return { start: startOfMonth(d), end: endOfMonth(d), label: format(d, 'MMM yy') }
      })
    }
    return months.map((m, i) => ({
      month:     m.label,
      revenue:   mockStudents
        .flatMap(s => s.paymentHistory || [])
        .filter(p => p.status !== 'deleted' && isWithinInterval(parseISO(p.date), { start: m.start, end: m.end }))
        .reduce((sum, p) => sum + p.amount, 0),
      isCurrent: i === months.length - 1,
    }))
  }
  const revenueData = getRevenueMonths()

  // Card B — Paid vs Pending
  const activeStudents  = mockStudents.filter(s => !['inactive', 'dropout'].includes(s.status))
  const pvpStudents     = pvpBatch === 'all' ? activeStudents : activeStudents.filter(s => s.currentBatch === pvpBatch)
  const paidAmount      = pvpStudents.flatMap(s => s.paymentHistory || []).filter(p => p.status !== 'deleted').reduce((sum, p) => sum + p.amount, 0)
  const pendingAmount   = pvpStudents.reduce((sum, s) => sum + (s.pendingAmount ?? 0), 0)
  const paidStudentCount    = pvpStudents.filter(s => s.pendingAmount === 0 && s.status !== 'expired').length
  const pendingStudentCount = pvpStudents.filter(s => (s.pendingAmount ?? 0) > 0 || s.status === 'expired').length
  const pvpDonutData = [
    { name: 'Paid',    value: paidAmount    },
    { name: 'Pending', value: pendingAmount },
  ].filter(d => d.value > 0)

  // Card C — Batch Revenue (month-scoped) — FIX: collected scoped to navigator month only
  const batchRevenueData = mockBatches.map(batch => {
    const bs        = activeStudents.filter(s => s.currentBatch === batch.name)
    const expected  = bs.reduce((sum, s) => sum + s.fees, 0)
    const collected = bs
      .flatMap(s => s.paymentHistory || [])
      .filter(p => p.status !== 'deleted' && isWithinInterval(parseISO(p.date), { start: navigatorStart, end: navigatorEnd }))
      .reduce((sum, p) => sum + p.amount, 0)
    const remaining = Math.max(0, expected - collected)
    const pct = expected > 0 ? Math.min(100, Math.round((collected / expected) * 100)) : 0
    return { name: batch.name, students: bs.length, expected, collected, remaining, pct }
  })

  // Card D — Payment Mode (month-scoped + batch filter)
  const methodColors: Record<string, string> = { cash: '#059669', upi: '#3B6BE8', card: '#8B5CF6', other: '#94A3B8' }
  const pmStudents = pmBatch === 'all' ? activeStudents : activeStudents.filter(s => s.currentBatch === pmBatch)
  const paymentModeData = (['cash', 'upi', 'card', 'other'] as const).map(method => ({
    name:  method === 'upi' ? 'UPI' : method.charAt(0).toUpperCase() + method.slice(1),
    value: pmStudents
      .flatMap(s => s.paymentHistory || [])
      .filter(p => p.status !== 'deleted' && p.paymentMethod === method && isWithinInterval(parseISO(p.date), { start: navigatorStart, end: navigatorEnd }))
      .reduce((sum, p) => sum + p.amount, 0),
    color: methodColors[method],
  }))
  const totalMethodAmount = paymentModeData.reduce((sum, m) => sum + m.value, 0)
  const activePaymentModes = paymentModeData.filter(m => m.value > 0)

  // Card E — Outstanding Students
  const outstandingStudents = activeStudents
    .filter(s => (s.pendingAmount ?? 0) > 0 || s.status === 'expired')
    .map(s => ({
      id: s.id, name: s.name, batch: s.currentBatch,
      outstanding: (s.pendingAmount ?? 0) + (s.status === 'expired' ? s.fees : 0),
      nextDueDate: s.nextDueDate, status: s.status,
    }))
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 5)

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

      {/* Row 1: Monthly Revenue + Paid vs Pending */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Card A — Monthly Revenue */}
        <div className="bg-white border border-so-border rounded-xl p-5 shadow-sm lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div>
              <h3 className="font-semibold text-so-text">Monthly Revenue</h3>
              <p className="text-xs text-so-muted">Collected from coaching students</p>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <select value={revenueRange} onChange={e => setRevenueRange(e.target.value)} className={selectCls}>
                <option value="3m">Last 3 Months</option>
                <option value="6m">Last 6 Months</option>
                <option value="custom">Custom Range</option>
              </select>
              {revenueRange === 'custom' && (
                <div className="flex items-center gap-2">
                  <input type="month" value={customStart} onChange={e => setCustomStart(e.target.value)} className="px-2 py-1 border border-so-border rounded text-xs text-so-text" />
                  <span className="text-so-muted text-xs">to</span>
                  <input type="month" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="px-2 py-1 border border-so-border rounded text-xs text-so-text" />
                  {customStart && customEnd && differenceInMonths(parseISO(customEnd), parseISO(customStart)) > 5 && (
                    <span className="text-red-500 text-[10px] ml-1">Max 6 months</span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={val => `₹${val / 1000}k`} />
                <Tooltip formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }} />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={50}>
                  {revenueData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isCurrent ? '#3B6BE8' : '#BFCFF7'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card B — Paid vs Pending */}
        <div className="bg-white border border-so-border rounded-xl p-5 shadow-sm lg:col-span-1 flex flex-col">
          <div className="mb-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-so-text">Paid vs Pending</h3>
              <select value={pvpBatch} onChange={e => setPvpBatch(e.target.value)} className={selectCls}>
                <option value="all">All Batches</option>
                {mockBatches.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center relative min-h-[160px]">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pvpDonutData} cx="50%" cy="50%" innerRadius={65} outerRadius={88} paddingAngle={2} dataKey="value" stroke="none">
                  {pvpDonutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === 'Paid' ? '#3B6BE8' : '#EF4444'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-2 mt-4">
              <span className="text-xl font-bold text-so-text">₹{(paidAmount + pendingAmount).toLocaleString('en-IN')}</span>
              <span className="text-xs text-so-muted">Total</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-so-border space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-so-accent" />
                <span className="text-sm font-medium text-so-text">Paid</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-so-text">₹{paidAmount.toLocaleString('en-IN')}</span>
                <span className="text-xs text-so-muted ml-2">{paidStudentCount} students</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-so-red" />
                <span className="text-sm font-medium text-so-text">Pending</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-so-text">₹{pendingAmount.toLocaleString('en-IN')}</span>
                <span className="text-xs text-so-muted ml-2">{pendingStudentCount} students</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Batch Revenue + Payment Mode (shared monthly navigator) */}
      <div className="bg-white border border-so-border rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-so-border bg-so-surface/40">
          <div>
            <h3 className="font-semibold text-so-text">Batch Revenue &amp; Payment Mode</h3>
            <p className="text-xs text-so-muted mt-0.5">Fee collection filtered by selected month</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setMonthOffset(o => o + 1)} className="p-1.5 rounded-lg hover:bg-so-surface border border-so-border text-so-muted hover:text-so-text transition-colors" aria-label="Previous month">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-so-text min-w-[120px] text-center select-none">{navigatorLabel}</span>
            <button onClick={() => setMonthOffset(o => Math.max(0, o - 1))} disabled={monthOffset === 0} className="p-1.5 rounded-lg hover:bg-so-surface border border-so-border text-so-muted hover:text-so-text transition-colors disabled:opacity-30 disabled:cursor-not-allowed" aria-label="Next month">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3">
          {/* Card C — Batch Revenue */}
          <div className="lg:col-span-2 p-5 border-b lg:border-b-0 lg:border-r border-so-border">
            <p className="text-xs font-semibold text-so-muted uppercase tracking-wider mb-5">Batch Revenue</p>
            <div className="space-y-5">
              {batchRevenueData.map((batch, idx) => (
                <div key={idx} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-end">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-so-text">{batch.name}</span>
                      <span className="text-xs text-so-muted">{batch.students} students</span>
                    </div>
                    <span className={`text-sm font-bold ${batch.pct >= 80 ? 'text-so-emerald' : batch.pct >= 50 ? 'text-so-yellow' : 'text-so-red'}`}>{batch.pct}%</span>
                  </div>
                  <div className="h-2 w-full bg-so-surface rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${batch.pct >= 80 ? 'bg-so-emerald' : batch.pct >= 50 ? 'bg-so-yellow' : 'bg-so-red'}`} style={{ width: `${batch.pct}%` }} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                    <span className="text-so-emerald font-medium">₹{batch.collected.toLocaleString('en-IN')} collected</span>
                    <span className="text-so-muted">·</span>
                    <span className="text-so-muted">₹{batch.expected.toLocaleString('en-IN')} expected</span>
                    <span className="text-so-muted">·</span>
                    <span className={batch.remaining > 0 ? 'text-so-red font-medium' : 'text-so-muted'}>₹{batch.remaining.toLocaleString('en-IN')} remaining</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <div className="h-px bg-so-border w-full mb-4" />
              <h4 className="text-xs font-semibold text-so-muted uppercase tracking-wider mb-3">Payment Watch</h4>
              <div className="flex flex-wrap gap-4 items-center bg-so-surface/50 p-4 rounded-xl border border-so-border">
                <div className="flex-1 min-w-[120px]">
                  <p className="text-xs text-so-muted mb-0.5">Total Expected</p>
                  <p className="text-lg font-bold text-so-text">₹{batchRevenueData.reduce((s, b) => s + b.expected, 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="flex-1 min-w-[120px] border-l border-so-border pl-4">
                  <p className="text-xs text-so-muted mb-0.5">Total Collected</p>
                  <p className="text-lg font-bold text-so-emerald">₹{batchRevenueData.reduce((s, b) => s + b.collected, 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="flex-1 min-w-[120px] border-l border-so-border pl-4">
                  <p className="text-xs text-so-muted mb-0.5">Total Remaining</p>
                  <p className="text-lg font-bold text-so-red">₹{batchRevenueData.reduce((s, b) => s + b.remaining, 0).toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card D — Payment Mode */}
          <div className="lg:col-span-1 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-so-muted uppercase tracking-wider">Payment Mode</p>
              <select value={pmBatch} onChange={e => setPmBatch(e.target.value)} className={selectCls}>
                <option value="all">All Batches</option>
                {mockBatches.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
              </select>
            </div>
            {totalMethodAmount === 0 ? (
              <div className="h-48 w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[{ value: 1 }]} cx="50%" cy="50%" innerRadius={50} outerRadius={70} stroke="none" fill="#f1f5f9" dataKey="value" isAnimationActive={false} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute text-center pointer-events-none">
                  <span className="text-xs text-so-muted font-medium">No payments</span>
                </div>
              </div>
            ) : (
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={activePaymentModes} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
                      {activePaymentModes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-4 space-y-2">
              {paymentModeData.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                    <span className="text-sm text-so-text">{m.name}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-so-text">₹{m.value.toLocaleString('en-IN')}</span>
                    <span className="text-xs text-so-muted ml-1 w-10 inline-block text-right">({totalMethodAmount > 0 ? Math.round((m.value / totalMethodAmount) * 100) : 0}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Outstanding Students */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white border border-so-border rounded-xl p-5 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-so-text">Top Outstanding Balances</h3>
              <p className="text-xs text-so-muted">Students with highest pending dues</p>
            </div>
            <AlertCircle className="w-5 h-5 text-so-red" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-so-surface border-b border-so-border">
                  <th className="text-left px-4 py-2 text-xs font-medium text-so-muted uppercase">Name</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-so-muted uppercase">Batch</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-so-muted uppercase">Outstanding</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-so-muted uppercase">Due Date</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-so-muted uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-so-border">
                {outstandingStudents.length > 0 ? (
                  outstandingStudents.map(student => (
                    <tr key={student.id} className="hover:bg-so-surface/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-so-text">{student.name}</td>
                      <td className="px-4 py-3 text-so-muted text-sm">{student.batch}</td>
                      <td className="px-4 py-3 font-semibold text-so-red">₹{student.outstanding.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-so-muted">{format(parseISO(student.nextDueDate), 'dd MMM yyyy')}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${student.status === 'expired' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                          {student.status.replace('-', ' ').toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-so-muted italic">All students are up to date ✓</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  )
}
