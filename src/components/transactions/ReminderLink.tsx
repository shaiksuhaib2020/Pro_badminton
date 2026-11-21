import { MessageCircle } from 'lucide-react'
import { getReminderHref } from './transaction-utils'

export default function ReminderLink({ phone, message, name }: { phone: string; message: string; name: string }) {
  const href = getReminderHref(phone, message)
  const content = <><MessageCircle className="w-4 h-4 shrink-0" strokeWidth={1.75} />Remind Now</>
  const className = 'inline-flex items-center gap-2 px-4 py-2 border border-so-border text-so-muted rounded-lg text-sm font-medium hover:border-so-accent hover:text-so-text transition-colors whitespace-nowrap'
  return href
    ? <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Remind ${name} on WhatsApp`} className={className}>{content}</a>
    : <button type="button" disabled title="A valid Indian mobile number is required" aria-label={`Cannot remind ${name}: invalid mobile number`} className={`${className} disabled:opacity-50 disabled:cursor-not-allowed`}>{content}</button>
}
