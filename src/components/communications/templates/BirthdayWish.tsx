import { Clock } from 'lucide-react'

export default function BirthdayWish() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 bg-so-yellow-subtle border border-so-yellow/30 p-4 rounded-xl">
        <Clock className="text-so-yellow" size={20} />
        <span className="text-sm font-medium text-so-yellow">Standalone — not yet automated</span>
      </div>

      <div className="bg-so-surface border border-so-border rounded-xl p-5">
        <h3 className="text-sm font-bold text-so-text mb-4">Message Template</h3>
        <p className="text-sm text-so-text whitespace-pre-wrap leading-relaxed">
          🎉 Happy Birthday, <span className="bg-so-accent-subtle text-so-accent rounded px-1 text-xs font-mono">{"{student_name}"}</span>!
          <br /><br />
          Wishing you a wonderful day from everyone at <span className="bg-so-accent-subtle text-so-accent rounded px-1 text-xs font-mono">{"{academy_name}"}</span>. Keep smashing it on the court! 🏸
        </p>
      </div>

      <p className="text-xs text-so-muted">
        This message will be sent automatically on each student's birthday once automation is enabled. Configuration coming soon.
      </p>
    </div>
  )
}
