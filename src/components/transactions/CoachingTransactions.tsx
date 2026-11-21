'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import type { Student } from '@/lib/types/students'
import { formatCurrency, getTodayIST } from '@/lib/utils'
import { voidPayment } from '@/app/(management)/students/actions'
import FeeReceiptModal from '@/components/transactions/FeeReceiptModal'
import DueClearanceModal from '@/components/transactions/DueClearanceModal'
import RecentTab from './RecentTab'
import PaidTab from './PaidTab'
import PendingTab from './PendingTab'
import PartialTab from './PartialTab'
import type { ReceiptRow, TransactionRange, TransactionScope } from './types'
import { getCoachingTransactionData } from './transaction-data'

type Tab = 'recent' | 'paid' | 'pending' | 'partial'
type Range = TransactionRange

export default function CoachingTransactions({ students, scope }: { students: Student[]; scope: TransactionScope }) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('recent')
  const [search, setSearch] = useState('')
  const [range, setRange] = useState<Range>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [feeTarget, setFeeTarget] = useState<Student | null>(null)
  const [clearanceTarget, setClearanceTarget] = useState<ReceiptRow | null>(null)
  const [voidTarget, setVoidTarget] = useState<ReceiptRow | null>(null)
  const [voiding, setVoiding] = useState(false)
  const [error, setError] = useState('')

  const today = getTodayIST()
  const { recentRows, paidRows, pendingStudents, partialRows } = getCoachingTransactionData(students, scope, {
    today, search, range, customFrom, customTo,
  })

  const confirmVoid = async () => {
    if (!voidTarget || voiding) return
    setVoiding(true)
    setError('')
    try {
      await voidPayment(voidTarget.receipt.id, voidTarget.student.id)
      setVoidTarget(null)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not void receipt')
    } finally {
      setVoiding(false)
    }
  }

  const refresh = () => { setFeeTarget(null); setClearanceTarget(null); router.refresh() }
  const tabLabels: Record<Tab, string> = { recent: 'Recent', paid: 'Paid', pending: 'Pending', partial: 'Partially Paid' }

  return <div>
      <div className="flex items-center gap-2 border-b border-so-border mb-6">{(['recent', 'paid', 'pending', 'partial'] as Tab[]).map(value => <button key={value} onClick={() => setTab(value)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${tab === value ? 'border-so-accent text-so-accent' : 'border-transparent text-so-muted hover:text-so-text'}`}>{tabLabels[value]}</button>)}</div>
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-so-muted" strokeWidth={1.75} /><input aria-label="Search fee transactions" type="text" placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-white border border-so-border rounded-lg pl-9 pr-4 py-2 text-sm text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-accent" /></div>
        {(tab === 'recent' || tab === 'paid') && <div className="flex items-center gap-2 flex-wrap">{(['all', 'currentMonth', 'lastMonth', 'custom'] as Range[]).map(value => <button key={value} onClick={() => setRange(value)} className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${range === value ? 'bg-so-accent text-white' : 'border border-so-border text-so-muted hover:border-so-accent'}`}>{value === 'all' ? 'All' : value === 'currentMonth' ? 'This Month' : value === 'lastMonth' ? 'Last Month' : 'Custom'}</button>)}</div>}
      </div>
      {range === 'custom' && (tab === 'recent' || tab === 'paid') && <div className="flex items-center gap-2 mt-2 mb-4"><input aria-label="Transactions from date" type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} max={customTo || undefined} className="bg-white border border-so-border rounded-md px-3 py-1.5 text-sm text-so-text" /><span className="text-so-muted text-sm">to</span><input aria-label="Transactions to date" type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} min={customFrom} className="bg-white border border-so-border rounded-md px-3 py-1.5 text-sm text-so-text" /></div>}
      {tab === 'recent' && <RecentTab rows={recentRows} onVoid={setVoidTarget} />}
      {tab === 'paid' && <PaidTab rows={paidRows} onVoid={setVoidTarget} />}
      {tab === 'pending' && <PendingTab today={today} students={pendingStudents} onCollect={setFeeTarget} />}
      {tab === 'partial' && <PartialTab today={today} rows={partialRows} onSettle={setClearanceTarget} />}
      {tab === 'partial' && <p className="text-xs text-so-muted mt-4">Outstanding across visible receipts: {formatCurrency(partialRows.reduce((sum, row) => sum + row.receipt.remainingAmount, 0))}</p>}
      {error && <p role="alert" className="text-sm text-so-red mt-4">{error}</p>}
      {feeTarget && <FeeReceiptModal student={feeTarget} onClose={() => setFeeTarget(null)} onSuccess={refresh} />}
      {clearanceTarget && <DueClearanceModal student={clearanceTarget.student} receipt={clearanceTarget.receipt} onClose={() => setClearanceTarget(null)} onSuccess={refresh} />}
      {voidTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"><div className="relative bg-so-card border border-so-border rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl"><div className="px-6 py-5 space-y-5"><h2 className="text-lg font-bold text-so-text">Void receipt?</h2><p className="text-sm text-so-muted">This will void {formatCurrency(voidTarget.receipt.amount)} received from {voidTarget.student.name}. If it is a due clearance, the balance returns to the original receipt.</p>{error && <p role="alert" className="text-sm text-so-red">{error}</p>}</div><div className="px-6 py-4 border-t border-so-border flex justify-end gap-3"><button onClick={() => {setVoidTarget(null); setError('')}} className="px-4 py-2.5 border border-so-border text-so-muted rounded-lg text-sm font-medium hover:border-so-accent hover:text-so-text transition-colors">Cancel</button><button disabled={voiding} onClick={confirmVoid} className="px-5 py-2.5 bg-so-accent text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">{voiding ? 'Voiding...' : 'Void Receipt'}</button></div></div></div>}
  </div>
}
