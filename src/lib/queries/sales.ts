import 'server-only'

import { getServerSession } from '@/lib/supabase/auth-context'
import type { Database } from '@/lib/supabase/database.types'
import type { SaleEntry } from '@/lib/types/accounts'
import { readAllPages } from './read-all-pages'

function toSaleEntry(row: Database['public']['Tables']['sales']['Row']): SaleEntry {
  return {
    id: row.id,
    date: row.date,
    saleType: row.sale_type as SaleEntry['saleType'],
    itemName: row.item_name,
    category: row.category,
    inventoryItemId: row.inventory_item_id ?? undefined,
    quantity: row.quantity ?? undefined,
    unitPrice: row.unit_price / 100,
    amount: row.amount / 100,
    paymentMethod: row.payment_method as SaleEntry['paymentMethod'],
    notes: row.notes ?? undefined,
  }
}

export async function getSales(): Promise<SaleEntry[]> {
  const { supabase, academyId } = await getServerSession()

  const rows = await readAllPages((from, to) => supabase
    .from('sales')
    .select('*')
    .eq('academy_id', academyId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id')
    .range(from, to))

  return rows.map(toSaleEntry)
}
