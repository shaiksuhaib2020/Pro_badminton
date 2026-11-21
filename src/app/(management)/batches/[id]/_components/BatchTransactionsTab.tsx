'use client'

import type { Batch } from '@/lib/types/batches'
import type { Student } from '@/lib/types/students'
import CoachingTransactions from '@/components/transactions/CoachingTransactions'

export default function BatchTransactionsTab({ batch, students }: { batch: Batch; students: Student[] }) {
  return <CoachingTransactions key={batch.id} students={students} scope={{ kind: 'batch', batchId: batch.id }} />
}
