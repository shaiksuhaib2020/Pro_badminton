'use client'

import { useEffect, useRef, useState } from 'react'
import { MoreVertical, Pencil, Plus, Search, TrendingUp } from 'lucide-react'
import PeriodNavigation from '@/components/ui/PeriodNavigation'
import { PERIOD_MODES } from '@/lib/period'
import type { Period, PeriodMode } from '@/lib/period'
import type { SaleEntry, SaleType } from '@/lib/types/accounts'
import { formatCurrency, formatDate } from '@/lib/utils'

export type SalesPeriodProps = {
  period: Period
  onNavigate: (mode: PeriodMode, anchor: string) => void
}

interface Props extends SalesPeriodProps {
  saleType: SaleType
  sales: SaleEntry[]
  search: string
  onSearch: (query: string) => void
  onAdd: () => void
  onEdit: (sale: SaleEntry) => void
  onDetails: (sale: SaleEntry) => void
  deletingId: string | null
  onDelete: (id: string | null) => void
  onConfirmDelete: () => void
  saving: boolean
}

export default function SalesList({ saleType, sales, period, onNavigate, search, onSearch, onAdd, onEdit, onDetails,
  deletingId, onDelete, onConfirmDelete, saving }: Props) {
  const [menuId, setMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!menuId) return
    const outside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuId(null)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenuId(null); triggerRef.current?.focus() }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [menuId])
  const inventory = saleType === 'inventory'
  const name = inventory ? 'Inventory' : 'Quick'
  const columns = ['Date', 'Item Name', ...(inventory ? ['Category'] : []), 'Payment', 'Amount', 'Actions']
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="relative w-full md:w-56 xl:w-64">
        <Search className="w-4 h-4 shrink-0 text-so-muted absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.75} />
        <input type="search" aria-label={`Search ${name.toLowerCase()} sales`} placeholder={`Search ${name.toLowerCase()} sales...`}
          value={search} onChange={event => onSearch(event.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-so-card border border-so-border rounded-lg text-sm focus:outline-none focus:border-so-accent shadow-sm" />
      </div>
      <PeriodNavigation period={period} modes={PERIOD_MODES} filtersLabel={`${name} sales date filter`} onNavigate={onNavigate} />
      <button type="button" onClick={onAdd} className="ml-auto shrink-0 whitespace-nowrap flex items-center justify-center gap-2 bg-so-accent text-so-accent-text px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50">
        <Plus className="w-4 h-4 shrink-0" strokeWidth={1.75} />Add {name} Sale
      </button>
    </div>
    <div className="bg-so-card border border-so-border rounded-xl shadow-sm min-h-[400px]">
      {sales.length === 0 ? <div className="py-20 flex flex-col items-center justify-center">
        <TrendingUp className="w-5 h-5 shrink-0 text-so-muted mb-3" strokeWidth={1.75} />
        <p className="text-so-text font-medium">{search.trim() ? `No ${name.toLowerCase()} sales match your search` : `No ${name.toLowerCase()} sales in this period`}</p>
        <p className="text-so-muted text-sm mt-1">{search.trim() ? `No results found for "${search}"` : `Use Add ${name} Sale to record a sale.`}</p>
      </div> : <div className="overflow-x-auto pb-24 rounded-xl">
        <table className="w-full text-sm">
          <thead><tr className="bg-so-surface border-b border-so-border">
            {columns.map(column => <th key={column} scope="col" className={`${column === 'Actions' ? 'text-right' : 'text-left'} px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider`}>{column}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-so-border">{sales.map(sale => deletingId === sale.id ?
            <tr key={sale.id} className="bg-so-red-subtle"><td colSpan={columns.length} className="px-5 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-so-red">Delete this sale?</span>
                <div className="flex items-center gap-2">
                  <button type="button" disabled={saving} onClick={onConfirmDelete} className="text-xs px-2 py-1 bg-so-red text-so-accent-text rounded-md font-medium disabled:opacity-50">{saving ? 'Deleting…' : 'Confirm'}</button>
                  <button type="button" disabled={saving} onClick={() => onDelete(null)} className="text-xs px-2 py-1 border border-so-border rounded-md text-so-muted disabled:opacity-50">Cancel</button>
                </div>
              </div>
            </td></tr> : <tr key={sale.id} className="hover:bg-so-surface/50 transition-colors">
              <td className="px-5 py-3 text-so-text whitespace-nowrap">{formatDate(sale.date)}</td>
              <td className="px-5 py-3 font-medium text-so-text truncate max-w-[200px]" title={sale.itemName}>{sale.itemName}</td>
              {inventory && <td className="px-5 py-3 text-so-text">{sale.category}</td>}
              <td className="px-5 py-3 text-so-muted capitalize">{sale.paymentMethod}</td>
              <td className="px-5 py-3 text-so-text font-medium whitespace-nowrap">{formatCurrency(sale.amount)}</td>
              <td className="px-5 py-3 text-right">
                <div ref={menuId === sale.id ? menuRef : undefined} className="relative inline-flex items-center justify-end gap-1">
                  <button type="button" onClick={() => onEdit(sale)} aria-label={`Edit ${sale.itemName}`} title="Edit" className="p-1.5 rounded-md text-so-muted hover:text-so-accent hover:bg-so-surface transition-colors cursor-pointer">
                    <Pencil className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                  </button>
                  <button type="button" ref={menuId === sale.id ? triggerRef : undefined} onClick={() => setMenuId(menuId === sale.id ? null : sale.id)} aria-label={`More options for ${sale.itemName}`} aria-expanded={menuId === sale.id} className="p-1.5 rounded-md text-so-muted hover:text-so-text hover:bg-so-surface transition-colors">
                    <MoreVertical className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                  </button>
                  {menuId === sale.id && <div className="absolute right-0 top-full mt-1 w-32 bg-so-card border border-so-border rounded-lg shadow-lg z-50 py-1 text-left">
                    <button type="button" onClick={() => { onDetails(sale); setMenuId(null) }} className="w-full text-left px-4 py-2 text-xs font-medium text-so-text hover:bg-so-surface">Details</button>
                    <div className="border-t border-so-border my-1" />
                    <button type="button" onClick={() => { onDelete(sale.id); setMenuId(null) }} className="w-full text-left px-4 py-2 text-xs font-medium text-so-red hover:bg-so-red-subtle">Delete</button>
                  </div>}
                </div>
              </td>
            </tr>)}</tbody>
        </table>
      </div>}
    </div>
  </div>
}
