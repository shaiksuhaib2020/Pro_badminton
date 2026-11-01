import { getBatches } from '@/lib/queries/batches'
import { getStudents } from '@/lib/queries/students'
import BatchesView from './_components/BatchesView'

export default async function BatchesPage() {
  const [batches, students] = await Promise.all([
    getBatches(),
    getStudents(),
  ])

  return <BatchesView initialBatches={batches} students={students} />
}
