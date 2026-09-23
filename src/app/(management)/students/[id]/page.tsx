'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { mockStudents, mockSettings, Student, mockAttendance, mockBatches } from '@/lib/mock-data'
import { isWithinInterval, parseISO, format, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay, getDay, getDaysInMonth } from 'date-fns'
import {
  ArrowLeft, Phone, User, Calendar, CreditCard, Shield, IndianRupee, Users,
  Receipt, CheckCircle, RefreshCw, SlidersHorizontal, X, Wallet, Trash2,
  AlertCircle, Clock, ChevronLeft, ChevronRight, Pencil
} from 'lucide-react'
import RenewModal from '@/components/coaching/RenewModal'
import CollectRemainingModal from '@/components/students/CollectRemainingModal'
import EditStudentModal from '@/components/students/EditStudentModal'

type ProfileTab = 'details' | 'transactions' | 'attendance'
type TxTab = 'recent' | 'paid' | 'pending' | 'partial'
type FilterRange = 'currentMonth' | 'lastMonth' | 'custom'

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
  <div className="flex items-start gap-3">
    <span className="text-so-muted mt-0.5 w-4 h-4 flex-shrink-0">{icon}</span>
    <div>
      <p className="text-xs text-so-muted">{label}</p>
      <p className="text-sm text-so-text mt-0.5">{value}</p>
    </div>
  </div>
)

