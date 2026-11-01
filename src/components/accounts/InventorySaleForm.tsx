'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  type InventoryItem,
  type SaleEntry,
  type PaymentMethod,
} from '@/lib/mock-data'
import { getTodayIST, formatCurrency } from '@/lib/utils'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface Props {
  inventoryItems: InventoryItem[]
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

export default function InventorySaleForm({ inventoryItems, existingSale, onClose, onSave }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [quantity, setQuantity] = useState<number>(1)
  const [unitPrice, setUnitPrice] = useState<number>(0)
  const [date, setDate] = useState<string>(getTodayIST())
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [notes, setNotes] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (existingSale?.saleType === 'inventory') {
      const item = inventoryItems.find(i => i.id === existingSale.inventoryItemId) ?? null
      setSelectedItem(item)
      setQuantity(existingSale.quantity ?? 1)
      setUnitPrice(existingSale.unitPrice)
      setDate(existingSale.date)
      setPaymentMethod(existingSale.paymentMethod ?? 'cash')
      setNotes(existingSale.notes ?? '')
    }
  }, [existingSale, inventoryItems])

  const categoryMap = useMemo(() => {
    const map: Record<string, InventoryItem[]> = {}
    inventoryItems.forEach(item => {
      if (!map[item.category]) map[item.category] = []
      map[item.category].push(item)
    })
    return map
  }, [inventoryItems])

  const maxQty = selectedItem
    ? selectedItem.quantity + (existingSale?.quantity ?? 0)
    : 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedItem) {
      setError('Please select a product')
      return
    }

    if (quantity < 1) {
      setError('Quantity must be at least 1')
      return
    }

    if (quantity > maxQty) {
      setError(`Insufficient stock — only ${maxQty} available`)
      return
    }

    if (unitPrice <= 0) {
      setError('Unit price must be greater than 0')
      return
    }

    onSave({
      ...(existingSale?.id ? { id: existingSale.id } : {}),
      saleType: 'inventory',
      itemName: selectedItem.name,
      category: selectedItem.category,
      inventoryItemId: selectedItem.id,
      quantity,
      unitPrice,
      amount: quantity * unitPrice,
      date,
      paymentMethod,
      notes: notes.trim(),
    } as SaleEntry)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!selectedItem ? (
        <div>
          <label className="text-xs font-medium text-so-muted uppercase tracking-wide block mb-2">
            Select Product <span className="text-so-red">*</span>
          </label>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {Object.keys(categoryMap).map(category => (
              <div key={category} className="space-y-1">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(prev => prev === category ? null : category)}
                  className="w-full bg-so-surface border border-so-border rounded-lg px-3 py-2.5 cursor-pointer flex items-center justify-between text-left hover:border-so-accent/50 transition-colors"
                >
                  <span className="text-sm font-medium text-so-text flex items-center">
                    {category}
                    <span className="text-xs text-so-muted ml-2">
                      ({categoryMap[category].length} {categoryMap[category].length === 1 ? 'item' : 'items'})
                    </span>
                  </span>
                  {selectedCategory === category ? (
                    <ChevronDown className="w-4 h-4 text-so-muted" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-so-muted" />
                  )}
                </button>

                {selectedCategory === category && (
                  <div className="pl-2 space-y-1 mt-1">
                    {categoryMap[category].map(item => {
                      const isOutOfStock = item.quantity === 0
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (!isOutOfStock) {
                              setSelectedItem(item)
                              setUnitPrice(item.sellingPrice)
                              setQuantity(1)
                              setError(null)
                            }
                          }}
                          className={`bg-white border border-so-border rounded-lg px-3 py-2 flex items-center justify-between transition-colors ${
                            isOutOfStock
                              ? 'opacity-50 pointer-events-none'
                              : 'cursor-pointer hover:border-so-accent/60 hover:bg-so-surface/30'
                          }`}
                        >
                          <div>
                            <p className="text-sm text-so-text font-medium">{item.name}</p>
                            <p className="text-so-accent text-xs font-semibold mt-0.5">
                              {formatCurrency(item.sellingPrice)}
                            </p>
                          </div>
                          <div>
                            {isOutOfStock ? (
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
                                Out of stock
                              </span>
                            ) : (
                              <span className="text-so-muted text-xs">
                                Stock: {item.quantity}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <label className="text-xs font-medium text-so-muted uppercase tracking-wide block mb-1.5">
            Selected Product
          </label>
          <div className="bg-so-surface border border-so-border rounded-lg p-3 flex items-start justify-between mb-4">
            <div>
              <p className="text-so-text font-medium text-sm">{selectedItem.name}</p>
              <p className="text-so-muted text-xs mt-0.5">{selectedItem.category}</p>
              <p className="text-so-accent text-sm mt-1 font-semibold">
                {formatCurrency(selectedItem.sellingPrice)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedItem(null)
                setSelectedCategory(null)
                setQuantity(1)
                setUnitPrice(0)
                setError(null)
              }}
              className="text-so-accent text-xs underline font-medium hover:text-so-accent-hover cursor-pointer"
            >
              Change
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-medium text-so-muted uppercase tracking-wide block mb-1.5">
                Qty (max {maxQty}) <span className="text-so-red">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={maxQty}
                value={quantity || ''}
                onChange={e => {
                  setQuantity(parseInt(e.target.value) || 0)
                  if (error) setError(null)
                }}
                className="w-full bg-so-surface text-sm text-so-text px-3 py-2.5 border border-so-border rounded-lg focus:outline-none focus:ring-1 focus:ring-so-accent focus:border-so-accent transition-colors"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-so-muted uppercase tracking-wide block mb-1.5">
                Unit Price (₹) <span className="text-so-red">*</span>
              </label>
              <input
                type="number"
                min={0}
                step="any"
                value={unitPrice || ''}
                onChange={e => {
                  setUnitPrice(parseFloat(e.target.value) || 0)
                  if (error) setError(null)
                }}
                className="w-full bg-so-surface text-sm text-so-text px-3 py-2.5 border border-so-border rounded-lg focus:outline-none focus:ring-1 focus:ring-so-accent focus:border-so-accent transition-colors"
                required
              />
            </div>
          </div>

          <div className="text-right mb-4">
            <span className="text-so-muted text-xs uppercase tracking-wide mr-2">Total:</span>
            <span className="text-so-text font-bold text-base">
              {formatCurrency(quantity * unitPrice)}
            </span>
          </div>

          <div className="space-y-4">
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
          </div>
        </div>
      )}

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
