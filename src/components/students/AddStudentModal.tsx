'use client'

import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Batch } from '@/lib/types/batches'
import type { Student, EnrollmentDay } from '@/lib/types/students'
import { getTodayIST } from '@/lib/utils'
import { createStudent, reEnrollStudent } from '@/app/(management)/students/actions'
import { getBatchesAction } from '@/app/(management)/batches/actions'

type Props = {
  onClose: () => void
  onSuccess: () => void
  batches?: Batch[]
  defaultBatch?: string
  defaultName?: string
  defaultPhone?: string
  prefillName?: string
  prefillPhone?: string
  prefillGuardianName?: string
  prefillData?: Student
  isReEnroll?: boolean
}

type Source = Student['enrollmentSource'] | ''

export default function AddStudentModal({
  onClose, onSuccess, batches, defaultBatch, defaultName, defaultPhone,
  prefillName, prefillPhone, prefillGuardianName, prefillData, isReEnroll = false,
}: Props) {
  const router = useRouter()
  const [batchList, setBatchList] = useState<Batch[]>(batches ?? [])
  const [name, setName] = useState(prefillData?.name ?? prefillName ?? defaultName ?? '')
  const [phone, setPhone] = useState(prefillData?.phone ?? prefillPhone ?? defaultPhone ?? '')
  const [guardianName, setGuardianName] = useState(prefillData?.guardianName ?? prefillGuardianName ?? '')
  const [alternatePhone, setAlternatePhone] = useState(prefillData?.alternatePhone ?? '')
  const [dateOfBirth, setDateOfBirth] = useState(prefillData?.dateOfBirth ?? '')
  const [joiningDate, setJoiningDate] = useState(prefillData?.startDate ?? getTodayIST())
  const [batch, setBatch] = useState(prefillData?.currentBatchId ?? defaultBatch ?? '')
  const [fee, setFee] = useState(prefillData ? String(prefillData.fees) : '')
  const [source, setSource] = useState<Source>(prefillData?.enrollmentSource ?? '')
  const [notes, setNotes] = useState(prefillData?.internalNotes ?? '')
  const [activeTab, setActiveTab] = useState<'personal' | 'coaching'>('personal')
  const [address, setAddress] = useState(prefillData?.address ?? '')
  const [email, setEmail] = useState(prefillData?.email ?? '')
  const [enrollDays, setEnrollDays] = useState<EnrollmentDay[]>(prefillData?.enrollDays ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (batches) return
    getBatchesAction().then(setBatchList).catch(err => setError(err instanceof Error ? err.message : 'Could not load batches'))
  }, [batches])

  useEffect(() => {
    if (batchList.length === 0) return
    const named = batchList.find(item => item.name === batch)
    if (named) {
      setBatch(named.id)
      return
    }
    if (batch) return
    setBatch(batchList[0].id)
    if (!prefillData && fee === '') setFee(String(batchList[0].fees ?? 0))
  }, [batch, batchList, fee, prefillData])

  const save = async () => {
    if (saving) return
    setError('')
    if (!name.trim() || !/^[0-9]{10}$/.test(phone)) {
      setActiveTab('personal')
      setError('Enter a student name and a 10-digit phone number')
      return
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setActiveTab('personal')
      setError('Enter a valid email address')
      return
    }
    if (!isReEnroll && !joiningDate) {
      setActiveTab('coaching')
      setError('Joining date is required')
      return
    }
    const fees = fee.trim() === '' ? 0 : Number(fee)
    if (!Number.isFinite(fees) || fees < 0) {
      setActiveTab('coaching')
      setError('Default fee must be zero or greater')
      return
    }
    setSaving(true)
    try {
      const details = {
        address, email, enrollDays, name: name.trim(), phone: phone.trim(), alternatePhone: alternatePhone.trim(),
        guardianName: guardianName.trim(), fees, dateOfBirth: dateOfBirth || undefined,
        enrollmentSource: source || undefined, internalNotes: notes.trim(),
      }
      if (isReEnroll && prefillData) {
        await reEnrollStudent({ ...details, studentId: prefillData.id, currentBatch: batch || undefined })
      } else {
        await createStudent({ ...details, joiningDate, batch: batch || undefined })
      }
      router.refresh()
      onSuccess()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save student'
      setError(message === 'DUPLICATE_PHONE' ? 'A student with this phone number already exists' : message)
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full bg-so-surface text-sm text-so-text placeholder:text-so-grey px-3 py-2.5 border border-so-border rounded-lg focus:outline-none focus:ring-1 focus:ring-so-accent focus:border-so-accent transition-colors'
  const labelClass = 'text-xs font-medium text-so-muted mb-1.5 block'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative bg-so-card border border-so-border rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-so-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-so-text">{isReEnroll ? `Re-enroll ${prefillData?.name ?? 'Student'}` : 'Enroll Student'}</h2>
          <button type="button" onClick={onClose} className="text-so-grey hover:text-so-accent transition-colors" aria-label="Close">
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>
        <div className="flex overflow-y-auto max-h-[70vh]">
          <div role="tablist" aria-label="Enrollment details" aria-orientation="vertical" className="flex flex-col gap-2 border-r border-so-border p-4 shrink-0">
            {(['personal', 'coaching'] as const).map(tab => <button key={tab} id={`enroll-tab-${tab}`} type="button" role="tab" aria-selected={activeTab === tab} aria-controls={`enroll-panel-${tab}`} onClick={() => setActiveTab(tab)} className={`px-4 py-2.5 rounded-lg text-sm font-medium text-left transition-colors ${activeTab === tab ? 'bg-so-accent text-white' : 'text-so-muted hover:text-so-text'}`}>{tab === 'personal' ? 'Personal Details' : 'Coaching Details'}</button>)}
          </div>
          <div className="px-6 py-5 space-y-5 flex-1 min-w-0">
            <div id="enroll-panel-personal" role="tabpanel" aria-labelledby="enroll-tab-personal" hidden={activeTab !== 'personal'}><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className={labelClass}>Student Name *</label><input className={inputClass} value={name} onChange={e => setName(e.target.value)} /></div>
            <div><label className={labelClass}>Phone *</label><input className={inputClass} type="tel" value={phone} onChange={e => setPhone(e.target.value)} maxLength={10} /></div>
            <div><label className={labelClass}>Guardian Name (Optional)</label><input className={inputClass} value={guardianName} onChange={e => setGuardianName(e.target.value)} /></div>
            <div><label className={labelClass}>Alternate Phone (Optional)</label><input className={inputClass} type="tel" value={alternatePhone} onChange={e => setAlternatePhone(e.target.value)} /></div>
            <div><label className={labelClass}>Date of Birth (Optional)</label><input className={inputClass} type="date" value={dateOfBirth} max={getTodayIST()} onChange={e => setDateOfBirth(e.target.value)} /></div>

              <div><label className={labelClass}>Address</label><textarea className={inputClass} value={address} onChange={e => setAddress(e.target.value)} rows={2} /></div>
              <div><label className={labelClass}>Email</label><input className={inputClass} type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
            </div></div>
            <div id="enroll-panel-coaching" role="tabpanel" aria-labelledby="enroll-tab-coaching" hidden={activeTab !== 'coaching'} className="space-y-5"><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className={labelClass}>Fees (₹)</label><input className={inputClass} type="number" min="0" step="0.01" value={fee} placeholder="0" onChange={e => setFee(e.target.value)} /></div>
            <div>
              <label className={labelClass}>Batch</label>
              <select className="w-full bg-so-surface text-sm text-so-text px-3 py-2.5 border border-so-border rounded-lg focus:outline-none focus:ring-1 focus:ring-so-accent cursor-pointer" value={batch} onChange={e => {
                setBatch(e.target.value)
                const selected = batchList.find(item => item.id === e.target.value)
                if (selected) setFee(String(selected.fees ?? 0))
              }}>
                <option value="">No batch</option>
                {batchList.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <div><label className={labelClass}>Joining Date</label><input className={inputClass} type="date" value={joiningDate} onChange={e => setJoiningDate(e.target.value)} disabled={isReEnroll} /></div>

              <fieldset className="md:col-span-2"><legend className={labelClass}>Enroll Days</legend><div className="flex flex-wrap gap-3">{(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const).map(day => <label key={day} className="flex items-center gap-2 text-sm text-so-text"><input type="checkbox" checked={enrollDays.includes(day)} onChange={e => setEnrollDays(e.target.checked ? [...enrollDays, day] : enrollDays.filter(value => value !== day))} />{day}</label>)}</div></fieldset>
            <div>
              <label className={labelClass}>Enrollment Source (Optional)</label>
              <select className="w-full bg-so-surface text-sm text-so-text px-3 py-2.5 border border-so-border rounded-lg focus:outline-none focus:ring-1 focus:ring-so-accent cursor-pointer" value={source} onChange={e => setSource(e.target.value as Source)}>
                <option value="">Select source</option><option value="walk-in">Walk-in</option><option value="referral">Referral</option><option value="social-media">Social Media</option><option value="other">Other</option>
              </select>
            </div>
            </div>
          <div><label className={labelClass}>Notes</label><textarea className="w-full bg-so-surface text-sm text-so-text placeholder:text-so-grey px-3 py-2.5 border border-so-border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-so-accent" value={notes} onChange={e => setNotes(e.target.value)} rows={3} /></div>

            </div>
            {error && <p className="text-sm text-so-red" role="alert">{error}</p>}
            <p className="text-xs text-so-muted">Fee payments are recorded separately after enrollment.</p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-so-border flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2.5 border border-so-border text-so-muted rounded-lg text-sm font-medium hover:border-so-accent hover:text-so-text transition-colors">Cancel</button>
          <button type="button" onClick={save} disabled={saving} className="px-5 py-2.5 bg-so-accent text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin shrink-0" strokeWidth={1.75} />}
            {isReEnroll ? 'Confirm Re-enrollment' : 'Enroll Student'}
          </button>
        </div>
      </div>
    </div>
  )
}
