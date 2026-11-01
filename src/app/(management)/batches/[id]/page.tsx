import { notFound } from 'next/navigation'
import { getBatchById } from '@/lib/queries/batches'
import { getStudentsByBatch } from '@/lib/queries/students'
import { getAttendanceByBatch } from '@/lib/queries/attendance'
import BatchDetail from './_components/BatchDetail'

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [batch, students, attendance] = await Promise.all([
    getBatchById(id),
    getStudentsByBatch(id),
    getAttendanceByBatch(id),
  ])

  if (!batch) {
    notFound()
  }

  return (
    <BatchDetail
      batch={batch}
      students={students}
      attendance={attendance}
    />
  )
}
