'use client'

import { useState } from 'react'
import {
  mockStaffMembers,
  mockBranches,
  StaffMember,
  StaffRole,
  StaffStatus,
} from '@/lib/mock-data'
import {
  Users,
  Plus,
  Lock,
  MoreVertical,
  Mail,
  Check,
  X,
} from 'lucide-react'
import { format, differenceInDays, parseISO } from 'date-fns'

export default function StaffSection() {
  const [, forceUpdate] = useState(0)

  // Invite form state
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<StaffRole>('manager')
  const [inviteBranches, setInviteBranches] = useState<string[]>([])
  const [toastMsg, setToastMsg] = useState('')

  // Table row action dropdown state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [editingBranchStaffId, setEditingBranchStaffId] = useState<string | null>(null)
  const [editBranchSelection, setEditBranchSelection] = useState<string[]>([])
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null)

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteName.trim() || !inviteEmail.trim()) return

    const initials = inviteName
      .trim()
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()

    const newStaff: StaffMember = {
      id: `staff-${Date.now()}`,
      name: inviteName.trim(),
      email: inviteEmail.trim().toLowerCase(),
      role: inviteRole,
      branchIds: inviteRole === 'owner' ? ['all'] : inviteBranches.length > 0 ? inviteBranches : ['branch-1'],
      status: 'invited',
      invitedAt: format(new Date(), 'yyyy-MM-dd'),
      avatarInitials: initials || 'ST',
    }

    mockStaffMembers.push(newStaff)
    setInviteName('')
    setInviteEmail('')
    setInviteRole('manager')
    setInviteBranches([])
    setShowInviteForm(false)

    setToastMsg(`Invitation sent to ${newStaff.email}`)
    setTimeout(() => setToastMsg(''), 3000)
    forceUpdate(n => n + 1)
  }

  const handleToggleSuspend = (staff: StaffMember) => {
    if (staff.role === 'owner') return
    staff.status = staff.status === 'active' ? 'suspended' : 'active'
    setOpenMenuId(null)
    forceUpdate(n => n + 1)
  }

  const handleRevoke = (id: string) => {
    const idx = mockStaffMembers.findIndex(s => s.id === id)
    if (idx !== -1 && mockStaffMembers[idx].role !== 'owner') {
      mockStaffMembers.splice(idx, 1)
    }
    setRevokeConfirmId(null)
    setOpenMenuId(null)
    forceUpdate(n => n + 1)
  }

  const handleStartEditBranches = (staff: StaffMember) => {
    setEditingBranchStaffId(staff.id)
    setEditBranchSelection([...staff.branchIds])
    setOpenMenuId(null)
  }

  const handleSaveEditBranches = (staff: StaffMember) => {
    staff.branchIds = staff.role === 'owner' ? ['all'] : [...editBranchSelection]
    setEditingBranchStaffId(null)
    forceUpdate(n => n + 1)
  }

  const getRoleBadge = (role: StaffRole) => {
    switch (role) {
      case 'owner':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 rounded">Owner</span>
      case 'manager':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 rounded">Manager</span>
      case 'coach':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 rounded">Coach</span>
      case 'accountant':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-yellow-100 text-yellow-700 rounded">Accountant</span>
      case 'receptionist':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700 rounded">Receptionist</span>
    }
  }

  const getStatusDisplay = (staff: StaffMember) => {
    switch (staff.status) {
      case 'active':
        return (
          <span className="flex items-center gap-1.5 text-xs text-so-emerald font-semibold">
            <span className="w-2 h-2 rounded-full bg-so-emerald"></span> Active
          </span>
        )
      case 'invited': {
        let daysAgo = 0
        try {
          daysAgo = Math.max(0, differenceInDays(new Date(), parseISO(staff.invitedAt)))
        } catch {}
        return (
          <span className="flex items-center gap-1.5 text-xs text-so-yellow font-semibold">
            <span className="w-2 h-2 rounded-full bg-so-yellow"></span> Invited · {daysAgo === 0 ? 'today' : `${daysAgo}d ago`}
          </span>
        )
      }
      case 'suspended':
        return (
          <span className="flex items-center gap-1.5 text-xs text-so-red font-semibold">
            <span className="w-2 h-2 rounded-full bg-so-red"></span> Suspended
          </span>
        )
    }
  }

  return (
    <div className="bg-so-card border border-so-border rounded-2xl p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-so-accent/10 flex items-center justify-center">
            <Users className="w-4 h-4 text-so-accent" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-so-text">Staff & Access</h2>
            <p className="text-xs text-so-muted">Invite team members and manage role-based branch access</p>
          </div>
        </div>

        {!showInviteForm && (
          <button
            onClick={() => setShowInviteForm(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-so-accent text-white rounded-lg text-xs font-bold hover:bg-so-accent/90 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Invite Staff
          </button>
        )}
      </div>

      {toastMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Inline Invite Staff Panel */}
      {showInviteForm && (
        <form onSubmit={handleSendInvite} className="bg-so-surface/70 border border-so-border rounded-xl p-4 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-so-border pb-2">
            <h3 className="text-xs font-bold text-so-text uppercase tracking-wider">Invite New Staff Member</h3>
            <button type="button" onClick={() => setShowInviteForm(false)} className="text-so-muted hover:text-so-text">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-so-muted mb-1">Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Kumar"
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
                className="w-full bg-white border border-so-border rounded-lg px-3 py-1.5 text-xs text-so-text focus:outline-none focus:border-so-accent"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-so-muted mb-1">Email Address</label>
              <input
                type="email"
                required
                placeholder="ramesh@academy.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="w-full bg-white border border-so-border rounded-lg px-3 py-1.5 text-xs text-so-text focus:outline-none focus:border-so-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-so-muted mb-1.5">Select Role</label>
            <div className="flex flex-wrap gap-2">
              {(['owner', 'manager', 'coach', 'accountant', 'receptionist'] as StaffRole[]).map(role => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setInviteRole(role)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize border transition-colors ${
                    inviteRole === role
                      ? 'bg-so-accent text-white border-so-accent shadow-sm'
                      : 'bg-white border-so-border text-so-muted hover:text-so-text hover:border-so-accent'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden">
            <label className="block text-[10px] font-bold uppercase text-so-muted mb-1.5">Branch Assignment</label>
            {inviteRole === 'owner' ? (
              <p className="text-xs text-so-accent font-semibold bg-so-accent/10 px-3 py-1.5 rounded-lg border border-so-accent/20 w-fit">
                All branches (automatic)
              </p>
            ) : (
              <div className="flex flex-wrap gap-3 bg-white border border-so-border p-3 rounded-lg">
                {mockBranches.map(b => (
                  <label key={b.id} className="flex items-center gap-2 text-xs text-so-text cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inviteBranches.includes(b.id)}
                      onChange={e => {
                        if (e.target.checked) setInviteBranches([...inviteBranches, b.id])
                        else setInviteBranches(inviteBranches.filter(id => id !== b.id))
                      }}
                      className="rounded border-so-border text-so-accent focus:ring-so-accent"
                    />
                    <span>{b.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-so-border">
            <button
              type="button"
              onClick={() => setShowInviteForm(false)}
              className="text-xs px-3 py-1.5 text-so-muted hover:text-so-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="text-xs px-4 py-1.5 bg-so-accent text-white font-bold rounded-lg hover:bg-so-accent/90 shadow-sm flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" /> Send Invitation
            </button>
          </div>
        </form>
      )}

      {/* Staff Roster Table */}
      <div className="bg-white border border-so-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-so-surface border-b border-so-border text-so-muted font-bold uppercase">
                <th className="px-4 py-3">Staff Member</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 hidden">Branches</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-so-border">
              {mockStaffMembers.map(staff => {
                const isOwner = staff.role === 'owner'
                const isEditingBranches = editingBranchStaffId === staff.id

                return (
                  <tr key={staff.id} className="hover:bg-so-surface/40 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-so-surface border border-so-border flex items-center justify-center font-bold text-so-text text-xs shadow-xs">
                          {staff.avatarInitials}
                        </div>
                        <div>
                          <p className="font-bold text-so-text">{staff.name}</p>
                          <p className="text-so-muted text-[11px] font-mono">{staff.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">{getRoleBadge(staff.role)}</td>

                    <td className="px-4 py-3 hidden">
                      {isEditingBranches ? (
                        <div className="space-y-2 bg-so-surface p-2 rounded-lg border border-so-border">
                          <div className="flex flex-wrap gap-2">
                            {mockBranches.map(b => (
                              <label key={b.id} className="flex items-center gap-1 text-[11px] text-so-text cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editBranchSelection.includes(b.id)}
                                  onChange={e => {
                                    if (e.target.checked) setEditBranchSelection([...editBranchSelection, b.id])
                                    else setEditBranchSelection(editBranchSelection.filter(id => id !== b.id))
                                  }}
                                />
                                <span>{b.name}</span>
                              </label>
                            ))}
                          </div>
                          <div className="flex justify-end gap-1">
                            <button onClick={() => setEditingBranchStaffId(null)} className="text-[10px] px-2 py-0.5 text-so-muted">Cancel</button>
                            <button onClick={() => handleSaveEditBranches(staff)} className="text-[10px] px-2 py-0.5 bg-so-accent text-white font-bold rounded">Save</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {staff.branchIds.includes('all') ? (
                            <span className="bg-so-accent/10 text-so-accent px-2 py-0.5 rounded text-[10px] font-semibold">
                              All branches
                            </span>
                          ) : (
                            staff.branchIds.map(bId => {
                              const bName = mockBranches.find(b => b.id === bId)?.name || bId
                              return (
                                <span key={bId} className="bg-so-surface border border-so-border text-so-text px-2 py-0.5 rounded text-[10px]">
                                  {bName}
                                </span>
                              )
                            })
                          )}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">{getStatusDisplay(staff)}</td>

                    <td className="px-4 py-3 whitespace-nowrap text-right relative">
                      {isOwner ? (
                        <div className="flex items-center justify-end gap-1 text-so-muted" title="Cannot modify owner">
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                      ) : revokeConfirmId === staff.id ? (
                        <div className="flex items-center justify-end gap-2 bg-red-50 border border-red-200 px-2 py-1 rounded">
                          <span className="text-[10px] text-red-700 font-semibold">Remove {staff.name}?</span>
                          <button onClick={() => handleRevoke(staff.id)} className="text-[10px] font-bold text-white bg-red-600 px-1.5 py-0.5 rounded">Yes</button>
                          <button onClick={() => setRevokeConfirmId(null)} className="text-[10px] text-so-muted">No</button>
                        </div>
                      ) : (
                        <div className="relative inline-block text-left">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === staff.id ? null : staff.id)}
                            className="p-1 hover:bg-so-surface rounded text-so-muted hover:text-so-text"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {openMenuId === staff.id && (
                            <div className="absolute right-0 mt-1 w-44 bg-white border border-so-border rounded-xl shadow-lg z-20 py-1 text-left animate-in fade-in slide-in-from-top-1">
                              <button
                                onClick={() => handleStartEditBranches(staff)}
                                className="w-full px-3 py-1.5 text-xs text-so-text hover:bg-so-surface flex items-center gap-2 hidden"
                              >
                                Edit Branch Access
                              </button>
                              <button
                                onClick={() => handleToggleSuspend(staff)}
                                className="w-full px-3 py-1.5 text-xs text-so-text hover:bg-so-surface flex items-center gap-2"
                              >
                                {staff.status === 'active' ? 'Suspend Staff' : 'Reactivate Staff'}
                              </button>
                              <button
                                onClick={() => setRevokeConfirmId(staff.id)}
                                className="w-full px-3 py-1.5 text-xs text-so-red hover:bg-red-50 flex items-center gap-2 font-medium border-t border-so-border/60"
                              >
                                Revoke Access
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
