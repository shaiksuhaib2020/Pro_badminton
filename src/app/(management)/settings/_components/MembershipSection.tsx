'use client'

import { useState } from 'react'
import { mockSettings, mockStudents } from '@/lib/mock-data'
import { formatCurrency } from '@/lib/utils'
import { Pencil, Trash2, Tag } from 'lucide-react'

export default function MembershipSection() {
  const [, forceUpdate] = useState(0)

  const [editingMt, setEditingMt] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDuration, setEditDuration] = useState(1)
  const [editUnit, setEditUnit] = useState<'months' | 'days'>('months')
  const [editPrice, setEditPrice] = useState(0)

  const [deleteErrorMt, setDeleteErrorMt] = useState<string | null>(null)
  const [deleteErrorMsg, setDeleteErrorMsg] = useState('')

  const [newMtName, setNewMtName] = useState('')
  const [newMtDuration, setNewMtDuration] = useState(1)
  const [newMtUnit, setNewMtUnit] = useState<'months' | 'days'>('months')
  const [newMtPrice, setNewMtPrice] = useState(0)
  const [newMtError, setNewMtError] = useState('')

  const handleEditMt = (mt: any) => {
    setEditingMt(mt.id)
    setEditName(mt.name)
    setEditDuration(mt.duration)
    setEditUnit(mt.durationType)
    setEditPrice(mt.price)
    setDeleteErrorMt(null)
  }

  const handleSaveMt = (id: string) => {
    if (!editName.trim()) return
    const mt = mockSettings.membershipTypes.find(m => m.id === id)
    if (mt) {
      mt.name = editName.trim()
      mt.duration = editDuration
      mt.durationType = editUnit
      mt.price = editPrice
      setEditingMt(null)
      forceUpdate(n => n + 1)
    }
  }

  const handleDeleteMt = (id: string) => {
    const inUse = mockStudents.filter(s => s.membershipTypeId === id).length
    if (inUse > 0) {
      setDeleteErrorMt(id)
      setDeleteErrorMsg(`${inUse} students are on this plan. Reassign before deleting.`)
      return
    }
    if (mockSettings.membershipTypes.length <= 1) {
      setDeleteErrorMt(id)
      setDeleteErrorMsg(`At least one membership type is required`)
      return
    }
    mockSettings.membershipTypes = mockSettings.membershipTypes.filter(m => m.id !== id)
    setDeleteErrorMt(null)
    forceUpdate(n => n + 1)
  }

  const handleAddMt = () => {
    setNewMtError('')
    if (!newMtName.trim()) return
    if (mockSettings.membershipTypes.find(m => m.name.toLowerCase() === newMtName.toLowerCase())) {
      setNewMtError('A type with this name already exists')
      return
    }
    mockSettings.membershipTypes.push({
      id: crypto.randomUUID(),
      name: newMtName.trim(),
      durationType: newMtUnit,
      duration: Math.max(1, newMtDuration),
      price: Math.max(0, newMtPrice),
    })
    setNewMtName('')
    setNewMtDuration(1)
    setNewMtPrice(0)
    forceUpdate(n => n + 1)
  }

  return (
    <div className="bg-so-card border border-so-border rounded-2xl p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-so-accent/10 flex items-center justify-center">
          <Tag className="w-4 h-4 text-so-accent" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-so-text">Membership Types</h2>
          <p className="text-xs text-so-muted">Define durations and base prices. Does not affect currently active members.</p>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {mockSettings.membershipTypes.map(mt => (
          <div key={mt.id} className="bg-white border border-so-border rounded-xl p-4">
            {editingMt === mt.id ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">Name</label>
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-white border border-so-border rounded-lg py-2 px-3 text-sm text-so-text focus:border-so-accent focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">Duration</label>
                    <input type="number" min="1" value={editDuration} onChange={e => setEditDuration(Number(e.target.value) || 1)} className="w-full bg-white border border-so-border rounded-lg py-2 px-3 text-sm text-so-text focus:border-so-accent focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">Unit</label>
                    <select value={editUnit} onChange={e => setEditUnit(e.target.value as any)} className="w-full bg-white border border-so-border rounded-lg py-2 px-3 text-sm text-so-text focus:border-so-accent focus:outline-none">
                      <option value="months">Months</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">Price (₹)</label>
                    <input type="number" min="0" value={editPrice} onChange={e => setEditPrice(Number(e.target.value) || 0)} className="w-full bg-white border border-so-border rounded-lg py-2 px-3 text-sm text-so-text focus:border-so-accent focus:outline-none" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditingMt(null)} className="px-4 py-1.5 text-sm font-semibold text-so-muted hover:text-so-text">Cancel</button>
                  <button onClick={() => handleSaveMt(mt.id)} className="px-4 py-1.5 bg-so-accent text-white rounded-lg text-sm font-bold hover:bg-so-accent/90">Save</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <span className="font-bold text-so-text mr-4">{mt.name}</span>
                  <span className="text-so-muted text-sm">{mt.duration} {mt.durationType}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-so-emerald">{formatCurrency(mt.price)}</span>
                  <div className="flex items-center gap-1 border-l border-so-border pl-4 ml-2">
                    <button onClick={() => handleEditMt(mt)} className="p-1.5 text-so-muted hover:text-so-accent transition-colors" title="Edit">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteMt(mt.id)} className="p-1.5 text-so-muted hover:text-so-red hover:bg-so-red/10 rounded-md transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
            {deleteErrorMt === mt.id && (
              <div className="mt-3 text-xs font-semibold text-so-red bg-so-red/10 border border-so-red/20 px-3 py-2 rounded-lg">
                {deleteErrorMsg}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Form */}
      <div className="bg-white border border-so-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-so-text mb-3">Add New Type</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[150px]">
            <input type="text" placeholder="Type Name" value={newMtName} onChange={e => setNewMtName(e.target.value)} className="w-full bg-white border border-so-border rounded-lg py-2 px-3 text-sm text-so-text focus:border-so-accent focus:outline-none" />
          </div>
          <div className="w-20">
            <input type="number" min="1" placeholder="Dur." value={newMtDuration} onChange={e => setNewMtDuration(Number(e.target.value) || 1)} className="w-full bg-white border border-so-border rounded-lg py-2 px-3 text-sm text-so-text focus:border-so-accent focus:outline-none" />
          </div>
          <div className="w-28">
            <select value={newMtUnit} onChange={e => setNewMtUnit(e.target.value as any)} className="w-full bg-white border border-so-border rounded-lg py-2 px-3 text-sm text-so-text focus:border-so-accent focus:outline-none">
              <option value="months">months</option>
              <option value="days">days</option>
            </select>
          </div>
          <div className="w-28">
            <input type="number" min="0" placeholder="Price" value={newMtPrice} onChange={e => setNewMtPrice(Number(e.target.value) || 0)} className="w-full bg-white border border-so-border rounded-lg py-2 px-3 text-sm text-so-text focus:border-so-accent focus:outline-none" />
          </div>
          <button onClick={handleAddMt} className="px-4 py-2 bg-so-accent text-white rounded-lg text-sm font-bold hover:bg-so-accent/90">
            + Add
          </button>
        </div>
        {newMtError && <p className="text-xs font-medium text-so-red mt-2">{newMtError}</p>}
      </div>
    </div>
  )
}
