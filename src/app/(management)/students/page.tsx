'use client'

import { format, parseISO, addMonths } from 'date-fns'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { mockStudents, mockSettings, Student } from '@/lib/mock-data'
import { Search, UserPlus, Pencil, DoorOpen, Trash2, RefreshCw, CheckCircle, MoreVertical, X } from 'lucide-react'

import AddStudentModal from '@/components/students/AddStudentModal'
import EditStudentModal from '@/components/students/EditStudentModal'
import ReEnrollModal from '@/components/students/ReEnrollModal'
import DropoutConfirmModal from '@/components/students/DropoutConfirmModal'
import { getTodayIST } from '@/lib/utils'

type TabType = 'active' | 'inactive' | 'dropout'
export default function StudentsPage() {
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const router = useRouter()
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null)
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
  const [dropoutTarget, setDropoutTarget] = useState<Student | null>(null)
  
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleteHasDues, setDeleteHasDues] = useState(false)
  
  const [, forceUpdate] = useState(0)
  const refresh = () => forceUpdate(n => n + 1)
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
                                        setDropoutTarget(student);
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
                                        setDropoutTarget(student);
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

      {dropoutTarget && (
        <DropoutConfirmModal
          student={dropoutTarget}
          onClose={() => setDropoutTarget(null)}
          onConfirm={(reason) => {
            const s = mockStudents.find(s => s.id === dropoutTarget.id)
            if (s) {
              s.status = 'dropout'
              s.dropoutReason = reason
              s.dropoutDate = getTodayIST()
            }
            setDropoutTarget(null)
            refresh()
          }}
        />
      )}
        </div>
    </div>
  )
}
