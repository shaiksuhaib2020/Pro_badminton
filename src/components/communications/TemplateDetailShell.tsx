'use client'

import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { TemplateId } from '@/app/(management)/communications/page'
import TemplateHistory from './TemplateHistory'

export default function TemplateDetailShell({ id, name, onBack, children }: { id: TemplateId, name: string, onBack: () => void, children: React.ReactNode }) {
  const [tab, setTab] = useState<'template' | 'history'>('template')

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <button onClick={onBack} className="flex items-center gap-2 text-so-muted hover:text-so-text transition-colors">
        <ArrowLeft size={16} />
        <span className="text-sm font-medium">Communications</span>
      </button>

      <h2 className="text-xl font-bold text-so-text">{name}</h2>

      <div className="flex items-center gap-2 bg-so-surface border border-so-border rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('template')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'template' ? 'bg-white text-so-text shadow-sm' : 'text-so-muted hover:text-so-text'}`}
        >
          Template
        </button>
        <button
          onClick={() => setTab('history')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'history' ? 'bg-white text-so-text shadow-sm' : 'text-so-muted hover:text-so-text'}`}
        >
          History
        </button>
      </div>

      <div className="pt-2">
        {tab === 'template' ? children : <TemplateHistory templateId={id} />}
      </div>
    </div>
  )
}
