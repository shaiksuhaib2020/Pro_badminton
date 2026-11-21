'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import type { PaymentEntry, PaymentMethod } from '@/lib/types/payments'
import type { Student } from '@/lib/types/students'
import { settlePendingDue } from '@/app/(management)/students/actions'
import { formatCurrency, formatDate, getTodayIST } from '@/lib/utils'

type Props = { student: Student; receipt: PaymentEntry; onClose: () => void; onSuccess: () => void }

export default function DueClearanceModal({ student, receipt, onClose, onSuccess }: Props) {
  const amount = String(receipt.remainingAmount)
  const [transactionId, setTransactionId] = useState('')
  const [paymentDate, setPaymentDate] = useState(getTodayIST())
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (saving) return
    setError('')
    const paying = Number(amount)
    if (!Number.isFinite(paying) || paying <= 0 || paying > receipt.remainingAmount) {
      setError(`Enter an amount from ₹0.01 to ${formatCurrency(receipt.remainingAmount)}`)
      return
    }
    setSaving(true)
    try {
      await settlePendingDue({ studentId: student.id, receiptId: receipt.id, amount: paying,
        paymentDate, paymentMethod, transactionId, note })
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not clear due')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full bg-so-surface text-sm text-so-text placeholder:text-so-grey px-3 py-2.5 border border-so-border rounded-lg focus:outline-none focus:ring-1 focus:ring-so-accent focus:border-so-accent transition-colors'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative bg-so-card border border-so-border rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-so-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-so-text">Collect Remaining Due</h2>
          <button type="button" onClick={onClose} className="text-so-grey hover:text-so-accent transition-colors" aria-label="Close"><X className="w-5 h-5" strokeWidth={1.75} /></button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div className="bg-so-surface border border-so-border rounded-lg p-4 text-sm text-so-text">
            <p className="font-semibold">{student.name}</p>
            <p className="text-so-muted">Outstanding Amount: {formatCurrency(receipt.remainingAmount)}</p>
            <p className="text-so-muted">Paid Already: {formatCurrency(receipt.amount)}</p>
            <p className="text-so-muted">Payment For: {receipt.coveredFrom && receipt.coveredUntil ? `${formatDate(receipt.coveredFrom)} to ${formatDate(receipt.coveredUntil)}` : 'Unavailable'}</p>
          </div>
          <div><label className="text-xs font-medium text-so-muted mb-1.5 block">Partial Due Amount (₹)</label><input className={inputClass} type="number" min="0.01" max={receipt.remainingAmount} step="0.01" value={amount} readOnly /></div>
          <div><label className="text-xs font-medium text-so-muted mb-1.5 block">Amount Received On</label><input className={inputClass} type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} /></div>
          <div><label className="text-xs font-medium text-so-muted mb-1.5 block">Payment Method</label><div className="flex flex-wrap gap-2">{(['cash', 'upi', 'card', 'other'] as const).map(method => <button key={method} type="button" onClick={() => setPaymentMethod(method)} className={`px-3 py-1.5 text-xs font-semibold rounded-full ${paymentMethod === method ? 'bg-so-accent text-white' : 'border border-so-border text-so-muted hover:border-so-accent'}`}>{method.toUpperCase()}</button>)}</div></div>
          <div><label className="text-xs font-medium text-so-muted mb-1.5 block">Transaction ID</label><input className={inputClass} value={transactionId} onChange={e => setTransactionId(e.target.value)} /></div>
          <div><label className="text-xs font-medium text-so-muted mb-1.5 block">Note (Optional)</label><textarea className="w-full bg-so-surface text-sm text-so-text placeholder:text-so-grey px-3 py-2.5 border border-so-border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-so-accent" rows={2} value={note} onChange={e => setNote(e.target.value)} /></div>
          {error && <p className="text-sm text-so-red" role="alert">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-so-border flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2.5 border border-so-border text-so-muted rounded-lg text-sm font-medium hover:border-so-accent hover:text-so-text transition-colors">Cancel</button>
          <button type="button" onClick={submit} disabled={saving} className="px-5 py-2.5 bg-so-accent text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">{saving && <Loader2 className="w-4 h-4 animate-spin shrink-0" strokeWidth={1.75} />}Record Clearance</button>
        </div>
      </div>
    </div>
  )
}
