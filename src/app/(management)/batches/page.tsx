'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { mockBatches, mockSettings, mockStudents, Batch } from '@/lib/mock-data'
import { Plus, X, Trash2, Pencil, CalendarDays, IndianRupee, Users } from 'lucide-react'

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function BatchesPage() {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [fees, setFees] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const [editingBatch, setEditingBatch] = useState<Batch | null>(null)
  const [editName, setEditName] = useState('')
  const [editDays, setEditDays] = useState<string[]>([])
  const [editFees, setEditFees] = useState('')
  const [editDescription, setEditDescription] = useState('')

  
  const [, forceUpdate] = useState(0)
  const refresh = () => forceUpdate(n => n + 1)

  const handleToggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day))
    } else {
      setSelectedDays([...selectedDays, day])
    }
  }

  const handleCreate = () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Batch name is required.')
      return
    }
    if (selectedDays.length === 0) {
      setError('Select at least one day.')
      return
    }
    if (mockBatches.some(b => b.name.toLowerCase() === trimmedName.toLowerCase())) {
      setError('A batch with this name already exists.')
      return
    }
    
    setError('')
    const newBatch: Batch = {
      id: crypto.randomUUID(),
      name: trimmedName,
      days: selectedDays,
      fees: fees ? Number(fees) : undefined,
      description: description.trim() || undefined,
      branchId: 'branch-1' // Defaulting to main branch
    }
    mockBatches.push(newBatch)
    mockSettings.batches.push(trimmedName)
    
    setName('')
    setSelectedDays([])
    setFees('')
    setDescription('')
    setShowAdd(false)
    refresh()
  }


  const handleEditClick = (b: Batch, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingBatch(b)
    setEditName(b.name)
    setEditDays(b.days)
    setEditFees(b.fees ? String(b.fees) : '')
    setEditDescription(b.description || '')
    setError('')
  }

  const handleEditSave = () => {
    if (!editingBatch) return
    const trimmedName = editName.trim()
    if (!trimmedName) {
      setError('Batch name is required.')
      return
    }
    if (editDays.length === 0) {
      setError('Select at least one day.')
      return
    }
    // Check duplicate excluding self
    if (mockBatches.some(b => b.id !== editingBatch.id && b.name.toLowerCase() === trimmedName.toLowerCase())) {
      setError('A batch with this name already exists.')
      return
    }
    
    setError('')
    const oldName = editingBatch.name

    // Update the batch object in place
    Object.assign(editingBatch, {
      name: trimmedName,
      days: editDays,
      fees: editFees ? Number(editFees) : undefined,
      description: editDescription.trim() || undefined
    })

    // If name changed, sync settings and students
    if (oldName !== trimmedName) {
      const idx = mockSettings.batches.indexOf(oldName)
      if (idx !== -1) mockSettings.batches[idx] = trimmedName
      
      mockStudents.forEach(s => {
        if (s.currentBatch === oldName) s.currentBatch = trimmedName
      })
    }

    setEditingBatch(null)
    refresh()
  }

  const handleDelete = (id: string, batchName: string) => {
    const assignedCount = mockStudents.filter(s => s.currentBatch === batchName && s.status !== 'dropout').length
    if (assignedCount > 0) {
      alert(`Cannot delete — ${assignedCount} students are assigned to this batch.`)
      setDeleteConfirmId(null)
      return
    }
    
    const idx = mockBatches.findIndex(b => b.id === id)
    if (idx !== -1) mockBatches.splice(idx, 1)
    
    mockSettings.batches = mockSettings.batches.filter(b => b !== batchName)
    setDeleteConfirmId(null)
    refresh()
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-so-text">Batches</h1>
          <p className="text-so-muted text-sm mt-1">Manage training schedules and student groups</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-so-accent text-so-accent-text rounded-lg text-sm font-medium hover:bg-so-accent-hover transition-colors"
        >
          <Plus className="w-4 h-4" /> Create Batch
        </button>
      </div>

      {/* Grid */}
      {mockBatches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-so-card border border-so-border rounded-xl shadow-sm">
          <CalendarDays className="w-10 h-10 text-so-border mb-3" />
          <p className="text-so-text font-medium">No batches created yet</p>
          <button onClick={() => setShowAdd(true)} className="text-sm text-so-accent mt-2 hover:underline">
            Create your first batch
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockBatches.map(batch => {
            const studentCount = mockStudents.filter(s => s.currentBatch === batch.name && s.status !== 'dropout').length
            
            return (
              <div
                key={batch.id}
                onClick={() => {
                  if (deleteConfirmId !== batch.id) {
                    router.push(`/batches/${batch.id}`)
                  }
                }}
                className="bg-so-card border border-so-border rounded-xl p-5 shadow-sm hover:shadow-md hover:border-so-accent/50 transition-all cursor-pointer flex flex-col group relative"
              >
                {/* Delete button */}
                <div className="absolute top-4 right-4 flex gap-1" onClick={(e) => e.stopPropagation()}>
                  {deleteConfirmId === batch.id ? (
                    <div className="flex gap-2 items-center bg-so-surface border border-so-border px-2 py-1 rounded-md shadow-sm">
                      <span className="text-xs font-medium text-so-text">Delete?</span>
                      <button onClick={() => handleDelete(batch.id, batch.name)} className="text-xs text-red-600 font-bold hover:underline">Yes</button>
                      <button onClick={() => setDeleteConfirmId(null)} className="text-xs text-so-muted hover:underline">No</button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={(e) => handleEditClick(batch, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-so-muted hover:text-so-accent hover:bg-so-accent/10 rounded-lg"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(batch.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-so-muted hover:text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-so-text mb-3 pr-8">{batch.name}</h3>
                
                {/* Days chips */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(shortDay => {
                    const isSelected = batch.days.some(d => d.startsWith(shortDay))
                    if (!isSelected) return null
                    return (
                      <span key={shortDay} className="px-2 py-0.5 rounded-full text-xs font-medium bg-so-accent/10 text-so-accent border border-so-accent/20">
                        {shortDay}
                      </span>
                    )
                  })}
                </div>

                {batch.description && (
                  <p className="text-sm text-so-muted mb-2 line-clamp-2">{batch.description}</p>
                )}

                <div className="flex-1"></div>

                <div className="flex items-center justify-between border-t border-so-border pt-4 mt-4">
                  <div className="flex items-center gap-1.5 text-sm text-so-text font-medium bg-so-surface px-2.5 py-1 rounded-lg">
                    <Users className="w-4 h-4 text-so-muted" />
                    {studentCount} {studentCount === 1 ? 'student' : 'students'}
                  </div>
                  {batch.fees ? (
                    <div className="flex items-center gap-1 text-sm font-semibold text-emerald-600">
                      ₹{batch.fees.toLocaleString('en-IN')}<span className="text-xs font-normal text-so-muted">/mo</span>
                    </div>
                  ) : (
                    <span className="text-xs text-so-muted">Default fee</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-so-card flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-so-border bg-so-card z-10">
              <h2 className="font-semibold text-so-text">Create Batch</h2>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-so-muted" /></button>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto space-y-5">
              <div>
                <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">
                  Batch Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Morning Pro"
                  className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">
                  Schedule Days <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map(day => {
                    const active = selectedDays.includes(day)
                    return (
                      <button
                        key={day}
                        onClick={() => handleToggleDay(day)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          active 
                            ? 'bg-so-accent text-so-accent-text border border-so-accent' 
                            : 'bg-so-surface border border-so-border text-so-muted hover:text-so-text'
                        }`}
                      >
                        {day.substring(0,3)}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">
                  Fees (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IndianRupee className="w-4 h-4 text-so-muted" />
                  </div>
                  <input
                    type="number"
                    min={0}
                    value={fees}
                    onChange={e => setFees(e.target.value)}
                    placeholder="Leave blank if using membership fee"
                    className="w-full bg-white border border-so-border rounded-lg pl-9 pr-3 py-2 text-sm text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">
                  Description / Time Slot (Optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. 6:00 AM – 8:00 AM"
                  className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-accent"
                />
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>

            <div className="p-5 border-t border-so-border flex gap-3 bg-so-card">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 py-2.5 border border-so-border rounded-lg text-sm font-medium text-so-muted hover:text-so-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 py-2.5 bg-so-accent text-so-accent-text rounded-lg text-sm font-medium hover:bg-so-accent-hover transition-colors"
              >
                Create Batch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingBatch(null)} />
          <div className="relative w-full max-w-md rounded-2xl bg-so-card flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-so-border bg-so-card z-10">
              <h2 className="font-semibold text-so-text">Edit Batch</h2>
              <button onClick={() => setEditingBatch(null)}><X className="w-5 h-5 text-so-muted" /></button>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto space-y-5">
              <div>
                <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">
                  Batch Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="e.g. Morning Pro"
                  className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">
                  Schedule Days <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map(day => {
                    const active = editDays.includes(day)
                    return (
                      <button
                        key={day}
                        onClick={() => {
                          if (editDays.includes(day)) {
                            setEditDays(editDays.filter(d => d !== day))
                          } else {
                            setEditDays([...editDays, day])
                          }
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          active 
                            ? 'bg-so-accent text-so-accent-text border border-so-accent' 
                            : 'bg-so-surface border border-so-border text-so-muted hover:text-so-text'
                        }`}
                      >
                        {day.substring(0,3)}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">
                  Fees (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IndianRupee className="w-4 h-4 text-so-muted" />
                  </div>
                  <input
                    type="number"
                    min={0}
                    value={editFees}
                    onChange={e => setEditFees(e.target.value)}
                    placeholder="Leave blank if using membership fee"
                    className="w-full bg-white border border-so-border rounded-lg pl-9 pr-3 py-2 text-sm text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">
                  Description / Time Slot (Optional)
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  placeholder="e.g. 6:00 AM – 8:00 AM"
                  className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-accent"
                />
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>

            <div className="p-5 border-t border-so-border flex gap-3 bg-so-card">
              <button
                onClick={() => setEditingBatch(null)}
                className="flex-1 py-2.5 border border-so-border rounded-lg text-sm font-medium text-so-muted hover:text-so-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                className="flex-1 py-2.5 bg-so-accent text-so-accent-text rounded-lg text-sm font-medium hover:bg-so-accent-hover transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
