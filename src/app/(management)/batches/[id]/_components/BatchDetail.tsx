'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Clock } from 'lucide-react'
import type { AttendanceRecord } from '@/lib/types/attendance'
import type { Batch } from '@/lib/types/batches'
import type { Student } from '@/lib/types/students'
import { getTodayIST } from '@/lib/utils'
import BatchAttendanceTab from './BatchAttendanceTab'
import BatchStudentsTab from './BatchStudentsTab'
import BatchTransactionsTab from './BatchTransactionsTab'
import useBatchAttendance from './attendance/useBatchAttendance'
import { getBatchNavigation } from './attendance/attendance-utils'
import type { BatchTab } from './attendance/attendance-utils'

interface BatchDetailProps {
  batch: Batch
  batches: Batch[]
  attendanceStudents: Student[]
  historyStudents: Student[]
  attendance: AttendanceRecord[]
  initialTab?: string
  initialDate?: string
  initialMode?: string
}

export default function BatchDetail({
  batch, batches, attendanceStudents, historyStudents, attendance,
  initialTab, initialDate, initialMode,
}: BatchDetailProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const todayStr = getTodayIST()
  const navigation = getBatchNavigation(
    searchParams?.get('tab') ?? initialTab,
    searchParams?.get('date') ?? initialDate,
    searchParams?.get('mode') ?? initialMode,
    todayStr,
  )
  const [selection, setSelection] = useState<{ key: string; tab: BatchTab }>(() => ({
    key: navigation.key, tab: navigation.tab ?? 'attendance',
  }))
  if (selection.key !== navigation.key) {
    setSelection({ key: navigation.key, tab: navigation.tab ?? selection.tab })
  }
  const activeTab = selection.tab
  const setActiveTab = (tab: BatchTab) => setSelection({ key: navigation.key, tab })

  // This hook stays mounted for every tab, preserving attendance drafts and view state.
  const attendanceController = useBatchAttendance({ batch, attendanceStudents, attendance, todayStr, navigation })
  const { toast } = attendanceController
  const enrolledCount = historyStudents.filter(student => student.status !== 'dropout').length

  return (
    <div className="p-6 max-w-7xl mx-auto relative pb-24">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-50 text-emerald-600 border border-emerald-200 px-4 py-2 rounded-full font-medium shadow-md flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/batches')}
          className="flex items-center gap-2 text-so-muted hover:text-so-text mb-4 transition-colors w-fit text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Batches
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-so-text mb-2">{batch.name}</h1>
            <div className="flex flex-wrap gap-2 mb-3">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(shortDay => {
                const isSelected = batch.days.some(d => d.startsWith(shortDay))
                if (!isSelected) return null
                return (
                  <span key={shortDay} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-so-accent/10 text-so-accent border border-so-accent/20 uppercase tracking-wider">
                    {shortDay}
                  </span>
                )
              })}
            </div>
            <div className="flex items-center gap-4 text-sm text-so-muted">
              {batch.description && (
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4"/> {batch.description}</span>
              )}
              {batch.fees && (
                <span className="flex items-center gap-1.5 font-medium text-emerald-600 border-l border-so-border pl-4">₹{batch.fees.toLocaleString('en-IN')}/mo</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-so-surface border border-so-border rounded-lg shadow-sm">
            <span className="text-xl font-bold text-so-text">{enrolledCount}</span>
            <span className="text-xs text-so-muted uppercase font-medium">Students</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-so-border mb-6">
        {(['attendance', 'students', 'transactions'] as BatchTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? 'border-so-accent text-so-accent'
                : 'border-transparent text-so-muted hover:text-so-text'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'attendance' && <BatchAttendanceTab controller={attendanceController} />}
      {activeTab === 'students' && <BatchStudentsTab batch={batch} batches={batches} students={historyStudents} />}
      {activeTab === 'transactions' && <BatchTransactionsTab batch={batch} students={historyStudents} />}
    </div>
  )
}
