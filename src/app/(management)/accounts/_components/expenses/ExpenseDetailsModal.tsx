'use client'

import { X } from 'lucide-react'
import type { AccountEntry } from '@/lib/types/accounts'
import { formatDate, formatCurrency } from '@/lib/utils'

interface ExpenseDetailsModalProps {
  expense: AccountEntry
  onClose: () => void
}

export default function ExpenseDetailsModal({ expense, onClose }: ExpenseDetailsModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-so-card border border-so-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-so-border">
          <h2 className="text-lg font-bold text-so-text">Expense Details</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-so-grey hover:text-so-accent hover:bg-so-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-1">
          {/* Expense Name */}
          <div className="flex justify-between items-start py-2.5 border-b border-so-border-subtle">
            <span className="text-xs font-medium text-so-muted uppercase tracking-wide">
              Expense Name
            </span>
            <span className="text-sm font-medium text-so-text text-right max-w-[240px]">
              {expense.description}
            </span>
          </div>

          {/* Date */}
          <div className="flex justify-between items-center py-2.5 border-b border-so-border-subtle">
            <span className="text-xs font-medium text-so-muted uppercase tracking-wide">
              Date
            </span>
            <span className="text-sm text-so-text">
              {formatDate(expense.date)}
            </span>
          </div>

          {/* Category */}
          <div className="flex justify-between items-center py-2.5 border-b border-so-border-subtle">
            <span className="text-xs font-medium text-so-muted uppercase tracking-wide">
              Category
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-so-surface border border-so-border text-so-muted text-xs font-medium uppercase tracking-wider">
              {expense.category}
            </span>
          </div>

          {/* Amount */}
          <div className="flex justify-between items-center py-2.5 border-b border-so-border-subtle">
            <span className="text-xs font-medium text-so-muted uppercase tracking-wide">
              Amount
            </span>
            <span className="text-base font-bold text-red-600">
              ₹ {expense.amount.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Mode */}
          <div className="flex justify-between items-center py-2.5 border-b border-so-border-subtle">
            <span className="text-xs font-medium text-so-muted uppercase tracking-wide">
              Mode
            </span>
            <span className="text-sm text-so-text capitalize">
              {expense.paymentMethod || '—'}
            </span>
          </div>

          {/* Vendor */}
          <div className="flex justify-between items-start py-2.5 border-b border-so-border-subtle">
            <span className="text-xs font-medium text-so-muted uppercase tracking-wide">
              Vendor
            </span>
            <span className="text-sm text-so-text text-right max-w-[240px]">
              {expense.vendor || '—'}
            </span>
          </div>

          {/* Notes */}
          <div className="flex justify-between items-start py-2.5 border-b border-so-border-subtle">
            <span className="text-xs font-medium text-so-muted uppercase tracking-wide">
              Notes
            </span>
            <span className="text-sm text-so-muted text-right max-w-[240px]">
              {expense.notes || '—'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-so-border flex justify-end bg-so-surface/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-so-border text-so-muted rounded-lg text-sm font-medium hover:border-so-accent hover:text-so-text transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
