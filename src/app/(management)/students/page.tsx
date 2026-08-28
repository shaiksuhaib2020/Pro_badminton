'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { mockStudents, mockSettings, Student } from '@/lib/mock-data'
import { Search, UserPlus, Pencil, DoorOpen, Trash2, RefreshCw, CheckCircle } from 'lucide-react'

import AddStudentModal from '@/components/students/AddStudentModal'
import EditStudentModal from '@/components/students/EditStudentModal'
import ReEnrollModal from '@/components/students/ReEnrollModal'

type TabType = 'active' | 'off-court'

export default function StudentsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('active')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeBatchFilter, setActiveBatchFilter] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Student | null>(null)
  const [reEnrollTarget, setReEnrollTarget] = useState<Student | null>(null)
  const [offCourtConfirmId, setOffCourtConfirmId] = useState<string | null>(null)
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
    .filter(s => s.status !== 'off-court')
    .filter(s => activeBatchFilter === 'all' || s.currentBatch === activeBatchFilter)
    .filter(s =>
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery)
    )
    .sort((a, b) => a.name.localeCompare(b.name))

  const offCourtStudents = mockStudents
    .filter(s => s.status === 'off-court')
    .filter(s =>
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery)
    )
    .sort((a, b) => a.name.localeCompare(b.name))

  const activeCount = mockStudents.filter(s => s.status !== 'off-court').length
  const offCourtCount = mockStudents.filter(s => s.status === 'off-court').length

  const getTotalDue = (s: Student) => {
    if (s.pendingAmount > 0) return s.pendingAmount
    if (s.status === 'expired' || s.status === 'due-soon') return s.fees
    return 0
  }

  const handleMoveOffCourt = (id: string) => {
    const student = mockStudents.find(s => s.id === id)
    if (!student) return
    student.status = 'off-court'
    setOffCourtConfirmId(null)
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
      {/* Page top bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-so-text">Students</h1>
          <p className="text-so-muted text-sm mt-0.5">
            {activeCount} active • {offCourtCount} off-court
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
        {(['active', 'off-court'] as TabType[]).map(tab => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? 'border-so-accent text-so-accent'
                : 'border-transparent text-so-muted hover:text-so-text'
            }`}
          >
            {tab === 'active' ? 'Active' : 'Off-Court'}
            <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
              activeTab === tab ? 'bg-so-accent text-white' : 'bg-so-surface text-so-muted'
            }`}>
              {tab === 'active' ? activeCount : offCourtCount}
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
        Showing {activeTab === 'active' ? activeStudents.length : offCourtStudents.length} of{' '}
        {activeTab === 'active' ? activeCount : offCourtCount} students
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
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Total Due</th>
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getTotalDue(student) > 0 ? (
                            <span className="text-so-red font-medium">
                              ₹ {getTotalDue(student).toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="text-so-muted text-sm"></span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditTarget(student)}
                              className="p-1.5 rounded-md text-so-muted hover:text-so-text hover:bg-so-surface transition-colors"
                              title="Edit student"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            {offCourtConfirmId === student.id ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-so-muted">Move to Off-Court?</span>
                                <button onClick={() => handleMoveOffCourt(student.id)}
                                  className="text-xs px-2 py-1 bg-so-yellow text-black rounded-md font-medium">
                                  Yes
                                </button>
                                <button onClick={() => setOffCourtConfirmId(null)}
                                  className="text-xs px-2 py-1 border border-so-border rounded-md text-so-muted">
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setOffCourtConfirmId(student.id)}
                                className="p-1.5 rounded-md text-so-muted hover:text-so-yellow hover:bg-so-surface transition-colors"
                                title="Move to Off-Court"
                              >
                                <DoorOpen className="w-4 h-4" />
                              </button>
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

        {activeTab === 'off-court' && (
          <div>
            {offCourtStudents.length === 0 ? (
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
                      <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Total Due</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-so-border">
                    {offCourtStudents.map(student => (
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getTotalDue(student) > 0 ? (
                            <span className="text-so-red font-medium">
                              ₹ {getTotalDue(student).toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="text-so-muted text-sm"></span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setReEnrollTarget(student)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-so-accent text-white rounded-md text-xs font-medium hover:opacity-90"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Re-enroll
                            </button>

                            {deleteConfirmId === student.id ? (
                              <div className="flex items-center gap-1.5 ml-2">
                                {deleteHasDues && (
                                  <span className="text-xs text-so-red font-medium mr-1">
                                    ₹ {getTotalDue(student).toLocaleString('en-IN')} dues outstanding.
                                  </span>
                                )}
                                <span className="text-xs text-so-muted">Delete permanently?</span>
                                <button onClick={() => handlePermanentDelete(student.id)}
                                  className="text-xs px-2 py-1 bg-so-red text-white rounded-md font-medium">
                                  Delete
                                </button>
                                <button onClick={() => { setDeleteConfirmId(null); setDeleteHasDues(false) }}
                                  className="text-xs px-2 py-1 border border-so-border rounded-md text-so-muted">
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setDeleteConfirmId(student.id)
                                  setDeleteHasDues(getTotalDue(student) > 0)
                                }}
                                className="p-1.5 rounded-md text-so-muted hover:text-so-red hover:bg-so-surface transition-colors"
                                title="Delete permanently"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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
  )
}
