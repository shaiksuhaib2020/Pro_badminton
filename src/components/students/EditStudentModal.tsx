'use client'

import { useState, useEffect } from 'react'
import { Student, mockStudents, mockSettings } from '@/lib/mock-data'
import { CheckCircle, AlertCircle, X } from 'lucide-react'
import { addMonths, addDays, parseISO, format } from 'date-fns'

export default function EditStudentModal({
  student,
  onClose,
  onSave,
}: {
  student: Student
  onClose: () => void
  onSave: (updated: Student) => void
}) {
  // Personal
  const [name, setName] = useState(student.name)
  const [phone, setPhone] = useState(student.phone)
  const [guardianName, setGuardianName] = useState(student.guardianName ?? '')
  const [alternatePhone, setAlternatePhone] = useState(student.alternatePhone ?? '')
  const [address, setAddress] = useState(student.address ?? '')
  const [email, setEmail] = useState(student.email ?? '')
  const [dateOfBirth, setDateOfBirth] = useState(student.dateOfBirth ?? '')
  const [internalNotes, setInternalNotes] = useState(student.internalNotes ?? '')

  // Membership
  const [membershipTypeId, setMembershipTypeId] = useState(student.membershipTypeId)
  const [selectedBatch, setSelectedBatch] = useState(student.currentBatch)
  const [fees, setFees] = useState<number>(student.fees)
  const [startDate, setStartDate] = useState(student.startDate ?? '')
  const [membershipStartDate, setMembershipStartDate] = useState(student.membershipStartDate)
  const [enrollmentSource, setEnrollmentSource] = useState<Student['enrollmentSource'] | ''>(student.enrollmentSource ?? '')

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const mt = mockSettings.membershipTypes.find(m => m.id === membershipTypeId)

  const computedNextDue = membershipStartDate && mt
    ? mt.durationType === 'months'
      ? format(addMonths(parseISO(membershipStartDate), mt.duration), 'yyyy-MM-dd')
      : format(addDays(parseISO(membershipStartDate), mt.duration), 'yyyy-MM-dd')
    : student.nextDueDate

  // Is the resulting due date already in the past?
  const nextDueIsInPast = computedNextDue < format(new Date(), 'yyyy-MM-dd')

  // Status that will be saved
  const computedStatus = (): Student['status'] => {
    const today = new Date()
    const due = parseISO(computedNextDue)
    const daysUntilDue = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (student.status === 'dropout') return 'dropout' // never change off-court via edit
    if (daysUntilDue < 0) return 'expired'
    if (daysUntilDue <= 7) return 'due-soon'
    return 'active'
  }

  const handleMembershipTypeChange = (newId: string) => {
    setMembershipTypeId(newId)
    const newMt = mockSettings.membershipTypes.find(m => m.id === newId)
    if (newMt) setFees(newMt.price)  // auto-fill; staff can still override manually
  }

  const handleSave = () => {
    if (!name.trim()) {
      setToast({ type: 'error', message: 'Student name is required.' })
      return
    }
    if (!phone.trim() || phone.trim().length < 10) {
      setToast({ type: 'error', message: 'Enter a valid phone number.' })
      return
    }
    if (!membershipStartDate) {
      setToast({ type: 'error', message: 'Membership start date is required.' })
      return
    }
    if (fees < 0) {
      setToast({ type: 'error', message: 'Fee cannot be negative.' })
      return
    }

    // Apply all changes to student object
    Object.assign(student, {
      name: name.trim(),
      phone: phone.trim(),
      guardianName: guardianName.trim() || undefined,
      alternatePhone: alternatePhone.trim() || undefined,
      address: address.trim() || undefined,
      email: email.trim() || undefined,
      dateOfBirth: dateOfBirth || undefined,
      internalNotes: internalNotes.trim() || undefined,
      membershipTypeId,
      currentBatch: selectedBatch,
      fees,
      startDate: startDate.trim() || student.startDate,
      membershipStartDate,
      nextDueDate: computedNextDue,
      enrollmentSource: enrollmentSource || undefined,
      status: computedStatus(),
    })

    setToast({ type: 'success', message: `${name.trim()} updated successfully.` })
    setTimeout(() => {
      onSave(student)
      onClose()
    }, 1500)
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

              {/* Email */}
              <div>
                <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="e.g. student@example.com"
                  className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-accent focus:ring-1 focus:ring-so-accent/30"
                />
              </div>

              {/* Address */}
              <div className="col-span-2">
                <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                  Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Residential address"
                  className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-accent focus:ring-1 focus:ring-so-accent/30"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-so-border mb-6" />

          {/* Section 2 Membership Details */}
          <div className="mb-6">
            <h3 className="text-xs text-so-muted uppercase tracking-wider mb-4">
              Membership Details
            </h3>
            <div className="grid grid-cols-2 gap-4">

              {/* Membership Type */}
              <div>
                <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                  Membership Type
                </label>
                <select
                  value={membershipTypeId}
                  onChange={e => handleMembershipTypeChange(e.target.value)}
                  className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
                >
                  {mockSettings.membershipTypes.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Fee */}
              <div>
                <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                  Fee (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={fees}
                  onChange={e => setFees(Number(e.target.value))}
                  className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent focus:ring-1 focus:ring-so-accent/30"
                />
                <p className="text-xs text-so-muted mt-1">
                  Base: ₹{mt?.price.toLocaleString('en-IN') ?? ''}
                </p>
              </div>

              {/* Membership Start Date */}
              <div>
                <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                  Membership Start Date
                </label>
                <input
                  type="date"
                  value={membershipStartDate}
                  onChange={e => setMembershipStartDate(e.target.value)}
                  className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
                />
              </div>

              {/* Next Due read-only derived */}
              <div>
                <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                  Next Due Date
                </label>
                <p className={`text-sm font-semibold mt-2 ${
                  nextDueIsInPast ? 'text-red-500' : 'text-[#5278EA]'
                }`}>
                  {format(parseISO(computedNextDue), 'dd MMM yyyy')}
                </p>
              </div>

              {/* Joining Date / Date of Admission */}
              <div>
                <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                  Joining Date / Date of Admission
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
                />
              </div>

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

            {/* Past due warning */}
            {nextDueIsInPast && (
              <div className="mt-3 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-700">
                  The computed due date is in the past  student will be marked as <strong>Expired</strong> after saving.
                </p>
              </div>
            )}

            {/* Current Batch pills */}
            <div className="mt-4">
              <label className="block text-xs text-so-muted uppercase tracking-wider mb-2">
                Current Batch
              </label>
              <div className="flex gap-2 flex-wrap">
                {mockSettings.batches.map(batch => (
                  <button
                    key={batch}
                    type="button"
                    onClick={() => setSelectedBatch(batch)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedBatch === batch
                        ? 'bg-so-accent text-white'
                        : 'border border-so-border text-so-muted hover:border-so-accent hover:text-so-text'
                    }`}
                  >
                    {batch}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-so-border mb-6" />

          {/* Internal Notes */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-so-muted uppercase tracking-wider">Internal Notes</label>
              <span className="text-xs text-so-muted">{internalNotes.length}/300</span>
            </div>
            <textarea
              value={internalNotes}
              onChange={e => { if (e.target.value.length <= 300) setInternalNotes(e.target.value) }}
              rows={3}
              placeholder="Any internal context about this student..."
              className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-accent focus:ring-1 focus:ring-so-accent/30 resize-none"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-so-border shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-so-border rounded-lg text-sm text-so-muted hover:text-so-text hover:border-so-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 bg-so-accent text-white rounded-lg text-sm font-semibold hover:bg-so-accent-hover transition-colors"
          >
            Save Changes
          </button>
        </div>

        {/* Toast */}
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
