import { ChevronRight } from 'lucide-react'
import type { TemplateMeta } from '@/lib/types/communications'

export default function TemplateCard({ meta, lastSent, onClick }: { meta: TemplateMeta, lastSent: string, onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-so-card border border-so-border rounded-2xl p-5 hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between h-full"
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-so-text">{meta.name}</h3>
          {meta.category === 'automated' ? (
            <span className="px-2 py-0.5 rounded-full bg-so-emerald-subtle text-so-emerald text-xs font-medium">Automated</span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-so-accent-subtle text-so-accent text-xs font-medium">Manual</span>
          )}
        </div>
        <p className="text-sm text-so-muted mb-4">{meta.description}</p>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-so-border text-xs text-so-muted mt-auto">
        <span>{lastSent}</span>
        <ChevronRight size={16} />
      </div>
    </div>
  )
}
