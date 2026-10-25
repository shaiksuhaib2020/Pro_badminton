'use client'

import { useState } from 'react'
import { X, Minus, Plus, AlertCircle, SplitSquareHorizontal } from 'lucide-react'
import { CourtMembership } from '@/lib/mock-data'
import { format, addMonths, parseISO, addDays } from 'date-fns'

interface Props {
  membership: CourtMembership
  onClose: () => void
  onSuccess: () => void
}

export default function RenewCourtMembershipModal({ membership, onClose, onSuccess }: Props) {
  const label = membership.contactName

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  
  const [startDate, setStartDate] = useState(todayStr)
  const [endDate, setEndDate] = useState('')
  
  const [enrollType, setEnrollType] = useState<'sessions' | 'monthly'>(membership.planType || 'sessions')
  const [sessionCount, setSessionCount] = useState(10)
  const [monthCount, setMonthCount] = useState(1)
  
  const [amountPaid, setAmountPaid] = useState<number | ''>('')
  
  const [isPartial, setIsPartial] = useState(false)
  const [payingNow, setPayingNow] = useState<number | ''>('')

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'other'>('upi')
  const [notes, setNotes] = useState('')

  const partialDueAmt = isPartial ? Math.max(0, (Number(amountPaid) || 0) - (Number(payingNow) || 0)) : 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (amountPaid === '') return
    
    const amountPayingNum = Number(amountPaid)
    const actualPaid = isPartial ? Number(payingNow || 0) : amountPayingNum
    const partialDueNum = partialDueAmt

    // Update sessions or monthly
    if (enrollType === 'sessions') {
      membership.remainingSessions = (membership.remainingSessions || 0) + sessionCount
      if ((membership.remainingSessions || 0) > 2) membership.status = 'active'
      else if ((membership.remainingSessions || 0) > 0) membership.status = 'sessions-low'
    } else {
      membership.startDate = startDate
      if (endDate) {
        membership.endDate = endDate
      } else {
        membership.endDate = format(addMonths(parseISO(startDate), monthCount), 'yyyy-MM-dd')
      }
      membership.status = 'active'
    }

    // Payment
    membership.amountPaid += actualPaid
    membership.pendingAmount += partialDueNum

    membership.paymentHistory.push({
      id: crypto.randomUUID(),
      membershipId: membership.id,
      date: todayStr,
      amount: amountPayingNum,
      payingNow: isPartial ? actualPaid : undefined,
      partialDue: isPartial ? partialDueNum : undefined,
      paymentMethod,
      entryType: enrollType === 'sessions' ? 'session-topup' : 'renewal',
      status: 'active',
      note: notes.trim() || undefined
    })

    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-so-border">
          <h2 className="text-lg font-bold text-so-text">Renew Membership</h2>
          <button onClick={onClose} className="p-2 text-so-muted hover:text-so-text rounded-full hover:bg-so-surface transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          <form id="renew-member-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-so-muted uppercase mb-1.5">Contact Name</label>
              <input
                type="text"
                readOnly
                value={label}
                className="w-full px-3 py-2 bg-so-surface border border-so-border rounded-lg text-sm text-so-text cursor-not-allowed opacity-75 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-so-muted uppercase mb-1.5">Contact Number</label>
              <input
                type="tel"
                readOnly
                value={membership.contactPhone}
                className="w-full px-3 py-2 bg-so-surface border border-so-border rounded-lg text-sm text-so-text cursor-not-allowed opacity-75 focus:outline-none"
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
                    Expires on {format(addMonths(parseISO(startDate), monthCount), 'dd MMM yyyy')}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-so-muted uppercase mb-1.5">Start Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-so-surface border border-so-border rounded-lg text-sm focus:outline-none focus:border-so-accent"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-so-muted uppercase mb-1.5">End Date (Optional)</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-so-surface border border-so-border rounded-lg text-sm focus:outline-none focus:border-so-accent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-so-muted uppercase mb-1.5">Amount (₹)</label>
              <input
                type="number"
                required
                min="0"
                value={amountPaid}
                onChange={e => setAmountPaid(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 bg-so-surface border border-so-border rounded-lg text-sm focus:outline-none focus:border-so-accent"
              />
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="acceptPartial"
                checked={isPartial}
                onChange={e => setIsPartial(e.target.checked)}
                className="w-4 h-4 rounded text-so-accent focus:ring-so-accent border-so-border"
              />
              <label htmlFor="acceptPartial" className="text-sm font-semibold text-so-text select-none cursor-pointer">Accept Partial Payment</label>
            </div>
            
            {isPartial && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-200">
                <div>
                  <label className="block text-xs font-semibold text-so-muted uppercase mb-1.5">Paying Now</label>
                  <input
                    type="number"
                    required
                    value={payingNow}
                    onChange={e => setPayingNow(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-so-surface border border-so-border rounded-lg text-sm focus:outline-none focus:border-so-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-so-muted uppercase mb-1.5">Partial Due</label>
                  <div className="w-full px-3 py-2 bg-so-surface/50 border border-so-border/50 rounded-lg text-sm font-semibold text-so-muted flex items-center">
                    ₹{partialDueAmt}
                  </div>
                </div>
              </div>
            )}
            
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
            form="renew-member-form"
            className="px-6 py-2 text-sm font-bold bg-so-accent text-so-accent-text rounded-lg hover:bg-so-accent-hover transition-colors shadow-sm"
          >
            Renew Membership
          </button>
        </div>
      </div>
    </div>
  )
}
