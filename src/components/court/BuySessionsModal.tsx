import { useState } from 'react'
import { X } from 'lucide-react'
import { mockCourtPlans, CourtMembership, getMembershipDisplayLabel } from '@/lib/mock-data'
import { format } from 'date-fns'

interface Props {
  membership: CourtMembership
  onClose: () => void
  onSuccess: () => void
}

export default function BuySessionsModal({ membership, onClose, onSuccess }: Props) {
  const label = getMembershipDisplayLabel(membership)

  const sessionPlans = mockCourtPlans.filter(p => p.planType === 'sessions')
  const [selectedPlanId, setSelectedPlanId] = useState<string>(sessionPlans[0]?.id || '')
  
  const selectedPlan = sessionPlans.find(p => p.id === selectedPlanId)
  const defaultAmount = selectedPlan?.price || 0

  const [amount, setAmount] = useState<number | ''>(defaultAmount)
  const [paymentMethod, setPaymentMethod] = useState<'cash'|'upi'|'card'|'other'>('upi')
  const [notes, setNotes] = useState('')

  // Update amount when plan changes
  const handlePlanChange = (id: string) => {
    setSelectedPlanId(id)
    const p = sessionPlans.find(x => x.id === id)
    if (p) setAmount(p.price)
  }

  const handleConfirm = () => {
    if (!amount || !selectedPlan || !selectedPlan.totalSessions) return
    
    membership.amountPaid += Number(amount)
    membership.remainingSessions = selectedPlan.totalSessions
    membership.totalSessions = selectedPlan.totalSessions
    membership.planId = selectedPlan.id
    membership.status = 'active'

    membership.paymentHistory.push({
      id: crypto.randomUUID(),
        membershipId: membership.id,
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: Number(amount),
      paymentMethod,
      entryType: 'session-topup',
      status: 'active'
    })
    
    onSuccess()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="px-6 py-4 border-b border-so-border flex items-center justify-between bg-so-surface/50">
            <h2 className="text-lg font-bold text-so-text">Buy Sessions</h2>
            <button onClick={onClose} className="p-1.5 text-so-muted hover:text-so-text hover:bg-so-border/50 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 space-y-4">
            <div>
              <p className="text-xs text-so-muted uppercase font-semibold">Member</p>
              <p className="text-sm font-medium text-so-text">{label}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-so-muted uppercase mb-1.5">Select Plan</label>
              <select value={selectedPlanId} onChange={e => handlePlanChange(e.target.value)} className="w-full px-3 py-2 bg-so-surface border border-so-border rounded-lg text-sm text-so-text focus:outline-none focus:border-so-accent">
                {sessionPlans.map(p => (
                  <option key={p.id} value={p.id}>{p.name} - ₹{p.price}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-so-muted uppercase mb-1.5">Amount (₹)</label>
              <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value) || '')} className="w-full px-3 py-2 bg-so-surface border border-so-border rounded-lg text-sm text-so-text focus:outline-none focus:border-so-accent" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-so-muted uppercase mb-1.5">Payment Method</label>
              <div className="flex gap-2">
                {(['cash', 'upi', 'card', 'other'] as const).map(method => (
                  <button key={method} onClick={() => setPaymentMethod(method)} className={`flex-1 py-1.5 text-xs font-semibold rounded-md border capitalize ${paymentMethod === method ? 'bg-so-accent text-white border-so-accent' : 'bg-white text-so-muted border-so-border hover:border-so-accent hover:text-so-text'}`}>
                    {method}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="px-6 py-4 border-t border-so-border bg-so-surface/50 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-so-muted hover:text-so-text">Cancel</button>
            <button onClick={handleConfirm} className="px-5 py-2 bg-so-accent text-white rounded-lg text-sm font-bold shadow-sm hover:opacity-90">Confirm</button>
          </div>
        </div>
      </div>
    </>
  )
}
