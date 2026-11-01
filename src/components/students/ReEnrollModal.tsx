'use client'

import { useState, useEffect } from 'react'
import { Student, Batch, mockSettings, mockBatches, PaymentEntry } from '@/lib/mock-data'
import { getTodayIST, deriveStudentStatus } from '@/lib/utils'
import { X, CheckCircle, AlertCircle, SplitSquareHorizontal, Loader2 } from 'lucide-react'
import { reEnrollStudent } from '@/app/(management)/students/actions'
import { getBatchesAction } from '@/app/(management)/batches/actions'

export default function ReEnrollModal({
  student,
  batches,
  onClose,
  onConfirm,
}: {
  student: Student
  batches?: Batch[]
  onClose: () => void
  onConfirm?: (updatedStudent: Student) => void
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

  const [selectedBatch, setSelectedBatch] = useState(student.currentBatch || availableBatches[0]?.name || '')
  const initialFee = student.fees || availableBatches.find(b => b.name === selectedBatch || b.id === selectedBatch)?.fees || 1500
  const [feeAmount, setFeeAmount] = useState<number>(initialFee)
  const [startDate, setStartDate] = useState(getTodayIST())
  const [endDate, setEndDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'other'>('cash')

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const [isPartial, setIsPartial] = useState(false)
  const [amountPaying, setAmountPaying] = useState<number>(feeAmount)
  const [partialDue, setPartialDue] = useState<number>(0)

  const handleBatchChange = (b: string) => {
    setSelectedBatch(b)
    const match = availableBatches.find(batch => batch.name === b || batch.id === b)
    if (match && typeof match.fees === 'number' && match.fees > 0) {
      setFeeAmount(match.fees)
      if (!isPartial) {
        setAmountPaying(match.fees)
        setPartialDue(0)
      }
    }
  }

  useEffect(() => {
    if (!isPartial) {
      setAmountPaying(feeAmount)
      setPartialDue(0)
    }
  }, [feeAmount, isPartial])

  const handleConfirm = async () => {
    if (!startDate) {
      setToast({ type: 'error', message: 'Please select a start date.' })
      return
    }
    if (!endDate) {
      setToast({ type: 'error', message: 'Please select an end date.' })
      return
    }
    if (endDate <= startDate) {
      setToast({ type: 'error', message: 'End date must be after start date.' })
      return
    }
    if (feeAmount < 1) {
      setToast({ type: 'error', message: 'Fee amount must be at least ₹1.' })
      return
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

    const effectiveAmount = isPartial ? amountPaying : feeAmount
    const effectiveRemaining = isPartial ? partialDue : 0
    const paymentType: PaymentEntry['paymentType'] = isPartial ? 'partial' : 'full'

    const updatedStudent: Student = {
      ...student,
      currentBatch: selectedBatch,
      fees: feeAmount,
      startDate: student.startDate, // immutable
      membershipStartDate: startDate,
      nextDueDate: endDate,
      status: deriveStudentStatus(endDate),
      pendingAmount: effectiveRemaining,
      paymentHistory: [
        ...(student.paymentHistory || []),
        {
          id: crypto.randomUUID(),
          date: startDate,
          amount: effectiveAmount,
          remainingAmount: effectiveRemaining,
          paymentType,
          paymentMethod,
          coveredFrom: startDate,
          coveredUntil: endDate,
          status: 'active',
          note: ''
        }
      ]
    }

    setIsSubmitting(true)
    try {
      await reEnrollStudent({
        studentId: student.id,
        currentBatch: selectedBatch,
        fees: feeAmount,
        startDate,
        endDate,
        amountPaying: effectiveAmount,
        partialDue: effectiveRemaining,
        paymentMethod,
        note: '',
      })

      setToast({ type: 'success', message: `${updatedStudent.name} re-enrolled successfully` })
      setTimeout(() => {
        onConfirm?.(updatedStudent)
        onClose()
      }, 1200)
    } catch (err: unknown) {
      setToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to re-enroll student' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="relative bg-so-card border border-so-border rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-so-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-so-text">Re-enroll {student.name}</h2>
          <button onClick={onClose} className="text-so-grey hover:text-so-accent transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto max-h-[70vh] space-y-5">
          {/* Read-only info */}
          <div className="bg-white border border-so-border rounded-xl p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-so-muted mb-1">Name & Phone</p>
                <p className="text-sm font-semibold text-so-text">{student.name}</p>
                <p className="text-xs text-so-muted mt-0.5">{student.phone}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-so-muted mb-1">Original Join Date</p>
                <p className="text-sm font-semibold text-so-text">{student.startDate}</p>
              </div>
            </div>
          </div>

          {/* Batch & Fee Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">Batch</label>
              <select
                value={selectedBatch}
                onChange={(e) => handleBatchChange(e.target.value)}
                className="w-full bg-white border border-so-border rounded-xl py-2.5 px-3 text-sm text-so-text focus:outline-none focus:border-so-accent transition-colors capitalize"
              >
                {availableBatches.map(b => (
                  <option key={b.id || b.name} value={b.name}>
                    {b.name} {b.fees ? `(₹${b.fees.toLocaleString('en-IN')})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">
                Fee Amount (₹) <span className="text-so-red">*</span>
              </label>
              <input
                type="number"
                min={1}
                value={feeAmount || ''}
                onChange={e => setFeeAmount(Math.max(0, Number(e.target.value)))}
                className="w-full bg-white border border-so-border rounded-xl py-2.5 px-3 text-sm text-so-text focus:outline-none focus:border-so-accent transition-colors"
                placeholder="Fee"
              />
            </div>
          </div>

          {/* Start Date & End Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">
                Start Date <span className="text-so-red">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-white border border-so-border rounded-xl py-2.5 px-3 text-sm text-so-text focus:outline-none focus:border-so-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">
                End Date / Valid Until <span className="text-so-red">*</span>
              </label>
              <input
                type="date"
                min={startDate}
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full bg-white border border-so-border rounded-xl py-2.5 px-3 text-sm text-so-text focus:outline-none focus:border-so-accent transition-colors"
              />
            </div>
          </div>

          {/* Partial Payment Section */}
          <div className="bg-white border border-so-border rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-so-text">Fee</span>
              <span className="text-lg font-bold text-so-emerald">₹{feeAmount.toLocaleString('en-IN')}</span>
            </div>

            {/* Partial Payment Toggle */}
            <div className="pt-2 border-t border-so-border">
              <button
                type="button"
                onClick={() => {
                  setIsPartial(p => !p)
                  if (!isPartial) {
                    setAmountPaying(feeAmount)
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
              <div className="mt-3 p-3 bg-so-surface rounded-xl border border-amber-500/30 space-y-3">
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
            Confirm Re-enrollment
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
