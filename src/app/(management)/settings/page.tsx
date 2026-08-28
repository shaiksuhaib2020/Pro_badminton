'use client'

import { useState } from 'react'
import { mockSettings, mockEvents, mockStudents, Event } from '@/lib/mock-data'
import { isPast, parseISO, format } from 'date-fns'
import { getTodayIST, formatCurrency } from '@/lib/utils'
import { Trash2, X, Pencil } from 'lucide-react'

export default function SettingsPage() {
  const [toastMessage, setToastMessage] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  // Section 1: Facility Profile
  const [courtName, setCourtName] = useState(mockSettings.courtName)

  const [newBatch, setNewBatch] = useState('')

  const handleAddBatch = () => {
    const trimmed = newBatch.trim()
    if (!trimmed) return
    if (mockSettings.batches.includes(trimmed)) {
      showToast("Batch already exists")
      return
    }
    mockSettings.batches.push(trimmed)
    setNewBatch('')
    setRefreshKey(prev => prev + 1)
  }

  const handleDeleteBatch = (batch: string) => {
    if (mockSettings.batches.length <= 1) {
      showToast("At least one batch is required")
      return
    }
    const assignedCount = mockStudents.filter(s => s.currentBatch === batch).length
    if (assignedCount > 0) {
      showToast(`${assignedCount} students are in this batch. Reassign before deleting.`)
      return
    }
    mockSettings.batches = mockSettings.batches.filter(b => b !== batch)
    setRefreshKey(prev => prev + 1)
  }

  const handleSaveFacility = () => {
    mockSettings.courtName = courtName
    showToast("Facility name updated")
  }

  // Section 2: Membership Types
  const [editingMt, setEditingMt] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDuration, setEditDuration] = useState(1)
  const [editUnit, setEditUnit] = useState<'months' | 'days'>('months')
  const [editPrice, setEditPrice] = useState(0)

  const [deleteErrorMt, setDeleteErrorMt] = useState<string | null>(null)
  const [deleteErrorMsg, setDeleteErrorMsg] = useState('')

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
      showToast("Membership type updated")
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
    setRefreshKey(prev => prev + 1)
  }

  const [newMtName, setNewMtName] = useState('')
  const [newMtDuration, setNewMtDuration] = useState(1)
  const [newMtUnit, setNewMtUnit] = useState<'months' | 'days'>('months')
  const [newMtPrice, setNewMtPrice] = useState(0)
  const [newMtError, setNewMtError] = useState('')

  const handleAddMt = () => {
    setNewMtError('')
    if (!newMtName.trim()) return
    if (mockSettings.membershipTypes.find(m => m.name.toLowerCase() === newMtName.toLowerCase())) {
      setNewMtError("A type with this name already exists")
      return
    }
    mockSettings.membershipTypes.push({
      id: crypto.randomUUID(),
      name: newMtName.trim(),
      durationType: newMtUnit,
      duration: Math.max(1, newMtDuration),
      price: Math.max(0, newMtPrice)
    })
    setNewMtName('')
    setNewMtDuration(1)
    setNewMtPrice(0)
    showToast("Membership type added")
    setRefreshKey(prev => prev + 1)
  }

  // Section 3: Events Management
  const [eventName, setEventName] = useState('')
  const [eventType, setEventType] = useState<'tournament' | 'sports-meet' | 'general'>('tournament')
  const [eventDate, setEventDate] = useState(getTodayIST())
  const [eventDesc, setEventDesc] = useState('')
  
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3000)
  }

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventName.trim()) return alert("Name is required")
    if (eventDate < getTodayIST()) return alert("Date cannot be in the past")
    if (!eventDesc.trim()) return alert("Description is required")
    
    mockEvents.push({
      id: crypto.randomUUID(),
      name: eventName.trim(),
      type: eventType,
      date: eventDate,
      description: eventDesc.trim()
    })
    
    showToast("Event added successfully")
    setEventName('')
    setEventType('tournament')
    setEventDate(getTodayIST())
    setEventDesc('')
    setRefreshKey(prev => prev + 1)
  }

  const handleDeleteEvent = (id: string) => {
    const idx = mockEvents.findIndex(e => e.id === id)
    if (idx !== -1) mockEvents.splice(idx, 1)
    setDeleteConfirmId(null)
    setRefreshKey(prev => prev + 1)
  }

  const todayStr = getTodayIST()
  // "Events where date is today or future"
  const upcomingEvents = mockEvents.filter(e => e.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date))
  // "Events where date is in the past"
  const pastEvents = mockEvents.filter(e => e.date < todayStr).sort((a, b) => b.date.localeCompare(a.date))

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'tournament':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-so-accent text-white rounded">Tournament</span>
      case 'sports-meet':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-500 text-white rounded">Sports Meet</span>
      case 'general':
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-white border border-so-border text-so-muted rounded">General</span>
    }
  }

  return (
    <div className="space-y-10 max-w-4xl mx-auto pb-20" key={refreshKey}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-so-text tracking-tight">Settings</h1>
        <p className="text-sm text-so-muted mt-1">Manage facility profile, pricing, and events</p>
      </div>

      {toastMessage && (
        <div className="bg-so-emerald-subtle border border-so-emerald/30 text-so-emerald px-4 py-3 rounded-xl flex items-center justify-center font-medium sticky top-4 z-50 shadow-lg">
          {toastMessage}
        </div>
      )}

      {/* Section 1: Facility Profile */}
      <section className="bg-so-card border border-so-border rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-so-text mb-4">1. Facility Profile</h2>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">Court / Academy Name</label>
            <input
              type="text"
              value={courtName}
              onChange={(e) => setCourtName(e.target.value)}
              className="w-full bg-white border border-so-border rounded-xl py-2.5 px-4 text-sm text-so-text focus:outline-none focus:border-so-accent transition-colors"
            />
          </div>
          <button
            onClick={handleSaveFacility}
            className="px-5 py-2 bg-white border border-so-border text-so-text rounded-lg text-sm font-semibold hover:border-so-accent hover:text-so-accent transition-colors"
          >
            Save Facility Name
          </button>
        </div>
      </section>

      {/* Divider */}
      <hr className="border-so-border" />

      {/* Section 1.5: Batches */}
      <section className="bg-so-card border border-so-border rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-so-text mb-4">Batches</h2>
        <p className="text-xs text-so-muted mb-4">Manage available batches for student enrollment.</p>
        
        <div className="flex flex-wrap gap-2 mb-6">
          {mockSettings.batches.map(batch => (
            <div key={batch} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-so-border bg-so-surface">
              <span className="text-sm font-semibold text-so-text">{batch}</span>
              <button 
                onClick={() => handleDeleteBatch(batch)}
                className="text-so-muted hover:text-so-red hover:bg-so-red-subtle rounded-full p-0.5 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 max-w-sm">
          <input
            type="text"
            placeholder="Batch name..."
            value={newBatch}
            onChange={(e) => setNewBatch(e.target.value)}
            className="flex-1 bg-white border border-so-border rounded-xl py-2 px-4 text-sm text-so-text focus:outline-none focus:border-so-accent transition-colors"
          />
          <button
            onClick={handleAddBatch}
            className="px-4 py-2 bg-so-accent text-white rounded-lg text-sm font-bold hover:bg-so-accent-hover transition-colors"
          >
            + Add
          </button>
        </div>
      </section>

      {/* Divider */}
      <hr className="border-so-border" />

      {/* Section 2: Membership Types */}
      <section className="bg-so-card border border-so-border rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-so-text mb-4">2. Membership Types</h2>
        <p className="text-xs text-so-muted mb-6">Define durations and base prices. Does not affect currently active members.</p>
        
        <div className="space-y-3 mb-6">
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
                    <button onClick={() => handleSaveMt(mt.id)} className="px-4 py-1.5 bg-so-accent text-white rounded-lg text-sm font-bold hover:bg-so-accent-hover">Save</button>
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
                      <button onClick={() => handleDeleteMt(mt.id)} className="p-1.5 text-so-muted hover:text-so-red hover:bg-so-red-subtle rounded-md transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {deleteErrorMt === mt.id && (
                <div className="mt-3 text-xs font-semibold text-so-red bg-so-red-subtle border border-so-red/20 px-3 py-2 rounded-lg">
                  {deleteErrorMsg}
                </div>
              )}
            </div>
          ))}
        </div>

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
            <button onClick={handleAddMt} className="px-4 py-2 bg-so-accent text-white rounded-lg text-sm font-bold hover:bg-so-accent-hover">
              + Add
            </button>
          </div>
          {newMtError && <p className="text-xs font-medium text-so-red mt-2">{newMtError}</p>}
        </div>
      </section>

      {/* Divider */}
      <hr className="border-so-border" />

      {/* Section 3: Events Management */}
      <section className="bg-so-card border border-so-border rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-so-text mb-6">3. Events Management</h2>
        
        {/* Add Event Form */}
        <div className="bg-white border border-so-border rounded-xl p-5 mb-8">
          <h3 className="text-sm font-semibold text-so-text mb-4">Add New Event</h3>
          <form onSubmit={handleAddEvent} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">Event Name</label>
                <input
                  type="text"
                  required
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full bg-white border border-so-border rounded-lg py-2 px-3 text-sm text-so-text focus:outline-none focus:border-so-accent transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">Event Type</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as any)}
                  className="w-full bg-white border border-so-border rounded-lg py-2 px-3 text-sm text-so-text focus:outline-none focus:border-so-accent transition-colors"
                >
                  <option value="tournament">Tournament</option>
                  <option value="sports-meet">Sports Meet</option>
                  <option value="general">General</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">Date</label>
              <input
                type="date"
                required
                min={getTodayIST()}
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full bg-white border border-so-border rounded-lg py-2 px-3 text-sm text-so-text focus:outline-none focus:border-so-accent transition-colors max-w-[200px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">Description</label>
              <textarea
                required
                maxLength={200}
                rows={2}
                value={eventDesc}
                onChange={(e) => setEventDesc(e.target.value)}
                className="w-full bg-white border border-so-border rounded-lg py-2 px-3 text-sm text-so-text focus:outline-none focus:border-so-accent transition-colors resize-none"
              />
              <div className="text-right text-xs text-so-muted mt-1">
                {eventDesc.length}/200
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="px-5 py-2 bg-so-accent text-white rounded-lg text-sm font-bold hover:bg-so-accent-hover transition-colors"
              >
                Add Event
              </button>
            </div>
          </form>
        </div>

        {/* Existing Events List */}
        <div>
          <div className="flex border-b border-so-border mb-4">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'upcoming' ? 'border-so-accent text-so-accent' : 'border-transparent text-so-muted hover:text-so-text'}`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'past' ? 'border-so-accent text-so-accent' : 'border-transparent text-so-muted hover:text-so-text'}`}
            >
              Past
            </button>
          </div>

          <div className="space-y-3">
            {activeTab === 'upcoming' && (
              upcomingEvents.length === 0 ? (
                <div className="py-8 text-center text-sm font-medium text-so-muted border border-dashed border-so-border rounded-xl">
                  No upcoming events. Add one above.
                </div>
              ) : (
                upcomingEvents.map(event => (
                  <div key={event.id} className="bg-white border border-so-border rounded-xl p-4 flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        {getTypeBadge(event.type)}
                        <h4 className="text-sm font-bold text-so-text">{event.name}</h4>
                        <span className="text-xs font-medium text-so-text ml-auto bg-so-bg px-2 py-1 rounded-md border border-so-border">
                          {format(parseISO(event.date), 'dd MMM yyyy')}
                        </span>
                      </div>
                      <p className="text-xs text-so-muted truncate max-w-lg">{event.description}</p>
                    </div>
                    <div>
                      {deleteConfirmId === event.id ? (
                        <div className="flex items-center gap-2 bg-so-red-subtle border border-so-red/20 px-3 py-1.5 rounded-lg">
                          <span className="text-xs font-semibold text-so-red mr-2">Delete this event?</span>
                          <button onClick={() => handleDeleteEvent(event.id)} className="text-xs font-bold text-so-red hover:underline">Yes, Delete</button>
                          <span className="text-so-red/50">|</span>
                          <button onClick={() => setDeleteConfirmId(null)} className="text-xs font-medium text-so-red hover:underline">Cancel</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(event.id)}
                          className="p-2 text-so-muted hover:text-so-red hover:bg-so-red-subtle rounded-lg transition-colors"
                          title="Delete Event"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )
            )}

            {activeTab === 'past' && (
              pastEvents.length === 0 ? (
                <div className="py-8 text-center text-sm font-medium text-so-muted border border-dashed border-so-border rounded-xl">
                  No past events on record.
                </div>
              ) : (
                pastEvents.map(event => (
                  <div key={event.id} className="bg-white border border-so-border rounded-xl p-4 flex items-center justify-between gap-4 opacity-60">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        {getTypeBadge(event.type)}
                        <h4 className="text-sm font-bold text-so-text">{event.name}</h4>
                        <span className="text-xs font-medium text-so-red ml-auto bg-so-red-subtle border border-so-red/20 px-2 py-1 rounded-md">
                          {format(parseISO(event.date), 'dd MMM yyyy')}
                        </span>
                      </div>
                      <p className="text-xs text-so-muted truncate max-w-lg">{event.description}</p>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
