import { getStudents } from '@/lib/queries/students'
import { getBatches } from '@/lib/queries/batches'
import StudentList from './_components/StudentList'

export default async function StudentsPage() {
  const [students, batches] = await Promise.all([
    getStudents(),
    getBatches(),
  ])

  return <StudentList students={students} batches={batches} />
}
