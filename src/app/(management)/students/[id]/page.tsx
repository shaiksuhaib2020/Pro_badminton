'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { mockStudents, mockSettings } from '@/lib/mock-data'
import { isWithinInterval, parseISO, format, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from 'date-fns'
import { ArrowLeft, User, Phone, Shield, Calendar, IndianRupee, Users, CreditCard, SlidersHorizontal, X, Receipt, CheckCircle, RefreshCw, Wallet, Trash2 } from 'lucide-react'
import RenewModal from '@/components/coaching/RenewModal'

type ProfileTab = 'details' | 'transactions'
type TxTab = 'recent' | 'paid' | 'pending' | 'partial'
type FilterRange = 'currentMonth' | 'lastMonth' | 'custom'

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
  <div className="flex items-start gap-3">
    <span className="text-so-muted mt-0.5 w-4 h-4 flex-shrink-0">{icon}</span>
    <div>
      <p className="text-xs text-so-muted">{label}</p>
      <p className="text-sm text-so-text mt-0.5">{value}</p>
    </div>
  </div>
)

export default function StudentProfilePage() {
  const params = useParams()
  const router = useRouter()
  
  const [profileTab, setProfileTab] = useState<ProfileTab>('details')
  const [txTab, setTxTab] = useState<TxTab>('recent')
  const [showFilter, setShowFilter] = useState(false)
  const [filterRange, setFilterRange] = useState<FilterRange>('currentMonth')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [renewTarget, setRenewTarget] = useState(false)
  const [collectRemaining, setCollectRemaining] = useState(false)
  const [voidConfirmId, setVoidConfirmId] = useState<string | null>(null)
  const [, forceUpdate] = useState(0)
  const refresh = () => forceUpdate(n => n + 1)

  const student = mockStudents.find(s => s.id === params.id)

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-so-muted">Student not found.</p>
        <button onClick={() => router.push('/students')}
          className="text-so-accent text-sm hover:underline">
           Back to Students
        </button>
      </div>
    )
  }

  const getMembershipName = (id: string) =>
    mockSettings.membershipTypes.find(m => m.id === id)?.name ?? id

  const computeRange = (range: FilterRange, cFrom: string, cTo: string) => {
    const now = new Date()
    switch (range) {
      case 'currentMonth':
        return { start: startOfMonth(now), end: endOfMonth(now) }
      case 'lastMonth':
        const lm = subMonths(now, 1)
        return { start: startOfMonth(lm), end: endOfMonth(lm) }
      case 'custom':
        if (!cFrom || !cTo) return { start: startOfMonth(now), end: endOfMonth(now) }
        return { start: startOfDay(parseISO(cFrom)), end: endOfDay(parseISO(cTo)) }
    }
  }
  const range = computeRange(filterRange, customFrom, customTo)

  const studentTx = [...student.paymentHistory]
    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())

  const totalCollected = student.paymentHistory
    .filter(p => p.status !== 'deleted')
    .reduce((sum, p) => sum + p.amount, 0)

  const totalDue = student.pendingAmount > 0
    ? student.pendingAmount
    : (student.status === 'expired' || student.status === 'due-soon')
      ? student.fees
      : 0

  const recentRows = studentTx
    .filter(p => {
      try { return isWithinInterval(parseISO(p.date), range) } catch { return false }
    })

  const paidRows = studentTx
    .filter(p => {
      try { return isWithinInterval(parseISO(p.date), range) } catch { return false }
    })
    .filter(p => p.paymentType === 'full' || p.paymentType === 'advance')

  const isPending = student.status === 'expired' || student.status === 'due-soon'
  const isPartial = student.pendingAmount > 0

  const handleVoid = (entryId: string) => {
    const entry = student.paymentHistory.find(p => p.id === entryId)
    if (!entry) return
    entry.status = 'deleted'
    setVoidConfirmId(null)
    refresh()
  }

  const formatDateLabel = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd MMM yyyy')
    } catch {
      return dateStr
    }
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Page top bar */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/students')}
          className="p-1.5 rounded-md text-so-muted hover:text-so-text hover:bg-so-surface transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-so-text">{student.name}</h1>
          <p className="text-so-muted text-sm mt-0.5 capitalize">
            {getMembershipName(student.membershipTypeId)} • {student.currentBatch} Batch
          </p>
        </div>
        <div className="ml-auto">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            student.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
            student.status === 'due-soon' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
            student.status === 'expired' ? 'bg-red-50 text-red-700 border border-red-200' :
            'bg-so-surface text-so-muted border border-so-border'
          }`}>
            {student.status === 'off-court' ? 'Off-Court' : 
             student.status === 'due-soon' ? 'Due Soon' :
             student.status.charAt(0).toUpperCase() + student.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Profile tab bar */}
      <div className="flex items-center gap-2 border-b border-so-border mb-6">
        {(['details', 'transactions'] as ProfileTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setProfileTab(tab)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              profileTab === tab
                ? 'border-so-accent text-so-accent'
                : 'border-transparent text-so-muted hover:text-so-text'
            }`}
          >
            {tab === 'details' ? 'Member Details' : 'Transaction Details'}
          </button>
        ))}
      </div>

      {profileTab === 'details' && (
        <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-6">
          <h3 className="text-xs text-so-muted uppercase tracking-wider mb-4">Personal Information</h3>
          <div className="grid grid-cols-2 gap-x-12 gap-y-4">
            <InfoRow icon={<User className="w-4 h-4" />} label="Name" value={student.name} />
            <InfoRow icon={<Phone className="w-4 h-4" />} label="Mobile Number" value={student.phone} />
            <InfoRow icon={<Phone className="w-4 h-4" />} label="Alternate Number" value={student.alternatePhone || '-'} />
            <InfoRow icon={<Shield className="w-4 h-4" />} label="Guardian" value={student.guardianName || '-'} />
          </div>

          <div className="border-t border-so-border my-6"></div>

          <h3 className="text-xs text-so-muted uppercase tracking-wider mb-4 mt-6">More Information</h3>
          <div className="grid grid-cols-2 gap-x-12 gap-y-4">
            <InfoRow icon={<Calendar className="w-4 h-4" />} label="Date of Admission" value={formatDateLabel(student.startDate)} />
            <InfoRow icon={<IndianRupee className="w-4 h-4" />} label="Fees" value={`₹ ${student.fees.toLocaleString('en-IN')}`} />
            <InfoRow icon={<Calendar className="w-4 h-4" />} label="Membership Start" value={formatDateLabel(student.membershipStartDate)} />
            <InfoRow icon={<Calendar className="w-4 h-4" />} label="Next Due" value={formatDateLabel(student.nextDueDate)} />
            <InfoRow icon={<Users className="w-4 h-4" />} label="Current Batch" value={`${student.currentBatch} Batch`} />
            <InfoRow icon={<CreditCard className="w-4 h-4" />} label="Membership" value={getMembershipName(student.membershipTypeId)} />
          </div>

          {student.internalNotes && (
            <div className="mt-6 p-3 bg-so-surface rounded-lg border border-so-border">
              <p className="text-xs text-so-muted mb-1">Internal Notes</p>
              <p className="text-sm text-so-text">{student.internalNotes}</p>
            </div>
          )}
        </div>
      )}

      {profileTab === 'transactions' && (
        <div>
          {/* 3 Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-4">
              <span className="text-so-muted text-xs uppercase tracking-wider font-semibold">Total Due</span>
              <div className={`text-2xl font-bold mt-2 ${totalDue > 0 ? 'text-so-red' : 'text-so-muted'}`}>
                ₹ {totalDue.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-4">
              <span className="text-so-muted text-xs uppercase tracking-wider font-semibold">Collected <span className="lowercase font-normal">(All Time)</span></span>
              <div className="text-2xl font-bold mt-2 text-so-emerald">
                ₹ {totalCollected.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-4">
              <span className="text-so-muted text-xs uppercase tracking-wider font-semibold">Batch</span>
              <div className="text-2xl font-bold mt-2 text-so-text capitalize">
                {student.currentBatch}
              </div>
            </div>
          </div>

          {/* Transaction section */}
          <div className="flex items-center justify-between mt-6 mb-4">
            <div className="flex gap-1 p-1 bg-so-surface rounded-lg border border-so-border">
              {(['recent', 'paid', 'pending', 'partial'] as TxTab[]).map(tab => {
                const labels = { recent: 'Recent', paid: 'Paid', pending: 'Pending', partial: 'Partially Paid' }
                return (
                  <button key={tab} onClick={() => setTxTab(tab)}
                    className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      txTab === tab
                        ? 'bg-so-accent text-white shadow-sm'
                        : 'text-so-muted hover:text-so-text hover:bg-so-surface/80'
                    }`}
                  >
                    {labels[tab]}
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => setShowFilter(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-so-border rounded-lg text-xs text-so-muted hover:border-so-accent hover:text-so-text transition-colors"
            >
              <SlidersHorizontal className="w-3 h-3" />
              Filter
              {filterRange !== 'currentMonth' && (
                <span className="w-1.5 h-1.5 rounded-full bg-so-accent" />
              )}
            </button>
          </div>

          {/* TX Tabs Content */}
          <div className="bg-so-card border border-so-border rounded-xl shadow-sm overflow-hidden min-h-[300px]">
            {txTab === 'recent' && (
              <div>
                {recentRows.length === 0 ? (
                  <div className="text-center py-10 flex flex-col items-center">
                    <Receipt className="w-8 h-8 text-so-muted mx-auto mb-2" strokeWidth={1.5} />
                    <p className="text-so-muted text-sm font-medium">No transactions in this period</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-so-surface border-b border-so-border">
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Date</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Amount</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Type</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Method</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-so-border">
                        {recentRows.map(t => (
                          <tr key={t.id} className="bg-so-card hover:bg-so-surface/60 border-b border-so-border transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-so-text">{formatDateLabel(t.date)}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`font-semibold ${t.status === 'deleted' ? 'text-so-muted line-through' : 'text-so-emerald'}`}>
                                ₹ {t.amount.toLocaleString('en-IN')}
                              </div>
                              {t.paymentType === 'partial' && t.remainingAmount > 0 && t.status !== 'deleted' && (
                                <div className="text-amber-600 text-xs mt-0.5">{t.remainingAmount.toLocaleString('en-IN')} remaining</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {t.paymentType === 'full' && <span className="text-xs font-medium text-so-emerald">Full</span>}
                              {t.paymentType === 'partial' && <span className="text-xs font-medium text-amber-500">Partial</span>}
                              {t.paymentType === 'advance' && <span className="text-xs font-medium text-blue-600">Advance</span>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-so-muted capitalize">{t.paymentMethod}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {t.status === 'active' && <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-so-emerald-subtle text-so-emerald">Active</span>}
                              {t.status === 'inactive' && <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-so-surface text-so-muted">Inactive</span>}
                              {t.status === 'deleted' && <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-so-red-subtle text-so-red">Voided</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {txTab === 'paid' && (
              <div>
                {paidRows.length === 0 ? (
                  <div className="text-center py-10 flex flex-col items-center">
                    <Receipt className="w-8 h-8 text-so-muted mx-auto mb-2" strokeWidth={1.5} />
                    <p className="text-so-muted text-sm font-medium">No transactions in this period</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-so-surface border-b border-so-border">
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Date</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Amount</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Method</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Status</th>
                          <th className="text-right px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-so-border">
                        {paidRows.map(t => (
                          <tr key={t.id} className="bg-so-card hover:bg-so-surface/60 border-b border-so-border transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-so-text">{formatDateLabel(t.date)}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`font-semibold ${t.status === 'deleted' ? 'text-so-muted line-through' : 'text-so-emerald'}`}>
                                ₹ {t.amount.toLocaleString('en-IN')}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-so-muted capitalize">{t.paymentMethod}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {t.status === 'active' && <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-so-emerald-subtle text-so-emerald">Active</span>}
                              {t.status === 'inactive' && <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-so-surface text-so-muted">Inactive</span>}
                              {t.status === 'deleted' && <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-so-red-subtle text-so-red">Voided</span>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              {t.status !== 'deleted' ? (
                                voidConfirmId === t.id ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <span className="text-xs text-so-muted">Void this?</span>
                                    <button onClick={() => handleVoid(t.id)}
                                      className="text-xs px-2 py-1 bg-so-red text-white rounded-md">Yes</button>
                                    <button onClick={() => setVoidConfirmId(null)}
                                      className="text-xs px-2 py-1 border border-so-border rounded-md text-so-muted">No</button>
                                  </div>
                                ) : (
                                  <button onClick={() => setVoidConfirmId(t.id)}
                                    className="p-1.5 rounded-md text-so-muted hover:text-so-red hover:bg-so-surface transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )
                              ) : (
                                <span className="text-xs text-so-red italic">Voided</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {txTab === 'pending' && (
              <div>
                {!isPending ? (
                  <div className="text-center py-10 flex flex-col items-center">
                    <CheckCircle className="w-8 h-8 text-so-emerald mx-auto mb-2" strokeWidth={1.5} />
                    <p className="text-so-muted text-sm font-medium">No pending payments</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-so-surface border-b border-so-border">
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Due Date</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Amount</th>
                          <th className="text-right px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-so-border">
                        <tr className="bg-so-card hover:bg-so-surface/60 border-b border-so-border transition-colors">
                          <td className={`px-6 py-4 whitespace-nowrap font-medium ${student.status === 'expired' ? 'text-so-red' : 'text-so-yellow'}`}>
                            {formatDateLabel(student.nextDueDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-so-emerald font-semibold">
                            ₹ {student.fees.toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex justify-end">
                              <button
                                onClick={() => setRenewTarget(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-so-accent text-white rounded-md text-xs font-medium hover:opacity-90"
                              >
                                <RefreshCw className="w-3 h-3" />
                                Collect Payment
                              </button>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {txTab === 'partial' && (
              <div>
                {!isPartial ? (
                  <div className="text-center py-10 flex flex-col items-center">
                    <CheckCircle className="w-8 h-8 text-so-emerald mx-auto mb-2" strokeWidth={1.5} />
                    <p className="text-so-muted text-sm font-medium">No partial payments outstanding</p>
                  </div>
                ) : (
                  (() => {
                    const latestPartial = student.paymentHistory
                      .filter(p => p.paymentType === 'partial' && p.status !== 'deleted')
                      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())[0]

                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-so-surface border-b border-so-border">
                              <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Date</th>
                              <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Paid</th>
                              <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Remaining</th>
                              <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Method</th>
                              <th className="text-right px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-so-border">
                            <tr className="bg-so-card hover:bg-so-surface/60 border-b border-so-border transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-so-text">
                                {latestPartial ? formatDateLabel(latestPartial.date) : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-so-emerald font-semibold">
                                {latestPartial ? `₹ ${latestPartial.amount.toLocaleString('en-IN')}` : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-amber-600 font-semibold">
                                ₹ {student.pendingAmount.toLocaleString('en-IN')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-so-muted capitalize">
                                {latestPartial?.paymentMethod || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <div className="flex justify-end">
                                  <button
                                    onClick={() => setCollectRemaining(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 border border-amber-500/30 rounded-md text-xs font-medium hover:bg-amber-500/30"
                                  >
                                    <Wallet className="w-3 h-3" />
                                    Collect Remaining
                                  </button>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )
                  })()
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter Overlay */}
      {showFilter && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilter(false)} />
          <div className="relative w-72 h-full bg-so-card border-l border-so-border flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-so-border">
              <span className="font-semibold text-so-text">Filter Transactions</span>
              <button onClick={() => setShowFilter(false)} className="p-1 hover:bg-so-surface rounded">
                <X className="w-4 h-4 text-so-muted" />
              </button>
            </div>
            
            <div className="p-4 flex-1">
              <p className="text-xs text-so-muted uppercase tracking-wider mb-3">Date Range</p>
              {[
                { value: 'currentMonth', label: 'Current Month' },
                { value: 'lastMonth', label: 'Last Month' },
                { value: 'custom', label: 'Custom Date Range' },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-3 py-2 cursor-pointer group">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                    filterRange === opt.value ? 'border-so-accent' : 'border-so-border'
                  }`}>
                    {filterRange === opt.value && <div className="w-2 h-2 rounded-full bg-so-accent" />}
                  </div>
                  <span className={`text-sm transition-colors ${filterRange === opt.value ? 'text-so-text' : 'text-so-muted group-hover:text-so-text'}`}>
                    {opt.label}
                  </span>
                  <input
                    type="radio"
                    className="sr-only"
                    checked={filterRange === opt.value}
                    onChange={() => setFilterRange(opt.value as FilterRange)}
                  />
                </label>
              ))}
              
              {filterRange === 'custom' && (
                <div className="mt-3 space-y-2">
                  <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                    max={customTo || format(new Date(), 'yyyy-MM-dd')}
                    className="w-full bg-white border border-so-border rounded-md px-3 py-1.5 text-sm text-so-text focus:outline-none focus:border-so-accent" />
                  <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                    min={customFrom} max={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full bg-white border border-so-border rounded-md px-3 py-1.5 text-sm text-so-text focus:outline-none focus:border-so-accent" />
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-so-border flex gap-3">
              <button
                onClick={() => { setFilterRange('currentMonth'); setCustomFrom(''); setCustomTo('') }}
                className="flex-1 py-2 border border-so-border rounded-lg text-sm text-so-muted hover:text-so-text transition-colors"
              >
                Clear
              </button>
              <button onClick={() => setShowFilter(false)}
                className="flex-1 py-2 bg-so-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                Apply Filter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {(renewTarget || collectRemaining) && (
        <RenewModal
          student={student}
          isCollectingRemaining={collectRemaining}
          onClose={() => { setRenewTarget(false); setCollectRemaining(false) }}
          onConfirm={(entry, newDueDate, newMembershipStartDate, newPendingAmount, newBatch) => {
            student.paymentHistory.push(entry)
            student.nextDueDate = newDueDate
            student.membershipStartDate = newMembershipStartDate
            student.pendingAmount = newPendingAmount
            student.currentBatch = newBatch
            student.status = newPendingAmount > 0 ? 'due-soon' : 'active'
            setRenewTarget(false)
            setCollectRemaining(false)
            refresh()
          }}
        />
      )}
    </div>
  )
}
