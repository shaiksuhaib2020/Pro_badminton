'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from '@/lib/supabase/auth-context'
import type { AccountEntry, SaleEntry, SaleType } from '@/lib/mock-data'

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { error: string }

// ── Expense Actions ─────────────────────────────────────────────────────────

export async function createExpense(
  data: Omit<AccountEntry, 'id'>
): Promise<{ success: true } | { error: string }> {
  try {
    const { supabase, academyId } = await getServerSession()

    const { error } = await supabase.from('account_entries').insert({
      entry_type: 'expense',
      academy_id: academyId,
      date: data.date,
      category: data.category,
      description: data.description,
      amount: Math.round(data.amount * 100),
      payment_method: data.paymentMethod ?? null,
      vendor: data.vendor ?? null,
      notes: data.notes ?? null,
    })

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/accounts')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Failed to create expense' }
  }
}

export async function updateExpense(
  id: string,
  data: Omit<AccountEntry, 'id'>
): Promise<{ success: true } | { error: string }> {
  try {
    const { supabase, academyId } = await getServerSession()

    const { error } = await supabase
      .from('account_entries')
      .update({
        date: data.date,
        category: data.category,
        description: data.description,
        amount: Math.round(data.amount * 100),
        payment_method: data.paymentMethod ?? null,
        vendor: data.vendor ?? null,
        notes: data.notes ?? null,
      })
      .eq('id', id)
      .eq('academy_id', academyId)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/accounts')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Failed to update expense' }
  }
}

export async function deleteExpense(
  id: string
): Promise<{ success: true } | { error: string }> {
  try {
    const { supabase, academyId } = await getServerSession()

    const { error } = await supabase
      .from('account_entries')
      .delete()
      .eq('id', id)
      .eq('academy_id', academyId)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/accounts')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Failed to delete expense' }
  }
}

export async function createCustomCategory(
  name: string
): Promise<{ success: true; name: string } | { error: string }> {
  try {
    const { supabase, academyId } = await getServerSession()
    const trimmed = name.trim()

    const { error } = await supabase
      .from('custom_expense_categories')
      .insert({
        academy_id: academyId,
        name: trimmed,
      })

    if (error) {
      if (error.code === '23505' || error.message?.toLowerCase().includes('duplicate') || error.message?.toLowerCase().includes('unique')) {
        return { error: 'Category already exists' }
      }
      return { error: error.message }
    }

    revalidatePath('/accounts')
    return { success: true, name: trimmed }
  } catch (err: any) {
    return { error: err.message || 'Failed to create category' }
  }
}

// ── Sale Actions ────────────────────────────────────────────────────────────

export async function createSale(
  data: Omit<SaleEntry, 'id'>
): Promise<{ success: true } | { error: string }> {
  try {
    const { supabase, academyId } = await getServerSession()

    if (data.saleType === 'inventory') {
      const { error } = await supabase.rpc('record_inventory_sale', {
        p_academy_id:        academyId,
        p_inventory_item_id: data.inventoryItemId!,
        p_quantity:          data.quantity!,
        p_unit_price:        Math.round(data.unitPrice * 100),
        p_amount:            Math.round(data.amount * 100),
        p_item_name:         data.itemName,
        p_category:          data.category,
        p_payment_method:    data.paymentMethod,
        p_date:              data.date,
        p_notes:             data.notes ?? null,
      })

      if (error) {
        if (error.message?.includes('Insufficient stock')) {
          return { error: 'Insufficient stock' }
        }
        return { error: error.message }
      }
    } else {
      const { error } = await supabase.from('sales').insert({
        academy_id: academyId,
        sale_type: 'quick',
        item_name: data.itemName,
        category: 'Quick Sale',
        unit_price: Math.round(data.unitPrice * 100),
        amount: Math.round(data.amount * 100),
        payment_method: data.paymentMethod,
        date: data.date,
        notes: data.notes ?? null,
      })

      if (error) {
        return { error: error.message }
      }
    }

    revalidatePath('/accounts')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Failed to create sale' }
  }
}

export async function updateSale(
  id: string,
  data: Omit<SaleEntry, 'id'>,
  originalSaleType: SaleType
): Promise<{ success: true } | { error: string }> {
  try {
    const { supabase, academyId } = await getServerSession()

    if (originalSaleType === 'inventory') {
      // TODO: P2 — replace with update_inventory_sale RPC
      // 1. Restores old stock
      const { error: revError } = await supabase.rpc('reverse_inventory_sale', {
        p_academy_id: academyId,
        p_sale_id: id,
      })
      if (revError) {
        return { error: revError.message }
      }

      // 2. Check new stock
      const { data: item, error: fetchErr } = await supabase
        .from('inventory_items')
        .select('quantity')
        .eq('id', data.inventoryItemId!)
        .eq('academy_id', academyId)
        .single()

      if (fetchErr || !item) {
        return { error: 'Product not found in inventory' }
      }

      const neededQty = data.quantity ?? 1
      if (item.quantity < neededQty) {
        return { error: 'Insufficient stock' }
      }

      // 3. Deduct new stock
      const { error: deductErr } = await supabase
        .from('inventory_items')
        .update({ quantity: item.quantity - neededQty })
        .eq('id', data.inventoryItemId!)
        .eq('academy_id', academyId)

      if (deductErr) {
        return { error: deductErr.message }
      }

      // 4. Update sales record
      const { error: updateErr } = await supabase
        .from('sales')
        .update({
          item_name: data.itemName,
          category: data.category,
          inventory_item_id: data.inventoryItemId ?? null,
          quantity: data.quantity ?? null,
          unit_price: Math.round(data.unitPrice * 100),
          amount: Math.round(data.amount * 100),
          payment_method: data.paymentMethod,
          date: data.date,
          notes: data.notes ?? null,
        })
        .eq('id', id)
        .eq('academy_id', academyId)

      if (updateErr) {
        return { error: updateErr.message }
      }
    } else {
      // Was quick -> stays quick
      const { error } = await supabase
        .from('sales')
        .update({
          item_name: data.itemName,
          unit_price: Math.round(data.unitPrice * 100),
          amount: Math.round(data.amount * 100),
          payment_method: data.paymentMethod,
          date: data.date,
          notes: data.notes ?? null,
        })
        .eq('id', id)
        .eq('academy_id', academyId)

      if (error) {
        return { error: error.message }
      }
    }

    revalidatePath('/accounts')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Failed to update sale' }
  }
}

export async function deleteSale(
  id: string,
  saleType: SaleType
): Promise<{ success: true } | { error: string }> {
  try {
    const { supabase, academyId } = await getServerSession()

    if (saleType === 'inventory') {
      // 1. Restore stock
      const { error: revError } = await supabase.rpc('reverse_inventory_sale', {
        p_academy_id: academyId,
        p_sale_id: id,
      })
      if (revError) {
        return { error: revError.message }
      }
    }

    // 2. Delete sales row
    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('id', id)
      .eq('academy_id', academyId)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/accounts')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Failed to delete sale' }
  }
}
