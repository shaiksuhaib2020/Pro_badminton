'use client'

import { useState, useEffect } from 'react'
import { Student, PaymentEntry, Batch, mockSettings, mockBatches } from '@/lib/mock-data'
import { formatDate } from '@/lib/utils'
import { addMonths, parseISO, format } from 'date-fns'
import { X, CheckCircle, AlertCircle, SplitSquareHorizontal, Loader2 } from 'lucide-react'
import { renewStudent, collectRemaining } from '@/app/(management)/students/actions'
import { getBatchesAction } from '@/app/(management)/batches/actions'

export default function RenewModal({
  student,
  batches,
  isCollectingRemaining = false,
  onClose,
  onConfirm,
}: {
  student: Student
  batches?: Batch[]
  isCollectingRemaining?: boolean
  onClose: () => void
  onConfirm?: (
    entry: PaymentEntry,
    newDueDate: string,
    newMembershipStartDate: string,
    newPendingAmount: number,
    newBatch: string
  ) => void
}) {
  const [batchList, setBatchList] = useState<Batch[]>(batches ?? [])

  useEffect(() => {
    if (batches && batches.length > 0) {
      setBatchList(batches)
    } else {
      getBatchesAction()
        .then(res => {
          if (res && res.length > 0) {
            setBatchList(res)
          }
        })
        .catch(console.error)
    }
  }, [batches])

  const availableBatches = batchList.length > 0
    ? batchList
    : mockBatches.length > 0
      ? mockBatches
      : mockSettings.batches.map(name => ({ id: name, name, days: [], fees: 0, branchId: '' }))
  const [renewalFee, setRenewalFee] = useState<number>(student.fees || 1500)
  const [newEndDate, setNewEndDate] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'other'>('cash')
  const [noteValue, setNoteValue] = useState('')
  const [selectedBatch, setSelectedBatch] = useState(student.currentBatch)

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const effectiveTotal = isCollectingRemaining && student.pendingAmount ? student.pendingAmount : renewalFee

  const [isPartial, setIsPartial] = useState(false)
  const [amountPaying, setAmountPaying] = useState<number>(effectiveTotal)
  const [partialDue, setPartialDue] = useState<number>(0)

  useEffect(() => {
    if (!isPartial) {
      setAmountPaying(effectiveTotal)
      setPartialDue(0)
    }
  }, [effectiveTotal, isPartial])

  const applyPresetMonths = (months: number) => {
    try {
      const baseDate = parseISO(student.nextDueDate)
      const calculated = format(addMonths(baseDate, months), 'yyyy-MM-dd')
      setNewEndDate(calculated)
    } catch {
      const calculated = format(addMonths(new Date(), months), 'yyyy-MM-dd')
      setNewEndDate(calculated)
    }
  }

  const handleConfirm = async () => {
    if (!isCollectingRemaining) {
      if (!newEndDate) {
        setToast({ type: 'error', message: 'Please select a new end date.' })
        return
      }
      if (newEndDate <= student.nextDueDate) {
        setToast({ type: 'error', message: 'New end date must be after current due date.' })
        return
      }
      if (renewalFee < 1) {
        setToast({ type: 'error', message: 'Renewal fee must be at least ₹1.' })
        return
      }
    }

    if (isPartial) {
      if (amountPaying < 0) {
        setToast({ type: 'error', message: 'Amount paying cannot be negative.' })
        return
      }
      if (partialDue < 0) {
        setToast({ type: 'error', message: 'Partial due cannot be negative.' })
        return
      }
    }

    const effectiveAmount = isPartial ? amountPaying : effectiveTotal
    const effectiveRemaining = isPartial ? partialDue : 0
    const paymentType: PaymentEntry['paymentType'] = isPartial ? 'partial' : 'full'

    const newEntry: PaymentEntry = {
      id: crypto.randomUUID(),
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: effectiveAmount,
      remainingAmount: effectiveRemaining,
      paymentType,
      coveredFrom: student.nextDueDate,
      coveredUntil: isCollectingRemaining ? student.nextDueDate : newEndDate,
      paymentMethod,
      status: 'active',
      note: noteValue.trim(),
    }

    setIsSubmitting(true)
    try {
      if (isCollectingRemaining) {
        await collectRemaining(student.id, {
          amount: effectiveAmount,
          paymentMethod,
          note: noteValue.trim(),
        })
      } else {
        await renewStudent({
          studentId: student.id,
          newEndDate,
          amountPaying: effectiveAmount,
          renewalFee,
          partialDue: effectiveRemaining,
          paymentMethod,
          note: noteValue.trim(),
          newBatch: selectedBatch,
        })
      }

      setToast({ type: 'success', message: `${isCollectingRemaining ? 'Remaining payment collected' : 'Membership renewed'} successfully` })
      setTimeout(() => {
        onConfirm?.(
          newEntry,
          isCollectingRemaining ? student.nextDueDate : newEndDate,
          student.nextDueDate,
          effectiveRemaining,
          selectedBatch
        )
        onClose()
      }, 1200)
    } catch (err: unknown) {
      setToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to process renewal' })
    } finally {
      setIsSubmitting(false)
    }
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
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Student Info Card */}
          <div className="flex justify-between items-center bg-white border border-so-border rounded-xl p-4">
            <div>
              <p className="text-sm font-semibold text-so-text">{student.name}</p>
              <p className="text-xs text-so-muted capitalize">{selectedBatch || 'No batch'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-so-muted">Current Due Date</p>
              <p className="text-sm font-medium text-so-text">{formatDate(student.nextDueDate)}</p>
            </div>
          </div>

          {!isCollectingRemaining && (
            <>
              {/* Renewal Fee */}
              <div>
                <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-1.5">
                  Renewal Fee (₹) <span className="text-so-red">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={renewalFee || ''}
                  onChange={e => setRenewalFee(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
                  placeholder="Enter renewal fee"
                />
              </div>

              {/* Quick Presets & New End Date */}
              <div>
                <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">
                  New End Date <span className="text-so-red">*</span>
                </label>
                
                {/* Presets */}
                <div className="grid grid-cols-4 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => applyPresetMonths(1)}
                    className="py-1.5 px-2 bg-so-surface border border-so-border rounded-lg text-xs font-semibold text-so-text hover:bg-so-accent hover:text-white hover:border-so-accent transition-colors"
                  >
                    +1 Month
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetMonths(3)}
                    className="py-1.5 px-2 bg-so-surface border border-so-border rounded-lg text-xs font-semibold text-so-text hover:bg-so-accent hover:text-white hover:border-so-accent transition-colors"
                  >
                    +3 Months
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetMonths(6)}
                    className="py-1.5 px-2 bg-so-surface border border-so-border rounded-lg text-xs font-semibold text-so-text hover:bg-so-accent hover:text-white hover:border-so-accent transition-colors"
                  >
                    +6 Months
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetMonths(12)}
                    className="py-1.5 px-2 bg-so-surface border border-so-border rounded-lg text-xs font-semibold text-so-text hover:bg-so-accent hover:text-white hover:border-so-accent transition-colors"
                  >
                    +1 Year
                  </button>
                </div>

                {/* Mandatory Date Picker */}
                <input
                  type="date"
                  value={newEndDate}
                  min={student.nextDueDate}
                  onChange={e => setNewEndDate(e.target.value)}
                  className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
                />
                <p className="text-[11px] text-so-muted mt-1">Must be after {formatDate(student.nextDueDate)}</p>
              </div>

              {/* Batch selection */}
              <div>
                <label className="block text-xs text-so-muted uppercase tracking-wider mb-2">
                  Batch
                </label>
                <div className="flex gap-2 flex-wrap">
                  {availableBatches.map(batchItem => (
                    <button
                      key={batchItem.id || batchItem.name}
                      type="button"
                      onClick={() => setSelectedBatch(batchItem.name)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedBatch === batchItem.name
                          ? 'bg-so-accent text-white'
                          : 'border border-so-border text-so-muted hover:border-so-accent hover:text-so-text'
                      }`}
                    >
                      {batchItem.name}
                    </button>
                  ))}
                </div>
                {selectedBatch !== student.currentBatch && (
                  <p className="text-xs text-so-yellow mt-1.5">
                    Batch will be updated from {student.currentBatch} to {selectedBatch}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Fee & Partial Payment Section */}
          <div>
            <label className="block text-xs font-semibold text-so-emerald uppercase tracking-wider mb-2">Total Amount</label>
            <div className="px-4 py-2 text-sm text-so-emerald font-bold bg-so-emerald-subtle border border-so-emerald/20 rounded-lg">
              ₹ {effectiveTotal.toLocaleString('en-IN')}
            </div>

            {/* Partial Payment Toggle */}
            <div className="mt-2">
              <button
                type="button"
                onClick={() => {
                  setIsPartial(p => !p)
                  if (!isPartial) {
                    setAmountPaying(effectiveTotal)
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

            {/* Partial Payment Fields (Direct entry, no auto-calculation) */}
            {isPartial && (
              <div className="mt-3 p-4 bg-so-surface rounded-xl border border-amber-500/30 space-y-3">
                <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Direct partial breakdown:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                      Paying Now (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={amountPaying}
                      onChange={e => setAmountPaying(Math.max(0, Number(e.target.value)))}
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
                      onChange={e => setPartialDue(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-amber-600 font-semibold focus:outline-none focus:border-amber-500"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">Payment Method</label>
            <div className="flex gap-2">
              {(['cash', 'upi', 'card', 'other'] as const).map(method => (
                <button
                  key={method}
                  type="button"
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

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">Note (Optional)</label>
            <textarea
              maxLength={200}
              rows={2}
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              placeholder="e.g. Paid in cash, requested receipt..."
              className="w-full bg-white border border-so-border rounded-xl py-2.5 px-3 text-sm text-so-text focus:outline-none focus:border-so-accent transition-colors resize-none"
            />
            <div className="text-right text-xs text-so-muted mt-1">
              {noteValue.length}/200
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-so-border bg-so-surface flex justify-end gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-so-muted hover:text-so-text transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirm}
            className="px-5 py-2 bg-so-accent text-white rounded-lg text-sm font-bold hover:bg-so-accent-hover transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
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
            <button type="button" onClick={() => setToast(null)} className="opacity-60 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
