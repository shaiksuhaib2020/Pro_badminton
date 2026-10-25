'use client'
import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { mockAttendance, mockBatches, mockStudents } from '@/lib/mock-data'
import {
  parseISO, format, subDays, subMonths,
  startOfWeek, startOfMonth, endOfMonth,
  isWithinInterval
} from 'date-fns'
import { getTodayIST, formatDate } from '@/lib/utils'

type FilterKey = 'today'|'yesterday'|'this-week'|'this-month'|'last-month'|'custom'

function FilterSelect({ value, onChange }: { value: FilterKey; onChange: (v: FilterKey) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as FilterKey)}
      className="text-xs border border-so-border rounded-lg px-2 py-1.5 bg-so-surface text-so-text focus:outline-none focus:ring-1 focus:ring-so-accent cursor-pointer"
    >
      <option value="today">Today</option>
      <option value="yesterday">Yesterday</option>
      <option value="this-week">This Week</option>
      <option value="this-month">This Month</option>
      <option value="last-month">Last Month</option>
      <option value="custom">Custom</option>
    </select>
  )
}

export default function AttendanceSegment() {
  // Card 1 — batch bar chart
  const [barFilter, setBarFilter]         = useState<FilterKey>('this-month')
  const [barCStart, setBarCStart]         = useState('')
  const [barCEnd, setBarCEnd]             = useState('')

  // Card 2 — present/absent donut
  const [donutFilter, setDonutFilter]     = useState<FilterKey>('this-month')
  const [donutCStart, setDonutCStart]     = useState('')
  const [donutCEnd, setDonutCEnd]         = useState('')

  // Card 3 — overview
  const now = new Date()
  const [ovMonth, setOvMonth]             = useState(now.getMonth())      // 0-indexed
  const [ovYear,  setOvYear]              = useState(now.getFullYear())
  const [threshold, setThreshold]         = useState<50|60|70|80|'custom'>(70)
  const [customPct, setCustomPct]         = useState(75)
  const [topN, setTopN]                   = useState<3|5|10>(5)

  // Range helper
  const getRange = (f: FilterKey, cs = '', ce = '') => {
    const today = getTodayIST()
    const d     = parseISO(today)
    switch (f) {
      case 'today':      return { start: today, end: today }
      case 'yesterday':  { const y = format(subDays(d,1),'yyyy-MM-dd'); return { start:y, end:y } }
      case 'this-week':  return { start: format(startOfWeek(d,{weekStartsOn:1}),'yyyy-MM-dd'), end: today }
      case 'this-month': return { start: format(startOfMonth(d),'yyyy-MM-dd'), end: today }
      case 'last-month': {
        const lm = subMonths(d,1)
        return { start: format(startOfMonth(lm),'yyyy-MM-dd'), end: format(endOfMonth(lm),'yyyy-MM-dd') }
      }
      case 'custom': return { start: cs||today, end: ce||today }
    }
  }

  const inRange = (date: string, start: string, end: string) => date >= start && date <= end

  // Card 1 derived
  const barRange = getRange(barFilter, barCStart, barCEnd)
  const batchBarData = mockBatches.map(batch => {
    const recs = mockAttendance.filter(r =>
      r.batchId === batch.id && inRange(r.date, barRange.start, barRange.end)
    )
    let present = 0, total = 0
    recs.forEach(r => Object.values(r.records).forEach(s => { total++; if (s==='present') present++ }))
    return {
      name: batch.name,
      rate: total > 0 ? Math.round((present / total) * 100) : 0,
      sessions: recs.length,
    }
  })

  // Card 2 derived
  const donutRange = getRange(donutFilter, donutCStart, donutCEnd)
  const donutRecs = mockAttendance.filter(r => inRange(r.date, donutRange.start, donutRange.end))
  let dPresent = 0, dAbsent = 0
  const presentIds = new Set<string>(), absentIds = new Set<string>()

  donutRecs.forEach(r =>
    Object.entries(r.records).forEach(([id, status]) => {
      if (status === 'present') { dPresent++; presentIds.add(id) }
      else                      { dAbsent++;  absentIds.add(id)  }
    })
  )

  const dTotal    = dPresent + dAbsent
  const dPresentPct = dTotal > 0 ? Math.round((dPresent / dTotal) * 100) : 0
  const dAbsentPct  = dTotal > 0 ? 100 - dPresentPct : 0

  const donutData = [
    { name: 'Present', value: dPresent, color: '#059669' },
    { name: 'Absent',  value: dAbsent,  color: '#DC2626' },
  ].filter(d => d.value > 0)

  // Card 3 derived
  const currentMonth = now.getMonth(), currentYear = now.getFullYear()
  const canGoNext = !(ovMonth === currentMonth && ovYear === currentYear)

  const prevMonth = () => {
    if (ovMonth === 0) { setOvMonth(11); setOvYear(y => y-1) }
    else setOvMonth(m => m-1)
  }
  const nextMonth = () => {
    if (!canGoNext) return
    if (ovMonth === 11) { setOvMonth(0); setOvYear(y => y+1) }
    else setOvMonth(m => m+1)
  }

  const ovMonthStr = `${ovYear}-${String(ovMonth+1).padStart(2,'0')}`
  const activePct  = threshold === 'custom' ? customPct : Number(threshold)

  const ovRecs = mockAttendance.filter(r => r.date.startsWith(ovMonthStr))
  const activeStudents = mockStudents.filter(s => !['inactive','dropout'].includes(s.status))

  const studentRates = activeStudents.map(s => {
    let present = 0, total = 0
    ovRecs.forEach(r => {
      if (r.records[s.id] !== undefined) {
        total++
        if (r.records[s.id] === 'present') present++
      }
    })
    return { student: s, rate: total > 0 ? Math.round((present/total)*100) : null }
  })
  .filter(r => r.rate !== null && r.rate < activePct)
  .sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0))
  .slice(0, Number(topN))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-so-border rounded-lg shadow-md p-3 text-sm">
          <p className="font-semibold text-so-text mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.payload.color || entry.color }} />
              <p className="text-so-muted">
                {entry.name}: <span className="font-medium text-so-text">
                  {entry.value}{entry.name === 'Attendance %' ? '%' : ''}
                </span>
              </p>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card 1: Batch-wise Attendance */}
        <div className="bg-white border border-so-border rounded-xl p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-so-text">Batch-wise Attendance</h3>
              <p className="text-xs text-so-muted">Avg attendance % per batch</p>
            </div>
            <FilterSelect value={barFilter} onChange={setBarFilter} />
          </div>
          
          {barFilter === 'custom' && (
            <div className="flex items-center gap-2 mb-4 bg-so-surface p-2 rounded-lg border border-so-border text-sm">
              <input type="date" value={barCStart} onChange={e => setBarCStart(e.target.value)} className="bg-white border border-so-border rounded-md px-2 py-1 focus:outline-none" />
              <span className="text-so-muted">to</span>
              <input type="date" value={barCEnd} onChange={e => setBarCEnd(e.target.value)} className="bg-white border border-so-border rounded-md px-2 py-1 focus:outline-none" />
            </div>
          )}

          <div className="h-[220px] w-full mt-auto">
            {batchBarData.every(d => d.rate === 0) ? (
              <div className="h-full flex items-center justify-center text-sm text-so-muted">
                No attendance data for this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={batchBarData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `${val}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="rate" name="Attendance %" radius={[4, 4, 0, 0]}>
                    {batchBarData.map((entry, index) => {
                      const color = entry.rate >= 80 ? '#059669' : entry.rate >= 60 ? '#D97706' : '#DC2626'
                      return <Cell key={`cell-${index}`} fill={color} />
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Card 2: Present vs Absent */}
        <div className="bg-white border border-so-border rounded-xl p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-so-text">Present vs Absent</h3>
              <p className="text-xs text-so-muted">Overall student attendance</p>
            </div>
            <FilterSelect value={donutFilter} onChange={setDonutFilter} />
          </div>

          {donutFilter === 'custom' && (
            <div className="flex items-center gap-2 mb-4 bg-so-surface p-2 rounded-lg border border-so-border text-sm">
              <input type="date" value={donutCStart} onChange={e => setDonutCStart(e.target.value)} className="bg-white border border-so-border rounded-md px-2 py-1 focus:outline-none" />
              <span className="text-so-muted">to</span>
              <input type="date" value={donutCEnd} onChange={e => setDonutCEnd(e.target.value)} className="bg-white border border-so-border rounded-md px-2 py-1 focus:outline-none" />
            </div>
          )}

          {dTotal === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-sm text-so-muted mt-auto">
              No attendance data for this period.
            </div>
          ) : (
            <div className="flex-1 flex flex-col mt-auto">
              <div className="h-[180px] relative w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={65} outerRadius={88} paddingAngle={2} dataKey="value" stroke="none">
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-so-text">{dPresentPct}%</span>
                  <span className="text-xs text-so-muted">Present</span>
                </div>
              </div>

              <div className="mt-4 space-y-2 px-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#059669]"></div>
                    <span className="text-sm font-semibold text-so-text">Present</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-so-text">{dPresentPct}%</span>
                    <span className="text-xs text-so-muted w-20 text-right">{presentIds.size} students</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#DC2626]"></div>
                    <span className="text-sm font-semibold text-so-text">Absent</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-so-text">{dAbsentPct}%</span>
                    <span className="text-xs text-so-muted w-20 text-right">{absentIds.size} students</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 2 */}
      {/* Card 3: Attendance Overview */}
      <div className="bg-white border border-so-border rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <h3 className="font-semibold text-so-text">Attendance Overview</h3>
            <p className="text-xs text-so-muted">Students below threshold</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-so-surface border border-so-border rounded-lg px-2 py-1">
              <select
                value={threshold}
                onChange={e => setThreshold(e.target.value as any)}
                className="bg-transparent text-xs text-so-text focus:outline-none cursor-pointer"
              >
                <option value={50}>Below 50%</option>
                <option value={60}>Below 60%</option>
                <option value={70}>Below 70%</option>
                <option value={80}>Below 80%</option>
                <option value="custom">Custom...</option>
              </select>
              {threshold === 'custom' && (
                <input
                  type="number"
                  min={1} max={100}
                  value={customPct}
                  onChange={e => setCustomPct(Number(e.target.value))}
                  className="w-12 bg-white border border-so-border rounded text-xs px-1 py-0.5 text-center focus:outline-none focus:border-so-accent"
                />
              )}
            </div>
            <select
              value={topN}
              onChange={e => setTopN(Number(e.target.value) as any)}
              className="bg-so-surface border border-so-border rounded-lg px-2 py-1 text-xs text-so-text focus:outline-none cursor-pointer"
            >
              <option value={3}>Top 3</option>
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col items-center sm:items-start mb-6">
          <div className="flex items-center gap-3 bg-so-surface rounded-lg p-1 border border-so-border">
            <button onClick={prevMonth} className="p-1 hover:bg-white rounded hover:shadow-sm transition-all text-so-muted hover:text-so-text"><ChevronLeft size={16} /></button>
            <span className="text-sm font-semibold text-so-text w-32 text-center">
              {format(new Date(ovYear, ovMonth), 'MMMM yyyy')}
            </span>
            <button onClick={nextMonth} disabled={!canGoNext}
              className={`p-1 rounded transition-all ${!canGoNext ? 'opacity-30 cursor-not-allowed text-so-muted' : 'hover:bg-white hover:shadow-sm text-so-muted hover:text-so-text'}`}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {studentRates.length === 0 ? (
          <div className="py-12 text-center text-sm text-so-muted bg-so-surface/30 rounded-xl border border-dashed border-so-border">
            No students below {activePct}% attendance in {format(new Date(ovYear, ovMonth), 'MMMM yyyy')}.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-[2rem_1fr_1fr_3rem] gap-4 px-4 py-2 text-xs font-semibold text-so-muted uppercase tracking-wider border-b border-so-border mb-2">
              <div>#</div>
              <div>Name</div>
              <div>Batch</div>
              <div className="text-right">Rate</div>
            </div>
            {studentRates.map((s, idx) => {
              const rateColor = (s.rate ?? 0) < 60 ? 'text-so-red' : (s.rate ?? 0) < 70 ? 'text-amber-600' : 'text-so-text'
              return (
                <div key={s.student.id} className="grid grid-cols-[2rem_1fr_1fr_3rem] gap-4 px-4 py-3 bg-so-surface/50 rounded-lg items-center border border-so-border/50 hover:bg-so-surface transition-colors">
                  <div className="text-xs font-semibold text-so-muted">{idx + 1}</div>
                  <div className="text-sm font-medium text-so-text truncate">{s.student.name}</div>
                  <div className="text-sm text-so-muted truncate">{s.student.currentBatch}</div>
                  <div className={`text-sm font-bold text-right ${rateColor}`}>{s.rate}%</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
