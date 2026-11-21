'use client'

import { format, parseISO } from 'date-fns'
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'
import type { BatchAttendanceController } from './useBatchAttendance'

export default function AttendanceMarking({ controller }: { controller: BatchAttendanceController }) {
  const {
    handleCancelAttendance, markingDate, todayStr, enterMarkingMode, presentCount, absentCount,
    unmarkedCount, attendanceStudents, handleMarkAllPresent, draftRecords, handleMark,
  } = controller

  return (
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
        {attendanceStudents.length > 0 && (
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
        {attendanceStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-so-muted">
            No active students in this batch.
          </div>
        ) : (
          <div className="divide-y divide-so-border">
            {attendanceStudents.map(student => {
              const status = draftRecords[student.id]
              const rowBg = status === 'present' ? 'bg-emerald-50/50' : status === 'absent' ? 'bg-red-50/50' : ''

              return (
                <div key={student.id} className={`flex items-center justify-between px-5 py-3.5 ${rowBg} transition-colors`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-so-surface border border-so-border flex items-center justify-center text-xs font-bold text-so-muted uppercase">
                      {student.name.substring(0, 2)}
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
  )
}

export function AttendanceMarkingActions({ controller }: { controller: BatchAttendanceController }) {
  const { isDirty, allMarked, handleCancelAttendance, isSaving, handleSaveAttendance } = controller

  return (
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
          disabled={isSaving}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-so-border bg-white text-so-text hover:bg-so-surface shadow-sm"
        >
          Cancel
        </button>
        <button
          onClick={handleSaveAttendance}
          disabled={isSaving}
          className="px-6 py-2 rounded-lg text-sm font-semibold transition-all bg-so-accent text-so-accent-text hover:bg-so-accent-hover shadow-md flex items-center gap-2 disabled:opacity-50"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Attendance
        </button>
      </div>
    </div>
  )
}
