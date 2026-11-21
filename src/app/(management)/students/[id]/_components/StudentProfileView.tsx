'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Student } from '@/lib/types/students'
import type { Batch } from '@/lib/types/batches'
import type { AttendanceRecord } from '@/lib/types/attendance'
import { parseISO, format, getDay, getDaysInMonth } from 'date-fns'
import { calcAge, formatCurrency, formatDate } from '@/lib/utils'
import {
  ArrowLeft, Phone, User, Calendar, Shield, IndianRupee, Users,
  CheckCircle, X, 
  AlertCircle, ChevronLeft, ChevronRight, Pencil, Compass,
} from 'lucide-react'
import FeeReceiptModal from '@/components/transactions/FeeReceiptModal'
import CoachingTransactions from '@/components/transactions/CoachingTransactions'
import EditStudentModal from '@/components/students/EditStudentModal'
import { adjustDueDate } from '@/app/(management)/students/actions'

type ProfileTab = 'details' | 'transactions' | 'attendance'

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
  <div className="flex items-start gap-3">
    <span className="text-so-muted mt-0.5 w-4 h-4 flex-shrink-0">{icon}</span>
    <div>
      <p className="text-xs text-so-muted">{label}</p>
      <div className="text-sm text-so-text mt-0.5">{value}</div>
    </div>
  </div>
)

interface StudentProfileViewProps {
  student: Student
  batches?: Batch[]
  attendance?: AttendanceRecord[]
  canAdjustDueDate?: boolean
}

