'use client'

import { format, parseISO } from 'date-fns'
import { Search, Calendar as CalendarIcon } from 'lucide-react'
import type { BatchAttendanceController } from './useBatchAttendance'
import type { AttInsightFilter } from './attendance-utils'

export default function AttendanceInsights({ controller }: { controller: BatchAttendanceController }) {
  const {
    batch, attendanceStudents, attendanceRecords, todayStr, insightFilter, setInsightFilter,
    insightDates, batchAvgPct, enterMarkingMode, allBatchRecords, attSearchQuery,
    setAttSearchQuery, filteredAttStudents, datesWithRecords, getStatus,
  } = controller

  return (
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
            const todayRecord = attendanceRecords.find(r => (r?.batchId === batch?.id || r?.batchId === batch?.name) && r.date === todayStr)
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
        {attendanceStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-so-muted">
            <CalendarIcon className="w-12 h-12 text-so-muted mb-4" />
            <p className="text-so-text font-medium mb-3">No active students in this batch</p>
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
                          {student.name.substring(0, 2)}
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
  )
}
