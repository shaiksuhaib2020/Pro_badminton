'use client'

import { useState, useEffect } from 'react'
import { mockStudents, mockSettings, Student, PaymentEntry } from '@/lib/mock-data'
import { addMonths, addDays, parseISO, format } from 'date-fns'
import { X, Search, CheckCircle, AlertCircle, SplitSquareHorizontal } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Props = {
  onClose: () => void
  onSuccess: () => void
}

export default function AddStudentModal({ onClose, onSuccess }: Props) {
  const router = useRouter()
  
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [guardianName, setGuardianName] = useState('')
  const [alternatePhone, setAlternatePhone] = useState('')
  const [membershipTypeId, setMembershipTypeId] = useState(mockSettings.membershipTypes[0]?.id || '')
  const [batch, setBatch] = useState(mockSettings.batches[0] || '')
  const [discountType, setDiscountType] = useState<'₹' | '%'>('₹')
  const [discountValue, setDiscountValue] = useState(0)
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'other'>('upi')
  const [notes, setNotes] = useState('')

  const [phoneMatches, setPhoneMatches] = useState<Student[]>([])
  const [showDuplicatePrompt, setShowDuplicatePrompt] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [hasSubmitted, setHasSubmitted] = useState(false)

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const mt = mockSettings.membershipTypes.find(m => m.id === membershipTypeId)
  const baseFee = mt?.price ?? 0
  const finalFee = Math.max(0,
    discountType === '₹'
      ? baseFee - discountValue
      : baseFee - (baseFee * discountValue / 100)
  )

  const [isPartial, setIsPartial] = useState(false)
  const [amountPaying, setAmountPaying] = useState<number>(finalFee)
  const [partialDue, setPartialDue] = useState<number>(0)

  useEffect(() => {
    if (!isPartial) {
      setAmountPaying(finalFee)
    }
  }, [finalFee, isPartial])

  const nextDue = mt?.durationType === 'months'
    ? addMonths(parseISO(startDate), mt!.duration)
    : addDays(parseISO(startDate), mt?.duration || 0)

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
    if (finalFee < 0) newErrors.fee = 'Final fee cannot be negative'
    if (!paymentMethod) newErrors.paymentMethod = 'Payment method is required'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    setHasSubmitted(true)
    if (!validate()) {
      setToast({ type: 'error', message: 'Please fill all required fields correctly.' })
      return
    }

    if (isPartial && amountPaying + partialDue !== finalFee) {
      setToast({ type: 'error', message: `Paying Now + Partial Due must equal ${finalFee.toLocaleString('en-IN')}` })
      return
    }
    if (isPartial && amountPaying <= 0) {
      setToast({ type: 'error', message: 'Amount Paying Now must be greater than 0' })
      return
    }

    const mtRef = mockSettings.membershipTypes.find(m => m.id === membershipTypeId)!
    
    const effectiveAmount = isPartial ? amountPaying : finalFee
    const effectiveRemaining = isPartial ? partialDue : 0
    const paymentType: PaymentEntry['paymentType'] = isPartial ? 'partial' : 'full'

    const newStudent: Student = {
      id: crypto.randomUUID(),
      name: name.trim(),
      phone: phone.trim(),
      alternatePhone: alternatePhone.trim(),
      guardianName: guardianName.trim(),
      membershipTypeId,
      currentBatch: batch,
      fees: finalFee,
      startDate: startDate,
      membershipStartDate: startDate,
      nextDueDate: format(nextDue, 'yyyy-MM-dd'),
      status: effectiveRemaining > 0 ? 'due-soon' : 'active',
      pendingAmount: effectiveRemaining,
      internalNotes: notes.trim(),
      paymentHistory: [{
        id: crypto.randomUUID(),
        date: startDate,
        amount: effectiveAmount,
        remainingAmount: effectiveRemaining,
        paymentType,
        monthsCovered: mtRef.duration,
        paymentMethod: paymentMethod,
        status: 'active',
        note: ''
      }]
    }
    
    mockStudents.push(newStudent)
    
    setToast({ type: 'success', message: `${newStudent.name} enrolled successfully` })
    onSuccess()
    setTimeout(() => onClose(), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="relative bg-so-card border border-so-border rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col shadow-2xl my-auto">
        <div className="px-6 py-4 border-b border-so-border flex items-center justify-between sticky top-0 bg-so-card z-10">
          <h2 className="text-xl font-bold text-so-text">Enroll New Student</h2>
          <button onClick={onClose} className="text-so-muted hover:text-so-accent transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-6 overflow-y-auto">
          <div className="space-y-6">
            
            {/* Personal Details Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">Student Name <span className="text-so-red">*</span></label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rahul Kumar"
                  className={`w-full bg-so-surface border ${hasSubmitted && errors.name ? 'border-so-red' : 'border-so-border'} rounded-lg px-4 py-2.5 text-sm text-so-text focus:outline-none focus:border-so-accent`} />
                {hasSubmitted && errors.name && <p className="text-so-red text-xs mt-1">{errors.name}</p>}
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">Phone Number <span className="text-so-red">*</span></label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} onBlur={handlePhoneBlur} placeholder="10-digit mobile"
                  className={`w-full bg-so-surface border ${hasSubmitted && errors.phone ? 'border-so-red' : 'border-so-border'} rounded-lg px-4 py-2.5 text-sm text-so-text focus:outline-none focus:border-so-accent`} />
                {hasSubmitted && errors.phone && <p className="text-so-red text-xs mt-1">{errors.phone}</p>}
                
                {showDuplicatePrompt && phoneMatches.length === 1 && (
                  <div className="mt-2 p-3 bg-so-yellow-subtle border border-so-yellow/20 rounded-lg">
                    <p className="text-xs font-medium text-so-yellow mb-2">This number is registered to {phoneMatches[0].name}.</p>
                    <div className="flex gap-2">
                      <button onClick={() => { onClose(); router.push(`/students/${phoneMatches[0].id}`) }} className="text-xs px-3 py-1.5 bg-so-yellow text-black font-semibold rounded-md hover:bg-yellow-500 transition-colors">
                        View Student
                      </button>
                      <button onClick={() => setShowDuplicatePrompt(false)} className="text-xs px-3 py-1.5 border border-so-yellow/30 text-so-yellow font-medium rounded-md hover:bg-so-yellow/10 transition-colors">
                        Continue Anyway
                      </button>
                    </div>
                  </div>
                )}
                {showDuplicatePrompt && phoneMatches.length > 1 && (
                  <div className="mt-2 p-3 bg-so-yellow-subtle border border-so-yellow/20 rounded-lg">
                    <p className="text-xs font-medium text-so-yellow mb-2">This number is registered to {phoneMatches.length} students.</p>
                    <div className="space-y-1.5 mb-2">
                      {phoneMatches.map(m => (
                        <div key={m.id} className="flex items-center justify-between text-xs">
                          <span className="text-so-text">{m.name}</span>
                          <button onClick={() => { onClose(); router.push(`/students/${m.id}`) }} className="text-so-yellow hover:underline font-medium">View</button>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setShowDuplicatePrompt(false)} className="text-xs text-so-yellow hover:underline w-full text-center">Continue Anyway</button>
                  </div>
                )}
              </div>
            </div>

            {/* Personal Details Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">Guardian Name <span className="text-so-red">*</span></label>
                <input type="text" value={guardianName} onChange={e => setGuardianName(e.target.value)} placeholder="Parent/Guardian name"
                  className={`w-full bg-so-surface border ${hasSubmitted && errors.guardianName ? 'border-so-red' : 'border-so-border'} rounded-lg px-4 py-2.5 text-sm text-so-text focus:outline-none focus:border-so-accent`} />
                {hasSubmitted && errors.guardianName && <p className="text-so-red text-xs mt-1">{errors.guardianName}</p>}
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">Alternative Phone</label>
                <input type="tel" value={alternatePhone} onChange={e => setAlternatePhone(e.target.value)} placeholder="Optional secondary number"
                  className="w-full bg-white border border-so-border rounded-lg px-4 py-2.5 text-sm text-so-text focus:outline-none focus:border-so-accent" />
              </div>
            </div>

            <div className="border-t border-so-border my-6"></div>

            {/* Membership & Batch Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">Membership Type</label>
                <select value={membershipTypeId} onChange={e => setMembershipTypeId(e.target.value)}
                  className="w-full bg-white border border-so-border rounded-lg px-4 py-2.5 text-sm text-so-text focus:outline-none focus:border-so-accent capitalize">
                  {mockSettings.membershipTypes.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">Batch</label>
                <select value={batch} onChange={e => setBatch(e.target.value)}
                  className="w-full bg-white border border-so-border rounded-lg px-4 py-2.5 text-sm text-so-text focus:outline-none focus:border-so-accent capitalize">
                  {mockSettings.batches.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fee Calculation Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-so-surface/50 border border-so-border rounded-xl p-4">
              <div>
                <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">Base Fee</label>
                <div className="px-4 py-2 text-sm text-so-muted font-medium bg-white border border-so-border rounded-lg">
                  ₹ {baseFee.toLocaleString('en-IN')}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">Discount</label>
                <div className="flex">
                  <button onClick={() => setDiscountType('₹')} className={`px-3 py-2 text-sm font-medium border border-so-border rounded-l-lg transition-colors ${discountType === '₹' ? 'bg-so-accent text-white border-so-accent' : 'bg-so-surface text-so-muted'}`}>₹</button>
                  <button onClick={() => setDiscountType('%')} className={`px-3 py-2 text-sm font-medium border-y border-r border-so-border transition-colors ${discountType === '%' ? 'bg-so-accent text-white border-so-accent' : 'bg-so-surface text-so-muted'}`}>%</button>
                  <input type="number" value={discountValue || ''} onChange={e => setDiscountValue(Number(e.target.value))} placeholder="0" min="0"
                    className="w-full bg-white border-y border-r border-so-border rounded-r-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-so-emerald uppercase tracking-wider mb-2">Final Fee</label>
                <div className="px-4 py-2 text-sm text-so-emerald font-bold bg-so-emerald-subtle border border-so-emerald/20 rounded-lg">
                  ₹ {finalFee.toLocaleString('en-IN')}
                </div>
                {hasSubmitted && errors.fee && <p className="text-so-red text-xs mt-1">{errors.fee}</p>}
              </div>
                
                {/* Partial Payment Toggle */}
                <div className="mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPartial(p => !p)
                      if (!isPartial) {
                        setAmountPaying(finalFee)
                        setPartialDue(0)
                      }
                    }}
                    className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                      isPartial
                        ? 'border-so-accent text-so-accent bg-so-accent/10'
                        : 'border-so-border text-so-muted hover:border-so-accent hover:text-so-text'
                    }`}
                  >
                    <SplitSquareHorizontal className="w-3.5 h-3.5" />
                    {isPartial ? 'Partial Payment Active' : 'Paying Partially?'}
                  </button>
                </div>

                {/* Partial Payment Fields */}
                {isPartial && (
                  <div className="mt-3 p-4 bg-so-surface rounded-xl border border-amber-500/30 space-y-3">
                    <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Student is paying a partial amount  enter breakdown below
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                          Paying Now (₹)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={finalFee}
                          value={amountPaying}
                          onChange={e => {
                            const paying = Math.max(0, Number(e.target.value))
                            setAmountPaying(paying)
                            setPartialDue(Math.max(0, finalFee - paying))
                          }}
                          className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-emerald font-semibold focus:outline-none focus:border-so-accent"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                          Partial Due (₹)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={partialDue}
                          onChange={e => {
                            const due = Math.max(0, Number(e.target.value))
                            setPartialDue(due)
                            setAmountPaying(Math.max(0, finalFee - due))
                          }}
                          className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-amber-600 font-semibold focus:outline-none focus:border-amber-500"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-so-muted">
                      Total: ₹{(amountPaying + partialDue).toLocaleString('en-IN')} 
                      {amountPaying + partialDue !== finalFee && (
                        <span className="text-red-600 ml-1">
                          (doesn't match fee of ₹{finalFee.toLocaleString('en-IN')})
                        </span>
                      )}
                    </p>
                  </div>
                )}
            </div>

            {/* Dates & Payment Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">Start Date</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                      className="w-full bg-white border border-so-border rounded-lg px-3 py-2.5 text-sm text-so-text focus:outline-none focus:border-so-accent" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">Next Due</label>
                    <div className="w-full bg-white border border-so-border rounded-lg px-3 py-2.5 text-sm text-[#5278EA] font-medium truncate">
                      {format(nextDue, 'dd MMM yyyy')}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">Payment Method <span className="text-so-red">*</span></label>
                  <div className="flex flex-wrap gap-2">
                    {(['cash', 'upi', 'card', 'other'] as const).map(method => (
                      <button
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors border ${
                          paymentMethod === method 
                            ? 'bg-so-accent text-white border-so-accent' 
                            : 'bg-so-surface text-so-muted border-so-border hover:border-so-accent'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                  {hasSubmitted && errors.paymentMethod && <p className="text-so-red text-xs mt-1">{errors.paymentMethod}</p>}
                </div>
              </div>

              <div>
                <label className="flex items-center justify-between text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">
                  <span>Internal Notes</span>
                  <span className={notes.length > 300 ? 'text-so-red' : ''}>{notes.length}/300</span>
                </label>
                <textarea 
                  value={notes} 
                  onChange={e => setNotes(e.target.value.slice(0, 300))}
                  placeholder="Any context about this enrollment..."
                  className="w-full h-[116px] bg-white border border-so-border rounded-lg px-4 py-3 text-sm text-so-text resize-none focus:outline-none focus:border-so-accent placeholder:text-so-muted"
                />
              </div>
            </div>

          </div>
        </div>

        <div className="px-6 py-4 border-t border-so-border bg-so-card flex justify-end gap-3 sticky bottom-0 z-10">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-so-muted hover:text-so-text transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} className="px-6 py-2.5 text-sm font-semibold bg-so-accent text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
            Enroll Student
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
