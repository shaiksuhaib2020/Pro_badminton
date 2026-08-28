'use client'

import { mockEvents } from '@/lib/mock-data'
import { isPast, isToday, parseISO, format, differenceInDays } from 'date-fns'
import { CalendarX } from 'lucide-react'

export default function EventsPage() {
  const visibleEvents = mockEvents.filter(e => {
    const eventDate = parseISO(e.date)
    return !isPast(eventDate) || isToday(eventDate)
  })

  const sortedEvents = [...visibleEvents].sort((a, b) => 
    parseISO(a.date).getTime() - parseISO(b.date).getTime()
  )

  const getDaysLeftChip = (dateStr: string) => {
    const daysLeft = differenceInDays(parseISO(dateStr), new Date())
    
    if (daysLeft === 0) {
      return <span className="px-2.5 py-1 text-xs font-semibold bg-so-emerald-subtle text-so-emerald rounded-full">Today</span>
    }
    if (daysLeft === 1) {
      return <span className="px-2.5 py-1 text-xs font-semibold bg-so-yellow-subtle text-so-yellow rounded-full">Tomorrow</span>
    }
    if (daysLeft <= 7) {
      return <span className="px-2.5 py-1 text-xs font-semibold bg-so-yellow-subtle text-so-yellow rounded-full">{daysLeft} days left</span>
    }
    return <span className="px-2.5 py-1 text-xs font-semibold bg-white border border-so-border text-so-muted rounded-full">{daysLeft} days left</span>
  }

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
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-so-text tracking-tight">Upcoming Events</h1>
        <p className="text-sm font-medium text-so-muted">{visibleEvents.length} upcoming</p>
      </div>

      {visibleEvents.length === 0 ? (
        <div className="py-32 flex flex-col items-center justify-center text-center">
          <CalendarX className="w-16 h-16 text-so-border mb-5" strokeWidth={1.5} />
          <h2 className="text-lg font-bold text-so-text mb-2">No Upcoming Events</h2>
          <p className="text-sm text-so-muted max-w-sm">Events added in Settings will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedEvents.map(event => (
            <div key={event.id} className="bg-so-card border border-so-border rounded-2xl p-6 flex flex-col h-full hover:border-so-accent/40 transition-colors shadow-sm group">
              
              {/* Card Header */}
              <div className="flex items-start justify-between mb-4">
                {getTypeBadge(event.type)}
                {getDaysLeftChip(event.date)}
              </div>

              {/* Card Body */}
              <div className="flex-1">
                <h3 className="text-lg font-bold text-so-text mb-2 tracking-tight group-hover:text-so-accent transition-colors">
                  {event.name}
                </h3>
                <p className="text-sm text-so-muted line-clamp-2 leading-relaxed">
                  {event.description}
                </p>
              </div>

              {/* Card Footer */}
              <div className="mt-6 pt-4 border-t border-so-border flex items-center">
                <span className="text-sm font-semibold text-so-text">
                  {format(parseISO(event.date), 'dd MMM yyyy')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
