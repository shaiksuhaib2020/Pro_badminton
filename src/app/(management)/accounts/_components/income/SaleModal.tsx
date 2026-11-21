'use client'

import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import type { SaleEntry } from '@/lib/types/accounts'
import type { InventoryItem } from '@/lib/types/inventory'
import QuickSaleForm from './QuickSaleForm'
import InventorySaleForm from './InventorySaleForm'

interface Props {
  saleType: 'inventory' | 'quick'
  inventoryItems?: InventoryItem[]
  saving: boolean
  existingSale: SaleEntry | null
  onClose: () => void
  onSave: (entry: Omit<SaleEntry, 'id'>) => void
}

export default function SaleModal({ saleType, inventoryItems = [], existingSale, onClose, onSave, saving }: Props) {
  const titleId = useId()
  const dialog = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  const savingRef = useRef(saving)
  useEffect(() => { closeRef.current = onClose; savingRef.current = saving }, [onClose, saving])
  useEffect(() => {
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const controls = () => Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)') ?? []).filter(el => el.getClientRects().length > 0)
    ;(controls()[0] ?? dialog.current)?.focus()
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); if (!savingRef.current) closeRef.current() }
      if (event.key === 'Tab') {
        const items = controls(), first = items[0], last = items[items.length - 1]
        if (!first) { event.preventDefault(); dialog.current?.focus() }
        else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', keydown)
    return () => { document.removeEventListener('keydown', keydown); trigger?.focus() }
  }, [])
  const type = existingSale?.saleType ?? saleType
  const label = type === 'inventory' ? 'Inventory' : 'Quick'
  return (
    <div className="fixed inset-0 z-50 bg-so-text/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-busy={saving} className="bg-so-card border border-so-border rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-so-border flex items-center justify-between">
          <h2 id={titleId} className="text-lg font-bold text-so-text">
            {existingSale ? 'Edit' : 'Add'} {label} Sale
          </h2>
          <button
            type="button" aria-label="Close" disabled={saving}
            onClick={onClose}
            className="p-1 rounded-lg text-so-grey hover:text-so-accent hover:bg-so-surface transition-colors"
          >
            <X className="w-5 h-5 shrink-0" strokeWidth={1.75} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Form Content */}
          {type === 'inventory' ? (
            <InventorySaleForm
              inventoryItems={inventoryItems}
              existingSale={existingSale}
              onClose={onClose}
              onSave={onSave}
              saving={saving}
            />
          ) : (
            <QuickSaleForm
              existingSale={existingSale}
              onClose={onClose}
              onSave={onSave}
              saving={saving}
            />
          )}
        </div>
      </div>
    </div>
  )
}
