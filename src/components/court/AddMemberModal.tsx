'use client'

import { useState } from 'react'
import { X, Minus, Plus, AlertCircle, SplitSquareHorizontal } from 'lucide-react'
import { mockCourtMembers, CourtMember } from '@/lib/mock-data'
import { format, addMonths, parseISO } from 'date-fns'

interface AddMemberModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function AddMemberModal({ onClose, onSuccess }: AddMemberModalProps) {
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [joiningDate, setJoiningDate] = useState(todayStr)
  
  const [enrollType, setEnrollType] = useState<'sessions' | 'monthly'>('sessions')
  const [sessionCount, setSessionCount] = useState(10)
  const [monthCount, setMonthCount] = useState(1)
  
  const [amountPaid, setAmountPaid] = useState<number | ''>('')
  
  const [isPartial, setIsPartial] = useState(false)
  const [partialDue, setPartialDue] = useState<number | ''>('')

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'other'>('upi')
  const [notes, setNotes] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim() || amountPaid === '') return

    const newMember: CourtMember = {
      id: crypto.randomUUID(),
      name,
      phone,
      planType: enrollType,
      joiningDate,
      // Monthly
      ...(enrollType === 'monthly' && {
        durationMonths: monthCount,
        membershipStartDate: joiningDate,
        nextDueDate: format(addMonths(parseISO(joiningDate), monthCount), 'yyyy-MM-dd'),
      }),
      // Sessions
      ...(enrollType === 'sessions' && {
        totalSessions: sessionCount,
        remainingSessions: sessionCount,
      }),
      status: 'active',
      amountPaid: Number(amountPaid),
      pendingAmount: isPartial ? Number(partialDue || 0) : 0,
      notes: notes.trim() || undefined,
      checkInHistory: [],
      paymentHistory: [{
        id: crypto.randomUUID(),
        date: joiningDate,
        amount: Number(amountPaid),
        paymentMethod,
        entryType: 'new',
        status: 'active',
      }],
    }
    mockCourtMembers.push(newMember)
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-so-border">
          <h2 className="text-lg font-bold text-so-text">Add Court Member</h2>
          <button onClick={onClose} className="p-2 text-so-muted hover:text-so-text rounded-full hover:bg-so-surface transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          <form id="add-member-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-so-muted uppercase mb-1.5">Member Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 bg-so-surface border border-so-border rounded-lg text-sm focus:outline-none focus:border-so-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-so-muted uppercase mb-1.5">Phone Number</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-so-surface border border-so-border rounded-lg text-sm focus:outline-none focus:border-so-accent"
              />
            </div>

            <div className="bg-so-surface border border-so-border rounded-xl p-4">
              <div className="flex bg-white border border-so-border rounded-lg p-1 mb-4">
                <button
                  type="button"
                  onClick={() => setEnrollType('sessions')}
                  className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                    enrollType === 'sessions' ? 'bg-so-surface text-so-text shadow-sm border border-so-border' : 'text-so-muted hover:text-so-text'
                  }`}
                >
                  Sessions
                </button>
                <button
                  type="button"
                  onClick={() => setEnrollType('monthly')}
                  className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                    enrollType === 'monthly' ? 'bg-so-surface text-so-text shadow-sm border border-so-border' : 'text-so-muted hover:text-so-text'
                  }`}
                >
                  Monthly
                </button>
              </div>

              {enrollType === 'sessions' ? (
                <div>
                  <label className="block text-xs font-semibold text-so-text text-center mb-2">Number of Sessions</label>
                  <div className="flex items-center justify-center gap-4">
                    <button type="button" onClick={() => setSessionCount(Math.max(1, sessionCount - 1))} disabled={sessionCount <= 1} className="p-2 rounded-full border border-so-border bg-white text-so-text disabled:opacity-50 hover:bg-so-surface">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-xl font-bold w-12 text-center">{sessionCount}</span>
                    <button type="button" onClick={() => setSessionCount(sessionCount + 1)} className="p-2 rounded-full border border-so-border bg-white text-so-text hover:bg-so-surface">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-center text-xs text-so-muted mt-2">Member gets this many court sessions</p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-so-text text-center mb-2">Duration (Months)</label>
                  <div className="flex items-center justify-center gap-4">
                    <button type="button" onClick={() => setMonthCount(Math.max(1, monthCount - 1))} disabled={monthCount <= 1} className="p-2 rounded-full border border-so-border bg-white text-so-text disabled:opacity-50 hover:bg-so-surface">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-xl font-bold w-12 text-center">{monthCount}</span>
                    <button type="button" onClick={() => setMonthCount(monthCount + 1)} className="p-2 rounded-full border border-so-border bg-white text-so-text hover:bg-so-surface">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-center text-xs text-so-muted mt-2">
                    Expires on {format(addMonths(parseISO(joiningDate), monthCount), 'dd MMM yyyy')}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-so-muted uppercase mb-1.5">Joining Date</label>
              <input
                type="date"
                required
                max={todayStr}
                value={joiningDate}
                onChange={e => setJoiningDate(e.target.value)}
                className="w-full px-3 py-2 bg-so-surface border border-so-border rounded-lg text-sm focus:outline-none focus:border-so-accent"
              />
            </div>

            <div>
              {/* Partial Payment Toggle */}
              <div className="mb-3">
                <button
                  type="button"
                  onClick={() => setIsPartial(p => !p)}
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

              {!isPartial ? (
                <div>
                  <label className="block text-xs font-semibold text-so-muted uppercase mb-1.5">Amount Paid (₹)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={amountPaid}
                    onChange={e => setAmountPaid(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-so-surface border border-so-border rounded-lg text-sm focus:outline-none focus:border-so-accent"
                  />
                </div>
              ) : (
                <div className="p-4 bg-so-surface rounded-xl border border-amber-500/30 space-y-3">
                  <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Member is paying a partial amount
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                        Paying Now (₹)
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={amountPaid}
                        onChange={e => setAmountPaid(e.target.value === '' ? '' : Number(e.target.value))}
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
                        required
                        min="0"
                        value={partialDue}
                        onChange={e => setPartialDue(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-amber-600 font-semibold focus:outline-none focus:border-amber-500"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-so-muted">
                    Total Plan Fee: ₹{((Number(amountPaid) || 0) + (Number(partialDue) || 0)).toLocaleString('en-IN')} 
                  </p>
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-so-muted uppercase mb-1.5">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 bg-so-surface border border-so-border rounded-lg text-sm focus:outline-none focus:border-so-accent"
              >
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-so-muted uppercase mb-1.5">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-so-surface border border-so-border rounded-lg text-sm focus:outline-none focus:border-so-accent resize-none"
              />
            </div>
          </form>
        </div>

        <div className="p-4 border-t border-so-border bg-so-surface/50 flex justify-end gap-3 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-so-text hover:bg-so-border/50 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-member-form"
            className="px-6 py-2 text-sm font-bold bg-so-accent text-so-accent-text rounded-lg hover:bg-so-accent-hover transition-colors shadow-sm"
          >
            Add Member
          </button>
        </div>
      </div>
    </div>
  )
}
