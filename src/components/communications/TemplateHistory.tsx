import { TemplateId } from '@/app/(management)/communications/page'
import { mockMessageLogs } from '@/lib/mock-data'
import { MessageCircle } from 'lucide-react'
import { format, parseISO } from 'date-fns'

export default function TemplateHistory({ templateId }: { templateId: TemplateId }) {
  const logs = mockMessageLogs
    .filter(log => log.templateId === templateId)
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())

  if (logs.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-so-muted border border-dashed border-so-border rounded-xl bg-so-surface/30">
        <MessageCircle size={32} className="mb-4 opacity-50" />
        <p className="text-sm">No messages sent with this template yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-so-border rounded-xl shadow-sm overflow-hidden">
      <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1.5fr] gap-4 px-6 py-3 border-b border-so-border bg-so-surface text-xs font-semibold text-so-muted uppercase tracking-wider">
        <div>Date & Time</div>
        <div>Recipients</div>
        <div>Status</div>
        <div>Triggered By</div>
        <div>Note</div>
      </div>
      <div className="divide-y divide-so-border">
        {logs.map((log) => {
          let statusChip = null
          if (log.status === 'sent') statusChip = <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-so-blue/10 text-so-blue">Sent</span>
          else if (log.status === 'delivered') statusChip = <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-so-accent-subtle text-so-accent">Delivered</span>
          else if (log.status === 'read') statusChip = <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-so-emerald-subtle text-so-emerald">Read</span>
          else if (log.status === 'failed') statusChip = <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-so-red-subtle text-so-red">Failed</span>

          return (
            <div key={log.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1.5fr] gap-4 px-6 py-4 items-center hover:bg-so-surface/50 transition-colors">
              <div className="text-sm font-medium text-so-text">
                {format(parseISO(log.sentAt), 'dd MMM yyyy, hh:mm a')}
              </div>
              <div className="text-sm text-so-muted">
                {log.recipientCount} students
              </div>
              <div>
                {statusChip}
              </div>
              <div className="text-sm text-so-muted capitalize">
                {log.triggeredBy}
              </div>
              <div className="text-sm text-so-muted truncate">
                {log.note || '—'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
