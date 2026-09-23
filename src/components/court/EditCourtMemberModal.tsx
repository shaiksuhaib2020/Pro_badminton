'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { CourtMember } from '@/lib/mock-data'

interface EditCourtMemberModalProps {
  member: CourtMember
  onClose: () => void
  onSuccess: () => void
}

export default function EditCourtMemberModal({ member, onClose, onSuccess }: EditCourtMemberModalProps) {
  const [name, setName] = useState(member.name)
  const [phone, setPhone] = useState(member.phone)
  const [joiningDate, setJoiningDate] = useState(member.joiningDate)
  
  // If planType === 'sessions'
  const [totalSessions, setTotalSessions] = useState(member.totalSessions ?? 0)
  const [remainingSessions, setRemainingSessions] = useState(member.remainingSessions ?? 0)
  
  // If planType === 'monthly', the prompt says: "If planType === 'monthly': Fees/Amount (number field labeled 'Monthly Fee')". 
  // We map it to amountPaid since that's what CourtMember stores.
  const [amountPaid, setAmountPaid] = useState(member.amountPaid ?? 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (member.planType === 'sessions') {
      if (remainingSessions > totalSessions) {
        alert("Remaining sessions cannot exceed purchased sessions.")
        return
      }
      Object.assign(member, { name, phone, joiningDate, totalSessions, remainingSessions })
      
      const r = remainingSessions
      member.status = r === 0 ? 'exhausted' : r <= 2 ? 'sessions-low' : 'active'
    } else {
      Object.assign(member, { name, phone, joiningDate, amountPaid })
    }
    
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-so-border">
          <h2 className="text-lg font-bold text-so-text">Edit Court Member</h2>
          <button onClick={onClose} className="p-2 text-so-muted hover:text-so-text rounded-full hover:bg-so-surface transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <form id="edit-member-form" onSubmit={handleSubmit} className="space-y-5">
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

            <div>
              <label className="block text-xs font-semibold text-so-muted uppercase mb-1.5">Joining Date</label>
              <input
                type="date"
                required
                value={joiningDate}
                onChange={e => setJoiningDate(e.target.value)}
                className="w-full px-3 py-2 bg-so-surface border border-so-border rounded-lg text-sm focus:outline-none focus:border-so-accent"
              />
            </div>

            {member.planType === 'monthly' ? (
              <div>
                <label className="block text-xs font-semibold text-so-muted uppercase mb-1.5">Monthly Fee</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={amountPaid}
                  onChange={e => setAmountPaid(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-so-surface border border-so-border rounded-lg text-sm focus:outline-none focus:border-so-accent"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-so-muted uppercase mb-1.5">Sessions Purchased</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={totalSessions}
                    onChange={e => setTotalSessions(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-so-surface border border-so-border rounded-lg text-sm focus:outline-none focus:border-so-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-so-muted uppercase mb-1.5">Sessions Remaining</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max={totalSessions}
                    value={remainingSessions}
                    onChange={e => setRemainingSessions(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-so-surface border border-so-border rounded-lg text-sm focus:outline-none focus:border-so-accent"
                  />
                </div>
              </div>
            )}
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
            form="edit-member-form"
            className="px-6 py-2 text-sm font-bold bg-so-accent text-so-accent-text rounded-lg hover:bg-so-accent-hover transition-colors shadow-sm"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
