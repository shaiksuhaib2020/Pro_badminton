'use client'

import { useState, useEffect } from 'react'
import { Student, PaymentEntry, mockSettings } from '@/lib/mock-data'
import { getTodayIST, formatDate } from '@/lib/utils'
import { addMonths, addDays, parseISO, format } from 'date-fns'
import { Minus, Plus, X, CheckCircle, AlertCircle, SplitSquareHorizontal } from 'lucide-react'

export default function RenewModal({
  student,
  isCollectingRemaining = false,
  onClose,
  onConfirm,
}: {
  student: Student
  isCollectingRemaining?: boolean
  onClose: () => void
  onConfirm: (
    entry: PaymentEntry,
    newDueDate: string,
    newMembershipStartDate: string,
    newPendingAmount: number,
    newBatch: string
  ) => void
}) {
  const [periods, setPeriods] = useState(1)

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'other'>('cash')
  const [noteValue, setNoteValue] = useState('')
  const [selectedBatch, setSelectedBatch] = useState(student.currentBatch)

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const mt = mockSettings.membershipTypes.find(m => m.id === student.membershipTypeId)
  const totalAmount = isCollectingRemaining && student.pendingAmount ? student.pendingAmount : (mt?.price ?? student.fees) * periods

  const [isPartial, setIsPartial] = useState(false)
  const [amountPaying, setAmountPaying] = useState<number>(totalAmount)
  const [partialDue, setPartialDue] = useState<number>(0)

  useEffect(() => {
    if (!isPartial) {
      setAmountPaying(totalAmount)
    }
  }, [totalAmount, isPartial])

  useEffect(() => {
    if (isCollectingRemaining && student.pendingAmount) {
      setPeriods(1)
      if (!isPartial) setAmountPaying(student.pendingAmount)
    } else {
      if (!isPartial) setAmountPaying(totalAmount)
    }
  }, [periods, isCollectingRemaining, student, totalAmount, isPartial])
  
  const [periodStart, setPeriodStart] = useState<string>(student.nextDueDate)

  const newDueDate = isCollectingRemaining
    ? student.nextDueDate
    : (mt?.durationType === 'months'
        ? format(addMonths(parseISO(periodStart), mt.duration * periods), 'yyyy-MM-dd')
        : format(addDays(parseISO(periodStart), (mt?.duration || 0) * periods), 'yyyy-MM-dd'))

  const handleConfirm = () => {
    if (!isCollectingRemaining) {
      if (!periodStart) {
        setToast({ type: 'error', message: 'Please select a period start date.' })
        return
      }
      if (periodStart < format(new Date(), 'yyyy-MM-dd')) {
        setToast({ type: 'error', message: 'Period start date cannot be in the past.' })
        return
      }
    }

    if (isPartial && amountPaying + partialDue !== totalAmount) {
      setToast({ type: 'error', message: `Paying Now + Partial Due must equal ${totalAmount.toLocaleString('en-IN')}` })
      return
    }
    if (isPartial && amountPaying <= 0) {
      setToast({ type: 'error', message: 'Amount Paying Now must be greater than 0' })
      return
    }

    const effectiveAmount = isPartial ? amountPaying : totalAmount
    const effectiveRemaining = isPartial ? partialDue : 0
    const paymentType: PaymentEntry['paymentType'] = isPartial
      ? 'partial'
      : periods > 1 ? 'advance' : 'full'

    const newEntry: PaymentEntry = {
      id: crypto.randomUUID(),
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: effectiveAmount,
      remainingAmount: effectiveRemaining,
      paymentType,
      monthsCovered: isCollectingRemaining ? 0 : (mt?.durationType === 'months' ? mt.duration * periods : 0),
      paymentMethod,
      status: 'active',
      note: noteValue.trim()
    }

    setToast({ type: 'success', message: `${isCollectingRemaining ? 'Remaining payment collected' : 'Membership renewed'} successfully` })
    setTimeout(() => {
      onConfirm(newEntry, newDueDate, isCollectingRemaining ? student.membershipStartDate : periodStart, effectiveRemaining, selectedBatch)
    }, 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="relative bg-so-card border border-so-border rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-so-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-so-text">
            {isCollectingRemaining ? 'Collect Remaining Payment' : 'Renew Membership'}
          </h2>
          <button onClick={onClose} className="text-so-grey hover:text-so-accent transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          <div className="flex justify-between items-center bg-white border border-so-border rounded-xl p-4">
            <div>
              <p className="text-sm font-semibold text-so-text">{student.name}</p>
              <p className="text-xs text-so-muted capitalize">{mt?.name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-so-muted">Current Due Date</p>
              <p className="text-sm font-medium text-so-text">{formatDate(student.nextDueDate)}</p>
            </div>
          </div>

          {!isCollectingRemaining && (
            <div>
              <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">Periods to Renew</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPeriods(p => Math.max(1, p - 1))}
                  className="w-8 h-8 rounded-md border border-so-border flex items-center justify-center hover:border-so-accent"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-mono text-lg">{periods}</span>
                <button
                  onClick={() => setPeriods(p => p + 1)}
                  className="w-8 h-8 rounded-md border border-so-border flex items-center justify-center hover:border-so-accent"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {mt && (
                <p className="text-xs text-so-muted mt-2">
                  Extends by {mt.duration * periods} {mt.durationType === 'months' ? 'month' : 'day'}{(mt.duration * periods) > 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}
          {!isCollectingRemaining && (
            <div className="mb-4">
              <label className="block text-xs text-so-muted uppercase tracking-wider mb-2">
                Batch
              </label>
              <div className="flex gap-2 flex-wrap">
                {mockSettings.batches.map(batch => (
                  <button
                    key={batch}
                    onClick={() => setSelectedBatch(batch)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedBatch === batch
                        ? 'bg-so-accent text-white'
                        : 'border border-so-border text-so-muted hover:border-so-accent hover:text-so-text'
                    }`}
                  >
                    {batch}
                  </button>
                ))}
              </div>
              {selectedBatch !== student.currentBatch && (
                <p className="text-xs text-so-yellow mt-1.5">
                   Batch will be updated from {student.currentBatch} to {selectedBatch}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-so-emerald uppercase tracking-wider mb-2">Total Amount</label>
            <div className="px-4 py-2 text-sm text-so-emerald font-bold bg-so-emerald-subtle border border-so-emerald/20 rounded-lg">
              ₹ {totalAmount.toLocaleString('en-IN')}
            </div>

            {/* Partial Payment Toggle */}
            <div className="mt-1">
              <button
                type="button"
                onClick={() => {
                  setIsPartial(p => !p)
                  if (!isPartial) {
                    setAmountPaying(totalAmount)
                    setPartialDue(0)
                  }
                }}
                className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                  isPartial
                    ? 'border-so-accent text-so-accent bg-so-accent/10'
                    : 'border-so-border text-so-muted hover:border-so-accent hover:text-so-text'
                }`}
              >
                <SplitSquareHorizontal className="w-3.5 h-3.5" />
                {isPartial ? 'Partial Payment Active' : 'Paying Partially?'}
              </button>
            </div>

            {/* Partial Payment Fields */}
            {isPartial && (
              <div className="mt-3 p-4 bg-so-surface rounded-xl border border-amber-500/30 space-y-3">
                <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Student is paying a partial amount  enter breakdown below
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                      Paying Now (₹)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={totalAmount}
                      value={amountPaying}
                      onChange={e => {
                        const paying = Math.max(0, Number(e.target.value))
                        setAmountPaying(paying)
                        setPartialDue(Math.max(0, totalAmount - paying))
                      }}
                      className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-emerald font-semibold focus:outline-none focus:border-so-accent"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                      Partial Due (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={partialDue}
                      onChange={e => {
                        const due = Math.max(0, Number(e.target.value))
                        setPartialDue(due)
                        setAmountPaying(Math.max(0, totalAmount - due))
                      }}
                      className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-amber-600 font-semibold focus:outline-none focus:border-amber-500"
                      placeholder="0"
                    />
                  </div>
                </div>
                <p className="text-xs text-so-muted">
                  Total: ₹{(amountPaying + partialDue).toLocaleString('en-IN')} 
                  {amountPaying + partialDue !== totalAmount && (
                    <span className="text-red-600 ml-1">
                      (doesn't match fee of ₹{totalAmount.toLocaleString('en-IN')})
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">Payment Method</label>
            <div className="flex gap-2">
              {(['cash', 'upi', 'card', 'other'] as const).map(method => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`px-4 py-2 flex-1 rounded-lg text-sm font-medium capitalize transition-colors ${
                    paymentMethod === method
                      ? 'bg-so-accent text-white'
                      : 'border border-so-border text-so-muted hover:border-so-accent hover:text-so-text'
                  }`}
                >
                  {method === 'upi' ? 'UPI' : method}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">Note (Optional)</label>
            <textarea
              maxLength={200}
              rows={2}
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              placeholder="e.g. Paid in two instalments, parent requested receipt..."
              className="w-full bg-white border border-so-border rounded-xl py-2.5 px-3 text-sm text-so-text focus:outline-none focus:border-so-accent transition-colors resize-none"
            />
            <div className="text-right text-xs text-so-muted mt-1">
              {noteValue.length}/200
            </div>
          </div>

          {!isCollectingRemaining && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div>
                <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                  Period Start
                </label>
                <input
                  type="date"
                  value={periodStart}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  onChange={e => setPeriodStart(e.target.value)}
                  className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent focus:ring-1 focus:ring-so-accent/30"
                />
                <p className="text-xs text-so-muted mt-1">
                  Defaults to current due date
                </p>
              </div>
              <div>
                <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                  New Due Date
                </label>
                <p className="text-sm font-semibold text-[#5278EA] mt-2.5">
                  {periodStart ? format(parseISO(newDueDate), 'dd MMM yyyy') : ''}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-so-border bg-so-surface flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-so-muted hover:text-so-text transition-colors">
            Cancel
          </button>
          <button onClick={handleConfirm} className="px-5 py-2 bg-so-accent text-white rounded-lg text-sm font-bold hover:bg-so-accent-hover transition-colors">
            Confirm Payment
          </button>
        </div>

        {toast && (
          <div className={`absolute bottom-4 left-4 right-4 z-10 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium shadow-lg transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {toast.type === 'success'
              ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
              : <AlertCircle className="w-4 h-4 flex-shrink-0" />
            }
            <span className="flex-1">{toast.message}</span>
            <button onClick={() => setToast(null)} className="opacity-60 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
