'use client'

import { useState } from 'react'
import { X, Plus, AlertCircle, Check } from 'lucide-react'
import type { AccountEntry } from '@/lib/types/accounts'
import type { PaymentMethod } from '@/lib/types/payments'
import { EXPENSE_CATEGORIES } from '@/lib/constants/accounts'
import { getTodayIST } from '@/lib/utils'

interface ExpenseModalProps {
  entry?: AccountEntry | null
  customCategories: string[]
  onClose: () => void
  onSave: (entry: AccountEntry) => void
  onAddCategory: (name: string) => Promise<{ success: boolean; error?: string }>
  isSaving?: boolean
}

const PAYMENT_METHODS: { key: PaymentMethod; label: string }[] = [
  { key: 'cash', label: 'Cash' },
  { key: 'upi', label: 'UPI' },
  { key: 'card', label: 'Card' },
  { key: 'other', label: 'Other' },
]

export default function ExpenseModal({
  entry,
  customCategories,
  onClose,
  onSave,
  onAddCategory,
  isSaving = false,
}: ExpenseModalProps) {
  const isEdit = !!entry
  const title = isEdit ? 'Edit Expense' : 'Add Expense'

  // Dynamic category list (built-in + custom)
  const [categories, setCategories] = useState<string[]>(() => {
    const combined = [
      ...EXPENSE_CATEGORIES,
      ...customCategories,
    ]
    return Array.from(new Set(combined))
  })

  // Form states
  const [description, setDescription] = useState(entry?.description || '')
  const [date, setDate] = useState(entry?.date || getTodayIST())
  const [category, setCategory] = useState(entry?.category || categories[0] || 'Miscellaneous')
  const [amount, setAmount] = useState(entry?.amount ? entry.amount.toString() : '')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | undefined>(
    entry?.paymentMethod
  )
  const [vendor, setVendor] = useState(entry?.vendor || '')
  const [notes, setNotes] = useState(entry?.notes || '')
  const [error, setError] = useState<string | null>(null)

  // Inline custom category creation state
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [savingCategory, setSavingCategory] = useState(false)

  const handleSaveCustomCategory = async () => {
    if (savingCategory) return
    const trimmed = newCategoryName.trim()
    if (!trimmed) {
      setCategoryError('Category name cannot be empty')
      return
    }

    const isDuplicate = categories.some(
      c => c.toLowerCase() === trimmed.toLowerCase()
    )
    if (isDuplicate) {
      setCategoryError('Category already exists')
      return
    }

    setSavingCategory(true)
    try {
      const res = await onAddCategory(trimmed)
      if (!res.success) {
        setCategoryError(res.error || 'Could not add category')
        return
      }

      setCategories(prev => [...prev, trimmed])
      setCategory(trimmed)
      setNewCategoryName('')
      setCategoryError(null)
      setShowAddCategory(false)
    } catch (err: unknown) {
      setCategoryError(err instanceof Error ? err.message : 'Could not add category')
    } finally {
      setSavingCategory(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!description.trim()) {
      setError('Expense Name / Description is required')
      return
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Amount must be greater than 0')
      return
    }

    const savedEntry: AccountEntry = {
      id: entry?.id || crypto.randomUUID(),
      date,
      description: description.trim(),
      category,
      amount: numAmount,
      paymentMethod: paymentMethod,
      vendor: vendor.trim() || undefined,
      notes: notes.trim() || undefined,
    }

    onSave(savedEntry)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-so-card border border-so-border rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-so-border sticky top-0 bg-so-card z-10">
          <h2 className="text-lg font-bold text-so-text">{title}</h2>
          <button
            onClick={onClose}
            type="button"
            className="p-1 rounded-lg text-so-grey hover:text-so-accent hover:bg-so-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Expense Name / Description (Required) */}
          <div>
            <label className="text-xs font-medium text-so-muted uppercase tracking-wide block mb-1.5">
              Expense Name / Description <span className="text-so-red">*</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={e => {
                setDescription(e.target.value)
                if (error) setError(null)
              }}
              placeholder="e.g. Shuttlecocks purchase, Court repair"
              className="w-full bg-so-surface text-sm text-so-text placeholder:text-so-grey px-3 py-2.5 border border-so-border rounded-lg focus:outline-none focus:ring-1 focus:ring-so-accent focus:border-so-accent transition-colors"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Date (Defaults to today in IST) */}
            <div>
              <label className="text-xs font-medium text-so-muted uppercase tracking-wide block mb-1.5">
                Date <span className="text-so-red">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-so-surface text-sm text-so-text px-3 py-2.5 border border-so-border rounded-lg focus:outline-none focus:ring-1 focus:ring-so-accent focus:border-so-accent transition-colors"
                required
              />
            </div>

            {/* Amount (Required) */}
            <div>
              <label className="text-xs font-medium text-so-muted uppercase tracking-wide block mb-1.5">
                Amount (₹) <span className="text-so-red">*</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                placeholder="0"
                value={amount}
                onChange={e => {
                  setAmount(e.target.value)
                  if (error) setError(null)
                }}
                className="w-full bg-so-surface text-sm text-so-text placeholder:text-so-grey px-3 py-2.5 border border-so-border rounded-lg focus:outline-none focus:ring-1 focus:ring-so-accent focus:border-so-accent transition-colors"
                required
              />
            </div>
          </div>

          {/* Category & Add New Category */}
          <div>
            <label className="text-xs font-medium text-so-muted uppercase tracking-wide block mb-1.5">
              Category <span className="text-so-red">*</span>
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-so-surface text-sm text-so-text px-3 py-2.5 border border-so-border rounded-lg focus:outline-none focus:ring-1 focus:ring-so-accent focus:border-so-accent transition-colors cursor-pointer"
            >
              {categories.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Compact Add New Category Option */}
            {!showAddCategory ? (
              <button
                type="button"
                onClick={() => {
                  setShowAddCategory(true)
                  setCategoryError(null)
                }}
                className="mt-1.5 text-xs text-so-accent font-semibold hover:text-so-accent-hover inline-flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add New Category
              </button>
            ) : (
              <div className="mt-2 p-2.5 bg-so-surface border border-so-border rounded-lg space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={e => {
                      setNewCategoryName(e.target.value)
                      if (categoryError) setCategoryError(null)
                    }}
                    placeholder="New category name"
                    className="flex-1 bg-white text-xs text-so-text placeholder:text-so-grey px-2.5 py-1.5 border border-so-border rounded-md focus:outline-none focus:border-so-accent"
                    autoFocus
                  />
                  <button
                    type="button"
                    disabled={savingCategory}
                    onClick={handleSaveCustomCategory}
                    className="px-2.5 py-1.5 bg-so-accent text-white text-xs font-semibold rounded-md hover:bg-so-accent-hover transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <Check className="w-3 h-3" /> Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCategory(false)
                      setNewCategoryName('')
                      setCategoryError(null)
                    }}
                    className="px-2 py-1.5 border border-so-border text-so-muted text-xs rounded-md hover:text-so-text transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                {categoryError && (
                  <p className="text-so-red text-[11px] font-medium">{categoryError}</p>
                )}
              </div>
            )}
          </div>

          {/* Payment Method (Optional) */}
          <div>
            <label className="text-xs font-medium text-so-muted uppercase tracking-wide block mb-1.5">
              Payment Method <span className="text-[11px] font-normal normal-case text-so-muted">(Optional)</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PAYMENT_METHODS.map(method => (
                <button
                  key={method.key}
                  type="button"
                  onClick={() =>
                    setPaymentMethod(prev => (prev === method.key ? undefined : method.key))
                  }
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

          {/* Vendor (Optional) */}
          <div>
            <label className="text-xs font-medium text-so-muted uppercase tracking-wide block mb-1.5">
              Vendor <span className="text-[11px] font-normal normal-case text-so-muted">(Optional)</span>
            </label>
            <input
              type="text"
              value={vendor}
              onChange={e => setVendor(e.target.value)}
              placeholder="e.g. Victor Sports, Badminton World, City Power"
              className="w-full bg-so-surface text-sm text-so-text placeholder:text-so-grey px-3 py-2.5 border border-so-border rounded-lg focus:outline-none focus:ring-1 focus:ring-so-accent focus:border-so-accent transition-colors"
            />
          </div>

          {/* Notes (Optional) */}
          <div>
            <label className="text-xs font-medium text-so-muted uppercase tracking-wide block mb-1.5">
              Notes <span className="text-[11px] font-normal normal-case text-so-muted">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional notes or details"
              className="w-full bg-so-surface text-sm text-so-text placeholder:text-so-grey px-3 py-2.5 border border-so-border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-so-accent focus:border-so-accent transition-colors"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-so-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 border border-so-border text-so-muted rounded-lg text-sm font-medium hover:border-so-accent hover:text-so-text transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-so-accent text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
