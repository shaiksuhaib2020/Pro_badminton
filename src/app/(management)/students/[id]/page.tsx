import { getStudentById } from '@/lib/queries/students'
import { getBatches } from '@/lib/queries/batches'
import { getAttendanceByStudent } from '@/lib/queries/attendance'
import { notFound } from 'next/navigation'
import StudentProfileView from './_components/StudentProfileView'

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [student, batches] = await Promise.all([
    getStudentById(id),
    getBatches(),
  ])

  if (!student) {
    notFound()
  }

  const attendance = student.currentBatch
    ? await getAttendanceByStudent(student.id, student.currentBatch)
    : []

  return <StudentProfileView student={student} batches={batches} attendance={attendance} />
}
