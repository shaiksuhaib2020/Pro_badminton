'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Users, BadgeCheck, MoreVertical, CheckCircle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import Link from 'next/link'
import { 
  mockSettings,
  mockCourtPlans,
  mockCourtMemberships, 
  CourtMembership,
  getMembershipDisplayLabel,
  getMembershipPeopleCount
} from '@/lib/mock-data'
import AddCourtMembershipModal from '@/components/court/AddCourtMembershipModal'
import EditCourtMembershipModal from '@/components/court/EditCourtMembershipModal'

export default function CourtMembershipsPage() {
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<'active' | 'inactive' | 'dropout'>('active')
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState<'all' | 'monthly' | 'sessions'>('all')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [checkInTargetId, setCheckInTargetId] = useState<string | null>(null)
  const [undoTargetId, setUndoTargetId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingMembership, setEditingMembership] = useState<CourtMembership | null>(null)
  const [, forceUpdate] = useState(0)

  if (!mockSettings.courtMembershipEnabled) {
    return (
      <div className="max-w-7xl mx-auto pb-12 flex items-center justify-center min-h-[60vh]">
        <div className="bg-white border border-so-border rounded-xl p-8 max-w-md w-full text-center shadow-sm">
          <BadgeCheck className="w-12 h-12 text-so-muted mx-auto mb-4" strokeWidth={1.5} />
          <h2 className="text-xl font-bold text-so-text mb-2">Court Memberships Disabled</h2>
          <p className="text-so-muted mb-6">Court memberships are disabled. Go to Settings → Academy & Branding to enable them.</p>
          <Link 
            href="/settings"
            className="inline-flex items-center justify-center px-4 py-2 bg-so-accent text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Go to Settings
          </Link>
        </div>
      </div>
    )
  }

  const displayLabel = (m: CourtMembership) => getMembershipDisplayLabel(m)

  // Stats
  const activeCount = mockCourtMemberships.filter(m => ['active', 'due-soon'].includes(m.status)).length
  const activePeopleCount = mockCourtMemberships.filter(m => ['active', 'due-soon'].includes(m.status)).reduce((acc, m) => acc + getMembershipPeopleCount(m), 0)
  const dueLowCount = mockCourtMemberships.filter(m => ['sessions-low', 'due-soon'].includes(m.status)).length
  const expiredExhaustedCount = mockCourtMemberships.filter(m => ['expired', 'exhausted'].includes(m.status)).length
  const dropoutCount = mockCourtMemberships.filter(m => m.status === 'dropout').length

  // Tab filter
  const tabFiltered = mockCourtMemberships.filter(m => {
    if (activeTab === 'active') return ['active','due-soon','expired','sessions-low','exhausted'].includes(m.status)
    if (activeTab === 'inactive') return m.status === 'inactive'
    return m.status === 'dropout'
  })

  // Search
  const searched = tabFiltered.filter(m =>
    !search ||
    displayLabel(m).toLowerCase().includes(search.toLowerCase()) ||
    m.contactName.toLowerCase().includes(search.toLowerCase()) ||
    m.contactPhone.includes(search) ||
    m.people.some(p => p.name.toLowerCase().includes(search.toLowerCase()))
  )

  // Plan filter
  const finalList = planFilter === 'all' ? searched :
    searched.filter(m => m.planType === planFilter)

  const refresh = () => forceUpdate(n => n + 1)

  const handleAction = (membershipId: string, action: string) => {
    const membership = mockCourtMemberships.find(m => m.id === membershipId)
    if (!membership) return

    if (action === 'inactive') {
      membership.status = 'inactive'
    } else if (action === 'dropout') {
      membership.status = 'dropout'
    } else if (action === 'active') {
      membership.status = 'active'
    } else if (action === 'delete') {
      const idx = mockCourtMemberships.findIndex(m => m.id === membershipId)
      if (idx !== -1) mockCourtMemberships.splice(idx, 1)
    }
    
    setOpenMenuId(null)
    refresh()
  }

  const confirmCheckIn = (m: CourtMembership) => {
    m.remainingSessions = (m.remainingSessions ?? 0) - 1
    m.checkInHistory.push({
      id: crypto.randomUUID(),
      membershipId: m.id,
      checkedInAt: new Date().toISOString(),
      sessionsAfter: m.remainingSessions,
      peopleCheckedIn: getMembershipPeopleCount(m)
    })
    
    if (m.remainingSessions <= 0) m.status = 'exhausted'
    else if (m.remainingSessions <= 2) m.status = 'sessions-low'
    else m.status = 'active'

    setCheckInTargetId(null)
    setUndoTargetId(m.id)
    refresh()

    setTimeout(() => {
      setUndoTargetId(current => current === m.id ? null : current)
    }, 5000)
  }

  const handleUndoCheckIn = (m: CourtMembership) => {
    m.remainingSessions = (m.remainingSessions ?? 0) + 1
    m.checkInHistory.pop()
    
    if (m.remainingSessions <= 0) m.status = 'exhausted'
    else if (m.remainingSessions <= 2) m.status = 'sessions-low'
    else m.status = 'active'

    setUndoTargetId(null)
    refresh()
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-so-text">Court Memberships</h1>
          <p className="text-so-muted text-sm mt-0.5">Manage group bookings and session packs</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-so-accent text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Membership
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-so-border shadow-sm">
          <p className="text-xs font-semibold text-so-muted uppercase tracking-wider mb-1">Active Memberships</p>
          <p className="text-2xl font-bold text-so-text">{activeCount}</p>
          <p className="text-xs text-so-muted mt-1">{activePeopleCount} people covered</p>
        </div>
        <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 shadow-sm">
          <p className="text-xs font-semibold text-amber-600/80 uppercase tracking-wider mb-1">Sessions Low / Due Soon</p>
          <p className="text-2xl font-bold text-amber-700">{dueLowCount}</p>
        </div>
        <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 shadow-sm">
          <p className="text-xs font-semibold text-red-600/80 uppercase tracking-wider mb-1">Expired / Exhausted</p>
          <p className="text-2xl font-bold text-red-700">{expiredExhaustedCount}</p>
        </div>
        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-600/80 uppercase tracking-wider mb-1">Dropout</p>
          <p className="text-2xl font-bold text-slate-700">{dropoutCount}</p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-so-muted" />
        <input
          type="text"
          placeholder="Search by name, phone, or member name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white border border-so-border rounded-lg pl-9 pr-4 py-2 text-sm text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-accent"
        />
      </div>

      <div className="flex items-center justify-between border-b border-so-border pb-4 mb-6">
        <div className="flex gap-1 border-b border-so-border">
          {(['active', 'inactive', 'dropout'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setPlanFilter('all') }}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeTab === tab
                  ? 'border-so-accent text-so-accent'
                  : 'border-transparent text-so-muted hover:text-so-text'
              }`}
            >
              {tab.replace('-', ' ')}
            </button>
          ))}
        </div>
        
        {activeTab === 'active' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-so-muted font-medium">Plan:</span>
            {(['all', 'monthly', 'sessions'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setPlanFilter(filter)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors capitalize ${
                  planFilter === filter
                    ? 'bg-so-surface border border-so-border text-so-text shadow-sm'
                    : 'text-so-muted border border-transparent hover:bg-so-surface/50'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-so-border rounded-xl shadow-sm overflow-visible min-h-[400px]">
        {finalList.length === 0 ? (
          <div className="py-20 text-center">
            <BadgeCheck className="w-12 h-12 text-so-muted mx-auto mb-4" strokeWidth={1.5} />
            <p className="text-so-muted font-medium">No memberships found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-so-surface border-b border-so-border">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">Membership</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">People</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">Plan</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">Validity</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-so-border">
                {finalList.map(m => {
                  const planName = mockCourtPlans.find(p => p.id === m.planId)?.name ?? '—'
                  return (
                    <tr 
                      key={m.id} 
                      className="hover:bg-so-surface/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/court-memberships/${m.id}`)}
                    >
                      <td className="px-5 py-3 align-top">
                        <p className="font-medium text-so-text">{displayLabel(m)}</p>
                        <p className="text-xs text-so-muted mt-0.5">{m.contactPhone}</p>
                      </td>
                      <td className="px-5 py-3 align-top">
                        <div className="group relative inline-flex items-center gap-1.5 px-2.5 py-1 bg-so-surface border border-so-border rounded-full">
                          <Users size={14} className="text-so-muted" />
                          <span className="text-xs font-medium text-so-text">{getMembershipPeopleCount(m)}</span>
                          {m.people.length > 0 && (
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50">
                              <div className="bg-so-card border border-so-border rounded-lg shadow-sm px-3 py-2 text-xs text-so-text whitespace-nowrap">
                                {m.people.map(p => <div key={p.id}>{p.name}</div>)}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 align-top text-so-text font-medium">{planName}</td>
                      <td className="px-5 py-3 align-top">
                        {m.planType === 'monthly' ? (
                          <span className={`text-sm font-medium ${
                            m.status === 'expired' ? 'text-so-red' : 'text-[#5278EA]'
                          }`}>
                            {m.endDate ? format(parseISO(m.endDate), 'dd/MM/yyyy') : '—'}
                          </span>
                        ) : (
                          <span className={`text-sm font-medium ${
                            m.remainingSessions === 0 ? 'text-so-red' : 
                            (m.remainingSessions ?? 0) <= 2 ? 'text-amber-600' : 'text-so-text'
                          }`}>
                            {m.remainingSessions} sessions left
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 align-top">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                          m.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          m.status === 'due-soon' || m.status === 'sessions-low' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          m.status === 'expired' || m.status === 'exhausted' ? 'bg-red-50 text-red-700 border-red-200' :
                          m.status === 'inactive' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>
                          {m.status.replace('-', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3 align-top text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2 relative">
                          {activeTab === 'active' && m.planType === 'sessions' && ['active', 'sessions-low'].includes(m.status) && (
                            <>
                              {undoTargetId === m.id ? (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-emerald-700 font-medium">Checked in.</span>
                                  <button onClick={() => handleUndoCheckIn(m)} className="text-emerald-600 hover:text-emerald-800 font-semibold underline">Undo</button>
                                </div>
                              ) : checkInTargetId === m.id ? (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-so-surface border border-so-border rounded-lg text-xs">
                                  <span className="text-so-text font-medium">Log 1 session for {displayLabel(m)} ({getMembershipPeopleCount(m)} people)?</span>
                                  <button onClick={() => confirmCheckIn(m)} className="text-so-accent hover:underline font-bold">Confirm</button>
                                  <span className="text-so-muted">|</span>
                                  <button onClick={() => setCheckInTargetId(null)} className="text-so-muted hover:text-so-text">Cancel</button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => setCheckInTargetId(m.id)}
                                  className="px-3 py-1.5 text-xs font-semibold text-so-text bg-white border border-so-border rounded-lg hover:border-so-accent hover:text-so-accent transition-colors"
                                >
                                  Check In
                                </button>
                              )}
                            </>
                          )}

                          <div className="relative">
                            <button onClick={() => setOpenMenuId(openMenuId === m.id ? null : m.id)} className="p-1.5 text-so-muted hover:text-so-text hover:bg-so-surface rounded-md">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {openMenuId === m.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)}></div>
                                <div className="absolute right-0 mt-1 w-36 bg-white border border-so-border rounded-lg shadow-lg z-20 py-1">
                                  <button onClick={() => { setEditingMembership(m); setOpenMenuId(null) }} className="w-full text-left px-4 py-2 text-xs font-medium text-so-text hover:bg-so-surface">Edit</button>
                                  {['active', 'due-soon', 'expired', 'exhausted'].includes(m.status) && activeTab === 'active' && (
                                    <button onClick={() => { /* Open Renew Modal - handled elsewhere typically, but step F implies we need to update existing ones. We can just route to profile or open modal */ setOpenMenuId(null) }} className="w-full text-left px-4 py-2 text-xs font-medium text-so-text hover:bg-so-surface">Renew</button>
                                  )}
                                  {activeTab === 'active' && (
                                    <>
                                      <button onClick={() => handleAction(m.id, 'inactive')} className="w-full text-left px-4 py-2 text-xs font-medium text-so-text hover:bg-so-surface">Move to Inactive</button>
                                      <button onClick={() => handleAction(m.id, 'dropout')} className="w-full text-left px-4 py-2 text-xs font-medium text-so-text hover:bg-so-surface">Move to Dropout</button>
                                    </>
                                  )}
                                  {activeTab === 'inactive' && (
                                    <>
                                      <button onClick={() => handleAction(m.id, 'active')} className="w-full text-left px-4 py-2 text-xs font-medium text-so-text hover:bg-so-surface">Reactivate</button>
                                      <button onClick={() => handleAction(m.id, 'dropout')} className="w-full text-left px-4 py-2 text-xs font-medium text-so-text hover:bg-so-surface">Move to Dropout</button>
                                    </>
                                  )}
                                  {activeTab === 'dropout' && (
                                    <button onClick={() => { /* Re-enroll logic */ handleAction(m.id, 'active') }} className="w-full text-left px-4 py-2 text-xs font-medium text-so-text hover:bg-so-surface">Re-enroll</button>
                                  )}
                                  <div className="border-t border-so-border my-1"></div>
                                  <button onClick={() => { if (confirm("Permanently delete this membership?")) handleAction(m.id, 'delete') }} className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50">Delete Permanently</button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddCourtMembershipModal onClose={() => setShowAddModal(false)} onSuccess={refresh} />
      )}
      {editingMembership && (
        <EditCourtMembershipModal membership={editingMembership} onClose={() => setEditingMembership(null)} onSave={refresh} />
      )}
    </div>
  )
}
