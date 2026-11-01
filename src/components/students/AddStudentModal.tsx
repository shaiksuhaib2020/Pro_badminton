'use client'

import { useState, useEffect } from 'react'
import { mockStudents, mockSettings, mockBatches, Student, Batch, PaymentEntry } from '@/lib/mock-data'
import { X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getTodayIST, deriveStudentStatus } from '@/lib/utils'
import { createStudent } from '@/app/(management)/students/actions'
import { getBatchesAction } from '@/app/(management)/batches/actions'

type Props = {
  onClose: () => void
  onSuccess: (student: Student) => void
  batches?: Batch[]
  defaultBatch?: string
  defaultName?: string
  defaultPhone?: string
  prefillName?: string
  prefillPhone?: string
  prefillGuardianName?: string
}

export default function AddStudentModal({
  onClose,
  onSuccess,
  batches,
  defaultBatch,
  defaultName,
  defaultPhone,
  prefillName,
  prefillPhone,
  prefillGuardianName
}: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'personal' | 'coaching'>('personal')

  // Batches list from prop or server action
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

  const availableBatches = batchList.length > 0
    ? batchList
    : mockBatches.length > 0
      ? mockBatches
      : mockSettings.batches.map(name => ({ id: name, name, days: [], fees: 0, branchId: '' }))

  // Personal Details
  const [name, setName] = useState(prefillName ?? defaultName ?? '')
  const [phone, setPhone] = useState(prefillPhone ?? defaultPhone ?? '')
  const [guardianName, setGuardianName] = useState(prefillGuardianName ?? '')
  const [alternatePhone, setAlternatePhone] = useState('')
  const [address, setAddress] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [email, setEmail] = useState('')

  // Coaching Details
  const initialBatch = defaultBatch ?? (availableBatches[0]?.name || '')
  const [batch, setBatch] = useState(initialBatch)
  const initialBatchFee = availableBatches.find(b => b.name === initialBatch || b.id === initialBatch)?.fees ?? 0
  const [feeAmount, setFeeAmount] = useState<number>(initialBatchFee > 0 ? initialBatchFee : 1500)
  const [startDate, setStartDate] = useState(getTodayIST())
  const [endDate, setEndDate] = useState('')
  const [joiningDate, setJoiningDate] = useState('')
  const [enrollmentSource, setEnrollmentSource] = useState<Student['enrollmentSource'] | ''>('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'other'>('upi')
  const [notes, setNotes] = useState('')

  // Partial Payment
  const [isPartial, setIsPartial] = useState(false)
  const [amountPaying, setAmountPaying] = useState<number>(feeAmount)
  const [partialDue, setPartialDue] = useState<number>(0)

  useEffect(() => {
    if (availableBatches.length > 0) {
      if (defaultBatch) {
        setBatch(defaultBatch)
        const matched = availableBatches.find(b => b.name === defaultBatch || b.id === defaultBatch)
        if (matched && typeof matched.fees === 'number' && matched.fees > 0) {
          setFeeAmount(matched.fees)
        }
      } else if (!batch || !availableBatches.some(b => b.name === batch || b.id === batch)) {
        const first = availableBatches[0]
        setBatch(first.name)
        if (typeof first.fees === 'number' && first.fees > 0) {
          setFeeAmount(first.fees)
        }
      }
    }
  }, [batchList, defaultBatch])

  const handleBatchChange = (selectedBatch: string) => {
    setBatch(selectedBatch)
    const matchedBatch = availableBatches.find(b => b.name === selectedBatch || b.id === selectedBatch)
    if (matchedBatch && typeof matchedBatch.fees === 'number' && matchedBatch.fees > 0) {
      setFeeAmount(matchedBatch.fees)
      if (!isPartial) {
        setAmountPaying(matchedBatch.fees)
        setPartialDue(0)
      }
    }
  }

  useEffect(() => {
    if (!isPartial) {
      setAmountPaying(feeAmount)
      setPartialDue(0)
    }
  }, [feeAmount, isPartial])

  // Duplicate phone detection
  const [phoneMatches, setPhoneMatches] = useState<Student[]>([])
  const [showDuplicatePrompt, setShowDuplicatePrompt] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const handlePhoneBlur = () => {
    if (!phone) return
    const matches = mockStudents.filter(s => s.phone === phone)
    setPhoneMatches(matches)
    if (matches.length > 0) {
      setShowDuplicatePrompt(true)
    } else {
      setShowDuplicatePrompt(false)
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = 'Name is required'
    if (!phone.trim() || phone.length < 10) newErrors.phone = 'Valid 10-digit phone number required'
    if (!guardianName.trim()) newErrors.guardianName = 'Guardian name is required'
    if (!feeAmount || feeAmount < 1) newErrors.feeAmount = 'Fee amount must be at least ₹1'
    if (!paymentMethod) newErrors.paymentMethod = 'Payment method is required'
    if (!startDate) newErrors.startDate = 'Start date is required'
    if (!endDate) {
      newErrors.endDate = 'End date is required'
    } else if (endDate <= startDate) {
      newErrors.endDate = 'End date must be after start date'
    }
    if (isPartial) {
      if (amountPaying < 0) newErrors.amountPaying = 'Amount paying cannot be negative'
      if (partialDue < 0) newErrors.partialDue = 'Partial due cannot be negative'
    }
    
    setErrors(newErrors)
    return newErrors
  }

  const handleSubmit = async () => {
    setHasSubmitted(true)
    const currentErrors = validate()
    
    // Check if personal errors exist
    if (currentErrors.name || currentErrors.phone || currentErrors.guardianName) {
      setActiveTab('personal')
      setToast({ type: 'error', message: 'Please fill all required personal details correctly.' })
      return
    }

    if (currentErrors.feeAmount || currentErrors.paymentMethod || currentErrors.startDate || currentErrors.endDate || currentErrors.amountPaying || currentErrors.partialDue) {
      setActiveTab('coaching')
      setToast({ type: 'error', message: currentErrors.endDate || 'Please fill all required coaching details correctly.' })
      return
    }

    const effectiveJoiningDate = joiningDate.trim() ? joiningDate : startDate

    setIsSubmitting(true)
    try {
      await createStudent({
        name: name.trim(),
        phone: phone.trim(),
        alternatePhone: alternatePhone.trim(),
        guardianName: guardianName.trim(),
        address: address.trim() || undefined,
        email: email.trim() || undefined,
        batch,
        fees: feeAmount,
        startDate,
        endDate,
        joiningDate: effectiveJoiningDate,
        amountPaying: isPartial ? amountPaying : feeAmount,
        partialDue: isPartial ? partialDue : 0,
        paymentMethod,
        dateOfBirth: dateOfBirth || undefined,
        enrollmentSource: (enrollmentSource as any) || undefined,
        internalNotes: notes.trim(),
        note: '',
      })

      const newStudent: Student = {
        id: `student-${Date.now()}`,
        name: name.trim(),
        phone: phone.trim(),
        alternatePhone: alternatePhone.trim(),
        guardianName: guardianName.trim(),
        address: address.trim() || undefined,
        email: email.trim() || undefined,
        currentBatch: batch,
        fees: feeAmount,
        startDate: effectiveJoiningDate,
        membershipStartDate: startDate,
        nextDueDate: endDate,
        status: deriveStudentStatus(endDate),
        pendingAmount: isPartial ? partialDue : 0,
        dateOfBirth: dateOfBirth || undefined,
        enrollmentSource: enrollmentSource || undefined,
        internalNotes: notes.trim(),
        paymentHistory: [
          {
            id: crypto.randomUUID(),
            date: startDate,
            amount: isPartial ? amountPaying : feeAmount,
            remainingAmount: isPartial ? partialDue : 0,
            paymentType: isPartial && partialDue > 0 ? 'partial' : 'full',
            paymentMethod,
            coveredFrom: startDate,
            coveredUntil: endDate,
            status: 'active',
            note: '',
          }
        ]
      }
      mockStudents.unshift(newStudent)

      setToast({ type: 'success', message: `${name.trim()} enrolled successfully` })
      onSuccess(newStudent)
      setTimeout(() => onClose(), 1200)
    } catch (err: unknown) {
      if (err instanceof Error && (err.message === 'DUPLICATE_PHONE' || err.message.includes('students_phone_per_academy'))) {
        setActiveTab('personal')
        setToast({ type: 'error', message: 'A student with this phone number is already registered.' })
      } else {
        setToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to enroll student' })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col overflow-hidden max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-so-border bg-so-surface/30 shrink-0">
          <h2 className="text-lg font-bold text-so-text">Enroll New Student</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-so-muted hover:text-so-text hover:bg-so-surface rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Layout */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Vertical Side Tabs */}
          <div className="w-[200px] border-r border-so-border bg-so-surface/10 p-4 space-y-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('personal')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'personal'
                  ? 'bg-so-accent text-white shadow-sm'
                  : 'text-so-muted hover:bg-so-surface hover:text-so-text'
              }`}
            >
              Personal Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('coaching')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'coaching'
                  ? 'bg-so-accent text-white shadow-sm'
                  : 'text-so-muted hover:bg-so-surface hover:text-so-text'
              }`}
            >
              Coaching Details
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            
            {/* Tab 1: Personal Details */}
            {activeTab === 'personal' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Student Name */}
                  <div>
                    <label className="block text-xs font-semibold text-so-text mb-1.5">
                      Student Name <span className="text-so-red">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Rahul Kumar"
                      className={`w-full bg-white border ${
                        hasSubmitted && errors.name ? 'border-so-red' : 'border-so-border'
                      } rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent`}
                    />
                    {hasSubmitted && errors.name && (
                      <p className="text-so-red text-xs mt-1">{errors.name}</p>
                    )}
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-xs font-semibold text-so-text mb-1.5">
                      Phone Number <span className="text-so-red">*</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      onBlur={handlePhoneBlur}
                      placeholder="10-digit mobile"
                      className={`w-full bg-white border ${
                        hasSubmitted && errors.phone ? 'border-so-red' : 'border-so-border'
                      } rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent`}
                    />
                    {hasSubmitted && errors.phone && (
                      <p className="text-so-red text-xs mt-1">{errors.phone}</p>
                    )}

                    {showDuplicatePrompt && phoneMatches.length === 1 && (
                      <div className="mt-2 p-3 bg-so-yellow-subtle border border-so-yellow/20 rounded-lg">
                        <p className="text-xs font-medium text-so-yellow mb-2">
                          This number is registered to {phoneMatches[0].name}.
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              onClose()
                              router.push(`/students/${phoneMatches[0].id}`)
                            }}
                            className="text-xs px-3 py-1.5 bg-so-yellow text-black font-semibold rounded-md hover:bg-yellow-500 transition-colors"
                          >
                            View Student
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowDuplicatePrompt(false)}
                            className="text-xs px-3 py-1.5 border border-so-yellow/30 text-so-yellow font-medium rounded-md hover:bg-so-yellow/10 transition-colors"
                          >
                            Continue Anyway
                          </button>
                        </div>
                      </div>
                    )}

                    {showDuplicatePrompt && phoneMatches.length > 1 && (
                      <div className="mt-2 p-3 bg-so-yellow-subtle border border-so-yellow/20 rounded-lg">
                        <p className="text-xs font-medium text-so-yellow mb-2">
                          This number is registered to {phoneMatches.length} students.
                        </p>
                        <div className="space-y-1.5 mb-2">
                          {phoneMatches.map(m => (
                            <div key={m.id} className="flex items-center justify-between text-xs">
                              <span className="text-so-text">{m.name}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  onClose()
                                  router.push(`/students/${m.id}`)
                                }}
                                className="text-so-yellow hover:underline font-medium"
                              >
                                View
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowDuplicatePrompt(false)}
                          className="text-xs text-so-yellow hover:underline w-full text-center"
                        >
                          Continue Anyway
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Guardian Name */}
                  <div>
                    <label className="block text-xs font-semibold text-so-text mb-1.5">
                      Guardian Name <span className="text-so-red">*</span>
                    </label>
                    <input
                      type="text"
                      value={guardianName}
                      onChange={e => setGuardianName(e.target.value)}
                      placeholder="Parent/Guardian name"
                      className={`w-full bg-white border ${
                        hasSubmitted && errors.guardianName ? 'border-so-red' : 'border-so-border'
                      } rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent`}
                    />
                    {hasSubmitted && errors.guardianName && (
                      <p className="text-so-red text-xs mt-1">{errors.guardianName}</p>
                    )}
                  </div>

                  {/* Alternative Phone Number */}
                  <div>
                    <label className="block text-xs font-semibold text-so-text mb-1.5">
                      Alternative Phone Number <span className="text-xs text-so-muted font-normal">(Optional)</span>
                    </label>
                    <input
                      type="tel"
                      value={alternatePhone}
                      onChange={e => setAlternatePhone(e.target.value)}
                      placeholder="Optional secondary number"
                      className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
                    />
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="block text-xs font-semibold text-so-text mb-1.5">
                      Date of Birth <span className="text-xs text-so-muted font-normal">(Optional)</span>
                    </label>
                    <input
                      type="date"
                      max={getTodayIST()}
                      value={dateOfBirth}
                      onChange={e => setDateOfBirth(e.target.value)}
                      className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-so-text mb-1.5">
                      Email <span className="text-xs text-so-muted font-normal">(Optional)</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="e.g. rahul@example.com"
                      className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
                    />
                  </div>

                  {/* Address */}
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-semibold text-so-text mb-1.5">
                      Address <span className="text-xs text-so-muted font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder="Residential address"
                      className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Coaching Details */}
            {activeTab === 'coaching' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* 1. Batch */}
                <div>
                  <label className="block text-xs font-semibold text-so-text mb-1.5">
                    Batch <span className="text-so-red">*</span>
                  </label>
                  <select
                    value={batch}
                    onChange={e => handleBatchChange(e.target.value)}
                    className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent capitalize"
                  >
                    {availableBatches.length === 0 ? (
                      <option value="" disabled>No batches created yet</option>
                    ) : (
                      availableBatches.map(b => (
                        <option key={b.id || b.name} value={b.name}>
                          {b.name} {b.fees ? `(₹${b.fees.toLocaleString('en-IN')})` : ''}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* 2. Fee Amount (₹) */}
                <div>
                  <label className="block text-xs font-semibold text-so-text mb-1.5">
                    Fee Amount (₹) <span className="text-so-red">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={feeAmount || ''}
                    onChange={e => setFeeAmount(Math.max(0, Number(e.target.value)))}
                    placeholder="e.g. 1500"
                    className={`w-full bg-white border ${
                      hasSubmitted && errors.feeAmount ? 'border-so-red' : 'border-so-border'
                    } rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent`}
                  />
                  {hasSubmitted && errors.feeAmount && (
                    <p className="text-so-red text-xs mt-1">{errors.feeAmount}</p>
                  )}
                </div>

                {/* 3. Start Date & End Date / Valid Until */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-so-text mb-1.5">
                      Start Date <span className="text-so-red">*</span>
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className={`w-full bg-white border ${
                        hasSubmitted && errors.startDate ? 'border-so-red' : 'border-so-border'
                      } rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent`}
                    />
                    {hasSubmitted && errors.startDate && (
                      <p className="text-so-red text-xs mt-1">{errors.startDate}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-so-text mb-1.5">
                      End Date / Valid Until <span className="text-so-red">*</span>
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={e => setEndDate(e.target.value)}
                      className={`w-full bg-white border ${
                        hasSubmitted && errors.endDate ? 'border-so-red' : 'border-so-border'
                      } rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent`}
                    />
                    {hasSubmitted && errors.endDate && (
                      <p className="text-so-red text-xs mt-1">{errors.endDate}</p>
                    )}
                  </div>
                </div>

                {/* 4. Partial Payment option and Payment Mode beside each other */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 rounded-xl border border-so-border bg-so-surface/30">
                  {/* Left: Partial Payment Option */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        id="isPartial"
                        checked={isPartial}
                        onChange={e => {
                          const checked = e.target.checked
                          setIsPartial(checked)
                          if (!checked) {
                            setAmountPaying(feeAmount)
                            setPartialDue(0)
                          }
                        }}
                        className="w-4 h-4 rounded text-so-accent focus:ring-so-accent border-so-border"
                      />
                      <label htmlFor="isPartial" className="text-xs font-semibold text-so-text uppercase tracking-wider select-none cursor-pointer">
                        Accept Partial Payment
                      </label>
                    </div>

                    {isPartial ? (
                      <div className="space-y-3 animate-in fade-in duration-200">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-so-muted uppercase tracking-wider mb-1">
                              Paying Now (₹)
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={amountPaying}
                              onChange={e => setAmountPaying(Math.max(0, Number(e.target.value)))}
                              className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-emerald font-semibold focus:outline-none focus:border-so-accent"
                              placeholder="0"
                            />
                            {hasSubmitted && errors.amountPaying && (
                              <p className="text-so-red text-xs mt-1">{errors.amountPaying}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs text-so-muted uppercase tracking-wider mb-1">
                              Partial Due (₹)
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={partialDue}
                              onChange={e => setPartialDue(Math.max(0, Number(e.target.value)))}
                              className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-amber-600 font-semibold focus:outline-none focus:border-amber-500"
                              placeholder="0"
                            />
                            {hasSubmitted && errors.partialDue && (
                              <p className="text-so-red text-xs mt-1">{errors.partialDue}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-so-muted">
                        Full payment of ₹{feeAmount.toLocaleString('en-IN')} will be recorded upon enrollment.
                      </p>
                    )}
                  </div>

                  {/* Right: Payment Mode */}
                  <div>
                    <label className="block text-xs font-semibold text-so-text uppercase tracking-wider mb-2">
                      Payment Mode <span className="text-so-red">*</span>
                    </label>
                    <div className="flex gap-2">
                      {(['cash', 'upi', 'card', 'other'] as const).map(method => (
                        <button
                          type="button"
                          key={method}
                          onClick={() => setPaymentMethod(method)}
                          className={`flex-1 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors border ${
                            paymentMethod === method 
                              ? 'bg-so-accent text-white border-so-accent' 
                              : 'bg-white text-so-muted border-so-border hover:border-so-accent/50'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                    {hasSubmitted && errors.paymentMethod && (
                      <p className="text-so-red text-xs mt-1">{errors.paymentMethod}</p>
                    )}
                  </div>
                </div>

                {/* 5. Joining Date / Date of Admission & Source */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-so-text mb-1.5">
                      Joining Date / Date of Admission <span className="text-xs text-so-muted font-normal">(Optional)</span>
                    </label>
                    <input
                      type="date"
                      value={joiningDate}
                      onChange={e => setJoiningDate(e.target.value)}
                      className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
                    />
                    <p className="text-[11px] text-so-muted mt-1">Leave empty to use Start Date</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-so-text mb-1.5">
                      Source <span className="text-xs text-so-muted font-normal">(Optional)</span>
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

                {/* 6. Internal Notes */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-so-text uppercase tracking-wider">
                      Internal Notes <span className="text-xs text-so-muted font-normal">(Optional)</span>
                    </label>
                    <span className={`text-xs ${notes.length > 300 ? 'text-so-red' : 'text-so-muted'}`}>
                      {notes.length}/300
                    </span>
                  </div>
                  <textarea 
                    value={notes} 
                    onChange={e => setNotes(e.target.value.slice(0, 300))}
                    rows={3}
                    placeholder="Any context about this enrollment..."
                    className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text resize-none focus:outline-none focus:border-so-accent placeholder:text-so-muted"
                  />
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-so-border bg-so-surface/30 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-so-muted hover:text-so-text transition-colors"
          >
            Cancel
          </button>
          <button 
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit} 
            className="px-6 py-2 bg-so-accent text-white rounded-lg text-sm font-bold hover:bg-so-accent-hover transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Enroll Student
          </button>
        </div>

        {/* Toast Notification */}
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
            <button
              type="button"
              onClick={() => setToast(null)}
              className="opacity-60 hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
