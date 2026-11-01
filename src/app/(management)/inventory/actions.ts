'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from '@/lib/supabase/auth-context'
import type { InventoryItem } from '@/lib/mock-data'

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { error: string }

export async function createInventoryItem(
  data: Omit<InventoryItem, 'id'>
): Promise<{ success: true } | { error: string }> {
  try {
    const { supabase, academyId } = await getServerSession()

    const { error } = await supabase.from('inventory_items').insert({
      academy_id: academyId,
      sku: data.sku.trim(),
      name: data.name.trim(),
      category: data.category,
      description: data.description?.trim() || '',
      unit: data.unit,
      quantity: data.quantity,
      icon: data.icon?.trim() || null,
      price: Math.round(data.price * 100),
      selling_price: Math.round(data.sellingPrice * 100),
    })

    if (error) {
      if (error.code === '23505') {
        return { error: 'An item with this SKU already exists' }
      }
      return { error: error.message }
    }

    revalidatePath('/inventory')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Failed to create inventory item' }
  }
}

export async function updateInventoryItem(
  id: string,
  data: Omit<InventoryItem, 'id'>
): Promise<{ success: true } | { error: string }> {
  try {
    const { supabase, academyId } = await getServerSession()

    const { error } = await supabase
      .from('inventory_items')
      .update({
        sku: data.sku.trim(),
        name: data.name.trim(),
        category: data.category,
        description: data.description?.trim() || '',
        unit: data.unit,
        quantity: data.quantity,
        icon: data.icon?.trim() || null,
        price: Math.round(data.price * 100),
        selling_price: Math.round(data.sellingPrice * 100),
      })
      .eq('id', id)
      .eq('academy_id', academyId)

    if (error) {
      if (error.code === '23505') {
        return { error: 'An item with this SKU already exists' }
      }
      return { error: error.message }
    }

    revalidatePath('/inventory')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Failed to update inventory item' }
  }
}

export async function deleteInventoryItem(
  id: string
): Promise<{ success: true } | { error: string }> {
  try {
    const { supabase, academyId } = await getServerSession()

    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', id)
      .eq('academy_id', academyId)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/inventory')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Failed to delete inventory item' }
  }
}
