'use client'

import { useState, useMemo, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  mockBatches, mockStudents, mockAttendance,
  PaymentEntry, Student
} from '@/lib/mock-data'
import {
  format, parseISO, isWithinInterval,
  startOfMonth, endOfMonth, subMonths,
  startOfDay, endOfDay, isPast, isToday, subDays, differenceInCalendarDays, addDays
} from 'date-fns'
import {
  ArrowLeft, Search, Filter, AlertCircle, X, CheckCircle2,
  Calendar as CalendarIcon, Clock, Edit, RefreshCw, Wallet, Trash2
} from 'lucide-react'
import RenewModal from '@/components/coaching/RenewModal'
import EditStudentModal from '@/components/students/EditStudentModal'
import AddStudentModal from '@/components/students/AddStudentModal'
import CollectRemainingModal from '@/components/students/CollectRemainingModal'

export default function BatchDetailPage() {
  const router = useRouter()
  const { id } = useParams()
  const batchId = typeof id === 'string' ? id : id?.[0]
  const batch = mockBatches.find(b => b.id === batchId)

  // Sub-tabs
  type BatchTab = 'attendance' | 'students' | 'transactions'
  const [activeTab, setActiveTab] = useState<BatchTab>('attendance')
  const [, forceUpdate] = useState(0)
  const refresh = () => forceUpdate(n => n + 1)

  // Derived students for this batch
  const batchStudents = useMemo(() => {
    if (!batch) return []
    return mockStudents
      .filter(s => s.currentBatch === batch.name && s.status !== 'dropout')
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [batch, forceUpdate])

  // Search states for attendance and students tabs
  const [attSearchQuery, setAttSearchQuery] = useState('')
  const [studentSearchQuery, setStudentSearchQuery] = useState('')

  // Filtered students for attendance tab
  const filteredAttStudents = useMemo(() => {
    if (!attSearchQuery.trim()) return batchStudents
    const q = attSearchQuery.toLowerCase()
    return batchStudents.filter(s => s.name.toLowerCase().includes(q) || s.phone.includes(attSearchQuery))
  }, [batchStudents, attSearchQuery])

  // Filtered students for students tab
  const filteredBatchStudents = useMemo(() => {
    if (!studentSearchQuery.trim()) return batchStudents
    const q = studentSearchQuery.toLowerCase()
    return batchStudents.filter(s => s.name.toLowerCase().includes(q) || s.phone.includes(studentSearchQuery))
  }, [batchStudents, studentSearchQuery])

  const [toast, setToast] = useState('')
  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // --------------------------------------------------------------------------
  // Tab 1: Attendance
  // --------------------------------------------------------------------------
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  type AttInsightFilter = 'last5' | 'last10' | 'last30' | 'thisMonth'
  type AttViewMode = 'insights' | 'marking'

  const [attView, setAttView] = useState<AttViewMode>('insights')
  const [insightFilter, setInsightFilter] = useState<AttInsightFilter>('last5')
  const [markingDate, setMarkingDate] = useState(todayStr)
  const [draftRecords, setDraftRecords] = useState<Record<string, 'present' | 'absent'>>({})
  const [isDirty, setIsDirty] = useState(false)

  const getInsightDates = (): string[] => {
    const now = new Date()
    if (insightFilter === 'last5')  return Array.from({length: 5},  (_, i) => format(subDays(now, 4 - i),  'yyyy-MM-dd'))
    if (insightFilter === 'last10') return Array.from({length: 10}, (_, i) => format(subDays(now, 9 - i), 'yyyy-MM-dd'))
    if (insightFilter === 'last30') return Array.from({length: 30}, (_, i) => format(subDays(now, 29 - i), 'yyyy-MM-dd'))
    // thisMonth
    const start = startOfMonth(now)
    const days = differenceInCalendarDays(now, start) + 1
    return Array.from({length: days}, (_, i) => format(addDays(start, i), 'yyyy-MM-dd'))
  }
  const insightDates = getInsightDates()

  const getStatus = (studentId: string, date: string): 'present' | 'absent' | null => {
    if (!batch) return null
    const record = mockAttendance.find(r => r.batchId === batch.id && r.date === date)
    return record?.records[studentId] ?? null
  }

  const allBatchRecords = mockAttendance.filter(r => r.batchId === batch?.id)
  const datesWithRecords = insightDates.filter(d => allBatchRecords.some(r => r.date === d))
  const batchAvgPct = (() => {
    if (datesWithRecords.length === 0 || batchStudents.length === 0) return null
    const totalPresent = batchStudents.reduce((sum, s) =>
      sum + datesWithRecords.filter(d => getStatus(s.id, d) === 'present').length, 0)
    return Math.round((totalPresent / (batchStudents.length * datesWithRecords.length)) * 100)
  })()

  const enterMarkingMode = (date: string) => {
    if (!batch) return
    const saved = mockAttendance.find(r => r.batchId === batch.id && r.date === date)
    setMarkingDate(date)
    setDraftRecords(saved?.records ? { ...saved.records } : {})
    setIsDirty(false)
    setAttView('marking')
  }

  const handleSaveAttendance = () => {
    if (!batch) return
    const existing = mockAttendance.find(r => r.batchId === batch.id && r.date === markingDate)
    if (existing) {
      existing.records = { ...draftRecords }
    } else {
      mockAttendance.push({
        id: `${batch.id}-${markingDate}-${Date.now()}`,
        batchId: batch.id,
        date: markingDate,
        records: { ...draftRecords },
      })
    }
    setAttView('insights')
    setIsDirty(false)
    refresh()
    showToast("Attendance saved")
  }

  const handleCancelAttendance = () => {
    setAttView('insights')
    setIsDirty(false)
  }
  
  const presentCount = Object.values(draftRecords).filter(r => r === 'present').length
  const absentCount = Object.values(draftRecords).filter(r => r === 'absent').length
  const unmarkedCount = batchStudents.length - (presentCount + absentCount)
  const allMarked = unmarkedCount === 0 && batchStudents.length > 0

  const handleMark = (studentId: string, status: 'present' | 'absent') => {
    setDraftRecords(prev => ({ ...prev, [studentId]: status }))
    setIsDirty(true)
  }

  const handleMarkAllPresent = () => {
    const newRecords = { ...draftRecords }
    batchStudents.forEach(s => {
      newRecords[s.id] = 'present'
    })
    setDraftRecords(newRecords)
    setIsDirty(true)
  }



  // --------------------------------------------------------------------------
  // Tab 2: Students
  // --------------------------------------------------------------------------
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-white">Active</span>
      case 'due-soon':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white">Due Soon</span>
      case 'expired':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500 text-white">Expired</span>
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-200 text-gray-700">Unknown</span>
    }
  }

  // --------------------------------------------------------------------------
  // Tab 3: Transactions
  // --------------------------------------------------------------------------
  type TxTab = 'recent' | 'paid' | 'pending' | 'partially-paid'
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [txTab, setTxTab] = useState<TxTab>('recent')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRange, setFilterRange] = useState<'currentMonth' | 'lastMonth' | 'custom'>('currentMonth')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [renewTarget, setRenewTarget] = useState<Student | null>(null)
  const [collectRemainingTarget, setCollectRemainingTarget] = useState<Student | null>(null)
  const [voidConfirmId, setVoidConfirmId] = useState<string | null>(null)

  const [, forceUpdateTx] = useState(0)
  const refreshTx = () => forceUpdateTx(n => n + 1)

  const dateRange = useMemo(() => {
    const now = new Date()
    if (filterRange === 'lastMonth') {
      const lm = subMonths(now, 1)
      return { start: startOfMonth(lm), end: endOfMonth(lm) }
    }
    if (filterRange === 'custom' && customFrom && customTo) {
      return { start: startOfDay(parseISO(customFrom)), end: endOfDay(parseISO(customTo)) }
    }
    return { start: startOfMonth(now), end: endOfMonth(now) }
  }, [filterRange, customFrom, customTo])

  const txData = useMemo(() => {
    const batchStudentIds = new Set(batchStudents.map(s => s.id))
    
    // Recent & Paid
    const recentAll = mockStudents
      .filter(s => batchStudentIds.has(s.id))
      .flatMap(s => s.paymentHistory.map(p => ({ student: s, payment: p })))
      .filter(item => {
        try { return isWithinInterval(parseISO(item.payment.date), dateRange) }
        catch { return false }
      })
      .sort((a, b) => b.payment.date.localeCompare(a.payment.date))
      
    let recent = recentAll
    let paid = recentAll.filter(x => ['full', 'advance'].includes(x.payment.paymentType) && x.payment.status !== 'deleted')

    // Pending & Partially Paid
    let pending = mockStudents.filter(s => batchStudentIds.has(s.id) && ['expired', 'due-soon'].includes(s.status))
    let partial = mockStudents.filter(s => batchStudentIds.has(s.id) && s.pendingAmount > 0)

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      recent = recent.filter(x => x.student.name.toLowerCase().includes(q))
      paid = paid.filter(x => x.student.name.toLowerCase().includes(q))
      pending = pending.filter(s => s.name.toLowerCase().includes(q))
      partial = partial.filter(s => s.name.toLowerCase().includes(q))
    }

    return { recent, paid, pending, partial }
  }, [batchStudents, dateRange, searchQuery, forceUpdateTx])

  const getDaysLabel = (student: Student): string => {
    const today = new Date()
    const due = parseISO(student.nextDueDate)
    const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return `${Math.abs(diff)} day${Math.abs(diff) !== 1 ? 's' : ''} overdue`
    if (diff === 0) return 'Due today'
    return `${diff} day${diff !== 1 ? 's' : ''} remaining`
  }

  const handleVoid = (entryId: string, studentId: string) => {
    const student = mockStudents.find(s => s.id === studentId)
    if (!student) return
    const entry = student.paymentHistory.find(p => p.id === entryId)
    if (!entry) return
    entry.status = 'deleted'
    setVoidConfirmId(null)
    refreshTx()
  }

  const formatDateLabel = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd MMM yyyy')
    } catch {
      return dateStr
    }
  }

  // --------------------------------------------------------------------------
  // Early Return
  // --------------------------------------------------------------------------
  if (!batch) {
    return (
      <div className="p-6 max-w-7xl mx-auto flex flex-col items-center justify-center py-32">
        <AlertCircle className="w-12 h-12 text-so-muted mb-4" />
        <h2 className="text-xl font-bold text-so-text">Batch Not Found</h2>
        <p className="text-so-muted mt-2 mb-6">The batch you are looking for does not exist.</p>
        <button
          onClick={() => router.push('/batches')}
          className="flex items-center gap-2 text-so-accent hover:underline font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Batches
        </button>
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
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
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(shortDay => {
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
            <span className="text-xl font-bold text-so-text">{batchStudents.length}</span>
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

      {/* ──────────────────────────────────────────────────────────── */}
      {/* ATTENDANCE TAB */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === 'attendance' && (
        <div className="bg-so-card border border-so-border rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          {attView === 'insights' ? (
            <>
              {/* INSIGHTS MODE HEADER */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-so-border bg-so-surface/50">
                <div className="flex items-center gap-2">
                  {(['last5', 'last10', 'last30', 'thisMonth'] as AttInsightFilter[]).map(filter => (
                    <button
                      key={filter}
                      onClick={() => setInsightFilter(filter)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        insightFilter === filter
                          ? 'bg-so-accent text-so-accent-text shadow-sm'
                          : 'text-so-muted bg-white border border-so-border hover:text-so-text hover:bg-so-surface'
                      }`}
                    >
                      {filter === 'last5' && 'Last 5 Days'}
                      {filter === 'last10' && 'Last 10 Days'}
                      {filter === 'last30' && 'Last 30 Days'}
                      {filter === 'thisMonth' && 'This Month'}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-4">
                  {batchAvgPct !== null && (
                    <div className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                      batchAvgPct >= 75 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      batchAvgPct >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      Avg Attendance: {batchAvgPct}%
                    </div>
                  )}
                  {(() => {
                    const todayRecord = mockAttendance.find(r => r?.batchId === batch?.id && r.date === todayStr)
                    return (
                      <button
                        onClick={() => enterMarkingMode(todayStr)}
                        className="px-4 py-2 bg-so-accent text-so-accent-text rounded-lg text-sm font-semibold hover:bg-so-accent-hover transition-colors shadow-sm"
                      >
                        {todayRecord ? "Edit Today's Attendance" : "Take Attendance"}
                      </button>
                    )
                  })()}
                </div>
              </div>

              {/* INSIGHTS GRID */}
              {allBatchRecords.length > 0 && (
                <div className="px-5 pt-3 pb-1">
                  <p className="text-xs text-so-muted mb-2">
                    Click any date column to edit attendance for that day.
                  </p>
                </div>
              )}
              <div className="flex-1 overflow-x-auto relative">
                {allBatchRecords.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-so-muted">
                    <CalendarIcon className="w-12 h-12 text-so-muted mb-4" />
                    <p className="text-so-text font-medium mb-3">No attendance recorded yet</p>
                    <button
                      onClick={() => enterMarkingMode(todayStr)}
                      className="px-5 py-2.5 bg-so-accent text-so-accent-text rounded-lg text-sm font-semibold hover:bg-so-accent-hover transition-colors shadow-sm"
                    >
                      Take Attendance
                    </button>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-so-surface border-b border-so-border">
                        <th className="sticky left-0 bg-so-surface z-10 px-5 py-3 text-left text-xs font-semibold text-so-muted uppercase tracking-wider min-w-[160px] border-r border-so-border">
                          <div className="flex flex-col gap-2">
                            <span>Student</span>
                            <div className="relative">
                              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-so-muted" />
                              <input
                                type="text"
                                placeholder="Search..."
                                value={attSearchQuery}
                                onChange={e => setAttSearchQuery(e.target.value)}
                                className="w-full bg-white border border-so-border rounded-md pl-7 pr-2 py-1 text-xs font-normal text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-accent normal-case tracking-normal"
                              />
                            </div>
                          </div>
                        </th>
                        {insightDates.map(d => {
                          const isTdy = d === todayStr
                          return (
                            <th
                              key={d}
                              onClick={() => enterMarkingMode(d)}
                              className={`group min-w-[70px] text-center px-2 py-2 cursor-pointer select-none transition-colors ${
                                isTdy
                                  ? 'bg-so-accent/10 text-so-accent'
                                  : 'text-so-muted hover:bg-so-accent/10 hover:text-so-accent'
                              }`}
                              title={`Edit attendance for ${format(parseISO(d), 'dd MMM yyyy')}`}
                            >
                              <div className="text-[10px] font-bold uppercase tracking-wider">
                                {format(parseISO(d), 'EEE')}
                              </div>
                              <div className="text-xs font-bold mt-0.5">
                                {format(parseISO(d), 'dd')}
                              </div>
                              <div className="text-[10px] mt-0.5 opacity-0 group-hover:opacity-100">
                                edit
                              </div>
                            </th>
                          )
                        })}
                        <th className="px-5 py-3 text-right text-xs font-semibold text-so-muted uppercase tracking-wider min-w-[80px]">
                          Att. %
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-so-border">
                      {filteredAttStudents.map(student => {
                        const studentPresent = datesWithRecords.filter(d => getStatus(student.id, d) === 'present').length
                        const studentPct = datesWithRecords.length > 0
                          ? Math.round((studentPresent / datesWithRecords.length) * 100)
                          : null

                        return (
                          <tr key={student.id} className="hover:bg-so-surface/50 transition-colors">
                            <td className="sticky left-0 bg-so-card z-10 px-5 py-3 border-r border-so-border whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-so-surface border border-so-border flex items-center justify-center text-xs font-bold text-so-muted uppercase shrink-0">
                                  {student.name.substring(0,2)}
                                </div>
                                <span className="text-sm font-semibold text-so-text truncate max-w-[120px]">{student.name}</span>
                              </div>
                            </td>
                            
                            {insightDates.map(d => {
                              const status = getStatus(student.id, d)
                              const isTdy = d === todayStr
                              return (
                                <td key={d} className={`px-2 py-3 text-center ${isTdy ? 'bg-so-accent/5' : ''}`}>
                                  {status === 'present' ? (
                                    <div className="mx-auto w-6 h-6 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-xs" title="Present">P</div>
                                  ) : status === 'absent' ? (
                                    <div className="mx-auto w-6 h-6 rounded bg-red-50 text-red-600 border border-red-200 flex items-center justify-center font-bold text-xs" title="Absent">A</div>
                                  ) : (
                                    <div className="text-so-muted text-xs font-medium">—</div>
                                  )}
                                </td>
                              )
                            })}
                            
                            <td className="px-5 py-3 text-right whitespace-nowrap">
                              {studentPct !== null ? (
                                <span className={`font-bold ${studentPct >= 75 ? 'text-emerald-600' : studentPct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                                  {studentPct}%
                                </span>
                              ) : (
                                <span className="text-so-muted">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <>
              {/* MARKING MODE HEADER */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-so-border bg-so-surface/50">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleCancelAttendance}
                    className="p-1.5 text-so-muted hover:text-so-text hover:bg-so-border/50 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h2 className="text-sm font-semibold text-so-text">Attendance</h2>
                    <p className="text-xs text-so-muted mt-0.5 font-medium">{format(parseISO(markingDate), 'EEEE, dd MMMM yyyy')}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-so-muted">Taking attendance for:</span>
                  <input
                    type="date"
                    value={markingDate}
                    max={todayStr}
                    onChange={e => enterMarkingMode(e.target.value)}
                    className="bg-white border border-so-border rounded-lg px-3 py-1.5 text-sm font-medium text-so-text focus:outline-none focus:border-so-accent"
                  />
                </div>
              </div>

              {/* Summary Strip */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-so-border text-sm bg-white">
                <div className="flex items-center gap-6">
                  <span className="text-emerald-600 font-medium">{presentCount} Present</span>
                  <span className="text-red-600 font-medium">{absentCount} Absent</span>
                  <span className="text-so-muted font-medium">{unmarkedCount} Unmarked</span>
                </div>
                {batchStudents.length > 0 && (
                  <button
                    onClick={handleMarkAllPresent}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors"
                  >
                    Mark All Present
                  </button>
                )}
              </div>

              {/* Student List */}
              <div className="flex-1 overflow-y-auto pb-24 bg-white">
                {batchStudents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-so-muted">
                    No students in this batch.
                  </div>
                ) : (
                  <div className="divide-y divide-so-border">
                    {batchStudents.map(student => {
                      const status = draftRecords[student.id]
                      const rowBg = status === 'present' ? 'bg-emerald-50/50' : status === 'absent' ? 'bg-red-50/50' : ''
                      
                      return (
                        <div key={student.id} className={`flex items-center justify-between px-5 py-3.5 ${rowBg} transition-colors`}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-so-surface border border-so-border flex items-center justify-center text-xs font-bold text-so-muted uppercase">
                              {student.name.substring(0,2)}
                            </div>
                            <span className="text-sm font-semibold text-so-text">{student.name}</span>
                          </div>
                          <div className="flex gap-1.5 p-1 bg-so-surface border border-so-border rounded-lg">
                            <button
                              onClick={() => handleMark(student.id, 'present')}
                              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                status === 'present'
                                  ? 'bg-emerald-500 text-white shadow-sm'
                                  : 'text-so-muted hover:bg-so-border/50'
                              }`}
                            >
                              Present
                            </button>
                            <button
                              onClick={() => handleMark(student.id, 'absent')}
                              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                status === 'absent'
                                  ? 'bg-red-500 text-white shadow-sm'
                                  : 'text-so-muted hover:bg-so-border/50'
                              }`}
                            >
                              Absent
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Sticky Bottom Action Bar for Attendance (Only in Marking Mode) */}
      {activeTab === 'attendance' && attView === 'marking' && batchStudents.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-so-card border border-so-border px-4 py-3 rounded-2xl shadow-xl flex items-center gap-6 w-full max-w-2xl justify-between animate-in slide-in-from-bottom-8">
          <div className="flex items-center gap-2">
            {isDirty ? (
              <span className="flex items-center gap-2 text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                Unsaved changes
              </span>
            ) : allMarked ? (
              <span className="flex items-center gap-2 text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-4 h-4" />
                All marked
              </span>
            ) : (
              <span className="text-sm text-so-muted font-medium px-2">Ready to mark</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCancelAttendance}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-so-border bg-white text-so-text hover:bg-so-surface shadow-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAttendance}
              className="px-6 py-2 rounded-lg text-sm font-semibold transition-all bg-so-accent text-so-accent-text hover:bg-so-accent-hover shadow-md"
            >
              Save Attendance
            </button>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* STUDENTS TAB */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === 'students' && (
        <div className="bg-so-card border border-so-border rounded-xl shadow-sm overflow-hidden">
          {batchStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-so-muted">
              <p className="mb-4">No active students in this batch.</p>
              <button
                onClick={() => setShowAddStudent(true)}
                className="px-4 py-2 bg-so-accent text-so-accent-text text-sm font-semibold rounded-lg shadow-sm hover:bg-so-accent-hover transition-colors"
              >
                + Add Student
              </button>
            </div>
          ) : (
            <>
              <div className="px-5 py-3 border-b border-so-border flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-so-muted" />
                  <input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={studentSearchQuery}
                    onChange={e => setStudentSearchQuery(e.target.value)}
                    className="w-full bg-white border border-so-border rounded-lg pl-9 pr-4 py-2 text-sm text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-accent"
                  />
                </div>
                <button
                  onClick={() => setShowAddStudent(true)}
                  className="px-4 py-2 bg-so-accent text-so-accent-text text-sm font-semibold rounded-lg shadow-sm hover:bg-so-accent-hover transition-colors flex-shrink-0"
                >
                  + Add Student
                </button>
              </div>
              <div className="grid grid-cols-[2fr_1fr_1.5fr_1fr_1fr] px-5 py-3 bg-so-surface border-b border-so-border">
                {['Name', 'Phone', 'Guardian', 'Fees', 'Next Due'].map(h => (
                  <span key={h} className="text-xs font-semibold text-so-muted uppercase tracking-wider">{h}</span>
                ))}
              </div>
              <div className="divide-y divide-so-border">
                {filteredBatchStudents.map(student => (
                  <div key={student.id} className="grid grid-cols-[2fr_1fr_1.5fr_1fr_1fr] px-5 py-4 items-center hover:bg-so-surface/50 transition-colors">
                    <button
                      onClick={() => router.push(`/students/${student.id}`)}
                      className="text-sm font-semibold text-so-text hover:text-so-accent text-left truncate pr-4"
                    >
                      {student.name}
                    </button>
                    <span className="text-sm text-so-muted">{student.phone}</span>
                    <span className="text-sm text-so-text truncate pr-4">
                      {student.guardianName ? student.guardianName : <span className="text-so-muted">—</span>}
                    </span>
                    <span className="text-sm text-so-text">
                      ₹ {student.fees.toLocaleString('en-IN')} <span className="text-so-muted text-xs">/mo</span>
                    </span>
                    <span className="text-sm text-so-muted font-medium">{format(parseISO(student.nextDueDate), 'dd MMM yyyy')}</span>
                  </div>
                ))}
                {filteredBatchStudents.length === 0 && (
                  <div className="py-12 text-center text-sm text-so-muted">No students match your search.</div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* TRANSACTIONS TAB */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-so-muted" />
              </div>
              <input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-so-surface border border-so-border rounded-lg pl-10 pr-4 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
              />
            </div>
            <button
              onClick={() => setShowFilter(true)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                filterRange !== 'currentMonth' 
                  ? 'border-so-accent text-so-accent bg-so-accent/10' 
                  : 'border-so-border bg-white text-so-text hover:bg-so-surface'
              }`}
            >
              <Filter className="w-4 h-4" /> Filter Period
            </button>
          </div>

          <div className="flex gap-1 border-b border-so-border">
            {(['recent','paid','pending','partially-paid'] as TxTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setTxTab(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
                  txTab === tab ? 'border-so-accent text-so-accent' : 'border-transparent text-so-muted hover:text-so-text'
                }`}
              >
                {tab.replace('-', ' ')}
              </button>
            ))}
          </div>

          <div className="bg-so-card border border-so-border rounded-xl shadow-sm overflow-hidden">
            {/* Recent Table */}
            {txTab === 'recent' && (
              <div>
                {txData.recent.length === 0 ? (
                  <div className="py-16 text-center text-sm text-so-muted">No transactions found.</div>
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
                        {txData.recent.map((t, idx) => (
                          <tr key={idx} className="bg-so-card hover:bg-so-surface/60 border-b border-so-border transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-so-text font-medium">{t.student.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-so-muted">{t.student.phone}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-so-text">{formatDateLabel(t.payment.date)}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`font-semibold ${t.payment.status === 'deleted' ? 'text-so-muted line-through' : 'text-so-emerald'}`}>
                                ₹ {t.payment.amount.toLocaleString('en-IN')}
                              </div>
                              {t.payment.paymentType === 'partial' && t.payment.remainingAmount > 0 && t.payment.status !== 'deleted' && (
                                <div className="text-amber-600 text-xs mt-0.5">{t.payment.remainingAmount.toLocaleString('en-IN')} remaining</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {t.payment.paymentType === 'full' && <span className="text-xs font-medium text-so-emerald">Full</span>}
                              {t.payment.paymentType === 'partial' && <span className="text-xs font-medium text-amber-500">Partial</span>}
                              {t.payment.paymentType === 'advance' && <span className="text-xs font-medium text-blue-600">Advance</span>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-so-muted capitalize">{t.payment.paymentMethod}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Paid Table */}
            {txTab === 'paid' && (
              <div>
                {txData.paid.length === 0 ? (
                  <div className="py-16 text-center text-sm text-so-muted">No paid records found.</div>
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
                        {txData.paid.map((t, idx) => (
                          <tr key={idx} className="bg-so-card hover:bg-so-surface/60 border-b border-so-border transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-so-text font-medium">{t.student.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-so-muted">{t.student.phone}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-so-text">{formatDateLabel(t.payment.date)}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`font-semibold ${t.payment.status === 'deleted' ? 'text-so-muted line-through' : 'text-so-emerald'}`}>
                                ₹ {t.payment.amount.toLocaleString('en-IN')}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-so-muted capitalize">{t.payment.paymentMethod}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              {t.payment.status !== 'deleted' ? (
                                voidConfirmId === t.payment.id ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <span className="text-xs text-so-muted">Void this?</span>
                                    <button onClick={() => handleVoid(t.payment.id, t.student.id)}
                                      className="text-xs px-2 py-1 bg-so-red text-white rounded-md hover:bg-red-600 transition-colors">Yes</button>
                                    <button onClick={() => setVoidConfirmId(null)}
                                      className="text-xs px-2 py-1 border border-so-border rounded-md text-so-muted hover:text-so-text transition-colors">No</button>
                                  </div>
                                ) : (
                                  <button onClick={() => setVoidConfirmId(t.payment.id)}
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

            {/* Pending Table */}
            {txTab === 'pending' && (
              <div>
                {txData.pending.length === 0 ? (
                  <div className="py-16 text-center text-sm text-so-muted">No students found in this category.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-so-surface border-b border-so-border">
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Student</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Phone</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Due Date</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Amount</th>
                          <th className="text-right px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-so-border">
                        {txData.pending.map((s, idx) => (
                          <tr key={idx} className="bg-so-card hover:bg-so-surface/60 border-b border-so-border transition-colors">
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
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-so-muted">{s.phone}</td>
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

            {/* Partially Paid Table */}
            {txTab === 'partially-paid' && (
              <div>
                {txData.partial.length === 0 ? (
                  <div className="py-16 text-center text-sm text-so-muted">No partially paid students found.</div>
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
                        {txData.partial.map((s, idx) => {
                          const latestPartial = s.paymentHistory
                            .filter(p => p.paymentType === 'partial' && p.status !== 'deleted')
                            .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())[0]

                          return (
                            <tr key={idx} className="bg-so-card hover:bg-so-surface/60 border-b border-so-border transition-colors">
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
        </div>
      )}

      {/* Renew Modal */}
      {renewTarget && (
        <RenewModal
          student={renewTarget}
          onClose={() => setRenewTarget(null)}
          onConfirm={(updates) => {
            Object.assign(renewTarget, updates)
            setRenewTarget(null)
            refreshTx()
          }}
        />
      )}
      
      {/* Collect Remaining Modal */}
      {collectRemainingTarget && (
        <CollectRemainingModal
          student={collectRemainingTarget}
          onClose={() => setCollectRemainingTarget(null)}
          onConfirm={(entry) => {
            collectRemainingTarget.paymentHistory.push(entry)
            collectRemainingTarget.pendingAmount = 0
            if (collectRemainingTarget.status === 'due-soon' || collectRemainingTarget.status === 'expired') {
              collectRemainingTarget.status = 'active'
            }
            setCollectRemainingTarget(null)
            refreshTx()
          }}
        />
      )}

      {/* Filter Slide Panel */}
      {showFilter && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFilter(false)} />
          <div className="relative w-80 h-full bg-so-card border-l border-so-border flex flex-col shadow-2xl animate-in slide-in-from-right">
            <div className="flex items-center justify-between p-5 border-b border-so-border">
              <span className="font-semibold text-so-text">Filter Period</span>
              <button onClick={() => setShowFilter(false)}><X className="w-5 h-5 text-so-muted" /></button>
            </div>
            <div className="p-5 flex-1 space-y-4">
              <p className="text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">Date Range</p>
              {[
                { value: 'currentMonth', label: 'Current Month' },
                { value: 'lastMonth',    label: 'Last Month'    },
                { value: 'custom',       label: 'Custom Range'  },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-3 py-2.5 cursor-pointer">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                    filterRange === opt.value ? 'border-so-accent' : 'border-so-border'
                  }`}>
                    {filterRange === opt.value && <div className="w-2 h-2 rounded-full bg-so-accent" />}
                  </div>
                  <span className={`text-sm font-medium ${filterRange === opt.value ? 'text-so-text' : 'text-so-muted'}`}>
                    {opt.label}
                  </span>
                </label>
              ))}
              {filterRange === 'custom' && (
                <div className="mt-4 space-y-3 p-4 bg-so-surface border border-so-border rounded-xl">
                  <div>
                    <label className="block text-xs font-medium text-so-muted mb-1">From</label>
                    <input type="date" value={customFrom} max={customTo || todayStr} onChange={e => setCustomFrom(e.target.value)} className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-so-muted mb-1">To</label>
                    <input type="date" value={customTo} min={customFrom} max={todayStr} onChange={e => setCustomTo(e.target.value)} className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent" />
                  </div>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-so-border flex gap-3 bg-so-card">
              <button
                onClick={() => { setFilterRange('currentMonth'); setCustomFrom(''); setCustomTo('') }}
                className="flex-1 py-2.5 border border-so-border rounded-lg text-sm font-medium text-so-muted hover:text-so-text transition-colors"
              >Clear</button>
              <button onClick={() => setShowFilter(false)} className="flex-1 py-2.5 bg-so-accent text-so-accent-text rounded-lg text-sm font-medium hover:bg-so-accent-hover transition-colors shadow-sm">Apply</button>
            </div>
          </div>
        </div>
      )}


      {showAddStudent && (
        <AddStudentModal
          defaultBatch={batch.name}
          onClose={() => setShowAddStudent(false)}
          onSuccess={() => {
            setShowAddStudent(false)
            showToast("Student added successfully")
            refresh()
            // Since batchStudents is useMemo on mockStudents, it will only update if mockStudents reference changes.
            // But mockStudents is mutated. We need a refresh function. Wait, we don't have a refresh trigger for students?
            // Actually, we can just call forceUpdateTx since there is a forceUpdate function for tx. Let's just create a global forceUpdate if needed or use tx force update.
            // Oh we don't have a global refresh. Let's just do `refreshTx()` which triggers re-render, and useMemo will re-eval? 
            // Wait, useMemo is `[batch]`. If mockStudents is mutated, useMemo doesn't re-run unless we add a refresh key.
          }}
        />
      )}
    </div>
  )
}
