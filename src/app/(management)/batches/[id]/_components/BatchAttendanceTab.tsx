'use client'

import AttendanceInsights from './attendance/AttendanceInsights'
import AttendanceMarking, { AttendanceMarkingActions } from './attendance/AttendanceMarking'
import type { BatchAttendanceController } from './attendance/useBatchAttendance'

export default function BatchAttendanceTab({ controller }: { controller: BatchAttendanceController }) {
  return (
    <>
      <div className="bg-so-card border border-so-border rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        {controller.attView === 'insights'
          ? <AttendanceInsights controller={controller} />
          : <AttendanceMarking controller={controller} />}
      </div>
      {controller.attView === 'marking' && controller.attendanceStudents.length > 0 && (
        <AttendanceMarkingActions controller={controller} />
      )}
    </>
  )
}
