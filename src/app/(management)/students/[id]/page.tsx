import { getStudentById } from '@/lib/queries/students'
import { getBatches } from '@/lib/queries/batches'
import { getAttendanceByStudent } from '@/lib/queries/attendance'
import { notFound } from 'next/navigation'
import StudentProfileView from './_components/StudentProfileView'
import { getServerSession } from '@/lib/supabase/auth-context'

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [student, batches, session] = await Promise.all([
    getStudentById(id),
    getBatches(),
    getServerSession(),
  ])

  if (!student) {
    notFound()
  }

  const attendance = student.currentBatchId
    ? await getAttendanceByStudent(student.id, student.currentBatchId)
    : []

  return <StudentProfileView student={student} batches={batches} attendance={attendance} canAdjustDueDate={session.role === 'owner' || session.role === 'manager'} />
}
