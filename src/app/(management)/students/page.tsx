'use client'

import { format, parseISO, addMonths } from 'date-fns'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { mockStudents, mockSettings, mockCourtMembers, mockCourtPlans, Student, CourtMember } from '@/lib/mock-data'
import { Search, UserPlus, Pencil, DoorOpen, Trash2, RefreshCw, CheckCircle, MoreVertical, X } from 'lucide-react'
import EditCourtMemberModal from '@/components/court/EditCourtMemberModal'

import AddStudentModal from '@/components/students/AddStudentModal'
import AddMemberModal from '@/components/court/AddMemberModal'
import EditStudentModal from '@/components/students/EditStudentModal'
import ReEnrollModal from '@/components/students/ReEnrollModal'

type TabType = 'active' | 'inactive' | 'dropout'
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
export default function StudentsPage() {
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const router = useRouter()

  const [memberSegment, setMemberSegment] = useState<'coaching' | 'court'>('coaching')
  const [courtFilter, setCourtFilter] = useState<'all' | 'monthly' | 'sessions'>('all')
  const [courtTab, setCourtTab] = useState<'active' | 'inactive' | 'dropout'>('active')
  const [courtSearchQuery, setCourtSearchQuery] = useState('')
  const [showAddCourtModal, setShowAddCourtModal] = useState(false)
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null)
  const [logMenuId, setLogMenuId] = useState<string | null>(null)
  const [editingCourtMember, setEditingCourtMember] = useState<CourtMember | null>(null)
  const [toastMessage, setToastMessage] = useState<{type: 'error' | 'success', message: string} | null>(null)

  const showToast = (type: 'error' | 'success', message: string) => {
    setToastMessage({ type, message })
    setTimeout(() => setToastMessage(null), 3000)
  }

  
  // existing coaching state
  const [activeTab, setActiveTab] = useState<TabType>('active')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeBatchFilter, setActiveBatchFilter] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Student | null>(null)
  const [reEnrollTarget, setReEnrollTarget] = useState<Student | null>(null)
  
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleteHasDues, setDeleteHasDues] = useState(false)
  
  const [, forceUpdate] = useState(0)
  const refresh = () => forceUpdate(n => n + 1)


  const [loggedInMemberId, setLoggedInMemberId] = useState<string | null>(null);
  const logInTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (logInTimerRef.current) clearTimeout(logInTimerRef.current); };
  }, []);

  const handleUndoLogIn = (member: CourtMember) => {
    const last = member.checkInHistory.at(-1);
    if (!last) return;
    member.checkInHistory.pop();
    member.remainingSessions = (member.remainingSessions ?? 0) + 1;
    // Recalculate status after restore
    if (member.remainingSessions <= 2) member.status = 'sessions-low';
    else member.status = 'active';
    setLoggedInMemberId(null);
    if (logInTimerRef.current) clearTimeout(logInTimerRef.current);
    refresh();
  };

  const handleLogIn = (member: CourtMember) => {
    // Deduct session
    member.remainingSessions = (member.remainingSessions ?? 0) - 1;
    // Append to checkInHistory
    member.checkInHistory.push({
      id: Date.now().toString(),
      date: format(new Date(), 'yyyy-MM-dd'),
      sessionsAfter: member.remainingSessions,
    });
    // Recalculate status
    if (member.remainingSessions <= 0) member.status = 'exhausted';
    else if (member.remainingSessions <= 2) member.status = 'sessions-low';
    else member.status = 'active';
    // Show undo strip — auto-dismiss after 5s
    setLoggedInMemberId(member.id);
    if (logInTimerRef.current) clearTimeout(logInTimerRef.current);
    logInTimerRef.current = setTimeout(() => setLoggedInMemberId(null), 5000);
    refresh(); // forceUpdate
  };

  const handleCourtAction = (memberId: string, action: string) => {
    const member = mockCourtMembers.find(m => m.id === memberId)
    if (!member) return
    
    if (action === 'inactive') {
      member.status = 'inactive'
      refresh()
    } else if (action === 'dropout') {
      member.status = 'dropout'
      refresh()
    } else if (action === 'delete') {
      const idx = mockCourtMembers.findIndex(m => m.id === memberId)
      if (idx !== -1) {
        mockCourtMembers.splice(idx, 1)
        refresh()
      }
    }
    setOpenActionMenuId(null)
  }


  const displayedCourtMembers = mockCourtMembers.filter(m => {
    // filter by tab
    if (courtTab === 'active' && !['active', 'due-soon', 'sessions-low', 'expired', 'exhausted'].includes(m.status)) return false
    if (courtTab === 'inactive' && m.status !== 'inactive') return false
    if (courtTab === 'dropout' && m.status !== 'dropout') return false
    // filter by pill
    if (courtFilter === 'monthly') return m.planType === 'monthly'
    if (courtFilter === 'sessions') return m.planType === 'sessions'
    // filter by search
    if (courtSearchQuery) {
      const q = courtSearchQuery.toLowerCase()
      if (!m.name.toLowerCase().includes(q) && !m.phone.includes(courtSearchQuery)) return false
    }
    return true
  })

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    setActiveBatchFilter('all')
    setSearchQuery('')
  }

  const activeStudents = mockStudents
    .filter(s => s.status !== 'dropout' && s.status !== 'inactive')
    .filter(s => activeBatchFilter === 'all' || s.currentBatch === activeBatchFilter)
    .filter(s =>
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery)
    )
    .sort((a, b) => a.name.localeCompare(b.name))

  const dropoutStudents = mockStudents
    .filter(s => s.status === 'dropout')
    .filter(s =>
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery)
    )
    .sort((a, b) => a.name.localeCompare(b.name))

  const activeCount = mockStudents.filter(s => s.status !== 'dropout' && s.status !== 'inactive').length
  const inactiveStudents = mockStudents
    .filter(s => s.status === 'inactive')
    .filter(s => activeBatchFilter === 'all' || s.currentBatch === activeBatchFilter)
    .filter(s =>
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery)
    )

  const inactiveCount = mockStudents.filter(s => s.status === 'inactive').length

  const dropoutCount = mockStudents.filter(s => s.status === 'dropout').length

  const getTotalDue = (s: Student) => {
    if (s.pendingAmount > 0) return s.pendingAmount
    if (s.status === 'expired' || s.status === 'due-soon') return s.fees
    return 0
  }

  const handleMoveOffCourt = (id: string) => {
    const student = mockStudents.find(s => s.id === id)
    if (!student) return
    student.status = 'dropout'
    setDeleteConfirmId(null)
    refresh()
  }

  const handlePermanentDelete = (id: string) => {
    const index = mockStudents.findIndex(s => s.id === id)
    if (index !== -1) mockStudents.splice(index, 1)
    setDeleteConfirmId(null)
    setDeleteHasDues(false)
    refresh()
  }

  const handleReEnroll = (updated: Student) => {
    if (!reEnrollTarget) return
    const student = mockStudents.find(s => s.id === updated.id)
    if (!student) return
    Object.assign(student, updated)
    student.status = 'active'
    setReEnrollTarget(null)
    refresh()
  }

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {toastMessage && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl flex items-center justify-center font-medium shadow-lg transition-all ${
          toastMessage.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
        }`}>
          {toastMessage.message}
        </div>
      )}

      {mockSettings.courtMembershipEnabled && (
        <div className="flex bg-so-surface border border-so-border rounded-xl p-1 w-fit mb-6 shadow-sm">
          <button
            onClick={() => setMemberSegment('coaching')}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
              memberSegment === 'coaching'
                ? 'bg-white text-so-text shadow-sm border border-so-border'
                : 'text-so-muted hover:text-so-text'
            }`}
          >
            Coaching
          </button>
          <button
            onClick={() => setMemberSegment('court')}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
              memberSegment === 'court'
                ? 'bg-white text-so-text shadow-sm border border-so-border'
                : 'text-so-muted hover:text-so-text'
            }`}
          >
            Court
          </button>
        </div>
      )}

      {memberSegment === 'court' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-so-text">Court Members</h1>
              <p className="text-so-muted text-sm mt-0.5">Manage access and session packs</p>
            </div>
            <button
              onClick={() => setShowAddCourtModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-so-accent text-so-accent-text rounded-lg text-sm font-semibold hover:bg-so-accent-hover transition-colors shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              Add Member
            </button>
          </div>

          {/* Search bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-so-muted" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={courtSearchQuery}
              onChange={e => setCourtSearchQuery(e.target.value)}
              className="w-full bg-white border border-so-border rounded-lg pl-9 pr-4 py-2 text-sm text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-accent"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-so-border shadow-sm">
              <p className="text-xs font-semibold text-so-muted uppercase tracking-wider mb-1">Total</p>
              <p className="text-2xl font-bold text-so-text">{mockCourtMembers.length}</p>
            </div>
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 shadow-sm">
              <p className="text-xs font-semibold text-emerald-600/80 uppercase tracking-wider mb-1">Active</p>
              <p className="text-2xl font-bold text-emerald-700">{mockCourtMembers.filter(m => m.status === 'active').length}</p>
            </div>
            <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 shadow-sm">
              <p className="text-xs font-semibold text-amber-600/80 uppercase tracking-wider mb-1">Due / Low</p>
              <p className="text-2xl font-bold text-amber-700">{mockCourtMembers.filter(m => m.status === 'due-soon' || m.status === 'sessions-low').length}</p>
            </div>
            <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 shadow-sm">
              <p className="text-xs font-semibold text-red-600/80 uppercase tracking-wider mb-1">Expired / Done</p>
              <p className="text-2xl font-bold text-red-700">{mockCourtMembers.filter(m => m.status === 'expired' || m.status === 'exhausted').length}</p>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-so-border pb-4">
            <div className="flex gap-1 border-b border-so-border">
              {(['active', 'inactive', 'dropout'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setCourtTab(tab)}
                  className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
                    courtTab === tab
                      ? 'border-so-accent text-so-accent'
                      : 'border-transparent text-so-muted hover:text-so-text'
                  }`}
                >
                  {tab.replace('-', ' ')}
                </button>
              ))}
            </div>
            
            {courtTab === 'active' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-so-muted font-medium">Filter:</span>
                {(['all', 'monthly', 'sessions'] as const).map(filter => (
                  <button
                    key={filter}
                    onClick={() => setCourtFilter(filter)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors capitalize ${
                      courtFilter === filter
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

          <div className="bg-white border border-so-border rounded-xl shadow-sm overflow-visible">
            {displayedCourtMembers.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-so-muted">No members found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto overflow-y-visible">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-so-surface border-b border-so-border">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">Member</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">Phone</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">Plan</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">Validity</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-so-border">
                    {displayedCourtMembers.map(member => {
                      const plan = mockCourtPlans.find(p => p.id === member.planId)
                      return (
                        <tr key={member.id} className="hover:bg-so-surface/50 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-so-surface border border-so-border flex items-center justify-center text-xs font-bold text-so-muted uppercase">
                                {member.name.substring(0,2)}
                              </div>
                              <div>
                                <p 
                                  className="font-semibold text-so-accent cursor-pointer hover:underline" 
                                  onClick={() => router.push(`/court-members/${member.id}`)}
                                >
                                  {member.name}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-sm text-so-muted">{member.phone}</td>
                          <td className="px-5 py-3">
                            <p className="font-medium text-so-text">{getPlanDisplay(member)}</p>
                            <span className="px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-[10px] font-bold uppercase text-gray-600">
                              {member.planType}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            {member.planType === 'monthly' ? (
                              <span className={`font-medium ${
                                member.status === 'expired' ? 'text-red-600' : 
                                member.status === 'due-soon' ? 'text-amber-600' : 'text-so-muted'
                              }`}>
                                {member.nextDueDate ? format(parseISO(member.nextDueDate), 'dd MMM yyyy') : '—'}
                              </span>
                            ) : (
                              <div className="w-24">
                                <p className="text-xs font-semibold mb-1 text-so-text">
                                  {member.remainingSessions} / {member.totalSessions} left
                                </p>
                                <div className="h-1.5 w-full bg-so-surface border border-so-border rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${member.status === 'exhausted' ? 'bg-red-500' : member.status === 'sessions-low' ? 'bg-amber-500' : 'bg-blue-500'}`} 
                                    style={{ width: `${Math.min(100, Math.max(0, ((member.remainingSessions || 0) / (member.totalSessions || 1)) * 100))}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-2 relative">
                              {member.planType === 'sessions' && (member.remainingSessions! > 0) && member.status !== 'inactive' && member.status !== 'dropout' && (
                                loggedInMemberId === member.id ? (
                                  <div className="flex items-center gap-2 text-xs mr-2 bg-emerald-50 px-2 py-1.5 rounded-lg border border-emerald-200">
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-emerald-700 font-medium">Logged in</span>
                                    <div className="w-px h-3 bg-emerald-200 mx-0.5"></div>
                                    <button onClick={() => handleUndoLogIn(member)} className="text-emerald-600 hover:text-emerald-800 font-medium underline">
                                      Undo
                                    </button>
                                  </div>
                                ) : logMenuId === member.id ? (
                                  <div className="flex items-center gap-2 text-xs mr-2 bg-emerald-50 p-1.5 rounded-lg border border-emerald-100">
                                    <span className="text-emerald-700/80 font-medium whitespace-nowrap">
                                      Log 1 session? ({member.remainingSessions! - 1} left)
                                    </span>
                                    <button onClick={() => handleLogIn(member)} className="text-emerald-700 font-bold hover:underline px-1">
                                      Yes
                                    </button>
                                    <span className="text-emerald-300">|</span>
                                    <button onClick={() => setLogMenuId(null)} className="text-emerald-600/70 hover:underline px-1">
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button onClick={() => setLogMenuId(member.id)} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100 whitespace-nowrap">Log In</button>
                                )
                              )}
                              {member.planType === 'sessions' && member.status === 'exhausted' && (
                                <span className="text-xs text-so-muted italic mr-2 whitespace-nowrap">No sessions — see Fee Transactions</span>
                              )}

                              <div className="relative">
                                <button onClick={() => setOpenActionMenuId(openActionMenuId === member.id ? null : member.id)} className="p-1.5 text-so-muted hover:text-so-text hover:bg-so-surface rounded-md">
                                  <span className="sr-only">Open menu</span>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                                </button>
                                {openActionMenuId === member.id && (
                                  <>
                                    <div className="fixed inset-0 z-10" onClick={() => setOpenActionMenuId(null)}></div>
                                    <div className="absolute right-0 mt-1 w-36 bg-white border border-so-border rounded-lg shadow-lg z-20 py-1">
                                      {courtTab === 'active' && (
                                        <>
                                          <button onClick={() => handleCourtAction(member.id, 'inactive')} className="w-full text-left px-4 py-2 text-xs font-medium text-so-text hover:bg-so-surface">Move to Inactive</button>
                                          <button onClick={() => handleCourtAction(member.id, 'dropout')} className="w-full text-left px-4 py-2 text-xs font-medium text-so-text hover:bg-so-surface">Move to Dropout</button>
                                          <button onClick={() => {
                                            if (confirm("Permanently delete this member?")) handleCourtAction(member.id, 'delete')
                                          }} className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50">Delete Permanently</button>
                                        </>
                                      )}
                                      {courtTab === 'inactive' && (
                                        <>
                                          <button onClick={() => handleCourtAction(member.id, 'dropout')} className="w-full text-left px-4 py-2 text-xs font-medium text-so-text hover:bg-so-surface">Move to Dropout</button>
                                          <button onClick={() => {
                                            if (confirm("Permanently delete this member?")) handleCourtAction(member.id, 'delete')
                                          }} className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50">Delete Permanently</button>
                                        </>
                                      )}
                                      {courtTab === 'dropout' && (
                                        <>
                                          <button onClick={() => {
                                            if (confirm("Permanently delete this member?")) handleCourtAction(member.id, 'delete')
                                          }} className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50">Delete Permanently</button>
                                        </>
                                      )}
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
          
          {showAddCourtModal && (
            <AddMemberModal onClose={() => setShowAddCourtModal(false)} onSuccess={refresh} />
          )}
          {editingCourtMember && (
            <EditCourtMemberModal member={editingCourtMember} onClose={() => setEditingCourtMember(null)} onSuccess={refresh} />
          )}
        </div>
      ) : (
        <div className="space-y-0 animate-in fade-in slide-in-from-bottom-4 duration-300">

      {/* Page top bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-so-text">Students</h1>
          <p className="text-so-muted text-sm mt-0.5">
            {activeCount} active • {dropoutCount} off-court
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-so-accent text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <UserPlus className="w-4 h-4" />
          Add Student
        </button>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-so-muted" />
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-so-border rounded-lg pl-9 pr-4 py-2 text-sm text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-accent"
        />
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-2 border-b border-so-border mb-6">
        {(['active', 'inactive', 'dropout'] as TabType[]).map(tab => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? 'border-so-accent text-so-accent'
                : 'border-transparent text-so-muted hover:text-so-text'
            }`}
          >
            {tab === 'active' ? 'Active' : tab === 'inactive' ? 'Inactive' : 'Dropout'}
            <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
              activeTab === tab ? 'bg-so-accent text-white' : 'bg-so-surface text-so-muted'
            }`}>
              {tab === 'active' ? activeCount : tab === 'inactive' ? inactiveCount : dropoutCount}
            </span>
          </button>
        ))}
      </div>

      {/* Batch Filters & Context */}
      {activeTab === 'active' && (
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-so-muted">Batch:</span>
            <button
              onClick={() => setActiveBatchFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeBatchFilter === 'all'
                  ? 'bg-so-accent text-white'
                  : 'bg-white border border-so-border text-so-muted hover:border-so-accent hover:text-so-text'
              }`}
            >
              All Batches
            </button>
            {mockSettings.batches.map(batch => (
              <button
                key={batch}
                onClick={() => setActiveBatchFilter(batch)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  activeBatchFilter === batch
                    ? 'bg-so-accent text-white'
                    : 'bg-white border border-so-border text-so-muted hover:border-so-accent hover:text-so-text'
                }`}
              >
                {batch}
              </button>
            ))}
          </div>
          <p className="text-xs text-so-muted">
            {activeStudents.length} student{activeStudents.length !== 1 ? 's' : ''}
            {activeBatchFilter !== 'all' ? ` in ${activeBatchFilter} batch` : ''}
          </p>
        </div>
      )}

      <p className="text-so-muted text-xs mb-3">
        Showing {activeTab === 'active' ? activeStudents.length : dropoutStudents.length} of{' '}
        {activeTab === 'active' ? activeCount : dropoutCount} students
        {searchQuery && ` matching "${searchQuery}"`}
      </p>

      {/* Table Content */}
      <div className="bg-so-card border border-so-border rounded-xl shadow-sm overflow-hidden min-h-[400px]">
        {activeTab === 'active' && (
          <div>
            {activeStudents.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center">
                {searchQuery ? (
                  <>
                    <Search className="w-12 h-12 text-so-muted mb-4" strokeWidth={1.5} />
                    <p className="text-so-text font-semibold">No students match your search</p>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-12 h-12 text-so-muted mb-4" strokeWidth={1.5} />
                    <p className="text-so-text font-semibold mb-4">No active students yet. Add your first student.</p>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="px-4 py-2 bg-white border border-so-border text-so-text rounded-lg text-sm font-medium hover:border-so-accent transition-colors"
                    >
                      Add Student
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-so-surface border-b border-so-border">
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Name</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Mobile</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Batch</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Guardian</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-so-border">
                    {activeStudents.map(student => (
                      <tr key={student.id} className="bg-so-card hover:bg-so-surface/60 border-b border-so-border transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => router.push(`/students/${student.id}`)}
                            className="text-so-text font-medium hover:text-so-accent transition-colors text-left"
                          >
                            {student.name}
                          </button>
                          {student.status === 'due-soon' && (
                            <span className="ml-2 text-xs text-so-yellow">(Due Soon)</span>
                          )}
                          {student.status === 'expired' && (
                            <span className="ml-2 text-xs text-so-red">(Overdue)</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-so-muted">{student.phone}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full bg-white border border-so-border text-xs text-so-muted capitalize">
                            {student.currentBatch}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-so-muted">{student.guardianName || ''}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2 relative">
                            {deleteConfirmId === student.id ? (
                              <div className="flex items-center gap-1.5 z-30 bg-white p-1 rounded-lg border border-red-200 absolute right-0">
                                {student.pendingAmount > 0 && <span className="text-xs text-red-500 font-medium mr-1">Dues: ₹{student.pendingAmount}</span>}
                                <span className="text-xs text-so-muted">Delete permanently?</span>
                                <button onClick={() => handlePermanentDelete(student.id)} className="text-xs px-2 py-1 bg-red-600 text-white rounded-md font-medium">Yes</button>
                                <button onClick={() => setDeleteConfirmId(null)} className="text-xs px-2 py-1 border border-so-border rounded-md text-so-muted">No</button>
                              </div>
                            ) : (
                              <div className="relative">
                                <button onClick={() => setOpenActionMenuId(openActionMenuId === student.id ? null : student.id)} className="p-1.5 text-so-muted hover:text-so-text hover:bg-so-surface rounded-md">
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                                {openActionMenuId === student.id && (
                                  <>
                                    <div className="fixed inset-0 z-10" onClick={() => setOpenActionMenuId(null)}></div>
                                    <div className="absolute right-0 mt-1 w-40 bg-white border border-so-border rounded-lg shadow-lg z-20 py-1">
                                      <button onClick={() => {
                                        const s = mockStudents.find(x => x.id === student.id);
                                        if (s) { s.status = 'inactive'; refresh(); }
                                        setOpenActionMenuId(null);
                                      }} className="w-full text-left px-4 py-2 text-xs font-medium text-so-text hover:bg-so-surface">Move to Inactive</button>
                                      <button onClick={() => {
                                        const s = mockStudents.find(x => x.id === student.id);
                                        if (s) { s.status = 'dropout'; refresh(); }
                                        setOpenActionMenuId(null);
                                      }} className="w-full text-left px-4 py-2 text-xs font-medium text-so-text hover:bg-so-surface">Move to Dropout</button>
                                      <div className="border-t border-so-border my-1"></div>
                                      <button onClick={() => {
                                        setDeleteConfirmId(student.id);
                                        setOpenActionMenuId(null);
                                      }} className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50">Delete Permanently</button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'inactive' && (
          <div>
            {inactiveStudents.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center">
                {searchQuery ? (
                  <>
                    <Search className="w-12 h-12 text-so-muted mb-4" strokeWidth={1.5} />
                    <p className="text-so-text font-semibold">No on-hold students match your search</p>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-12 h-12 text-so-emerald mb-4" strokeWidth={1.5} />
                    <p className="text-so-text font-semibold">No students currently on hold</p>
                  </>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-so-surface border-b border-so-border">
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Name</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Mobile</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Batch</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Guardian</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-so-border">
                    {inactiveStudents.map(student => (
                      <tr key={student.id} className="bg-so-card hover:bg-so-surface/60 border-b border-so-border transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => router.push(`/students/${student.id}`)}
                            className="text-so-text font-medium hover:text-so-accent transition-colors text-left"
                          >
                            {student.name}
                          </button>
                          <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">Inactive</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-so-muted">{student.phone}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full bg-white border border-so-border text-xs text-so-muted capitalize">
                            {student.currentBatch}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-so-muted">{student.guardianName || ''}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2 relative">
                            {deleteConfirmId === student.id ? (
                              <div className="flex items-center gap-1.5 z-30 bg-white p-1 rounded-lg border border-red-200 absolute right-0">
                                {student.pendingAmount > 0 && <span className="text-xs text-red-500 font-medium mr-1">Dues: ₹{student.pendingAmount}</span>}
                                <span className="text-xs text-so-muted">Delete permanently?</span>
                                <button onClick={() => handlePermanentDelete(student.id)} className="text-xs px-2 py-1 bg-red-600 text-white rounded-md font-medium">Yes</button>
                                <button onClick={() => setDeleteConfirmId(null)} className="text-xs px-2 py-1 border border-so-border rounded-md text-so-muted">No</button>
                              </div>
                            ) : (
                              <div className="relative">
                                <button onClick={() => setOpenActionMenuId(openActionMenuId === student.id ? null : student.id)} className="p-1.5 text-so-muted hover:text-so-text hover:bg-so-surface rounded-md">
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                                {openActionMenuId === student.id && (
                                  <>
                                    <div className="fixed inset-0 z-10" onClick={() => setOpenActionMenuId(null)}></div>
                                    <div className="absolute right-0 mt-1 w-40 bg-white border border-so-border rounded-lg shadow-lg z-20 py-1">
                                      <button onClick={() => {
                                        const s = mockStudents.find(x => x.id === student.id);
                                        if (s) { s.status = 'active'; refresh(); }
                                        setOpenActionMenuId(null);
                                      }} className="w-full text-left px-4 py-2 text-xs font-medium text-so-text hover:bg-so-surface">Move to Active</button>
                                      <button onClick={() => {
                                        const s = mockStudents.find(x => x.id === student.id);
                                        if (s) { s.status = 'dropout'; refresh(); }
                                        setOpenActionMenuId(null);
                                      }} className="w-full text-left px-4 py-2 text-xs font-medium text-so-text hover:bg-so-surface">Move to Dropout</button>
                                      <div className="border-t border-so-border my-1"></div>
                                      <button onClick={() => {
                                        setDeleteConfirmId(student.id);
                                        setOpenActionMenuId(null);
                                      }} className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50">Delete Permanently</button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'dropout' && (
          <div>
            {dropoutStudents.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center">
                {searchQuery ? (
                  <>
                    <Search className="w-12 h-12 text-so-muted mb-4" strokeWidth={1.5} />
                    <p className="text-so-text font-semibold">No off-court students match your search</p>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-12 h-12 text-so-emerald mb-4" strokeWidth={1.5} />
                    <p className="text-so-text font-semibold">No off-court students</p>
                  </>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-so-surface border-b border-so-border">
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Name</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Mobile</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Guardian</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Last Batch</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-so-border">
                    {dropoutStudents.map(student => (
                      <tr key={student.id} className="bg-so-card hover:bg-so-surface/60 border-b border-so-border transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => router.push(`/students/${student.id}`)}
                            className="text-so-muted font-medium hover:text-so-text transition-colors text-left"
                          >
                            {student.name}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-so-muted">{student.phone}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-so-muted">{student.guardianName || ''}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-so-muted text-xs italic capitalize">
                            {student.currentBatch} (last)
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2 relative">
                            {deleteConfirmId === student.id ? (
                              <div className="flex items-center gap-1.5 z-30 bg-white p-1 rounded-lg border border-red-200 absolute right-0">
                                {deleteHasDues && <span className="text-xs text-red-500 font-medium mr-1">Dues: ₹{getTotalDue(student)}</span>}
                                <span className="text-xs text-so-muted">Delete permanently?</span>
                                <button onClick={() => handlePermanentDelete(student.id)} className="text-xs px-2 py-1 bg-red-600 text-white rounded-md font-medium">Yes</button>
                                <button onClick={() => { setDeleteConfirmId(null); setDeleteHasDues(false); }} className="text-xs px-2 py-1 border border-so-border rounded-md text-so-muted">No</button>
                              </div>
                            ) : (
                              <div className="relative">
                                <button onClick={() => setOpenActionMenuId(openActionMenuId === student.id ? null : student.id)} className="p-1.5 text-so-muted hover:text-so-text hover:bg-so-surface rounded-md">
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                                {openActionMenuId === student.id && (
                                  <>
                                    <div className="fixed inset-0 z-10" onClick={() => setOpenActionMenuId(null)}></div>
                                    <div className="absolute right-0 mt-1 w-40 bg-white border border-so-border rounded-lg shadow-lg z-20 py-1">
                                      <button onClick={() => {
                                        const s = mockStudents.find(x => x.id === student.id);
                                        if (s) { s.status = 'active'; refresh(); }
                                        setOpenActionMenuId(null);
                                      }} className="w-full text-left px-4 py-2 text-xs font-medium text-so-text hover:bg-so-surface">Move to Active</button>
                                      <button onClick={() => {
                                        const s = mockStudents.find(x => x.id === student.id);
                                        if (s) { s.status = 'inactive'; refresh(); }
                                        setOpenActionMenuId(null);
                                      }} className="w-full text-left px-4 py-2 text-xs font-medium text-so-text hover:bg-so-surface">Move to Inactive</button>
                                      <div className="border-t border-so-border my-1"></div>
                                      <button onClick={() => {
                                        setDeleteConfirmId(student.id);
                                        setDeleteHasDues(getTotalDue(student) > 0);
                                        setOpenActionMenuId(null);
                                      }} className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50">Delete Permanently</button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddStudentModal
          onClose={() => setShowAddModal(false)}
          onSuccess={refresh}
        />
      )}

      {editTarget && (
        <EditStudentModal
          student={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={() => { setEditTarget(null); refresh() }}
        />
      )}

      {reEnrollTarget && (
        <ReEnrollModal
          student={reEnrollTarget}
          onClose={() => setReEnrollTarget(null)}
          onConfirm={handleReEnroll}
        />
      )}
        </div>
      )}
    </div>
  )
}
