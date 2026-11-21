'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SaleEntry, SaleType } from '@/lib/types/accounts'
import type { Period } from '@/lib/period'
import { createSale, updateSale, deleteSale } from '@/app/(management)/accounts/actions'

export type SaleNotice = { message: string; type: 'success' | 'error' }

export default function useSalesTab(sales: SaleEntry[], saleType: SaleType, { start, end }: Period, notify: (notice: SaleNotice) => void) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSale, setEditingSale] = useState<SaleEntry | null>(null)
  const [viewingSale, setViewingSale] = useState<SaleEntry | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const query = search.trim().toLowerCase()
  const displayedSales = sales.filter(sale => sale.saleType === saleType && sale.date >= start && sale.date <= end && (!query ||
    sale.itemName.toLowerCase().includes(query) || sale.category.toLowerCase().includes(query) ||
    sale.notes?.toLowerCase().includes(query))).sort((a, b) => b.date.localeCompare(a.date))

  const add = () => { setEditingSale(null); setModalOpen(true) }
  const edit = (sale: SaleEntry) => { setEditingSale(sale); setModalOpen(true) }
  const close = () => { if (!saving) { setModalOpen(false); setEditingSale(null) } }
  const save = async (data: Omit<SaleEntry, 'id'>) => {
    if (saving) return
    setSaving(true)
    try {
      const result = editingSale
        ? await updateSale(editingSale.id, data, editingSale.saleType)
        : await createSale(data)
      if ('error' in result) { notify({ message: result.error, type: 'error' }); return }
      setModalOpen(false)
      setEditingSale(null)
      notify({ message: editingSale ? 'Sale updated successfully' : 'Sale recorded successfully', type: 'success' })
      router.refresh()
    } catch {
      notify({ message: 'Could not save sale. Please try again.', type: 'error' })
    } finally { setSaving(false) }
  }
  const confirmDelete = async () => {
    if (!deletingId || saving) return
    setSaving(true)
    try {
      const result = await deleteSale(deletingId, saleType)
      if ('error' in result) { notify({ message: result.error, type: 'error' }); return }
      setDeletingId(null)
      notify({ message: 'Sale deleted successfully', type: 'success' })
      router.refresh()
    } catch {
      notify({ message: 'Could not delete sale. Please try again.', type: 'error' })
    } finally { setSaving(false) }
  }
  return { search, setSearch, displayedSales, add, edit, close, save, modalOpen, editingSale,
    viewingSale, setViewingSale, deletingId, setDeletingId, saving, confirmDelete }
}
