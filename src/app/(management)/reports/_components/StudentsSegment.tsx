'use client'

import React, { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts'
import { mockStudents } from '@/lib/mock-data'
import { subMonths, format, parseISO, differenceInMonths } from 'date-fns'
import { calcAge, formatDate } from '@/lib/utils'

// Theme Colors
const ACCENT_COLOR = '#3B6BE8'
const RED_COLOR = '#ef4444'
const GREEN_COLOR = '#22c55e'

// --- MOCK DATA ---
const enrollmentTrendData = [
  { name: 'Oct', students: 120 },
  { name: 'Nov', students: 125 },
  { name: 'Dec', students: 130 },
  { name: 'Jan', students: 135 },
  { name: 'Feb', students: 142 },
  { name: 'Mar', students: 150 },
  { name: 'Apr', students: 148 },
  { name: 'May', students: 155 },
  { name: 'Jun', students: 165 },
  { name: 'Jul', students: 172 },
  { name: 'Aug', students: 180 },
  { name: 'Sep', students: 185 },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-so-border rounded-lg shadow-md p-3 text-sm">
        <p className="font-semibold text-so-text mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <p className="text-so-muted">
              {entry.name}: <span className="font-medium text-so-text">
                {entry.name.toLowerCase().includes('revenue') || entry.name.toLowerCase().includes('amount') 
                  ? `₹${entry.value.toLocaleString('en-IN')}` 
                  : entry.value}
                {entry.name.toLowerCase().includes('rate') || entry.name.toLowerCase().includes('attendance') ? '%' : ''}
              </span>
            </p>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export default function StudentsSegment() {
  const [growthRange, setGrowthRange] = useState<'3m' | '6m' | 'custom'>('6m')
  const [growthCustomStart, setGrowthCustomStart] = useState('')
  const [growthCustomEnd, setGrowthCustomEnd] = useState('')

  const getGrowthMonths = () => {
    if (growthRange === '3m' || growthRange === '6m') {
      const count = growthRange === '3m' ? 3 : 6
      return Array.from({ length: count }, (_, i) => {
        const d = subMonths(new Date(), count - 1 - i)
        return { label: format(d, 'MMM yy'), monthStr: format(d, 'yyyy-MM') }
      })
    }
    if (growthCustomStart && growthCustomEnd) {
      const s = parseISO(growthCustomStart), e = parseISO(growthCustomEnd)
      const diff = Math.min(differenceInMonths(e, s), 5)
      return Array.from({ length: diff + 1 }, (_, i) => {
        const d = subMonths(e, diff - i)
        return { label: format(d, 'MMM yy'), monthStr: format(d, 'yyyy-MM') }
      })
    }
    return []
  }

  const growthData = getGrowthMonths().map(({ label, monthStr }) => ({
    name: label,
    new: mockStudents.filter(s => s.startDate?.startsWith(monthStr)).length,
    exits: mockStudents.filter(s => s.status === 'dropout' && s.dropoutDate?.startsWith(monthStr)).length,
  }))

  const ageBuckets = [
    { label: 'Under 9', min: 0, max: 8 },
    { label: '9–12',   min: 9, max: 12 },
    { label: '13–17',  min: 13, max: 17 },
    { label: '18–21',  min: 18, max: 21 },
    { label: '22+',    min: 22, max: 999 },
  ]
  const activeWithAge = mockStudents.filter(s => s.dateOfBirth && !['inactive','dropout'].includes(s.status))
  const ageData = ageBuckets.map(b => ({
    label: b.label,
    count: activeWithAge.filter(s => {
      const age = s.dateOfBirth ? calcAge(s.dateOfBirth) : -1
      return age >= b.min && age <= b.max
    }).length,
  }))
  const maxAgeCount = Math.max(...ageData.map(d => d.count), 1)

  const SOURCE_CONFIG = [
    { key: 'walk-in',      label: 'Walk-in',      color: '#3B6BE8' },
    { key: 'referral',     label: 'Referral',      color: '#059669' },
    { key: 'social-media', label: 'Social Media',  color: '#8B5CF6' },
    { key: 'other',        label: 'Other',         color: '#94A3B8' },
  ] as const

  const sourcesData = SOURCE_CONFIG.map(s => ({
    ...s,
    value: mockStudents.filter(st => st.enrollmentSource === s.key && !['inactive','dropout'].includes(st.status)).length,
  })).filter(d => d.value > 0)

  const recentDropouts = mockStudents
    .filter(s => s.status === 'dropout')
    .sort((a, b) => (b.dropoutDate ?? '').localeCompare(a.dropoutDate ?? ''))

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Enrollment Trend */}
        <div className="bg-white border border-so-border rounded-xl p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="font-semibold text-so-text">Active Students Trend</h3>
            <p className="text-xs text-so-muted">Total enrollments over 12 months</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={enrollmentTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="students" stroke={ACCENT_COLOR} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Net Growth */}
        <div className="bg-white border border-so-border rounded-xl p-5 shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-semibold text-so-text">Net Growth</h3>
              <p className="text-xs text-so-muted">New enrollments vs exits</p>
            </div>
            <div className="flex items-center gap-1 bg-so-surface border border-so-border rounded-lg p-1">
              <button onClick={() => setGrowthRange('3m')} className={`px-2 py-1 text-xs font-medium rounded-md ${growthRange === '3m' ? 'bg-white shadow-sm' : 'text-so-muted hover:text-so-text'}`}>3m</button>
              <button onClick={() => setGrowthRange('6m')} className={`px-2 py-1 text-xs font-medium rounded-md ${growthRange === '6m' ? 'bg-white shadow-sm' : 'text-so-muted hover:text-so-text'}`}>6m</button>
              <button onClick={() => setGrowthRange('custom')} className={`px-2 py-1 text-xs font-medium rounded-md ${growthRange === 'custom' ? 'bg-white shadow-sm' : 'text-so-muted hover:text-so-text'}`}>Custom</button>
            </div>
          </div>

          {growthRange === 'custom' && (
            <div className="flex items-center gap-2 mb-4 bg-so-surface p-2 rounded-lg border border-so-border text-sm">
              <input type="month" value={growthCustomStart} onChange={e => setGrowthCustomStart(e.target.value)} className="bg-white border border-so-border rounded-md px-2 py-1 focus:outline-none" />
              <span className="text-so-muted">to</span>
              <input type="month" value={growthCustomEnd} onChange={e => setGrowthCustomEnd(e.target.value)} className="bg-white border border-so-border rounded-md px-2 py-1 focus:outline-none" />
            </div>
          )}

          <div className="h-64 w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} iconType="circle" />
                <Bar dataKey="new" name="New Enrollments" fill={GREEN_COLOR} radius={[4, 4, 0, 0]} />
                <Bar dataKey="exits" name="Exits / Dropouts" fill={RED_COLOR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Age Distribution */}
        <div className="bg-white border border-so-border rounded-xl p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="font-semibold text-so-text">Student Age Distribution</h3>
            <p className="text-xs text-so-muted">Age groups across active students</p>
          </div>
          <div className="space-y-4">
            {ageData.map((d, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-16 text-sm text-so-text">{d.label}</div>
                <div className="flex-1 bg-so-surface rounded-full h-3 overflow-hidden">
                  <div className="bg-so-accent h-full rounded-full transition-all" style={{ width: d.count > 0 ? `${(d.count / maxAgeCount) * 100}%` : '0%' }} />
                </div>
                <div className="w-8 text-right text-sm font-semibold text-so-text">{d.count}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-so-muted mt-5 text-center border-t border-so-border pt-4">
            {activeWithAge.length} students with date of birth recorded
          </p>
        </div>

        {/* Enrollment Sources */}
        <div className="bg-white border border-so-border rounded-xl p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="font-semibold text-so-text">Enrollment Sources</h3>
            <p className="text-xs text-so-muted">How new students found the academy</p>
          </div>
          {sourcesData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-so-muted">
              No source data recorded yet. Add source when enrolling new students.
            </div>
          ) : (
            <div className="h-64 flex flex-col justify-between">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sourcesData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
                      {sourcesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-2">
                {sourcesData.map((s, i) => {
                  const total = sourcesData.reduce((acc, curr) => acc + curr.value, 0)
                  const percent = Math.round((s.value / total) * 100)
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-so-muted">{s.label}</span>
                      <span className="font-medium text-so-text">{s.value} ({percent}%)</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Recent Dropouts */}
        <div className="bg-white border border-so-border rounded-xl p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-so-text">Recent Dropouts</h3>
              <p className="text-xs text-so-muted">Students who left the program</p>
            </div>
            <div className="bg-red-50 text-red-600 rounded-full px-2 py-0.5 text-xs font-medium border border-red-100">
              {recentDropouts.length} students
            </div>
          </div>
          
          <div className="overflow-x-auto">
            {recentDropouts.length === 0 ? (
              <div className="py-8 text-center text-sm text-so-muted">
                No dropouts recorded.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-so-surface border-b border-so-border">
                    <th className="text-left px-4 py-2 text-xs font-medium text-so-muted uppercase">Name</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-so-muted uppercase">Phone</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-so-muted uppercase">Guardian</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-so-muted uppercase">Date</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-so-muted uppercase">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-so-border">
                  {recentDropouts.map((student) => (
                    <tr key={student.id} className="hover:bg-so-surface/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-so-text">{student.name}</td>
                      <td className="px-4 py-3 text-so-muted">{student.phone}</td>
                      <td className="px-4 py-3 text-so-muted">{student.guardianName || '—'}</td>
                      <td className="px-4 py-3 text-so-text">{student.dropoutDate ? formatDate(student.dropoutDate) : '—'}</td>
                      <td className="px-4 py-3 text-so-text">{student.dropoutReason || <span className="text-so-muted">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
