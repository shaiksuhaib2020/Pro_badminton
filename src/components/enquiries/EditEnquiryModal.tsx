'use client'

import { useState } from 'react'
import { Enquiry } from '@/lib/mock-data'
import { X } from 'lucide-react'
import { getTodayIST } from '@/lib/utils'

type Props = {
  enquiry: Enquiry
  onClose: () => void
  onSave: () => void
}

export default function EditEnquiryModal({ enquiry, onClose, onSave }: Props) {
  const [name, setName] = useState(enquiry.name)
  const [phone, setPhone] = useState(enquiry.phone)
  const [guardianName, setGuardianName] = useState(enquiry.guardianName)
  const [notes, setNotes] = useState(enquiry.notes || '')
  
  // Pre-tick if trialDate exists or status is scheduled/completed
  const [scheduleTrial, setScheduleTrial] = useState(!!enquiry.trialDate)
  const [trialDate, setTrialDate] = useState(enquiry.trialDate || '')
  const [error, setError] = useState('')

  const isCompleted = enquiry.status === 'completed'

  const handleSave = () => {
    if (!name.trim() || !phone.trim() || !guardianName.trim()) {
      setError('Please fill all required fields.')
      return
    }

    if (!isCompleted && scheduleTrial && !trialDate) {
      setError('Please pick a trial date')
      return
    }

    // Mutate in place
    enquiry.name = name.trim()
    enquiry.phone = phone.trim()
    enquiry.guardianName = guardianName.trim()
    enquiry.notes = notes.trim() || undefined

    if (!isCompleted) {
      if (scheduleTrial) {
        enquiry.status = 'scheduled'
        enquiry.trialDate = trialDate
      } else {
        enquiry.status = 'not-scheduled'
        enquiry.trialDate = undefined
      }
    }

    onSave()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="relative bg-so-card border border-so-border rounded-2xl w-full max-w-lg flex flex-col shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-so-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-so-text">Edit Enquiry</h2>
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
              className="w-full bg-so-surface border border-so-border rounded-lg px-4 py-2.5 text-sm text-so-text focus:outline-none focus:border-so-accent transition-colors" 
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-1.5">Notes</label>
            <textarea 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
              rows={3}
              className="w-full bg-so-surface border border-so-border rounded-lg px-4 py-2.5 text-sm text-so-text focus:outline-none focus:border-so-accent transition-colors resize-none placeholder:text-so-muted/50" 
            />
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <input 
                type="checkbox" 
                checked={scheduleTrial} 
                disabled={isCompleted}
                onChange={e => {
                  setScheduleTrial(e.target.checked)
                  if (!e.target.checked) setTrialDate('')
                }}
                className="w-4 h-4 rounded border-so-border text-so-accent focus:ring-so-accent disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span className={`text-sm font-medium ${isCompleted ? 'text-so-muted' : 'text-so-text'}`}>
                Schedule trial
              </span>
            </label>
            
            {scheduleTrial && (
              <div className="mt-3 animate-in slide-in-from-top-2 fade-in duration-200">
                <input 
                  type="date"
                  min={!isCompleted ? getTodayIST() : undefined}
                  value={trialDate}
                  disabled={isCompleted}
                  onChange={e => setTrialDate(e.target.value)}
                  className="w-full bg-white border border-so-border rounded-lg px-4 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent disabled:bg-so-surface disabled:text-so-muted disabled:cursor-not-allowed"
                />
                {isCompleted && (
                  <p className="text-[11px] text-so-muted mt-1.5 ml-1">Trial completed — status locked</p>
                )}
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
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
