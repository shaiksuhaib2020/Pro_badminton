import Link from 'next/link'
import type { DashboardMetrics } from '@/lib/dashboard/metrics'
import { ATTENDANCE_THRESHOLD, MIN_ATTENDANCE_SESSIONS } from '@/lib/dashboard/metrics'
import type { DashboardPeriod } from '@/lib/types/dashboard'
import Card from '@/components/ui/Card'
export default function AttendanceAlertsCard({ metrics: m, period }: { metrics: DashboardMetrics; period: DashboardPeriod }) {
  const marked = m.batchAttendance.some(b => b.total > 0)
  return (
    <Card title="Attendance Alerts" note="Recorded student-session marks">
      <div className="space-y-4">{m.batchAttendance.map(b =>
        <div key={b.id}>
          <div className="flex justify-between gap-3 text-sm">
            <span className="font-medium">{b.name}
            </span>
            <span>{b.rate === null ? 'Not marked' : b.rate + '% | ' + b.present + '/' + b.total + ' present'}
            </span>
          </div>{b.rate !== null &&
            <progress aria-label={b.name + ' attendance'} max={100} value={b.rate} className={period.mode === 'day' ? 'w-full h-2 accent-so-accent' : b.rate >= 75 ? 'w-full h-2 accent-so-emerald' : b.rate >= ATTENDANCE_THRESHOLD ? 'w-full h-2 accent-so-yellow' : 'w-full h-2 accent-so-red'} />}
        </div>)}
      </div>
      {!marked ?
        <p className="text-sm text-so-muted py-8">No attendance recorded for this period.
        </p> : period.mode === 'day' ?
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-semibold">Absent students
            </h3>{m.absent.length ? m.absent.map(a =>
              <p key={a.key} className="text-sm">
                <Link href={'/students/' + a.studentId} className="font-medium">{a.student?.name ?? 'Unavailable student'}
                </Link>
                <span className="text-so-muted"> | {a.batch?.name ?? 'Archived batch'}
                </span>
              </p>) :
              <p className="text-sm text-so-emerald">No absences among recorded marks.
              </p>}
          </div> :
          <div className="mt-4">
            <p className="text-xs text-so-muted mb-3">Below {ATTENDANCE_THRESHOLD}% with at least {MIN_ATTENDANCE_SESSIONS} marked sessions. Unmarked students/days are excluded; rates are grouped by recorded batch.
            </p>{m.flagged.map(s =>
              <div key={s.batchId + ':' + s.studentId} className="flex justify-between gap-3 border-b border-so-border-subtle py-3 text-sm">
                <div>
                  <Link href={'/students/' + s.studentId} className="font-medium">{s.student?.name ?? 'Unavailable student'}
                  </Link>
                  <p className="text-xs text-so-muted">{s.batch?.name ?? 'Archived batch'}
                  </p>
                </div>
                <span className="text-so-red font-semibold">{s.rate}% | {s.present}/{s.total}
                </span>
              </div>)}{!m.flagged.length &&
                <p className="text-sm text-so-emerald">No low-attendance alerts among students with enough recorded sessions.
                </p>}
          </div>}

    </Card>)
}
