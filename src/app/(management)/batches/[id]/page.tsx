import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getBatchById, getBatches } from '@/lib/queries/batches'
import { getStudentsByBatch } from '@/lib/queries/students'
import { getAttendanceByBatch } from '@/lib/queries/attendance'
import BatchDetail from './_components/BatchDetail'

export default async function BatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { id } = await params
  const sp = searchParams ? await searchParams : {}
  const initialTab = typeof sp.tab === 'string' ? sp.tab : undefined
  const initialDate = typeof sp.date === 'string' ? sp.date : undefined
  const initialMode = typeof sp.mode === 'string' ? sp.mode : undefined

  const [batch, { attendanceStudents, historyStudents }, attendance, batches] = await Promise.all([
    getBatchById(id),
    getStudentsByBatch(id),
    getAttendanceByBatch(id),
    getBatches(),
  ])

  if (!batch) {
    notFound()
  }

  return (
    <Suspense fallback={null}>
      <BatchDetail
        key={batch.id}
        batch={batch}
        batches={batches}
        attendanceStudents={attendanceStudents}
        historyStudents={historyStudents}
        attendance={attendance}
        initialTab={initialTab}
        initialDate={initialDate}
        initialMode={initialMode}
      />
    </Suspense>
  )
}
