'use client'

import { useState } from 'react'
import { Student, PaymentEntry, mockSettings } from '@/lib/mock-data'
import { X } from 'lucide-react'
import { format, parseISO } from 'date-fns'

type Props = {
  student: Student
  onClose: () => void
  onConfirm: (entry: PaymentEntry) => void
}

export default function CollectRemainingModal({ student, onClose, onConfirm }: Props) {
  const [amountPaid, setAmountPaid] = useState<number>(student.pendingAmount || 0)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'other'>('cash')
  const [note, setNote] = useState('')

  const membershipType = mockSettings.membershipTypes.find(m => m.id === student.membershipTypeId)

  const handleConfirm = () => {
    if (amountPaid <= 0) return

    const entry: PaymentEntry = {
      id: crypto.randomUUID(),
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: amountPaid,
      remainingAmount: 0,
      paymentType: 'full',      // collecting the remaining clears the debt
      monthsCovered: 0,         // no new period — just clearing existing debt
      paymentMethod,
      status: 'active',
      note: note.trim(),
    }
    onConfirm(entry)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-so-card rounded-2xl shadow-2xl border border-so-border w-full max-w-sm mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-so-border bg-so-surface/30">
          <h2 className="text-lg font-bold text-so-text">Collect Remaining Payment</h2>
          <button onClick={onClose} className="p-1 hover:bg-so-surface rounded-md text-so-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Student info card */}
          <div className="bg-so-surface rounded-xl p-4 flex items-center justify-between border border-so-border">
            <div>
              <p className="text-sm font-semibold text-so-text">{student.name}</p>
              <p className="text-xs text-so-muted mt-0.5">{membershipType?.name || 'Membership'}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-so-muted uppercase tracking-wider">Current Due Date</p>
              <p className="text-sm font-semibold text-so-text mt-0.5">
                {student.nextDueDate ? format(parseISO(student.nextDueDate), 'dd MMM yyyy') : '-'}
              </p>
            </div>
          </div>

          {/* Amount field */}
          <div>
            <label className="block text-xs font-bold text-so-muted uppercase tracking-wider mb-2">Total Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-emerald-600">₹</span>
              <input
                type="number"
                min={1}
                value={amountPaid || ''}
                onChange={e => setAmountPaid(Number(e.target.value))}
                className="w-full bg-emerald-50 border border-emerald-200 rounded-xl pl-8 pr-4 py-3 text-lg font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Payment Method pills */}
          <div>
            <label className="block text-xs font-bold text-so-muted uppercase tracking-wider mb-2">Payment Method</label>
            <div className="grid grid-cols-4 gap-2">
              {(['cash', 'upi', 'card', 'other'] as const).map(method => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 rounded-lg text-xs font-semibold transition-all capitalize ${
                    paymentMethod === method
                      ? 'bg-so-accent text-white shadow-sm'
                      : 'bg-so-surface text-so-muted hover:text-so-text border border-so-border'
                  }`}
                >
                  {method === 'upi' ? 'UPI' : method}
                </button>
              ))}
            </div>
          </div>

          {/* Note field */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="block text-xs font-bold text-so-muted uppercase tracking-wider">Internal Note</label>
              <span className="text-[10px] text-so-muted font-medium">{note.length}/200</span>
            </div>
            <textarea
              maxLength={200}
              rows={2}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Paid in two instalments, parent requested receipt..."
              className="w-full bg-white border border-so-border rounded-xl px-4 py-3 text-sm text-so-text placeholder:text-so-muted/50 focus:outline-none focus:border-so-accent resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-so-border bg-so-surface/30 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-white border border-so-border rounded-xl text-sm font-semibold text-so-muted hover:text-so-text hover:border-so-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={amountPaid <= 0}
            className="flex-1 py-2.5 bg-so-accent text-white rounded-xl text-sm font-bold hover:bg-so-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            Confirm Payment
          </button>
        </div>
        
      </div>
    </div>
  )
}
