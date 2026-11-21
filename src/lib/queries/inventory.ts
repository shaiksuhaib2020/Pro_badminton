import 'server-only'

import { getServerSession } from '@/lib/supabase/auth-context'
import type { InventoryItem } from '@/lib/types/inventory'
import type { Tables } from '@/lib/supabase/database.types'

function toInventoryItem(row: Tables<'inventory_items'>): InventoryItem {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    category: row.category,
    description: row.description || '',
    unit: row.unit,
    quantity: row.quantity,
    price: row.price / 100,
    sellingPrice: row.selling_price / 100,
    icon: row.icon || undefined,
  }
}

export async function getInventoryItems(): Promise<InventoryItem[]> {
  const { supabase, academyId } = await getServerSession()

  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('academy_id', academyId)
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching inventory items:', error.message)
    throw new Error(error.message)
  }

  return (data ?? []).map(toInventoryItem)
}
