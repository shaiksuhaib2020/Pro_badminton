'use client'

import { X } from 'lucide-react'
import type { SaleEntry } from '@/lib/types/accounts'
import { formatDate, formatCurrency } from '@/lib/utils'

interface Props {
  sale: SaleEntry
  onClose: () => void
}

export default function SaleDetailsModal({ sale, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-so-card border border-so-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-so-border">
          <h2 className="text-lg font-bold text-so-text">Sale Details</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-so-grey hover:text-so-accent hover:bg-so-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-1">
          {/* Sale Type */}
          <div className="flex justify-between items-center py-2.5 border-b border-so-border-subtle">
            <span className="text-xs font-medium text-so-muted uppercase tracking-wide">
              Sale Type
            </span>
            {sale.saleType === 'inventory' ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-so-accent-subtle text-so-accent border border-so-accent/20">
                Inventory Sale
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-so-surface text-so-muted border border-so-border">
                Quick Sale
              </span>
            )}
          </div>

          {/* Item */}
          <div className="flex justify-between items-start py-2.5 border-b border-so-border-subtle">
            <span className="text-xs font-medium text-so-muted uppercase tracking-wide">
              Item
            </span>
            <span className="text-sm font-medium text-so-text text-right max-w-[240px]">
              {sale.itemName}
            </span>
          </div>

          {/* Category (inventory only) */}
          {sale.saleType === 'inventory' && (
            <div className="flex justify-between items-center py-2.5 border-b border-so-border-subtle">
              <span className="text-xs font-medium text-so-muted uppercase tracking-wide">
                Category
              </span>
              <span className="text-sm text-so-text">
                {sale.category}
              </span>
            </div>
          )}

          {/* Date */}
          <div className="flex justify-between items-center py-2.5 border-b border-so-border-subtle">
            <span className="text-xs font-medium text-so-muted uppercase tracking-wide">
              Date
            </span>
            <span className="text-sm text-so-text">
              {formatDate(sale.date)}
            </span>
          </div>

          {/* Quantity (inventory only) */}
          {sale.saleType === 'inventory' && (
            <div className="flex justify-between items-center py-2.5 border-b border-so-border-subtle">
              <span className="text-xs font-medium text-so-muted uppercase tracking-wide">
                Quantity
              </span>
              <span className="text-sm font-medium text-so-text">
                {sale.quantity}
              </span>
            </div>
          )}

          {/* Unit Price (inventory only if quantity > 1) */}
          {sale.saleType === 'inventory' && (sale.quantity ?? 1) > 1 && (
            <div className="flex justify-between items-center py-2.5 border-b border-so-border-subtle">
              <span className="text-xs font-medium text-so-muted uppercase tracking-wide">
                Unit Price
              </span>
              <span className="text-sm text-so-text">
                {formatCurrency(sale.unitPrice)}
              </span>
            </div>
          )}

          {/* Total Amount */}
          <div className="flex justify-between items-center py-2.5 border-b border-so-border-subtle">
            <span className="text-xs font-medium text-so-muted uppercase tracking-wide">
              Total Amount
            </span>
            <span className="text-base font-bold text-so-emerald">
              {formatCurrency(sale.amount)}
            </span>
          </div>

          {/* Payment */}
          <div className="flex justify-between items-center py-2.5 border-b border-so-border-subtle">
            <span className="text-xs font-medium text-so-muted uppercase tracking-wide">
              Payment Method
            </span>
            <span className="text-sm text-so-text capitalize">
              {sale.paymentMethod}
            </span>
          </div>

          {/* Notes */}
          {sale.notes && sale.notes.trim() !== '' && (
            <div className="flex justify-between items-start py-2.5 border-b border-so-border-subtle">
              <span className="text-xs font-medium text-so-muted uppercase tracking-wide">
                Notes
              </span>
              <span className="text-sm text-so-muted text-right max-w-[240px]">
                {sale.notes}
              </span>
            </div>
          )}
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
