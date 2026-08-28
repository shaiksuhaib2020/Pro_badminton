'use client'

import { useState, useEffect } from 'react'
import { Student, mockStudents, mockSettings } from '@/lib/mock-data'
import { CheckCircle, AlertCircle, X } from 'lucide-react'

export default function EditStudentModal({
  student,
  onClose,
  onSave,
}: {
  student: Student
  onClose: () => void
  onSave: (updated: Student) => void
}) {
  const [name, setName] = useState(student.name)
  const [phone, setPhone] = useState(student.phone)
  const [internalNotes, setInternalNotes] = useState(student.internalNotes || '')
  const [duplicateError, setDuplicateError] = useState('')

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const handlePhoneBlur = () => {
    if (phone.length === 10) {
      const duplicate = mockStudents.find(s => s.phone === phone && s.id !== student.id)
      if (duplicate) {
        setDuplicateError(`This number is already registered to ${duplicate.name}`)
      } else {
        setDuplicateError('')
      }
    } else {
      setDuplicateError('')
    }
  }

  const handleSave = () => {
    if (!name.trim()) return setToast({ type: 'error', message: "Name is required" })
    if (phone.length !== 10) return setToast({ type: 'error', message: "Phone must be 10 digits" })
    if (duplicateError) return setToast({ type: 'error', message: "Please resolve the duplicate phone number" })

    const target = mockStudents.find(s => s.id === student.id)
    if (target) {
      target.name = name.trim()
      target.phone = phone.trim()
      target.internalNotes = internalNotes.trim()
      
      setToast({ type: 'success', message: `${target.name} updated successfully` })
      setTimeout(() => {
        onSave(target)
      }, 2000)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="relative bg-so-card border border-so-border rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-so-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-so-text">Edit Student - {student.name}</h2>
          <button onClick={onClose} className="text-so-grey hover:text-so-accent transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">Student Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-so-border rounded-xl py-2.5 px-4 text-sm text-so-text focus:outline-none focus:border-so-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">Phone Number</label>
            <input
              type="tel"
              required
              pattern="[0-9]{10}"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                setDuplicateError('') // Clear error on change
              }}
              onBlur={handlePhoneBlur}
              className="w-full bg-white border border-so-border rounded-xl py-2.5 px-4 text-sm text-so-text focus:outline-none focus:border-so-accent transition-colors"
            />
            {duplicateError && (
              <p className="text-xs font-medium text-so-red mt-2">{duplicateError}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">Internal Notes</label>
            <textarea
              maxLength={300}
              rows={3}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              className="w-full bg-white border border-so-border rounded-xl py-2.5 px-4 text-sm text-so-text focus:outline-none focus:border-so-accent transition-colors resize-none"
            />
            <div className="text-right text-xs text-so-muted mt-1">
              {internalNotes.length}/300
            </div>
          </div>

          <div className="bg-white border border-so-border rounded-xl p-4 mt-2">
            <p className="text-sm font-semibold text-so-text mb-2">Current Status</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-so-muted">Joined:</span>
                <span className="text-so-text font-medium">{student.startDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-so-muted">Membership:</span>
                <span className="text-so-text font-medium capitalize">{mockSettings.membershipTypes.find(m => m.id === student.membershipTypeId)?.name} - {student.currentBatch} batch</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-so-muted">Status:</span>
                {student.status === 'active' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-so-emerald-subtle text-so-emerald border border-so-emerald/20">Active</span>}
                {student.status === 'due-soon' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">Due Soon</span>}
                {student.status === 'expired' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-so-red-subtle text-so-red border border-so-red/20">Expired</span>}
                {student.status === 'off-court' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-so-surface text-so-muted border border-so-border">Off Court</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-so-border bg-so-surface flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-so-muted hover:text-so-text transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!!duplicateError} className="px-5 py-2 bg-so-accent text-white rounded-lg text-sm font-bold hover:bg-so-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            Save Changes
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
