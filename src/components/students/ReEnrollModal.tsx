'use client'

import { useState, useEffect } from 'react'
import { Student, mockSettings, PaymentEntry } from '@/lib/mock-data'
import { getTodayIST, formatCurrency, formatDate } from '@/lib/utils'
import { addMonths, addDays, parseISO, format } from 'date-fns'
import { X, CheckCircle, AlertCircle, SplitSquareHorizontal } from 'lucide-react'

export default function ReEnrollModal({
  student,
  onClose,
  onConfirm,
}: {
  student: Student
  onClose: () => void
  onConfirm: (updatedStudent: Student) => void
}) {
  const [membershipTypeId, setMembershipTypeId] = useState<string>(student.membershipTypeId || mockSettings.membershipTypes[0]?.id || '')
  const [selectedBatch, setSelectedBatch] = useState(student.currentBatch)
  const [discountType, setDiscountType] = useState<'₹' | '%'>('₹')
  const [discountValue, setDiscountValue] = useState(0)
  const [startDate, setStartDate] = useState(getTodayIST())
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'other'>('cash')

  const selectedType = mockSettings.membershipTypes.find(m => m.id === membershipTypeId)
  const baseFee = selectedType?.price ?? 0
  const finalFee = discountType === '₹'
    ? baseFee - discountValue
    : baseFee - (baseFee * discountValue / 100)
  const clampedFee = Math.max(0, finalFee)

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const [isPartial, setIsPartial] = useState(false)
  const [amountPaying, setAmountPaying] = useState<number>(clampedFee)
  const [partialDue, setPartialDue] = useState<number>(0)

  useEffect(() => {
    if (!isPartial) {
      setAmountPaying(clampedFee)
    }
  }, [clampedFee, isPartial])

  const newMembershipStartDate = startDate

  const nextDue = selectedType?.durationType === 'months'
    ? format(addMonths(parseISO(startDate), selectedType.duration), 'yyyy-MM-dd')
    : format(addDays(parseISO(startDate), selectedType?.duration || 0), 'yyyy-MM-dd')

  const handleConfirm = () => {
    if (isPartial && amountPaying + partialDue !== clampedFee) {
      setToast({ type: 'error', message: `Paying Now + Partial Due must equal ${clampedFee.toLocaleString('en-IN')}` })
      return
    }
    if (isPartial && amountPaying <= 0) {
      setToast({ type: 'error', message: 'Amount Paying Now must be greater than 0' })
      return
    }

    const effectiveAmount = isPartial ? amountPaying : clampedFee
    const effectiveRemaining = isPartial ? partialDue : 0
    const paymentType: PaymentEntry['paymentType'] = isPartial ? 'partial' : 'full'

    const updatedStudent: Student = {
      ...student,
      membershipTypeId,
      currentBatch: selectedBatch,
      fees: clampedFee,
      startDate: student.startDate,        // immutable  never changes
      membershipStartDate: newMembershipStartDate,
      nextDueDate: nextDue,
      status: effectiveRemaining > 0 ? 'due-soon' : 'active',
      pendingAmount: effectiveRemaining,
      paymentHistory: [
        ...student.paymentHistory,
        {
          id: crypto.randomUUID(),
          date: startDate,
          amount: effectiveAmount,
          remainingAmount: effectiveRemaining,
          paymentType,
          monthsCovered: selectedType?.durationType === 'months' ? selectedType.duration : 0,
          paymentMethod,
          status: 'active',
          note: ''
        }
      ]
    }
    
    setToast({ type: 'success', message: `${updatedStudent.name} re-enrolled successfully` })
    setTimeout(() => {
      onConfirm(updatedStudent)
    }, 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="relative bg-so-card border border-so-border rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-so-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-so-text">Re-enroll {student.name}</h2>
          <button onClick={onClose} className="text-so-grey hover:text-so-accent transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto max-h-[70vh]">
          {/* Read-only info */}
          <div className="bg-white border border-so-border rounded-xl p-4 mb-6">
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
              <div>
                <p className="text-xs text-so-muted mb-1">Payments Recorded</p>
                <p className="text-sm font-semibold text-so-text">{student.paymentHistory.length} times</p>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">Membership Type</label>
                <select
                  value={membershipTypeId}
                  onChange={(e) => setMembershipTypeId(e.target.value)}
                  className="w-full bg-white border border-so-border rounded-xl py-2.5 px-3 text-sm text-so-text focus:outline-none focus:border-so-accent transition-colors"
                >
                  {mockSettings.membershipTypes.map(mt => (
                    <option key={mt.id} value={mt.id}>{mt.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">Batch</label>
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="w-full bg-white border border-so-border rounded-xl py-2.5 px-3 text-sm text-so-text focus:outline-none focus:border-so-accent transition-colors"
                >
                  {mockSettings.batches.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">Fee Configuration</label>
              <div className="bg-white border border-so-border rounded-xl p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-so-muted">Base Fee (Auto-locked)</span>
                  <span className="text-sm font-semibold text-so-text">{formatCurrency(baseFee)}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="text-sm text-so-muted w-1/3">Discount</span>
                  <div className="flex flex-1 gap-2">
                    <button
                      onClick={() => setDiscountType('₹')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        discountType === '₹' ? 'bg-so-accent-subtle text-so-accent border-so-accent' : 'bg-transparent text-so-muted border-so-border hover:border-so-accent/50'
                      }`}
                    >
                      ₹
                    </button>
                    <button
                      onClick={() => setDiscountType('%')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        discountType === '%' ? 'bg-so-accent-subtle text-so-accent border-so-accent' : 'bg-transparent text-so-muted border-so-border hover:border-so-accent/50'
                      }`}
                    >
                      %
                    </button>
                    <input
                      type="number"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                      className="flex-1 bg-transparent border-b border-so-border pb-1 px-1 text-sm text-so-text focus:outline-none focus:border-so-accent transition-colors text-right"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-so-border">
                  <span className="text-sm font-medium text-so-text">Final Fee</span>
                  <span className="text-lg font-bold text-so-emerald">{formatCurrency(clampedFee)}</span>
                </div>
              </div>
              
              {/* Partial Payment Toggle */}
              <div className="mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsPartial(p => !p)
                    if (!isPartial) {
                      setAmountPaying(clampedFee)
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
                        max={clampedFee}
                        value={amountPaying}
                        onChange={e => {
                          const paying = Math.max(0, Number(e.target.value))
                          setAmountPaying(paying)
                          setPartialDue(Math.max(0, clampedFee - paying))
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
                          setAmountPaying(Math.max(0, clampedFee - due))
                        }}
                        className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-amber-600 font-semibold focus:outline-none focus:border-amber-500"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-so-muted">
                    Total: ₹{(amountPaying + partialDue).toLocaleString('en-IN')} 
                    {amountPaying + partialDue !== clampedFee && (
                      <span className="text-red-600 ml-1">
                        (doesn't match fee of ₹{clampedFee.toLocaleString('en-IN')})
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-so-surface rounded-lg border border-so-border">
              <div>
                <p className="text-xs text-so-muted mb-1">Period Start</p>
                <p className="text-sm text-so-text">
                  {newMembershipStartDate ? formatDate(newMembershipStartDate) : '...'}
                </p>
              </div>
              <div>
                <p className="text-xs text-so-muted mb-1">New Due Date</p>
                <p className="text-sm text-[#5278EA] font-semibold">
                  {nextDue ? formatDate(nextDue) : '...'}
                </p>
              </div>
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

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-so-border bg-so-surface flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-so-muted hover:text-so-text transition-colors">
            Cancel
          </button>
          <button onClick={handleConfirm} className="px-5 py-2 bg-so-accent text-white rounded-lg text-sm font-bold hover:bg-so-accent-hover transition-colors">
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
            <button onClick={() => setToast(null)} className="opacity-60 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
