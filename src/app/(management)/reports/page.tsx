'use client'

import React, { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, RadialBarChart, RadialBar, Legend
} from 'recharts'
import { TrendingUp, TrendingDown, AlertTriangle, AlertCircle, PieChart as PieIcon, Users, Calendar } from 'lucide-react'

// Theme Colors
const ACCENT_COLOR = '#0ea5e9' // bg-so-accent
const MUTED_COLOR = '#94a3b8' // bg-so-muted / border
const RED_COLOR = '#ef4444'
const GREEN_COLOR = '#22c55e'
const ORANGE_COLOR = '#f97316'
const PIE_COLORS = ['#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd']
const PIE_COLORS_MEMBERSHIP = ['#8b5cf6', '#a78bfa', '#c4b5fd']

// --- MOCK DATA ---

// Financial Data
const monthlyRevenueData = [
  { name: 'Jan', revenue: 45000 },
  { name: 'Feb', revenue: 52000 },
  { name: 'Mar', revenue: 48000 },
  { name: 'Apr', revenue: 61000 },
  { name: 'May', revenue: 59000 },
  { name: 'Jun', revenue: 65000 },
  { name: 'Jul', revenue: 72000 },
  { name: 'Aug', revenue: 68000 },
  { name: 'Sep', revenue: 85000 }, // Current month
  { name: 'Oct', revenue: 0 },
  { name: 'Nov', revenue: 0 },
  { name: 'Dec', revenue: 0 },
]

const collectionRateData = [
  { name: 'Collected', value: 85, fill: ACCENT_COLOR },
  { name: 'Pending', value: 15, fill: '#e2e8f0' } // remaining background
]

const paymentMethodData = [
  { name: 'UPI', value: 65 },
  { name: 'Cash', value: 25 },
  { name: 'Card', value: 10 },
]

const pendingDuesData = [
  { bucket: '0-30 days', amount: 15000, count: 12 },
  { bucket: '31-60 days', amount: 8500, count: 5 },
  { bucket: '60+ days', amount: 4200, count: 3 },
]

// Students Data
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

const netGrowthData = [
  { name: 'Apr', new: 15, exits: 5 },
  { name: 'May', new: 12, exits: 3 },
  { name: 'Jun', new: 20, exits: 8 },
  { name: 'Jul', new: 18, exits: 4 },
  { name: 'Aug', new: 22, exits: 6 },
  { name: 'Sep', new: 14, exits: 2 },
]

const membershipTypeData = [
  { name: 'Monthly', value: 120 },
  { name: 'Annual', value: 45 },
  { name: 'Session', value: 20 },
]

const batchCapacityData = [
  { name: 'Morning A', enrolled: 18, capacity: 20 },
  { name: 'Morning B', enrolled: 20, capacity: 20 },
  { name: 'Evening A', enrolled: 15, capacity: 20 },
  { name: 'Evening B', enrolled: 8, capacity: 20 },
  { name: 'Weekend Pro', enrolled: 22, capacity: 25 },
]

// Attendance Data
const batchAttendanceData = [
  { name: 'Morning A', rate: 85, previousRate: 82 },
  { name: 'Morning B', rate: 92, previousRate: 90 },
  { name: 'Evening A', rate: 78, previousRate: 80 },
  { name: 'Evening B', rate: 65, previousRate: 60 },
  { name: 'Weekend Pro', rate: 95, previousRate: 95 },
]

const atRiskStudents = [
  { id: '1', name: 'Rahul Sharma', batch: 'Evening B', attendance: 45, lastSeen: '2023-09-10' },
  { id: '2', name: 'Anjali Verma', batch: 'Evening A', attendance: 52, lastSeen: '2023-09-12' },
  { id: '3', name: 'Kabir Singh', batch: 'Morning A', attendance: 60, lastSeen: '2023-09-15' },
  { id: '4', name: 'Priya Patel', batch: 'Evening B', attendance: 65, lastSeen: '2023-09-18' },
  { id: '5', name: 'Amit Kumar', batch: 'Weekend Pro', attendance: 70, lastSeen: '2023-09-17' },
]

const daysAttendanceData = [
  { name: 'Mon', rate: 88 },
  { name: 'Tue', rate: 85 },
  { name: 'Wed', rate: 82 },
  { name: 'Thu', rate: 75 }, // "Thursdays are dead"
  { name: 'Fri', rate: 89 },
  { name: 'Sat', rate: 95 },
  { name: 'Sun', rate: 92 },
]

