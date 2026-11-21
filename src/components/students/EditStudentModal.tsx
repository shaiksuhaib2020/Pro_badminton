'use client'

import { useState, useEffect } from 'react'
import type { Student } from '@/lib/types/students'
import type { Batch } from '@/lib/types/batches'
import { CheckCircle, AlertCircle, X, Loader2 } from 'lucide-react'
import { updateStudent } from '@/app/(management)/students/actions'
import { getBatchesAction } from '@/app/(management)/batches/actions'

export default function EditStudentModal({
  student,
  batches,
  onClose,
  onSave,
}: {
  student: Student
  batches?: Batch[]
  onClose: () => void
  onSave: (updated: Student) => void
}) {
  const [batchList, setBatchList] = useState<Batch[]>(batches ?? [])

  useEffect(() => {
    if (batches && batches.length > 0) {
      setBatchList(batches)
    } else {
      getBatchesAction()
        .then(res => {
          if (res && res.length > 0) {
            setBatchList(res)
          }
        })
        .catch(console.error)
    }
  }, [batches])

  const availableBatches = batchList
  // Personal
  const [name, setName] = useState(student.name)
  const [phone, setPhone] = useState(student.phone)
  const [guardianName, setGuardianName] = useState(student.guardianName ?? '')
  const [alternatePhone, setAlternatePhone] = useState(student.alternatePhone ?? '')
  const [dateOfBirth, setDateOfBirth] = useState(student.dateOfBirth ?? '')
  const [internalNotes, setInternalNotes] = useState(student.internalNotes ?? '')

  // Coaching & Agreement
  const [selectedBatch, setSelectedBatch] = useState(student.currentBatchId ?? student.currentBatch)
  const [fees, setFees] = useState<number>(student.fees)
  const [enrollmentSource, setEnrollmentSource] = useState<Student['enrollmentSource'] | ''>(student.enrollmentSource ?? '')

  // Toast & Loading
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const handleSave = async () => {
    if (!name.trim()) {
      setToast({ type: 'error', message: 'Student name is required.' })
      return
    }
    if (!phone.trim() || phone.trim().length < 10) {
      setToast({ type: 'error', message: 'Enter a valid 10-digit phone number.' })
      return
    }
    if (fees < 0) {
      setToast({ type: 'error', message: 'Fee cannot be negative.' })
      return
    }

    setIsSubmitting(true)
    try {
      await updateStudent(student.id, {
        name: name.trim(),
        phone: phone.trim(),
        guardianName: guardianName.trim() || undefined,
        alternatePhone: alternatePhone.trim() || undefined,
        dateOfBirth: dateOfBirth || undefined,
        internalNotes: internalNotes.trim() || undefined,
        batchId: selectedBatch,
        fees,
        enrollmentSource: enrollmentSource || undefined,
      })

      // Apply changes to student object for local UI state
      Object.assign(student, {
        name: name.trim(),
        phone: phone.trim(),
        guardianName: guardianName.trim() || undefined,
        alternatePhone: alternatePhone.trim() || undefined,
        dateOfBirth: dateOfBirth || undefined,
        internalNotes: internalNotes.trim() || undefined,
        currentBatch: availableBatches.find(batch => batch.id === selectedBatch)?.name ?? selectedBatch,
        currentBatchId: selectedBatch,
        fees,
        enrollmentSource: enrollmentSource || undefined,
      })

      setToast({ type: 'success', message: `${name.trim()} updated successfully.` })
      setTimeout(() => {
        onSave(student)
        onClose()
      }, 1200)
    } catch (err: unknown) {
      setToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to update student' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="relative bg-so-card border border-so-border rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-so-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-so-text">Edit Student - {student.name}</h2>
          <button onClick={onClose} className="text-so-grey hover:text-so-accent transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto max-h-[80vh]">
          {/* Section 1 Personal Information */}
          <div className="mb-6">
            <h3 className="text-xs text-so-muted uppercase tracking-wider mb-4">
              Personal Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Student Name */}
              <div>
                <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                  Student Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent focus:ring-1 focus:ring-so-accent/30"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent focus:ring-1 focus:ring-so-accent/30"
                />
              </div>

              {/* Guardian Name */}
              <div>
                <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                  Guardian Name
                </label>
                <input
                  type="text"
                  value={guardianName}
                  onChange={e => setGuardianName(e.target.value)}
                  placeholder="Parent / Guardian"
                  className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-accent focus:ring-1 focus:ring-so-accent/30"
                />
              </div>

              {/* Alternate Phone */}
              <div>
                <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                  Alternate Phone
                </label>
                <input
                  type="tel"
                  value={alternatePhone}
                  onChange={e => setAlternatePhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="Optional"
                  className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-accent focus:ring-1 focus:ring-so-accent/30"
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={e => setDateOfBirth(e.target.value)}
                  className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
                />
              </div>

            </div>
          </div>

          <div className="border-t border-so-border mb-6" />

          {/* Section 2 Details & Fee Agreement */}
          <div className="mb-6">
            <h3 className="text-xs text-so-muted uppercase tracking-wider mb-4">
              Coaching & Fee Agreement
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Batch */}
              <div>
                <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                  Batch
                </label>
                <select
                  value={selectedBatch}
                  onChange={e => {
                    const newBatch = e.target.value
                    setSelectedBatch(newBatch)
                    const matched = availableBatches.find(b => b.name === newBatch || b.id === newBatch)
                    if (matched && typeof matched.fees === 'number' && matched.fees > 0 && (!fees || fees === 0)) {
                      setFees(matched.fees)
                    }
                  }}
                  className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent capitalize"
                >
                  {availableBatches.map(b => (
                    <option key={b.id || b.name} value={b.id}>
                      {b.name} {b.fees ? `(₹${b.fees.toLocaleString('en-IN')})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Fee */}
              <div>
                <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                  Custom Fee (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={fees}
                  onChange={e => setFees(Number(e.target.value))}
                  className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent focus:ring-1 focus:ring-so-accent/30"
                  placeholder="Fee amount"
                />
              </div>


              <div className="text-xs text-so-muted">Joining date and membership coverage are managed separately.</div>

              {/* Source */}
              <div>
                <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                  Source
                </label>
                <select
                  value={enrollmentSource}
                  onChange={e => setEnrollmentSource(e.target.value as Student['enrollmentSource'] | '')}
                  className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent capitalize"
                >
                  <option value="">Select source (optional)</option>
                  <option value="walk-in">Walk-in</option>
                  <option value="referral">Referral</option>
                  <option value="social-media">Social Media</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-so-border mb-6" />

          {/* Section 3 Internal Notes */}
          <div>
            <h3 className="text-xs text-so-muted uppercase tracking-wider mb-4">
              Internal Notes
            </h3>
            <textarea
              maxLength={300}
              rows={3}
              value={internalNotes}
              onChange={e => setInternalNotes(e.target.value)}
              placeholder="Private notes about the student..."
              className="w-full bg-white border border-so-border rounded-xl py-2.5 px-3 text-sm text-so-text focus:outline-none focus:border-so-accent transition-colors resize-none placeholder:text-so-muted"
            />
            <div className="text-right text-xs text-so-muted mt-1">
              {internalNotes.length}/300
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-so-border bg-so-surface flex justify-end gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-so-muted hover:text-so-text transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSave}
            className="px-5 py-2 bg-so-accent text-white rounded-lg text-sm font-bold hover:bg-so-accent-hover transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
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
            <button type="button" onClick={() => setToast(null)} className="opacity-60 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
