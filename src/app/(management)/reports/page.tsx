'use client'
import { useState } from 'react'
import { PieChart, Users, Calendar } from 'lucide-react'
import FeesSegment from './_components/FeesSegment'
import StudentsSegment from './_components/StudentsSegment'
import AttendanceSegment from './_components/AttendanceSegment'

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'fees' | 'students' | 'attendance'>('fees')

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-so-text tracking-tight">Reports & Analysis</h1>
        <p className="text-sm text-so-muted mt-1">Track key metrics across financials, enrollments, and attendance.</p>
      </div>

      {/* Segment Tabs */}
      <div className="inline-flex bg-so-surface p-1 rounded-lg border border-so-border overflow-x-auto w-full md:w-auto">
        {[
          { key: 'fees',       label: 'Fees',       icon: PieChart },
          { key: 'students',   label: 'Students',   icon: Users    },
          { key: 'attendance', label: 'Attendance', icon: Calendar },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === key ? 'bg-so-accent text-white shadow-sm' : 'text-so-muted hover:text-so-text'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Segment Content */}
      {activeTab === 'fees'       && <FeesSegment />}
      {activeTab === 'students'   && <StudentsSegment />}
      {activeTab === 'attendance' && <AttendanceSegment />}
    </div>
  )
}
