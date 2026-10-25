'use client'

import { useState } from 'react'
import { Enquiry, mockEnquiries } from '@/lib/mock-data'
import { X, Calendar } from 'lucide-react'
import { getTodayIST } from '@/lib/utils'

type Props = {
  onClose: () => void
  onSuccess: () => void
}

export default function AddEnquiryModal({ onClose, onSuccess }: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [guardianName, setGuardianName] = useState('')
  const [notes, setNotes] = useState('')
  const [scheduleTrial, setScheduleTrial] = useState(false)
  const [trialDate, setTrialDate] = useState('')
  const [error, setError] = useState('')

  const handleSave = () => {
    if (!name.trim() || !phone.trim() || !guardianName.trim()) {
      setError('Please fill all required fields.')
      return
    }

    if (scheduleTrial && !trialDate) {
      setError('Please pick a trial date')
      return
    }

    const newEnquiry: Enquiry = {
      id: crypto.randomUUID(),
      name: name.trim(),
      phone: phone.trim(),
      guardianName: guardianName.trim(),
      notes: notes.trim() || undefined,
      status: scheduleTrial ? 'scheduled' : 'not-scheduled',
      trialDate: scheduleTrial ? trialDate : undefined,
      createdAt: getTodayIST()
    }

    mockEnquiries.push(newEnquiry)
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="relative bg-so-card border border-so-border rounded-2xl w-full max-w-lg flex flex-col shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-so-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-so-text">Add New Enquiry</h2>
          <button onClick={onClose} className="text-so-muted hover:text-so-accent transition-colors p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-1.5">Name <span className="text-so-red">*</span></label>
            <input 
              type="text" 
              required
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g. Aditi Sharma"
              className="w-full bg-so-surface border border-so-border rounded-lg px-4 py-2.5 text-sm text-so-text focus:outline-none focus:border-so-accent transition-colors" 
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-1.5">Phone <span className="text-so-red">*</span></label>
            <input 
              type="tel" 
              required
              value={phone} 
              onChange={e => setPhone(e.target.value)} 
              placeholder="10-digit mobile number"
              className="w-full bg-so-surface border border-so-border rounded-lg px-4 py-2.5 text-sm text-so-text focus:outline-none focus:border-so-accent transition-colors" 
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-1.5">Guardian Name <span className="text-so-red">*</span></label>
            <input 
              type="text" 
              required
              value={guardianName} 
              onChange={e => setGuardianName(e.target.value)} 
              placeholder="Parent or Guardian's name"
              className="w-full bg-so-surface border border-so-border rounded-lg px-4 py-2.5 text-sm text-so-text focus:outline-none focus:border-so-accent transition-colors" 
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-1.5">Notes</label>
            <textarea 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
              rows={3}
              placeholder="Any notes about this enquiry..."
              className="w-full bg-so-surface border border-so-border rounded-lg px-4 py-2.5 text-sm text-so-text focus:outline-none focus:border-so-accent transition-colors resize-none placeholder:text-so-muted/50" 
            />
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <input 
                type="checkbox" 
                checked={scheduleTrial} 
                onChange={e => {
                  setScheduleTrial(e.target.checked)
                  if (!e.target.checked) setTrialDate('')
                }}
                className="w-4 h-4 rounded border-so-border text-so-accent focus:ring-so-accent"
              />
              <span className="text-sm font-medium text-so-text">Schedule trial</span>
            </label>
            
            {scheduleTrial && (
              <div className="mt-3 animate-in slide-in-from-top-2 fade-in duration-200">
                <input 
                  type="date"
                  min={getTodayIST()}
                  value={trialDate}
                  onChange={e => setTrialDate(e.target.value)}
                  className="w-full bg-white border border-so-border rounded-lg px-4 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
                />
              </div>
            )}
          </div>

          {error && <p className="text-so-red text-xs font-medium pt-1">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-so-border bg-so-card flex justify-end gap-3 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-so-muted hover:text-so-text transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="px-5 py-2 text-sm font-semibold bg-so-accent text-white rounded-lg hover:opacity-90 transition-opacity shadow-sm">
            Save Enquiry
          </button>
        </div>
      </div>
    </div>
  )
}
