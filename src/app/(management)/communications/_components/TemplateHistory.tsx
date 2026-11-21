'use client'

import { useState } from 'react'
import type { TemplateId } from '@/lib/types/communications'
import { mockMessageLogs } from '@/lib/mock-data'
import type { MessageLog, MessageRecipient } from '@/lib/types/communications'
import { MessageCircle, Search, ChevronDown, ChevronUp, AlertCircle, CheckCircle, Clock, Send, Eye } from 'lucide-react'
import { format, parseISO } from 'date-fns'

/** Build a truncated recipient summary string like "Rahul, Zaid, +6 others" */
function formatRecipientSummary(recipients: MessageRecipient[], recipientCount: number): string {
  if (recipients.length === 0) {
    // Legacy row with no recipients array
    return recipientCount > 0 ? `${recipientCount} students` : 'No recipients'
  }
  const MAX_NAMES = 2
  const names = recipients
    .map(r => (r.name || 'Unknown').split(' ')[0]) // First name only
    .filter((v, i, arr) => arr.indexOf(v) === i)    // Deduplicate display names
  if (names.length <= MAX_NAMES) return names.join(', ')
  return `${names.slice(0, MAX_NAMES).join(', ')} +${names.length - MAX_NAMES} others`
}

/** Get an aggregate outcome badge for a broadcast */
function getOutcomeSummary(recipients: MessageRecipient[]): { label: string; color: string } {
  if (recipients.length === 0) return { label: 'No data', color: 'text-so-muted bg-so-surface' }
  const failed = recipients.filter(r => r.status === 'failed').length
  const allFailed = failed === recipients.length
  if (allFailed) return { label: 'All failed', color: 'text-so-red bg-so-red-subtle' }
  if (failed > 0) return { label: `${failed} failed`, color: 'text-so-yellow bg-so-yellow-subtle' }
  const delivered = recipients.filter(r => r.status === 'delivered' || r.status === 'read').length
  if (delivered === recipients.length) return { label: 'All delivered', color: 'text-so-emerald bg-so-emerald-subtle' }
  return { label: 'Sent', color: 'text-so-blue bg-so-blue/10' }
}

/** Status icon for individual recipient */
function RecipientStatusIcon({ status }: { status: MessageRecipient['status'] }) {
  switch (status) {
    case 'read':      return <Eye className="w-3.5 h-3.5 text-so-emerald" />
    case 'delivered':  return <CheckCircle className="w-3.5 h-3.5 text-so-blue" />
    case 'sent':       return <Send className="w-3.5 h-3.5 text-so-muted" />
    case 'pending':    return <Clock className="w-3.5 h-3.5 text-so-yellow" />
    case 'failed':     return <AlertCircle className="w-3.5 h-3.5 text-so-red" />
    default:           return null
  }
}

function RecipientStatusLabel({ status }: { status: MessageRecipient['status'] }) {
  const labels: Record<string, string> = {
    read: 'Read',
    delivered: 'Delivered',
    sent: 'Sent',
    pending: 'Pending',
    failed: 'Failed',
  }
  return <span className="capitalize text-xs text-so-muted">{labels[status] || status}</span>
}

/** Expandable recipient list for a single log row */
function RecipientDetails({ log, searchQuery }: { log: MessageLog; searchQuery: string }) {
  const recipients = log.recipients ?? []

  if (recipients.length === 0) {
    return (
      <div className="px-6 py-4 bg-so-surface/30 border-t border-so-border">
        <p className="text-sm text-so-muted italic">
          No recipient details available for this record.
          {log.recipientCount > 0 && ` Originally sent to ${log.recipientCount} students.`}
        </p>
      </div>
    )
  }

  const q = searchQuery.toLowerCase().trim()
  const filtered = q
    ? recipients.filter(r =>
        (r.name || '').toLowerCase().includes(q) ||
        (r.phone || '').includes(q)
      )
    : recipients

  return (
    <div className="border-t border-so-border bg-so-surface/20">
      {filtered.length === 0 ? (
        <div className="px-6 py-4 text-sm text-so-muted italic">
          No recipients match &quot;{searchQuery}&quot;
        </div>
      ) : (
        <div className="divide-y divide-so-border/50">
          {filtered.map((r, idx) => (
            <div key={r.studentId || `${r.phone}-${idx}`} className="px-6 py-3 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-so-text truncate" title={r.name || 'Unknown'}>
                  {r.name || <span className="italic text-so-muted">Unknown</span>}
                </p>
                <p className="text-xs text-so-muted">{r.phone || '—'}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <RecipientStatusIcon status={r.status} />
                <RecipientStatusLabel status={r.status} />
              </div>
              {r.status === 'failed' && r.errorMessage && (
                <span className="text-xs text-so-red max-w-[200px] truncate shrink-0" title={r.errorMessage}>
                  {r.errorMessage}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TemplateHistory({ templateId }: { templateId: TemplateId }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

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
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-so-muted" />
        <input
          type="text"
          placeholder="Search recipients by name or phone…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-so-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-so-accent"
        />
      </div>

      {/* History rows */}
      <div className="bg-white border border-so-border rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr] gap-4 px-6 py-3 border-b border-so-border bg-so-surface text-xs font-semibold text-so-muted uppercase tracking-wider">
          <div>Date &amp; Time</div>
          <div>Recipients</div>
          <div>Reason</div>
          <div>Outcome</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-so-border">
          {logs.map(log => {
            const isExpanded = expandedId === log.id
            const outcome = getOutcomeSummary(log.recipients ?? [])

            return (
              <div key={log.id}>
                <div
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr] gap-4 px-6 py-4 items-center hover:bg-so-surface/50 transition-colors cursor-pointer"
                >
                  {/* Date */}
                  <div className="text-sm font-medium text-so-text">
                    {format(parseISO(log.sentAt), 'dd MMM yyyy, hh:mm a')}
                  </div>

                  {/* Recipients summary */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm text-so-text truncate">
                      {formatRecipientSummary(log.recipients ?? [], log.recipientCount)}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-so-muted shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-so-muted shrink-0" />
                    )}
                  </div>

                  {/* Reason */}
                  <div className="text-sm text-so-muted truncate" title={log.reason || '—'}>
                    {log.reason || <span className="italic">—</span>}
                  </div>

                  {/* Outcome badge */}
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${outcome.color}`}>
                      {outcome.label}
                    </span>
                  </div>
                </div>

                {/* Expanded recipient details */}
                {isExpanded && <RecipientDetails log={log} searchQuery={searchQuery} />}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
