'use client'

import { useState } from 'react'
import { addMonths, format, parseISO } from 'date-fns'
import { X, Loader2 } from 'lucide-react'
import type { PaymentMethod } from '@/lib/types/payments'
import type { Student } from '@/lib/types/students'
import { createFeeReceipt } from '@/app/(management)/students/actions'
import { deriveStudentStatus, formatCurrency, formatDate, getTodayIST } from '@/lib/utils'

type Props = { student: Student; onClose: () => void; onSuccess: () => void }

export default function FeeReceiptModal({ student, onClose, onSuccess }: Props) {
  const today = getTodayIST()
  const initialStart = student.membershipReceiptId
    ? student.nextDueDate >= today ? student.nextDueDate : today
    : student.startDate || today
  const [startDate, setStartDate] = useState(initialStart)
  const [nextDueDate, setNextDueDate] = useState(format(addMonths(parseISO(initialStart), 1), 'yyyy-MM-dd'))
  const [paymentDate, setPaymentDate] = useState(today)
  const [totalFee, setTotalFee] = useState(student.fees > 0 ? String(student.fees) : '')
  const [amountPaying, setAmountPaying] = useState(student.fees > 0 ? String(student.fees) : '')
  const [partialPayment, setPartialPayment] = useState(false)
  const [transactionId, setTransactionId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const total = Number(totalFee)
  const paying = partialPayment ? Number(amountPaying) : total
  const remaining = Number.isFinite(total) && Number.isFinite(paying) ? Math.max(0, Math.round(total * 100) - Math.round(paying * 100)) / 100 : 0
  const preview = nextDueDate > startDate ? deriveStudentStatus(nextDueDate) : null

  const submit = async () => {
    if (saving) return
    setError('')
    if (!startDate || !nextDueDate || nextDueDate <= startDate || !paymentDate) {
      setError('Select a start date, a later due date, and a payment date')
      return
    }
    if (!Number.isFinite(total) || !Number.isFinite(paying) || total <= 0 || paying <= 0 || paying > total || (partialPayment && paying >= total)) {
      setError('Enter a positive amount. Partial payment must be less than Amount.')
      return
    }
    setSaving(true)
    try {
      await createFeeReceipt({ studentId: student.id, totalFee: total, amountPaying: paying,
        startDate, nextDueDate, paymentDate, paymentMethod: paymentMethod || null, transactionId, note })
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not issue fee receipt')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full bg-so-surface text-sm text-so-text placeholder:text-so-grey px-3 py-2.5 border border-so-border rounded-lg focus:outline-none focus:ring-1 focus:ring-so-accent focus:border-so-accent transition-colors'
  const labelClass = 'text-xs font-medium text-so-muted mb-1.5 block'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative bg-so-card border border-so-border rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-so-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-so-text">Issue Fee Receipt</h2>
          <button type="button" onClick={onClose} className="text-so-grey hover:text-so-accent transition-colors" aria-label="Close"><X className="w-5 h-5" strokeWidth={1.75} /></button>
        </div>
        <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[70vh]">
          <div className="bg-so-surface border border-so-border rounded-lg p-4">
            <p className="text-xs font-medium text-so-muted uppercase tracking-wide">Student</p>
            <p className="text-sm font-semibold text-so-text">{student.name} · {student.phone}</p>
          </div>
          <p className={labelClass}>Payment For</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className={labelClass}>Start Date *</label><input className={inputClass} type="date" value={startDate} onChange={e => {
              const value = e.target.value
              setStartDate(value)
              if (value) setNextDueDate(format(addMonths(parseISO(value), 1), 'yyyy-MM-dd'))
            }} /></div>
            <div><label className={labelClass}>Next Due Date *</label><input className={inputClass} type="date" value={nextDueDate} min={startDate} onChange={e => setNextDueDate(e.target.value)} /></div>
          </div>
          <div className="flex items-center gap-2">
            {[1].map(months => <button key={months} type="button" onClick={() => startDate && setNextDueDate(format(addMonths(parseISO(startDate), months), 'yyyy-MM-dd'))} className="px-3 py-1.5 text-xs font-semibold rounded-full border border-so-border text-so-muted hover:border-so-accent">+{months} {months === 1 ? 'Month' : 'Months'}</button>)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className={labelClass}>Amount (₹) *</label><input className={inputClass} type="number" min="0.01" step="0.01" value={totalFee} onChange={e => setTotalFee(e.target.value)} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm text-so-text"><input type="checkbox" checked={partialPayment} onChange={e => { setPartialPayment(e.target.checked); setAmountPaying('') }} />Partial Payment</label>
          {partialPayment && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className={labelClass}>Paying Now (₹) *</label><input className={inputClass} type="number" min="0.01" max={total} step="0.01" value={amountPaying} onChange={e => setAmountPaying(e.target.value)} /></div>
            <div><label className={labelClass}>Partial Due (₹)</label><input className={inputClass} value={remaining} readOnly /></div>
          </div>}
          <div className="bg-so-surface border border-so-border rounded-lg p-4 space-y-1 text-sm">
            <p className="text-so-text">Received: <span className="font-semibold text-so-emerald">{formatCurrency(Number.isFinite(paying) ? paying : 0)}</span></p>
            <p className="text-so-text">Remaining Due: <span className="font-semibold text-so-yellow">{formatCurrency(remaining)}</span></p>
            <p className="text-so-muted">Coverage: {startDate ? formatDate(startDate) : '—'} to {nextDueDate ? formatDate(nextDueDate) : '—'} · {preview ? preview === 'expired' ? 'Overdue' : preview === 'due-soon' ? 'Due Soon' : 'Active' : 'Select valid dates'}</p>
          </div>
          <div><label className={labelClass}>Amount Received On *</label><input className={inputClass} type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} /></div>
          <div>
            <label className={labelClass}>Payment Mode</label>
            <select className="w-full bg-so-surface text-sm text-so-text px-3 py-2.5 border border-so-border rounded-lg focus:outline-none focus:ring-1 focus:ring-so-accent cursor-pointer" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod | '')}>
              <option value="">Select payment mode</option>{(['cash', 'upi', 'card', 'other'] as const).map(method => <option key={method} value={method}>{method === 'upi' ? 'UPI' : method.charAt(0).toUpperCase() + method.slice(1)}</option>)}
            </select>
          </div>
          <div><label className={labelClass}>Transaction ID</label><input className={inputClass} value={transactionId} onChange={e => setTransactionId(e.target.value)} /></div>
          <div><label className={labelClass}>Notes</label><textarea className="w-full bg-so-surface text-sm text-so-text placeholder:text-so-grey px-3 py-2.5 border border-so-border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-so-accent" rows={2} value={note} onChange={e => setNote(e.target.value)} /></div>
          {error && <p className="text-sm text-so-red" role="alert">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-so-border flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2.5 border border-so-border text-so-muted rounded-lg text-sm font-medium hover:border-so-accent hover:text-so-text transition-colors">Cancel</button>
          <button type="button" onClick={submit} disabled={saving} className="px-5 py-2.5 bg-so-accent text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">{saving && <Loader2 className="w-4 h-4 animate-spin shrink-0" strokeWidth={1.75} />}Issue Receipt</button>
        </div>
      </div>
    </div>
  )
}
