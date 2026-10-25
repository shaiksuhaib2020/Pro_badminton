'use client'

import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { mockCourtMemberships, CourtMembership, CourtMembershipPerson, CourtPaymentEntryType, CourtPaymentEntryStatus } from '@/lib/mock-data'
import { getTodayIST } from '@/lib/utils'

type AddCourtMembershipModalProps = {
  onClose: () => void
  onSuccess: () => void
}

export default function AddCourtMembershipModal({ onClose, onSuccess }: AddCourtMembershipModalProps) {
  const [activeTab, setActiveTab] = useState<'contact' | 'membership'>('contact')

  // Contact Details
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [address, setAddress] = useState('')
  const [email, setEmail] = useState('')
  const [people, setPeople] = useState<string[]>([])

  // Membership Details
  const [planType, setPlanType] = useState<'monthly' | 'sessions'>('monthly')
  const [amount, setAmount] = useState('')
  const [isPartialPayment, setIsPartialPayment] = useState(false)
  const [payingNow, setPayingNow] = useState('')
  const [sessions, setSessions] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'other'>('upi')
  const [notes, setNotes] = useState('')
  const [startDate, setStartDate] = useState(getTodayIST())
  const [endDate, setEndDate] = useState('')

  const handleAddPerson = () => {
    if (people.length < 7) {
      setPeople([...people, ''])
    }
  }

  const handleRemovePerson = (index: number) => {
    setPeople(people.filter((_, i) => i !== index))
  }

  const handlePersonNameChange = (index: number, val: string) => {
    const newPeople = [...people]
    newPeople[index] = val
    setPeople(newPeople)
  }

  const handleSave = () => {
    if (!contactName.trim() || !contactPhone.trim() || !startDate || !endDate) return

    const id = crypto.randomUUID()
    const validPeople: CourtMembershipPerson[] = people.filter(p => p.trim()).map(p => ({
      id: crypto.randomUUID(),
      membershipId: id,
      name: p.trim()
    }))

    const totalAmount = parseFloat(amount) || 0
    let actualPaid = totalAmount
    let partialDue = 0
    if (isPartialPayment) {
      actualPaid = parseFloat(payingNow) || 0
      partialDue = Math.max(0, totalAmount - actualPaid)
    }

    const membership: CourtMembership = {
      id,
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
      address: address.trim() || undefined,
      email: email.trim() || undefined,
      people: validPeople,
      planType,
      startDate,
      endDate: endDate,
      totalSessions: planType === 'sessions' ? (parseInt(sessions) || 0) : undefined,
      remainingSessions: planType === 'sessions' ? (parseInt(sessions) || 0) : undefined,
      status: 'active', // Should theoretically derive status, but simple for now
      amountPaid: actualPaid,
      pendingAmount: partialDue,
      notes: notes.trim() || undefined,
      paymentHistory: [
        {
          id: crypto.randomUUID(),
          membershipId: id,
          date: startDate,
          amount: totalAmount,
          payingNow: isPartialPayment ? actualPaid : undefined,
          partialDue: isPartialPayment ? partialDue : undefined,
          paymentMethod,
          entryType: 'new' as CourtPaymentEntryType,
          status: 'active' as CourtPaymentEntryStatus,
          note: notes.trim() || undefined
        }
      ],
      checkInHistory: []
    }

    mockCourtMemberships.push(membership)
    onSuccess()
    onClose()
  }

  const partialDueAmt = Math.max(0, (parseFloat(amount) || 0) - (parseFloat(payingNow) || 0))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col overflow-hidden max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-so-border bg-so-surface/30 shrink-0">
          <h2 className="text-lg font-bold text-so-text">Add Membership</h2>
          <button onClick={onClose} className="p-2 text-so-muted hover:text-so-text hover:bg-so-surface rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {/* Body Layout */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Vertical Side Tabs */}
          <div className="w-[200px] border-r border-so-border bg-so-surface/10 p-4 space-y-2 shrink-0">
            <button
              onClick={() => setActiveTab('contact')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'contact' ? 'bg-so-accent text-white shadow-sm' : 'text-so-muted hover:bg-so-surface hover:text-so-text'
              }`}
            >
              Contact Details
            </button>
            <button
              onClick={() => setActiveTab('membership')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'membership' ? 'bg-so-accent text-white shadow-sm' : 'text-so-muted hover:bg-so-surface hover:text-so-text'
              }`}
            >
              Membership Details
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            
            {activeTab === 'contact' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-so-text mb-1.5">Contact Name *</label>
                    <input type="text" value={contactName} onChange={e => setContactName(e.target.value)} className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm focus:border-so-accent focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-so-text mb-1.5">Contact Phone Number *</label>
                    <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm focus:border-so-accent focus:outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-so-text mb-1.5">Address (Optional)</label>
                    <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm focus:border-so-accent focus:outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-so-text mb-1.5">Email (Optional)</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm focus:border-so-accent focus:outline-none" />
                  </div>
                </div>

                <hr className="border-so-border" />

                <div>
                  <label className="block text-sm font-bold text-so-text mb-1">Group Members</label>
                  <p className="text-xs text-so-muted mb-4">Up to 7 additional members (8 total including contact).</p>
                  
                  <div className="space-y-3">
                    {people.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <input type="text" value={p} onChange={e => handlePersonNameChange(idx, e.target.value)} placeholder={`Member ${idx + 1} Name`} className="flex-1 bg-white border border-so-border rounded-lg px-3 py-2 text-sm focus:border-so-accent focus:outline-none" />
                        <button onClick={() => handleRemovePerson(idx)} className="p-2 text-so-muted hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={handleAddPerson} 
                    disabled={people.length >= 7}
                    className="mt-4 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-so-border text-sm font-semibold text-so-muted hover:text-so-text hover:bg-so-surface transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" /> Add Member
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'membership' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex bg-so-surface border border-so-border rounded-lg p-1 w-full max-w-sm mb-2">
                  <button onClick={() => setPlanType('monthly')} className={`flex-1 py-1.5 rounded-md text-sm font-semibold transition-all ${planType === 'monthly' ? 'bg-white shadow-sm border border-so-border text-so-text' : 'text-so-muted hover:text-so-text'}`}>Monthly</button>
                  <button onClick={() => setPlanType('sessions')} className={`flex-1 py-1.5 rounded-md text-sm font-semibold transition-all ${planType === 'sessions' ? 'bg-white shadow-sm border border-so-border text-so-text' : 'text-so-muted hover:text-so-text'}`}>Sessions</button>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-so-text mb-1.5">Amount (₹) *</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm focus:border-so-accent focus:outline-none" />
                  </div>

                  {planType === 'sessions' && (
                    <div>
                      <label className="block text-xs font-semibold text-so-text mb-1.5">Sessions *</label>
                      <input type="number" value={sessions} onChange={e => setSessions(e.target.value)} className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm focus:border-so-accent focus:outline-none" />
                    </div>
                  )}

                  <div className="col-span-2 space-y-4 bg-so-surface/30 p-4 rounded-xl border border-so-border">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="partialPayment" checked={isPartialPayment} onChange={e => setIsPartialPayment(e.target.checked)} className="w-4 h-4 rounded text-so-accent focus:ring-so-accent border-so-border" />
                      <label htmlFor="partialPayment" className="text-sm font-semibold text-so-text select-none cursor-pointer">Accept Partial Payment</label>
                    </div>
                    
                    {isPartialPayment && (
                      <div className="grid grid-cols-2 gap-5 animate-in fade-in duration-200">
                        <div>
                          <label className="block text-xs font-semibold text-so-text mb-1.5">Paying Now (₹)</label>
                          <input type="number" value={payingNow} onChange={e => setPayingNow(e.target.value)} className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm focus:border-so-accent focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-so-muted mb-1.5">Partial Due</label>
                          <div className="w-full bg-so-surface/50 border border-so-border/50 rounded-lg px-3 py-2 text-sm font-semibold text-so-muted flex items-center">
                            ₹{partialDueAmt}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-so-text mb-1.5">Payment Method</label>
                    <div className="flex gap-2">
                      {(['cash', 'upi', 'card', 'other'] as const).map(m => (
                        <button key={m} onClick={() => setPaymentMethod(m)} className={`flex-1 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors border ${paymentMethod === m ? 'bg-so-accent text-white border-so-accent' : 'bg-white text-so-muted border-so-border hover:border-so-accent/50'}`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-so-text mb-1.5">Notes (optional)</label>
                    <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm focus:border-so-accent focus:outline-none resize-none" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-so-text mb-1.5">Start Date *</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm focus:border-so-accent focus:outline-none" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-so-text mb-1.5">End Date *</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm focus:border-so-accent focus:outline-none" />
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-so-border bg-so-surface/30 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-so-muted hover:text-so-text transition-colors">Cancel</button>
          <button 
            onClick={handleSave} 
            disabled={!contactName.trim() || !contactPhone.trim() || !startDate || !endDate} 
            className="px-6 py-2 bg-so-accent text-white rounded-lg text-sm font-bold hover:bg-so-accent-hover transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Membership
          </button>
        </div>
      </div>
    </div>
  )
}
