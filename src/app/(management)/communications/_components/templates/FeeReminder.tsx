import { mockSettings } from '@/lib/mock-data'
import { Zap, ZapOff } from 'lucide-react'

export default function FeeReminder() {
  const isEnabled = mockSettings.feeReminderEnabled

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 bg-so-card border border-so-border p-4 rounded-xl">
        {isEnabled ? (
          <>
            <Zap className="text-so-emerald" size={20} />
            <span className="text-sm font-medium text-so-text">Automated — enabled in Settings</span>
          </>
        ) : (
          <>
            <ZapOff className="text-so-muted" size={20} />
            <span className="text-sm font-medium text-so-muted">Not active — enable in Settings → Communications</span>
          </>
        )}
      </div>

      <div className="bg-so-surface border border-so-border rounded-xl p-5">
        <h3 className="text-sm font-bold text-so-text mb-4">Message Template</h3>
        <p className="text-sm text-so-text whitespace-pre-wrap leading-relaxed">
          Hi <span className="bg-so-accent-subtle text-so-accent rounded px-1 text-xs font-mono">{"{student_name}"}</span>, your coaching fee of ₹<span className="bg-so-accent-subtle text-so-accent rounded px-1 text-xs font-mono">{"{amount}"}</span> at <span className="bg-so-accent-subtle text-so-accent rounded px-1 text-xs font-mono">{"{academy_name}"}</span> is due on <span className="bg-so-accent-subtle text-so-accent rounded px-1 text-xs font-mono">{"{due_date}"}</span>. Please pay to continue your sessions. Thank you!
        </p>
      </div>
    </div>
  )
}
