'use client'

import { Enquiry } from '@/lib/mock-data'
import { X } from 'lucide-react'
import { formatDate } from '@/lib/utils'

type Props = {
  enquiry: Enquiry
  onClose: () => void
}

export default function EnquiryDetailsModal({ enquiry, onClose }: Props) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'not-scheduled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            Not Scheduled
          </span>
        )
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
            Scheduled
          </span>
        )
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            Completed
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="relative bg-so-card border border-so-border rounded-2xl w-full max-w-md flex flex-col shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-so-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-so-text">Enquiry Details</h2>
          <button onClick={onClose} className="text-so-muted hover:text-so-accent transition-colors p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="grid grid-cols-3 gap-y-4 text-sm">
            <div className="col-span-1 text-so-muted font-medium">Name</div>
            <div className="col-span-2 text-so-text font-semibold">{enquiry.name}</div>
            
            <div className="col-span-1 text-so-muted font-medium">Phone</div>
            <div className="col-span-2 text-so-text font-semibold">{enquiry.phone}</div>
            
            <div className="col-span-1 text-so-muted font-medium">Guardian</div>
            <div className="col-span-2 text-so-text font-semibold">{enquiry.guardianName}</div>
            
            <div className="col-span-1 text-so-muted font-medium flex items-center">Status</div>
            <div className="col-span-2">{getStatusBadge(enquiry.status)}</div>
            
            <div className="col-span-1 text-so-muted font-medium">Trial Date</div>
            <div className="col-span-2">
              {enquiry.trialDate ? (
                <span className="text-so-text font-medium">{formatDate(enquiry.trialDate)}</span>
              ) : (
                <span className="text-so-muted">Not scheduled</span>
              )}
            </div>
            
            <div className="col-span-1 text-so-muted font-medium">Notes</div>
            <div className="col-span-2">
              {enquiry.notes ? (
                <span className="text-so-text">{enquiry.notes}</span>
              ) : (
                <span className="text-so-muted">—</span>
              )}
            </div>
            
            <div className="col-span-1 text-so-muted font-medium">Added on</div>
            <div className="col-span-2 text-so-text font-medium">{formatDate(enquiry.createdAt)}</div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-so-border bg-so-card flex justify-end rounded-b-2xl">
          <button onClick={onClose} className="px-5 py-2 text-sm font-semibold bg-so-surface border border-so-border text-so-text rounded-lg hover:bg-so-surface-hover transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
