'use client'

import { useState, useEffect } from 'react'
import { Enquiry, EnquiryStatus, mockEnquiries } from '@/lib/mock-data'
import { getTodayIST, formatDate } from '@/lib/utils'
import { Search, Plus, MoreVertical, ClipboardList, X } from 'lucide-react'
import AddEnquiryModal from '@/components/enquiries/AddEnquiryModal'
import EditEnquiryModal from '@/components/enquiries/EditEnquiryModal'
import EnquiryDetailsModal from '@/components/enquiries/EnquiryDetailsModal'
import AddStudentModal from '@/components/students/AddStudentModal'

export default function EnquiriesPage() {
  const [, forceUpdate] = useState(0)
  const refresh = () => forceUpdate(n => n + 1)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<EnquiryStatus | 'all'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name-az'>('newest')

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingEnquiry, setEditingEnquiry] = useState<Enquiry | null>(null)
  const [detailsEnquiry, setDetailsEnquiry] = useState<Enquiry | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // For the inline date popover
  const [schedulingId, setSchedulingId] = useState<string | null>(null)
  const [pendingTrialDate, setPendingTrialDate] = useState('')

  // For Enroll action — opens AddStudentModal with prefill
  const [enrollingEnquiry, setEnrollingEnquiry] = useState<Enquiry | null>(null)

  const filtered = mockEnquiries
    .filter(e => statusFilter === 'all' || e.status === statusFilter)
    .filter(e =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.phone.includes(search) ||
      e.guardianName.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'newest') return b.createdAt.localeCompare(a.createdAt)
      if (sortBy === 'oldest') return a.createdAt.localeCompare(b.createdAt)
      if (sortBy === 'name-az') return a.name.localeCompare(b.name)
      return 0
    })

  // Close menus on escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenuId(null)
        setSchedulingId(null)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20">
      
      {/* Click outside overlay for popovers */}
      {(schedulingId || openMenuId) && (
        <div className="fixed inset-0 z-10" onClick={() => { setSchedulingId(null); setOpenMenuId(null); }} />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-so-text">Enquiries</h1>
          <p className="text-so-muted text-sm mt-0.5">
            {filtered.length} {filtered.length === 1 ? 'enquiry' : 'enquiries'}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-so-accent text-white rounded-lg text-sm font-semibold hover:bg-so-accent/90 transition-colors shadow-sm w-fit"
        >
          <Plus className="w-4 h-4" /> Add Enquiry
        </button>
      </div>

      {/* Inline Delete Confirmation */}
      {deletingId && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between shadow-sm relative z-20">
          <span className="text-sm font-semibold">Delete this enquiry? This cannot be undone.</span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setDeletingId(null)} 
              className="text-xs px-3 py-1.5 text-red-700 hover:bg-red-100 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                const idx = mockEnquiries.findIndex(e => e.id === deletingId)
                if (idx !== -1) mockEnquiries.splice(idx, 1)
                setDeletingId(null)
                refresh()
              }} 
              className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors shadow-sm"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Search + Filter + Sort bar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 bg-so-card border border-so-border rounded-xl p-3 shadow-sm relative z-20">
        <div className="relative w-full lg:w-72 shrink-0">
          <Search className="w-4 h-4 text-so-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, phone or guardian..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-so-surface border border-so-border rounded-lg pl-9 pr-4 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent transition-colors"
          />
        </div>

        <div className="flex-1 flex flex-wrap gap-2">
          {(['all', 'not-scheduled', 'scheduled', 'completed'] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${
                statusFilter === status
                  ? 'bg-so-accent text-white shadow-sm'
                  : 'bg-so-surface text-so-muted border border-so-border hover:border-so-accent hover:text-so-text'
              }`}
            >
              {status.replace('-', ' ')}
            </button>
          ))}
        </div>

        <div className="w-full lg:w-48 shrink-0">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="w-full bg-so-surface border border-so-border rounded-lg px-3 py-2 text-sm text-so-text font-medium focus:outline-none focus:border-so-accent"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name-az">Name A–Z</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-so-card border border-so-border rounded-xl overflow-visible shadow-sm">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <ClipboardList className="w-10 h-10 text-so-muted mb-4 opacity-50" strokeWidth={1.5} />
            <h3 className="text-base font-semibold text-so-text mb-1">No enquiries found</h3>
            <p className="text-sm text-so-muted mb-6 max-w-sm">
              {search || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria to find what you are looking for.' 
                : 'Add your first enquiry to start tracking leads and scheduling trials.'}
            </p>
            {!search && statusFilter === 'all' && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 border border-so-border rounded-lg text-sm font-semibold text-so-text hover:border-so-accent hover:text-so-accent transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Enquiry
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-so-border bg-so-surface/30">
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-so-muted w-[25%]">Name</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-so-muted w-[18%]">Phone</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-so-muted w-[20%]">Guardian</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-so-muted w-[22%]">Trial</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-so-muted w-[15%] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-so-border-subtle">
                {filtered.map(enquiry => (
                  <tr key={enquiry.id} className="border-b border-so-border-subtle hover:bg-so-surface/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-so-text truncate">{enquiry.name}</div>
                      <div className="text-[11px] text-so-muted mt-0.5">Added {formatDate(enquiry.createdAt)}</div>
                    </td>
                    <td className="px-4 py-3 text-so-muted font-medium">{enquiry.phone}</td>
                    <td className="px-4 py-3 text-so-muted truncate">{enquiry.guardianName}</td>
                    
                    {/* Trial Column */}
                    <td className="px-4 py-3 relative">
                      {enquiry.status === 'not-scheduled' && (
                        <button
                          onClick={() => { setSchedulingId(enquiry.id); setPendingTrialDate(''); setOpenMenuId(null); }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors relative z-20"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          Not Scheduled
                        </button>
                      )}
                      
                      {enquiry.status === 'scheduled' && (
                        <div>
                          <button
                            onClick={() => {
                              enquiry.status = 'completed'
                              setSchedulingId(null)
                              refresh()
                            }}
                            title="Click to mark as completed"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors relative z-20"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                            Scheduled
                          </button>
                          {enquiry.trialDate && (
                            <p className="text-[11px] text-so-muted mt-0.5 pl-0.5 font-medium">
                              {formatDate(enquiry.trialDate)}
                            </p>
                          )}
                        </div>
                      )}

                      {enquiry.status === 'completed' && (
                        <div>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 relative z-20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            Completed
                          </span>
                          {enquiry.trialDate && (
                            <p className="text-[11px] text-so-muted mt-0.5 pl-0.5 font-medium">
                              {formatDate(enquiry.trialDate)}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Date Popover */}
                      {schedulingId === enquiry.id && (
                        <div className="absolute top-full left-4 mt-1 z-30 bg-so-card border border-so-border rounded-xl shadow-lg p-3 flex items-center gap-2 min-w-[260px] animate-in fade-in slide-in-from-top-1">
                          <input
                            type="date"
                            value={pendingTrialDate}
                            min={getTodayIST()}
                            onChange={e => setPendingTrialDate(e.target.value)}
                            className="flex-1 bg-so-surface border border-so-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-so-accent"
                            autoFocus
                          />
                          <button
                            disabled={!pendingTrialDate}
                            onClick={() => {
                              const target = mockEnquiries.find(e => e.id === schedulingId)
                              if (target && pendingTrialDate) {
                                target.status = 'scheduled'
                                target.trialDate = pendingTrialDate
                              }
                              setSchedulingId(null)
                              setPendingTrialDate('')
                              refresh()
                            }}
                            className="bg-so-accent text-white text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => { setSchedulingId(null); setPendingTrialDate('') }}
                            className="text-so-muted hover:text-so-text text-xs p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Action Column */}
                    <td className="px-4 py-3 text-right">
                      {enquiry.status === 'completed' ? (
                        <div className="flex items-center justify-end gap-2 relative z-20">
                          <button
                            onClick={() => setEnrollingEnquiry(enquiry)}
                            className="bg-so-accent hover:bg-so-accent/90 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                          >
                            Enroll
                          </button>
                          <div className="relative">
                            <button
                              onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === enquiry.id ? null : enquiry.id); setSchedulingId(null); }}
                              className="p-1.5 rounded-lg hover:bg-so-surface text-so-muted transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" strokeWidth={1.75} />
                            </button>
                            {openMenuId === enquiry.id && (
                              <div className="absolute right-0 top-full mt-1 z-30 bg-so-card border border-so-border rounded-xl shadow-lg py-1 w-36 animate-in fade-in slide-in-from-top-1">
                                <button onClick={() => { setDetailsEnquiry(enquiry); setOpenMenuId(null) }}
                                        className="w-full text-left px-4 py-2 text-sm font-medium text-so-text hover:bg-so-surface">
                                  Details
                                </button>
                                <button onClick={() => { setEditingEnquiry(enquiry); setOpenMenuId(null) }}
                                        className="w-full text-left px-4 py-2 text-sm font-medium text-so-text hover:bg-so-surface">
                                  Edit
                                </button>
                                <button onClick={() => { setDeletingId(enquiry.id); setOpenMenuId(null) }}
                                        className="w-full text-left px-4 py-2 text-sm font-medium text-so-red hover:bg-red-50 border-t border-so-border/60">
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="relative inline-block text-left z-20">
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === enquiry.id ? null : enquiry.id); setSchedulingId(null); }}
                            className="p-1.5 rounded-lg hover:bg-so-surface text-so-muted transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" strokeWidth={1.75} />
                          </button>
                          {openMenuId === enquiry.id && (
                            <div className="absolute right-0 top-full mt-1 z-30 bg-so-card border border-so-border rounded-xl shadow-lg py-1 w-36 animate-in fade-in slide-in-from-top-1">
                              <button onClick={() => { setDetailsEnquiry(enquiry); setOpenMenuId(null) }}
                                      className="w-full text-left px-4 py-2 text-sm font-medium text-so-text hover:bg-so-surface">
                                Details
                              </button>
                              <button onClick={() => { setEditingEnquiry(enquiry); setOpenMenuId(null) }}
                                      className="w-full text-left px-4 py-2 text-sm font-medium text-so-text hover:bg-so-surface">
                                Edit
                              </button>
                              <button onClick={() => { setDeletingId(enquiry.id); setOpenMenuId(null) }}
                                      className="w-full text-left px-4 py-2 text-sm font-medium text-so-red hover:bg-red-50 border-t border-so-border/60">
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddEnquiryModal 
          onClose={() => setShowAddModal(false)} 
          onSuccess={() => { refresh(); setShowAddModal(false) }} 
        />
      )}
      
      {editingEnquiry && (
        <EditEnquiryModal 
          enquiry={editingEnquiry} 
          onClose={() => setEditingEnquiry(null)} 
          onSave={() => { refresh(); setEditingEnquiry(null) }} 
        />
      )}
      
      {detailsEnquiry && (
        <EnquiryDetailsModal 
          enquiry={detailsEnquiry} 
          onClose={() => setDetailsEnquiry(null)} 
        />
      )}
      
      {enrollingEnquiry && (
        <AddStudentModal
          onClose={() => setEnrollingEnquiry(null)}
          onSuccess={() => setEnrollingEnquiry(null)}
          prefillName={enrollingEnquiry.name}
          prefillPhone={enrollingEnquiry.phone}
          prefillGuardianName={enrollingEnquiry.guardianName}
        />
      )}
    </div>
  )
}
