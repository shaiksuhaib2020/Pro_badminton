import { getStudents } from '@/lib/queries/students'
import TransactionsView from './_components/TransactionsView'

export default async function TransactionsPage() {
  const students = await getStudents()
  return <TransactionsView students={students} />
}
