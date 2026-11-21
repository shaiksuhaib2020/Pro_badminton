'use client'

import type { Batch } from '@/lib/types/batches'
import type { Student } from '@/lib/types/students'
import StudentList from '@/components/students/StudentList'

export default function BatchStudentsTab({ batch, batches, students }: { batch: Batch; batches: Batch[]; students: Student[] }) {
  return <StudentList students={students} batches={batches} batchScope={batch} />
}