export default function StudentProfilePage() {
  const params = useParams()
  const router = useRouter()
  
  const [profileTab, setProfileTab] = useState<ProfileTab>('details')
  const [txTab, setTxTab] = useState<TxTab>('recent')
  const [showFilter, setShowFilter] = useState(false)
  const [filterRange, setFilterRange] = useState<FilterRange>('currentMonth')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [renewTarget, setRenewTarget] = useState(false)
  const [collectRemaining, setCollectRemaining] = useState(false)
  const [voidConfirmId, setVoidConfirmId] = useState<string | null>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [viewYear, setViewYear] = useState(new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(new Date().getMonth())
  const [, forceUpdate] = useState(0)
  const refresh = () => forceUpdate(n => n + 1)

  const student = mockStudents.find(s => s.id === params.id)

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-so-muted">Student not found.</p>
        <button onClick={() => router.push('/students')}
          className="text-so-accent text-sm hover:underline">
           Back to Students
        </button>
      </div>
    )
  }

  const getMembershipName = (id: string) =>
    mockSettings.membershipTypes.find(m => m.id === id)?.name ?? id

  const computeRange = (range: FilterRange, cFrom: string, cTo: string) => {
    const now = new Date()
    switch (range) {
      case 'currentMonth':
        return { start: startOfMonth(now), end: endOfMonth(now) }
      case 'lastMonth':
        const lm = subMonths(now, 1)
        return { start: startOfMonth(lm), end: endOfMonth(lm) }
      case 'custom':
        if (!cFrom || !cTo) return { start: startOfMonth(now), end: endOfMonth(now) }
        return { start: startOfDay(parseISO(cFrom)), end: endOfDay(parseISO(cTo)) }
    }
  }
  const range = computeRange(filterRange, customFrom, customTo)

  const studentTx = [...student.paymentHistory]
    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())

  const totalCollected = student.paymentHistory
    .filter(p => p.status !== 'deleted')
    .reduce((sum, p) => sum + p.amount, 0)

  const totalDue = student.pendingAmount > 0
    ? student.pendingAmount
    : (student.status === 'expired' || student.status === 'due-soon')
      ? student.fees
      : 0

  const recentRows = studentTx
    .filter(p => {
      try { return isWithinInterval(parseISO(p.date), range) } catch { return false }
    })

  const paidRows = studentTx
    .filter(p => {
      try { return isWithinInterval(parseISO(p.date), range) } catch { return false }
    })
    .filter(p => p.paymentType === 'full' || p.paymentType === 'advance')

  const isPending = student.status === 'expired' || student.status === 'due-soon'
  const isPartial = student.pendingAmount > 0

  const handleVoid = (entryId: string) => {
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

  const getDaysLabel = (student: Student): string => {
    const today = new Date()
    const due = parseISO(student.nextDueDate)
    const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return `${Math.abs(diff)} day${Math.abs(diff) !== 1 ? 's' : ''} overdue`
    if (diff === 0) return 'Due today'
    return `${diff} day${diff !== 1 ? 's' : ''} remaining`
  }

  const attendanceMap: Record<string, 'present' | 'absent'> = {}
  mockAttendance.forEach(record => {
    if (record.records[student.id] !== undefined) {
      attendanceMap[record.date] = record.records[student.id]
    }
  })

  const studentBatch = mockBatches.find(b => b.name === student.currentBatch)
  const sessionDays = studentBatch?.days || []

  const currentViewDate = new Date(viewYear, viewMonth, 1)
  const daysInMonth = getDaysInMonth(currentViewDate)
  const firstDayOfWeek = getDay(currentViewDate)

  let presentCount = 0
  let absentCount = 0
  let unmarkedCount = 0

  const calendarCells = []
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarCells.push(null)
  }

  const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  let hasAnyData = false;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(viewYear, viewMonth, d)
    const dateStr = format(dateObj, 'yyyy-MM-dd')
    const dayName = DAYS_OF_WEEK[getDay(dateObj)]
    
    const isSessionDay = sessionDays.includes(dayName)
    const status = attendanceMap[dateStr]
    
    if (status !== undefined) hasAnyData = true;

    if (isSessionDay) {
      if (status === 'present') presentCount++
      else if (status === 'absent') absentCount++
      else unmarkedCount++
    }
    
    calendarCells.push({ d, dateStr, isSessionDay, status, isToday: dateStr === format(new Date(), 'yyyy-MM-dd') })
  }

  const totalSessionDaysForPerc = presentCount + absentCount
  const attendancePercentage = totalSessionDaysForPerc > 0 ? Math.round((presentCount / totalSessionDaysForPerc) * 100) : null

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(y => y - 1)
    } else {
      setViewMonth(m => m - 1)
    }
  }

  const handleNextMonth = () => {
    const now = new Date()
    if (viewYear === now.getFullYear() && viewMonth === now.getMonth()) return // Don't go to future
    
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(y => y + 1)
    } else {
      setViewMonth(m => m + 1)
    }
  }

  const isCurrentMonth = viewYear === new Date().getFullYear() && viewMonth === new Date().getMonth()

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Page top bar */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/students')}
          className="p-1.5 rounded-md text-so-muted hover:text-so-text hover:bg-so-surface transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-so-text">{student.name}</h1>
          <p className="text-so-muted text-sm mt-0.5 capitalize">
            {getMembershipName(student.membershipTypeId)} • {student.currentBatch} Batch
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            student.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
            student.status === 'due-soon' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
            student.status === 'expired' ? 'bg-red-50 text-red-700 border border-red-200' :
            'bg-so-surface text-so-muted border border-so-border'
          }`}>
            {student.status === 'dropout' ? 'Off-Court' : 
             student.status === 'due-soon' ? 'Due Soon' :
             student.status.charAt(0).toUpperCase() + student.status.slice(1)}
          </span>
          <button
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-2 px-3 py-1.5 border border-so-border rounded-lg text-sm font-medium text-so-accent hover:bg-so-surface transition-colors"
          >
            <Pencil className="w-4 h-4" /> Edit
          </button>
        </div>
      </div>

      {/* Profile tab bar */}
      <div className="flex items-center gap-2 border-b border-so-border mb-6">
        {(['details', 'transactions', 'attendance'] as ProfileTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setProfileTab(tab)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              profileTab === tab
                ? 'border-so-accent text-so-accent'
                : 'border-transparent text-so-muted hover:text-so-text'
            }`}
          >
            {tab === 'details' ? 'Member Details' : tab === 'transactions' ? 'Transaction Details' : 'Attendance'}
          </button>
        ))}
      </div>

      {profileTab === 'details' && (
        <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-6">
          <h3 className="text-xs text-so-muted uppercase tracking-wider mb-4">Personal Information</h3>
          <div className="grid grid-cols-2 gap-x-12 gap-y-4">
            <InfoRow icon={<User className="w-4 h-4" />} label="Name" value={student.name} />
            <InfoRow icon={<Phone className="w-4 h-4" />} label="Mobile Number" value={student.phone} />
            <InfoRow icon={<Phone className="w-4 h-4" />} label="Alternate Number" value={student.alternatePhone || '-'} />
            <InfoRow icon={<Shield className="w-4 h-4" />} label="Guardian" value={student.guardianName || '-'} />
          </div>

          <div className="border-t border-so-border my-6"></div>

          <h3 className="text-xs text-so-muted uppercase tracking-wider mb-4 mt-6">More Information</h3>
          <div className="grid grid-cols-2 gap-x-12 gap-y-4">
            <InfoRow icon={<Calendar className="w-4 h-4" />} label="Date of Admission" value={formatDateLabel(student.startDate)} />
            <InfoRow icon={<IndianRupee className="w-4 h-4" />} label="Fees" value={`₹ ${student.fees.toLocaleString('en-IN')}`} />
            <InfoRow icon={<Calendar className="w-4 h-4" />} label="Membership Start" value={formatDateLabel(student.membershipStartDate)} />
            <InfoRow icon={<Calendar className="w-4 h-4" />} label="Next Due" value={formatDateLabel(student.nextDueDate)} />
            <InfoRow icon={<Users className="w-4 h-4" />} label="Current Batch" value={`${student.currentBatch} Batch`} />
            <InfoRow icon={<CreditCard className="w-4 h-4" />} label="Membership" value={getMembershipName(student.membershipTypeId)} />
          </div>

          {student.internalNotes && (
            <div className="mt-6 p-3 bg-so-surface rounded-lg border border-so-border">
              <p className="text-xs text-so-muted mb-1">Internal Notes</p>
              <p className="text-sm text-so-text">{student.internalNotes}</p>
            </div>
          )}
        </div>
      )}

      {profileTab === 'transactions' && (
        <div>
          {/* 3 Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-4">
              <span className="text-so-muted text-xs uppercase tracking-wider font-semibold">Total Due</span>
              <div className={`text-2xl font-bold mt-2 ${totalDue > 0 ? 'text-so-red' : 'text-so-muted'}`}>
                ₹ {totalDue.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-4">
              <span className="text-so-muted text-xs uppercase tracking-wider font-semibold">Collected <span className="lowercase font-normal">(All Time)</span></span>
              <div className="text-2xl font-bold mt-2 text-so-emerald">
                ₹ {totalCollected.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-4">
              <span className="text-so-muted text-xs uppercase tracking-wider font-semibold">Batch</span>
              <div className="text-2xl font-bold mt-2 text-so-text capitalize">
                {student.currentBatch}
              </div>
            </div>
          </div>

          {/* Transaction section */}
          <div className="flex items-center justify-between mt-6 mb-4">
            <div className="flex gap-1 p-1 bg-so-surface rounded-lg border border-so-border">
              {(['recent', 'paid', 'pending', 'partial'] as TxTab[]).map(tab => {
                const labels = { recent: 'Recent', paid: 'Paid', pending: 'Pending', partial: 'Partially Paid' }
                return (
                  <button key={tab} onClick={() => setTxTab(tab)}
                    className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      txTab === tab
                        ? 'bg-so-accent text-white shadow-sm'
                        : 'text-so-muted hover:text-so-text hover:bg-so-surface/80'
                    }`}
                  >
                    {labels[tab]}
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => setShowFilter(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-so-border rounded-lg text-xs text-so-muted hover:border-so-accent hover:text-so-text transition-colors"
            >
              <SlidersHorizontal className="w-3 h-3" />
              Filter
              {filterRange !== 'currentMonth' && (
                <span className="w-1.5 h-1.5 rounded-full bg-so-accent" />
              )}
            </button>
          </div>

          {/* TX Tabs Content */}
          <div className="bg-so-card border border-so-border rounded-xl shadow-sm overflow-hidden min-h-[300px]">
            {txTab === 'recent' && (
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
                            <td className="px-6 py-4 whitespace-nowrap text-so-text font-medium">{student.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-so-muted">{student.phone}</td>
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

            {txTab === 'paid' && (
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
                            <td className="px-6 py-4 whitespace-nowrap text-so-text font-medium">{student.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-so-muted">{student.phone}</td>
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
                                    <button onClick={() => handleVoid(t.id)}
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

            {txTab === 'pending' && (
              <div>
                {!isPending ? (
                  <div className="py-20 flex flex-col items-center justify-center">
                    <CheckCircle className="w-12 h-12 text-so-emerald mb-4" strokeWidth={1.5} />
                    <p className="text-so-text font-semibold">No pending payments — all students are up to date</p>
                  </div>
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
                        <tr className="bg-so-card hover:bg-so-surface/60 border-b border-so-border transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-so-text">{student.name}</span>
                              {student.status === 'expired' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
                                  <AlertCircle className="w-3 h-3" />
                                  Overdue
                                </span>
                              ) : student.status === 'due-soon' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200">
                                  <Clock className="w-3 h-3" />
                                  Due Soon
                                </span>
                              ) : null}
                            </div>
                            <p className={`text-xs mt-0.5 font-medium ${
                              student.status === 'expired' ? 'text-red-500' : 'text-amber-500'
                            }`}>
                              {getDaysLabel(student)}
                            </p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-so-muted">
                            {student.phone}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap font-medium ${student.status === 'expired' ? 'text-so-red' : 'text-so-yellow'}`}>
                            {formatDateLabel(student.nextDueDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-so-emerald font-semibold">
                            ₹ {student.fees.toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex justify-end">
                              <button
                                onClick={() => setRenewTarget(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-so-accent text-white rounded-md text-xs font-medium hover:opacity-90 transition-opacity"
                              >
                                <RefreshCw className="w-3 h-3" />
                                Collect Payment
                              </button>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {txTab === 'partial' && (
              <div>
                {!isPartial ? (
                  <div className="py-20 flex flex-col items-center justify-center">
                    <CheckCircle className="w-12 h-12 text-so-emerald mb-4" strokeWidth={1.5} />
                    <p className="text-so-text font-semibold">No partial payments outstanding</p>
                  </div>
                ) : (
                  (() => {
                    const latestPartial = student.paymentHistory
                      .filter(p => p.paymentType === 'partial' && p.status !== 'deleted')
                      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())[0]

                    return (
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
                            <tr className="bg-so-card hover:bg-so-surface/60 border-b border-so-border transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-so-text font-medium">{student.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-so-muted">{student.phone}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-so-text">
                                {latestPartial ? formatDateLabel(latestPartial.date) : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-so-emerald font-semibold">
                                {latestPartial ? `₹ ${latestPartial.amount.toLocaleString('en-IN')}` : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-amber-600 font-semibold">
                                ₹ {student.pendingAmount.toLocaleString('en-IN')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-so-muted capitalize">
                                {latestPartial?.paymentMethod || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <div className="flex justify-end">
                                  <button
                                    onClick={() => setCollectRemaining(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 border border-amber-500/30 rounded-md text-xs font-medium hover:bg-amber-500/30 transition-colors"
                                  >
                                    <Wallet className="w-3 h-3" />
                                    Collect Remaining
                                  </button>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )
                  })()
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter Overlay */}
      {showFilter && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilter(false)} />
          <div className="relative w-72 h-full bg-so-card border-l border-so-border flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-so-border">
              <span className="font-semibold text-so-text">Filter Transactions</span>
              <button onClick={() => setShowFilter(false)} className="p-1 hover:bg-so-surface rounded">
                <X className="w-4 h-4 text-so-muted" />
              </button>
            </div>
            
            <div className="p-4 flex-1">
              <p className="text-xs text-so-muted uppercase tracking-wider mb-3">Date Range</p>
              {[
                { value: 'currentMonth', label: 'Current Month' },
                { value: 'lastMonth', label: 'Last Month' },
                { value: 'custom', label: 'Custom Date Range' },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-3 py-2 cursor-pointer group">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                    filterRange === opt.value ? 'border-so-accent' : 'border-so-border'
                  }`}>
                    {filterRange === opt.value && <div className="w-2 h-2 rounded-full bg-so-accent" />}
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
                    className="w-full bg-white border border-so-border rounded-md px-3 py-1.5 text-sm text-so-text focus:outline-none focus:border-so-accent" />
                  <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                    min={customFrom} max={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full bg-white border border-so-border rounded-md px-3 py-1.5 text-sm text-so-text focus:outline-none focus:border-so-accent" />
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-so-border flex gap-3">
              <button
                onClick={() => { setFilterRange('currentMonth'); setCustomFrom(''); setCustomTo('') }}
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

      {/* Attendance Tab */}
      {profileTab === 'attendance' && (
        <div className="space-y-6">
          <div className="bg-white border border-so-border rounded-xl shadow-sm overflow-hidden p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-so-text">Attendance Log</h3>
              <div className="flex items-center gap-4">
                <button onClick={handlePrevMonth} className="p-1.5 hover:bg-so-surface rounded-md text-so-muted hover:text-so-text">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm font-semibold w-32 text-center">
                  {format(currentViewDate, 'MMMM yyyy')}
                </span>
                <button 
                  onClick={handleNextMonth} 
                  disabled={isCurrentMonth}
                  className={`p-1.5 rounded-md ${isCurrentMonth ? 'text-gray-300 cursor-not-allowed' : 'text-so-muted hover:text-so-text hover:bg-so-surface'}`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

              <>
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {DAYS_OF_WEEK.map(d => (
                    <div key={d} className="text-center text-xs font-semibold text-so-muted uppercase">{d.substring(0,3)}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2 mb-6">
                  {calendarCells.map((cell, i) => {
                    if (!cell) return <div key={i} className="h-10 w-full bg-transparent"></div>
                    
                    if (!cell.isSessionDay) {
                      return (
                        <div key={i} className={`h-10 w-full flex items-center justify-center text-sm bg-transparent text-so-muted opacity-30 ${cell.isToday ? 'ring-2 ring-so-accent rounded-lg' : ''}`}>
                          {cell.d}
                        </div>
                      )
                    }

                    if (cell.status === 'present') {
                      return (
                        <div key={i} className={`relative h-10 w-full flex items-center justify-center text-sm bg-so-emerald-subtle text-so-emerald font-medium rounded-lg ${cell.isToday ? 'ring-2 ring-so-accent' : ''}`}>
                          {cell.d}
                          <CheckCircle className="absolute bottom-1 right-1 w-2.5 h-2.5" />
                        </div>
                      )
                    }

                    if (cell.status === 'absent') {
                      return (
                        <div key={i} className={`relative h-10 w-full flex items-center justify-center text-sm bg-so-red-subtle text-so-red font-medium rounded-lg ${cell.isToday ? 'ring-2 ring-so-accent' : ''}`}>
                          {cell.d}
                          <X className="absolute bottom-1 right-1 w-2.5 h-2.5" />
                        </div>
                      )
                    }

                    return (
                      <div key={i} className={`h-10 w-full flex items-center justify-center text-sm bg-so-surface text-so-muted rounded-lg border border-so-border ${cell.isToday ? 'ring-2 ring-so-accent' : ''}`}>
                        {cell.d}
                      </div>
                    )
                  })}
                </div>

                {!hasAnyData ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-so-muted">No attendance recorded for this month.</p>
                  </div>
                ) : (
                  <div className="flex justify-between items-center bg-so-surface/50 border border-so-border rounded-lg p-4">
                    <div className="flex gap-6 text-sm">
                      <span className="font-medium text-so-text"><span className="text-emerald-500 mr-1">●</span> Present: {presentCount}</span>
                      <span className="font-medium text-so-text"><span className="text-red-500 mr-1">●</span> Absent: {absentCount}</span>
                      <span className="font-medium text-so-text"><span className="text-so-muted mr-1">●</span> Unmarked: {unmarkedCount}</span>
                    </div>
                    <div className="text-sm font-semibold text-so-text">
                      Attendance: {attendancePercentage !== null ? `${attendancePercentage}%` : 'No data'}
                    </div>
                  </div>
                )}
              </>
          </div>
        </div>
      )}

      {/* Modals */}
      {renewTarget && (
        <RenewModal
          student={student}
          onClose={() => setRenewTarget(false)}
          onConfirm={(entry, newDueDate, newMembershipStartDate, newPendingAmount, newBatch) => {
            student.paymentHistory.push(entry)
            student.nextDueDate = newDueDate
            student.membershipStartDate = newMembershipStartDate
            student.pendingAmount = newPendingAmount
            student.currentBatch = newBatch
            student.status = newPendingAmount > 0 ? 'due-soon' : 'active'
            setRenewTarget(false)
            refresh()
          }}
        />
      )}
      
      {collectRemaining && (
        <CollectRemainingModal
          student={student}
          onClose={() => setCollectRemaining(false)}
          onConfirm={(entry) => {
            student.paymentHistory.push(entry)
            student.pendingAmount = 0
            if (student.status === 'due-soon' || student.status === 'expired') {
              student.status = 'active'
            }
            setCollectRemaining(false)
            refresh()
          }}
        />
      )}

      {showEdit && (
        <EditStudentModal
          student={student}
          onClose={() => setShowEdit(false)}
          onSave={(updated) => {
            const idx = mockStudents.findIndex(s => s.id === student.id);
            if (idx !== -1) mockStudents[idx] = updated;
            setShowEdit(false);
            refresh();
          }}
        />
      )}
    </div>
  )
}
