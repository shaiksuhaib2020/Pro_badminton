'use client'

import { useState } from 'react'
import type { Student } from '@/lib/types/students'
import CoachingTransactions from '@/components/transactions/CoachingTransactions'
import CourtTransactionsView from './CourtTransactionsView'

export default function TransactionsView({ students }: { students: Student[] }) {
  const [segment, setSegment] = useState<'coaching' | 'court'>('coaching')
  return <div className="max-w-7xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
    <div className="flex items-center justify-between mb-8"><div><h1 className="text-2xl font-bold text-so-text">Fee Transactions</h1><p className="text-so-muted text-sm mt-1">Receipts, upcoming fees, and outstanding balances</p></div></div>
    <div className="flex bg-so-surface border border-so-border rounded-xl p-1 w-fit mb-6 shadow-sm">
      {(['coaching', 'court'] as const).map(value => <button key={value} onClick={() => setSegment(value)} className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${segment === value ? 'bg-white text-so-text shadow-sm border border-so-border' : 'text-so-muted hover:text-so-text'}`}>{value === 'coaching' ? 'Coaching' : 'Court'}</button>)}
    </div>
    {segment === 'court' ? <CourtTransactionsView /> : <CoachingTransactions students={students} scope={{ kind: 'academy' }} />}
  </div>
}
