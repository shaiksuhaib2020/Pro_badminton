'use client'

import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { CourtMembership, CourtMembershipPerson } from '@/lib/mock-data'

type EditCourtMembershipModalProps = {
  membership: CourtMembership
  onClose: () => void
  onSave: () => void
}

export default function EditCourtMembershipModal({ membership, onClose, onSave }: EditCourtMembershipModalProps) {
  const [activeTab, setActiveTab] = useState<'contact' | 'membership'>('contact')

  // Contact Details
  const [contactName, setContactName] = useState(membership.contactName || '')
  const [contactPhone, setContactPhone] = useState(membership.contactPhone || '')
  const [address, setAddress] = useState(membership.address || '')
  const [email, setEmail] = useState(membership.email || '')
  
  // Note: we just store names, ignoring their IDs for editing in this mock. 
  // We'll generate new UUIDs on save for any new names, and preserve old UUIDs if they exist.
  const [people, setPeople] = useState<{id?: string, name: string}[]>(
    membership.people.map(p => ({ id: p.id, name: p.name }))
  )

  // Membership Details
  const [planType, setPlanType] = useState(membership.planType)
  const [amount, setAmount] = useState(membership.amountPaid.toString())
  const [isPartialPayment, setIsPartialPayment] = useState(membership.pendingAmount > 0)
  
  const initialPayingNow = membership.paymentHistory[0]?.payingNow || (membership.amountPaid - membership.pendingAmount)
  const [payingNow, setPayingNow] = useState(initialPayingNow > 0 ? initialPayingNow.toString() : '')
  
  const [sessions, setSessions] = useState(membership.totalSessions?.toString() || '')
  const [paymentMethod, setPaymentMethod] = useState(membership.paymentHistory[0]?.paymentMethod || 'cash')
  const [notes, setNotes] = useState(membership.notes || '')
  const [startDate, setStartDate] = useState(membership.startDate || '')
  const [endDate, setEndDate] = useState(membership.endDate || '')

  const handleAddPerson = () => {
    if (people.length < 7) {
      setPeople([...people, { name: '' }])
    }
  }

  const handleRemovePerson = (index: number) => {
    setPeople(people.filter((_, i) => i !== index))
  }

  const handlePersonNameChange = (index: number, val: string) => {
    const newPeople = [...people]
    newPeople[index].name = val
    setPeople(newPeople)
  }

  const handleSave = () => {
    if (!contactName.trim() || !contactPhone.trim() || !startDate || !endDate) return

    const validPeople: CourtMembershipPerson[] = people.filter(p => p.name.trim()).map(p => ({
      id: p.id || crypto.randomUUID(),
      membershipId: membership.id,
      name: p.name.trim()
    }))

    const totalAmount = parseFloat(amount) || 0
    let actualPaid = totalAmount
    let partialDue = 0
    if (isPartialPayment) {
      actualPaid = parseFloat(payingNow) || 0
      partialDue = Math.max(0, totalAmount - actualPaid)
    }

    // Mutate in-place
    membership.contactName = contactName.trim()
    membership.contactPhone = contactPhone.trim()
    membership.address = address.trim() || undefined
    membership.email = email.trim() || undefined
    membership.people = validPeople
    
    membership.planType = planType
    membership.startDate = startDate
    membership.endDate = endDate
    membership.totalSessions = planType === 'sessions' ? (parseInt(sessions) || 0) : undefined
    membership.remainingSessions = planType === 'sessions' ? (parseInt(sessions) || 0) : undefined
    
    membership.amountPaid = actualPaid
    membership.pendingAmount = partialDue
    membership.notes = notes.trim() || undefined

    if (membership.paymentHistory.length > 0) {
      membership.paymentHistory[0].amount = totalAmount
      membership.paymentHistory[0].payingNow = isPartialPayment ? actualPaid : undefined
      membership.paymentHistory[0].partialDue = isPartialPayment ? partialDue : undefined
      membership.paymentHistory[0].paymentMethod = paymentMethod
      membership.paymentHistory[0].date = startDate
      membership.paymentHistory[0].note = notes.trim() || undefined
    }

    onSave()
    onClose()
  }

  const partialDueAmt = Math.max(0, (parseFloat(amount) || 0) - (parseFloat(payingNow) || 0))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col overflow-hidden max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-so-border bg-so-surface/30 shrink-0">
          <h2 className="text-lg font-bold text-so-text">Edit Membership</h2>
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
                        <input type="text" value={p.name} onChange={e => handlePersonNameChange(idx, e.target.value)} placeholder={`Member ${idx + 1} Name`} className="flex-1 bg-white border border-so-border rounded-lg px-3 py-2 text-sm focus:border-so-accent focus:outline-none" />
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
                        <button key={m} onClick={() => setPaymentMethod(m as any)} className={`flex-1 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors border ${paymentMethod === m ? 'bg-so-accent text-white border-so-accent' : 'bg-white text-so-muted border-so-border hover:border-so-accent/50'}`}>
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
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
