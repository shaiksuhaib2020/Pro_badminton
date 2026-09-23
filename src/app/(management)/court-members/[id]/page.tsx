'use client'

import { useState, useRef, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from 'date-fns'
import { ArrowLeft, CheckCircle, Trash2, Calendar, CreditCard, Clock, FileText, AlertCircle, User, Phone, SlidersHorizontal, X, Pencil } from 'lucide-react'
import { mockCourtMembers, mockCourtPlans, CourtMember } from '@/lib/mock-data'
import RenewCourtMemberModal from '@/components/court/RenewCourtMemberModal'
import EditCourtMemberModal from '@/components/court/EditCourtMemberModal'

const getPlanDisplay = (member: CourtMember) => {
  if (member.planType === 'monthly') {
    const months = member.durationMonths ?? 1;
    return months === 1 ? 'Monthly' : `Monthly · ${months} Months`;
  }
  if (member.planType === 'sessions') {
    return `Sessions · ${member.totalSessions ?? 0} Pack`;
  }
  return 'Unknown';
};

const InfoRow = ({ icon, label, value, valueClassName }: { icon: React.ReactNode, label: string, value: string, valueClassName?: string }) => (
  <div className="flex items-start gap-3">
    <span className="text-so-muted mt-0.5 w-4 h-4 flex-shrink-0">{icon}</span>
    <div>
      <p className="text-xs text-so-muted">{label}</p>
      <p className={`text-sm mt-0.5 ${valueClassName || 'text-so-text'}`}>{value}</p>
    </div>
  </div>
)

export default function CourtMemberProfilePage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter()
  
  const [, forceUpdate] = useState(0)
  const refresh = () => forceUpdate(n => n + 1)
  
  const member = mockCourtMembers.find(m => m.id === params.id)
  
  const [activeTab, setActiveTab] = useState<'details' | 'transactions'>('details')
  const [txTab, setTxTab] = useState<'recent' | 'paid' | 'pending' | 'partial'>('recent')
  const [showRenewModal, setShowRenewModal] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [voidConfirmId, setVoidConfirmId] = useState<string | null>(null)
  const [showFilter, setShowFilter] = useState(false)
  
  const [txFilter, setTxFilter] = useState<'currentMonth' | 'lastMonth' | 'custom'>('currentMonth')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  
  const [loggedInStatus, setLoggedInStatus] = useState<boolean>(false)
  const logInTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (logInTimerRef.current) clearTimeout(logInTimerRef.current) }
  }, [])

  if (!member) {
    return (
      <div className="max-w-4xl mx-auto pb-12">
        <button onClick={() => router.push('/students')} className="flex items-center gap-2 text-so-muted hover:text-so-text mb-8">
          <ArrowLeft className="w-4 h-4" />
          <span>Members</span>
        </button>
        <div className="py-20 text-center">
          <h2 className="text-xl font-bold text-so-text">Member not found</h2>
          <p className="text-so-muted mt-2">The member may have been deleted.</p>
        </div>
      </div>
    )
  }

  const plan = mockCourtPlans.find(p => p.id === member.planId)

  // Actions
  const handleLogIn = () => {
    member.remainingSessions = (member.remainingSessions ?? 0) - 1
    member.checkInHistory.push({
      id: Date.now().toString(),
      date: format(new Date(), 'yyyy-MM-dd'),
      sessionsAfter: member.remainingSessions,
    })
    
    if (member.remainingSessions <= 0) member.status = 'exhausted'
    else if (member.remainingSessions <= 2) member.status = 'sessions-low'
    else member.status = 'active'
    
    setLoggedInStatus(true)
    if (logInTimerRef.current) clearTimeout(logInTimerRef.current)
    logInTimerRef.current = setTimeout(() => setLoggedInStatus(false), 5000)
    refresh()
  }

  const handleUndoLogIn = () => {
    const last = member.checkInHistory.at(-1)
    if (!last) return
    member.checkInHistory.pop()
    member.remainingSessions = (member.remainingSessions ?? 0) + 1
    
    if ((member.remainingSessions ?? 0) <= 2) member.status = 'sessions-low'
    else member.status = 'active'
    
    setLoggedInStatus(false)
    if (logInTimerRef.current) clearTimeout(logInTimerRef.current)
    refresh()
  }

  const handleVoidTx = (entryId: string) => {
    const entry = member.paymentHistory.find(e => e.id === entryId)
    if (entry) {
      entry.status = 'deleted'
      setVoidConfirmId(null)
      refresh()
    }
  }

  // Transactions Logic
  const computeRange = () => {
    const now = new Date()
    switch (txFilter) {
      case 'currentMonth': return { start: startOfMonth(now), end: endOfMonth(now) }
      case 'lastMonth': {
        const lm = subMonths(now, 1)
        return { start: startOfMonth(lm), end: endOfMonth(lm) }
      }
      case 'custom':
        if (!customFrom || !customTo) return { start: startOfMonth(now), end: endOfMonth(now) }
        return { start: startOfDay(parseISO(customFrom)), end: endOfDay(parseISO(customTo)) }
    }
  }
  
  const txRange = computeRange()
  const recentTx = member.paymentHistory
    .filter(t => t.status !== 'deleted' && isWithinInterval(parseISO(t.date), txRange))
    .sort((a, b) => b.date.localeCompare(a.date))
  const paidTx = recentTx.filter(t => t.status === 'active')
  const displayedTx = txTab === 'paid' ? paidTx : recentTx

  // Derived values
  const isInactive = member.status === 'inactive' || member.status === 'dropout'

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Back nav */}
      <button onClick={() => router.push('/students')} className="flex items-center gap-2 text-so-muted hover:text-so-text transition-colors mb-6 group w-fit">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium">Members</span>
      </button>

      {/* Hero */}
      <div className="bg-white border border-so-border rounded-xl p-6 shadow-sm mb-6 flex flex-col sm:flex-row justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-xl font-bold text-white uppercase shadow-sm">
            {member.name.substring(0, 2)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-so-text">{member.name}</h1>
            <p className="text-so-muted mt-0.5">{member.phone}</p>
          </div>
        </div>

        <div className="flex flex-col sm:items-end justify-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 px-3 py-1 border border-so-border rounded-md text-xs font-medium text-so-muted hover:text-so-text hover:bg-so-surface transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
              member.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
              (member.status === 'due-soon' || member.status === 'sessions-low') ? 'bg-amber-50 text-amber-700 border border-amber-200' :
              (member.status === 'expired' || member.status === 'exhausted') ? 'bg-red-50 text-red-700 border border-red-200' :
              'bg-gray-100 text-gray-700 border border-gray-200'
            }`}>
              {member.status.replace('-', ' ')}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-gray-100 border border-gray-200 text-[10px] font-bold uppercase tracking-wider text-gray-700">
              {member.planType}
            </span>
          </div>

          {!isInactive ? (
            <div className="mt-1">
              {member.planType === 'monthly' && (member.status === 'active' || member.status === 'due-soon') && (
                <button onClick={() => setShowRenewModal(true)} className="px-5 py-2 bg-so-accent text-white rounded-lg text-sm font-bold shadow-sm hover:opacity-90 transition-opacity">
                  Renew
                </button>
              )}
              {member.planType === 'monthly' && member.status === 'expired' && (
                <button onClick={() => setShowRenewModal(true)} className="px-5 py-2 bg-so-accent text-white rounded-lg text-sm font-bold shadow-sm hover:opacity-90 transition-opacity">
                  Collect Payment
                </button>
              )}
              {member.planType === 'sessions' && (member.status === 'active' || member.status === 'sessions-low') && (
                loggedInStatus ? (
                  <div className="flex items-center gap-2 text-xs bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700 font-medium">Logged in</span>
                    <div className="w-px h-3 bg-emerald-200 mx-1"></div>
                    <button onClick={handleUndoLogIn} className="text-emerald-600 hover:text-emerald-800 font-medium underline">
                      Undo
                    </button>
                  </div>
                ) : (
                  <button onClick={handleLogIn} className="px-5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors">
                    Log In
                  </button>
                )
              )}
              {member.planType === 'sessions' && member.status === 'exhausted' && (
                <button onClick={() => setShowRenewModal(true)} className="px-5 py-2 bg-so-accent text-white rounded-lg text-sm font-bold shadow-sm hover:opacity-90 transition-opacity">
                  Buy Sessions
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-so-muted italic mt-1 capitalize">Member is {member.status}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-so-border mb-6">
        {(['details', 'transactions'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? 'border-so-accent text-so-accent'
                : 'border-transparent text-so-muted hover:text-so-text'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-6">
            <h3 className="text-xs text-so-muted uppercase tracking-wider mb-4">Personal Information</h3>
            <div className="grid grid-cols-2 gap-x-12 gap-y-4">
              <InfoRow icon={<User className="w-4 h-4" />} label="Name" value={member.name} />
              <InfoRow icon={<Phone className="w-4 h-4" />} label="Mobile Number" value={member.phone} />
            </div>

            <div className="border-t border-so-border my-6"></div>

            <h3 className="text-xs text-so-muted uppercase tracking-wider mb-4 mt-6">Membership Info</h3>
            <div className="grid grid-cols-2 gap-x-12 gap-y-4">
              <InfoRow icon={<CreditCard className="w-4 h-4" />} label="Plan Type" value={member.planType === 'monthly' ? 'Monthly' : 'Sessions'} />
              <InfoRow icon={<Calendar className="w-4 h-4" />} label="Validity" value={member.planType === 'monthly' ? `${member.durationMonths ?? 1} Month(s)` : `${member.totalSessions ?? 0} Sessions`} />
              <InfoRow icon={<Calendar className="w-4 h-4" />} label="Joining Date" value={format(parseISO(member.joiningDate), 'dd MMM yyyy')} />
              <InfoRow icon={<Calendar className="w-4 h-4" />} label="Membership Start" value={member.membershipStartDate ? format(parseISO(member.membershipStartDate), 'dd MMM yyyy') : format(parseISO(member.joiningDate), 'dd MMM yyyy')} />
              {member.planType === 'sessions' && (
                <div className="flex items-start gap-3">
                  <span className="text-so-muted mt-0.5 w-4 h-4 flex-shrink-0"><Clock className="w-4 h-4" /></span>
                  <div className="w-full">
                    <p className="text-xs text-so-muted">Remaining Sessions</p>
                    <p className="text-sm font-semibold text-so-text mt-0.5 mb-1">{member.remainingSessions ?? 0}</p>
                    <div className="h-1.5 w-full max-w-48 bg-so-surface border border-so-border rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${(member.remainingSessions ?? 0) <= 2 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${Math.min(100, Math.max(0, ((member.remainingSessions ?? 0) / (member.totalSessions || 1)) * 100))}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
              {(member.pendingAmount ?? 0) > 0 && (
                <InfoRow icon={<AlertCircle className="w-4 h-4" />} label="Pending Amount" value={`₹ ${member.pendingAmount!.toLocaleString('en-IN')}`} valueClassName="text-red-600 font-semibold" />
              )}
            </div>

            {member.notes && (
              <div className="mt-6 p-3 bg-so-surface rounded-lg border border-so-border">
                <p className="text-xs text-so-muted mb-1">Internal Notes</p>
                <p className="text-sm text-so-text">{member.notes}</p>
              </div>
            )}
          </div>

          {member.planType === 'sessions' && (
            <div className="bg-white border border-so-border rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-so-border bg-so-surface/30 flex items-center gap-2">
                <Clock className="w-4 h-4 text-so-muted" />
                <h3 className="font-semibold text-so-text text-sm">Recent Check-ins</h3>
              </div>
              <div className="p-0">
                {(!member.checkInHistory || member.checkInHistory.length === 0) ? (
                  <div className="p-5">
                    <p className="text-sm text-so-muted italic">No check-ins recorded.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-so-border">
                    {[...member.checkInHistory].reverse().slice(0, 5).map(ci => (
                      <div key={ci.id} className="px-5 py-3 flex items-center justify-between hover:bg-so-surface/40 transition-colors">
                        <p className="text-sm font-medium text-so-text">{format(parseISO(ci.date), 'dd MMM yyyy')}</p>
                        <p className="text-xs text-so-muted font-medium bg-so-surface px-2 py-1 rounded border border-so-border">Sessions after: {ci.sessionsAfter}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div>
          {/* Segmented bar sub-tabs + Filter button */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1 p-1 bg-so-surface rounded-lg border border-so-border">
              {(['recent', 'paid', 'pending', 'partial'] as const).map(tab => {
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

            {(txTab === 'recent' || txTab === 'paid') && (
              <button
                onClick={() => setShowFilter(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-so-border rounded-lg text-xs text-so-muted hover:border-so-accent hover:text-so-text transition-colors"
              >
                <SlidersHorizontal className="w-3 h-3" />
                Filter
                {txFilter !== 'currentMonth' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-so-accent" />
                )}
              </button>
            )}
          </div>

          {(txTab === 'recent' || txTab === 'paid') && (
            <div className="bg-so-card border border-so-border rounded-xl shadow-sm overflow-hidden min-h-[300px]">
              {displayedTx.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-so-muted mb-4" strokeWidth={1.5} />
                  <p className="text-so-text font-semibold">No transactions in this period</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-so-surface border-b border-so-border">
                        <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Date</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Amount</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Method</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Type</th>
                        <th className="text-right px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-so-border">
                      {displayedTx.map(t => (
                        <tr key={t.id} className="bg-so-card hover:bg-so-surface/60 border-b border-so-border transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-so-text">{format(parseISO(t.date), 'dd MMM yyyy')}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`font-semibold ${t.status === 'deleted' ? 'text-so-muted line-through' : 'text-so-emerald'}`}>
                              ₹ {t.amount.toLocaleString('en-IN')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-so-muted capitalize">{t.paymentMethod}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-[10px] font-bold uppercase text-gray-700">
                              {t.entryType === 'new' ? 'NEW' : t.entryType === 'renewal' ? 'RENEWAL' : 'TOP-UP'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {t.status !== 'deleted' ? (
                              voidConfirmId === t.id ? (
                                <div className="flex items-center justify-end gap-2">
                                  <span className="text-xs text-so-muted">Void this?</span>
                                  <button onClick={() => handleVoidTx(t.id)} className="text-xs px-2 py-1 bg-so-red text-white rounded-md hover:bg-red-600 transition-colors">Yes</button>
                                  <button onClick={() => setVoidConfirmId(null)} className="text-xs px-2 py-1 border border-so-border rounded-md text-so-muted hover:text-so-text transition-colors">No</button>
                                </div>
                              ) : (
                                <button onClick={() => setVoidConfirmId(t.id)} className="p-1.5 inline-flex rounded-md text-so-muted hover:text-so-red hover:bg-so-surface transition-colors" title="Void Payment">
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
            <div className="bg-white border border-so-border rounded-xl shadow-sm overflow-hidden min-h-[300px]">
              {(member.status !== 'expired' && member.status !== 'due-soon' && member.status !== 'exhausted') ? (
                <div className="py-20 flex flex-col items-center justify-center">
                  <p className="text-so-muted text-sm italic">No pending payments.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-so-surface border-b border-so-border">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">Plan Details</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">Amount Due</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-so-border">
                      <tr className="hover:bg-so-surface/40 transition-colors">
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="font-medium text-so-text">{getPlanDisplay(member)}</span>
                          <span className="text-red-500/80 ml-2">({member.status})</span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap font-bold text-red-600">
                          ₹ {(member.pendingAmount || plan?.price || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-right">
                          <button onClick={() => setShowRenewModal(true)} className="px-4 py-2 bg-so-accent text-white rounded-lg text-sm font-bold shadow-sm hover:opacity-90 transition-opacity">
                            Renew
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {txTab === 'partial' && (
            <div className="bg-white border border-so-border rounded-xl shadow-sm overflow-hidden min-h-[300px]">
              {!(member.pendingAmount && member.pendingAmount > 0) ? (
                <div className="py-20 flex flex-col items-center justify-center">
                  <p className="text-so-muted text-sm italic">No partial payments.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-so-surface border-b border-so-border">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">Outstanding</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-so-border">
                      <tr className="hover:bg-so-surface/40 transition-colors">
                        <td className="px-5 py-3 whitespace-nowrap font-bold text-red-600">
                          ₹ {member.pendingAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-right">
                          <button onClick={() => setShowRenewModal(true)} className="px-4 py-2 bg-so-accent text-white rounded-lg text-sm font-bold shadow-sm hover:opacity-90 transition-opacity">
                            Collect
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
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
                    txFilter === opt.value ? 'border-so-accent' : 'border-so-border'
                  }`}>
                    {txFilter === opt.value && <div className="w-2 h-2 rounded-full bg-so-accent" />}
                  </div>
                  <span className={`text-sm transition-colors ${txFilter === opt.value ? 'text-so-text' : 'text-so-muted group-hover:text-so-text'}`}>
                    {opt.label}
                  </span>
                  <input
                    type="radio"
                    className="sr-only"
                    checked={txFilter === opt.value}
                    onChange={() => setTxFilter(opt.value as typeof txFilter)}
                  />
                </label>
              ))}
              
              {txFilter === 'custom' && (
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
                onClick={() => { setTxFilter('currentMonth'); setCustomFrom(''); setCustomTo('') }}
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

      {showRenewModal && (
        <RenewCourtMemberModal
          member={member}
          onClose={() => setShowRenewModal(false)}
          onSuccess={() => { setShowRenewModal(false); refresh(); }}
        />
      )}

      {showEdit && (
        <EditCourtMemberModal
          member={member}
          onClose={() => setShowEdit(false)}
          onSuccess={() => {
            setShowEdit(false);
            refresh();
          }}
        />
      )}
    </div>
  )
}
