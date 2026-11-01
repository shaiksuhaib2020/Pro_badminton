'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { SaleEntry, InventoryItem } from '@/lib/mock-data'
import QuickSaleForm from './QuickSaleForm'
import InventorySaleForm from './InventorySaleForm'

interface Props {
  inventoryItems: InventoryItem[]
  existingSale: SaleEntry | null
  onClose: () => void
  onSave: (entry: SaleEntry) => void
}

export default function SaleModal({ inventoryItems, existingSale, onClose, onSave }: Props) {
  const [activeTab, setActiveTab] = useState<'inventory' | 'quick'>(
    existingSale?.saleType ?? 'inventory'
  )

  const isEditing = !!existingSale

  const tabs: { key: 'inventory' | 'quick'; label: string }[] = [
    { key: 'inventory', label: 'Inventory Sale' },
    { key: 'quick', label: 'Quick Sale' },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-so-card border border-so-border rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-so-border sticky top-0 bg-so-card z-10">
          <h2 className="text-lg font-bold text-so-text">
            {isEditing ? 'Edit Sale' : 'Record Sale'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-so-grey hover:text-so-accent hover:bg-so-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Segment tabs */}
          <div className="flex bg-so-surface border border-so-border rounded-xl p-1 w-full mb-6 shadow-sm">
            {tabs.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  isEditing ? 'pointer-events-none' : ''
                } ${
                  activeTab === tab.key
                    ? 'bg-so-accent text-white shadow-sm'
                    : `text-so-muted hover:text-so-text ${isEditing ? 'opacity-40' : ''}`
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Form Content */}
          {activeTab === 'inventory' ? (
            <InventorySaleForm
              inventoryItems={inventoryItems}
              existingSale={existingSale}
              onClose={onClose}
              onSave={onSave}
            />
          ) : (
            <QuickSaleForm
              existingSale={existingSale}
              onClose={onClose}
              onSave={onSave}
            />
          )}
        </div>
      </div>
    </div>
  )
}