// Custom Tooltip for Recharts
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
                  ? `₹${entry.value.toLocaleString()}` 
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

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'financial' | 'students' | 'attendance'>('financial')

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-so-text tracking-tight">Reports & Analysis</h1>
          <p className="text-sm text-so-muted mt-1">Track key metrics across financials, enrollments, and attendance.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex bg-so-surface p-1 rounded-lg border border-so-border overflow-x-auto w-full md:w-auto">
        <button
          onClick={() => setActiveTab('financial')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === 'financial' ? 'bg-so-accent text-white shadow-sm' : 'text-so-muted hover:text-so-text'
          }`}
        >
          <PieIcon className="w-4 h-4" />
          Financial
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === 'students' ? 'bg-so-accent text-white shadow-sm' : 'text-so-muted hover:text-so-text'
          }`}
        >
          <Users className="w-4 h-4" />
          Students
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === 'attendance' ? 'bg-so-accent text-white shadow-sm' : 'text-so-muted hover:text-so-text'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Attendance
        </button>
      </div>

      {/* Financial Tab */}
      {activeTab === 'financial' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Monthly Revenue */}
            <div className="bg-white border border-so-border rounded-xl p-5 shadow-sm lg:col-span-2">
              <div className="mb-4">
                <h3 className="font-semibold text-so-text">Monthly Revenue</h3>
                <p className="text-xs text-so-muted">Revenue trends over the last 12 months</p>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyRevenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `₹${val/1000}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                      {monthlyRevenueData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.name === 'Sep' ? ACCENT_COLOR : '#cbd5e1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Fee Collection Rate */}
            <div className="bg-white border border-so-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-so-text">Fee Collection Rate</h3>
                <p className="text-xs text-so-muted">Current month collections vs expected</p>
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center py-6">
                <div className="relative w-40 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart 
                      cx="50%" cy="50%" 
                      innerRadius="75%" outerRadius="100%" 
                      barSize={15} data={collectionRateData} 
                      startAngle={90} endAngle={-270}
                    >
                      <RadialBar dataKey="value" cornerRadius={10} background />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-so-text">85%</span>
                  </div>
                </div>
                <p className="text-sm font-medium text-so-text mt-4">₹85,000 / ₹100,000</p>
                <p className="text-xs text-so-muted flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  +5% from last month
                </p>
              </div>
            </div>
            
            {/* Payment Method Breakdown */}
            <div className="bg-white border border-so-border rounded-xl p-5 shadow-sm">
              <div className="mb-2">
                <h3 className="font-semibold text-so-text">Payment Methods</h3>
                <p className="text-xs text-so-muted">Distribution of transaction types</p>
              </div>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={paymentMethodData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {paymentMethodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pending Dues Aging */}
            <div className="bg-white border border-so-border rounded-xl p-5 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-so-text">Pending Dues Aging</h3>
                  <p className="text-xs text-so-muted">Accounts receivable bucketed by overdue days</p>
                </div>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-so-surface border-b border-so-border">
                      <th className="text-left px-4 py-2 text-xs font-medium text-so-muted uppercase">Aging Bucket</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-so-muted uppercase">Members</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-so-muted uppercase">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-so-border">
                    {pendingDuesData.map((row, i) => {
                      const isCritical = row.bucket.includes('60+');
                      return (
                        <tr key={i} className="hover:bg-so-surface/40 transition-colors">
                          <td className={`px-4 py-3 font-medium ${isCritical ? 'text-red-600' : 'text-so-text'}`}>
                            {row.bucket}
                          </td>
                          <td className="px-4 py-3 text-so-muted">{row.count} students</td>
                          <td className={`px-4 py-3 text-right font-bold ${isCritical ? 'text-red-600' : 'text-so-text'}`}>
                            ₹{row.amount.toLocaleString()}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-so-border font-semibold">
                    <tr>
                      <td className="px-4 py-3 text-so-text">Total Pending</td>
                      <td className="px-4 py-3 text-so-muted">
                        {pendingDuesData.reduce((acc, curr) => acc + curr.count, 0)} students
                      </td>
                      <td className="px-4 py-3 text-right text-so-text">
                        ₹{pendingDuesData.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Students Tab */}
      {activeTab === 'students' && (
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
            <div className="bg-white border border-so-border rounded-xl p-5 shadow-sm">
              <div className="mb-4">
                <h3 className="font-semibold text-so-text">Net Growth (Last 6 Months)</h3>
                <p className="text-xs text-so-muted">New enrollments vs exits</p>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={netGrowthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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

            {/* Membership Type Distribution */}
            <div className="bg-white border border-so-border rounded-xl p-5 shadow-sm">
              <div className="mb-4">
                <h3 className="font-semibold text-so-text">Membership Types</h3>
                <p className="text-xs text-so-muted">Distribution of active plan types</p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={membershipTypeData} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={2} dataKey="value">
                      {membershipTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS_MEMBERSHIP[index % PIE_COLORS_MEMBERSHIP.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Batch Capacity Utilization */}
            <div className="bg-white border border-so-border rounded-xl p-5 shadow-sm">
              <div className="mb-4">
                <h3 className="font-semibold text-so-text">Batch Capacity Utilization</h3>
                <p className="text-xs text-so-muted">Enrolled students vs maximum capacity per batch</p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={batchCapacityData} layout="vertical" margin={{ top: 0, right: 10, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} width={80} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} iconType="circle" />
                    <Bar dataKey="enrolled" name="Enrolled" stackId="a" fill={ACCENT_COLOR} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="capacity" name="Available Space" stackId="a" fill="#e2e8f0" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Attendance Tab */}
      {activeTab === 'attendance' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Batch-wise Attendance Rate */}
            <div className="bg-white border border-so-border rounded-xl p-5 shadow-sm">
              <div className="mb-6">
                <h3 className="font-semibold text-so-text">Batch-wise Attendance (This Month)</h3>
                <p className="text-xs text-so-muted">Average attendance percentage per batch</p>
              </div>
              <div className="space-y-5">
                {batchAttendanceData.map((batch, idx) => {
                  const trendDiff = batch.rate - batch.previousRate;
                  const isUp = trendDiff > 0;
                  const isFlat = trendDiff === 0;
                  
                  return (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="w-24 shrink-0 text-sm font-medium text-so-text truncate" title={batch.name}>{batch.name}</div>
                      <div className="flex-1 h-3 bg-so-surface rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${batch.rate}%`,
                            backgroundColor: batch.rate > 80 ? GREEN_COLOR : batch.rate > 70 ? ORANGE_COLOR : RED_COLOR 
                          }}
                        />
                      </div>
                      <div className="w-12 text-right text-sm font-bold text-so-text">{batch.rate}%</div>
                      <div className="w-16 flex items-center justify-end text-xs font-medium">
                        {isFlat ? (
                          <span className="text-so-muted">-</span>
                        ) : isUp ? (
                          <span className="text-green-500 flex items-center"><TrendingUp className="w-3 h-3 mr-0.5" /> {Math.abs(trendDiff)}%</span>
                        ) : (
                          <span className="text-red-500 flex items-center"><TrendingDown className="w-3 h-3 mr-0.5" /> {Math.abs(trendDiff)}%</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Best/Worst Days */}
            <div className="bg-white border border-so-border rounded-xl p-5 shadow-sm">
              <div className="mb-4">
                <h3 className="font-semibold text-so-text">Average Attendance by Day</h3>
                <p className="text-xs text-so-muted">Identify scheduling efficiency across the week</p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={daysAttendanceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="rate" name="Avg Attendance %" radius={[4, 4, 0, 0]}>
                      {daysAttendanceData.map((entry, index) => {
                        let fill = ACCENT_COLOR;
                        if (entry.rate < 80) fill = ORANGE_COLOR;
                        if (entry.rate < 70) fill = RED_COLOR;
                        return <Cell key={`cell-${index}`} fill={fill} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* At-Risk Students Table */}
            <div className="bg-white border border-so-border rounded-xl p-5 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-so-text">At-Risk Students (Below 75% Attendance)</h3>
                  <p className="text-xs text-so-muted">Students who may require follow-up or are at risk of dropping out</p>
                </div>
                <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-so-surface border-b border-so-border">
                      <th className="text-left px-4 py-2 text-xs font-medium text-so-muted uppercase">Student Name</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-so-muted uppercase">Batch</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-so-muted uppercase">Attendance %</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-so-muted uppercase">Last Seen Date</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-so-muted uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-so-border">
                    {atRiskStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-so-surface/40 transition-colors">
                        <td className="px-4 py-3 font-medium text-so-text">{student.name}</td>
                        <td className="px-4 py-3 text-so-muted">{student.batch}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                            {student.attendance}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-so-muted">{student.lastSeen}</td>
                        <td className="px-4 py-3 text-right">
                          <button className="text-xs font-medium text-so-accent hover:underline">View Profile</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
