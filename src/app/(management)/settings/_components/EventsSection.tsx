'use client'

import { useState } from 'react'
import { mockEvents, Event } from '@/lib/mock-data'
import { getTodayIST } from '@/lib/utils'
import { Calendar, Trash2 } from 'lucide-react'
import { parseISO, format } from 'date-fns'

export default function EventsSection() {
  const [, forceUpdate] = useState(0)

  const [eventName, setEventName] = useState('')
  const [eventType, setEventType] = useState<'tournament' | 'sports-meet' | 'general'>('tournament')
  const [eventDate, setEventDate] = useState(getTodayIST())
  const [eventDesc, setEventDesc] = useState('')

  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState('')

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventName.trim()) return alert('Name is required')
    if (eventDate < getTodayIST()) return alert('Date cannot be in the past')
    if (!eventDesc.trim()) return alert('Description is required')

    mockEvents.push({
      id: crypto.randomUUID(),
      name: eventName.trim(),
      type: eventType,
      date: eventDate,
      description: eventDesc.trim(),
    })

    setToastMsg('Event added successfully')
    setTimeout(() => setToastMsg(''), 2500)
    setEventName('')
    setEventType('tournament')
    setEventDate(getTodayIST())
    setEventDesc('')
    forceUpdate(n => n + 1)
  }

  const handleDeleteEvent = (id: string) => {
    const idx = mockEvents.findIndex(e => e.id === id)
    if (idx !== -1) mockEvents.splice(idx, 1)
    setDeleteConfirmId(null)
    forceUpdate(n => n + 1)
  }

  const todayStr = getTodayIST()
  const upcomingEvents = mockEvents.filter(e => e.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date))
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
    <div className="bg-so-card border border-so-border rounded-2xl p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-so-accent/10 flex items-center justify-center">
          <Calendar className="w-4 h-4 text-so-accent" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-so-text">Events Management</h2>
          <p className="text-xs text-so-muted">Organize tournaments, sports meets, and announcements</p>
        </div>
      </div>

      {toastMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3 py-2 rounded-lg animate-in fade-in">
          {toastMsg}
        </div>
      )}

      {/* Add Form */}
      <div className="bg-white border border-so-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-so-text mb-4">Add New Event</h3>
        <form onSubmit={handleAddEvent} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">Event Name</label>
              <input
                type="text"
                required
                value={eventName}
                onChange={e => setEventName(e.target.value)}
                className="w-full bg-white border border-so-border rounded-lg py-2 px-3 text-sm text-so-text focus:outline-none focus:border-so-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">Event Type</label>
              <select
                value={eventType}
                onChange={e => setEventType(e.target.value as any)}
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
              onChange={e => setEventDate(e.target.value)}
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
              onChange={e => setEventDesc(e.target.value)}
              className="w-full bg-white border border-so-border rounded-lg py-2 px-3 text-sm text-so-text focus:outline-none focus:border-so-accent transition-colors resize-none"
            />
            <div className="text-right text-xs text-so-muted mt-1">
              {eventDesc.length}/200
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="px-5 py-2 bg-so-accent text-white rounded-lg text-sm font-bold hover:bg-so-accent/90 transition-colors"
            >
              Add Event
            </button>
          </div>
        </form>
      </div>

      {/* Events List Tabs */}
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
                      <span className="text-xs font-medium text-so-text ml-auto bg-so-surface px-2 py-1 rounded-md border border-so-border">
                        {format(parseISO(event.date), 'dd MMM yyyy')}
                      </span>
                    </div>
                    <p className="text-xs text-so-muted truncate max-w-lg">{event.description}</p>
                  </div>
                  <div>
                    {deleteConfirmId === event.id ? (
                      <div className="flex items-center gap-2 bg-so-red/10 border border-so-red/20 px-3 py-1.5 rounded-lg">
                        <span className="text-xs font-semibold text-so-red mr-2">Delete this event?</span>
                        <button onClick={() => handleDeleteEvent(event.id)} className="text-xs font-bold text-so-red hover:underline">Yes, Delete</button>
                        <span className="text-so-red/50">|</span>
                        <button onClick={() => setDeleteConfirmId(null)} className="text-xs font-medium text-so-red hover:underline">Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(event.id)}
                        className="p-2 text-so-muted hover:text-so-red hover:bg-so-red/10 rounded-lg transition-colors"
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
                      <span className="text-xs font-medium text-so-red ml-auto bg-so-red/10 border border-so-red/20 px-2 py-1 rounded-md">
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
    </div>
  )
}
