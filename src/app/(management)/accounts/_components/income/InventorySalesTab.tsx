'use client'

import type { SaleEntry } from '@/lib/types/accounts'
import type { InventoryItem } from '@/lib/types/inventory'
import SaleModal from './SaleModal'
import SaleDetailsModal from './SaleDetailsModal'
import SalesList from './SalesList'
import type { SalesPeriodProps } from './SalesList'
import useSalesTab, { type SaleNotice } from './useSalesTab'

export default function InventorySalesTab({ sales, period, onNavigate, inventoryItems, onNotify }: SalesPeriodProps & {
  sales: SaleEntry[]; inventoryItems: InventoryItem[]; onNotify: (notice: SaleNotice) => void
}) {
  const tab = useSalesTab(sales, 'inventory', period, onNotify)
  return <>
    <SalesList saleType="inventory" sales={tab.displayedSales} period={period} onNavigate={onNavigate} search={tab.search} onSearch={tab.setSearch}
      onAdd={tab.add} onEdit={tab.edit} onDetails={tab.setViewingSale} deletingId={tab.deletingId}
      onDelete={tab.setDeletingId} onConfirmDelete={tab.confirmDelete} saving={tab.saving} />
    {tab.modalOpen && <SaleModal saleType="inventory" inventoryItems={inventoryItems} existingSale={tab.editingSale}
      onClose={tab.close} onSave={tab.save} saving={tab.saving} />}
    {tab.viewingSale && <SaleDetailsModal sale={tab.viewingSale} onClose={() => tab.setViewingSale(null)} />}
  </>
}
