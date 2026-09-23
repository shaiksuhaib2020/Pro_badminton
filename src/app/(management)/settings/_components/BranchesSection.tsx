'use client'

import { useState } from 'react'
import { mockBranches, mockStudents, mockBatches, Branch } from '@/lib/mock-data'
import { Building2, Pencil, Plus, AlertCircle, X, Check } from 'lucide-react'
import { format } from 'date-fns'

export default function BranchesSection() {
  const [, forceUpdate] = useState(0)

  const [showAddForm, setShowAddForm] = useState(false)
  const [newBranchName, setNewBranchName] = useState('')
  const [newBranchAddress, setNewBranchAddress] = useState('')
  const [newBranchPhone, setNewBranchPhone] = useState('')

  const [editingBranchId, setEditingBranchId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editPhone, setEditPhone] = useState('')

  const [warningBranchId, setWarningBranchId] = useState<string | null>(null)
  const [warningMsg, setWarningMsg] = useState('')

  const handleToggleActive = (branch: Branch) => {
    if (branch.isPrimary) return

    if (branch.isActive) {
      // Check deactivation guard
      const assignedStudents = mockStudents.filter(s =>
        mockBatches.find(b => b.name === s.currentBatch && b.branchId === branch.id)
      )

      if (assignedStudents.length > 0) {
        setWarningBranchId(branch.id)
        setWarningMsg(
          `${assignedStudents.length} student${assignedStudents.length > 1 ? 's are' : ' is'} assigned to batches in this branch. Reassign them before deactivating.`
        )
        return
      }
    }

    setWarningBranchId(null)
    branch.isActive = !branch.isActive
    forceUpdate(n => n + 1)
  }

  const handleAddBranch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBranchName.trim()) return

    const newBranch: Branch = {
      id: `branch-${Date.now()}`,
      name: newBranchName.trim(),
      address: newBranchAddress.trim(),
      phone: newBranchPhone.trim(),
      isActive: true,
      isPrimary: false,
      createdAt: format(new Date(), 'yyyy-MM-dd'),
    }

    mockBranches.push(newBranch)
    setNewBranchName('')
    setNewBranchAddress('')
    setNewBranchPhone('')
    setShowAddForm(false)
    forceUpdate(n => n + 1)
  }

  const handleStartEdit = (branch: Branch) => {
    setEditingBranchId(branch.id)
    setEditName(branch.name)
    setEditAddress(branch.address)
    setEditPhone(branch.phone)
    setWarningBranchId(null)
  }

  const handleSaveEdit = (branch: Branch) => {
    if (!editName.trim()) return
    branch.name = editName.trim()
    branch.address = editAddress.trim()
    branch.phone = editPhone.trim()
    setEditingBranchId(null)
    forceUpdate(n => n + 1)
  }

  return (
    <div className="bg-so-card border border-so-border rounded-2xl p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-so-accent/10 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-so-accent" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-so-text">Branches</h2>
            <p className="text-xs text-so-muted">Manage locations and center availability</p>
          </div>
        </div>

        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-so-accent text-white rounded-lg text-xs font-bold hover:bg-so-accent/90 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Add Branch
          </button>
        )}
      </div>

      {/* Branch Cards List */}
      <div className="space-y-3">
        {mockBranches.map(branch => {
          const isEditing = editingBranchId === branch.id

          return (
            <div
              key={branch.id}
              className={`bg-white border rounded-xl p-4 transition-all ${
                branch.isActive
                  ? 'border-so-border'
                  : 'border-so-border/70 opacity-50 bg-so-surface/30'
              }`}
            >
              {isEditing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-so-muted mb-1">Branch Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="w-full bg-white border border-so-border rounded-lg px-3 py-1.5 text-xs text-so-text font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-so-muted mb-1">Phone</label>
                      <input
                        type="text"
                        value={editPhone}
                        onChange={e => setEditPhone(e.target.value)}
                        className="w-full bg-white border border-so-border rounded-lg px-3 py-1.5 text-xs text-so-text"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-so-muted mb-1">Address</label>
                      <input
                        type="text"
                        value={editAddress}
                        onChange={e => setEditAddress(e.target.value)}
                        className="w-full bg-white border border-so-border rounded-lg px-3 py-1.5 text-xs text-so-text"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => setEditingBranchId(null)}
                      className="text-xs px-3 py-1 text-so-muted hover:text-so-text"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveEdit(branch)}
                      className="text-xs px-3.5 py-1 bg-so-accent text-white font-bold rounded-lg hover:bg-so-accent/90"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-so-text text-sm">{branch.name}</span>
                      {branch.isPrimary && (
                        <span className="bg-so-accent/10 text-so-accent text-[10px] font-bold px-2 py-0.5 rounded">
                          Primary
                        </span>
                      )}
                      {!branch.isActive && (
                        <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-so-muted mt-0.5">
                      {branch.address} {branch.phone ? `· ${branch.phone}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative group">
                      <label
                        className={`relative inline-flex items-center ${
                          branch.isPrimary ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={branch.isActive}
                          disabled={branch.isPrimary}
                          onChange={() => handleToggleActive(branch)}
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-so-emerald relative"></div>
                      </label>
                      {branch.isPrimary && (
                        <div className="absolute right-0 top-7 hidden group-hover:block bg-so-nav text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
                          Primary branch cannot be deactivated
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleStartEdit(branch)}
                      className="p-1.5 text-so-muted hover:text-so-accent rounded-lg border border-transparent hover:border-so-border transition-colors"
                      title="Edit Branch"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {warningBranchId === branch.id && (
                <div className="mt-3 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-lg flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span className="flex-1">{warningMsg}</span>
                  <button onClick={() => setWarningBranchId(null)} className="text-amber-600 hover:text-amber-800">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Inline Add Branch Form */}
      {showAddForm && (
        <form onSubmit={handleAddBranch} className="bg-so-surface/70 border border-so-border rounded-xl p-4 space-y-3 animate-in fade-in">
          <h3 className="text-xs font-bold text-so-text uppercase tracking-wider">Add New Branch</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-so-muted mb-1">Branch Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Kondapur Center"
                value={newBranchName}
                onChange={e => setNewBranchName(e.target.value)}
                className="w-full bg-white border border-so-border rounded-lg px-3 py-1.5 text-xs text-so-text focus:outline-none focus:border-so-accent"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-so-muted mb-1">Address</label>
              <input
                type="text"
                placeholder="Street / Area"
                value={newBranchAddress}
                onChange={e => setNewBranchAddress(e.target.value)}
                className="w-full bg-white border border-so-border rounded-lg px-3 py-1.5 text-xs text-so-text focus:outline-none focus:border-so-accent"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-so-muted mb-1">Phone</label>
              <input
                type="text"
                placeholder="Phone number"
                value={newBranchPhone}
                onChange={e => setNewBranchPhone(e.target.value)}
                className="w-full bg-white border border-so-border rounded-lg px-3 py-1.5 text-xs text-so-text focus:outline-none focus:border-so-accent"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs px-3 py-1.5 text-so-muted hover:text-so-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="text-xs px-4 py-1.5 bg-so-accent text-white font-bold rounded-lg hover:bg-so-accent/90 shadow-sm"
            >
              Save Branch
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
