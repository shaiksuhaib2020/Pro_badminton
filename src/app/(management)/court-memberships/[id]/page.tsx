'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, UserPlus, Pencil, RefreshCw, HandCoins, UserX, X, History, Plus, Receipt, Wallet, Trash2, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { format, parseISO } from 'date-fns'

import { mockCourtMemberships, mockSettings, mockCourtPlans, CourtPaymentEntry, CourtMembership, getMembershipDisplayLabel, getMembershipPeopleCount } from '@/lib/mock-data'
import EditCourtMembershipModal from '@/components/court/EditCourtMembershipModal'
import BuySessionsModal from '@/components/court/BuySessionsModal'
import RenewCourtMembershipModal from '@/components/court/RenewCourtMembershipModal'
import CollectCourtPaymentModal from '@/components/court/CollectCourtPaymentModal'

export default function CourtMembershipProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const membershipId = resolvedParams.id
  
  const [activeTab, setActiveTab] = useState<'details' | 'transactions' | 'checkins'>('details')
  const [txnTab, setTxnTab] = useState<'recent' | 'paid' | 'pending' | 'partial'>('recent')
  
  const [showEdit, setShowEdit] = useState(false)
  const [showRenew, setShowRenew] = useState(false)
  const [showBuySessions, setShowBuySessions] = useState(false)
  const [showCollect, setShowCollect] = useState(false)
  
  const [, forceUpdate] = useState(0)
  const refresh = () => forceUpdate(n => n + 1)

  const membership = mockCourtMemberships.find(m => m.id === membershipId)

  if (!membership) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-so-muted">Membership not found.</p>
        <button onClick={() => router.back()} className="mt-4 text-so-accent hover:underline">Go back</button>
      </div>
    )
  }

  const label = getMembershipDisplayLabel(membership)
  const planName = mockCourtPlans.find(p => p.id === membership.planId)?.name ?? '—'
  const plan = mockCourtPlans.find(p => p.id === membership.planId)
  const totalDue = membership.pendingAmount > 0 ? membership.pendingAmount : ((membership.planType === 'monthly' && (membership.status === 'expired' || membership.status === 'due-soon')) || (membership.planType === 'sessions' && membership.status === 'exhausted') ? (plan?.price ?? 0) : 0)
  const totalCollected = membership.amountPaid
  
  const isPending = (membership.planType === 'monthly' && (membership.status === 'expired' || membership.status === 'due-soon')) || (membership.planType === 'sessions' && membership.status === 'exhausted')
  const isPartial = membership.pendingAmount > 0
  
  const formatDateLabel = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd MMM yyyy')
    } catch {
      return dateStr
    }
  }
  
  const getDaysLabel = (m: CourtMembership) => {
    if (m.planType === 'sessions') return `${m.remainingSessions} sessions left`
    if (!m.endDate) return 'No end date'
    const today = new Date()
    const due = parseISO(m.endDate)
    const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return `${Math.abs(diff)} day${Math.abs(diff) !== 1 ? 's' : ''} overdue`
    if (diff === 0) return 'Due today'
    return `${diff} day${diff !== 1 ? 's' : ''} remaining`
  }

  const handleVoidTxn = (txnId: string) => {
    if (!confirm("Are you sure you want to void this transaction? This cannot be undone.")) return
    const txn = membership.paymentHistory.find(t => t.id === txnId)
    if (!txn) return
    txn.status = 'deleted'
    // Refund the amount back to pending
    membership.pendingAmount += txn.amount
    refresh()
  }

  const sortedTxns = [...membership.paymentHistory]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const filteredTxns = sortedTxns.filter(t => {
    if (txnTab === 'recent') return true
    if (txnTab === 'paid') return t.status === 'active' && t.amount > 0
    if (txnTab === 'pending') return false // pending handled differently, or just show nothing if no pending specific txns.
    if (txnTab === 'partial') return false // partial handled differently
    return true
  })
  
  // Actually the Transactions tab in student profile has custom logic.
  // Court just uses regular paymentHistory list with void action.

  const sortedCheckIns = [...membership.checkInHistory]
    .sort((a, b) => new Date(b.checkedInAt).getTime() - new Date(a.checkedInAt).getTime())

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <button 
        onClick={() => router.push('/court-memberships')}
        className="flex items-center gap-2 text-sm font-medium text-so-muted hover:text-so-text transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to list
      </button>

      {/* Header Card */}
      <div className="bg-white border border-so-border rounded-xl shadow-sm overflow-hidden mb-6 relative">
        <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-start justify-between gap-6">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-full bg-so-surface border border-so-border flex items-center justify-center text-xl font-bold text-so-muted uppercase shrink-0">
              {label.substring(0,2)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-so-text leading-tight">{label}</h1>
              <p className="text-sm text-so-muted mt-1 font-medium">{membership.contactPhone} • {getMembershipPeopleCount(membership)} people</p>
              
              {membership.people.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {membership.people.map(p => (
                    <span key={p.id} className="text-xs bg-so-surface border border-so-border rounded-full px-2 py-0.5 text-so-muted font-medium">
                      {p.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-4 w-full sm:w-auto">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border ${
              membership.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              membership.status === 'due-soon' || membership.status === 'sessions-low' ? 'bg-amber-50 text-amber-700 border-amber-200' :
              membership.status === 'expired' || membership.status === 'exhausted' ? 'bg-red-50 text-red-700 border-red-200' :
              membership.status === 'inactive' ? 'bg-blue-50 text-blue-700 border-blue-200' :
              'bg-slate-50 text-slate-700 border-slate-200'
            }`}>
              {membership.status.replace('-', ' ')}
            </span>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {membership.pendingAmount > 0 && (
                <button onClick={() => setShowCollect(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-white border border-so-accent text-so-accent rounded-lg text-sm font-semibold hover:bg-so-surface transition-colors">
                  <HandCoins className="w-4 h-4" />
                  Collect ₹{membership.pendingAmount}
                </button>
              )}
              {['active', 'due-soon', 'expired', 'exhausted'].includes(membership.status) && (
                membership.planType === 'sessions' ? (
                  <button onClick={() => setShowBuySessions(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-so-accent text-white rounded-lg text-sm font-semibold hover:bg-so-accent-hover transition-colors shadow-sm">
                    <Plus className="w-4 h-4" />
                    Buy Sessions
                  </button>
                ) : (
                  <button onClick={() => setShowRenew(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-so-accent text-white rounded-lg text-sm font-semibold hover:bg-so-accent-hover transition-colors shadow-sm">
                    <RefreshCw className="w-4 h-4" />
                    Renew
                  </button>
                )
              )}
              <button onClick={() => setShowEdit(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-white border border-so-border text-so-text rounded-lg text-sm font-semibold hover:border-so-accent hover:text-so-accent transition-colors shadow-sm">
                <Pencil className="w-4 h-4" />
                Edit
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-so-border mb-6">
        {(['details', 'transactions', 'checkins'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? 'border-so-accent text-so-accent'
                : 'border-transparent text-so-muted hover:text-so-text'
            }`}
          >
            {tab === 'checkins' ? 'Check-ins' : tab}
          </button>
        ))}
      </div>

      {activeTab === 'details' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-so-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-so-text uppercase tracking-wider mb-2">Membership Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-so-muted font-medium mb-0.5">Contact Name</p>
                <p className="text-sm font-semibold text-so-text">{membership.contactName}</p>
              </div>
              <div>
                <p className="text-xs text-so-muted font-medium mb-0.5">Contact Phone</p>
                <p className="text-sm font-semibold text-so-text">{membership.contactPhone}</p>
              </div>

            </div>
          </div>
          
          <div className="bg-white border border-so-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-so-text uppercase tracking-wider mb-2">Plan Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <p className="text-xs text-so-muted font-medium mb-0.5">Plan Name</p>
                <p className="text-sm font-semibold text-so-text">{planName}</p>
              </div>
              <div>
                <p className="text-xs text-so-muted font-medium mb-0.5">Type</p>
                <p className="text-sm font-semibold text-so-text capitalize">{membership.planType}</p>
              </div>
              {membership.planType === 'monthly' ? (
                <>
                  <div>
                    <p className="text-xs text-so-muted font-medium mb-0.5">Start Date</p>
                    <p className="text-sm font-semibold text-so-text">{membership.startDate ? format(parseISO(membership.startDate), 'dd MMM yyyy') : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-so-muted font-medium mb-0.5">End Date</p>
                    <p className={`text-sm font-semibold ${membership.status === 'expired' ? 'text-so-red' : 'text-so-text'}`}>
                      {membership.endDate ? format(parseISO(membership.endDate), 'dd MMM yyyy') : '—'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-xs text-so-muted font-medium mb-0.5">Total Sessions</p>
                    <p className="text-sm font-semibold text-so-text">{membership.totalSessions}</p>
                  </div>
                  <div>
                    <p className="text-xs text-so-muted font-medium mb-0.5">Remaining</p>
                    <p className={`text-sm font-semibold ${membership.remainingSessions === 0 ? 'text-so-red' : (membership.remainingSessions ?? 0) <= 2 ? 'text-amber-600' : 'text-so-text'}`}>
                      {membership.remainingSessions}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {membership.notes && (
            <div className="col-span-1 md:col-span-2 bg-amber-50 border border-amber-100 rounded-xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">Notes</h3>
              <p className="text-sm text-amber-900">{membership.notes}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'transactions' && (
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
              <span className="text-so-muted text-xs uppercase tracking-wider font-semibold">Plan</span>
              <div className="text-2xl font-bold mt-2 text-so-text capitalize">
                {planName}
              </div>
            </div>
          </div>

          {/* Transaction section */}
          <div className="flex items-center justify-between mt-6 mb-4">
            <div className="flex gap-1 p-1 bg-so-surface rounded-lg border border-so-border">
              {(['recent', 'paid', 'pending', 'partial'] as const).map(tab => {
                const labels = { recent: 'Recent', paid: 'Paid', pending: 'Pending', partial: 'Partially Paid' }
                return (
                  <button key={tab} onClick={() => setTxnTab(tab)}
                    className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      txnTab === tab
                        ? 'bg-so-accent text-white shadow-sm'
                        : 'text-so-muted hover:text-so-text hover:bg-so-surface/80'
                    }`}
                  >
                    {labels[tab]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* TX Tabs Content */}
          <div className="bg-so-card border border-so-border rounded-xl shadow-sm overflow-hidden min-h-[300px]">
            {txnTab === 'recent' && (
              <div>
                {filteredTxns.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center">
                    <Receipt className="w-12 h-12 text-so-muted mb-4" strokeWidth={1.5} />
                    <p className="text-so-text font-semibold">No transactions found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-so-surface border-b border-so-border">
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Date</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Type</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Amount</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Method</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-so-border">
                        {filteredTxns.map(t => (
                          <tr key={t.id} className="bg-so-card hover:bg-so-surface/60 border-b border-so-border transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-so-text">{formatDateLabel(t.date)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-so-text capitalize">{t.entryType.replace('-', ' ')}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`font-semibold ${t.status === 'deleted' ? 'text-so-muted line-through' : 'text-so-emerald'}`}>
                                ₹ {t.amount.toLocaleString('en-IN')}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-so-muted capitalize">{t.paymentMethod}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {txnTab === 'paid' && (
              <div>
                <div className="px-6 py-3 border-b border-so-border bg-so-surface flex items-center gap-4 text-sm text-so-muted">
                  <span>{filteredTxns.length} transactions</span>
                  <span>•</span>
                  <span className="text-so-emerald font-medium">
                    ₹ {filteredTxns.reduce((s, t) => s + t.amount, 0).toLocaleString('en-IN')} collected
                  </span>
                </div>
                {filteredTxns.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center">
                    <CheckCircle className="w-12 h-12 text-so-muted mb-4" strokeWidth={1.5} />
                    <p className="text-so-text font-semibold">No paid transactions</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-so-surface border-b border-so-border">
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Date</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Amount</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Mode</th>
                          <th className="text-right px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-so-border">
                        {filteredTxns.map(t => (
                          <tr key={t.id} className="bg-so-card hover:bg-so-surface/60 border-b border-so-border transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-so-text">{formatDateLabel(t.date)}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-semibold text-so-emerald">
                                ₹ {t.amount.toLocaleString('en-IN')}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-so-muted capitalize">{t.paymentMethod}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <button onClick={() => handleVoidTxn(t.id)}
                                className="p-1.5 inline-flex rounded-md text-so-muted hover:text-so-red hover:bg-so-surface transition-colors" title="Void Payment">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {txnTab === 'pending' && (
              <div>
                {!isPending ? (
                  <div className="py-20 flex flex-col items-center justify-center">
                    <CheckCircle className="w-12 h-12 text-so-emerald mb-4" strokeWidth={1.5} />
                    <p className="text-so-text font-semibold">No pending payments — member is up to date</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-so-surface border-b border-so-border">
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Member</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Phone</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Due Date</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Amount</th>
                          <th className="text-right px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-so-border">
                        <tr className="bg-so-card hover:bg-so-surface/60 border-b border-so-border transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-so-text">{label}</span>
                              {membership.status === 'expired' || membership.status === 'exhausted' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
                                  <AlertCircle className="w-3 h-3" />
                                  Overdue
                                </span>
                              ) : membership.status === 'due-soon' || membership.status === 'sessions-low' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200">
                                  <Clock className="w-3 h-3" />
                                  Due Soon
                                </span>
                              ) : null}
                            </div>
                            <p className={`text-xs mt-0.5 font-medium ${
                              membership.status === 'expired' || membership.status === 'exhausted' ? 'text-red-500' : 'text-amber-500'
                            }`}>
                              {getDaysLabel(membership)}
                            </p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-so-muted">
                            {membership.contactPhone}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap font-medium ${membership.status === 'expired' ? 'text-so-red' : 'text-so-yellow'}`}>
                            {membership.endDate ? formatDateLabel(membership.endDate) : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-so-emerald font-semibold">
                            ₹ {plan?.price?.toLocaleString('en-IN') ?? 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex justify-end">
                              {membership.planType === 'sessions' ? (
                                <button onClick={() => setShowBuySessions(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-so-accent text-white rounded-md text-xs font-medium hover:opacity-90 transition-opacity">
                                  <Plus className="w-3 h-3" /> Buy Sessions
                                </button>
                              ) : (
                                <button onClick={() => setShowRenew(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-so-accent text-white rounded-md text-xs font-medium hover:opacity-90 transition-opacity">
                                  <RefreshCw className="w-3 h-3" /> Renew
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {txnTab === 'partial' && (
              <div>
                {!isPartial ? (
                  <div className="py-20 flex flex-col items-center justify-center">
                    <CheckCircle className="w-12 h-12 text-so-emerald mb-4" strokeWidth={1.5} />
                    <p className="text-so-text font-semibold">No partial payments outstanding</p>
                  </div>
                ) : (
                  (() => {
                    const latestPartial = membership.paymentHistory
                      .filter(p => p.status !== 'deleted')
                      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())[0]

                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-so-surface border-b border-so-border">
                              <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Member</th>
                              <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Phone</th>
                              <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Date</th>
                              <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Paid</th>
                              <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Remaining</th>
                              <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Mode</th>
                              <th className="text-right px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-so-border">
                            <tr className="bg-so-card hover:bg-so-surface/60 border-b border-so-border transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-so-text font-medium">{label}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-so-muted">{membership.contactPhone}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-so-text">
                                {latestPartial ? formatDateLabel(latestPartial.date) : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-so-emerald font-semibold">
                                {latestPartial ? `₹ ${membership.amountPaid.toLocaleString('en-IN')}` : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-amber-600 font-semibold">
                                ₹ {membership.pendingAmount.toLocaleString('en-IN')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-so-muted capitalize">
                                {latestPartial?.paymentMethod || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <div className="flex justify-end">
                                  <button
                                    onClick={() => setShowCollect(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 border border-amber-500/30 rounded-md text-xs font-medium hover:bg-amber-500/30 transition-colors"
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

      {activeTab === 'checkins' && (
        <div className="bg-white border border-so-border rounded-xl shadow-sm overflow-hidden">
          {sortedCheckIns.length === 0 ? (
            <div className="py-16 text-center text-so-muted">No check-ins logged yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-so-surface border-b border-so-border">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">Date & Time</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">People Checked In</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">Sessions After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-so-border">
                  {sortedCheckIns.map(chk => (
                    <tr key={chk.id} className="hover:bg-so-surface/50">
                      <td className="px-5 py-3 font-medium text-so-text">{format(new Date(chk.checkedInAt), 'dd MMM yyyy, hh:mm a')}</td>
                      <td className="px-5 py-3 text-so-text">{chk.peopleCheckedIn} people</td>
                      <td className="px-5 py-3 text-right font-medium text-so-muted">{chk.sessionsAfter ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showEdit && <EditCourtMembershipModal membership={membership} onClose={() => setShowEdit(false)} onSave={refresh} />}
      {showRenew && <RenewCourtMembershipModal membership={membership} onClose={() => setShowRenew(false)} onSuccess={refresh} />}
      {showBuySessions && <BuySessionsModal membership={membership} onClose={() => setShowBuySessions(false)} onSuccess={refresh} />}
      {showCollect && <CollectCourtPaymentModal membership={membership} onClose={() => setShowCollect(false)} onSuccess={refresh} />}

    </div>
  )
}