export default function StudentProfileView({ student, batches = [], attendance = [], canAdjustDueDate = false }: StudentProfileViewProps) {
  const router = useRouter()

  const getBatchName = (batchIdOrName?: string) => {
    if (!batchIdOrName) return 'No Batch'
    const matched = batches.find(b => b.id === batchIdOrName || b.name.toLowerCase() === batchIdOrName.toLowerCase())
    if (matched) return matched.name
    // If it's a raw UUID and not found in batches, display 'No Batch' instead of raw UUID
    const isUUID = new RegExp('^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', 'i').test(batchIdOrName)
    if (isUUID) return 'No Batch'
    return batchIdOrName
  }

  const [profileTab, setProfileTab] = useState<ProfileTab>('details')
  const [renewTarget, setRenewTarget] = useState(false)
  const [showAdjust, setShowAdjust] = useState(false)
  const [adjustedDate, setAdjustedDate] = useState(student.nextDueDate)
  const [adjustReason, setAdjustReason] = useState('')
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [showEdit, setShowEdit] = useState(false)
  const [viewYear, setViewYear] = useState(new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(new Date().getMonth())

  const totalCollected = (student.paymentHistory || [])
    .filter(p => p.status !== 'deleted')
    .reduce((sum, p) => sum + p.amount, 0)

  const totalDue = student.pendingAmount + (student.membershipReceiptId && (student.status === 'expired' || student.status === 'due-soon') ? student.fees : 0)

  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return '—'
    try {
      return format(parseISO(dateStr), 'dd MMM yyyy')
    } catch {
      return dateStr
    }
  }

  const attendanceMap: Record<string, 'present' | 'absent'> = {}
  attendance.forEach(record => {
    if (record.records && record.records[student.id] !== undefined) {
      attendanceMap[record.date] = record.records[student.id]
    }
  })

  const studentBatch = batches.find(
    b => b.name === student.currentBatch || b.id === student.currentBatch
  )
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

  let hasAnyData = false

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(viewYear, viewMonth, d)
    const dateStr = format(dateObj, 'yyyy-MM-dd')
    const dayName = DAYS_OF_WEEK[getDay(dateObj)]

    const isSessionDay = sessionDays.includes(dayName)
    const status = attendanceMap[dateStr]

    if (status !== undefined) hasAnyData = true

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
    if (viewYear === now.getFullYear() && viewMonth === now.getMonth()) return

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
          <p className="text-so-muted text-sm mt-0.5">
            Default Fee: {formatCurrency(student.fees)} • Valid Until: <span className="text-so-accent font-semibold">{student.nextDueDate ? formatDate(student.nextDueDate) : 'No receipt yet'}</span> • <span className="capitalize">{getBatchName(student.currentBatch)}</span>
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              student.status === 'active'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : student.status === 'due-soon'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : student.status === 'expired'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-so-surface text-so-muted border border-so-border'
            }`}
          >
            {student.status === 'dropout'
              ? 'Off-Court'
              : student.status === 'due-soon'
              ? 'Due Soon'
              : student.status === 'expired'
              ? 'Overdue'
              : student.status.charAt(0).toUpperCase() + student.status.slice(1)}
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
            {tab === 'details' ? 'Details' : tab === 'transactions' ? 'Transaction Details' : 'Attendance'}
          </button>
        ))}
      </div>

      {profileTab === 'details' && (
        <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-6">
          <h3 className="text-xs text-so-muted uppercase tracking-wider mb-4">Personal Information</h3>
          <div className="grid grid-cols-2 gap-x-12 gap-y-4">
            <InfoRow icon={<User className="w-4 h-4" />} label="Name" value={student.name} />
            <InfoRow icon={<Phone className="w-4 h-4" />} label="Mobile Number" value={student.phone} />
            {student.dateOfBirth && (
              <InfoRow
                icon={<Calendar className="w-4 h-4" />}
                label="Date of Birth"
                value={
                  <span className="flex items-center gap-1.5">
                    {formatDate(student.dateOfBirth)}
                    <span className="text-xs text-so-muted font-normal">(Age: {calcAge(student.dateOfBirth)})</span>
                  </span>
                }
              />
            )}
            <InfoRow icon={<Phone className="w-4 h-4" />} label="Alternate Number" value={student.alternatePhone || '-'} />
            <InfoRow icon={<Shield className="w-4 h-4" />} label="Guardian" value={student.guardianName || '-'} />
          </div>

          <div className="border-t border-so-border my-6"></div>

          <h3 className="text-xs text-so-muted uppercase tracking-wider mb-4 mt-6">More Information</h3>
          <div className="grid grid-cols-2 gap-x-12 gap-y-4">
            <InfoRow icon={<Calendar className="w-4 h-4" />} label="Joining Date" value={formatDateLabel(student.startDate)} />
            <InfoRow icon={<IndianRupee className="w-4 h-4" />} label="Fee" value={`₹ ${student.fees.toLocaleString('en-IN')}`} />
            <InfoRow icon={<Calendar className="w-4 h-4" />} label="Membership Start" value={formatDateLabel(student.membershipStartDate)} />
            <InfoRow icon={<Calendar className="w-4 h-4" />} label="Valid Until" value={<span className="text-so-accent font-semibold">{formatDateLabel(student.nextDueDate)}</span>} />
            <InfoRow icon={<Users className="w-4 h-4" />} label="Current Batch" value={getBatchName(student.currentBatch)} />
            <InfoRow
              icon={<Compass className="w-4 h-4" />}
              label="Source"
              value={<span className="capitalize">{student.enrollmentSource ? student.enrollmentSource.replace('-', ' ') : '-'}</span>}
            />
          </div>

          <div className="mt-6 bg-so-surface border border-so-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-so-text">Current Membership</h3>
              {student.status !== 'inactive' && student.status !== 'dropout' && <button onClick={() => setRenewTarget(true)} className="flex items-center gap-2 bg-so-accent text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm">Issue Fee Receipt</button>}
            </div>
            {student.membershipReceiptId ? <div className="text-sm text-so-text space-y-1">
              <p>Coverage: {formatDateLabel(student.membershipStartDate)} to {formatDateLabel(student.nextDueDate)}</p>
              <p>Outstanding balance: {formatCurrency(student.pendingAmount)}</p>
              {canAdjustDueDate && <button onClick={() => setShowAdjust(value => !value)} className="px-4 py-2 border border-so-border text-so-muted rounded-lg text-sm font-medium hover:border-so-accent hover:text-so-text transition-colors">Adjust Due Date</button>}
            </div> : <div className="text-sm text-so-muted"><p>No active coverage receipt. Coverage begins when a fee receipt is issued.</p>{student.pendingAmount > 0 && <p>Historical outstanding balance: {formatCurrency(student.pendingAmount)}</p>}</div>}
            {showAdjust && student.membershipReceiptId && <div className="space-y-3">
              <label className="text-xs font-medium text-so-muted mb-1.5 block">New Due Date</label>
              <input type="date" value={adjustedDate} min={student.membershipStartDate} onChange={e => setAdjustedDate(e.target.value)} className="w-full bg-so-surface text-sm text-so-text placeholder:text-so-grey px-3 py-2.5 border border-so-border rounded-lg focus:outline-none focus:ring-1 focus:ring-so-accent focus:border-so-accent transition-colors" />
              <label className="text-xs font-medium text-so-muted mb-1.5 block">Reason</label>
              <input type="text" value={adjustReason} onChange={e => setAdjustReason(e.target.value)} className="w-full bg-so-surface text-sm text-so-text placeholder:text-so-grey px-3 py-2.5 border border-so-border rounded-lg focus:outline-none focus:ring-1 focus:ring-so-accent focus:border-so-accent transition-colors" />
              <button disabled={isAdjusting} onClick={async () => {
                setIsAdjusting(true); setActionError('')
                try { await adjustDueDate({ studentId: student.id, nextDueDate: adjustedDate, reason: adjustReason }); setShowAdjust(false); router.refresh() }
                catch (err) { setActionError(err instanceof Error ? err.message : 'Could not adjust due date') }
                finally { setIsAdjusting(false) }
              }} className="flex items-center gap-2 bg-so-accent text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50">{isAdjusting ? 'Saving...' : 'Save Adjustment'}</button>
              {actionError && <p role="alert" className="text-sm text-so-red">{actionError}</p>}
            </div>}
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
              <span className="text-so-muted text-xs uppercase tracking-wider font-semibold">
                Collected <span className="lowercase font-normal">(All Time)</span>
              </span>
              <div className="text-2xl font-bold mt-2 text-so-emerald">
                ₹ {totalCollected.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-4">
              <span className="text-so-muted text-xs uppercase tracking-wider font-semibold">Batch</span>
              <div className="text-2xl font-bold mt-2 text-so-text capitalize">
                {student.currentBatch || 'No Batch'}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <CoachingTransactions key={student.id} students={[student]} scope={{ kind: 'student', studentId: student.id }} />
          </div>
        </div>
      )}

      {/* Attendance Tab */}
      {profileTab === 'attendance' && (
        <div className="space-y-6">
          {!student.currentBatch ? (
            <div className="bg-white border border-so-border rounded-xl shadow-sm p-12 text-center">
              <AlertCircle className="w-8 h-8 text-so-muted mx-auto mb-3" />
              <p className="text-base font-medium text-so-text">No Batch Assigned</p>
              <p className="text-sm text-so-muted mt-1">This student is not assigned to any batch. Assign a batch to record and track attendance.</p>
            </div>
          ) : (
            <div className="bg-white border border-so-border rounded-xl shadow-sm overflow-hidden p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-so-text">Attendance Log</h3>
              <div className="flex items-center gap-4">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 hover:bg-so-surface rounded-md text-so-muted hover:text-so-text"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm font-semibold w-32 text-center">
                  {format(currentViewDate, 'MMMM yyyy')}
                </span>
                <button
                  onClick={handleNextMonth}
                  disabled={isCurrentMonth}
                  className={`p-1.5 rounded-md ${
                    isCurrentMonth ? 'text-gray-300 cursor-not-allowed' : 'text-so-muted hover:text-so-text hover:bg-so-surface'
                  }`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <>
              <div className="grid grid-cols-7 gap-2 mb-2">
                {DAYS_OF_WEEK.map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-so-muted uppercase">
                    {d.substring(0, 3)}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2 mb-6">
                {calendarCells.map((cell, i) => {
                  if (!cell) return <div key={i} className="h-10 w-full bg-transparent"></div>

                  if (!cell.isSessionDay) {
                    return (
                      <div
                        key={i}
                        className={`h-10 w-full flex items-center justify-center text-sm bg-transparent text-so-muted opacity-30 ${
                          cell.isToday ? 'ring-2 ring-so-accent rounded-lg' : ''
                        }`}
                      >
                        {cell.d}
                      </div>
                    )
                  }

                  if (cell.status === 'present') {
                    return (
                      <div
                        key={i}
                        className={`relative h-10 w-full flex items-center justify-center text-sm bg-so-emerald-subtle text-so-emerald font-medium rounded-lg ${
                          cell.isToday ? 'ring-2 ring-so-accent' : ''
                        }`}
                      >
                        {cell.d}
                        <CheckCircle className="absolute bottom-1 right-1 w-2.5 h-2.5" />
                      </div>
                    )
                  }

                  if (cell.status === 'absent') {
                    return (
                      <div
                        key={i}
                        className={`relative h-10 w-full flex items-center justify-center text-sm bg-so-red-subtle text-so-red font-medium rounded-lg ${
                          cell.isToday ? 'ring-2 ring-so-accent' : ''
                        }`}
                      >
                        {cell.d}
                        <X className="absolute bottom-1 right-1 w-2.5 h-2.5" />
                      </div>
                    )
                  }

                  return (
                    <div
                      key={i}
                      className={`h-10 w-full flex items-center justify-center text-sm bg-so-surface text-so-muted rounded-lg border border-so-border ${
                        cell.isToday ? 'ring-2 ring-so-accent' : ''
                      }`}
                    >
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
                    <span className="font-medium text-so-text">
                      <span className="text-emerald-500 mr-1">●</span> Present: {presentCount}
                    </span>
                    <span className="font-medium text-so-text">
                      <span className="text-red-500 mr-1">●</span> Absent: {absentCount}
                    </span>
                    <span className="font-medium text-so-text">
                      <span className="text-so-muted mr-1">●</span> Unmarked: {unmarkedCount}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-so-text">
                    Attendance: {attendancePercentage !== null ? `${attendancePercentage}%` : 'No data'}
                  </div>
                </div>
              )}
            </>
          </div>
          )}
        </div>
      )}

      {/* Modals */}
      {renewTarget && (
        <FeeReceiptModal
          student={student}
          onClose={() => setRenewTarget(false)}
          onSuccess={() => {
            setRenewTarget(false)
            router.refresh()
          }}
        />
      )}

      {showEdit && (
        <EditStudentModal
          student={student}
          batches={batches}
          onClose={() => setShowEdit(false)}
          onSave={() => {
            setShowEdit(false)
          }}
        />
      )}
    </div>
  )
}
