'use client'

import { useState } from 'react'
import type { SaleEntry, PaymentMethod } from '@/lib/mock-data'
import { getTodayIST } from '@/lib/utils'

interface Props {
  existingSale?: SaleEntry | null
  onClose: () => void
  onSave: (entry: SaleEntry) => void
}

const PAYMENT_METHODS: { key: PaymentMethod; label: string }[] = [
  { key: 'cash', label: 'Cash' },
  { key: 'upi', label: 'UPI' },
  { key: 'card', label: 'Card' },
  { key: 'other', label: 'Other' },
]

export default function QuickSaleForm({ existingSale, onClose, onSave }: Props) {
  const [itemName, setItemName] = useState(existingSale?.itemName || '')
  const [price, setPrice] = useState<number>(existingSale?.amount || 0)
  const [date, setDate] = useState(existingSale?.date || getTodayIST())
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(existingSale?.paymentMethod || 'cash')
  const [notes, setNotes] = useState(existingSale?.notes || '')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!itemName.trim()) {
      setError('Item name is required')
      return
    }

    if (price <= 0) {
      setError('Price must be greater than 0')
      return
    }

    onSave({
      ...(existingSale?.id ? { id: existingSale.id } : {}),
      saleType: 'quick',
      itemName: itemName.trim(),
      category: 'Quick Sale',
      unitPrice: price,
      amount: price,
      date,
      paymentMethod,
      notes: notes.trim(),
    } as SaleEntry)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-medium text-so-muted uppercase tracking-wide block mb-1.5">
          Item Name <span className="text-so-red">*</span>
        </label>
        <input
          type="text"
          placeholder="e.g. Extra session, tournament fee"
          value={itemName}
          onChange={e => {
            setItemName(e.target.value)
            if (error) setError(null)
          }}
          className="w-full bg-so-surface text-sm text-so-text placeholder:text-so-grey px-3 py-2.5 border border-so-border rounded-lg focus:outline-none focus:ring-1 focus:ring-so-accent focus:border-so-accent transition-colors"
          required
        />
      </div>

      <div>
        <label className="text-xs font-medium text-so-muted uppercase tracking-wide block mb-1.5">
          Price (₹) <span className="text-so-red">*</span>
        </label>
        <input
          type="number"
          min="0"
          step="any"
          placeholder="0"
          value={price || ''}
          onChange={e => {
            setPrice(parseFloat(e.target.value) || 0)
            if (error) setError(null)
          }}
          className="w-full bg-so-surface text-sm text-so-text placeholder:text-so-grey px-3 py-2.5 border border-so-border rounded-lg focus:outline-none focus:ring-1 focus:ring-so-accent focus:border-so-accent transition-colors"
          required
        />
      </div>

      <div>
        <label className="text-xs font-medium text-so-muted uppercase tracking-wide block mb-1.5">
          Date
        </label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full bg-so-surface text-sm text-so-text px-3 py-2.5 border border-so-border rounded-lg focus:outline-none focus:ring-1 focus:ring-so-accent focus:border-so-accent transition-colors"
          required
        />
      </div>

      <div>
        <label className="text-xs font-medium text-so-muted uppercase tracking-wide block mb-1.5">
          Payment Method
        </label>
        <div className="grid grid-cols-4 gap-2">
          {PAYMENT_METHODS.map(method => (
            <button
              key={method.key}
              type="button"
              onClick={() => setPaymentMethod(method.key)}
              className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all border ${
                paymentMethod === method.key
                  ? 'bg-so-accent text-white border-so-accent shadow-sm'
                  : 'bg-so-surface text-so-muted border-so-border hover:text-so-text hover:border-so-accent/50'
              }`}
            >
              {method.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-so-muted uppercase tracking-wide block mb-1.5">
          Notes
        </label>
        <input
          type="text"
          placeholder="Optional note"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="w-full bg-so-surface text-sm text-so-text placeholder:text-so-grey px-3 py-2.5 border border-so-border rounded-lg focus:outline-none focus:ring-1 focus:ring-so-accent focus:border-so-accent transition-colors"
        />
      </div>

      {error && (
        <p className="text-so-red text-sm font-medium">{error}</p>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-so-border">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-so-border text-so-muted rounded-lg text-sm font-medium hover:border-so-accent hover:text-so-text transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-so-accent text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
        >
          Save Sale
        </button>
      </div>
    </form>
  )
}
